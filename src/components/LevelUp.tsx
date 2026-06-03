import { useState } from 'react';
import type { Character, FocusSelection, LevelRecord } from '../types/character';
import { attrMod, calcSaves, calcAttackBonus, calcEffort } from '../types/character';
import { FOCI } from '../data/foci';
import { PSYCHIC_DISCIPLINES } from '../data/psychics';
import { SKILLS } from '../data/skills';
import type { Skill } from '../data/skills';
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
  const isPsychic = char.class === 'Psychic' || char.adventurerPartials?.includes('Partial Psychic');
  const gainsFocus = FOCUS_LEVELS.has(newLevel);
  const spTotal = spPerLevel(char.class, char.adventurerPartials);
  const maxSkill = maxSkillLevel(newLevel);

  const [uiStep, setUiStep] = useState<Step>('hp');
  const [hpRolled, setHpRolled] = useState<number | null>(null);
  const [rerolled, setRerolled] = useState(false);

  // SP spending
  const [spSpent, setSpSpent] = useState(0);
  const [skillSpends, setSkillSpends] = useState<Record<string, number>>(
    // Start from current skill levels
    Object.fromEntries(Object.entries(char.skills).map(([k, v]) => [k, v]))
  );
  const [attrBoostsUsed, setAttrBoostsUsed] = useState(0);
  const [attrBoostAllocs, setAttrBoostAllocs] = useState<Record<string, number>>(
    Object.fromEntries(ALL_ATTRS.map(a => [a, char.attributes[a]]))
  );

  // Focus pick
  const [pickedFocus, setPickedFocus] = useState<FocusSelection | null>(null);
  const [focusFilter, setFocusFilter] = useState<'all' | 'combat' | 'noncombat'>('all');

  const conMod = attrMod(char.attributes.CON);
  const hpGained = hpRolled !== null
    ? Math.max(1, hpRolled + conMod + (isWarrior ? 2 : 0))
    : null;
  const spRemaining = spTotal - spSpent;

  // ── HP step ──────────────────────────────────────────────────────────────────

  function rollHP() {
    setHpRolled(Math.ceil(Math.random() * 6));
  }

  function rerollHP() {
    if (!rerolled) {
      setHpRolled(Math.ceil(Math.random() * 6));
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
    const base = (char.skills as Record<string, number>)[skill] ?? -1;
    if (cur <= base) return; // can't go below creation level
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

  // Psychic techniques available to learn
  const psychicDisciplines = char.class === 'Psychic' || char.adventurerPartials?.includes('Partial Psychic')
    ? [...new Set(char.psychicDisciplines)]
    : [];

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
    if (hpGained === null) return;

    // Build skill spends list (only things that changed from char.skills)
    const skillSpendsArr = Object.entries(skillSpends)
      .filter(([skill, to]) => {
        const from = (char.skills as Record<string, number>)[skill] ?? -1;
        return to > from;
      })
      .map(([skill, to]) => {
        const from = (char.skills as Record<string, number>)[skill] ?? -1;
        return { skill, from, to, cost: skillRaiseCost(to) };
      });

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
      hpRolled: hpRolled!,
      hpGained,
      spTotal,
      skillSpends: skillSpendsArr,
      attrBoosts: attrBoostsArr,
      techniquesLearned: [],
      focusPicked: pickedFocus ?? undefined,
    };

    const updatedChar = { ...char };
    updatedChar.level = newLevel;
    updatedChar.hitPoints = {
      max: char.hitPoints.max + hpGained,
      current: char.hitPoints.current + hpGained,
    };

    // Apply skill changes
    const newSkills = { ...char.skills };
    for (const spend of skillSpendsArr) {
      (newSkills as Record<string, number>)[spend.skill] = spend.to;
    }
    updatedChar.skills = newSkills;

    // Apply attr changes
    const newAttrs = { ...char.attributes };
    for (const boost of attrBoostsArr) {
      (newAttrs as Record<string, typeof char.attributes.STR>)[boost.attr as keyof typeof char.attributes] = boost.to as typeof char.attributes.STR;
    }
    updatedChar.attributes = newAttrs;

    // Apply focus
    if (pickedFocus) {
      const existing = updatedChar.foci.findIndex(f => f.name === pickedFocus.name);
      if (existing >= 0) {
        const foci = [...updatedChar.foci];
        foci[existing] = pickedFocus;
        updatedChar.foci = foci;
      } else {
        updatedChar.foci = [...updatedChar.foci, pickedFocus];
      }
    }

    // Recalculate derived stats
    updatedChar.saves = calcSaves(updatedChar.attributes, newLevel);
    updatedChar.baseAttackBonus = calcAttackBonus(updatedChar.class, updatedChar.adventurerPartials, newLevel);
    if (isPsychic) updatedChar.effort.max = calcEffort(updatedChar.skills, updatedChar.attributes);
    updatedChar.systemStrain.max = updatedChar.attributes.CON;

    // Record history
    updatedChar.levelHistory = [...char.levelHistory, record];

    onConfirm(updatedChar);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const steps: Step[] = ['hp', 'skills', ...(gainsFocus ? ['focus' as Step] : []), 'confirm'];
  const stepIndex = steps.indexOf(uiStep);

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-950 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="bg-gray-900 rounded-t-2xl px-6 py-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-amber-300 font-bold text-lg">Level Up — Level {newLevel}</h2>
            <div className="flex gap-3 mt-1">
              {steps.map((s, i) => (
                <span key={s} className={`text-xs px-2 py-0.5 rounded ${uiStep === s ? 'bg-amber-700 text-white' : i < stepIndex ? 'text-green-400' : 'text-gray-600'}`}>
                  {s === 'hp' ? 'Hit Points' : s === 'skills' ? 'Skill Points' : s === 'focus' ? 'New Focus' : 'Confirm'}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 text-xl">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── HP STEP ─────────────────────────────────────────── */}
          {uiStep === 'hp' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Roll 1d6 and add your CON modifier{isWarrior ? ' plus 2 (Warrior)' : ''}. Minimum 1.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                {hpRolled === null ? (
                  <button onClick={rollHP} className="px-5 py-2.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-semibold">
                    🎲 Roll HP
                  </button>
                ) : (
                  <>
                    <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-5 py-3">
                      <span className="text-3xl font-bold text-amber-300">{hpRolled}</span>
                      <span className="text-gray-500">rolled</span>
                      {conMod !== 0 && (
                        <>
                          <span className="text-gray-600">+</span>
                          <span className={conMod > 0 ? 'text-green-400' : 'text-red-400'}>{conMod} CON</span>
                        </>
                      )}
                      {isWarrior && (
                        <>
                          <span className="text-gray-600">+</span>
                          <span className="text-amber-400">2 Warrior</span>
                        </>
                      )}
                      <span className="text-gray-600">=</span>
                      <span className="text-2xl font-bold text-green-400">+{hpGained} HP</span>
                    </div>
                    {!rerolled && (
                      <button onClick={rerollHP} className="text-xs text-gray-500 hover:text-amber-300 underline">
                        Reroll once
                      </button>
                    )}
                  </>
                )}
              </div>
              {hpRolled !== null && (
                <p className="text-xs text-gray-500">
                  New max HP: {char.hitPoints.max} + {hpGained} = <span className="text-green-400 font-semibold">{char.hitPoints.max + hpGained!}</span>
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
                      <span className="flex-1 text-sm text-gray-200">{skill}</span>
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
              <Row label="Hit Points" value={`+${hpGained} (rolled ${hpRolled})`} />
              <Row label="New max HP" value={`${char.hitPoints.max + hpGained!}`} />
              <Row label="Attack Bonus" value={`+${calcAttackBonus(char.class, char.adventurerPartials, newLevel)}`} />
              <Row label="Saves" value={(() => {
                const s = calcSaves(char.attributes, newLevel);
                return `Phys ${s.physical} / Eva ${s.evasion} / Men ${s.mental}`;
              })()} />
              {Object.entries(skillSpends).filter(([skill, lvl]) => lvl > ((char.skills as Record<string, number>)[skill] ?? -1)).map(([skill, lvl]) => (
                <Row key={skill} label={`${skill}`} value={`-${(char.skills as Record<string, number>)[skill] ?? 'untrained'} → -${lvl}`} />
              ))}
              {Object.entries(attrBoostAllocs).filter(([attr, val]) => val > char.attributes[attr as keyof typeof char.attributes]).map(([attr, val]) => (
                <Row key={attr} label={`${attr} boost`} value={`${char.attributes[attr as keyof typeof char.attributes]} → ${val}`} />
              ))}
              {pickedFocus && <Row label="New focus" value={`${pickedFocus.name} Level ${pickedFocus.level}`} />}
              {spRemaining > 0 && (
                <p className="text-xs text-amber-400">⚠ {spRemaining} skill point{spRemaining > 1 ? 's' : ''} unspent — you can go back and spend them.</p>
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
              disabled={uiStep === 'hp' && hpRolled === null}
              onClick={() => setUiStep(steps[stepIndex + 1])}
              className="px-5 py-2 rounded bg-amber-700 hover:bg-amber-600 disabled:opacity-30 text-white text-sm font-medium"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={confirm}
              className="px-6 py-2 rounded bg-green-700 hover:bg-green-600 text-white text-sm font-bold"
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
