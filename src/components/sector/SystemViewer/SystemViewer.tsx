import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ChevronLeft, ChevronRight, Sliders, X, Clock, Tag, FileText } from 'lucide-react';
import TimelineEditor from '../shared/TimelineEditor';
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
    const closeDistance = Math.max(1, (selectedObjectSize ?? 1) * 4);

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
  const [infoPanelObjectId, setInfoPanelObjectId] = useState<string | null>(null);
  const [infoPanelTab, setInfoPanelTab] = useState<'overview' | 'notes' | 'tags' | 'history'>('overview');
  const [systemInfoOpen, setSystemInfoOpen] = useState(false);
  const [systemInfoTab, setSystemInfoTab] = useState<'overview' | 'notes' | 'tags' | 'history'>('overview');
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

  function handleObjectClick(id: string) {
    if (id === selectedObjectId) {
      setInfoPanelObjectId(prev => (prev === id ? null : id));
    } else {
      setSelectedObjectId(id);
      setInfoPanelObjectId(id);
    }
    setInfoPanelTab('overview');
  }

  const selectedObjectSize = selectedObjectId
    ? (system.objects.find(o => o.id === selectedObjectId)?.size ?? 1)
    : 1;

  const sorted = sortSystemObjects(system.objects);

  const furthestOrbit = Math.max(
    0,
    ...system.objects.filter(o => !o.parentId && !o.isDeepSpace).map(o => o.orbitRadius)
  );
  const camDistance = Math.max(60, furthestOrbit * 2.5 + 30);

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
          <SystemScene
            system={system}
            selectedObjectId={selectedObjectId}
            onObjectClick={handleObjectClick}
            objectPositionsRef={objectPositionsRef}
            introOpacityRef={introComplete ? undefined : introOpacityRef}
            starfieldOpacity={starfieldOpacity}
            prefs={prefs}
          />
          <CameraFollower selectedObjectId={selectedObjectId} selectedObjectSize={selectedObjectSize} objectPositionsRef={objectPositionsRef} orbitControlsRef={orbitControlsRef} />
          <OrbitControls
            ref={orbitControlsRef}
            enabled={introComplete}
            enablePan
            enableZoom
            enableRotate
            minDistance={0.5}
            maxDistance={Math.max(800, camDistance * 5)}
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

        {/* System name with info indicators */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 pointer-events-auto">
            <h2 className="text-amber-300 text-base font-bold tracking-widest drop-shadow-lg uppercase">
              {system.name}
            </h2>
            {/* Info indicators */}
            {(system.notes.trim().length > 0 || system.tags.length > 0 || system.factionId || (system.timeline ?? []).length > 0) && (
              <button
                onClick={() => setSystemInfoOpen(!systemInfoOpen)}
                title="Click to view system information"
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/40 hover:bg-amber-950/60 border border-amber-800/50 transition-colors"
              >
                {system.factionId && (
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sector?.factions.find(f => f.id === system.factionId)?.color ?? '#888' }} title="Faction assigned" />
                )}
                {system.notes.trim().length > 0 && (
                  <FileText size={11} className="text-amber-700" title="Has notes" />
                )}
                {system.tags.length > 0 && (
                  <span className="text-[10px] text-amber-700 font-medium">{system.tags.length}T</span>
                )}
                {(system.timeline ?? []).length > 0 && (
                  <span className="text-[10px] text-amber-700 font-medium">{(system.timeline ?? []).length}H</span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* System info button */}
        <button
          onClick={() => setSystemInfoOpen(!systemInfoOpen)}
          title="System information (notes, tags, faction, history)"
          className="absolute bottom-4 right-16 p-2 rounded-lg bg-gray-900/80 hover:bg-gray-800 border border-gray-700/60 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <FileText size={16} />
        </button>

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

        {/* Object info panel — shown when a focused object is clicked again */}
        {infoPanelObjectId && (() => {
          const obj = system.objects.find(o => o.id === infoPanelObjectId);
          if (!obj) return null;
          const faction = obj.factionId ? sector?.factions.find(f => f.id === obj.factionId) : null;
          const hasTags = obj.tags.length > 0;
          const hasNotes = obj.notes.trim().length > 0;
          const hasTimeline = (obj.timeline ?? []).length > 0;

          const tabs: Array<{ id: 'overview' | 'notes' | 'tags' | 'history'; label: string; icon: React.ReactNode; count?: number; visible: boolean }> = [
            { id: 'overview', label: 'Overview', icon: '◆', visible: true },
            { id: 'notes', label: 'Notes', icon: <FileText size={12} />, count: hasNotes ? 1 : 0, visible: true },
            { id: 'tags', label: 'Tags', icon: <Tag size={12} />, count: obj.tags.length, visible: true },
            { id: 'history', label: 'History', icon: <Clock size={12} />, count: (obj.timeline ?? []).length, visible: hasTimeline },
          ];

          return (
            <div className="absolute bottom-16 left-4 w-[420px] max-h-[65vh] bg-gray-900/95 border border-gray-700/60 rounded-xl shadow-xl backdrop-blur flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-2 flex-shrink-0">
                <div className="min-w-0">
                  <p className="text-gray-100 text-sm font-semibold leading-tight truncate">{obj.name}</p>
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mt-0.5">{obj.type}</p>
                </div>
                <button
                  onClick={() => setInfoPanelObjectId(null)}
                  className="text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0 mt-0.5"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-3 pt-2 pb-0 border-b border-gray-700/40 flex-shrink-0 overflow-x-auto">
                {tabs.filter(t => t.visible).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setInfoPanelTab(tab.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                      infoPanelTab === tab.id
                        ? 'border-blue-500 text-blue-300'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {typeof tab.icon === 'string' ? tab.icon : tab.icon}
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="text-[9px] bg-gray-700/60 px-1.5 rounded-full">{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-3">
                {infoPanelTab === 'overview' && (
                  <>
                    {faction && (
                      <div>
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider font-medium mb-1">Faction</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full flex-shrink-0 border border-gray-600" style={{ background: faction.color }} />
                          <span className="text-xs text-gray-300">{faction.name}</span>
                        </div>
                      </div>
                    )}
                    {!faction && (
                      <p className="text-xs text-gray-600 italic">No faction assigned</p>
                    )}
                  </>
                )}

                {infoPanelTab === 'notes' && (
                  <>
                    {hasNotes ? (
                      <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{obj.notes}</p>
                    ) : (
                      <p className="text-xs text-gray-600 italic">No notes recorded</p>
                    )}
                  </>
                )}

                {infoPanelTab === 'tags' && (
                  <>
                    {hasTags ? (
                      <div className="flex flex-wrap gap-2">
                        {obj.tags.map(tag => (
                          <span
                            key={tag}
                            className="text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800/50 px-2.5 py-1 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-600 italic">No tags assigned</p>
                    )}
                  </>
                )}

                {infoPanelTab === 'history' && hasTimeline && (
                  <TimelineEditor events={obj.timeline ?? []} onChange={() => {}} compact />
                )}
              </div>
            </div>
          );
        })()}

        {/* System info panel — shown when system info button is clicked */}
        {systemInfoOpen && (() => {
          const hasTags = system.tags.length > 0;
          const hasNotes = system.notes.trim().length > 0;
          const hasTimeline = (system.timeline ?? []).length > 0;
          const faction = system.factionId ? sector?.factions.find(f => f.id === system.factionId) : null;

          const tabs: Array<{ id: 'overview' | 'notes' | 'tags' | 'history'; label: string; icon: React.ReactNode; count?: number; visible: boolean }> = [
            { id: 'overview', label: 'Overview', icon: '◆', visible: true },
            { id: 'notes', label: 'Notes', icon: <FileText size={12} />, count: hasNotes ? 1 : 0, visible: true },
            { id: 'tags', label: 'Tags', icon: <Tag size={12} />, count: system.tags.length, visible: true },
            { id: 'history', label: 'History', icon: <Clock size={12} />, count: (system.timeline ?? []).length, visible: hasTimeline },
          ];

          return (
            <div className="absolute bottom-16 right-4 w-[420px] max-h-[65vh] bg-gray-900/95 border border-gray-700/60 rounded-xl shadow-xl backdrop-blur flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-2 flex-shrink-0">
                <div className="min-w-0">
                  <p className="text-gray-100 text-sm font-semibold leading-tight truncate">{system.name}</p>
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mt-0.5">System</p>
                </div>
                <button
                  onClick={() => setSystemInfoOpen(false)}
                  className="text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0 mt-0.5"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-3 pt-2 pb-0 border-b border-gray-700/40 flex-shrink-0 overflow-x-auto">
                {tabs.filter(t => t.visible).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSystemInfoTab(tab.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                      systemInfoTab === tab.id
                        ? 'border-blue-500 text-blue-300'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {typeof tab.icon === 'string' ? tab.icon : tab.icon}
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="text-[9px] bg-gray-700/60 px-1.5 rounded-full">{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-3">
                {systemInfoTab === 'overview' && (
                  <>
                    {faction && (
                      <div>
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider font-medium mb-1">Faction</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full flex-shrink-0 border border-gray-600" style={{ background: faction.color }} />
                          <span className="text-xs text-gray-300">{faction.name}</span>
                        </div>
                      </div>
                    )}
                    {!faction && (
                      <p className="text-xs text-gray-600 italic">No faction assigned</p>
                    )}
                  </>
                )}

                {systemInfoTab === 'notes' && (
                  <>
                    {hasNotes ? (
                      <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{system.notes}</p>
                    ) : (
                      <p className="text-xs text-gray-600 italic">No notes recorded</p>
                    )}
                  </>
                )}

                {systemInfoTab === 'tags' && (
                  <>
                    {hasTags ? (
                      <div className="flex flex-wrap gap-2">
                        {system.tags.map(tag => (
                          <span
                            key={tag}
                            className="text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800/50 px-2.5 py-1 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-600 italic">No tags assigned</p>
                    )}
                  </>
                )}

                {systemInfoTab === 'history' && hasTimeline && (
                  <TimelineEditor events={system.timeline ?? []} onChange={() => {}} compact />
                )}
              </div>
            </div>
          );
        })()}

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
                          onClick={() => obj.type !== 'Nebula' && handleObjectClick(obj.id)}
                          disabled={obj.type === 'Nebula'}
                          className={`w-full flex items-center gap-2 py-1.5 px-2 rounded text-left transition-colors ${
                            obj.type === 'Nebula' ? 'cursor-default text-gray-600' : (
                              selectedObjectId === obj.id ? 'bg-gray-700/50' : 'hover:bg-gray-700/30'
                            )
                          }`}
                          style={{ paddingLeft: `${8 + depth * 12}px` }}
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: obj.colors[0] }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-gray-200 text-xs font-medium truncate">{obj.name}</p>
                            <p className="text-gray-600 text-[10px]">
                              {obj.type === 'SpaceStation'
                                ? obj.isDeepSpace ? 'Deep Station' : 'Orbital Station'
                                : obj.type}
                            </p>
                          </div>
                          {obj.factionId && (() => {
                            const fc = sector?.factions.find(f => f.id === obj.factionId);
                            return fc ? (
                              <div className="w-2 h-2 rounded-full flex-shrink-0 border border-gray-800" style={{ background: fc.color }} title={fc.name} />
                            ) : null;
                          })()}
                          {(obj.tags.length > 0 || obj.notes.trim()) && (
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-600/70 flex-shrink-0" title="Has notes or tags" />
                          )}
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
