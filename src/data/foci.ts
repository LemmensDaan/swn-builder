import type { Skill, PsychicSkill } from './skills';

export interface FocusLevel {
  description: string;
  bonusSkill?: Skill | PsychicSkill;
}

export interface Focus {
  name: string;
  description: string;
  isCombat: boolean;
  isOrigin?: boolean;
  isPsychicOnly?: boolean;
  levels: [FocusLevel, FocusLevel];
  repeatable?: boolean;
}

export const FOCI: Focus[] = [
  {
    name: 'Alert',
    description: 'You are keenly aware of your surroundings and virtually impossible to take unaware.',
    isCombat: false,
    levels: [
      { description: 'Gain Notice as a bonus skill. You cannot be surprised, nor can others use Execution Attacks on you. Roll initiative twice and take the best result.', bonusSkill: 'Notice' },
      { description: 'You always act first in a combat round unless someone else is also Alert.' },
    ],
  },
  {
    name: 'Armsman',
    description: 'You have unusual competence with thrown weapons and melee attacks.',
    isCombat: true,
    levels: [
      { description: 'Gain Stab as a bonus skill. Draw/sheath a Stowed melee or thrown weapon as an Instant action. Add your Stab skill to melee or thrown weapon damage rolls or Shock damage.', bonusSkill: 'Stab' },
      { description: 'Primitive melee and thrown weapons count as TL4. Even on a miss with a melee weapon, do 1d4 unmodified damage plus Shock.' },
    ],
  },
  {
    name: 'Assassin',
    description: 'You are practiced at sudden murder, with advantages when making Execution Attacks.',
    isCombat: true,
    levels: [
      { description: 'Gain Sneak as a bonus skill. Conceal an object up to knife/pistol size. Draw as an On Turn action. Point-blank ranged attacks from surprise cannot miss.', bonusSkill: 'Sneak' },
      { description: 'You can take a Move action on the same round as an Execution Attack, splitting the move before and after.' },
    ],
  },
  {
    name: 'Authority',
    description: 'You have an uncanny charisma that makes others instinctively follow your instructions.',
    isCombat: false,
    levels: [
      { description: 'Gain Lead as a bonus skill. Once per day, make a request from a non-hostile NPC by rolling Cha/Lead vs their Morale score.', bonusSkill: 'Lead' },
      { description: 'NPCs you directly lead gain a Morale and hit roll bonus equal to your Lead skill, and a +1 bonus on all skill checks. They won\'t act against your interests unless under extreme pressure.' },
    ],
  },
  {
    name: 'Close Combatant',
    description: 'You are extremely skilled at avoiding injury in melee combat.',
    isCombat: true,
    levels: [
      { description: 'Gain any combat skill as a bonus skill. Use pistol-sized ranged weapons in melee without penalty. Ignore Shock damage from melee assailants, even if unarmored.' },
      { description: 'Shock damage from your melee attacks treats all targets as AC 10. Fighting Withdrawal is an On Turn action for you.' },
    ],
  },
  {
    name: 'Connected',
    description: 'You are remarkably gifted at making friends and forging ties with people around you.',
    isCombat: false,
    levels: [
      { description: 'Gain Connect as a bonus skill. After spending at least a week somewhere, you\'ve built a web of contacts willing to do mildly illegal favors once per day.', bonusSkill: 'Connect' },
      { description: 'Once per session, if not entirely implausible, you meet someone you know who is willing to do modest favors for you.' },
    ],
  },
  {
    name: 'Die Hard',
    description: 'You are surprisingly hard to kill.',
    isCombat: false,
    levels: [
      { description: 'Gain 2 extra maximum hit points per level (retroactive). Automatically stabilize if mortally wounded by anything smaller than a Heavy weapon.' },
      { description: 'The first time each day you are reduced to zero hit points, you instead survive with 1 hit point. Doesn\'t work against Heavy weapons.' },
    ],
  },
  {
    name: 'Diplomat',
    description: 'You know how to get your way in personal negotiations.',
    isCombat: false,
    levels: [
      { description: 'Gain Talk as a bonus skill. You speak all common sector languages and can learn new ones quickly. Reroll 1s on any skill check dice related to negotiation or diplomacy.', bonusSkill: 'Talk' },
      { description: 'Once per game session, shift an intelligent NPC\'s reaction one step closer to friendly if you can talk to them for at least thirty seconds.' },
    ],
  },
  {
    name: 'Gunslinger',
    description: 'You have a gift with a gun.',
    isCombat: true,
    levels: [
      { description: 'Gain Shoot as a bonus skill. Draw/holster a Stowed ranged weapon as an On Turn action. Add your Shoot skill level to a ranged weapon\'s damage roll.', bonusSkill: 'Shoot' },
      { description: 'Once per round, reload a ranged weapon as an On Turn action if it takes no more than one round to reload. Even on a miss with a Shoot attack, do 1d4 unmodified damage.' },
    ],
  },
  {
    name: 'Hacker',
    description: 'You have considerable fluency with digital security measures and standard encryption methods.',
    isCombat: false,
    levels: [
      { description: 'Gain Program as a bonus skill. When hacking a database or computerized system, roll 3d6 and drop the lowest die.', bonusSkill: 'Program' },
      { description: 'Your hack duration increases to 1d4+Program skill × 10 minutes. You never need to learn data protocols for a strange system.' },
    ],
  },
  {
    name: 'Healer',
    description: 'Healing comes naturally to you.',
    isCombat: false,
    levels: [
      { description: 'Gain Heal as a bonus skill. Stabilize one mortally-wounded adjacent person per round as an On Turn action. Roll 3d6 and drop the lowest for Heal skill checks.', bonusSkill: 'Heal' },
      { description: 'Stims or healing devices you apply heal twice as many hit points. Using basic medical supplies, heal 1d6+Heal skill HP to every injured person in 10 minutes of first aid.' },
    ],
  },
  {
    name: 'Henchkeeper',
    description: 'You have a distinct knack for picking up lost souls who willingly do your bidding.',
    isCombat: false,
    levels: [
      { description: 'Gain Lead as a bonus skill. Acquire henchmen within 24 hours of arriving in a community. Have one henchman per 3 character levels rounded up. Base henchmen are treated as Peaceful Humans; they won\'t fight except to save their own lives.', bonusSkill: 'Lead' },
      { description: 'Your henchmen are remarkably loyal and will fight for you. They\'re treated as Martial Humans. You can make faithful henchmen of skilled NPCs you\'ve done real favors for.' },
    ],
  },
  {
    name: 'Ironhide',
    description: 'You have natural defenses equivalent to high-quality combat armor.',
    isCombat: false,
    levels: [
      { description: 'Innate Armor Class of 15 plus half your character level, rounded up. Benefits don\'t stack with worn armor, but Dex and shield modifiers apply.' },
      { description: 'You are immune to unarmed attacks or primitive weaponry as if wearing powered armor.' },
    ],
  },
  {
    name: 'Psychic Training',
    description: 'You have special training in a particular psychic discipline. Requires Psychic or Partial Psychic class.',
    isCombat: false,
    isPsychicOnly: true,
    levels: [
      { description: 'Gain any psychic skill as a bonus. If this improves it to level-1, choose a free level-1 technique from that discipline. Your maximum Effort increases by 1.' },
      { description: 'When you advance a level, the chosen psychic skill automatically gets one skill point toward increasing it or purchasing a technique. Points can be saved for later.' },
    ],
  },
  {
    name: 'Savage Fray',
    description: 'You are a whirlwind of bloody havoc in melee combat.',
    isCombat: true,
    levels: [
      { description: 'Gain Stab as a bonus skill. All enemies adjacent to you at the end of your turn whom you have not attacked suffer your weapon\'s Shock damage if their AC qualifies.', bonusSkill: 'Stab' },
      { description: 'After suffering your first melee hit in a round, any further melee attacks from other assailants automatically miss you.' },
    ],
  },
  {
    name: 'Shocking Assault',
    description: 'You are extremely dangerous to enemies around you. The ferocity of your melee attacks stresses foes even when blows don\'t draw blood.',
    isCombat: true,
    levels: [
      { description: 'Gain Punch or Stab as a bonus skill. The Shock damage of your weapon treats all targets as AC 10 (assuming the weapon can harm them).' },
      { description: 'You gain +2 to Shock damage of all melee weapons and unarmed attacks. Regular hits never do less damage than this Shock would.' },
    ],
  },
  {
    name: 'Sniper',
    description: 'You are an expert at placing a bullet or beam on an unsuspecting target.',
    isCombat: true,
    levels: [
      { description: 'Gain Shoot as a bonus skill. When making a skill check for an Execution Attack or target shooting, roll 3d6 and drop the lowest die.', bonusSkill: 'Shoot' },
      { description: 'A target hit by your Execution Attack takes -4 on their Physical save to avoid mortal injury. Even on a successful save, the target takes double normal damage.' },
    ],
  },
  {
    name: 'Specialist',
    description: 'You are remarkably talented at a particular skill.',
    isCombat: false,
    repeatable: true,
    levels: [
      { description: 'Gain a non-combat, non-psychic skill as a bonus. Roll 3d6 and drop the lowest die for all skill checks in this skill.' },
      { description: 'Roll 4d6 and drop the two lowest dice for all skill checks in this skill.' },
    ],
  },
  {
    name: 'Star Captain',
    description: 'You have a tremendous natural talent for ship combat.',
    isCombat: false,
    levels: [
      { description: 'Gain Lead as a bonus skill. Your ship gains 2 extra Command Points at the start of each turn (must be captaining the ship).', bonusSkill: 'Lead' },
      { description: 'A ship you captain gains bonus hit points equal to 20% of its maximum at the start of each combat (taken first, vanish after fight). Once per engagement, resolve a Crisis as an Instant action.' },
    ],
  },
  {
    name: 'Starfarer',
    description: 'You are an expert in plotting and executing interstellar spike drills.',
    isCombat: false,
    levels: [
      { description: 'Gain Pilot as a bonus skill. Automatically succeed at all spike drill-related skill checks of difficulty 10 or less.', bonusSkill: 'Pilot' },
      { description: 'Double your Pilot skill for all spike drill-related checks. Spike drives you navigate are treated as one level higher (up to drive-7). Spike drills you personally oversee take half the usual time.' },
    ],
  },
  {
    name: 'Tinker',
    description: 'You have a natural knack for modifying and improving equipment.',
    isCombat: false,
    levels: [
      { description: 'Gain Fix as a bonus skill. Your Maintenance score is doubled. Both ship and gear mods cost only half their usual price in credits (pretech salvage requirements remain).', bonusSkill: 'Fix' },
      { description: 'Your Fix skill is treated as one level higher for building and maintaining mods. Advanced mods require one fewer pretech salvage part (minimum zero).' },
    ],
  },
  {
    name: 'Unarmed Combatant',
    description: 'Your empty hands are more dangerous than knives and guns in the grip of the less gifted.',
    isCombat: true,
    levels: [
      { description: 'Gain Punch as a bonus skill. Unarmed attacks scale: level-0: 1d6, level-1: 1d8, level-2: 1d10, level-3: 1d12, level-4: 1d12+1. At Punch-1+, they have Shock equal to Punch skill vs AC 15.', bonusSkill: 'Punch' },
      { description: 'Your unarmed attacks count as TL4 weapons for overcoming advanced armors. Even on a miss with a Punch attack, do 1d6 unmodified damage.' },
    ],
  },
  {
    name: 'Unique Gift',
    description: 'Due to exotic technological augmentation, a unique transhuman background, or a remarkable human talent, you have an ability simply impossible for a normal human.',
    isCombat: false,
    levels: [
      { description: 'Work with the GM to define a special ability better than any gear you could buy for credits. May require System Strain to use if particularly powerful.' },
      { description: 'Your gift expands further. Work with the GM to define the enhanced ability.' },
    ],
  },
  {
    name: 'Wanderer',
    description: 'Your hero gets around. You\'ve mastered tricks for ensuring mobility and surviving vagabond existence.',
    isCombat: false,
    levels: [
      { description: 'Gain Survive as a bonus skill. Convey basic ideas in all common sector languages. Always find free transport to a desired destination within an hour.', bonusSkill: 'Survive' },
      { description: 'Forge, scrounge, or snag travel papers and ID for the party in 1d6 hours. Transport always makes the trip at least as fast as a dedicated charter.' },
    ],
  },
  {
    name: 'Wild Psychic Talent',
    description: 'You have a very limited form of MES that creates one limited psychic effect. Cannot be taken by Psychics or Partial Psychics.',
    isCombat: false,
    levels: [
      { description: 'Pick a psychic discipline. Gain the level-0 core power of that discipline. Alternatively, pick a standalone level-1 technique from that discipline. You are treated as having 1 point of Effort.' },
      { description: 'Your maximum Effort becomes 2. Pick a second ability following the same guidelines. The second doesn\'t need to be standalone if it augments the power you chose at level 1.' },
    ],
  },
  {
    name: 'Android',
    description: 'You were built as an android, a robot indistinguishable from a human without medical-grade inspection.',
    isCombat: false,
    isOrigin: true,
    levels: [
      { description: 'Gain a bonus skill related to your intended function. You have all the usual traits and abilities of a VI robot: no need for sleep/food/drink (1 Type B cell/week), immune to vacuum, poison, and disease, cannot be a Psychic, can be healed with Fix skill and spare parts instead of medicine, and cannot use cyberware.' },
      { description: 'Your android nature is fully developed. Cosmetic alterations can be made to your chassis; built-in equipment costs twice as much but takes up to half your CON score in encumbrance points.' },
    ],
  },
  {
    name: 'VI Worker Bot',
    description: 'You were built for industrial or technical labor, where a human face was an unnecessary luxury.',
    isCombat: false,
    isOrigin: true,
    levels: [
      { description: 'Gain a bonus skill related to your intended function. Choose an attribute associated with your work and gain a +1 bonus to its modifier (max +2). You have all the usual VI robot traits: no need for sleep/food/drink (1 Type B cell/week), immune to vacuum, poison, and disease, cannot be a Psychic, healed with Fix skill + spare parts, cannot use cyberware.' },
      { description: 'Your robust construction allows for greater hardware integration. Built-in equipment costs twice as much but takes up to half your CON score in encumbrance points.' },
    ],
  },
  {
    name: 'VI Vehicle Bot',
    description: 'Some VIs were instantiated in actual vehicles rather than conventional humanoid bodies.',
    isCombat: false,
    isOrigin: true,
    levels: [
      { description: 'Gain Pilot as a bonus skill. You become a drone, hoverbike, gravcar, or other vehicle acceptable to the GM, retaining your usual attributes but gaining the vehicle\'s Armor score. You retain AC 10 modified by Dexterity. You can pilot a single surrogate body remotely as your Main Action. You have all the usual VI robot traits: no sleep/food/drink, immune to vacuum, poison, and disease, cannot be a Psychic, healed with Fix skill + spare parts, cannot use cyberware.', bonusSkill: 'Pilot' },
      { description: 'A tech can improve your Armor Class by up to 3× their Fix skill (1,000 credits/point). You can control your surrogate body as long as there is no ECM jamming.' },
    ],
  },
  {
    name: 'Alien: Strong Species',
    description: 'Your species is tougher and stronger than baseline human, with natural physical advantages.',
    isCombat: false,
    isOrigin: true,
    levels: [
      { description: 'Gain a bonus skill appropriate to your species. Your maximum hit points always count the first die as maximum (Warrior starts at 8; further dice that roll a 1 are rerolled). Your species has a +1 bonus to one attribute modifier of your choice (max +3).' },
      { description: 'Your species\' toughness is fully expressed. You gain a natural AC of 15 plus half character level if unarmored, or an innate ability equivalent to 2–3 pieces of equipment from the cyberware/gear list.' },
    ],
  },
  {
    name: 'Alien: Psychically Gifted',
    description: 'Your species has an innate psychic aptitude, all members born with limited MES sensitivity.',
    isCombat: false,
    isOrigin: true,
    levels: [
      { description: 'You must be a Psychic or take the Partial Psychic class option. Your maximum Effort is increased by 1. Gain a bonus psychic or non-psychic skill appropriate to your species.' },
      { description: 'Your psychic gift deepens. You may use one innate psychic technique from your discipline without spending Effort once per scene.' },
    ],
  },
  {
    name: 'Alien: Warrior Species',
    description: 'Your species is naturally aggressive and combat-capable, all members being trained fighters.',
    isCombat: false,
    isOrigin: true,
    levels: [
      { description: 'Gain a combat bonus skill (Stab, Shoot, or Punch as appropriate). You gain a +1 bonus to your normal attack bonus. Your species also has a natural defense or innate ability — work with your GM to define it.' },
      { description: 'Your warrior nature is fully developed. Your natural weapons (claws, fangs, etc.) count as TL4 melee weapons. You may have a natural AC improvement or an unusual movement mode (e.g., wall-climbing, short teleportation hops) — work with your GM.' },
    ],
  },
];
