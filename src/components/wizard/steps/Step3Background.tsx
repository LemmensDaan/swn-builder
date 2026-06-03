import { useState } from 'react';
import type { Character } from '../../../types/character';
import { BACKGROUNDS } from '../../../data/backgrounds';
import PageRef from '../../ui/PageRef';

interface Props {
  char: Character;
  onChange: (patch: Partial<Character>) => void;
}

export default function Step3Background({ char, onChange }: Props) {
  const [search, setSearch] = useState('');

  const filtered = BACKGROUNDS.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.description.toLowerCase().includes(search.toLowerCase())
  );

  const selected = BACKGROUNDS.find(b => b.name === char.background);

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">
        Choose the career or life your hero came from. You gain the listed free skill at level-0 plus additional skills from the tables.
        <PageRef page={9} note="Pick or roll a background from the 20 options. You gain the free skill, then pick 2 from the Learning table (or roll up to 3 times across Growth and Learning tables)." />
      </p>
      <input
        className="input w-full max-w-sm"
        placeholder="Search backgrounds..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(bg => {
          const isSelected = bg.name === char.background;
          return (
            <button
              key={bg.name}
              onClick={() => onChange({ background: bg.name })}
              className={`text-left p-4 rounded-lg border transition-colors ${
                isSelected
                  ? 'border-amber-500 bg-amber-900/20'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-500'
              }`}
            >
              <div className="mb-1">
                <span className={`font-semibold ${isSelected ? 'text-amber-300' : 'text-gray-200'}`}>
                  {bg.name}
                </span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{bg.description}</p>
              {/* Quick skills — the free skill is highlighted (it's one of the three) */}
              <div className="mt-2 flex flex-wrap gap-1">
                {bg.quickSkills.map(s => (
                  <span
                    key={s}
                    className={`text-xs px-2 py-0.5 rounded ${
                      s === bg.freeSkill
                        ? 'bg-green-900/40 text-green-300 border border-green-700/50'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {s}{s === bg.freeSkill ? ' · free' : ''}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="bg-gray-800 border border-amber-700/50 rounded-lg p-5 space-y-4">
          <h3 className="text-amber-300 font-bold text-lg">{selected.name}</h3>
          <p className="text-gray-300 text-sm">{selected.description}</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Growth Table (d6)</p>
              <ol className="space-y-1">
                {selected.growth.map((e, i) => (
                  <li key={i} className="text-sm">
                    <span className="text-gray-500 w-4 inline-block">{i + 1}.</span>
                    <span className="text-gray-300 ml-1">{e}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Learning Table (d8)</p>
              <ol className="space-y-1">
                {selected.learning.map((e, i) => (
                  <li key={i} className="text-sm">
                    <span className="text-gray-500 w-4 inline-block">{i + 1}.</span>
                    <span className="text-gray-300 ml-1">{e}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="text-sm text-gray-400">
            <span className="text-gray-300 font-medium">Free Skill: </span>
            <span className="text-green-300">{selected.freeSkill}-0</span>
            {selected.quickSkills.filter(s => s !== selected.freeSkill).length > 0 && (
              <>
                &nbsp;&nbsp;
                <span className="text-gray-300 font-medium">Other Quick Skills: </span>
                <span className="text-amber-300">
                  {selected.quickSkills.filter(s => s !== selected.freeSkill).join(', ')}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
