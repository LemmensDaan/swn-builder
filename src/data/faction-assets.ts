import type { FactionAssetType } from '../types/sector';

/**
 * SWN (Revised) faction data, rebuilt from the rulebook faction chapter (pp.217–227).
 *
 * Asset `note` codes follow the book's table footnotes:
 *   P = requires planetary government permission to buy/move
 *   A = has a special Action ability
 *   S = has a special feature, cost, or quality
 */

// ── Rating → XP cost / Hit-Point value (p.221) ──────────────────────────────────
// Buying or raising an attribute to rating N costs this many XP; the same value is
// added to faction max HP. The progression is non-linear above rating 2.
export const RATING_COST: Record<number, number> = {
  1: 1, 2: 2, 3: 4, 4: 6, 5: 9, 6: 12, 7: 16, 8: 20,
};

export const MAX_FACTION_RATING = 8;

/** Faction max HP = 4 + the XP-cost value of each of its three attribute ratings (p.221). */
export function factionMaxHp(force: number, cunning: number, wealth: number): number {
  const cost = (r: number) => RATING_COST[Math.max(1, Math.min(MAX_FACTION_RATING, r))] ?? 0;
  return 4 + cost(force) + cost(cunning) + cost(wealth);
}

/** The book "Type" column — how an asset behaves on the faction turn. */
export type AssetCategory =
  | 'Military Unit' | 'Special Forces' | 'Starship' | 'Facility'
  | 'Logistics Facility' | 'Tactic' | 'Special';

export interface ReferenceAsset {
  name: string;
  type: FactionAssetType;   // ruling attribute (Force / Cunning / Wealth)
  rating: number;           // minimum rating required to buy it
  category: AssetCategory;  // book "Type"
  cost: number;             // FacCreds to purchase (0 = special / variable)
  tl: number;               // tech level required
  maxHp: number;            // 0 = no hit points (Stealth) or variable (Base of Influence)
  attack: string;           // "Force vs Cunning 1d6", "(special)", or "—"
  counter: string;          // "1d4+1" or "—"
  maintenance?: number;     // FacCreds per turn upkeep
  note?: string;            // P / A / S footnote codes
  special?: string;         // special ability text
  description: string;
}

export const REFERENCE_ASSETS: ReferenceAsset[] = [
  // ── FORCE ──────────────────────────────────────────────────────────────────
  { name: 'Security Personnel', type: 'Force', rating: 1, category: 'Military Unit', cost: 2, tl: 0, maxHp: 3, attack: 'Force vs Force 1d3+1', counter: '1d4', description: 'Trained guards and watchmen.' },
  { name: 'Hitmen', type: 'Force', rating: 1, category: 'Special Forces', cost: 2, tl: 0, maxHp: 1, attack: 'Force vs Cunning 1d6', counter: '—', description: 'Hired killers who strike at vulnerable targets.' },
  { name: 'Militia Unit', type: 'Force', rating: 1, category: 'Military Unit', cost: 4, tl: 3, maxHp: 4, attack: 'Force vs Force 1d6', counter: '1d4+1', note: 'P', description: 'Irregularly equipped local militia.' },
  { name: 'Base of Influence', type: 'Force', rating: 1, category: 'Special', cost: 0, tl: 0, maxHp: 0, attack: '—', counter: '—', note: 'S', description: 'A foothold on a world. HP and cost equal the HP you buy (1 FacCred/HP); damage to it hits faction HP. Bought via Expand Influence.' },
  { name: 'Heavy Drop Assets', type: 'Force', rating: 2, category: 'Facility', cost: 4, tl: 4, maxHp: 6, attack: '—', counter: '—', note: 'A', special: 'As an action, move any one non-Starship asset (incl. itself) to a world within one hex for 1 FacCred.', description: 'Orbital drop infrastructure.' },
  { name: 'Elite Skirmishers', type: 'Force', rating: 2, category: 'Military Unit', cost: 5, tl: 4, maxHp: 5, attack: 'Force vs Force 2d4', counter: '1d4+1', note: 'P', description: 'Highly mobile light infantry.' },
  { name: 'Hardened Personnel', type: 'Force', rating: 2, category: 'Special Forces', cost: 4, tl: 3, maxHp: 4, attack: '—', counter: '1d4+1', description: 'Tough operatives hardened against attack.' },
  { name: 'Guerrilla Populace', type: 'Force', rating: 2, category: 'Military Unit', cost: 4, tl: 0, maxHp: 6, attack: 'Force vs Cunning 1d4+1', counter: '—', description: 'A populace sympathetic to insurgency.' },
  { name: 'Zealots', type: 'Force', rating: 3, category: 'Special Forces', cost: 6, tl: 0, maxHp: 4, attack: 'Force vs Force 2d6', counter: '2d6', note: 'S', special: 'Take 1d4 damage every time they make a successful attack or counterattack.', description: 'Fanatical devotees who fight without regard for survival.' },
  { name: 'Cunning Trap', type: 'Force', rating: 3, category: 'Tactic', cost: 5, tl: 0, maxHp: 2, attack: '—', counter: '1d6+3', description: 'A prepared ambush awaiting attackers.' },
  { name: 'Counterintel Unit', type: 'Force', rating: 3, category: 'Special Forces', cost: 6, tl: 4, maxHp: 4, attack: 'Cunning vs Cunning 1d4+1', counter: '1d6', description: 'Hunters of enemy spies and saboteurs.' },
  { name: 'Beachhead Landers', type: 'Force', rating: 4, category: 'Facility', cost: 10, tl: 4, maxHp: 10, attack: '—', counter: '—', note: 'A', special: 'As an action, move any number of assets on the planet (incl. itself) to any world within one hex for 1 FacCred each.', description: 'Mass-landing assault craft.' },
  { name: 'Extended Theater', type: 'Force', rating: 4, category: 'Facility', cost: 10, tl: 4, maxHp: 10, attack: '—', counter: '—', note: 'A', special: 'As an action, move any one non-Starship asset (incl. itself) between worlds within two hexes for 1 FacCred.', description: 'Logistics network spanning multiple systems.' },
  { name: 'Strike Fleet', type: 'Force', rating: 4, category: 'Starship', cost: 12, tl: 4, maxHp: 8, attack: 'Force vs Force 2d6', counter: '1d8', note: 'A', special: 'As an action, move to a world within one hex.', description: 'Military strike spacecraft.' },
  { name: 'Postech Infantry', type: 'Force', rating: 4, category: 'Military Unit', cost: 8, tl: 4, maxHp: 12, attack: 'Force vs Force 1d8', counter: '1d8', note: 'P', description: 'Well-equipped professional soldiers.' },
  { name: 'Blockade Fleet', type: 'Force', rating: 5, category: 'Starship', cost: 10, tl: 4, maxHp: 8, attack: 'Force vs Wealth 1d6', counter: '—', note: 'S', special: 'On a successful attack, steal 1d4 FacCreds (once per turn per target). As an action, move to a world within one hex.', description: 'Warships that strangle enemy commerce.' },
  { name: 'Pretech Logistics', type: 'Force', rating: 5, category: 'Facility', cost: 14, tl: 0, maxHp: 6, attack: '—', counter: '—', note: 'A', special: 'As an action, buy one Force asset up to TL5 here for 1.5× the usual cost (rounded up). One per turn.', description: 'Supply chain for advanced military gear.' },
  { name: 'Psychic Assassins', type: 'Force', rating: 5, category: 'Special Forces', cost: 12, tl: 4, maxHp: 4, attack: 'Cunning vs Cunning 2d6+2', counter: '—', note: 'S', special: 'Automatically start Stealthed when purchased.', description: 'Psychically-augmented killers.' },
  { name: 'Pretech Infantry', type: 'Force', rating: 6, category: 'Military Unit', cost: 20, tl: 5, maxHp: 16, attack: 'Force vs Force 2d8', counter: '2d8+2', note: 'P', description: 'Soldiers in pretech battle armor.' },
  { name: 'Planetary Defenses', type: 'Force', rating: 6, category: 'Facility', cost: 18, tl: 4, maxHp: 20, attack: '—', counter: '2d6+6', note: 'S', special: 'Can only defend against attacks by Starship-type assets.', description: 'Fixed orbital and surface defense batteries.' },
  { name: 'Gravtank Formation', type: 'Force', rating: 6, category: 'Military Unit', cost: 25, tl: 4, maxHp: 14, attack: 'Force vs Force 2d10+4', counter: '1d10', note: 'P', description: 'Armored gravtank columns.' },
  { name: 'Deep Strike Landers', type: 'Force', rating: 7, category: 'Facility', cost: 25, tl: 4, maxHp: 10, attack: '—', counter: '—', note: 'A', special: 'As an action, move any one non-Starship asset (incl. itself) between worlds within three hexes for 2 FacCreds, even over local objection.', description: 'Long-range rapid-deployment craft.' },
  { name: 'Integral Protocols', type: 'Force', rating: 7, category: 'Facility', cost: 20, tl: 5, maxHp: 10, attack: '—', counter: '2d8+2', note: 'S', special: 'Can defend only against attacks vs Cunning, but adds an extra die to the defender\'s roll.', description: 'Hardened command-and-control protocols.' },
  { name: 'Space Marines', type: 'Force', rating: 7, category: 'Military Unit', cost: 30, tl: 4, maxHp: 16, attack: 'Force vs Force 2d8+2', counter: '2d8', note: 'A', special: 'As an action, move to a world within one hex whether or not the local government permits it.', description: 'Elite void-capable boarding troops.' },
  { name: 'Capital Fleet', type: 'Force', rating: 8, category: 'Starship', cost: 40, tl: 4, maxHp: 30, attack: 'Force vs Force 3d10+4', counter: '3d8', note: 'A, S', maintenance: 2, special: 'As an action, move up to three hexes. Permission needed to raise but not to move into a system.', description: 'A fleet of capital warships.' },

  // ── CUNNING ─────────────────────────────────────────────────────────────────
  { name: 'Smugglers', type: 'Cunning', rating: 1, category: 'Starship', cost: 2, tl: 4, maxHp: 4, attack: 'Cunning vs Wealth 1d4', counter: '—', note: 'A', special: 'For 1 FacCred, move itself and/or one Special Forces asset up to two hexes.', description: 'Covert transport vessels.' },
  { name: 'Informers', type: 'Cunning', rating: 1, category: 'Special Forces', cost: 2, tl: 0, maxHp: 3, attack: 'Cunning vs Cunning (special)', counter: '—', note: 'A, S', special: 'On a successful attack (no target needed), reveal all Stealthed assets of the target faction on the world.', description: 'A web of street-level informants.' },
  { name: 'False Front', type: 'Cunning', rating: 1, category: 'Logistics Facility', cost: 1, tl: 0, maxHp: 2, attack: '—', counter: '—', note: 'S', special: 'Can be sacrificed to nullify a killing blow against another asset on the planet.', description: 'A disposable cover operation.' },
  { name: 'Base of Influence', type: 'Cunning', rating: 1, category: 'Special', cost: 0, tl: 0, maxHp: 0, attack: '—', counter: '—', note: 'S', description: 'A foothold on a world. HP and cost equal the HP you buy (1 FacCred/HP); damage to it hits faction HP. Bought via Expand Influence.' },
  { name: 'Lobbyists', type: 'Cunning', rating: 2, category: 'Special Forces', cost: 4, tl: 0, maxHp: 4, attack: 'Cunning vs Cunning (special)', counter: '—', note: 'S', special: 'When a rival gains government permission, may immediately test to withdraw it until next turn.', description: 'Influence-peddlers in the halls of power.' },
  { name: 'Saboteurs', type: 'Cunning', rating: 2, category: 'Special Forces', cost: 5, tl: 0, maxHp: 6, attack: 'Cunning vs Cunning 2d4', counter: '—', note: 'S', special: 'An attacked asset cannot use any Use Asset Ability action until the start of your next turn.', description: 'Demolition and disruption specialists.' },
  { name: 'Blackmail', type: 'Cunning', rating: 2, category: 'Tactic', cost: 4, tl: 0, maxHp: 4, attack: 'Cunning vs Cunning 1d4+1', counter: '—', note: 'S', special: 'Any attempt to attack or defend against Blackmail loses any bonus dice earned from tags.', description: 'Leverage over key figures.' },
  { name: 'Seductress', type: 'Cunning', rating: 2, category: 'Special Forces', cost: 4, tl: 0, maxHp: 4, attack: 'Cunning vs Cunning (special)', counter: '—', note: 'A, S', special: 'As an action, move one hex. On a successful attack (no damage), the target reveals the faction\'s other Stealthed assets on the world. Only Special Forces can attack a Seductress.', description: 'Honeytrap operatives.' },
  { name: 'Cyberninjas', type: 'Cunning', rating: 3, category: 'Special Forces', cost: 6, tl: 4, maxHp: 4, attack: 'Cunning vs Cunning 2d6', counter: '—', description: 'Cybered infiltration killers.' },
  { name: 'Stealth', type: 'Cunning', rating: 3, category: 'Tactic', cost: 2, tl: 0, maxHp: 0, attack: '—', counter: '—', note: 'S', special: 'Not an asset but a quality bought for another Special Forces asset: it cannot be detected or attacked. Lost if used to attack or defend.', description: 'Conceal a Special Forces asset.' },
  { name: 'Covert Shipping', type: 'Cunning', rating: 3, category: 'Logistics Facility', cost: 8, tl: 4, maxHp: 4, attack: '—', counter: '—', note: 'A, S', special: 'Move any one Special Forces unit between worlds within three hexes for 1 FacCred.', description: 'Hidden supply and transit lines.' },
  { name: 'Party Machine', type: 'Cunning', rating: 4, category: 'Logistics Facility', cost: 8, tl: 0, maxHp: 10, attack: 'Cunning vs Cunning 2d6', counter: '1d6', note: 'S', special: 'Provides 1 FacCred each turn.', description: 'A political patronage network.' },
  { name: 'Vanguard Cadres', type: 'Cunning', rating: 4, category: 'Military Unit', cost: 8, tl: 3, maxHp: 12, attack: 'Cunning vs Cunning 1d6', counter: '1d6', description: 'Trained agitators and cell leaders.' },
  { name: 'Tripwire Cells', type: 'Cunning', rating: 4, category: 'Special Forces', cost: 12, tl: 4, maxHp: 8, attack: '—', counter: '1d4', note: 'A, S', special: 'Whenever a Stealthed asset lands or is bought on the world, immediately test to strip its Stealth.', description: 'Counter-infiltration sensor cells.' },
  { name: 'Seditionists', type: 'Cunning', rating: 4, category: 'Special Forces', cost: 12, tl: 0, maxHp: 8, attack: '—', counter: '—', note: 'A', special: 'For 1d4 FacCreds, attach to an enemy asset; it cannot attack until they leave. Survive the asset\'s destruction.', description: 'Provocateurs who paralyze enemy assets.' },
  { name: 'Organization Moles', type: 'Cunning', rating: 5, category: 'Tactic', cost: 10, tl: 0, maxHp: 8, attack: 'Cunning vs Cunning 2d6', counter: '—', description: 'Deep-cover agents inside a rival.' },
  { name: 'Cracked Comms', type: 'Cunning', rating: 5, category: 'Tactic', cost: 14, tl: 0, maxHp: 6, attack: '—', counter: 'Special', note: 'S', special: 'On a successful defense, force the attacking asset to attack itself for its normal damage or counterattack.', description: 'Compromised enemy communications.' },
  { name: 'Boltholes', type: 'Cunning', rating: 5, category: 'Logistics Facility', cost: 12, tl: 4, maxHp: 6, attack: '—', counter: '2d6', note: 'S', special: 'A Special Forces/Military Unit on the world that would be destroyed is instead set to 0 HP and hidden until repaired (unless the Boltholes are destroyed first).', description: 'Hidden safehouses and escape tunnels.' },
  { name: 'Transport Lockdown', type: 'Cunning', rating: 6, category: 'Tactic', cost: 20, tl: 4, maxHp: 10, attack: 'Cunning vs Cunning (special)', counter: '—', note: 'S', special: 'On a successful attack, the rival cannot transport assets onto the world without spending 1d4 FacCreds and waiting one turn.', description: 'A chokehold on local transit.' },
  { name: 'Covert Transit Net', type: 'Cunning', rating: 6, category: 'Logistics Facility', cost: 18, tl: 4, maxHp: 15, attack: '—', counter: '—', note: 'A', special: 'As an action, move any Special Forces assets between worlds within three hexes.', description: 'A clandestine transport grid.' },
  { name: 'Demagogue', type: 'Cunning', rating: 6, category: 'Special Forces', cost: 20, tl: 0, maxHp: 10, attack: 'Cunning vs Cunning 2d8', counter: '1d8', description: 'A rabble-rousing populist leader.' },
  { name: 'Popular Movement', type: 'Cunning', rating: 7, category: 'Tactic', cost: 25, tl: 4, maxHp: 16, attack: 'Cunning vs Cunning 2d6', counter: '1d6', note: 'S', special: 'The government always grants the faction\'s asset purchase or movement requests.', description: 'A mass political movement.' },
  { name: 'Book of Secrets', type: 'Cunning', rating: 7, category: 'Tactic', cost: 20, tl: 4, maxHp: 10, attack: '—', counter: '2d8', note: 'S', special: 'Once per turn, reroll one die for an action on the world, or force a rival to reroll one die.', description: 'A trove of damaging secrets.' },
  { name: 'Treachery', type: 'Cunning', rating: 7, category: 'Tactic', cost: 10, tl: 0, maxHp: 5, attack: 'Cunning vs Cunning (special)', counter: '—', note: 'S', special: 'On a successful attack the Treachery is lost, you gain 5 FacCreds, and the target asset switches to your faction.', description: 'A turncoat embedded in the enemy.' },
  { name: 'Panopticon Matrix', type: 'Cunning', rating: 8, category: 'Logistics Facility', cost: 30, tl: 5, maxHp: 20, attack: '—', counter: '1d6', note: 'S', special: 'Each rival Stealthed asset must test each turn or lose Stealth; you gain an extra die on all Cunning attacks/defenses here.', description: 'A total surveillance grid.' },

  // ── WEALTH ──────────────────────────────────────────────────────────────────
  { name: 'Franchise', type: 'Wealth', rating: 1, category: 'Facility', cost: 2, tl: 2, maxHp: 3, attack: 'Wealth vs Wealth 1d4', counter: '1d4-1', note: 'S', special: 'On a successful attack, the enemy loses 1 FacCred (once/turn), which you gain.', description: 'A commercial franchise operation.' },
  { name: 'Harvesters', type: 'Wealth', rating: 1, category: 'Facility', cost: 2, tl: 0, maxHp: 4, attack: '—', counter: '1d4', note: 'A', special: 'As an action, roll 1d6; on 3+ gain 1 FacCred.', description: 'Resource-extraction workforce.' },
  { name: 'Local Investments', type: 'Wealth', rating: 1, category: 'Facility', cost: 1, tl: 2, maxHp: 2, attack: 'Wealth vs Wealth 1d4-1', counter: '—', note: 'S', special: 'Other factions buying an asset here pay 1 extra FacCred (lost, not gained by you).', description: 'Money tied up in local enterprises.' },
  { name: 'Base of Influence', type: 'Wealth', rating: 1, category: 'Special', cost: 0, tl: 0, maxHp: 0, attack: '—', counter: '—', note: 'S', description: 'A foothold on a world. HP and cost equal the HP you buy (1 FacCred/HP); damage to it hits faction HP. Bought via Expand Influence.' },
  { name: 'Freighter Contract', type: 'Wealth', rating: 2, category: 'Starship', cost: 5, tl: 4, maxHp: 4, attack: 'Wealth vs Wealth 1d4', counter: '—', note: 'A', special: 'As an action, move any one non-Force asset (incl. itself) to a world within two hexes for 1 FacCred.', description: 'Contracted hauler fleet.' },
  { name: 'Lawyers', type: 'Wealth', rating: 2, category: 'Special Forces', cost: 6, tl: 0, maxHp: 4, attack: 'Cunning vs Wealth 2d4', counter: '1d6', note: 'S', special: 'Cannot attack or counterattack Force assets.', description: 'Aggressive legal operatives.' },
  { name: 'Union Toughs', type: 'Wealth', rating: 2, category: 'Military Unit', cost: 4, tl: 0, maxHp: 6, attack: 'Wealth vs Force 1d4+1', counter: '1d4', description: 'Strong-arm labor enforcers.' },
  { name: 'Surveyors', type: 'Wealth', rating: 2, category: 'Special Forces', cost: 4, tl: 4, maxHp: 4, attack: '—', counter: '1d4', note: 'A, S', special: 'Add an extra die on Expand Influence here. As an action, move two hexes.', description: 'Prospectors and site surveyors.' },
  { name: 'Postech Industry', type: 'Wealth', rating: 3, category: 'Facility', cost: 8, tl: 4, maxHp: 4, attack: '—', counter: '1d4', note: 'A', special: 'As an action, roll 1d6: 1 lose 1 FacCred (destroyed if unpaid), 2–4 gain 1, 5–6 gain 2.', description: 'Modern manufacturing base.' },
  { name: 'Laboratory', type: 'Wealth', rating: 3, category: 'Facility', cost: 6, tl: 0, maxHp: 4, attack: '—', counter: '—', note: 'S', special: 'Assets may be bought on this world as if it were TL4.', description: 'A research laboratory.' },
  { name: 'Mercenaries', type: 'Wealth', rating: 3, category: 'Military Unit', cost: 8, tl: 4, maxHp: 6, attack: 'Wealth vs Force 2d4+2', counter: '1d6', note: 'A, S, P', maintenance: 1, special: 'As an action, move one hex. Permission needed to buy or move here.', description: 'Hired professional soldiers.' },
  { name: 'Shipping Combine', type: 'Wealth', rating: 4, category: 'Facility', cost: 10, tl: 4, maxHp: 10, attack: '—', counter: '1d6', note: 'A', special: 'As an action, move any number of non-Force assets (incl. itself) within two hexes for 1 FacCred each.', description: 'A merchant shipping cartel.' },
  { name: 'Monopoly', type: 'Wealth', rating: 4, category: 'Facility', cost: 8, tl: 3, maxHp: 12, attack: 'Wealth vs Wealth 1d6', counter: '1d6', note: 'S', special: 'As an action, force one rival with unstealthed assets here to pay you 1 FacCred or lose an asset of their choice.', description: 'Control of a critical market.' },
  { name: 'Medical Center', type: 'Wealth', rating: 4, category: 'Facility', cost: 12, tl: 4, maxHp: 8, attack: '—', counter: '—', note: 'S', special: 'Between turns, restore a destroyed Special Forces/Military Unit here (to 1 HP) for half its cost; Repair actions here cost 1 less for those types.', description: 'An advanced medical facility.' },
  { name: 'Bank', type: 'Wealth', rating: 4, category: 'Facility', cost: 12, tl: 3, maxHp: 8, attack: '—', counter: '—', note: 'S', special: 'Once per turn, ignore one cost or FacCred loss imposed by another faction (no action; multiple banks stack).', description: 'A financial institution.' },
  { name: 'Marketers', type: 'Wealth', rating: 5, category: 'Tactic', cost: 10, tl: 0, maxHp: 8, attack: 'Cunning vs Wealth 1d6', counter: '—', note: 'A', special: 'As an action, test vs a rival asset; on success they pay half its cost or it becomes useless until paid.', description: 'Aggressive market manipulators.' },
  { name: 'Pretech Researchers', type: 'Wealth', rating: 5, category: 'Special Forces', cost: 14, tl: 4, maxHp: 6, attack: '—', counter: '—', note: 'S', maintenance: 1, special: 'Their world counts as TL5 for buying Cunning and Wealth assets.', description: 'Cutting-edge pretech R&D team.' },
  { name: 'Blockade Runners', type: 'Wealth', rating: 5, category: 'Starship', cost: 12, tl: 4, maxHp: 6, attack: '—', counter: '2d4', note: 'A', special: 'As an action, move itself or one Military Unit/Special Forces within three hexes for 2 FacCreds, even past permission.', description: 'Daring smuggler-haulers.' },
  { name: 'Venture Capital', type: 'Wealth', rating: 6, category: 'Facility', cost: 15, tl: 4, maxHp: 10, attack: 'Wealth vs Wealth 2d6', counter: '1d6', note: 'A', special: 'As an action, roll 1d8: 1 destroyed, 2–3 gain 1, 4–7 gain 2, 8 gain 3 FacCreds.', description: 'High-risk investment fund.' },
  { name: 'R&D Department', type: 'Wealth', rating: 6, category: 'Facility', cost: 18, tl: 4, maxHp: 15, attack: '—', counter: '—', note: 'S', special: 'Treat all worlds as TL4 for buying Wealth assets.', description: 'A corporate research division.' },
  { name: 'Commodities Broker', type: 'Wealth', rating: 6, category: 'Special Forces', cost: 20, tl: 0, maxHp: 10, attack: 'Wealth vs Wealth 2d8', counter: '1d8', note: 'A', special: 'As an action, roll 1d8 and subtract that many FacCreds from your next purchase (min half price).', description: 'Master traders of bulk goods.' },
  { name: 'Pretech Manufactory', type: 'Wealth', rating: 7, category: 'Facility', cost: 25, tl: 5, maxHp: 16, attack: '—', counter: '—', note: 'S', special: 'As an action, roll 1d8 and gain half that many FacCreds (rounded up).', description: 'A working pretech production line.' },
  { name: 'Hostile Takeover', type: 'Wealth', rating: 7, category: 'Tactic', cost: 20, tl: 4, maxHp: 10, attack: 'Wealth vs Wealth 2d10', counter: '2d8', note: 'S', special: 'If it would destroy an asset, the target is instead reduced to 1 HP and acquired by your faction.', description: 'A predatory corporate assault.' },
  { name: 'Transit Web', type: 'Wealth', rating: 7, category: 'Facility', cost: 15, tl: 5, maxHp: 5, attack: 'Cunning vs Cunning 1d12', counter: '—', note: 'S', special: 'For 1 FacCred, freely move any non-Starship Cunning/Wealth assets between worlds within three hexes (no action).', description: 'A pretech transit network.' },
  { name: 'Scavenger Fleet', type: 'Wealth', rating: 8, category: 'Starship', cost: 30, tl: 5, maxHp: 20, attack: 'Wealth vs Wealth 2d10+4', counter: '2d10', maintenance: 2, special: 'As an action, move to a world within three hexes.', description: 'A vast salvage and reclamation fleet.' },
];

// ── Faction Tags (pp.224–225) — each carries a mechanical effect ────────────────
export interface FactionTag {
  name: string;
  effect: string;
}

export const FACTION_TAGS_FULL: FactionTag[] = [
  { name: 'Colonists', effect: 'Has the Planetary Government benefits for its homeworld, treated as ≥TL4. Colonies under 100,000 can\'t build Spaceship assets.' },
  { name: 'Deep Rooted', effect: 'Roll an extra d10 when defending assets on the homeworld. Lost if the faction changes homeworlds.' },
  { name: 'Eugenics Cult', effect: 'Can buy Gengineered Slaves (Force 1, 6 HP, 2 cost, TL4, Force vs Force 1d6 / counter 1d4). Once/turn roll an extra d10 on a Slaves attack or defense.' },
  { name: 'Exchange Consulate', effect: 'On completing a Peaceable Kingdom goal, 1d6: on 4+ gain a bonus XP. Once/turn roll an extra d10 defending vs a Wealth attack.' },
  { name: 'Fanatical', effect: 'Always reroll dice showing 1. Always lose ties during attacks.' },
  { name: 'Imperialists', effect: 'Roll an extra d10 for attacks made as part of a Seize Planet action.' },
  { name: 'Machiavellian', effect: 'Once/turn roll an extra d10 when making a Cunning attack.' },
  { name: 'Mercenary Group', effect: 'Every asset gains: as an action, move itself to any world within one hex.' },
  { name: 'Perimeter Agency', effect: 'Once/turn roll an extra d10 attacking a TL5-requiring asset; extra die to detect Stealthed assets.' },
  { name: 'Pirates', effect: 'Any asset moving onto a world with your Base of Influence costs the mover 1 extra FacCred, paid to you.' },
  { name: 'Planetary Government', effect: 'Your permission is needed to buy/import permission-marked assets. Can be taken once per controlled planet.' },
  { name: 'Plutocratic', effect: 'Once/turn roll an extra d10 when making a Wealth attack.' },
  { name: 'Preceptor Archive', effect: 'TL4+ assets cost 1 less FacCred. Action: spend 2 FacCreds, roll 1d12 on a world; on 12 it permanently becomes TL4 for you.' },
  { name: 'Psychic Academy', effect: 'Can train qualified psychics. Once/turn force a rival to reroll any one d10.' },
  { name: 'Savage', effect: 'Once/turn roll an extra die defending with a TL0-requiring asset.' },
  { name: 'Scavengers', effect: 'Whenever you destroy an asset or lose one, gain 1 FacCred.' },
  { name: 'Secretive', effect: 'All assets you purchase begin Stealthed automatically.' },
  { name: 'Technical Expertise', effect: 'Worlds with your Base of Influence count as ≥TL4. Can build Starship assets on any world with 10,000+ people.' },
  { name: 'Theocratic', effect: 'Once/turn roll an extra d10 when defending against a Cunning attack.' },
  { name: 'Warlike', effect: 'Once/turn roll an extra d10 when making a Force attack.' },
];

/** Tag names only (used by the tag picker / autocomplete). */
export const FACTION_TAGS = FACTION_TAGS_FULL.map(t => t.name);

// ── Faction Goals (p.217) ───────────────────────────────────────────────────────
// XP awarded on completion equals the goal's Difficulty. For variable-difficulty
// goals, `xpReward` is a sensible default; the description explains the real formula.
export const FACTION_GOALS = [
  { name: 'Military Conquest', description: 'Destroy rival Force assets equal to your Force rating. XP = ½ the number of assets destroyed.', xpReward: 2 },
  { name: 'Commercial Expansion', description: 'Destroy rival Wealth assets equal to your Wealth rating. XP = ½ the number of assets destroyed.', xpReward: 2 },
  { name: 'Intelligence Coup', description: 'Destroy rival Cunning assets equal to your Cunning rating. XP = ½ the number of assets destroyed.', xpReward: 2 },
  { name: 'Planetary Seizure', description: 'Take control of a planet and become its legitimate government. XP = ½ the ruling faction\'s average F/C/W rating (Diff 1 if uncontested).', xpReward: 2 },
  { name: 'Expand Influence', description: 'Plant a Base of Influence on a new planet. Difficulty 1 (+1 if contested by a rival).', xpReward: 1 },
  { name: 'Blood the Enemy', description: 'Inflict HP of damage on enemy assets/bases equal to your total Force + Cunning + Wealth ratings. Difficulty 2.', xpReward: 2 },
  { name: 'Peaceable Kingdom', description: 'Take no Attack action for four turns. Difficulty 1.', xpReward: 1 },
  { name: 'Destroy the Foe', description: 'Destroy a rival faction entirely. XP = 1 + the average of your F/C/W ratings.', xpReward: 4 },
  { name: 'Inside Enemy Territory', description: 'Have stealthed assets on foreign-government worlds equal to your Cunning rating (assets already stealthed when adopted don\'t count). Difficulty 2.', xpReward: 2 },
  { name: 'Invincible Valor', description: 'Destroy a Force asset whose required rating is higher than your own Force rating. Difficulty 2.', xpReward: 2 },
  { name: 'Wealth of Worlds', description: 'Spend FacCreds equal to four times your Wealth rating on bribes and influence. Difficulty 2.', xpReward: 2 },
];

// ── Creation presets (pp.226–230) ──────────────────────────────────────────────
export interface FactionPreset {
  name: string;
  force: number;
  cunning: number;
  wealth: number;
  description: string;
}

export const FACTION_PRESETS: FactionPreset[] = [
  { name: 'Minor faction', force: 4, cunning: 3, wealth: 1, description: 'Primary 4 (15 HP). One asset in the primary attribute + one in another.' },
  { name: 'Major / planetary government', force: 6, cunning: 5, wealth: 3, description: 'Primary 6 (29 HP). Two assets in the primary + two in others.' },
  { name: 'Regional hegemon', force: 8, cunning: 7, wealth: 5, description: 'Primary 8 (49 HP). Four assets in the primary + four in others.' },
  { name: 'PC faction', force: 2, cunning: 1, wealth: 1, description: 'Starting player faction: 2/1/1 (8 HP) and one asset in the primary attribute.' },
];
