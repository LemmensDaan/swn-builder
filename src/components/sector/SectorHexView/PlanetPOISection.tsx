import { useState } from 'react';
import type { PlanetPOI, POIType } from '../../../types/sector';
import { POI_TYPES } from '../../../types/sector';
import { useSectorStore } from '../../../store/useSectorStore';
import { POI_COLORS, POI_LABELS } from '../SystemViewer/PlanetPOIMarkers';

interface Props {
  systemId: string;
  objectId: string;
  pois: PlanetPOI[];
}

export default function PlanetPOISection({ systemId, objectId, pois }: Props) {
  const { addPOI, updatePOI, removePOI } = useSectorStore();
  const [editing, setEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = () => {
    const lat = (Math.random() - 0.5) * 160;
    const lon = (Math.random() - 0.5) * 360;
    const poi = addPOI(systemId, objectId, { name: 'New Location', type: 'other', lat, lon });
    setEditing(true);
    setEditingId(poi.id);
  };

  return (
    <div className="border-t border-gray-700/30 pt-3">
      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2 font-semibold">Surface Locations</p>

      {pois.length > 0 && !editing ? (
        <div className="space-y-2">
          <div className="space-y-1">
            {pois.map(poi => (
              <div key={poi.id} className="flex items-center gap-2 text-xs text-gray-400">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: POI_COLORS[poi.type] }} />
                <span className="flex-1 truncate text-gray-300">{poi.name}</span>
                <span className="text-[10px] text-gray-600 flex-shrink-0">{POI_LABELS[poi.type]}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="w-full py-2 text-xs text-gray-400 hover:text-gray-300 border border-dashed border-gray-700/50 rounded transition-colors"
          >
            + Edit locations
          </button>
        </div>
      ) : editing ? (
        <div className="space-y-1.5">
          {pois.map(poi => (
            <div key={poi.id} className="rounded bg-gray-800/50 border border-gray-700/40">
              {editingId === poi.id ? (
                <div className="p-2 space-y-1.5">
                  <input
                    autoFocus
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-gray-500"
                    value={poi.name}
                    onChange={e => updatePOI(systemId, objectId, poi.id, { name: e.target.value })}
                  />
                  <select
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-gray-500"
                    value={poi.type}
                    onChange={e => updatePOI(systemId, objectId, poi.id, { type: e.target.value as POIType })}
                  >
                    {POI_TYPES.map(t => (
                      <option key={t} value={t}>{POI_LABELS[t]}</option>
                    ))}
                  </select>
                  <textarea
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-gray-500 resize-none"
                    placeholder="Notes (optional)…"
                    rows={2}
                    value={poi.notes ?? ''}
                    onChange={e => updatePOI(systemId, objectId, poi.id, { notes: e.target.value })}
                  />
                  <div className="flex justify-between">
                    <button onClick={() => setEditingId(null)} className="text-[10px] text-blue-400 hover:text-blue-300">
                      Done
                    </button>
                    <button
                      onClick={() => { removePOI(systemId, objectId, poi.id); setEditingId(null); }}
                      className="text-[10px] text-red-600 hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
                  onClick={() => setEditingId(poi.id)}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: POI_COLORS[poi.type] }} />
                  <span className="flex-1 truncate text-xs text-gray-300">{poi.name}</span>
                  <span className="text-[10px] text-gray-600">{POI_LABELS[poi.type]}</span>
                </div>
              )}
            </div>
          ))}
          <button
            onClick={handleAdd}
            className="w-full py-2 text-xs text-gray-400 hover:text-gray-300 border border-dashed border-gray-700/50 rounded transition-colors"
          >
            + Add location
          </button>
        </div>
      ) : (
        <button
          onClick={handleAdd}
          className="w-full py-2 text-xs text-gray-400 hover:text-gray-300 border border-dashed border-gray-700/50 rounded transition-colors"
        >
          + Add location
        </button>
      )}
    </div>
  );
}
