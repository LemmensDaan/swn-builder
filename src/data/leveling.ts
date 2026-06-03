import type { ClassName, AdventurerPartial } from '../types/character';

/** XP required to reach each level (p. character sheet) */
export const XP_TABLE: Record<number, number> = {
  1: 0,
  2: 3,
  3: 6,
  4: 12,
  5: 18,
  6: 27,
  7: 39,
  8: 54,
  9: 72,
  10: 93,
};

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= 10) return XP_TABLE[level] ?? 93;
  // Level 11+: 93 + 24 per level beyond 10
  return 93 + (level - 10) * 24;
}

export function levelFromXp(xp: number): number {
  let lvl = 1;
  while (xp >= xpForLevel(lvl + 1)) lvl++;
  return Math.min(lvl, 20);
}

/** Levels at which a character gains a new focus pick (p.19) */
export const FOCUS_LEVELS = new Set([2, 5, 7, 10]);

/** SP gained per level — Experts/Partial Experts get +1 for non-combat/non-psychic */
export function spPerLevel(cls: ClassName, partials?: AdventurerPartial[]): number {
  const isExpert = cls === 'Expert' || partials?.includes('Partial Expert');
  return isExpert ? 4 : 3;
}

/**
 * Cost in SP to raise a skill to the target level (p. character sheet: "Cost: new value + 1").
 *   Untrained (-1) → 0: costs 1 SP
 *   0 → 1: costs 2 SP
 *   1 → 2: costs 3 SP
 *   2 → 3: costs 4 SP
 *   3 → 4: costs 5 SP
 */
export function skillRaiseCost(toLevel: number): number {
  return toLevel + 1;
}

/**
 * Maximum skill level achievable at a given character level (p. character sheet).
 *   Level 1–2: max skill 1
 *   Level 3–5: max skill 2
 *   Level 6–8: max skill 3
 *   Level 9+:  max skill 4
 */
export function maxSkillLevel(charLevel: number): number {
  if (charLevel >= 9) return 4;
  if (charLevel >= 6) return 3;
  if (charLevel >= 3) return 2;
  return 1;
}

/**
 * Attribute boost costs — escalating per total boosts taken (p. character sheet).
 * 1st boost: 1 SP, 2nd: 2 SP, 3rd: 3 SP (req level 3), 4th: 4 SP (req level 6), 5th: 5 SP (req level 9).
 */
export const ATTR_BOOST_COSTS = [1, 2, 3, 4, 5];

export function attrBoostRequiredLevel(boostIndex: number): number {
  // 0-indexed: boost 0 & 1 require level 1, boost 2 requires level 3, etc.
  if (boostIndex <= 1) return 1;
  if (boostIndex === 2) return 3;
  if (boostIndex === 3) return 6;
  return 9;
}
