import type { Ship } from '../../../types/ship';
import type { HullType } from '../../../data/ships';
import { DRIVE_UPGRADES, HULL_CLASS_ORDER, PM_MULT } from '../../../data/ships';

interface Props {
  ship: Ship;
  hull: HullType;
  onChange: (patch: Partial<Ship>) => void;
}

interface DriveOption {
  rating: number;
  cost: number;
  power: number;
  mass: number;
  minClass: typeof HULL_CLASS_ORDER[number];
}

function formatCredits(amount: number): string {
  return amount.toLocaleString('en-US') + ' cr';
}

function transitDays(rating: number): string {
  const raw = 6 / rating;
  // Express as a simple fraction or integer
  if (Number.isInteger(raw)) return `${raw} day/hex`;
  // Keep one decimal place
  return `${raw.toFixed(1)} days/hex`;
}

export default function ShipStep2Drive({ ship, hull, onChange }: Props) {
  if (hull.isStation) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Drive-1 is included in the hull cost. Upgrading to a higher drive rating increases
          interstellar range and transit speed.
        </p>
        <div className="glass-card rounded-lg p-4 text-sm text-amber-300">
          Stations are fixed installations and cannot mount a spike drive. Drive selection is
          not available for this hull type.
        </div>
      </div>
    );
  }

  const hullClassIndex = HULL_CLASS_ORDER.indexOf(hull.class);
  const mult = PM_MULT[hull.class];

  // Build the full list of 6 drive options including the free drive-1
  const driveOptions: DriveOption[] = [
    { rating: 1, cost: 0, power: 0, mass: 0, minClass: 'Fighter' },
    ...DRIVE_UPGRADES.map((d) => ({
      rating: d.rating,
      cost: d.cost,
      power: Math.ceil(d.power * mult),
      mass: Math.ceil(d.mass * mult),
      minClass: d.minClass,
    })),
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-400">
        Drive-1 is included in the hull cost. Upgrading to a higher drive rating increases
        interstellar range and transit speed.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {driveOptions.map((option) => {
          const minClassIndex = HULL_CLASS_ORDER.indexOf(option.minClass);
          const unavailable = minClassIndex > hullClassIndex;
          const selected = ship.driveRating === option.rating;

          let cardClass =
            'relative flex flex-col gap-2 rounded-lg border p-3 text-sm transition-all select-none ';

          if (unavailable) {
            cardClass += 'opacity-40 cursor-not-allowed border-gray-700 bg-gray-900/30';
          } else if (selected) {
            cardClass +=
              'cursor-pointer border-amber-400 bg-amber-900/30 ring-1 ring-amber-400';
          } else {
            cardClass +=
              'cursor-pointer border-gray-700 bg-gray-900/40 hover:border-gray-500 hover:bg-gray-800/50';
          }

          return (
            <button
              key={option.rating}
              type="button"
              disabled={unavailable}
              onClick={() => !unavailable && onChange({ driveRating: option.rating })}
              className={cardClass}
              aria-pressed={selected}
            >
              {/* Title */}
              <span
                className={`font-semibold ${selected ? 'text-amber-300' : 'text-gray-200'}`}
              >
                Drive-{option.rating}
              </span>

              {/* Range */}
              <span className="text-gray-400">
                <span className="text-gray-300">{option.rating}</span>{' '}
                {option.rating === 1 ? 'hex' : 'hexes'}
              </span>

              {/* Transit */}
              <span className="text-gray-400 text-xs">{transitDays(option.rating)}</span>

              {/* Cost */}
              <span className={option.cost === 0 ? 'text-green-400 text-xs' : 'text-xs text-gray-300'}>
                {option.cost === 0 ? 'Included' : formatCredits(option.cost)}
              </span>

              {/* Power / Mass */}
              {option.cost === 0 ? (
                <span className="text-xs text-gray-500">No cost</span>
              ) : (
                <span className="text-xs text-gray-400">
                  {option.power} power, {option.mass} mass
                </span>
              )}

              {/* Requires label for unavailable */}
              {unavailable && (
                <span className="text-xs text-red-400 font-medium mt-auto">
                  Requires {option.minClass}
                </span>
              )}

              {/* Selected indicator */}
              {selected && !unavailable && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-400" />
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500">
        The drive rating determines how many hexes a ship can traverse per spike drill on the
        sector map. A Drive-1 ship can reach systems within 1 hex; a Drive-6 ship can reach
        any system within 6 hexes in a single week-long transit. Higher ratings also reduce
        days-per-hex transit time (6 ÷ drive rating).
      </p>
    </div>
  );
}
