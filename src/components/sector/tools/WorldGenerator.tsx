import { useState } from 'react';
import { Dices, Check } from 'lucide-react';
import { useSectorStore } from '../../../store/useSectorStore';
import { generateWorld, worldToNotes, type GeneratedWorld } from '../../../data/world-gen';

const PLANETLIKE = new Set(['Planet', 'GasGiant', 'Moon']);

/** World generation tables (pp.161–176) — roll a world and optionally apply it to a planet. */
export default function WorldGenerator() {
  const { systems, activeSystemId, updateObject } = useSectorStore();
  const [world, setWorld] = useState<GeneratedWorld>(() => generateWorld());
  const [applied, setApplied] = useState<string | null>(null);

  const activeSystem = activeSystemId ? systems[activeSystemId] : null;
  const planets = (activeSystem?.objects ?? []).filter(o => PLANETLIKE.has(o.type));

  function applyTo(objId: string) {
    if (!activeSystem) return;
    const obj = activeSystem.objects.find(o => o.id === objId);
    if (!obj) return;
    const mergedTags = Array.from(new Set([...(obj.tags ?? []), ...world.tags]));
    const noteBlock = worldToNotes(world);
    const newNotes = obj.notes ? `${obj.notes}\n\n${noteBlock}` : noteBlock;
    updateObject(activeSystem.id, objId, { tags: mergedTags, notes: newNotes });
    setApplied(objId);
    setTimeout(() => setApplied(null), 1500);
  }

  const rows: [string, string][] = [
    ['Atmosphere', world.atmosphere],
    ['Temperature', world.temperature],
    ['Biosphere', world.biosphere],
    ['Population', world.population],
    ['Tech Level', world.techLevel],
    ['World Tags', `${world.tags[0]}, ${world.tags[1]}`],
  ];

  return (
    <div className="space-y-4">
      <button
        onClick={() => { setWorld(generateWorld()); setApplied(null); }}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors"
      >
        <Dices size={16} /> Roll New World
      </button>

      <div className="rounded-lg border border-gray-700 bg-gray-800/50 divide-y divide-gray-800">
        {rows.map(([label, val]) => (
          <div key={label} className="flex gap-3 px-3 py-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider w-24 flex-shrink-0 pt-0.5">{label}</span>
            <span className="text-sm text-gray-200">{val}</span>
          </div>
        ))}
      </div>

      {activeSystem ? (
        planets.length > 0 ? (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Apply to a world in {activeSystem.name}</p>
            <div className="flex flex-wrap gap-2">
              {planets.map(p => (
                <button
                  key={p.id}
                  onClick={() => applyTo(p.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-700 bg-gray-800/60 hover:bg-gray-700 text-gray-300 text-xs transition-colors"
                >
                  {applied === p.id ? <Check size={12} className="text-emerald-400" /> : null}
                  {p.name}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-600 mt-2 italic">Adds the two world tags and appends the attributes to the planet's notes.</p>
          </div>
        ) : (
          <p className="text-xs text-gray-600 italic">No planets in the current system to apply to.</p>
        )
      ) : (
        <p className="text-xs text-gray-600 italic">Open a system to apply a rolled world directly to one of its planets.</p>
      )}
    </div>
  );
}
