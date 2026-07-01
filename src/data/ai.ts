/**
 * True AI / VI rules reference data.
 * Source: Stars Without Number Revised, pp. 196–293.
 *
 * True AIs are extremely rare, created by Mandate-era facilities.
 * VIs (Virtual Intelligences) are synthetic minds tied to their hardware.
 *
 * Use: represent an AI PC's species as "True AI" or "VI", surface rules here.
 */

export interface AiRoutine {
  name: string;
  level: number;       // 1–5
  core: boolean;       // core = auto-learned; peripheral = costs SP equal to level
  activation: string;  // action type to activate
  commitment: string;  // how long Processing is committed
  description: string;
}

export interface ProcessingNode {
  bonus: number;        // maximum Processing increase
  costCredits: number;  // credits
  notes: string;
}

/**
 * True AI class rules summary (p.291)
 * - Rolls 1d6 HP per level
 * - Attack bonus = half level, rounded down
 * - Resource: Processing (like Effort for psychics)
 * - Max Processing: 1 + higher of INT/WIS modifier (naked core)
 * - Can split quantum core into a phylactery (backup)
 * - Cannot be a Psychic (rare exceptions require GM approval)
 * - Repaired with spare parts + Fix skill (1 unit parts + Fix-0 = level HP in 15min)
 * - Armature at 0 HP = Badly Damaged (not destroyed unless Heavy weapon)
 * - Cannot use cyberware but can have built-in gear (5× cost; up to 2/level slots)
 */
export const TRUE_AI_CLASS_RULES = {
  hitDieType: 6,
  attackBonusFormula: 'half level, rounded down',
  processingBaseFormula: '1 + higher of INT modifier or WIS modifier',
  coreRoutinesAtLevel: [
    { characterLevel: 1, routineLevels: [1] },
    { characterLevel: 3, routineLevels: [1, 2] },
    { characterLevel: 5, routineLevels: [1, 2, 3] },
    { characterLevel: 7, routineLevels: [1, 2, 3, 4] },
    { characterLevel: 9, routineLevels: [1, 2, 3, 4, 5] },
  ],
  maxRoutineLevel: 'half character level, rounded up',
  healingRules: 'One unit of spare parts + Fix-0 tech heals HP equal to character level in 15 minutes. AI can self-repair if functional.',
  badlyDamagedRecovery: '24 hours of repair work by Fix-0 tech + 1 spare part unit. Can be jury-rigged in field (risk: 0 HP again = destroyed).',
  cyberware: 'Cannot use cyberware. Built-in gear costs 5× base price; up to 2 items per character level can be integrated.',
  notes: [
    'Needs no food, water, or sleep. Requires 1 Type B power cell per week away from standard current.',
    'Immune to vacuum, poison, and disease.',
    'Can be reprogrammed (takes an undisturbed month by someone with Program-1).',
    'Armature can be replaced: 250 credits per Face point of the transhuman shell.',
    'Quantum phylactery: split core; primary destroyed → awareness shifts to secondary; secondary regenerates over 1 month.',
    'Cannot normally be a Psychic; requires GM approval.',
  ],
} as const;

/**
 * Processing nodes — additional computing resources (p.290)
 * Multiple nodes do not stack; only the highest applies.
 */
export const PROCESSING_NODES: ProcessingNode[] = [
  { bonus: 1, costCredits: 1_000,   notes: 'Belt-sized, ~1 kg. Stowed item.' },
  { bonus: 2, costCredits: 5_000,   notes: 'Two encumbrance items, needs backpack.' },
  { bonus: 3, costCredits: 10_000,  notes: 'Gravcar or similar vehicle can carry and power.' },
  { bonus: 4, costCredits: 50_000,  notes: 'Gravcar or similar vehicle.' },
  { bonus: 5, costCredits: 250_000, notes: 'Frigate-class starship or larger; uses Power = bonus.' },
  { bonus: 6, costCredits: 5_000_000, notes: 'Stationary facility or capital-class starship.' },
  { bonus: 7, costCredits: -1,      notes: 'Unusable by braked AIs.' },
];

/**
 * Core Routines — mastered automatically as the True AI advances.
 * Gained at character levels: L1 Routines at level 1, L2 at level 3,
 * L3 at level 5, L4 at level 7, L5 at level 9.
 * Source: pp.292–293.
 */
export const CORE_ROUTINES: AiRoutine[] = [
  {
    name: 'Query Data',
    level: 1,
    core: true,
    activation: 'Main Action',
    commitment: 'Scene',
    description: 'Ask one question about a database you have access to and receive an answer as if you had virtually unlimited search time.',
  },
  {
    name: 'Split Focus',
    level: 1,
    core: true,
    activation: 'On Turn',
    commitment: 'Scene (until ended)',
    description: 'Count as multiple people for operational purposes. At 1st level: equivalent to 3 people; multiplies by 3 per successive level. Each additional Processing Committed boosts further: ×10 for 2nd point, ×100 for 3rd, etc.',
  },
  {
    name: 'Defeat Security',
    level: 2,
    core: true,
    activation: 'Main Action',
    commitment: 'Day',
    description: 'Overcome any encryption or electronic lock not set by another AI. Against AI security, make opposing Program skill checks. Success also negates any alarms.',
  },
  {
    name: 'Drone Command',
    level: 2,
    core: true,
    activation: 'On Turn',
    commitment: 'Scene (until ended)',
    description: 'Function as if you have drone control rig cyberware. Issue one free drone command per two character levels per round (rounded up). A drone executes one command per round.',
  },
  {
    name: 'Native Hacker',
    level: 2,
    core: true,
    activation: 'On Turn (must trigger before check)',
    commitment: 'Day',
    description: 'Automatically succeed at any non-AI-opposed hacking check. Against AI-designed security, roll normally.',
  },
  {
    name: 'Accelerated Deduction',
    level: 3,
    core: true,
    activation: 'Main Action',
    commitment: 'Day (once per day only)',
    description: 'Ask the GM a yes/no question about a current or past event. If theoretically deducible, the GM must answer truthfully or note invalid assumptions.',
  },
  {
    name: 'Cognitive Boost',
    level: 3,
    core: true,
    activation: 'On Turn (must trigger before roll)',
    commitment: 'Scene',
    description: 'Automatically succeed at any Know skill check if success is possible. For primarily mental checks requiring only basic physical actions, grants +2 bonus instead.',
  },
  {
    name: 'Pierce Quantum ECM',
    level: 4,
    core: true,
    activation: 'On Turn',
    commitment: 'Day',
    description: 'For one scene, you or a device you operate functions as if no quantum ECM is active in the vicinity. Access remote clusters, use guided weapons, pilot drones outside line of sight.',
  },
  {
    name: 'Predictive Cognition',
    level: 4,
    core: true,
    activation: 'Instant',
    commitment: 'Day (once per day only)',
    description: 'All events since the beginning of your last turn are unwound; they were merely predictive modeling. Reset to the start of your most recent turn and act differently.',
  },
  {
    name: 'Multifactor Prediction',
    level: 5,
    core: true,
    activation: 'On Turn (once per scene)',
    commitment: 'Day',
    description: 'Predict events up to 10 minutes in the future. Unless physically impossible or wildly out of character for those involved, they carry out the prediction. In combat/danger, limited to 1 round.',
  },
  {
    name: 'Will of the Machine',
    level: 5,
    core: true,
    activation: 'On Turn',
    commitment: 'Scene (until ended)',
    description: 'Target a visible or wirelessly-accessible vehicle or machine no larger than a gravflyer. While Committed, you have complete control and access to its sensors. Issuing commands costs a Move action.',
  },
];

/**
 * Peripheral Routines — optional; cost 1 SP per level to learn.
 * Source: pp.293.
 */
export const PERIPHERAL_ROUTINES: AiRoutine[] = [
  {
    name: 'Augmented Targeting',
    level: 1,
    core: false,
    activation: 'On Turn (before attacking)',
    commitment: 'Scene',
    description: 'Attack a non-sentient target; the attack inevitably hits for maximum damage. Animals and sentient-piloted vehicles are not valid targets.',
  },
  {
    name: 'Metadimensional Cognition Access',
    level: 1,
    core: false,
    activation: 'Passive (always active)',
    commitment: 'None',
    description: 'You are now a valid target for friendly Telepathy discipline psychics. No Processing cost; always in effect.',
  },
  {
    name: 'Overclock Cognition',
    level: 1,
    core: false,
    activation: 'On Turn',
    commitment: 'Day',
    description: 'Increase either WIS or INT modifier by +1 (max +3) for the rest of the scene. Each attribute can be boosted only once per scene. Does not alter max Processing.',
  },
  {
    name: 'Emergency Maintenance',
    level: 2,
    core: false,
    activation: 'On Turn (once per round)',
    commitment: 'Day',
    description: 'Immediately recover 2 HP per character level as emergency repair protocols engage.',
  },
  {
    name: 'Sensor Ghost',
    level: 2,
    core: false,
    activation: 'On Turn',
    commitment: 'Scene',
    description: 'Become invisible to automated sensor hardware (motion detectors, radar, laser tripwires, etc.). Sentient creatures studying monitor feeds may realize something is wrong.',
  },
  {
    name: 'Augmented Cognition',
    level: 3,
    core: false,
    activation: 'On Turn',
    commitment: 'Day',
    description: 'Your Intelligence attribute becomes 18 for the rest of the day. Maximum Processing is unaffected.',
  },
  {
    name: 'Hack Control',
    level: 3,
    core: false,
    activation: 'Move Action',
    commitment: 'Scene',
    description: 'Target a visible expert system robot, drone, vehicle, or automated device no larger than a gravflyer. Give it one command it can physically carry out, even violating its programming. (Acquiring Will of the Machine refunds this purchase.)',
  },
  {
    name: 'Remote Power Sink',
    level: 3,
    core: false,
    activation: 'Main Action',
    commitment: 'Scene',
    description: 'Target a visible piece of equipment powered by a Type A cell or equivalent; its power is immediately drained.',
  },
  {
    name: 'Core Manifestation',
    level: 4,
    core: false,
    activation: 'Main Action',
    commitment: 'Day',
    description: 'When your core has no functioning armature, create a forcefield construct equivalent to a Box armature at full HP. If the construct reaches 0 HP, make a Mental save or your core is destroyed.',
  },
  {
    name: 'Regenerative Repair',
    level: 4,
    core: false,
    activation: 'On Turn',
    commitment: 'Scene (ongoing)',
    description: 'While Committed, regenerate 1 lost HP per minute. Does not function when Badly Damaged.',
  },
  {
    name: 'Predicted Preparation',
    level: 5,
    core: false,
    activation: 'Main Action (once per scene)',
    commitment: 'Day',
    description: 'State one thing about your current situation you could have conceivably prepared for with full advance knowledge. If plausible and affordable, it is true. Cannot cause direct harm to sentients.',
  },
  {
    name: 'Quantum Location Recalculation',
    level: 5,
    core: false,
    activation: 'Main Action',
    commitment: 'Day',
    description: 'Teleport yourself and up to 6 willing allies within 10m (or 100 kg cargo per missing ally) anywhere within 1 km. Roll Int/Program: difficulty 8 if visited before, 12 if not. On fail, 1d6 damage per 100m traveled; 10% cargo ruined per 100m. Not psionic; not blocked by anti-teleport shields.',
  },
];

/**
 * VI (Virtual Intelligence) rules reference (p.200–203)
 * VIs that can be PC characters spend their free focus pick on an origin focus.
 * See foci.ts for Android, VI Worker Bot, VI Vehicle Bot.
 */
export const VI_RULES = {
  creation: 'Spend the free starting focus pick on a VI origin focus (Android, VI Worker Bot, or VI Vehicle Bot). Use normal PC creation rules otherwise.',
  specialRules: [
    'Need no sleep, food, or water. Require 1 Type B power cell per week away from standard current.',
    'Immune to vacuum, but suffer radiation degradation as humans do.',
    'Cannot be poisoned or diseased by normal toxins.',
    'Cannot be Psychics or take Partial Psychic as an Adventurer.',
    'Cannot use cyberware.',
    'Healed by spare parts and Fix skill: 1 spare part unit + Fix-0 = HP equal to character level in 15 minutes. Can self-repair.',
    'Can be reprogrammed (at least 1 undisturbed month by someone with Program-1). VIs fight to the death to avoid this.',
    'At 0 HP (not destroyed by Heavy weapon): Badly Damaged. Needs 24 hours + 1 spare part to remove condition.',
    'Gear grafted into chassis costs 2× base price; total graftable encumbrance = half CON score (rounded down).',
    'Cosmetic alterations possible; cannot be transplanted into a new chassis.',
    'AC 10 when not wearing armor (modified by DEX).',
  ],
  note: 'VI foci have only Level 1; their special rules are recorded in the Level 1 description.',
};

/**
 * Quick reference: Robots listed in the book (p.201)
 */
export interface RobotType {
  name: string;
  hitDice: number;
  ac: number;
  attackBonus: number;
  damage: string;
  move: number;   // meters
  morale: number;
  skills: number;
  saves: number;  // roll d20 >= saves = success
  costCredits: number;
  notes: string;
}

export const ROBOT_TYPES: RobotType[] = [
  { name: 'Janitor Bot',          hitDice: 1, ac: 14, attackBonus: 0,  damage: 'N/A',       move: 5,  morale: 8,  skills: 1, saves: 15, costCredits: 1_000,  notes: 'Cleaning only; useless in combat.' },
  { name: 'Civilian Security Bot',hitDice: 1, ac: 15, attackBonus: 1,  damage: '1d8 stun',  move: 10, morale: 12, skills: 1, saves: 15, costCredits: 5_000,  notes: 'Non-lethal stunning touch; tireless guard.' },
  { name: 'Repair Bot',           hitDice: 1, ac: 14, attackBonus: 0,  damage: '1d6 tool',  move: 10, morale: 8,  skills: 1, saves: 15, costCredits: 5_000,  notes: 'Expert at standard repairs; panics at unusual crises.' },
  { name: 'Industrial Work Bot',  hitDice: 2, ac: 15, attackBonus: 0,  damage: '1d10 crush',move: 5,  morale: 8,  skills: 1, saves: 14, costCredits: 2_000,  notes: 'Slow, heavy; for lifting and shaping heavy objects.' },
  { name: 'Companion Bot',        hitDice: 1, ac: 12, attackBonus: 0,  damage: '1d2 unarmed',move: 10, morale: 6, skills: 1, saves: 15, costCredits: 2_500,  notes: 'Nannybots, petbots, companions. Heavily regulated on many worlds.' },
  { name: 'Soldier Bot',          hitDice: 2, ac: 16, attackBonus: 1,  damage: 'By weapon', move: 10, morale: 10, skills: 1, saves: 14, costCredits: 10_000, notes: 'Humanoid design for using standard human equipment; limited without human direction.' },
  { name: 'Heavy Warbot',         hitDice: 6, ac: 18, attackBonus: 8,  damage: '2d8 plasma (×2)', move: 15, morale: 10, skills: 2, saves: 12, costCredits: 50_000, notes: 'Attacks twice per Main Action. Can mount one Heavy weapon instead of plasma guns.' },
];

/** Expert system upgrade levels (p.201) */
export const EXPERT_SYSTEM_LEVELS = [
  { level: 1, hdBonus: 0, atkBonus: 0, skillBonus: 0, savesImprovement: 0, costMultiplier: 1 },
  { level: 2, hdBonus: 1, atkBonus: 1, skillBonus: 1, savesImprovement: 1, costMultiplier: 2 },
  { level: 3, hdBonus: 2, atkBonus: 2, skillBonus: 1, savesImprovement: 1, costMultiplier: 4 },
  { level: 4, hdBonus: 4, atkBonus: 4, skillBonus: 2, savesImprovement: 2, costMultiplier: 8 },
];
