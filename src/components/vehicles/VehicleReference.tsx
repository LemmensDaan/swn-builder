/**
 * VehicleReference — Vehicles, Drones, and Mechs reference viewer
 * Stars Without Number Revised pp. 82–86 (vehicles/drones) and pp. 302–313 (mechs)
 *
 * Self-contained component; wire into HomeScreen as a new tab.
 */

import { useState } from 'react';
import {
  VEHICLES,
  DRONES,
  DRONE_FITTINGS,
  MECH_HULLS,
  MECH_FITTINGS,
  MECH_DEFENSES,
  MECH_WEAPONS,
  type MechClass,
} from '../../data/vehicles';
import MechRoster from './MechRoster';

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">{title}</h2>
      {children}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center bg-gray-800 rounded px-2 py-1 min-w-[44px]">
      <span className="text-[10px] text-gray-500 uppercase tracking-wide leading-tight">{label}</span>
      <span className="text-xs font-bold text-gray-200">{value}</span>
    </div>
  );
}

function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: 'gray' | 'amber' | 'violet' | 'sky' | 'green' | 'red' }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-800 text-gray-400',
    amber: 'bg-amber-900/50 text-amber-300',
    violet: 'bg-violet-900/40 text-violet-300',
    sky: 'bg-sky-900/40 text-sky-300',
    green: 'bg-green-900/30 text-green-300',
    red: 'bg-red-900/40 text-red-300',
  };
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${colors[color]}`}>{children}</span>;
}

// ── Tab nav ───────────────────────────────────────────────────────────────────

type Tab = 'vehicles' | 'drones' | 'mechs' | 'builder';

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active ? 'bg-amber-700 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
      }`}>
      {label}
    </button>
  );
}

// ── Vehicles tab ──────────────────────────────────────────────────────────────

function VehiclesTab() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 leading-relaxed">
        Vehicles require 1 power cell / 1 refueling per 6 hours. Speed is subtracted as penalty from Pilot checks when chasing.
        Armor subtracts from damage (except Heavy weapons). At half HP, Speed halved and flying vehicles must land.
        Crew max listed; only 1 actually needed to operate.
      </p>
      <div className="space-y-3">
        {VEHICLES.map(v => (
          <div key={v.id} className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <span className="font-semibold text-gray-200">{v.name}</span>
                <span className="ml-2 text-xs text-gray-500">{v.cost.toLocaleString()} cr</span>
                <Badge color="sky">TL{v.tl}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              <StatPill label="Speed" value={v.speed} />
              <StatPill label="Armor" value={v.armorSpecial ? 'Special' : v.armor} />
              <StatPill label="HP" value={v.hp} />
              <StatPill label="Crew" value={v.crew} />
              <StatPill label="Tons" value={v.tonnage} />
              {v.weapons > 0 && <StatPill label="Weapons" value={v.weapons} />}
            </div>
            <p className="text-xs text-gray-500">{v.description}</p>
            {v.armorSpecial && (
              <p className="text-xs text-red-400 mt-1">{v.armorSpecial}</p>
            )}
          </div>
        ))}
      </div>
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
        <p className="text-xs font-semibold text-amber-400 mb-1">Vehicle Weaponry</p>
        <p className="text-xs text-gray-500">
          Groundcars/gravcars: 1 weapon. ATVs/helicopters/atmoflyers/gravflyers: 2 weapons. Gravtanks: 6 weapons.
          Heavy weapons count as 2 weapon slots. Each weapon needs its own gunner (Shoot skill; Pilot allowed for nose-mount).
          Gravtank advanced targeting: all weapons targeted and fired by one gunner.
        </p>
      </div>
    </div>
  );
}

// ── Drones tab ────────────────────────────────────────────────────────────────

function DronesTab() {
  const [showFittings, setShowFittings] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 leading-relaxed">
        Drones require a cybernetic control link or handheld unit. Handheld units control only 1 drone; control links handle 1 + Program skill.
        Each drone consumes 1 type A cell per hour. Pilot spends Main Action each round to command (move OR shoot). Drones fly 30 m/round in combat, 100 kph out of combat.
        Spot drone: Wis/Notice DC 10 (observation) or DC 8 (combat range). Secure facilities auto-detect.
        Repair: 1 spare part per 5 HP lost + 1 hour (Fix-0+).
      </p>

      <div className="space-y-3">
        {DRONES.map(d => (
          <div key={d.id} className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-200">{d.name}</span>
                <span className="text-xs text-gray-500">{d.cost.toLocaleString()} cr</span>
                <Badge color="sky">TL{d.tl}</Badge>
                {d.special && <Badge color="amber">Special</Badge>}
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              <StatPill label="Fittings" value={d.fittings} />
              <StatPill label="AC" value={d.ac} />
              <StatPill label="Enc" value={d.enc} />
              <StatPill label="HP" value={d.hp} />
              <StatPill label="Range" value={d.range} />
            </div>
            <p className="text-xs text-gray-500">{d.description}</p>
            {d.special && <p className="text-xs text-amber-400 mt-1">{d.special}</p>}
          </div>
        ))}
      </div>

      <div>
        <button onClick={() => setShowFittings(f => !f)}
          className="text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors">
          {showFittings ? 'Hide' : 'Show'} Drone Fittings ({DRONE_FITTINGS.length})
        </button>
        {showFittings && (
          <div className="mt-2 space-y-2">
            {DRONE_FITTINGS.map(f => (
              <div key={f.id} className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-gray-200">{f.name}</span>
                  <span className="text-xs text-gray-500">{f.cost.toLocaleString()} cr</span>
                  <Badge color="sky">TL{f.tl}</Badge>
                </div>
                <p className="text-xs text-gray-500">{f.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mechs tab ─────────────────────────────────────────────────────────────────

type MechView = 'hulls' | 'fittings' | 'defenses' | 'weapons';

function MechsTab() {
  const [view, setView] = useState<MechView>('hulls');
  const [hullFilter, setHullFilter] = useState<MechClass | 'All'>('All');
  const [showPsiOnly, setShowPsiOnly] = useState(false);

  const classColors: Record<MechClass, string> = {
    Suit: 'green',
    Light: 'sky',
    Heavy: 'red',
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 leading-relaxed">
        Mechs operate up to 24 hours before maintenance required; each additional 2 hours adds −1 cumulative penalty to all hit rolls and skill checks.
        Suit armor does NOT apply vs. Heavy weapons; Light/Heavy mechs are immune to non-Heavy attacks.
        Repair: 500 cr/HP (suit), 1,000 cr/HP (light/heavy). Pilot must make Physical save if mech reaches 0 HP.
        Fitting costs: ×1 suit, ×3 light, ×6 heavy. Power/mass marked # scale ×1/×2/×4.
      </p>

      <div className="flex flex-wrap gap-1">
        {(['hulls', 'fittings', 'defenses', 'weapons'] as MechView[]).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wide transition-colors ${
              view === v ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}>
            {v}
          </button>
        ))}
      </div>

      {view === 'hulls' && (
        <div className="space-y-3">
          <div className="flex gap-1">
            {(['All', 'Suit', 'Light', 'Heavy'] as const).map(c => (
              <button key={c} onClick={() => setHullFilter(c)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  hullFilter === c ? 'bg-gray-600 text-gray-100' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                }`}>
                {c}
              </button>
            ))}
          </div>
          {MECH_HULLS.filter(h => hullFilter === 'All' || h.class === hullFilter).map(h => (
            <div key={h.id} className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-semibold text-gray-200">{h.name}</span>
                <span className="text-xs text-gray-500">{h.cost.toLocaleString()} cr</span>
                <Badge color={classColors[h.class] as any}>{h.class}</Badge>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                <StatPill label="Speed" value={h.speed} />
                <StatPill label="Armor" value={h.armor} />
                <StatPill label="HP" value={h.hp} />
                <StatPill label="AC" value={h.ac} />
                <StatPill label="Power" value={h.power} />
                <StatPill label="Mass" value={h.mass} />
                <StatPill label="Hard." value={h.hardpoints} />
                <StatPill label="Maint" value={`${h.maintenanceCost.toLocaleString()} cr`} />
              </div>
              <p className="text-xs text-gray-500">{h.description}</p>
              {h.armorNote && <p className="text-xs text-amber-400 mt-1">{h.armorNote}</p>}
            </div>
          ))}
        </div>
      )}

      {view === 'fittings' && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showPsiOnly} onChange={e => setShowPsiOnly(e.target.checked)}
              className="accent-violet-400" />
            <span className="text-xs text-gray-400">Show psi fittings only</span>
          </label>
          {MECH_FITTINGS.filter(f => !showPsiOnly || f.psi).map(f => (
            <div key={f.id} className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-semibold text-sm text-gray-200">{f.name}</span>
                <span className="text-xs text-gray-500">{f.baseCost.toLocaleString()} cr base</span>
                <Badge color={f.minClass === 'Suit' ? 'green' : f.minClass === 'Light' ? 'sky' : 'red'}>Min: {f.minClass}</Badge>
                {f.psi && <Badge color="violet">Psi</Badge>}
              </div>
              <div className="flex gap-1 mb-1">
                <StatPill label="Power" value={`${f.basePower}${f.powerScaled ? '#' : ''}`} />
                <StatPill label="Mass" value={`${f.baseMass}${f.massScaled ? '#' : ''}`} />
              </div>
              <p className="text-xs text-gray-500">{f.description}</p>
            </div>
          ))}
          <p className="text-xs text-gray-600"># = multiply by 2 for Light, ×4 for Heavy. Costs ×3 Light, ×6 Heavy.</p>
        </div>
      )}

      {view === 'defenses' && (
        <div className="space-y-3">
          {MECH_DEFENSES.map(d => (
            <div key={d.id} className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-semibold text-sm text-gray-200">{d.name}</span>
                <span className="text-xs text-gray-500">{d.baseCost.toLocaleString()} cr base</span>
                <Badge color={d.minClass === 'Suit' ? 'green' : d.minClass === 'Light' ? 'sky' : 'red'}>Min: {d.minClass}</Badge>
              </div>
              <div className="flex gap-1 mb-1">
                <StatPill label="Power" value={`${d.basePower}${d.powerScaled ? '#' : ''}`} />
                <StatPill label="Mass" value={`${d.baseMass}${d.massScaled ? '#' : ''}`} />
              </div>
              <p className="text-xs text-gray-500">{d.description}</p>
            </div>
          ))}
          <p className="text-xs text-gray-600"># = multiply by 2 for Light, ×4 for Heavy. Costs ×3 Light, ×6 Heavy (except Redundant Systems Buffer and Vanguard Plating — fixed costs).</p>
        </div>
      )}

      {view === 'weapons' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            All weapons use Shoot skill + Int or Dex modifier. After each fight where Ammo weapon was fired: Wis/Shoot DC 6 or ammo depleted (DC +1 per fight). Energy/melee/psi weapons never run out.
          </p>
          {MECH_WEAPONS.map(w => (
            <div key={w.id} className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-semibold text-sm text-gray-200">{w.name}</span>
                {w.cost > 0 && <span className="text-xs text-gray-500">{w.cost.toLocaleString()} cr</span>}
                <Badge color={w.minClass === 'Suit' ? 'green' : w.minClass === 'Light' ? 'sky' : 'red'}>Min: {w.minClass}</Badge>
                {w.qualities.map(q => (
                  <Badge key={q} color={q.startsWith('Psi') ? 'violet' : q.startsWith('AP') ? 'red' : q === 'Ammo' ? 'amber' : 'gray'}>{q}</Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 mb-1">
                <StatPill label="Dmg" value={w.damage} />
                <StatPill label="Power" value={w.power} />
                <StatPill label="Mass" value={w.mass} />
                <StatPill label="Hard." value={w.hardpoints} />
                <StatPill label="Range" value={w.range} />
              </div>
              <p className="text-xs text-gray-500">{w.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Mech builder scaling helper */}
      <Section title="Cost / Power / Mass Scaling Reference">
        <div className="text-xs text-gray-500 space-y-1">
          <p><span className="text-gray-300">Fitting/defense cost:</span> Suit ×1 · Light ×3 · Heavy ×6</p>
          <p><span className="text-gray-300">Power/mass marked #:</span> Suit ×1 · Light ×2 · Heavy ×4</p>
          <p><span className="text-gray-300">Repair cost:</span> 500 cr/HP (suit) · 1,000 cr/HP (light) · 1,000 cr/HP (heavy)</p>
          <p><span className="text-gray-300">Maintenance cost:</span> 500 cr (suit) · 1,000 cr (light) · 2,000 cr (heavy) per cycle</p>
          <p><span className="text-gray-300">Maintenance rate:</span> 1 tech can service per hour: Heavy×(Fix+1) · Light×2(Fix+1) · Suits×4(Fix+1)</p>
          <p><span className="text-gray-300">Mech movement:</span> Suit Speed×10 m/round · Light/Heavy Speed×20 m/round</p>
        </div>
      </Section>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function VehicleReference() {
  const [tab, setTab] = useState<Tab>('vehicles');

  return (
    <div className="min-h-screen bg-gray-950/50 text-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">Vehicles, Drones &amp; Mechs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Reference — <em>Stars Without Number Revised</em> pp. 82–86, 302–313
          </p>
        </div>

        <div className="flex gap-2 border-b border-gray-800 pb-2">
          <TabBtn label={`Vehicles (${VEHICLES.length})`} active={tab === 'vehicles'} onClick={() => setTab('vehicles')} />
          <TabBtn label={`Drones (${DRONES.length})`} active={tab === 'drones'} onClick={() => setTab('drones')} />
          <TabBtn label={`Mechs (${MECH_HULLS.length} hulls)`} active={tab === 'mechs'} onClick={() => setTab('mechs')} />
          <TabBtn label="Mech Builder" active={tab === 'builder'} onClick={() => setTab('builder')} />
        </div>

        {tab === 'vehicles' && <VehiclesTab />}
        {tab === 'drones' && <DronesTab />}
        {tab === 'mechs' && <MechsTab />}
        {tab === 'builder' && <MechRoster />}
      </div>
    </div>
  );
}
