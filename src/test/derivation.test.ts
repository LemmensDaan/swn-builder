/**
 * Tests for the central derivation module — the layer that applies foci bonus skills,
 * psychic Effort, Ironhide AC and Die Hard HP on top of the raw creation skills.
 * These cover the bugs found in the rules audit.
 */
import { describe, it, expect } from 'vitest';
import { emptyCharacter } from '../types/character';
import type { Character } from '../types/character';
import {
  effectiveSkills, psychicSkillLevels, deriveEffort, deriveAC, dieHardBonus, focusBonusSkill,
  computeEncumbrance,
} from '../data/derivation';
import { BACKGROUNDS } from '../data/backgrounds';

function make(patch: Partial<Character>): Character {
  return { ...emptyCharacter(), ...patch };
}

// ── Foci bonus skills (Bug 2: foci never granted their bonus skill) ───────────

describe('effectiveSkills — foci bonus skills', () => {
  it('Gunslinger grants Shoot at level-0 when not already known', () => {
    const c = make({ skills: { Notice: 0 }, foci: [{ name: 'Gunslinger', level: 1 }] });
    const s = effectiveSkills(c);
    expect(s.Shoot).toBe(0);
    expect(s.Notice).toBe(0);
  });

  it('Gunslinger raises Shoot to level-1 if already at level-0', () => {
    const c = make({ skills: { Shoot: 0 }, foci: [{ name: 'Gunslinger', level: 1 }] });
    expect(effectiveSkills(c).Shoot).toBe(1);
  });

  it('Alert grants Notice', () => {
    const c = make({ skills: {}, foci: [{ name: 'Alert', level: 1 }] });
    expect(effectiveSkills(c).Notice).toBe(0);
  });

  it('Specialist grants the chosen skill', () => {
    const c = make({ skills: {}, foci: [{ name: 'Specialist', level: 1, specialistSkill: 'Fix' }] });
    expect(effectiveSkills(c).Fix).toBe(0);
  });

  it('two Specialists grant two different skills', () => {
    const c = make({
      skills: {},
      foci: [
        { name: 'Specialist', level: 1, specialistSkill: 'Fix' },
        { name: 'Specialist', level: 1, specialistSkill: 'Program' },
      ],
    });
    const s = effectiveSkills(c);
    expect(s.Fix).toBe(0);
    expect(s.Program).toBe(0);
  });

  it('level-up skill spends are layered in', () => {
    const c = make({
      skills: { Pilot: 0 },
      levelHistory: [{
        level: 2, hpRolled: 4, hpGained: 4, spTotal: 3,
        skillSpends: [{ skill: 'Pilot', from: 0, to: 1, cost: 2 }],
        attrBoosts: [], techniquesLearned: [],
      }],
    });
    expect(effectiveSkills(c).Pilot).toBe(1);
  });
});

describe('focusBonusSkill', () => {
  it('returns the fixed bonus skill for Gunslinger', () => {
    expect(focusBonusSkill({ name: 'Gunslinger', level: 1 })).toBe('Shoot');
  });
  it('returns the chosen skill for Specialist', () => {
    expect(focusBonusSkill({ name: 'Specialist', level: 1, specialistSkill: 'Know' })).toBe('Know');
  });
  it('returns null for foci with no bonus skill', () => {
    expect(focusBonusSkill({ name: 'Die Hard', level: 1 })).toBeNull();
  });
});

// ── Psychic Effort (Bug 3: Effort always returned 1 because psychic skills
//    were never written into char.skills) ────────────────────────────────────

describe('deriveEffort', () => {
  it('non-psychic with no powers → 1', () => {
    expect(deriveEffort(make({ class: 'Warrior' }))).toBe(1);
  });

  it('Psychic Telepathy-1 + WIS 14 → 1 + 1 + 1 = 3', () => {
    const c = make({
      class: 'Psychic',
      psychicDisciplines: ['Telepathy', 'Telepathy'], // picked twice → level-1
      attributes: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 14, CHA: 10 },
    });
    expect(deriveEffort(c)).toBe(3);
  });

  it('Psychic Telepathy-0 (two different disciplines) + no attr bonus → 1', () => {
    const c = make({
      class: 'Psychic',
      psychicDisciplines: ['Telepathy', 'Biopsionics'], // both level-0
    });
    expect(deriveEffort(c)).toBe(1); // 1 + 0 + 0
  });

  it('uses best of WIS/CON', () => {
    const c = make({
      class: 'Psychic',
      psychicDisciplines: ['Teleportation', 'Teleportation'], // level-1
      attributes: { STR: 10, DEX: 10, CON: 18, INT: 10, WIS: 7, CHA: 10 },
    });
    // 1 + 1 + max(CON+2, WIS-1) = 1 + 1 + 2 = 4
    expect(deriveEffort(c)).toBe(4);
  });

  it('Psychic Training focus adds +1 Effort', () => {
    const c = make({
      class: 'Psychic',
      psychicDisciplines: ['Biopsionics', 'Biopsionics'], // level-1
      foci: [{ name: 'Psychic Training', level: 1, specialistSkill: 'Metapsionics' }],
    });
    // base 1 + 1 (Bio-1) + 0 = 2, +1 Psychic Training = 3
    expect(deriveEffort(c)).toBe(3);
  });

  it('Wild Psychic Talent on a non-psychic → focus level', () => {
    const c1 = make({ class: 'Expert', foci: [{ name: 'Wild Psychic Talent', level: 1 }] });
    expect(deriveEffort(c1)).toBe(1);
    const c2 = make({ class: 'Expert', foci: [{ name: 'Wild Psychic Talent', level: 2 }] });
    expect(deriveEffort(c2)).toBe(2);
  });
});

describe('psychicSkillLevels', () => {
  it('discipline picked twice → level-1', () => {
    const c = make({ psychicDisciplines: ['Precognition', 'Precognition'] });
    expect(psychicSkillLevels(c).Precognition).toBe(1);
  });
  it('Psychic Training raises its chosen discipline', () => {
    const c = make({
      psychicDisciplines: ['Telepathy'], // level-0
      foci: [{ name: 'Psychic Training', level: 1, specialistSkill: 'Telepathy' }],
    });
    expect(psychicSkillLevels(c).Telepathy).toBe(1);
  });
});

// ── Passive focus effects (Bug: Ironhide AC and Die Hard HP not applied) ──────

describe('deriveAC — Ironhide', () => {
  it('Ironhide at level 1 gives innate AC 16 (+ DEX)', () => {
    const c = make({ level: 1, foci: [{ name: 'Ironhide', level: 1 }] });
    // 15 + ceil(1/2) = 16, + DEX 0
    expect(deriveAC(c).ac).toBe(16);
    expect(deriveAC(c).label).toBe('Ironhide');
  });

  it('Ironhide does not stack but takes the higher of armor vs innate', () => {
    const c = make({ level: 1, armor: [{ name: 'Woven Body Armor', ac: 15 }], foci: [{ name: 'Ironhide', level: 1 }] });
    expect(deriveAC(c).ac).toBe(16); // innate 16 beats armor 15
  });

  it('DEX modifier applies on top of Ironhide', () => {
    const c = make({ level: 1, attributes: { STR: 10, DEX: 14, CON: 10, INT: 10, WIS: 10, CHA: 10 }, foci: [{ name: 'Ironhide', level: 1 }] });
    expect(deriveAC(c).ac).toBe(17); // 16 + 1
  });

  it('plain armor + DEX with no Ironhide', () => {
    const c = make({ armor: [{ name: 'Armored Undersuit', ac: 13 }], attributes: { STR: 10, DEX: 14, CON: 10, INT: 10, WIS: 10, CHA: 10 } });
    expect(deriveAC(c).ac).toBe(14);
  });
});

describe('dieHardBonus', () => {
  it('Die Hard at level 1 → +2', () => {
    expect(dieHardBonus(make({ level: 1, foci: [{ name: 'Die Hard', level: 1 }] }))).toBe(2);
  });
  it('Die Hard at level 5 → +10', () => {
    expect(dieHardBonus(make({ level: 5, foci: [{ name: 'Die Hard', level: 1 }] }))).toBe(10);
  });
  it('no Die Hard → 0', () => {
    expect(dieHardBonus(make({ level: 5 }))).toBe(0);
  });
});

// ── Leveling: psychic advancement & level-up foci (p.61) ──────────────────────

describe('level-up psychic advancement', () => {
  it('a psychic-skill spend recorded in levelHistory raises the discipline level', () => {
    const c = make({
      class: 'Psychic',
      psychicDisciplines: ['Telepathy'], // level-0 at creation
      levelHistory: [{
        level: 2, hpRolled: 4, hpGained: 4, spTotal: 3,
        skillSpends: [{ skill: 'Telepathy', from: 0, to: 1, cost: 2 }],
        attrBoosts: [], techniquesLearned: [],
      }],
    });
    expect(psychicSkillLevels(c).Telepathy).toBe(1);
  });

  it('Effort rises after a level-up psychic raise', () => {
    const before = make({ class: 'Psychic', psychicDisciplines: ['Telepathy'] }); // Tele-0 → effort 1
    expect(deriveEffort(before)).toBe(1);
    const after = make({
      class: 'Psychic',
      psychicDisciplines: ['Telepathy'],
      levelHistory: [{
        level: 2, hpRolled: 4, hpGained: 4, spTotal: 3,
        skillSpends: [{ skill: 'Telepathy', from: 0, to: 1, cost: 2 }],
        attrBoosts: [], techniquesLearned: [],
      }],
    });
    expect(deriveEffort(after)).toBe(2); // 1 + 1 + 0
  });
});

describe('level-up focus bonus skill (3 SP rule)', () => {
  it('a focus taken at creation grants a new bonus skill at level-0', () => {
    const c = make({ skills: {}, foci: [{ name: 'Gunslinger', level: 1 }] });
    expect(effectiveSkills(c).Shoot).toBe(0);
  });

  it('a focus taken via level-up grants a brand-new bonus skill at level-1', () => {
    const c = make({
      level: 2,
      skills: {},
      foci: [{ name: 'Gunslinger', level: 1 }],
      levelHistory: [{
        level: 2, hpRolled: 4, hpGained: 4, spTotal: 3,
        skillSpends: [], attrBoosts: [], techniquesLearned: [],
        focusPicked: { name: 'Gunslinger', level: 1 },
      }],
    });
    expect(effectiveSkills(c).Shoot).toBe(1);
  });
});

// ── Encumbrance (p.65) ────────────────────────────────────────────────────────

describe('computeEncumbrance', () => {
  it('STR 13 → readiedMax 6 (13÷2 floored), stowedMax 13', () => {
    const e = computeEncumbrance(make({ attributes: { STR: 13, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } }));
    expect(e.readiedMax).toBe(6);
    expect(e.stowedMax).toBe(13);
  });

  it('unencumbered when within limits → move 10', () => {
    const e = computeEncumbrance(make({
      attributes: { STR: 14, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      armor: [{ name: 'Woven Body Armor', ac: 15 }], // Enc 2
      weapons: [{ name: 'Combat Rifle', damage: '1d12*', attackBonus: 0 }], // Enc 2
    }));
    expect(e.readied).toBe(4); // 2 + 2
    expect(e.level).toBe('none');
    expect(e.move).toBe(10);
  });

  it('1 over readied limit → Lightly Encumbered (move 7)', () => {
    // STR 4 → readiedMax 2. Two rifles (2 enc each) = 4 readied, 2 over → tier ceil(2/2)=1
    const e = computeEncumbrance(make({
      attributes: { STR: 4, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      weapons: [
        { name: 'Combat Rifle', damage: '1d12*', attackBonus: 0 },
        { name: 'Laser Rifle', damage: '1d10*', attackBonus: 0 },
      ],
    }));
    expect(e.readiedMax).toBe(2);
    expect(e.readied).toBe(4);
    expect(e.level).toBe('light');
    expect(e.move).toBe(7);
  });

  it('negligible "*" items add no stowed encumbrance', () => {
    const e = computeEncumbrance(make({
      attributes: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      equipment: ['Compad', 'Glowbug'], // both enc 0
    }));
    expect(e.stowed).toBe(0);
    expect(e.level).toBe('none');
  });

  it('stow/equip: armor marked readied:false counts as Stowed', () => {
    const base = make({
      attributes: { STR: 14, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      armor: [{ name: 'Woven Body Armor', ac: 15 }], // Enc 2, default Readied
    });
    expect(computeEncumbrance(base).readied).toBe(2);
    expect(computeEncumbrance(base).stowed).toBe(0);

    const stowed = make({
      attributes: { STR: 14, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      armor: [{ name: 'Woven Body Armor', ac: 15, readied: false }],
    });
    expect(computeEncumbrance(stowed).readied).toBe(0);
    expect(computeEncumbrance(stowed).stowed).toBe(2);
  });

  it('stow/equip: a general item in equipmentReadied counts as Readied', () => {
    const e = computeEncumbrance(make({
      attributes: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      equipment: ['Medkit'], // Enc 2, default Stowed
      equipmentReadied: ['Medkit'],
    }));
    expect(e.readied).toBe(2);
    expect(e.stowed).toBe(0);
  });
});

// ── Quick Skills fix (Bug 1): the free skill must NOT be double-counted ───────
// In quick mode the Quick Skills list already INCLUDES the free skill, so the
// final result must have the free skill at level-0, not level-1 (p.9, p.30).

describe('Quick Skills — free skill stays level-0', () => {
  // Mirrors the corrected buildSkills logic in Step4 (quick mode: iterate the quick
  // list once, do NOT add the free skill separately).
  function quickSkills(bgName: string): Record<string, number> {
    const bg = BACKGROUNDS.find(b => b.name === bgName)!;
    const s: Record<string, number> = {};
    const add = (sk: string) => {
      const cur = s[sk] ?? -1;
      if (cur < 0) s[sk] = 0; else if (cur === 0) s[sk] = 1;
    };
    bg.quickSkills.forEach(qs => { if (qs !== 'Any Combat') add(qs); });
    return s;
  }

  it('Barbarian: Survive is level-0 (not 1)', () => {
    expect(quickSkills('Barbarian').Survive).toBe(0);
  });
  it('Clergy: Talk is level-0', () => {
    expect(quickSkills('Clergy').Talk).toBe(0);
  });
  it('Worker: Work is level-0', () => {
    expect(quickSkills('Worker').Work).toBe(0);
  });

  it('every background: no quick skill exceeds level-0 (no internal duplicates)', () => {
    for (const bg of BACKGROUNDS) {
      const s = quickSkills(bg.name);
      for (const [skill, lvl] of Object.entries(s)) {
        expect(lvl, `${bg.name}: ${skill}`).toBe(0);
      }
    }
  });
});
