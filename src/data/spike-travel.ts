/**
 * Spike-drive travel & navigation — *Stars Without Number (Revised)* pp.110–115.
 */

export const REFUEL_COST = 500;          // credits per load of spike fuel
export const SPIKE_BASE_DIFFICULTY = 7;  // base Int/Pilot check difficulty

export type RutterAge = 'uncharted' | 'over5y' | '1to5y' | 'under1y' | 'under1mo';

export const RUTTER_MODIFIERS: Record<RutterAge, { label: string; mod: number }> = {
  uncharted: { label: 'Totally uncharted (no rutter)', mod: 6 },
  over5y:    { label: 'Rutter more than 5 years old', mod: 2 },
  '1to5y':   { label: 'Rutter 1–5 years old', mod: 1 },
  under1y:   { label: 'Rutter less than a year old', mod: 0 },
  under1mo:  { label: 'Rutter less than a month old', mod: -2 },
};

export interface SpikeDrillPlan {
  driveRating: number;   // 1–6
  hexes: number;         // distance to target
  rutter: RutterAge;
  rushed: boolean;       // activation rushed (+2 difficulty, executes in 1 combat round)
  trim: boolean;         // trim the course (+2 difficulty, +1 effective rating for speed)
}

export interface SpikeDrillResult {
  inRange: boolean;
  /** Effective rating used for the speed calc (trimming adds 1, never exceeds range). */
  effectiveRating: number;
  /** Transit time in days = 6 × hexes ÷ effective rating (6 days/hex base). */
  travelDays: number;
  /** Final navigation check difficulty (an Int/Pilot check). 6 or less = automatic. */
  difficulty: number;
  /** True if difficulty ≤ 6 (too safe to risk a roll). */
  automatic: boolean;
  fuelLoads: number;
}

/** Compute travel time and the navigation difficulty for a planned drill. */
export function planSpikeDrill(plan: SpikeDrillPlan): SpikeDrillResult {
  const inRange = plan.hexes <= plan.driveRating && plan.hexes > 0;
  const effectiveRating = plan.driveRating + (plan.trim ? 1 : 0);
  const travelDays = effectiveRating > 0 ? (6 * plan.hexes) / effectiveRating : 0;

  let difficulty = SPIKE_BASE_DIFFICULTY;
  difficulty += RUTTER_MODIFIERS[plan.rutter].mod;
  difficulty += Math.floor(plan.hexes / 2);   // +1 per 2 full hexes of distance
  if (plan.trim) difficulty += 2;
  if (plan.rushed) difficulty += 2;

  return {
    inRange,
    effectiveRating,
    travelDays: Math.round(travelDays * 10) / 10,
    difficulty,
    automatic: difficulty <= 6,
    fuelLoads: 1,
  };
}

// ── Failed-navigation mishap table (3d6, p.115) ─────────────────────────────────
export interface SpikeMishap { min: number; max: number; text: string; }

export const SPIKE_MISHAPS: SpikeMishap[] = [
  { min: 3, max: 3, text: 'Catastrophic dimensional energy incursion. Ship emerges around a star within 1d6 hexes of the target, with drive and all systems destroyed.' },
  { min: 4, max: 5, text: 'Shear surge. Ship emerges around the star nearest the drill origin; 50% chance each system is disabled until repaired. If the spike drive is disabled, treat as a 3.' },
  { min: 6, max: 8, text: 'Power spike. One system disabled until repaired; ship stuck in transit for full base time before another Pilot check. If the spike drive fails, treat as a 3.' },
  { min: 9, max: 12, text: 'Ship off course. Spend base time in transit, then make another Pilot check.' },
  { min: 13, max: 15, text: 'Ship off course, but detected early. Make another Pilot check.' },
  { min: 16, max: 17, text: 'Drill successful, but takes twice base time.' },
  { min: 18, max: 18, text: 'Drill successful and on time, by blind luck.' },
];

export function roll3d6(): number {
  return (Math.floor(Math.random() * 6) + 1) * 1
    + (Math.floor(Math.random() * 6) + 1)
    + (Math.floor(Math.random() * 6) + 1);
}

export function rollSpikeMishap(): { roll: number; text: string } {
  const roll = roll3d6();
  // Clamp 13–16/17 boundary: row covers 13–16 and 17 separately.
  const row = SPIKE_MISHAPS.find(r => roll >= r.min && roll <= r.max) ?? SPIKE_MISHAPS[SPIKE_MISHAPS.length - 1];
  return { roll, text: row.text };
}
