export type ObjectType =
  | 'Star' | 'BlackHole' | 'NeutronStar'
  | 'Planet' | 'GasGiant' | 'Moon' | 'Nebula'
  | 'AsteroidBelt' | 'SpaceStation' | 'JumpGate' | 'Comet'
  | 'Other';


export type PlanetType =
  | 'Terran' | 'Arid' | 'Ocean' | 'Ice'
  | 'GasGiant' | 'Toxic' | 'Barren' | 'Volcanic' | 'TidallyLocked';

export type NebulaShape = 'emission' | 'diffuse' | 'wall' | 'planetary' | 'supernova' | 'reflection' | 'bipolar0' | 'bipolar1' | 'bipolar2';

export type SystemType =
  | 'Standard' | 'Binary' | 'Hostile' | 'Rich' | 'Dead' | 'Frontier';

export interface TimelineEvent {
  id: string;
  date: string;   // free text: "Session 14", "3200 CY", "Before the Scream"
  title: string;
}

// A single ring band around a planet — each has its own radius, width, tilt and color.
export interface RingBand {
  color: string;
  size: number;         // orbit radius in planet-size multiples (center of the band)
  width?: number;       // radial broadness in planet-size multiples (default 0.4)
  inclination: number;  // degrees — tilt of this ring's plane
}

export interface SystemObject {
  id: string;
  type: ObjectType;
  name: string;
  parentId: string | null;
  sortOrder: number;   // display + orbital order (0 = innermost)
  size: number;
  // Color: single or two-color (used for non-planet objects)
  colors: [string] | [string, string];
  // Orbital parameters — set during creation/randomization
  orbitRadius: number;
  inclination: number;  // degrees
  selfRotationSpeed: number;
  orbitSpeed: number;   // affects speed of orbital motion
  axisInclination: number;  // degrees — inclination of the object's rotation axis
  // Planet renderer fields (optional; when set, override colors)
  planetType?: PlanetType;
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  iceCaps?: boolean;
  rings?: boolean;
  // Per-ring band configuration — the source of truth for ring rendering/editing.
  ringBands?: RingBand[];
  // Legacy ring fields (superseded by ringBands; kept for back-compat migration).
  ringInclination?: number;  // degrees — independent of orbital inclination
  ringCount?: number;
  ringSize?: number;
  ringColors?: string[];
  seed?: number;
  // Whether this object is in the deep-space zone (beyond the system's main bodies)
  isDeepSpace?: boolean;
  // Black hole accretion disc tilt (degrees). Undefined = randomized from seed.
  bhDiscInclination?: number;
  // Neutron star bipolar jets (a neutron star with jets is a pulsar). Undefined = on.
  // Jets are emitted along the spin axis, so they follow the star's axisInclination.
  nsJets?: boolean;
  // Nebula visual shape
  nebulaShape?: NebulaShape;
  // GM notes
  notes: string;
  tags: string[];
  factionId: string | null;
  timeline: TimelineEvent[];
}

export interface StarSystem {
  id: string;
  name: string;
  sectorId: string;
  type?: SystemType;
  objects: SystemObject[];
  factionId: string | null;
  notes: string;
  tags: string[];
  timeline: TimelineEvent[];
}

export interface HexCell {
  q: number;
  r: number;
  systemId: string | null;
}

export type FactionAssetType = 'Force' | 'Cunning' | 'Wealth';

export interface FactionAsset {
  id: string;
  name: string;
  type: FactionAssetType;
  rating: number;
  hp: number;
  maxHp: number;
  attack: string;
  counter: string;
  notes: string;
}

export interface FactionGoal {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  xpReward: number;
}

export interface Faction {
  id: string;
  name: string;
  color: string;
  notes: string;
  force: number;
  cunning: number;
  wealth: number;
  hp: number;
  xp: number;
  tags: string[];
  assets: FactionAsset[];
  goals: FactionGoal[];
  timeline: TimelineEvent[];
  retired?: boolean;
}

export interface Sector {
  id: string;
  name: string;
  hexes: HexCell[];
  factions: Faction[];
  triangleIndex: number;
  notes: string;
}

// Defaults per object type used when manually adding objects
export const OBJECT_TYPE_DEFAULTS: Record<ObjectType, Partial<SystemObject>> = {
  Star:        { colors: ['#FFF4C2'], size: 6.0, orbitRadius: 0,  inclination: 0, selfRotationSpeed: 0.08, orbitSpeed: 0, axisInclination: 0 },
  NeutronStar: { colors: ['#A0CFFF'], size: 0.5, orbitRadius: 0,  inclination: 0, selfRotationSpeed: 9,    nsJets: false, orbitSpeed: 0, axisInclination: 0 },
  BlackHole:   { colors: ['#ff7828'], size: 4.5, orbitRadius: 0,  inclination: 0, selfRotationSpeed: 0,    orbitSpeed: 0, axisInclination: 0 },
  Planet:      { colors: ['#4E9AF1'], size: 0.7, orbitRadius: 10, inclination: 5, selfRotationSpeed: 0.15,
                 planetType: 'Terran', primaryColor: '#3a7bd5', secondaryColor: '#3d9e3d', iceCaps: true, rings: false, ringInclination: 0, ringCount: 3, ringSize: 1, seed: 42, orbitSpeed: 0, axisInclination: 0 },
  GasGiant:    { colors: ['#D4924A', '#C1783B'], size: 1.4, orbitRadius: 22, inclination: 3, selfRotationSpeed: 0.06,
                 planetType: 'GasGiant', primaryColor: '#d4924a', secondaryColor: '#c1783b', iceCaps: false, rings: true, ringInclination: 25,
                 ringBands: [
                   { color: '#9a8878', size: 1.5, width: 0.35, inclination: 25 },
                   { color: '#8C7B6B', size: 1.9, width: 0.3, inclination: 25 },
                   { color: '#A09080', size: 2.3, width: 0.45, inclination: 25 },
                   { color: '#7a6a5a', size: 2.7, width: 0.4, inclination: 25 },
                 ],
                 seed: 42, orbitSpeed: 0, axisInclination: 0 },
  Moon:        { colors: ['#9E9E9E'], size: 0.25, orbitRadius: 3, inclination: 6, selfRotationSpeed: 0.12,
                 planetType: 'Barren', primaryColor: '#777777', secondaryColor: '#555555', iceCaps: false, rings: false, ringInclination: 0, ringCount: 3, ringSize: 1, seed: 42, orbitSpeed: 0, axisInclination: 0 },
  AsteroidBelt:{ colors: ['#8C7B6B'], size: 1, orbitRadius: 15, inclination: 2, selfRotationSpeed: 0,    orbitSpeed: 0, axisInclination: 0 },
  SpaceStation:{ colors: ['#B0C4DE'], size: 0.3, orbitRadius: 4,   inclination: 0, selfRotationSpeed: 0.04, orbitSpeed: 0, axisInclination: 0 },
  JumpGate:    { colors: ['#00FFCC'], size: 0.4, orbitRadius: 32, inclination: 0, selfRotationSpeed: 0,    orbitSpeed: 0, axisInclination: 0 },
  Comet:       { colors: ['#E8F4F8'], size: 0.2, orbitRadius: 40, inclination: 25, selfRotationSpeed: 0, seed: 42, isDeepSpace: true, orbitSpeed: 0, axisInclination: 0 },
  Other:       { colors: ['#888888'], size: 0.5, orbitRadius: 10, inclination: 0, selfRotationSpeed: 0,    orbitSpeed: 0, axisInclination: 0 },
  Nebula:      { colors: ['#9b0d7c'], size: 0.1, orbitRadius: 0,  inclination: 0, selfRotationSpeed: 0, isDeepSpace: true, nebulaShape: 'emission' as NebulaShape, orbitSpeed: 0, axisInclination: 0 },
};

export const GRID_COLS = 8;
export const GRID_ROWS = 10;

const PRIMARY_OBJECT_TYPES = new Set(['Star', 'BlackHole', 'NeutronStar']);

export function sortSystemObjects(objects: SystemObject[]): SystemObject[] {
  return [...objects].sort((a, b) => {
    // Nebula always sorts last regardless of sortOrder
    const aN = a.type === 'Nebula' ? 1 : 0;
    const bN = b.type === 'Nebula' ? 1 : 0;
    if (aN !== bN) return aN - bN;
    return a.sortOrder - b.sortOrder;
  });
}

export function getPrimaryObjectTypes(): Set<string> {
  return new Set(PRIMARY_OBJECT_TYPES);
}

export function makeEmptyHexGrid(): HexCell[] {
  const cells: HexCell[] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let q = 0; q < GRID_COLS; q++) {
      cells.push({ q, r, systemId: null });
    }
  }
  return cells;
}
