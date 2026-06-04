/** A weapon granted by a starting package. Damage/range/ammo are stored so it becomes
 *  a first-class entry in `char.weapons` (and shows on the play sheet), not just a string. */
export interface PackageWeapon {
  name: string;
  damage: string;
  range?: string;   // ranged only (e.g. "100/300m"); omitted for melee
  ammoMax?: number; // magazine capacity for ranged weapons
  shock?: string;   // melee shock value
}

export interface PackageArmor {
  name: string;
  ac: number;
}

export interface EquipmentPackage {
  name: string;
  weapons: PackageWeapon[];
  armor: PackageArmor[];
  items: string[];   // consumables / tools / flavour gear (stay as strings)
  credits: number;
}

const KNIFE: PackageWeapon = { name: 'Knife', damage: '1d4', shock: '1 pt/AC 15' };
const MONOBLADE_KNIFE: PackageWeapon = { name: 'Monoblade Knife', damage: '1d6', shock: '1 pt/AC 15' };
const LASER_PISTOL: PackageWeapon = { name: 'Laser Pistol', damage: '1d6', range: '100/300m', ammoMax: 10 };

export const EQUIPMENT_PACKAGES: EquipmentPackage[] = [
  {
    name: 'Gunslinger',
    weapons: [LASER_PISTOL, MONOBLADE_KNIFE],
    armor: [{ name: 'Armored Undersuit', ac: 13 }],
    items: ['8× Type A cells', 'Backpack (TL0)', 'Compad'],
    credits: 100,
  },
  {
    name: 'Soldier',
    weapons: [{ name: 'Combat Rifle', damage: '1d12*', range: '100/300m', ammoMax: 30 }, KNIFE],
    armor: [{ name: 'Woven Body Armor', ac: 15 }],
    items: ['80 rounds ammo', 'Backpack (TL0)', 'Compad'],
    credits: 100,
  },
  {
    name: 'Scout',
    weapons: [{ name: 'Laser Rifle', damage: '1d10*', range: '300/500m', ammoMax: 20 }, KNIFE],
    armor: [{ name: 'Armored Vacc Suit', ac: 13 }],
    items: ['8× Type A cells', 'Backpack (TL0)', 'Compad', 'Survey Scanner', 'Survival Kit', 'Binoculars (TL3)'],
    credits: 25,
  },
  {
    name: 'Medic',
    weapons: [LASER_PISTOL],
    armor: [{ name: 'Secure Clothing', ac: 13 }],
    items: ['Backpack (TL0)', 'Medkit', '4× Lazarus Patches', 'Compad', '2× doses of Lift', 'Bioscanner'],
    credits: 25,
  },
  {
    name: 'Civilian',
    weapons: [],
    armor: [{ name: 'Secure Clothing', ac: 13 }],
    items: ['Compad'],
    credits: 700,
  },
  {
    name: 'Technician',
    weapons: [LASER_PISTOL, MONOBLADE_KNIFE],
    armor: [{ name: 'Armored Undersuit', ac: 13 }],
    items: ['4× Type A cells', 'Backpack (TL0)', 'Dataslab', 'Postech Toolkit', 'Metatool', '6× units spare parts'],
    credits: 200,
  },
  {
    name: 'Barbarian',
    weapons: [{ name: 'Spear', damage: '1d6+1', shock: '2 pts/AC 13' }, KNIFE],
    armor: [{ name: 'Primitive Hide Armor', ac: 13 }],
    items: ['Backpack (TL0)', '7 days rations', 'Primitive Shield (+1 AC)', '20m rope'],
    credits: 500,
  },
  {
    name: 'Blade',
    weapons: [{ name: 'Monoblade Sword', damage: '1d8+1', shock: '2 pts/AC 13' }, { name: 'Thermal Knife', damage: '1d6', shock: '1 pt/AC 15' }],
    armor: [{ name: 'Woven Body Armor', ac: 15 }, { name: 'Secure Clothing', ac: 13 }],
    items: ['Backpack (TL0)', 'Compad', 'Lazarus Patch'],
    credits: 50,
  },
  {
    name: 'Thief',
    weapons: [LASER_PISTOL, MONOBLADE_KNIFE],
    armor: [{ name: 'Armored Undersuit', ac: 13 }],
    items: ['2× Type A cells', 'Backpack (TL0)', 'Compad', 'Climbing Harness', 'Metatool', 'Low-light Goggles'],
    credits: 25,
  },
  {
    name: 'Hacker',
    weapons: [LASER_PISTOL],
    armor: [{ name: 'Secure Clothing', ac: 13 }],
    items: ['2× Type A cells', 'Dataslab', 'Postech Toolkit', 'Metatool', '3× units spare parts', '2× Line Shunts'],
    credits: 100,
  },
];

export interface Armor {
  name: string;
  ac: number;
  cost: number;
  enc: number;
  tl: number;
  type: 'Primitive' | 'Street' | 'Combat' | 'Powered';
  notes?: string;
}

export const ARMOR_TABLE: Armor[] = [
  { name: 'Shield', ac: 13, cost: 10, enc: 1, tl: 0, type: 'Primitive', notes: '+1 bonus if already ≥13 AC; immune to first Shock per round' },
  { name: 'Leather/Quilted', ac: 13, cost: 10, enc: 1, tl: 0, type: 'Primitive' },
  { name: 'Cuirass/Half-plate', ac: 15, cost: 50, enc: 1, tl: 1, type: 'Primitive' },
  { name: 'Full Plate', ac: 17, cost: 100, enc: 2, tl: 1, type: 'Primitive' },
  { name: 'Warpaint', ac: 12, cost: 300, enc: 0, tl: 4, type: 'Street' },
  { name: 'Armored Undersuit', ac: 13, cost: 600, enc: 0, tl: 4, type: 'Street' },
  { name: 'Secure Clothing', ac: 13, cost: 300, enc: 1, tl: 4, type: 'Street' },
  { name: 'Armored Vacc Suit', ac: 13, cost: 400, enc: 2, tl: 4, type: 'Street', notes: 'Functions as vacc suit; half-chance to tear vs edged weapons' },
  { name: 'Deflector Array', ac: 18, cost: 30000, enc: 0, tl: 5, type: 'Street' },
  { name: 'Force Pavis', ac: 15, cost: 10000, enc: 1, tl: 5, type: 'Combat', notes: '+1 bonus if already ≥15 AC' },
  { name: 'Security Armor', ac: 14, cost: 700, enc: 1, tl: 4, type: 'Combat' },
  { name: 'Woven Body Armor', ac: 15, cost: 400, enc: 2, tl: 3, type: 'Combat' },
  { name: 'Combat Field Uniform', ac: 16, cost: 1000, enc: 1, tl: 4, type: 'Combat' },
  { name: 'Icarus Harness', ac: 16, cost: 8000, enc: 1, tl: 4, type: 'Combat', notes: 'Fall unlimited distance; functions as vacc suit 30 min/vacc refresh' },
  { name: 'Vestimentum', ac: 18, cost: 15000, enc: 0, tl: 5, type: 'Powered' },
  { name: 'Assault Suit', ac: 18, cost: 10000, enc: 2, tl: 4, type: 'Powered', notes: 'Type B cell/24hr; integral comms, low-light, IR; energy feed interface; vacc suit' },
  { name: 'Storm Armor', ac: 19, cost: 20000, enc: 2, tl: 5, type: 'Powered', notes: 'As assault suit + STR+4 for encumbrance, leap 20m, fall 40m, auto-stabilize' },
  { name: 'Field Emitter Panoply', ac: 20, cost: 40000, enc: 1, tl: 5, type: 'Powered', notes: 'As storm armor, no power required, radiation immunity' },
];

export interface RangedWeapon {
  name: string;
  damage: string;
  range: string;
  cost: number;
  magazine: string;
  attr: string;
  enc: number;
  tl: number;
  burstMode?: boolean;
  energyWeapon?: boolean;
  notes?: string;
}

export const RANGED_WEAPONS: RangedWeapon[] = [
  { name: 'Primitive Bow', damage: '1d6', range: '50/75', cost: 15, magazine: '1', attr: 'Dex', enc: 2, tl: 1 },
  { name: 'Advanced Bow', damage: '1d6', range: '100/150', cost: 50, magazine: '1', attr: 'Dex', enc: 2, tl: 3 },
  { name: 'Conversion Bow', damage: '1d8', range: '150/300', cost: 500, magazine: '1', attr: 'Dex', enc: 2, tl: 4 },
  { name: 'Grenade', damage: '2d6', range: '10/30', cost: 25, magazine: 'N/A', attr: 'Dex', enc: 1, tl: 3, notes: 'Always attack AC 10; 5m blast; Evasion save for half; -1 dmg per AC above 14' },
  { name: 'Crude Pistol', damage: '1d6', range: '5/15', cost: 20, magazine: '1 (2 actions reload)', attr: 'Dex', enc: 1, tl: 2 },
  { name: 'Musket', damage: '1d12', range: '25/50', cost: 30, magazine: '1 (2 actions reload)', attr: 'Dex', enc: 2, tl: 2 },
  { name: 'Revolver', damage: '1d8', range: '30/100', cost: 50, magazine: '6', attr: 'Dex', enc: 1, tl: 2 },
  { name: 'Rifle', damage: '1d10+2', range: '200/400', cost: 75, magazine: '6', attr: 'Dex', enc: 2, tl: 2 },
  { name: 'Shotgun', damage: '3d4', range: '10/30', cost: 50, magazine: '2', attr: 'Dex', enc: 2, tl: 2, notes: 'Slug rounds: 2d6, range 50/75' },
  { name: 'Semi-Auto Pistol', damage: '1d6+1', range: '30/100', cost: 75, magazine: '12', attr: 'Dex', enc: 1, tl: 3 },
  { name: 'Submachine Gun', damage: '1d8*', range: '30/100', cost: 200, magazine: '20', attr: 'Dex', enc: 1, tl: 3, burstMode: true },
  { name: 'Combat Rifle', damage: '1d12*', range: '100/300', cost: 300, magazine: '30', attr: 'Dex', enc: 2, tl: 3, burstMode: true },
  { name: 'Combat Shotgun', damage: '3d4*', range: '10/30', cost: 300, magazine: '12', attr: 'Dex', enc: 2, tl: 3, burstMode: true },
  { name: 'Sniper Rifle', damage: '2d8', range: '1000/2000', cost: 400, magazine: '1', attr: 'Dex', enc: 2, tl: 3, notes: 'Mortally-wounded targets from Execution Attacks die instantly' },
  { name: 'Void Carbine', damage: '2d6', range: '100/300', cost: 400, magazine: '10', attr: 'Dex', enc: 2, tl: 4, notes: 'Zero recoil; rounds can\'t penetrate ship plating' },
  { name: 'Mag Pistol', damage: '2d6+2', range: '100/300', cost: 400, magazine: '6', attr: 'Dex', enc: 1, tl: 4 },
  { name: 'Mag Rifle', damage: '2d8+2', range: '300/600', cost: 500, magazine: '10', attr: 'Dex', enc: 2, tl: 4 },
  { name: 'Spike Thrower', damage: '3d8*', range: '20/40', cost: 600, magazine: '15', attr: 'Dex', enc: 2, tl: 4, burstMode: true },
  { name: 'Laser Pistol', damage: '1d6', range: '100/300', cost: 200, magazine: '10 (Type A cell)', attr: 'Dex', enc: 1, tl: 4, energyWeapon: true },
  { name: 'Laser Rifle', damage: '1d10*', range: '300/500', cost: 300, magazine: '20 (Type A cell)', attr: 'Dex', enc: 2, tl: 4, energyWeapon: true, burstMode: true },
  { name: 'Thermal Pistol', damage: '2d6', range: '25/50', cost: 300, magazine: '5 (Type A cell)', attr: 'Dex', enc: 1, tl: 4, energyWeapon: true },
  { name: 'Plasma Projector', damage: '2d8', range: '50/100', cost: 400, magazine: '6 (Type A cell)', attr: 'Dex', enc: 2, tl: 4, energyWeapon: true },
  { name: 'Shear Rifle', damage: '2d8*', range: '100/300', cost: 600, magazine: '10 (Type A cell)', attr: 'Dex', enc: 2, tl: 5, energyWeapon: true, burstMode: true, notes: 'Silent; grav projector tears targets apart' },
  { name: 'Thunder Gun', damage: '2d10', range: '100/300', cost: 1000, magazine: '6 (Type A cell)', attr: 'Dex', enc: 2, tl: 5, energyWeapon: true, notes: 'On unmodified hit roll of 16+, roll extra 1d10 damage (always vs inanimate)' },
  { name: 'Distortion Cannon', damage: '2d12', range: '100/300', cost: 1250, magazine: '6 (Type A cell)', attr: 'Dex', enc: 2, tl: 5, energyWeapon: true, notes: 'Ignores up to 1m of solid cover between gun and target' },
];

export interface MeleeWeapon {
  name: string;
  damage: string;
  shock: string;
  attr: string;
  cost: number;
  enc: number;
  tl: number;
  type: 'Small' | 'Medium' | 'Large' | 'Special';
  advanced: boolean;
  notes?: string;
}

export const MELEE_WEAPONS: MeleeWeapon[] = [
  { name: 'Small Primitive Weapon', damage: '1d4', shock: '1 pt/AC 15', attr: 'Str/Dex', cost: 0, enc: 1, tl: 0, type: 'Small', advanced: false },
  { name: 'Medium Primitive Weapon', damage: '1d6+1', shock: '2 pts/AC 13', attr: 'Str/Dex', cost: 20, enc: 1, tl: 0, type: 'Medium', advanced: false },
  { name: 'Large Primitive Weapon', damage: '1d8+1', shock: '2 pts/AC 15', attr: 'Str', cost: 30, enc: 2, tl: 0, type: 'Large', advanced: false },
  { name: 'Small Advanced Weapon', damage: '1d6', shock: '1 pt/AC 15', attr: 'Str/Dex', cost: 40, enc: 1, tl: 4, type: 'Small', advanced: true, notes: 'e.g. Monoblade Knife, Thermal Knife' },
  { name: 'Medium Advanced Weapon', damage: '1d8+1', shock: '2 pts/AC 13', attr: 'Str/Dex', cost: 60, enc: 1, tl: 4, type: 'Medium', advanced: true, notes: 'e.g. Monoblade Sword, Vibro-blade' },
  { name: 'Large Advanced Weapon', damage: '1d10+1', shock: '2 pts/AC 15', attr: 'Str', cost: 80, enc: 2, tl: 4, type: 'Large', advanced: true },
  { name: 'Stun Baton', damage: '1d8', shock: '1 pt/AC 15', attr: 'Str/Dex', cost: 50, enc: 1, tl: 4, type: 'Special', advanced: true, notes: 'Drops target to 0 HP but doesn\'t kill; wakes in 10 min with 1 HP' },
  { name: 'Suit Ripper', damage: '1d6', shock: 'None', attr: 'Str/Dex', cost: 75, enc: 1, tl: 4, type: 'Special', advanced: true, notes: 'Each hit counts as a vacc suit tear; illegal in space environments' },
  { name: 'Unarmed Attack', damage: '1d2', shock: 'None', attr: 'Str/Dex', cost: 0, enc: 0, tl: 0, type: 'Special', advanced: false, notes: 'Always adds Punch skill to damage rolls' },
];

// ── General Equipment (p.70–76) ───────────────────────────────────────────────

export type EquipCategory =
  | 'Ammo & Power'
  | 'Communications'
  | 'Computing'
  | 'Medical'
  | 'Field Equipment'
  | 'Pharmaceuticals'
  | 'Lifestyle';

export interface GeneralItem {
  name: string;
  category: EquipCategory;
  cost: number;
  enc: number;   // 0 = negligible, 1+ = items
  tl: number;
  notes?: string;
}

export const GENERAL_EQUIPMENT: GeneralItem[] = [
  // Ammo & Power
  { name: 'Ammo, 20 rounds', category: 'Ammo & Power', cost: 10, enc: 1, tl: 2, notes: 'Compatible with any projectile weapon' },
  { name: 'Ammo, missile', category: 'Ammo & Power', cost: 50, enc: 1, tl: 3, notes: 'For rocket launchers and hydra arrays' },
  { name: 'Power Cell, Type A', category: 'Ammo & Power', cost: 10, enc: 1, tl: 4, notes: 'Recharges energy weapons; 30 min recharge time' },
  { name: 'Power Cell, Type B', category: 'Ammo & Power', cost: 100, enc: 1, tl: 4, notes: 'Powers vehicles and heavy gear; 24 hr recharge time' },
  { name: 'Solar Recharger', category: 'Ammo & Power', cost: 500, enc: 3, tl: 4, notes: 'Recharges 1 Type A cell/day in normal starlight' },
  { name: 'Telekinetic Generator', category: 'Ammo & Power', cost: 250, enc: 2, tl: 4, notes: 'Telekinetic or manual power; charges 1 Type A cell per 15 min' },

  // Communications
  { name: 'Compad', category: 'Communications', cost: 100, enc: 0, tl: 4, notes: 'Hand-held communicator; works on any world with a comm grid' },
  { name: 'Field Radio', category: 'Communications', cost: 200, enc: 1, tl: 3, notes: 'Range: 2 km urban / 30 km plains; works without a comm grid' },
  { name: 'Comm Server', category: 'Communications', cost: 1000, enc: 3, tl: 4, notes: 'Provides comm coverage for 36 compads within 300 km' },
  { name: 'Translator Torc', category: 'Communications', cost: 200, enc: 0, tl: 4, notes: 'Translates between 2 keyed languages; –2 to social checks through it' },

  // Computing
  { name: 'Dataslab', category: 'Computing', cost: 300, enc: 1, tl: 4, notes: 'Palm-sized computer; compad + wireless data interface' },
  { name: 'Metatool', category: 'Computing', cost: 200, enc: 1, tl: 4, notes: 'Wrist-mounted multi-tool; sufficient for jury-rigged repairs' },
  { name: 'Spare Parts', category: 'Computing', cost: 50, enc: 1, tl: 4, notes: 'General TL4 components; 1 unit consumed per repair as needed' },
  { name: 'Toolkit, Postech', category: 'Computing', cost: 300, enc: 3, tl: 4, notes: 'Full range of tools for TL4 electronics and repairs' },
  { name: 'Toolkit, Pretech', category: 'Computing', cost: 1000, enc: 1, tl: 5, notes: 'Required for working on TL5 artifacts' },
  { name: 'Line Shunt', category: 'Computing', cost: 100, enc: 0, tl: 4, notes: 'Single-use; required for certain hacking operations' },
  { name: 'Dataslab, Black', category: 'Computing', cost: 10000, enc: 1, tl: 4, notes: '+1 to all hacking attempts; illegal on most worlds' },

  // Medical
  { name: 'Bioscanner', category: 'Medical', cost: 300, enc: 1, tl: 4, notes: 'Heal-0 required for full diagnostics; DNA sequencing in minutes' },
  { name: 'Lazarus Patch', category: 'Medical', cost: 30, enc: 1, tl: 4, notes: 'Stabilize a dying character (0 HP); must be used within 6 rounds' },
  { name: 'Medkit', category: 'Medical', cost: 100, enc: 2, tl: 4, notes: 'Supplies for long-term recuperative care; roll 2d6/day, depleted on 12' },
  { name: 'Lift (stim)', category: 'Pharmaceuticals', cost: 50, enc: 0, tl: 4, notes: 'Heals 1d8 + Heal skill HP after 5 min rest; +1 System Strain' },
  { name: 'Hush (stim)', category: 'Pharmaceuticals', cost: 200, enc: 0, tl: 4, notes: 'Heavy tranquilizer; subject is compliant but non-communicative for ~1 hr' },
  { name: 'Psych (stim)', category: 'Pharmaceuticals', cost: 25, enc: 0, tl: 4, notes: 'Morale 12, +1 skill checks; ignores cover; 15 min duration; psychologically addictive' },
  { name: 'Tsunami (stim)', category: 'Pharmaceuticals', cost: 50, enc: 0, tl: 4, notes: '+10 temp HP, +2 hit rolls; crash after 10 min; +2 System Strain' },
  { name: 'Pretech Cosmetic (stim)', category: 'Pharmaceuticals', cost: 1000, enc: 0, tl: 5, notes: 'Heals 1d6 HP; +1 System Strain' },

  // Field Equipment
  { name: 'Backpack (TL0)', category: 'Field Equipment', cost: 5, enc: 1, tl: 0, notes: 'Basic pack; no encumbrance bonus' },
  { name: 'Backpack (TL4)', category: 'Field Equipment', cost: 50, enc: 0, tl: 4, notes: 'Modern lightweight pack; effectively weightless when worn' },
  { name: 'Vacc Suit', category: 'Field Equipment', cost: 100, enc: 2, tl: 4, notes: 'Survives hard vacuum; AC 13; 6 hr O2; –2 to hit/skill checks unless trained' },
  { name: 'Vacc Skin', category: 'Field Equipment', cost: 1000, enc: 1, tl: 5, notes: 'TL5 vacc suit worn under armor; no penalties; recycles air and waste' },
  { name: 'Armored Vacc Suit', category: 'Field Equipment', cost: 400, enc: 2, tl: 4, notes: 'Vacc suit + AC 13; half chance to tear vs edged weapons' },
  { name: 'Survival Kit', category: 'Field Equipment', cost: 60, enc: 1, tl: 4, notes: '+1 to Survive checks; fire lighter, water filter, flares, knife, radio beacon' },
  { name: 'Pressure Tent', category: 'Field Equipment', cost: 100, enc: 4, tl: 3, notes: 'Breathable atmosphere for 5 people; 1 Type A cell per day of filtration' },
  { name: 'Low-Light Goggles', category: 'Field Equipment', cost: 200, enc: 1, tl: 3, notes: 'Monochrome vision in near-darkness; 1 week per Type A cell' },
  { name: 'Binoculars (TL4)', category: 'Field Equipment', cost: 200, enc: 1, tl: 4, notes: '25×150 power; integral low-light optics; 1 week per Type A cell' },
  { name: 'Climbing Harness', category: 'Field Equipment', cost: 50, enc: 1, tl: 3, notes: '+1 to Exert climbing checks; –2 to Sneak while climbing' },
  { name: 'Grapnel Launcher', category: 'Field Equipment', cost: 200, enc: 1, tl: 3, notes: 'Fires rope up to 40 m; 6 shots per Type A cell' },
  { name: 'Grav Chute', category: 'Field Equipment', cost: 300, enc: 1, tl: 4, notes: 'Slows falls up to 1000 m; single use; up to 300 kg' },
  { name: 'Grav Harness', category: 'Field Equipment', cost: 5000, enc: 3, tl: 5, notes: 'Flight at 20 m/round; 5 min per Type B cell; up to 200 kg' },
  { name: 'Survey Scanner', category: 'Field Equipment', cost: 250, enc: 1, tl: 4, notes: 'Atmospheric/gravitic readings, chemical analysis, 200 hrs video recording' },
  { name: 'Navcomp', category: 'Field Equipment', cost: 500, enc: 1, tl: 4, notes: '+1 to navigation checks; never lost on worlds with GPS satellites' },
  { name: 'Atmofilter', category: 'Field Equipment', cost: 100, enc: 1, tl: 4, notes: 'Face mask filters most atmospheric toxins' },
  { name: 'Rations, 1 day', category: 'Field Equipment', cost: 5, enc: 1, tl: 1 },
  { name: 'Rope, 20 m (TL4)', category: 'Field Equipment', cost: 40, enc: 1, tl: 4 },
  { name: 'Glowbug', category: 'Field Equipment', cost: 5, enc: 0, tl: 3, notes: 'Adhesive light disc; 10 m radius for 24 hrs; 100 recharged per Type A cell' },
  { name: 'Thermal Flare', category: 'Field Equipment', cost: 5, enc: 0, tl: 3, notes: 'Burns 2 hrs bright light OR fires 200 m as signal/weapon (1d6 dmg)' },
  { name: 'Instapanel', category: 'Field Equipment', cost: 50, enc: 1, tl: 4, notes: 'Expands into a 2×2 m rigid ceraplast sheet; takes 5 min to harden' },
  { name: 'Scout Report', category: 'Field Equipment', cost: 200, enc: 0, tl: 4, notes: 'Maps, cultural info, and taboos for a specific world' },
  { name: 'Vacc Fresher', category: 'Field Equipment', cost: 400, enc: 3, tl: 4, notes: 'Refills vacc suit O2 tanks; 10 min + 1 Type A cell per refill' },

  // Lifestyle
  { name: 'Lifestyle: Slum', category: 'Lifestyle', cost: 5, enc: 0, tl: 0, notes: 'Per day — bare survival, squat, scraps' },
  { name: 'Lifestyle: Poor', category: 'Lifestyle', cost: 10, enc: 0, tl: 0, notes: 'Per day — barracks, public transit, infrequent luxuries' },
  { name: 'Lifestyle: Common', category: 'Lifestyle', cost: 15, enc: 0, tl: 0, notes: 'Per day — private apartment, rented vehicle' },
  { name: 'Lifestyle: Good', category: 'Lifestyle', cost: 25, enc: 0, tl: 0, notes: 'Per day — townhouse, personal vehicle' },
  { name: 'Lifestyle: Elite', category: 'Lifestyle', cost: 200, enc: 0, tl: 0, notes: 'Per day — luxury penthouse, staff' },
];
