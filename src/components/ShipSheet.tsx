import { useState } from 'react';
import { BookOpen, HelpCircle, Pencil, AlertCircle, Swords, Plus, X, Users } from 'lucide-react';
import type { Ship, DepartmentName, ActiveCrisis } from '../types/ship';
import { WEAPONS, DEFENSES, FITTINGS, deriveShip } from '../data/ships';
import type { DerivedShip } from '../data/ships';
import { getModuleConsequence } from '../data/ship-modules';
import type { Character } from '../types/character';

interface Props {
  ship: Ship;
  characters: Character[];
  onEdit: () => void;
  onBack: () => void;
  onUpdate: (ship: Ship) => void;
  onUpdateCharacter: (char: Character) => void;
  onOpenRules: () => void;
  onOpenHelp: () => void;
  onNavigateToChar?: (id: string) => void;
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
  color
}: {
  label: string;
  used: number;
  total: number;
  danger: boolean;
  color: string;
}) {
  const pct = total > 0 ? Math.min(1, used / total) : 0;
  const barColor = danger ? 'bg-red-500' : color;
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

// ── Combat Tracker component ─────────────────────────────────────────────────

const DEPARTMENT_META: Record<DepartmentName, { label: string; skill: string; color: string }> = {
  captain:     { label: 'Captain',     skill: 'Lead',    color: 'text-amber-400' },
  bridge:      { label: 'Bridge',      skill: 'Pilot',   color: 'text-sky-400' },
  gunnery:     { label: 'Gunnery',     skill: 'Shoot',   color: 'text-red-400' },
  engineering: { label: 'Engineering', skill: 'Fix',     color: 'text-green-400' },
  comms:       { label: 'Comms',       skill: 'Program', color: 'text-violet-400' },
};

const DAMAGED_DEPT_EFFECTS: Record<DepartmentName, string> = {
  captain:     'Cannot use captain actions (Into the Fire, Keep it Together, etc.)',
  bridge:      'Cannot perform bridge actions. Ship cannot maneuver or evade.',
  gunnery:     'Cannot fire weapons.',
  engineering: 'Cannot perform damage control or repairs.',
  comms:       'Cannot use sensor or communications actions.',
};

function CombatTracker({ ship, onSetCommandPoints, onSetCurrentDriveRating, onSetShipStatus, onToggleDepartmentDamaged, onAddCrisis, onToggleCrisisResolved, onRemoveCrisis }: {
  ship: Ship;
  onSetCommandPoints: (n: number) => void;
  onSetCurrentDriveRating: (n: number) => void;
  onSetShipStatus: (s: Ship['shipStatus']) => void;
  onToggleDepartmentDamaged: (name: DepartmentName) => void;
  onAddCrisis: (desc: string, type: ActiveCrisis['type']) => void;
  onToggleCrisisResolved: (id: string) => void;
  onRemoveCrisis: (id: string) => void;
}) {
  const [crisisDesc, setCrisisDesc] = useState('');
  const [crisisType, setCrisisType] = useState<ActiveCrisis['type']>('continuing');

  const activeCrises = ship.activeCrises ?? [];
  const departments = ship.departments ?? [];

  function submitCrisis() {
    if (!crisisDesc.trim()) return;
    onAddCrisis(crisisDesc, crisisType);
    setCrisisDesc('');
  }

  return (
    <SheetSection title="Combat Tracker" action={<Swords size={14} className="text-amber-400" />}>
      <div className="space-y-5">

        {/* Ship Status & Drive */}
        <div className="flex flex-wrap gap-4 items-start">
          {/* Ship status */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Ship Status</span>
            <div className="flex gap-1">
              {(['operational', 'crippled', 'destroyed'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => onSetShipStatus(s)}
                  className={`px-2 py-1 rounded text-xs font-medium capitalize transition-colors ${
                    ship.shipStatus === s
                      ? s === 'operational' ? 'bg-green-700 text-green-100'
                        : s === 'crippled'    ? 'bg-orange-700 text-orange-100'
                        : 'bg-red-800 text-red-100'
                      : 'bg-gray-700/60 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {ship.shipStatus === 'crippled' && (
              <p className="text-xs text-orange-300 italic">
                ⚠ Explodes in 2d6 min — Engineer must pass Int/Fix DC 10 to prevent.
              </p>
            )}
          </div>

          {/* Command Points */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Command Points</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => onSetCommandPoints(ship.commandPoints - 1)} disabled={ship.commandPoints <= 0}
                className="w-6 h-6 rounded bg-gray-700 hover:bg-red-900/60 disabled:opacity-20 text-gray-300 flex items-center justify-center text-sm">−</button>
              <span className="font-bold text-lg text-gray-100 w-8 text-center tabular-nums">{ship.commandPoints}</span>
              <button onClick={() => onSetCommandPoints(ship.commandPoints + 1)}
                className="w-6 h-6 rounded bg-gray-700 hover:bg-green-900/60 text-gray-300 flex items-center justify-center text-sm">+</button>
              <button onClick={() => onSetCommandPoints(0)} className="px-2 py-1 rounded text-xs bg-gray-700/60 text-gray-500 hover:text-gray-300 ml-1">Reset</button>
            </div>
          </div>

          {/* Drive rating */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Drive Rating</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => onSetCurrentDriveRating((ship.currentDriveRating ?? ship.driveRating) - 1)}
                disabled={(ship.currentDriveRating ?? ship.driveRating) <= 0}
                className="w-6 h-6 rounded bg-gray-700 hover:bg-red-900/60 disabled:opacity-20 text-gray-300 flex items-center justify-center text-sm">−</button>
              <span className={`font-bold text-lg w-8 text-center tabular-nums ${(ship.currentDriveRating ?? ship.driveRating) < ship.driveRating ? 'text-orange-400' : 'text-gray-100'}`}>
                {ship.currentDriveRating ?? ship.driveRating}
              </span>
              <button onClick={() => onSetCurrentDriveRating((ship.currentDriveRating ?? ship.driveRating) + 1)}
                disabled={(ship.currentDriveRating ?? ship.driveRating) >= ship.driveRating}
                className="w-6 h-6 rounded bg-gray-700 hover:bg-green-900/60 disabled:opacity-20 text-gray-300 flex items-center justify-center text-sm">+</button>
              <span className="text-xs text-gray-600 ml-1">/ {ship.driveRating} max</span>
            </div>
            {(ship.currentDriveRating ?? ship.driveRating) === 0 && (
              <p className="text-xs text-red-400 italic">Engines destroyed — cannot maneuver or be boarded.</p>
            )}
          </div>
        </div>

        {/* Departments */}
        <div>
          <h3 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Departments</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {departments.map(dept => {
              const meta = DEPARTMENT_META[dept.name];
              return (
                <div key={dept.name} className={`p-2 rounded border ${dept.damaged ? 'border-red-800 bg-red-900/10' : 'border-gray-700/60 bg-gray-900/20'}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div>
                      <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
                      <span className="text-[10px] text-gray-600 block">{meta.skill}</span>
                    </div>
                    <button
                      onClick={() => onToggleDepartmentDamaged(dept.name)}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                        dept.damaged ? 'bg-red-900/50 text-red-300 hover:bg-red-900' : 'bg-green-700 text-green-100 hover:bg-green-300/60'
                      }`}
                    >
                      {dept.damaged ? '⚠ Down' : 'Operational'}
                    </button>
                  </div>
                  {dept.damaged && (
                    <p className="text-[10px] text-red-300 italic leading-tight">{DAMAGED_DEPT_EFFECTS[dept.name]}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Crises */}
        <div>
          <h3 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Active Crises</h3>
          {activeCrises.length === 0 && (
            <p className="text-xs text-gray-600 italic mb-2">No active crises.</p>
          )}
          <div className="space-y-1.5 mb-3">
            {activeCrises.map(crisis => (
              <div key={crisis.id} className={`flex items-start gap-2 p-2 rounded border ${crisis.resolved ? 'border-gray-700/40 bg-gray-900/10 opacity-60' : crisis.type === 'acute' ? 'border-red-700 bg-red-900/15' : 'border-orange-800 bg-orange-900/10'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded ${crisis.type === 'acute' ? 'bg-red-900/60 text-red-300' : 'bg-orange-900/60 text-orange-300'}`}>
                      {crisis.type}
                    </span>
                    {crisis.resolved && <span className="text-[10px] text-green-400 font-bold uppercase">Resolved</span>}
                  </div>
                  <p className={`text-sm ${crisis.resolved ? 'line-through text-gray-500' : 'text-gray-200'}`}>{crisis.description}</p>
                  {!crisis.resolved && <p className="text-[10px] text-gray-500 mt-0.5">Resolve with "Deal With a Crisis" — Skill check difficulty 10</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => onToggleCrisisResolved(crisis.id)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${crisis.resolved ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-green-900/50 text-green-300 hover:bg-green-900'}`}>
                    {crisis.resolved ? 'Reopen' : 'Resolve'}
                  </button>
                  <button onClick={() => onRemoveCrisis(crisis.id)}
                    className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-gray-700 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* Add crisis form */}
          <div className="flex gap-2">
            <input
              type="text"
              value={crisisDesc}
              onChange={e => setCrisisDesc(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitCrisis()}
              placeholder="Describe the crisis…"
              className="flex-1 bg-gray-900/60 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500"
            />
            <select
              value={crisisType}
              onChange={e => setCrisisType(e.target.value as ActiveCrisis['type'])}
              className="bg-gray-900/60 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-amber-500"
            >
              <option value="continuing">Continuing</option>
              <option value="acute">Acute</option>
            </select>
            <button onClick={submitCrisis} disabled={!crisisDesc.trim()}
              className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600 disabled:opacity-30 text-white text-sm font-medium transition-colors flex items-center gap-1">
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

      </div>
    </SheetSection>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ShipSheet({ ship, characters, onEdit, onBack, onUpdate, onUpdateCharacter, onOpenRules, onOpenHelp, onNavigateToChar }: Props) {
  const derived: DerivedShip = deriveShip(ship);
  const hull = derived.hull;
  const [paymentAmount, setPaymentAmount] = useState('');
  const [cargoAmount, setCargoAmount] = useState('');
  const [mechName, setMechName] = useState('');
  const [mechTonnage, setMechTonnage] = useState('');
  const [showCrewPicker, setShowCrewPicker] = useState(false);
  const [customCrewName, setCustomCrewName] = useState('');
  const [customCrewRole, setCustomCrewRole] = useState('');

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

  function setLocation(location: string) {
    onUpdate({ ...ship, location });
  }

  function setNotes(notes: string) {
    onUpdate({ ...ship, notes });
  }

  function setCostPaid(costPaid: number) {
    onUpdate({ ...ship, costPaid: Math.max(0, Math.min(derived.totalCost, costPaid)) });
  }

  function toggleModuleBroken(type: 'weapon' | 'defense' | 'fitting', id: string) {
    const isBroken = ship.brokenModules.some(m => m.type === type && m.id === id);
    const updated = isBroken
      ? ship.brokenModules.filter(m => !(m.type === type && m.id === id))
      : [...ship.brokenModules, { id, type }];
    onUpdate({ ...ship, brokenModules: updated });
  }

  function setCargoWeight(weight: number) {
    onUpdate({ ...ship, cargoWeight: Math.max(0, weight) });
  }

  function setWeaponAmmo(weaponId: string, current: number) {
    const existing = ship.weaponAmmo.find(a => a.weaponId === weaponId);
    let updated: typeof ship.weaponAmmo;

    if (existing) {
      updated = ship.weaponAmmo.map(a =>
        a.weaponId === weaponId ? { ...a, current: Math.max(0, Math.min(a.max, current)) } : a
      );
    } else {
      updated = [...ship.weaponAmmo, { weaponId, current: Math.max(0, current), max: 100, readied: 0, stowed: 300 }];
    }
    onUpdate({ ...ship, weaponAmmo: updated });
  }

  function reloadWeaponAmmo(weaponId: string) {
    const ammo = ship.weaponAmmo.find(a => a.weaponId === weaponId);
    if (!ammo || ammo.readied === 0 && ammo.stowed === 0) return;

    const availableAmmo = ammo.readied + ammo.stowed;
    const ammoToLoad = Math.min(ammo.max, availableAmmo);
    let newReadied = ammo.readied;
    let newStowed = ammo.stowed;
    let toLoad = ammoToLoad;

    if (newReadied >= toLoad) {
      newReadied -= toLoad;
    } else {
      toLoad -= newReadied;
      newStowed -= toLoad;
      newReadied = 0;
    }

    const updated = ship.weaponAmmo.map(a =>
      a.weaponId === weaponId ? { ...a, current: ammoToLoad, readied: newReadied, stowed: newStowed } : a
    );
    onUpdate({ ...ship, weaponAmmo: updated });
  }

  function initializeWeaponAmmo(weaponId: string, max: number) {
    const existing = ship.weaponAmmo.find(a => a.weaponId === weaponId);
    if (!existing) {
      const updated = [...ship.weaponAmmo, { weaponId, current: max, max, readied: 0, stowed: max * 3 }];
      onUpdate({ ...ship, weaponAmmo: updated });
    }
  }

  function addMech(name: string, tonnage: number) {
    if (name.trim() && tonnage > 0) {
      const updated = [...ship.mechs, { id: crypto.randomUUID(), name: name.trim(), tonnage }];
      onUpdate({ ...ship, mechs: updated });
    }
  }

  function removeMech(mechId: string) {
    const updated = ship.mechs.filter(m => m.id !== mechId);
    onUpdate({ ...ship, mechs: updated });
  }

  // ── Crew handlers ─────────────────────────────────────────────────────────

  function toggleCharacterCrew(char: Character) {
    const ids = char.assignedShipIds ?? [];
    const next = ids.includes(ship.id)
      ? ids.filter(id => id !== ship.id)
      : [...ids, ship.id];
    onUpdateCharacter({ ...char, assignedShipIds: next });
  }

  function addCustomCrew() {
    if (!customCrewName.trim()) return;
    const member: import('../types/ship').CustomCrewMember = {
      id: crypto.randomUUID(),
      name: customCrewName.trim(),
      role: customCrewRole.trim() || undefined,
    };
    onUpdate({ ...ship, customCrew: [...(ship.customCrew ?? []), member] });
    setCustomCrewName('');
    setCustomCrewRole('');
  }

  function removeCustomCrew(id: string) {
    onUpdate({ ...ship, customCrew: (ship.customCrew ?? []).filter(m => m.id !== id) });
  }

  // ── Combat handlers ───────────────────────────────────────────────────────

  function setCommandPoints(cp: number) {
    onUpdate({ ...ship, commandPoints: Math.max(0, cp) });
  }

  function setCurrentDriveRating(rating: number) {
    onUpdate({ ...ship, currentDriveRating: Math.max(0, Math.min(ship.driveRating, rating)) });
  }

  function setShipStatus(status: Ship['shipStatus']) {
    onUpdate({ ...ship, shipStatus: status });
  }

  function toggleDepartmentDamaged(name: DepartmentName) {
    const updated = ship.departments.map(d => d.name === name ? { ...d, damaged: !d.damaged } : d);
    onUpdate({ ...ship, departments: updated });
  }

  function addCrisis(description: string, type: ActiveCrisis['type']) {
    if (!description.trim()) return;
    const crisis: ActiveCrisis = { id: crypto.randomUUID(), description: description.trim(), type, resolved: false };
    onUpdate({ ...ship, activeCrises: [...ship.activeCrises, crisis] });
  }

  function toggleCrisisResolved(id: string) {
    const updated = ship.activeCrises.map(c => c.id === id ? { ...c, resolved: !c.resolved } : c);
    onUpdate({ ...ship, activeCrises: updated });
  }

  function removeCrisis(id: string) {
    onUpdate({ ...ship, activeCrises: ship.activeCrises.filter(c => c.id !== id) });
  }

  const cargoCapacity = hull.massFree * (
    hull.class === 'Fighter' ? 2 :
    hull.class === 'Frigate' ? 20 :
    hull.class === 'Cruiser' ? 200 :
    2000
  );
  const totalMechTonnage = ship.mechs.reduce((sum, mech) => sum + mech.tonnage, 0);
  const totalCargoUsed = ship.cargoWeight + totalMechTonnage;
  const cargoPercentage = cargoCapacity > 0 ? (totalCargoUsed / cargoCapacity) * 100 : 0;
  const isOverloaded = cargoPercentage > 100;

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
        <div className="bg-gray-900 border-b border-gray-700 px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-gray-200 text-sm flex-shrink-0"
            >
              <span className="hidden sm:inline">← Back</span>
              <span className="sm:hidden">←</span>
            </button>
            <span className="text-gray-700 hidden sm:inline">|</span>
            <span className="text-amber-300 font-bold truncate">{ship.name || 'Unnamed Ship'}</span>
            <span className="text-gray-500 text-sm flex-shrink-0 hidden sm:inline">
              {hull.name}
            </span>
            <span className="text-[10px] uppercase tracking-widest bg-gray-800 text-gray-400 border border-gray-700 rounded px-1.5 py-0.5 flex-shrink-0 hidden sm:inline">
              {hull.class}
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={onOpenHelp}
              title="Rules reference & FAQ"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded text-gray-500 hover:text-amber-300 hover:bg-gray-700 transition-colors flex items-center justify-center"
            >
              <HelpCircle size={16} />
            </button>
            <button
              onClick={onOpenRules}
              title="Open SWN Revised Deluxe Edition rulebook"
              className="p-1 sm:p-1.5 rounded text-gray-500 hover:text-amber-300 hover:bg-gray-700 transition-colors"
            >
              <BookOpen size={16} />
            </button>
            <button
              onClick={onEdit}
              className="px-2 py-1.5 sm:px-3 rounded bg-amber-700 hover:bg-amber-600 text-white text-xs sm:text-sm font-medium flex items-center gap-1"
            >
              <Pencil size={13} /> Edit
            </button>
          </div>
        </div>

        {ship.retired && (
          <div className="bg-gray-700/60 border-b border-gray-600 px-4 py-2 flex items-center gap-2 text-sm text-gray-400">
            <span className="text-gray-300 font-medium uppercase tracking-wide text-xs">Decommissioned</span>
            <span className="text-gray-500">— this ship has been retired from active service.</span>
          </div>
        )}

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-3 py-4 sm:px-4 sm:py-6 w-full space-y-4 sm:space-y-6">

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
                    className={`font-bold tabular-nums text-sm w-14 text-center ${ship.hitPoints.current === 0 ? 'text-red-400' : 'text-gray-100'
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

          {/* ── Resource Usage ──────────────────────────────────────────────── */}
          <SheetSection title="Resource Usage">
            <div className="flex flex-wrap gap-6">
              <div className="flex-1 min-w-40 space-y-1">
                <ResourceBar
                  label="Hardpoints"
                  used={derived.massUsed}
                  total={hull.massFree}
                  danger={derived.overMass}
                  color="bg-orange-500"
                />
              </div>
              <div className="flex-1 min-w-40 space-y-1">
                <ResourceBar
                  label="Power"
                  used={derived.powerUsed}
                  total={hull.powerFree}
                  danger={derived.overPower}
                  color="bg-sky-500"
                />
              </div>
              <div className="flex-1 min-w-40 space-y-1">
                <ResourceBar
                  label="Mass"
                  used={derived.massUsed}
                  total={hull.massFree}
                  danger={derived.overMass}
                  color="bg-lime-500"
                />
              </div>
            </div>
          </SheetSection>

          {/* ── Combat Tracker ───────────────────────────────────────────────── */}
          <CombatTracker ship={ship}
            onSetCommandPoints={setCommandPoints}
            onSetCurrentDriveRating={setCurrentDriveRating}
            onSetShipStatus={setShipStatus}
            onToggleDepartmentDamaged={toggleDepartmentDamaged}
            onAddCrisis={addCrisis}
            onToggleCrisisResolved={toggleCrisisResolved}
            onRemoveCrisis={removeCrisis}
          />

          {/* ── Systems Status ────────────────────────────────────────────────── */}
          <SheetSection title="Systems Status">
            <div className="space-y-4">
              {/* Weapons */}
              {installedWeapons.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2">Weapons</h3>
                  <div className="space-y-2">
                    {installedWeapons.map(({ def, qty }) => {
                      const broken = ship.brokenModules.some(m => m.type === 'weapon' && m.id === def.id);
                      const ammo = ship.weaponAmmo.find(a => a.weaponId === def.id);
                      if (!ammo) initializeWeaponAmmo(def.id, 100);

                      return (
                        <div key={def.id} className={`p-2 rounded border ${broken ? 'border-red-800 bg-red-900/20' : 'border-gray-700 bg-gray-900/30'}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              {broken && <AlertCircle size={14} className="text-red-400 flex-shrink-0" />}
                              <span className={`text-sm font-medium ${broken ? 'text-red-300 line-through' : 'text-gray-200'}`}>
                                {qty > 1 ? `${def.name} ×${qty}` : def.name}
                              </span>
                              <span className="text-red-400 font-mono text-sm">{def.damage}</span>
                              {def.ap > 0 && (
                                <span className="text-xs text-orange-400">AP {def.ap}</span>
                              )}
                            </div>
                            <button
                              onClick={() => toggleModuleBroken('weapon', def.id)}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                                broken
                                  ? 'bg-red-900/50 text-red-300 hover:bg-red-900'
                                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                              }`}
                            >
                              {broken ? 'Broken' : 'Functional'}
                            </button>
                          </div>
                          {def.qualities.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2 ml-5">
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
                          {ammo && (
                            <div className="flex flex-col gap-1.5 ml-5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">Magazine:</span>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => setWeaponAmmo(def.id, ammo.current - 1)} disabled={ammo.current <= 0}
                                    className="w-5 h-5 rounded bg-gray-700 hover:bg-red-900/50 disabled:opacity-20 text-gray-300 text-xs flex items-center justify-center" title="Fire">−</button>
                                  <input
                                    type="number"
                                    value={ammo.current}
                                    onChange={e => setWeaponAmmo(def.id, Math.round(Number(e.target.value)))}
                                    className="w-10 bg-gray-900/60 border border-gray-700 rounded px-1.5 py-0.5 text-xs text-gray-200 text-center focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                                  />
                                  <span className="text-xs text-gray-500">/ {ammo.max}</span>
                                  <button onClick={() => reloadWeaponAmmo(def.id)} disabled={ammo.readied === 0 && ammo.stowed === 0}
                                    className={`px-1.5 h-5 rounded text-xs transition-colors flex items-center justify-center ${(ammo.readied > 0 || ammo.stowed > 0) ? 'bg-gray-700 hover:bg-amber-900/50 text-gray-300' : 'bg-gray-800 opacity-40 text-gray-500'}`} title={ammo.readied > 0 || ammo.stowed > 0 ? 'Reload' : 'No ammo available'}>⟳</button>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-xs">
                                {ammo.readied > 0 && (
                                  <div className="flex items-center gap-0.5">
                                    <span className="text-blue-400">r:{ammo.readied}</span>
                                    <button onClick={() => {
                                      const updated = ship.weaponAmmo.map(a => a.weaponId === def.id ? { ...a, readied: Math.max(0, a.readied - 1), stowed: a.stowed + 1 } : a);
                                      onUpdate({ ...ship, weaponAmmo: updated });
                                    }}
                                      className="w-4 h-4 rounded bg-gray-700 hover:bg-gray-600 text-gray-400 text-xs flex items-center justify-center" title="Stow 1">→</button>
                                  </div>
                                )}
                                {ammo.stowed > 0 && (
                                  <div className="flex items-center gap-0.5">
                                    <button onClick={() => {
                                      const updated = ship.weaponAmmo.map(a => a.weaponId === def.id ? { ...a, stowed: Math.max(0, a.stowed - 1), readied: a.readied + 1 } : a);
                                      onUpdate({ ...ship, weaponAmmo: updated });
                                    }}
                                      className="w-4 h-4 rounded bg-gray-700 hover:bg-gray-600 text-gray-400 text-xs flex items-center justify-center" title="Ready 1">←</button>
                                    <span className="text-amber-600">s:{ammo.stowed}</span>
                                  </div>
                                )}
                                {ammo.readied === 0 && ammo.stowed === 0 && (
                                  <span className="text-red-500">no ammo</span>
                                )}
                              </div>
                            </div>
                          )}
                          {broken && (
                            <p className="text-xs text-red-300 mt-1.5 ml-5 italic">
                              ⚠ {getModuleConsequence('weapon', def.name)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Defenses */}
              {installedDefenses.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2">Defenses</h3>
                  <div className="space-y-2">
                    {installedDefenses.map(({ def }) => {
                      const broken = ship.brokenModules.some(m => m.type === 'defense' && m.id === def.id);
                      return (
                        <div key={def.id} className={`p-2 rounded border ${broken ? 'border-red-800 bg-red-900/20' : 'border-gray-700 bg-gray-900/30'}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              {broken && <AlertCircle size={14} className="text-red-400 flex-shrink-0" />}
                              <span className={`text-sm font-medium ${broken ? 'text-red-300 line-through' : 'text-gray-200'}`}>
                                {def.name}
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
                            <button
                              onClick={() => toggleModuleBroken('defense', def.id)}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                                broken
                                  ? 'bg-red-900/50 text-red-300 hover:bg-red-900'
                                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                              }`}
                            >
                              {broken ? 'Broken' : 'Functional'}
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 leading-snug ml-5">{def.description}</p>
                          {broken && (
                            <p className="text-xs text-red-300 mt-1.5 ml-5 italic">
                              ⚠ {getModuleConsequence('defense', def.name)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fittings */}
              {installedFittings.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Fittings</h3>
                  <div className="space-y-2">
                    {installedFittings.map(({ def }) => {
                      const broken = ship.brokenModules.some(m => m.type === 'fitting' && m.id === def.id);
                      return (
                        <div key={def.id} className={`p-2 rounded border ${broken ? 'border-red-800 bg-red-900/20' : 'border-gray-700 bg-gray-900/30'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {broken && <AlertCircle size={14} className="text-red-400" />}
                              <span className={`text-sm font-medium ${broken ? 'text-red-300 line-through' : 'text-gray-200'}`}>
                                {def.name}
                              </span>
                            </div>
                            <button
                              onClick={() => toggleModuleBroken('fitting', def.id)}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                broken
                                  ? 'bg-red-900/50 text-red-300 hover:bg-red-900'
                                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                              }`}
                            >
                              {broken ? 'Broken' : 'Functional'}
                            </button>
                          </div>
                          {broken && (
                            <p className="text-xs text-red-300 mt-1.5 italic">
                              ⚠ {getModuleConsequence('fitting', def.name)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
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

            {/* Payment tracking */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-400">Amount Paid</span>
                  <span className="text-sm text-gray-200 font-mono font-bold">
                    {ship.costPaid.toLocaleString()} cr
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Adjust:</span>
                    <button
                      onClick={() => {
                        const n = Math.round(Number(paymentAmount));
                        if (Number.isFinite(n) && n !== 0) setCostPaid(ship.costPaid - n);
                        setPaymentAmount('');
                      }}
                      className="w-5 h-5 rounded bg-gray-700/80 hover:bg-red-900/60 text-gray-300 text-xs flex items-center justify-center"
                      title="Subtract"
                    >−</button>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const n = Math.round(Number(paymentAmount));
                          if (Number.isFinite(n) && n !== 0) setCostPaid(ship.costPaid + n);
                          setPaymentAmount('');
                        }
                      }}
                      placeholder="0"
                      className="w-20 bg-gray-900/60 border border-gray-700 rounded px-2 py-0.5 text-sm text-gray-200 placeholder-gray-600 text-center focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                    />
                    <button
                      onClick={() => {
                        const n = Math.round(Number(paymentAmount));
                        if (Number.isFinite(n) && n !== 0) setCostPaid(ship.costPaid + n);
                        setPaymentAmount('');
                      }}
                      className="w-5 h-5 rounded bg-gray-700/80 hover:bg-green-900/60 text-gray-300 text-xs flex items-center justify-center"
                      title="Add"
                    >+</button>
                  </div>
                </div>
                <CostRow label="Remaining balance" value={`${Math.max(0, derived.totalCost - ship.costPaid).toLocaleString()} cr`} prominent />
                <div className="mt-2 pt-2 border-t border-gray-700/50">
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        ship.costPaid >= derived.totalCost ? 'bg-green-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, (ship.costPaid / derived.totalCost) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 mt-1 block">
                    {Math.round((ship.costPaid / derived.totalCost) * 100)}% paid
                  </span>
                </div>
              </div>
            </div>
          </SheetSection>

          {/* ── Location ─────────────────────────────────────────────────────── */}
          <SheetSection title="Location">
            <input
              type="text"
              defaultValue={ship.location}
              onBlur={(e) => setLocation(e.target.value)}
              placeholder="Current location of the ship…"
              className="w-full bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500"
            />
          </SheetSection>

          {/* ── Cargo Management ─────────────────────────────────────────────── */}
          <SheetSection title="Cargo Management">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-400">Current Cargo</span>
                <span className="text-sm text-gray-200 font-mono font-bold">
                  {totalCargoUsed.toLocaleString()} / {cargoCapacity.toLocaleString()} tons
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Adjust:</span>
                  <button
                    onClick={() => {
                      const n = Math.round(Number(cargoAmount));
                      if (Number.isFinite(n) && n !== 0) setCargoWeight(ship.cargoWeight - n);
                      setCargoAmount('');
                    }}
                    className="w-5 h-5 rounded bg-gray-700/80 hover:bg-red-900/60 text-gray-300 text-xs flex items-center justify-center"
                    title="Subtract"
                  >−</button>
                  <input
                    type="number"
                    value={cargoAmount}
                    onChange={e => setCargoAmount(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const n = Math.round(Number(cargoAmount));
                        if (Number.isFinite(n) && n !== 0) setCargoWeight(ship.cargoWeight + n);
                        setCargoAmount('');
                      }
                    }}
                    placeholder="0"
                    className="w-20 bg-gray-900/60 border border-gray-700 rounded px-2 py-0.5 text-sm text-gray-200 placeholder-gray-600 text-center focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                  />
                  <button
                    onClick={() => {
                      const n = Math.round(Number(cargoAmount));
                      if (Number.isFinite(n) && n !== 0) setCargoWeight(ship.cargoWeight + n);
                      setCargoAmount('');
                    }}
                    className="w-5 h-5 rounded bg-gray-700/80 hover:bg-green-900/60 text-gray-300 text-xs flex items-center justify-center"
                    title="Add"
                  >+</button>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-700/50">
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isOverloaded ? 'bg-red-500' : cargoPercentage > 80 ? 'bg-orange-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, cargoPercentage)}%` }}
                  />
                </div>
                <span className={`text-xs mt-1 block ${isOverloaded ? 'text-red-400' : 'text-gray-500'}`}>
                  {Math.round(cargoPercentage)}% capacity {isOverloaded && '(OVERLOADED!)'}
                </span>
              </div>
            </div>
          </SheetSection>

          {/* ── Mechs Aboard ──────────────────────────────────────────────────── */}
          <SheetSection title="Mechs Aboard">
            <div className="space-y-3">
              {ship.mechs.length > 0 && (
                <div className="space-y-2 mb-3">
                  {ship.mechs.map(mech => (
                    <div key={mech.id} className="flex items-center justify-between gap-2 p-2 rounded bg-gray-900/30 border border-gray-700">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-200 font-medium">{mech.name}</span>
                        <span className="text-xs text-gray-500 ml-2">{mech.tonnage} tons</span>
                      </div>
                      <button
                        onClick={() => removeMech(mech.id)}
                        className="px-2 py-1 rounded text-xs font-medium bg-red-900/50 text-red-300 hover:bg-red-900 transition-colors flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2 pt-2 border-t border-gray-700/50">
                <input
                  type="text"
                  placeholder="Mech name"
                  value={mechName}
                  onChange={e => setMechName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && mechName.trim() && mechTonnage) {
                      addMech(mechName, Number(mechTonnage));
                      setMechName('');
                      setMechTonnage('');
                    }
                  }}
                  className="w-full bg-gray-900/60 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Tonnage"
                    value={mechTonnage}
                    onChange={e => setMechTonnage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && mechName.trim() && mechTonnage) {
                        addMech(mechName, Number(mechTonnage));
                        setMechName('');
                        setMechTonnage('');
                      }
                    }}
                    className="flex-1 bg-gray-900/60 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                  />
                  <button
                    onClick={() => {
                      if (mechName.trim() && mechTonnage) {
                        addMech(mechName, Number(mechTonnage));
                        setMechName('');
                        setMechTonnage('');
                      }
                    }}
                    disabled={!mechName.trim() || !mechTonnage}
                    className="px-3 py-2 rounded bg-amber-700 hover:bg-amber-600 disabled:opacity-30 text-white text-sm font-medium transition-colors flex-shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </SheetSection>

          {/* ── Crew ─────────────────────────────────────────────────────────── */}
          <SheetSection title="Crew" action={
            <button
              onClick={() => setShowCrewPicker(true)}
              className="px-2.5 py-1 rounded bg-gray-700 hover:bg-amber-900/40 text-gray-300 hover:text-amber-300 text-xs font-medium transition-colors flex items-center gap-1"
            >
              <Users size={12} /> Add Character
            </button>
          }>
            {(() => {
              const charCrew = characters.filter(c => (c.assignedShipIds ?? []).includes(ship.id));
              const customCrew = ship.customCrew ?? [];
              const hasAnyCrew = charCrew.length > 0 || customCrew.length > 0;
              return (
                <div className="space-y-3">
                  {!hasAnyCrew && (
                    <p className="text-gray-600 text-sm italic">No crew assigned. Add characters or custom crew members below.</p>
                  )}

                  {/* Character crew */}
                  {charCrew.length > 0 && (
                    <div className="space-y-1.5">
                      {charCrew.map(c => (
                        <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-900/30 border border-gray-700/60">
                          {c.image && (
                            <img src={c.image} alt={c.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-600" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {c.retired && <span className="text-[10px] uppercase tracking-wide bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded flex-shrink-0">Retired</span>}
                              <span className="text-sm font-medium text-gray-200 truncate">{c.name || 'Unnamed'}</span>
                            </div>
                            <span className="text-xs text-gray-500">{c.class}{c.adventurerPartials?.length ? ` (${c.adventurerPartials.join(', ')})` : ''} · Level {c.level}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {onNavigateToChar && (
                              <button onClick={() => onNavigateToChar(c.id)}
                                className="px-2.5 py-1 rounded bg-gray-700 hover:bg-amber-900/40 text-gray-400 hover:text-amber-300 text-xs transition-colors">
                                View →
                              </button>
                            )}
                            <button onClick={() => toggleCharacterCrew(c)}
                              className="px-2 py-1 rounded bg-gray-700 hover:bg-red-900/40 text-gray-500 hover:text-red-400 text-xs transition-colors">
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Custom named crew */}
                  {customCrew.length > 0 && (
                    <div className="space-y-1.5">
                      {customCrew.map(m => (
                        <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-900/30 border border-gray-700/40">
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 text-gray-400 text-xs font-bold">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-300 truncate block">{m.name}</span>
                            {m.role && <span className="text-xs text-gray-500">{m.role}</span>}
                          </div>
                          <button onClick={() => removeCustomCrew(m.id)}
                            className="px-2 py-1 rounded bg-gray-700 hover:bg-red-900/40 text-gray-500 hover:text-red-400 text-xs transition-colors flex-shrink-0">
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add custom crew form */}
                  <div className="pt-2 border-t border-gray-700/50">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Add Named Crew</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Name"
                        value={customCrewName}
                        onChange={e => setCustomCrewName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addCustomCrew()}
                        className="flex-1 bg-gray-900/60 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500"
                      />
                      <input
                        type="text"
                        placeholder="Role (optional)"
                        value={customCrewRole}
                        onChange={e => setCustomCrewRole(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addCustomCrew()}
                        className="flex-1 bg-gray-900/60 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500"
                      />
                      <button onClick={addCustomCrew} disabled={!customCrewName.trim()}
                        className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600 disabled:opacity-30 text-white text-sm font-medium transition-colors flex-shrink-0 flex items-center gap-1">
                        <Plus size={14} /> Add
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </SheetSection>

          {/* Character picker modal */}
          {showCrewPicker && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
                <div className="flex-shrink-0">
                  <h3 className="text-gray-100 font-semibold text-lg mb-1">Add Character to Crew</h3>
                  <p className="text-gray-500 text-xs">Click a character to toggle. Already-assigned characters are highlighted.</p>
                </div>
                <div className="overflow-y-auto flex-1 space-y-2">
                  {characters.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">No characters available.</p>
                  ) : (
                    characters.map(c => {
                      const assigned = (c.assignedShipIds ?? []).includes(ship.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleCharacterCrew(c)}
                          className={`w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-center gap-3 ${
                            assigned
                              ? 'border-amber-600 bg-amber-900/20'
                              : 'border-gray-700 bg-gray-800/60 hover:border-amber-700 hover:bg-gray-700/60'
                          }`}
                        >
                          {c.image && <img src={c.image} alt={c.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-600" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium text-sm ${assigned ? 'text-amber-300' : 'text-gray-200'}`}>{c.name || 'Unnamed'}</span>
                              {c.retired && <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded uppercase tracking-wide">Retired</span>}
                            </div>
                            <span className="text-xs text-gray-500">{c.class} · Level {c.level}</span>
                          </div>
                          {assigned && <span className="text-[10px] uppercase tracking-wide text-amber-400 font-bold flex-shrink-0">Crew</span>}
                        </button>
                      );
                    })
                  )}
                </div>
                <div className="flex justify-end flex-shrink-0 pt-2 border-t border-gray-700">
                  <button onClick={() => setShowCrewPicker(false)}
                    className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium">
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

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
      </div >
    </div >
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
