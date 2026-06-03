import type { Character, ClassName, AdventurerPartial } from '../../../types/character';
import PageRef from '../../ui/PageRef';

interface Props {
  char: Character;
  onChange: (patch: Partial<Character>) => void;
}

const CLASSES: {
  name: ClassName;
  tagline: string;
  desc: string;
  hpDie: string;
  attackBonus: string;
  abilities: string[];
}[] = [
  {
    name: 'Expert',
    tagline: 'The master of skills and non-combat problem-solving.',
    desc: 'Doctors, pilots, hackers, grifters — anyone whose concept focuses on excelling at a non-combat skill.',
    hpDie: '1d6',
    attackBonus: '+0 at 1st, +½ level (rounded down)',
    abilities: [
      'Free level in a non-combat focus related to your background.',
      'Once per scene, reroll any failed skill check and take the better result.',
      'Gain a bonus skill point each level for any non-combat, non-psychic skill.',
    ],
  },
  {
    name: 'Psychic',
    tagline: 'A rare individual able to channel metadimensional energies.',
    desc: 'Only those with Metadimensional Extroversion Syndrome (MES) and proper training can be Psychics.',
    hpDie: '1d6',
    attackBonus: '+0 at 1st, +½ level (rounded down)',
    abilities: [
      'Can learn and use all six psychic disciplines and their techniques.',
      'Choose any two psychic skills as bonus skills at character creation.',
      'Maximum Effort = 1 + highest psychic skill + best of Wis/Con modifier.',
    ],
  },
  {
    name: 'Warrior',
    tagline: 'The hardened combatant, unparalleled in violence.',
    desc: 'A natural killer or trained fighter. Best attack bonus and hit points in the game.',
    hpDie: '1d6+2',
    attackBonus: '+1 at 1st, equal to level thereafter',
    abilities: [
      'Free level in a combat focus related to your background.',
      'Once per scene as an Instant: negate a hit against you OR turn your own miss into a hit.',
      'Gain +2 maximum hit points at each character level.',
    ],
  },
  {
    name: 'Adventurer',
    tagline: 'A flexible hybrid — choose two partial classes.',
    desc: "For heroes who don't fit neatly into one category. Each partial class grants weaker versions of that class's benefits.",
    hpDie: '1d6 (+2 if Partial Warrior)',
    attackBonus: '+½ level (+1 at 1st/5th if Partial Warrior)',
    abilities: [
      'Partial Expert: Free non-combat focus + bonus non-psychic skill point per level.',
      'Partial Psychic: One psychic discipline only; Effort = 1 + skill level + best Wis/Con mod.',
      'Partial Warrior: Free combat focus + +1 attack at 1st and 5th level + +2 HP per level.',
    ],
  },
];

const PARTIAL_OPTIONS: AdventurerPartial[] = ['Partial Expert', 'Partial Psychic', 'Partial Warrior'];

export default function Step5Class({ char, onChange }: Props) {
  // Default to empty — user selects manually
  const selected: AdventurerPartial[] = char.adventurerPartials ?? [];

  function selectClass(cls: ClassName) {
    // Switching class resets partials
    onChange({ class: cls, adventurerPartials: undefined });
  }

  function togglePartial(p: AdventurerPartial) {
    const has = selected.includes(p);
    if (has) {
      // Deselect
      const next = selected.filter(x => x !== p);
      onChange({ adventurerPartials: next.length === 2 ? next as [AdventurerPartial, AdventurerPartial] : undefined });
    } else {
      // Select — only if fewer than 2 chosen
      if (selected.length >= 2) return;
      const next = [...selected, p];
      onChange({ adventurerPartials: next.length === 2 ? next as [AdventurerPartial, AdventurerPartial] : undefined });
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Your class represents the tools your hero relies on most in adventuring life. It doesn't have to match your background.
        <PageRef page={16} note="Step 6 — Expert: best at non-combat skills, once-per-scene reroll. Psychic: psionic disciplines and Effort. Warrior: best attack bonus (+level), +2 HP/level, once-per-scene auto-hit or negate-hit. Adventurer: pick two partial classes." />
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CLASSES.map(cls => {
          const isSelected = char.class === cls.name;
          return (
            <button
              key={cls.name}
              onClick={() => selectClass(cls.name)}
              className={`text-left p-5 rounded-lg border transition-colors ${
                isSelected
                  ? 'border-amber-500 bg-amber-900/20'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-500'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className={`text-lg font-bold ${isSelected ? 'text-amber-300' : 'text-gray-200'}`}>
                    {cls.name}
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">{cls.tagline}</p>
                </div>
                {isSelected && <span className="text-amber-400 text-xl">✓</span>}
              </div>
              <p className="text-sm text-gray-400 mb-3">{cls.desc}</p>
              <div className="text-xs text-gray-500 mb-2">
                <span className="font-medium text-gray-400">HP: </span>{cls.hpDie} + CON mod
                &nbsp;|&nbsp;
                <span className="font-medium text-gray-400">Attack: </span>{cls.attackBonus}
              </div>
              <ul className="space-y-1">
                {cls.abilities.map((a, i) => (
                  <li key={i} className="text-xs text-gray-400 flex gap-2">
                    <span className="text-amber-600 flex-shrink-0">•</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {/* Partial class selector — only shown for Adventurer */}
      {char.class === 'Adventurer' && (
        <div className="bg-gray-800 border border-amber-700/40 rounded-lg p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-amber-300 mb-1">Choose Two Partial Classes</p>
            <p className="text-xs text-gray-500">
              Select exactly 2. Each grants a weakened version of that class's abilities.
              The third is greyed out once 2 are selected.
              <PageRef page={22} note="Partial Expert: free non-combat focus + extra skill point per level. Partial Psychic: one discipline only. Partial Warrior: free combat focus + +1 attack at 1st/5th + +2 HP/level." />
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {PARTIAL_OPTIONS.map(p => {
              const active = selected.includes(p);
              const maxed = selected.length >= 2 && !active;
              return (
                <button
                  key={p}
                  onClick={() => togglePartial(p)}
                  disabled={maxed}
                  className={`px-4 py-2 rounded border text-sm font-medium transition-colors ${
                    active
                      ? 'border-amber-500 bg-amber-900/30 text-amber-300'
                      : maxed
                      ? 'border-gray-700 bg-gray-800 text-gray-600 cursor-not-allowed'
                      : 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-400 hover:text-gray-200'
                  }`}
                >
                  {p}
                  {active && <span className="ml-1.5 text-amber-500">✓</span>}
                </button>
              );
            })}
          </div>

          {selected.length === 0 && (
            <p className="text-xs text-red-400">Select 2 partial classes to continue.</p>
          )}
          {selected.length === 1 && (
            <p className="text-xs text-amber-400">Select 1 more partial class.</p>
          )}
          {selected.length === 2 && (
            <p className="text-xs text-green-400">✓ {selected.join(' + ')}</p>
          )}
        </div>
      )}
    </div>
  );
}
