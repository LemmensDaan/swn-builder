import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ChevronLeft, ChevronRight, Sliders } from 'lucide-react';
import { sortSystemObjects, getPrimaryObjectTypes } from '../../../types/sector';
import { useSectorStore } from '../../../store/useSectorStore';
import SystemScene from './SystemScene';
import SystemPrefsPanel from './SystemPrefsPanel';
import { loadPrefs, savePrefs } from './systemPrefs';
import type { SystemPrefs } from './systemPrefs';


function CameraFollower({ selectedObjectId, selectedObjectSize, objectPositionsRef, orbitControlsRef }: any) {
  const lastPosRef = useRef<[number, number, number] | null>(null);
  const trackingRef = useRef(false);
  const flyProgressRef = useRef(0);

  // Pre-allocated vectors — avoids per-frame GC pressure
  const flyStartCamPos = useRef(new THREE.Vector3());
  const flyStartTarget = useRef(new THREE.Vector3());
  const v_objPos = useRef(new THREE.Vector3());
  const v_dir = useRef(new THREE.Vector3());
  const v_targetCamPos = useRef(new THREE.Vector3());
  const v_delta = useRef(new THREE.Vector3());

  useEffect(() => {
    lastPosRef.current = null;
    trackingRef.current = false;
    flyProgressRef.current = 0;
  }, [selectedObjectId]);

  useFrame((_, delta) => {
    if (!selectedObjectId || !orbitControlsRef.current) return;
    const controls = orbitControlsRef.current;
    const camera = controls.object;
    const position = objectPositionsRef.current[selectedObjectId];
    if (!position) return;

    v_objPos.current.set(position[0], position[1], position[2]);
    const closeDistance = Math.max(3, (selectedObjectSize ?? 1) * 10);

    if (!trackingRef.current) {
      // Capture start on the very first frame of this selection
      if (flyProgressRef.current === 0) {
        flyStartCamPos.current.copy(camera.position);
        flyStartTarget.current.copy(controls.target);
      }

      flyProgressRef.current = Math.min(1, flyProgressRef.current + delta * 1.4);
      const t = 1 - Math.pow(1 - flyProgressRef.current, 3); // ease-out cubic

      // Land at closeDistance from object, preserving the current camera direction
      v_dir.current.subVectors(flyStartCamPos.current, flyStartTarget.current);
      if (v_dir.current.lengthSq() < 0.001) v_dir.current.set(0, 0.4, 1);
      v_dir.current.normalize().multiplyScalar(closeDistance);
      v_targetCamPos.current.addVectors(v_objPos.current, v_dir.current);

      camera.position.lerpVectors(flyStartCamPos.current, v_targetCamPos.current, t);
      controls.target.lerpVectors(flyStartTarget.current, v_objPos.current, t);
      controls.update();

      if (flyProgressRef.current >= 1) {
        trackingRef.current = true;
        lastPosRef.current = position;
      }
      return;
    }

    // Tracking phase — keep camera locked onto orbiting object
    if (!lastPosRef.current) {
      lastPosRef.current = position;
      return;
    }

    v_delta.current.set(
      position[0] - lastPosRef.current[0],
      position[1] - lastPosRef.current[1],
      position[2] - lastPosRef.current[2],
    );
    camera.position.add(v_delta.current);
    controls.target.add(v_delta.current);
    controls.update();

    lastPosRef.current = position;
  });
  return null;
}

// Zooms from far away to the natural view position — creates the "system growing" effect.
// Also drives introOpacityRef so non-star objects fade in gradually, and starfield fades in.
function CameraIntroAnimator({
  camDistance,
  introOpacityRef,
  onStarfieldOpacityChange,
  onDone,
}: {
  camDistance: number;
  introOpacityRef: React.MutableRefObject<number>;
  onStarfieldOpacityChange: (opacity: number) => void;
  onDone: () => void;
}) {
  const { camera } = useThree();
  const progress = useRef(0);
  const done = useRef(false);

  const endPos = new THREE.Vector3(0, camDistance * 0.4 * 0.4, camDistance * 0.4);
  const startPos = endPos.clone().multiplyScalar(12);

  useFrame((_, delta) => {
    if (done.current) return;
    progress.current = Math.min(1, progress.current + delta * 0.55);
    const t = progress.current;
    const u = 1 - Math.pow(1 - t, 3); // ease-out

    camera.position.lerpVectors(startPos, endPos, u);
    camera.lookAt(0, 0, 0);

    // Non-star objects start fading in at u=0.35, fully visible by u=0.85
    introOpacityRef.current = Math.max(0, Math.min(1, (u - 0.35) / 0.5));

    // Starfield fades in slowly from u=0 to u=1.0
    onStarfieldOpacityChange(Math.max(0, Math.min(1, u / 1.2)) * 0.85);

    if (t >= 1 && !done.current) {
      done.current = true;
      introOpacityRef.current = 1;
      onStarfieldOpacityChange(0.85);
      onDone();
    }
  });
  return null;
}

export default function SystemViewer() {
  const { activeSystemId, activeSectorId, systems, sectors, navigateBack, navigateHome } = useSectorStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [introComplete, setIntroComplete] = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [starfieldOpacity, setStarfieldOpacity] = useState(0);
  const [prefs, setPrefs] = useState<SystemPrefs>(() => loadPrefs());
  const introOpacityRef = useRef(0);
  const orbitControlsRef = useRef<any>(null);
  const objectPositionsRef = useRef<Record<string, [number, number, number]>>({});

  const system = activeSystemId ? systems[activeSystemId] : null;
  const sector = sectors.find(s => s.id === activeSectorId);

  const handlePrefsChange = (newPrefs: SystemPrefs) => {
    setPrefs(newPrefs);
    savePrefs(newPrefs);
  };

  if (!system) return null;

  const selectedObjectSize = selectedObjectId
    ? (system.objects.find(o => o.id === selectedObjectId)?.size ?? 1)
    : 1;

  const sorted = sortSystemObjects(system.objects);

  const furthestOrbit = Math.max(
    0,
    ...system.objects.filter(o => !o.parentId).map(o => o.orbitRadius)
  );
  const camDistance = Math.max(80, furthestOrbit * 4.5 + 40);

  return (
    <div className="flex h-full relative">
      {/* 3D Canvas */}
      <div className="flex-1 min-w-0 relative">
        <Canvas
          camera={{ position: [0, camDistance * 0.4 * 0.4 * 12, camDistance * 0.4 * 12], fov: 60 }}
          shadows
          gl={{ antialias: true, alpha: true }}
        >
          {!introComplete && (
            <CameraIntroAnimator
              camDistance={camDistance}
              introOpacityRef={introOpacityRef}
              onStarfieldOpacityChange={setStarfieldOpacity}
              onDone={() => setIntroComplete(true)}
            />
          )}
          <CameraFollower selectedObjectId={selectedObjectId} selectedObjectSize={selectedObjectSize} objectPositionsRef={objectPositionsRef} orbitControlsRef={orbitControlsRef} />
          <SystemScene
            system={system}
            selectedObjectId={selectedObjectId}
            onObjectClick={setSelectedObjectId}
            objectPositionsRef={objectPositionsRef}
            introOpacityRef={introComplete ? undefined : introOpacityRef}
            starfieldOpacity={starfieldOpacity}
            prefs={prefs}
          />
          <OrbitControls
            ref={orbitControlsRef}
            enabled={introComplete}
            enablePan
            enableZoom
            enableRotate
            minDistance={5}
            maxDistance={Math.max(400, camDistance * 3)}
          />
        </Canvas>

        {/* Nav bar */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <button
            onClick={navigateHome}
            className="px-3 py-1.5 rounded-lg bg-gray-900/80 hover:bg-gray-800 border border-gray-700/60 text-gray-500 text-xs transition-colors backdrop-blur"
          >
            Galaxy
          </button>
          <button
            onClick={navigateBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900/80 hover:bg-gray-800 border border-gray-700/60 text-gray-300 text-xs font-medium transition-colors backdrop-blur"
          >
            <ChevronLeft size={14} />
            {sector?.name ?? 'Sector'}
          </button>
        </div>

        {/* System name */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <h2 className="text-amber-300 text-base font-bold tracking-widest drop-shadow-lg uppercase">
            {system.name}
          </h2>
        </div>

        {/* Settings button */}
        <button
          onClick={() => setSettingsPanelOpen(!settingsPanelOpen)}
          className="absolute bottom-4 right-4 p-2 rounded-lg bg-gray-900/80 hover:bg-gray-800 border border-gray-700/60 text-gray-400 hover:text-gray-200 transition-colors"
          title="System settings"
        >
          <Sliders size={13} />
        </button>

        {/* Settings panel */}
        {settingsPanelOpen && (
          <SystemPrefsPanel
            prefs={prefs}
            onChange={handlePrefsChange}
            onClose={() => setSettingsPanelOpen(false)}
          />
        )}

      </div>

      {/* Collapsible sidebar — flex sibling, never floats over canvas */}
      {sidebarOpen ? (
        <div className="w-56 flex-shrink-0 bg-gray-900/90 backdrop-blur border-l border-gray-700/60 flex flex-col">
          <div className="px-3 py-3 flex items-center justify-between border-b border-gray-700/40 flex-shrink-0">
            <p className="text-gray-600 text-[10px] font-medium tracking-wider uppercase">Astrogation</p>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 -mr-1 rounded text-gray-600 hover:text-gray-300 hover:bg-gray-700/50 transition-colors"
            >
              <ChevronRight size={12} />
            </button>
          </div>
          <div className="px-3 py-2 overflow-y-auto flex-1">
            <div className="space-y-0.5">
              {sorted.length === 0 && (
                <p className="text-gray-700 text-xs italic">No objects defined</p>
              )}
              {(() => {
                const primaryTypes = getPrimaryObjectTypes();
                const renderTree = (parentId: string | null, depth = 0) => {
                  const children = sorted.filter(o => o.parentId === parentId);
                  return children.map((obj, idx) => {
                    const isLastPrimary = depth === 0 && idx === sorted.filter(o => o.parentId === null).findIndex(o => !primaryTypes.has(o.type));
                    const shouldShowSeparator = depth === 0 && isLastPrimary && idx > 0;
                    return (
                      <div key={obj.id}>
                        {shouldShowSeparator && (
                          <div className="my-1 border-t border-gray-700/40" />
                        )}
                        <button
                          onClick={() => setSelectedObjectId(obj.id)}
                          className={`w-full flex items-center gap-2 py-1.5 px-2 rounded text-left transition-colors ${
                            selectedObjectId === obj.id ? 'bg-gray-700/50' : 'hover:bg-gray-700/30'
                          }`}
                          style={{ paddingLeft: `${8 + depth * 12}px` }}
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: obj.colors[0] }}
                          />
                          <div className="min-w-0">
                            <p className="text-gray-200 text-xs font-medium truncate">{obj.name}</p>
                            <p className="text-gray-600 text-[10px]">{obj.type}</p>
                          </div>
                        </button>
                        {renderTree(obj.id, depth + 1)}
                      </div>
                    );
                  });
                };
                return renderTree(null);
              })()}
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-gray-900/80 hover:bg-gray-800 border border-gray-700/60 text-gray-600 hover:text-gray-300 transition-colors backdrop-blur"
          title="Open astrogation"
        >
          <ChevronLeft size={14} />
        </button>
      )}
    </div>
  );
}
