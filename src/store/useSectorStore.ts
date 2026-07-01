import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import localforage from 'localforage';
import type { Sector, StarSystem, SystemObject, Faction, FactionAsset, FactionTurnLogEntry, HexCell, NebulaShape, SpikeRoute, RouteCategory, PlanetPOI } from '../types/sector';
import { makeEmptyHexGrid, OBJECT_TYPE_DEFAULTS } from '../types/sector';
import { factionMaxHp } from '../data/faction-assets';
import { factionIncome, factionMaintenance, xpToRaise, assetCap } from '../data/faction-turn';
import { GALAXY_TRIANGLES } from '../components/sector/GalaxyView/galaxyData';
import { randomizeSystem, randomizeSectorPlan } from '../components/sector/SystemViewer/systemRandomizer';

let _sectorSaveTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingSaveFn: (() => void) | null = null;

export function flushSectorSave() {
  if (_sectorSaveTimer !== null) {
    clearTimeout(_sectorSaveTimer);
    _sectorSaveTimer = null;
    _pendingSaveFn?.();
    _pendingSaveFn = null;
  }
}


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
  randomizeSector: (sectorId: string) => void;

  // Hex / system CRUD
  createSystem: (sectorId: string, q: number, r: number, name: string) => StarSystem;
  updateSystem: (systemId: string, updates: Partial<Pick<StarSystem, 'name' | 'factionId' | 'contestedFactionIds' | 'notes' | 'tags' | 'timeline'>>) => void;
  clearHex: (sectorId: string, q: number, r: number) => void;

  // Object CRUD
  addObject: (systemId: string, partial: Partial<SystemObject> & { type: SystemObject['type'] }) => SystemObject;
  updateObject: (systemId: string, objId: string, updates: Partial<SystemObject>) => void;
  removeObject: (systemId: string, objId: string) => void;
  reorderObjects: (systemId: string, orderedIds: string[], perObjectUpdates?: Record<string, Partial<SystemObject>>) => void;

  // POI CRUD
  addPOI: (systemId: string, objectId: string, partial: Omit<PlanetPOI, 'id'>) => PlanetPOI;
  updatePOI: (systemId: string, objectId: string, poiId: string, updates: Partial<Omit<PlanetPOI, 'id'>>) => void;
  removePOI: (systemId: string, objectId: string, poiId: string) => void;

  // Navigation
  navigateToSector: (sectorId: string) => void;
  navigateToSystem: (systemId: string) => void;
  navigateBack: () => void;
  navigateHome: () => void;

  // Route CRUD
  addRoute: (sectorId: string, fromQ: number, fromR: number, toQ: number, toR: number, category: RouteCategory, label?: string) => SpikeRoute;
  updateRoute: (sectorId: string, routeId: string, updates: Partial<Omit<SpikeRoute, 'id'>>) => void;
  removeRoute: (sectorId: string, routeId: string) => void;

  // Faction CRUD
  addFaction: (sectorId: string, name: string, color: string) => Faction;
  updateFaction: (sectorId: string, factionId: string, updates: Partial<Omit<Faction, 'id'>>) => void;
  removeFaction: (sectorId: string, factionId: string) => void;

  // Faction play loop
  updateFactionAsset: (sectorId: string, factionId: string, assetId: string, updates: Partial<FactionAsset>) => void;
  factionRaiseStat: (sectorId: string, factionId: string, stat: 'force' | 'cunning' | 'wealth') => boolean;
  factionAdjustFacCreds: (sectorId: string, factionId: string, delta: number) => void;
  factionLog: (sectorId: string, factionId: string, text: string) => void;
  /** Process start-of-turn: collect income, pay maintenance, ready assets, advance the turn. */
  factionProcessTurnStart: (sectorId: string, factionId: string) => void;

  // Import / export
  exportSectorData: () => string;
  importSectorData: (json: string) => void;
  replaceSectorData: (sectors: Sector[], systems: Record<string, StarSystem>) => void;
  importSingleSector: (sector: Sector, systems: Record<string, StarSystem>) => void;
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
          routes: [],
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

      randomizeSector(sectorId) {
        const sector = get().sectors.find(s => s.id === sectorId);
        if (!sector) return;

        // Clear all existing systems in this sector
        const { systems } = get();
        const sectorSystems = Object.entries(systems)
          .filter(([, sys]) => sys.sectorId === sectorId)
          .map(([id]) => id);

        set(s => ({
          systems: Object.fromEntries(
            Object.entries(s.systems).filter(([id]) => !sectorSystems.includes(id))
          ),
          sectors: s.sectors.map(sec =>
            sec.id === sectorId
              ? { ...sec, hexes: sec.hexes.map(h => ({ ...h, systemId: null })) }
              : sec
          ),
        }));

        // Generate new systems
        const allHexes = sector.hexes;
        const seed = Math.floor(Math.random() * 0xffffffff);
        const plan = randomizeSectorPlan(seed, allHexes);

        plan.forEach(({q, r, systemType}) => {
          const sys = get().createSystem(sectorId, q, r, `System ${String(q).padStart(2,'0')}${String(r).padStart(2,'0')}`);
          const objects = randomizeSystem(systemType);
          objects.forEach(obj => get().addObject(sys.id, obj));
        });
      },

      createSystem(sectorId, q, r, name) {
        const id = crypto.randomUUID();
        const system: StarSystem = { id, name, sectorId, objects: [], factionId: null, notes: '', tags: [], timeline: [] };
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
        const size = partial.size ?? defaults.size ?? 1;

        // Default parentId respecting stellar hierarchy: BlackHole > NeutronStar > Star
        const effectiveIsDeepSpace = partial.isDeepSpace ?? defaults.isDeepSpace ?? false;
        let parentId = partial.parentId ?? null;
        if (!parentId && system) {
          const existingStars = system.objects.filter(o => ['Star', 'BlackHole', 'NeutronStar'].includes(o.type));
          if (partial.type === 'NeutronStar') {
            parentId = existingStars.find(o => o.type === 'BlackHole')?.id ?? null;
          } else if (partial.type === 'Star') {
            const bh = existingStars.find(o => o.type === 'BlackHole');
            const ns = existingStars.find(o => o.type === 'NeutronStar');
            parentId = bh?.id ?? ns?.id ?? null;
          } else if (!['BlackHole', 'NeutronStar', 'Star', 'Nebula'].includes(partial.type) && !effectiveIsDeepSpace) {
            // Non-stellar, non-deep-space: orbit the single stellar object if only one exists
            if (existingStars.length === 1) {
              parentId = existingStars[0].id;
            }
          }
          // BlackHole and deep-space objects: always parentId = null
        }

        const BASE_ORBIT = 8;
        const ORBIT_SPACING = 20;
        const isStarType = ['Star', 'BlackHole', 'NeutronStar'].includes(partial.type);
        const rng = Math.random;

        let autoOrbitRadius: number;
        if (isStarType && parentId && system) {
          // Hierarchical stellar: orbit parent like a planet orbits a star
          const parent = system.objects.find(o => o.id === parentId);
          const parentSize = parent?.size ?? 1;
          const stellarSiblings = system.objects.filter(o =>
            o.parentId === parentId && ['Star', 'BlackHole', 'NeutronStar'].includes(o.type)
          );
          const clearance = 1.5;
          if (stellarSiblings.length > 0) {
            autoOrbitRadius = Math.max(...stellarSiblings.map(s => s.orbitRadius)) + size * 2 + clearance;
          } else {
            autoOrbitRadius = parentSize + size + clearance + 4;
          }
        } else if (isStarType && system) {
          // Binary / solo: share orbit radius among root-level stellar objects
          const rootStars = system.objects.filter(o =>
            ['Star', 'BlackHole', 'NeutronStar'].includes(o.type) && o.parentId === null
          );
          if (rootStars.length >= 1) {
            const sharedBinaryOrbit = randBetween(10, 16, Math.random);
            rootStars.forEach(s => {
              if (s.orbitRadius === 0) {
                get().updateObject(systemId, s.id, { orbitRadius: sharedBinaryOrbit });
              }
            });
            autoOrbitRadius = sharedBinaryOrbit;
          } else {
            autoOrbitRadius = 0;
          }
        } else if (parentId && system) {
          // Orbit must clear the parent body + own radius, then space beyond any existing siblings
          const parent = system.objects.find(o => o.id === parentId);
          const parentSize = parent?.size ?? 1;
          const siblings = system.objects.filter(o => o.parentId === parentId);
          const clearance = 0.3;
          if (siblings.length > 0) {
            const maxSiblingOrbit = Math.max(...siblings.map(s => s.orbitRadius));
            const minOrbit = maxSiblingOrbit + size * 2 + clearance;
            autoOrbitRadius = minOrbit + rng() * 4.0;
          } else {
            const minOrbit = parentSize + size + clearance;
            autoOrbitRadius = minOrbit + rng() * 4.0;
          }
        } else if (effectiveIsDeepSpace && system) {
          const existingDeep = system.objects.filter(o => o.isDeepSpace && o.parentId === null);
          autoOrbitRadius = existingDeep.length > 0
            ? Math.max(...existingDeep.map(o => o.orbitRadius)) + 15
            : 80;
        } else {
          autoOrbitRadius = BASE_ORBIT + nextOrder * ORBIT_SPACING + (Math.random() - 0.5) * 12;
        }

        const autoRotationSpeed = partial.type === 'NeutronStar'
          ? (rng() * 6) + 6
          : (rng() * 0.2) + 0.05;
        const autoInclination = (rng() - 0.5) * 2 * (partial.type === 'Moon' ? 3 : 8);
        const autoOrbitSpeed = autoOrbitRadius > 0 ? (rng() * 0.05) + 0.01 : 0;
        const autoAxisInclination = (rng() - 0.5) * 2 * 25;

        // For binary (root-level) stars: share seed so they always oppose 180°
        // Hierarchical stellar objects get their own seed
        let seed: number;
        if (isStarType && !parentId && system) {
          const rootStars = system.objects.filter(o =>
            ['Star', 'BlackHole', 'NeutronStar'].includes(o.type) && o.parentId === null
          );
          if (rootStars.length >= 1) {
            seed = rootStars[0].seed ?? 999;
          } else {
            seed = Math.floor(Math.random() * 999983);
          }
        } else {
          seed = partial.seed ?? Math.floor(Math.random() * 999983);
        }

        // For binary stars, add delay and random starting position
        const isBinaryStar = isStarType && !parentId && system &&
          system.objects.filter(o => ['Star', 'BlackHole', 'NeutronStar'].includes(o.type) && o.parentId === null).length >= 1;
        const orbitDelay = isBinaryStar ? Math.random() * 6 + 2 : undefined;
        const orbitPhaseOffset = isBinaryStar ? Math.random() * Math.PI * 2 : undefined;

        const obj: SystemObject = {
          id: partial.id ?? crypto.randomUUID(),
          type: partial.type,
          name: partial.name ?? `New ${partial.type}`,
          colors: partial.colors ?? defaults.colors ?? ['#888888'],
          size,
          orbitRadius: partial.orbitRadius ?? autoOrbitRadius,
          inclination: partial.inclination ?? autoInclination,
          selfRotationSpeed: partial.selfRotationSpeed ?? autoRotationSpeed,
          orbitSpeed: partial.orbitSpeed ?? autoOrbitSpeed,
          orbitDelay: partial.orbitDelay ?? orbitDelay,
          orbitPhaseOffset: partial.orbitPhaseOffset ?? orbitPhaseOffset,
          axisInclination: partial.axisInclination ?? autoAxisInclination,
          parentId,
          sortOrder: nextOrder,
          notes: partial.notes ?? '',
          tags: partial.tags ?? [],
          factionId: partial.factionId ?? null,
          timeline: partial.timeline ?? [],
          planetType: partial.planetType ?? defaults.planetType,
          primaryColor: partial.primaryColor ?? defaults.primaryColor,
          secondaryColor: partial.secondaryColor ?? defaults.secondaryColor,
          iceCaps: partial.iceCaps ?? defaults.iceCaps,
          seed,
          isDeepSpace: partial.isDeepSpace ?? defaults.isDeepSpace,
          nebulaShape: partial.nebulaShape ?? (partial.type === 'Nebula'
            ? (['emission', 'planetary', 'supernova', 'reflection', 'bipolar'] as NebulaShape[])[Math.floor(Math.random() * 5)]
            : defaults.nebulaShape),
          nsJets: partial.nsJets ?? defaults.nsJets,
          bhDiscInclination: partial.bhDiscInclination ?? defaults.bhDiscInclination,
          rings: partial.rings ?? defaults.rings,
          ringInclination: partial.ringInclination ?? defaults.ringInclination,
          ringCount: partial.ringCount ?? defaults.ringCount,
          ringSize: partial.ringSize ?? defaults.ringSize,
          ringColors: partial.ringColors ?? defaults.ringColors,
          ringBands: partial.ringBands ?? defaults.ringBands,
        };
        set(s => {
          const updatedSystem = { ...s.systems[systemId], objects: [...s.systems[systemId].objects, obj] };

          // Sync root-level stellar objects to a shared binary orbit radius
          if (isStarType && !parentId) {
            const rootStars = updatedSystem.objects.filter(o =>
              ['Star', 'BlackHole', 'NeutronStar'].includes(o.type) && o.parentId === null
            );
            if (rootStars.length >= 2) {
              const firstOrbit = rootStars[0].orbitRadius;
              const secondOrbit = rootStars[1].orbitRadius;
              if (firstOrbit !== secondOrbit) {
                const targetOrbit = Math.max(firstOrbit, secondOrbit) || randBetween(10, 16, Math.random);
                updatedSystem.objects = updatedSystem.objects.map(o =>
                  rootStars.includes(o) ? { ...o, orbitRadius: targetOrbit } : o
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

      addPOI(systemId, objectId, partial) {
        const poi: PlanetPOI = { id: crypto.randomUUID(), ...partial };
        get().updateObject(systemId, objectId, {
          pois: [...(get().systems[systemId]?.objects.find(o => o.id === objectId)?.pois ?? []), poi],
        });
        return poi;
      },

      updatePOI(systemId, objectId, poiId, updates) {
        const obj = get().systems[systemId]?.objects.find(o => o.id === objectId);
        if (!obj) return;
        get().updateObject(systemId, objectId, {
          pois: (obj.pois ?? []).map(p => p.id === poiId ? { ...p, ...updates } : p),
        });
      },

      removePOI(systemId, objectId, poiId) {
        const obj = get().systems[systemId]?.objects.find(o => o.id === objectId);
        if (!obj) return;
        get().updateObject(systemId, objectId, {
          pois: (obj.pois ?? []).filter(p => p.id !== poiId),
        });
      },

      reorderObjects(systemId, orderedIds, perObjectUpdates) {
        set(s => {
          const objs = s.systems[systemId].objects;
          const reordered = orderedIds
            .map((id, i) => {
              const o = objs.find(x => x.id === id);
              if (!o) return null;
              return { ...o, sortOrder: i, ...(perObjectUpdates?.[id] ?? {}) };
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

      addRoute(sectorId, fromQ, fromR, toQ, toR, category, label) {
        const route: SpikeRoute = { id: crypto.randomUUID(), fromQ, fromR, toQ, toR, category, label, notes: '' };
        set(s => ({
          sectors: s.sectors.map(sec =>
            sec.id === sectorId ? { ...sec, routes: [...(sec.routes ?? []), route] } : sec
          ),
        }));
        return route;
      },

      updateRoute(sectorId, routeId, updates) {
        set(s => ({
          sectors: s.sectors.map(sec =>
            sec.id === sectorId
              ? { ...sec, routes: sec.routes.map(r => r.id === routeId ? { ...r, ...updates } : r) }
              : sec
          ),
        }));
      },

      removeRoute(sectorId, routeId) {
        set(s => ({
          sectors: s.sectors.map(sec =>
            sec.id === sectorId
              ? { ...sec, routes: sec.routes.filter(r => r.id !== routeId) }
              : sec
          ),
        }));
      },

      addFaction(sectorId, name, color) {
        const faction: Faction = {
          id: crypto.randomUUID(), name, color, notes: '',
          force: 1, cunning: 1, wealth: 1, hp: 6, xp: 0, tags: [], assets: [], goals: [], timeline: [],
          facCreds: 0, homeworldSystemId: null, turn: 0, turnLog: [], seizeProgress: {},
        };
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

      updateFactionAsset(sectorId, factionId, assetId, updates) {
        set(s => ({
          sectors: s.sectors.map(sec =>
            sec.id === sectorId
              ? { ...sec, factions: sec.factions.map(f => f.id === factionId
                  ? { ...f, assets: f.assets.map(a => a.id === assetId ? { ...a, ...updates } : a) }
                  : f) }
              : sec
          ),
        }));
      },

      factionRaiseStat(sectorId, factionId, stat) {
        const sector = get().sectors.find(s => s.id === sectorId);
        const faction = sector?.factions.find(f => f.id === factionId);
        if (!faction) return false;
        const cost = xpToRaise(faction[stat]);
        if (cost === null || faction.xp < cost) return false;
        const next = { ...faction, [stat]: faction[stat] + 1, xp: faction.xp - cost };
        const newMax = factionMaxHp(next.force, next.cunning, next.wealth);
        get().updateFaction(sectorId, factionId, {
          [stat]: next[stat],
          xp: next.xp,
          hp: Math.min(faction.hp, newMax),
        });
        get().factionLog(sectorId, factionId, `Raised ${stat[0].toUpperCase()}${stat.slice(1)} to ${next[stat]} (−${cost} XP).`);
        return true;
      },

      factionAdjustFacCreds(sectorId, factionId, delta) {
        const sector = get().sectors.find(s => s.id === sectorId);
        const faction = sector?.factions.find(f => f.id === factionId);
        if (!faction) return;
        get().updateFaction(sectorId, factionId, { facCreds: Math.max(0, (faction.facCreds ?? 0) + delta) });
      },

      factionLog(sectorId, factionId, text) {
        const sector = get().sectors.find(s => s.id === sectorId);
        const faction = sector?.factions.find(f => f.id === factionId);
        if (!faction) return;
        const entry: FactionTurnLogEntry = { id: crypto.randomUUID(), turn: faction.turn ?? 0, text };
        get().updateFaction(sectorId, factionId, { turnLog: [entry, ...(faction.turnLog ?? [])].slice(0, 100) });
      },

      factionProcessTurnStart(sectorId, factionId) {
        const sector = get().sectors.find(s => s.id === sectorId);
        const faction = sector?.factions.find(f => f.id === factionId);
        if (!faction) return;

        const turn = (faction.turn ?? 0) + 1;
        const income = factionIncome(faction);
        const maintenance = factionMaintenance(faction);
        let treasury = (faction.facCreds ?? 0) + income;
        const logLines: string[] = [`+${income} FC income`];

        let assets = faction.assets.map(a => ({ ...a, notReady: false }));
        if (maintenance > 0) {
          if (treasury >= maintenance) {
            treasury -= maintenance;
            assets = assets.map(a => ({ ...a, unpaidTurns: 0 }));
            logLines.push(`−${maintenance} FC maintenance`);
          } else {
            // Can't fully maintain: assets fall into arrears; 2nd consecutive unpaid turn = lost.
            // Both upkeep-costing assets AND the assets over the per-type rating cap go unpaid.
            const available = treasury;
            treasury = 0;
            const overCapIds = new Set<string>();
            for (const t of ['Force', 'Cunning', 'Wealth'] as const) {
              const ofType = assets.filter(a => a.type === t && !a.isBaseOfInfluence);
              ofType.slice(assetCap(faction, t)).forEach(a => overCapIds.add(a.id));
            }
            assets = assets
              .map(a => ((a.maintenance ?? 0) > 0 || overCapIds.has(a.id)) ? { ...a, unpaidTurns: (a.unpaidTurns ?? 0) + 1 } : a)
              .filter(a => (a.unpaidTurns ?? 0) < 2);
            const lost = faction.assets.length - assets.length;
            // Scavengers tag: gain 1 FacCred for each asset lost (p.225).
            if (lost > 0 && faction.tags.includes('Scavengers')) treasury += lost;
            logLines.push(`maintenance shortfall (${available}/${maintenance} FC)${lost ? `, ${lost} asset(s) lost` : ', assets unusable'}`);
          }
        }

        get().updateFaction(sectorId, factionId, {
          turn,
          facCreds: treasury,
          assets,
        });
        get().factionLog(sectorId, factionId, `Turn ${turn} begins: ${logLines.join('; ')}. Treasury ${treasury} FC.`);
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

      replaceSectorData(newSectors, newSystems) {
        set({ sectors: newSectors, systems: newSystems, layer: 'galaxy', activeSectorId: null, activeSystemId: null });
      },

      importSingleSector(sector, systemsMap) {
        const newSectorId = crypto.randomUUID();
        const factionIdMap: Record<string, string> = {};
        sector.factions.forEach(f => { factionIdMap[f.id] = crypto.randomUUID(); });
        const systemIdMap: Record<string, string> = {};
        Object.keys(systemsMap).forEach(id => { systemIdMap[id] = crypto.randomUUID(); });

        const usedIndices = new Set(get().sectors.map(s => s.triangleIndex));
        const triangleIndex = pickTriangleIndex(usedIndices);

        const mapSys = (id: string | null | undefined) => (id ? (systemIdMap[id] ?? null) : null);

        const newSector: Sector = {
          ...sector,
          id: newSectorId,
          triangleIndex,
          factions: sector.factions.map(f => ({
            ...f,
            id: factionIdMap[f.id],
            // Remap the play-loop's system-id references onto the freshly-generated systems.
            homeworldSystemId: mapSys(f.homeworldSystemId),
            assets: f.assets.map(a => ({ ...a, locationSystemId: mapSys(a.locationSystemId) })),
            seizeProgress: f.seizeProgress
              ? Object.fromEntries(Object.entries(f.seizeProgress).flatMap(([sid, v]) => {
                  const mapped = systemIdMap[sid];
                  return mapped ? [[mapped, v]] : [];
                }))
              : undefined,
          })),
          hexes: sector.hexes.map(hex => ({
            ...hex,
            systemId: hex.systemId ? (systemIdMap[hex.systemId] ?? null) : null,
          })),
        };

        const newSystems: Record<string, StarSystem> = {};
        Object.entries(systemsMap).forEach(([oldId, sys]) => {
          const newId = systemIdMap[oldId];
          const objIdMap: Record<string, string> = {};
          sys.objects.forEach(obj => { objIdMap[obj.id] = crypto.randomUUID(); });

          newSystems[newId] = {
            ...sys,
            id: newId,
            sectorId: newSectorId,
            factionId: sys.factionId ? (factionIdMap[sys.factionId] ?? null) : null,
            contestedFactionIds: (sys.contestedFactionIds ?? []).map(fid => factionIdMap[fid] ?? fid),
            objects: sys.objects.map(obj => ({
              ...obj,
              id: objIdMap[obj.id],
              parentId: obj.parentId ? (objIdMap[obj.parentId] ?? null) : null,
              factionId: obj.factionId ? (factionIdMap[obj.factionId] ?? null) : null,
              contestedFactionIds: (obj.contestedFactionIds ?? []).map(fid => factionIdMap[fid] ?? fid),
            })),
          };
        });

        set(s => ({
          sectors: [...s.sectors, newSector],
          systems: { ...s.systems, ...newSystems },
        }));
      },
    }),
    {
      name: 'swn-sector-data',
      version: 7,
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
        if (version < 2) {
          state.sectors = state.sectors.map(s => ({
            ...s,
            factions: (s.factions ?? []).map((f: Faction) => {
              const defaults = { force: 1, cunning: 1, wealth: 1, hp: 6, xp: 0, tags: [] as string[], assets: [] as Faction['assets'], goals: [] as Faction['goals'] };
              return { ...defaults, ...f } as Faction;
            }),
          }));
        }
        if (version < 3) {
          // Add tags to StarSystem objects
          const systems = state.systems as Record<string, any>;
          Object.keys(systems).forEach(k => {
            if (!Array.isArray(systems[k].tags)) systems[k].tags = [];
          });
        }
        if (version < 4) {
          // Add timeline to StarSystem, SystemObject, and Faction
          const systems = state.systems as Record<string, any>;
          Object.keys(systems).forEach(k => {
            if (!Array.isArray(systems[k].timeline)) systems[k].timeline = [];
            systems[k].objects = (systems[k].objects ?? []).map((o: any) => ({
              ...o,
              timeline: Array.isArray(o.timeline) ? o.timeline : [],
            }));
          });
          state.sectors = state.sectors.map((s: any) => ({
            ...s,
            factions: (s.factions ?? []).map((f: any) => ({
              ...f,
              timeline: Array.isArray(f.timeline) ? f.timeline : [],
            })),
          }));
        }
        if (version < 5) {
          state.sectors = state.sectors.map((s: any) => ({
            ...s,
            routes: Array.isArray(s.routes) ? s.routes : [],
          }));
        }
        if (version < 6) {
          const systems = state.systems as Record<string, any>;
          Object.keys(systems).forEach(k => {
            systems[k].objects = (systems[k].objects ?? []).map((o: any) => ({
              ...o,
              pois: Array.isArray(o.pois) ? o.pois : [],
            }));
          });
        }
        if (version < 7) {
          // Faction play-loop fields: treasury, homeworld, turn counter, log.
          state.sectors = state.sectors.map((s: any) => ({
            ...s,
            factions: (s.factions ?? []).map((f: any) => ({
              ...f,
              facCreds: typeof f.facCreds === 'number' ? f.facCreds : 0,
              homeworldSystemId: f.homeworldSystemId ?? null,
              turn: typeof f.turn === 'number' ? f.turn : 0,
              turnLog: Array.isArray(f.turnLog) ? f.turnLog : [],
              seizeProgress: f.seizeProgress ?? {},
            })),
          }));
        }
        return state;
      },
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => localforage.getItem<string>(name),
        setItem: (name: string, value: string) => {
          if (_sectorSaveTimer) clearTimeout(_sectorSaveTimer);
          _pendingSaveFn = () => localforage.setItem(name, value);
          _sectorSaveTimer = setTimeout(() => { _pendingSaveFn?.(); _pendingSaveFn = null; _sectorSaveTimer = null; }, 500);
          return Promise.resolve();
        },
        removeItem: async (name: string) => { await localforage.removeItem(name); },
      })),
      partialize: (s) => ({ sectors: s.sectors, systems: s.systems }),
    }
  )
);
