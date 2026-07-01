/**
 * Vehicles, Drones, and Mechs — Stars Without Number Revised
 *
 * Vehicles: p. 83 (table) / pp. 82–84
 * Drones: p. 85 (table) / pp. 84–86
 * Drone Fittings: p. 86 (table)
 * Mechs: pp. 308–313 (hull table p. 309, fittings p. 310, defenses p. 312, weapons p. 313)
 */

// ---------------------------------------------------------------------------
// Vehicles (p. 83)
// ---------------------------------------------------------------------------

export interface VehicleDef {
  id: string;
  name: string;
  cost: number;
  speed: number;
  armor: number;
  /** null means "Special" (e.g. gravtank — immune to non-Heavy weapons) */
  armorSpecial?: string;
  hp: number;
  crew: number;
  tonnage: number;
  tl: number;
  weapons: number;  // number of weapons it can mount (0 for motorcycle/hovercycle)
  description: string;
}

export const VEHICLES: VehicleDef[] = [
  {
    id: 'motorcycle',
    name: 'Motorcycle',
    cost: 1_000,
    speed: 1,
    armor: 4,
    hp: 10,
    crew: 1,
    tonnage: 1,
    tl: 3,
    weapons: 0,
    description: 'Can navigate urban terrain that blocks larger vehicles. Harder in rural landscapes.',
  },
  {
    id: 'groundcar',
    name: 'Groundcar',
    cost: 5_000,
    speed: 0,
    armor: 6,
    hp: 30,
    crew: 5,
    tonnage: 10,
    tl: 3,
    weapons: 1,
    description: 'TL3 road vehicle. Can mount one weapon. Easy to construct and maintain.',
  },
  {
    id: 'hovercycle',
    name: 'Hovercycle',
    cost: 5_000,
    speed: 2,
    armor: 3,
    hp: 10,
    crew: 1,
    tonnage: 1,
    tl: 4,
    weapons: 0,
    description: 'TL4 equivalent of motorcycle. Brief boosts up to 10 m above ground, navigates all but thick forests or sheer slopes.',
  },
  {
    id: 'gravcar',
    name: 'Gravcar',
    cost: 20_000,
    speed: 2,
    armor: 4,
    hp: 25,
    crew: 5,
    tonnage: 10,
    tl: 4,
    weapons: 1,
    description: 'Standard personal transport on most TL4 worlds. Advanced worlds have planetary transit grids.',
  },
  {
    id: 'atv-explorer',
    name: 'ATV Explorer',
    cost: 15_000,
    speed: 0,
    armor: 8,
    hp: 40,
    crew: 8,
    tonnage: 25,
    tl: 3,
    weapons: 2,
    description: 'Rugged wheeled/tracked vehicle, powered by type B cells or biofuels. Extremely tough, field-repairable.',
  },
  {
    id: 'helicopter',
    name: 'Helicopter',
    cost: 25_000,
    speed: 3,
    armor: 6,
    hp: 20,
    crew: 6,
    tonnage: 50,
    tl: 3,
    weapons: 2,
    description: 'Used on TL3 worlds lacking airfields. Can hover and drop on tight landing zones. Medium-weight civilian model.',
  },
  {
    id: 'atmoflyer',
    name: 'Atmoflyer',
    cost: 30_000,
    speed: 4,
    armor: 8,
    hp: 25,
    crew: 6,
    tonnage: 50,
    tl: 3,
    weapons: 2,
    description: 'Fixed-wing aircraft for TL3 worlds without gravitic tech. Faster/simpler than helicopters, needs clear terrain for landing.',
  },
  {
    id: 'gravflyer',
    name: 'Gravflyer',
    cost: 40_000,
    speed: 5,
    armor: 8,
    hp: 25,
    crew: 6,
    tonnage: 50,
    tl: 4,
    weapons: 2,
    description: 'Standard long-distance transport on TL4 worlds. Can hover and climb with gravitic ease. Some models reach low orbit.',
  },
  {
    id: 'gravtank',
    name: 'Gravtank',
    cost: 200_000,
    speed: 2,
    armor: 0,
    armorSpecial: 'Special — immune to non-TL4 Heavy weapons; any TL4 Heavy weapon does full damage',
    hp: 50,
    crew: 3,
    tonnage: 50,
    tl: 5,
    weapons: 6,
    description: 'Main battle vehicle of prosperous TL4 worlds. Immune to small arms. Can be harmed only by TL4 Heavy weapons or demolitions charges.',
  },
];

// ---------------------------------------------------------------------------
// Drones (p. 85)
// ---------------------------------------------------------------------------

export interface DroneDef {
  id: string;
  name: string;
  cost: number;
  fittings: number;
  ac: number;
  enc: number;
  hp: number;
  range: string;
  tl: number;
  description: string;
  special?: string;
}

export const DRONES: DroneDef[] = [
  {
    id: 'primitive-drone',
    name: 'Primitive Drone',
    cost: 250,
    fittings: 1,
    ac: 12,
    enc: 2,
    hp: 1,
    range: '500 m',
    tl: 3,
    description: 'Best flying portable drone tech at TL3. Fragile, weak, and short-ranged, but cheap.',
  },
  {
    id: 'stalker',
    name: 'Stalker',
    cost: 1_000,
    fittings: 3,
    ac: 13,
    enc: 2,
    hp: 5,
    range: '2 km',
    tl: 4,
    description: 'Default TL4 workhorse drone. Available on most modern worlds.',
  },
  {
    id: 'cuttlefish',
    name: 'Cuttlefish',
    cost: 2_000,
    fittings: 5,
    ac: 13,
    enc: 2,
    hp: 10,
    range: '1 km',
    tl: 4,
    description: 'Designed for aqueous use only; functions only in liquid. Liquid support allows more fittings but sonar limits range.',
  },
  {
    id: 'ghostwalker',
    name: 'Ghostwalker',
    cost: 3_000,
    fittings: 2,
    ac: 15,
    enc: 3,
    hp: 1,
    range: '5 km',
    tl: 4,
    description: 'Stealth drone, radar-transparent. Has integral Sensor Transparency; spot difficulty 11 instead of 9.',
    special: 'Integral Sensor Transparency; spot difficulty 11',
  },
  {
    id: 'sleeper',
    name: 'Sleeper',
    cost: 2_500,
    fittings: 4,
    ac: 12,
    enc: 2,
    hp: 8,
    range: '100 km',
    tl: 4,
    description: 'Built to remain on station for long periods. Has integral Stationkeeping fitting; hovering uses only 1/288th normal power.',
    special: 'Integral Stationkeeping',
  },
  {
    id: 'void-hawk',
    name: 'Void Hawk',
    cost: 5_000,
    fittings: 4,
    ac: 14,
    enc: 6,
    hp: 15,
    range: '100 km',
    tl: 4,
    description: 'Unique deep-space drone. Unlike others, can operate in space. Range sufficient to reach adjacent ships/objects.',
    special: 'Space-capable',
  },
  {
    id: 'pax',
    name: 'Pax',
    cost: 10_000,
    fittings: 4,
    ac: 16,
    enc: 4,
    hp: 20,
    range: '100 km',
    tl: 5,
    description: 'Common pretech drone favored by the Mandate Fleet. Far exceeds modern drones despite primitive pretech standards.',
  },
  {
    id: 'alecto',
    name: 'Alecto',
    cost: 50_000,
    fittings: 4,
    ac: 18,
    enc: 4,
    hp: 30,
    range: '5,000 km',
    tl: 5,
    description: 'Full-fledged VI pretech drone; almost sentient. Can operate through quantum ECM thanks to self-reinforcing cognition. Salvaged Alectos exhibit "female" personalities.',
    special: 'VI autonomous; immune to quantum ECM',
  },
];

export interface DroneFittingDef {
  id: string;
  name: string;
  cost: number;
  tl: number;
  description: string;
}

export const DRONE_FITTINGS: DroneFittingDef[] = [
  { id: 'ammo-unit', name: 'Ammo Unit', cost: 250, tl: 4, description: 'Carries one power cell or magazine for each onboard weapon. Operator can reload as Main Action.' },
  { id: 'bomber', name: 'Bomber', cost: 500, tl: 3, description: 'Fitted to drop up to 2 grenade-sized explosives. Dropping from >30 m causes scatter.' },
  { id: 'environmental-power', name: 'Environmental Power', cost: 4_000, tl: 4, description: 'Draws power from sunlight or thermal variances; can operate indefinitely.' },
  { id: 'expert-system', name: 'Expert System', cost: 5_000, tl: 4, description: 'Sophisticated self-piloting software. Can follow flight plans, designate targets, respond to cues. +2 total attack bonus autonomously. Scrambled by quantum ECM.' },
  { id: 'extended-flight', name: 'Extended Flight', cost: 250, tl: 3, description: 'Carries a second type A cell. Can be taken multiple times.' },
  { id: 'grav-muffles', name: 'Grav Muffles', cost: 2_000, tl: 4, description: 'Inaudible from more than 5 meters away.' },
  { id: 'heavy-lift', name: 'Heavy Lift', cost: 2_000, tl: 4, description: 'Gravitic units upgraded to carry up to 20 kg of cargo. Can be fitted multiple times.' },
  { id: 'holoskin', name: 'Holoskin', cost: 3_000, tl: 4, description: 'Filmy hologram. Visual spot difficulty 10 at weapons range, 12 at observation range. Fire draws attention.' },
  { id: 'medical-support', name: 'Medical Support', cost: 2_000, tl: 4, description: 'Carries up to 12 units of medication. Launches via remote injector within 10 m (auto-hit willing, normal roll for hostile). Uses pilot\'s Heal skill or Heal-0, whichever is higher.' },
  { id: 'observation-suite', name: 'Observation Suite', cost: 250, tl: 3, description: 'Full-spectrum UV/IR visual, remote sound, radiation/chemical detectors. Focus on conversations from 2 km, works in complete darkness.' },
  { id: 'racing-gravitics', name: 'Racing Gravitics', cost: 2_000, tl: 4, description: 'Half flight endurance, but moves up to 60 m/round in combat and 200 kph out of combat.' },
  { id: 'reinforced-structure', name: 'Reinforced Structure', cost: 1_000, tl: 4, description: 'Heavier plating and sturdier frame. HP increased by 50% (round up).' },
  { id: 'sensor-transparency', name: 'Sensor Transparency', cost: 5_000, tl: 4, description: 'Anti-radar composites. Ordinary sensors don\'t detect at observation range; military sensors: Int/Program DC 9.' },
  { id: 'stationkeeping', name: 'Stationkeeping', cost: 1_000, tl: 4, description: 'Remains stationary without active control. If equipped with Observation Suite, pings operator on anomalous readings.' },
  { id: 'suicide-charge', name: 'Suicide Charge', cost: 250, tl: 3, description: 'Demo charge (see p.69). Operator triggers as attack; surprise approach needed to avoid spotting before detonation.' },
  { id: 'weapon-fitting', name: 'Weapon Fitting', cost: 1_000, tl: 4, description: 'Mounts 1 Enc of ranged weaponry (purchased separately). May be taken multiple times. Weapon requires one or more Ammo Units.' },
];

// ---------------------------------------------------------------------------
// Mechs (p. 309 hull table, p. 310 fittings, p. 312 defenses, p. 313 weapons)
// ---------------------------------------------------------------------------

export type MechClass = 'Suit' | 'Light' | 'Heavy';

export interface MechHullDef {
  id: string;
  name: string;
  cost: number;
  maintenanceCost: number;
  speed: number;
  armor: number;
  /** Notes on armor behavior */
  armorNote?: string;
  hp: number;
  ac: number;
  power: number;
  mass: number;
  hardpoints: number;
  class: MechClass;
  description: string;
}

export const MECH_HULLS: MechHullDef[] = [
  {
    id: 'shock-suit',
    name: 'Shock Suit',
    cost: 150_000,
    maintenanceCost: 500,
    speed: 4,
    armor: 12,
    armorNote: 'Suit armor does NOT apply against Heavy weapons',
    hp: 15,
    ac: 18,
    power: 10,
    mass: 5,
    hardpoints: 2,
    class: 'Suit',
    description: 'Heavily armored suit-class mech. Pilot may absorb attack damage with own HP.',
  },
  {
    id: 'specialist-suit',
    name: 'Specialist Suit',
    cost: 150_000,
    maintenanceCost: 500,
    speed: 6,
    armor: 8,
    armorNote: 'Suit armor does NOT apply against Heavy weapons',
    hp: 10,
    ac: 17,
    power: 5,
    mass: 10,
    hardpoints: 1,
    class: 'Suit',
    description: 'Fast and versatile suit-class mech with more free mass for fittings.',
  },
  {
    id: 'psi-suit',
    name: 'Psi Suit',
    cost: 300_000,
    maintenanceCost: 500,
    speed: 4,
    armor: 8,
    armorNote: 'Suit armor does NOT apply against Heavy weapons',
    hp: 15,
    ac: 20,
    power: 5,
    mass: 5,
    hardpoints: 1,
    class: 'Suit',
    description: 'Rare psimech designed for psionic pilots. Psi fittings are exclusive to psimechs.',
  },
  {
    id: 'light-shock',
    name: 'Light Shock Mech',
    cost: 500_000,
    maintenanceCost: 1_000,
    speed: 3,
    armor: 15,
    armorNote: 'Immune to non-TL4 Heavy weapons; armor subtracts from Heavy weapon damage',
    hp: 40,
    ac: 16,
    power: 20,
    mass: 10,
    hardpoints: 3,
    class: 'Light',
    description: 'Heavily-armored light mech. Immune to small arms, quantum ECM tap array deflects guided ordnance.',
  },
  {
    id: 'light-specialist',
    name: 'Light Specialist Mech',
    cost: 500_000,
    maintenanceCost: 1_000,
    speed: 5,
    armor: 10,
    armorNote: 'Immune to non-TL4 Heavy weapons; armor subtracts from Heavy weapon damage',
    hp: 30,
    ac: 15,
    power: 10,
    mass: 20,
    hardpoints: 2,
    class: 'Light',
    description: 'Fast light mech with more fitting capacity. Immune to small arms.',
  },
  {
    id: 'light-psimech',
    name: 'Light Psimech',
    cost: 1_000_000,
    maintenanceCost: 1_000,
    speed: 3,
    armor: 10,
    armorNote: 'Immune to non-TL4 Heavy weapons; armor subtracts from Heavy weapon damage',
    hp: 40,
    ac: 17,
    power: 10,
    mass: 10,
    hardpoints: 2,
    class: 'Light',
    description: 'Light psimech for psionic pilots. Psitech fittings require psionic pilot.',
  },
  {
    id: 'heavy-shock',
    name: 'Heavy Shock Mech',
    cost: 1_000_000,
    maintenanceCost: 2_000,
    speed: 2,
    armor: 25,
    armorNote: 'Immune to non-TL4 Heavy weapons; armor subtracts from Heavy weapon damage',
    hp: 70,
    ac: 15,
    power: 40,
    mass: 20,
    hardpoints: 6,
    class: 'Heavy',
    description: 'Massive heavily-armored heavy mech. Six hardpoints, extreme firepower. Requires support vehicles for maintenance.',
  },
  {
    id: 'heavy-specialist',
    name: 'Heavy Specialist Mech',
    cost: 1_000_000,
    maintenanceCost: 2_000,
    speed: 4,
    armor: 15,
    armorNote: 'Immune to non-TL4 Heavy weapons; armor subtracts from Heavy weapon damage',
    hp: 50,
    ac: 14,
    power: 20,
    mass: 40,
    hardpoints: 3,
    class: 'Heavy',
    description: 'Fast heavy mech with vast fitting capacity. Ideal for specialized roles.',
  },
  {
    id: 'heavy-psimech',
    name: 'Heavy Psimech',
    cost: 2_000_000,
    maintenanceCost: 2_000,
    speed: 2,
    armor: 15,
    armorNote: 'Immune to non-TL4 Heavy weapons; armor subtracts from Heavy weapon damage',
    hp: 60,
    ac: 16,
    power: 15,
    mass: 15,
    hardpoints: 3,
    class: 'Heavy',
    description: 'Rare pretech heavy psimech. Psitech fittings require psionic pilot.',
  },
];

export interface MechFittingDef {
  id: string;
  name: string;
  /** Base cost; ×3 for Light, ×6 for Heavy */
  baseCost: number;
  /** Base power; ×2 for Light, ×4 for Heavy (for entries marked with #) */
  basePower: number;
  powerScaled: boolean;
  /** Base mass; ×2 for Light, ×4 for Heavy (for entries marked with #) */
  baseMass: number;
  massScaled: boolean;
  minClass: MechClass;
  psi: boolean;
  description: string;
}

export const MECH_FITTINGS: MechFittingDef[] = [
  { id: 'active-camo', name: 'Active Camo Surface', baseCost: 25_000, basePower: 1, powerScaled: false, baseMass: 2, massScaled: true, minClass: 'Suit', psi: false, description: 'Chromatic paneling + holoprojectors. +2 Sneak vs observers >10 m (suit), >50 m (light), >100 m (heavy).' },
  { id: 'ammo-cells', name: 'Ammunition Cells', baseCost: 10_000, basePower: 1, powerScaled: true, baseMass: 1, massScaled: false, minClass: 'Suit', psi: false, description: 'Ignore first failed ammo check per maintenance cycle. Can be fitted multiple times.' },
  { id: 'antigrav-nodes', name: 'Antigrav Nodes', baseCost: 50_000, basePower: 2, powerScaled: true, baseMass: 4, massScaled: true, minClass: 'Suit', psi: false, description: 'Enables flight at standard movement rate. Most can only be fitted on suits or light mechs. Pretech versions (≥500k) can lift heavy mechs.' },
  { id: 'augmented-enviroseals', name: 'Augmented Enviroseals', baseCost: 15_000, basePower: 1, powerScaled: false, baseMass: 2, massScaled: false, minClass: 'Suit', psi: false, description: 'Extended operation in corrosive/invasive atmospheres. ×4 radiation save interval.' },
  { id: 'breaching-tool', name: 'Breaching Tool', baseCost: 20_000, basePower: 1, powerScaled: false, baseMass: 1, massScaled: true, minClass: 'Suit', psi: false, description: 'Blows a mech-sized hole in standard postech building material in 1 round (1d6+1 vs. hardened military structures).' },
  { id: 'bridging-laminates', name: 'Bridging Laminates', baseCost: 10_000, basePower: 1, powerScaled: false, baseMass: 1, massScaled: true, minClass: 'Light', psi: false, description: 'Projects 20 m of bridge per round, up to 60 m span. Supports same-size mech. 600 m total per maintenance cycle.' },
  { id: 'cargo-space-mech', name: 'Cargo Space', baseCost: 1_000, basePower: 0, powerScaled: false, baseMass: 1, massScaled: false, minClass: 'Suit', psi: false, description: 'Protected/pressurized cargo: 100 kg (suit), 500 kg (light), 2,000 kg (heavy). Survives mech destruction on 3+.' },
  { id: 'comm-interceptors', name: 'Comm Interceptors', baseCost: 30_000, basePower: 2, powerScaled: false, baseMass: 5, massScaled: false, minClass: 'Light', psi: false, description: 'Polyspectral snoops. Auto-decrypt civilian comms; military comms require LoS and opposed Program check.' },
  { id: 'construction-array', name: 'Construction Array', baseCost: 50_000, basePower: 1, powerScaled: true, baseMass: 3, massScaled: true, minClass: 'Light', psi: false, description: 'Mobile postech workshop. Can repair/maintain itself and other mechs. Carries up to 2× own HP in repair parts.' },
  { id: 'drop-sheathing', name: 'Drop Sheathing', baseCost: 10_000, basePower: 0, powerScaled: false, baseMass: 1, massScaled: true, minClass: 'Suit', psi: false, description: 'Ablative orbital-insertion shielding. Defending sensors need Program DC 10 to detect insertion.' },
  { id: 'escape-pod', name: 'Escape Pod', baseCost: 25_000, basePower: 1, powerScaled: false, baseMass: 1, massScaled: true, minClass: 'Light', psi: false, description: 'Armored cockpit ejects 1d20×100 m away on fatal hit. Pilot may reroll failed Physical save vs. mortal injury.' },
  { id: 'field-medical-unit', name: 'Field Medical Unit', baseCost: 25_000, basePower: 2, powerScaled: false, baseMass: 1, massScaled: true, minClass: 'Suit', psi: false, description: 'Med drones provide lazarus-patch-equivalent trauma care to up to 20 allies within 200 m (Int/Heal check, 1 round).' },
  { id: 'fcu-master', name: 'Fire Control Unit/Master', baseCost: 100_000, basePower: 2, powerScaled: false, baseMass: 3, massScaled: true, minClass: 'Light', psi: false, description: 'Links up to 5 slave FCU mechs (within 1 km). Linked mechs can assign and fire weapons one at a time.' },
  { id: 'fcu-slave', name: 'Fire Control Unit/Slave', baseCost: 20_000, basePower: 1, powerScaled: false, baseMass: 1, massScaled: true, minClass: 'Light', psi: false, description: 'Required to use a friendly mech\'s FCU/Master.' },
  { id: 'grav-chutes', name: 'Grav Chutes', baseCost: 20_000, basePower: 1, powerScaled: false, baseMass: 1, massScaled: true, minClass: 'Suit', psi: false, description: 'Takes no damage from falls, including orbital insertions.' },
  { id: 'inquisitor-probe', name: 'Inquisitor Probe', baseCost: 60_000, basePower: 1, powerScaled: false, baseMass: 1, massScaled: true, minClass: 'Suit', psi: true, description: 'Psi. Telepathy-1+ pilot: target makes Mental save or pilot learns their tactical plan and foremost thoughts.' },
  { id: 'integral-maintenance', name: 'Integral Maintenance', baseCost: 30_000, basePower: 2, powerScaled: false, baseMass: 1, massScaled: true, minClass: 'Light', psi: false, description: 'Auto-applies maintenance cycle with 30 min downtime. Carries supplies for 7 cycles.' },
  { id: 'jump-coil', name: 'Jump Coil', baseCost: 60_000, basePower: 1, powerScaled: false, baseMass: 1, massScaled: true, minClass: 'Suit', psi: true, description: 'Psi. Teleporter pilot can translocate up to 5 allied mechs (≤ same size, within 10 m) along with themselves.' },
  { id: 'kinesis-boost', name: 'Kinesis Boost', baseCost: 60_000, basePower: 1, powerScaled: false, baseMass: 1, massScaled: true, minClass: 'Suit', psi: true, description: 'Psi. Telekinesis-1+ pilot: +2 Speed and +2 to all initiative rolls.' },
  { id: 'neural-activity-sensors', name: 'Neural Activity Sensors', baseCost: 60_000, basePower: 1, powerScaled: false, baseMass: 1, massScaled: true, minClass: 'Suit', psi: true, description: 'Psi. Auto-detects sentient minds within 2 km (±50 m), identifies species but not individuals.' },
  { id: 'neural-static-generator', name: 'Neural Static Generator', baseCost: 60_000, basePower: 1, powerScaled: false, baseMass: 1, massScaled: true, minClass: 'Suit', psi: true, description: 'Psi. Metapsionics-1+ pilot: auto-negates any psi mech fitting targeted at self or visible ally within 400 m. +5 Armor vs. psi weapons.' },
  { id: 'omen-tap', name: 'Omen Tap', baseCost: 60_000, basePower: 1, powerScaled: false, baseMass: 1, massScaled: true, minClass: 'Suit', psi: true, description: 'Psi. Force a visible target to reroll a successful hit or skill check. Once/round, max (Precognition level × 2)/hour.' },
  { id: 'panoptic-cloud', name: 'Panoptic Cloud', baseCost: 25_000, basePower: 2, powerScaled: false, baseMass: 2, massScaled: true, minClass: 'Light', psi: false, description: 'Swarm of micro aerostats provides audio/visual within 200 m. Triggers most security alarms.' },
  { id: 'polyspectral-sensors', name: 'Polyspectral Sensors', baseCost: 40_000, basePower: 1, powerScaled: false, baseMass: 1, massScaled: true, minClass: 'Suit', psi: false, description: 'Penetrating sensor scan to 100 m, crude model down to 1/3 m objects. Cannot penetrate EM-hardened barriers.' },
  { id: 'pulse-transceiver', name: 'Pulse Transceiver', baseCost: 75_000, basePower: 2, powerScaled: false, baseMass: 5, massScaled: false, minClass: 'Suit', psi: false, description: 'FTL comms laser to outer system rim. Two-way text/image; commercial commsats can serve as receivers.' },
  { id: 'skywatch-drones', name: 'Skywatch Drones', baseCost: 40_000, basePower: 1, powerScaled: false, baseMass: 2, massScaled: true, minClass: 'Light', psi: false, description: 'Small aerostats (10 km range, 8 hr loiter, up to 1 km altitude). Standard + IR telescopic video. Easy for anti-air to detect.' },
  { id: 'vivification-field', name: 'Vivification Field', baseCost: 60_000, basePower: 1, powerScaled: false, baseMass: 1, massScaled: true, minClass: 'Suit', psi: true, description: 'Psi. Biopsionics-1+ pilot: auto-stabilizes mortally wounded allies within 100 m, no action required.' },
  { id: 'void-thrusters', name: 'Void Thrusters', baseCost: 25_000, basePower: 1, powerScaled: true, baseMass: 2, massScaled: true, minClass: 'Suit', psi: false, description: 'Flight at normal base Speed in zero-g or microgravity. Eliminates falling damage in standard gravity.' },
];

export interface MechDefenseDef {
  id: string;
  name: string;
  /** Base cost; ×3 for Light, ×6 for Heavy */
  baseCost: number;
  /** Base power; ×2 for Light, ×4 for Heavy (for # entries) */
  basePower: number;
  powerScaled: boolean;
  /** Base mass; ×2 for Light, ×4 for Heavy (for # entries) */
  baseMass: number;
  massScaled: boolean;
  minClass: MechClass;
  description: string;
}

export const MECH_DEFENSES: MechDefenseDef[] = [
  { id: 'augmented-ecm', name: 'Augmented ECM Projector', baseCost: 75_000, basePower: 2, powerScaled: true, baseMass: 1, massScaled: true, minClass: 'Light', description: '+2 AC vs. vehicle/mech attacks, −1 Speed.' },
  { id: 'hardened-polyceramic-mech', name: 'Hardened Polyceramic Overlay', baseCost: 50_000, basePower: 1, powerScaled: true, baseMass: 1, massScaled: true, minClass: 'Light', description: 'Reduces AP of attacking weapons by 5 (cannot stack with Vanguard Plating).' },
  { id: 'mes-shunt-channels', name: 'MES Shunt Channels', baseCost: 25_000, basePower: 1, powerScaled: true, baseMass: 2, massScaled: true, minClass: 'Suit', description: 'Psitech shielding: Armor 10 vs. Psi weapons only. Stacks with Neural Static Generator bonus.' },
  { id: 'morphic-silhouette', name: 'Morphic Silhouette Damper', baseCost: 25_000, basePower: 1, powerScaled: true, baseMass: 2, massScaled: true, minClass: 'Suit', description: 'Halves effective range of any weapon targeting this mech. Lost if attacker is within 50 m.' },
  { id: 'redundant-systems-buffer', name: 'Redundant Systems Buffer', baseCost: 75_000, basePower: 10, powerScaled: false, baseMass: 5, massScaled: false, minClass: 'Heavy', description: '+20 hit points. Heavy mech only; power/mass costs do NOT scale.' },
  { id: 'vanguard-plating', name: 'Vanguard Plating', baseCost: 100_000, basePower: 15, powerScaled: false, baseMass: 5, massScaled: false, minClass: 'Heavy', description: 'Reduces AP of attacking weapons by 15. Cannot stack with Hardened Polyceramic Overlay.' },
];

// ---------------------------------------------------------------------------
// Mech Weapons (p. 313)
// ---------------------------------------------------------------------------

export interface MechWeaponDef {
  id: string;
  name: string;
  cost: number;
  damage: string;
  power: number;
  /** Book "#": this weapon's power scales with hull size (×2 Light, ×4 Heavy). */
  powerScaled?: boolean;
  mass: number;
  hardpoints: number;
  range: string;
  minClass: MechClass;
  qualities: string[];
  description: string;
}

export const MECH_WEAPONS: MechWeaponDef[] = [
  {
    id: 'banshee-vox',
    name: 'Banshee Vox',
    cost: 35_000,
    damage: '2d12',
    power: 5,
    mass: 3,
    hardpoints: 1,
    range: '30 m / Cone 30 m',
    minClass: 'Light',
    qualities: ['Cone 30m', 'Anti-personnel', 'Nonlethal'],
    description: 'Focalized sonic blast. Damage is nonlethal; targets at 0 HP wake up 1d4 hours later with 1 HP. Targets in vehicles or behind hard cover are immune.',
  },
  {
    id: 'beam-lance',
    name: 'Beam Lance',
    cost: 100_000,
    damage: '5d8',
    power: 15,
    mass: 5,
    hardpoints: 3,
    range: '1 km / 2 km',
    minClass: 'Heavy',
    qualities: ['AP 30'],
    description: 'Power-hungry. Designed to cut through heavy armor on enemy shock mechs.',
  },
  {
    id: 'cutter-plates',
    name: 'Cutter Plates',
    cost: 20_000,
    damage: '1d12 / 2d12 / 3d12 (by class)',
    power: 5,
    mass: 3,
    hardpoints: 1,
    range: 'Melee',
    minClass: 'Suit',
    qualities: ['AP 10', 'Melee'],
    description: 'Rotating blades, force-field shearing planes, or a large axe. Suit: 1d12, Light: 2d12, Heavy: 3d12.',
  },
  {
    id: 'finger-of-god',
    name: 'Finger of God',
    cost: 300_000,
    damage: '4d12',
    power: 6,
    mass: 3,
    hardpoints: 2,
    range: '500 m / 1 km',
    minClass: 'Heavy',
    qualities: ['Psi', 'Slow'],
    description: 'Psitech weapon; psimech only. Soundless, no visible emissions. Ignores all conventional armor. Will reduce anything smaller than a heavy mech to scrap.',
  },
  {
    id: 'heavy-machine-gun',
    name: 'Heavy Machine Gun',
    cost: 10_000,
    damage: '3d6',
    power: 3,
    powerScaled: true,
    mass: 2,
    hardpoints: 1,
    range: '500 m / 2 km',
    minClass: 'Suit',
    qualities: ['AP 5', 'Ammo'],
    description: 'Anti-personnel standard. TL3 — useless against mech Armor. Upgraded TL4 versions cost ×2. Power scales with hull size.',
  },
  {
    id: 'hydra-array',
    name: 'Hydra Array',
    cost: 40_000,
    damage: '3d6',
    power: 6,
    powerScaled: true,
    mass: 3,
    hardpoints: 1,
    range: '2 km / 4 km',
    minClass: 'Light',
    qualities: ['AP 5', 'Ammo'],
    description: 'Standard gunnery weapon fired in volleys. Power scales with hull size.',
  },
  {
    id: 'improvised-weapon',
    name: 'Improvised Weapon',
    cost: 0,
    damage: '1d8 / 2d8 / 3d8 (by class)',
    power: 0,
    mass: 0,
    hardpoints: 0,
    range: 'Melee',
    minClass: 'Suit',
    qualities: ['Melee'],
    description: 'Something large and heavy snatched up. Suit: 1d8, Light: 2d8, Heavy: 3d8.',
  },
  {
    id: 'inferno-projector',
    name: 'Inferno Projector',
    cost: 35_000,
    damage: '4d6',
    power: 6,
    mass: 3,
    hardpoints: 2,
    range: '20 m / Cone 20 m',
    minClass: 'Light',
    qualities: ['AP 10', 'Cone 20m', 'Slow'],
    description: 'Spray of superheated plasma. Hits everything within a 20 m cone.',
  },
  {
    id: 'laser-anti-air',
    name: 'Laser, Anti-Air',
    cost: 40_000,
    damage: '3d8',
    power: 5,
    mass: 2,
    hardpoints: 2,
    range: '6 km / 12 km',
    minClass: 'Suit',
    qualities: ['AP 10', 'Slow', 'Special'],
    description: 'Tuned for airborne targets. Auto-hits spotted Skywatch Drones. −4 penalty against ground targets.',
  },
  {
    id: 'laser-anti-vehicle',
    name: 'Laser, Anti-Vehicle',
    cost: 20_000,
    damage: '3d10',
    power: 7,
    mass: 3,
    hardpoints: 2,
    range: '500 m / 1 km',
    minClass: 'Suit',
    qualities: ['AP 15'],
    description: 'Standard gunnery weapon recalibrated for mech use. Can reroll any "1"s on damage dice vs. armored targets.',
  },
  {
    id: 'laser-heavy',
    name: 'Laser, Heavy',
    cost: 75_000,
    damage: '3d12',
    power: 10,
    mass: 4,
    hardpoints: 3,
    range: '1 km / 2 km',
    minClass: 'Heavy',
    qualities: ['AP 20'],
    description: 'Mainstay of heavy shock mechs.',
  },
  {
    id: 'laser-light',
    name: 'Laser, Light',
    cost: 35_000,
    damage: '3d8',
    power: 5,
    mass: 2,
    hardpoints: 1,
    range: '500 m / 1 km',
    minClass: 'Light',
    qualities: ['AP 10'],
    description: 'Lighter power drain and easier fitting requirements than Heavy Laser.',
  },
  {
    id: 'mes-knife',
    name: 'MES Knife',
    cost: 100_000,
    damage: '1d12 / 2d12 / 3d12 (by class)',
    power: 1,
    mass: 1,
    hardpoints: 1,
    range: 'Melee',
    minClass: 'Suit',
    qualities: ['Psi', 'Melee'],
    description: 'Psitech melee weapon. Ignores all conventional armor.',
  },
  {
    id: 'mindburner',
    name: 'Mindburner',
    cost: 200_000,
    damage: '4d10',
    power: 2,
    mass: 2,
    hardpoints: 1,
    range: '20 m / Cone 20 m',
    minClass: 'Light',
    qualities: ['Cone 20m', 'Psi'],
    description: 'Psitech cone weapon.',
  },
  {
    id: 'plasma-thrower',
    name: 'Plasma Thrower',
    cost: 50_000,
    damage: '4d10',
    power: 10,
    mass: 2,
    hardpoints: 2,
    range: '250 m / 500 m',
    minClass: 'Light',
    qualities: ['AP 10'],
    description: 'Plasma weapon.',
  },
  {
    id: 'rail-cannon',
    name: 'Rail Cannon',
    cost: 150_000,
    damage: '4d12',
    power: 20,
    mass: 5,
    hardpoints: 4,
    range: '2 km / 4 km',
    minClass: 'Heavy',
    qualities: ['AP 45', 'Slow', 'Ammo'],
    description: 'Electromagnetic rail gun. Extreme armor penetration. Requires cooldown after firing.',
  },
  {
    id: 'railgun',
    name: 'Railgun',
    cost: 16_000,
    damage: '3d8',
    power: 7,
    powerScaled: true,
    mass: 4,
    hardpoints: 2,
    range: '1 km / 2 km',
    minClass: 'Light',
    qualities: ['AP 15', 'Ammo'],
    description: 'Mech-scale magnetic accelerator. Power scales with hull size.',
  },
  {
    id: 'razor-cloud',
    name: 'Razor Cloud',
    cost: 30_000,
    damage: '3d10',
    power: 4,
    mass: 3,
    hardpoints: 2,
    range: '30 m / 60 m',
    minClass: 'Light',
    qualities: ['Anti-personnel', 'Ammo'],
    description: 'Dispersal cloud of self-guiding microblades. Devastating to soft targets, near-useless against armored mechs.',
  },
  {
    id: 'rocket-launcher',
    name: 'Rocket Launcher',
    cost: 8_000,
    damage: '3d10',
    power: 3,
    mass: 2,
    hardpoints: 1,
    range: '2 km / 4 km',
    minClass: 'Suit',
    qualities: ['AP 5', 'Ammo'],
    description: 'Cheap bank of unguided rockets. Common militia mech armament.',
  },
  {
    id: 'wheatcutter-belt',
    name: 'Wheatcutter Belt',
    cost: 20_000,
    damage: '2d12',
    power: 2,
    mass: 3,
    hardpoints: 1,
    range: '10 m / 20 m',
    minClass: 'Light',
    qualities: ['Anti-personnel', 'Ammo'],
    description: 'Belt of short-range flechette throwers. Shreds infantry around the mech; ineffective against armor.',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns scaled cost for a mech fitting/defense/weapon (×1 suit, ×3 light, ×6 heavy). */
export function scaleMechCost(baseCost: number, mechClass: MechClass): number {
  if (mechClass === 'Heavy') return baseCost * 6;
  if (mechClass === 'Light') return baseCost * 3;
  return baseCost;
}

/** Returns scaled power for a fitting/defense (×1 suit, ×2 light, ×4 heavy), if scaled. */
export function scaleMechPowerMass(base: number, scaled: boolean, mechClass: MechClass): number {
  if (!scaled) return base;
  if (mechClass === 'Heavy') return base * 4;
  if (mechClass === 'Light') return base * 2;
  return base;
}
