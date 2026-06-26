import type { Character } from './character';
import type { Ship } from './ship';
import type { Sector, StarSystem } from './sector';

export const EXPORT_VERSION = 2;

export interface FullExport {
  version: number;
  type: 'full';
  characters: Character[];
  ships: Ship[];
  sectors: Sector[];
  systems: Record<string, StarSystem>;
}

export interface CharacterExport {
  version: number;
  type: 'character';
  character: Character;
}

export interface ShipExport {
  version: number;
  type: 'ship';
  ship: Ship;
}

export interface SectorExport {
  version: number;
  type: 'sector';
  sector: Sector;
  systems: Record<string, StarSystem>;
}

export type ExportFile = FullExport | CharacterExport | ShipExport | SectorExport;
export type ImportType = 'full' | 'character' | 'ship' | 'sector' | 'legacy' | 'unknown';

export interface ImportPreview {
  file: File;
  type: ImportType;
  entityName: string | null;
}
