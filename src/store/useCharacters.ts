import { useState, useEffect, useRef } from 'react';
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

const BLOB_STORE = localforage.createInstance({
  name: 'swn-builder',
  storeName: 'swn_blobs',
});

// Current storage key — holds the full AppData object
const APP_DATA_KEY = 'app-data';

// Legacy keys from previous versions — migrated on first load and then removed
const LEGACY_IDB_KEY = 'characters';    // v0.2: Character[] directly in IDB
const LEGACY_LS_KEY  = 'swn-characters'; // v0.1: Character[] in localStorage

function normalize(raw: Partial<Character>): Character {
  const defaults = emptyCharacter();
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
    cyberware:           raw.cyberware            ?? [],
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

async function saveToStorage(characters: Character[], ships: Ship[]): Promise<void> {
  // Strip blobs before writing the main JSON record
  const strippedChars = characters.map(c => {
    const { image: _img, pdfAttachment, ...rest } = c;
    return {
      ...rest,
      ...(pdfAttachment ? { pdfAttachment: { name: pdfAttachment.name } } : {}),
    } as Character;
  });
  const strippedShips = ships.map(s => {
    const { image: _img, ...rest } = s;
    return rest as Ship;
  });

  const appData: AppData = { version: CURRENT_VERSION, characters: strippedChars, ships: strippedShips };
  await localforage.setItem(APP_DATA_KEY, appData);

  await Promise.all([
    ...characters.map(c =>
      c.image
        ? BLOB_STORE.setItem(`portrait:${c.id}`, c.image)
        : BLOB_STORE.removeItem(`portrait:${c.id}`),
    ),
    ...characters.map(c =>
      c.pdfAttachment?.data
        ? BLOB_STORE.setItem(`pdf:${c.id}`, c.pdfAttachment.data)
        : BLOB_STORE.removeItem(`pdf:${c.id}`),
    ),
    ...ships.map(s =>
      s.image
        ? BLOB_STORE.setItem(`ship-portrait:${s.id}`, s.image)
        : BLOB_STORE.removeItem(`ship-portrait:${s.id}`),
    ),
  ]);
}

async function loadFromStorage(): Promise<AppData> {
  let data: AppData = { version: CURRENT_VERSION, characters: [], ships: [] };

  const stored = await localforage.getItem<AppData>(APP_DATA_KEY);
  if (stored !== null) {
    data = normalizeAppData(stored);
  } else {
    const legacyIDB = await localforage.getItem<Character[]>(LEGACY_IDB_KEY);
    if (Array.isArray(legacyIDB)) {
      data = { version: CURRENT_VERSION, characters: legacyIDB.map(normalize), ships: [] };
      await localforage.setItem(APP_DATA_KEY, data).catch(() => {});
      await localforage.removeItem(LEGACY_IDB_KEY).catch(() => {});
    } else {
      try {
        const raw = localStorage.getItem(LEGACY_LS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            data = { version: CURRENT_VERSION, characters: parsed.map(normalize), ships: [] };
            await localforage.setItem(APP_DATA_KEY, data).catch(() => {});
            localStorage.removeItem(LEGACY_LS_KEY);
          }
        }
      } catch { /* nothing to migrate */ }
    }
  }

  // Reattach blobs from the blob store (migration-safe: only fills in if not already present)
  await Promise.all([
    ...data.characters.map(async c => {
      if (!c.image) {
        const p = await BLOB_STORE.getItem<string>(`portrait:${c.id}`).catch(() => null);
        if (p) c.image = p;
      }
      if (c.pdfAttachment && !c.pdfAttachment.data) {
        const d = await BLOB_STORE.getItem<string>(`pdf:${c.id}`).catch(() => null);
        if (d) c.pdfAttachment = { ...c.pdfAttachment, data: d };
      }
    }),
    ...data.ships.map(async s => {
      if (!s.image) {
        const p = await BLOB_STORE.getItem<string>(`ship-portrait:${s.id}`).catch(() => null);
        if (p) s.image = p;
      }
    }),
  ]);

  return data;
}

export { normalizeAppData, normalize as normalizeCharacter, normalizeShip as normalizeShipData };

export function useCharacters() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [ships, setShips] = useState<Ship[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Persist on change — debounced 500 ms, blobs stored separately
  useEffect(() => {
    if (!loaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveToStorage(characters, ships);
        if (navigator.storage?.estimate) {
          const { usage = 0, quota = 1 } = await navigator.storage.estimate();
          if (quota > 0 && usage / quota > 0.8) {
            setSaveWarning(`Storage ${Math.round((usage / quota) * 100)}% full — consider removing unused attachments.`);
          } else {
            setSaveWarning(null);
          }
        }
      } catch (err: unknown) {
        const name = (err as { name?: string })?.name ?? '';
        const msg  = String(err);
        if (name === 'QuotaExceededError' || msg.includes('QuotaExceeded')) {
          setSaveError('Storage full — try removing PDF attachments or old characters.');
        } else {
          console.error('[swn-builder] save failed:', err);
        }
      }
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
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
    BLOB_STORE.removeItem(`portrait:${id}`).catch(() => {});
    BLOB_STORE.removeItem(`pdf:${id}`).catch(() => {});
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
    BLOB_STORE.removeItem(`ship-portrait:${id}`).catch(() => {});
    setCharacters(prev => prev.map(c =>
      c.assignedShipIds?.includes(id)
        ? { ...c, assignedShipIds: (c.assignedShipIds ?? []).filter(sid => sid !== id) }
        : c
    ));
  }

  function setAll(data: { characters: Character[]; ships?: Ship[] }) {
    setCharacters(data.characters.map(normalize));
    if (data.ships !== undefined) {
      setShips(data.ships.map(normalizeShip));
    }
  }

  return {
    characters, ships, upsert, remove, upsertShip, removeShip, setAll, loaded,
    saveError, clearSaveError: () => setSaveError(null),
    saveWarning, clearSaveWarning: () => setSaveWarning(null),
  };
}
