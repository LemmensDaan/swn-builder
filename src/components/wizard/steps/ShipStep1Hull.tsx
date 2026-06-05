import type { Ship, HullClass } from '../../../types/ship';
import { HULL_TYPES } from '../../../data/ships';

interface Props {
  ship: Ship;
  onChange: (patch: Partial<Ship>) => void;
}

const CLASS_COLOR: Record<HullClass, string> = {
  Fighter: 'text-sky-400 bg-sky-900/30 border-sky-700/50',
  Frigate: 'text-amber-400 bg-amber-900/30 border-amber-700/50',
  Cruiser: 'text-green-400 bg-green-900/30 border-green-700/50',
  Capital: 'text-red-400 bg-red-900/30 border-red-700/50',
};

const HULL_DESCRIPTIONS: Record<string, string> = {
  'strike-fighter':  'A single-seat combat vessel optimized for speed and firepower. Fragile but deadly in the right hands.',
  'shuttle':         'A versatile light transport used across the sector for passengers and small cargo runs.',
  'free-merchant':   'The workhorse of independent traders. Rugged, adaptable, and found on every frontier world.',
  'patrol-boat':     'A fast military vessel designed for system patrol, customs enforcement, and rapid interdiction.',
  'corvette':        'A heavily armored multi-role warship balancing firepower, durability, and crew capacity.',
  'heavy-frigate':   'A powerful fleet escort with significant firepower and the crew to crew it effectively.',
  'bulk-freighter':  'A massive cargo hauler trading speed and armor for unmatched cargo capacity.',
  'fleet-cruiser':   'A capital-scale warship forming the backbone of any serious planetary defense fleet.',
  'battleship':      'The pinnacle of warship design — massively armored and armed, requiring a small army to crew.',
  'carrier':         'A mobile flight deck capable of deploying entire wings of fighter-class ships.',
  'small-station':   'A modular orbital platform serving as a waystation, refueling depot, or military outpost.',
  'large-station':   'A massive permanent installation rivaling small moons in scale and strategic importance.',
};

function formatCredits(n: number): string {
  return n.toLocaleString('en-US') + ' cr';
}

export default function ShipStep1Hull({ ship, onChange }: Props) {
  return (
    <div className="space-y-6">
      <Field label="Ship Name" required>
        <input
          className="input"
          value={ship.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="e.g. Pale Horizon"
        />
      </Field>

      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Hull Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {HULL_TYPES.map(hull => {
            const isSelected = ship.hullId === hull.id;
            return (
              <button
                key={hull.id}
                onClick={() =>
                  onChange({
                    hullId: hull.id,
                    hitPoints: { current: hull.hp, max: hull.hp },
                    currentCrew: hull.crewMin,
                  })
                }
                className={`text-left p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-amber-500 bg-amber-900/20'
                    : 'glass-card border-gray-700 hover:border-gray-500'
                }`}
              >
                {/* Hull name */}
                <div className="font-semibold text-sm text-gray-100 leading-tight mb-1">
                  {hull.name}
                </div>

                {/* Class badge */}
                <div className="mb-2">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded border font-medium ${CLASS_COLOR[hull.class]}`}
                  >
                    {hull.class}
                  </span>
                  {hull.isStation && (
                    <span className="ml-1 text-xs px-1.5 py-0.5 rounded border text-purple-400 bg-purple-900/30 border-purple-700/50 font-medium">
                      Station
                    </span>
                  )}
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs mb-2">
                  <Stat label="Speed" value={hull.speed === null ? 'Station' : String(hull.speed)} />
                  <Stat label="Armor" value={String(hull.armor)} />
                  <Stat label="HP" value={String(hull.hp)} />
                  <Stat label="AC" value={String(hull.ac)} />
                </div>

                {/* Power / Mass / Hardpoints */}
                <div className="text-xs text-gray-400 mb-1 leading-tight">
                  <span className="text-gray-300">{hull.powerFree}</span> pwr &middot;{' '}
                  <span className="text-gray-300">{hull.massFree}</span> mass &middot;{' '}
                  <span className="text-gray-300">{hull.hardpoints}</span> hp
                </div>

                {/* Crew */}
                <div className="text-xs text-gray-400 mb-2 leading-tight">
                  Crew{' '}
                  <span className="text-gray-300">
                    {hull.crewMin}–{hull.crewMax}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-500 leading-snug line-clamp-2">
                  {HULL_DESCRIPTIONS[hull.id] ?? ''}
                </p>

                {/* Cost */}
                <div className="mt-2 text-xs text-amber-400 font-medium">
                  {formatCredits(hull.cost)}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-300">
        {label} {required && <span className="text-amber-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200">{value}</span>
    </div>
  );
}
