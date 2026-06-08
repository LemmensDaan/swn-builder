import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import localforage from 'localforage';
import type { Sector, StarSystem, SystemObject, Faction, HexCell } from '../types/sector';
import { makeEmptyHexGrid, OBJECT_TYPE_DEFAULTS } from '../types/sector';


interface SectorState {
  sectors: Sector[];
  systems: Record<string, StarSystem>;

  // Navigation (not persisted)
  layer: 'galaxy' | 'sector' | 'system';
  activeSectorId: string | null;
  activeSystemId: string | null;
}

interface SectorActions {
  // Sector CRUD
  createSector: (name: string) => Sector;
  updateSector: (id: string, updates: Partial<Omit<Sector, 'id'>>) => void;
  deleteSector: (id: string) => void;

  // Hex / system CRUD
  createSystem: (sectorId: string, q: number, r: number, name: string) => StarSystem;
  updateSystem: (systemId: string, updates: Partial<Pick<StarSystem, 'name' | 'factionId' | 'notes'>>) => void;
  clearHex: (sectorId: string, q: number, r: number) => void;

  // Object CRUD
  addObject: (systemId: string, partial: Partial<SystemObject> & { type: SystemObject['type'] }) => SystemObject;
  updateObject: (systemId: string, objId: string, updates: Partial<SystemObject>) => void;
  removeObject: (systemId: string, objId: string) => void;
  reorderObjects: (systemId: string, orderedIds: string[]) => void;

  // Navigation
  navigateToSector: (sectorId: string) => void;
  navigateToSystem: (systemId: string) => void;
  navigateBack: () => void;
  navigateHome: () => void;

  // Faction CRUD
  addFaction: (sectorId: string, name: string, color: string) => Faction;
  updateFaction: (sectorId: string, factionId: string, updates: Partial<Omit<Faction, 'id'>>) => void;
  removeFaction: (sectorId: string, factionId: string) => void;

  // Import / export
  exportSectorData: () => string;
  importSectorData: (json: string) => void;
}

type SectorStore = SectorState & SectorActions;

function randomGalaxyPos() {
  // Random position in a rough ellipse so sectors scatter naturally
  const angle = Math.random() * Math.PI * 2;
  const r = 0.15 + Math.random() * 0.65;
  return {
    galaxyX: 0.5 + Math.cos(angle) * r * 0.9,
    galaxyY: 0.5 + Math.sin(angle) * r * 0.45,
  };
}

function randBetween(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

export const useSectorStore = create<SectorStore>()(
  persist(
    (set, get) => ({
      sectors: [],
      systems: {},
      layer: 'galaxy',
      activeSectorId: null,
      activeSystemId: null,

      createSector(name) {
        const id = crypto.randomUUID();
        const sector: Sector = {
          id,
          name,
          hexes: makeEmptyHexGrid(),
          factions: [],
          notes: '',
          ...randomGalaxyPos(),
        };
        set(s => ({ sectors: [...s.sectors, sector] }));
        return sector;
      },

      updateSector(id, updates) {
        set(s => ({
          sectors: s.sectors.map(sec => sec.id === id ? { ...sec, ...updates } : sec),
        }));
      },

      deleteSector(id) {
        const { systems } = get();
        // Remove all systems that belong to this sector
        const remainingSystems = Object.fromEntries(
          Object.entries(systems).filter(([, sys]) => sys.sectorId !== id)
        );
        set(s => ({
          sectors: s.sectors.filter(sec => sec.id !== id),
          systems: remainingSystems,
          activeSectorId: s.activeSectorId === id ? null : s.activeSectorId,
          layer: s.activeSectorId === id ? 'galaxy' : s.layer,
        }));
      },

      createSystem(sectorId, q, r, name) {
        const id = crypto.randomUUID();
        const system: StarSystem = { id, name, sectorId, objects: [], factionId: null, notes: '' };
        set(s => ({
          systems: { ...s.systems, [id]: system },
          sectors: s.sectors.map(sec =>
            sec.id === sectorId
              ? { ...sec, hexes: sec.hexes.map((h: HexCell) => h.q === q && h.r === r ? { ...h, systemId: id } : h) }
              : sec
          ),
        }));
        return system;
      },

      updateSystem(systemId, updates) {
        set(s => ({
          systems: {
            ...s.systems,
            [systemId]: { ...s.systems[systemId], ...updates },
          },
        }));
      },

      clearHex(sectorId, q, r) {
        const sector = get().sectors.find(s => s.id === sectorId);
        const hex = sector?.hexes.find(h => h.q === q && h.r === r);
        if (!hex?.systemId) return;
        const systemId = hex.systemId;
        set(s => {
          const { [systemId]: _removed, ...rest } = s.systems;
          return {
            systems: rest,
            sectors: s.sectors.map(sec =>
              sec.id === sectorId
                ? { ...sec, hexes: sec.hexes.map((h: HexCell) => h.q === q && h.r === r ? { ...h, systemId: null } : h) }
                : sec
            ),
            activeSystemId: s.activeSystemId === systemId ? null : s.activeSystemId,
          };
        });
      },

      addObject(systemId, partial) {
        const defaults = OBJECT_TYPE_DEFAULTS[partial.type];
        const system = get().systems[systemId];
        const nextOrder = partial.sortOrder ?? (system ? Math.max(0, ...system.objects.map(o => o.sortOrder)) + 1 : 0);

        // Default parentId: if adding a non-star object and no parent specified,
        // use the first star in the system as parent
        let parentId = partial.parentId ?? null;
        if (!parentId && system && !['Star', 'BlackHole', 'NeutronStar'].includes(partial.type)) {
          const star = system.objects.find(o => ['Star', 'BlackHole', 'NeutronStar'].includes(o.type));
          if (star) parentId = star.id;
        }

        // Auto-calculate orbit radius based on sortOrder if not provided
        // Use same formula as randomizer for consistent spacing
        const BASE_ORBIT = 5;
        const ORBIT_SPACING = 6.5;
        const autoOrbitRadius = parentId
          ? (defaults.orbitRadius ?? randBetween(0.6, 2.0, Math.random))  // Moons/stations: clearly smaller than planet orbits (min planet orbit ~5)
          : BASE_ORBIT + nextOrder * ORBIT_SPACING + (Math.random() - 0.5) * 1.5;

        // Randomize rotation speed (0.05-0.25), inclination (±8°), not too crazy
        const rng = Math.random;
        const autoRotationSpeed = (rng() * 0.2) + 0.05;
        const autoInclination = (rng() - 0.5) * 2 * (parentId ? 3 : 8); // ±3° for children, ±8° for top-level

        const obj: SystemObject = {
          id: partial.id ?? crypto.randomUUID(),
          type: partial.type,
          name: partial.name ?? `New ${partial.type}`,
          colors: partial.colors ?? defaults.colors ?? ['#888888'],
          size: partial.size ?? defaults.size ?? 1,
          orbitRadius: partial.orbitRadius ?? autoOrbitRadius,
          inclination: partial.inclination ?? autoInclination,
          selfRotationSpeed: partial.selfRotationSpeed ?? autoRotationSpeed,
          parentId,
          sortOrder: nextOrder,
          notes: partial.notes ?? '',
          tags: partial.tags ?? [],
          factionId: partial.factionId ?? null,
          // Planet renderer fields
          planetType: partial.planetType ?? defaults.planetType,
          primaryColor: partial.primaryColor ?? defaults.primaryColor,
          secondaryColor: partial.secondaryColor ?? defaults.secondaryColor,
          iceCaps: partial.iceCaps ?? defaults.iceCaps,
          seed: partial.seed ?? Math.floor(Math.random() * 999983),
        };
        set(s => ({
          systems: {
            ...s.systems,
            [systemId]: { ...s.systems[systemId], objects: [...s.systems[systemId].objects, obj] },
          },
        }));
        return obj;
      },

      updateObject(systemId, objId, updates) {
        set(s => ({
          systems: {
            ...s.systems,
            [systemId]: {
              ...s.systems[systemId],
              objects: s.systems[systemId].objects.map(o => o.id === objId ? { ...o, ...updates } : o),
            },
          },
        }));
      },

      removeObject(systemId, objId) {
        set(s => ({
          systems: {
            ...s.systems,
            [systemId]: {
              ...s.systems[systemId],
              objects: s.systems[systemId].objects
                .filter(o => o.id !== objId)
                .map(o => o.parentId === objId ? { ...o, parentId: null } : o),
            },
          },
        }));
      },

      reorderObjects(systemId, orderedIds) {
        set(s => {
          const objs = s.systems[systemId].objects;
          const reordered = orderedIds
            .map((id, i) => {
              const o = objs.find(x => x.id === id);
              return o ? { ...o, sortOrder: i } : null;
            })
            .filter(Boolean) as SystemObject[];
          return {
            systems: {
              ...s.systems,
              [systemId]: { ...s.systems[systemId], objects: reordered },
            },
          };
        });
      },

      navigateToSector(sectorId) {
        set({ layer: 'sector', activeSectorId: sectorId, activeSystemId: null });
      },

      navigateToSystem(systemId) {
        set({ layer: 'system', activeSystemId: systemId });
      },

      navigateBack() {
        const { layer } = get();
        if (layer === 'system') set({ layer: 'sector', activeSystemId: null });
        else if (layer === 'sector') set({ layer: 'galaxy', activeSectorId: null });
      },

      navigateHome() {
        set({ layer: 'galaxy', activeSectorId: null, activeSystemId: null });
      },

      addFaction(sectorId, name, color) {
        const faction: Faction = { id: crypto.randomUUID(), name, color, notes: '' };
        set(s => ({
          sectors: s.sectors.map(sec =>
            sec.id === sectorId ? { ...sec, factions: [...sec.factions, faction] } : sec
          ),
        }));
        return faction;
      },

      updateFaction(sectorId, factionId, updates) {
        set(s => ({
          sectors: s.sectors.map(sec =>
            sec.id === sectorId
              ? { ...sec, factions: sec.factions.map(f => f.id === factionId ? { ...f, ...updates } : f) }
              : sec
          ),
        }));
      },

      removeFaction(sectorId, factionId) {
        set(s => ({
          sectors: s.sectors.map(sec =>
            sec.id === sectorId
              ? { ...sec, factions: sec.factions.filter(f => f.id !== factionId) }
              : sec
          ),
        }));
      },

      exportSectorData() {
        const { sectors, systems } = get();
        return JSON.stringify({ version: 1, sectors, systems }, null, 2);
      },

      importSectorData(json) {
        const data = JSON.parse(json);
        if (data.sectors && data.systems) {
          set({ sectors: data.sectors, systems: data.systems });
        }
      },
    }),
    {
      name: 'swn-sector-data',
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => localforage.getItem<string>(name),
        setItem: async (name: string, value: string) => localforage.setItem(name, value),
        removeItem: async (name: string) => { await localforage.removeItem(name); return ''; },
      })),
      partialize: (s) => ({ sectors: s.sectors, systems: s.systems }),
    }
  )
);
