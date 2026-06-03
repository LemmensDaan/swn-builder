/**
 * Unit tests for all character derived-stat calculations.
 * Each formula is verified against the SWN Revised Deluxe source text.
 */
import { describe, it, expect } from 'vitest';
import {
  attrMod,
  calcSaves,
  calcAttackBonus,
  calcEffort,
} from '../types/character';
import type { AttributeName } from '../types/character';

// ── Attribute Modifiers (p.6) ─────────────────────────────────────────────────
// "A score of 3 is a -2, 4—7 is a -1, 8—13 is no modifier, 14—17 is +1, and 18 is +2."

describe('attrMod', () => {
  it('3  → -2', () => expect(attrMod(3)).toBe(-2));
  it('4  → -1', () => expect(attrMod(4)).toBe(-1));
  it('7  → -1', () => expect(attrMod(7)).toBe(-1));
  it('8  → 0',  () => expect(attrMod(8)).toBe(0));
  it('13 → 0',  () => expect(attrMod(13)).toBe(0));
  it('14 → +1', () => expect(attrMod(14)).toBe(1));
  it('17 → +1', () => expect(attrMod(17)).toBe(1));
  it('18 → +2', () => expect(attrMod(18)).toBe(2));
});

// ── Saving Throws (p.9 step 17, character sheet formula: 16 − level − modifier) ─
// "Physical saves … are 15 minus the best of your Strength or Constitution modifiers."
//  At level 1: 16 − 1 − mod = 15 − mod  ✓

const allTen: Record<AttributeName, number> = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };

describe('calcSaves at level 1', () => {
  it('all-10 attrs → saves all 15', () => {
    const saves = calcSaves(allTen, 1);
    expect(saves.physical).toBe(15);
    expect(saves.evasion).toBe(15);
    expect(saves.mental).toBe(15);
  });

  it('STR 18 improves Physical (16−1−2=13)', () => {
    const saves = calcSaves({ ...allTen, STR: 18 }, 1);
    expect(saves.physical).toBe(13);
  });

  it('CON 14 improves Physical (16−1−1=14)', () => {
    const saves = calcSaves({ ...allTen, CON: 14 }, 1);
    expect(saves.physical).toBe(14);
  });

  it('uses best of STR/CON for Physical', () => {
    // STR 14(+1) vs CON 18(+2) — should use CON
    const saves = calcSaves({ ...allTen, STR: 14, CON: 18 }, 1);
    expect(saves.physical).toBe(13); // 16−1−2
  });

  it('DEX 18 improves Evasion (16−1−2=13)', () => {
    const saves = calcSaves({ ...allTen, DEX: 18 }, 1);
    expect(saves.evasion).toBe(13);
  });

  it('uses best of DEX/INT for Evasion', () => {
    const saves = calcSaves({ ...allTen, DEX: 14, INT: 18 }, 1);
    expect(saves.evasion).toBe(13); // 16−1−2
  });

  it('WIS 18 improves Mental (16−1−2=13)', () => {
    const saves = calcSaves({ ...allTen, WIS: 18 }, 1);
    expect(saves.mental).toBe(13);
  });

  it('uses best of WIS/CHA for Mental', () => {
    const saves = calcSaves({ ...allTen, WIS: 7, CHA: 14 }, 1);
    expect(saves.mental).toBe(14); // 16−1−1
  });

  it('negative mods raise save value (harder to succeed)', () => {
    // STR 3(−2), CON 3(−2) → Physical = 16−1−(−2) = 17
    const saves = calcSaves({ ...allTen, STR: 3, CON: 3 }, 1);
    expect(saves.physical).toBe(17);
  });
});

describe('calcSaves at higher levels', () => {
  it('level 5 all-10 → saves all 11 (16−5−0)', () => {
    const saves = calcSaves(allTen, 5);
    expect(saves.physical).toBe(11);
    expect(saves.evasion).toBe(11);
    expect(saves.mental).toBe(11);
  });

  it('level 10 all-10 → saves all 6', () => {
    const saves = calcSaves(allTen, 10);
    expect(saves.physical).toBe(6);
  });
});

// ── Attack Bonus (p.17–18) ────────────────────────────────────────────────────
// Warrior: equal to level
// Expert/Psychic: half level rounded down
// Partial Warrior Adventurer: half level + 1 at 1st, +1 more at 5th

describe('calcAttackBonus', () => {
  it('Warrior level 1 → +1', () => expect(calcAttackBonus('Warrior', undefined, 1)).toBe(1));
  it('Warrior level 5 → +5', () => expect(calcAttackBonus('Warrior', undefined, 5)).toBe(5));
  it('Warrior level 10 → +10', () => expect(calcAttackBonus('Warrior', undefined, 10)).toBe(10));

  it('Expert level 1 → +0', () => expect(calcAttackBonus('Expert', undefined, 1)).toBe(0));
  it('Expert level 2 → +1', () => expect(calcAttackBonus('Expert', undefined, 2)).toBe(1));
  it('Expert level 3 → +1', () => expect(calcAttackBonus('Expert', undefined, 3)).toBe(1));
  it('Expert level 10 → +5', () => expect(calcAttackBonus('Expert', undefined, 10)).toBe(5));

  it('Psychic level 1 → +0', () => expect(calcAttackBonus('Psychic', undefined, 1)).toBe(0));

  it('Adventurer (no partials) level 1 → +0', () =>
    expect(calcAttackBonus('Adventurer', undefined, 1)).toBe(0));

  it('Adventurer Partial Warrior level 1 → +1', () =>
    expect(calcAttackBonus('Adventurer', ['Partial Expert', 'Partial Warrior'], 1)).toBe(1));

  it('Adventurer Partial Warrior level 4 → +3 (floor(4/2)+1)', () =>
    expect(calcAttackBonus('Adventurer', ['Partial Expert', 'Partial Warrior'], 4)).toBe(3));

  it('Adventurer Partial Warrior level 5 → +4 (floor(5/2)+1+1)', () =>
    expect(calcAttackBonus('Adventurer', ['Partial Expert', 'Partial Warrior'], 5)).toBe(4));

  it('Adventurer no Partial Warrior level 5 → +2', () =>
    expect(calcAttackBonus('Adventurer', ['Partial Expert', 'Partial Psychic'], 5)).toBe(2));
});

// ── Psychic Effort (p.21) ─────────────────────────────────────────────────────
// "Maximum Effort = 1 + highest psychic skill + best of Wisdom or Constitution modifiers, minimum 1"

describe('calcEffort', () => {
  it('no psychic skills, no bonuses → 1 (minimum)', () => {
    expect(calcEffort({}, allTen)).toBe(1);
  });

  it('Telekinesis-0, no attr bonus → 1 + 0 + 0 = 1', () => {
    expect(calcEffort({ Telekinesis: 0 }, allTen)).toBe(1);
  });

  it('Telepathy-1, no attr bonus → 1 + 1 + 0 = 2', () => {
    expect(calcEffort({ Telepathy: 1 }, allTen)).toBe(2);
  });

  it('Biopsionics-2, WIS 14(+1) → 1 + 2 + 1 = 4', () => {
    expect(calcEffort({ Biopsionics: 2 }, { ...allTen, WIS: 14 })).toBe(4);
  });

  it('uses highest psychic skill when multiple', () => {
    // Biopsionics-1, Telepathy-3 → use 3
    expect(calcEffort({ Biopsionics: 1, Telepathy: 3 }, allTen)).toBe(4);
  });

  it('uses best of WIS vs CON', () => {
    // CON 18(+2) > WIS 10(+0) → use CON
    expect(calcEffort({ Teleportation: 1 }, { ...allTen, CON: 18 })).toBe(4);
  });

  it('negative attr mod still clamped to minimum 1', () => {
    // Skill 0, WIS 3(−2) → 1 + 0 + (−2) = −1 → clamped to 1
    expect(calcEffort({ Precognition: 0 }, { ...allTen, WIS: 3, CON: 3 })).toBe(1);
  });
});
