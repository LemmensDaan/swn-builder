import { useState } from 'react';
import type { Character, FocusSelection, PsychicTechniqueSelection } from '../../../types/character';
import { FOCI } from '../../../data/foci';
import { SKILLS, PSYCHIC_SKILLS } from '../../../data/skills';
import type { Skill } from '../../../data/skills';
import { focusNeedsSkillChoice } from '../../../data/derivation';
import { PSYCHIC_DISCIPLINES } from '../../../data/psychics';
import PageRef from '../../ui/PageRef';

interface Props {
  char: Character;
  onChange: (patch: Partial<Character>) => void;
}

const COMBAT_SKILLS: Skill[] = ['Stab', 'Shoot', 'Punch'];
const NONCOMBAT_SKILLS = SKILLS.filter(s => !COMBAT_SKILLS.includes(s));

export default function Step6Foci({ char, onChange }: Props) {
  const [filter, setFilter] = useState<'all' | 'combat' | 'noncombat'>('all');
  const [search, setSearch] = useState('');

  const isExpert = char.class === 'Expert' || char.adventurerPartials?.includes('Partial Expert');
  const isWarrior = char.class === 'Warrior' || char.adventurerPartials?.includes('Partial Warrior');
  const isPsychic = char.class === 'Psychic' || char.adventurerPartials?.includes('Partial Psychic');

  // p.19 step 7: all PCs get 1 pick; Expert/Partial Expert add 1; Warrior/Partial Warrior add 1.
  const totalPicks = 1 + (isExpert ? 1 : 0) + (isWarrior ? 1 : 0);
  // Level-2 foci consume 2 picks (the base pick + 1 upgrade pick)
  const picksUsed = char.foci.length + char.foci.filter(f => f.level === 2).length;

  const filtered = FOCI.filter(f => {
    if (filter === 'combat' && !f.isCombat) return false;
    if (filter === 'noncombat' && f.isCombat) return false;
    if (f.isPsychicOnly && !isPsychic) return false;
    // Wild Psychic Talent cannot be taken by Psychics or Partial Psychics (p.24)
    if (f.name === 'Wild Psychic Talent' && isPsychic) return false;
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Default bonus skill for a choice-focus
  function defaultChoice(name: string): Skill | undefined {
    const kind = focusNeedsSkillChoice(name);
    if (kind === 'noncombat') return 'Administer';
    if (kind === 'combat') return name === 'Shocking Assault' ? 'Punch' : 'Stab';
    if (kind === 'psychic') return (PSYCHIC_SKILLS[0] as unknown as Skill);
    return undefined;
  }

  function choicesFor(name: string): readonly string[] {
    const kind = focusNeedsSkillChoice(name);
    if (kind === 'noncombat') return NONCOMBAT_SKILLS;
    if (kind === 'combat') return name === 'Shocking Assault' ? ['Punch', 'Stab'] : COMBAT_SKILLS;
    if (kind === 'psychic') return PSYCHIC_SKILLS;
    return [];
  }

  const instancesOf = (name: string) => char.foci.filter(f => f.name === name);
  const isSelected = (name: string) => char.foci.some(f => f.name === name);

  function addFocus(name: string) {
    const focus = FOCI.find(f => f.name === name);
    if (!focus || picksUsed >= totalPicks) return;
    const choice = defaultChoice(name);
    const sel: FocusSelection = {
      name,
      level: 1,
      specialistSkill: choice as Skill | undefined,
    };
    onChange({ foci: [...char.foci, sel] });
  }

  function removeFocusAt(index: number) {
    onChange({ foci: char.foci.filter((_, i) => i !== index) });
  }

  function toggleFocus(name: string) {
    const focus = FOCI.find(f => f.name === name);
    if (!focus) return;
    if (focus.repeatable) {
      // Repeatable (Specialist): each click adds another instance
      addFocus(name);
      return;
    }
    const idx = char.foci.findIndex(f => f.name === name);
    if (idx >= 0) removeFocusAt(idx);
    else addFocus(name);
  }

  function setInstanceSkill(index: number, skill: string) {
    const next = char.foci.map((f, i) => i === index ? { ...f, specialistSkill: skill as Skill } : f);
    onChange({ foci: next });
  }

  function upgradeToLevel2(index: number) {
    if (picksUsed >= totalPicks) return;
    const next = char.foci.map((f, i) => i === index ? { ...f, level: 2 as const } : f);
    onChange({ foci: next });
  }

  function downgradeToLevel1(index: number) {
    const next = char.foci.map((f, i) => i === index ? { ...f, level: 1 as const } : f);
    onChange({ foci: next });
  }

  // ── Wild Psychic Talent helpers ──────────────────────────────────────────────
  /** Discipline pick + ability pick options for Wild Psychic Talent. */
  function wptAbilityOptions(disciplineName: string) {
    const disc = PSYCHIC_DISCIPLINES.find(d => d.skill === disciplineName);
    if (!disc) return [];
    return [
      { value: `${disc.coreTechnique.name} (Core Level 0)`, label: `${disc.coreTechnique.name} — core level-0 power` },
      ...disc.techniques.filter(t => t.level === 1).map(t => ({
        value: t.name,
        label: `${t.name} — level-1 technique`,
      })),
    ];
  }

  /** Changing the level-1 discipline resets all ability picks. */
  function setWptDiscipline(focusIndex: number, discipline: string) {
    const nextFoci = char.foci.map((f, i) => i === focusIndex ? { ...f, specialistSkill: discipline } : f);
    onChange({ foci: nextFoci, psychicTechniques: [] });
  }

  /** Update one ability pick (0 = level-1 pick, 1 = level-2 pick). */
  function setWptAbility(pickIndex: 0 | 1, discipline: string, techniqueName: string) {
    const arr: (PsychicTechniqueSelection | undefined)[] = [
      char.psychicTechniques[0],
      char.psychicTechniques[1],
    ];
    arr[pickIndex] = { discipline, techniqueName };
    onChange({ psychicTechniques: arr.filter((x): x is PsychicTechniqueSelection => !!x && !!x.discipline) });
  }

  /** Changing the level-2 discipline clears the level-2 ability pick. */
  function setWptLevel2Disc(discipline: string) {
    const p0 = char.psychicTechniques[0];
    const base: PsychicTechniqueSelection[] = p0 ? [p0] : [];
    if (discipline) base.push({ discipline, techniqueName: '' });
    onChange({ psychicTechniques: base });
  }

  /** Remove Wild Psychic Talent and clear its stored ability picks. */
  function removeWptFocus(index: number) {
    onChange({ foci: char.foci.filter((_, i) => i !== index), psychicTechniques: [] });
  }

  const picksLeft = totalPicks - picksUsed;

  return (
    <div className="space-y-5">
      <div className="glass-card rounded-lg p-4 text-sm text-gray-400">
        <p>
          You have <span className="text-amber-300 font-bold">{totalPicks}</span> focus pick{totalPicks > 1 ? 's' : ''}
          {picksLeft > 0
            ? <span className="text-gray-500"> — <span className="text-amber-400">{picksLeft}</span> remaining</span>
            : <span className="text-green-400"> — all used</span>}.
          {isExpert && ' Experts get 1 extra non-combat focus.'}
          {isWarrior && ' Warriors get 1 extra combat focus.'}
          <PageRef page={19} note="Step 7 — All PCs get 1 focus level. Experts/Partial Experts get a free additional non-combat focus; Warriors/Partial Warriors get a free additional combat focus. Both extra picks can be spent on the same focus to start at level 2." />
        </p>
        <p className="text-xs mt-1">Foci that grant a bonus skill add it to your skill list (level-0, or level-1 if you already have it). Specialist may be taken more than once for different skills.</p>
      </div>

      {/* Filter / search */}
      <div className="flex gap-3 flex-wrap items-center">
        {(['all', 'combat', 'noncombat'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
              filter === f
                ? 'border-amber-500 bg-amber-900/30 text-amber-300'
                : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
            }`}
          >
            {f === 'all' ? 'All' : f === 'combat' ? 'Combat' : 'Non-Combat'}
          </button>
        ))}
        <input
          className="input py-1 text-sm max-w-xs"
          placeholder="Search foci..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Focus list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(focus => {
          const selected = isSelected(focus.name);
          const count = instancesOf(focus.name).length;
          const canPick = picksUsed < totalPicks && (focus.repeatable || !selected);
          const clickable = canPick || selected;
          const focusInstance = char.foci.find(x => x.name === focus.name);
          const currentLevel = focusInstance?.level ?? 1;
          const focusIndex = char.foci.findIndex(x => x.name === focus.name);
          const kind = focusNeedsSkillChoice(focus.name);
          return (
            <div
              key={focus.name}
              onClick={() => clickable && toggleFocus(focus.name)}
              className={`text-left rounded-lg border p-4 transition-colors w-full ${
                selected
                  ? 'border-amber-500 bg-amber-900/10 hover:border-amber-400 cursor-pointer'
                  : canPick
                  ? 'border-gray-700 bg-gray-800 hover:border-amber-600 hover:bg-gray-700/80 cursor-pointer'
                  : 'border-gray-800 bg-gray-900/50 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className={`font-semibold ${selected ? 'text-amber-300' : 'text-gray-200'}`}>{focus.name}</span>
                  {focus.isCombat && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-800">Combat</span>}
                  {focus.repeatable && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800">Repeatable</span>}
                </div>
                {/* Repeatable: add/remove stepper. Non-repeatable selected + 2 picks: level toggle. Others: ✓ / hint */}
                {focus.repeatable ? (
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { const idx = char.foci.map(f => f.name).lastIndexOf(focus.name); if (idx >= 0) removeFocusAt(idx); }}
                      disabled={count === 0}
                      className="w-6 h-6 rounded bg-gray-700 hover:bg-red-900/40 disabled:opacity-30 text-gray-300 text-sm flex items-center justify-center"
                    >−</button>
                    <span className="w-5 text-center text-sm text-amber-300">{count}</span>
                    <button
                      onClick={() => addFocus(focus.name)}
                      disabled={picksUsed >= totalPicks}
                      className="w-6 h-6 rounded bg-gray-700 hover:bg-amber-900/40 disabled:opacity-30 text-gray-300 text-sm flex items-center justify-center"
                    >+</button>
                  </div>
                ) : selected && totalPicks >= 2 ? (
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => currentLevel === 2 && downgradeToLevel1(focusIndex)}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                        currentLevel === 1
                          ? 'border-amber-500 bg-amber-900/40 text-amber-300'
                          : 'border-gray-600 text-gray-500 hover:border-amber-600 hover:text-amber-400 cursor-pointer'
                      }`}
                    >Lv1</button>
                    <button
                      onClick={() => currentLevel === 1 && upgradeToLevel2(focusIndex)}
                      disabled={currentLevel === 1 && picksLeft === 0}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                        currentLevel === 2
                          ? 'border-green-500 bg-green-900/40 text-green-300'
                          : 'border-gray-600 text-gray-500 hover:border-green-600 hover:text-green-400 disabled:opacity-30 disabled:cursor-not-allowed'
                      }`}
                    >Lv2</button>
                  </div>
                ) : selected ? (
                  <span className="text-amber-400 text-lg flex-shrink-0">✓</span>
                ) : canPick ? (
                  <span className="text-gray-600 text-xs flex-shrink-0">click to pick</span>
                ) : null}
              </div>
              <p className="text-xs text-gray-500 mb-3">{focus.description}</p>
              {selected && !focus.repeatable && kind && (
                <div className="flex items-center gap-2 mb-3" onClick={e => e.stopPropagation()}>
                  <span className="text-xs text-gray-400 flex-shrink-0">Bonus skill:</span>
                  <select
                    value={focusInstance?.specialistSkill ?? ''}
                    onChange={e => setInstanceSkill(focusIndex, e.target.value)}
                    className="input py-0.5 text-xs"
                  >
                    {choicesFor(focus.name).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
              {focus.levels.map((lvl, i) => {
                const isActiveLevel = selected && (i + 1) === currentLevel;
                return (
                  <div key={i} className={`text-xs rounded p-2 mb-1 border ${
                    isActiveLevel && i === 1
                      ? 'bg-green-900/25 border-green-700/30'
                      : isActiveLevel
                      ? 'bg-amber-900/25 border-amber-700/30'
                      : i === 0
                      ? 'bg-gray-700/60 border-transparent'
                      : 'bg-gray-700/30 border-transparent'
                  }`}>
                    <span className={`font-medium ${isActiveLevel ? (i === 1 ? 'text-green-400' : 'text-amber-400') : 'text-amber-500'}`}>Level {i + 1}: </span>
                    <span className={isActiveLevel ? 'text-gray-100' : 'text-gray-300'}>{lvl.description}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Selected foci — summary at the bottom (consistent with other steps) */}
      {char.foci.length > 0 && (
        <div className="border-t border-gray-700 pt-4 space-y-2">
          <p className="text-sm font-medium text-gray-400">Selected Foci</p>
          {char.foci.map((f, i) => {
            if (f.name === 'Wild Psychic Talent') {
              const p0 = char.psychicTechniques[0];
              const p1 = char.psychicTechniques[1];
              return (
                <div key={i} className="flex flex-col gap-2 px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/50">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-300 font-medium text-sm">{f.name}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-800/50">Lvl {f.level}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <button onClick={() => removeWptFocus(i)} className="text-amber-500 hover:text-red-400 text-sm">×</button>
                    </div>
                  </div>
                  {/* Level-1 discipline picker */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400 w-24 flex-shrink-0">Discipline:</span>
                    <select
                      value={f.specialistSkill ?? ''}
                      onChange={e => setWptDiscipline(i, e.target.value)}
                      className="input py-0.5 text-xs"
                    >
                      <option value="">— pick a discipline —</option>
                      {PSYCHIC_DISCIPLINES.map(d => <option key={d.skill} value={d.skill}>{d.name}</option>)}
                    </select>
                  </div>
                  {/* Level-1 ability picker (core level-0 or standalone level-1 technique) */}
                  {f.specialistSkill && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-400 w-24 flex-shrink-0">Pick 1:</span>
                      <select
                        value={p0?.techniqueName ?? ''}
                        onChange={e => setWptAbility(0, f.specialistSkill!, e.target.value)}
                        className="input py-0.5 text-xs"
                      >
                        <option value="">— choose ability —</option>
                        {wptAbilityOptions(f.specialistSkill).map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {/* Level-2 ability picker — any discipline */}
                  {f.level === 2 && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400 w-24 flex-shrink-0">Pick 2 from:</span>
                        <select
                          value={p1?.discipline ?? ''}
                          onChange={e => setWptLevel2Disc(e.target.value)}
                          className="input py-0.5 text-xs"
                        >
                          <option value="">— pick a discipline —</option>
                          {PSYCHIC_DISCIPLINES.map(d => <option key={d.skill} value={d.skill}>{d.name}</option>)}
                        </select>
                      </div>
                      {p1?.discipline && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-400 w-24 flex-shrink-0">Pick 2:</span>
                          <select
                            value={p1?.techniqueName ?? ''}
                            onChange={e => setWptAbility(1, p1.discipline, e.target.value)}
                            className="input py-0.5 text-xs"
                          >
                            <option value="">— choose ability —</option>
                            {wptAbilityOptions(p1.discipline).map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            const kind = focusNeedsSkillChoice(f.name);
            return (
              <div key={i} className="flex items-center gap-2 flex-wrap px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/50">
                <span className="text-amber-300 font-medium text-sm">{f.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-800/50">Lvl {f.level}</span>
                {kind && f.specialistSkill && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-800/50">{f.specialistSkill}</span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => removeFocusAt(i)} className="text-amber-500 hover:text-red-400 text-sm">×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
