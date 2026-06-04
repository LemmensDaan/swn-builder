import type { SkillLevels } from '../data/skills';

export interface SkillSpend {
  skill: string;
  from: number;   // previous level (-1 = untrained)
  to: number;     // new level
  cost: number;   // SP spent
}

export interface AttrBoost {
  attr: string;
  from: number;
  to: number;
  cost: number;
}

export interface TechniqueLearn {
  discipline: string;
  techniqueName: string;
  cost: number; // 1 SP per technique level
}

export interface LevelRecord {
  level: number;                   // the level gained (2, 3, ...)
  hpRolled: number;                // d6 result
  hpGained: number;                // after CON mod + Warrior bonus, min 1
  spTotal: number;                 // SP pool this level (3 or 4 for Expert)
  skillSpends: SkillSpend[];
  attrBoosts: AttrBoost[];
  techniquesLearned: TechniqueLearn[];
  focusPicked?: FocusSelection;    // free focus at levels 2, 5, 7, 10
}

export type AttributeName = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export type ClassName = 'Expert' | 'Psychic' | 'Warrior' | 'Adventurer';

export type AdventurerPartial = 'Partial Expert' | 'Partial Psychic' | 'Partial Warrior';

export interface FocusSelection {
  name: string;
  level: 1 | 2;
  /** Chosen bonus skill for foci that let you pick (Specialist, Close Combatant, Psychic Training…). May be a psychic skill. */
  specialistSkill?: string;
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
  /** Live ammo tracking for play. max 0 / undefined = no magazine (melee, unlimited). */
  ammo?: { current: number; max: number };
  /** Encumbrance placement. undefined = Readied (default for weapons). */
  readied?: boolean;
  /** Left at ship/base — contributes zero encumbrance. */
  notCarried?: boolean;
}

export interface ArmorEntry {
  name: string;
  ac: number;
  /** Encumbrance placement. undefined = Readied (default for armor). */
  readied?: boolean;
  /** Left at ship/base — contributes zero encumbrance. */
  notCarried?: boolean;
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
  /** Names of general-equipment items that are Readied rather than Stowed (default: stowed). */
  equipmentReadied: string[];
  /** Names of general-equipment items left behind (not carried at all — zero encumbrance). */
  equipmentNotCarried: string[];
  credits: number;
  debts: number;

  notes: string;

  // Advancement history — one record per level gained after level 1
  levelHistory: LevelRecord[];
  // Snapshot of skills as set by the wizard at level 1;
  // used to recompute final skills if the wizard is re-saved on a leveled character
  creationSkills: SkillLevels;
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

/**
 * Recompute final char.skills from creationSkills + all levelHistory skill spends.
 * Call this whenever the wizard re-saves a leveled character.
 */
export function recomputeSkills(char: Character): SkillLevels {
  const skills: Record<string, number> = { ...char.creationSkills };
  for (const record of char.levelHistory) {
    for (const spend of record.skillSpends) {
      skills[spend.skill] = spend.to;
    }
  }
  return skills;
}

/**
 * Recompute final attributes from base attributes + all levelHistory attr boosts.
 */
export function recomputeAttributes(char: Character): Record<AttributeName, number> {
  const attrs = { ...char.attributes };
  for (const record of char.levelHistory) {
    for (const boost of record.attrBoosts) {
      (attrs as Record<string, number>)[boost.attr] = boost.to;
    }
  }
  return attrs;
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
    equipmentReadied: [],
    equipmentNotCarried: [],
    credits: 0,
    debts: 0,
    notes: '',
    levelHistory: [],
    creationSkills: {},
  };
}
