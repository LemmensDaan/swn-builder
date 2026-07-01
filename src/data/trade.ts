/**
 * Speculative / merchant trade rules — Stars Without Number Revised, pp. 237-238.
 *
 * Quick-trade system for PCs scrounging marginal shipments.
 *
 * Goods tiers (buy price at source world):
 *   bulk_goods      2d6 ×  10 cr/ton
 *   finished_goods  2d6 × 100 cr/ton
 *   expensive_goods 2d6 × 1,000 cr/ton
 *
 * Sell price at destination (roll 2d6+1, multiply by tier multiplier):
 *   bulk_goods      (2d6+1) ×  10 cr/ton
 *   finished_goods  (2d6+1) × 100 cr/ton
 *   expensive_goods (2d6+1) × 1,000 cr/ton
 *
 * Bargaining (buy or sell): Cha/Trade opposed by seller's Wis/Trade.
 *   Buy success:  price × (1 − 0.10 × tradeSkillLevel)
 *   Sell success: price × (1 + 0.10 × tradeSkillLevel)
 *
 * Cargo loss risk: roll 1d6 (−1 if bargaining used).
 *   On 1 or less → cargo is lost/stolen/fake.
 *   Applies at both buy and sell ends.
 */

export type GoodsTier = 'bulk_goods' | 'finished_goods' | 'expensive_goods';

export interface GoodsTierDef {
  id: GoodsTier;
  label: string;
  description: string;
  /** Multiplier on the 2d6 roll for base buy price per ton */
  buyMultiplier: number;
  /** Multiplier on the (2d6+1) roll for sell price per ton */
  sellMultiplier: number;
}

export const GOODS_TIERS: GoodsTierDef[] = [
  {
    id: 'bulk_goods',
    label: 'Bulk Goods',
    description: 'Cheap bulk commodities a world might reasonably produce',
    buyMultiplier: 10,
    sellMultiplier: 10,
  },
  {
    id: 'finished_goods',
    label: 'Finished Goods',
    description: 'Ordinary manufactured/finished goods',
    buyMultiplier: 100,
    sellMultiplier: 100,
  },
  {
    id: 'expensive_goods',
    label: 'High-Tech / Expensive Goods',
    description: 'High-tech or expensive luxury products',
    buyMultiplier: 1_000,
    sellMultiplier: 1_000,
  },
];

/**
 * Simulate a single 2d6 roll (1-6 each die).
 */
export function roll2d6(): number {
  return Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
}

/**
 * Simulate a single d6 roll.
 */
export function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * Calculate the buy price per ton for a goods tier.
 * @param tierMultiplier  The tier's buyMultiplier (10 / 100 / 1000)
 * @param roll2d6Value    The 2d6 result (2–12)
 * @param tons            Number of tons
 * @param tradeSkillLevel Bargainer's Trade skill level (0–4+); 0 = no bargaining
 * @param bargainSuccess  Whether the Cha/Trade bargaining check succeeded
 */
export function calcBuyPrice(
  tierMultiplier: number,
  roll2d6Value: number,
  tons: number,
  tradeSkillLevel: number,
  bargainSuccess: boolean,
): number {
  const basePerTon = roll2d6Value * tierMultiplier;
  const discount = bargainSuccess && tradeSkillLevel > 0 ? tradeSkillLevel * 0.1 : 0;
  return Math.round(basePerTon * (1 - discount) * tons);
}

/**
 * Calculate the sell price per ton at a destination world.
 * @param tierMultiplier  The tier's sellMultiplier (10 / 100 / 1000)
 * @param roll2d6Plus1    The (2d6+1) result (3–13)
 * @param tons            Number of tons
 * @param tradeSkillLevel Bargainer's Trade skill level (0–4+); 0 = no bargaining
 * @param bargainSuccess  Whether the Cha/Trade bargaining check succeeded
 */
export function calcSellPrice(
  tierMultiplier: number,
  roll2d6Plus1: number,
  tons: number,
  tradeSkillLevel: number,
  bargainSuccess: boolean,
): number {
  const basePerTon = roll2d6Plus1 * tierMultiplier;
  const bonus = bargainSuccess && tradeSkillLevel > 0 ? tradeSkillLevel * 0.1 : 0;
  return Math.round(basePerTon * (1 + bonus) * tons);
}

/**
 * Determine if a cargo loss event occurs.
 * @param bargained Whether the party tried to get a better price (−1 to d6)
 * @param rollD6Value The raw d6 roll
 */
export function isCargoLost(rollD6Value: number, bargained: boolean): boolean {
  return (rollD6Value - (bargained ? 1 : 0)) <= 1;
}
