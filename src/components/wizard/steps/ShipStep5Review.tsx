import type { Ship } from '../../../types/ship';
import type { DerivedShip } from '../../../data/ships';
import { WEAPONS, DEFENSES, FITTINGS } from '../../../data/ships';

interface Props {
  ship: Ship;
  derived: DerivedShip;
  onGoToStep: (s: number) => void;
}

function cr(n: number): string {
  return n.toLocaleString() + ' cr';
}

export default function ShipStep5Review({ ship, derived, onGoToStep }: Props) {
  const { hull } = derived;
  const dailyCost = hull.crewMin * 120;

  // Lookup installed items
  const installedWeapons = ship.weapons.flatMap((iw) => {
    const def = WEAPONS.find((w) => w.id === iw.id);
    if (!def) return [];
    return [{ def, qty: iw.qty }];
  });

  const installedDefenses = ship.defenses.flatMap((id) => {
    const def = DEFENSES.find((d) => d.id === id.id);
    if (!def) return [];
    return [{ def, qty: id.qty }];
  });

  const installedFittings = ship.fittings.flatMap((ift) => {
    const def = FITTINGS.find((f) => f.id === ift.id);
    if (!def) return [];
    return [{ def, qty: ift.qty }];
  });

  const warnings: { label: string; overBy: number; step: number }[] = [];
  if (derived.overPower) {
    warnings.push({ label: 'Power', overBy: -derived.powerFree, step: 3 });
  }
  if (derived.overMass) {
    warnings.push({ label: 'Mass', overBy: -derived.massFree, step: 3 });
  }
  if (derived.overHardpoints) {
    warnings.push({ label: 'Hardpoints', overBy: -derived.hardpointsFree, step: 2 });
  }

  const statCells = [
    { label: 'Speed', value: derived.speed === null ? 'Station' : derived.speed },
    { label: 'AC', value: derived.ac },
    { label: 'Armor', value: hull.armor },
    { label: 'HP', value: derived.hpMax },
    { label: 'Drive', value: `Spike-${ship.driveRating}` },
  ];

  return (
    <div className="space-y-6">

      {/* ── Ship Header ─────────────────────────────────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h2 className="text-3xl font-bold text-amber-400 truncate">
          {ship.name || 'Unnamed Ship'}
        </h2>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-gray-300 text-lg">{hull.name}</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {hull.class}
          </span>
          {hull.isStation && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Station
            </span>
          )}
        </div>
      </div>

      {/* ── Budget Warnings ─────────────────────────────────────────────── */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w) => (
            <div
              key={w.label}
              className="bg-red-900/25 border border-red-600/60 rounded-lg px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-red-400 font-bold text-lg">!</span>
                <span className="text-red-300 font-semibold">
                  {w.label} over by {w.overBy}
                </span>
              </div>
              <button
                onClick={() => onGoToStep(w.step)}
                className="text-amber-400 hover:text-amber-300 text-sm underline underline-offset-2 transition-colors"
              >
                Go to Step {w.step}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Build-Constraint Errors ─────────────────────────────────────── */}
      {derived.buildErrors.length > 0 && (
        <div className="space-y-2">
          {derived.buildErrors.map((err, i) => (
            <div
              key={i}
              className="bg-red-900/25 border border-red-600/60 rounded-lg px-4 py-3 flex items-center gap-2"
            >
              <span className="text-red-400 font-bold text-lg">!</span>
              <span className="text-red-300 text-sm">{err}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Stats Grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {statCells.map((cell) => (
          <div
            key={cell.label}
            className="bg-white/5 border border-white/10 rounded-lg p-3 text-center"
          >
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{cell.label}</div>
            <div className="text-xl font-bold text-amber-300">{cell.value}</div>
          </div>
        ))}
      </div>

      {/* ── Resources Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Power',
            used: derived.powerUsed,
            total: hull.powerFree,
            over: derived.overPower,
          },
          {
            label: 'Mass',
            used: derived.massUsed,
            total: hull.massFree,
            over: derived.overMass,
          },
          {
            label: 'Hardpoints',
            used: derived.hardpointsUsed,
            total: hull.hardpoints,
            over: derived.overHardpoints,
          },
        ].map((r) => (
          <div
            key={r.label}
            className={`bg-white/5 border rounded-lg p-4 text-center ${
              r.over ? 'border-red-600/60' : 'border-white/10'
            }`}
          >
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{r.label}</div>
            <div className={`text-2xl font-bold ${r.over ? 'text-red-400' : 'text-white'}`}>
              {r.used}
              <span className="text-base font-normal text-gray-500"> / {r.total}</span>
            </div>
            {r.over && (
              <div className="text-xs text-red-400 mt-1">Over by {r.used - r.total}</div>
            )}
          </div>
        ))}
      </div>

      {/* ── Crew ────────────────────────────────────────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Crew</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Minimum</span>
            <div className="text-white font-semibold text-lg">{hull.crewMin}</div>
          </div>
          <div>
            <span className="text-gray-400">Maximum</span>
            <div className="text-white font-semibold text-lg">{hull.crewMax}</div>
          </div>
          <div>
            <span className="text-gray-400">Daily Cost (min crew)</span>
            <div className="text-amber-300 font-semibold text-lg">{cr(dailyCost)}</div>
          </div>
        </div>
      </div>

      {/* ── Cost Breakdown ──────────────────────────────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Cost Breakdown</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-300">Hull ({hull.name})</span>
            <span className="text-white">{cr(derived.hullCost)}</span>
          </div>
          {derived.driveCost > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-300">Drive Upgrade (Spike-{ship.driveRating})</span>
              <span className="text-white">{cr(derived.driveCost)}</span>
            </div>
          )}
          {derived.weaponsCost > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-300">Weapons</span>
              <span className="text-white">{cr(derived.weaponsCost)}</span>
            </div>
          )}
          {derived.defensesCost > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-300">Defenses</span>
              <span className="text-white">{cr(derived.defensesCost)}</span>
            </div>
          )}
          {derived.fittingsCost > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-300">Fittings</span>
              <span className="text-white">{cr(derived.fittingsCost)}</span>
            </div>
          )}
          <div className="border-t border-white/10 pt-2 mt-2 flex justify-between font-bold">
            <span className="text-amber-400">Total</span>
            <span className="text-amber-400 text-base">{cr(derived.totalCost)}</span>
          </div>
          <div className="flex justify-between text-gray-500 text-xs pt-1">
            <span>6-month maintenance (5%)</span>
            <span>{cr(Math.round(derived.maintenanceCost / 2))}</span>
          </div>
        </div>
      </div>

      {/* ── Weapons ─────────────────────────────────────────────────────── */}
      {installedWeapons.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Weapons ({installedWeapons.length})
          </h3>
          <div className="space-y-2">
            {installedWeapons.map(({ def, qty }) => (
              <div
                key={def.id}
                className="flex items-start justify-between bg-white/5 rounded-lg px-3 py-2"
              >
                <div>
                  <span className="text-white font-medium">
                    {qty > 1 && <span className="text-amber-400 mr-1">{qty}×</span>}
                    {def.name}
                  </span>
                  {def.qualities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {def.qualities.map((q) => (
                        <span
                          key={q}
                          className="px-1.5 py-0.5 rounded text-xs bg-gray-700/60 text-gray-300"
                        >
                          {q}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right text-sm ml-4 flex-shrink-0">
                  <div className="text-amber-300 font-semibold">{def.damage}</div>
                  <div className="text-gray-400 text-xs">AP {def.ap}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Defenses ────────────────────────────────────────────────────── */}
      {installedDefenses.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Defenses ({installedDefenses.length})
          </h3>
          <div className="space-y-2">
            {installedDefenses.map(({ def, qty }) => (
              <div
                key={def.id}
                className="flex items-start justify-between bg-white/5 rounded-lg px-3 py-2"
              >
                <div>
                  <span className="text-white font-medium">
                    {qty > 1 && <span className="text-amber-400 mr-1">{qty}×</span>}
                    {def.name}
                  </span>
                  <p className="text-xs text-gray-400 mt-0.5">{def.description}</p>
                </div>
                {(def.acBonus !== 0 || def.hpBonus !== 0) && (
                  <div className="text-right text-sm ml-4 flex-shrink-0 space-y-0.5">
                    {def.acBonus !== 0 && (
                      <div className="text-blue-300 text-xs font-semibold">
                        {def.acBonus > 0 ? '+' : ''}{def.acBonus} AC
                      </div>
                    )}
                    {def.hpBonus !== 0 && (
                      <div className="text-green-300 text-xs font-semibold">
                        {def.hpBonus > 0 ? '+' : ''}{def.hpBonus} HP
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Fittings ────────────────────────────────────────────────────── */}
      {installedFittings.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Fittings ({installedFittings.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {installedFittings.map(({ def, qty }) => (
              <span
                key={def.id}
                className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200"
              >
                {qty > 1 && (
                  <span className="text-amber-400 font-semibold">{qty}×</span>
                )}
                {def.name}
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
