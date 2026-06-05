import { BookOpen, HelpCircle, Pencil } from 'lucide-react';
import type { Ship } from '../types/ship';
import { WEAPONS, DEFENSES, FITTINGS, deriveShip } from '../data/ships';
import type { DerivedShip } from '../data/ships';

interface Props {
  ship: Ship;
  onEdit: () => void;
  onBack: () => void;
  onUpdate: (ship: Ship) => void;
  onOpenRules: () => void;
  onOpenHelp: () => void;
}

// ── Local helper components ──────────────────────────────────────────────────

function SheetSection({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatCell({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="glass rounded-lg p-2 text-center">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-xl font-bold ${danger ? 'text-red-400' : 'text-gray-100'}`}>{value}</div>
    </div>
  );
}

function ResourceBar({
  label,
  used,
  total,
  danger,
}: {
  label: string;
  used: number;
  total: number;
  danger: boolean;
}) {
  const pct = total > 0 ? Math.min(1, used / total) : 0;
  const barColor = danger ? 'bg-red-500' : 'bg-amber-500';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <span className={`text-xs font-bold tabular-nums ${danger ? 'text-red-400' : 'text-gray-300'}`}>
          {used} / {total}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.round(pct * 100)}%` }}
        />
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ShipSheet({ ship, onEdit, onBack, onUpdate, onOpenRules, onOpenHelp }: Props) {
  const derived: DerivedShip = deriveShip(ship);
  const hull = derived.hull;

  // ── Handlers ──────────────────────────────────────────────────────────────

  function setHP(current: number) {
    onUpdate({
      ...ship,
      hitPoints: { ...ship.hitPoints, current: Math.max(0, Math.min(ship.hitPoints.max, current)) },
    });
  }

  function setCrew(value: number) {
    onUpdate({ ...ship, currentCrew: Math.max(0, value) });
  }

  function setNotes(notes: string) {
    onUpdate({ ...ship, notes });
  }

  // ── Derived display values ─────────────────────────────────────────────────

  const speedDisplay = derived.speed === null ? '—' : String(derived.speed);
  const driveDisplay = `Drive-${ship.driveRating}`;
  const hardpointsDisplay = `${derived.hardpointsUsed}/${hull.hardpoints}`;

  const dailyCost = ship.currentCrew * 120;
  const fuelLoadCost = 500;
  const sixMonthMaint = Math.round(derived.maintenanceCost / 2);

  // Resolve installed weapons
  const installedWeapons = ship.weapons
    .map((installed) => {
      const def = WEAPONS.find((w) => w.id === installed.id);
      return def ? { def, qty: installed.qty } : null;
    })
    .filter(Boolean) as { def: (typeof WEAPONS)[number]; qty: number }[];

  // Resolve installed defenses
  const installedDefenses = ship.defenses
    .map((installed) => {
      const def = DEFENSES.find((d) => d.id === installed.id);
      return def ? { def, qty: installed.qty } : null;
    })
    .filter(Boolean) as { def: (typeof DEFENSES)[number]; qty: number }[];

  // Resolve installed fittings
  const installedFittings = ship.fittings
    .map((installed) => {
      const def = FITTINGS.find((f) => f.id === installed.id);
      return def ? { def, qty: installed.qty } : null;
    })
    .filter(Boolean) as { def: (typeof FITTINGS)[number]; qty: number }[];

  return (
    <div className="min-h-screen text-gray-100 flex justify-center">
      <div className="w-full max-w-6xl flex flex-col min-h-screen bg-gray-950">

        {/* ── Header bar ───────────────────────────────────────────────────── */}
        <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-gray-200 text-sm flex-shrink-0"
            >
              ← Back
            </button>
            <span className="text-gray-700">|</span>
            <span className="text-amber-300 font-bold truncate">{ship.name || 'Unnamed Ship'}</span>
            <span className="text-gray-500 text-sm flex-shrink-0">
              {hull.name}
            </span>
            <span className="text-[10px] uppercase tracking-widest bg-gray-800 text-gray-400 border border-gray-700 rounded px-1.5 py-0.5 flex-shrink-0">
              {hull.class}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenHelp}
              title="Rules reference & FAQ"
              className="w-8 h-8 rounded text-gray-500 hover:text-amber-300 hover:bg-gray-700 transition-colors flex items-center justify-center"
            >
              <HelpCircle size={18} />
            </button>
            <button
              onClick={onOpenRules}
              title="Open SWN Revised Deluxe Edition rulebook"
              className="p-1.5 rounded text-gray-500 hover:text-amber-300 hover:bg-gray-700 transition-colors"
            >
              <BookOpen size={18} />
            </button>
            <button
              onClick={onEdit}
              className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium flex items-center gap-1.5"
            >
              <Pencil size={14} /> Edit
            </button>
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-4 py-6 w-full space-y-6">

          {/* ── Combat Stats ─────────────────────────────────────────────── */}
          <SheetSection title="Combat Stats">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              <StatCell label="Speed" value={speedDisplay} />
              <StatCell label="Armor" value={String(hull.armor)} />
              <StatCell label="AC" value={String(derived.ac)} />

              {/* HP — interactive */}
              <div className="glass rounded-lg p-2 text-center">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">HP</div>
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => setHP(ship.hitPoints.current - 1)}
                    disabled={ship.hitPoints.current <= 0}
                    className="w-5 h-5 rounded bg-gray-700/80 hover:bg-red-900/60 disabled:opacity-20 text-gray-300 text-xs flex items-center justify-center"
                    title="Damage"
                  >
                    −
                  </button>
                  <span
                    className={`font-bold tabular-nums text-sm w-14 text-center ${
                      ship.hitPoints.current === 0 ? 'text-red-400' : 'text-gray-100'
                    }`}
                  >
                    {ship.hitPoints.current}/{ship.hitPoints.max}
                  </span>
                  <button
                    onClick={() => setHP(ship.hitPoints.current + 1)}
                    disabled={ship.hitPoints.current >= ship.hitPoints.max}
                    className="w-5 h-5 rounded bg-gray-700/80 hover:bg-green-900/60 disabled:opacity-20 text-gray-300 text-xs flex items-center justify-center"
                    title="Heal"
                  >
                    +
                  </button>
                </div>
              </div>

              <StatCell label="Drive" value={driveDisplay} />
              <StatCell
                label="Hardpoints"
                value={hardpointsDisplay}
                danger={derived.overHardpoints}
              />
            </div>
          </SheetSection>

          {/* ── Power & Mass ──────────────────────────────────────────────── */}
          <SheetSection title="Power & Mass">
            <div className="space-y-3">
              <ResourceBar
                label="Power"
                used={derived.powerUsed}
                total={hull.powerFree}
                danger={derived.overPower}
              />
              <ResourceBar
                label="Mass"
                used={derived.massUsed}
                total={hull.massFree}
                danger={derived.overMass}
              />
            </div>
          </SheetSection>

          {/* ── Weapons ───────────────────────────────────────────────────── */}
          <SheetSection title="Weapons">
            {installedWeapons.length === 0 ? (
              <p className="text-gray-600 text-sm italic">No weapons installed.</p>
            ) : (
              <div className="space-y-2">
                {installedWeapons.map(({ def, qty }) => (
                  <div
                    key={def.id}
                    className="bg-gray-900/60 rounded px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1"
                  >
                    <span className="font-medium text-sm text-gray-200">
                      {qty > 1 ? `${def.name} ×${qty}` : def.name}
                    </span>
                    <span className="text-red-400 font-mono text-sm">{def.damage}</span>
                    {def.ap > 0 && (
                      <span className="text-xs text-orange-400">AP {def.ap}</span>
                    )}
                    {def.qualities.length > 0 && (
                      <div className="flex flex-wrap gap-1 ml-auto">
                        {def.qualities.map((q) => (
                          <span
                            key={q}
                            className="text-[10px] uppercase tracking-wide bg-gray-700/60 text-gray-400 border border-gray-600 rounded px-1.5 py-0.5"
                          >
                            {q}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SheetSection>

          {/* ── Defenses ──────────────────────────────────────────────────── */}
          <SheetSection title="Defenses">
            {installedDefenses.length === 0 ? (
              <p className="text-gray-600 text-sm italic">No defenses installed.</p>
            ) : (
              <div className="space-y-2">
                {installedDefenses.map(({ def, qty }) => (
                  <div key={def.id} className="bg-gray-900/60 rounded px-3 py-2">
                    <div className="flex items-center gap-3 mb-0.5">
                      <span className="font-medium text-sm text-gray-200">
                        {qty > 1 ? `${def.name} ×${qty}` : def.name}
                      </span>
                      {def.acBonus !== 0 && (
                        <span className="text-xs text-green-400">AC {def.acBonus > 0 ? '+' : ''}{def.acBonus}</span>
                      )}
                      {def.hpBonus !== 0 && (
                        <span className="text-xs text-green-400">HP {def.hpBonus > 0 ? '+' : ''}{def.hpBonus}</span>
                      )}
                      {def.speedPenalty !== 0 && (
                        <span className="text-xs text-red-400">Speed {def.speedPenalty}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 leading-snug">{def.description}</p>
                  </div>
                ))}
              </div>
            )}
          </SheetSection>

          {/* ── Fittings ──────────────────────────────────────────────────── */}
          <SheetSection title="Fittings">
            {installedFittings.length === 0 ? (
              <p className="text-gray-600 text-sm italic">No fittings installed.</p>
            ) : (
              <div className="space-y-2">
                {installedFittings.map(({ def, qty }) => (
                  <div key={def.id} className="bg-gray-900/60 rounded px-3 py-2">
                    <div className="font-medium text-sm text-gray-200 mb-0.5">
                      {qty > 1 ? `${def.name} ×${qty}` : def.name}
                    </div>
                    <p className="text-xs text-gray-400 leading-snug">{def.description}</p>
                  </div>
                ))}
              </div>
            )}
          </SheetSection>

          {/* ── Crew & Cost ───────────────────────────────────────────────── */}
          <SheetSection title="Crew & Cost">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Crew */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Current Crew</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCrew(ship.currentCrew - 1)}
                      disabled={ship.currentCrew <= 0}
                      className="w-6 h-6 rounded bg-gray-700 hover:bg-red-900/50 disabled:opacity-20 text-gray-300 text-sm flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="font-bold tabular-nums text-gray-100 w-8 text-center">
                      {ship.currentCrew}
                    </span>
                    <button
                      onClick={() => setCrew(ship.currentCrew + 1)}
                      className="w-6 h-6 rounded bg-gray-700 hover:bg-green-900/50 text-gray-300 text-sm flex items-center justify-center"
                    >
                      +
                    </button>
                    <span className="text-xs text-gray-500 ml-1">
                      (min {hull.crewMin}, max {hull.crewMax})
                    </span>
                  </div>
                </div>
                <CostRow label="Daily crew cost" value={`${dailyCost.toLocaleString()} cr`} />
              </div>

              {/* Costs */}
              <div className="space-y-2">
                <CostRow label="Total ship cost" value={`${derived.totalCost.toLocaleString()} cr`} prominent />
                <CostRow
                  label="6-month maintenance (5%)"
                  value={`${sixMonthMaint.toLocaleString()} cr`}
                />
                <CostRow label="Fuel load" value={`${fuelLoadCost.toLocaleString()} cr / load`} />
              </div>
            </div>
          </SheetSection>

          {/* ── Notes ─────────────────────────────────────────────────────── */}
          <SheetSection title="Notes">
            <textarea
              defaultValue={ship.notes}
              onBlur={(e) => setNotes(e.target.value)}
              placeholder="Cargo manifest, crew names, mission notes, outstanding debts…"
              className="w-full h-28 bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500 resize-y"
            />
          </SheetSection>

        </div>
      </div>
    </div>
  );
}

function CostRow({
  label,
  value,
  prominent,
}: {
  label: string;
  value: string;
  prominent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`font-bold tabular-nums text-right ${prominent ? 'text-amber-300 text-base' : 'text-gray-200 text-sm'}`}>
        {value}
      </span>
    </div>
  );
}
