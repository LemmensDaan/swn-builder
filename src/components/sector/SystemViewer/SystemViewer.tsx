import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ChevronLeft, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { useSectorStore } from '../../../store/useSectorStore';
import SystemScene from './SystemScene';

export default function SystemViewer() {
  const { activeSystemId, activeSectorId, systems, sectors, navigateBack, navigateHome } = useSectorStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const system = activeSystemId ? systems[activeSystemId] : null;
  const sector = sectors.find(s => s.id === activeSectorId);

  if (!system) return null;

  const sorted = [...system.objects].sort((a, b) => a.sortOrder - b.sortOrder);
  const objectById = Object.fromEntries(system.objects.map(o => [o.id, o]));

  // Auto-calculate camera distance based on system extent (furthest orbit)
  const furthestOrbit = Math.max(
    0,
    ...system.objects.filter(o => !o.parentId).map(o => o.orbitRadius)
  );
  const camDistance = Math.max(35, furthestOrbit * 2.5 + 15); // Buffer for visibility

  return (
    <div className="flex h-full relative">
      {/* 3D Canvas */}
      <div className="flex-1 relative">
        <Canvas
          camera={{ position: [0, camDistance * 0.4, camDistance], fov: 60 }}
          shadows
          gl={{ antialias: true }}
          onCreated={({ gl }) => gl.setClearColor(new THREE.Color('#04070f'))}
        >
          <SystemScene system={system} />
          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            minDistance={5}
            maxDistance={Math.max(200, camDistance * 2)}
          />
        </Canvas>

        {/* Nav bar */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <button
            onClick={navigateBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900/80 hover:bg-gray-800 border border-gray-700/60 text-gray-300 text-xs font-medium transition-colors backdrop-blur"
          >
            <ChevronLeft size={14} />
            {sector?.name ?? 'Sector'}
          </button>
          <button
            onClick={navigateHome}
            className="px-3 py-1.5 rounded-lg bg-gray-900/80 hover:bg-gray-800 border border-gray-700/60 text-gray-500 text-xs transition-colors backdrop-blur"
          >
            Galaxy
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
          {sidebarOpen ? <ChevronRightIcon size={14} /> : <ChevronDown size={14} />}
          Objects
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
              {sorted.map(obj => {
                const parent = obj.parentId ? objectById[obj.parentId] : null;
                return (
                  <div key={obj.id} className={`flex items-center gap-2 py-1.5 px-2 rounded ${parent ? 'pl-5' : ''}`}>
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: obj.colors[0] }}
                    />
                    <div className="min-w-0">
                      <p className="text-gray-200 text-xs font-medium truncate">{obj.name}</p>
                      <p className="text-gray-600 text-[10px]">
                        {obj.type}{parent ? ` › ${parent.name}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
