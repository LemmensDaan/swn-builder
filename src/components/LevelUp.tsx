import { useState } from 'react';
import type { Character, FocusSelection, LevelRecord, PsychicTechniqueSelection } from '../types/character';
import { attrMod, calcSaves, calcAttackBonus } from '../types/character';
import { FOCI } from '../data/foci';
import { SKILLS } from '../data/skills';
import { PSYCHIC_DISCIPLINES } from '../data/psychics';
import { effectiveSkills, psychicSkillLevels, deriveEffort } from '../data/derivation';
import { SKILL_INFO } from '../data/skillInfo';
import {
  spPerLevel, skillRaiseCost, maxSkillLevel,
  FOCUS_LEVELS, ATTR_BOOST_COSTS, attrBoostRequiredLevel,
} from '../data/leveling';

interface Props {
  char: Character;
  onConfirm: (updated: Character) => void;
  onCancel: () => void;
}

type Step = 'hp' | 'skills' | 'focus' | 'confirm';

const ALL_ATTRS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;

export default function LevelUp({ char, onConfirm, onCancel }: Props) {
  const newLevel = char.level + 1;
  const isWarrior = char.class === 'Warrior' || char.adventurerPartials?.includes('Partial Warrior');
  const isExpert = char.class === 'Expert' || char.adventurerPartials?.includes('Partial Expert');
  const gainsFocus = FOCUS_LEVELS.has(newLevel);
  const spTotal = spPerLevel(char.class, char.adventurerPartials);
  const maxSkill = maxSkillLevel(newLevel);

  const conMod = attrMod(char.attributes.CON);
  const hasDieHard = char.foci.some(f => f.name === 'Die Hard');
  const isPsychic = char.class === 'Psychic';
  const isPartialPsychic = !!char.adventurerPartials?.includes('Partial Psychic');
  const anyPsychic = isPsychic || isPartialPsychic;

  // Disciplines this PC may improve: a full Psychic can raise/learn any; a Partial Psychic
  // is restricted to the one they chose (p.61).
  const psychicBase = psychicSkillLevels(char);
  const raisableDisciplines: string[] = isPsychic
    ? PSYCHIC_DISCIPLINES.map(d => d.skill)
    : isPartialPsychic
    ? Object.keys(psychicBase)
    : [];

  // Current effective skill levels (incl. foci/psychic/prior levels) form the floor for raising.
  const baseLevels: Record<string, number> = { ...effectiveSkills(char), ...psychicBase };

  const [uiStep, setUiStep] = useState<Step>('hp');
  // The book rerolls the WHOLE hit-die pool each level (p.56): newLevel d6, +CON per die (min 1 each),
  // plus +2/level for Warriors and +2/level for Die Hard. Take the new total if higher, else +1.
  const [hpPool, setHpPool] = useState<number | null>(null);
  const [rerolled, setRerolled] = useState(false);

  // SP spending
  const [spSpent, setSpSpent] = useState(0);
  const [skillSpends, setSkillSpends] = useState<Record<string, number>>(
    Object.fromEntries(Object.entries(baseLevels))
  );
  const [attrBoostsUsed, setAttrBoostsUsed] = useState(0);
  const [attrBoostAllocs, setAttrBoostAllocs] = useState<Record<string, number>>(
    Object.fromEntries(ALL_ATTRS.map(a => [a, char.attributes[a]]))
  );

  // Focus pick
  const [pickedFocus, setPickedFocus] = useState<FocusSelection | null>(null);
  const [focusFilter, setFocusFilter] = useState<'all' | 'combat' | 'noncombat'>('all');

  // Psychic techniques learned this level-up (local), with whether each was free or SP-bought.
  const [learnedTechs, setLearnedTechs] = useState<{ discipline: string; techniqueName: string; level: number; free: boolean }[]>([]);

  const warriorTotal = isWarrior ? 2 * newLevel : 0;
  const dieHardTotal = hasDieHard ? 2 * newLevel : 0;
  const rolledMax = hpPool !== null ? hpPool + warriorTotal + dieHardTotal : null;
  // New maximum HP: the rerolled total if it beats current, otherwise current + 1.
  const newMaxHP = rolledMax !== null ? Math.max(rolledMax, char.hitPoints.max + 1) : null;
  const hpGained = newMaxHP !== null ? newMaxHP - char.hitPoints.max : null;
  const spRemaining = spTotal - spSpent;

  // ── HP step ──────────────────────────────────────────────────────────────────

  function rollPool(): number {
    let sum = 0;
    for (let i = 0; i < newLevel; i++) sum += Math.max(1, Math.ceil(Math.random() * 6) + conMod);
    return sum;
  }

  function rollHP() {
    setHpPool(rollPool());
  }

  function rerollHP() {
    if (!rerolled) {
      setHpPool(rollPool());
      setRerolled(true);
    }
  }

  // ── Skill step ───────────────────────────────────────────────────────────────

  function currentLevel(skill: string): number {
    return skillSpends[skill] ?? -1;
  }

  function canRaiseSkill(skill: string): boolean {
    const cur = currentLevel(skill);
    const target = cur + 1;
    if (target > maxSkill) return false;
    const cost = skillRaiseCost(target);
    return spRemaining >= cost;
  }

  function raiseSkill(skill: string) {
    const cur = currentLevel(skill);
    const target = cur + 1;
    if (target > maxSkill) return;
    const cost = skillRaiseCost(target);
    if (spRemaining < cost) return;
    setSkillSpends(prev => ({ ...prev, [skill]: target }));
    setSpSpent(s => s + cost);
  }

  function lowerSkill(skill: string) {
    const cur = currentLevel(skill);
    const base = baseLevels[skill] ?? -1;
    if (cur <= base) return; // can't go below the pre-level-up level
    const refund = skillRaiseCost(cur);
    setSkillSpends(prev => ({ ...prev, [skill]: cur - 1 }));
    setSpSpent(s => s - refund);
  }

  // Total boosts taken so far across ALL level history + current
  const prevBoostCount = char.levelHistory.reduce((n, r) => n + r.attrBoosts.length, 0);
  const totalBoostsTaken = prevBoostCount + attrBoostsUsed;

  function canBoostAttr(): boolean {
    if (totalBoostsTaken >= ATTR_BOOST_COSTS.length) return false;
    const cost = ATTR_BOOST_COSTS[totalBoostsTaken];
    const reqLevel = attrBoostRequiredLevel(totalBoostsTaken);
    return spRemaining >= cost && newLevel >= reqLevel;
  }

  function boostAttr(attr: string) {
    if (!canBoostAttr()) return;
    const cost = ATTR_BOOST_COSTS[totalBoostsTaken];
    const cur = attrBoostAllocs[attr];
    if (cur >= 18) return;
    setAttrBoostAllocs(prev => ({ ...prev, [attr]: Math.min(18, cur + 1) }));
    setAttrBoostsUsed(n => n + 1);
    setSpSpent(s => s + cost);
  }

  // ── Psychic techniques ─────────────────────────────────────────────────────
  // Each psychic-skill level gained this level-up grants ONE free technique of equal/lower
  // level from that discipline (p.61). Beyond that, a technique costs its level in skill points.

  function levelsRaisedThisTurn(discipline: string): number {
    return Math.max(0, currentLevel(discipline) - (psychicBase[discipline] ?? -1));
  }
  function freeTechsAvailable(discipline: string): number {
    const used = learnedTechs.filter(t => t.discipline === discipline && t.free).length;
    return levelsRaisedThisTurn(discipline) - used;
  }
  function alreadyKnows(discipline: string, name: string): boolean {
    return char.psychicTechniques.some(t => t.discipline === discipline && t.techniqueName === name)
      || learnedTechs.some(t => t.discipline === discipline && t.techniqueName === name);
  }
  function learnTech(discipline: string, name: string, level: number) {
    const free = freeTechsAvailable(discipline) > 0;
    if (!free && spRemaining < level) return;
    setLearnedTechs(prev => [...prev, { discipline, techniqueName: name, level, free }]);
    if (!free) setSpSpent(s => s + level);
  }
  function unlearnTech(discipline: string, name: string) {
    const t = learnedTechs.find(x => x.discipline === discipline && x.techniqueName === name);
    if (!t) return;
    setLearnedTechs(prev => prev.filter(x => !(x.discipline === discipline && x.techniqueName === name)));
    if (!t.free) setSpSpent(s => s - t.level);
  }

  // SP spent specifically on psychic skills/techniques this level-up (p.61: a psychic must
  // commit at least one point to psychic advancement, or leave it unspent for later).
  const psychicSkillSpent = raisableDisciplines.reduce((sum, d) => {
    let s = 0;
    for (let lv = (psychicBase[d] ?? -1) + 1; lv <= currentLevel(d); lv++) s += skillRaiseCost(lv);
    return sum + s;
  }, 0);
  const techSpent = learnedTechs.filter(t => !t.free).reduce((s, t) => s + t.level, 0);
  const psychicSpent = psychicSkillSpent + techSpent;
  // Violation: a psychic spent ALL points on mundane skills/attrs with nothing left for psychic.
  const psychicRuleViolation = anyPsychic && psychicSpent === 0 && spRemaining === 0;

  // ── Focus step ───────────────────────────────────────────────────────────────

  const filteredFoci = FOCI.filter(f => {
    if (focusFilter === 'combat' && !f.isCombat) return false;
    if (focusFilter === 'noncombat' && f.isCombat) return false;
    return true;
  });

  function pickFocus(name: string) {
    const existing = char.foci.find(f => f.name === name);
    if (existing) {
      // Upgrade to level 2 if possible
      if (existing.level < 2) {
        setPickedFocus({ ...existing, level: 2 });
      }
    } else {
      setPickedFocus({ name, level: 1 });
    }
  }

  // ── Confirm ──────────────────────────────────────────────────────────────────

  function confirm() {
    if (hpGained === null || newMaxHP === null) return;

    // Skill spends — anything raised above its pre-level-up level. These live ONLY in
    // levelHistory; char.skills stays the raw creation set and the derivation layers them on.
    const skillSpendsArr = Object.entries(skillSpends)
      .filter(([skill, to]) => to > (baseLevels[skill] ?? -1))
      .map(([skill, to]) => ({ skill, from: baseLevels[skill] ?? -1, to, cost: skillRaiseCost(to) }));

    // Attr boosts
    const attrBoostsArr = Object.entries(attrBoostAllocs)
      .filter(([attr, to]) => to > char.attributes[attr as keyof typeof char.attributes])
      .map(([attr, to]) => ({
        attr,
        from: char.attributes[attr as keyof typeof char.attributes],
        to,
        cost: ATTR_BOOST_COSTS[prevBoostCount] ?? 0,
      }));

    const record: LevelRecord = {
      level: newLevel,
      hpRolled: hpPool!,
      hpGained,
      spTotal,
      skillSpends: skillSpendsArr,
      attrBoosts: attrBoostsArr,
      techniquesLearned: learnedTechs.map(t => ({ discipline: t.discipline, techniqueName: t.techniqueName, cost: t.free ? 0 : t.level })),
      focusPicked: pickedFocus ?? undefined,
    };

    const updatedChar = { ...char };
    updatedChar.level = newLevel;
    // Newly learned psychic techniques
    if (learnedTechs.length > 0) {
      updatedChar.psychicTechniques = [
        ...char.psychicTechniques,
        ...learnedTechs.map((t): PsychicTechniqueSelection => ({ discipline: t.discipline, techniqueName: t.techniqueName })),
      ];
    }
    updatedChar.hitPoints = {
      max: newMaxHP,
      // keep the same fraction of damage taken: current rises by the same gain
      current: char.hitPoints.current + hpGained,
    };

    // Attribute boosts apply directly to stored attributes.
    const newAttrs = { ...char.attributes };
    for (const boost of attrBoostsArr) {
      (newAttrs as Record<string, number>)[boost.attr] = boost.to;
    }
    updatedChar.attributes = newAttrs;

    // Apply focus (new instance, or upgrade existing to level 2)
    if (pickedFocus) {
      const existing = updatedChar.foci.findIndex(f => f.name === pickedFocus.name && (f.specialistSkill ?? '') === (pickedFocus.specialistSkill ?? ''));
      if (existing >= 0) {
        const foci = [...updatedChar.foci];
        foci[existing] = pickedFocus;
        updatedChar.foci = foci;
      } else {
        updatedChar.foci = [...updatedChar.foci, pickedFocus];
      }
    }

    // Record history BEFORE recomputing derived stats (derivation reads levelHistory)
    updatedChar.levelHistory = [...char.levelHistory, record];

    // Recalculate derived stats
    updatedChar.saves = calcSaves(updatedChar.attributes, newLevel);
    updatedChar.baseAttackBonus = calcAttackBonus(updatedChar.class, updatedChar.adventurerPartials, newLevel);
    updatedChar.effort = { ...updatedChar.effort, max: deriveEffort(updatedChar) };
    updatedChar.systemStrain.max = updatedChar.attributes.CON;

    onConfirm(updatedChar);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const steps: Step[] = ['hp', 'skills', ...(gainsFocus ? ['focus' as Step] : []), 'confirm'];
  const stepIndex = steps.indexOf(uiStep);

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-950 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="bg-gray-900 rounded-t-2xl px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-amber-300 font-bold text-base sm:text-lg">Level Up — Level {newLevel}</h2>
            <div className="flex flex-wrap gap-1.5 sm:gap-3 mt-1">
              {steps.map((s, i) => (
                <span key={s} className={`text-xs px-2 py-0.5 rounded ${uiStep === s ? 'bg-amber-700 text-white' : i < stepIndex ? 'text-green-400' : 'text-gray-600'}`}>
                  {s === 'hp' ? 'HP' : s === 'skills' ? 'Skills' : s === 'focus' ? 'Focus' : 'Confirm'}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 text-xl ml-2 flex-shrink-0">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-4 sm:space-y-5">

          {/* ── HP STEP ─────────────────────────────────────────── */}
          {uiStep === 'hp' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Reroll your whole hit-die pool: <strong>{newLevel}d6</strong>, +CON per die (min 1 each)
                {isWarrior ? `, +${warriorTotal} Warrior` : ''}{hasDieHard ? `, +${dieHardTotal} Die Hard` : ''}.
                Keep the new total if it beats your current max, otherwise your max just rises by 1 (p.56).
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                {hpPool === null ? (
                  <button onClick={rollHP} className="px-5 py-2.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-semibold">
                    🎲 Roll {newLevel}d6 pool
                  </button>
                ) : (
                  <>
                    <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-5 py-3 flex-wrap">
                      <span className="text-gray-500 text-sm">pool</span>
                      <span className="text-2xl font-bold text-amber-300">{hpPool}</span>
                      {warriorTotal > 0 && <span className="text-amber-400 text-sm">+{warriorTotal} War</span>}
                      {dieHardTotal > 0 && <span className="text-amber-400 text-sm">+{dieHardTotal} DH</span>}
                      <span className="text-gray-600">→</span>
                      <span className="text-sm text-gray-400">new max</span>
                      <span className="text-2xl font-bold text-green-400">{newMaxHP}</span>
                      <span className="text-xs text-gray-500">(+{hpGained})</span>
                    </div>
                    {!rerolled && (
                      <button onClick={rerollHP} className="text-xs text-gray-500 hover:text-amber-300 underline">
                        Reroll once
                      </button>
                    )}
                  </>
                )}
              </div>
              {rolledMax !== null && rolledMax <= char.hitPoints.max && (
                <p className="text-xs text-amber-400">
                  Rolled total ({rolledMax}) didn't beat your current max ({char.hitPoints.max}) — max rises by 1 instead.
                </p>
              )}
            </div>
          )}

          {/* ── SKILLS STEP ─────────────────────────────────────── */}
          {uiStep === 'skills' && (
            <div className="space-y-4">
              {/* SP pool */}
              <div className="flex items-center gap-4 bg-gray-800 rounded-xl px-4 py-3">
                <span className="text-gray-400 text-sm">Skill Points</span>
                <div className="flex gap-1.5">
                  {Array.from({ length: spTotal }, (_, i) => (
                    <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < spSpent ? 'bg-amber-700 text-amber-200' : 'bg-gray-700 text-gray-500'}`}>
                      {i < spSpent ? '✓' : i + 1}
                    </div>
                  ))}
                </div>
                <span className={`ml-auto text-sm font-bold ${spRemaining === 0 ? 'text-gray-600' : 'text-amber-300'}`}>
                  {spRemaining} remaining
                </span>
              </div>

              <p className="text-xs text-gray-500">
                Cost to raise a skill: <strong>new level + 1</strong> SP &nbsp;|&nbsp; Max skill level at this level: <strong>{maxSkill}</strong>
                {isExpert && <span className="text-amber-400 ml-2">+1 SP as Expert (use freely on any non-combat, non-psychic skill)</span>}
              </p>

              {/* Skills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SKILLS.map(skill => {
                  const base = (char.skills as Record<string, number>)[skill] ?? -1;
                  const cur = currentLevel(skill);
                  const raised = cur > base;
                  const canRaise = canRaiseSkill(skill);
                  const atMax = cur >= maxSkill;
                  return (
                    <div key={skill} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${raised ? 'bg-amber-900/20 border border-amber-700/40' : 'bg-gray-800/60'}`}>
                      <span className="flex-1 text-sm text-gray-200 cursor-help" title={SKILL_INFO[skill] ? `${skill}: ${SKILL_INFO[skill]}` : skill}>{skill}</span>
                      <span className={`text-xs font-mono w-6 text-center ${raised ? 'text-amber-300 font-bold' : 'text-gray-500'}`}>
                        {cur === -1 ? '—' : `-${cur}`}
                      </span>
                      <button
                        onClick={() => lowerSkill(skill)}
                        disabled={cur <= base}
                        className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-20 text-gray-300 text-sm flex items-center justify-center"
                      >−</button>
                      <button
                        onClick={() => raiseSkill(skill)}
                        disabled={!canRaise || atMax}
                        className="w-6 h-6 rounded bg-gray-700 hover:bg-amber-700 disabled:opacity-20 text-gray-300 text-sm flex items-center justify-center"
                        title={atMax ? `Max level-${maxSkill} at this character level` : canRaise ? `Costs ${skillRaiseCost(cur + 1)} SP` : 'Not enough SP'}
                      >+</button>
                      {raised && (
                        <span className="text-xs text-amber-600 w-14 text-right">
                          {base === -1 ? 'new' : `was -${base}`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Attribute boosts */}
              {canBoostAttr() || attrBoostsUsed > 0 ? (
                <div className="border-t border-gray-700 pt-4">
                  <p className="text-sm font-medium text-gray-300 mb-2">
                    Attribute Boosts
                    <span className="text-gray-500 font-normal text-xs ml-2">
                      Cost: {ATTR_BOOST_COSTS[totalBoostsTaken] ?? '—'} SP for next boost
                    </span>
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {ALL_ATTRS.map(attr => {
                      const base = char.attributes[attr];
                      const cur = attrBoostAllocs[attr];
                      const boosted = cur > base;
                      return (
                        <div key={attr} className={`rounded-lg p-2 text-center ${boosted ? 'bg-blue-900/30 border border-blue-700/40' : 'bg-gray-800/60'}`}>
                          <div className="text-xs text-gray-500">{attr}</div>
                          <div className="text-lg font-bold text-gray-100">{cur}</div>
                          {boosted && <div className="text-xs text-blue-400">+{cur - base}</div>}
                          <button
                            onClick={() => boostAttr(attr)}
                            disabled={!canBoostAttr() || cur >= 18}
                            className="mt-1 w-6 h-5 rounded bg-gray-700 hover:bg-blue-700 disabled:opacity-20 text-gray-300 text-xs flex items-center justify-center mx-auto"
                          >+</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Psychic advancement */}
              {anyPsychic && (
                <div className="border-t border-gray-700 pt-4 space-y-3">
                  <p className="text-sm font-medium text-indigo-300">
                    Psychic Advancement
                    <span className="text-gray-500 font-normal text-xs ml-2">
                      raise a discipline (cost = new level + 1) — must spend at least 1 point on psychic here or save it
                    </span>
                  </p>

                  {/* Disciplines */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {raisableDisciplines.map(d => {
                      const cur = currentLevel(d);
                      const base = psychicBase[d] ?? -1;
                      const raised = cur > base;
                      const atMax = cur >= maxSkill;
                      const nextCost = skillRaiseCost(cur + 1);
                      return (
                        <div key={d} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${raised ? 'bg-indigo-900/20 border border-indigo-700/40' : 'bg-gray-800/60'}`}>
                          <span className="flex-1 text-sm text-indigo-200 cursor-help" title={SKILL_INFO[d] ?? d}>{d}</span>
                          <span className={`text-xs font-mono w-6 text-center ${raised ? 'text-indigo-300 font-bold' : 'text-gray-500'}`}>
                            {cur === -1 ? '—' : `-${cur}`}
                          </span>
                          <button
                            onClick={() => lowerSkill(d)}
                            disabled={cur <= base}
                            className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-20 text-gray-300 text-sm flex items-center justify-center"
                          >−</button>
                          <button
                            onClick={() => raiseSkill(d)}
                            disabled={atMax || spRemaining < nextCost}
                            title={atMax ? `Max level-${maxSkill} at this character level` : `Costs ${nextCost} SP`}
                            className="w-6 h-6 rounded bg-gray-700 hover:bg-indigo-700 disabled:opacity-20 text-gray-300 text-sm flex items-center justify-center"
                          >+</button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Techniques for disciplines you have at level-0+ */}
                  {raisableDisciplines.filter(d => currentLevel(d) >= 0).map(d => {
                    const disc = PSYCHIC_DISCIPLINES.find(x => x.skill === d);
                    if (!disc) return null;
                    const lvl = currentLevel(d);
                    const free = freeTechsAvailable(d);
                    const available = disc.techniques.filter(t => t.level <= lvl && !alreadyKnows(d, t.name));
                    if (available.length === 0 && learnedTechs.filter(t => t.discipline === d).length === 0) return null;
                    return (
                      <div key={`tech-${d}`} className="bg-gray-900/40 rounded-lg p-3">
                        <p className="text-xs text-indigo-300 mb-1.5">
                          {d} techniques
                          {free > 0 && <span className="text-green-400 ml-2">{free} free pick{free > 1 ? 's' : ''} available</span>}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {learnedTechs.filter(t => t.discipline === d).map(t => (
                            <button
                              key={t.techniqueName}
                              onClick={() => unlearnTech(d, t.techniqueName)}
                              className="text-xs px-2 py-1 rounded bg-indigo-900/40 border border-indigo-600 text-indigo-200"
                              title="Click to remove"
                            >
                              {t.techniqueName} {t.free ? '(free)' : `(${t.level} SP)`} ✕
                            </button>
                          ))}
                          {available.map(t => {
                            const willBeFree = free > 0;
                            const affordable = willBeFree || spRemaining >= t.level;
                            return (
                              <button
                                key={t.name}
                                onClick={() => learnTech(d, t.name, t.level)}
                                disabled={!affordable}
                                title={t.description}
                                className={`text-xs px-2 py-1 rounded border transition-colors ${
                                  affordable
                                    ? 'border-gray-600 bg-gray-800 text-gray-300 hover:border-indigo-500 hover:text-indigo-300'
                                    : 'border-gray-800 bg-gray-900 text-gray-600 cursor-not-allowed'
                                }`}
                              >
                                + {t.name} <span className="text-gray-500">L{t.level} · {willBeFree ? 'free' : `${t.level} SP`}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {psychicRuleViolation && (
                    <p className="text-xs text-red-400">
                      ⚠ Psychics must spend at least one skill point on a psychic skill or technique (or leave a point unspent).
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── FOCUS STEP ──────────────────────────────────────── */}
          {uiStep === 'focus' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Pick one new focus level. You can take a new focus at level 1, or upgrade an existing focus to level 2.
              </p>
              {pickedFocus && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-900/30 border border-amber-700 text-amber-300 text-sm">
                  <span className="font-medium">{pickedFocus.name}</span>
                  <span className="text-amber-500">Level {pickedFocus.level}</span>
                  <button onClick={() => setPickedFocus(null)} className="ml-auto text-amber-500 hover:text-red-400">×</button>
                </div>
              )}
              <div className="flex gap-2 mb-2">
                {(['all', 'combat', 'noncombat'] as const).map(f => (
                  <button key={f} onClick={() => setFocusFilter(f)}
                    className={`px-3 py-1 rounded text-xs border transition-colors ${focusFilter === f ? 'border-amber-500 bg-amber-900/30 text-amber-300' : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'}`}>
                    {f === 'all' ? 'All' : f === 'combat' ? 'Combat' : 'Non-Combat'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                {filteredFoci.map(focus => {
                  const existing = char.foci.find(f => f.name === focus.name);
                  const isSelected = pickedFocus?.name === focus.name;
                  const canUpgrade = existing && existing.level < 2;
                  const alreadyMax = existing && existing.level >= 2;
                  return (
                    <button
                      key={focus.name}
                      disabled={!!alreadyMax}
                      onClick={() => !alreadyMax && pickFocus(focus.name)}
                      className={`text-left rounded-lg p-3 border transition-colors ${isSelected ? 'border-amber-500 bg-amber-900/20' : alreadyMax ? 'border-gray-800 bg-gray-900/40 opacity-40 cursor-not-allowed' : 'border-gray-700 bg-gray-800 hover:border-amber-600'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${isSelected ? 'text-amber-300' : 'text-gray-200'}`}>{focus.name}</span>
                        {existing ? (
                          <span className="text-xs text-blue-400">{canUpgrade ? 'upgrade to Lvl 2' : 'already Lvl 2'}</span>
                        ) : (
                          <span className="text-xs text-gray-500">new</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{focus.levels[existing ? 1 : 0].description.slice(0, 80)}…</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── CONFIRM STEP ────────────────────────────────────── */}
          {uiStep === 'confirm' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-amber-300">Summary — Level {newLevel}</p>
              <Row label="Hit Points" value={`+${hpGained} (pool ${hpPool})`} />
              <Row label="New max HP" value={`${newMaxHP}`} />
              <Row label="Attack Bonus" value={`+${calcAttackBonus(char.class, char.adventurerPartials, newLevel)}`} />
              <Row label="Saves" value={(() => {
                const s = calcSaves(char.attributes, newLevel);
                return `Phys ${s.physical} / Eva ${s.evasion} / Men ${s.mental}`;
              })()} />
              {Object.entries(skillSpends).filter(([skill, lvl]) => lvl > (baseLevels[skill] ?? -1)).map(([skill, lvl]) => (
                <Row key={skill} label={`${skill}`} value={`${(baseLevels[skill] ?? -1) < 0 ? 'untrained' : `-${baseLevels[skill]}`} → -${lvl}`} />
              ))}
              {Object.entries(attrBoostAllocs).filter(([attr, val]) => val > char.attributes[attr as keyof typeof char.attributes]).map(([attr, val]) => (
                <Row key={attr} label={`${attr} boost`} value={`${char.attributes[attr as keyof typeof char.attributes]} → ${val}`} />
              ))}
              {learnedTechs.map(t => (
                <Row key={`${t.discipline}-${t.techniqueName}`} label={`${t.discipline} technique`} value={`${t.techniqueName} ${t.free ? '(free)' : `(${t.level} SP)`}`} />
              ))}
              {pickedFocus && <Row label="New focus" value={`${pickedFocus.name} Level ${pickedFocus.level}`} />}
              {spRemaining > 0 && !psychicRuleViolation && (
                <p className="text-xs text-amber-400">⚠ {spRemaining} skill point{spRemaining > 1 ? 's' : ''} unspent — you can go back and spend them.</p>
              )}
              {psychicRuleViolation && (
                <p className="text-xs text-red-400">⚠ A Psychic must spend at least one skill point on psychic advancement (or leave a point unspent). Go back and adjust.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-900 rounded-b-2xl px-6 py-4 border-t border-gray-700 flex justify-between flex-shrink-0">
          <button
            onClick={() => {
              const prev = steps[stepIndex - 1];
              if (prev) setUiStep(prev);
              else onCancel();
            }}
            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm"
          >
            ← Back
          </button>
          {uiStep !== 'confirm' ? (
            <button
              disabled={uiStep === 'hp' && hpPool === null}
              onClick={() => setUiStep(steps[stepIndex + 1])}
              className="px-5 py-2 rounded bg-amber-700 hover:bg-amber-600 disabled:opacity-30 text-white text-sm font-medium"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={confirm}
              disabled={psychicRuleViolation}
              className="px-6 py-2 rounded bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold"
            >
              ✓ Confirm Level Up
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-sm border-b border-gray-800 pb-1">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-100 font-medium">{value}</span>
    </div>
  );
}
