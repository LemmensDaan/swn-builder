import type { Character } from '../../../types/character';
import { PSYCHIC_DISCIPLINES } from '../../../data/psychics';
import type { PsychicTechniqueSelection } from '../../../types/character';
import PageRef from '../../ui/PageRef';

interface Props {
  char: Character;
  onChange: (patch: Partial<Character>) => void;
}

export default function Step7Psychics({ char, onChange }: Props) {
  const isPsychic = char.class === 'Psychic';
  const isPartialPsychic = char.adventurerPartials?.includes('Partial Psychic');

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

                {/* Techniques */}
                {freeTechPicks > 0 && (
                  <p className="text-xs text-amber-300 mb-2">
                    You have {freeTechPicks} free level-1 technique pick{freeTechPicks > 1 ? 's' : ''} for this discipline.
                  </p>
                )}
                <div className="space-y-2">
                  {disc.techniques
                    .filter(t => t.level <= 1 || skillLevel >= t.level)
                    .map(tech => {
                      const picked = hasTechnique(disc.skill, tech.name);
                      const available = tech.level <= skillLevel + 1;
                      return (
                        <div
                          key={tech.name}
                          className={`rounded p-3 border text-xs transition-colors ${
                            picked
                              ? 'border-indigo-500 bg-indigo-900/20'
                              : available
                              ? 'border-gray-700 bg-gray-700/40 hover:border-gray-500 cursor-pointer'
                              : 'border-gray-800 bg-gray-800/30 opacity-40 cursor-not-allowed'
                          }`}
                          onClick={() => available && toggleTechnique(disc.skill, tech.name)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-medium ${picked ? 'text-indigo-300' : 'text-gray-300'}`}>
                              {tech.name}
                            </span>
                            <span className="text-gray-500">Min Lvl {tech.level}</span>
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
    </div>
  );
}
