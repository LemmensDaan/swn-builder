import { useState } from 'react';
import type { Character, AttributeName } from '../../../types/character';
import { attrMod } from '../../../types/character';
import PageRef from '../../ui/PageRef';

const ATTRS: { key: AttributeName; label: string; desc: string; affects: string }[] = [
  { key: 'STR', label: 'Strength', desc: 'Physical prowess, melee combat, carrying gear, brute force', affects: 'Melee damage, encumbrance (STR ÷ 2)' },
  { key: 'DEX', label: 'Dexterity', desc: 'Speed, evasion, manual dexterity, reaction time, combat initiative', affects: 'Ranged hit rolls, AC bonus, Evasion save' },
  { key: 'CON', label: 'Constitution', desc: 'Hardiness, enduring injury, resisting toxins, going without food or sleep', affects: 'Hit points per level, System Strain max, Physical save' },
  { key: 'INT', label: 'Intelligence', desc: 'Memory, reasoning, technical skills, general education', affects: 'Evasion save' },
  { key: 'WIS', label: 'Wisdom', desc: 'Noticing things, making judgments, reading situations, intuition', affects: 'Mental save, Psychic Effort (best of WIS/CON)' },
  { key: 'CHA', label: 'Charisma', desc: 'Commanding, charming, attracting attention, being taken seriously', affects: 'Mental save' },
];

// Standard array values per p.6
const ARRAY_VALUES = [14, 12, 11, 10, 9, 7] as const;

type Method = 'roll' | 'array' | 'manual';

function roll3d6() {
  return Array.from({ length: 3 }, () => Math.ceil(Math.random() * 6)).reduce((a, b) => a + b, 0);
}

const DEFAULT_ATTRS: Record<AttributeName, number> = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };

interface Props {
  char: Character;
  onChange: (patch: Partial<Character>) => void;
  isEditing?: boolean;
}

export default function Step2Attributes({ char, onChange, isEditing }: Props) {
  // When editing an existing character, default to manual so current values are immediately visible
  // Default to manual if attributes have already been set (non-default values)
  // so that navigating back to this step always shows current values correctly
  const [method, setMethod] = useState<Method>(() => {
    const hasValues = Object.values(char.attributes).some(v => v !== 10);
    return (isEditing || hasValues) ? 'manual' : 'array';
  });
  // For roll mode: the 6 rolled values (in order: STR DEX CON INT WIS CHA)
  const [rolls, setRolls] = useState<number[]>([]);
  // Which attribute (if any) has been bumped to 14 after rolling
  const [bumped14, setBumped14] = useState<AttributeName | null>(null);

  // For array mode: which ARRAY_VALUES[i] is assigned to which attribute key (null = unassigned)
  // We track by the attribute key → value (or null)
  const [arrayAssign, setArrayAssign] = useState<Record<AttributeName, number | null>>({
    STR: null, DEX: null, CON: null, INT: null, WIS: null, CHA: null,
  });

  function switchMethod(m: Method) {
    setMethod(m);
    // Reset all state on method change
    setRolls([]);
    setBumped14(null);
    setArrayAssign({ STR: null, DEX: null, CON: null, INT: null, WIS: null, CHA: null });
    onChange({ attributes: { ...DEFAULT_ATTRS } });
  }

  // --- Roll mode ---
  function handleRollAll() {
    const r = ATTRS.map(() => roll3d6());
    setRolls(r);
    setBumped14(null);
    const attrs = { ...char.attributes };
    ATTRS.forEach((a, i) => { attrs[a.key] = r[i]; });
    onChange({ attributes: attrs });
  }

  function handleBump14(key: AttributeName) {
    setBumped14(key);
    onChange({ attributes: { ...char.attributes, [key]: 14 } });
  }

  // --- Array mode ---
  // Returns values that are not currently assigned to ANY attribute (except the one being edited)
  function availableForAttr(key: AttributeName): number[] {
    const usedElsewhere = ATTRS
      .filter(a => a.key !== key)
      .map(a => arrayAssign[a.key])
      .filter((v): v is number => v !== null);
    return ARRAY_VALUES.filter(v => !usedElsewhere.includes(v));
  }

  function handleArrayPick(key: AttributeName, raw: string) {
    const val = raw === '' ? null : Number(raw);
    const next = { ...arrayAssign, [key]: val };
    setArrayAssign(next);
    const attrs = { ...char.attributes };
    ATTRS.forEach(a => { if (next[a.key] !== null) attrs[a.key] = next[a.key] as number; });
    onChange({ attributes: attrs });
  }

  const allAssigned = ATTRS.every(a => arrayAssign[a.key] !== null);

  // --- Manual mode ---
  function handleManual(key: AttributeName, val: number) {
    onChange({ attributes: { ...char.attributes, [key]: Math.max(3, Math.min(18, val)) } });
  }

  return (
    <div className="space-y-6">

      {/* Rule citation */}
      <p className="text-sm text-gray-500">
        Roll or assign your six attributes.
        <PageRef page={6} note="Roll 3d6 six times and assign in order, OR use the array 14/12/11/10/9/7 assigned as you wish. If you roll, you may then change one attribute to 14." />
      </p>

      {/* Method selector */}
      <div className="flex gap-3 flex-wrap">
        {(['array', 'roll', 'manual'] as Method[]).map(m => (
          <button
            key={m}
            onClick={() => switchMethod(m)}
            className={`px-4 py-2 rounded text-sm font-medium border transition-colors ${
              method === m
                ? 'border-amber-500 bg-amber-900/30 text-amber-300'
                : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
            }`}
          >
            {m === 'roll' ? '3d6 in Order' : m === 'array' ? 'Standard Array' : 'Manual Entry'}
          </button>
        ))}
      </div>

      {/* Method-specific controls */}
      {method === 'array' && (
        <div className="bg-gray-800/60 rounded-lg p-4 text-sm text-gray-400 space-y-1">
          <p>Assign each of <span className="text-amber-300 font-semibold">{ARRAY_VALUES.join(', ')}</span> to one attribute. Each value can only be used once.</p>
          {!allAssigned && (
            <p className="text-xs text-gray-600 italic">{ATTRS.filter(a => arrayAssign[a.key] === null).length} attribute{ATTRS.filter(a => arrayAssign[a.key] === null).length !== 1 ? 's' : ''} still unassigned.</p>
          )}
        </div>
      )}

      {method === 'roll' && (
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={handleRollAll}
            className="px-4 py-2 rounded bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium"
          >
            🎲 Roll 3d6 × 6 (in order)
          </button>
          {rolls.length > 0 && (
            <p className="text-sm text-gray-400">
              {bumped14
                ? <span className="text-amber-300">Bump applied to {bumped14}.</span>
                : <span className="text-amber-300">Optionally set one attribute to 14 (once).</span>
              }
            </p>
          )}
        </div>
      )}

      {method === 'manual' && (
        <p className="text-sm text-gray-500">Enter any values from 3–18. No restrictions are enforced.</p>
      )}

      {/* Attribute grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ATTRS.map((a, i) => {
          const val = char.attributes[a.key];
          const m = attrMod(val);
          const modStr = m >= 0 ? `+${m}` : `${m}`;
          const modColor = m > 0 ? 'text-green-400' : m < 0 ? 'text-red-400' : 'text-gray-500';

          return (
            <div key={a.key} className="glass-card rounded-lg p-4 border border-gray-700 space-y-2">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-bold text-amber-300 text-base">{a.key}</span>
                  <span className="text-gray-400 text-sm ml-2">{a.label}</span>
                </div>
                <div className={`text-xl font-bold ${modColor}`}>{modStr}</div>
              </div>

              <p className="text-xs text-gray-500 leading-snug">{a.desc}</p>
              <p className="text-xs text-gray-600 italic">{a.affects}</p>

              {/* Input by method */}
              {method === 'array' && (
                <select
                  value={arrayAssign[a.key] ?? ''}
                  onChange={e => handleArrayPick(a.key, e.target.value)}
                  className="input py-1.5 text-sm"
                >
                  <option value="">— pick —</option>
                  {availableForAttr(a.key).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                  {/* Keep current selected value in list even if pool is showing it */}
                  {arrayAssign[a.key] !== null && !availableForAttr(a.key).includes(arrayAssign[a.key]!) && (
                    <option value={arrayAssign[a.key]!}>{arrayAssign[a.key]}</option>
                  )}
                </select>
              )}

              {method === 'roll' && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-100 w-10 text-center">
                    {rolls.length > 0 ? val : '—'}
                  </span>
                  {rolls.length > 0 && (
                    <span className="text-xs text-gray-600">rolled {rolls[i]}</span>
                  )}
                  {rolls.length > 0 && !bumped14 && (
                    <button
                      onClick={() => handleBump14(a.key)}
                      className="ml-auto text-xs px-2 py-1 rounded bg-amber-800 hover:bg-amber-700 text-amber-200"
                    >
                      Set 14
                    </button>
                  )}
                  {bumped14 === a.key && (
                    <span className="ml-auto text-xs text-amber-400">★ 14</span>
                  )}
                </div>
              )}

              {method === 'manual' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleManual(a.key, val - 1)}
                    className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold flex items-center justify-center text-lg"
                  >−</button>
                  <span className="w-12 text-center text-2xl font-bold text-gray-100">{val}</span>
                  <button
                    onClick={() => handleManual(a.key, val + 1)}
                    className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold flex items-center justify-center text-lg"
                  >+</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modifier reference table */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Modifier Table</span>
          <PageRef page={6} note="Modifiers apply to relevant skill checks and other rolls. Only the modifier is applied, not the full score." />
        </div>
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          {[
            { range: '3', mod: '−2' },
            { range: '4–7', mod: '−1' },
            { range: '8–13', mod: '+0' },
            { range: '14–17', mod: '+1' },
            { range: '18', mod: '+2' },
          ].map(row => (
            <div key={row.range} className="bg-gray-900/60 rounded py-2">
              <div className="text-gray-500">{row.range}</div>
              <div className="font-bold text-gray-200 mt-0.5">{row.mod}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
