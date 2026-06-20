import { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// function CameraLogger({ domRef }: { domRef: React.RefObject<HTMLDivElement> }) {
//   const { camera } = useThree();
//   useFrame(() => {
//     if (domRef.current) {
//       const p = camera.position;
//       domRef.current.textContent = `[${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}]`;
//     }
//   });
//   return null;
// }
import { AlertTriangle, Sliders } from 'lucide-react';
import { useSectorStore } from '../../../store/useSectorStore';
import BackgroundGalaxies from './BackgroundGalaxies';
import GalaxyMesh, { type GalaxyMeshHandle } from './GalaxyMesh';
import GalaxyPrefsPanel from './GalaxyPrefsPanel';
import { loadPrefs, savePrefs, type GalaxyPrefs } from './galaxyPrefs';

function CameraZoomController({
  target,
  overlayRef,
  onBgOpacityChange,
  onComplete,
}: {
  target: THREE.Vector3 | null;
  overlayRef: { current: HTMLDivElement | null };
  onBgOpacityChange: (opacity: number) => void;
  onComplete: () => void;
}) {
  const { camera } = useThree();
  const startPos  = useRef<THREE.Vector3 | null>(null);
  const startQuat = useRef<THREE.Quaternion | null>(null);
  const endPos    = useRef<THREE.Vector3 | null>(null);
  const endQuat   = useRef<THREE.Quaternion | null>(null);
  const progress  = useRef(0);
  const done      = useRef(false);

  useEffect(() => {
    startPos.current  = null;
    startQuat.current = null;
    endPos.current    = null;
    endQuat.current   = null;
    progress.current  = 0;
    done.current      = false;
  }, [target]);

  useFrame((_, delta) => {
    if (!target || done.current) return;

    // Capture camera state on the very first frame so it's always accurate
    if (!startPos.current) {
      startPos.current  = camera.position.clone();
      startQuat.current = camera.quaternion.clone();

      const dir = camera.position.clone().sub(target).normalize();
      endPos.current = target.clone().add(dir.multiplyScalar(5));

      // Derive end quaternion: temporarily move camera to compute lookAt rotation
      camera.position.copy(endPos.current);
      camera.lookAt(target.x, target.y, target.z);
      endQuat.current = camera.quaternion.clone();

      camera.position.copy(startPos.current);
      camera.quaternion.copy(startQuat.current);
      return; // skip this frame to avoid a one-frame glitch
    }

    progress.current = Math.min(1, progress.current + delta * 0.7);
    const t = progress.current;
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    camera.position.lerpVectors(startPos.current, endPos.current!, eased);
    camera.quaternion.slerpQuaternions(startQuat.current!, endQuat.current!, eased);

    // Fade background during zoom
    const bgFade = Math.max(0, 1 - Math.max(0, (t - 0.4) / 0.3));
    onBgOpacityChange(bgFade);

    if (overlayRef.current) {
      overlayRef.current.style.opacity = String(Math.max(0, (t - 0.4) / 0.6));
    }

    if (t >= 1 && !done.current) {
      done.current = true;
      onComplete();
    }
  });

  return null;
}

export default function GalaxyView() {
  const { sectors, createSector, navigateToSector, deleteSector, systems } = useSectorStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [savedPrefs, setSavedPrefs] = useState<GalaxyPrefs>(loadPrefs);
  const [draftPrefs, setDraftPrefs] = useState<GalaxyPrefs | null>(null);
  const camPosRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const galaxyMeshRef = useRef<GalaxyMeshHandle>(null);
  const [zoomTarget, setZoomTarget] = useState<THREE.Vector3 | null>(null);
  const [bgOpacity, setBgOpacity] = useState(1);
  const pendingSectorId = useRef<string | null>(null);
  const isZooming = zoomTarget !== null;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handleSectorClick = useCallback((id: string, worldPos: THREE.Vector3) => {
    pendingSectorId.current = id;
    setZoomTarget(worldPos.clone());
  }, []);

  const handleZoomComplete = useCallback(() => {
    const id = pendingSectorId.current;
    if (id) navigateToSector(id);
  }, [navigateToSector]);

  const handleSidebarSectorClick = useCallback((id: string) => {
    if (zoomTarget) return;
    const sector = sectors.find(s => s.id === id);
    if (sector && galaxyMeshRef.current) {
      const worldPos = galaxyMeshRef.current.getWorldPos(sector.triangleIndex);
      if (worldPos) { handleSectorClick(id, worldPos); return; }
    }
    navigateToSector(id);
  }, [zoomTarget, sectors, handleSectorClick, navigateToSector]);

  const activePrefs = draftPrefs ?? savedPrefs;

  function handleOpenPrefs() { setDraftPrefs({ ...savedPrefs }); }
  function handleClosePrefs() { setDraftPrefs(null); }
  function handleChangePrefs(p: GalaxyPrefs) {
    setDraftPrefs(p);
    savePrefs(p);
    setSavedPrefs(p);
  }
  const [naming, setNaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function handleCreate() {
    const name = newName.trim() || `Sector ${sectors.length + 1}`;
    const sec = createSector(name);
    setNaming(false);
    setNewName('');
    navigateToSector(sec.id);
  }

  return (
    <div className="relative h-full">
      <Canvas
        camera={{ position: isMobile ? [-32, 4, -38] : [-28, 3, -33], fov: isMobile ? 40 : 35 }}
        dpr={[1, isMobile ? 1.5 : 2]}
        gl={{ antialias: !isMobile }}
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color('#03050d'))}
      >
        {/* <CameraLogger domRef={camPosRef} /> */}
        <ambientLight intensity={0.08} />
        <BackgroundGalaxies opacity={bgOpacity} />
        <GalaxyMesh
          ref={galaxyMeshRef}
          sectors={sectors}
          highlightedId={hoveredId}
          onSectorClick={handleSectorClick}
          prefs={activePrefs}
          pauseRotation={isZooming}
          isZooming={isZooming}
        />
        <CameraZoomController
          target={zoomTarget}
          overlayRef={overlayRef}
          onBgOpacityChange={setBgOpacity}
          onComplete={handleZoomComplete}
        />
        <OrbitControls
          enabled={!isZooming}
          enablePan
          enableZoom
          enableRotate
          maxPolarAngle={Math.PI / 2.1}
          minDistance={isMobile ? 8 : 6}
          maxDistance={isMobile ? 140 : 120}
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>

      {/* Zoom-in fade overlay */}
      <div
        ref={overlayRef}
        style={{
          position: 'absolute',
          inset: 0,
          background: '#03050d',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: 20,
        }}
      />

      {/* Camera debug overlay */}
      <div
        ref={camPosRef}
        style={{
          position: 'absolute', top: 8, right: 8,
          fontFamily: 'monospace', fontSize: '10px',
          color: 'rgba(120,160,220,0.55)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />

      {/* Settings icon — bottom-right */}
      <button
        onClick={handleOpenPrefs}
        title="Galaxy appearance"
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          background: 'rgba(4,8,18,0.72)',
          border: '1px solid rgba(70,90,160,0.30)',
          backdropFilter: 'blur(6px)',
          borderRadius: 6,
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'rgba(90,120,195,0.60)',
          transition: 'color 0.14s, background 0.14s',
          zIndex: 10,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(170,190,255,0.9)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(10,18,40,0.88)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(90,120,195,0.60)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(4,8,18,0.72)'; }}
      >
        <Sliders size={13} />
      </button>

      {/* Galaxy preferences panel */}
      {draftPrefs && (
        <GalaxyPrefsPanel
          prefs={draftPrefs}
          onChange={handleChangePrefs}
          onClose={handleClosePrefs}
        />
      )}

      {/* Sector list panel — bottom-left, star-chart legend style */}
      <div
        className="absolute bottom-5 left-5 rounded overflow-hidden"
        style={{
          background: 'rgba(4,8,18,0.72)',
          border: '1px solid rgba(80,100,160,0.3)',
          backdropFilter: 'blur(6px)',
          minWidth: '140px',
        }}
      >
        <div className="px-3 py-2 border-b" style={{ borderColor: 'rgba(80,100,160,0.25)' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(140,160,220,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Sectors
          </span>
        </div>
        <div className="py-1">
          {sectors.length === 0 && (
            <div className="px-3 py-1.5" style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(100,120,180,0.5)' }}>
              No sectors
            </div>
          )}
          {sectors.map(s => (
            <div
              key={s.id}
              className="flex items-center justify-between px-3 py-1.5 transition-colors"
              style={{
                background: hoveredId === s.id ? 'rgba(80,100,200,0.18)' : 'transparent',
              }}
              onMouseEnter={() => setHoveredId(s.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <button
                className="flex-1 text-left transition-colors"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: hoveredId === s.id ? 'rgba(220,230,255,1)' : 'rgba(160,180,240,0.75)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
                onClick={() => handleSidebarSectorClick(s.id)}
              >
                {s.name}
              </button>
              {hoveredId === s.id && (
                <button
                  onClick={e => { e.stopPropagation(); setDeleteConfirm(s.id); }}
                  className="text-red-500 hover:text-red-400 text-[9px] flex-shrink-0 ml-2"
                  title="Delete sector"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {/* Add sector inline */}
          {naming ? (
            <div className="px-2 py-1.5 flex gap-1">
              <input
                autoFocus
                style={{ fontFamily: 'monospace', fontSize: '11px', background: 'transparent', border: 'none', outline: 'none', color: 'rgba(200,215,255,0.9)', width: '90px' }}
                placeholder="name…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setNaming(false); }}
              />
              <button onClick={handleCreate} style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(120,160,255,0.9)', background: 'none', border: 'none', cursor: 'pointer' }}>ok</button>
            </div>
          ) : (
            <button
              onClick={() => setNaming(true)}
              className="block w-full text-left px-3 py-1.5 transition-colors"
              style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(80,100,160,0.55)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(140,160,220,0.8)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(80,100,160,0.55)'; }}
            >
              + new sector
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl max-w-sm w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-gray-100 font-semibold">Delete sector?</p>
                <p className="text-gray-400 text-sm mt-1">
                  This will permanently delete <span className="text-red-300 font-medium">{sectors.find(s => s.id === deleteConfirm)?.name}</span> and all <span className="text-red-300 font-medium">{Object.values(systems).filter(sys => sys.sectorId === deleteConfirm).length} systems</span> within it.
                </p>
                <p className="text-gray-500 text-xs mt-2">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteSector(deleteConfirm);
                  setDeleteConfirm(null);
                }}
                className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
              >
                Delete Sector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
