import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSectorStore } from '../../../store/useSectorStore';
import Starfield from '../shared/Starfield';
import HexGrid, { HEX_SIZE } from './HexGrid';
import { hexToWorld } from './HexCell';
import SystemPanel from './SystemPanel';
import SpikeRoutes from './SpikeRoutes';
import { ROUTE_COLORS, ROUTE_LABELS, ROUTE_DASHED, hexDistance, travelDays } from './routeUtils';
import { GRID_COLS, GRID_ROWS, type RouteCategory } from '../../../types/sector';

// Centre of the 10×8 grid in the even-q offset layout.
// x: midpoint of q 0–9  →  HEX_SIZE * 1.5 * 4.5
// z: r_avg = (even-col centre 3.5 + odd-col centre 4.0) / 2 = 3.75
const GRID_CX = HEX_SIZE * (3 / 2) * 4.5;                        // ≈  7.43
const GRID_CZ = -(HEX_SIZE * Math.sqrt(3) * 3.75);                // ≈ -7.14
const GRID_CENTER = new THREE.Vector3(GRID_CX, 0, GRID_CZ);

// 2.5D: fixed ~30° tilt from above (polarAngle = PI/6)
// camera = center + (0, cos30°, sin30°) * distance  →  distance 22
const CAM_DIST = 22;
const CAM_POLAR = Math.PI / 6;  // 30° from straight-down
const CAM_START = new THREE.Vector3(
  GRID_CX,
  CAM_DIST * Math.cos(CAM_POLAR),       // ≈ 19
  GRID_CZ + CAM_DIST * Math.sin(CAM_POLAR), // ≈ -9.06 + 11 = 1.94
);


// Straight-line zoom: camera travels along the exact ray from its start position
// through the hex center and 1.5x beyond, so it punches through the hex plane.
function CameraZoomController({
  target,
  onComplete,
  zoomProgressRef,
}: {
  target: THREE.Vector3 | null;
  onComplete: () => void;
  zoomProgressRef: React.MutableRefObject<number>;
}) {
  const { camera } = useThree();
  const startPos  = useRef<THREE.Vector3 | null>(null);
  const startQuat = useRef<THREE.Quaternion | null>(null);
  const endPos    = useRef<THREE.Vector3 | null>(null);
  const endQuat   = useRef<THREE.Quaternion | null>(null);
  const progress  = useRef(0);
  const done      = useRef(false);

  useEffect(() => {
    startPos.current       = null;
    startQuat.current      = null;
    endPos.current         = null;
    endQuat.current        = null;
    progress.current       = 0;
    done.current           = false;
    zoomProgressRef.current = 0;
  }, [target]);

  useFrame((_, delta) => {
    if (!target || done.current) return;

    if (!startPos.current) {
      startPos.current  = camera.position.clone();
      startQuat.current = camera.quaternion.clone();

      // Direction from camera straight through the hex center
      const dir = target.clone().sub(startPos.current).normalize();
      const distToHex = startPos.current.distanceTo(target);
      // Travel 2.5× the distance: crosses the hex plane at t≈0.4, ends 1.5× beyond
      endPos.current = startPos.current.clone().addScaledVector(dir, distToHex * 2.5);

      // End orientation: looking forward along the travel direction
      camera.position.copy(endPos.current);
      camera.lookAt(endPos.current.clone().add(dir));
      endQuat.current = camera.quaternion.clone();
      camera.position.copy(startPos.current);
      camera.quaternion.copy(startQuat.current);
      return;
    }

    progress.current = Math.min(1, progress.current + delta * 0.45);
    const t = progress.current;
    const u = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    zoomProgressRef.current = u;

    camera.position.lerpVectors(startPos.current!, endPos.current!, u);
    camera.quaternion.slerpQuaternions(startQuat.current!, endQuat.current!, u);

    // Cut to SystemViewer as soon as hex is fully faded (u≈0.45), not at animation end
    if (u >= 0.45 && !done.current) {
      done.current = true;
      onComplete();
    }
  });

  return null;
}


const ALL_CATEGORIES: RouteCategory[] = ['known', 'experimental', 'crew-traveled', 'crew-discovered', 'hazardous'];

export default function SectorHexView() {
  const { activeSectorId, sectors, systems, createSystem, clearHex, navigateToSystem, layer, addRoute, updateRoute, removeRoute } = useSectorStore();
  const sector = sectors.find(s => s.id === activeSectorId);
  const [selectedQ, setSelectedQ] = useState<number | null>(null);
  const [selectedR, setSelectedR] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const controlsRef = useRef<any>(null);
  const [zoomTarget, setZoomTarget] = useState<THREE.Vector3 | null>(null);
  const pendingSystemId = useRef<string | null>(null);
  const zoomProgressRef = useRef(0);
  const isZooming = zoomTarget !== null;

  // Route mode state
  const [routeMode, setRouteMode] = useState(false);
  const [routeStart, setRouteStart] = useState<{ q: number; r: number } | null>(null);
  const [pendingRouteEnd, setPendingRouteEnd] = useState<{ q: number; r: number } | null>(null);
  const [pickerCategory, setPickerCategory] = useState<RouteCategory>('known');
  const [pickerLabel, setPickerLabel] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routeEditLabel, setRouteEditLabel] = useState('');
  const [routeEditNotes, setRouteEditNotes] = useState('');

  const sectorRoutes = sector?.routes ?? [];
  const selectedRoute = selectedRouteId ? sectorRoutes.find(r => r.id === selectedRouteId) : null;

  useEffect(() => {
    if (selectedRoute) {
      setRouteEditLabel(selectedRoute.label ?? '');
      setRouteEditNotes(selectedRoute.notes ?? '');
    }
  }, [selectedRoute?.id]);

  const handleViewSystem = useCallback((systemId: string, q: number, r: number) => {
    if (isZooming) return;
    const [wx, wz] = hexToWorld(q, r, HEX_SIZE);
    setSelectedQ(null);
    setSelectedR(null);
    setPanelOpen(false);
    pendingSystemId.current = systemId;
    setZoomTarget(new THREE.Vector3(wx, 0, wz));
  }, [isZooming]);

  const handleZoomComplete = useCallback(() => {
    const id = pendingSystemId.current;
    if (id) navigateToSystem(id);
    // zoomTarget intentionally NOT cleared here — hex cells must stay at opacity 0
    // during the 400ms CSS fade-out, clearing it would flash them back to full opacity
  }, [navigateToSystem]);

  // Escape key: cancel route mode
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && routeMode) handleExitRouteMode();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [routeMode]);

  // When returning to sector: reset hex opacity, clear zoom state, restore camera
  useEffect(() => {
    if (layer === 'sector') {
      zoomProgressRef.current = 0;  // hex cells read this in useFrame — immediate on next tick
      setZoomTarget(null);
      if (controlsRef.current) {
        controlsRef.current.object.position.copy(CAM_START);
        controlsRef.current.target.copy(GRID_CENTER);
        controlsRef.current.update();
      }
    }
  }, [layer]);

  if (!sector) return null;

  const selectedHex = sector.hexes.find(h => h.q === selectedQ && h.r === selectedR);
  const selectedSystem = selectedHex?.systemId ? systems[selectedHex.systemId] : undefined;

  function handleSelectHex(q: number, r: number) {
    if (routeMode) {
      if (!routeStart) {
        setRouteStart({ q, r });
      } else if (routeStart.q === q && routeStart.r === r) {
        setRouteStart(null);
      } else {
        setPendingRouteEnd({ q, r });
        setPickerCategory('known');
        setPickerLabel('');
      }
      return;
    }
    setSelectedRouteId(null);
    if (selectedQ === q && selectedR === r) {
      setPanelOpen(v => !v);
      return;
    }
    setSelectedQ(q);
    setSelectedR(r);
    setPanelOpen(true);
  }

  function handleRouteCreate() {
    if (!routeStart || !pendingRouteEnd || !sector) return;
    const route = addRoute(sector.id, routeStart.q, routeStart.r, pendingRouteEnd.q, pendingRouteEnd.r, pickerCategory, pickerLabel || undefined);
    setSelectedRouteId(route.id);
    setRouteStart(null);
    setPendingRouteEnd(null);
    setPanelOpen(false);
  }

  function handleExitRouteMode() {
    setRouteMode(false);
    setRouteStart(null);
    setPendingRouteEnd(null);
  }

  function handleToggleRouteMode() {
    if (routeMode) {
      handleExitRouteMode();
    } else {
      setRouteMode(true);
      setPanelOpen(false);
      setSelectedRouteId(null);
    }
  }

  function handleClosePanel() {
    setPanelOpen(false);
    setSelectedQ(null);
    setSelectedR(null);
  }

  function handleCreateSystem() {
    if (selectedQ === null || selectedR === null) return;
    createSystem(sector?.id ?? '', selectedQ, selectedR, `System ${String(selectedQ).padStart(2,'0')}${String(selectedR).padStart(2,'0')}`);
  }

  function handleClearHex() {
    if (selectedQ === null || selectedR === null) return;
    clearHex(sector?.id ?? '', selectedQ, selectedR);
  }

  return (
    <div className="relative h-full">
      {/* 3D Canvas — always fills full container; panel overlays it absolutely */}
      <div className="h-full relative">
        <Canvas
          camera={{ position: CAM_START.toArray(), fov: 50 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.35} />
          <pointLight position={[0, 20, 0]} intensity={0.6} color="#8899cc" />
          <Starfield count={1200} zoomProgressRef={zoomProgressRef} />
          <HexGrid
            sector={sector}
            systems={systems}
            selectedQ={selectedQ}
            selectedR={selectedR}
            onSelectHex={handleSelectHex}
            zoomProgressRef={zoomProgressRef}
            routeMode={routeMode}
            routeStartQ={routeStart?.q ?? null}
            routeStartR={routeStart?.r ?? null}
          />
          <SpikeRoutes
            routes={sectorRoutes}
            sector={sector}
            selectedRouteId={selectedRouteId}
            onSelectRoute={id => {
              setSelectedRouteId(id);
              if (id) setPanelOpen(false);
            }}
          />
          <CameraZoomController
            target={zoomTarget}
            onComplete={handleZoomComplete}
            zoomProgressRef={zoomProgressRef}
          />
          <OrbitControls
            ref={controlsRef}
            enabled={!isZooming}
            target={GRID_CENTER.toArray() as [number, number, number]}
            enablePan
            enableZoom
            enableRotate={false}
            minPolarAngle={CAM_POLAR}
            maxPolarAngle={CAM_POLAR}
            minDistance={5}
            maxDistance={40}
          />
        </Canvas>

        {/* Sector name + route mode toggle */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="pointer-events-none">
            <h2 className="text-amber-400 text-lg font-bold tracking-wide drop-shadow-lg">
              {sector.name}
            </h2>
            <p className="text-gray-500 text-xs mt-0.5">
              {Object.values(systems).filter(s => s.sectorId === sector.id).length} / {GRID_COLS * GRID_ROWS} systems
              {sectorRoutes.length > 0 && (
                <span className="ml-2 text-sky-600">{sectorRoutes.length} route{sectorRoutes.length !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
          <button
            onClick={handleToggleRouteMode}
            className={`pointer-events-auto self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              routeMode
                ? 'bg-green-900/80 border-green-600/60 text-green-300 hover:bg-green-800/80'
                : 'bg-gray-900/70 border-gray-700/60 text-gray-400 hover:text-gray-200 hover:border-gray-500'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
              <circle cx="2" cy="2" r="1.5" fill="currentColor" />
              <circle cx="10" cy="10" r="1.5" fill="currentColor" />
              <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 1.5" />
            </svg>
            {routeMode ? 'Drawing Route' : 'Draw Route'}
          </button>

          {/* Route mode instructions */}
          {routeMode && (
            <div className="pointer-events-none bg-gray-950/80 border border-green-800/40 rounded-lg px-3 py-2 text-xs text-gray-400 max-w-[220px]">
              {!routeStart
                ? <span className="text-green-400">Click a hex to set the start</span>
                : <span className="text-green-300">Click another hex to complete the route</span>
              }
              <div className="text-gray-600 mt-1">Press Esc or click button to cancel</div>
            </div>
          )}
        </div>
      </div>

      {/* Route category picker popup */}
      {pendingRouteEnd && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm">
          <div className="bg-gray-950 border border-gray-700 rounded-2xl p-5 w-80 shadow-2xl">
            <h3 className="text-gray-200 text-sm font-semibold mb-1">New Spike Drive Route</h3>
            {routeStart && (
              <p className="text-gray-500 text-xs mb-4 font-mono">
                {String(routeStart.q + 1).padStart(2,'0')}{String(routeStart.r + 1).padStart(2,'0')}
                {' → '}
                {String(pendingRouteEnd.q + 1).padStart(2,'0')}{String(pendingRouteEnd.r + 1).padStart(2,'0')}
                {' · '}
                <span className="text-gray-400">{hexDistance(routeStart.q, routeStart.r, pendingRouteEnd.q, pendingRouteEnd.r)} hexes</span>
              </p>
            )}

            <p className="text-gray-500 text-xs mb-2">Category</p>
            <div className="flex flex-col gap-1.5 mb-4">
              {ALL_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setPickerCategory(cat)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-left transition-colors border ${
                    pickerCategory === cat
                      ? 'bg-gray-800 border-gray-500'
                      : 'bg-gray-900/60 border-gray-800 hover:border-gray-600'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: ROUTE_COLORS[cat], boxShadow: pickerCategory === cat ? `0 0 6px ${ROUTE_COLORS[cat]}` : 'none' }}
                  />
                  <span style={{ color: pickerCategory === cat ? ROUTE_COLORS[cat] : '#9ca3af' }}>
                    {ROUTE_LABELS[cat]}
                  </span>
                  {ROUTE_DASHED[cat] && (
                    <span className="ml-auto text-gray-700 text-[10px]">dashed</span>
                  )}
                </button>
              ))}
            </div>

            <p className="text-gray-500 text-xs mb-1.5">Label <span className="text-gray-700">(optional)</span></p>
            <input
              type="text"
              value={pickerLabel}
              onChange={e => setPickerLabel(e.target.value)}
              placeholder="e.g. Trade Corridor, Session 4"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 placeholder-gray-700 mb-4 focus:outline-none focus:border-gray-500"
              onKeyDown={e => e.key === 'Enter' && handleRouteCreate()}
            />

            <div className="flex gap-2">
              <button
                onClick={() => { setPendingRouteEnd(null); setRouteStart(null); }}
                className="flex-1 px-3 py-1.5 rounded-lg text-xs text-gray-500 border border-gray-800 hover:text-gray-300 hover:border-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRouteCreate}
                className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                style={{ background: ROUTE_COLORS[pickerCategory] + '33', border: `1px solid ${ROUTE_COLORS[pickerCategory]}55`, color: ROUTE_COLORS[pickerCategory] }}
              >
                Create Route
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right panel — absolute overlay so it never resizes the canvas */}
      {selectedRoute && !panelOpen ? (
        <div className="absolute right-0 top-0 bottom-0 w-80 flex flex-col border-l border-gray-700/60 bg-gray-900/95 backdrop-blur overflow-y-auto">
          <RouteEditPanel
            route={selectedRoute}
            sector={sector}
            systems={systems}
            label={routeEditLabel}
            notes={routeEditNotes}
            onLabelChange={v => { setRouteEditLabel(v); updateRoute(sector.id, selectedRoute.id, { label: v || undefined }); }}
            onNotesChange={v => { setRouteEditNotes(v); updateRoute(sector.id, selectedRoute.id, { notes: v }); }}
            onCategoryChange={cat => updateRoute(sector.id, selectedRoute.id, { category: cat })}
            onDelete={() => { removeRoute(sector.id, selectedRoute.id); setSelectedRouteId(null); }}
            onClose={() => setSelectedRouteId(null)}
          />
        </div>
      ) : panelOpen ? (
        <div className="absolute right-0 top-0 bottom-0 w-[480px] flex flex-col border-l border-gray-700/60 bg-gray-900/95 backdrop-blur">
          {selectedSystem ? (
            <SystemPanel
              system={selectedSystem}
              sectorId={sector.id}
              onClose={handleClosePanel}
              onViewSystem={() => handleViewSystem(selectedSystem.id, selectedQ!, selectedR!)}
              onDeleteSystem={() => { handleClearHex(); handleClosePanel(); }}
            />
          ) : (
            <div className="flex flex-col h-full bg-gray-900/95 backdrop-blur p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm font-medium">
                  Hex {String(selectedQ!).padStart(2,'0')}{String(selectedR!).padStart(2,'0')}
                </span>
                <button onClick={handleClosePanel} className="text-gray-600 hover:text-gray-300">×</button>
              </div>
              <p className="text-gray-600 text-xs mb-4">Empty sector hex. Create a star system here?</p>
              <button
                onClick={handleCreateSystem}
                className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-sky-600 text-white text-sm font-medium transition-colors"
              >
                + Create System
              </button>
            </div>
          )}
        </div>
      ) : null}

    </div>
  );
}

function RouteEditPanel({
  route, sector, systems, label, notes,
  onLabelChange, onNotesChange, onCategoryChange, onDelete, onClose,
}: {
  route: import('../../../types/sector').SpikeRoute;
  sector: import('../../../types/sector').Sector;
  systems: Record<string, import('../../../types/sector').StarSystem>;
  label: string;
  notes: string;
  onLabelChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onCategoryChange: (cat: RouteCategory) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const color = ROUTE_COLORS[route.category];
  const dist = hexDistance(route.fromQ, route.fromR, route.toQ, route.toR);

  const fromHex = sector.hexes.find(h => h.q === route.fromQ && h.r === route.fromR);
  const toHex   = sector.hexes.find(h => h.q === route.toQ   && h.r === route.toR);
  const fromSystem = fromHex?.systemId ? systems[fromHex.systemId] : null;
  const toSystem   = toHex?.systemId   ? systems[toHex.systemId]   : null;

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
          <span className="text-gray-200 text-sm font-semibold">Spike Drive Route</span>
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-300 text-lg leading-none">×</button>
      </div>

      {/* Endpoints */}
      <div className="bg-gray-950/60 rounded-lg px-3 py-2.5 font-mono text-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-gray-500">From</span>
          <span className="text-gray-300">
            {fromSystem ? fromSystem.name : `Hex ${String(route.fromQ + 1).padStart(2,'0')}${String(route.fromR + 1).padStart(2,'0')}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">To</span>
          <span className="text-gray-300">
            {toSystem ? toSystem.name : `Hex ${String(route.toQ + 1).padStart(2,'0')}${String(route.toR + 1).padStart(2,'0')}`}
          </span>
        </div>
      </div>

      {/* Distance / travel times */}
      <div className="bg-gray-950/60 rounded-lg px-3 py-2.5">
        <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-2">Travel Time</p>
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-2xl font-bold" style={{ color }}>{dist}</span>
          <span className="text-gray-500 text-xs">hex{dist !== 1 ? 'es' : ''}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {[1, 2, 3].map(drive => (
            <div key={drive} className="bg-gray-900/60 rounded px-2 py-1.5 text-center">
              <div className="text-gray-500 text-[9px] mb-0.5">Drive {drive}</div>
              <div className="text-gray-200 text-xs font-mono">{travelDays(dist, drive)}d</div>
              <div className="text-gray-600 text-[9px]">{Math.ceil(dist / drive)} transit{Math.ceil(dist / drive) !== 1 ? 's' : ''}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Category picker */}
      <div>
        <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1.5">Category</p>
        <div className="flex flex-col gap-1">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors border ${
                route.category === cat
                  ? 'bg-gray-800 border-gray-600'
                  : 'bg-gray-900/40 border-gray-800/60 hover:border-gray-600'
              }`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: ROUTE_COLORS[cat], boxShadow: route.category === cat ? `0 0 4px ${ROUTE_COLORS[cat]}` : 'none' }}
              />
              <span style={{ color: route.category === cat ? ROUTE_COLORS[cat] : '#9ca3af' }}>{ROUTE_LABELS[cat]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Label */}
      <div>
        <label className="text-gray-500 text-[10px] uppercase tracking-wider block mb-1.5">
          Label <span className="text-gray-700 normal-case">(optional)</span>
        </label>
        <input
          type="text"
          value={label}
          onChange={e => onLabelChange(e.target.value)}
          placeholder="e.g. Trade Corridor, Dangerous Shortcut"
          className="w-full bg-gray-950/60 border border-gray-700/60 rounded-lg px-3 py-1.5 text-xs text-gray-300 placeholder-gray-700 focus:outline-none focus:border-gray-500"
        />
      </div>

      {/* Notes */}
      <div className="flex-1">
        <label className="text-gray-500 text-[10px] uppercase tracking-wider block mb-1.5">Notes</label>
        <textarea
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
          placeholder="Session history, navigation hazards, patrol routes…"
          className="w-full h-28 bg-gray-950/60 border border-gray-700/60 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-700 resize-none focus:outline-none focus:border-gray-500"
        />
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="w-full py-2 rounded-lg text-xs text-red-500/70 border border-red-900/30 hover:bg-red-950/30 hover:text-red-400 hover:border-red-800/50 transition-colors"
      >
        Delete Route
      </button>
    </div>
  );
}
