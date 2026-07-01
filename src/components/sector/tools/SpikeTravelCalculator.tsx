import { useState } from 'react';
import { Dices, Rocket, Fuel } from 'lucide-react';
import {
  planSpikeDrill, rollSpikeMishap, RUTTER_MODIFIERS, REFUEL_COST,
  type RutterAge,
} from '../../../data/spike-travel';

interface Props {
  /** Prefill the drive rating (e.g. from a ship). */
  initialDriveRating?: number;
  /** When supplied, the calculator tracks fuel: a drill needs (and spends) one load. */
  fuel?: { current: number; max: number };
  /** Called when a drill is executed — spend one fuel load. */
  onDrill?: () => void;
  /** Called by the Refuel button. */
  onRefuel?: () => void;
}

/** Spike-drive travel & navigation calculator (pp.110–115). */
export default function SpikeTravelCalculator({ initialDriveRating, fuel, onDrill, onRefuel }: Props = {}) {
  const [driveRating, setDriveRating] = useState(initialDriveRating ?? 2);
  const [hexes, setHexes] = useState(1);
  const [rutter, setRutter] = useState<RutterAge>('under1y');
  const [rushed, setRushed] = useState(false);
  const [trim, setTrim] = useState(false);
  const [check, setCheck] = useState<{ roll: number; total: number; success: boolean } | null>(null);
  const [mishap, setMishap] = useState<{ roll: number; text: string } | null>(null);

  const plan = planSpikeDrill({ driveRating, hexes, rutter, rushed, trim });
  const outOfFuel = fuel != null && fuel.current <= 0;

  function rollCheck(pilotMod: number) {
    if (outOfFuel) return;
    onDrill?.();
    const r = (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1);
    const total = r + pilotMod;
    const success = plan.automatic || total >= plan.difficulty;
    setCheck({ roll: r, total, success });
    setMishap(success ? null : rollSpikeMishap());
  }

  function executeAutoDrill() {
    if (outOfFuel) return;
    onDrill?.();
    setCheck({ roll: 0, total: 0, success: true });
    setMishap(null);
  }

  return (
    <div className="space-y-4">
      {fuel != null && (
        <div className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2">
          <Fuel size={15} className={outOfFuel ? 'text-red-400' : 'text-emerald-400'} />
          <span className="text-sm text-gray-300">Spike fuel: <span className={`font-bold ${outOfFuel ? 'text-red-300' : 'text-emerald-300'}`}>{fuel.current}/{fuel.max}</span> load{fuel.max === 1 ? '' : 's'}</span>
          <button
            onClick={onRefuel}
            disabled={fuel.current >= fuel.max}
            className="ml-auto text-xs px-2.5 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-200 transition-colors"
            title={`${REFUEL_COST} cr per load`}
          >
            Refuel ({REFUEL_COST} cr/load)
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Drive rating</span>
          <select className="input text-sm" value={driveRating} onChange={e => { setDriveRating(Number(e.target.value)); setCheck(null); setMishap(null); }}>
            {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>Drive-{n}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Distance (hexes)</span>
          <input type="number" min={1} max={6} className="input text-sm" value={hexes} onChange={e => { setHexes(Math.max(1, Number(e.target.value))); setCheck(null); setMishap(null); }} />
        </label>
      </div>

      <label className="text-sm block">
        <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Rutter (course record)</span>
        <select className="input text-sm" value={rutter} onChange={e => { setRutter(e.target.value as RutterAge); setCheck(null); setMishap(null); }}>
          {(Object.keys(RUTTER_MODIFIERS) as RutterAge[]).map(k => (
            <option key={k} value={k}>{RUTTER_MODIFIERS[k].label} ({RUTTER_MODIFIERS[k].mod >= 0 ? '+' : ''}{RUTTER_MODIFIERS[k].mod})</option>
          ))}
        </select>
      </label>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={trim} onChange={e => { setTrim(e.target.checked); setCheck(null); setMishap(null); }} />
          Trim course (+2 diff, +1 speed)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={rushed} onChange={e => { setRushed(e.target.checked); setCheck(null); setMishap(null); }} />
          Rushed (+2 diff)
        </label>
      </div>

      {/* Results */}
      <div className={`rounded-lg border p-4 ${plan.inRange ? 'border-gray-700 bg-gray-800/50' : 'border-red-800/60 bg-red-900/15'}`}>
        {!plan.inRange ? (
          <p className="text-sm text-red-300">Target is out of range — a drive-{driveRating} reaches at most {driveRating} hex{driveRating > 1 ? 'es' : ''}.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <span className="text-xs uppercase tracking-wider text-gray-500 block">Transit</span>
              <span className="text-lg font-bold text-sky-300">{plan.travelDays} days</span>
              <span className="text-[10px] text-gray-600 block">6 × {hexes} ÷ {plan.effectiveRating}</span>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-gray-500 block">Nav difficulty</span>
              <span className="text-lg font-bold text-amber-300">{plan.automatic ? 'auto' : plan.difficulty}</span>
              <span className="text-[10px] text-gray-600 block">Int/Pilot check</span>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-gray-500 block">Fuel</span>
              <span className="text-lg font-bold text-emerald-300">{plan.fuelLoads} load</span>
              <span className="text-[10px] text-gray-600 block">{REFUEL_COST} cr/load</span>
            </div>
          </div>
        )}
      </div>

      {outOfFuel && plan.inRange && (
        <p className="text-xs text-red-300 flex items-center gap-1.5"><Fuel size={12} /> No spike fuel — refuel before drilling.</p>
      )}

      {plan.inRange && !plan.automatic && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Roll nav check with Int/Pilot mod:</span>
            {[0, 1, 2, 3].map(m => (
              <button key={m} disabled={outOfFuel} onClick={() => rollCheck(m)} className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-200 text-xs font-medium transition-colors">+{m}</button>
            ))}
          </div>
          {check && (
            <div className={`rounded-lg border p-3 ${check.success ? 'border-emerald-800/60 bg-emerald-900/15' : 'border-red-800/60 bg-red-900/15'}`}>
              <p className="text-sm font-mono text-gray-200 flex items-center gap-2">
                <Dices size={14} /> 2d6={check.roll} → {check.total} vs {plan.difficulty}: {check.success ? 'SUCCESS' : 'FAILED'}
              </p>
              {mishap && (
                <p className="text-xs text-red-300 mt-2"><span className="font-semibold">Mishap (3d6={mishap.roll}):</span> {mishap.text}</p>
              )}
            </div>
          )}
        </div>
      )}

      {plan.automatic && plan.inRange && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 italic flex items-center gap-1.5"><Rocket size={12} /> Difficulty 6 or less — the drill is too safe and simple to risk failure.</p>
          {fuel != null && (
            <button onClick={executeAutoDrill} disabled={outOfFuel} className="text-xs px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 disabled:opacity-40 text-white font-medium transition-colors">
              Execute drill (−1 fuel)
            </button>
          )}
          {check?.success && fuel != null && <p className="text-xs text-emerald-300">Drill complete.</p>}
        </div>
      )}
    </div>
  );
}
