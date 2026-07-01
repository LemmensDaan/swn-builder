/**
 * MechBuilder — interactive mech construction tool
 * Stars Without Number Revised pp. 308–313
 *
 * Pick a hull → add Fittings / Defenses / Weapons.
 * Tracks Power, Mass, Hardpoints, and total cost live.
 * No required props; all state is local.
 */

import { useState, useMemo } from 'react';
import {
  MECH_HULLS,
  MECH_FITTINGS,
  MECH_DEFENSES,
  MECH_WEAPONS,
  type MechHullDef,
  type MechFittingDef,
  type MechDefenseDef,
  type MechWeaponDef,
  type MechClass,
  scaleMechCost,
  scaleMechPowerMass,
} from '../../data/vehicles';

// ---------------------------------------------------------------------------
// Shared UI helpers (mirror VehicleReference conventions)
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">{title}</h2>
      {children}
    </div>
  );
}

function StatPill({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded px-2 py-1 min-w-[44px] ${
        highlight ? 'bg-amber-900/50' : 'bg-gray-800'
      }`}
    >
      <span className="text-[10px] text-gray-500 uppercase tracking-wide leading-tight">{label}</span>
      <span className={`text-xs font-bold ${highlight ? 'text-amber-300' : 'text-gray-200'}`}>
        {value}
      </span>
    </div>
  );
}

function Badge({
  children,
  color = 'gray',
}: {
  children: React.ReactNode;
  color?: 'gray' | 'amber' | 'violet' | 'sky' | 'green' | 'red';
}) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-800 text-gray-400',
    amber: 'bg-amber-900/50 text-amber-300',
    violet: 'bg-violet-900/40 text-violet-300',
    sky: 'bg-sky-900/40 text-sky-300',
    green: 'bg-green-900/30 text-green-300',
    red: 'bg-red-900/40 text-red-300',
  };
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${colors[color]}`}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Budget bar — visual progress for Power / Mass / Hardpoints
// ---------------------------------------------------------------------------

function BudgetBar({
  label,
  used,
  max,
}: {
  label: string;
  used: number;
  max: number;
}) {
  const over = used > max;
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400 font-medium">{label}</span>
        <span className={over ? 'text-red-400 font-bold' : 'text-gray-300'}>
          {used} / {max}
          {over && ' ⚠'}
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-200 ${
            over ? 'bg-red-500' : used / max > 0.85 ? 'bg-amber-500' : 'bg-green-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Class ordering helper (for minClass comparisons)
// ---------------------------------------------------------------------------

const CLASS_ORDER: Record<MechClass, number> = { Suit: 0, Light: 1, Heavy: 2 };

export function classAllowed(minClass: MechClass, hullClass: MechClass): boolean {
  return CLASS_ORDER[hullClass] >= CLASS_ORDER[minClass];
}

const CLASS_COLOR: Record<MechClass, 'green' | 'sky' | 'red'> = {
  Suit: 'green',
  Light: 'sky',
  Heavy: 'red',
};

// ---------------------------------------------------------------------------
// Slot types — each added component is one "slot"
// ---------------------------------------------------------------------------

type FittingSlot = { kind: 'fitting'; id: string; def: MechFittingDef };
type DefenseSlot = { kind: 'defense'; id: string; def: MechDefenseDef };
type WeaponSlot  = { kind: 'weapon';  id: string; def: MechWeaponDef  };
export type Slot = FittingSlot | DefenseSlot | WeaponSlot;

export function makeId(): string {
  return Math.random().toString(36).slice(2, 9);
}

// ---------------------------------------------------------------------------
// Hull selector
// ---------------------------------------------------------------------------

export function HullSelector({
  selected,
  onChange,
}: {
  selected: MechHullDef | null;
  onChange: (hull: MechHullDef) => void;
}) {
  const [filter, setFilter] = useState<MechClass | 'All'>('All');

  const filtered = MECH_HULLS.filter(
    h => filter === 'All' || h.class === filter
  );

  return (
    <Section title="1 — Choose Hull">
      <div className="flex gap-1 mb-3">
        {(['All', 'Suit', 'Light', 'Heavy'] as const).map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              filter === c
                ? 'bg-gray-600 text-gray-100'
                : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(h => {
          const isSelected = selected?.id === h.id;
          return (
            <button
              key={h.id}
              onClick={() => onChange(h)}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${
                isSelected
                  ? 'border-amber-500 bg-amber-900/20'
                  : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-semibold text-sm text-gray-200">{h.name}</span>
                <span className="text-xs text-gray-500">{h.cost.toLocaleString()} cr</span>
                <Badge color={CLASS_COLOR[h.class]}>{h.class}</Badge>
              </div>
              <div className="flex flex-wrap gap-1 mb-1">
                <StatPill label="Power" value={h.power} />
                <StatPill label="Mass" value={h.mass} />
                <StatPill label="Hard." value={h.hardpoints} />
                <StatPill label="Speed" value={h.speed} />
                <StatPill label="Armor" value={h.armor} />
                <StatPill label="HP" value={h.hp} />
                <StatPill label="AC" value={h.ac} />
              </div>
              <p className="text-xs text-gray-500">{h.description}</p>
              {h.armorNote && <p className="text-xs text-amber-400 mt-1">{h.armorNote}</p>}
            </button>
          );
        })}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Component picker panel (Fittings / Defenses / Weapons)
// ---------------------------------------------------------------------------

type ComponentTab = 'fittings' | 'defenses' | 'weapons';

export function ComponentPicker({
  hull,
  onAddFitting,
  onAddDefense,
  onAddWeapon,
}: {
  hull: MechHullDef;
  onAddFitting: (def: MechFittingDef) => void;
  onAddDefense: (def: MechDefenseDef) => void;
  onAddWeapon:  (def: MechWeaponDef)  => void;
}) {
  const [tab, setTab] = useState<ComponentTab>('fittings');
  const [search, setSearch] = useState('');
  const [psiOnly, setPsiOnly] = useState(false);

  const q = search.trim().toLowerCase();

  const fittings = MECH_FITTINGS.filter(
    f =>
      classAllowed(f.minClass, hull.class) &&
      (!psiOnly || f.psi) &&
      (!q || f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q))
  );

  const defenses = MECH_DEFENSES.filter(
    d =>
      classAllowed(d.minClass, hull.class) &&
      (!q || d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q))
  );

  const weapons = MECH_WEAPONS.filter(
    w =>
      classAllowed(w.minClass, hull.class) &&
      (!q || w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q))
  );

  const tabs: ComponentTab[] = ['fittings', 'defenses', 'weapons'];
  const counts: Record<ComponentTab, number> = {
    fittings: fittings.length,
    defenses: defenses.length,
    weapons:  weapons.length,
  };

  return (
    <Section title="2 — Add Components">
      {/* Tab row */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wide transition-colors ${
              tab === t
                ? 'bg-amber-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {t} ({counts[t]})
          </button>
        ))}
      </div>

      {/* Search + psi filter */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-600"
        />
        {tab === 'fittings' && (
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={psiOnly}
              onChange={e => setPsiOnly(e.target.checked)}
              className="accent-violet-400"
            />
            <span className="text-xs text-gray-400">Psi</span>
          </label>
        )}
      </div>

      {/* Fitting list */}
      {tab === 'fittings' && (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {fittings.length === 0 && (
            <p className="text-xs text-gray-600">No fittings match.</p>
          )}
          {fittings.map(f => (
            <div
              key={f.id}
              className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 flex flex-col gap-1"
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-xs text-gray-200">{f.name}</span>
                <span className="text-[10px] text-gray-500">
                  {scaleMechCost(f.baseCost, hull.class).toLocaleString()} cr
                </span>
                <Badge color={CLASS_COLOR[f.minClass]}>Min: {f.minClass}</Badge>
                {f.psi && <Badge color="violet">Psi</Badge>}
              </div>
              <div className="flex gap-1 flex-wrap items-center">
                <StatPill
                  label="Power"
                  value={`${scaleMechPowerMass(f.basePower, f.powerScaled, hull.class)}${f.powerScaled ? '#' : ''}`}
                />
                <StatPill
                  label="Mass"
                  value={`${scaleMechPowerMass(f.baseMass, f.massScaled, hull.class)}${f.massScaled ? '#' : ''}`}
                />
                <button
                  onClick={() => onAddFitting(f)}
                  className="ml-auto text-xs px-2 py-1 rounded bg-amber-700 hover:bg-amber-600 text-white font-semibold transition-colors"
                >
                  + Add
                </button>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Defense list */}
      {tab === 'defenses' && (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {defenses.length === 0 && (
            <p className="text-xs text-gray-600">No defenses match.</p>
          )}
          {defenses.map(d => (
            <div
              key={d.id}
              className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 flex flex-col gap-1"
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-xs text-gray-200">{d.name}</span>
                <span className="text-[10px] text-gray-500">
                  {scaleMechCost(d.baseCost, hull.class).toLocaleString()} cr
                </span>
                <Badge color={CLASS_COLOR[d.minClass]}>Min: {d.minClass}</Badge>
              </div>
              <div className="flex gap-1 flex-wrap items-center">
                <StatPill
                  label="Power"
                  value={`${scaleMechPowerMass(d.basePower, d.powerScaled, hull.class)}${d.powerScaled ? '#' : ''}`}
                />
                <StatPill
                  label="Mass"
                  value={`${scaleMechPowerMass(d.baseMass, d.massScaled, hull.class)}${d.massScaled ? '#' : ''}`}
                />
                <button
                  onClick={() => onAddDefense(d)}
                  className="ml-auto text-xs px-2 py-1 rounded bg-amber-700 hover:bg-amber-600 text-white font-semibold transition-colors"
                >
                  + Add
                </button>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">{d.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Weapon list */}
      {tab === 'weapons' && (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {weapons.length === 0 && (
            <p className="text-xs text-gray-600">No weapons match.</p>
          )}
          {weapons.map(w => (
            <div
              key={w.id}
              className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 flex flex-col gap-1"
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-xs text-gray-200">{w.name}</span>
                {w.cost > 0 && (
                  <span className="text-[10px] text-gray-500">
                    {w.cost.toLocaleString()} cr
                  </span>
                )}
                <Badge color={CLASS_COLOR[w.minClass]}>Min: {w.minClass}</Badge>
                {w.qualities.map(q => (
                  <Badge
                    key={q}
                    color={
                      q.startsWith('Psi')
                        ? 'violet'
                        : q.startsWith('AP')
                        ? 'red'
                        : q === 'Ammo'
                        ? 'amber'
                        : 'gray'
                    }
                  >
                    {q}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-1 flex-wrap items-center">
                <StatPill label="Dmg" value={w.damage} />
                <StatPill label="Power" value={scaleMechPowerMass(w.power, w.powerScaled ?? false, hull.class)} />
                <StatPill label="Mass" value={w.mass} />
                <StatPill label="Hard." value={w.hardpoints} />
                <StatPill label="Range" value={w.range} />
                <button
                  onClick={() => onAddWeapon(w)}
                  className="ml-auto text-xs px-2 py-1 rounded bg-amber-700 hover:bg-amber-600 text-white font-semibold transition-colors"
                >
                  + Add
                </button>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">{w.description}</p>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Build summary (budgets, statblock, slot list)
// ---------------------------------------------------------------------------

export function BuildSummary({
  hull,
  slots,
  onRemove,
}: {
  hull: MechHullDef;
  slots: Slot[];
  onRemove: (slotId: string) => void;
}) {
  // Compute totals
  const totals = useMemo(() => {
    let power = 0;
    let mass = 0;
    let hardpoints = 0;
    let cost = hull.cost;

    for (const s of slots) {
      if (s.kind === 'fitting') {
        power += scaleMechPowerMass(s.def.basePower, s.def.powerScaled, hull.class);
        mass   += scaleMechPowerMass(s.def.baseMass,  s.def.massScaled,  hull.class);
        cost   += scaleMechCost(s.def.baseCost, hull.class);
      } else if (s.kind === 'defense') {
        power += scaleMechPowerMass(s.def.basePower, s.def.powerScaled, hull.class);
        mass   += scaleMechPowerMass(s.def.baseMass,  s.def.massScaled,  hull.class);
        cost   += scaleMechCost(s.def.baseCost, hull.class);
      } else {
        // weapon — power scaled via powerScaled flag; mass is not scaled for weapons
        power      += scaleMechPowerMass(s.def.power, s.def.powerScaled ?? false, hull.class);
        mass       += s.def.mass;
        hardpoints += s.def.hardpoints;
        cost       += s.def.cost; // weapons use a flat cost (no class multiplier in rulebook)
      }
    }

    return { power, mass, hardpoints, cost };
  }, [hull, slots]);

  const overPower      = totals.power      > hull.power;
  const overMass       = totals.mass       > hull.mass;
  const overHardpoints = totals.hardpoints > hull.hardpoints;
  const anyOver = overPower || overMass || overHardpoints;

  return (
    <div className="space-y-4">
      {/* Budget gauges */}
      <Section title="Budgets">
        <div className="space-y-3">
          <BudgetBar label="Power" used={totals.power}      max={hull.power}      />
          <BudgetBar label="Mass"  used={totals.mass}       max={hull.mass}       />
          <BudgetBar label="Hardpoints (weapons)" used={totals.hardpoints} max={hull.hardpoints} />
        </div>
        {anyOver && (
          <p className="mt-3 text-xs text-red-400 font-semibold">
            ⚠ Build exceeds one or more budgets — reduce components before fielding.
          </p>
        )}
      </Section>

      {/* Total cost + statblock */}
      <Section title="Statblock &amp; Cost">
        <div className="flex flex-wrap gap-1 mb-3">
          <StatPill label="Total Cost" value={`${totals.cost.toLocaleString()} cr`} highlight />
          <StatPill label="Maint." value={`${hull.maintenanceCost.toLocaleString()} cr`} />
          <StatPill label="Speed" value={hull.speed} />
          <StatPill label="Armor" value={hull.armor} />
          <StatPill label="HP" value={hull.hp} />
          <StatPill label="AC" value={hull.ac} />
        </div>
        <div className="text-xs text-gray-500 space-y-0.5">
          <p>
            <span className="text-gray-300">Hull:</span> {hull.name} ({hull.class})
          </p>
          {hull.armorNote && (
            <p className="text-amber-400">{hull.armorNote}</p>
          )}
          <p>
            <span className="text-gray-300">Repair:</span>{' '}
            {hull.class === 'Suit' ? '500 cr/HP' : '1,000 cr/HP'}
          </p>
        </div>
      </Section>

      {/* Slot list */}
      <Section title="Installed Components">
        {slots.length === 0 && (
          <p className="text-xs text-gray-600">No components installed yet.</p>
        )}
        <div className="space-y-2">
          {slots.map(s => {
            let name: string;
            let powerVal: number;
            let massVal: number;
            let hpVal: number | null = null;
            let costVal: number;
            let badgeColor: 'amber' | 'sky' | 'violet' = 'amber';
            let badgeLabel: string;

            if (s.kind === 'fitting') {
              name      = s.def.name;
              powerVal  = scaleMechPowerMass(s.def.basePower, s.def.powerScaled, hull.class);
              massVal   = scaleMechPowerMass(s.def.baseMass,  s.def.massScaled,  hull.class);
              costVal   = scaleMechCost(s.def.baseCost, hull.class);
              badgeLabel = 'Fitting';
              badgeColor = 'amber';
            } else if (s.kind === 'defense') {
              name      = s.def.name;
              powerVal  = scaleMechPowerMass(s.def.basePower, s.def.powerScaled, hull.class);
              massVal   = scaleMechPowerMass(s.def.baseMass,  s.def.massScaled,  hull.class);
              costVal   = scaleMechCost(s.def.baseCost, hull.class);
              badgeLabel = 'Defense';
              badgeColor = 'sky';
            } else {
              name      = s.def.name;
              powerVal  = scaleMechPowerMass(s.def.power, s.def.powerScaled ?? false, hull.class);
              massVal   = s.def.mass;
              costVal   = s.def.cost;
              hpVal     = s.def.hardpoints;
              badgeLabel = 'Weapon';
              badgeColor = 'violet';
            }

            return (
              <div
                key={s.id}
                className="flex items-center gap-2 bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-gray-200">{name}</span>
                    <Badge color={badgeColor}>{badgeLabel}</Badge>
                  </div>
                  <div className="flex gap-2 mt-0.5 text-[10px] text-gray-500">
                    <span>Pwr {powerVal}</span>
                    <span>Mass {massVal}</span>
                    {hpVal !== null && <span>Hard {hpVal}</span>}
                    <span>{costVal.toLocaleString()} cr</span>
                  </div>
                </div>
                <button
                  onClick={() => onRemove(s.id)}
                  className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-gray-800 hover:bg-red-900/60 text-gray-500 hover:text-red-300 transition-colors"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export default function MechBuilder() {
  const [hull, setHull] = useState<MechHullDef | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);

  function handleHullChange(next: MechHullDef) {
    // Changing hull clears any components that no longer qualify
    if (hull && next.id !== hull.id) {
      setSlots(prev =>
        prev.filter(s => {
          const minClass =
            s.kind === 'fitting'
              ? s.def.minClass
              : s.kind === 'defense'
              ? s.def.minClass
              : s.def.minClass;
          return classAllowed(minClass, next.class);
        })
      );
    }
    setHull(next);
  }

  function addFitting(def: MechFittingDef) {
    setSlots(prev => [...prev, { kind: 'fitting', id: makeId(), def }]);
  }
  function addDefense(def: MechDefenseDef) {
    setSlots(prev => [...prev, { kind: 'defense', id: makeId(), def }]);
  }
  function addWeapon(def: MechWeaponDef) {
    setSlots(prev => [...prev, { kind: 'weapon', id: makeId(), def }]);
  }
  function removeSlot(slotId: string) {
    setSlots(prev => prev.filter(s => s.id !== slotId));
  }

  return (
    <div className="min-h-screen bg-gray-950/50 text-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-amber-400">Mech Builder</h1>
          <p className="text-sm text-gray-500 mt-1">
            <em>Stars Without Number Revised</em> — Designing Mechs, pp. 308–313
          </p>
        </div>

        {/* Scaling reference banner */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-0.5">
          <span><span className="text-gray-300">Fitting/defense cost:</span> Suit ×1 · Light ×3 · Heavy ×6</span>
          <span><span className="text-gray-300">Power/mass marked #:</span> Suit ×1 · Light ×2 · Heavy ×4</span>
          <span><span className="text-gray-300">Weapon cost:</span> flat (no class multiplier)</span>
        </div>

        {hull ? (
          /* Two-column layout once a hull is chosen */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: hull re-selector + component picker */}
            <div className="space-y-4">
              <HullSelector selected={hull} onChange={handleHullChange} />
              <ComponentPicker
                hull={hull}
                onAddFitting={addFitting}
                onAddDefense={addDefense}
                onAddWeapon={addWeapon}
              />
            </div>
            {/* Right: live summary */}
            <div className="space-y-4">
              <BuildSummary hull={hull} slots={slots} onRemove={removeSlot} />
            </div>
          </div>
        ) : (
          /* No hull yet — full-width selector */
          <HullSelector selected={null} onChange={handleHullChange} />
        )}

        {!hull && (
          <p className="text-xs text-gray-600 text-center">
            Select a hull above to begin building your mech.
          </p>
        )}
      </div>
    </div>
  );
}
