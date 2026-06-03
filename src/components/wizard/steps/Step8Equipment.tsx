import { useState } from 'react';
import type { Character } from '../../../types/character';
import { EQUIPMENT_PACKAGES, ARMOR_TABLE, RANGED_WEAPONS, MELEE_WEAPONS, GENERAL_EQUIPMENT } from '../../../data/equipment';
import type { EquipCategory } from '../../../data/equipment';
import PageRef from '../../ui/PageRef';

interface Props {
  char: Character;
  onChange: (patch: Partial<Character>) => void;
}

type EquipTab = 'packages' | 'armor' | 'ranged' | 'melee' | 'items';

const ITEM_CATEGORIES: EquipCategory[] = [
  'Ammo & Power', 'Communications', 'Computing', 'Medical', 'Field Equipment', 'Pharmaceuticals', 'Lifestyle',
];

// ── Credit helpers ────────────────────────────────────────────────────────────

function itemCost(name: string): number {
  return (
    ARMOR_TABLE.find(a => a.name === name)?.cost ??
    RANGED_WEAPONS.find(w => w.name === name)?.cost ??
    MELEE_WEAPONS.find(w => w.name === name)?.cost ??
    GENERAL_EQUIPMENT.find(g => g.name === name)?.cost ??
    0
  );
}

function computeSpent(char: Character): number {
  let total = 0;
  for (const a of char.armor) total += itemCost(a.name);
  for (const w of char.weapons) total += itemCost(w.name);
  return total;
}

// ── Credit bar component ──────────────────────────────────────────────────────

function CreditBar({ char, onChange }: { char: Character; onChange: (patch: Partial<Character>) => void }) {
  const spent = computeSpent(char);
  const remaining = char.credits - spent;
  const overBudget = remaining < 0;
  const pctUsed = char.credits > 0 ? Math.min(100, (spent / char.credits) * 100) : 0;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Editable starting budget */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-wide">Budget</span>
          <input
            type="number"
            min={0}
            step={50}
            value={char.credits}
            onChange={e => onChange({ credits: Math.max(0, Number(e.target.value)) })}
            className="input w-28 text-right py-1 text-sm font-mono"
          />
          <span className="text-gray-500 text-sm">cr</span>
        </div>

        {/* Remaining */}
        <div className="text-sm">
          <span className="text-gray-500">Remaining: </span>
          <span className={`font-mono font-bold ${overBudget ? 'text-red-400' : 'text-green-400'}`}>
            {remaining.toLocaleString()} cr
          </span>
          {overBudget && <span className="text-red-500 text-xs ml-1">over budget!</span>}
        </div>
      </div>

      {/* Progress bar — only when budget is set and something was spent */}
      {char.credits > 0 && spent > 0 && (
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${overBudget ? 'bg-red-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(pctUsed, 100)}%` }}
          />
        </div>
      )}

      {/* Gear cost breakdown — only when something has been bought */}
      {spent > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {char.armor.map(a => {
            const cost = itemCost(a.name);
            return cost > 0 ? (
              <span key={a.name} className="text-xs px-2 py-0.5 rounded bg-green-900/30 text-green-400 border border-green-800/50">
                {a.name}: {cost.toLocaleString()} cr
              </span>
            ) : null;
          })}
          {char.weapons.map(w => {
            const cost = itemCost(w.name);
            return cost > 0 ? (
              <span key={w.name} className="text-xs px-2 py-0.5 rounded bg-red-900/30 text-red-400 border border-red-800/50">
                {w.name}: {cost.toLocaleString()} cr
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Step8Equipment({ char, onChange }: Props) {
  const [tab, setTab] = useState<EquipTab>('packages');

  function rollCredits() {
    const r = (Math.ceil(Math.random() * 6) + Math.ceil(Math.random() * 6)) * 100;
    // Reset any individually-bought gear when re-rolling credits
    onChange({ credits: r });
  }

  function selectPackage(name: string) {
    const pkg = EQUIPMENT_PACKAGES.find(p => p.name === name);
    if (!pkg) return;
    // Package sets budget to leftover credits; individual gear (armor/weapons) persists
    onChange({ equipment: pkg.items, credits: pkg.credits });
  }

  function addArmor(name: string, ac: number, cost: number) {
    const next = [...char.armor, { name, ac }];
    // Deduct cost — allow going negative (show warning in bar)
    onChange({ armor: next, credits: char.credits - cost });
  }

  function removeArmor(name: string, cost: number) {
    const next = char.armor.filter(a => a.name !== name);
    onChange({ armor: next, credits: char.credits + cost });
  }

  function addWeapon(entry: Character['weapons'][number], cost: number) {
    const next = [...char.weapons, entry];
    onChange({ weapons: next, credits: char.credits - cost });
  }

  function removeWeapon(name: string, cost: number) {
    const next = char.weapons.filter(w => w.name !== name);
    onChange({ weapons: next, credits: char.credits + cost });
  }

  const [itemCategory, setItemCategory] = useState<EquipCategory>('Ammo & Power');

  const TABS: { key: EquipTab; label: string }[] = [
    { key: 'packages', label: 'Packages' },
    { key: 'armor', label: 'Armor' },
    { key: 'ranged', label: 'Ranged' },
    { key: 'melee', label: 'Melee' },
    { key: 'items', label: 'Items' },
  ];

  return (
    <div className="space-y-5">

      {/* Credit tracker — always visible */}
      <CreditBar char={char} onChange={onChange} />

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded text-sm font-medium border transition-colors ${
              tab === t.key
                ? 'border-amber-500 bg-amber-900/30 text-amber-300'
                : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Packages ───────────────────────────────────────────────── */}
      {tab === 'packages' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-sm text-gray-400">
              Choose a premade package (sets remaining credits to the listed amount), or roll 2d6 × 100 and buy gear individually.
              <PageRef page={25} note="Step 13 — Either pick a package or roll 2d6×100 for starting credits. Package credits shown are what's left after buying the included gear." />
            </p>
            <button onClick={rollCredits} className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium">
              🎲 Roll 2d6×100 cr
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {EQUIPMENT_PACKAGES.map(pkg => {
              const isSelected = char.equipment.join() === pkg.items.join();
              return (
                <button
                  key={pkg.name}
                  onClick={() => selectPackage(pkg.name)}
                  className={`text-left p-4 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-amber-500 bg-amber-900/20'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-200">{pkg.name}</span>
                    <span className="text-xs text-amber-400 font-mono">{pkg.credits} cr leftover</span>
                  </div>
                  <ul className="text-xs text-gray-400 space-y-0.5">
                    {pkg.items.map((item, i) => (
                      <li key={i} className="flex gap-1">
                        <span className="text-gray-600">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Armor ──────────────────────────────────────────────────── */}
      {tab === 'armor' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left py-2 pr-4">Armor</th>
                <th className="text-left py-2 pr-4">Type</th>
                <th className="text-right py-2 pr-3">AC</th>
                <th className="text-right py-2 pr-3">Cost</th>
                <th className="text-right py-2 pr-3">Enc</th>
                <th className="text-right py-2 pr-3">TL</th>
                <th className="py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {ARMOR_TABLE.map(a => {
                const isSelected = char.armor.some(ar => ar.name === a.name);
                const canAfford = char.credits >= a.cost;
                return (
                  <tr key={a.name} className={`border-b border-gray-800 hover:bg-gray-800/50 ${isSelected ? 'bg-amber-900/10' : ''}`}>
                    <td className="py-2 pr-4">
                      <div className={`font-medium ${isSelected ? 'text-amber-300' : 'text-gray-200'}`}>{a.name}</div>
                      {a.notes && <div className="text-xs text-gray-500">{a.notes}</div>}
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-500">{a.type}</td>
                    <td className="py-2 pr-3 text-right font-mono text-green-400">{a.ac}</td>
                    <td className={`py-2 pr-3 text-right font-mono text-xs ${!isSelected && !canAfford ? 'text-red-500' : 'text-gray-400'}`}>
                      {a.cost.toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 text-right text-gray-500 text-xs">{a.enc}</td>
                    <td className="py-2 pr-3 text-right text-gray-600 text-xs">TL{a.tl}</td>
                    <td className="py-2">
                      <button
                        onClick={() => isSelected ? removeArmor(a.name, a.cost) : addArmor(a.name, a.ac, a.cost)}
                        className={`text-xs px-2 py-1 rounded w-full ${
                          isSelected
                            ? 'bg-red-900/40 text-red-400 hover:bg-red-900'
                            : canAfford
                            ? 'bg-gray-700 text-gray-300 hover:bg-amber-900/40 hover:text-amber-300'
                            : 'bg-gray-800 text-gray-600 hover:bg-red-900/20 hover:text-red-400'
                        }`}
                        title={!isSelected && !canAfford ? `Need ${(a.cost - char.credits).toLocaleString()} more credits` : undefined}
                      >
                        {isSelected ? 'Remove' : canAfford ? `Add` : 'Add ⚠'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Ranged weapons ─────────────────────────────────────────── */}
      {tab === 'ranged' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left py-2 pr-4">Weapon</th>
                <th className="text-right py-2 pr-3">Dmg</th>
                <th className="text-right py-2 pr-3">Range</th>
                <th className="text-right py-2 pr-3">Cost</th>
                <th className="text-right py-2 pr-3">Mag</th>
                <th className="text-right py-2 pr-3">TL</th>
                <th className="py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {RANGED_WEAPONS.map(w => {
                const isSelected = char.weapons.some(x => x.name === w.name);
                const canAfford = char.credits >= w.cost;
                return (
                  <tr key={w.name} className={`border-b border-gray-800 hover:bg-gray-800/50 ${isSelected ? 'bg-amber-900/10' : ''}`}>
                    <td className="py-2 pr-4">
                      <div className={`font-medium ${isSelected ? 'text-amber-300' : 'text-gray-200'}`}>{w.name}</div>
                      <div className="flex gap-2 flex-wrap">
                        {w.energyWeapon && <span className="text-xs text-blue-400">Energy +1 hit</span>}
                        {w.burstMode && <span className="text-xs text-orange-400">Burst*</span>}
                      </div>
                      {w.notes && <div className="text-xs text-gray-500">{w.notes}</div>}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-red-400">{w.damage}</td>
                    <td className="py-2 pr-3 text-right text-gray-500 text-xs">{w.range}m</td>
                    <td className={`py-2 pr-3 text-right font-mono text-xs ${!isSelected && !canAfford ? 'text-red-500' : 'text-gray-400'}`}>
                      {w.cost.toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 text-right text-gray-500 text-xs">{w.magazine}</td>
                    <td className="py-2 pr-3 text-right text-gray-600 text-xs">TL{w.tl}</td>
                    <td className="py-2">
                      <button
                        onClick={() => {
                          if (isSelected) {
                            removeWeapon(w.name, w.cost);
                          } else {
                            addWeapon({ name: w.name, damage: w.damage, range: w.range + 'm', attackBonus: 0 }, w.cost);
                          }
                        }}
                        className={`text-xs px-2 py-1 rounded w-full ${
                          isSelected
                            ? 'bg-red-900/40 text-red-400 hover:bg-red-900'
                            : canAfford
                            ? 'bg-gray-700 text-gray-300 hover:bg-amber-900/40 hover:text-amber-300'
                            : 'bg-gray-800 text-gray-600 hover:bg-red-900/20 hover:text-red-400'
                        }`}
                        title={!isSelected && !canAfford ? `Need ${(w.cost - char.credits).toLocaleString()} more credits` : undefined}
                      >
                        {isSelected ? 'Remove' : canAfford ? 'Add' : 'Add ⚠'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Melee weapons ──────────────────────────────────────────── */}
      {tab === 'melee' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left py-2 pr-4">Weapon</th>
                <th className="text-right py-2 pr-3">Dmg</th>
                <th className="text-right py-2 pr-3">Shock</th>
                <th className="text-right py-2 pr-3">Cost</th>
                <th className="text-right py-2 pr-3">TL</th>
                <th className="py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {MELEE_WEAPONS.map(w => {
                const isSelected = char.weapons.some(x => x.name === w.name);
                const canAfford = w.cost > 0 ? char.credits >= w.cost : true;
                return (
                  <tr key={w.name} className={`border-b border-gray-800 hover:bg-gray-800/50 ${isSelected ? 'bg-amber-900/10' : ''}`}>
                    <td className="py-2 pr-4">
                      <div className={`font-medium ${isSelected ? 'text-amber-300' : 'text-gray-200'}`}>{w.name}</div>
                      {w.advanced && <span className="text-xs text-teal-400">Advanced TL4</span>}
                      {w.notes && <div className="text-xs text-gray-500">{w.notes}</div>}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-red-400">{w.damage}</td>
                    <td className="py-2 pr-3 text-right text-gray-500 text-xs">{w.shock}</td>
                    <td className={`py-2 pr-3 text-right font-mono text-xs ${!isSelected && !canAfford ? 'text-red-500' : 'text-gray-400'}`}>
                      {w.cost > 0 ? w.cost.toLocaleString() : '—'}
                    </td>
                    <td className="py-2 pr-3 text-right text-gray-600 text-xs">TL{w.tl}</td>
                    <td className="py-2">
                      <button
                        onClick={() => {
                          if (isSelected) {
                            removeWeapon(w.name, w.cost);
                          } else {
                            addWeapon({ name: w.name, damage: w.damage, shock: w.shock, attackBonus: 0 }, w.cost);
                          }
                        }}
                        className={`text-xs px-2 py-1 rounded w-full ${
                          isSelected
                            ? 'bg-red-900/40 text-red-400 hover:bg-red-900'
                            : canAfford
                            ? 'bg-gray-700 text-gray-300 hover:bg-amber-900/40 hover:text-amber-300'
                            : 'bg-gray-800 text-gray-600 hover:bg-red-900/20 hover:text-red-400'
                        }`}
                        title={!isSelected && !canAfford ? `Need ${(w.cost - char.credits).toLocaleString()} more credits` : undefined}
                      >
                        {isSelected ? 'Remove' : canAfford ? 'Add' : 'Add ⚠'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Items tab ──────────────────────────────────────────────── */}
      {tab === 'items' && (
        <div className="space-y-3">
          {/* Category filter */}
          <div className="flex flex-wrap gap-1.5">
            {ITEM_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setItemCategory(cat)}
                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                  itemCategory === cat
                    ? 'border-amber-500 bg-amber-900/30 text-amber-300'
                    : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left py-2 pr-4">Item</th>
                  <th className="text-right py-2 pr-3">Cost</th>
                  <th className="text-right py-2 pr-3">Enc</th>
                  <th className="text-right py-2 pr-3">TL</th>
                  <th className="py-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {GENERAL_EQUIPMENT.filter(g => g.category === itemCategory).map(g => {
                  const qty = char.equipment.filter(e => e === g.name).length;
                  const canAfford = char.credits >= g.cost || g.cost === 0;
                  return (
                    <tr key={g.name} className={`border-b border-gray-800 hover:bg-gray-800/50 ${qty > 0 ? 'bg-amber-900/10' : ''}`}>
                      <td className="py-2 pr-4">
                        <div className={`font-medium ${qty > 0 ? 'text-amber-300' : 'text-gray-200'}`}>
                          {g.name}
                          {qty > 1 && <span className="ml-1 text-xs text-amber-500">×{qty}</span>}
                        </div>
                        {g.notes && <div className="text-xs text-gray-500">{g.notes}</div>}
                      </td>
                      <td className={`py-2 pr-3 text-right font-mono text-xs ${!canAfford ? 'text-red-500' : 'text-gray-400'}`}>
                        {g.cost > 0 ? g.cost.toLocaleString() : '—'}
                      </td>
                      <td className="py-2 pr-3 text-right text-gray-500 text-xs">{g.enc || '—'}</td>
                      <td className="py-2 pr-3 text-right text-gray-600 text-xs">TL{g.tl}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-1">
                          <button
                            disabled={qty === 0}
                            onClick={() => {
                              const idx = char.equipment.lastIndexOf(g.name);
                              const next = [...char.equipment];
                              next.splice(idx, 1);
                              onChange({ equipment: next, credits: char.credits + g.cost });
                            }}
                            className="w-7 h-7 rounded bg-gray-700 hover:bg-red-900/40 disabled:opacity-20 text-gray-300 text-sm flex items-center justify-center"
                          >−</button>
                          <span className="w-5 text-center text-xs text-gray-400">{qty}</span>
                          <button
                            onClick={() => onChange({
                              equipment: [...char.equipment, g.name],
                              credits: char.credits - g.cost,
                            })}
                            className={`w-7 h-7 rounded text-sm flex items-center justify-center ${
                              canAfford
                                ? 'bg-gray-700 hover:bg-amber-900/40 text-gray-300 hover:text-amber-300'
                                : 'bg-gray-800 text-red-500/60 hover:bg-red-900/20'
                            }`}
                            title={!canAfford ? `Need ${(g.cost - char.credits).toLocaleString()} more cr` : undefined}
                          >+</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Selected gear summary ───────────────────────────────────── */}
      {(char.armor.length > 0 || char.weapons.length > 0 || char.equipment.length > 0) && (
        <div className="bg-gray-800/50 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Selected Gear</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {char.armor.map(a => (
              <span key={a.name} className="px-2 py-1 rounded bg-green-900/30 text-green-300 border border-green-800/50">
                🛡 {a.name} (AC {a.ac})
              </span>
            ))}
            {char.weapons.map(w => (
              <span key={w.name} className="px-2 py-1 rounded bg-red-900/30 text-red-300 border border-red-800/50">
                ⚔ {w.name} ({w.damage})
              </span>
            ))}
            {/* Deduplicate and show counts */}
            {[...new Set(char.equipment)].map(e => {
              const qty = char.equipment.filter(x => x === e).length;
              return (
                <span key={e} className="px-2 py-1 rounded bg-gray-700 text-gray-300">
                  {qty > 1 ? `${e} ×${qty}` : e}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
