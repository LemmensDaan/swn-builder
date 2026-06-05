import type { Character } from './character';
import type { Ship } from './ship';

export const CURRENT_VERSION = 1;

export interface AppData {
  version: number;
  characters: Character[];
  ships: Ship[];
  // sectors: Sector[];  // future
}
