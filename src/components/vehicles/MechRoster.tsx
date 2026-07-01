import { useState } from 'react';
import { Plus, Bot, Ghost, ChevronDown, ChevronRight } from 'lucide-react';
import { useMechs } from '../../store/useMechs';
import ItemActions from '../ItemActions';
import MechWizard from './MechWizard';
import {
  MECH_HULLS, MECH_FITTINGS, MECH_DEFENSES, MECH_WEAPONS, scaleMechCost,
} from '../../data/vehicles';
import type { Mech } from '../../types/mech';

/** Hull + total cost + component count for a saved mech (statline on the card). */
function summarize(mech: Mech) {
  const hull = MECH_HULLS.find(h => h.id === mech.hullId);
  if (!hull) return { hullName: '(unknown hull)', cls: '—', cost: 0, weapons: 0, components: mech.slots.length };
  let cost = hull.cost;
  let weapons = 0;
  for (const s of mech.slots) {
    if (s.kind === 'fitting') { const d = MECH_FITTINGS.find(f => f.id === s.defId); if (d) cost += scaleMechCost(d.baseCost, hull.class); }
    else if (s.kind === 'defense') { const d = MECH_DEFENSES.find(f => f.id === s.defId); if (d) cost += scaleMechCost(d.baseCost, hull.class); }
    else { const d = MECH_WEAPONS.find(w => w.id === s.defId); if (d) { cost += d.cost; weapons++; } }
  }
  return { hullName: hull.name, cls: hull.class, cost, weapons, components: mech.slots.length };
}

function MechCard({ mech, onOpen, onDelete, onRetire, onUnretire, onCopy }: {
  mech: Mech; onOpen: () => void; onDelete: () => void; onRetire: () => void; onUnretire: () => void; onCopy: () => void;
}) {
  const s = summarize(mech);
  return (
    <div
      onClick={onOpen}
      className={`glass-card rounded-xl cursor-pointer transition-all duration-200 hover:border-amber-600/60 hover:bg-gray-800/50 hover:-translate-y-0.5 p-5 flex flex-col gap-3 relative overflow-hidden ${mech.retired ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-2.5">
        <Bot size={16} className="text-amber-400 flex-shrink-0" />
        <span className="font-bold text-gray-100 text-base leading-tight truncate flex-1">{mech.name || '(unnamed mech)'}</span>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">{s.hullName}</span>
        <span className="px-1.5 py-0.5 rounded bg-sky-900/40 text-sky-300">{s.cls}</span>
        <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{s.weapons} wpn</span>
        <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{s.components} parts</span>
      </div>
      <div className="text-xs text-amber-400 font-medium">{s.cost.toLocaleString()} cr</div>
      <ItemActions itemType="ship" itemName={mech.name} retired={mech.retired ?? false}
        onDelete={onDelete} onRetire={onRetire} onUnretire={onUnretire} onCopy={onCopy} />
    </div>
  );
}

/** Saved-mech roster — the entry point for the Vehicles → Mech Builder tab. */
export default function MechRoster() {
  const { mechs, upsertMech, removeMech, copyMech, setRetired } = useMechs();
  const [editing, setEditing] = useState<Mech | null>(null);
  const [creating, setCreating] = useState(false);
  const [retiredOpen, setRetiredOpen] = useState(false);

  if (creating || editing) {
    return (
      <MechWizard
        initial={editing ?? undefined}
        onSave={(m) => { upsertMech(m); setCreating(false); setEditing(null); }}
        onCancel={() => { setCreating(false); setEditing(null); }}
      />
    );
  }

  const active = mechs.filter(m => !m.retired);
  const retired = mechs.filter(m => m.retired);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-300">Mechs</h2>
          <p className="text-xs text-gray-500">Build and save mechs — <em>SWN Revised</em> pp.308–313.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors"
        >
          <Plus size={14} /> New Mech
        </button>
      </div>

      {active.length === 0 && retired.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-800 rounded-xl">
          <Bot size={28} className="text-gray-700 mb-2" />
          <p className="text-sm text-gray-600 mb-3">No mechs built yet.</p>
          <button onClick={() => setCreating(true)} className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors flex items-center gap-2">
            <Plus size={14} /> Build a Mech
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map(m => (
              <MechCard key={m.id} mech={m}
                onOpen={() => setEditing(m)}
                onDelete={() => removeMech(m.id)}
                onRetire={() => setRetired(m.id, true)}
                onUnretire={() => setRetired(m.id, false)}
                onCopy={() => copyMech(m.id)} />
            ))}
          </div>

          {retired.length > 0 && (
            <div className="mt-2">
              <button onClick={() => setRetiredOpen(v => !v)} className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors mb-3">
                {retiredOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Ghost size={14} /> <span className="text-sm font-medium">Retired</span>
                <span className="text-xs text-gray-700 bg-gray-800 px-1.5 py-0.5 rounded-full">{retired.length}</span>
              </button>
              {retiredOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {retired.map(m => (
                    <MechCard key={m.id} mech={m}
                      onOpen={() => setEditing(m)}
                      onDelete={() => removeMech(m.id)}
                      onRetire={() => setRetired(m.id, true)}
                      onUnretire={() => setRetired(m.id, false)}
                      onCopy={() => copyMech(m.id)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
