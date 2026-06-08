import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import localforage from 'localforage';
import type { Sector, StarSystem, SystemObject, Faction, HexCell } from '../types/sector';
import { makeEmptyHexGrid, OBJECT_TYPE_DEFAULTS } from '../types/sector';
import { GALAXY_TRIANGLES } from '../components/sector/GalaxyView/galaxyData';


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

function pickTriangleIndex(usedIndices: Set<number>): number {
  const available = GALAXY_TRIANGLES
    .map((_, i) => i)
    .filter(i => !usedIndices.has(i));
  if (available.length === 0) return Math.floor(Math.random() * GALAXY_TRIANGLES.length);
  return available[Math.floor(Math.random() * available.length)];
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
        const usedIndices = new Set(get().sectors.map(s => s.triangleIndex));
        const triangleIndex = pickTriangleIndex(usedIndices);
        const sector: Sector = {
          id,
          name,
          hexes: makeEmptyHexGrid(),
          factions: [],
          notes: '',
          triangleIndex,
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
        // use the first star as parent UNLESS the system has 2+ stars (binary),
        // in which case objects orbit the barycenter directly (no parent)
        let parentId = partial.parentId ?? null;
        if (!parentId && system && !['Star', 'BlackHole', 'NeutronStar'].includes(partial.type)) {
          const stars = system.objects.filter(o => ['Star', 'BlackHole', 'NeutronStar'].includes(o.type));
          // Only make objects children of stars in single-star systems
          if (stars.length === 1) {
            parentId = stars[0].id;
          }
          // In binary+ systems, objects orbit the barycenter (no parent, top-level)
        }

        const BASE_ORBIT = 5;
        const ORBIT_SPACING = 6.5;
        const isStarType = ['Star', 'BlackHole', 'NeutronStar'].includes(partial.type);

        let autoOrbitRadius: number;
        if (isStarType && system) {
          const stars = system.objects.filter(o => ['Star', 'BlackHole', 'NeutronStar'].includes(o.type));
          if (stars.length >= 1) {
            const sharedBinaryOrbit = randBetween(7, 11, Math.random);
            stars.forEach(s => {
              if (s.orbitRadius === 0) {
                get().updateObject(systemId, s.id, { orbitRadius: sharedBinaryOrbit });
              }
            });
            autoOrbitRadius = sharedBinaryOrbit;
          } else {
            autoOrbitRadius = 0;
          }
        } else {
          autoOrbitRadius = parentId
            ? (defaults.orbitRadius ?? randBetween(0.6, 2.0, Math.random))
            : BASE_ORBIT + nextOrder * ORBIT_SPACING + (Math.random() - 0.5) * 1.5;
        }

        const rng = Math.random;
        const autoRotationSpeed = (rng() * 0.2) + 0.05;
        const autoInclination = (rng() - 0.5) * 2 * (parentId ? 3 : 8);

        // For binary stars: use shared seed so they always oppose 180°
        let seed: number;
        if (isStarType && system) {
          const stars = system.objects.filter(o => ['Star', 'BlackHole', 'NeutronStar'].includes(o.type));
          if (stars.length >= 1) {
            // Binary companion: use same seed as first star for guaranteed 180° opposition
            seed = stars[0].seed ?? 999;
          } else {
            seed = Math.floor(Math.random() * 999983);
          }
        } else {
          seed = partial.seed ?? Math.floor(Math.random() * 999983);
        }

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
          planetType: partial.planetType ?? defaults.planetType,
          primaryColor: partial.primaryColor ?? defaults.primaryColor,
          secondaryColor: partial.secondaryColor ?? defaults.secondaryColor,
          iceCaps: partial.iceCaps ?? defaults.iceCaps,
          seed,
        };
        set(s => {
          const updatedSystem = { ...s.systems[systemId], objects: [...s.systems[systemId].objects, obj] };

          if (isStarType) {
            const stars = updatedSystem.objects.filter(o => ['Star', 'BlackHole', 'NeutronStar'].includes(o.type));
            if (stars.length >= 2) {
              const firstStarOrbit = stars[0].orbitRadius;
              const secondStarOrbit = stars[1].orbitRadius;
              if (firstStarOrbit !== secondStarOrbit) {
                const targetOrbit = Math.max(firstStarOrbit, secondStarOrbit) || randBetween(7, 11, Math.random);
                updatedSystem.objects = updatedSystem.objects.map(o =>
                  stars.includes(o) ? { ...o, orbitRadius: targetOrbit } : o
                );
              }
            }
          }

          return {
            systems: {
              ...s.systems,
              [systemId]: updatedSystem,
            },
          };
        });
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
      version: 1,
      migrate(persistedState, version) {
        const state = persistedState as { sectors: Sector[]; systems: Record<string, StarSystem> };
        if (version < 1) {
          // Assign triangleIndex to any sectors saved before this field existed
          const usedIndices = new Set<number>();
          state.sectors = state.sectors.map(s => {
            if (typeof s.triangleIndex === 'number') {
              usedIndices.add(s.triangleIndex);
              return s;
            }
            const idx = pickTriangleIndex(usedIndices);
            usedIndices.add(idx);
            return { ...s, triangleIndex: idx };
          });
        }
        return state;
      },
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => localforage.getItem<string>(name),
        setItem: async (name: string, value: string) => localforage.setItem(name, value),
        removeItem: async (name: string) => { await localforage.removeItem(name); return ''; },
      })),
      partialize: (s) => ({ sectors: s.sectors, systems: s.systems }),
    }
  )
);
