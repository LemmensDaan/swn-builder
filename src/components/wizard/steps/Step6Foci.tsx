import { useState } from 'react';
import type { Character } from '../../../types/character';
import type { FocusSelection } from '../../../types/character';
import { FOCI } from '../../../data/foci';
import { SKILLS } from '../../../data/skills';
import type { Skill } from '../../../data/skills';
import PageRef from '../../ui/PageRef';

interface Props {
  char: Character;
  onChange: (patch: Partial<Character>) => void;
}

export default function Step6Foci({ char, onChange }: Props) {
  const [filter, setFilter] = useState<'all' | 'combat' | 'noncombat'>('all');
  const [search, setSearch] = useState('');
  const [specialistSkill, setSpecialistSkill] = useState<Skill>('Administer');

  const isExpert = char.class === 'Expert' || char.adventurerPartials?.includes('Partial Expert');
  const isWarrior = char.class === 'Warrior' || char.adventurerPartials?.includes('Partial Warrior');
  const isPsychic = char.class === 'Psychic' || char.adventurerPartials?.includes('Partial Psychic');

  // Per p.19 step 7: all PCs get 1 pick. Expert/Partial Expert adds 1 non-combat pick.
  // Warrior/Partial Warrior adds 1 combat pick. These stack for Adventurer with both.
  const totalPicks = 1 + (isExpert ? 1 : 0) + (isWarrior ? 1 : 0);

  const filtered = FOCI.filter(f => {
    if (filter === 'combat' && !f.isCombat) return false;
    if (filter === 'noncombat' && f.isCombat) return false;
    if (f.isPsychicOnly && !isPsychic) return false;
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function getSelected(name: string): FocusSelection | undefined {
    return char.foci.find(f => f.name === name);
  }

  function toggleFocus(focusName: string) {
    const focus = FOCI.find(f => f.name === focusName);
    if (!focus) return;

    const existing = char.foci.find(f => f.name === focusName);
    let next: FocusSelection[];

    if (existing) {
      // Remove
      next = char.foci.filter(f => f.name !== focusName);
    } else if (char.foci.length < totalPicks) {
      // Add at level 1
      next = [
        ...char.foci,
        {
          name: focusName,
          level: 1,
          specialistSkill: focusName === 'Specialist' ? specialistSkill : undefined,
        },
      ];
    } else {
      return; // No more picks available
    }

    onChange({ foci: next });
  }

  function upgradeToLevel2(focusName: string) {
    const next = char.foci.map(f =>
      f.name === focusName ? { ...f, level: 2 as const } : f
    );
    onChange({ foci: next });
  }

  return (
    <div className="space-y-5">
      <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-400">
        <p>
          You have <span className="text-amber-300 font-bold">{totalPicks}</span> focus pick{totalPicks > 1 ? 's' : ''}.
          {isExpert && ' Experts get 1 extra non-combat focus.'}
          {isWarrior && ' Warriors get 1 extra combat focus.'}
          <PageRef page={19} note="Step 7 — All PCs get 1 focus level. Experts/Partial Experts get a free additional non-combat focus; Warriors/Partial Warriors get a free additional combat focus. Both extra picks can be spent on the same focus to start at level 2." />
        </p>
        <p className="text-xs mt-1">You can take level 2 of a focus you already have instead of picking a new one. A bonus skill from a focus: if you don't have it → level-0; if level-0 → level-1; if already level-1 → pick any other non-psychic skill.</p>
      </div>

      {/* Selected */}
      {char.foci.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {char.foci.map(f => (
            <div key={f.name} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-900/30 border border-amber-700 text-amber-300 text-sm">
              <span>{f.name} {f.level > 1 ? `(Lvl ${f.level})` : ''}</span>
              {f.specialistSkill && <span className="text-amber-500 text-xs">/{f.specialistSkill}</span>}
              <button
                onClick={() => upgradeToLevel2(f.name)}
                disabled={f.level === 2}
                className="ml-1 text-xs text-amber-500 hover:text-green-400 disabled:opacity-30"
                title="Upgrade to Level 2"
              >↑</button>
              <button
                onClick={() => toggleFocus(f.name)}
                className="ml-1 text-amber-500 hover:text-red-400"
              >×</button>
            </div>
          ))}
          <span className="text-xs text-gray-500 self-center">{totalPicks - char.foci.length} pick{totalPicks - char.foci.length !== 1 ? 's' : ''} remaining</span>
        </div>
      )}

      {/* Specialist skill selector */}
      {(char.foci.some(f => f.name === 'Specialist') || filter === 'all') && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-400">Specialist skill:</span>
          <select
            className="input py-1 text-sm"
            value={specialistSkill}
            onChange={e => setSpecialistSkill(e.target.value as Skill)}
          >
            {SKILLS.filter(s => !['Stab', 'Shoot', 'Punch'].includes(s)).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

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
          const sel = getSelected(focus.name);
          const canPick = !sel && char.foci.length < totalPicks;
          return (
            <div
              key={focus.name}
              className={`rounded-lg border p-4 transition-colors ${
                sel
                  ? 'border-amber-500 bg-amber-900/10'
                  : 'border-gray-700 bg-gray-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className={`font-semibold ${sel ? 'text-amber-300' : 'text-gray-200'}`}>{focus.name}</span>
                  {focus.isCombat && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-800">Combat</span>}
                  {focus.repeatable && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800">Repeatable</span>}
                </div>
                {canPick && (
                  <button
                    onClick={() => toggleFocus(focus.name)}
                    className="text-xs px-2 py-1 rounded bg-amber-700 hover:bg-amber-600 text-white flex-shrink-0"
                  >
                    Pick
                  </button>
                )}
                {sel && (
                  <button
                    onClick={() => toggleFocus(focus.name)}
                    className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-red-900 text-gray-300 flex-shrink-0"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-3">{focus.description}</p>
              {focus.levels.map((lvl, i) => (
                <div key={i} className={`text-xs rounded p-2 mb-1 ${i === 0 ? 'bg-gray-700/60' : 'bg-gray-700/30'}`}>
                  <span className="text-amber-500 font-medium">Level {i + 1}: </span>
                  <span className="text-gray-300">{lvl.description}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
