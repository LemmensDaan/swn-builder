import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSectorStore } from '../../../store/useSectorStore';
import SystemScene from './SystemScene';


function CameraFollower({ selectedObjectId, objectPositionsRef, orbitControlsRef }: any) {
  const lastPosRef = useRef<[number, number, number] | null>(null);
  const targetInitializedRef = useRef(false);

  useEffect(() => {
    lastPosRef.current = null;
    targetInitializedRef.current = false;
  }, [selectedObjectId]);

  useFrame(() => {
    if (!selectedObjectId || !orbitControlsRef.current) return;
    const controls = orbitControlsRef.current;
    const camera = controls.object;
    const position = objectPositionsRef.current[selectedObjectId];
    if (!position) return;

    if (!targetInitializedRef.current) {
      controls.target.set(position[0], position[1], position[2]);
      targetInitializedRef.current = true;
      lastPosRef.current = position;
      controls.update();
      return;
    }

    const objectDelta = lastPosRef.current
      ? new THREE.Vector3(
          position[0] - lastPosRef.current[0],
          position[1] - lastPosRef.current[1],
          position[2] - lastPosRef.current[2]
        )
      : new THREE.Vector3(0, 0, 0);

    camera.position.add(objectDelta);
    controls.target.add(objectDelta);
    controls.update();

    lastPosRef.current = position;
  });
  return null;
}

// Zooms from far away to the natural view position — creates the "system growing" effect.
// Also drives introOpacityRef so non-star objects fade in gradually.
function CameraIntroAnimator({
  camDistance,
  introOpacityRef,
  onDone,
}: {
  camDistance: number;
  introOpacityRef: React.MutableRefObject<number>;
  onDone: () => void;
}) {
  const { camera } = useThree();
  const progress = useRef(0);
  const done = useRef(false);

  const endPos = new THREE.Vector3(0, camDistance * 0.4 * 0.6, camDistance * 0.6);
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

    if (t >= 1 && !done.current) {
      done.current = true;
      introOpacityRef.current = 1;
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
  const introOpacityRef = useRef(0);
  const orbitControlsRef = useRef<any>(null);
  const objectPositionsRef = useRef<Record<string, [number, number, number]>>({});

  const system = activeSystemId ? systems[activeSystemId] : null;
  const sector = sectors.find(s => s.id === activeSectorId);

  if (!system) return null;

  const sorted = [...system.objects].sort((a, b) => a.sortOrder - b.sortOrder);

  const furthestOrbit = Math.max(
    0,
    ...system.objects.filter(o => !o.parentId).map(o => o.orbitRadius)
  );
  const camDistance = Math.max(80, furthestOrbit * 4.5 + 40);

  return (
    <div className="flex h-full relative">
      {/* 3D Canvas */}
      <div className="flex-1 relative">
        <Canvas
          camera={{ position: [0, camDistance * 0.4 * 0.6 * 12, camDistance * 0.6 * 12], fov: 60 }}
          shadows
          gl={{ antialias: true }}
          onCreated={({ gl }) => gl.setClearColor(new THREE.Color('#04070f'))}
        >
          {!introComplete && (
            <CameraIntroAnimator
              camDistance={camDistance}
              introOpacityRef={introOpacityRef}
              onDone={() => setIntroComplete(true)}
            />
          )}
          <CameraFollower selectedObjectId={selectedObjectId} objectPositionsRef={objectPositionsRef} orbitControlsRef={orbitControlsRef} />
          <SystemScene
            system={system}
            selectedObjectId={selectedObjectId}
            onObjectClick={setSelectedObjectId}
            objectPositionsRef={objectPositionsRef}
            introOpacityRef={introComplete ? undefined : introOpacityRef}
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

        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(v => !v)}
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900/80 hover:bg-gray-800 border border-gray-700/60 text-gray-400 text-xs transition-colors backdrop-blur"
        >
          Objects
          {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* Collapsible sidebar */}
      {sidebarOpen && (
        <div className="w-56 flex-shrink-0 bg-gray-900/90 backdrop-blur border-l border-gray-700/60 overflow-y-auto">
          <div className="px-3 py-3">
            <p className="text-gray-600 text-[10px] font-medium tracking-wider uppercase mb-2">System Objects</p>
            <div className="space-y-0.5">
              {sorted.length === 0 && (
                <p className="text-gray-700 text-xs italic">No objects defined</p>
              )}
              {(() => {
                const renderTree = (parentId: string | null, depth = 0) => {
                  const children = sorted.filter(o => o.parentId === parentId);
                  return children.map(obj => (
                    <div key={obj.id}>
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
                  ));
                };
                return renderTree(null);
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
