import { useState, useEffect } from 'react';
import localforage from 'localforage';
import type { Character } from '../types/character';
import { emptyCharacter } from '../types/character';
import type { Ship } from '../types/ship';
import { emptyShip } from '../types/ship';
import type { AppData } from '../types/appData';
import { CURRENT_VERSION } from '../types/appData';

localforage.config({
  name: 'swn-builder',
  storeName: 'swn_data',
  description: 'Stars Without Number builder data',
});

// Current storage key — holds the full AppData object
const APP_DATA_KEY = 'app-data';

// Legacy keys from previous versions — migrated on first load and then removed
const LEGACY_IDB_KEY = 'characters';    // v0.2: Character[] directly in IDB
const LEGACY_LS_KEY  = 'swn-characters'; // v0.1: Character[] in localStorage

function normalize(raw: Partial<Character>): Character {
  const defaults = emptyCharacter();
  // Migrate old single assignedShipId → assignedShipIds array
  const anyRaw = raw as Record<string, unknown>;
  const legacyId = typeof anyRaw.assignedShipId === 'string' ? anyRaw.assignedShipId : undefined;
  return {
    ...defaults,
    ...raw,
    levelHistory:        raw.levelHistory        ?? [],
    creationSkills:      raw.creationSkills       ?? raw.skills ?? {},
    adventurerPartials:  raw.adventurerPartials   ?? undefined,
    equipmentReadied:    raw.equipmentReadied     ?? [],
    equipmentNotCarried: raw.equipmentNotCarried  ?? [],
    debts:               raw.debts               ?? 0,
    notes:               raw.notes               ?? '',
    retired:             raw.retired             ?? false,
    image:               raw.image               ?? undefined,
    assignedShipIds:     raw.assignedShipIds      ?? (legacyId ? [legacyId] : []),
  } as Character;
}

function normalizeShip(raw: Partial<Ship>): Ship {
  const defaults = emptyShip();
  return {
    ...defaults,
    ...raw,
    id:          raw.id          ?? defaults.id,
    name:        raw.name        ?? '',
    hullId:      raw.hullId      ?? 'free-merchant',
    driveRating: raw.driveRating ?? 1,
    weapons:     raw.weapons     ?? [],
    defenses:    raw.defenses    ?? [],
    fittings:    raw.fittings    ?? [],
    hitPoints:   raw.hitPoints   ?? { current: 20, max: 20 },
    notes:       raw.notes       ?? '',
    currentCrew: raw.currentCrew ?? 1,
    image:       raw.image       ?? undefined,
    customCrew:  raw.customCrew  ?? [],
  };
}

function normalizeAppData(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') return { version: CURRENT_VERSION, characters: [], ships: [] };
  const data = raw as Record<string, unknown>;
  return {
    version: CURRENT_VERSION,
    characters: Array.isArray(data.characters)
      ? (data.characters as Partial<Character>[]).map(normalize)
      : [],
    ships: Array.isArray(data.ships)
      ? (data.ships as Partial<Ship>[]).map(normalizeShip)
      : [],
  };
}

async function loadFromStorage(): Promise<AppData> {
  // 1. Try current key
  const stored = await localforage.getItem<AppData>(APP_DATA_KEY);
  if (stored !== null) return normalizeAppData(stored);

  // 2. Migrate from v0.2 IDB key (Character[] stored directly)
  const legacyIDB = await localforage.getItem<Character[]>(LEGACY_IDB_KEY);
  if (Array.isArray(legacyIDB)) {
    const appData: AppData = { version: CURRENT_VERSION, characters: legacyIDB.map(normalize), ships: [] };
    await localforage.setItem(APP_DATA_KEY, appData);
    await localforage.removeItem(LEGACY_IDB_KEY);
    return appData;
  }

  // 3. Migrate from v0.1 localStorage key
  try {
    const raw = localStorage.getItem(LEGACY_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const appData: AppData = { version: CURRENT_VERSION, characters: parsed.map(normalize), ships: [] };
        await localforage.setItem(APP_DATA_KEY, appData);
        localStorage.removeItem(LEGACY_LS_KEY);
        return appData;
      }
    }
  } catch { /* nothing to migrate */ }

  return { version: CURRENT_VERSION, characters: [], ships: [] };
}

export { normalizeAppData };

export function useCharacters() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [ships, setShips] = useState<Ship[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load on mount
  useEffect(() => {
    loadFromStorage()
      .then(data => {
        setCharacters(data.characters);
        setShips(Array.isArray(data.ships) ? data.ships.map(normalizeShip) : []);
      })
      .catch(() => {
        setCharacters([]);
        setShips([]);
      })
      .finally(() => setLoaded(true));
  }, []);

  // Persist on every change (skip initial empty state before load completes)
  useEffect(() => {
    if (!loaded) return;
    const appData: AppData = { version: CURRENT_VERSION, characters, ships };
    localforage.setItem(APP_DATA_KEY, appData).catch(err => {
      console.error('[swn-builder] save failed:', err);
    });
  }, [characters, ships, loaded]);

  function upsert(char: Character) {
    setCharacters(prev => {
      const idx = prev.findIndex(c => c.id === char.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = char; return next; }
      return [...prev, char];
    });
  }

  function remove(id: string) {
    setCharacters(prev => prev.filter(c => c.id !== id));
  }

  function upsertShip(ship: Ship) {
    setShips(prev => {
      const idx = prev.findIndex(s => s.id === ship.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = ship; return next; }
      return [...prev, ship];
    });
  }

  function removeShip(id: string) {
    setShips(prev => prev.filter(s => s.id !== id));
    setCharacters(prev => prev.map(c =>
      c.assignedShipIds?.includes(id)
        ? { ...c, assignedShipIds: (c.assignedShipIds ?? []).filter(sid => sid !== id) }
        : c
    ));
  }

  /** Replace the entire character list and optionally the ship list — used by the import feature. */
  function setAll(data: { characters: Character[]; ships?: Ship[] }) {
    setCharacters(data.characters.map(normalize));
    if (data.ships !== undefined) {
      setShips(data.ships.map(normalizeShip));
    }
  }

  return { characters, ships, upsert, remove, upsertShip, removeShip, setAll, loaded };
}
