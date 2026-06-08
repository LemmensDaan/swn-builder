import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { AlertTriangle } from 'lucide-react';
import { useSectorStore } from '../../../store/useSectorStore';
import Starfield from '../shared/Starfield';
import GalaxyMesh from './GalaxyMesh';

export default function GalaxyView() {
  const { sectors, createSector, navigateToSector, deleteSector, systems } = useSectorStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
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
        camera={{ position: [0, 30, 65], fov: 50 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color('#03050d'))}
      >
        <ambientLight intensity={0.08} />
        <Starfield count={1800} />
        <GalaxyMesh
          sectors={sectors}
          highlightedId={hoveredId}
          onSectorClick={navigateToSector}
        />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          maxPolarAngle={Math.PI / 2.1}
          minDistance={6}
          maxDistance={120}
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>

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
                onClick={() => navigateToSector(s.id)}
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
