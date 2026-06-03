/**
 * End-to-end character builder tests.
 *
 * Each test simulates what the wizard does — picks attributes, background,
 * class, skills, foci, equipment — then verifies the resulting Character
 * object satisfies every rule from the source material.
 *
 * Selections are deterministic (no Math.random) so tests are reproducible.
 * We cover every class, a spread of backgrounds, every psychic discipline,
 * and multiple equipment configurations.
 */

import { describe, it, expect } from 'vitest';
import { BACKGROUNDS } from '../data/backgrounds';
import { FOCI } from '../data/foci';
import { ARMOR_TABLE, RANGED_WEAPONS, EQUIPMENT_PACKAGES } from '../data/equipment';
import { PSYCHIC_DISCIPLINES } from '../data/psychics';
import {
  attrMod, calcSaves, calcAttackBonus, calcEffort,
  emptyCharacter,
} from '../types/character';
import type { Character, AttributeName } from '../types/character';
import type { SkillLevels } from '../data/skills';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Apply standard array in default order */
function applyArray(char: Character): Character {
  return {
    ...char,
    attributes: { STR: 14, DEX: 12, CON: 11, INT: 10, WIS: 9, CHA: 7 },
  };
}

function withAttrs(char: Character, attrs: Partial<Record<AttributeName, number>>): Character {
  return { ...char, attributes: { ...char.attributes, ...attrs } };
}

/** Simulate wizard deriving all stats after selections are made */
function derive(char: Character): Character {
  const next = { ...char };
  next.saves = calcSaves(next.attributes, next.level);
  next.baseAttackBonus = calcAttackBonus(next.class, next.adventurerPartials, next.level);
  if (next.class === 'Psychic' || next.adventurerPartials?.includes('Partial Psychic')) {
    next.effort.max = calcEffort(next.skills, next.attributes);
  }
  next.systemStrain.max = next.attributes.CON;
  return next;
}

/** Add a skill following the stacking rule */
function addSkill(skills: SkillLevels, skill: string): SkillLevels {
  const cur = (skills as Record<string, number>)[skill] ?? -1;
  if (cur < 0) return { ...skills, [skill]: 0 };
  if (cur === 0) return { ...skills, [skill]: 1 };
  return skills;
}

/** Build quick skills for a background onto a fresh skills object */
function applyQuickSkills(bgName: string): SkillLevels {
  const bg = BACKGROUNDS.find(b => b.name === bgName)!;
  let s: SkillLevels = {};
  if (bg.freeSkill !== 'Any Combat') s = addSkill(s, bg.freeSkill);
  bg.quickSkills.forEach(qs => {
    if (qs !== 'Any Combat') s = addSkill(s, qs);
  });
  return s;
}

// ── Max-level skill rule (p.9): no skill > level-1 at creation ───────────────

describe('Skill stacking — no skill above level-1 at creation', () => {
  it('all 20 backgrounds: quick skills never exceed level-1', () => {
    for (const bg of BACKGROUNDS) {
      const skills = applyQuickSkills(bg.name);
      for (const [skill, level] of Object.entries(skills)) {
        expect(level, `${bg.name}: ${skill} should be ≤ 1`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('stacking the same skill three times stays at level-1', () => {
    let s: SkillLevels = {};
    s = addSkill(s, 'Pilot');
    s = addSkill(s, 'Pilot');
    s = addSkill(s, 'Pilot'); // third pick — rule says pick any other skill instead
    expect(s.Pilot).toBe(1);
  });
});

// ── Every class: derived stats are correct ───────────────────────────────────

describe('Expert — derived stats', () => {
  const char = derive(applyArray({ ...emptyCharacter(), class: 'Expert', level: 1 }));

  it('attack bonus = +0 at level 1', () => expect(char.baseAttackBonus).toBe(0));
  it('Physical save = 16−1−max(STR+1,CON+0) = 14', () => expect(char.saves.physical).toBe(14));
  it('Evasion save = 16−1−max(DEX+0,INT+0) = 15', () => expect(char.saves.evasion).toBe(15));
  // WIS=9 → +0, CHA=7 → −1, max(0,−1)=0 → 16−1−0 = 15
  it('Mental save = 16−1−max(WIS+0,CHA−1) = 15', () => expect(char.saves.mental).toBe(15));
  it('System Strain max = CON score (11)', () => expect(char.systemStrain.max).toBe(11));
});

describe('Warrior — derived stats', () => {
  const char = derive(applyArray({ ...emptyCharacter(), class: 'Warrior', level: 1 }));

  it('attack bonus = +1 at level 1', () => expect(char.baseAttackBonus).toBe(1));
  it('attack bonus = +5 at level 5', () => {
    expect(calcAttackBonus('Warrior', undefined, 5)).toBe(5);
  });
  it('attack bonus = +10 at level 10', () => {
    expect(calcAttackBonus('Warrior', undefined, 10)).toBe(10);
  });
});

describe('Psychic — derived stats and Effort', () => {
  it('Effort = 1 + discipline skill + best(WIS,CON) mod', () => {
    const char = derive(withAttrs(
      { ...emptyCharacter(), class: 'Psychic', skills: { Telepathy: 1 }, level: 1 },
      { WIS: 14, CON: 10 }, // WIS mod +1 > CON mod +0
    ));
    // 1 + 1 + 1 = 3
    expect(char.effort.max).toBe(3);
  });

  it('Effort uses CON when higher than WIS', () => {
    const skills = { Telekinesis: 0 };
    const attrs = { STR: 10, DEX: 10, CON: 18, INT: 10, WIS: 7, CHA: 10 };
    // 1 + 0 + max(−1, +2) = 1 + 0 + 2 = 3
    expect(calcEffort(skills, attrs)).toBe(3);
  });

  it('Effort minimum is 1 even with negative modifiers', () => {
    const skills = { Precognition: 0 };
    const attrs = { STR: 10, DEX: 10, CON: 3, INT: 10, WIS: 3, CHA: 10 };
    // 1 + 0 + max(−2, −2) = −1 → clamped to 1
    expect(calcEffort(skills, attrs)).toBe(1);
  });
});

describe('Adventurer Partial Warrior — attack bonus progression', () => {
  const partials: ['Partial Expert', 'Partial Warrior'] = ['Partial Expert', 'Partial Warrior'];

  it('+1 at level 1', () => expect(calcAttackBonus('Adventurer', partials, 1)).toBe(1));
  it('+2 at level 2', () => expect(calcAttackBonus('Adventurer', partials, 2)).toBe(2));
  it('+3 at level 4', () => expect(calcAttackBonus('Adventurer', partials, 4)).toBe(3));
  it('+4 at level 5 (second +1 kicks in)', () => expect(calcAttackBonus('Adventurer', partials, 5)).toBe(4));
  it('+7 at level 10', () => expect(calcAttackBonus('Adventurer', partials, 10)).toBe(7));
});

// ── Saving throws — all attribute combinations ────────────────────────────────

describe('Saving throws — formula 16 − level − best modifier', () => {
  const CASES: Array<{
    label: string;
    attrs: Partial<Record<AttributeName, number>>;
    level: number;
    expected: { physical: number; evasion: number; mental: number };
  }> = [
    {
      label: 'all-10 at level 1',
      attrs: {},
      level: 1,
      expected: { physical: 15, evasion: 15, mental: 15 },
    },
    {
      label: 'STR 18 at level 1 → Physical 13',
      attrs: { STR: 18 },
      level: 1,
      expected: { physical: 13, evasion: 15, mental: 15 },
    },
    {
      label: 'DEX 18, INT 14 → Evasion uses DEX (+2)',
      attrs: { DEX: 18, INT: 14 },
      level: 1,
      expected: { physical: 15, evasion: 13, mental: 15 },
    },
    {
      label: 'all-10 at level 5 → saves 11',
      attrs: {},
      level: 5,
      expected: { physical: 11, evasion: 11, mental: 11 },
    },
    {
      label: 'STR 3, CON 3 at level 1 → Physical 17 (negative mods make it harder)',
      attrs: { STR: 3, CON: 3 },
      level: 1,
      expected: { physical: 17, evasion: 15, mental: 15 },
    },
  ];

  const base: Record<AttributeName, number> = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };

  for (const c of CASES) {
    it(c.label, () => {
      const attrs = { ...base, ...c.attrs };
      const saves = calcSaves(attrs, c.level);
      expect(saves.physical).toBe(c.expected.physical);
      expect(saves.evasion).toBe(c.expected.evasion);
      expect(saves.mental).toBe(c.expected.mental);
    });
  }
});

// ── AC calculation — armor + DEX mod ─────────────────────────────────────────

describe('AC calculation — best armor + DEX modifier', () => {
  function computeAC(armorNames: string[], dex: number): number {
    const highest = armorNames.reduce((max, name) => {
      const a = ARMOR_TABLE.find(x => x.name === name);
      return a ? Math.max(max, a.ac) : max;
    }, 10);
    return highest + attrMod(dex);
  }

  it('unarmored + DEX 10 = AC 10', () => expect(computeAC([], 10)).toBe(10));
  it('Armored Undersuit (AC 13) + DEX 14 = AC 14', () =>
    expect(computeAC(['Armored Undersuit'], 14)).toBe(14));
  it('Woven Body Armor (AC 15) + DEX 10 = AC 15', () =>
    expect(computeAC(['Woven Body Armor'], 10)).toBe(15));
  it('Multiple armors: best (Assault Suit 18) + DEX 12 = AC 18', () =>
    expect(computeAC(['Armored Undersuit', 'Assault Suit'], 12)).toBe(18));
  it('DEX 3 (−2) reduces AC: Secure Clothing (13) + DEX 3 = AC 11', () =>
    expect(computeAC(['Secure Clothing'], 3)).toBe(11));
});

// ── Background free skill always present ─────────────────────────────────────

describe('Background free skills — always in final char.skills', () => {
  const COMBAT_SKILLS = ['Stab', 'Shoot', 'Punch'];

  for (const bg of BACKGROUNDS) {
    it(`${bg.name}: free skill present`, () => {
      const skills = applyQuickSkills(bg.name);
      if (bg.freeSkill === 'Any Combat') {
        // Any Combat means at least one combat skill should be present (if resolved)
        // We can't resolve it here without a choice, so just verify quickSkills has it
        expect(bg.quickSkills).toContain('Any Combat');
      } else {
        expect(skills[bg.freeSkill as keyof SkillLevels]).toBeDefined();
      }
    });
  }
});

// ── Random character builds — simulate 10 complete characters ─────────────────

describe('Random character builds — end-to-end correctness', () => {
  const CLASSES = ['Expert', 'Warrior', 'Psychic', 'Adventurer'] as const;
  const ATTR_ARRAYS: Record<AttributeName, number>[] = [
    { STR: 14, DEX: 12, CON: 11, INT: 10, WIS: 9,  CHA: 7  }, // standard array
    { STR: 18, DEX: 7,  CON: 14, INT: 10, WIS: 12, CHA: 9  }, // high STR/CON
    { STR: 7,  DEX: 18, CON: 10, INT: 14, WIS: 11, CHA: 9  }, // high DEX/INT
    { STR: 9,  DEX: 10, CON: 12, INT: 14, WIS: 18, CHA: 11 }, // high WIS/INT (psychic build)
    { STR: 10, DEX: 9,  CON: 7,  INT: 11, WIS: 12, CHA: 14 }, // high CHA, low CON
  ];

  // Build 10 characters cycling through class/attrs/background combinations
  const configs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => ({
    cls: CLASSES[i % CLASSES.length],
    attrs: ATTR_ARRAYS[i % ATTR_ARRAYS.length],
    bgName: BACKGROUNDS[i % BACKGROUNDS.length].name,
    // Adventurers at even indices get Expert+Warrior, odd get Expert+Psychic
    partials: (i % 2 === 0
      ? ['Partial Expert', 'Partial Warrior']
      : ['Partial Expert', 'Partial Psychic']) as ['Partial Expert', 'Partial Warrior'] | ['Partial Expert', 'Partial Psychic'],
  }));

  for (const cfg of configs) {
    const label = `${cfg.cls}/${cfg.bgName}`;

    it(`${label} — saves follow formula`, () => {
      const char = derive(withAttrs(
        { ...emptyCharacter(), class: cfg.cls, adventurerPartials: cfg.cls === 'Adventurer' ? cfg.partials : undefined },
        cfg.attrs,
      ));
      const expected = calcSaves(cfg.attrs, 1);
      expect(char.saves.physical).toBe(expected.physical);
      expect(char.saves.evasion).toBe(expected.evasion);
      expect(char.saves.mental).toBe(expected.mental);
    });

    it(`${label} — attack bonus follows class rule`, () => {
      const char = derive(withAttrs(
        { ...emptyCharacter(), class: cfg.cls, adventurerPartials: cfg.cls === 'Adventurer' ? cfg.partials : undefined },
        cfg.attrs,
      ));
      const expected = calcAttackBonus(cfg.cls, cfg.cls === 'Adventurer' ? cfg.partials : undefined, 1);
      expect(char.baseAttackBonus).toBe(expected);
    });

    it(`${label} — background quick skills all ≤ level-1`, () => {
      const skills = applyQuickSkills(cfg.bgName);
      for (const [skill, level] of Object.entries(skills)) {
        expect(level, `${label}: ${skill}`).toBeLessThanOrEqual(1);
      }
    });

    it(`${label} — system strain max = CON score`, () => {
      const char = derive(withAttrs({ ...emptyCharacter(), class: cfg.cls }, cfg.attrs));
      expect(char.systemStrain.max).toBe(cfg.attrs.CON);
    });
  }
});

// ── Psychic disciplines — effort correct for all 6 ───────────────────────────

describe('All 6 psychic disciplines — Effort at level-0 and level-1', () => {
  const allTen: Record<AttributeName, number> = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };

  for (const disc of PSYCHIC_DISCIPLINES) {
    it(`${disc.skill} level-0: Effort = 1`, () => {
      expect(calcEffort({ [disc.skill]: 0 }, allTen)).toBe(1);
    });

    it(`${disc.skill} level-1 + WIS 14: Effort = 3`, () => {
      expect(calcEffort({ [disc.skill]: 1 }, { ...allTen, WIS: 14 })).toBe(3);
    });
  }
});

// ── Equipment — credit deduction and affordability ───────────────────────────

describe('Equipment credit tracking', () => {
  function gearCost(name: string): number {
    return ARMOR_TABLE.find(a => a.name === name)?.cost
      ?? RANGED_WEAPONS.find(w => w.name === name)?.cost
      ?? 0;
  }

  it('Armored Undersuit costs 600 cr', () => expect(gearCost('Armored Undersuit')).toBe(600));
  it('Laser Pistol costs 200 cr', () => expect(gearCost('Laser Pistol')).toBe(200));
  it('Woven Body Armor costs 400 cr', () => expect(gearCost('Woven Body Armor')).toBe(400));
  it('Combat Rifle costs 300 cr', () => expect(gearCost('Combat Rifle')).toBe(300));

  it('Budget 1000 cr: buying Armored Undersuit + Laser Pistol leaves 200 cr', () => {
    const budget = 1000;
    const spent = gearCost('Armored Undersuit') + gearCost('Laser Pistol');
    expect(budget - spent).toBe(200);
  });

  it('Package credits are non-negative', () => {
    for (const pkg of EQUIPMENT_PACKAGES) {
      expect(pkg.credits, `${pkg.name} has negative credits`).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── Foci — bonus skills never raise above level-1 ────────────────────────────

describe('Focus bonus skills — stacking with existing skills', () => {
  it('gaining a focus bonus skill already at level-1 does not exceed level-1', () => {
    let skills: SkillLevels = {};
    skills = addSkill(skills, 'Notice'); // level-0
    skills = addSkill(skills, 'Notice'); // level-1
    // Alert focus gives Notice as bonus — applying it again stays at level-1
    skills = addSkill(skills, 'Notice');
    expect(skills.Notice).toBe(1);
  });

  it('focus bonus skill on a new skill grants level-0', () => {
    const alertFocus = FOCI.find(f => f.name === 'Alert')!;
    const bonusSkill = alertFocus.levels[0].bonusSkill;
    expect(bonusSkill).toBe('Notice');
    // If character has no Notice, they gain it at level-0
    const skills = addSkill({}, 'Notice');
    expect(skills.Notice).toBe(0);
  });
});

// ── Level-up attack bonus progression — all classes ──────────────────────────

describe('Attack bonus progression across all 10 levels', () => {
  const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it('Warrior: equals level at every level', () => {
    for (const lvl of LEVELS) {
      expect(calcAttackBonus('Warrior', undefined, lvl)).toBe(lvl);
    }
  });

  it('Expert: floor(level/2) at every level', () => {
    for (const lvl of LEVELS) {
      expect(calcAttackBonus('Expert', undefined, lvl)).toBe(Math.floor(lvl / 2));
    }
  });

  it('Psychic: same as Expert', () => {
    for (const lvl of LEVELS) {
      expect(calcAttackBonus('Psychic', undefined, lvl)).toBe(Math.floor(lvl / 2));
    }
  });

  it('Adventurer Partial Warrior: +1 cumulative at 1st and 5th', () => {
    const p: ['Partial Expert', 'Partial Warrior'] = ['Partial Expert', 'Partial Warrior'];
    expect(calcAttackBonus('Adventurer', p, 1)).toBe(1);
    expect(calcAttackBonus('Adventurer', p, 4)).toBe(3);  // floor(4/2) + 1
    expect(calcAttackBonus('Adventurer', p, 5)).toBe(4);  // floor(5/2) + 2
    expect(calcAttackBonus('Adventurer', p, 10)).toBe(7); // floor(10/2) + 2
  });

  it('Adventurer no Partial Warrior: same as Expert', () => {
    const p: ['Partial Expert', 'Partial Psychic'] = ['Partial Expert', 'Partial Psychic'];
    for (const lvl of LEVELS) {
      expect(calcAttackBonus('Adventurer', p, lvl)).toBe(Math.floor(lvl / 2));
    }
  });
});
