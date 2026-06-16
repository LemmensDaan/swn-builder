import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSectorStore } from '../../../store/useSectorStore';
import Starfield from '../shared/Starfield';
import HexGrid, { HEX_SIZE } from './HexGrid';
import { hexToWorld } from './HexCell';
import SystemPanel from './SystemPanel';
import { GRID_COLS, GRID_ROWS } from '../../../types/sector';

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


export default function SectorHexView() {
  const { activeSectorId, sectors, systems, createSystem, clearHex, navigateToSystem, layer } = useSectorStore();
  const sector = sectors.find(s => s.id === activeSectorId);
  const [selectedQ, setSelectedQ] = useState<number | null>(null);
  const [selectedR, setSelectedR] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const controlsRef = useRef<any>(null);
  const [zoomTarget, setZoomTarget] = useState<THREE.Vector3 | null>(null);
  const pendingSystemId = useRef<string | null>(null);
  const zoomProgressRef = useRef(0);
  const isZooming = zoomTarget !== null;

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
    if (selectedQ === q && selectedR === r) {
      setPanelOpen(v => !v);
      return;
    }
    setSelectedQ(q);
    setSelectedR(r);
    setPanelOpen(true);
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

        {/* Sector name overlay */}
        <div className="absolute top-4 left-4 pointer-events-none">
          <h2 className="text-amber-400 text-lg font-bold tracking-wide drop-shadow-lg">
            {sector.name}
          </h2>
          <p className="text-gray-500 text-xs mt-0.5">
            {Object.values(systems).filter(s => s.sectorId === sector.id).length} / {GRID_COLS * GRID_ROWS} systems
          </p>
        </div>
      </div>

      {/* Right panel — absolute overlay so it never resizes the canvas */}
      {panelOpen && (
        <div className="absolute right-0 top-0 bottom-0 w-96 flex flex-col border-l border-gray-700/60 bg-gray-900/95 backdrop-blur">
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
      )}

    </div>
  );
}
