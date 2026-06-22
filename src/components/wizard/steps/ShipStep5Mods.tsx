import { useState } from 'react';
import type { Ship, InstalledMod } from '../../../types/ship';
import type { DerivedShip } from '../../../data/ships';
import { SHIP_MODS } from '../../../data/ships';

interface Props {
  ship: Ship;
  derived: DerivedShip;
  onChange: (patch: Partial<Ship>) => void;
}

function modCost(pct: number, hullCost: number): number {
  return Math.round((pct / 100) * hullCost);
}

function componentsNeeded(perClass: number, hullClass: string): number {
  const map: Record<string, number> = { Fighter: 1, Frigate: 2, Cruiser: 3, Capital: 4 };
  return perClass * (map[hullClass] ?? 1);
}

export default function ShipStep5Mods({ ship, derived, onChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const hullClass = derived.hull.class;
  const hullCost = derived.hull.cost;

  const installedMods = ship.mods ?? [];

  function getInstalled(id: string): InstalledMod | undefined {
    return installedMods.find(m => m.id === id);
  }

  function countInstalled(id: string): number {
    return installedMods.filter(m => m.id === id).length;
  }

  function addMod(id: string) {
    onChange({ mods: [...installedMods, { id, status: 'aftermarket' as const }] });
  }

  function removeMod(id: string) {
    // Remove last occurrence of this id
    const idx = [...installedMods].reverse().findIndex(m => m.id === id);
    if (idx === -1) return;
    const realIdx = installedMods.length - 1 - idx;
    onChange({ mods: installedMods.filter((_, i) => i !== realIdx) });
  }

  function setStatus(id: string, status: 'aftermarket' | 'redesigned') {
    onChange({
      mods: installedMods.map(m => m.id === id ? { ...m, status } : m),
    });
  }

  // Aftermarket mods consume maintenance slots (Fix skill-based)
  const aftermarketCount = installedMods.filter(m => m.status === 'aftermarket').length;
  const totalModCost = installedMods.reduce((sum, m) => {
    const def = SHIP_MODS.find(d => d.id === m.id);
    const cost = def ? modCost(def.costPct, hullCost) : 0;
    // Redesigned costs 5× base; aftermarket costs 1×
    return sum + (m.status === 'redesigned' ? cost * 5 : cost);
  }, 0);

  return (
    <div className="space-y-6">

      {/* Info box */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-2 text-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-gray-400 text-xs uppercase tracking-wide">Installed mods</span>
            <div className="flex gap-4 mt-1">
              <span className="text-gray-200 font-mono">{installedMods.length} total</span>
              <span className="text-amber-400 font-mono">{aftermarketCount} aftermarket</span>
              <span className="text-green-400 font-mono">{installedMods.length - aftermarketCount} redesigned</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-gray-400 text-xs uppercase tracking-wide">Mod costs</span>
            <div className="text-amber-300 font-mono font-bold mt-1">{totalModCost.toLocaleString()} cr</div>
          </div>
        </div>
        <p className="text-xs text-gray-500 border-t border-gray-700 pt-2">
          <span className="text-amber-400">Aftermarket</span> mods require weekly maintenance (Fix slots = INT mod + CON mod + 3×Fix).
          {' '}<span className="text-green-400">Redesigned</span> mods cost 5× and need a shipyard, but require no maintenance.
        </p>
      </div>

      {/* Mods list */}
      <div className="space-y-2">
        {SHIP_MODS.map(def => {
          const count = countInstalled(def.id);
          const isInstalled = count > 0;
          const installed = getInstalled(def.id);
          const cost = modCost(def.costPct, hullCost);
          const components = componentsNeeded(def.componentsPerClass, hullClass);
          const isExpanded = expandedId === def.id;

          return (
            <div
              key={def.id}
              className={`rounded-lg border transition-colors ${isInstalled ? 'border-violet-700/50 bg-violet-900/10' : 'border-gray-700 bg-gray-800/50'}`}
            >
              <div
                className="flex items-center gap-2 p-3 cursor-pointer select-none"
                onClick={() => setExpandedId(isExpanded ? null : def.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium text-sm ${isInstalled ? 'text-violet-300' : 'text-gray-200'}`}>
                      {def.name}
                    </span>
                    <span className="text-xs text-gray-600 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5">
                      Fix-{def.fixRequired}
                    </span>
                    {def.repeatable && (
                      <span className="text-xs text-gray-600">repeatable</span>
                    )}
                    {count > 1 && (
                      <span className="text-xs text-violet-500 font-mono">×{count}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Cost: {cost.toLocaleString()} cr ({def.costPct}% hull)
                    {components > 0 && ` · ${components} pretech component${components !== 1 ? 's' : ''}`}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isInstalled && (
                    <button
                      onClick={e => { e.stopPropagation(); removeMod(def.id); }}
                      className="w-7 h-7 rounded bg-gray-700 hover:bg-red-900/40 text-gray-300 text-sm flex items-center justify-center"
                    >−</button>
                  )}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (!def.repeatable && isInstalled) return;
                      addMod(def.id);
                    }}
                    disabled={!def.repeatable && isInstalled}
                    className={`w-7 h-7 rounded text-sm flex items-center justify-center ${(!def.repeatable && isInstalled) ? 'bg-gray-800 text-gray-600 opacity-30 cursor-not-allowed' : 'bg-gray-700 hover:bg-violet-900/40 text-gray-300 hover:text-violet-300'}`}
                  >+</button>
                  <span className="text-gray-600 text-xs">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 pt-0 border-t border-gray-700/50 space-y-2">
                  <p className="text-xs text-gray-400 leading-relaxed">{def.description}</p>
                  {isInstalled && installed && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Installation type:</span>
                      <div className="flex rounded overflow-hidden border border-gray-700 text-xs">
                        <button
                          onClick={() => setStatus(def.id, 'aftermarket')}
                          className={`px-2.5 py-1 font-medium transition-colors ${installed.status === 'aftermarket' ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
                        >
                          Aftermarket
                        </button>
                        <button
                          onClick={() => setStatus(def.id, 'redesigned')}
                          className={`px-2.5 py-1 font-medium transition-colors ${installed.status === 'redesigned' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
                        >
                          Redesigned (5×)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Installed summary */}
      {installedMods.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Installed Mods</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {installedMods.map((m, i) => {
              const def = SHIP_MODS.find(d => d.id === m.id);
              if (!def) return null;
              return (
                <span key={i} className={`px-2 py-1 rounded border ${m.status === 'redesigned' ? 'bg-green-900/30 text-green-300 border-green-800/50' : 'bg-violet-900/30 text-violet-300 border-violet-800/50'}`}>
                  {def.name}
                  <span className="ml-1 opacity-60">{m.status === 'redesigned' ? '(R)' : '(A)'}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
