import { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2, Orbit, Info, Palette, Pencil } from 'lucide-react';
import type { SystemObject, ObjectType, PlanetType, NebulaShape } from '../../../types/sector';
import { OBJECT_TYPE_DEFAULTS } from '../../../types/sector';
import { PLANET_PRESETS } from '../SystemViewer/planetRenderer';

const OBJECT_TYPES: ObjectType[] = [
  'Star', 'NeutronStar', 'BlackHole',
  'Planet', 'GasGiant', 'Moon',
  'AsteroidBelt', 'Comet', 'SpaceStation', 'JumpGate',
  'Nebula', 'Other',
];

interface Props {
  obj: SystemObject;
  allObjects: SystemObject[];
  onChange: (updates: Partial<SystemObject>) => void;
  onRemove: () => void;
  draggable?: boolean;
}

export default function ObjectEditor({ obj, allObjects, onChange, onRemove, draggable = true }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [orbitalExpanded, setOrbitalExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const isPlanet = ['Planet', 'GasGiant', 'Moon'].includes(obj.type);
  const isSingleColorType = ['Star', 'NeutronStar', 'BlackHole'].includes(obj.type);

  // SpaceStation, JumpGate, Other can orbit asteroid belts; everything else cannot
  const canOrbitBelt = ['SpaceStation', 'JumpGate', 'Other'].includes(obj.type);
  // Stellar hierarchy: BlackHole > NeutronStar > Star
  const validParents = obj.type === 'Nebula'
    ? []
    : obj.type === 'BlackHole'
      ? []
      : obj.type === 'NeutronStar'
        ? allObjects.filter(o => o.id !== obj.id && o.type === 'BlackHole')
        : obj.type === 'Star'
          ? allObjects.filter(o => o.id !== obj.id && ['BlackHole', 'NeutronStar'].includes(o.type))
          : allObjects.filter(o => {
              if (o.id === obj.id) return false;
              if (['Star', 'NeutronStar', 'BlackHole', 'Moon'].includes(o.type)) return false;
              if (o.type === 'AsteroidBelt') return canOrbitBelt;
              return true;
            });

  return (
    <div className="rounded-lg bg-gray-800/60 border border-gray-700/50">
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Drag handle */}
        <span className={`select-none text-xs ${draggable ? 'text-gray-600 cursor-grab' : 'text-gray-700 invisible'}`}>⠿</span>

        {/* Color swatch */}
        <div className="flex gap-0.5">
          {obj.colors.map((c, i) => (
            <label key={i} title={i === 0 ? 'Primary color' : 'Secondary color'} className="cursor-pointer">
              <div
                className="w-4 h-4 rounded-sm border border-gray-600 hover:scale-110 transition-transform"
                style={{ background: c }}
              />
              <input
                type="color"
                className="sr-only"
                value={c}
                onChange={e => {
                  const next = [...obj.colors] as [string] | [string, string];
                  next[i] = e.target.value;
                  onChange({ colors: next });
                }}
              />
            </label>
          ))}
          {obj.planetType === 'TidallyLocked' && (
            <label title="Twilight zone color" className="cursor-pointer">
              <div
                className="w-4 h-4 rounded-sm border border-gray-600 hover:scale-110 transition-transform"
                style={{ background: obj.tertiaryColor ?? '#2d8d2d' }}
              />
              <input
                type="color"
                className="sr-only"
                value={obj.tertiaryColor ?? '#2d8d2d'}
                onChange={e => onChange({ tertiaryColor: e.target.value })}
              />
            </label>
          )}
          {!isSingleColorType && obj.colors.length === 1 && (
            <button
              title="Add second color"
              onClick={() => onChange({ colors: [obj.colors[0], '#888888'] as [string, string] })}
              className="w-4 h-4 rounded-sm border border-dashed border-gray-600 text-gray-600 hover:text-gray-400 flex items-center justify-center text-[9px]"
            >+</button>
          )}
          {!isSingleColorType && obj.colors.length === 2 && (
            <button
              title="Remove second color"
              onClick={() => onChange({ colors: [obj.colors[0]] as [string] })}
              className="w-4 h-4 rounded-sm border border-dashed border-gray-600 text-gray-600 hover:text-gray-400 flex items-center justify-center text-[9px]"
            >×</button>
          )}
        </div>

        {/* Name */}
        <input
          className="flex-1 bg-transparent text-sm text-gray-100 font-medium placeholder:text-gray-600 outline-none border-b border-transparent focus:border-gray-500 transition-colors min-w-0"
          value={obj.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="Name"
        />

        {/* Type badge */}
        <select
          className="text-[10px] bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-gray-400 outline-none"
          value={obj.type}
          onChange={e => {
            const t = e.target.value as ObjectType;
            const defaults = OBJECT_TYPE_DEFAULTS[t];
            onChange({ type: t, ...defaults });
          }}
        >
          {OBJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <button onClick={() => setExpanded(v => !v)} className="text-gray-500 hover:text-gray-300">
          <Pencil size={14} />
        </button>
        <button onClick={onRemove} className="text-gray-600 hover:text-red-400 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-700/50 space-y-2 text-xs">
          {/* Parent Object */}
          {validParents.length > 0 && (
            <label className="flex flex-col gap-0.5">
              <span className="text-gray-500">Parent Object</span>
              <select
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 outline-none"
                value={obj.parentId ?? ''}
                onChange={e => {
                  const newParentId = e.target.value || null;
                  const newParent = allObjects.find(o => o.id === newParentId);
                  if (newParent?.type === 'AsteroidBelt') {
                    onChange({ parentId: newParentId, orbitRadius: newParent.orbitRadius, inclination: newParent.inclination });
                  } else {
                    onChange({ parentId: newParentId });
                  }
                }}
              >
                <option value="">— None (top-level orbit) —</option>
                {validParents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}

          {/* Nebula Shape */}
          {obj.type === 'Nebula' && (
            <label className="flex flex-col gap-0.5">
              <span className="text-gray-500">Nebula Shape</span>
              <select
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 outline-none"
                value={obj.nebulaShape ?? 'emission'}
                onChange={e => onChange({ nebulaShape: e.target.value as NebulaShape })}
              >
                <option value="emission">Emission</option>
                <option value="planetary">Planetary</option>
                <option value="supernova">Supernova Remnant</option>
                <option value="reflection">Reflection</option>
                <option value="bipolar0">Bipolar 0 (Lumpy Lobes)</option>
                <option value="bipolar1">Bipolar 1 (Shell Rim)</option>
                <option value="bipolar2">Bipolar 2 (Cone)</option>
              </select>
            </label>
          )}

          {/* Planet Type */}
          {isPlanet && (
            <label className="flex flex-col gap-0.5">
              <span className="text-gray-500">Planet Type</span>
              <select
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 outline-none"
                value={obj.planetType ?? 'Barren'}
                onChange={e => {
                  const ptype = e.target.value as PlanetType;
                  const preset = PLANET_PRESETS[ptype];
                  onChange({
                    planetType: ptype,
                    colors: [preset.primaryColor, preset.secondaryColor] as [string, string],
                    iceCaps: preset.iceCaps,
                    rings: preset.rings,
                    ringInclination: preset.rings ? (Math.random() * 130 - 65) : 0,
                  });
                }}
              >
                <option value="Terran">Terran</option>
                <option value="Arid">Arid</option>
                <option value="Ocean">Ocean</option>
                <option value="Ice">Ice</option>
                <option value="GasGiant">Gas Giant</option>
                <option value="Toxic">Toxic</option>
                <option value="Barren">Barren</option>
                <option value="Volcanic">Volcanic</option>
                <option value="TidallyLocked">Tidally Locked</option>
              </select>
            </label>
          )}

          {/* Ice Caps + Rings (side by side for planets) */}
          {isPlanet && (
            <div className="flex gap-3">
              <label className="flex items-center gap-2 py-1 flex-1">
                <input
                  type="checkbox"
                  checked={obj.iceCaps ?? false}
                  onChange={e => onChange({ iceCaps: e.target.checked })}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-gray-500 text-sm">Ice Caps</span>
              </label>
              <label className="flex items-center gap-2 py-1 flex-1">
                <input
                  type="checkbox"
                  checked={obj.rings ?? false}
                  onChange={e => onChange({
                    rings: e.target.checked,
                    ringInclination: e.target.checked ? (Math.random() * 130 - 65) : 0
                  })}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-gray-500 text-sm">Rings</span>
              </label>
            </div>
          )}

          {/* Orbital Properties Section — hidden for Nebula */}
          {obj.type !== 'Nebula' && <div className="rounded bg-gray-900/30 border border-gray-700/30">
            <button
              onClick={() => setOrbitalExpanded(v => !v)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-gray-400 hover:text-gray-300 transition-colors"
            >
              {orbitalExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Orbit size={12} />
              <span className="font-medium">Orbital Properties</span>
            </button>
            {orbitalExpanded && (
              <div className="px-2 pb-2 grid grid-cols-2 gap-x-2 gap-y-2 border-t border-gray-700/30">
                <label className="flex flex-col gap-0.5 pt-2">
                  <span className="text-gray-500">Size</span>
                  <input type="number" step="0.1" min="0.1" max="10"
                    className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 outline-none"
                    value={obj.size}
                    onChange={e => onChange({ size: parseFloat(e.target.value) || 1 })}
                  />
                </label>
                <label className="flex flex-col gap-0.5 pt-2">
                  <span className="text-gray-500">Orbit Radius</span>
                  <input type="number" step="0.5" min="0"
                    className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 outline-none"
                    value={obj.orbitRadius}
                    onChange={e => onChange({ orbitRadius: parseFloat(e.target.value) || 0 })}
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-gray-500">Inclination °</span>
                  <input type="number" step="1" min="-90" max="90"
                    className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 outline-none"
                    value={obj.inclination}
                    onChange={e => onChange({ inclination: parseFloat(e.target.value) || 0 })}
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-gray-500">Rotation Speed</span>
                  <input type="number" step="0.01" min="0"
                    className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 outline-none"
                    value={obj.selfRotationSpeed}
                    onChange={e => onChange({ selfRotationSpeed: parseFloat(e.target.value) || 0 })}
                  />
                </label>
              </div>
            )}
          </div>}

          {/* Tags */}
          <label className="flex flex-col gap-0.5">
            <span className="text-gray-500">Tags (comma-separated)</span>
            <input
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 outline-none"
              value={obj.tags.join(', ')}
              onChange={e => onChange({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
              placeholder="e.g. TL4, Hostile Biosphere"
            />
          </label>

          {/* Notes */}
          <label className="flex flex-col gap-0.5">
            <span className="text-gray-500">Notes</span>
            <textarea
              rows={2}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 outline-none resize-none"
              value={obj.notes}
              onChange={e => onChange({ notes: e.target.value })}
              placeholder="GM notes, world tags…"
            />
          </label>
        </div>
      )}
    </div>
  );
}
