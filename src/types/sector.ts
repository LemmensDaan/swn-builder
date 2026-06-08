export type ObjectType =
  | 'Star' | 'BlackHole' | 'NeutronStar'
  | 'Planet' | 'GasGiant' | 'Moon' | 'Nebula'
  | 'AsteroidBelt' | 'SpaceStation' | 'JumpGate' | 'Comet'
  | 'Other';

export type PlanetType =
  | 'Terran' | 'Arid' | 'Ocean' | 'Ice'
  | 'GasGiant' | 'Toxic' | 'Barren' | 'Volcanic';

export type SystemType =
  | 'Standard' | 'Binary' | 'Hostile' | 'Rich' | 'Dead' | 'Frontier';

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
  // Planet renderer fields (optional; when set, override colors)
  planetType?: PlanetType;
  primaryColor?: string;
  secondaryColor?: string;
  iceCaps?: boolean;
  rings?: boolean;
  ringInclination?: number;  // degrees — independent of orbital inclination
  seed?: number;
  // GM notes
  notes: string;
  tags: string[];
  factionId: string | null;
}

export interface StarSystem {
  id: string;
  name: string;
  sectorId: string;
  type?: SystemType;
  objects: SystemObject[];
  factionId: string | null;
  notes: string;
}

export interface HexCell {
  q: number;
  r: number;
  systemId: string | null;
}

export interface Faction {
  id: string;
  name: string;
  color: string;
  notes: string;
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
  Star:        { colors: ['#FFF4C2'], size: 2.0, orbitRadius: 0,  inclination: 0, selfRotationSpeed: 0.08 },
  NeutronStar: { colors: ['#A0CFFF'], size: 1.0, orbitRadius: 0,  inclination: 0, selfRotationSpeed: 0.4  },
  BlackHole:   { colors: ['#220033'], size: 1.4, orbitRadius: 0,  inclination: 0, selfRotationSpeed: 0    },
  Planet:      { colors: ['#4E9AF1'], size: 0.7, orbitRadius: 10, inclination: 5, selfRotationSpeed: 0.15,
                 planetType: 'Terran', primaryColor: '#3a7bd5', secondaryColor: '#3d9e3d', iceCaps: true, rings: false, ringInclination: 0, seed: 42 },
  GasGiant:    { colors: ['#D4924A'], size: 1.4, orbitRadius: 22, inclination: 3, selfRotationSpeed: 0.06,
                 planetType: 'GasGiant', primaryColor: '#d4924a', secondaryColor: '#c1783b', iceCaps: false, rings: true, ringInclination: 45, seed: 42 },
  Moon:        { colors: ['#9E9E9E'], size: 0.25, orbitRadius: 3, inclination: 6, selfRotationSpeed: 0.12,
                 planetType: 'Barren', primaryColor: '#777777', secondaryColor: '#555555', iceCaps: false, rings: false, ringInclination: 0, seed: 42 },
  AsteroidBelt:{ colors: ['#8C7B6B'], size: 0.1, orbitRadius: 15, inclination: 2, selfRotationSpeed: 0   },
  SpaceStation:{ colors: ['#B0C4DE'], size: 0.3, orbitRadius: 4,  inclination: 0, selfRotationSpeed: 0.04 },
  JumpGate:    { colors: ['#00FFCC'], size: 0.4, orbitRadius: 32, inclination: 0, selfRotationSpeed: 0    },
  Comet:       { colors: ['#E8F4F8'], size: 0.2, orbitRadius: 40, inclination: 25, selfRotationSpeed: 0, seed: 42 },
  Other:       { colors: ['#888888'], size: 0.5, orbitRadius: 10, inclination: 0, selfRotationSpeed: 0    },
  Nebula:      { colors: ['#9b0d7c'], size: 0.1, orbitRadius: 50, inclination: 1, selfRotationSpeed: 0    },
};

export const GRID_COLS = 8;
export const GRID_ROWS = 10;

export function makeEmptyHexGrid(): HexCell[] {
  const cells: HexCell[] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let q = 0; q < GRID_COLS; q++) {
      cells.push({ q, r, systemId: null });
    }
  }
  return cells;
}
