import type { Ship } from '../../../types/ship';
import type { DerivedShip } from '../../../data/ships';
import {
  DEFENSES,
  FITTINGS,
  HULL_CLASS_ORDER,
  scaleCost,
  scalePowerMass,
} from '../../../data/ships';
import type { InstalledItem } from '../../../types/ship';

interface Props {
  ship: Ship;
  derived: DerivedShip;
  onChange: (patch: Partial<Ship>) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function classIndex(c: string): number {
  return HULL_CLASS_ORDER.indexOf(c as never);
}

function setQty(list: InstalledItem[], id: string, delta: number): InstalledItem[] {
  const existing = list.find((x) => x.id === id);
  const current = existing?.qty ?? 0;
  const next = Math.max(0, current + delta);
  if (next === 0) return list.filter((x) => x.id !== id);
  if (existing) return list.map((x) => (x.id === id ? { ...x, qty: next } : x));
  return [...list, { id, qty: next }];
}

function installedQty(list: InstalledItem[], id: string): number {
  return list.find((x) => x.id === id)?.qty ?? 0;
}

// ── Budget bar ────────────────────────────────────────────────────────────────

function BudgetBar({ derived }: { derived: DerivedShip }) {
  const { powerUsed, massUsed, powerTotal, massTotal } = derived;
  const overPower = powerUsed > powerTotal;
  const overMass = massUsed > massTotal;

  const powerPct = powerTotal > 0 ? Math.min(100, (powerUsed / powerTotal) * 100) : 0;
  const massPct = massTotal > 0 ? Math.min(100, (massUsed / massTotal) * 100) : 0;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap gap-6">

        {/* Power */}
        <div className="flex-1 min-w-40 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 uppercase tracking-wide">Power</span>
            <span className={`font-mono font-semibold ${overPower ? 'text-red-400' : 'text-gray-200'}`}>
              {powerUsed} / {powerTotal}
              {overPower && <span className="ml-1.5 text-xs text-red-500">over budget!</span>}
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${overPower ? 'bg-red-500' : 'bg-sky-500'}`}
              style={{ width: `${Math.min(powerPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Mass */}
        <div className="flex-1 min-w-40 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 uppercase tracking-wide">Mass</span>
            <span className={`font-mono font-semibold ${overMass ? 'text-red-400' : 'text-gray-200'}`}>
              {massUsed} / {massTotal}
              {overMass && <span className="ml-1.5 text-xs text-red-500">over budget!</span>}
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${overMass ? 'bg-red-500' : 'bg-lime-500'}`}
              style={{ width: `${Math.min(massPct, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ShipStep4Fittings({ ship, derived, onChange }: Props) {
  const hullClass = derived.hull.class;
  const hullIdx = classIndex(hullClass);

  // ── Defenses ───────────────────────────────────────────────────────────────

  const eligibleDefenses = DEFENSES.filter(
    (d) => classIndex(d.minClass) <= hullIdx,
  );

  function changeDefenseQty(id: string, delta: number) {
    onChange({ defenses: setQty(ship.defenses, id, delta) });
  }

  // ── Fittings ───────────────────────────────────────────────────────────────

  const eligibleFittings = FITTINGS.filter((f) => {
    if (classIndex(f.minClass) > hullIdx) return false;
    if (f.maxClass !== undefined && classIndex(f.maxClass) < hullIdx) return false;
    return true;
  });

  function changeFittingQty(id: string, delta: number) {
    onChange({ fittings: setQty(ship.fittings, id, delta) });
  }

  // ── Shared qty controls ────────────────────────────────────────────────────

  function QtyControls({
    id,
    qty,
    repeatable,
    onDecrement,
    onIncrement,
  }: {
    id: string;
    qty: number;
    repeatable: boolean;
    onDecrement: () => void;
    onIncrement: () => void;
  }) {
    const plusDisabled = !repeatable && qty >= 1;
    return (
      <div className="flex items-center gap-1" key={id}>
        <button
          disabled={qty === 0}
          onClick={onDecrement}
          className="w-7 h-7 rounded bg-gray-700 hover:bg-red-900/40 disabled:opacity-20 text-gray-300 text-sm flex items-center justify-center"
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className="w-5 text-center text-xs text-gray-400 font-mono">{qty}</span>
        <button
          disabled={plusDisabled}
          onClick={onIncrement}
          title={plusDisabled ? 'Can only install once' : undefined}
          className={`w-7 h-7 rounded text-sm flex items-center justify-center ${plusDisabled
              ? 'bg-gray-800 text-gray-600 opacity-30 cursor-not-allowed'
              : 'bg-gray-700 hover:bg-amber-900/40 text-gray-300 hover:text-amber-300'
            }`}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Budget bars */}
      <BudgetBar derived={derived} />

      {/* ── Defenses ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide border-b border-gray-700 pb-1">
          Defenses
        </h3>

        {/* Mobile cards */}
        <div className="sm:hidden space-y-2">
          {eligibleDefenses.map((def) => {
            const qty = installedQty(ship.defenses, def.id);
            const scaledMass = scalePowerMass(def.mass, def.massScaled, hullClass);
            const scaledCost = scaleCost(def.baseCost, def.costScaled, hullClass);
            const isInstalled = qty > 0;
            return (
              <div key={def.id} className={`rounded-lg border p-3 ${isInstalled ? 'border-sky-700/50 bg-sky-900/10' : 'border-gray-700 bg-gray-800/50'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className={`font-medium text-sm ${isInstalled ? 'text-sky-300' : 'text-gray-200'}`}>
                      {def.name}
                      {isInstalled && qty > 1 && <span className="ml-1 text-xs text-sky-500 font-mono">×{qty}</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{def.minClass}+</div>
                  </div>
                  <QtyControls id={def.id} qty={qty} repeatable={false}
                    onDecrement={() => changeDefenseQty(def.id, -1)}
                    onIncrement={() => changeDefenseQty(def.id, +1)} />
                </div>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{def.description}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {def.acBonus > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-green-900/40 text-green-400 border border-green-800/50 font-mono">+{def.acBonus} AC</span>}
                  {def.hpBonus > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-400 border border-blue-800/50 font-mono">+{def.hpBonus} HP</span>}
                  {def.speedPenalty < 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-900/40 text-orange-400 border border-orange-800/50 font-mono">{def.speedPenalty} spd</span>}
                  <span className="text-xs text-gray-500 ml-auto">
                    Pwr {def.power > 0 ? def.power : '—'} · Mass {scaledMass > 0 ? scaledMass : '—'} · {scaledCost > 0 ? scaledCost.toLocaleString() + ' cr' : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left py-2 pr-3 min-w-[10rem]">Defense</th>
                <th className="text-left py-2 pr-3 min-w-[12rem]">Description</th>
                <th className="text-right py-2 pr-3">Bonuses</th>
                <th className="text-right py-2 pr-3">Power</th>
                <th className="text-right py-2 pr-3">Mass</th>
                <th className="text-right py-2 pr-3">Cost</th>
                <th className="py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {eligibleDefenses.map((def) => {
                const qty = installedQty(ship.defenses, def.id);
                const scaledMass = scalePowerMass(def.mass, def.massScaled, hullClass);
                const scaledCost = scaleCost(def.baseCost, def.costScaled, hullClass);
                const isInstalled = qty > 0;

                return (
                  <tr
                    key={def.id}
                    className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${isInstalled ? 'bg-sky-900/10' : ''
                      }`}
                  >
                    <td className="py-2 pr-3 align-top">
                      <div className={`font-medium ${isInstalled ? 'text-sky-300' : 'text-gray-200'}`}>
                        {def.name}
                        {isInstalled && qty > 1 && (
                          <span className="ml-1 text-xs text-sky-500 font-mono">×{qty}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">{def.minClass}+</div>
                    </td>
                    <td className="py-2 pr-3 align-top max-w-[14rem]">
                      <span className="text-xs text-gray-400 line-clamp-2" title={def.description}>{def.description}</span>
                    </td>
                    <td className="py-2 pr-3 align-top">
                      <div className="flex flex-col items-end gap-1">
                        {def.acBonus > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-green-900/40 text-green-400 border border-green-800/50 whitespace-nowrap font-mono">+{def.acBonus} AC</span>}
                        {def.hpBonus > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-400 border border-blue-800/50 whitespace-nowrap font-mono">+{def.hpBonus} HP</span>}
                        {def.speedPenalty < 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-900/40 text-orange-400 border border-orange-800/50 whitespace-nowrap font-mono">{def.speedPenalty} spd</span>}
                      </div>
                    </td>
                    <td className="py-2 pr-3 align-top text-right">
                      <span className={`font-mono text-xs ${def.power > 0 ? 'text-sky-400' : 'text-gray-600'}`}>{def.power > 0 ? def.power : '—'}</span>
                    </td>
                    <td className="py-2 pr-3 align-top text-right">
                      <span className={`font-mono text-xs ${scaledMass > 0 ? 'text-amber-400' : 'text-gray-600'}`}>{scaledMass > 0 ? scaledMass : '—'}</span>
                    </td>
                    <td className="py-2 pr-3 align-top text-right">
                      <span className="font-mono text-xs text-gray-400">{scaledCost > 0 ? scaledCost.toLocaleString() + ' cr' : '—'}</span>
                    </td>
                    <td className="py-2 align-top">
                      <QtyControls id={def.id} qty={qty} repeatable={false}
                        onDecrement={() => changeDefenseQty(def.id, -1)}
                        onIncrement={() => changeDefenseQty(def.id, +1)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Fittings ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide border-b border-gray-700 pb-1">
          Fittings
        </h3>

        {/* Mobile cards */}
        <div className="sm:hidden space-y-2">
          {eligibleFittings.map((def) => {
            const qty = installedQty(ship.fittings, def.id);
            const scaledPower = scalePowerMass(def.power, def.powerScaled, hullClass);
            const scaledMass = scalePowerMass(def.mass, def.massScaled, hullClass);
            const scaledCost = scaleCost(def.baseCost, def.costScaled, hullClass);
            const isInstalled = qty > 0;
            const classRange = def.maxClass ? `${def.minClass}–${def.maxClass}` : `${def.minClass}+`;
            return (
              <div key={def.id} className={`rounded-lg border p-3 ${isInstalled ? 'border-amber-700/50 bg-amber-900/10' : 'border-gray-700 bg-gray-800/50'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className={`font-medium text-sm ${isInstalled ? 'text-amber-300' : 'text-gray-200'}`}>
                      {def.name}
                      {isInstalled && qty > 1 && <span className="ml-1 text-xs text-amber-500 font-mono">×{qty}</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{classRange}</div>
                  </div>
                  <QtyControls id={def.id} qty={qty} repeatable={def.repeatable}
                    onDecrement={() => changeFittingQty(def.id, -1)}
                    onIncrement={() => changeFittingQty(def.id, +1)} />
                </div>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{def.description}</p>
                <div className="flex gap-3 mt-2 text-xs text-gray-500">
                  <span>Pwr {scaledPower > 0 ? <span className="text-sky-400 font-mono">{scaledPower}</span> : '—'}</span>
                  <span>Mass {scaledMass > 0 ? <span className="text-amber-400 font-mono">{scaledMass}</span> : '—'}</span>
                  <span className="ml-auto">
                    {def.costSpecial
                      ? <span className="text-violet-400 font-medium" title="Pretech relic — cost is GM-determined; not normally purchasable.">Special</span>
                      : scaledCost > 0 ? scaledCost.toLocaleString() + ' cr' : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left py-2 pr-3 min-w-[10rem]">Fitting</th>
                <th className="text-left py-2 pr-3 min-w-[12rem]">Description</th>
                <th className="text-right py-2 pr-3">Power</th>
                <th className="text-right py-2 pr-3">Mass</th>
                <th className="text-right py-2 pr-3">Cost</th>
                <th className="py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {eligibleFittings.map((def) => {
                const qty = installedQty(ship.fittings, def.id);
                const scaledPower = scalePowerMass(def.power, def.powerScaled, hullClass);
                const scaledMass = scalePowerMass(def.mass, def.massScaled, hullClass);
                const scaledCost = scaleCost(def.baseCost, def.costScaled, hullClass);
                const isInstalled = qty > 0;
                const classRange = def.maxClass ? `${def.minClass}–${def.maxClass}` : `${def.minClass}+`;

                return (
                  <tr
                    key={def.id}
                    className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${isInstalled ? 'bg-amber-900/10' : ''}`}
                  >
                    <td className="py-2 pr-3 align-top">
                      <div className={`font-medium ${isInstalled ? 'text-amber-300' : 'text-gray-200'}`}>
                        {def.name}
                        {isInstalled && qty > 1 && <span className="ml-1 text-xs text-amber-500 font-mono">×{qty}</span>}
                      </div>
                      <div className="text-xs text-gray-600">{classRange}</div>
                    </td>
                    <td className="py-2 pr-3 align-top max-w-[14rem]">
                      <span className="text-xs text-gray-400 line-clamp-2" title={def.description}>{def.description}</span>
                    </td>
                    <td className="py-2 pr-3 align-top text-right">
                      <span className={`font-mono text-xs ${scaledPower > 0 ? 'text-sky-400' : 'text-gray-600'}`}>{scaledPower > 0 ? scaledPower : '—'}</span>
                    </td>
                    <td className="py-2 pr-3 align-top text-right">
                      <span className={`font-mono text-xs ${scaledMass > 0 ? 'text-amber-400' : 'text-gray-600'}`}>{scaledMass > 0 ? scaledMass : '—'}</span>
                    </td>
                    <td className="py-2 pr-3 align-top text-right">
                      {def.costSpecial
                        ? <span className="text-violet-400 text-xs font-medium" title="Pretech relic — cost is GM-determined; not normally purchasable.">Special</span>
                        : <span className="font-mono text-xs text-gray-400">{scaledCost > 0 ? scaledCost.toLocaleString() + ' cr' : '—'}</span>}
                    </td>
                    <td className="py-2 align-top">
                      <QtyControls id={def.id} qty={qty} repeatable={def.repeatable}
                        onDecrement={() => changeFittingQty(def.id, -1)}
                        onIncrement={() => changeFittingQty(def.id, +1)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Installed summary ─────────────────────────────────────────── */}
      {(ship.defenses.length > 0 || ship.fittings.length > 0) && (
        <div className="bg-gray-800/50 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Installed
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            {ship.defenses.map((inst) => {
              const def = DEFENSES.find((d) => d.id === inst.id);
              if (!def) return null;
              return (
                <span
                  key={inst.id}
                  className="px-2 py-1 rounded bg-sky-900/30 text-sky-300 border border-sky-800/50"
                >
                  {def.name}
                  {inst.qty > 1 && <span className="ml-1 font-mono">×{inst.qty}</span>}
                </span>
              );
            })}
            {ship.fittings.map((inst) => {
              const def = FITTINGS.find((f) => f.id === inst.id);
              if (!def) return null;
              return (
                <span
                  key={inst.id}
                  className="px-2 py-1 rounded bg-amber-900/30 text-amber-300 border border-amber-800/50"
                >
                  {def.name}
                  {inst.qty > 1 && <span className="ml-1 font-mono">×{inst.qty}</span>}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
