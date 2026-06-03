import type { Skill } from './skills';

export type GrowthEntry =
  | '+1 Any Stat' | '+2 Physical' | '+2 Mental' | 'Any Skill' | Skill;

export type LearningEntry = 'Any Combat' | 'Any Skill' | Skill;

export interface Background {
  name: string;
  description: string;
  freeSkill: Skill;
  quickSkills: (Skill | 'Any Combat')[];
  growth: GrowthEntry[];
  learning: LearningEntry[];
}

export const BACKGROUNDS: Background[] = [
  {
    name: 'Barbarian',
    description: 'Born of a primitive world of low technology and high violence.',
    freeSkill: 'Survive',
    quickSkills: ['Survive', 'Notice', 'Any Combat'],
    growth: ['+1 Any Stat', '+2 Physical', '+2 Physical', '+2 Mental', 'Exert', 'Any Skill'],
    learning: ['Any Combat', 'Connect', 'Exert', 'Lead', 'Notice', 'Punch', 'Sneak', 'Survive'],
  },
  {
    name: 'Clergy',
    description: 'A consecrated man or woman dedicated to one of the many faiths found among human civilizations.',
    freeSkill: 'Talk',
    quickSkills: ['Talk', 'Perform', 'Know'],
    growth: ['+1 Any Stat', '+2 Mental', '+2 Physical', '+2 Mental', 'Connect', 'Any Skill'],
    learning: ['Administer', 'Connect', 'Know', 'Lead', 'Notice', 'Perform', 'Talk', 'Talk'],
  },
  {
    name: 'Courtesan',
    description: 'Your career was one of proffered pleasure — from simple companionship to artistry of conversation and grace.',
    freeSkill: 'Perform',
    quickSkills: ['Perform', 'Notice', 'Connect'],
    growth: ['+1 Any Stat', '+2 Mental', '+2 Physical', '+2 Mental', 'Connect', 'Any Skill'],
    learning: ['Any Combat', 'Connect', 'Exert', 'Notice', 'Perform', 'Survive', 'Talk', 'Trade'],
  },
  {
    name: 'Criminal',
    description: 'Whether thief, murderer, forger, smuggler, or spy — you lived outside the law.',
    freeSkill: 'Sneak',
    quickSkills: ['Sneak', 'Connect', 'Talk'],
    growth: ['+1 Any Stat', '+2 Mental', '+2 Physical', '+2 Mental', 'Connect', 'Any Skill'],
    learning: ['Administer', 'Any Combat', 'Connect', 'Notice', 'Program', 'Sneak', 'Talk', 'Trade'],
  },
  {
    name: 'Dilettante',
    description: 'You never had a profession, spending formative years in travel, socializing, and engaging hobbies.',
    freeSkill: 'Connect',
    quickSkills: ['Connect', 'Know', 'Talk'],
    growth: ['+1 Any Stat', '+1 Any Stat', '+1 Any Stat', '+1 Any Stat', 'Connect', 'Any Skill'],
    learning: ['Any Skill', 'Any Skill', 'Connect', 'Know', 'Perform', 'Pilot', 'Talk', 'Trade'],
  },
  {
    name: 'Entertainer',
    description: 'A singer, dancer, actor, poet, or writer dedicated to their art.',
    freeSkill: 'Perform',
    quickSkills: ['Perform', 'Talk', 'Connect'],
    growth: ['+1 Any Stat', '+2 Mental', '+2 Mental', '+2 Physical', 'Connect', 'Any Skill'],
    learning: ['Any Combat', 'Connect', 'Exert', 'Notice', 'Perform', 'Perform', 'Sneak', 'Talk'],
  },
  {
    name: 'Merchant',
    description: 'A trader, from humble peddler to daring far trader venturing to distant worlds.',
    freeSkill: 'Trade',
    quickSkills: ['Trade', 'Talk', 'Connect'],
    growth: ['+1 Any Stat', '+2 Mental', '+2 Mental', '+2 Mental', 'Connect', 'Any Skill'],
    learning: ['Administer', 'Any Combat', 'Connect', 'Fix', 'Know', 'Notice', 'Trade', 'Talk'],
  },
  {
    name: 'Noble',
    description: 'A member of a ruling class on a world of exquisite courtesy alloyed with utterly remorseless violence.',
    freeSkill: 'Lead',
    quickSkills: ['Lead', 'Connect', 'Administer'],
    growth: ['+1 Any Stat', '+2 Mental', '+2 Mental', '+2 Mental', 'Connect', 'Any Skill'],
    learning: ['Administer', 'Any Combat', 'Connect', 'Know', 'Lead', 'Notice', 'Pilot', 'Talk'],
  },
  {
    name: 'Official',
    description: 'A functionary of some greater state — law enforcement, government clerk, tax official, or trade inspector.',
    freeSkill: 'Administer',
    quickSkills: ['Administer', 'Talk', 'Connect'],
    growth: ['+1 Any Stat', '+2 Mental', '+2 Mental', '+2 Mental', 'Connect', 'Any Skill'],
    learning: ['Administer', 'Connect', 'Know', 'Lead', 'Notice', 'Talk', 'Talk', 'Trade'],
  },
  {
    name: 'Peasant',
    description: 'A farmer or laborer, part of the working class that keeps primitive or agrarian worlds running.',
    freeSkill: 'Exert',
    quickSkills: ['Exert', 'Sneak', 'Survive'],
    growth: ['+1 Any Stat', '+2 Physical', '+2 Physical', '+2 Physical', 'Exert', 'Any Skill'],
    learning: ['Connect', 'Exert', 'Fix', 'Notice', 'Sneak', 'Survive', 'Trade', 'Work'],
  },
  {
    name: 'Physician',
    description: 'A healer trained to cure maladies of the body or afflictions of the mind.',
    freeSkill: 'Heal',
    quickSkills: ['Heal', 'Know', 'Notice'],
    growth: ['+1 Any Stat', '+2 Physical', '+2 Mental', '+2 Mental', 'Connect', 'Any Skill'],
    learning: ['Administer', 'Connect', 'Fix', 'Heal', 'Know', 'Notice', 'Talk', 'Trade'],
  },
  {
    name: 'Pilot',
    description: 'A vehicle operator — spaceship navigator, intra-system shuttle pilot, long-haul trucker, or sailor.',
    freeSkill: 'Pilot',
    quickSkills: ['Pilot', 'Fix', 'Shoot'],
    growth: ['+1 Any Stat', '+2 Physical', '+2 Physical', '+2 Mental', 'Connect', 'Any Skill'],
    learning: ['Connect', 'Exert', 'Fix', 'Notice', 'Pilot', 'Pilot', 'Shoot', 'Trade'],
  },
  {
    name: 'Politician',
    description: 'An aspiring leader who sought power through votes, ceremony, or combat depending on their world.',
    freeSkill: 'Talk',
    quickSkills: ['Talk', 'Lead', 'Connect'],
    growth: ['+1 Any Stat', '+2 Mental', '+2 Mental', '+2 Mental', 'Connect', 'Any Skill'],
    learning: ['Administer', 'Connect', 'Connect', 'Lead', 'Notice', 'Perform', 'Talk', 'Talk'],
  },
  {
    name: 'Scholar',
    description: 'A scientist, sage, or professor with a life dedicated to knowledge and understanding.',
    freeSkill: 'Know',
    quickSkills: ['Know', 'Connect', 'Administer'],
    growth: ['+1 Any Stat', '+2 Mental', '+2 Mental', '+2 Mental', 'Connect', 'Any Skill'],
    learning: ['Administer', 'Connect', 'Fix', 'Know', 'Notice', 'Perform', 'Program', 'Talk'],
  },
  {
    name: 'Soldier',
    description: 'A professional fighter — barbarian thegn, planetary conscript, or elite corporate military.',
    freeSkill: 'Any Combat' as Skill,
    quickSkills: ['Any Combat', 'Exert', 'Survive'],
    growth: ['+1 Any Stat', '+2 Physical', '+2 Physical', '+2 Physical', 'Exert', 'Any Skill'],
    learning: ['Administer', 'Any Combat', 'Exert', 'Fix', 'Lead', 'Notice', 'Sneak', 'Survive'],
  },
  {
    name: 'Spacer',
    description: 'A worker who toils in the sky or a native void-born man or woman who has spent their life in space.',
    freeSkill: 'Fix',
    quickSkills: ['Fix', 'Pilot', 'Program'],
    growth: ['+1 Any Stat', '+2 Physical', '+2 Mental', '+2 Mental', 'Connect', 'Any Skill'],
    learning: ['Administer', 'Connect', 'Exert', 'Fix', 'Know', 'Pilot', 'Program', 'Talk'],
  },
  {
    name: 'Technician',
    description: 'An artisan, engineer, or builder — from humble lostworlder blacksmith to erudite astronautic engineer.',
    freeSkill: 'Fix',
    quickSkills: ['Fix', 'Exert', 'Notice'],
    growth: ['+1 Any Stat', '+2 Physical', '+2 Mental', '+2 Mental', 'Connect', 'Any Skill'],
    learning: ['Administer', 'Connect', 'Exert', 'Fix', 'Fix', 'Know', 'Notice', 'Pilot'],
  },
  {
    name: 'Thug',
    description: 'A bruiser — crime boss muscle, a fist in a righteous cause, or private contractor of misfortune.',
    freeSkill: 'Any Combat' as Skill,
    quickSkills: ['Any Combat', 'Talk', 'Connect'],
    growth: ['+1 Any Stat', '+2 Mental', '+2 Physical', '+2 Physical', 'Connect', 'Any Skill'],
    learning: ['Any Combat', 'Connect', 'Exert', 'Notice', 'Sneak', 'Stab', 'Survive', 'Talk'],
  },
  {
    name: 'Vagabond',
    description: 'A roamer without a home, knocked loose from polite society at a young age or recently cast out.',
    freeSkill: 'Survive',
    quickSkills: ['Survive', 'Sneak', 'Notice'],
    growth: ['+1 Any Stat', '+2 Physical', '+2 Physical', '+2 Mental', 'Exert', 'Any Skill'],
    learning: ['Any Combat', 'Connect', 'Notice', 'Perform', 'Pilot', 'Sneak', 'Survive', 'Work'],
  },
  {
    name: 'Worker',
    description: 'A cube drone or day laborer — cook, factory worker, miner, clerk, or any of countless urban roles.',
    freeSkill: 'Work',
    quickSkills: ['Connect', 'Exert', 'Work'],
    growth: ['+1 Any Stat', '+1 Any Stat', '+1 Any Stat', '+1 Any Stat', 'Exert', 'Any Skill'],
    learning: ['Administer', 'Any Skill', 'Connect', 'Exert', 'Fix', 'Pilot', 'Program', 'Work'],
  },
];
