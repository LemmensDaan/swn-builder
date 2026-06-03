/**
 * Tests for background data integrity and skill stacking rules.
 */
import { describe, it, expect } from 'vitest';
import { BACKGROUNDS } from '../data/backgrounds';

// All 20 backgrounds are defined (p.9 table)
describe('BACKGROUNDS data', () => {
  it('has exactly 20 backgrounds', () => {
    expect(BACKGROUNDS).toHaveLength(20);
  });

  it('every background has a name, freeSkill, quickSkills (3), growth (6), learning (8)', () => {
    for (const bg of BACKGROUNDS) {
      expect(bg.name, `${bg.name}: missing name`).toBeTruthy();
      expect(bg.freeSkill, `${bg.name}: missing freeSkill`).toBeTruthy();
      expect(bg.quickSkills, `${bg.name}: missing quickSkills`).toHaveLength(3);
      expect(bg.growth, `${bg.name}: growth must have 6 entries`).toHaveLength(6);
      expect(bg.learning, `${bg.name}: learning must have 8 entries`).toHaveLength(8);
    }
  });

  it('background names match the official list (p.9)', () => {
    const expectedNames = [
      'Barbarian', 'Clergy', 'Courtesan', 'Criminal', 'Dilettante',
      'Entertainer', 'Merchant', 'Noble', 'Official', 'Peasant',
      'Physician', 'Pilot', 'Politician', 'Scholar', 'Soldier',
      'Spacer', 'Technician', 'Thug', 'Vagabond', 'Worker',
    ];
    const actualNames = BACKGROUNDS.map(b => b.name);
    expect(actualNames.sort()).toEqual(expectedNames.sort());
  });

  it('Barbarian free skill is Survive, quick skills include Survive + Notice + Any Combat', () => {
    const bg = BACKGROUNDS.find(b => b.name === 'Barbarian')!;
    expect(bg.freeSkill).toBe('Survive');
    expect(bg.quickSkills).toContain('Survive');
    expect(bg.quickSkills).toContain('Notice');
    expect(bg.quickSkills).toContain('Any Combat');
  });

  it('Soldier free skill is Any Combat (p.14)', () => {
    const bg = BACKGROUNDS.find(b => b.name === 'Soldier')!;
    expect(bg.freeSkill).toBe('Any Combat');
  });

  it('Thug free skill is Any Combat (p.15)', () => {
    const bg = BACKGROUNDS.find(b => b.name === 'Thug')!;
    expect(bg.freeSkill).toBe('Any Combat');
  });
});

// Skill stacking rule (p.9): first time → level-0, second time → level-1, can't exceed level-1 at creation
describe('skill stacking rule', () => {
  function addSkill(skills: Record<string, number>, skill: string): Record<string, number> {
    const cur = skills[skill] ?? -1;
    if (cur < 0) return { ...skills, [skill]: 0 };
    if (cur === 0) return { ...skills, [skill]: 1 };
    return skills;
  }

  it('new skill starts at level-0', () => {
    const s = addSkill({}, 'Pilot');
    expect(s.Pilot).toBe(0);
  });

  it('second pick raises to level-1', () => {
    let s = addSkill({}, 'Pilot');
    s = addSkill(s, 'Pilot');
    expect(s.Pilot).toBe(1);
  });

  it('third pick does not raise beyond level-1 (caller must handle "pick any")', () => {
    let s = addSkill({}, 'Pilot');
    s = addSkill(s, 'Pilot');
    s = addSkill(s, 'Pilot');
    expect(s.Pilot).toBe(1);
  });

  it('free skill + same in quick skills → level-1', () => {
    // Barbarian free skill is Survive; quick skills also include Survive
    let s: Record<string, number> = {};
    s = addSkill(s, 'Survive'); // free skill
    // applying quick skills: Survive, Notice, combat
    s = addSkill(s, 'Survive'); // second pick → level-1
    s = addSkill(s, 'Notice');
    expect(s.Survive).toBe(1);
    expect(s.Notice).toBe(0);
  });
});
