import type { SkillLevels, Skill } from '../data/skills';

export type AttributeName = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export type ClassName = 'Expert' | 'Psychic' | 'Warrior' | 'Adventurer';

export type AdventurerPartial = 'Partial Expert' | 'Partial Psychic' | 'Partial Warrior';

export interface FocusSelection {
  name: string;
  level: 1 | 2;
  specialistSkill?: Skill;
}

export interface PsychicTechniqueSelection {
  discipline: string;
  techniqueName: string;
}

export interface WeaponEntry {
  name: string;
  damage: string;
  range?: string;
  attackBonus: number;
  shock?: string;
  notes?: string;
}

export interface ArmorEntry {
  name: string;
  ac: number;
}

export interface Character {
  id: string;
  name: string;
  level: number;
  xp: number;
  homeworld: string;
  species: string;
  goal: string;
  background: string;

  attributes: Record<AttributeName, number>;

  class: ClassName;
  adventurerPartials?: AdventurerPartial[];

  skills: SkillLevels;

  foci: FocusSelection[];

  psychicDisciplines: string[];
  psychicTechniques: PsychicTechniqueSelection[];
  effort: { max: number; committed: number };

  hitPoints: { current: number; max: number };
  systemStrain: { current: number; max: number };

  baseAttackBonus: number;
  saves: { physical: number; evasion: number; mental: number };

  armor: ArmorEntry[];
  weapons: WeaponEntry[];
  equipment: string[];
  credits: number;
  debts: number;

  notes: string;
}

export function attrMod(score: number): number {
  if (score <= 3) return -2;
  if (score <= 7) return -1;
  if (score <= 13) return 0;
  if (score <= 17) return 1;
  return 2;
}

export function calcSaves(attrs: Record<AttributeName, number>, level: number) {
  const physical = 16 - level - Math.max(attrMod(attrs.STR), attrMod(attrs.CON));
  const evasion = 16 - level - Math.max(attrMod(attrs.DEX), attrMod(attrs.INT));
  const mental = 16 - level - Math.max(attrMod(attrs.WIS), attrMod(attrs.CHA));
  return { physical, evasion, mental };
}

export function calcEffort(skills: SkillLevels, attrs: Record<AttributeName, number>): number {
  const psychicSkills = ['Biopsionics', 'Metapsionics', 'Precognition', 'Telekinesis', 'Telepathy', 'Teleportation'];
  const highest = Math.max(...psychicSkills.map(s => skills[s as keyof SkillLevels] ?? -1));
  if (highest < 0) return 1;
  const attrBonus = Math.max(attrMod(attrs.WIS), attrMod(attrs.CON));
  return Math.max(1, 1 + highest + attrBonus);
}

export function calcAttackBonus(cls: ClassName, partials: AdventurerPartial[] | undefined, level: number): number {
  if (cls === 'Warrior') return level;
  if (cls === 'Adventurer' && partials?.includes('Partial Warrior')) {
    return Math.floor(level / 2) + (level >= 5 ? 1 : 0) + 1;
  }
  return Math.floor(level / 2);
}

export function emptyCharacter(): Character {
  return {
    id: crypto.randomUUID(),
    name: '',
    level: 1,
    xp: 0,
    homeworld: '',
    species: 'Human',
    goal: '',
    background: '',
    attributes: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    class: 'Expert',
    skills: {},
    foci: [],
    psychicDisciplines: [],
    psychicTechniques: [],
    effort: { max: 1, committed: 0 },
    hitPoints: { current: 6, max: 6 },
    systemStrain: { current: 0, max: 10 },
    baseAttackBonus: 0,
    saves: { physical: 15, evasion: 15, mental: 15 },
    armor: [],
    weapons: [],
    equipment: [],
    credits: 0,
    debts: 0,
    notes: '',
  };
}
