/**
 * Stars Without Number Revised Deluxe — Ship Data
 * All hull types, drive upgrades, weapons, defenses, and fittings.
 * Numbers taken directly from the SWN Revised Deluxe rulebook.
 */

import type { Ship, HullClass } from '../types/ship';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface HullType {
  id: string;
  name: string;
  cost: number;           // credits
  speed: number | null;   // null for stations
  armor: number;
  hp: number;
  crewMin: number;
  crewMax: number;
  ac: number;
  powerFree: number;
  massFree: number;
  hardpoints: number;
  class: HullClass;
  isStation?: boolean;
}

export interface WeaponDef {
  id: string;
  name: string;
  cost: number;           // credits
  ammoCost?: number;      // credits per reload, if applicable
  damage: string;
  power: number;
  mass: number;
  hardpoints: number;
  minClass: HullClass;
  minTL: number;
  ap: number;
  qualities: string[];
}

export interface DefenseDef {
  id: string;
  name: string;
  baseCost: number;
  costScaled: boolean;    // multiply by COST_MULT[class] when true
  power: number;
  mass: number;
  massScaled: boolean;    // multiply by PM_MULT[class] when true
  minClass: HullClass;
  acBonus: number;
  hpBonus: number;
  speedPenalty: number;
  description: string;
}

export interface FittingDef {
  id: string;
  name: string;
  baseCost: number;
  costScaled: boolean;
  /** True for rarely-purchasable pretech whose cost is GM-determined (not normally buyable). */
  costSpecial?: boolean;
  power: number;
  powerScaled: boolean;
  mass: number;
  massScaled: boolean;
  minClass: HullClass;
  maxClass?: HullClass;
  repeatable: boolean;
  description: string;
}

export interface ModDef {
  id: string;
  name: string;
  /** Minimum Fix skill to install and maintain. */
  fixRequired: number;
  /** Cost as a percent of base hull cost (e.g. 10 = 10%). */
  costPct: number;
  /** Pretech components required per hull class (0 = none). */
  componentsPerClass: number;
  /** Can be installed multiple times. */
  repeatable: boolean;
  description: string;
}

export interface DriveUpgrade {
  rating: number;         // 2–6 (drive-1 is included in hull)
  cost: number;           // base credits; cost-scaled by COST_MULT[class] (book marks all drives with *)
  power: number;          // base value; multiply by PM_MULT[class]
  mass: number;           // base value; multiply by PM_MULT[class]
  minClass: HullClass;
  costScaled: true;
  powerScaled: true;
  massScaled: true;
}

/** All derived / computed stats for a fully-built ship. */
export interface DerivedShip {
  // Hull reference
  hull: HullType;

  // Resource usage
  powerUsed: number;
  powerFree: number;
  /** Effective power capacity (hull base + System Drive bonus if installed). */
  powerTotal: number;
  massUsed: number;
  massFree: number;
  /** Effective mass capacity (hull base ×2 if System Drive installed). */
  massTotal: number;
  hardpointsUsed: number;
  hardpointsFree: number;

  // Violation flags
  overPower: boolean;
  overMass: boolean;
  overHardpoints: boolean;
  /** Class/crew build-constraint violations (drive minClass, fitting min/maxClass, crew bounds). */
  buildErrors: string[];

  // Combat stats
  ac: number;
  hpMax: number;
  speed: number | null;

  // Cost breakdown
  hullCost: number;
  driveCost: number;
  weaponsCost: number;
  defensesCost: number;
  fittingsCost: number;
  totalCost: number;
  maintenanceCost: number;  // 5% of totalCost per year

  /** True when a System Drive fitting is installed (no interstellar drills; cost/power/mass adjusted). */
  hasSystemDrive: boolean;
}

// ---------------------------------------------------------------------------
// Class order and scaling multipliers
// ---------------------------------------------------------------------------

export const HULL_CLASS_ORDER: HullClass[] = ['Fighter', 'Frigate', 'Cruiser', 'Capital'];

/**
 * Cost scaling multiplier indexed by hull class (the book's `*` rule, p.100–101).
 * Used for items marked costScaled = true.
 * Frigate = 10×, Cruiser = 25×, Capital = 100× (fighter baseline = 1×).
 * (Worked example p.101: a frigate Drill Course Regulator pays 250,000, not 25,000.)
 */
export const COST_MULT: Record<HullClass, number> = {
  Fighter: 1,
  Frigate: 10,
  Cruiser: 25,
  Capital: 100,
};

/**
 * Power / mass scaling multiplier indexed by hull class.
 * Used for drive upgrades (marked #) and items marked powerScaled / massScaled.
 * Fighter = 1×, Frigate = 2×, Cruiser = 3×, Capital = 4×.
 * Results are always rounded up (ceiling).
 */
export const PM_MULT: Record<HullClass, number> = {
  Fighter: 1,
  Frigate: 2,
  Cruiser: 3,
  Capital: 4,
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Return the actual cost of an item given its baseCost and whether it scales. */
export function scaleCost(baseCost: number, costScaled: boolean, hullClass: HullClass): number {
  return costScaled ? baseCost * COST_MULT[hullClass] : baseCost;
}

/**
 * Return the actual power or mass of an item given its base value and whether
 * it scales with hull class.  Drive upgrade values use ceiling rounding.
 */
export function scalePowerMass(
  base: number,
  scaled: boolean,
  hullClass: HullClass,
): number {
  if (!scaled) return base;
  return Math.ceil(base * PM_MULT[hullClass]);
}

// ---------------------------------------------------------------------------
// Weapon-quality helpers
// ---------------------------------------------------------------------------

/**
 * Extract the base ammo count from an "Ammo N" quality string, or null if none.
 * The actual capacity scales by hull class: base × PM_MULT[class].
 */
export function parseAmmoQuality(qualities: string[]): number | null {
  for (const q of qualities) {
    const m = q.match(/^Ammo\s+(\d+)$/i);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

/** Actual ammo capacity for a weapon on a given hull class (base × PM_MULT[class]). */
export function weaponAmmoCapacity(weapon: WeaponDef, hullClass: HullClass): number | null {
  const base = parseAmmoQuality(weapon.qualities);
  if (base === null) return null;
  return base * PM_MULT[hullClass];
}

// ---------------------------------------------------------------------------
// Hull Types
// ---------------------------------------------------------------------------

export const HULL_TYPES: HullType[] = [
  {
    id: 'strike-fighter',
    name: 'Strike Fighter',
    cost: 200_000,
    speed: 5,
    armor: 5,
    hp: 8,
    crewMin: 1,
    crewMax: 1,
    ac: 16,
    powerFree: 5,
    massFree: 2,
    hardpoints: 1,
    class: 'Fighter',
  },
  {
    id: 'shuttle',
    name: 'Shuttle',
    cost: 200_000,
    speed: 3,
    armor: 0,
    hp: 15,
    crewMin: 1,
    crewMax: 10,
    ac: 11,
    powerFree: 3,
    massFree: 5,
    hardpoints: 1,
    class: 'Fighter',
  },
  {
    id: 'free-merchant',
    name: 'Free Merchant',
    cost: 500_000,
    speed: 3,
    armor: 2,
    hp: 20,
    crewMin: 1,
    crewMax: 6,
    ac: 14,
    powerFree: 10,
    massFree: 15,
    hardpoints: 2,
    class: 'Frigate',
  },
  {
    id: 'patrol-boat',
    name: 'Patrol Boat',
    cost: 2_500_000,
    speed: 4,
    armor: 5,
    hp: 25,
    crewMin: 5,
    crewMax: 20,
    ac: 14,
    powerFree: 15,
    massFree: 10,
    hardpoints: 4,
    class: 'Frigate',
  },
  {
    id: 'corvette',
    name: 'Corvette',
    cost: 4_000_000,
    speed: 2,
    armor: 10,
    hp: 40,
    crewMin: 10,
    crewMax: 40,
    ac: 13,
    powerFree: 15,
    massFree: 15,
    hardpoints: 6,
    class: 'Frigate',
  },
  {
    id: 'heavy-frigate',
    name: 'Heavy Frigate',
    cost: 7_000_000,
    speed: 1,
    armor: 10,
    hp: 50,
    crewMin: 30,
    crewMax: 120,
    ac: 15,
    powerFree: 25,
    massFree: 20,
    hardpoints: 8,
    class: 'Frigate',
  },
  {
    id: 'bulk-freighter',
    name: 'Bulk Freighter',
    cost: 5_000_000,
    speed: 0,
    armor: 0,
    hp: 40,
    crewMin: 10,
    crewMax: 40,
    ac: 11,
    powerFree: 15,
    massFree: 25,
    hardpoints: 2,
    class: 'Cruiser',
  },
  {
    id: 'fleet-cruiser',
    name: 'Fleet Cruiser',
    cost: 10_000_000,
    speed: 1,
    armor: 15,
    hp: 60,
    crewMin: 50,
    crewMax: 200,
    ac: 14,
    powerFree: 50,
    massFree: 30,
    hardpoints: 10,
    class: 'Cruiser',
  },
  {
    id: 'battleship',
    name: 'Battleship',
    cost: 50_000_000,
    speed: 0,
    armor: 20,
    hp: 100,
    crewMin: 200,
    crewMax: 1000,
    ac: 16,
    powerFree: 75,
    massFree: 50,
    hardpoints: 15,
    class: 'Capital',
  },
  {
    id: 'carrier',
    name: 'Carrier',
    cost: 60_000_000,
    speed: 0,
    armor: 10,
    hp: 75,
    crewMin: 300,
    crewMax: 1500,
    ac: 14,
    powerFree: 50,
    massFree: 100,
    hardpoints: 4,
    class: 'Capital',
  },
  {
    id: 'small-station',
    name: 'Small Station',
    cost: 5_000_000,
    speed: null,
    armor: 5,
    hp: 120,
    crewMin: 20,
    crewMax: 200,
    ac: 11,
    powerFree: 50,
    massFree: 40,
    hardpoints: 10,
    class: 'Cruiser',
    isStation: true,
  },
  {
    id: 'large-station',
    name: 'Large Station',
    cost: 40_000_000,
    speed: null,
    armor: 20,
    hp: 120,
    crewMin: 100,
    crewMax: 1000,
    ac: 17,
    powerFree: 125,
    massFree: 75,
    hardpoints: 30,
    class: 'Capital',
    isStation: true,
  },
];

// ---------------------------------------------------------------------------
// Drive Upgrades
// ---------------------------------------------------------------------------

export const DRIVE_UPGRADES: DriveUpgrade[] = [
  {
    rating: 2,
    cost: 10_000,
    power: 1,
    mass: 1,
    minClass: 'Fighter',
    costScaled: true,
    powerScaled: true,
    massScaled: true,
  },
  {
    rating: 3,
    cost: 20_000,
    power: 2,
    mass: 2,
    minClass: 'Fighter',
    costScaled: true,
    powerScaled: true,
    massScaled: true,
  },
  {
    rating: 4,
    cost: 40_000,
    power: 2,
    mass: 3,
    minClass: 'Frigate',
    costScaled: true,
    powerScaled: true,
    massScaled: true,
  },
  {
    rating: 5,
    cost: 100_000,
    power: 3,
    mass: 3,
    minClass: 'Frigate',
    costScaled: true,
    powerScaled: true,
    massScaled: true,
  },
  {
    rating: 6,
    cost: 500_000,
    power: 3,
    mass: 4,
    minClass: 'Cruiser',
    costScaled: true,
    powerScaled: true,
    massScaled: true,
  },
];

// ---------------------------------------------------------------------------
// Weapons
// ---------------------------------------------------------------------------

export const WEAPONS: WeaponDef[] = [
  {
    id: 'multifocal-laser',
    name: 'Multifocal Laser',
    cost: 100_000,
    damage: '1d4',
    power: 5,
    mass: 1,
    hardpoints: 1,
    minClass: 'Fighter',
    minTL: 4,
    ap: 20,
    qualities: [],
  },
  {
    id: 'reaper-battery',
    name: 'Reaper Battery',
    cost: 100_000,
    damage: '3d4',
    power: 4,
    mass: 1,
    hardpoints: 1,
    minClass: 'Fighter',
    minTL: 4,
    ap: 0,
    qualities: ['Clumsy'],
  },
  {
    id: 'fractal-impact-charge',
    name: 'Fractal Impact Charge',
    cost: 200_000,
    ammoCost: 500,
    damage: '2d6',
    power: 5,
    mass: 1,
    hardpoints: 1,
    minClass: 'Fighter',
    minTL: 4,
    ap: 15,
    qualities: ['Ammo 4'],
  },
  {
    id: 'polyspectral-mes-beam',
    name: 'Polyspectral MES Beam',
    cost: 2_000_000,
    damage: '2d4',
    power: 5,
    mass: 1,
    hardpoints: 1,
    minClass: 'Fighter',
    minTL: 5,
    ap: 25,
    qualities: [],
  },
  {
    id: 'sandthrower',
    name: 'Sandthrower',
    cost: 50_000,
    damage: '2d4',
    power: 3,
    mass: 1,
    hardpoints: 1,
    minClass: 'Fighter',
    minTL: 4,
    ap: 0,
    qualities: ['Flak'],
  },
  {
    id: 'flak-emitter-battery',
    name: 'Flak Emitter Battery',
    cost: 500_000,
    damage: '2d6',
    power: 5,
    mass: 3,
    hardpoints: 1,
    minClass: 'Frigate',
    minTL: 4,
    ap: 10,
    qualities: ['Flak'],
  },
  {
    id: 'torpedo-launcher',
    name: 'Torpedo Launcher',
    cost: 500_000,
    ammoCost: 2_500,
    damage: '3d8',
    power: 10,
    mass: 3,
    hardpoints: 1,
    minClass: 'Frigate',
    minTL: 4,
    ap: 20,
    qualities: ['Ammo 4'],
  },
  {
    id: 'charged-particle-caster',
    name: 'Charged Particle Caster',
    cost: 800_000,
    damage: '3d6',
    power: 10,
    mass: 1,
    hardpoints: 2,
    minClass: 'Frigate',
    minTL: 4,
    ap: 15,
    qualities: ['Clumsy'],
  },
  {
    id: 'plasma-beam',
    name: 'Plasma Beam',
    cost: 700_000,
    damage: '3d6',
    power: 5,
    mass: 2,
    hardpoints: 2,
    minClass: 'Frigate',
    minTL: 4,
    ap: 10,
    qualities: [],
  },
  {
    id: 'mag-spike-array',
    name: 'Mag Spike Array',
    cost: 1_000_000,
    ammoCost: 5_000,
    damage: '2d6+2',
    power: 5,
    mass: 2,
    hardpoints: 2,
    minClass: 'Frigate',
    minTL: 4,
    ap: 10,
    qualities: ['Flak', 'Ammo 5'],
  },
  {
    id: 'nuclear-missiles',
    name: 'Nuclear Missiles',
    cost: 50_000,
    ammoCost: 5_000,
    damage: 'Special',
    power: 5,
    mass: 1,
    hardpoints: 2,
    minClass: 'Frigate',
    minTL: 4,
    ap: 0,
    qualities: ['Ammo 5'],
  },
  {
    id: 'spinal-beam-cannon',
    name: 'Spinal Beam Cannon',
    cost: 1_500_000,
    damage: '3d10',
    power: 10,
    mass: 5,
    hardpoints: 3,
    minClass: 'Cruiser',
    minTL: 4,
    ap: 15,
    qualities: ['Clumsy'],
  },
  {
    id: 'smart-cloud',
    name: 'Smart Cloud',
    cost: 2_000_000,
    damage: '3d10',
    power: 10,
    mass: 5,
    hardpoints: 2,
    minClass: 'Cruiser',
    minTL: 4,
    ap: 0,
    qualities: ['Cloud', 'Clumsy'],
  },
  {
    id: 'gravcannon',
    name: 'Gravcannon',
    cost: 2_000_000,
    damage: '4d6',
    power: 15,
    mass: 4,
    hardpoints: 3,
    minClass: 'Cruiser',
    minTL: 4,
    ap: 20,
    qualities: [],
  },
  {
    id: 'spike-inversion-projector',
    name: 'Spike Inversion Projector',
    cost: 2_500_000,
    damage: '3d8',
    power: 10,
    mass: 3,
    hardpoints: 3,
    minClass: 'Cruiser',
    minTL: 4,
    ap: 15,
    qualities: [],
  },
  {
    id: 'vortex-tunnel-inductor',
    name: 'Vortex Tunnel Inductor',
    cost: 5_000_000,
    damage: '3d20',
    power: 20,
    mass: 10,
    hardpoints: 4,
    minClass: 'Capital',
    minTL: 4,
    ap: 20,
    qualities: ['Clumsy'],
  },
  {
    id: 'mass-cannon',
    name: 'Mass Cannon',
    cost: 5_000_000,
    ammoCost: 50_000,
    damage: '2d20',
    power: 10,
    mass: 5,
    hardpoints: 4,
    minClass: 'Capital',
    minTL: 4,
    ap: 20,
    qualities: ['Ammo 4'],
  },
  {
    id: 'lightning-charge-mantle',
    name: 'Lightning Charge Mantle',
    cost: 4_000_000,
    damage: '1d20',
    power: 10,
    mass: 5,
    hardpoints: 2,
    minClass: 'Capital',
    minTL: 4,
    ap: 5,
    qualities: ['Cloud'],
  },
  {
    id: 'singularity-gun',
    name: 'Singularity Gun',
    cost: 20_000_000,
    damage: '5d20',
    power: 25,
    mass: 10,
    hardpoints: 5,
    minClass: 'Capital',
    minTL: 5,
    ap: 25,
    qualities: [],
  },
];

// ---------------------------------------------------------------------------
// Defenses
// ---------------------------------------------------------------------------

export const DEFENSES: DefenseDef[] = [
  {
    id: 'ablative-hull-compartments',
    name: 'Ablative Hull Compartments',
    baseCost: 100_000,
    costScaled: true,
    power: 5,
    mass: 2,
    massScaled: true,
    minClass: 'Capital',
    acBonus: 1,
    hpBonus: 20,
    speedPenalty: 0,
    description: 'Reinforced compartmentalization; +20 max HP and +1 AC.',
  },
  {
    id: 'augmented-plating',
    name: 'Augmented Plating',
    baseCost: 25_000,
    costScaled: true,
    power: 0,
    mass: 1,
    massScaled: true,
    minClass: 'Fighter',
    acBonus: 2,
    hpBonus: 0,
    speedPenalty: -1,
    description: '+2 AC but reduces speed by 1.',
  },
  {
    id: 'boarding-countermeasures',
    name: 'Boarding Countermeasures',
    baseCost: 25_000,
    costScaled: true,
    power: 2,
    mass: 1,
    massScaled: true,
    minClass: 'Frigate',
    acBonus: 0,
    hpBonus: 0,
    speedPenalty: 0,
    description: 'Hardened bulkheads; boarders have 1-in-6 chance to reach the bridge.',
  },
  {
    id: 'burst-ecm-generator',
    name: 'Burst ECM Generator',
    baseCost: 25_000,
    costScaled: true,
    power: 2,
    mass: 1,
    massScaled: true,
    minClass: 'Frigate',
    acBonus: 0,
    hpBonus: 0,
    speedPenalty: 0,
    description: 'Negate one successful hit per engagement.',
  },
  {
    id: 'foxer-drones',
    name: 'Foxer Drones',
    baseCost: 10_000,
    costScaled: true,
    power: 2,
    mass: 1,
    massScaled: true,
    minClass: 'Cruiser',
    acBonus: 2,
    hpBonus: 0,
    speedPenalty: 0,
    description: 'Ammo 5 per engagement (×2 Cruiser, ×3 Capital). Each activation grants +2 AC for one round.',
  },
  {
    id: 'grav-eddy-displacer',
    name: 'Grav Eddy Displacer',
    baseCost: 50_000,
    costScaled: true,
    power: 5,
    mass: 2,
    massScaled: true,
    minClass: 'Frigate',
    acBonus: 0,
    hpBonus: 0,
    speedPenalty: 0,
    description: '1-in-6 chance any hit is completely negated.',
  },
  {
    id: 'hardened-polyceramic-overlay',
    name: 'Hardened Polyceramic Overlay',
    baseCost: 25_000,
    costScaled: true,
    power: 0,
    mass: 1,
    massScaled: true,
    minClass: 'Fighter',
    acBonus: 0,
    hpBonus: 0,
    speedPenalty: 0,
    description: 'Reduces the AP of all incoming weapons by 5.',
  },
  {
    id: 'planetary-defense-array',
    name: 'Planetary Defense Array',
    baseCost: 50_000,
    costScaled: true,
    power: 4,
    mass: 2,
    massScaled: true,
    minClass: 'Frigate',
    acBonus: 0,
    hpBonus: 0,
    speedPenalty: 0,
    description: 'Protects one hemisphere from bombardment and meteors; useless in ship combat.',
  },
  {
    id: 'point-defense-lasers',
    name: 'Point Defense Lasers',
    baseCost: 10_000,
    costScaled: true,
    power: 3,
    mass: 2,
    massScaled: true,
    minClass: 'Frigate',
    acBonus: 2,
    hpBonus: 0,
    speedPenalty: 0,
    description: '+2 AC vs torpedo and charge weapons; detonates incoming munitions.',
  },
];

// ---------------------------------------------------------------------------
// Fittings
// ---------------------------------------------------------------------------

export const FITTINGS: FittingDef[] = [
  {
    id: 'advanced-lab',
    name: 'Advanced Lab',
    baseCost: 10_000,
    costScaled: true,
    power: 1,
    powerScaled: true,
    mass: 2,
    massScaled: false,
    minClass: 'Frigate',
    repeatable: false,
    description: '+1/+2/+3 skill bonus for research (frigate/cruiser/capital).',
  },
  {
    id: 'advanced-nav-computer',
    name: 'Advanced Nav Computer',
    baseCost: 10_000,
    costScaled: true,
    power: 1,
    powerScaled: true,
    mass: 0,
    massScaled: false,
    minClass: 'Frigate',
    repeatable: false,
    description: '-2 difficulty on known spike courses less than 1 year old.',
  },
  {
    id: 'amphibious-operation',
    name: 'Amphibious Operation',
    baseCost: 25_000,
    costScaled: true,
    power: 1,
    powerScaled: false,
    mass: 1,
    massScaled: true,
    minClass: 'Fighter',
    maxClass: 'Frigate',
    repeatable: false,
    description: 'Land and operate submerged; undetectable except by military sonar.',
  },
  {
    id: 'armory',
    name: 'Armory',
    baseCost: 10_000,
    costScaled: true,
    power: 0,
    powerScaled: false,
    mass: 0,
    massScaled: false,
    minClass: 'Frigate',
    repeatable: false,
    description: 'TL4 military weapons and armor for the entire crew.',
  },
  {
    id: 'atmospheric-configuration',
    name: 'Atmospheric Configuration',
    baseCost: 5_000,
    costScaled: true,
    power: 0,
    powerScaled: false,
    mass: 1,
    massScaled: true,
    minClass: 'Fighter',
    maxClass: 'Frigate',
    repeatable: false,
    description: 'Allows atmospheric landing on planets.',
  },
  {
    id: 'auto-targeting-system',
    name: 'Auto-Targeting System',
    baseCost: 50_000,
    costScaled: false,
    power: 1,
    powerScaled: false,
    mass: 0,
    massScaled: false,
    minClass: 'Fighter',
    repeatable: true,
    description: 'One weapon fires at +2 without a dedicated gunner (once per installed weapon).',
  },
  {
    id: 'automation-support',
    name: 'Automation Support',
    baseCost: 10_000,
    costScaled: true,
    power: 2,
    powerScaled: false,
    mass: 1,
    massScaled: false,
    minClass: 'Fighter',
    repeatable: false,
    description: 'Replace crew with basic robots (1,000 cr each); no wages or life support needed.',
  },
  {
    id: 'boarding-tubes',
    name: 'Boarding Tubes',
    baseCost: 5_000,
    costScaled: true,
    power: 0,
    powerScaled: false,
    mass: 1,
    massScaled: false,
    minClass: 'Frigate',
    repeatable: false,
    description: 'Forcibly invade disabled hostile ships.',
  },
  {
    id: 'cargo-space',
    name: 'Cargo Space',
    baseCost: 0,
    costScaled: false,
    power: 0,
    powerScaled: false,
    mass: 1,
    massScaled: false,
    minClass: 'Fighter',
    repeatable: true,
    description: '2/20/200/2,000 tons of pressurized cargo per mass (Fighter/Frigate/Cruiser/Capital).',
  },
  {
    id: 'cold-sleep-pods',
    name: 'Cold Sleep Pods',
    baseCost: 5_000,
    costScaled: true,
    power: 1,
    powerScaled: false,
    mass: 1,
    massScaled: false,
    minClass: 'Frigate',
    repeatable: true,
    description: 'Keep up to max crew in stasis indefinitely.',
  },
  {
    id: 'drill-course-regulator',
    name: 'Drill Course Regulator',
    baseCost: 25_000,
    costScaled: true,
    power: 1,
    powerScaled: true,
    mass: 1,
    massScaled: false,
    minClass: 'Frigate',
    repeatable: false,
    description: 'Auto-succeed on known routes up to 2× Pilot skill in hexes.',
  },
  {
    id: 'drop-pod',
    name: 'Drop Pod',
    baseCost: 300_000,
    costScaled: false,
    power: 0,
    powerScaled: false,
    mass: 2,
    massScaled: false,
    minClass: 'Frigate',
    repeatable: false,
    description: 'Stealthed troop transport; -3 to tracking; carries 100 troops.',
  },
  {
    id: 'emissions-dampers',
    name: 'Emissions Dampers',
    baseCost: 25_000,
    costScaled: true,
    power: 1,
    powerScaled: true,
    mass: 1,
    massScaled: true,
    minClass: 'Fighter',
    repeatable: false,
    description: '+2 to avoid detection; doubles in-system travel time when active.',
  },
  {
    id: 'extended-life-support',
    name: 'Extended Life Support',
    baseCost: 5_000,
    costScaled: true,
    power: 1,
    powerScaled: true,
    mass: 1,
    massScaled: true,
    minClass: 'Fighter',
    repeatable: true,
    description: '+100% max crew capacity per selection.',
  },
  {
    id: 'extended-medbay',
    name: 'Extended Medbay',
    baseCost: 5_000,
    costScaled: true,
    power: 1,
    powerScaled: true,
    mass: 1,
    massScaled: true,
    minClass: 'Fighter',
    repeatable: false,
    description: 'Medical treatment for the entire max crew simultaneously.',
  },
  {
    id: 'extended-stores',
    name: 'Extended Stores',
    baseCost: 2_500,
    costScaled: true,
    power: 0,
    powerScaled: false,
    mass: 1,
    massScaled: true,
    minClass: 'Fighter',
    repeatable: true,
    description: 'Doubles standard supply duration (base = 2 months) per selection.',
  },
  {
    id: 'fuel-bunkers',
    name: 'Fuel Bunkers',
    baseCost: 2_500,
    costScaled: true,
    power: 0,
    powerScaled: false,
    mass: 1,
    massScaled: false,
    minClass: 'Fighter',
    repeatable: true,
    description: 'One additional fuel load capacity (500 cr per load).',
  },
  {
    id: 'fuel-scoops',
    name: 'Fuel Scoops',
    baseCost: 5_000,
    costScaled: true,
    power: 2,
    powerScaled: false,
    mass: 1,
    massScaled: true,
    minClass: 'Frigate',
    repeatable: false,
    description: 'Refuel from a gas giant or star in 4 days.',
  },
  {
    id: 'hydroponic-production',
    name: 'Hydroponic Production',
    baseCost: 10_000,
    costScaled: true,
    power: 1,
    powerScaled: true,
    mass: 2,
    massScaled: true,
    minClass: 'Frigate',
    repeatable: true,
    description: 'Sustain crew equal to max crew size indefinitely.',
  },
  {
    id: 'lifeboats',
    name: 'Lifeboats',
    baseCost: 2_500,
    costScaled: true,
    power: 1,
    powerScaled: true,
    mass: 1,
    massScaled: true,
    minClass: 'Frigate',
    repeatable: false,
    description: 'Single-use escape craft for all max crew (groups of 20).',
  },
  {
    id: 'luxury-cabins',
    name: 'Luxury Cabins',
    baseCost: 10_000,
    costScaled: true,
    power: 0,
    powerScaled: false,
    mass: 1,
    massScaled: false,
    minClass: 'Frigate',
    repeatable: true,
    description: 'Luxurious quarters for 10% of max crew per selection.',
  },
  {
    id: 'mobile-extractor',
    name: 'Mobile Extractor',
    baseCost: 50_000,
    costScaled: false,
    power: 2,
    powerScaled: false,
    mass: 1,
    massScaled: false,
    minClass: 'Frigate',
    repeatable: false,
    description: 'Mine asteroids or planets; refine 1 ton/day (~500 cr). Requires 5 crew.',
  },
  {
    id: 'mobile-factory',
    name: 'Mobile Factory',
    baseCost: 50_000,
    costScaled: true,
    power: 3,
    powerScaled: false,
    mass: 2,
    massScaled: true,
    minClass: 'Cruiser',
    repeatable: false,
    description: 'TL4 fabrication; builds at 10,000 cr/day; requires 100 trained crew.',
  },
  {
    id: 'precognitive-nav-chamber',
    name: 'Precognitive Nav Chamber',
    baseCost: 100_000,
    costScaled: true,
    power: 1,
    powerScaled: false,
    mass: 0,
    massScaled: false,
    minClass: 'Frigate',
    repeatable: false,
    description: 'Precog-2 psychic auto-succeeds on drills with difficulty below 9; +2 to mishap roll.',
  },
  {
    id: 'sensor-mask',
    name: 'Sensor Mask',
    baseCost: 100_000,
    costScaled: true,
    power: 1,
    powerScaled: false,
    mass: 0,
    massScaled: false,
    minClass: 'Frigate',
    repeatable: false,
    description: 'Spoof scan as a different hull type (beaten by Program check vs DC 10).',
  },
  {
    id: 'ship-bay-fighter',
    name: 'Ship Bay/Fighter',
    baseCost: 200_000,
    costScaled: false,
    power: 0,
    powerScaled: false,
    mass: 2,
    massScaled: false,
    minClass: 'Cruiser',
    repeatable: true,
    description: 'Holds one fighter-class ship in a hangar bay.',
  },
  {
    id: 'ship-bay-frigate',
    name: 'Ship Bay/Frigate',
    baseCost: 1_000_000,
    costScaled: false,
    power: 1,
    powerScaled: false,
    mass: 4,
    massScaled: false,
    minClass: 'Capital',
    repeatable: true,
    description: 'Holds one frigate-class ship in a hangar bay.',
  },
  {
    id: 'ships-locker',
    name: "Ship's Locker",
    baseCost: 2_000,
    costScaled: true,
    power: 0,
    powerScaled: false,
    mass: 0,
    massScaled: true,
    minClass: 'Fighter',
    repeatable: false,
    description: 'TL4 general equipment for the crew; limited stock.',
  },
  {
    id: 'shiptender-mount',
    name: 'Shiptender Mount',
    baseCost: 25_000,
    costScaled: true,
    power: 0,
    powerScaled: false,
    mass: 1,
    massScaled: false,
    minClass: 'Frigate',
    repeatable: false,
    description: 'Allows a smaller-class ship to ride the spike drive.',
  },
  {
    id: 'smugglers-hold',
    name: "Smuggler's Hold",
    baseCost: 10_000,
    costScaled: true,
    power: 0,
    powerScaled: false,
    mass: 1,
    massScaled: false,
    minClass: 'Frigate',
    repeatable: false,
    description: 'Hidden cargo: 200kg/2t/20t/200t (Fighter/Frigate/Cruiser/Capital).',
  },
  {
    id: 'survey-sensor-array',
    name: 'Survey Sensor Array',
    baseCost: 5_000,
    costScaled: true,
    power: 2,
    powerScaled: false,
    mass: 1,
    massScaled: true,
    minClass: 'Frigate',
    repeatable: false,
    description: '+2 to scan checks; enables visual spying, subterranean scans, and life detection.',
  },
  {
    id: 'vehicle-transport-fittings',
    name: 'Vehicle Transport Fittings',
    baseCost: 2_500,
    costScaled: true,
    power: 1,
    powerScaled: false,
    mass: 1,
    massScaled: true,
    minClass: 'Frigate',
    repeatable: false,
    description: 'Vehicles use 50% normal cargo space; 4 vehicles/round load or unload.',
  },
  {
    id: 'workshop',
    name: 'Workshop',
    baseCost: 500,
    costScaled: true,
    power: 1,
    powerScaled: false,
    mass: 0.5,
    massScaled: true,
    minClass: 'Frigate',
    repeatable: false,
    description: 'TL4 fabrication: frigate = personal gear, cruiser = vehicles, capital = ships.',
  },
  // ── Fittings added from p.101 (were previously missing) ──────────────────────
  {
    id: 'cargo-lighter',
    name: 'Cargo Lighter',
    baseCost: 25_000,
    costScaled: false,
    power: 0,
    powerScaled: false,
    mass: 2,
    massScaled: false,
    minClass: 'Frigate',
    repeatable: true,
    description: 'Orbit-to-surface shuttle for cruiser+ hulls; carries a container of up to 200 tons each way (~20 min).',
  },
  {
    id: 'colony-core',
    name: 'Colony Core',
    baseCost: 100_000,
    costScaled: true,
    power: 4,
    powerScaled: false,
    mass: 2,
    massScaled: true,
    minClass: 'Frigate',
    repeatable: false,
    description: 'One-time deconstruction into a colony base for up to 5× max crew. Once activated the ship can never fly again.',
  },
  {
    id: 'exodus-bay',
    name: 'Exodus Bay',
    baseCost: 50_000,
    costScaled: true,
    power: 1,
    powerScaled: true,
    mass: 2,
    massScaled: true,
    minClass: 'Cruiser',
    repeatable: true,
    description: 'Cold-sleep berths for 1,000 colonists (cruiser) / 5,000 (capital); doubles per selection. Rated for 100 years.',
  },
  {
    id: 'psionic-anchorpoint',
    name: 'Psionic Anchorpoint',
    baseCost: 0,
    costScaled: false,
    costSpecial: true,
    power: 3,
    powerScaled: false,
    mass: 0,
    massScaled: false,
    minClass: 'Frigate',
    repeatable: false,
    description: 'Pretech relic (rarely available). Imprinted psychics can sense/affect anything within 10 m of it across the system.',
  },
  {
    id: 'system-drive',
    name: 'System Drive',
    baseCost: 0,
    costScaled: false,
    power: 0,
    powerScaled: false,
    mass: 0,
    massScaled: false,
    minClass: 'Fighter',
    repeatable: false,
    description: 'Replaces the drive-1 spike drive: no interstellar drills, but lowers hull cost 10% and grants +1/+2/+3/+4 power (×2 free mass) by class.',
  },
  {
    id: 'teleportation-pads',
    name: 'Teleportation Pads',
    baseCost: 0,
    costScaled: false,
    costSpecial: true,
    power: 1,
    powerScaled: false,
    mass: 1,
    massScaled: false,
    minClass: 'Frigate',
    repeatable: false,
    description: 'Pretech (rarely available). Teleports up to a dozen people or 1,200 kg to/from a surface or ship within tens of thousands of km; once per 5 min.',
  },
  {
    id: 'tractor-beams',
    name: 'Tractor Beams',
    baseCost: 10_000,
    costScaled: true,
    power: 2,
    powerScaled: false,
    mass: 1,
    massScaled: false,
    minClass: 'Frigate',
    repeatable: false,
    description: 'Push/pull objects up to one hull class smaller in low gravity; can haul them into cargo bays. Useless near planetary gravity.',
  },
];

// ---------------------------------------------------------------------------
// Ship Mods  (p.109 SWN Revised Deluxe)
// ---------------------------------------------------------------------------

export const SHIP_MODS: ModDef[] = [
  {
    id: 'cargo-efficiency-bays',
    name: 'Cargo Efficiency Bays',
    fixRequired: 1,
    costPct: 10,
    componentsPerClass: 1,
    repeatable: false,
    description: 'Free Mass −10% (round up), but each Mass spent on Cargo Space counts as 2.',
  },
  {
    id: 'compact-magazines',
    name: 'Compact Magazines',
    fixRequired: 1,
    costPct: 5,
    componentsPerClass: 0,
    repeatable: false,
    description: 'The ship can carry twice as much ammunition as normal.',
  },
  {
    id: 'drill-velocity-upgrade',
    name: 'Drill Velocity Upgrade',
    fixRequired: 2,
    costPct: 10,
    componentsPerClass: 1,
    repeatable: false,
    description: 'Spike drive counts as one level better for transit speed and maximum drill range (max drive-6).',
  },
  {
    id: 'emergency-drill-activation',
    name: 'Emergency Drill Activation',
    fixRequired: 3,
    costPct: 20,
    componentsPerClass: 2,
    repeatable: false,
    description: 'Can engage spike drives near a planet. Drill difficulty +2 in-system, +4 if landed. Destroys everything within 200 m. Once per 4 weeks.',
  },
  {
    id: 'emergency-thruster-boost',
    name: 'Emergency Thruster Boost',
    fixRequired: 1,
    costPct: 10,
    componentsPerClass: 0,
    repeatable: false,
    description: 'Once per space combat, gain +2 Speed for three rounds.',
  },
  {
    id: 'engine-optimization',
    name: 'Engine Optimization',
    fixRequired: 2,
    costPct: 10,
    componentsPerClass: 1,
    repeatable: false,
    description: 'Ship Speed increases by 1.',
  },
  {
    id: 'eternal-reactor',
    name: 'Eternal Reactor',
    fixRequired: 2,
    costPct: 5,
    componentsPerClass: 2,
    repeatable: false,
    description: 'Replaces fuel tanks with pretech energy cores. No longer needs to refuel for drills or operation.',
  },
  {
    id: 'extended-mass-support',
    name: 'Extended Mass Support',
    fixRequired: 1,
    costPct: 10,
    componentsPerClass: 1,
    repeatable: true,
    description: 'Lose up to 10 free Power; gain half as many free Mass (rounded down). Can be installed multiple times.',
  },
  {
    id: 'low-emissions',
    name: 'Low Emissions',
    fixRequired: 1,
    costPct: 10,
    componentsPerClass: 1,
    repeatable: false,
    description: 'Any sensor checks to detect the ship have their difficulty increased by +2.',
  },
  {
    id: 'nemesis-tracker',
    name: 'Nemesis Tracker',
    fixRequired: 3,
    costPct: 5,
    componentsPerClass: 2,
    repeatable: false,
    description: 'Once per ship combat, a gunner can take an Instant action to cause a weapon shot to hit, regardless of the hit roll.',
  },
  {
    id: 'oversized-mountings',
    name: 'Oversized Mountings',
    fixRequired: 2,
    costPct: 15,
    componentsPerClass: 1,
    repeatable: false,
    description: 'Mount one specific weapon or fitting that normally requires a hull size one step larger.',
  },
  {
    id: 'power-trunk-streamlining',
    name: 'Power Trunk Streamlining',
    fixRequired: 1,
    costPct: 10,
    componentsPerClass: 1,
    repeatable: true,
    description: 'Lose up to 5 free Mass; gain twice as many free Power. Can be installed multiple times.',
  },
  {
    id: 'q-ship-cladding',
    name: 'Q-Ship Cladding',
    fixRequired: 1,
    costPct: 5,
    componentsPerClass: 0,
    repeatable: false,
    description: 'Weapons concealed from observation and standard scans when not deployed. Ship appears as a merchant or freighter of its size class.',
  },
  {
    id: 'regenerative-armor',
    name: 'Regenerative Armor',
    fixRequired: 3,
    costPct: 15,
    componentsPerClass: 2,
    repeatable: false,
    description: 'Ship Armor score increases by 5 points.',
  },
  {
    id: 'reinforced-armor',
    name: 'Reinforced Armor',
    fixRequired: 1,
    costPct: 5,
    componentsPerClass: 0,
    repeatable: false,
    description: "Ship Armor score increases by the installing engineer's Fix skill. Loses 1 Power and 1 Mass.",
  },
  {
    id: 'specialized-mountings',
    name: 'Specialized Mountings',
    fixRequired: 1,
    costPct: 10,
    componentsPerClass: 0,
    repeatable: false,
    description: 'One chosen weapon or fitting requires only half normal Power and Mass (rounded down, minimum 1).',
  },
  {
    id: 'volley-capacitors',
    name: 'Volley Capacitors',
    fixRequired: 2,
    costPct: 10,
    componentsPerClass: 0,
    repeatable: false,
    description: 'Once per combat, the ship\'s gunner gets 4 Command Points that must be spent on gunnery actions.',
  },
  {
    id: 'weapon-overcharge',
    name: 'Weapon Overcharge',
    fixRequired: 2,
    costPct: 5,
    componentsPerClass: 0,
    repeatable: true,
    description: 'One chosen weapon requires 50% more Power but rolls damage twice and takes the better result. Can be installed multiple times.',
  },
];

// ---------------------------------------------------------------------------
// deriveShip
// ---------------------------------------------------------------------------

/**
 * Compute all derived statistics for a ship configuration.
 *
 * Scaling rules applied:
 *  - Drive upgrade power/mass: scalePowerMass with hull class (ceiling).
 *  - Weapon power/mass/hardpoints/cost: not scaled.
 *  - Defense mass: scalePowerMass when massScaled; cost: scaleCost when costScaled.
 *  - Fitting power: scalePowerMass when powerScaled; mass: scalePowerMass when
 *    massScaled; cost: scaleCost when costScaled.
 */
export function deriveShip(ship: Ship): DerivedShip {
  // ── Hull ──────────────────────────────────────────────────────────────────
  const hull = HULL_TYPES.find((h) => h.id === ship.hullId) ?? HULL_TYPES[0];
  const hullClass = hull.class;

  // ── System Drive ──────────────────────────────────────────────────────────
  // Replaces the spike drive; −10% hull cost, +PM_MULT[class] free power, ×2 free mass.
  const hasSystemDrive = ship.fittings.some(f => f.id === 'system-drive');

  // ── Drive ─────────────────────────────────────────────────────────────────
  let drivePower = 0;
  let driveMass = 0;
  let driveCost = 0;

  if (ship.driveRating >= 2) {
    const drive = DRIVE_UPGRADES.find((d) => d.rating === ship.driveRating);
    if (drive) {
      drivePower = scalePowerMass(drive.power, true, hullClass);
      driveMass  = scalePowerMass(drive.mass,  true, hullClass);
      driveCost  = scaleCost(drive.cost, drive.costScaled, hullClass);
    }
  }

  // ── Weapons ───────────────────────────────────────────────────────────────
  let weaponPower = 0;
  let weaponMass  = 0;
  let hardpointsUsed = 0;
  let weaponsCost = 0;

  for (const installed of ship.weapons) {
    const def = WEAPONS.find((w) => w.id === installed.id);
    if (!def) continue;
    const qty = installed.qty;
    weaponPower    += def.power      * qty;
    weaponMass     += def.mass       * qty;
    hardpointsUsed += def.hardpoints * qty;
    weaponsCost    += def.cost       * qty;
  }

  // ── Defenses ──────────────────────────────────────────────────────────────
  let defensePower  = 0;
  let defenseMass   = 0;
  let defensesCost  = 0;
  let acBonus       = 0;
  let hpBonus       = 0;
  let speedPenalty  = 0;

  for (const installed of ship.defenses) {
    const def = DEFENSES.find((d) => d.id === installed.id);
    if (!def) continue;
    const qty = installed.qty;
    defensePower += def.power * qty;
    defenseMass  += scalePowerMass(def.mass, def.massScaled, hullClass) * qty;
    defensesCost += scaleCost(def.baseCost, def.costScaled, hullClass) * qty;
    acBonus      += def.acBonus      * qty;
    hpBonus      += def.hpBonus      * qty;
    speedPenalty += def.speedPenalty * qty;
  }

  // ── Fittings ──────────────────────────────────────────────────────────────
  let fittingPower = 0;
  let fittingMass  = 0;
  let fittingsCost = 0;

  for (const installed of ship.fittings) {
    const def = FITTINGS.find((f) => f.id === installed.id);
    if (!def) continue;
    const qty = installed.qty;
    fittingPower += scalePowerMass(def.power, def.powerScaled, hullClass) * qty;
    fittingMass  += scalePowerMass(def.mass,  def.massScaled,  hullClass) * qty;
    fittingsCost += scaleCost(def.baseCost, def.costScaled, hullClass)    * qty;
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const powerUsed = drivePower + weaponPower + defensePower + fittingPower;
  const massUsed  = driveMass  + weaponMass  + defenseMass  + fittingMass;

  // System Drive: −10% hull cost, +PM_MULT[class] free power, ×2 free mass.
  const hullCostBase   = hasSystemDrive ? Math.round(hull.cost * 0.9) : hull.cost;
  const powerTotal     = hull.powerFree + (hasSystemDrive ? PM_MULT[hullClass] : 0);
  const massTotal      = hull.massFree  * (hasSystemDrive ? 2 : 1);
  const powerFree      = powerTotal - powerUsed;
  const massFree       = massTotal  - massUsed;
  const hardpointsFree = hull.hardpoints - hardpointsUsed;

  const totalCost = hullCostBase + driveCost + weaponsCost + defensesCost + fittingsCost;
  const maintenanceCost = Math.round(totalCost * 0.05);

  // ── Derived combat stats ──────────────────────────────────────────────────
  const ac    = hull.ac    + acBonus;
  const hpMax = hull.hp    + hpBonus;
  const speed = hull.speed === null ? null : hull.speed + speedPenalty;

  // ── Build-constraint checks (hull-class & crew minimums, p.99–101) ─────────
  const classIdx = HULL_CLASS_ORDER.indexOf(hullClass);
  const buildErrors: string[] = [];

  if (ship.driveRating >= 2) {
    const drive = DRIVE_UPGRADES.find((d) => d.rating === ship.driveRating);
    if (drive && classIdx < HULL_CLASS_ORDER.indexOf(drive.minClass)) {
      buildErrors.push(`Drive-${drive.rating} requires a ${drive.minClass}-class hull or larger.`);
    }
  }
  for (const installed of ship.weapons) {
    const def = WEAPONS.find((w) => w.id === installed.id);
    if (def && classIdx < HULL_CLASS_ORDER.indexOf(def.minClass)) {
      buildErrors.push(`${def.name} requires a ${def.minClass}-class hull or larger.`);
    }
  }
  for (const installed of ship.defenses) {
    const def = DEFENSES.find((d) => d.id === installed.id);
    if (def && classIdx < HULL_CLASS_ORDER.indexOf(def.minClass)) {
      buildErrors.push(`${def.name} requires a ${def.minClass}-class hull or larger.`);
    }
  }
  for (const installed of ship.fittings) {
    const def = FITTINGS.find((f) => f.id === installed.id);
    if (!def) continue;
    if (classIdx < HULL_CLASS_ORDER.indexOf(def.minClass)) {
      buildErrors.push(`${def.name} requires a ${def.minClass}-class hull or larger.`);
    }
    if (def.maxClass && classIdx > HULL_CLASS_ORDER.indexOf(def.maxClass)) {
      buildErrors.push(`${def.name} cannot be fitted to a hull larger than ${def.maxClass}-class.`);
    }
  }
  if (ship.currentCrew < hull.crewMin) {
    buildErrors.push(`Crew ${ship.currentCrew} is below the minimum of ${hull.crewMin} for this hull.`);
  }
  if (ship.currentCrew > hull.crewMax) {
    buildErrors.push(`Crew ${ship.currentCrew} exceeds the maximum of ${hull.crewMax} for this hull.`);
  }
  if (hasSystemDrive && ship.driveRating >= 2) {
    buildErrors.push('System Drive replaces the spike drive; drive upgrades (rating 2+) cannot be combined with it.');
  }

  return {
    hull,
    powerUsed,
    powerFree,
    powerTotal,
    massUsed,
    massFree,
    massTotal,
    hardpointsUsed,
    hardpointsFree,
    overPower:      powerFree      < 0,
    overMass:       massFree       < 0,
    overHardpoints: hardpointsFree < 0,
    buildErrors,
    ac,
    hpMax,
    speed,
    hullCost: hullCostBase,
    driveCost,
    weaponsCost,
    defensesCost,
    fittingsCost,
    totalCost,
    maintenanceCost,
    hasSystemDrive,
  };
}
