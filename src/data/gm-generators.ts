// GM Generator tables — Stars Without Number (Revised)
// All tables transcribed from swn_full.txt (pages 183-189, 244-249, 292-303)

// ─── utility ────────────────────────────────────────────────────────────────

/** Pick a uniformly random element from an array. */
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Roll an n-sided die (1-indexed). */
export function roll(n: number): number {
  return Math.floor(Math.random() * n) + 1;
}

/** Roll a die and pick from a table indexed 1…n */
export function rollOn<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── NPC tables (pp. 183-188, 244-249) ───────────────────────────────────────

// One-Roll NPCs — p. 248
export const NPC_PROBLEM: readonly string[] = [
  'They have significant debt or money woes',
  'A loved one is in trouble; reroll for it',
  'Romantic failure with a desired person',
  'Drug or behavioral addiction',
  'Their superior dislikes or resents them',
  'They have a persistent sickness',
  'They hate their job or life situation',
  'Someone dangerous is targeting them',
  "They're pursuing a disastrous purpose",
  'They have no problems worth mentioning',
] as const;

export const NPC_TRAIT: readonly string[] = [
  'Ambition',
  'Avarice',
  'Bitterness',
  'Courage',
  'Cowardice',
  'Curiosity',
  'Deceitfulness',
  'Determination',
  'Devotion to a cause',
  'Filiality',
  'Hatred',
  'Honesty',
  'Hopefulness',
  'Love of a person',
  'Nihilism',
  'Paternalism',
  'Pessimism',
  'Protectiveness',
  'Resentment',
  'Shame',
] as const;

export const NPC_DESIRE: readonly string[] = [
  'They want a particular romantic partner',
  'They want money for them or a loved one',
  'They want a promotion in their job',
  'They want answers about a past trauma',
  'They want revenge on an enemy',
  'They want to help a beleaguered friend',
  'They want an entirely different job',
  'They want protection from an enemy',
  'They want to leave their current life',
  'They want fame and glory',
  'They want power over those around them',
  'They have everything they want from life',
] as const;

export const NPC_ROLE: readonly string[] = [
  'Criminal, thug, thief, swindler',
  'Menial, cleaner, retail worker, servant',
  'Unskilled heavy labor, porter, construction',
  'Skilled trade, electrician, mechanic, pilot',
  'Idea worker, programmer, writer',
  'Merchant, business owner, trader, banker',
  'Official, bureaucrat, courtier, clerk',
  'Military, soldier, enforcer, law officer',
] as const;

export const NPC_BACKGROUND: readonly string[] = [
  'The local underclass or poorest natives',
  'Common laborers or cube workers',
  'Aspiring bourgeoisie or upper class',
  'The elite of this society',
  'Minority or foreigners',
  'Offworlders or exotics',
] as const;

export const NPC_AGE: readonly string[] = [
  'Unusually young or old for their role',
  'Young adult',
  'Mature prime',
  'Middle-aged or elderly',
] as const;

// Deeper NPC tables (pp. 187-188 — "Creating People")
export const NPC_MOTIVATION: readonly string[] = [
  'An ambition for greater social status',
  'Greed for wealth and indulgent riches',
  'Protect a loved one who is somehow imperiled',
  'A sheer sadistic love of inflicting pain and suffering',
  'Hedonistic enjoyment of pleasing company',
  'Searching out hidden knowledge or science',
  'Establishing or promoting a cultural institution',
  'Avenging a grievous wrong to them or a loved one',
  'Promoting their religion and living out their faith',
  'Winning the love of a particular person',
  'Winning glory and fame in their profession',
  'Dodging an enemy who is pursuing them',
  'Driving out or killing an enemy group',
  'Deposing a rival to them in their line of work',
  'Getting away from this world or society',
  'Promote a friend or offspring\'s career or future',
  'Taking control of a property or piece of land',
  'Building a structure or a complex prototype tech',
  'Perform or create their art to vast acclaim',
  'Redeem themselves from a prior failure',
] as const;

export const NPC_WANT: readonly string[] = [
  'Bring them an exotic piece of tech',
  'Convince someone to meet with the NPC',
  'Kill a particular NPC',
  'Kidnap or non-fatally eliminate a particular NPC',
  'Pay them a large amount of money',
  'Take a message to someone hard to reach',
  'Acquire a tech component that\'s hard to get',
  'Find proof of a particular NPC\'s malfeasance',
  'Locate a missing NPC',
  'Bring someone to a destination via dangerous travel',
  'Retrieve a lost or stolen object',
  'Defend someone from an impending attack',
  'Burn down or destroy a particular structure',
  'Explore a dangerous or remote location',
  'Steal something from a rival NPC or group',
  'Intimidate a rival into ceasing their course of action',
  'Commit a minor crime to aid the NPC',
  'Trick a rival into doing something',
  'Rescue an NPC from a dire situation',
  'Force a person or group to leave an area',
] as const;

export const NPC_POWER: readonly string[] = [
  "They're just really appealing and sympathetic to PCs",
  'They have considerable liquid funds',
  'They control the use of large amounts of violence',
  'They have a position of great social status',
  "They're a good friend of an important local leader",
  'They have blackmail info on the PCs',
  'They have considerable legal influence here',
  'They have tech the PCs might reasonably want',
  'They can get the PCs into a place they want to go',
  'They know where significant wealth can be found',
  "They have information about the PCs' current goal",
  'An NPC the PCs need has implicit trust in them',
  'The NPC can threaten someone the PCs like',
  'They control a business relevant to PC needs',
  'They have considerable criminal contacts',
  'They have pull with the local religion',
  'They know a great many corrupt politicians',
  'They can alert the PCs to an unexpected peril',
  "They're able to push a goal the PCs currently have",
  'They can get the PCs useful permits and rights',
] as const;

export const NPC_HOOK: readonly string[] = [
  'A particular odd style of dress',
  'An amputation or other maiming',
  'Visible cyberware or prosthetics',
  'Unusual hair, skin, or eye colors',
  'Scarring, either intentional or from old injuries',
  'Tic-like overuse of a particular word or phrase',
  'Specific unusual fragrance or cologne',
  'Constant fiddling with a particular item',
  'Visible signs of drug use',
  'Always seems to be in one particular mood',
  'Wears badges or marks of allegiance to a cause',
  'Extremely slow or fast pace of speech',
  'Wheezes, shakes, or other signs of infirmity',
  'Constantly with a drink to hand',
  'Always complaining about a group or organization',
  'Paranoid, possibly for justifiable reasons',
  'Insists on a particular location for all meetings',
  'Communicates strictly through a third party',
  'Abnormally obese, emaciated, tall, or short',
  'Always found with henchmen or friends',
] as const;

export const NPC_MANNER: readonly string[] = [
  'Ingratiating and cloying',
  'Grim suspicion of the PCs or their backers',
  'Xenophilic interest in the novelty of the PCs',
  'Pragmatic and businesslike',
  'Romantically interested in one or more PCs',
  "A slimy used-gravcar dealer's approach",
  'Wide-eyed awe at the PCs',
  'Cool and superior attitude toward PC "hirelings"',
  'Benevolently patronizing toward outsiders',
  'Sweaty-palmed need or desperation',
  'Xenophobic mistrust of the PCs',
  'Idealistic enthusiasm for a potentially shared cause',
  'Somewhat intoxicated by recent indulgence',
  'Smoothly persuasive and reasonable',
  'Visibly uncomfortable with the PCs',
  'Grossly overconfident in PC abilities',
  'Somewhat frightened by the PCs',
  "Deeply misunderstanding the PCs' culture",
  "Extremely well-informed about the PCs' past",
  'Distracted by their current situation',
] as const;

export interface GeneratedNPC {
  problem: string;
  trait: string;
  desire: string;
  role: string;
  background: string;
  age: string;
  motivation: string;
  want: string;
  power: string;
  hook: string;
  manner: string;
}

export function rollNPC(): GeneratedNPC {
  return {
    problem: rollOn(NPC_PROBLEM),
    trait: rollOn(NPC_TRAIT),
    desire: rollOn(NPC_DESIRE),
    role: rollOn(NPC_ROLE),
    background: rollOn(NPC_BACKGROUND),
    age: rollOn(NPC_AGE),
    motivation: rollOn(NPC_MOTIVATION),
    want: rollOn(NPC_WANT),
    power: rollOn(NPC_POWER),
    hook: rollOn(NPC_HOOK),
    manner: rollOn(NPC_MANNER),
  };
}

// ─── Adventure / Problem tables (pp. 184-189) ────────────────────────────────

export const CONFLICT_TYPE: readonly string[] = [
  'Money',
  'Revenge',
  'Power',
  'Natural Danger',
  'Religion',
  'Ideology',
  'Ethnicity',
  'Resources',
] as const;

export const CONFLICT_SITUATION: Record<string, readonly string[]> = {
  Money: [
    'Money is owed to a ruthless creditor',
    'Money was stolen from someone',
    'A sudden profit opportunity arises',
    "There's a hidden stash of wealth",
    'Money is offered from an evil source',
  ],
  Revenge: [
    'Someone was murdered',
    'Someone was stripped of rank',
    'Someone lost all their wealth',
    "Someone lost someone's love",
    'Someone was framed for a crime',
  ],
  Power: [
    'An influential political leader',
    'A stern community elder',
    'A ruling patriarch of a large family',
    'A star expert in a particular industry',
    'A criminal boss or outcast leader',
  ],
  'Natural Danger': [
    'A cyclical planetary phenomenon',
    'A sudden natural disaster',
    'Sudden loss of vital infrastructure',
    'Catastrophe from outside meddling',
    'Formerly-unknown planetary peril',
  ],
  Religion: [
    'Sects that hate each other bitterly',
    'Zealot reformers forcing new things',
    'Radical traditionalists fighting back',
    'Ethnic religious divisions',
    'Corrupt and decadent institutions',
  ],
  Ideology: [
    'A universally-despised fringe group',
    'Terrorists with widespread support',
    "A political party's goon squads",
    'Dead-end former regime supporters',
    'Ruthless ascendant political group',
  ],
  Ethnicity: [
    'A traditionally subordinate group',
    'An ethnic group from offworld',
    'A dominant caste or ethnicity',
    'An alien or transhuman group',
    'Two groups that hate each other',
  ],
  Resources: [
    "There's a cache of illegal materials",
    'A hidden strike of rare resources',
    'Cargo has been abandoned as lost',
    'Land ownership is disputed',
    'A resource is desperately necessary',
  ],
};

export const CONFLICT_FOCUS: Record<string, readonly string[]> = {
  Money: [
    'Organized crime wants it',
    'Corrupt officials want it',
    'A sympathetic NPC needs it',
    'The PCs are owed it',
    'It will disappear very soon',
  ],
  Revenge: [
    'It was wholly justified',
    'The wrong person is targeted',
    'The reaction is excessive',
    'The PCs are somehow blamed',
    'Both sides were wronged',
  ],
  Power: [
    "They've betrayed their own",
    "Someone's gunning for them",
    'They made a terrible choice',
    'They usurped their position',
    "They're oppressing their own",
  ],
  'Natural Danger': [
    'Anti-helpful bureaucrats',
    'Religious zealots panic',
    'Bandits and looters strike',
    'The government hushes it up',
    "There's money in exploiting it",
  ],
  Religion: [
    'Charismatic new leader',
    'Mandatory state religion',
    'Heavy foreign influence',
    'Religious purging underway',
    'Fighting for holy ground',
  ],
  Ideology: [
    'Terrorist attack',
    'Street rioting',
    'Police state crackdown',
    'Forced expulsions',
    'Territory under hostile rule',
  ],
  Ethnicity: [
    'Forced immigration',
    'Official ethnic ghettos',
    'Rigid separation of groups',
    'Group statuses have changed',
    'Rising ethnic violence',
  ],
  Resources: [
    'Someone thinks they own it',
    'The state is looking for it',
    'It has its own protectors',
    'Rights to it were stolen',
    'Offworlders want it badly',
  ],
};

export const RESTRAINT: readonly string[] = [
  'The government is cracking down on the conflict',
  'One side seems invincibly stronger to the other',
  'Both sides have "doomsday" info or devices',
  'A prior conflict ended horribly for both of them',
  'Foreign participants are keeping things tamped',
  'Elements of both sides seek accommodation',
  'The conflict is only viable in a narrow location',
  'Catastrophic cost of losing a direct showdown',
  "Each thinks they'll win without further exertion",
  'They expect a better opening to appear soon',
  'Former ties of friendship or family restrain them',
  'Religious principles are constraining them',
  "One side's still licking their wounds after a failure",
  "They're building up force to make sure they win",
  'Their cultural context makes open struggle hard',
  'They expect an outside power to hand them a win',
  "They're still searching for a way to get at their goal",
  "One side mistakenly thinks they've already won",
  'A side is busy integrating a recent success',
  'An outside power threatens both sides',
] as const;

export const TWIST: readonly string[] = [
  "There's a very sharp time limit for any resolution",
  'The sympathetic side is actually a bunch of bastards',
  'There\'s an easy but very repugnant solution to hand',
  'PC success means a big benefit to a hostile group',
  'The real bone of contention is hidden from most',
  "A sympathetic figure's on an unsympathetic side",
  "There's a profitable chance for PCs to turn traitor",
  'The "winner" will actually get in terrible trouble',
  "There's a very appealing third party in the mix",
  'The PCs could really profit off the focus of the strife',
  'The PCs are mistaken for an involved group',
  'Somebody plans on screwing over the PCs',
  'Both sides think the PCs are working for them',
  'A side wants to use the PCs as a distraction for foes',
  "The PCs' main contact is mistrusted by their allies",
  "If the other side can't get it, they'll destroy it",
  "The focus isn't nearly as valuable as both sides think",
  'The focus somehow has its own will and goals',
  'Victory will drastically change one of the sides',
  "Actually, there is no twist. It's all exactly as it seems.",
] as const;

export interface GeneratedAdventure {
  conflictType: string;
  situation: string;
  focus: string;
  restraint: string;
  twist: string;
}

export function rollAdventure(): GeneratedAdventure {
  const conflictType = rollOn(CONFLICT_TYPE);
  return {
    conflictType,
    situation: rollOn(CONFLICT_SITUATION[conflictType]),
    focus: rollOn(CONFLICT_FOCUS[conflictType]),
    restraint: rollOn(RESTRAINT),
    twist: rollOn(TWIST),
  };
}

// ─── Society / Culture tables (pp. 292-303) ──────────────────────────────────

// Origins (p. 297)
export const SOCIETY_ORIGIN_REASON: readonly string[] = [
  'Castaways',
  'Corporate factory world',
  'Ethnic or national purity',
  'Excavation site',
  'Exiles from Old Terra or a losing regime',
  'Exotic genotype designed for here',
  'Homeworld overpopulation',
  'Invasion force',
  'Liaison outpost',
  'Mandate malcontents',
  'Military outpost',
  'Political liberty',
  'Precious export',
  'Prison planet',
  'Refueling outpost',
  'Religious liberty',
  'Research outpost',
  'Rich natural resources',
  'Social liberty',
  'Trade hub',
] as const;

export const SOCIETY_LOCAL_RESOURCE: readonly string[] = [
  'Critical resources for making spike drives',
  'Nexus of interstellar spike drill routes',
  'Valuable alien tech relics or remnants',
  'Abundant food resources',
  'Important medical compound or extract',
  'Industry salvaged from a prior colony try',
  'Friendly alien population',
  'Valuable raw resources for luxury goods',
  'Local environment augments humans here',
  'Only semi-safe habitable place in system',
  'Raw materials to maintain TL5 industry',
  'Important Mandate naval base site',
] as const;

export const SOCIETY_OTHER_GROUPS: readonly string[] = [
  'There is no other meaningful group here',
  'The society has significant sub-groups',
  'The society is a unified world government',
  'The only rivals have been conquered here',
  'There are several minor rival nations here',
  'There is at least one major planetary rival',
  'Alliances exist of semi-equal rival nations',
  'There are dozens of significant societies',
] as const;

export const SOCIETY_PRIOR_CULTURES: readonly string[] = [
  'This culture has persisted since founding',
  "The culture's changed, but has continuity",
  'Founding group splintered, this is one heir',
  'Founding group collapsed and became this',
  'Founding group wiped out; new colonists',
  'Several founding groups before this one',
] as const;

export const SOCIETY_AGE: readonly string[] = [
  'An ancient First Wave colony',
  'Founded during the Second Wave',
  'Founded sometime around the Scream',
  'Founded within the past century',
] as const;

export const SOCIETY_REMNANTS: readonly string[] = [
  'Vital advanced tech was left behind',
  'Ritually-important religious centers',
  'Dangerous ruins of high-security areas',
  'Abandoned cities, now dangerous to enter',
  'Bunker-caches of stored valuables and tech',
  'Massive megastructures of strange purpose',
  'Terraforming tech that needs maintenance',
  'Ethnic group with a grudge of some kind',
  'Bloodline of former rulers, resentful now',
  'Ancient resource extraction facilities',
] as const;

// Rulers (pp. 299-300)
export const SOCIETY_RULER_CONFLICT: readonly string[] = [
  'Their taxation is intolerably high',
  'Crimes against the ruled are ignored',
  'They trample on cherished customs',
  'They hold the ruled in obvious contempt',
  'The law is designed to favor them greatly',
  'They have immunity to onerous taxes',
  'Disrespect for common religious belief',
  'They failed or are failing in a recent war',
  'They waste taxes and labor on vain things',
  'Ways to enter the class have been removed',
  'The rulers are all of a different ethnicity',
  'They have different basic moral values',
  'The rulers ignore rights when it\'s useful',
  'They deposed former popular rulers',
  'State connections are vital to all success',
  'They have fine ideas that ignore public will',
  'They have removed a prized ancient right',
  "They're seen as puppets of a hated group",
  'Their source of legitimacy is crumbling',
  'The leadership is deeply incompetent',
] as const;

export const SOCIETY_RULE_FORM: readonly string[] = [
  'Autocracy of a single popular ruler',
  'Corporatism among guilds/classes/corps',
  'Democracy, one sentient, one vote',
  'Feudalism, many near-free sub-rulers',
  'Hydraulic Despotism over a vital resource',
  'Military Dictatorship via martial force',
  'Monarchy, single ruler via bloodline',
  'Oligarchy of the society\'s powerful elite',
  'Republic of representative delegates',
  'Technocracy of intellectual elites',
  'Theocracy by the religious leadership',
  'Tribalism without structure beyond blood',
] as const;

export const SOCIETY_LEGITIMACY: readonly string[] = [
  'A glorious bloodline or honored family',
  'Control of overwhelming martial force',
  'Popular support among a wide class',
  'Loyalty of a major ethnic/religious group',
  'Social compact among the ruled groups',
  'Possession of pretech artifacts',
  'Religiously-legitimated sacredness',
  'Personal merit among the ruling class',
] as const;

export const SOCIETY_RULE_SECURITY: readonly string[] = [
  'The rulers teeter on the brink of collapse',
  'They seem likely to fall soon',
  'They\'ve recently overcome a real threat',
  'They have no serious threats to their rule',
  'No alternative is currently imaginable',
  'They\'ve ruled undisputed for ages',
] as const;

export const SOCIETY_RULE_COMPLETENESS: readonly string[] = [
  'All aspects of life are touched by the rulers',
  'The rulers firmly control the populace',
  'The rulers control only critical elements',
  'The rulers have little control of the ruled',
] as const;

export const SOCIETY_RULER_CLASS_CONFLICT: readonly string[] = [
  'Peripheral elites against the central power',
  'Old leadership group deposed by new one',
  'Dividing the profits of taxation or tribute',
  'Starting or stopping a current war',
  '"Reformists" with new ideas for control',
  'Sectarian religious groups struggle',
  'Expanding membership in the ruling class',
  'Enacting a major public building project',
  'Support for favored corporations/groups',
  'Dividing power and offices among them',
] as const;

// Ruled class (pp. 301)
export const SOCIETY_RULED_TREND: readonly string[] = [
  'The rich are mimicking the ruling style',
  'Coordinated tax evasion or smuggling',
  'Methodical bribery or suborning officials',
  'Popular agitation for war with a rival',
  'Radical pro-traditional social movement',
  'A communistic insurgency is rising',
  'Fascist groups are gaining support',
  'A large, restless youth population grows',
  'Demagogues promote group tensions',
  'Embrace of "self-improving" tech or ways',
  'An artificial group identity is now rising',
  'Serious and widespread drug addiction',
  'De-facto chattel debt slavery is spreading',
  'The rich oppose threatening tech advances',
  "A sub-group is resented as the ruler's pet",
  'A powerful colonial urge is in the populace',
  'A spirit of decadent ennui is pervasive',
  'Self-protection fraternities are spreading',
  'Internal disputes are becoming bloody',
  'Progressive loss of faith in their culture',
] as const;

export const SOCIETY_RULED_CLASS_CONFLICT: readonly string[] = [
  'Harsh conflict between economic strata',
  'Substantial ethnic conflict and disunity',
  'Drastic changes in the local economy',
  'Competition to enter the ruling class',
  'Secessionist traditions or urges in a group',
  'Religious differences provoke trouble',
  'Regional identities are in conflict',
  'Formerly prosperous group is embittered',
  'New economic opportunity is fought over',
  'Foreign influence is causing conflict',
  'A forceful social reform movement spreads',
  'An appealing mass delusion is growing',
] as const;

export const SOCIETY_RULED_LAST_THREAT: readonly string[] = [
  'A peasant uprising of discontented proles',
  'New technology embraced by bourgeois',
  'Religious schism threatening the state',
  'A dangerous popular demagogue arose',
  'Foreign-backed regional insurgency',
  'Civil war backing a deposed ruler or exile',
  'Mass reluctance to support a vital war',
  'A new political philosophy spread widely',
] as const;

export const SOCIETY_RULED_CONTENT: readonly string[] = [
  'There\'s an active insurgency or revolt',
  'They\'re going to revolt at any time',
  'Serious restiveness and regular troubles',
  'Generally content, with patches of trouble',
  'Widespread contentment or submission',
  'Only individual resistance, if even that',
] as const;

export const SOCIETY_RULED_UNIFORMITY: readonly string[] = [
  'They consider themselves a single group',
  'Two general groups or factions',
  'Many weakly-bounded sub-groups',
  'Many strong factions/ethnicities/classes',
] as const;

export const SOCIETY_RULED_POWER: readonly string[] = [
  'Strong guilds of common workers',
  'Powerful influence in the military',
  'Can get support from a rival power',
  'Local religion is largely on their side',
  'Their magnates have poor state relations',
  'Strong tradition of self-organized rule',
  'Keen unity in pursuit of their own interest',
  'A faction of the ruling class is their ally',
  "They control the state's income stream",
  'The rulers dread the threat of revolt',
] as const;

// Society Flavor (pp. 302-303)
export const SOCIETY_CULTURAL_FLAVOR: readonly string[] = [
  'Western European, specific or general',
  'Chinese, either modern or historical',
  'Japanese, unified or balkanized',
  'West or East African',
  'Indian, pre-Raj or contemporary',
  'Eastern European',
  'Ancient Egyptian or North African',
  'Ancient or Classical Mesopotamia',
  'Mesoamerican: Aztec, Maya, Inca, etc.',
  'Latin American, colonial or modern',
  'Southeast Asian or Polynesian',
  'Middle Eastern, pre- or post-Islamic',
] as const;

export const SOCIETY_QUIRKS: readonly string[] = [
  'Local credits are worthless offworld',
  'Weaponry is unusually unrestricted',
  'Structures are very sturdy and defensible',
  'There is no planetary computer network',
  'Travel passes are needed for outsiders',
  'Local tech is troublesomely unreliable',
  'Outsiders have to perform favors to stay',
  'Only outsiders can do certain jobs',
  'Trade requires local guild permissions',
  'Certain laws are suspended at certain times',
  'Only certain locals can talk to outsiders',
  'Sex or race segregation is strictly enforced',
  'Certain people are immune to legal action',
  'All visitors must obey the local faith',
  'Crimes can be commuted with cash fines',
  'The locals have bitter family vendettas',
  'Certain areas are strictly taboo for most',
  'Outsiders need a state minder with them',
  'There are addictive substances in the food',
  'Certain art is desired but forbidden here',
] as const;

export const SOCIETY_VIRTUE: readonly string[] = [
  'Honesty; they shun deceit and lies',
  'Justice; the law is even-handedly enforced',
  'Courage; they are undaunted by danger',
  'Mercy; they are forgiving to the penitent',
  'Loyalty; they never forsake their own',
  'Learning; they love knowledge of all kinds',
  'Peace; they shun violence if at all possible',
  'Ingenuity; swift to embrace useful novelty',
] as const;

export const SOCIETY_VICE: readonly string[] = [
  'Hedonism; loving pleasure too much',
  'Corruption; venal rulers and officials',
  'Deceit; sweet lies over sour truths',
  'Fecklessness; no will to carry out a duty',
  'Nihilism; they truly believe in very little',
  'Greed; they want what others have',
  'Conquest; they seek glory in imperial war',
  'Despair; they have no faith in the future',
  'Hatred; they are consumed with a hate',
  'Folly; they have a dangerously false idea',
] as const;

export const SOCIETY_XENOPHILIA: readonly string[] = [
  'Outsiders are distrusted and excluded',
  'Outsiders won\'t ever be "real" members',
  'Outsiders who try to blend can do so',
  'They welcome alien customs and people',
] as const;

export const SOCIETY_PATRON: readonly string[] = [
  'Official in need of deniable assets',
  'Underworld boss with a job for outsiders',
  'Outcast local whom no one else will help',
  'Local with wrong ideas about outsiders',
  'Secret agent of a rival planetary power',
  'Oppressed victim in need of outside help',
  "Outsider who can't get any local aid",
  'Wealthy trader with starport ties',
  'Religious leader with doubts about locals',
  'Society grandee who needs quiet assistance',
  'Military or police official with secret work',
  "Fixer who's an agent for one of the above",
] as const;

export interface GeneratedSociety {
  originReason: string;
  localResource: string;
  otherGroups: string;
  priorCultures: string;
  age: string;
  remnant: string;
  rulerConflict: string;
  ruleForm: string;
  legitimacy: string;
  ruleSecurity: string;
  ruleCompleteness: string;
  rulerClassConflict: string;
  ruledTrend: string;
  ruledClassConflict: string;
  ruledLastThreat: string;
  ruledContent: string;
  ruledUniformity: string;
  ruledPower: string;
  culturalFlavor: string;
  quirk: string;
  virtue: string;
  vice: string;
  xenophilia: string;
  patron: string;
}

export function rollSociety(): GeneratedSociety {
  return {
    originReason: rollOn(SOCIETY_ORIGIN_REASON),
    localResource: rollOn(SOCIETY_LOCAL_RESOURCE),
    otherGroups: rollOn(SOCIETY_OTHER_GROUPS),
    priorCultures: rollOn(SOCIETY_PRIOR_CULTURES),
    age: rollOn(SOCIETY_AGE),
    remnant: rollOn(SOCIETY_REMNANTS),
    rulerConflict: rollOn(SOCIETY_RULER_CONFLICT),
    ruleForm: rollOn(SOCIETY_RULE_FORM),
    legitimacy: rollOn(SOCIETY_LEGITIMACY),
    ruleSecurity: rollOn(SOCIETY_RULE_SECURITY),
    ruleCompleteness: rollOn(SOCIETY_RULE_COMPLETENESS),
    rulerClassConflict: rollOn(SOCIETY_RULER_CLASS_CONFLICT),
    ruledTrend: rollOn(SOCIETY_RULED_TREND),
    ruledClassConflict: rollOn(SOCIETY_RULED_CLASS_CONFLICT),
    ruledLastThreat: rollOn(SOCIETY_RULED_LAST_THREAT),
    ruledContent: rollOn(SOCIETY_RULED_CONTENT),
    ruledUniformity: rollOn(SOCIETY_RULED_UNIFORMITY),
    ruledPower: rollOn(SOCIETY_RULED_POWER),
    culturalFlavor: rollOn(SOCIETY_CULTURAL_FLAVOR),
    quirk: rollOn(SOCIETY_QUIRKS),
    virtue: rollOn(SOCIETY_VIRTUE),
    vice: rollOn(SOCIETY_VICE),
    xenophilia: rollOn(SOCIETY_XENOPHILIA),
    patron: rollOn(SOCIETY_PATRON),
  };
}

// ─── Religion / Alien-lens tables (pp. 208-209, 16944-16947) ──────────────────

// Built from the Conflict/Society religious conflict seeds + Alien lens "Faith"
// and the religion-conflict dice lines scattered in the book
export const RELIGION_ORIGIN: readonly string[] = [
  'Ancient faith surviving from the original colony',
  'Reformed version of an Old Terran religion',
  'Entirely new faith founded after the Scream',
  'Alien belief system adopted by humans',
  'Philosophical movement that became a religion',
  'State-sponsored faith enforced by law',
  'Underground faith suppressed by the government',
  'Merger of several older belief systems',
  'Cargo cult built around pretech or Mandate relics',
  'Revived ancient pre-colonial religion',
  'Sect that split from a larger faith centuries ago',
  'Faith created by a charismatic psion or visionary',
] as const;

export const RELIGION_LEADERSHIP: readonly string[] = [
  'Hereditary priesthood passed down bloodlines',
  'Elected council of senior clergy',
  'Single supreme leader, chosen by doctrine',
  'Decentralized; each congregation is autonomous',
  'Military order with a high commander',
  'Academic/scholarly hierarchy of theologians',
  'Spirit-possession or oracle determines leadership',
  'The state controls all clerical appointments',
] as const;

export const RELIGION_BELIEF_FOCUS: readonly string[] = [
  'Ancestor veneration and family piety',
  'Cosmic cycle of death and rebirth',
  'A personal savior or redeemer figure',
  'Strict moral law handed down by a deity',
  'Harmony with nature or the universe',
  'Seeking forbidden or sacred knowledge',
  'Ritual purity and avoidance of defilement',
  'Service to community and mutual aid',
  'Martial virtue and glorious sacrifice',
  'Mystical union with the divine',
  'Worship of the Mandate as godlike ancestors',
  'Psionics as divine gift — psychics as saints',
] as const;

export const RELIGION_ATTITUDE_TO_PSIONICS: readonly string[] = [
  'Psionics are sacred gifts from the divine',
  'Psionics are heretical and must be purged',
  'Psionics are natural, faith is unrelated',
  'Psychics are grudgingly tolerated clergy',
  'The faith is deeply divided on the matter',
  'Psionics are considered neutral or irrelevant',
] as const;

export const RELIGION_CURRENT_ISSUE: readonly string[] = [
  'Sects that hate each other bitterly',
  'Zealot reformers forcing new things',
  'Radical traditionalists fighting back',
  'Ethnic religious divisions within the faith',
  'Corrupt and decadent institution',
  'A charismatic new leader threatens the hierarchy',
  'Mandatory adoption by the state',
  'Heavy foreign missionary influence',
  'Religious purging of dissidents underway',
  'Fighting for control of a holy site',
  'A new scripture or prophecy is disputed',
  'A schism over the role of psionics',
] as const;

export const RELIGION_RELATIONSHIP_TO_STATE: readonly string[] = [
  'The religion IS the state — full theocracy',
  'State religion; tolerated rivals exist',
  'Completely separated from government',
  'Underground, actively persecuted',
  'Influential but not officially controlling',
  'Foreign faith; seen as subversive',
  'The faith is a major political party',
  'Recently elevated to official status',
] as const;

export const RELIGION_VIRTUE: readonly string[] = [
  'Obedience to divine law above all',
  'Compassion for the suffering',
  'Righteous zeal against evil',
  'Contemplative wisdom and study',
  'Martial courage in defense of the faithful',
  'Joyful celebration of existence',
  'Self-denial and ascetic discipline',
  'Community solidarity and mutual aid',
] as const;

export const RELIGION_TABOO: readonly string[] = [
  'Contact with specific substances or animals',
  'Eating certain foods at certain times',
  'Speaking or writing the true name of the divine',
  'Relations with outsiders or non-believers',
  'Use of certain technology as blasphemous',
  'Certain days or hours must be kept holy',
  'Psychic abilities are forbidden or required',
  'Depictions of divine figures are prohibited',
  'Violence — even self-defense — is banned',
  'Debt, interest, or certain forms of trade',
] as const;

export interface GeneratedReligion {
  origin: string;
  leadership: string;
  beliefFocus: string;
  attitudeToPsionics: string;
  currentIssue: string;
  relationshipToState: string;
  virtue: string;
  taboo: string;
}

export function rollReligion(): GeneratedReligion {
  return {
    origin: rollOn(RELIGION_ORIGIN),
    leadership: rollOn(RELIGION_LEADERSHIP),
    beliefFocus: rollOn(RELIGION_BELIEF_FOCUS),
    attitudeToPsionics: rollOn(RELIGION_ATTITUDE_TO_PSIONICS),
    currentIssue: rollOn(RELIGION_CURRENT_ISSUE),
    relationshipToState: rollOn(RELIGION_RELATIONSHIP_TO_STATE),
    virtue: rollOn(RELIGION_VIRTUE),
    taboo: rollOn(RELIGION_TABOO),
  };
}

// ─── Name tables (pp. 243-248) ────────────────────────────────────────────────

export type Culture =
  | 'Arabic'
  | 'Chinese'
  | 'English'
  | 'Greek'
  | 'Indian'
  | 'Japanese'
  | 'Latin'
  | 'Nigerian'
  | 'Russian'
  | 'Spanish';

export interface NameTable {
  male: readonly string[];
  female: readonly string[];
  surname: readonly string[];
  place: readonly string[];
}

export const NAME_TABLES: Record<Culture, NameTable> = {
  Arabic: {
    male: ['Aamir','Ayub','Binyamin','Efraim','Ibrahim','Ilyas','Ismail','Jibril','Jumanah','Kazi','Lut','Matta','Mohammed','Mubarak','Mustafa','Nazir','Rahim','Reza','Sharif','Taimur','Usman','Yakub','Yusuf','Zakariya','Zubair'],
    female: ['Aisha','Alimah','Badia','Bisharah','Chanda','Daliya','Fatimah','Ghania','Halah','Kaylah','Khayrah','Layla','Mina','Munisa','Mysha','Naimah','Nissa','Nura','Parveen','Rana','Shalha','Suhira','Tahirah','Yasmin','Zulehka'],
    surname: ['Abdel','Awad','Dahhak','Essa','Hanna','Harbi','Hassan','Isa','Kasim','Katib','Khalil','Malik','Mansoor','Mazin','Musa','Najeeb','Namari','Naser','Rahman','Rasheed','Saleh','Salim','Shadi','Sulaiman','Tabari'],
    place: ['Adan','Ahsa','Andalus','Asmara','Asqlan','Baqubah','Basit','Baysan','Baytlahm','Bursaid','Dawhah','Giddah','Hibah','Hims','Karbala','Lacant','Magrit','Masqat','Misr','Muruni','Qabis','Riyadh','Sana','Tabuk','Yaman'],
  },
  Chinese: {
    male: ['Aiguo','Bohai','Chao','Dai','Dawei','Duyi','Fa','Fu','Gui','Hong','Jianyu','Kang','Li','Niu','Peng','Quan','Ru','Shen','Shi','Song','Tao','Xue','Yi','Yuan','Zian'],
    female: ['Biyu','Changying','Daiyu','Huidai','Huiliang','Jia','Jingfei','Lan','Liling','Liu','Meili','Niu','Peizhi','Qiao','Qing','Ruolan','Shu','Suyin','Ting','Xia','Xiaowen','Xiulan','Ya','Ying','Zhilan'],
    surname: ['Bai','Cao','Chen','Cui','Ding','Du','Fang','Fu','Guo','Han','Hao','Huang','Lei','Li','Liang','Liu','Long','Song','Tan','Tang','Wang','Wu','Xing','Yang','Zhang'],
    place: ['Andong','Anqing','Anshan','Chaoyang','Chaozhou','Chifeng','Dalian','Dunhuang','Fengtian','Fushun','Gansu','Ganzhou','Guizhou','Hunan','Jinan','Jingdezhen','Jinzhou','Kunming','Liaoning','Luzhou','Ningxia','Pingxiang','Qingdao','Shanxi','Taiyuan'],
  },
  English: {
    male: ['Adam','Albert','Alfred','Allan','Archibald','Arthur','Basil','Charles','Colin','Donald','Douglas','Edgar','Edmund','Edward','George','Harold','Henry','Ian','James','John','Lewis','Oliver','Philip','Richard','William'],
    female: ['Abigail','Anne','Beatrice','Blanche','Catherine','Charlotte','Claire','Eleanor','Elizabeth','Emily','Emma','Georgia','Harriet','Joan','Judy','Julia','Lucy','Lydia','Margaret','Mary','Molly','Nora','Rosie','Sarah','Victoria'],
    surname: ['Barker','Brown','Butler','Carter','Chapman','Collins','Cook','Davies','Gray','Green','Harris','Jackson','Jones','Lloyd','Miller','Roberts','Smith','Taylor','Thomas','Turner','Watson','White','Williams','Wood','Young'],
    place: ['Aldington','Appleton','Ashdon','Berwick','Bramford','Brimstage','Carden','Churchill','Clifton','Colby','Copford','Cromer','Davenham','Dersingham','Doverdale','Ferring','Gissing','Heydon','Holt','Hunston','Inkberrow','Isfield','Leigh','Maresfield','Worcester'],
  },
  Greek: {
    male: ['Alexander','Alexius','Anastasius','Christodoulos','Christos','Damian','Dimitris','Dysmas','Elias','Giorgos','Ioannis','Konstantinos','Lambros','Leonidas','Marcos','Miltiades','Nestor','Nikos','Orestes','Petros','Simon','Stavros','Theodore','Vassilios','Yannis'],
    female: ['Alexandra','Amalia','Callisto','Charis','Chloe','Dorothea','Elena','Eudoxia','Giada','Helena','Ioanna','Lydia','Melania','Melissa','Nika','Nikolina','Olympias','Philippa','Phoebe','Sophia','Theodora','Valentina','Valeria','Yianna','Zoe'],
    surname: ['Andreas','Argyros','Dimitriou','Floros','Gavras','Ioannidis','Katsaros','Kyrkos','Leventis','Makris','Metaxas','Nikolaidis','Pallis','Pappas','Petrou','Raptis','Simonides','Spiros','Stavros','Stephanidis','Stratigos','Terzis','Theodorou','Vasiliadis','Yannakakis'],
    place: ['Adramyttion','Ainos','Alikarnassos','Avydos','Dakia','Dardanos','Dekapoli','Dodoni','Efesos','Efstratios','Elefsina','Ellada','Epidavros','Evripos','Gavdos','Gytheio','Irakleio','Ithaki','Kallisto','Katerini','Kithairon','Lakonia','Lesvos','Megara','Thessalia'],
  },
  Indian: {
    male: ['Amrit','Ashok','Chand','Dinesh','Gobind','Harinder','Jagdish','Johar','Kurien','Lakshman','Madhav','Mahinder','Mohal','Narinder','Nikhil','Omrao','Prasad','Pratap','Ranjit','Sanjay','Shankar','Thakur','Vijay','Vipul','Yash'],
    female: ['Amala','Asha','Chandra','Devika','Esha','Gita','Indira','Indrani','Jaya','Jayanti','Kiri','Lalita','Malati','Mira','Mohana','Neela','Nita','Rajani','Sarala','Sarika','Sheela','Sunita','Trishna','Usha','Vasanta'],
    surname: ['Achari','Banerjee','Bhatnagar','Bose','Chauhan','Chopra','Das','Dutta','Gupta','Johar','Kapoor','Mahajan','Malhotra','Mehra','Nehru','Patil','Rao','Saxena','Shah','Sharma','Singh','Trivedi','Venkatesan','Verma','Yadav'],
    place: ['Ahmedabad','Alipurduar','Ankleshwar','Balarika','Bhilwada','Brahmaghosa','Bulandshahar','Chandragiri','Chittorgarh','Dayabasti','Gandhidham','Guwahati','Indraprastha','Jaisalmer','Karnataka','Lalgola','Nainital','Nandidurg','Panipat','Pathankot','Porbandar','Rajasthan','Renigunta','Siliguri','Tinpahar'],
  },
  Japanese: {
    male: ['Akira','Daisuke','Fukashi','Goro','Hiro','Hiroya','Hotaka','Katsu','Katsuto','Keishuu','Kyuuto','Mikiya','Mitsunobu','Mitsuru','Naruhiko','Nobu','Shigeo','Shigeto','Shou','Shuji','Takaharu','Teruaki','Tetsushi','Tsukasa','Yasuharu'],
    female: ['Aemi','Airi','Ako','Ayu','Chikaze','Eriko','Hina','Kaori','Keiko','Kyouka','Mayumi','Miho','Namiko','Natsu','Nobuko','Rei','Ririsa','Sakimi','Shihoko','Shika','Tsukiko','Tsuzune','Yoriko','Yorimi','Yoshiko'],
    surname: ['Abe','Arakaki','Endo','Fujiwara','Goto','Ito','Kikuchi','Kinjo','Kobayashi','Koga','Komatsu','Maeda','Nakamura','Narita','Ochi','Oshiro','Saito','Sakamoto','Sato','Suzuki','Takahashi','Tanaka','Watanabe','Yamamoto','Yamasaki'],
    place: ['Bando','Chikuma','Chikusei','Chino','Hitachi','Hitachinaka','Hitachiomiya','Hitachiota','Iida','Iiyama','Ina','Inashiki','Ishioka','Itako','Kamisu','Kasama','Kashima','Kasumigaura','Kitaibaraki','Kiyose','Koga','Komagane','Mito','Mitsukaido','Moriya'],
  },
  Latin: {
    male: ['Agrippa','Appius','Aulus','Caeso','Decimus','Faustus','Gaius','Gnaeus','Hostus','Lucius','Mamercus','Manius','Marcus','Mettius','Nonus','Numerius','Opiter','Paulus','Proculus','Publius','Quintus','Servius','Tiberius','Titus','Volescus'],
    female: ['Appia','Aula','Caesula','Decima','Fausta','Gaia','Gnaea','Hosta','Lucia','Maio','Marcia','Maxima','Mettia','Nona','Numeria','Octavia','Postuma','Prima','Procula','Septima','Servia','Tertia','Tiberia','Titia','Vibia'],
    surname: ['Antius','Aurius','Barbatius','Calidius','Cornelius','Decius','Fabius','Flavius','Galerius','Horatius','Julius','Juventius','Licinius','Marius','Minicius','Nerius','Octavius','Pompeius','Quinctius','Rutilius','Sextius','Titius','Ulpius','Valerius','Vitellius'],
    place: ['Abilia','Alsium','Aquileia','Argentoratum','Ascrivium','Asculum','Attalia','Barium','Batavorum','Belum','Bobbium','Brigantium','Burgodunum','Camulodunum','Clausentum','Corduba','Coriovallum','Durucobrivis','Eboracum','Emona','Florentia','Lactodurum','Londinium','Lugdunum','Roma'],
  },
  Nigerian: {
    male: ['Adesegun','Akintola','Amabere','Arikawe','Asagwara','Chidubem','Chinedu','Chiwetei','Damilola','Esangbedo','Ezenwoye','Folarin','Genechi','Idowu','Kelechi','Ketanndu','Melubari','Nkanta','Obafemi','Olatunde','Olumide','Tombari','Udofia','Uyoata','Uzochi'],
    female: ['Abike','Adesuwa','Adunola','Anguli','Arewa','Asari','Bisola','Chioma','Eduwa','Emilohi','Fehintola','Folasade','Mahparah','Minika','Nkolika','Nkoyo','Nuanae','Obioma','Olafemi','Shanumi','Sominabo','Suliat','Tariere','Temedire','Yemisi'],
    surname: ['Adegboye','Adeniyi','Adeyeku','Adunola','Agbaje','Akpan','Akpehi','Aliki','Asuni','Babangida','Ekim','Ezeiruaku','Fabiola','Fasola','Nwokolo','Nzeocha','Ojo','Okonkwo','Okoye','Olaniyan','Olawale','Olumese','Onajobi','Soyinka','Yamusa'],
    place: ['Abadan','Ador','Agatu','Akamkpa','Akpabuyo','Ala','Askira','Bakassi','Bama','Bayo','Bekwara','Biase','Boki','Buruku','Calabar','Chibok','Damboa','Dikwa','Etung','Gboko','Gwoza','Hawul','Ikom','Jere','Makurdi'],
  },
  Russian: {
    male: ['Aleksandr','Andrei','Arkady','Boris','Dmitri','Dominik','Grigory','Igor','Ilya','Ivan','Kiril','Konstantin','Leonid','Nikolai','Oleg','Pavel','Petr','Sergei','Stepan','Valentin','Vasily','Viktor','Yakov','Yegor','Yuri'],
    female: ['Aleksandra','Anastasia','Anja','Catarina','Devora','Dima','Ekaterina','Eva','Irina','Karolina','Katlina','Kira','Ludmilla','Mara','Nadezdha','Nastassia','Natalya','Oksana','Olena','Olga','Sofia','Svetlana','Tatyana','Vilma','Yelena'],
    surname: ['Abelev','Bobrikov','Chemerkin','Gogunov','Gurov','Iltchenko','Kavelin','Komarov','Korovin','Kurnikov','Lebedev','Litvak','Mekhdiev','Muraviov','Nikitin','Ortov','Peshkov','Romasko','Shvedov','Sikorski','Stolypin','Turov','Volokh','Zaitsev','Zhukov'],
    place: ['Amur','Arkhangelsk','Astrakhan','Belgorod','Bryansk','Chelyabinsk','Chita','Gorki','Irkutsk','Ivanovo','Kaliningrad','Kaluga','Kamchatka','Kemerovo','Kirov','Kostroma','Kurgan','Kursk','Leningrad','Lipetsk','Magadan','Moscow','Murmansk','Novgorod','Novosibirsk'],
  },
  Spanish: {
    male: ['Alejandro','Alonso','Amelio','Armando','Bernardo','Carlos','Cesar','Diego','Emilio','Estevan','Felipe','Francisco','Guillermo','Javier','Jose','Juan','Julio','Luis','Pedro','Raul','Ricardo','Salvador','Santiago','Valeriano','Vicente'],
    female: ['Adalina','Aleta','Ana','Ascencion','Beatriz','Carmela','Celia','Dolores','Elena','Emelina','Felipa','Inez','Isabel','Jacinta','Lucia','Lupe','Maria','Marta','Nina','Paloma','Rafaela','Soledad','Teresa','Valencia','Zenaida'],
    surname: ['Arellano','Arispana','Borrego','Carderas','Carranzo','Cordova','Enciso','Espejo','Gavilan','Guerra','Guillen','Huertas','Illan','Jurado','Moretta','Motolinia','Pancorbo','Paredes','Quesada','Roma','Rubiera','Santoro','Torrillas','Vera','Vivero'],
    place: ['Aguascebas','Alcazar','Barranquete','Bravatas','Cabezudos','Calderon','Cantera','Castillo','Delgadas','Donablanca','Encinetas','Estrella','Faustino','Fuentebravia','Gafarillos','Gironda','Higueros','Huelago','Humilladero','Illora','Isabela','Jandilla','Jinetes','Limones','Loreto'],
  },
};

export function rollName(culture: Culture, gender: 'male' | 'female' | 'random' = 'random'): {
  given: string;
  surname: string;
  gender: 'male' | 'female';
} {
  const table = NAME_TABLES[culture];
  const resolvedGender: 'male' | 'female' =
    gender === 'random' ? (Math.random() < 0.5 ? 'male' : 'female') : gender;
  return {
    given: rollOn(table[resolvedGender]),
    surname: rollOn(table.surname),
    gender: resolvedGender,
  };
}

export function rollRandomName(gender: 'male' | 'female' | 'random' = 'random'): {
  culture: Culture;
  given: string;
  surname: string;
  gender: 'male' | 'female';
} {
  const cultures = Object.keys(NAME_TABLES) as Culture[];
  const culture = rollOn(cultures);
  const result = rollName(culture, gender);
  return { culture, ...result };
}
