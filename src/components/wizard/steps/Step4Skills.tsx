import { useState, useEffect, useRef } from 'react';
import type { Character, AttributeName } from '../../../types/character';
import { BACKGROUNDS } from '../../../data/backgrounds';
import { SKILLS } from '../../../data/skills';
import type { Skill, SkillLevels } from '../../../data/skills';
import PageRef from '../../ui/PageRef';

type SkillMode = 'quick' | 'pick' | 'roll';
const COMBAT_SKILLS: Skill[] = ['Stab', 'Shoot', 'Punch'];
const PHYSICAL_ATTRS: AttributeName[] = ['STR', 'DEX', 'CON'];
const MENTAL_ATTRS: AttributeName[] = ['INT', 'WIS', 'CHA'];
const ALL_ATTRS: AttributeName[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

// An entry from the roll tables that needs stat allocation
interface StatBoost {
  type: '+1 Any Stat' | '+2 Physical' | '+2 Mental';
  pool: AttributeName[];
  total: number;
  allocs: Partial<Record<AttributeName, number>>;
}

// One resolved roll from a Growth or Learning table
interface RollEntry {
  id: number;
  table: 'growth' | 'learning';
  rollValue: number; // 1-indexed result
  rawEntry: string;
  statBoost?: StatBoost;         // set when entry is a stat boost
  resolvedSkill?: Skill;         // set when entry is a skill (auto or user-chosen)
  needsChoice: boolean;          // true when user still needs to pick
}

// One pick in Pick mode
interface PickEntry {
  id: number;
  rawEntry: string;              // learning table entry text
  resolvedSkill: Skill | null;   // null until user resolves "Any Combat"
}

interface Props {
  char: Character;
  onChange: (patch: Partial<Character>) => void;
  onComplete: (done: boolean) => void;
}

function addSkill(skills: SkillLevels, skill: Skill): SkillLevels {
  const cur = skills[skill] ?? -1;
  if (cur < 0) return { ...skills, [skill]: 0 };
  if (cur === 0) return { ...skills, [skill]: 1 };
  return skills; // already level-1, max at creation
}

function makeStat(raw: string): StatBoost {
  if (raw === '+1 Any Stat') return { type: raw, pool: ALL_ATTRS, total: 1, allocs: {} };
  if (raw === '+2 Physical') return { type: raw, pool: PHYSICAL_ATTRS, total: 2, allocs: {} };
  return { type: '+2 Mental', pool: MENTAL_ATTRS, total: 2, allocs: {} };
}

function isStatEntry(entry: string) {
  return entry === '+1 Any Stat' || entry === '+2 Physical' || entry === '+2 Mental';
}

function isSkillEntry(entry: string) {
  return !isStatEntry(entry);
}

function parseRollEntry(entry: string, id: number, table: 'growth' | 'learning', rollValue: number): RollEntry {
  if (isStatEntry(entry)) {
    return { id, table, rollValue, rawEntry: entry, statBoost: makeStat(entry), needsChoice: true };
  }
  if (entry === 'Any Skill') {
    return { id, table, rollValue, rawEntry: entry, needsChoice: true };
  }
  if (entry === 'Any Combat') {
    return { id, table, rollValue, rawEntry: entry, needsChoice: true };
  }
  // Regular skill — auto-resolved
  return { id, table, rollValue, rawEntry: entry, resolvedSkill: entry as Skill, needsChoice: false };
}

let nextId = 1;

export default function Step4Skills({ char, onChange, onComplete }: Props) {
  const bg = BACKGROUNDS.find(b => b.name === char.background);

  // Snapshot attributes when this step is first mounted (before any Growth table bonuses)
  const baseAttrs = useRef<Record<AttributeName, number>>({ ...char.attributes });

  const hasFreeAnyCombat = bg && (bg.freeSkill as string) === 'Any Combat';
  const hasQuickAnyCombat = bg ? bg.quickSkills.includes('Any Combat') : false;

  const [mode, setMode] = useState<SkillMode>('quick');
  const [freeCombat, setFreeCombat] = useState<Skill | null>(null);
  const [quickCombat, setQuickCombat] = useState<Skill | null>(null);
  const [picks, setPicks] = useState<PickEntry[]>([]);
  const [rolls, setRolls] = useState<RollEntry[]>([]);
  // Infer bonus skill from existing char.skills when returning to this step
  const [bonusSkill, setBonusSkill] = useState<Skill | null>(() => {
    if (!bg || Object.keys(char.skills).length === 0) return null;
    const bgSourceSkills = new Set<string>([
      ...(bg.freeSkill !== 'Any Combat' ? [bg.freeSkill] : []),
      ...bg.quickSkills.filter(s => s !== 'Any Combat'),
    ]);
    // A skill not from background sources is likely the bonus pick
    const extra = Object.keys(char.skills).find(s => !bgSourceSkills.has(s));
    return (extra as Skill) ?? null;
  });

  // ── Compute completion ───────────────────────────────────────────────────────

  function checkComplete(
    m: SkillMode, fc: Skill | null, qc: Skill | null,
    p: PickEntry[], r: RollEntry[], b: Skill | null,
  ): boolean {
    if (!b) return false;
    if (hasFreeAnyCombat && !fc) return false;

    if (m === 'quick') {
      if (hasQuickAnyCombat && !qc) return false;
      return true;
    }
    if (m === 'pick') {
      if (p.length < 2) return false;
      if (p.some(x => x.resolvedSkill === null)) return false;
      return true;
    }
    // roll
    if (r.length === 0) return false;
    for (const entry of r) {
      if (entry.needsChoice) {
        if (entry.statBoost) {
          const spent = Object.values(entry.statBoost.allocs).reduce((s, v) => s + (v ?? 0), 0);
          if (spent < entry.statBoost.total) return false;
        } else if (!entry.resolvedSkill) {
          return false;
        }
      }
    }
    return true;
  }

  // ── Build final skills + attrs and push to parent ────────────────────────────

  function applyAll(
    m: SkillMode, fc: Skill | null, qc: Skill | null,
    p: PickEntry[], r: RollEntry[], b: Skill | null,
  ) {
    let skills: SkillLevels = {};

    // Free skill
    const freeSkill = hasFreeAnyCombat ? fc : (bg ? bg.freeSkill as Skill : null);
    if (freeSkill && SKILLS.includes(freeSkill as Skill)) skills = addSkill(skills, freeSkill);

    if (m === 'quick' && bg) {
      bg.quickSkills.forEach(qs => {
        if (qs === 'Any Combat') {
          if (qc) skills = addSkill(skills, qc);
        } else {
          skills = addSkill(skills, qs as Skill);
        }
      });
    } else if (m === 'pick') {
      p.forEach(x => { if (x.resolvedSkill) skills = addSkill(skills, x.resolvedSkill); });
    } else {
      r.forEach(x => { if (x.resolvedSkill) skills = addSkill(skills, x.resolvedSkill); });
    }

    if (b) skills = addSkill(skills, b);

    // Attribute bonuses from Growth table (roll mode only)
    const attrs = { ...baseAttrs.current };
    if (m === 'roll') {
      r.forEach(x => {
        if (x.statBoost) {
          Object.entries(x.statBoost.allocs).forEach(([a, amt]) => {
            if (amt) attrs[a as AttributeName] = Math.min(18, attrs[a as AttributeName] + (amt ?? 0));
          });
        }
      });
    }

    onChange({ skills, attributes: attrs });
    onComplete(checkComplete(m, fc, qc, p, r, b));
  }

  // ── Mode switching ───────────────────────────────────────────────────────────

  function switchMode(newMode: SkillMode) {
    setMode(newMode);
    setPicks([]);
    setRolls([]);
    // Restore base attributes (undo growth bonuses from previous roll mode)
    const attrs = { ...baseAttrs.current };
    // Build minimal skills (free + bonus) so the sheet stays responsive
    let skills: SkillLevels = {};
    const freeSkill = hasFreeAnyCombat ? freeCombat : (bg ? bg.freeSkill as Skill : null);
    if (freeSkill && SKILLS.includes(freeSkill as Skill)) skills = addSkill(skills, freeSkill);
    if (bonusSkill) skills = addSkill(skills, bonusSkill);
    onChange({ skills, attributes: attrs });
    onComplete(false);
  }

  // ── Quick mode ───────────────────────────────────────────────────────────────

  function applyQuick(qc: Skill | null) {
    applyAll('quick', freeCombat, qc, [], [], bonusSkill);
  }

  // ── Pick mode ────────────────────────────────────────────────────────────────

  function addPick(rawEntry: string) {
    if (picks.length >= 2) return;
    const newPick: PickEntry = {
      id: nextId++,
      rawEntry,
      resolvedSkill: rawEntry === 'Any Combat' ? null : rawEntry as Skill,
    };
    const next = [...picks, newPick];
    setPicks(next);
    applyAll('pick', freeCombat, quickCombat, next, rolls, bonusSkill);
  }

  function removePick(id: number) {
    const next = picks.filter(p => p.id !== id);
    setPicks(next);
    applyAll('pick', freeCombat, quickCombat, next, rolls, bonusSkill);
  }

  function resolvePickCombat(id: number, skill: Skill) {
    const next = picks.map(p => p.id === id ? { ...p, resolvedSkill: skill } : p);
    setPicks(next);
    applyAll('pick', freeCombat, quickCombat, next, rolls, bonusSkill);
  }

  // ── Roll mode ────────────────────────────────────────────────────────────────

  function addRoll(table: 'growth' | 'learning') {
    if (rolls.length >= 3) return;
    if (!bg) return;
    const rollValue = table === 'growth'
      ? Math.ceil(Math.random() * 6)
      : Math.ceil(Math.random() * 8);
    const entry = table === 'growth'
      ? bg.growth[rollValue - 1]
      : bg.learning[rollValue - 1];
    const newEntry = parseRollEntry(entry, nextId++, table, rollValue);
    const next = [...rolls, newEntry];
    setRolls(next);
    applyAll('roll', freeCombat, quickCombat, picks, next, bonusSkill);
  }

  function removeRoll(id: number) {
    const next = rolls.filter(r => r.id !== id);
    setRolls(next);
    applyAll('roll', freeCombat, quickCombat, picks, next, bonusSkill);
  }

  function resolveRollSkill(id: number, skill: Skill) {
    const next = rolls.map(r => r.id === id ? { ...r, resolvedSkill: skill, needsChoice: false } : r);
    setRolls(next);
    applyAll('roll', freeCombat, quickCombat, picks, next, bonusSkill);
  }

  function allocateStat(rollId: number, attr: AttributeName, delta: number) {
    const next = rolls.map(r => {
      if (r.id !== rollId || !r.statBoost) return r;
      const cur = r.statBoost.allocs[attr] ?? 0;
      const spent = Object.values(r.statBoost.allocs).reduce((s, v) => s + (v ?? 0), 0);
      const newVal = cur + delta;
      if (newVal < 0) return r;
      if (delta > 0 && spent >= r.statBoost.total) return r;
      const newAllocs = { ...r.statBoost.allocs, [attr]: newVal };
      const newSpent = Object.values(newAllocs).reduce((s, v) => s + (v ?? 0), 0);
      const still = newSpent < r.statBoost.total;
      return { ...r, statBoost: { ...r.statBoost, allocs: newAllocs }, needsChoice: still };
    });
    setRolls(next);
    applyAll('roll', freeCombat, quickCombat, picks, next, bonusSkill);
  }

  // ── Bonus skill ──────────────────────────────────────────────────────────────

  function handleBonusSkill(skill: Skill) {
    const b = bonusSkill === skill ? null : skill;
    setBonusSkill(b);
    applyAll(mode, freeCombat, quickCombat, picks, rolls, b);
  }

  // ── Free skill resolution (Soldier/Thug "Any Combat") ───────────────────────

  function handleFreeCombat(skill: Skill) {
    const fc = freeCombat === skill ? null : skill;
    setFreeCombat(fc);
    applyAll(mode, fc, quickCombat, picks, rolls, bonusSkill);
  }

  // ── Notify completion on any indirect char change ────────────────────────────

  if (!bg) return <p className="text-gray-400">Please choose a background first.</p>;

  const complete = checkComplete(mode, freeCombat, quickCombat, picks, rolls, bonusSkill);

  // Skills already on char (from current picks/quick/rolls)
  const currentSkills = char.skills;

  // Learning table entries available in Pick mode (no "Any Skill")
  const pickableEntries = bg.learning
    .filter(e => e !== 'Any Skill')
    .filter((e, i, arr) => arr.indexOf(e) === i);

  return (
    <div className="space-y-6">
      {/* Background info */}
      <div className="glass-card rounded-lg p-4 border border-gray-700 flex flex-wrap gap-4 items-center text-sm">
        <div>
          <span className="text-gray-500">Background: </span>
          <span className="text-amber-300 font-medium">{bg.name}</span>
        </div>
        <div>
          <span className="text-gray-500">Free skill: </span>
          <span className="text-green-400 font-medium">{bg.freeSkill}-0</span>
        </div>
        <PageRef page={9} note="Step 3 — You always get the background's free skill at level-0 automatically, regardless of which method you choose below." />
      </div>

      {/* Free combat choice for Soldier / Thug */}
      {hasFreeAnyCombat && (
        <div className="bg-gray-800 border border-amber-700/40 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-300 mb-2">
            Free Skill: Choose a Combat Skill
            <PageRef page={9} note="This background's free skill is 'Any Combat' — pick Stab, Shoot, or Punch." />
          </p>
          <div className="flex gap-2">
            {COMBAT_SKILLS.map(s => (
              <button
                key={s}
                onClick={() => handleFreeCombat(s)}
                className={`px-4 py-2 rounded border text-sm font-medium transition-colors ${
                  freeCombat === s
                    ? 'border-green-500 bg-green-900/30 text-green-300'
                    : 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Description + page ref */}
      <p className="text-sm text-gray-500">
        Choose how to gain your background skills.
        <PageRef page={9} note="Step 4–5: Either pick 2 skills from the Learning table (no 'Any Skill' entries allowed in pick mode), OR roll up to 3 times across Growth and Learning. Quick Skills is the fastest — take the three listed skills." />
      </p>

      {/* Mode selector */}
      <div className="flex gap-3 flex-wrap">
        {(['quick', 'pick', 'roll'] as const).map(m => (
          <button
            key={m}
            onClick={() => mode !== m && switchMode(m)}
            className={`px-4 py-2 rounded text-sm font-medium border transition-colors ${
              mode === m
                ? 'border-amber-500 bg-amber-900/30 text-amber-300'
                : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
            }`}
          >
            {m === 'quick' ? 'Quick Skills' : m === 'pick' ? 'Pick 2 Skills' : 'Roll Skills'}
          </button>
        ))}
      </div>

      {/* ── QUICK MODE ──────────────────────────────────────────────────────── */}
      {mode === 'quick' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Take the pre-selected skills for your background. All received at level-0; duplicates (including the free skill) go to level-1.
          </p>
          <div className="flex flex-wrap gap-2">
            {bg.quickSkills.map((s, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-green-900/40 border border-green-700 text-green-300 text-sm">
                {s}-0
              </span>
            ))}
          </div>
          {/* Quick combat choice if needed */}
          {hasQuickAnyCombat && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-300 mb-2">
                Quick Skills includes "Any Combat" — choose one:
              </p>
              <div className="flex gap-2">
                {COMBAT_SKILLS.map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      const qc = quickCombat === s ? null : s;
                      setQuickCombat(qc);
                      applyAll('quick', freeCombat, qc, picks, rolls, bonusSkill);
                    }}
                    className={`px-4 py-2 rounded border text-sm font-medium transition-colors ${
                      quickCombat === s
                        ? 'border-amber-500 bg-amber-900/30 text-amber-300'
                        : 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!hasQuickAnyCombat && !hasFreeAnyCombat && (
            <button
              onClick={() => applyQuick(quickCombat)}
              className="px-4 py-2 rounded bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium"
            >
              Apply Quick Skills
            </button>
          )}
        </div>
      )}

      {/* ── PICK MODE ───────────────────────────────────────────────────────── */}
      {mode === 'pick' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Pick exactly <strong>2 skills</strong> from the Learning table below.
            "Any Skill" entries are not allowed in pick mode.
            You can pick the same skill twice to start at level-1.
          </p>

          {/* Selected picks */}
          <div className="flex flex-wrap gap-2 items-center">
            {picks.map(p => (
              <div key={p.id} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-900/40 border border-amber-700 text-amber-300 text-sm">
                <span>{p.rawEntry === 'Any Combat' ? (p.resolvedSkill ?? 'Any Combat') : p.rawEntry}</span>
                <button onClick={() => removePick(p.id)} className="text-amber-500 hover:text-red-400 ml-1">×</button>
              </div>
            ))}
            {picks.length < 2 && (
              <span className="text-sm text-gray-500 italic">
                {2 - picks.length} pick{2 - picks.length !== 1 ? 's' : ''} remaining
              </span>
            )}
          </div>

          {/* Unresolved Any Combat picks */}
          {picks.filter(p => p.rawEntry === 'Any Combat' && !p.resolvedSkill).map(p => (
            <div key={p.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <p className="text-sm text-gray-400 mb-2">Resolve "Any Combat" pick — choose one:</p>
              <div className="flex gap-2">
                {COMBAT_SKILLS.map(s => (
                  <button
                    key={s}
                    onClick={() => resolvePickCombat(p.id, s)}
                    className="px-3 py-1.5 rounded border border-gray-600 bg-gray-700 text-gray-300 hover:border-amber-500 hover:text-amber-300 text-sm transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Learning table */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {pickableEntries.map(entry => (
              <button
                key={entry}
                disabled={picks.length >= 2}
                onClick={() => addPick(entry)}
                className="px-3 py-2 rounded text-sm border border-gray-700 bg-gray-800 hover:border-amber-600 hover:text-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-300 text-left"
              >
                {entry}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ROLL MODE ───────────────────────────────────────────────────────── */}
      {mode === 'roll' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Roll up to <strong>3 times</strong>, dividing between the Growth (d6) and Learning (d8) tables as you wish.
          </p>

          <div className="flex gap-3">
            <button
              disabled={rolls.length >= 3}
              onClick={() => addRoll('growth')}
              className="px-4 py-2 rounded bg-emerald-800 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              🎲 Roll Growth (d6) — {rolls.length}/3
            </button>
            <button
              disabled={rolls.length >= 3}
              onClick={() => addRoll('learning')}
              className="px-4 py-2 rounded bg-blue-900 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              🎲 Roll Learning (d8)
            </button>
          </div>

          {/* Roll results */}
          <div className="space-y-3">
            {rolls.map(r => (
              <div
                key={r.id}
                className={`rounded-lg border p-4 ${
                  r.needsChoice
                    ? 'border-amber-700/60 bg-amber-900/10'
                    : 'border-gray-700 bg-gray-800'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className={`text-xs font-semibold uppercase tracking-wide ${r.table === 'growth' ? 'text-emerald-400' : 'text-blue-400'}`}>
                      {r.table} {r.rollValue}
                    </span>
                    <span className="text-gray-300 text-sm ml-2 font-medium">{r.rawEntry}</span>
                    {r.resolvedSkill && r.rawEntry !== r.resolvedSkill && (
                      <span className="text-amber-300 text-xs ml-2">→ {r.resolvedSkill}</span>
                    )}
                  </div>
                  <button onClick={() => removeRoll(r.id)} className="text-gray-600 hover:text-red-400 text-xs">✕ remove</button>
                </div>

                {/* Stat boost resolution */}
                {r.statBoost && (
                  <div className="mt-2">
                    {(() => {
                      const spent = Object.values(r.statBoost.allocs).reduce((s, v) => s + (v ?? 0), 0);
                      const remaining = r.statBoost.total - spent;
                      return (
                        <>
                          <p className="text-xs text-amber-300 mb-2">
                            Allocate {r.statBoost.total} point{r.statBoost.total > 1 ? 's' : ''} to{' '}
                            {r.statBoost.pool.join(' / ')}.
                            {remaining > 0 && <span className="text-red-400 ml-1">({remaining} remaining)</span>}
                            {remaining === 0 && <span className="text-green-400 ml-1">✓ done</span>}
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {r.statBoost.pool.map(attr => {
                              const cur = r.statBoost!.allocs[attr] ?? 0;
                              return (
                                <div key={attr} className="flex items-center gap-1 bg-gray-900/60 rounded px-3 py-1.5">
                                  <span className="text-xs text-gray-400 w-8">{attr}</span>
                                  <button
                                    onClick={() => allocateStat(r.id, attr, -1)}
                                    disabled={cur === 0}
                                    className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-gray-200 text-sm flex items-center justify-center"
                                  >−</button>
                                  <span className="w-5 text-center text-sm font-bold text-amber-300">{cur}</span>
                                  <button
                                    onClick={() => allocateStat(r.id, attr, +1)}
                                    disabled={remaining === 0}
                                    className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-gray-200 text-sm flex items-center justify-center"
                                  >+</button>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Any Skill / Any Combat resolution */}
                {!r.statBoost && r.needsChoice && (
                  <div className="mt-2">
                    {r.rawEntry === 'Any Combat' ? (
                      <div className="flex gap-2 flex-wrap">
                        {COMBAT_SKILLS.map(s => (
                          <button
                            key={s}
                            onClick={() => resolveRollSkill(r.id, s)}
                            className={`px-3 py-1.5 rounded border text-sm transition-colors ${
                              r.resolvedSkill === s
                                ? 'border-amber-500 bg-amber-900/30 text-amber-300'
                                : 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    ) : (
                      // Any Skill — pick from full skill list
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Pick any non-psychic skill:</p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                          {SKILLS.map(s => (
                            <button
                              key={s}
                              onClick={() => resolveRollSkill(r.id, s)}
                              className={`px-2 py-1 rounded text-xs border transition-colors ${
                                r.resolvedSkill === s
                                  ? 'border-amber-500 bg-amber-900/30 text-amber-300'
                                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {rolls.length === 0 && (
            <p className="text-xs text-gray-600 italic">Click a roll button above to start.</p>
          )}
        </div>
      )}

      {/* ── BONUS SKILL ─────────────────────────────────────────────────────── */}
      <div className="border-t border-gray-700 pt-5">
        <p className="text-sm font-medium text-gray-300 mb-2">
          Bonus Skill
          <span className="text-gray-500 font-normal ml-1">(required — any 1 non-psychic skill reflecting hobbies or natural talent)</span>
          <PageRef page={9} note="Step 9 — Pick one non-psychic skill. Gain it at level-0 if new, raise to level-1 if already at level-0. Cannot raise a skill already at level-1." />
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
          {SKILLS.map(s => (
            <button
              key={s}
              onClick={() => handleBonusSkill(s)}
              className={`px-2 py-1.5 rounded text-xs border transition-colors ${
                bonusSkill === s
                  ? 'border-amber-500 bg-amber-900/30 text-amber-300'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── CURRENT SKILLS SUMMARY ──────────────────────────────────────────── */}
      {Object.keys(currentSkills).length > 0 && (
        <div className="bg-gray-800/60 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-400 mb-2">
            Current Skills
            {!complete && <span className="text-red-400 text-xs ml-2">— step incomplete</span>}
            {complete && <span className="text-green-400 text-xs ml-2">✓</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(currentSkills).sort(([a], [b]) => a.localeCompare(b)).map(([s, lvl]) => (
              <span key={s} className="px-2 py-1 rounded bg-gray-700 text-sm">
                <span className="text-gray-200">{s}</span>
                <span className="text-amber-400 ml-1">-{lvl}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
