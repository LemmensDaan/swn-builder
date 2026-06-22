import { useState } from 'react';
import { BookOpen, HelpCircle, Pencil, Plus, X, Users, Swords, Dice6 } from 'lucide-react';
import type { Ship, DepartmentName, ActiveCrisis } from '../types/ship';
import { WEAPONS, DEFENSES, FITTINGS, SHIP_MODS, deriveShip } from '../data/ships';
import type { DerivedShip } from '../data/ships';
import { getModuleConsequence } from '../data/ship-modules';
import type { Character } from '../types/character';
import { attrMod, calcAttackBonus } from '../types/character';

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

// ── Constants ─────────────────────────────────────────────────────────────────

const CRISIS_TABLE: { roll: number; name: string; type: 'continuing' | 'acute'; desc: string }[] = [
  { roll: 1,  name: 'Armor Loss',           type: 'continuing', desc: 'Ship armor breached. Reduce AC by 2 for the rest of this combat.' },
  { roll: 2,  name: 'Cargo Loss',           type: 'acute',      desc: 'Cargo bay breached. 1d6 tons of cargo vented to space.' },
  { roll: 3,  name: 'Crew Lost',            type: 'acute',      desc: 'A crew station takes a direct hit. One crewmember incapacitated or killed.' },
  { roll: 4,  name: 'Engine Lock',          type: 'acute',      desc: 'Drives stutter and lock. Int/Fix DC 8 to restart; ship cannot maneuver this round.' },
  { roll: 5,  name: 'Fuel Bleed',           type: 'continuing', desc: 'Fuel line ruptured. Repair within 1 hour or spike drive becomes unusable.' },
  { roll: 6,  name: 'Haywire Systems',      type: 'continuing', desc: 'Random system goes haywire. Int/Program DC 8 each round; −2 to related rolls.' },
  { roll: 7,  name: 'Hull Breach',          type: 'acute',      desc: 'Decompression in a section. Seal within 1 round or one crew member dies per round.' },
  { roll: 8,  name: 'System Damage',        type: 'acute',      desc: 'Critical hit on a department. A random department becomes damaged immediately.' },
  { roll: 9,  name: 'Target Decalibration', type: 'continuing', desc: 'Targeting computers scrambled. −2 to all attack rolls until repaired (Int/Fix DC 7).' },
  { roll: 10, name: 'VIP Imperiled',        type: 'acute',      desc: 'A key person is in immediate danger. Rescue them this round or face lasting consequences.' },
];

interface DeptAction { name: string; cp: number; desc: string }
const DEPT_ACTIONS: Record<string, DeptAction[]> = {
  captain: [
    { name: 'Into the Fire',      cp: 0, desc: 'Move 1 CP from one department to another; must be used this round.' },
    { name: 'Keep It Together',   cp: 0, desc: 'Prevent an Acute crisis from forcing an immediate consequence roll.' },
    { name: 'Support Department', cp: 0, desc: '+1 to the next skill check made by a named department this round.' },
  ],
  bridge: [
    { name: 'Escape Combat',     cp: 4, desc: 'Disengage from combat. Opposed Pilot checks to escape.' },
    { name: 'Evasive Maneuvers', cp: 2, desc: '+2 to AC until next turn. Cannot fire weapons this round.' },
    { name: 'Pursue Target',     cp: 3, desc: 'Gain a pursuit advantage. Enemy must spend equal CP to disengage.' },
  ],
  gunnery: [
    { name: 'Fire All Guns',  cp: 3, desc: 'Fire every weapon simultaneously at one target.' },
    { name: 'Fire One Weapon',cp: 2, desc: 'Fire a single weapon at a target.' },
    { name: 'Target Systems', cp: 1, desc: 'Called shot. On hit, target rolls on the crisis table instead of taking normal damage.' },
  ],
  engineering: [
    { name: 'Boost Engines',      cp: 2, desc: 'Drive rating +1 for this round only.' },
    { name: 'Damage Control',     cp: 3, desc: 'Negate 1 point of HP damage taken this round.' },
    { name: 'Emergency Repairs',  cp: 3, desc: 'Int/Fix DC 8 — repair a damaged department or recover 3 HP.' },
  ],
  comms: [
    { name: 'Crash Systems',  cp: 2, desc: 'Int/Program attack vs. enemy — hit: target loses 1d4 CP next round.' },
    { name: 'Defeat ECM',     cp: 2, desc: 'Counter enemy ECM, restoring normal targeting this round.' },
    { name: 'Sensor Ghost',   cp: 2, desc: 'Create a false sensor profile; enemy rolls to identify true target.' },
  ],
  general: [
    { name: 'Above and Beyond',   cp: 0, desc: 'One crewmember takes an unusual action, at GM discretion.' },
    { name: 'Deal With a Crisis', cp: 0, desc: 'Skill check DC 10 to resolve an active continuing crisis.' },
    { name: 'Do Your Duty',       cp: 0, desc: 'Take a department action for free; usable only once per combat.' },
  ],
};

const DEPT_META: Record<DepartmentName, { label: string; skill: string; color: string }> = {
  captain:     { label: 'Captain',     skill: 'Lead',    color: 'text-amber-400' },
  bridge:      { label: 'Bridge',      skill: 'Pilot',   color: 'text-sky-400' },
  gunnery:     { label: 'Gunnery',     skill: 'Shoot',   color: 'text-red-400' },
  engineering: { label: 'Engineering', skill: 'Fix',     color: 'text-green-400' },
  comms:       { label: 'Comms',       skill: 'Program', color: 'text-violet-400' },
};

// ── Helper components ─────────────────────────────────────────────────────────

function SheetSection({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
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

function ResourceBar({ label, used, total, danger, color }: { label: string; used: number; total: number; danger: boolean; color: string }) {
  const pct = total > 0 ? Math.min(1, used / total) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <span className={`text-xs font-bold tabular-nums ${danger ? 'text-red-400' : 'text-gray-300'}`}>{used} / {total}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${danger ? 'bg-red-500' : color}`} style={{ width: `${Math.round(pct * 100)}%` }} />
      </div>
    </div>
  );
}

// ── Hull Schematic SVG ────────────────────────────────────────────────────────

function HullSchematic({ ship, onToggleDept }: { ship: Ship; onToggleDept: (name: DepartmentName) => void }) {
  const depts = ship.departments ?? [];
  const hpPct = ship.hitPoints.max > 0 ? ship.hitPoints.current / ship.hitPoints.max : 0;

  function deptInfo(name: DepartmentName) {
    const d = depts.find(d => d.name === name);
    const damaged = d?.damaged ?? false;
    return {
      fill: damaged ? '#3b1f00' : '#0f1c2e',
      stroke: damaged ? '#ea580c' : '#2d4a6e',
      dot: damaged ? '#f97316' : '#22c55e',
      damaged,
    };
  }

  const hullStroke = hpPct <= 0.25 ? '#ef4444' : hpPct <= 0.5 ? '#f97316' : '#1d4ed8';
  const hullFill   = hpPct <= 0.25 ? '#1f0000' : hpPct <= 0.5 ? '#1e0d00' : '#040d18';
  const hpBarColor = hpPct <= 0.25 ? '#ef4444' : hpPct <= 0.5 ? '#f97316' : '#22c55e';

  const eng  = deptInfo('engineering');
  const comms = deptInfo('comms');
  const capt  = deptInfo('captain');
  const brdg  = deptInfo('bridge');
  const gunn  = deptInfo('gunnery');

  const txtClass = 'text-[10px] fill-current pointer-events-none select-none';

  return (
    <svg viewBox="0 0 560 220" className="w-full max-w-xl mx-auto" style={{ filter: 'drop-shadow(0 0 10px rgba(29,78,216,0.2))' }}>
      <defs>
        <pattern id="shipgrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5"/>
        </pattern>
        {/* engine glow gradient */}
        <radialGradient id="engGlow" cx="0" cy="0.5" r="1">
          <stop offset="0%" stopColor={eng.damaged ? '#f97316' : '#3b82f6'} stopOpacity="0.7"/>
          <stop offset="100%" stopColor={eng.damaged ? '#f97316' : '#3b82f6'} stopOpacity="0"/>
        </radialGradient>
      </defs>

      {/* Background grid */}
      <rect width="560" height="220" fill="url(#shipgrid)" opacity="0.4"/>

      {/* ── Engineering: engine pods ── */}
      <g onClick={() => onToggleDept('engineering')} style={{ cursor: 'pointer' }}>
        {/* port engine pod */}
        <rect x="46" y="68" width="74" height="30" rx="5" fill={eng.fill} stroke={eng.stroke} strokeWidth="1.5"/>
        {/* stbd engine pod */}
        <rect x="46" y="122" width="74" height="30" rx="5" fill={eng.fill} stroke={eng.stroke} strokeWidth="1.5"/>
        {/* nozzle port */}
        <ellipse cx="42" cy="83" rx="11" ry="15" fill={eng.fill} stroke={eng.stroke} strokeWidth="1.5"/>
        {/* nozzle stbd */}
        <ellipse cx="42" cy="137" rx="11" ry="15" fill={eng.fill} stroke={eng.stroke} strokeWidth="1.5"/>
        {/* glow */}
        <ellipse cx="28" cy="83" rx="14" ry="15" fill="url(#engGlow)" opacity="0.6"/>
        <ellipse cx="28" cy="137" rx="14" ry="15" fill="url(#engGlow)" opacity="0.6"/>
        {/* labels */}
        <text x="82" y="87" textAnchor="middle" fontSize="8" fill="#64748b" fontFamily="monospace" className={txtClass}>ENG</text>
        <text x="82" y="141" textAnchor="middle" fontSize="8" fill="#64748b" fontFamily="monospace" className={txtClass}>ENG</text>
        {/* status dots */}
        <circle cx="64" cy="72" r="4" fill={eng.dot}/>
        <circle cx="64" cy="126" r="4" fill={eng.dot}/>
      </g>

      {/* ── Gunnery: wings ── */}
      <g onClick={() => onToggleDept('gunnery')} style={{ cursor: 'pointer' }}>
        {/* port wing */}
        <polygon points="158,76 132,18 270,18 270,76" fill={gunn.fill} stroke={gunn.stroke} strokeWidth="1.5"/>
        {/* stbd wing */}
        <polygon points="158,144 132,202 270,202 270,144" fill={gunn.fill} stroke={gunn.stroke} strokeWidth="1.5"/>
        {/* weapon hardpoint markers */}
        <circle cx="190" cy="44" r="5" fill="none" stroke={gunn.stroke} strokeWidth="1.5"/>
        <circle cx="235" cy="34" r="5" fill="none" stroke={gunn.stroke} strokeWidth="1.5"/>
        <circle cx="190" cy="176" r="5" fill="none" stroke={gunn.stroke} strokeWidth="1.5"/>
        <circle cx="235" cy="186" r="5" fill="none" stroke={gunn.stroke} strokeWidth="1.5"/>
        {/* labels */}
        <text x="200" y="55" textAnchor="middle" fontSize="8" fill="#64748b" fontFamily="monospace" className={txtClass}>GUNNERY</text>
        <text x="200" y="169" textAnchor="middle" fontSize="8" fill="#64748b" fontFamily="monospace" className={txtClass}>GUNNERY</text>
        <circle cx="155" cy="30" r="4" fill={gunn.dot}/>
        <circle cx="155" cy="190" r="4" fill={gunn.dot}/>
      </g>

      {/* ── Main hull body ── */}
      <rect x="120" y="72" width="290" height="76" rx="8" fill={hullFill} stroke={hullStroke} strokeWidth="1.5"/>

      {/* Division lines within hull */}
      <line x1="220" y1="72" x2="220" y2="148" stroke="#1e3a5f" strokeWidth="1" strokeDasharray="4 3"/>
      <line x1="310" y1="72" x2="310" y2="148" stroke="#1e3a5f" strokeWidth="1" strokeDasharray="4 3"/>

      {/* ── Comms: rear hull region ── */}
      <g onClick={() => onToggleDept('comms')} style={{ cursor: 'pointer' }}>
        <rect x="120" y="72" width="100" height="76" rx="4" fill={comms.fill} stroke="none" opacity="0.85"/>
        {/* sensor ring */}
        <circle cx="170" cy="110" r="20" fill="none" stroke={comms.stroke} strokeWidth="1" opacity="0.7"/>
        <circle cx="170" cy="110" r="8" fill="none" stroke={comms.stroke} strokeWidth="1" opacity="0.7"/>
        <line x1="170" y1="90" x2="170" y2="130" stroke={comms.stroke} strokeWidth="0.8" opacity="0.6"/>
        <line x1="150" y1="110" x2="190" y2="110" stroke={comms.stroke} strokeWidth="0.8" opacity="0.6"/>
        <text x="170" y="155" textAnchor="middle" fontSize="7.5" fill="#64748b" fontFamily="monospace" className={txtClass}>COMMS</text>
        <circle cx="147" cy="80" r="4" fill={comms.dot}/>
      </g>

      {/* ── Captain: center hull region ── */}
      <g onClick={() => onToggleDept('captain')} style={{ cursor: 'pointer' }}>
        <rect x="220" y="72" width="90" height="76" fill={capt.fill} stroke="none" opacity="0.85"/>
        {/* command chair symbol */}
        <rect x="248" y="92" width="34" height="24" rx="3" fill="none" stroke={capt.stroke} strokeWidth="1.2"/>
        <line x1="265" y1="92" x2="265" y2="116" stroke={capt.stroke} strokeWidth="0.8" opacity="0.6"/>
        <text x="265" y="155" textAnchor="middle" fontSize="7.5" fill="#64748b" fontFamily="monospace" className={txtClass}>CAPTAIN</text>
        <circle cx="236" cy="80" r="4" fill={capt.dot}/>
      </g>

      {/* ── Bridge: forward hull region ── */}
      <g onClick={() => onToggleDept('bridge')} style={{ cursor: 'pointer' }}>
        <rect x="310" y="72" width="100" height="76" rx="4" fill={brdg.fill} stroke="none" opacity="0.85"/>
        {/* cockpit window */}
        <ellipse cx="375" cy="110" rx="22" ry="18" fill="none" stroke={brdg.stroke} strokeWidth="1.5"/>
        <ellipse cx="375" cy="110" rx="12" ry="10" fill={brdg.stroke} opacity="0.2"/>
        <text x="355" y="155" textAnchor="middle" fontSize="7.5" fill="#64748b" fontFamily="monospace" className={txtClass}>BRIDGE</text>
        <circle cx="325" cy="80" r="4" fill={brdg.dot}/>
      </g>

      {/* ── Nose cone ── */}
      <polygon points="410,72 410,148 478,110" fill={hullFill} stroke={hullStroke} strokeWidth="1.5"/>
      {/* nav light at tip */}
      <circle cx="478" cy="110" r="4" fill={hullStroke} opacity="0.8"/>

      {/* ── HP bar at bottom of hull ── */}
      <rect x="120" y="150" width="290" height="5" rx="2" fill="#1e293b"/>
      <rect x="120" y="150" width={290 * hpPct} height="5" rx="2" fill={hpBarColor}/>
      {/* HP label */}
      <text x="265" y="170" textAnchor="middle" fontSize="8" fill="#64748b" fontFamily="monospace">
        HP {ship.hitPoints.current}/{ship.hitPoints.max}
      </text>

      {/* Forward arrow */}
      <text x="495" y="113" fontSize="10" fill="#1d4ed8" fontFamily="monospace" opacity="0.6">▶</text>
      <text x="492" y="125" textAnchor="middle" fontSize="6.5" fill="#475569" fontFamily="monospace">FWD</text>
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ShipSheet({ ship, characters, onEdit, onBack, onUpdate, onUpdateCharacter, onOpenRules, onOpenHelp, onNavigateToChar }: Props) {
  const derived: DerivedShip = deriveShip(ship);
  const hull = derived.hull;

  const [activeTab, setActiveTab] = useState<'general' | 'combat'>('general');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [cargoAmount, setCargoAmount] = useState('');
  const [mechName, setMechName] = useState('');
  const [mechTonnage, setMechTonnage] = useState('');
  const [showCrewPicker, setShowCrewPicker] = useState(false);
  const [customCrewName, setCustomCrewName] = useState('');
  const [customCrewRole, setCustomCrewRole] = useState('');
  const [crisisDesc, setCrisisDesc] = useState('');
  const [crisisType, setCrisisType] = useState<ActiveCrisis['type']>('continuing');
  const [manualBonus, setManualBonus] = useState('0');
  const [lastRoll, setLastRoll] = useState<{ d20: number; bonus: number; label: string } | null>(null);
  const [lastCrisisRoll, setLastCrisisRoll] = useState<typeof CRISIS_TABLE[number] | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function setHP(current: number) {
    onUpdate({ ...ship, hitPoints: { ...ship.hitPoints, current: Math.max(0, Math.min(ship.hitPoints.max, current)) } });
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

  function toggleModBroken(index: number) {
    const mods = [...(ship.mods ?? [])];
    mods[index] = { ...mods[index], broken: !mods[index].broken };
    onUpdate({ ...ship, mods });
  }

  function setModStatus(index: number, status: 'aftermarket' | 'redesigned') {
    const mods = [...(ship.mods ?? [])];
    mods[index] = { ...mods[index], status };
    onUpdate({ ...ship, mods });
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
      updated = [...ship.weaponAmmo, { weaponId, current: Math.max(0, current), max: 100, readied: 0, stowed: 0 }];
    }
    onUpdate({ ...ship, weaponAmmo: updated });
  }

  function initializeWeaponAmmo(weaponId: string, max: number) {
    const existing = ship.weaponAmmo.find(a => a.weaponId === weaponId);
    if (!existing) {
      onUpdate({ ...ship, weaponAmmo: [...ship.weaponAmmo, { weaponId, current: max, max, readied: 0, stowed: max * 3 }] });
    }
  }

  function reloadShipWeapon(weaponId: string) {
    const ammo = ship.weaponAmmo.find(a => a.weaponId === weaponId);
    if (!ammo || ammo.current >= ammo.max) return;
    const readied = ammo.readied ?? 0;
    const stowed = ammo.stowed ?? 0;
    if (readied === 0 && stowed === 0) return;
    const newReadied = readied > 0 ? readied - 1 : readied;
    const newStowed = readied === 0 && stowed > 0 ? stowed - 1 : stowed;
    const updated = ship.weaponAmmo.map(a =>
      a.weaponId === weaponId ? { ...a, current: a.max, readied: newReadied, stowed: newStowed } : a
    );
    onUpdate({ ...ship, weaponAmmo: updated });
  }

  function transferShipAmmo(weaponId: string, dir: 'to-readied' | 'to-stowed') {
    const ammo = ship.weaponAmmo.find(a => a.weaponId === weaponId);
    if (!ammo) return;
    const readied = ammo.readied ?? 0;
    const stowed = ammo.stowed ?? 0;
    const newReadied = dir === 'to-readied' && stowed > 0 ? readied + 1 : dir === 'to-stowed' && readied > 0 ? readied - 1 : readied;
    const newStowed  = dir === 'to-readied' && stowed > 0 ? stowed - 1 : dir === 'to-stowed' && readied > 0 ? stowed + 1 : stowed;
    const updated = ship.weaponAmmo.map(a =>
      a.weaponId === weaponId ? { ...a, readied: newReadied, stowed: newStowed } : a
    );
    onUpdate({ ...ship, weaponAmmo: updated });
  }

  function addMech(name: string, tonnage: number) {
    if (name.trim() && tonnage > 0) {
      onUpdate({ ...ship, mechs: [...ship.mechs, { id: crypto.randomUUID(), name: name.trim(), tonnage }] });
    }
  }

  function removeMech(mechId: string) {
    onUpdate({ ...ship, mechs: ship.mechs.filter(m => m.id !== mechId) });
  }

  function toggleCharacterCrew(char: Character) {
    const ids = char.assignedShipIds ?? [];
    const next = ids.includes(ship.id) ? ids.filter(id => id !== ship.id) : [...ids, ship.id];
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

  function spendCP(cost: number) {
    if (ship.commandPoints < cost) return;
    onUpdate({ ...ship, commandPoints: ship.commandPoints - cost });
  }

  function rollAttack(label: string, bonus: number) {
    const d20 = Math.floor(Math.random() * 20) + 1;
    setLastRoll({ d20, bonus, label });
  }

  function rollCrisis() {
    const roll = Math.floor(Math.random() * 10) + 1;
    const result = CRISIS_TABLE[roll - 1];
    setLastCrisisRoll(result);
  }

  function addCrisisFromRoll() {
    if (!lastCrisisRoll) return;
    addCrisis(lastCrisisRoll.name + ': ' + lastCrisisRoll.desc, lastCrisisRoll.type);
  }

  // ── Derived display values ─────────────────────────────────────────────────

  const cargoCapacity = hull.massFree * (hull.class === 'Fighter' ? 2 : hull.class === 'Frigate' ? 20 : hull.class === 'Cruiser' ? 200 : 2000);
  const totalMechTonnage = ship.mechs.reduce((sum, m) => sum + m.tonnage, 0);
  const totalCargoUsed = ship.cargoWeight + totalMechTonnage;
  const cargoPercentage = cargoCapacity > 0 ? (totalCargoUsed / cargoCapacity) * 100 : 0;
  const isOverloaded = cargoPercentage > 100;

  const speedDisplay = derived.speed === null ? '—' : String(derived.speed);
  const dailyCost = ship.currentCrew * 120;
  const sixMonthMaint = Math.round(derived.maintenanceCost / 2);

  const installedWeapons = ship.weapons
    .map(i => { const def = WEAPONS.find(w => w.id === i.id); return def ? { def, qty: i.qty } : null; })
    .filter(Boolean) as { def: (typeof WEAPONS)[number]; qty: number }[];

  const installedDefenses = ship.defenses
    .map(i => { const def = DEFENSES.find(d => d.id === i.id); return def ? { def, qty: i.qty } : null; })
    .filter(Boolean) as { def: (typeof DEFENSES)[number]; qty: number }[];

  const installedFittings = ship.fittings
    .map(i => { const def = FITTINGS.find(f => f.id === i.id); return def ? { def, qty: i.qty } : null; })
    .filter(Boolean) as { def: (typeof FITTINGS)[number]; qty: number }[];

  const installedMods = ship.mods ?? [];
  const charCrew = characters.filter(c => (c.assignedShipIds ?? []).includes(ship.id));

  // Attack bonus helpers
  function calcShootBonus(char: Character): number {
    const bab = calcAttackBonus(char.class, char.adventurerPartials, char.level);
    const aMod = Math.max(attrMod(char.attributes.INT), attrMod(char.attributes.DEX));
    return bab + aMod + (char.skills.Shoot ?? -1);
  }

  function calcPilotBonus(char: Character): number {
    const bab = calcAttackBonus(char.class, char.adventurerPartials, char.level);
    return bab + attrMod(char.attributes.DEX) + (char.skills.Pilot ?? -1);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-gray-100 flex justify-center">
      <div className="w-full max-w-6xl flex flex-col min-h-screen bg-gray-950">

        {/* ── Header bar ─────────────────────────────────────────────────── */}
        <div className="bg-gray-900 border-b border-gray-700 px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={onBack} className="text-gray-400 hover:text-gray-200 text-sm flex-shrink-0">
              <span className="hidden sm:inline">← Back</span>
              <span className="sm:hidden">←</span>
            </button>
            <span className="text-gray-700 hidden sm:inline">|</span>
            <span className="text-amber-300 font-bold truncate">{ship.name || 'Unnamed Ship'}</span>
            <span className="text-gray-500 text-sm flex-shrink-0 hidden sm:inline">{hull.name}</span>
            <span className="text-[10px] uppercase tracking-widest bg-gray-800 text-gray-400 border border-gray-700 rounded px-1.5 py-0.5 flex-shrink-0 hidden sm:inline">{hull.class}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button onClick={onOpenHelp} className="w-7 h-7 sm:w-8 sm:h-8 rounded text-gray-500 hover:text-amber-300 hover:bg-gray-700 transition-colors flex items-center justify-center">
              <HelpCircle size={16} />
            </button>
            <button onClick={onOpenRules} className="p-1 sm:p-1.5 rounded text-gray-500 hover:text-amber-300 hover:bg-gray-700 transition-colors">
              <BookOpen size={16} />
            </button>
            <button onClick={onEdit} className="px-2 py-1.5 sm:px-3 rounded bg-amber-700 hover:bg-amber-600 text-white text-xs sm:text-sm font-medium flex items-center gap-1">
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

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex border-b border-gray-700 bg-gray-900/70 flex-shrink-0">
          {(['general', 'combat'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-amber-500 text-amber-300'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'combat' && <Swords size={13} className="inline mr-1.5 -mt-0.5" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Tab content ────────────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-3 py-4 sm:px-4 sm:py-6 w-full space-y-4 sm:space-y-6">

          {/* ══════════════════════════════════════════════════════════════
              GENERAL TAB
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'general' && <>

            {/* ── Combat Stats ─────────────────────────────────────────── */}
            <SheetSection title="Combat Stats">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                <StatCell label="Speed" value={speedDisplay} />
                <StatCell label="Armor" value={String(hull.armor)} />
                <StatCell label="AC" value={String(derived.ac)} />

                {/* HP — interactive */}
                <div className="glass rounded-lg p-2 text-center">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">HP</div>
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setHP(ship.hitPoints.current - 1)} disabled={ship.hitPoints.current <= 0}
                      className="w-5 h-5 rounded bg-gray-700/80 hover:bg-red-900/60 disabled:opacity-20 text-gray-300 text-xs flex items-center justify-center">−</button>
                    <span className={`font-bold text-lg tabular-nums w-12 text-center ${ship.hitPoints.current / ship.hitPoints.max < 0.25 ? 'text-red-400' : ship.hitPoints.current / ship.hitPoints.max < 0.5 ? 'text-orange-400' : 'text-gray-100'}`}>
                      {ship.hitPoints.current}
                    </span>
                    <button onClick={() => setHP(ship.hitPoints.current + 1)} disabled={ship.hitPoints.current >= ship.hitPoints.max}
                      className="w-5 h-5 rounded bg-gray-700/80 hover:bg-green-900/60 disabled:opacity-20 text-gray-300 text-xs flex items-center justify-center">+</button>
                  </div>
                  <div className="text-[10px] text-gray-600 mt-0.5">/ {ship.hitPoints.max}</div>
                </div>

                {/* Crew */}
                <div className="glass rounded-lg p-2 text-center">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Crew</div>
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setCrew(ship.currentCrew - 1)} disabled={ship.currentCrew <= 0}
                      className="w-5 h-5 rounded bg-gray-700/80 hover:bg-red-900/60 disabled:opacity-20 text-gray-300 text-xs flex items-center justify-center">−</button>
                    <span className="font-bold text-lg tabular-nums w-10 text-center text-gray-100">{ship.currentCrew}</span>
                    <button onClick={() => setCrew(ship.currentCrew + 1)}
                      className="w-5 h-5 rounded bg-gray-700/80 hover:bg-green-900/60 text-gray-300 text-xs flex items-center justify-center">+</button>
                  </div>
                  <div className="text-[10px] text-gray-600 mt-0.5">min {hull.minCrew}</div>
                </div>

                <StatCell label="Drive" value={`${ship.driveRating}`} />
              </div>
            </SheetSection>

            {/* ── Resource Usage ─────────────────────────────────────────── */}
            <SheetSection title="Resource Usage">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ResourceBar label="Power" used={derived.powerUsed} total={hull.power} danger={derived.powerUsed > hull.power} color="bg-yellow-500"/>
                <ResourceBar label="Mass"  used={derived.massUsed}  total={hull.mass}  danger={derived.massUsed  > hull.mass}  color="bg-blue-500"/>
                <ResourceBar label="Hardpoints" used={derived.hardpointsUsed} total={hull.hardpoints} danger={derived.hardpointsUsed > hull.hardpoints} color="bg-red-500"/>
              </div>
            </SheetSection>

            {/* ── Systems Status ─────────────────────────────────────────── */}
            {(installedWeapons.length > 0 || installedDefenses.length > 0) && (
              <SheetSection title="Systems Status">
                <div className="space-y-2">
                  {installedWeapons.map(({ def, qty }) => {
                    const broken = ship.brokenModules.some(m => m.type === 'weapon' && m.id === def.id);
                    const consequence = broken ? getModuleConsequence('weapon', def.id) : null;
                    return (
                      <div key={def.id} className={`flex items-center justify-between gap-3 p-2 rounded border ${broken ? 'border-red-800 bg-red-900/10' : 'border-gray-700/60'}`}>
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-medium ${broken ? 'text-red-300 line-through' : 'text-gray-200'}`}>{def.name}</span>
                          {qty > 1 && <span className="text-xs text-gray-500 ml-1">×{qty}</span>}
                          {broken && consequence && <p className="text-xs text-red-400 mt-0.5">{consequence}</p>}
                        </div>
                        <button onClick={() => toggleModuleBroken('weapon', def.id)}
                          className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 transition-colors ${broken ? 'bg-red-900/50 text-red-300 hover:bg-red-900' : 'bg-green-700 text-green-100 hover:bg-green-600'}`}>
                          {broken ? '⚠ Broken' : 'Operational'}
                        </button>
                      </div>
                    );
                  })}
                  {installedDefenses.map(({ def, qty }) => {
                    const broken = ship.brokenModules.some(m => m.type === 'defense' && m.id === def.id);
                    return (
                      <div key={def.id} className={`flex items-center justify-between gap-3 p-2 rounded border ${broken ? 'border-red-800 bg-red-900/10' : 'border-gray-700/60'}`}>
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-medium ${broken ? 'text-red-300 line-through' : 'text-gray-200'}`}>{def.name}</span>
                          {qty > 1 && <span className="text-xs text-gray-500 ml-1">×{qty}</span>}
                        </div>
                        <button onClick={() => toggleModuleBroken('defense', def.id)}
                          className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 transition-colors ${broken ? 'bg-red-900/50 text-red-300 hover:bg-red-900' : 'bg-green-700 text-green-100 hover:bg-green-600'}`}>
                          {broken ? '⚠ Broken' : 'Operational'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </SheetSection>
            )}

            {/* ── Fittings ──────────────────────────────────────────────── */}
            {installedFittings.length > 0 && (
              <SheetSection title="Fittings">
                <div className="space-y-2">
                  {installedFittings.map(({ def, qty }) => {
                    const broken = ship.brokenModules.some(m => m.type === 'fitting' && m.id === def.id);
                    const consequence = broken ? getModuleConsequence('fitting', def.id) : null;
                    return (
                      <div key={def.id} className={`flex items-start gap-3 p-2 rounded border ${broken ? 'border-red-800/60 bg-red-900/10' : 'border-gray-700/40 bg-gray-900/20'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${broken ? 'text-red-300' : 'text-gray-200'}`}>{def.name}</span>
                            {qty > 1 && <span className="text-xs text-gray-500">×{qty}</span>}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{def.description}</p>
                          {broken && consequence && <p className="text-xs text-red-400 mt-0.5">{consequence}</p>}
                        </div>
                        <button onClick={() => toggleModuleBroken('fitting', def.id)}
                          className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 transition-colors ${broken ? 'bg-red-900/50 text-red-300 hover:bg-red-900' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                          {broken ? '⚠ Broken' : 'OK'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </SheetSection>
            )}

            {/* ── Modifications ─────────────────────────────────────────── */}
            {installedMods.length > 0 && (
              <SheetSection title="Modifications">
                <div className="space-y-2">
                  {installedMods.map((mod, idx) => {
                    const def = SHIP_MODS.find(d => d.id === mod.id);
                    if (!def) return null;
                    return (
                      <div key={idx} className={`flex items-start gap-3 p-2.5 rounded border ${mod.broken ? 'border-red-800/60 bg-red-900/10' : 'border-violet-800/40 bg-violet-900/10'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${mod.broken ? 'text-red-300 line-through' : 'text-violet-300'}`}>{def.name}</span>
                            <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-bold ${mod.status === 'redesigned' ? 'bg-green-900/60 text-green-300' : 'bg-amber-900/60 text-amber-300'}`}>
                              {mod.status === 'redesigned' ? 'Redesigned' : 'Aftermarket'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{def.description}</p>
                          {/* Status toggle */}
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex rounded overflow-hidden border border-gray-700 text-[10px]">
                              <button onClick={() => setModStatus(idx, 'aftermarket')}
                                className={`px-2 py-0.5 font-medium transition-colors ${mod.status === 'aftermarket' ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}>
                                Aftermarket
                              </button>
                              <button onClick={() => setModStatus(idx, 'redesigned')}
                                className={`px-2 py-0.5 font-medium transition-colors ${mod.status === 'redesigned' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}>
                                Redesigned
                              </button>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => toggleModBroken(idx)}
                          className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 transition-colors ${mod.broken ? 'bg-red-900/50 text-red-300 hover:bg-red-900' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                          {mod.broken ? '⚠ Broken' : 'OK'}
                        </button>
                      </div>
                    );
                  })}
                  <p className="text-xs text-gray-600 mt-1">
                    {installedMods.filter(m => m.status === 'aftermarket' && !m.broken).length} aftermarket mod(s) consume maintenance slots (INT mod + CON mod + 3×Fix).
                  </p>
                </div>
              </SheetSection>
            )}

            {/* ── Location ──────────────────────────────────────────────── */}
            <SheetSection title="Location">
              <input
                type="text"
                defaultValue={ship.location}
                onBlur={(e) => setLocation(e.target.value)}
                placeholder="Current location of the ship…"
                className="w-full bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500"
              />
            </SheetSection>

            {/* ── Cargo Management ──────────────────────────────────────── */}
            <SheetSection title="Cargo Management">
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-400">Current Cargo</span>
                  <span className="text-sm text-gray-200 font-mono font-bold">{totalCargoUsed.toLocaleString()} / {cargoCapacity.toLocaleString()} tons</span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Adjust:</span>
                    <button onClick={() => { const n = Math.round(Number(cargoAmount)); if (Number.isFinite(n) && n !== 0) setCargoWeight(ship.cargoWeight - n); setCargoAmount(''); }}
                      className="w-5 h-5 rounded bg-gray-700/80 hover:bg-red-900/60 text-gray-300 text-xs flex items-center justify-center">−</button>
                    <input type="number" value={cargoAmount} onChange={e => setCargoAmount(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { const n = Math.round(Number(cargoAmount)); if (Number.isFinite(n) && n !== 0) setCargoWeight(ship.cargoWeight + n); setCargoAmount(''); }}}
                      placeholder="0" className="w-20 bg-gray-900/60 border border-gray-700 rounded px-2 py-0.5 text-sm text-gray-200 placeholder-gray-600 text-center focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"/>
                    <button onClick={() => { const n = Math.round(Number(cargoAmount)); if (Number.isFinite(n) && n !== 0) setCargoWeight(ship.cargoWeight + n); setCargoAmount(''); }}
                      className="w-5 h-5 rounded bg-gray-700/80 hover:bg-green-900/60 text-gray-300 text-xs flex items-center justify-center">+</button>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-700/50">
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div className={`h-full rounded-full transition-all ${isOverloaded ? 'bg-red-500' : cargoPercentage > 80 ? 'bg-orange-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(100, cargoPercentage)}%` }}/>
                  </div>
                  <span className={`text-xs mt-1 block ${isOverloaded ? 'text-red-400' : 'text-gray-500'}`}>
                    {Math.round(cargoPercentage)}% capacity {isOverloaded && '(OVERLOADED!)'}
                  </span>
                </div>
              </div>
            </SheetSection>

            {/* ── Mechs Aboard ──────────────────────────────────────────── */}
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
                        <button onClick={() => removeMech(mech.id)}
                          className="px-2 py-1 rounded text-xs font-medium bg-red-900/50 text-red-300 hover:bg-red-900 transition-colors flex-shrink-0">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2 pt-2 border-t border-gray-700/50">
                  <input type="text" placeholder="Mech name" value={mechName} onChange={e => setMechName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && mechName.trim() && mechTonnage) { addMech(mechName, Number(mechTonnage)); setMechName(''); setMechTonnage(''); }}}
                    className="w-full bg-gray-900/60 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500"/>
                  <div className="flex items-center gap-2">
                    <input type="number" placeholder="Tonnage" value={mechTonnage} onChange={e => setMechTonnage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && mechName.trim() && mechTonnage) { addMech(mechName, Number(mechTonnage)); setMechName(''); setMechTonnage(''); }}}
                      className="flex-1 bg-gray-900/60 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"/>
                    <button onClick={() => { if (mechName.trim() && mechTonnage) { addMech(mechName, Number(mechTonnage)); setMechName(''); setMechTonnage(''); }}}
                      disabled={!mechName.trim() || !mechTonnage}
                      className="px-3 py-2 rounded bg-amber-700 hover:bg-amber-600 disabled:opacity-30 text-white text-sm font-medium transition-colors flex-shrink-0">
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </SheetSection>

            {/* ── Crew ──────────────────────────────────────────────────── */}
            <SheetSection title="Crew" action={
              <button onClick={() => setShowCrewPicker(true)}
                className="px-2.5 py-1 rounded bg-gray-700 hover:bg-amber-900/40 text-gray-300 hover:text-amber-300 text-xs font-medium transition-colors flex items-center gap-1">
                <Users size={12} /> Add Character
              </button>
            }>
              {(() => {
                const customCrew = ship.customCrew ?? [];
                const hasAnyCrew = charCrew.length > 0 || customCrew.length > 0;
                return (
                  <div className="space-y-3">
                    {!hasAnyCrew && <p className="text-gray-600 text-sm italic">No crew assigned.</p>}
                    {charCrew.length > 0 && (
                      <div className="space-y-1.5">
                        {charCrew.map(c => (
                          <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-900/30 border border-gray-700/60">
                            {c.image && <img src={c.image} alt={c.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-600"/>}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {c.retired && <span className="text-[10px] uppercase tracking-wide bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded flex-shrink-0">Retired</span>}
                                <span className="text-sm font-medium text-gray-200 truncate">{c.name || 'Unnamed'}</span>
                              </div>
                              <span className="text-xs text-gray-500">{c.class} · Level {c.level}</span>
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
                    <div className="pt-2 border-t border-gray-700/50">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Add Named Crew</p>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Name" value={customCrewName} onChange={e => setCustomCrewName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addCustomCrew()}
                          className="flex-1 bg-gray-900/60 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500"/>
                        <input type="text" placeholder="Role (optional)" value={customCrewRole} onChange={e => setCustomCrewRole(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addCustomCrew()}
                          className="flex-1 bg-gray-900/60 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500"/>
                        <button onClick={addCustomCrew} disabled={!customCrewName.trim()}
                          className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600 disabled:opacity-30 text-white text-sm font-medium transition-colors flex-shrink-0 flex items-center gap-1">
                          <Plus size={14}/> Add
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </SheetSection>

            {/* ── Notes ─────────────────────────────────────────────────── */}
            <SheetSection title="Notes">
              <textarea defaultValue={ship.notes} onBlur={(e) => setNotes(e.target.value)}
                placeholder="Cargo manifest, crew names, mission notes, outstanding debts…"
                className="w-full h-28 bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500 resize-y"/>
            </SheetSection>

            {/* ── Cost & Payments ────────────────────────────────────────── */}
            <SheetSection title="Cost & Payments">
              <div className="space-y-2">
                <CostRow label="Hull cost"       value={derived.totalCost.toLocaleString() + ' cr'} />
                <CostRow label="Amount paid"     value={ship.costPaid.toLocaleString() + ' cr'} />
                <CostRow label="Outstanding"     value={(Math.max(0, derived.totalCost - ship.costPaid)).toLocaleString() + ' cr'} prominent />
                <div className="border-t border-gray-700/50 pt-2 mt-2 space-y-1">
                  <CostRow label="Daily crew cost"     value={dailyCost.toLocaleString() + ' cr/day'} />
                  <CostRow label="Fuel load"           value="500 cr" />
                  <CostRow label="6-month maintenance" value={sixMonthMaint.toLocaleString() + ' cr'} />
                </div>
                <div className="pt-2 border-t border-gray-700/50">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Record Payment</p>
                  <div className="flex gap-2">
                    <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { const n = Number(paymentAmount); if (Number.isFinite(n) && n > 0) { setCostPaid(ship.costPaid + n); setPaymentAmount(''); }}}}
                      placeholder="Amount paid…"
                      className="flex-1 bg-gray-900/60 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"/>
                    <button onClick={() => { const n = Number(paymentAmount); if (Number.isFinite(n) && n > 0) { setCostPaid(ship.costPaid + n); setPaymentAmount(''); }}}
                      disabled={!paymentAmount || Number(paymentAmount) <= 0}
                      className="px-4 py-2 rounded bg-green-700 hover:bg-green-600 disabled:opacity-30 text-white text-sm font-medium transition-colors flex-shrink-0">
                      Pay
                    </button>
                  </div>
                </div>
              </div>
            </SheetSection>
          </>}

          {/* ══════════════════════════════════════════════════════════════
              COMBAT TAB
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'combat' && <>

            {/* ── Hull Schematic ─────────────────────────────────────────── */}
            <SheetSection title="Hull Schematic — click sections to toggle damage">
              <HullSchematic ship={ship} onToggleDept={toggleDepartmentDamaged} />
              <p className="text-[10px] text-gray-600 text-center mt-2">
                <span className="text-green-400">●</span> Operational &nbsp;
                <span className="text-orange-400">●</span> Damaged &nbsp;
                Hull HP: {ship.hitPoints.current}/{ship.hitPoints.max}
              </p>
            </SheetSection>

            {/* ── Combat Status ──────────────────────────────────────────── */}
            <SheetSection title="Combat Status">
              <div className="flex flex-wrap gap-6 items-start">
                {/* HP tracker */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">Hit Points</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setHP(ship.hitPoints.current - 1)} disabled={ship.hitPoints.current <= 0}
                      className="w-6 h-6 rounded bg-gray-700 hover:bg-red-900/60 disabled:opacity-20 text-gray-300 flex items-center justify-center text-sm">−</button>
                    <span className={`font-bold text-xl w-12 text-center tabular-nums ${ship.hitPoints.current / ship.hitPoints.max < 0.25 ? 'text-red-400' : ship.hitPoints.current / ship.hitPoints.max < 0.5 ? 'text-orange-400' : 'text-gray-100'}`}>
                      {ship.hitPoints.current}
                    </span>
                    <button onClick={() => setHP(ship.hitPoints.current + 1)} disabled={ship.hitPoints.current >= ship.hitPoints.max}
                      className="w-6 h-6 rounded bg-gray-700 hover:bg-green-900/60 disabled:opacity-20 text-gray-300 flex items-center justify-center text-sm">+</button>
                    <span className="text-xs text-gray-600 ml-1">/ {ship.hitPoints.max}</span>
                  </div>
                </div>

                {/* Ship Status */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">Ship Status</span>
                  <div className="flex gap-1">
                    {(['operational', 'crippled', 'destroyed'] as const).map(s => (
                      <button key={s} onClick={() => setShipStatus(s)}
                        className={`px-2 py-1 rounded text-xs font-medium capitalize transition-colors ${ship.shipStatus === s
                          ? s === 'operational' ? 'bg-green-700 text-green-100' : s === 'crippled' ? 'bg-orange-700 text-orange-100' : 'bg-red-800 text-red-100'
                          : 'bg-gray-700/60 text-gray-400 hover:bg-gray-600'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                  {ship.shipStatus === 'crippled' && (
                    <p className="text-xs text-orange-300 italic">⚠ Explodes in 2d6 min — Int/Fix DC 10 to stabilize.</p>
                  )}
                </div>

                {/* Command Points */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">Command Points</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setCommandPoints(ship.commandPoints - 1)} disabled={ship.commandPoints <= 0}
                      className="w-6 h-6 rounded bg-gray-700 hover:bg-red-900/60 disabled:opacity-20 text-gray-300 flex items-center justify-center text-sm">−</button>
                    <span className="font-bold text-xl text-gray-100 w-8 text-center tabular-nums">{ship.commandPoints}</span>
                    <button onClick={() => setCommandPoints(ship.commandPoints + 1)}
                      className="w-6 h-6 rounded bg-gray-700 hover:bg-green-900/60 text-gray-300 flex items-center justify-center text-sm">+</button>
                    <button onClick={() => setCommandPoints(0)} className="px-2 py-1 rounded text-xs bg-gray-700/60 text-gray-500 hover:text-gray-300 ml-1">Reset</button>
                  </div>
                </div>

                {/* Drive Rating */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">Drive Rating</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setCurrentDriveRating((ship.currentDriveRating ?? ship.driveRating) - 1)}
                      disabled={(ship.currentDriveRating ?? ship.driveRating) <= 0}
                      className="w-6 h-6 rounded bg-gray-700 hover:bg-red-900/60 disabled:opacity-20 text-gray-300 flex items-center justify-center text-sm">−</button>
                    <span className={`font-bold text-xl w-8 text-center tabular-nums ${(ship.currentDriveRating ?? ship.driveRating) < ship.driveRating ? 'text-orange-400' : 'text-gray-100'}`}>
                      {ship.currentDriveRating ?? ship.driveRating}
                    </span>
                    <button onClick={() => setCurrentDriveRating((ship.currentDriveRating ?? ship.driveRating) + 1)}
                      disabled={(ship.currentDriveRating ?? ship.driveRating) >= ship.driveRating}
                      className="w-6 h-6 rounded bg-gray-700 hover:bg-green-900/60 disabled:opacity-20 text-gray-300 flex items-center justify-center text-sm">+</button>
                    <span className="text-xs text-gray-600 ml-1">/ {ship.driveRating} max</span>
                  </div>
                </div>
              </div>
            </SheetSection>

            {/* ── Department Actions ─────────────────────────────────────── */}
            <SheetSection title="Department Actions">
              <div className="space-y-2">
                {(Object.entries(DEPT_ACTIONS) as [string, DeptAction[]][]).map(([deptKey, actions]) => {
                  const deptName = deptKey as DepartmentName | 'general';
                  const meta = deptKey !== 'general' ? DEPT_META[deptName as DepartmentName] : null;
                  const dept = ship.departments?.find(d => d.name === deptKey);
                  const isDamaged = dept?.damaged ?? false;
                  const isExpanded = expandedDept === deptKey;

                  return (
                    <div key={deptKey} className={`rounded-lg border ${isDamaged ? 'border-red-800/60 bg-red-900/10' : 'border-gray-700/60 bg-gray-900/20'}`}>
                      <button
                        className="w-full flex items-center gap-3 p-3 text-left"
                        onClick={() => setExpandedDept(isExpanded ? null : deptKey)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${meta ? meta.color : 'text-gray-300'} capitalize`}>
                              {deptKey === 'general' ? 'General Actions' : meta?.label}
                            </span>
                            {meta && <span className="text-[10px] text-gray-600">{meta.skill}</span>}
                            {isDamaged && <span className="text-[10px] text-red-400 font-bold uppercase bg-red-900/40 px-1.5 py-0.5 rounded">Damaged</span>}
                          </div>
                          <p className="text-[10px] text-gray-600 mt-0.5">{actions.map(a => a.name).join(' · ')}</p>
                        </div>
                        <span className="text-gray-600 text-xs flex-shrink-0">{isExpanded ? '▲' : '▼'}</span>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-gray-700/50 p-3 space-y-2">
                          {isDamaged && deptKey !== 'general' && (
                            <p className="text-xs text-red-300 bg-red-900/20 rounded p-2 mb-2">
                              ⚠ This department is damaged — actions unavailable until repaired.
                            </p>
                          )}
                          {actions.map(action => (
                            <div key={action.name} className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-200">{action.name}</span>
                                  {action.cp > 0 && (
                                    <span className="text-[10px] font-bold text-amber-400 bg-amber-900/30 border border-amber-800/50 rounded px-1.5 py-0.5">
                                      {action.cp} CP
                                    </span>
                                  )}
                                  {action.cp === 0 && (
                                    <span className="text-[10px] text-gray-600 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5">
                                      Free
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{action.desc}</p>
                              </div>
                              {action.cp > 0 && (
                                <button
                                  onClick={() => spendCP(action.cp)}
                                  disabled={ship.commandPoints < action.cp || isDamaged}
                                  className="px-2.5 py-1 rounded text-xs font-medium flex-shrink-0 transition-colors bg-amber-900/40 text-amber-300 hover:bg-amber-800/60 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title={ship.commandPoints < action.cp ? `Need ${action.cp} CP (have ${ship.commandPoints})` : `Spend ${action.cp} CP`}
                                >
                                  Spend {action.cp} CP
                                </button>
                              )}
                            </div>
                          ))}
                          {deptKey !== 'general' && (
                            <div className="pt-2 border-t border-gray-700/40">
                              <button
                                onClick={() => toggleDepartmentDamaged(deptKey as DepartmentName)}
                                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${isDamaged ? 'bg-green-900/50 text-green-300 hover:bg-green-900' : 'bg-red-900/40 text-red-400 hover:bg-red-900/60'}`}
                              >
                                {isDamaged ? '✓ Mark Repaired' : '⚠ Mark Damaged'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </SheetSection>

            {/* ── Weapons & Ammo ─────────────────────────────────────────── */}
            {installedWeapons.length > 0 && (
              <SheetSection title="Weapons">
                <div className="space-y-3">
                  {installedWeapons.map(({ def, qty }) => {
                    const broken = ship.brokenModules.some(m => m.type === 'weapon' && m.id === def.id);
                    const wId = def.id;
                    const ammoEntry = ship.weaponAmmo.find(a => a.weaponId === wId);
                    const hasAmmo = def.ammo !== undefined && def.ammo !== null;

                    if (hasAmmo && !ammoEntry) {
                      initializeWeaponAmmo(wId, def.ammo as number);
                    }

                    const readied = ammoEntry?.readied ?? 0;
                    const stowed  = ammoEntry?.stowed  ?? 0;
                    const canReload = ammoEntry ? ammoEntry.current < ammoEntry.max && (readied + stowed > 0) : false;

                    return (
                      <div key={def.id} className={`p-3 rounded-lg border ${broken ? 'border-red-800/60 bg-red-900/10' : 'border-gray-700/60 bg-gray-900/20'}`}>
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-medium text-sm ${broken ? 'text-red-300 line-through' : 'text-gray-200'}`}>{def.name}</span>
                              {qty > 1 && <span className="text-xs text-gray-500">×{qty}</span>}
                              <span className="text-xs text-gray-600">{def.damage}</span>
                              {def.ap > 0 && <span className="text-xs text-gray-600">AP {def.ap}</span>}
                            </div>
                            {hasAmmo && ammoEntry && (
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {/* Current ammo counter */}
                                <div className="flex items-center gap-1">
                                  <button onClick={() => setWeaponAmmo(wId, ammoEntry.current - 1)} disabled={ammoEntry.current <= 0 || broken}
                                    className="w-5 h-5 rounded bg-gray-700 hover:bg-red-900/60 disabled:opacity-20 text-gray-300 text-xs flex items-center justify-center">−</button>
                                  <span className={`text-sm font-mono font-bold w-14 text-center tabular-nums ${ammoEntry.current === 0 ? 'text-red-400' : 'text-gray-200'}`}>
                                    {ammoEntry.current}/{ammoEntry.max}
                                  </span>
                                  <button onClick={() => setWeaponAmmo(wId, ammoEntry.current + 1)} disabled={ammoEntry.current >= ammoEntry.max || broken}
                                    className="w-5 h-5 rounded bg-gray-700 hover:bg-green-900/60 disabled:opacity-20 text-gray-300 text-xs flex items-center justify-center">+</button>
                                </div>
                                {/* Reload */}
                                <button onClick={() => reloadShipWeapon(wId)} disabled={!canReload || broken}
                                  className="px-2 py-0.5 rounded text-xs bg-sky-900/50 text-sky-300 hover:bg-sky-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                  Reload
                                </button>
                                {/* Readied mags */}
                                <div className="flex items-center gap-1">
                                  <button onClick={() => transferShipAmmo(wId, 'to-stowed')} disabled={readied === 0}
                                    className="w-4 h-4 rounded text-[10px] bg-gray-700 hover:bg-gray-600 disabled:opacity-20 text-gray-400 flex items-center justify-center">←</button>
                                  <span className="text-xs text-blue-300 font-mono">r:{readied}</span>
                                  <button onClick={() => transferShipAmmo(wId, 'to-readied')} disabled={stowed === 0}
                                    className="w-4 h-4 rounded text-[10px] bg-gray-700 hover:bg-gray-600 disabled:opacity-20 text-gray-400 flex items-center justify-center">→</button>
                                  <span className="text-xs text-amber-400 font-mono">s:{stowed}</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <button onClick={() => toggleModuleBroken('weapon', def.id)}
                            className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 transition-colors ${broken ? 'bg-red-900/50 text-red-300 hover:bg-red-900' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                            {broken ? '⚠ Broken' : 'OK'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SheetSection>
            )}

            {/* ── Attack Roll Calculator ─────────────────────────────────── */}
            <SheetSection title="Attack Roll Calculator">
              <div className="space-y-3">
                {/* Crew attack bonuses */}
                {charCrew.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Assigned Crew</p>
                    {charCrew.map(char => {
                      const shootBonus = calcShootBonus(char);
                      const pilotBonus = calcPilotBonus(char);
                      return (
                        <div key={char.id} className="flex items-center gap-3 p-2 rounded bg-gray-900/40 border border-gray-700/50">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-200 font-medium">{char.name || 'Unnamed'}</span>
                            <span className="text-xs text-gray-500 ml-2">{char.class} {char.level}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <div className="flex flex-col items-end gap-0.5">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-gray-600">Shoot</span>
                                <span className="text-xs font-mono text-red-300 w-8 text-right">{shootBonus >= 0 ? `+${shootBonus}` : shootBonus}</span>
                                <button onClick={() => rollAttack(`${char.name} (Shoot)`, shootBonus)}
                                  className="px-2 py-0.5 rounded text-[10px] bg-red-900/40 text-red-300 hover:bg-red-900/60 font-medium">Roll</button>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-gray-600">Pilot</span>
                                <span className="text-xs font-mono text-sky-300 w-8 text-right">{pilotBonus >= 0 ? `+${pilotBonus}` : pilotBonus}</span>
                                <button onClick={() => rollAttack(`${char.name} (Pilot)`, pilotBonus)}
                                  className="px-2 py-0.5 rounded text-[10px] bg-sky-900/40 text-sky-300 hover:bg-sky-900/60 font-medium">Roll</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 italic">No characters assigned to this ship. Assign crew in the General tab.</p>
                )}

                {/* Manual roll */}
                <div className="border-t border-gray-700/50 pt-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Manual Roll</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Bonus</span>
                    <input type="number" value={manualBonus} onChange={e => setManualBonus(e.target.value)}
                      className="w-16 bg-gray-900/60 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 text-center focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"/>
                    <button onClick={() => rollAttack('Manual', Number(manualBonus) || 0)}
                      className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium flex items-center gap-1.5 transition-colors">
                      <Dice6 size={14}/> Roll d20
                    </button>
                  </div>
                </div>

                {/* Last roll result */}
                {lastRoll && (
                  <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-900 border border-gray-600 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-lg text-gray-100 tabular-nums">{lastRoll.d20}</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{lastRoll.label}</p>
                      <p className="text-base font-bold text-gray-100">
                        d20({lastRoll.d20}) {lastRoll.bonus >= 0 ? '+' : '−'} {Math.abs(lastRoll.bonus)} = <span className={`text-lg ${lastRoll.d20 === 20 ? 'text-amber-300' : lastRoll.d20 === 1 ? 'text-red-400' : 'text-green-300'}`}>{lastRoll.d20 + lastRoll.bonus}</span>
                        {lastRoll.d20 === 20 && <span className="text-amber-400 ml-2 text-sm">NAT 20!</span>}
                        {lastRoll.d20 === 1  && <span className="text-red-400 ml-2 text-sm">Fumble</span>}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </SheetSection>

            {/* ── Crisis Table ───────────────────────────────────────────── */}
            <SheetSection title="Crisis Table">
              <div className="space-y-3">
                {/* Roll button */}
                <div className="flex items-center gap-3 flex-wrap">
                  <button onClick={rollCrisis}
                    className="px-4 py-2 rounded bg-red-800 hover:bg-red-700 text-white text-sm font-medium flex items-center gap-2 transition-colors">
                    <Dice6 size={16}/> Roll Crisis (d10)
                  </button>
                  {lastCrisisRoll && (
                    <button onClick={addCrisisFromRoll}
                      className="px-3 py-2 rounded bg-orange-900/50 text-orange-300 hover:bg-orange-900/80 text-xs font-medium transition-colors">
                      + Add to Active Crises
                    </button>
                  )}
                </div>

                {/* Last crisis roll result */}
                {lastCrisisRoll && (
                  <div className={`p-3 rounded-lg border ${lastCrisisRoll.type === 'acute' ? 'border-red-700 bg-red-900/15' : 'border-orange-800 bg-orange-900/10'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold font-mono text-gray-300">#{lastCrisisRoll.roll}</span>
                      <span className="font-semibold text-sm text-gray-100">{lastCrisisRoll.name}</span>
                      <span className={`text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded ${lastCrisisRoll.type === 'acute' ? 'bg-red-900/60 text-red-300' : 'bg-orange-900/60 text-orange-300'}`}>
                        {lastCrisisRoll.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{lastCrisisRoll.desc}</p>
                  </div>
                )}

                {/* Full table reference */}
                <details className="group">
                  <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-300 select-none">
                    Show full crisis table (d10)
                  </summary>
                  <div className="mt-2 space-y-1">
                    {CRISIS_TABLE.map(entry => (
                      <div key={entry.roll} className="flex items-start gap-2 text-xs py-1 border-b border-gray-800/60">
                        <span className="font-mono text-gray-500 w-4 flex-shrink-0 text-right">{entry.roll}</span>
                        <span className={`font-medium flex-shrink-0 w-36 ${entry.type === 'acute' ? 'text-red-300' : 'text-orange-300'}`}>{entry.name}</span>
                        <span className="text-gray-500 leading-relaxed">{entry.desc}</span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            </SheetSection>

            {/* ── Active Crises ──────────────────────────────────────────── */}
            <SheetSection title="Active Crises">
              <div className="space-y-3">
                {(ship.activeCrises ?? []).length === 0 && (
                  <p className="text-xs text-gray-600 italic">No active crises.</p>
                )}
                <div className="space-y-1.5">
                  {(ship.activeCrises ?? []).map(crisis => (
                    <div key={crisis.id} className={`flex items-start gap-2 p-2 rounded border ${crisis.resolved ? 'border-gray-700/40 bg-gray-900/10 opacity-60' : crisis.type === 'acute' ? 'border-red-700 bg-red-900/15' : 'border-orange-800 bg-orange-900/10'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded ${crisis.type === 'acute' ? 'bg-red-900/60 text-red-300' : 'bg-orange-900/60 text-orange-300'}`}>
                            {crisis.type}
                          </span>
                          {crisis.resolved && <span className="text-[10px] text-green-400 font-bold uppercase">Resolved</span>}
                        </div>
                        <p className={`text-sm ${crisis.resolved ? 'line-through text-gray-500' : 'text-gray-200'}`}>{crisis.description}</p>
                        {!crisis.resolved && <p className="text-[10px] text-gray-500 mt-0.5">Resolve with "Deal With a Crisis" — Skill check DC 10</p>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => toggleCrisisResolved(crisis.id)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${crisis.resolved ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-green-900/50 text-green-300 hover:bg-green-900'}`}>
                          {crisis.resolved ? 'Reopen' : 'Resolve'}
                        </button>
                        <button onClick={() => removeCrisis(crisis.id)}
                          className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-gray-700 transition-colors">
                          <X size={12}/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Add crisis manually */}
                <div className="pt-2 border-t border-gray-700/50">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Add Crisis Manually</p>
                  <div className="flex gap-2">
                    <input type="text" value={crisisDesc} onChange={e => setCrisisDesc(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && crisisDesc.trim()) { addCrisis(crisisDesc, crisisType); setCrisisDesc(''); }}}
                      placeholder="Describe the crisis…"
                      className="flex-1 bg-gray-900/60 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500"/>
                    <select value={crisisType} onChange={e => setCrisisType(e.target.value as ActiveCrisis['type'])}
                      className="bg-gray-900/60 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-amber-500">
                      <option value="continuing">Continuing</option>
                      <option value="acute">Acute</option>
                    </select>
                    <button onClick={() => { if (crisisDesc.trim()) { addCrisis(crisisDesc, crisisType); setCrisisDesc(''); }}}
                      disabled={!crisisDesc.trim()}
                      className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600 disabled:opacity-30 text-white text-sm font-medium transition-colors flex items-center gap-1">
                      <Plus size={14}/> Add
                    </button>
                  </div>
                </div>
              </div>
            </SheetSection>
          </>}

        </div>
      </div>

      {/* ── Character picker modal ──────────────────────────────────────────── */}
      {showCrewPicker && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex-shrink-0">
              <h3 className="text-gray-100 font-semibold text-lg mb-1">Add Character to Crew</h3>
              <p className="text-gray-500 text-xs">Click a character to toggle assignment.</p>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2">
              {characters.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No characters available.</p>
              ) : (
                characters.map(c => {
                  const assigned = (c.assignedShipIds ?? []).includes(ship.id);
                  return (
                    <button key={c.id} onClick={() => toggleCharacterCrew(c)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-center gap-3 ${assigned ? 'border-amber-600 bg-amber-900/20' : 'border-gray-700 bg-gray-800/60 hover:border-amber-700 hover:bg-gray-700/60'}`}>
                      {c.image && <img src={c.image} alt={c.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-600"/>}
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
    </div>
  );
}

function CostRow({ label, value, prominent }: { label: string; value: string; prominent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`font-bold tabular-nums text-right ${prominent ? 'text-amber-300 text-base' : 'text-gray-200 text-sm'}`}>{value}</span>
    </div>
  );
}
