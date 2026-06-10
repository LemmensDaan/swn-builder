import { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useSectorStore } from '../../store/useSectorStore';
import GalaxyView from './GalaxyView/GalaxyView';
import SectorHexView from './SectorHexView/SectorHexView';
import SystemViewer from './SystemViewer/SystemViewer';

interface Props {
  onBack: () => void;
}

export default function SectorViewer({ onBack }: Props) {
  const { layer } = useSectorStore();

  // Keep SystemViewer mounted briefly after navigating away so the CSS fade-out plays
  const [systemMounted, setSystemMounted] = useState(layer === 'system');

  useEffect(() => {
    if (layer === 'system') {
      setSystemMounted(true);
    }
  }, [layer]);

  useEffect(() => {
    if (systemMounted && layer !== 'system') {
      const t = setTimeout(() => setSystemMounted(false), 450);
      return () => clearTimeout(t);
    }
  }, [systemMounted, layer]);

  const inSectorOrSystem = layer === 'sector' || layer === 'system' || systemMounted;

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-950 z-10">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-900/80 backdrop-blur border-b border-gray-700/60 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-gray-400 hover:text-gray-200 text-sm transition-colors"
        >
          <ChevronLeft size={16} />
          Home
        </button>
        <div className="w-px h-4 bg-gray-700" />
        <Breadcrumb />
      </div>

      {/* Layer content */}
      <div className="relative flex-1 min-h-0" style={{ background: '#080c14' }}>
        {layer === 'galaxy' && <GalaxyView />}

        {/* SectorHexView and SystemViewer crossfade — both kept alive during transition */}
        {inSectorOrSystem && (
          <>
            <div
              className="absolute inset-0"
              style={{
                opacity: layer === 'sector' ? 1 : 0,
                transition: 'opacity 400ms ease',
                pointerEvents: layer === 'sector' ? 'auto' : 'none',
              }}
            >
              <SectorHexView />
            </div>

            {systemMounted && (
              <div
                className="absolute inset-0"
                style={{
                  opacity: layer === 'system' ? 1 : 0,
                  transition: 'opacity 400ms ease',
                  pointerEvents: layer === 'system' ? 'auto' : 'none',
                }}
              >
                <SystemViewer />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Breadcrumb() {
  const { layer, activeSectorId, activeSystemId, sectors, systems, navigateHome, navigateToSector } = useSectorStore();
  const sector = sectors.find(s => s.id === activeSectorId);
  const system = activeSystemId ? systems[activeSystemId] : null;

  return (
    <div className="flex items-center gap-1 text-xs text-gray-500">
      <button onClick={navigateHome} className={`hover:text-gray-300 transition-colors ${layer === 'galaxy' ? 'text-gray-200 font-medium' : ''}`}>
        Galaxy
      </button>
      {sector && (
        <>
          <span className="text-gray-700">/</span>
          <button
            onClick={() => navigateToSector(sector.id)}
            className={`hover:text-gray-300 transition-colors ${layer === 'sector' ? 'text-gray-200 font-medium' : ''}`}
          >
            {sector.name}
          </button>
        </>
      )}
      {system && (
        <>
          <span className="text-gray-700">/</span>
          <span className="text-gray-200 font-medium">{system.name}</span>
        </>
      )}
    </div>
  );
}
