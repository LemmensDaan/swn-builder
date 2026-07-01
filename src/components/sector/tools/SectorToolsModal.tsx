import { useState } from 'react';
import { X, Globe2, Rocket } from 'lucide-react';
import WorldGenerator from './WorldGenerator';
import SpikeTravelCalculator from './SpikeTravelCalculator';
import { useSectorStore } from '../../../store/useSectorStore';

type Tab = 'world' | 'spike';

/** GM tools modal: spike-drive travel everywhere; the world generator only when a system is open. */
export default function SectorToolsModal({ onClose }: { onClose: () => void }) {
  const inSystem = useSectorStore(s => s.layer === 'system' && s.activeSystemId != null);
  const [tab, setTab] = useState<Tab>(inSystem ? 'world' : 'spike');

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h3 className="text-gray-100 font-semibold text-lg">Sector Tools</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200"><X size={20} /></button>
        </div>

        <div className="flex gap-2 px-6 py-3 border-b border-gray-800">
          {inSystem && (
            <button
              onClick={() => setTab('world')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'world' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              <Globe2 size={13} /> World Generator
            </button>
          )}
          <button
            onClick={() => setTab('spike')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'spike' ? 'bg-sky-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            <Rocket size={13} /> Spike Travel
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {inSystem && tab === 'world' ? <WorldGenerator /> : <SpikeTravelCalculator />}
        </div>
      </div>
    </div>
  );
}
