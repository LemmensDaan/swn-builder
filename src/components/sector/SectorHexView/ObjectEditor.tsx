import { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronRight, Trash2, Orbit, Earth, Plus, CircleDotDashed, Pencil } from 'lucide-react';
import type { SystemObject, ObjectType, PlanetType, NebulaShape, RingBand } from '../../../types/sector';
import { OBJECT_TYPE_DEFAULTS } from '../../../types/sector';
import { PLANET_PRESETS } from '../SystemViewer/planetRenderer';
import { resolveRingBands, RING_EARTH_TONES } from '../SystemViewer/PlanetRings';

// Orbit inclination: a fixed-shape ellipse (perspective view of orbit ring) that rotates
// with the inclination angle — clockwise for positive, counter-clockwise for negative.
function InclinationViz({ degrees }: { degrees: number }) {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" className="flex-shrink-0 opacity-80">
      {/* Reference ecliptic plane — always horizontal */}
      <ellipse cx="15" cy="15" rx="12" ry="4"
               fill="none" stroke="#374151" strokeWidth="1" strokeDasharray="2,2"/>
      {/* Inclined orbit — same shape, rotated by inclination angle */}
      <ellipse cx="15" cy="15" rx="12" ry="4"
               fill="none" stroke="#60a5fa" strokeWidth="1.5"
               transform={`rotate(${degrees}, 15, 15)`}/>
      <circle cx="15" cy="15" r="1.5" fill="#6b7280"/>
    </svg>
  );
}

// Axis inclination: circle (the body) with a tilted line through it extending past the edge
function AxisViz({ degrees }: { degrees: number }) {
  const cx = 15, cy = 15, bodyR = 9, lineR = 13;
  const rad = degrees * Math.PI / 180;
  const dx = lineR * Math.sin(rad);
  const dy = lineR * Math.cos(rad);
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" className="flex-shrink-0 opacity-80">
      <circle cx={cx} cy={cy} r={bodyR} fill="rgba(96,165,250,0.06)" stroke="#374151" strokeWidth="1"/>
      <line x1={cx - dx} y1={cy + dy} x2={cx + dx} y2={cy - dy}
            stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function SizeViz({ type, currentSize }: { type: ObjectType; currentSize: number }) {
  const defaultSize = (OBJECT_TYPE_DEFAULTS[type]?.size as number) ?? 1;
  const maxSz = Math.max(defaultSize, currentSize, 0.1);
  const maxR = 16;
  const refR = Math.max(1.5, (defaultSize / maxSz) * maxR);
  const curR = Math.max(1.5, (currentSize / maxSz) * maxR);
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" className="flex-shrink-0" role="img" aria-label={`Default: ${defaultSize}`}>
      <circle cx="19" cy="19" r={refR} fill="none" stroke="#4b5563" strokeWidth="1" strokeDasharray="2,2"/>
      <circle cx="19" cy="19" r={curR} fill="rgba(96,165,250,0.12)" stroke="#60a5fa" strokeWidth="1.5"/>
    </svg>
  );
}

const OBJECT_TYPES: ObjectType[] = [
  'Star', 'NeutronStar', 'BlackHole',
  'Planet', 'GasGiant', 'Moon',
  'AsteroidBelt', 'Comet', 'SpaceStation', 'JumpGate',
  'Nebula', 'Other',
];

// Build a ringBands array of the given length, preserving existing bands and giving
// new bands the shared inclination, a spread-out radius, default width and earth tone.
function buildRingBands(count: number, inclination: number, existing?: RingBand[]): RingBand[] {
  return Array.from({ length: count }, (_, i) => existing?.[i] ?? {
    color: RING_EARTH_TONES[i % RING_EARTH_TONES.length],
    size: 1.5 + i * 0.45,
    width: 0.4,
    inclination,
  });
}

function RingSettingsPanel({ bands, setBands }: { bands: RingBand[]; setBands: (b: RingBand[]) => void }) {
  const [masterIncl, setMasterIncl] = useState(() => bands[0]?.inclination ?? 0);
  const updateBand = (i: number, patch: Partial<RingBand>) =>
    setBands(bands.map((b, idx) => idx === i ? { ...b, ...patch } : b));

  return (
    <div className="px-2 pb-2 space-y-2 border-t border-gray-700/30">
      {/* Master inclination */}
      <label className="flex flex-col gap-1 pt-2">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 flex-1">Ring Inclination °</span>
          <InclinationViz degrees={masterIncl} />
          <input type="number" step="1" min="-90" max="90"
            className="w-14 bg-gray-900 border border-gray-700 rounded px-1.5 py-1 text-gray-200 outline-none text-[11px]"
            value={masterIncl}
            onChange={e => {
              const v = parseFloat(e.target.value) || 0;
              setMasterIncl(v);
              setBands(bands.map(b => ({ ...b, inclination: v })));
            }}
          />
        </div>
        <input type="range" min="-90" max="90" step="1"
          className="w-full accent-blue-500 cursor-pointer h-1"
          value={masterIncl}
          onChange={e => {
            const v = parseFloat(e.target.value);
            setMasterIncl(v);
            setBands(bands.map(b => ({ ...b, inclination: v })));
          }}
        />
      </label>
      <div className="border-t border-gray-700/30" />
      {/* Bands */}
      <div className="flex items-center justify-between">
        <span className="text-gray-500 font-medium text-sm">Bands</span>
        <button
          onClick={() => {
            const last = bands[bands.length - 1];
            setBands([...bands, {
              color: RING_EARTH_TONES[bands.length % RING_EARTH_TONES.length],
              size: (last ? last.size : 1.5) + 0.4,
              width: 0.4,
              inclination: masterIncl,
            }]);
          }}
          disabled={bands.length >= 8}
          className="flex items-center gap-1 text-gray-400 hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-xs"
          title="Add ring"
        >
          <Plus size={12} /> Add
        </button>
      </div>
      <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-x-2 items-center text-[10px] text-gray-600">
        <span>Color</span><span>Orbit Radius</span><span>Width</span><span>Incl °</span><span></span>
      </div>
      {bands.map((band, i) => (
        <div key={i} className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-x-2 items-center">
          <label title={`Ring ${i + 1} color`} className="cursor-pointer">
            <div
              className="w-5 h-5 rounded-sm border border-gray-600 hover:scale-110 transition-transform"
              style={{ background: band.color }}
            />
            <input type="color" className="sr-only" value={band.color}
              onChange={e => updateBand(i, { color: e.target.value })}
            />
          </label>
          <input type="number" step="0.1" min="1" max="6"
            className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 outline-none w-full"
            value={band.size}
            onChange={e => updateBand(i, { size: parseFloat(e.target.value) || 1 })}
          />
          <input type="number" step="0.05" min="0.05" max="3"
            className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 outline-none w-full"
            value={band.width ?? 0.4}
            onChange={e => updateBand(i, { width: parseFloat(e.target.value) || 0.05 })}
          />
          <div className="flex items-center gap-1 min-w-0">
            <input type="number" step="1" min="-90" max="90"
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 outline-none w-full min-w-0"
              value={band.inclination}
              onChange={e => updateBand(i, { inclination: parseFloat(e.target.value) || 0 })}
            />
            <InclinationViz degrees={band.inclination} />
          </div>
          <button
            onClick={() => setBands(bands.filter((_, idx) => idx !== i))}
            disabled={bands.length <= 1}
            className="text-gray-600 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Remove ring"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

interface Props {
  obj: SystemObject;
  allObjects: SystemObject[];
  onChange: (updates: Partial<SystemObject>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  expanded?: boolean;
  onExpandChange?: (id: string, expanded: boolean) => void;
}

function calculateOrbitRadiusForParent(parentId: string | null, obj: SystemObject, allObjects: SystemObject[]): number {
  if (!parentId) return obj.orbitRadius;

  const parent = allObjects.find(o => o.id === parentId);
  if (!parent) return obj.orbitRadius;

  const parentSize = parent.size ?? 1;
  const objSize = obj.size ?? 1;
  const CLEARANCE = 1.5;

  if (parent.type === 'AsteroidBelt') {
    return parent.orbitRadius;
  }

  const siblings = allObjects.filter(o => o.parentId === parentId && o.id !== obj.id);
  if (siblings.length > 0) {
    return Math.max(...siblings.map(s => s.orbitRadius)) + objSize * 2 + CLEARANCE;
  }

  return parentSize + objSize + CLEARANCE + 4;
}

export default function ObjectEditor({ obj, allObjects, onChange, onRemove, onMoveUp, onMoveDown, expanded: externalExpanded, onExpandChange }: Props) {
  const [expanded, setExpandedLocal] = useState(false);
  const expanded_ = externalExpanded !== undefined ? externalExpanded : expanded;

  const setExpanded = (value: boolean | ((v: boolean) => boolean)) => {
    const newValue = typeof value === 'function' ? value(expanded_) : value;
    if (onExpandChange) {
      onExpandChange(obj.id, newValue);
    } else {
      setExpandedLocal(newValue);
    }
  };
  const [orbitalPropsExpanded, setOrbitalPropsExpanded] = useState(false);
  const [orbitSettingsExpanded, setOrbitSettingsExpanded] = useState(false);
  const [ringsExpanded, setRingsExpanded] = useState(false);

  const isPlanet = ['Planet', 'GasGiant', 'Moon'].includes(obj.type);
  const isSingleColorType = ['Star', 'NeutronStar', 'BlackHole'].includes(obj.type);

  // Determine valid parent types based on child type
  const getValidParentTypes = (childType: ObjectType): ObjectType[] => {
    const STARS: ObjectType[] = ['Star', 'NeutronStar', 'BlackHole'];

    switch (childType) {
      // These types cannot orbit anything
      case 'Nebula':
      case 'Comet':
        return [];

      // Stellar hierarchy: can't orbit
      case 'Star':
      case 'NeutronStar':
      case 'BlackHole':
        return [];

      // Can only orbit stars
      case 'GasGiant':
      case 'AsteroidBelt':
        return STARS;

      // Can orbit stars or gas giants
      case 'Planet':
        return [...STARS, 'GasGiant'] as ObjectType[];

      // Can orbit stars, planets, gas giants, or moons
      case 'Moon':
        return [...STARS, 'Planet', 'GasGiant', 'Moon'] as ObjectType[];

      // Gates and stations can orbit planets, moons, belts, gas giants, or other objects
      case 'SpaceStation':
      case 'JumpGate':
        return [...STARS, 'Planet', 'GasGiant', 'Moon', 'AsteroidBelt', 'Other'] as ObjectType[];

      // Can orbit stars, planets, gas giants, moons, belts, or other
      case 'Other':
        return [...STARS, 'Planet', 'GasGiant', 'Moon', 'AsteroidBelt', 'Other'] as ObjectType[];

      default:
        return [];
    }
  };

  const validParentTypes = getValidParentTypes(obj.type);
  const validParents = allObjects.filter(o =>
    o.id !== obj.id && validParentTypes.includes(o.type)
  );

  return (
    <div className="rounded-lg bg-gray-800/60 border border-gray-700/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded_)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700/40 transition-colors text-left"
      >
        {/* Up/Down reorder buttons */}
        <div
          className={`flex flex-col flex-shrink-0 ${!onMoveUp && !onMoveDown ? 'invisible' : ''}`}
          onClick={e => e.stopPropagation()}
        >
          <button
            disabled={!onMoveUp}
            onClick={e => { e.stopPropagation(); onMoveUp?.(); }}
            title="Move up"
            className="text-gray-500 hover:text-gray-200 disabled:opacity-20 disabled:cursor-default leading-none h-3.5 flex items-center justify-center transition-colors"
          >
            <ChevronUp size={11} />
          </button>
          <button
            disabled={!onMoveDown}
            onClick={e => { e.stopPropagation(); onMoveDown?.(); }}
            title="Move down"
            className="text-gray-500 hover:text-gray-200 disabled:opacity-20 disabled:cursor-default leading-none h-3.5 flex items-center justify-center transition-colors"
          >
            <ChevronDown size={11} />
          </button>
        </div>

        {/* Color swatch */}
        <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
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
          onClick={e => e.stopPropagation()}
          className="flex-1 bg-transparent text-sm text-gray-100 font-medium placeholder:text-gray-600 outline-none border-b border-transparent focus:border-gray-500 transition-colors min-w-0"
          value={obj.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="Name"
        />

        {/* Type badge */}
        <select
          onClick={e => e.stopPropagation()}
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

        {/* Edit button */}
        <button
          onClick={e => {
            e.stopPropagation();
            setExpanded(!expanded_);
          }}
          title={expanded_ ? 'Collapse' : 'Edit'}
          className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
        >
          <Pencil size={14} />
        </button>
      </button>

      {expanded_ && (
        <div className="px-3 pb-3 pt-2 border-t border-gray-700/50 space-y-2 text-xs">
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
                <option value="diffuse">Diffuse (Orion-style)</option>
                <option value="wall">Wall</option>
                <option value="planetary">Planetary</option>
                <option value="supernova">Supernova Remnant</option>
                <option value="reflection">Reflection</option>
                <option value="bipolar0">Bipolar 0</option>
                <option value="bipolar1">Bipolar 1</option>
                <option value="bipolar2">Bipolar 2</option>
              </select>
            </label>
          )}

          {/* Black hole disc inclination */}
          {obj.type === 'BlackHole' && (
            <label className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 flex-1">Disc Inclination °</span>
                <InclinationViz degrees={obj.bhDiscInclination ?? 0} />
                <input type="number" step="1" min="-90" max="90"
                  className="w-14 bg-gray-900 border border-gray-700 rounded px-1.5 py-1 text-gray-200 outline-none text-[11px]"
                  value={obj.bhDiscInclination ?? ''}
                  placeholder="auto"
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    onChange({ bhDiscInclination: isNaN(v) ? undefined : v });
                  }}
                />
              </div>
              <input type="range" min="-90" max="90" step="1"
                className="w-full accent-blue-500 cursor-pointer h-1"
                value={obj.bhDiscInclination ?? 0}
                onChange={e => onChange({ bhDiscInclination: parseFloat(e.target.value) })}
              />
            </label>
          )}

          {/* Object Properties Section — hidden for Nebula */}
          {obj.type !== 'Nebula' && (
            <div className="space-y-2">
              <div className="rounded bg-gray-900/30 border border-gray-700/30">
                <button
                  onClick={() => setOrbitalPropsExpanded(v => !v)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {orbitalPropsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Earth size={12} />
                  <span className="font-medium">Object Properties</span>
                </button>
                {orbitalPropsExpanded && (
                  <div className="px-2 pb-2 border-t border-gray-700/30">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-2 pt-2 mb-3 pb-2 border-b border-gray-700/30">
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
                              const inc = Math.random() * 130 - 65;
                              onChange({
                                planetType: ptype,
                                colors: [preset.primaryColor, preset.secondaryColor] as [string, string],
                                iceCaps: preset.iceCaps,
                                rings: preset.rings,
                                ...(preset.rings ? {
                                  ringInclination: inc,
                                  ringBands: obj.ringBands?.length ? obj.ringBands : buildRingBands(4, inc),
                                } : {}),
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
                          </select>
                        </label>
                      )}

                      <label className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500 flex-1">Size</span>
                          <SizeViz type={obj.type} currentSize={obj.size} />
                          <input type="number" step="0.1" min="0.1" max="10"
                            className="w-14 bg-gray-900 border border-gray-700 rounded px-1.5 py-1 text-gray-200 outline-none text-[11px]"
                            value={obj.size}
                            onChange={e => onChange({ size: parseFloat(e.target.value) || 1 })}
                          />
                        </div>
                        <input type="range" min="0.1" max="10" step="0.1"
                          className="w-full accent-blue-500 cursor-pointer h-1"
                          value={obj.size}
                          onChange={e => onChange({ size: parseFloat(e.target.value) })}
                        />
                      </label>

                      <label className="flex flex-col gap-0.5">
                        <span className="text-gray-500">Axis Rotation Speed</span>
                        <input type="number" step="0.01"
                          className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 outline-none"
                          value={obj.selfRotationSpeed}
                          onChange={e => onChange({ selfRotationSpeed: parseFloat(e.target.value) || 0 })}
                        />
                      </label>

                      <label className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500 flex-1">Axis Inclination °</span>
                          <AxisViz degrees={obj.axisInclination} />
                          <input type="number" step="1" min="-90" max="90"
                            className="w-14 bg-gray-900 border border-gray-700 rounded px-1.5 py-1 text-gray-200 outline-none text-[11px]"
                            value={obj.axisInclination}
                            onChange={e => onChange({ axisInclination: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <input type="range" min="-90" max="90" step="1"
                          className="w-full accent-blue-500 cursor-pointer h-1"
                          value={obj.axisInclination}
                          onChange={e => onChange({ axisInclination: parseFloat(e.target.value) })}
                        />
                      </label>
                    </div>

                    {/* Planet-specific options */}
                    {isPlanet && (
                      <div className="space-y-2">
                        <div className="flex gap-3 pt-1">
                          {obj.type !== 'GasGiant' && (
                            <label className="flex items-center gap-2 py-1 flex-1">
                              <input
                                type="checkbox"
                                checked={obj.iceCaps ?? false}
                                onChange={e => onChange({ iceCaps: e.target.checked })}
                                className="w-4 h-4 cursor-pointer"
                              />
                              <span className="text-gray-500 text-sm">Ice Caps</span>
                            </label>
                          )}
                          <label className={`flex items-center gap-2 py-1 ${obj.type !== 'GasGiant' ? 'flex-1' : ''}`}>
                            <input
                              type="checkbox"
                              checked={obj.rings ?? false}
                              onChange={e => {
                                if (e.target.checked) {
                                  const inc = obj.ringInclination ?? (Math.random() * 130 - 65);
                                  onChange({
                                    rings: true,
                                    ringInclination: inc,
                                    ringBands: obj.ringBands?.length ? obj.ringBands : buildRingBands(3, inc),
                                  });
                                } else {
                                  onChange({ rings: false });
                                }
                              }}
                              className="w-4 h-4 cursor-pointer"
                            />
                            <span className="text-gray-500 text-sm">Rings</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Neutron star pulsar option */}
                    {obj.type === 'NeutronStar' && (
                      <div className="pt-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={obj.nsJets ?? true}
                            onChange={e => onChange({ nsJets: e.target.checked })}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span className="text-gray-500 text-sm">Pulsar (Jets)</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Ring Settings — collapsible when rings are enabled */}
              {isPlanet && obj.rings && (
                <div className="rounded bg-gray-900/30 border border-gray-700/30">
                  <button
                    onClick={() => setRingsExpanded(v => !v)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    {ringsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <CircleDotDashed size={12} />
                    <span className="font-medium">Ring Settings</span>
                  </button>
                  {ringsExpanded && (
                    <RingSettingsPanel
                      bands={resolveRingBands(obj)}
                      setBands={next => onChange({ ringBands: next })}
                    />
                  )}
                </div>
              )}

              <div className="rounded bg-gray-900/30 border border-gray-700/30">
                <button
                  onClick={() => setOrbitSettingsExpanded(v => !v)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {orbitSettingsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Orbit size={12} />
                  <span className="font-medium">Orbit Settings</span>
                </button>
                {orbitSettingsExpanded && (
                  <div className="px-2 pb-2 border-t border-gray-700/30">
                    {/* Orbit Properties Grid */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-2 pt-2">
                      {/* Parent Object */}
                      {validParents.length > 0 && (
                        <label className="flex flex-col gap-0.5">
                          <span className="text-gray-500">Parent Object</span>
                          <select
                            className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 outline-none"
                            value={obj.parentId ?? ''}
                            onChange={e => {
                              const newParentId = e.target.value || null;
                              const newOrbitRadius = calculateOrbitRadiusForParent(newParentId, obj, allObjects);
                              onChange({ parentId: newParentId, orbitRadius: newOrbitRadius });
                            }}
                          >
                            <option value="">— None (top-level orbit) —</option>
                            {validParents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </label>
                      )}

                      <label className="flex flex-col gap-0.5">
                        <span className="text-gray-500">Orbit Radius</span>
                        <input type="number" step="0.5" min="0"
                          className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 outline-none"
                          value={obj.orbitRadius}
                          onChange={e => onChange({ orbitRadius: parseFloat(e.target.value) || 0 })}
                        />
                      </label>

                      <label className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500 flex-1">Inclination °</span>
                          <InclinationViz degrees={obj.inclination} />
                          <input type="number" step="1" min="-90" max="90"
                            className="w-14 bg-gray-900 border border-gray-700 rounded px-1.5 py-1 text-gray-200 outline-none text-[11px]"
                            value={obj.inclination}
                            onChange={e => onChange({ inclination: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <input type="range" min="-90" max="90" step="1"
                          className="w-full accent-blue-500 cursor-pointer h-1"
                          value={obj.inclination}
                          onChange={e => onChange({ inclination: parseFloat(e.target.value) })}
                        />
                      </label>

                      <label className="flex flex-col gap-0.5">
                        <span className="text-gray-500">Orbit Speed</span>
                        <input type="number" step="0.005"
                          className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 outline-none"
                          value={obj.orbitSpeed}
                          onChange={e => onChange({ orbitSpeed: parseFloat(e.target.value) || 0 })}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delete button at bottom */}
          <button
            onClick={onRemove}
            className="w-full flex items-center justify-center gap-1.5 mt-3 px-3 py-2 rounded-lg text-red-500 hover:text-red-300 bg-red-950/20 hover:bg-red-950/40 text-xs font-medium transition-colors border border-red-800/30"
          >
            <Trash2 size={13} />
            Delete Object
          </button>
        </div>
      )}
    </div>
  );
}
