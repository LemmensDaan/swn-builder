export type HullClass = 'Fighter' | 'Frigate' | 'Cruiser' | 'Capital';

export interface InstalledItem {
  id: string;
  qty: number;
}

export interface Ship {
  id: string;
  name: string;
  hullId: string;
  driveRating: number;       // 1–6; drive-1 included in hull cost
  weapons: InstalledItem[];
  defenses: InstalledItem[];
  fittings: InstalledItem[];
  hitPoints: { current: number; max: number };
  notes: string;
  currentCrew: number;
  image?: string;
}

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
  };
}
