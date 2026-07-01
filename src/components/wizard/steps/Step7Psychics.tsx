import { useState } from 'react';
import type { Character } from '../../../types/character';
import { PSYCHIC_DISCIPLINES } from '../../../data/psychics';
import type { PsychicTechniqueSelection } from '../../../types/character';
import PageRef from '../../ui/PageRef';

interface Props {
  char: Character;
  onChange: (patch: Partial<Character>) => void;
}

/**
 * Compute free skill picks consumed so far in the wizard (very rough heuristic):
 * Step3/4 skills minus background-free picks. The exact tracking is complex;
 * we expose a user-adjustable SP pool for technique buying, defaulting to 3
 * (the typical creation bonus for non-Expert classes after background skills).
 * The book (p.34) says: "PCs who want to learn additional techniques beyond
 * those acquired by improving their skills may buy them separately with skill
 * points, paying one point per level of the technique."
 */
const CREATION_SP_POOL = 3; // typical initial bonus skill picks

export default function Step7Psychics({ char, onChange }: Props) {
  const isPsychic = char.class === 'Psychic';
  const isPartialPsychic = char.adventurerPartials?.includes('Partial Psychic');

  // Extra SP available to spend on techniques at creation (user-editable)
  const [extraSPPool, setExtraSPPool] = useState<number>(() => {
    // Pre-fill with whatever they had previously configured
    return char.creationTechniquesSP !== undefined
      ? char.creationTechniquesSP + (char.creationTechniquesSP > 0 ? char.creationTechniquesSP : 0)
      : CREATION_SP_POOL;
  });

  if (!isPsychic && !isPartialPsychic) {
    return (
      <div className="space-y-4">
        <div className="glass-card rounded-lg p-6 text-center">
          <p className="text-gray-400 mb-2">Your class does not include psychic abilities.</p>
          <p className="text-sm text-gray-500">
            If you want limited psychic powers, consider the <strong className="text-amber-300">Wild Psychic Talent</strong> focus (available in the Foci step).
          </p>
        </div>
      </div>
    );
  }

  const maxDisciplines = isPsychic ? 2 : 1;

  function toggleDiscipline(skill: string) {
    const hasIt = char.psychicDisciplines.includes(skill);
    let next: string[];
    if (hasIt) {
      next = char.psychicDisciplines.filter(d => d !== skill);
      // Remove techniques belonging to this discipline if we lost it
      const removed = char.psychicDisciplines.filter(d => d === skill).length;
      const newCount = next.filter(d => d === skill).length;
      if (newCount < removed) {
        // Remove last technique picks for this discipline
        const kept = char.psychicTechniques.filter(t => t.discipline !== skill);
        onChange({ psychicDisciplines: next, psychicTechniques: kept });
        return;
      }
    } else if (char.psychicDisciplines.length < maxDisciplines) {
      next = [...char.psychicDisciplines, skill];
    } else {
      return;
    }
    onChange({ psychicDisciplines: next });
  }

  function toggleTechnique(discipline: string, techniqueName: string) {
    const existing = char.psychicTechniques.find(
      t => t.discipline === discipline && t.techniqueName === techniqueName
    );
    let next: PsychicTechniqueSelection[];
    if (existing) {
      next = char.psychicTechniques.filter(t => !(t.discipline === discipline && t.techniqueName === techniqueName));
    } else {
      next = [...char.psychicTechniques, { discipline, techniqueName }];
    }
    onChange({ psychicTechniques: next });
  }

  const hasTechnique = (discipline: string, name: string) =>
    char.psychicTechniques.some(t => t.discipline === discipline && t.techniqueName === name);

  // ── SP technique buying ─────────────────────────────────────────────────────
  // Compute how many SP have been spent on non-free techniques at creation.
  // We track which techniques are "SP-bought" using a simple heuristic:
  // free picks = one per discipline at level-1; everything else is SP-bought.
  function getFreePicks(): Map<string, number> {
    const map = new Map<string, number>();
    for (const [disc, count] of Object.entries(
      char.psychicDisciplines.reduce<Record<string, number>>((acc, d) => {
        acc[d] = (acc[d] ?? 0) + 1; return acc;
      }, {})
    )) {
      // level-1 (picked twice) gives 1 free technique pick
      if (count >= 2) map.set(disc, 1);
    }
    return map;
  }

  const freePicks = getFreePicks();

  // For each discipline, separate free vs SP-bought techniques
  function getFreeTechCount(disc: string): number {
    return freePicks.get(disc) ?? 0;
  }

  function spCostForTechnique(disc: string, techName: string): number {
    const d = PSYCHIC_DISCIPLINES.find(d => d.skill === disc);
    const t = d?.techniques.find(t => t.name === techName);
    return t?.level ?? 1;
  }

  // Count SP currently spent on "extra" techniques (those beyond free picks per disc)
  function computeSPSpent(): number {
    let spent = 0;
    const countPerDisc: Record<string, number> = {};
    for (const t of char.psychicTechniques) {
      const disc = t.discipline;
      countPerDisc[disc] = (countPerDisc[disc] ?? 0) + 1;
      const free = getFreeTechCount(disc);
      // Techniques beyond the free count cost SP (ordered by level, so we need the cost)
      if (countPerDisc[disc] > free) {
        spent += spCostForTechnique(disc, t.techniqueName);
      }
    }
    return spent;
  }

  const spSpent = computeSPSpent();
  const spRemaining = extraSPPool - spSpent;

  function handleSPPoolChange(newPool: number) {
    const bounded = Math.max(0, Math.min(10, newPool));
    setExtraSPPool(bounded);
    // persist so it survives step navigation
    onChange({ creationTechniquesSP: Math.max(0, bounded - spRemaining) });
  }

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-lg p-4 text-sm text-gray-400">
        {isPsychic ? (
          <p>
            Choose <span className="text-amber-300 font-bold">2 psychic disciplines</span> as bonus skills.
            Picking the same one twice gives you <strong>level-1</strong> in it plus a free level-1 technique.
            <PageRef page={21} note="Step 10 — Psychics pick 2 psychic skills. If the same skill is chosen twice, gain it at level-1 and choose a free level-1 technique. Max Effort = 1 + highest psychic skill + best of WIS/CON mod." />
          </p>
        ) : (
          <p>
            As a <span className="text-amber-300 font-bold">Partial Psychic</span>, you are restricted to <strong>one</strong> psychic discipline.
            You cannot improve any other psychic skill.
            <PageRef page={22} note="Partial Psychic (Adventurer) — pick one psychic discipline at level-0. Can improve it with skill points or foci, but cannot learn any other psychic skill. Effort = 1 + skill level + best of WIS/CON mod." />
          </p>
        )}
      </div>

      {/* Discipline selector */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {PSYCHIC_DISCIPLINES.map(disc => {
          const count = char.psychicDisciplines.filter(d => d === disc.skill).length;
          const isSelected = count > 0;
          const isDouble = count >= 2;

          return (
            <button
              key={disc.skill}
              onClick={() => toggleDiscipline(disc.skill)}
              disabled={!isSelected && char.psychicDisciplines.length >= maxDisciplines}
              className={`text-left p-4 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-900/20'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-semibold text-sm ${isSelected ? 'text-indigo-300' : 'text-gray-200'}`}>
                  {disc.skill}
                </span>
                {isSelected && (
                  <span className="text-xs bg-indigo-800 text-indigo-200 px-1.5 py-0.5 rounded">
                    lvl-{isDouble ? 1 : 0}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{disc.description.split('.')[0]}.</p>
            </button>
          );
        })}
      </div>

      {/* Discipline details & technique picks */}
      {char.psychicDisciplines.length > 0 && (
        <div className="space-y-6">
          {[...new Set(char.psychicDisciplines)].map(skillName => {
            const disc = PSYCHIC_DISCIPLINES.find(d => d.skill === skillName);
            if (!disc) return null;
            const skillLevel = char.psychicDisciplines.filter(d => d === skillName).length - 1; // 0 or 1
            const freeTechPicks = skillLevel; // 1 free level-1 technique if level-1

            // Count techniques picked for this disc
            const pickedForDisc = char.psychicTechniques.filter(t => t.discipline === disc.skill).length;
            const spTechsForDisc = Math.max(0, pickedForDisc - freeTechPicks);

            return (
              <div key={skillName} className="glass-card rounded-lg p-5 border border-indigo-900/50">
                <h3 className="text-indigo-300 font-bold text-lg mb-1">{disc.name}</h3>
                <p className="text-xs text-gray-500 mb-3">Skill Level: {skillLevel}</p>

                {/* Core technique */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-300 mb-2">
                    Core Technique: <span className="text-indigo-300">{disc.coreTechnique.name}</span>
                    <span className="text-xs text-gray-500 ml-2">(automatic, improves with skill level)</span>
                  </p>
                  <div className="bg-gray-900/50 rounded p-3 text-xs text-gray-400 space-y-1">
                    {disc.coreTechnique.levels.map((l, i) => (
                      <div key={i} className={i <= skillLevel ? 'text-indigo-300' : 'text-gray-600'}>
                        {l}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Free technique picks */}
                {freeTechPicks > 0 && (
                  <p className="text-xs text-amber-300 mb-2">
                    You have {freeTechPicks} free level-1 technique pick{freeTechPicks > 1 ? 's' : ''} for this discipline.
                  </p>
                )}

                {/* SP-bought technique indicator */}
                {spTechsForDisc > 0 && (
                  <p className="text-xs text-cyan-400 mb-2">
                    {spTechsForDisc} additional technique{spTechsForDisc > 1 ? 's' : ''} bought with creation SP.
                  </p>
                )}

                <div className="space-y-2">
                  {disc.techniques.map(tech => {
                    const picked = hasTechnique(disc.skill, tech.name);
                    const pickedCountSoFar = char.psychicTechniques.filter(t => t.discipline === disc.skill).length;
                    // Free tech picks come first (up to freeTechPicks for level-1 in-discipline techs)
                    const availableFree = tech.level <= skillLevel && !picked && pickedCountSoFar < freeTechPicks;
                    // SP-bought: available if we have SP and tech level <= skill level
                    const availableForSP = !picked && !availableFree && tech.level <= Math.max(0, skillLevel) && spRemaining >= tech.level;
                    const available = availableFree || availableForSP || picked;

                    return (
                      <div
                        key={tech.name}
                        className={`rounded p-3 border text-xs transition-colors ${
                          picked
                            ? 'border-indigo-500 bg-indigo-900/20 cursor-pointer'
                            : availableFree
                            ? 'border-amber-700/50 bg-amber-900/10 cursor-pointer hover:border-amber-500'
                            : availableForSP
                            ? 'border-cyan-700/50 bg-cyan-900/10 cursor-pointer hover:border-cyan-500'
                            : 'border-gray-800 bg-gray-800/30 opacity-40 cursor-not-allowed'
                        }`}
                        onClick={() => available && toggleTechnique(disc.skill, tech.name)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-medium ${picked ? 'text-indigo-300' : availableForSP ? 'text-cyan-300' : 'text-gray-300'}`}>
                            {tech.name}
                          </span>
                          <div className="flex items-center gap-2">
                            {availableForSP && !picked && (
                              <span className="text-cyan-500 font-mono">{tech.level} SP</span>
                            )}
                            <span className="text-gray-500">Min Lvl {tech.level}</span>
                          </div>
                        </div>
                        <p className="text-gray-400">{tech.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SP Pool for buying extra techniques at creation */}
      {char.psychicDisciplines.length > 0 && (
        <div className="glass-card rounded-lg p-4 border border-cyan-900/40">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-cyan-300">Buy Additional Techniques with Creation SP</h4>
            <span className={`text-xs font-mono px-2 py-0.5 rounded ${spRemaining < 0 ? 'bg-red-900/40 text-red-400' : 'bg-cyan-900/30 text-cyan-400'}`}>
              {spRemaining} SP remaining
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            PCs may buy additional psychic techniques beyond their free picks at creation, paying 1 SP per technique level (p.34). Adjust your available creation SP below to match your background's skill picks.
            <PageRef page={34} note="'PCs who want to learn additional techniques beyond those acquired by improving their skills may buy them separately with skill points, paying one point per level of the technique.'" />
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Available creation SP for techniques:</span>
            <button
              onClick={() => handleSPPoolChange(extraSPPool - 1)}
              disabled={extraSPPool <= 0}
              className="w-6 h-6 rounded bg-gray-700 hover:bg-red-900/50 disabled:opacity-20 text-gray-300 text-xs flex items-center justify-center"
            >−</button>
            <span className="text-amber-300 font-bold text-sm w-6 text-center">{extraSPPool}</span>
            <button
              onClick={() => handleSPPoolChange(extraSPPool + 1)}
              disabled={extraSPPool >= 10}
              className="w-6 h-6 rounded bg-gray-700 hover:bg-green-900/50 disabled:opacity-20 text-gray-300 text-xs flex items-center justify-center"
            >+</button>
            <span className="text-xs text-gray-600">({spSpent} spent)</span>
          </div>
          {spRemaining < 0 && (
            <p className="text-xs text-red-400 mt-2">Overspent! Remove a technique or increase available SP.</p>
          )}
        </div>
      )}
    </div>
  );
}
