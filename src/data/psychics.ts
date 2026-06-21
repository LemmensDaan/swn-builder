export interface PsychicTechnique {
  name: string;
  level: number;
  description: string;
}

export interface PsychicDiscipline {
  skill: string;
  name: string;
  description: string;
  coreTechnique: {
    name: string;
    levels: string[];
  };
  techniques: PsychicTechnique[];
}

export const PSYCHIC_DISCIPLINES: PsychicDiscipline[] = [
  {
    skill: 'Biopsionics',
    name: 'Biopsionics',
    description: 'Powers of physical repair, body augmentation, and damage to living creatures. The adept must be able to touch a target (or use Remote Repair). Widely accepted as a beneficial discipline.',
    coreTechnique: {
      name: 'Psychic Succor',
      levels: [
        'Level 0: Automatically stabilize a mortally-wounded target as a Main Action (within 6 rounds of collapse, not decapitated/Heavy weapon killed). Each use adds 1 System Strain to the target (2 if mortally wounded at the time).',
        'Level 1: As level-0, and heal 1d6+1 hit points. Mortally-wounded targets revive with rolled HP.',
        'Level 2: As level-1, but healing 2d6+2 hit points.',
        'Level 3: As level-2, but healing 2d6+6 hit points.',
        'Level 4: As level-3, but healing 3d6+8 hit points.',
      ],
    },
    techniques: [
      { name: 'Mastered Succor', level: 1, description: 'Psychic Succor no longer requires Committing Effort to activate.' },
      { name: 'Organic Purification Protocols', level: 1, description: 'Psychic Succor now cures poisons or diseases (extra Effort surcharge). May require a skill check for severe afflictions.' },
      { name: 'Remote Repair', level: 1, description: 'Biopsionics that normally require touch can be applied up to 100 meters away (must see target). Commit Effort for the scene each use.' },
      { name: 'Invincible Stand', level: 2, description: 'As an Instant action, Commit Effort for the scene to keep self or touched target active at zero HP. Must maintain each round.' },
      { name: 'Major Organ Restoration', level: 2, description: 'Psychic Succor can now cure congenital defects, regrow missing limbs/organs, and stabilize targets dropped by Heavy weapons.' },
      { name: 'Tissue Integrity Field', level: 2, description: 'Psychic Succor may affect all allies within 10 meters of the target (each may decline). Extra Effort for the day.' },
      { name: 'Accelerated Succor', level: 3, description: 'Psychic Succor can be used as an On Turn action (once per round). With extra Effort, as an Instant action.' },
      { name: 'Metamorph', level: 3, description: 'Transform a touched willing target into any humanoid form (within 50% mass). Impersonate to DNA level with a sample. Commit Effort while maintained.' },
      { name: 'Teratic Overload', level: 3, description: 'Touched target suffers 1d6 damage per Biopsionics skill and must make a Physical save; on a failure the damage is tripled and they are afflicted with a lethal cancer (1d6 months to kill, treatable at a TL4 hospital within a month). Commit Effort for the scene. Committing Effort for the day instead does no HP damage but creates subtle tumors. Usable on a given target only once per scene.' },
      { name: 'Holistic Optimization Patterning', level: 4, description: 'Boost self or touched ally for rest of scene: +2 STR/DEX checks, hit rolls, damage rolls; 20 extra hit points. Costs 2 System Strain. Commit Effort for the day.' },
      { name: 'Quintessential Reconstruction', level: 4, description: 'If killed, regenerate from largest body fragment over 24 hours. Each use inflicts 1 permanent attribute point loss.' },
    ],
  },
  {
    skill: 'Metapsionics',
    name: 'Metapsionics',
    description: 'The rarest discipline — controlling psychic energy itself. Metapsions can increase Effort, teach other psychics, and act as brainguards against undetectable psychic assault.',
    coreTechnique: {
      name: 'Psychic Refinement',
      levels: [
        'Level 0: Visually/audibly detect psychic power use. +2 bonus on saving throws vs psionic powers.',
        'Level 1: Maximum Effort increases by 1.',
        'Level 2: Determine whether a person is psychic through one round of visual inspection. Saving throw bonus vs psionics increases to +3.',
        'Level 3: Maximum Effort increases by 1.',
        'Level 4: Safer torching — instead of rolling the torching die, suffer 10 hit points of damage (not healable except by bed rest).',
      ],
    },
    techniques: [
      { name: 'Cloak Powers', level: 1, description: 'Conceal your psychic abilities from metapsionic detection. Commit Effort while cloaking. Contested by equal/higher Metapsionics skill.' },
      { name: 'Mindtracing', level: 1, description: 'Commit Effort for the scene as an Instant to trace back use of psionic powers you\'ve noticed, briefly sharing the user\'s senses and learning their location.' },
      { name: 'Synthetic Adaptation', level: 1, description: 'Requires Program-0 or Fix-0. Synergize with VI or True AI to apply Telepathy or Biopsionics to their inanimate corpus. System Strain costs go to the adept.' },
      { name: 'Neural Trap', level: 2, description: 'When targeted by a hostile psionic power allowing a save, Commit Effort and voluntarily fail the save. Your next psychic attack on that assailant allows no save.' },
      { name: 'Psychic Static', level: 2, description: 'As an Instant action, Commit Effort for the day to negate a perceived psychic power. Opposing psychic may counter-spend Effort. Can only be applied once per round to any given power.' },
      { name: 'Suspended Manifestation', level: 2, description: '"Hang" a psychic power in your brain until triggered. Commit Effort for the day plus normal activation cost. Activating is Instant (or On Turn if target gets a save).' },
      { name: 'Concert of Minds', level: 3, description: 'As an On Turn, form a psychic gestalt with up to Metapsionics-skill-level willing psychics within 3 meters. Any member may use any other member\'s known powers and techniques.' },
      { name: 'Metadimensional Friction', level: 3, description: 'Create MES turbulence around a visible target psychic within 200m. Each time they Commit Effort, they suffer 1d8 per Metapsionics skill damage. Mental save each round to end effect.' },
      { name: 'Psychic Tutelage', level: 3, description: 'Train up to 10 pupils simultaneously (100 at level-4). Can safely develop untrained psychics. Requires weeks to months of training.' },
      { name: 'Surge Momentum', level: 3, description: 'Commit Effort for the day when using a power that grants a saving throw. Target suffers penalty equal to Metapsionics skill on the save. Auto-fail if target\'s HD are less than half your level.' },
      { name: 'Flawless Mastery', level: 4, description: 'Choose one known technique — it no longer requires Effort. If duration-based, lasts until you choose to end it or die. Can be changed with a month of practice. Only taken once.' },
      { name: 'Impervious Pavis of Will', level: 4, description: 'Choose a discipline — you become entirely immune to its unwanted powers. Commit Effort for the day to extend this immunity to allies within 50m for a scene. Can be learned multiple times.' },
    ],
  },
  {
    skill: 'Precognition',
    name: 'Precognition',
    description: 'Sensing future events and controlling probability. Readings are focused on what matters to the seer. Precogs are viewed with unease — their visions are provisional but powerful.',
    coreTechnique: {
      name: 'Oracle',
      levels: [
        'Level 0: One minute into the future.',
        'Level 1: One day into the future.',
        'Level 2: One week into the future.',
        'Level 3: Three months into the future.',
        'Level 4: One year into the future.',
      ],
    },
    techniques: [
      { name: 'Intuitive Response', level: 1, description: 'As an Instant, Commit Effort for the scene just before rolling initiative. Your initiative score is treated as one better than anyone else\'s (unless another has this ability).' },
      { name: 'Sense the Need', level: 1, description: 'As an Instant, Commit Effort for the day to retroactively declare you brought along any one object you could have reasonably acquired and carried.' },
      { name: 'Terminal Reflection', level: 1, description: 'Oracle triggers automatically moments before an unexpected danger, giving a brief vision of the impending hazard and negating surprise for you and companions.' },
      { name: 'Alternate Outcome', level: 2, description: 'As an Instant, Commit Effort for the day to allow a visible ally or yourself to reroll a failed hit roll, saving throw, or skill check. Only once per target per day.' },
      { name: 'Destiny\'s Shield', level: 2, description: 'As an Instant, Commit Effort for the day to force an attacker to reroll a successful hit against you. If it still hits, the damage done is maximized.' },
      { name: 'Anguished Vision', level: 3, description: 'As an Instant, Commit Effort for the day to declare what just happened was a vision of the immediate future. Time rolls back to the start of the initiative count. Only once per day.' },
      { name: 'Cursed Luck', level: 3, description: 'As a Main Action, Commit Effort for the scene. Target visible animate creature — they roll attacks, damage, skill checks, and saves twice and take the worst. Mental save each round to end.' },
      { name: 'Forced Outcome', level: 3, description: 'As a Main Action, Commit Effort for the scene to completely control any simple random mechanical outcome for the scene (roulette, shuffled cards). One unusual coincidence per scene max.' },
      { name: 'Not My Time', level: 4, description: 'Triggers automatically when you are about to die, provided you can Commit Effort for the day. Random events conspire to leave you alive for the next few minutes. Once per week.' },
      { name: 'Prophecy', level: 4, description: 'As a Main Action, make one prediction about your personal future within the next year. If you take reasonable measures and no direct resistance is mounted, it comes to pass. Once per month.' },
    ],
  },
  {
    skill: 'Telekinesis',
    name: 'Telekinesis',
    description: 'Remote control of kinetic energy to move objects and fabricate force constructs. Cannot directly manipulate objects held by mobile creatures or unwilling intelligent targets.',
    coreTechnique: {
      name: 'Telekinetic Manipulation',
      levels: [
        'Level 0: Exert force as with one hand and your own strength.',
        'Level 1: Manipulate with both hands; lift up to 200 kilograms.',
        'Level 2: Lift/manipulate up to 400 kilograms; smash a human-sized hole in light wooden structures.',
        'Level 3: Lift/manipulate up to 800 kilograms; affect as many individual objects as you have Telekinesis skill levels.',
        'Level 4: Manipulate up to 1 metric ton; smash human-sized holes in TL4-constructed exterior walls.',
      ],
    },
    techniques: [
      { name: 'Kinetic Transversal', level: 1, description: 'Commit Effort as an On Turn to move freely over vertical or overhanging surfaces, and over liquids at full movement rate.' },
      { name: 'Pressure Field', level: 1, description: 'As an Instant, manifest a protective force skin equivalent to a vacc suit. Ignore temperatures ±100°C, auto-pressurize thin atmospheres. Commit Effort for scene to extend to 6 comrades.' },
      { name: 'Telekinetic Armory', level: 1, description: 'As an On Turn, create weapons (TL4, any advanced melee or rifle; use Dex/Wis/Con modifier and Telekinesis as combat skill) and armor (AC 15 + Telekinesis skill) out of telekinetic force.' },
      { name: 'Impact Sump', level: 2, description: 'As an Instant, Commit Effort for the day to negate a single instance of physical damage (can trigger after damage is rolled). Once per day.' },
      { name: 'Slip Field', level: 2, description: 'As a Main Action, Commit Effort for the scene. Decrease friction in a visible 10-meter diameter area. Targets must Evasion save or fall prone and can barely move. Targets who save are immune to this technique for the scene.' },
      { name: 'Telekinetic Expertise', level: 2, description: 'You may now use Telekinetic Manipulation without Committing Effort.' },
      { name: 'Thermokinesis', level: 2, description: 'As a Main Action, Commit Effort for scene to melt, burn, freeze, or chill an inanimate object. Objects with hit points take 1d12 per Telekinesis skill.' },
      { name: 'Tangible Force Construct', level: 3, description: 'As an On Turn, Commit Effort for the scene to create a telekinetic force construct (up to 3-meter cube). Lasts until end of scene, 20 HP vs AC 15, as sturdy as TL4 construction.' },
      { name: 'Telekinetic Ram', level: 3, description: 'As a Main Action, Commit Effort for scene. Charge an enormous burst of force that detonates at end of next round (only works on immobile targets). Destroys civilian vehicles or deals 5d12 as Heavy weapon.' },
      { name: 'Reactive Telekinesis', level: 3, description: 'As an Instant, Commit Effort for scene when an assailant misses you with a physical attack. The attack reflects back against the assailant (reroll twice; hits deal their own damage to themselves).' },
      { name: 'Force Puppetry', level: 4, description: 'As a Main Action, Commit Effort for the day to suborn a visible target\'s mobility (vehicle, robot, or human, up to ground-car size). Control their physical actions using your skills. Lasts until end of scene.' },
      { name: 'Telekinetic Flight', level: 4, description: 'As an Instant, Commit Effort to begin flying (twice normal movement rate). Extend to up to six unresisting human-sized allies within 30m. Can survive orbital insertions with vacc suit or Pressure Field.' },
    ],
  },
  {
    skill: 'Telepathy',
    name: 'Telepathy',
    description: 'Reading and influencing other sapient minds. The most feared and distrusted discipline. Telepathy is subtle — targets don\'t normally know they\'ve been scanned.',
    coreTechnique: {
      name: 'Telepathic Contact',
      levels: [
        'Level 0: Observe emotional states. Intense emotions provide a single word or image related to the feelings.',
        'Level 1: Shallow gestalt with target\'s language centers — understand any form of communication made by the target.',
        'Level 2: Read target\'s current thoughts (Mental save to resist; success means immune for the scene).',
        'Level 3: Drill into memory for a one/two-sentence answer to one question (Mental save; contact auto-ends after).',
        'Level 4: Full, nuanced awareness of everything the target can remember about a topic (Mental save; contact auto-ends after).',
      ],
    },
    techniques: [
      { name: 'Facile Mind', level: 1, description: 'Opening a Telepathic Contact only requires Effort for the scene instead of the day. With practiced allies (1 week training), no Effort needed. Commit for the day to open as an Instant action.' },
      { name: 'Transmit Thought', level: 1, description: 'Send thoughts and images over a Telepathic Contact, allowing two-way communication with a willing target as an Instant action.' },
      { name: 'Far Thought', level: 2, description: 'Activate Telepathic Contact on a previous contact when they are within 100km (Telepathy-3: 1000km; Telepathy-4: entire planet/orbit). Cannot use powers requiring a save through this link.' },
      { name: 'Suppress Cognition', level: 2, description: 'As a Main Action, Commit Effort for the scene. Make the contact target unable to think about one specific thing. Mental save to resist. Block dissolves if target perceives physical danger.' },
      { name: 'Reflex Response', level: 3, description: 'As a Main Action, Commit Effort for the day. Force a sudden irrational impulse into the contact target. Mental save to resist; on failure, they carry out the impulse on their next action.' },
      { name: 'Telepathic Assault', level: 3, description: 'As a Main Action, Commit Effort for the day. Send a wave of MES energy through the contact target — 6d6 damage (9d6 at Telepathy-4). Mental save for half. Cannot kill; renders unconscious at 0 HP for 1 hour.' },
      { name: 'Memory Editing', level: 4, description: 'As a Main Action, Commit Effort for the day. Make simple edits to contact target\'s memory — erase/create/change events of up to 24 hours. Mental save to resist editing for the scene.' },
      { name: 'Unity of Thought', level: 4, description: 'Weave up to 6 willing participants into a Telepathic Contact. Instant exchange of thoughts, sensory impressions, and location. All use best initiative. Each combat turn, one gestalt member of your choice (not you) gets an extra round of action.' },
    ],
  },
  {
    skill: 'Teleportation',
    name: 'Teleportation',
    description: 'Physical translocation of yourself and allies. Locations are fixed relative to the nearest gravity well. Teleporters can reach any location they\'ve ever occupied or can see.',
    coreTechnique: {
      name: 'Personal Apportation',
      levels: [
        'Level 0: Teleport up to 10 meters.',
        'Level 1: Teleport up to 100 meters.',
        'Level 2: Teleport up to 10 kilometers.',
        'Level 3: Teleport up to 1,000 kilometers.',
        'Level 4: Teleport anywhere on a planet\'s surface or near orbit.',
      ],
    },
    techniques: [
      { name: 'Proficient Apportation', level: 1, description: 'Personal Apportation counts as a Move action instead of a Main Action. Apportations of 10m or less no longer require Effort (augment costs still apply).' },
      { name: 'Spatial Awareness', level: 1, description: 'As an On Turn, Commit Effort for 360-degree awareness out to 100 meters — equivalent to sight but unimpeded by darkness, mist, holograms, or optical illusions.' },
      { name: 'Burdened Apportation', level: 2, description: 'Carry up to 3 willing human-sized companions per Teleportation skill level, or 200kg of inert matter per level. Increases Effort cost by 1 point for the day.' },
      { name: 'Perceptive Dislocation', level: 2, description: 'Commit Effort for the day to sense any location you could teleport to, perceiving it as if there for up to 15 minutes.' },
      { name: 'Spatial Synchrony Mandala', level: 2, description: 'Imprint an object/person (1 hour meditation). Always know its exact location and can teleport to within 3m of it even if it has moved. One object at a time.' },
      { name: 'Effortless Apportation', level: 3, description: 'Personal Apportation no longer requires Committing Effort. Augment costs that add extra Effort must still be paid.' },
      { name: 'Stutterjump', level: 3, description: 'As an On Turn, Commit Effort for micro-teleport defensive shifting: base AC 20 while Effort is committed. Once per day as an Instant, negate a successful hit (leaves you outside area-effects).' },
      { name: 'Rift Reduplication', level: 3, description: 'Commit an extra Effort for the day as an Instant to use Personal Apportation as an On Turn even if already used this round. Allows lightning-strike maneuvers.' },
      { name: 'Deep Intrusion', level: 4, description: 'Use Personal Apportation to blind-teleport into a visible building, vehicle, or starship. Intuitively seek a safe space within. Costs an extra Effort point for the day.' },
      { name: 'Offensive Apportation', level: 4, description: 'As a Main Action, teleport an unwilling touched target. Touching a resisting enemy requires a Punch hit roll + Teleportation skill. Conscious targets may Mental save at -Teleportation penalty to abort.' },
    ],
  },
];
