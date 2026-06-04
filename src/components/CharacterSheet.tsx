import { useState } from 'react';
import { BookOpen, HelpCircle } from 'lucide-react';
import type { Character } from '../types/character';
import { attrMod } from '../types/character';
import { ARMOR_TABLE, RANGED_WEAPONS, MELEE_WEAPONS, GENERAL_EQUIPMENT } from '../data/equipment';
import { xpForLevel } from '../data/leveling';
import { effectiveSkills, psychicSkillLevels, deriveAC, deriveEffort, computeEncumbrance } from '../data/derivation';
import LevelUp from './LevelUp';
import AuditOverview from './wizard/AuditOverview';
import Step8Equipment from './wizard/steps/Step8Equipment';
import { useLockBodyScroll } from './HelpPage';

function gearCost(name: string): number {
  return (
    ARMOR_TABLE.find(a => a.name === name)?.cost ??
    RANGED_WEAPONS.find(w => w.name === name)?.cost ??
    MELEE_WEAPONS.find(w => w.name === name)?.cost ??
    GENERAL_EQUIPMENT.find(g => g.name === name)?.cost ??
    0
  );
}

function computeGearSpent(char: Character): number {
  let total = 0;
  for (const a of char.armor) total += gearCost(a.name);
  for (const w of char.weapons) total += gearCost(w.name);
  for (const e of char.equipment) total += gearCost(e);
  return total;
}

interface Props {
  char: Character;
  onEdit: () => void;
  onBack: () => void;
  onOpenRules: () => void;
  onOpenHelp: () => void;
  onUpdate: (char: Character) => void;
}

const ATTR_ORDER = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;

export default function CharacterSheet({ char, onEdit, onBack, onOpenRules, onOpenHelp, onUpdate }: Props) {
  const attrs = char.attributes;
  const isPsychic = char.class === 'Psychic' || char.adventurerPartials?.includes('Partial Psychic');
  const totalAC = deriveAC(char).ac;
  const effortMax = deriveEffort(char);
  const skills = effectiveSkills(char);
  const psychic = psychicSkillLevels(char);
  const enc = computeEncumbrance(char);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [detailed, setDetailed] = useState(false);
  const [confirmEdit, setConfirmEdit] = useState(false);
  const [showGear, setShowGear] = useState(false);

  const nextLevelXp = xpForLevel(char.level + 1);
  const canLevelUp = char.xp >= nextLevelXp && char.level < 20;

  // ── Stow/equip toggles (default: armor & weapons Readied, general gear Stowed) ──
  const equipReadied = new Set(char.equipmentReadied ?? []);
  function toggleArmorReadied(i: number) {
    onUpdate({ ...char, armor: char.armor.map((a, idx) => idx === i ? { ...a, readied: a.readied === false } : a) });
  }
  function toggleWeaponReadied(i: number) {
    onUpdate({ ...char, weapons: char.weapons.map((w, idx) => idx === i ? { ...w, readied: w.readied === false } : w) });
  }
  function toggleEquipReadied(name: string) {
    const next = equipReadied.has(name)
      ? (char.equipmentReadied ?? []).filter(n => n !== name)
      : [...(char.equipmentReadied ?? []), name];
    onUpdate({ ...char, equipmentReadied: next });
  }
  function addCredits(n: number) {
    onUpdate({ ...char, credits: Math.max(0, char.credits + n) });
  }

  return (
    <div className="min-h-screen text-gray-100 flex justify-center">
      <div className="w-full max-w-6xl flex flex-col min-h-screen bg-gray-950">
      {/* Top bar */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-200 text-sm flex-shrink-0">← Characters</button>
          <span className="text-gray-700">|</span>
          <span className="text-amber-300 font-bold truncate">{char.name}</span>
          <span className="text-gray-500 text-sm flex-shrink-0">{char.class} · Level {char.level}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenHelp}
            title="Rules reference & FAQ"
            className="w-8 h-8 rounded text-gray-500 hover:text-amber-300 hover:bg-gray-700 transition-colors flex items-center justify-center"
          >
            <HelpCircle size={18} />
          </button>
          <button
            onClick={onOpenRules}
            title="Open SWN Revised Deluxe Edition rulebook"
            className="p-1.5 rounded text-gray-500 hover:text-amber-300 hover:bg-gray-700 transition-colors"
          >
            <BookOpen size={18} />
          </button>
          {/* Simple / Detailed view toggle */}
          <div className="flex rounded overflow-hidden border border-gray-700 text-xs">
            <button
              onClick={() => setDetailed(false)}
              className={`px-2.5 py-1.5 font-medium transition-colors ${!detailed ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
            >
              Simple
            </button>
            <button
              onClick={() => setDetailed(true)}
              className={`px-2.5 py-1.5 font-medium transition-colors ${detailed ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
            >
              Detailed
            </button>
          </div>
          {canLevelUp && (
            <button
              onClick={() => setShowLevelUp(true)}
              className="px-3 py-1.5 rounded bg-green-700 hover:bg-green-600 text-white text-sm font-semibold animate-pulse"
            >
              ↑ Level Up
            </button>
          )}
          <button
            onClick={() => setConfirmEdit(true)}
            title="Edit core character details (locked — may change derived stats)"
            className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium"
          >
            🔒 Edit
          </button>
        </div>
      </div>

      {detailed ? (
        <div className="flex-1 overflow-y-auto px-4 py-6 max-w-5xl mx-auto w-full">
          <AuditOverview char={char} />
        </div>
      ) : (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoBlock label="Background" value={char.background || '—'} />
          <InfoBlock label="Homeworld" value={char.homeworld || '—'} />
          <InfoBlock label="Species" value={char.species || '—'} />
          <div className="glass rounded-lg px-4 py-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">XP</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={char.xp}
                onChange={e => onUpdate({ ...char, xp: Math.max(0, Number(e.target.value)) })}
                className="w-16 bg-transparent text-gray-200 font-medium text-sm border-b border-gray-600 focus:border-amber-500 outline-none"
              />
              <span className="text-gray-600 text-xs">/ {nextLevelXp} (lvl {char.level + 1})</span>
            </div>
            {canLevelUp && (
              <p className="text-xs text-amber-400 mt-1 font-medium">Ready to level up!</p>
            )}
          </div>
        </div>

        {char.goal && (
          <div className="bg-gray-800 rounded-lg px-4 py-3 text-sm text-gray-400 italic border-l-4 border-amber-700">
            <span className="text-gray-300 not-italic font-medium">Goal: </span>{char.goal}
          </div>
        )}

        {/* Attributes */}
        <SheetSection title="Attributes">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {ATTR_ORDER.map(a => {
              const score = attrs[a];
              const mod = attrMod(score);
              return (
                <div key={a} className="glass rounded-xl p-3 text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{a}</div>
                  <div className="text-2xl font-bold">{score}</div>
                  <div className={`text-sm font-bold mt-1 ${mod > 0 ? 'text-green-400' : mod < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                    {mod >= 0 ? '+' : ''}{mod}
                  </div>
                </div>
              );
            })}
          </div>
        </SheetSection>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Combat */}
          <SheetSection title="Combat">
            <div className="space-y-2.5">
              {/* Live trackers */}
              <Tracker
                label="HP" current={char.hitPoints.current} max={char.hitPoints.max}
                onChange={v => onUpdate({ ...char, hitPoints: { ...char.hitPoints, current: v } })}
                downLabel="Damage" upLabel="Heal" big
              />
              <StatRow label="Armor Class" value={`${totalAC}`} big />
              <StatRow label="Base Attack Bonus" value={`+${char.baseAttackBonus}`} />
              <Tracker
                label="System Strain" current={char.systemStrain.current} max={char.systemStrain.max}
                onChange={v => onUpdate({ ...char, systemStrain: { ...char.systemStrain, current: v } })}
              />
              {isPsychic && (
                <Tracker
                  label="Effort (committed)" current={char.effort.committed} max={effortMax}
                  onChange={v => onUpdate({ ...char, effort: { ...char.effort, committed: v } })}
                  downLabel="Release" upLabel="Commit"
                />
              )}
              <StatRow
                label="Move"
                value={enc.level === 'none' ? '10m' : `${enc.move}m`}
              />
              {enc.level !== 'none' && (
                <div className="text-xs text-amber-400 -mt-1">
                  {enc.level === 'light' ? 'Lightly' : enc.level === 'heavy' ? 'Heavily' : 'Over-'}encumbered
                  <span className="text-gray-600"> (Readied {enc.readied}/{enc.readiedMax}, Stowed {enc.stowed}/{enc.stowedMax})</span>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Saving Throws</p>
              <div className="space-y-1.5">
                <StatRow label="Physical" value={`${char.saves.physical}+`} small />
                <StatRow label="Evasion" value={`${char.saves.evasion}+`} small />
                <StatRow label="Mental" value={`${char.saves.mental}+`} small />
              </div>
            </div>
            {/* Night's rest: refresh Effort, recover 1 System Strain, reload all weapons */}
            <button
              onClick={() => onUpdate({
                ...char,
                effort: { ...char.effort, committed: 0 },
                systemStrain: { ...char.systemStrain, current: Math.max(0, char.systemStrain.current - 1) },
                weapons: char.weapons.map(w => w.ammo ? { ...w, ammo: { ...w.ammo, current: w.ammo.max } } : w),
              })}
              className="mt-4 w-full py-2 rounded bg-indigo-800/60 hover:bg-indigo-700 text-indigo-200 text-sm font-medium transition-colors"
              title="Refresh Effort, recover 1 System Strain, reload weapons"
            >
              🌙 Night's Rest
            </button>
          </SheetSection>

          {/* Skills */}
          <SheetSection title="Skills">
            {Object.keys(skills).length === 0 ? (
              <p className="text-gray-600 text-sm italic">No skills recorded.</p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(skills)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([skill, level]) => (
                    <div
                      key={skill}
                      className="flex items-center justify-between bg-gray-900/60 rounded px-2 py-1"
                    >
                      <span className="text-sm text-gray-300">{skill}-{level}</span>
                    </div>
                  ))}
              </div>
            )}
          </SheetSection>

          {/* Foci & Psychics */}
          <div className="space-y-4">
            <SheetSection title="Foci">
              {char.foci.length === 0 ? (
                <p className="text-gray-600 text-sm italic">No foci chosen.</p>
              ) : (
                <div className="space-y-2">
                  {char.foci.map(f => (
                    <div key={f.name} className="bg-gray-900/60 rounded px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-gray-200">{f.name}</span>
                        <span className="text-xs text-amber-400">Lvl {f.level}</span>
                      </div>
                      {f.specialistSkill && <div className="text-xs text-gray-500">Skill: {f.specialistSkill}</div>}
                    </div>
                  ))}
                </div>
              )}
            </SheetSection>

            {isPsychic && Object.keys(psychic).length > 0 && (
              <SheetSection title="Psychic Disciplines">
                <div className="space-y-2">
                  {Object.keys(psychic).map(d => {
                    const techs = char.psychicTechniques.filter(t => t.discipline === d);
                    return (
                      <div key={d} className="bg-indigo-900/20 rounded px-3 py-2 border border-indigo-900/40">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-indigo-300">{d}</span>
                          <span className="text-xs text-indigo-500">Level {psychic[d]}</span>
                        </div>
                        {techs.map(t => (
                          <div key={t.techniqueName} className="text-xs text-gray-400 mt-0.5">• {t.techniqueName}</div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </SheetSection>
            )}
          </div>
        </div>

        {/* Weapons */}
        {char.weapons.length > 0 && (
          <SheetSection title="Weapons">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-500 text-xs uppercase tracking-wide">
                    <th className="text-left py-2 pr-4">Weapon</th>
                    <th className="text-right py-2 pr-4">Damage</th>
                    <th className="text-right py-2 pr-4">Hit Bonus</th>
                    <th className="text-right py-2 pr-4">Range</th>
                    <th className="text-center py-2 pr-4">Ammo</th>
                  </tr>
                </thead>
                <tbody>
                  {char.weapons.map((w, wi) => {
                    const setAmmo = (cur: number) => {
                      if (!w.ammo) return;
                      const next = char.weapons.map((x, i) =>
                        i === wi && x.ammo ? { ...x, ammo: { ...x.ammo, current: Math.max(0, Math.min(x.ammo.max, cur)) } } : x);
                      onUpdate({ ...char, weapons: next });
                    };
                    return (
                      <tr key={`${w.name}-${wi}`} className="border-b border-gray-800">
                        <td className="py-2 pr-4 font-medium text-gray-200">
                          <div className="flex items-center gap-2">
                            <span>{w.name}</span>
                            <ReadyToggle readied={w.readied !== false} onToggle={() => toggleWeaponReadied(wi)} />
                          </div>
                        </td>
                        <td className="py-2 pr-4 text-right font-mono text-red-400">{w.damage}</td>
                        <td className="py-2 pr-4 text-right text-green-400">
                          {w.attackBonus >= 0 ? '+' : ''}{char.baseAttackBonus + w.attackBonus}
                        </td>
                        <td className="py-2 pr-4 text-right text-gray-500 text-xs">{w.range ?? 'Melee'}</td>
                        <td className="py-2 pr-4">
                          {w.ammo ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={() => setAmmo(w.ammo!.current - 1)} disabled={w.ammo.current <= 0}
                                className="w-6 h-6 rounded bg-gray-700 hover:bg-red-900/50 disabled:opacity-20 text-gray-300 text-xs" title="Fire (−1)">−</button>
                              <span className={`font-mono text-sm w-12 text-center ${w.ammo.current === 0 ? 'text-red-400' : 'text-gray-200'}`}>
                                {w.ammo.current}/{w.ammo.max}
                              </span>
                              <button onClick={() => setAmmo(w.ammo!.max)}
                                className="px-1.5 h-6 rounded bg-gray-700 hover:bg-amber-900/50 text-gray-300 text-xs" title="Reload">⟳</button>
                            </div>
                          ) : (
                            <div className="text-center text-xs text-gray-600">—</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SheetSection>
        )}

        {/* Armor & Equipment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {char.armor.length > 0 && (
            <SheetSection title="Armor">
              <div className="space-y-2">
                {char.armor.map((a, ai) => (
                  <div key={`${a.name}-${ai}`} className="flex items-center justify-between gap-2 bg-gray-900/60 rounded px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-gray-200 truncate">{a.name}</span>
                      <ReadyToggle readied={a.readied !== false} onToggle={() => toggleArmorReadied(ai)} />
                    </div>
                    <span className="text-green-400 font-bold flex-shrink-0">AC {a.ac}</span>
                  </div>
                ))}
              </div>
            </SheetSection>
          )}

          <SheetSection title="Equipment & Credits">
            {/* Remaining credits (budget − spent), may be negative; quick adders for GM rewards. */}
            {(() => {
              const remaining = char.credits - computeGearSpent(char);
              return (
                <div className="mb-3 pb-2 border-b border-gray-700 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-bold text-lg ${remaining < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                      {remaining.toLocaleString()}
                    </span>
                    <span className="text-gray-500 text-sm">credits remaining</span>
                    {remaining < 0 && <span className="text-red-500 text-xs">(over budget)</span>}
                    {char.debts > 0 && <span className="text-red-400 text-sm ml-auto">Debts: {char.debts.toLocaleString()} cr</span>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-gray-500">Adjust:</span>
                    {[100, 500, 1000].map(n => (
                      <button key={n} onClick={() => addCredits(n)}
                        className="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-amber-900/40 text-gray-300 hover:text-amber-300">+{n}</button>
                    ))}
                    <button onClick={() => addCredits(-100)}
                      className="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-red-900/40 text-gray-300 hover:text-red-300">−100</button>
                    <button onClick={() => setShowGear(true)}
                      className="ml-auto text-xs px-2.5 py-1 rounded bg-gray-700 hover:bg-amber-900/40 text-gray-200 hover:text-amber-300 font-medium">
                      Manage Gear →
                    </button>
                  </div>
                </div>
              );
            })()}
            {char.equipment.length === 0 ? (
              <p className="text-gray-600 text-sm italic">No general equipment. Use “Manage Gear” to add some.</p>
            ) : (
              <ul className="space-y-1">
                {[...new Set(char.equipment)].map((e) => {
                  const qty = char.equipment.filter((x: string) => x === e).length;
                  return (
                    <li key={e} className="text-sm text-gray-400 flex items-center gap-2">
                      <span className="text-gray-600">•</span>
                      <span className="flex-1">{qty > 1 ? `${e} ×${qty}` : e}</span>
                      <ReadyToggle readied={equipReadied.has(e)} onToggle={() => toggleEquipReadied(e)} />
                    </li>
                  );
                })}
              </ul>
            )}
          </SheetSection>
        </div>

        {/* Level history */}
        {char.levelHistory.length > 0 && (
          <SheetSection title="Advancement History">
            <div className="space-y-2">
              {char.levelHistory.map(record => (
                <div key={record.level} className="glass rounded-lg px-3 py-2 text-xs">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-amber-400 font-bold">Level {record.level}</span>
                    <span className="text-green-400">+{record.hpGained} HP</span>
                    <span className="text-gray-500">({record.spTotal} SP gained)</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-gray-400">
                    {record.skillSpends.map(s => (
                      <span key={s.skill} className="bg-gray-700/60 px-2 py-0.5 rounded">
                        {s.skill} {s.from === -1 ? '(new)' : `-${s.from}`}→-{s.to}
                      </span>
                    ))}
                    {record.attrBoosts.map(b => (
                      <span key={b.attr} className="bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded">
                        {b.attr} {b.from}→{b.to}
                      </span>
                    ))}
                    {record.focusPicked && (
                      <span className="bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded">
                        {record.focusPicked.name} Lvl {record.focusPicked.level}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SheetSection>
        )}

        {/* Notes — editable, saved immediately */}
        <SheetSection title="Notes">
          <textarea
            value={char.notes}
            onChange={e => onUpdate({ ...char, notes: e.target.value })}
            placeholder="Track goals, contacts, debts owed, plot threads…"
            className="w-full h-28 bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500 resize-y"
          />
        </SheetSection>
      </div>
      )}
      </div>
      {showLevelUp && (
        <LevelUp
          char={char}
          onConfirm={updated => { onUpdate(updated); setShowLevelUp(false); }}
          onCancel={() => setShowLevelUp(false)}
        />
      )}

      {/* Unlock confirmation for full (structural) editing */}
      {confirmEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-gray-100 font-semibold text-lg flex items-center gap-2">🔒 Unlock full editor?</h3>
            <p className="text-gray-400 text-sm">
              The full editor lets you change <strong className="text-gray-300">attributes, background, class, skills, foci, and psychics</strong>.
              Changing these recalculates derived stats and can conflict with choices made while leveling up.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmEdit(false)}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium">
                Cancel
              </button>
              <button onClick={() => { setConfirmEdit(false); onEdit(); }}
                className="px-4 py-2 rounded bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold">
                Unlock &amp; Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gear editor — reuses the wizard's equipment step, edits live */}
      {showGear && (
        <GearEditor char={char} onUpdate={onUpdate} onClose={() => setShowGear(false)} />
      )}
    </div>
  );
}

function GearEditor({ char, onUpdate, onClose }: { char: Character; onUpdate: (c: Character) => void; onClose: () => void }) {
  useLockBodyScroll();
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <span className="text-amber-300 font-semibold">Manage Gear — {char.name}</span>
        <button onClick={onClose} className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium">
          ✓ Done
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* postCreation hides the package/roll-credits starting-method tab */}
          <Step8Equipment char={char} onChange={patch => onUpdate({ ...char, ...patch })} postCreation />
        </div>
      </div>
    </div>
  );
}

function SheetSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl p-4">
      <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">{title}</h2>
      {children}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-lg px-4 py-3">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-gray-200 font-medium truncate">{value}</div>
    </div>
  );
}

/** Small pill that toggles a gear item between Readied and Stowed. */
function ReadyToggle({ readied, onToggle }: { readied: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title="Toggle Readied / Stowed (affects encumbrance)"
      className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border transition-colors ${
        readied
          ? 'border-amber-700/60 bg-amber-900/30 text-amber-300 hover:bg-amber-900/50'
          : 'border-gray-600 bg-gray-700/60 text-gray-400 hover:bg-gray-700'
      }`}
    >
      {readied ? 'Readied' : 'Stowed'}
    </button>
  );
}

function StatRow({ label, value, big, small }: { label: string; value: string; big?: boolean; small?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={`text-gray-400 ${small ? 'text-xs' : 'text-sm'}`}>{label}</span>
      <span className={`font-bold ${big ? 'text-xl text-gray-100' : small ? 'text-sm text-gray-300' : 'text-gray-100'}`}>
        {value}
      </span>
    </div>
  );
}

/** Live current/max tracker with − / + steppers (clamped 0…max). */
function Tracker({ label, current, max, onChange, downLabel, upLabel, big }: {
  label: string; current: number; max: number; onChange: (v: number) => void;
  downLabel?: string; upLabel?: string; big?: boolean;
}) {
  const set = (v: number) => onChange(Math.max(0, Math.min(max, v)));
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-gray-400 text-sm">{label}</span>
      <div className="flex items-center gap-1.5">
        <button onClick={() => set(current - 1)} disabled={current <= 0}
          className="w-6 h-6 rounded bg-gray-700 hover:bg-red-900/50 disabled:opacity-20 text-gray-300 text-sm flex items-center justify-center"
          title={downLabel}>−</button>
        <span className={`font-bold tabular-nums text-center ${big ? 'text-xl w-16' : 'text-base w-14'} ${current === 0 ? 'text-red-400' : 'text-gray-100'}`}>
          {current} / {max}
        </span>
        <button onClick={() => set(current + 1)} disabled={current >= max}
          className="w-6 h-6 rounded bg-gray-700 hover:bg-green-900/50 disabled:opacity-20 text-gray-300 text-sm flex items-center justify-center"
          title={upLabel}>+</button>
      </div>
    </div>
  );
}
