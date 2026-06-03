export interface EquipmentPackage {
  name: string;
  items: string[];
  credits: number;
}

export const EQUIPMENT_PACKAGES: EquipmentPackage[] = [
  {
    name: 'Gunslinger',
    items: ['Laser Pistol (1d6 dmg)', '8× Type A cells', 'Armored Undersuit (AC 13)', 'Backpack (TL0)', 'Monoblade Knife (1d6 dmg)', 'Compad'],
    credits: 100,
  },
  {
    name: 'Soldier',
    items: ['Combat Rifle (1d12 dmg)', '80 rounds ammo', 'Woven Body Armor (AC 15)', 'Backpack (TL0)', 'Knife (1d4 dmg)', 'Compad'],
    credits: 100,
  },
  {
    name: 'Scout',
    items: ['Laser Rifle (1d10 dmg)', '8× Type A cells', 'Armored Vacc Suit (AC 13)', 'Backpack (TL0)', 'Knife (1d4 dmg)', 'Compad', 'Survey Scanner', 'Survival Kit', 'Binoculars (TL3)'],
    credits: 25,
  },
  {
    name: 'Medic',
    items: ['Laser Pistol (1d6 dmg)', 'Backpack (TL0)', 'Secure Clothing (AC 13)', 'Medkit', '4× Lazarus Patches', 'Compad', '2× doses of Lift', 'Bioscanner'],
    credits: 25,
  },
  {
    name: 'Civilian',
    items: ['Secure Clothing (AC 13)', 'Compad'],
    credits: 700,
  },
  {
    name: 'Technician',
    items: ['Laser Pistol (1d6 dmg)', '4× Type A cells', 'Armored Undersuit (AC 13)', 'Backpack (TL0)', 'Monoblade Knife (1d6 dmg)', 'Dataslab', 'Postech Toolkit', 'Metatool', '6× units spare parts'],
    credits: 200,
  },
  {
    name: 'Barbarian',
    items: ['Spear (1d6+1 dmg)', 'Backpack (TL0)', 'Primitive Hide Armor (AC 13)', '7 days rations', 'Primitive Shield (+1 AC)', '20m rope', 'Knife (1d4 dmg)'],
    credits: 500,
  },
  {
    name: 'Blade',
    items: ['Monoblade Sword (1d8+1 dmg)', 'Backpack (TL0)', 'Woven Body Armor (AC 15)', 'Compad', 'Secure Clothing (AC 13)', 'Lazarus Patch', 'Thermal Knife (1d6 dmg)'],
    credits: 50,
  },
  {
    name: 'Thief',
    items: ['Laser Pistol (1d6 dmg)', '2× Type A cells', 'Armored Undersuit (AC 13)', 'Backpack (TL0)', 'Monoblade Knife (1d6 dmg)', 'Compad', 'Climbing Harness', 'Metatool', 'Low-light Goggles'],
    credits: 25,
  },
  {
    name: 'Hacker',
    items: ['Laser Pistol (1d6 dmg)', '2× Type A cells', 'Secure Clothing (AC 13)', 'Dataslab', 'Postech Toolkit', 'Metatool', '3× units spare parts', '2× Line Shunts'],
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
