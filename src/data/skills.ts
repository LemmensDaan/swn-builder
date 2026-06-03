export const SKILLS = [
  'Administer', 'Connect', 'Exert', 'Fix', 'Heal', 'Know', 'Lead',
  'Notice', 'Perform', 'Pilot', 'Program', 'Punch', 'Shoot', 'Sneak',
  'Stab', 'Survive', 'Talk', 'Trade', 'Work',
] as const;

export const PSYCHIC_SKILLS = [
  'Biopsionics', 'Metapsionics', 'Precognition', 'Telekinesis', 'Telepathy', 'Teleportation',
] as const;

export const ALL_SKILLS = [...SKILLS, ...PSYCHIC_SKILLS] as const;

export type Skill = typeof SKILLS[number];
export type PsychicSkill = typeof PSYCHIC_SKILLS[number];
export type AnySkill = typeof ALL_SKILLS[number];

export type SkillLevels = Partial<Record<AnySkill, number>>;
