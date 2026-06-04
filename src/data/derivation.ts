/**
 * Central character derivation.
 *
 * `char.skills` stores ONLY the raw creation skills chosen in the Skills step
 * (background free skill + background picks/rolls + the step-9 bonus skill).
 * Everything else that grants a skill, raises a stat, or changes a derived value
 * is layered on top here so the rules are applied in exactly one place:
 *
 *   - Foci bonus skills (Gunslinger→Shoot, Alert→Notice, Specialist→chosen, …)  p.19
 *   - Psychic discipline skill levels (from char.psychicDisciplines)             p.21
 *   - Level-up skill spends (from char.levelHistory)                             p.57
 *   - Passive focus effects: Ironhide (AC), Die Hard (HP)                        p.21–22
 *   - Psionic Effort (incl. Psychic Training +1, Wild Psychic Talent)            p.21,24
 */
import type { Character, FocusSelection } from '../types/character';
import { attrMod } from '../types/character';
import { FOCI } from './foci';
import { PSYCHIC_SKILLS } from './skills';
import { ARMOR_TABLE, RANGED_WEAPONS, MELEE_WEAPONS, GENERAL_EQUIPMENT } from './equipment';

const PSYCHIC_SET = new Set<string>(PSYCHIC_SKILLS);
const COMBAT_SKILLS = ['Stab', 'Shoot', 'Punch'];

/** Apply the creation/advancement skill-stacking rule in place (p.9): −1→0, 0→1, cap at the given max. */
function stack(map: Record<string, number>, skill: string, cap = 1): void {
  const cur = map[skill] ?? -1;
  if (cur < 0) map[skill] = 0;
  else if (cur < cap) map[skill] = cur + 1;
  // already at cap → stays (the "pick any other skill" branch is handled at selection time)
}

/**
 * The skill a focus grants at level 1, if any.
 * Specialist / combat-choice foci read the player's chosen skill from the selection.
 */
export function focusBonusSkill(sel: FocusSelection): string | null {
  const def = FOCI.find(f => f.name === sel.name);
  if (!def) return null;
  // Player-chosen bonus skills
  if (sel.specialistSkill) return sel.specialistSkill;
  // Fixed bonus skill defined on the level-1 benefit
  return (def.levels[0].bonusSkill as string) ?? null;
}

/** True if a focus grants a player-chosen bonus skill (so the UI must offer a picker). */
export function focusNeedsSkillChoice(name: string): 'noncombat' | 'combat' | 'psychic' | null {
  if (name === 'Specialist') return 'noncombat';
  if (name === 'Close Combatant') return 'combat';
  if (name === 'Shocking Assault') return 'combat';
  if (name === 'Psychic Training') return 'psychic';
  return null;
}

/** Non-psychic skills: raw creation skills + level-up spends + foci bonus skills. */
export function effectiveSkills(char: Character): Record<string, number> {
  const skills: Record<string, number> = {};

  // 1. Raw creation skills (Step 4 output)
  for (const [s, lvl] of Object.entries(char.skills)) {
    if (!PSYCHIC_SET.has(s) && typeof lvl === 'number') skills[s] = lvl;
  }

  // 2. Level-up skill spends (absolute target levels)
  for (const rec of char.levelHistory ?? []) {
    for (const sp of rec.skillSpends) {
      if (!PSYCHIC_SET.has(sp.skill)) skills[sp.skill] = Math.max(skills[sp.skill] ?? -1, sp.to);
    }
  }

  // 3. Foci bonus skills.
  //    Creation foci grant the bonus skill as a normal pick (new → level-0). Foci taken via
  //    advancement instead grant "3 skill points" toward the skill (p.61): a brand-new skill
  //    arrives at level-1, and an existing skill goes up one step.
  const levelUpFoci = new Set<string>();
  for (const rec of char.levelHistory ?? []) {
    if (rec.focusPicked) levelUpFoci.add(`${rec.focusPicked.name}|${rec.focusPicked.specialistSkill ?? ''}`);
  }
  const maxCap = char.level >= 3 ? 4 : 1;
  for (const f of char.foci) {
    const bs = focusBonusSkill(f);
    if (!bs || PSYCHIC_SET.has(bs)) continue;
    const viaLevelUp = levelUpFoci.has(`${f.name}|${f.specialistSkill ?? ''}`);
    stack(skills, bs, maxCap);
    // A level-up focus's bonus skill is worth 3 SP — push a brand-new skill from 0 up to 1.
    if (viaLevelUp && (skills[bs] ?? 0) < 1) stack(skills, bs, maxCap);
  }

  return skills;
}

/** Psychic discipline skill levels (count of picks − 1), plus Psychic Training's chosen discipline. */
export function psychicSkillLevels(char: Character): Record<string, number> {
  const psy: Record<string, number> = {};
  for (const d of new Set(char.psychicDisciplines)) {
    psy[d] = char.psychicDisciplines.filter(x => x === d).length - 1;
  }
  // Psychic Training focus grants a chosen psychic skill at +1 level (p.22)
  for (const f of char.foci) {
    if (f.name === 'Psychic Training' && f.specialistSkill && PSYCHIC_SET.has(f.specialistSkill)) {
      psy[f.specialistSkill] = (psy[f.specialistSkill] ?? -1) + 1;
    }
  }
  // Level-up psychic skill spends
  for (const rec of char.levelHistory ?? []) {
    for (const sp of rec.skillSpends) {
      if (PSYCHIC_SET.has(sp.skill)) psy[sp.skill] = Math.max(psy[sp.skill] ?? -1, sp.to);
    }
  }
  return psy;
}

/** Maximum psionic Effort (p.21). Handles Psychic Training (+1) and Wild Psychic Talent. */
export function deriveEffort(char: Character): number {
  const isPsychic = char.class === 'Psychic' || char.adventurerPartials?.includes('Partial Psychic');

  // Wild Psychic Talent: non-psychics treated as having Effort = focus level (1 or 2) — p.24
  const wpt = char.foci.find(f => f.name === 'Wild Psychic Talent');
  if (!isPsychic && wpt) return wpt.level;

  if (!isPsychic) return 1;

  const psy = psychicSkillLevels(char);
  const highest = Object.values(psy).length ? Math.max(...Object.values(psy)) : 0;
  const attrBonus = Math.max(attrMod(char.attributes.WIS), attrMod(char.attributes.CON));
  let effort = Math.max(1, 1 + highest + attrBonus);

  // Psychic Training focus: maximum Effort increases by 1 (p.22)
  if (char.foci.some(f => f.name === 'Psychic Training')) effort += 1;

  return effort;
}

/** Armor Class incl. the Ironhide focus (innate AC 15 + ½ level, doesn't stack with armor). p.22 */
export function deriveAC(char: Character): { ac: number; base: number; label: string } {
  const dex = attrMod(char.attributes.DEX);
  let base = 10;
  let label = 'Unarmored';

  const readiedArmor = char.armor.filter(a => !a.notCarried && a.readied !== false);
  if (readiedArmor.length > 0) {
    const best = readiedArmor.reduce((b, a) => (a.ac >= b.ac ? a : b));
    base = best.ac;
    label = best.name;
  }

  if (char.foci.some(f => f.name === 'Ironhide')) {
    const innate = 15 + Math.ceil(char.level / 2);
    if (innate > base) {
      base = innate;
      label = 'Ironhide';
    }
  }

  return { ac: base + dex, base, label };
}

/** Extra max HP from the Die Hard focus: +2 per character level (p.21). */
export function dieHardBonus(char: Character): number {
  return char.foci.some(f => f.name === 'Die Hard') ? 2 * char.level : 0;
}

// ── Encumbrance (p.65) ─────────────────────────────────────────────────────────
// Readied items (worn / in hand / holstered, incl. armor): max = STR ÷ 2 rounded down.
// Stowed items (in pack/pockets): max = full STR score.
// +2 readied or +4 stowed over the limit → Lightly Encumbered (move 7m).
// A further +2 readied or +4 stowed → Heavily Encumbered (move 5m). Beyond that: overloaded.

function generalItemEnc(name: string): number {
  return GENERAL_EQUIPMENT.find(g => g.name === name)?.enc ?? 1;
}

export interface Encumbrance {
  readied: number;      // total readied encumbrance points (armor + weapons)
  stowed: number;       // total stowed encumbrance points (general equipment)
  readiedMax: number;   // STR ÷ 2 (rounded down)
  stowedMax: number;    // STR
  level: 'none' | 'light' | 'heavy' | 'overloaded';
  move: number;         // base movement in metres/round
}

export function computeEncumbrance(char: Character): Encumbrance {
  const str = char.attributes.STR;
  const readiedMax = Math.floor(str / 2);
  const stowedMax = str;

  // Armor and weapons default to Readied; each can be toggled to Stowed (readied === false).
  const readiedSet = new Set(char.equipmentReadied ?? []);
  let readied = 0;
  let stowed = 0;

  for (const a of char.armor) {
    if (a.notCarried) continue;
    const enc = ARMOR_TABLE.find(x => x.name === a.name)?.enc ?? 1;
    if (a.readied === false) stowed += enc; else readied += enc;
  }
  for (const w of char.weapons) {
    if (w.notCarried) continue;
    const enc = RANGED_WEAPONS.find(x => x.name === w.name)?.enc
      ?? MELEE_WEAPONS.find(x => x.name === w.name)?.enc ?? 1;
    if (w.readied === false) stowed += enc; else readied += enc;
  }

  // General equipment defaults to Stowed; readied set → Readied; not-carried set → 0 enc.
  const notCarriedSet = new Set(char.equipmentNotCarried ?? []);
  for (const e of char.equipment) {
    if (notCarriedSet.has(e)) continue;
    const enc = generalItemEnc(e);
    if (readiedSet.has(e)) readied += enc; else stowed += enc;
  }

  // Over-limit "steps": each tier of (readied −2 / stowed −4) over the base limit.
  const readiedOver = Math.max(0, readied - readiedMax);
  const stowedOver = Math.max(0, stowed - stowedMax);
  const readiedTier = Math.ceil(readiedOver / 2);
  const stowedTier = Math.ceil(stowedOver / 4);
  const tier = Math.max(readiedTier, stowedTier);

  let level: Encumbrance['level'] = 'none';
  let move = 10;
  if (tier === 1) { level = 'light'; move = 7; }
  else if (tier === 2) { level = 'heavy'; move = 5; }
  else if (tier >= 3) { level = 'overloaded'; move = 0; }

  return { readied, stowed, readiedMax, stowedMax, level, move };
}

export { COMBAT_SKILLS };
