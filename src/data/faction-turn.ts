import type { Faction, FactionAsset, FactionAssetType } from '../types/sector';
import {
  RATING_COST, MAX_FACTION_RATING, factionMaxHp, REFERENCE_ASSETS,
  type ReferenceAsset, type FactionPreset,
} from './faction-assets';

// ── Dice ────────────────────────────────────────────────────────────────────

export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/** Roll a dice expression like "1d6", "2d8+2", "1d4+1", "1d4-1", "2d4", or a flat number. */
export function rollDamage(expr: string): number {
  if (!expr || expr === '—' || expr === '-') return 0;
  const m = expr.trim().match(/^(\d+)d(\d+)\s*([+-]\s*\d+)?$/i);
  if (!m) {
    const flat = Number(expr);
    return Number.isFinite(flat) ? Math.max(0, flat) : 0;
  }
  const count = Number(m[1]);
  const sides = Number(m[2]);
  const mod = m[3] ? Number(m[3].replace(/\s/g, '')) : 0;
  let total = mod;
  for (let i = 0; i < count; i++) total += rollDie(sides);
  return Math.max(0, total);
}

// ── FacCred economy (p.213–215) ───────────────────────────────────────────────

/** Per-turn income = ceil(Wealth/2) + floor((Force+Cunning)/4). */
export function factionIncome(f: Pick<Faction, 'force' | 'cunning' | 'wealth'>): number {
  return Math.ceil(f.wealth / 2) + Math.floor((f.force + f.cunning) / 4);
}

/** The attribute rating that caps how many assets of a type a faction may own. */
export function assetCap(f: Pick<Faction, 'force' | 'cunning' | 'wealth'>, type: FactionAssetType): number {
  return type === 'Force' ? f.force : type === 'Cunning' ? f.cunning : f.wealth;
}

/** Count of a faction's assets of a given ruling attribute (Bases of Influence don't count against the cap). */
export function assetsOfType(f: Faction, type: FactionAssetType): number {
  return f.assets.filter(a => a.type === type && !a.isBaseOfInfluence).length;
}

/**
 * Per-turn maintenance = sum of each asset's maintenance cost, plus 1 FacCred for
 * every asset owned beyond the faction's rating in that asset's attribute (p.213).
 */
export function factionMaintenance(f: Faction): number {
  let total = 0;
  for (const a of f.assets) total += a.maintenance ?? 0;
  for (const type of ['Force', 'Cunning', 'Wealth'] as FactionAssetType[]) {
    const over = assetsOfType(f, type) - assetCap(f, type);
    if (over > 0) total += over;
  }
  return total;
}

/** XP needed to raise an attribute from its current rating to the next (null if maxed). */
export function xpToRaise(currentRating: number): number | null {
  if (currentRating >= MAX_FACTION_RATING) return null;
  return RATING_COST[currentRating + 1] ?? null;
}

// ── Attack resolution (p.214) ─────────────────────────────────────────────────

export interface ParsedAttack {
  atkAttr: FactionAssetType | null;
  defAttr: FactionAssetType | null;
  damage: string;
  special: boolean;
}

/** Parse an Attack line like "Force vs Cunning 1d6" / "Cunning vs Cunning (special)" / "—". */
export function parseAttackLine(line: string): ParsedAttack {
  if (!line || line === '—') return { atkAttr: null, defAttr: null, damage: '', special: false };
  const m = line.match(/(Force|Cunning|Wealth)\s+vs\s+(Force|Cunning|Wealth)\s*(.*)$/i);
  if (!m) return { atkAttr: null, defAttr: null, damage: '', special: false };
  const cap = (s: string) => (s[0].toUpperCase() + s.slice(1).toLowerCase()) as FactionAssetType;
  const rest = (m[3] ?? '').trim();
  const special = /special/i.test(rest) || rest === '';
  return { atkAttr: cap(m[1]), defAttr: cap(m[2]), damage: special ? '' : rest, special };
}

function ratingFor(f: Faction, attr: FactionAssetType | null): number {
  if (attr === 'Force') return f.force;
  if (attr === 'Cunning') return f.cunning;
  if (attr === 'Wealth') return f.wealth;
  return 0;
}

/** Roll N d10 and keep the highest (extra dice come from tags); N≥1. */
function rollKeepHighest(dice: number, rerollOnes: boolean): { kept: number; rolls: number[] } {
  const n = Math.max(1, dice);
  const rolls: number[] = [];
  for (let i = 0; i < n; i++) {
    let r = rollDie(10);
    if (rerollOnes && r === 1) r = rollDie(10);
    rolls.push(r);
  }
  return { kept: Math.max(...rolls), rolls };
}

export interface AttackOutcome {
  parsed: ParsedAttack;
  atkRoll: number;
  defRoll: number;
  atkTotal: number;
  defTotal: number;
  result: 'hit' | 'miss' | 'tie';
  damageToDefender: number;   // applied on hit or tie
  damageToAttacker: number;   // counterattack, applied on miss or tie
  log: string;
}

/**
 * Resolve one attacking asset against one defending asset.
 * Tag bonus dice (Warlike/Machiavellian/Plutocratic/etc.) and Fanatical reroll/lose-tie
 * are folded in via the bonus parameters.
 */
export function resolveAttack(
  attacker: Faction,
  attackerAsset: FactionAsset,
  defender: Faction,
  defenderAsset: FactionAsset,
  opts: { atkBonusDice?: number; defBonusDice?: number } = {},
): AttackOutcome {
  const parsed = parseAttackLine(attackerAsset.attack);
  const atkRating = ratingFor(attacker, parsed.atkAttr);
  const defRating = ratingFor(defender, parsed.defAttr);

  const atkReroll = attacker.tags.includes('Fanatical');
  const defReroll = defender.tags.includes('Fanatical');
  const atk = rollKeepHighest(1 + (opts.atkBonusDice ?? 0), atkReroll);
  const def = rollKeepHighest(1 + (opts.defBonusDice ?? 0), defReroll);

  const atkTotal = atk.kept + atkRating;
  const defTotal = def.kept + defRating;

  let result: 'hit' | 'miss' | 'tie';
  if (atkTotal > defTotal) result = 'hit';
  else if (atkTotal < defTotal) result = 'miss';
  else result = 'tie';

  // Fanatical always loses ties.
  if (result === 'tie' && attacker.tags.includes('Fanatical')) result = 'miss';

  const damageToDefender = result === 'hit' || result === 'tie' ? rollDamage(parsed.damage) : 0;
  const damageToAttacker = result === 'miss' || result === 'tie' ? rollDamage(defenderAsset.counter) : 0;

  const log =
    `${attackerAsset.name} (${atk.kept}+${atkRating}=${atkTotal}) vs ` +
    `${defenderAsset.name} (${def.kept}+${defRating}=${defTotal}): ` +
    (result === 'hit' ? `HIT for ${damageToDefender}`
      : result === 'miss' ? `MISS, counter ${damageToAttacker}`
      : `TIE — ${damageToDefender} dealt, ${damageToAttacker} countered`);

  return { parsed, atkRoll: atk.kept, defRoll: def.kept, atkTotal, defTotal, result, damageToDefender, damageToAttacker, log };
}

// ── Tag bonus dice (the automatable subset of FACTION_TAGS_FULL) ────────────────

/** Extra attack dice this faction's tags grant for an attack with the given ruling attribute. */
export function tagAttackBonusDice(
  f: Faction,
  atkAttr: FactionAssetType | null,
  opts: { defenderAssetTl?: number; seize?: boolean } = {},
): number {
  let dice = 0;
  if (atkAttr === 'Force' && f.tags.includes('Warlike')) dice += 1;
  if (atkAttr === 'Cunning' && f.tags.includes('Machiavellian')) dice += 1;
  if (atkAttr === 'Wealth' && f.tags.includes('Plutocratic')) dice += 1;
  // Perimeter Agency: extra die attacking a TL5-requiring asset (p.224).
  if ((opts.defenderAssetTl ?? 0) >= 5 && f.tags.includes('Perimeter Agency')) dice += 1;
  // Imperialists: extra die for attacks made as part of a Seize Planet action.
  if (opts.seize && f.tags.includes('Imperialists')) dice += 1;
  return dice;
}

/** Extra defense dice this faction's tags grant against an attack with the given ruling attribute. */
export function tagDefenseBonusDice(
  f: Faction,
  atkAttr: FactionAssetType | null,
  opts: { onHomeworld?: boolean; defenderAssetTl?: number } = {},
): number {
  let dice = 0;
  if (atkAttr === 'Cunning' && f.tags.includes('Theocratic')) dice += 1;
  if (atkAttr === 'Wealth' && f.tags.includes('Exchange Consulate')) dice += 1;
  if (opts.onHomeworld && f.tags.includes('Deep Rooted')) dice += 1;
  // Savage: extra die defending with a TL0-requiring asset (p.225).
  if ((opts.defenderAssetTl ?? -1) === 0 && f.tags.includes('Savage')) dice += 1;
  return dice;
}

// ── Tag effects on the buy / destroy hooks ──────────────────────────────────────

/** All assets a Secretive faction buys begin Stealthed (p.225). */
export function buysStealthed(f: Faction): boolean {
  return f.tags.includes('Secretive');
}

/** Preceptor Archive: TL4+ assets cost 1 less FacCred (p.224). */
export function tagBuyCost(f: Faction, ref: { cost: number; tl: number }): number {
  let cost = ref.cost;
  if (ref.tl >= 4 && f.tags.includes('Preceptor Archive')) cost = Math.max(0, cost - 1);
  return cost;
}

/** Scavengers gain 1 FacCred whenever they destroy an asset or lose one (p.225). */
export function scavengerGain(f: Faction): number {
  return f.tags.includes('Scavengers') ? 1 : 0;
}

/** FacCreds an attacking asset steals from the defender on a successful hit (Franchise/Blockade Fleet). */
export function onHitFacCredSteal(asset: FactionAsset): number {
  if (asset.name === 'Franchise') return 1;
  if (asset.name === 'Blockade Fleet') return rollDie(4);
  return 0;
}

// ── Asset special-ability automation (p.218–227) ───────────────────────────────

export interface AbilityResult {
  facCredDelta: number;
  selfDestroyed?: boolean;
  log: string;
}

/**
 * Execute the automatable FacCred-generating asset abilities. Returns null for
 * abilities that need GM adjudication (moves, reveals, attaches, transfers).
 */
export function runAssetAbility(asset: FactionAsset): AbilityResult | null {
  switch (asset.name) {
    case 'Harvesters': {
      const r = rollDie(6);
      const gain = r >= 3 ? 1 : 0;
      return { facCredDelta: gain, log: `Harvesters roll 1d6=${r}: ${gain ? '+1 FacCred' : 'no gain'}` };
    }
    case 'Postech Industry': {
      const r = rollDie(6);
      if (r === 1) return { facCredDelta: -1, log: 'Postech Industry roll 1d6=1: lose 1 FacCred (destroyed if unpaid)' };
      const gain = r <= 4 ? 1 : 2;
      return { facCredDelta: gain, log: `Postech Industry roll 1d6=${r}: +${gain} FacCreds` };
    }
    case 'Venture Capital': {
      const r = rollDie(8);
      if (r === 1) return { facCredDelta: 0, selfDestroyed: true, log: 'Venture Capital roll 1d8=1: asset destroyed!' };
      const gain = r <= 3 ? 1 : r <= 7 ? 2 : 3;
      return { facCredDelta: gain, log: `Venture Capital roll 1d8=${r}: +${gain} FacCreds` };
    }
    case 'Pretech Manufactory': {
      const r = rollDie(8);
      const gain = Math.ceil(r / 2);
      return { facCredDelta: gain, log: `Pretech Manufactory roll 1d8=${r}: +${gain} FacCreds` };
    }
    case 'Party Machine':
      return { facCredDelta: 1, log: 'Party Machine: +1 FacCred' };
    case 'Treachery':
      return { facCredDelta: 5, selfDestroyed: true, log: 'Treachery succeeds: +5 FacCreds, asset spent' };
    default:
      return null;
  }
}

const runAssetAbilityNames = new Set([
  'Harvesters', 'Postech Industry', 'Venture Capital', 'Pretech Manufactory', 'Party Machine', 'Treachery',
]);

/** Assets whose ability reveals/strips Stealth from rival assets (p.220–227). */
const revealAbilityNames = new Set(['Informers', 'Seductress', 'Tripwire Cells', 'Panopticon Matrix']);

export type AbilityKind = 'faccred' | 'move' | 'reveal';

/**
 * What kind of "Use Asset Ability" action this asset offers, or null if none:
 *  - 'faccred' = a self-contained dice→FacCred result (run via runAssetAbility)
 *  - 'move'    = transports an asset to another world (needs a target + cost)
 *  - 'reveal'  = strips Stealth from a rival's assets (needs a target faction)
 */
export function getAbilityKind(asset: FactionAsset): AbilityKind | null {
  if (runAssetAbilityNames.has(asset.name)) return 'faccred';
  if (revealAbilityNames.has(asset.name)) return 'reveal';
  if (/\bmove\b/i.test(asset.special ?? '')) return 'move';
  return null;
}

/** True if the asset has any automatable ability (drives the "Use Ability" button). */
export function hasAutomatableAbility(asset: FactionAsset): boolean {
  return getAbilityKind(asset) !== null;
}

/** Parse the FacCred cost a move ability charges from its special text (defaults to 1). */
export function moveAbilityCost(asset: FactionAsset): number {
  const m = (asset.special ?? '').match(/(\d+)\s*FacCred/i);
  return m ? Number(m[1]) : 1;
}

// ── Eugenics Cult tag-gated asset (p.224) ───────────────────────────────────────

export const GENGINEERED_SLAVES: ReferenceAsset = {
  name: 'Gengineered Slaves',
  type: 'Force',
  rating: 1,
  category: 'Military Unit',
  cost: 2,
  tl: 4,
  maxHp: 6,
  attack: 'Force vs Force 1d6',
  counter: '1d4',
  note: 'S',
  special: 'Eugenics Cult only. Once per turn, roll an extra d10 on a Slaves attack or defense.',
  description: 'Vat-grown labor-soldiers bred for obedience.',
};

// ── Faction creation presets — starting asset placement (p.226) ─────────────────

/** Recompute and clamp HP after a rating change. */
export function clampedHp(f: Pick<Faction, 'force' | 'cunning' | 'wealth' | 'hp'>): number {
  const max = factionMaxHp(f.force, f.cunning, f.wealth);
  return Math.min(f.hp, max);
}

/** Build a FactionAsset from a reference entry, fully placed and ready. */
function instantiate(ref: ReferenceAsset): FactionAsset {
  return {
    id: crypto.randomUUID(), name: ref.name, type: ref.type, rating: ref.rating,
    hp: ref.maxHp, maxHp: ref.maxHp, attack: ref.attack, counter: ref.counter, notes: '',
    category: ref.category, cost: ref.cost, tl: ref.tl, maintenance: ref.maintenance,
    note: ref.note, special: ref.special,
  };
}

/** Cheapest purchasable (non-Base) asset of a type at or below a rating. */
function cheapestAsset(type: FactionAssetType, maxRating: number): ReferenceAsset | undefined {
  return REFERENCE_ASSETS
    .filter(a => a.type === type && a.rating <= maxRating && a.category !== 'Special')
    .sort((a, b) => a.cost - b.cost)[0];
}

/** Number of starting assets a creation preset places (primary attribute + others) — p.226–230. */
const PRESET_ASSET_COUNTS: Record<string, { primary: number; other: number }> = {
  'Minor faction': { primary: 1, other: 1 },
  'Major / planetary government': { primary: 2, other: 2 },
  'Regional hegemon': { primary: 4, other: 4 },
  'PC faction': { primary: 1, other: 0 },
};

/**
 * Suggested starting assets for a creation preset: a number of assets in the
 * faction's highest-rated attribute plus a number spread across the others.
 * The player is free to swap these afterward; these are sensible defaults.
 */
export function buildPresetAssets(preset: FactionPreset): FactionAsset[] {
  const counts = PRESET_ASSET_COUNTS[preset.name] ?? { primary: 1, other: 0 };
  const ratings: [FactionAssetType, number][] = [
    ['Force', preset.force], ['Cunning', preset.cunning], ['Wealth', preset.wealth],
  ];
  ratings.sort((a, b) => b[1] - a[1]);
  const [primaryType, primaryRating] = ratings[0];
  const others = ratings.slice(1);

  const assets: FactionAsset[] = [];
  for (let i = 0; i < counts.primary; i++) {
    const ref = cheapestAsset(primaryType, primaryRating);
    if (ref) assets.push(instantiate(ref));
  }
  for (let i = 0; i < counts.other; i++) {
    const [t, r] = others[i % others.length];
    const ref = cheapestAsset(t, r);
    if (ref) assets.push(instantiate(ref));
  }
  return assets;
}
