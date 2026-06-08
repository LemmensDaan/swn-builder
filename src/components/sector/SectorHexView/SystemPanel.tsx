import { useState } from 'react';
import { X, Plus, Eye, Trash2, Shuffle } from 'lucide-react';
import type { StarSystem, ObjectType, SystemType } from '../../../types/sector';
import { useSectorStore } from '../../../store/useSectorStore';
import { randomizeSystem } from '../SystemViewer/systemRandomizer';
import ObjectEditor from './ObjectEditor';

const SYSTEM_TYPES: SystemType[] = ['Standard', 'Binary', 'Hostile', 'Rich', 'Dead', 'Frontier'];

const QUICK_TYPES: { type: ObjectType; label: string }[] = [
  { type: 'Star',         label: 'Star'     },
  { type: 'Planet',       label: 'Planet'   },
  { type: 'GasGiant',     label: 'Gas Giant'},
  { type: 'Moon',         label: 'Moon'     },
  { type: 'AsteroidBelt', label: 'Belt'     },
  { type: 'SpaceStation', label: 'Station'  },
  { type: 'JumpGate',     label: 'Gate'     },
  { type: 'BlackHole',    label: 'Black Hole'},
  { type: 'Nebula',       label: 'Nebula'   },
];

interface Props {
  system: StarSystem;
  sectorId: string;
  onClose: () => void;
  onViewSystem: () => void;
  onDeleteSystem: () => void;
}

export default function SystemPanel({ system, sectorId: _sectorId, onClose, onViewSystem, onDeleteSystem }: Props) {
  const { updateSystem, addObject, updateObject, removeObject, reorderObjects } = useSectorStore();
  const [addingType, setAddingType] = useState(false);
  const [systemType, setSystemType] = useState<SystemType>('Standard');

  function handleRandomize() {
    const newObjects = randomizeSystem(systemType);
    // Clear existing objects then add the randomized ones
    system.objects.forEach(o => removeObject(system.id, o.id));
    newObjects.forEach(o => addObject(system.id, o));
  }

  const sorted = [...system.objects].sort((a, b) => a.sortOrder - b.sortOrder);

  function handleDragStart(e: React.DragEvent, idx: number) {
    e.dataTransfer.setData('text/plain', String(idx));
  }

  function handleDrop(e: React.DragEvent, toIdx: number) {
    e.preventDefault();
    const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
    if (fromIdx === toIdx) return;
    const ids = sorted.map(o => o.id);
    const [moved] = ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, moved);
    reorderObjects(system.id, ids);
  }

  return (
    <div className="flex flex-col h-full bg-gray-900/95 backdrop-blur border-l border-gray-700/60">
      {/* Header row 1: name + close */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <input
          className="flex-1 bg-transparent text-base font-bold text-amber-300 placeholder:text-gray-600 outline-none border-b border-transparent focus:border-amber-600 transition-colors"
          value={system.name}
          onChange={e => updateSystem(system.id, { name: e.target.value })}
          placeholder="System name"
        />
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 flex-shrink-0">
          <X size={18} />
        </button>
      </div>

      {/* Header row 2: actions */}
      <div className="flex items-center gap-1.5 px-4 pb-3 border-b border-gray-700/60">
        <button
          onClick={onViewSystem}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-800 hover:bg-sky-700 text-sky-200 text-xs font-medium transition-colors flex-shrink-0"
        >
          <Eye size={13} />
          View 3D
        </button>
        <div className="flex items-center gap-1 ml-auto">
          <select
            value={systemType}
            onChange={e => setSystemType(e.target.value as SystemType)}
            className="text-[10px] bg-gray-900 border border-gray-700 rounded px-1 py-1 text-gray-400 outline-none"
          >
            {SYSTEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            onClick={handleRandomize}
            title="Randomize system"
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-amber-300 transition-colors"
          >
            <Shuffle size={13} />
          </button>
        </div>
      </div>

      {/* Object list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 min-h-0">
        {sorted.length === 0 && (
          <p className="text-gray-600 text-xs text-center py-6">No objects yet. Add one below.</p>
        )}
        {sorted.map((obj, idx) => (
          <div
            key={obj.id}
            draggable
            onDragStart={e => handleDragStart(e, idx)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, idx)}
          >
            <ObjectEditor
              obj={obj}
              allObjects={system.objects}
              onChange={updates => updateObject(system.id, obj.id, updates)}
              onRemove={() => removeObject(system.id, obj.id)}
            />
          </div>
        ))}
      </div>

      {/* Add object row */}
      <div className="px-3 py-3 border-t border-gray-700/60">
        {!addingType ? (
          <button
            onClick={() => setAddingType(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-gray-600 text-gray-500 hover:text-gray-300 hover:border-gray-500 text-sm transition-colors"
          >
            <Plus size={14} />
            Add Object
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TYPES.map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => {
                    addObject(system.id, { type });
                    setAddingType(false);
                  }}
                  className="px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 text-xs font-medium transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setAddingType(false)}
              className="text-xs text-gray-600 hover:text-gray-400"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Delete system */}
      <div className="px-3 pt-2 border-t border-gray-700/60">
        <button
          onClick={onDeleteSystem}
          className="flex items-center gap-1.5 text-red-500 hover:text-red-400 text-xs transition-colors"
        >
          <Trash2 size={12} />
          Delete System
        </button>
      </div>

      {/* Notes */}
      <div className="px-3 pb-3 pt-2">
        <textarea
          rows={2}
          className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder:text-gray-600 outline-none resize-none focus:border-gray-500 transition-colors"
          value={system.notes}
          onChange={e => updateSystem(system.id, { notes: e.target.value })}
          placeholder="System notes, GM secrets…"
        />
      </div>
    </div>
  );
}
