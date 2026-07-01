/**
 * Alien species creation rules and reference data.
 * Source: Stars Without Number Revised, pp. 202–213.
 *
 * Alien PC rules: spend the free focus pick on an origin focus representing
 * your alien species. See foci.ts for built-in example alien origin foci.
 * GMs should construct custom foci from the AlienBenefit menu below.
 */

export type AlienLens =
  | 'Collectivity'
  | 'Curiosity'
  | 'Despair'
  | 'Domination'
  | 'Faith'
  | 'Fear'
  | 'Gluttony'
  | 'Greed'
  | 'Hate'
  | 'Honor'
  | 'Journeying'
  | 'Joy'
  | 'Pacifism'
  | 'Pride'
  | 'Sagacity'
  | 'Subtlety'
  | 'Tradition'
  | 'Treachery'
  | 'Tribalism'
  | 'Wrath';

export type AlienBodyType =
  | 'Avian'
  | 'Reptilian'
  | 'Insectile'
  | 'Mammalian'
  | 'Exotic'
  | 'Hybrid';

export type AlienSocialStructure =
  | 'Democratic'
  | 'Monarchic'
  | 'Tribal'
  | 'Oligarchic'
  | 'Multipolar Competitive'
  | 'Multipolar Cooperative';

/**
 * Alien PC benefits — each origin focus is built from 2 (or 3 minor) of these.
 * Source: p.213.
 */
export interface AlienBenefit {
  name: string;
  description: string;
  isMajor: boolean; // major = counts as 1 of the 2; minor = 2 minors can combine for 1 pick
}

export const ALIEN_BENEFITS: AlienBenefit[] = [
  {
    name: 'Aptitude for Violence',
    description: 'Gain a +1 bonus to your normal attack bonus. A 1st-level Expert alien has +1 attack, a Warrior has +2.',
    isMajor: true,
  },
  {
    name: 'Environmental Native',
    description: 'Survive in a relatively common hostile environment (underwater, hard vacuum, lethal radiation, etc.). Minor perk if it requires that environment to live.',
    isMajor: false,
  },
  {
    name: 'Innate Ability',
    description: 'One or more natural abilities beyond human: perfect darkvision, tracking by scent, wireless tech interfacing, no food/water need, etc. Equivalent to 2–3 pieces of equipment, or a single psionic technique with 1 Effort to fuel it.',
    isMajor: true,
  },
  {
    name: 'Natural Defenses',
    description: 'Hard shell or sharp talons. Base AC = 15 + half character level (rounded up). Body weapons (claws/fangs) count as medium advanced melee weapons. Weaponry alone may count as minor.',
    isMajor: true,
  },
  {
    name: 'Origin Skill',
    description: 'All members excel at something — gain an appropriate bonus skill. Combat races may pick from Punch, Shoot, or Stab.',
    isMajor: false,
  },
  {
    name: 'Psychic Aptitude',
    description: 'Must be a Psychic or take Partial Psychic class option. Maximum Effort increased by 1.',
    isMajor: true,
  },
  {
    name: 'Shapeshifting',
    description: 'Amoeboid pseudopod manipulation (minor), or actual mimicry of other species/objects (major, equivalent to biopsionic shapeshifting or restricted shape library).',
    isMajor: true,
  },
  {
    name: 'Strong Attribute',
    description: 'One attribute gains a +1 bonus to its modifier, up to a maximum of +3. E.g., STR 10 → modifier +1 instead of +0.',
    isMajor: false,
  },
  {
    name: 'Tough',
    description: 'The first hit die rolled always counts as maximum. At 1st level a Warrior alien starts with 8 HP. Further hit dice that roll a 1 are rerolled.',
    isMajor: true,
  },
  {
    name: 'Unusual Movement Mode',
    description: 'Fly under normal gravity, make short-range teleportation hops, or climb sheer walls at normal Move speed. Used as the Move action.',
    isMajor: true,
  },
  {
    name: 'Useful Immunity',
    description: 'Impervious to a relatively common threat. Significant immunity (bullets, lasers, melee) = major. Minor threats (toxins, disease, radiation, fall damage) = minor perk.',
    isMajor: false,
  },
];

/**
 * Alien body plan descriptors for GM reference (p.205).
 */
export const ALIEN_BODY_PLANS: string[] = [
  'Humanoid',
  'Quadruped',
  'Many-legged',
  'Bulbous',
  'Amorphous',
];

export const ALIEN_LIMB_NOVELTIES: string[] = [
  'Wings',
  'Many joints',
  'Tentacles',
  'Opposable thumbs',
  'Retractable',
  'Varying sizes',
];

export const ALIEN_SKIN_NOVELTIES: string[] = [
  'Hard shell',
  'Exoskeleton',
  'Odd texture',
  'Molts regularly',
  'Harmful to touch',
  'Wet or slimy',
];

export const ALIEN_WEAPONS_NATURAL: string[] = [
  'Teeth or mandibles',
  'Claws',
  'Poison',
  'Harmful discharge',
  'Pincers',
  'Horns',
];

export const ALIEN_SIZES: string[] = [
  'Cat-sized',
  'Wolf-sized',
  'Calf-sized',
  'Bull-sized',
  'Hippo-sized',
  'Elephant-sized',
];

/**
 * Alien psychology Lenses — d20 table (p.208).
 * A Like alien race is typically defined by 1–2 Lenses.
 */
export const ALIEN_LENSES: Record<AlienLens, string> = {
  Collectivity: 'Hive-like social structure; individual importance is minimal; willingly sacrifice for the group; separation from collective is a fate worse than death.',
  Curiosity: 'Insatiably curious; spying carries no opprobrium; love to explore; societies operate transparently; secrets are suspicious.',
  Despair: 'Pervasive sense of failure and loss; survivors of catastrophe; leadership is desultory; social structures degrade over time.',
  Domination: 'Consumed by desire to conquer and rule; intricate hierarchies; constantly testing leaders; advancement through strength and cunning.',
  Faith: 'Driven by religious concerns; society organized around faith and clergy; challenges met with blank incomprehension rather than outrage.',
  Fear: 'Live in constant fear; societies based on hiding/protecting; most revered are best protected; can be driven into a berserk terror-frenzy.',
  Gluttony: 'Rapacious consumers; devour resources, space, energy; greatest respect for those with most stockpiles; all existence is devouring.',
  Greed: 'Enormously greedy; status depends on personal wealth; society either production-focused or predatory bandits with intricate property laws.',
  Hate: 'Defined by opposition to something — xenophobes, religious divisions, ancient enemy; all goals subordinated to immortal hate.',
  Honor: 'Obsessed with honorable behavior; personal sacrifice for principles earns glory; gaining advantage dishonorably is shameful; prefer death to dishonor.',
  Journeying: 'Incurable wanderlust; steady circuits of nearby stars; nomadic; never happy staying in one place for long.',
  Joy: 'Relentless bon vivants; constantly pursuing pleasure; beauty and grace are highest virtues; loosely-organized; sacrifice efficiency for immediate satisfaction.',
  Pacifism: 'Remarkably peaceful; never choose violence as a means; violence is abhorrent; use economic, property, and incitement tools instead.',
  Pride: 'Enormous pride in culture and species; consider themselves superior; may have noblesse oblige or casual contempt for "lessers".',
  Sagacity: 'Love intellectual pursuits above all; logic, wisdom, erudition are prized; sage-kings rule; stupidity is a moral failing.',
  Subtlety: 'Enormously cunning and patient; endure years of suffering for intricate plans; shun open display of emotion; true ruler almost never obvious.',
  Tradition: 'Devoutly revere the past; stiffly ritualized interactions; innovations viewed with deep suspicion; personal initiative shown only in genuinely novel situations.',
  Treachery: 'Uniformly treacherous; bargains kept only while useful; truthfulness is just another tool; no acrimony at inevitable betrayals.',
  Tribalism: 'Fiercely tribal; loyalty to tribe before species; tribes frequently at war with each other; often exploitable via internal division.',
  Wrath: 'Hot-tempered; disputes settled by force; swift bloody retaliation for insults; anger is their chief emotional expression.',
};

/**
 * Social structure options for alien governments (p.211).
 */
export const ALIEN_SOCIAL_STRUCTURES: Record<AlienSocialStructure, string> = {
  'Democratic': 'Broadly democratic; individual members have a formal say; politics revolve around persuasion and diplomacy.',
  'Monarchic': 'Ruled by a single being; justified by custom, biology, divine mandate, personal influence, or family ties; noble caste as administrators.',
  'Tribal': 'Multiple tribes based on lineage, philosophy, or geography; tribes set their own laws; leaders are personally distinguished.',
  'Oligarchic': 'Led by a number of powerful or revered figures in nominal harmony; inheritance or aspiration to join oligarchs.',
  'Multipolar Competitive': 'Multiple leadership organizations actively in competition or conflict.',
  'Multipolar Cooperative': 'Multiple leadership organizations operating in parallel, each covering different domains.',
};

/**
 * Alien species record for the app — combines lenses, body, benefits, and focus.
 * The actual PC rules are in foci.ts (origin focus). This is reference data.
 */
export interface AlienSpecies {
  name: string;
  bodyType: AlienBodyType;
  lenses: AlienLens[];
  socialStructure: AlienSocialStructure;
  techLevel: number;          // 1–5; most are TL4
  benefits: string[];         // Names of AlienBenefit entries making up their focus
  notes: string;
  originFocusName?: string;   // Matches a focus name in foci.ts, if applicable
}

/**
 * Example alien species — GMs should create their own using the tools above.
 * These are templates/starters, not canon races.
 */
export const EXAMPLE_ALIEN_SPECIES: AlienSpecies[] = [
  {
    name: 'Vree-Tak (Proud Warrior Species)',
    bodyType: 'Reptilian',
    lenses: ['Honor', 'Wrath'],
    socialStructure: 'Tribal',
    techLevel: 4,
    benefits: ['Aptitude for Violence', 'Origin Skill'],
    notes: 'A reptilian warrior culture that prizes personal honor and swift retribution for insults. Their tribal wars rarely produce lasting casualties but are frequent. As PCs, they tend toward Warrior or Partial Warrior builds.',
    originFocusName: 'Alien: Warrior Species',
  },
  {
    name: 'Lur-Anseth (Psychically Gifted)',
    bodyType: 'Avian',
    lenses: ['Sagacity', 'Curiosity'],
    socialStructure: 'Oligarchic',
    techLevel: 4,
    benefits: ['Psychic Aptitude', 'Origin Skill'],
    notes: 'Feathered avians with natural MES sensitivity. Their oligarchy of sage-lords runs a network of psychic academies. As PCs, they must be Psychic or Partial Psychic.',
    originFocusName: 'Alien: Psychically Gifted',
  },
  {
    name: 'Mok-Tur (Tough Species)',
    bodyType: 'Mammalian',
    lenses: ['Domination', 'Pride'],
    socialStructure: 'Monarchic',
    techLevel: 4,
    benefits: ['Tough', 'Strong Attribute'],
    notes: 'Large, heavily-built beings who view strength as the ultimate virtue. Their monarchy has ruled for millennia through sheer force of personality and combat prowess. As PCs, they always start with maximum first-level HP.',
    originFocusName: 'Alien: Strong Species',
  },
];
