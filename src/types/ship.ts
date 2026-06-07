export type HullClass = 'Fighter' | 'Frigate' | 'Cruiser' | 'Capital';

export interface InstalledItem {
  id: string;
  qty: number;
}

export interface BrokenModule {
  id: string;
  type: 'weapon' | 'defense' | 'fitting';
}

export interface WeaponAmmo {
  weaponId: string;
  current: number;
  max: number;
}

export interface MechCarried {
  id: string;
  name: string;
  tonnage: number;
}

export type DepartmentName = 'captain' | 'bridge' | 'gunnery' | 'engineering' | 'comms';

export interface Department {
  name: DepartmentName;
  damaged: boolean;
}

export interface ActiveCrisis {
  id: string;
  description: string;
  type: 'continuing' | 'acute';
  resolved: boolean;
}

export interface CustomCrewMember {
  id: string;
  name: string;
  role?: string;
}

export interface Ship {
  id: string;
  name: string;
  hullId: string;
  driveRating: number;          // 1–6; base drive rating
  weapons: InstalledItem[];
  defenses: InstalledItem[];
  fittings: InstalledItem[];
  hitPoints: { current: number; max: number };
  notes: string;
  currentCrew: number;
  image?: string;
  retired?: boolean;
  location?: string;
  costPaid: number;
  brokenModules: BrokenModule[];
  cargoWeight: number;
  weaponAmmo: WeaponAmmo[];
  mechs: MechCarried[];
  // Combat tracking
  currentDriveRating: number;   // can degrade from targeted shots
  commandPoints: number;
  shipStatus: 'operational' | 'crippled' | 'destroyed';
  departments: Department[];
  activeCrises: ActiveCrisis[];
  customCrew: CustomCrewMember[];
}

const DEFAULT_DEPARTMENTS: Department[] = [
  { name: 'captain',     damaged: false },
  { name: 'bridge',      damaged: false },
  { name: 'gunnery',     damaged: false },
  { name: 'engineering', damaged: false },
  { name: 'comms',       damaged: false },
];

export function emptyShip(): Ship {
  return {
    id: crypto.randomUUID(),
    name: '',
    hullId: 'free-merchant',
    driveRating: 1,
    weapons: [],
    defenses: [],
    fittings: [],
    hitPoints: { current: 20, max: 20 },
    notes: '',
    currentCrew: 1,
    location: '',
    costPaid: 0,
    brokenModules: [],
    cargoWeight: 0,
    weaponAmmo: [],
    mechs: [],
    currentDriveRating: 1,
    commandPoints: 0,
    shipStatus: 'operational',
    departments: DEFAULT_DEPARTMENTS.map(d => ({ ...d })),
    activeCrises: [],
    customCrew: [],
  };
}
