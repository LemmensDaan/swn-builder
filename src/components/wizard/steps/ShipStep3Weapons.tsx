import type { Ship } from '../../../types/ship';
import type { DerivedShip, WeaponDef } from '../../../data/ships';
import { WEAPONS, HULL_CLASS_ORDER } from '../../../data/ships';

interface Props {
  ship: Ship;
  derived: DerivedShip;
  onChange: (patch: Partial<Ship>) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function classIndex(c: string): number {
  return HULL_CLASS_ORDER.indexOf(c as typeof HULL_CLASS_ORDER[number]);
}

function getQty(ship: Ship, weaponId: string): number {
  return ship.weapons.find((w) => w.id === weaponId)?.qty ?? 0;
}

function setQty(ship: Ship, weaponId: string, qty: number): Ship['weapons'] {
  if (qty <= 0) {
    return ship.weapons.filter((w) => w.id !== weaponId);
  }
  const existing = ship.weapons.find((w) => w.id === weaponId);
  if (existing) {
    return ship.weapons.map((w) => (w.id === weaponId ? { ...w, qty } : w));
  }
  return [...ship.weapons, { id: weaponId, qty }];
}

// ── Quality chips ─────────────────────────────────────────────────────────────

interface QualityChipProps {
  label: string;
}

function QualityChip({ label }: QualityChipProps) {
  const lower = label.toLowerCase();
  let cls = 'bg-gray-700 text-gray-400 border-gray-600';
  if (lower.startsWith('ap')) cls = 'bg-blue-900/40 text-blue-300 border-blue-700/50';
  else if (lower === 'clumsy') cls = 'bg-orange-900/40 text-orange-300 border-orange-700/50';
  else if (lower === 'flak') cls = 'bg-green-900/40 text-green-300 border-green-700/50';
  else if (lower === 'cloud') cls = 'bg-purple-900/40 text-purple-300 border-purple-700/50';

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs border ${cls}`}>
      {label}
    </span>
  );
}

// ── AP chip (separate, shows "AP 20" style) ───────────────────────────────────

function ApChip({ ap }: { ap: number }) {
  if (ap === 0) return null;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs border bg-blue-900/40 text-blue-300 border-blue-700/50">
      AP {ap}
    </span>
  );
}

// ── Budget bar ────────────────────────────────────────────────────────────────

function BudgetBar({ derived }: { derived: DerivedShip }) {
  const { hardpointsUsed, hardpointsFree, hull, powerUsed, overHardpoints, overPower, overMass, massUsed } = derived;
  const totalHardpoints = hull.hardpoints;
  const totalPower = hull.powerFree;
  const totalMass = hull.massFree;
  const hpPct = totalHardpoints > 0 ? Math.min(100, (hardpointsUsed / totalHardpoints) * 100) : 0;
  const pwrPct = totalPower > 0 ? Math.min(100, (powerUsed / totalPower) * 100) : 0;
  const massPct = totalMass > 0 ? Math.min(100, (massUsed / totalMass) * 100) : 0;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap gap-6">
        {/* Hardpoints */}
        <div className="flex-1 min-w-40 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 uppercase tracking-wide">Hardpoints</span>
            <span className={`font-mono font-semibold ${overHardpoints ? 'text-red-400' : 'text-gray-200'}`}>
              {hardpointsUsed} / {totalHardpoints}
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${overHardpoints ? 'bg-red-500' : 'bg-orange-500'}`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
          {overHardpoints && (
            <p className="text-xs text-red-400">Over hardpoint limit by {-hardpointsFree}</p>
          )}
        </div>
        {/* Power */}
        <div className="flex-1 min-w-40 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 uppercase tracking-wide">Power</span>
            <span className={`font-mono font-semibold ${overPower ? 'text-red-400' : 'text-gray-200'}`}>
              {powerUsed} / {totalPower}
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${overPower ? 'bg-red-500' : 'bg-sky-500'}`}
              style={{ width: `${pwrPct}%` }}
            />
          </div>
          {overPower && (
            <p className="text-xs text-red-400">Over power limit by {-derived.powerFree}</p>
          )}
        </div>
        {/* Mass */}
        <div className="flex-1 min-w-40 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 uppercase tracking-wide">Mass</span>
            <span className={`font-mono font-semibold ${overMass ? 'text-red-400' : 'text-gray-200'}`}>
              {massUsed} / {totalMass}
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${overMass ? 'bg-red-500' : 'bg-lime-500'}`}
              style={{ width: `${massPct}%` }}
            />
          </div>
          {overMass && (
            <p className="text-xs text-red-400">Over mass limit by {-derived.massFree}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Installed weapons summary ─────────────────────────────────────────────────

function InstalledSummary({ ship, derived }: { ship: Ship; derived: DerivedShip }) {
  const installed = ship.weapons
    .map((entry) => {
      const def = WEAPONS.find((w) => w.id === entry.id);
      if (!def) return null;
      return { def, qty: entry.qty };
    })
    .filter(Boolean) as { def: WeaponDef; qty: number }[];

  if (installed.length === 0) return null;

  const totalHp = installed.reduce((s, e) => s + e.def.hardpoints * e.qty, 0);
  const totalPwr = installed.reduce((s, e) => s + e.def.power * e.qty, 0);
  const totalMass = installed.reduce((s, e) => s + e.def.mass * e.qty, 0);

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Installed Weapons</p>
      <div className="space-y-1.5">
        {installed.map(({ def, qty }) => (
          <div key={def.id} className="flex items-center gap-3 text-sm flex-wrap">
            <span className="text-gray-200 font-medium min-w-0 flex-1">{def.name}</span>
            {qty > 1 && (
              <span className="text-amber-400 font-mono text-xs">x{qty}</span>
            )}
            <span className="text-gray-500 text-xs font-mono">
              {def.hardpoints * qty} HP &middot; {def.power * qty} PWR &middot; {def.mass * qty} Mass
            </span>
            <span className="text-amber-400 text-xs font-mono">
              {(def.cost * qty).toLocaleString()} cr
            </span>
          </div>
        ))}
      </div>
      <div className="pt-2 border-t border-gray-700 flex flex-wrap gap-4 text-xs text-gray-400 font-mono">
        <span>Total Hardpoints: <span className={derived.overHardpoints ? 'text-red-400' : 'text-gray-200'}>{totalHp}</span></span>
        <span>Total Power: <span className="text-gray-200">{totalPwr}</span></span>
        <span>Total Mass: <span className="text-gray-200">{totalMass}</span></span>
        <span>Weapons Cost: <span className="text-amber-400">{derived.weaponsCost.toLocaleString()} cr</span></span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ShipStep3Weapons({ ship, derived, onChange }: Props) {
  const hullClassIdx = classIndex(derived.hull.class);

  const availableWeapons = WEAPONS.filter(
    (w) => classIndex(w.minClass) <= hullClassIdx,
  );

  function handleAdd(weaponId: string) {
    const qty = getQty(ship, weaponId);
    onChange({ weapons: setQty(ship, weaponId, qty + 1) });
  }

  function handleRemove(weaponId: string) {
    const qty = getQty(ship, weaponId);
    if (qty <= 0) return;
    onChange({ weapons: setQty(ship, weaponId, qty - 1) });
  }

  return (
    <div className="space-y-5">

      {/* Budget bar */}
      <BudgetBar derived={derived} />

      {/* Section heading */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          Available Weapons
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Showing weapons usable by {derived.hull.class}-class and smaller hulls.
        </p>
      </div>

      {/* Weapon list */}
      <div className="space-y-2">
        {availableWeapons.map((weapon) => {
          const qty = getQty(ship, weapon.id);
          const wouldExceedHardpoints =
            derived.hardpointsFree < weapon.hardpoints && qty === 0;
          const isInstalled = qty > 0;

          return (
            <div
              key={weapon.id}
              className={`rounded-lg border p-3 transition-colors ${
                isInstalled
                  ? 'border-amber-700/60 bg-amber-900/10'
                  : wouldExceedHardpoints
                  ? 'border-red-800/40 bg-gray-800/60'
                  : 'border-gray-700 bg-gray-800/60'
              }`}
            >
              <div className="flex items-start gap-3 flex-wrap">
                {/* Left: name + badges */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium text-sm ${isInstalled ? 'text-amber-300' : 'text-gray-200'}`}>
                      {weapon.name}
                    </span>
                    <ApChip ap={weapon.ap} />
                    {weapon.qualities.map((q) => (
                      <QualityChip key={q} label={q} />
                    ))}
                    {weapon.minTL >= 5 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs border bg-violet-900/40 text-violet-300 border-violet-700/50">
                        TL{weapon.minTL}
                      </span>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 font-mono">
                    <span className="text-red-400">{weapon.damage}</span>
                    <span>{weapon.hardpoints} HP</span>
                    <span>{weapon.power} PWR</span>
                    <span>{weapon.mass} Mass</span>
                    <span className="text-amber-400">{weapon.cost.toLocaleString()} cr</span>
                    {weapon.ammoCost !== undefined && (
                      <span className="text-gray-600">+{weapon.ammoCost.toLocaleString()} cr/reload</span>
                    )}
                  </div>

                  {/* Over-budget warning */}
                  {wouldExceedHardpoints && (
                    <p className="text-xs text-red-400">
                      Adding would exceed hardpoints ({derived.hardpointsUsed}/{derived.hull.hardpoints} used)
                    </p>
                  )}
                </div>

                {/* Right: qty controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={qty === 0}
                    onClick={() => handleRemove(weapon.id)}
                    className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-20 text-gray-300 text-base flex items-center justify-center leading-none"
                    aria-label={`Remove one ${weapon.name}`}
                  >
                    -
                  </button>
                  <span className={`w-6 text-center text-sm font-mono ${isInstalled ? 'text-amber-300' : 'text-gray-500'}`}>
                    {qty}
                  </span>
                  <button
                    onClick={() => handleAdd(weapon.id)}
                    className={`w-7 h-7 rounded text-base flex items-center justify-center leading-none transition-colors ${
                      wouldExceedHardpoints
                        ? 'bg-red-900/40 text-red-400 hover:bg-red-900/70'
                        : 'bg-amber-700 hover:bg-amber-600 text-white'
                    }`}
                    title={wouldExceedHardpoints ? 'Exceeds hardpoints — will be over budget' : undefined}
                    aria-label={`Add one ${weapon.name}`}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Installed summary */}
      <InstalledSummary ship={ship} derived={derived} />
    </div>
  );
}
