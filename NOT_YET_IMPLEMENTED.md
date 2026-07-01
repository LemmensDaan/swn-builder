# SWN Tool — Implementation Status

Tracking of *Stars Without Number (Revised)* rulebook content. Items previously
listed here have now been implemented; see the checks below. A few genuinely
large or GM-adjudicated subsystems remain partial and are noted at the end.

Legend: ✅ implemented · 🟡 partial (core done, edge cases left to the GM) · 🟥 not yet

---

## Factions — play loop now modeled

- ✅ **Faction turn / action system** — `factionProcessTurnStart` (income, maintenance,
  ready assets, advance turn) plus action UI: Attack (full 1d10+attr vs 1d10+attr
  resolver in `AttackResolver.tsx`, applies damage incl. Base-of-Influence bypass &
  counterattacks), Buy Asset, Sell Asset, Repair Asset, Expand Influence, Use Asset
  Ability, XP rating-raise. Move/Change-Homeworld via per-asset location & homeworld
  pickers. (`faction-turn.ts`, `FactionSheet.tsx`, store actions.)
- ✅ **FacCreds economy** — treasury, per-turn income `ceil(W/2)+floor((F+C)/4)`,
  purchase cost deduction, sell-for-half, per-turn maintenance incl. the over-rating
  +1 FC/asset rule, with arrears → unusable → lost handling.
- ✅ **Rating-raise XP spending & validation** — `factionRaiseStat` spends XP per
  `RATING_COST`, gated by available XP, capped at 8, recomputes & clamps HP.
- ✅ **Creation presets** — `FACTION_PRESETS` offered in the new-faction picker and
  `buildPresetAssets` auto-places sensible starting assets (`FactionScreen.tsx`).
- ✅ **Homeworld / Base of Influence / per-asset location** — homeworld picker, BoI
  bought via Expand Influence (variable HP = up to faction max HP, damage hits
  faction HP), and a world-location selector on every asset.
- ✅ **Tag mechanical effects** — automated across the event hooks: attack/defence
  dice (Warlike, Machiavellian, Plutocratic, Theocratic, Exchange Consulate, Deep
  Rooted, Fanatical reroll/lose-ties, **Perimeter Agency** vs TL5 assets, **Savage**
  with TL0 assets, **Imperialists** on Seize attacks), **Secretive** (assets bought
  Stealthed), **Preceptor Archive** (−1 FC on TL4+ buys), **Scavengers** (+1 FC on
  destroying/losing an asset, incl. maintenance loss), and Eugenics Cult. All tags
  are also surfaced in a Tag Effects panel. A handful of purely positional tags
  (Pirates toll, Mercenary Group per-asset moves, Planetary-Government permission)
  remain GM-narrated since they depend on hex movement the tool doesn't simulate.
- ✅ **Eugenics Cult "Gengineered Slaves"** — `GENGINEERED_SLAVES`, selectable in the
  asset picker when the faction has the Eugenics Cult tag.
- ✅ **Asset special-ability automation** — FacCred abilities resolve inline
  (Harvesters, Postech Industry, Venture Capital, Pretech Manufactory, Party Machine,
  Treachery); **move** abilities open a transport picker (choose asset → destination →
  cost) and **reveal** abilities (Informers, Seductress, Tripwire Cells, Panopticon)
  strip a chosen rival's Stealth; Franchise & Blockade Fleet siphon FacCreds on a hit.
- 🟥 **Refit / Seize-Planet as dedicated flows** — refit and the multi-turn Seize
  Planet hold-three-turns tracker are still done manually.

## Starships

- ✅ **Foxer Drones ammo tracking** — defense ammo counter in `ShipSheet.tsx`
  (`defenseAmmo` on the ship, 5 per engagement, ×2 Cruiser / ×3 Capital).

## Character / Crew

- ✅ **True AI / VI rules** — `data/ai.ts` (True AI class, Processing nodes, core &
  peripheral routines, VI rules, robot/expert-system tables) + VI origin foci.
- ✅ **Cyberware / implants** — `data/cyberware.ts` (full implant list w/ System
  Strain & credit costs) + Cyberware section in `CharacterSheet.tsx` reducing
  effective max System Strain.
- ✅ **Transhuman / origin foci** — alien & VI origin foci added to `data/foci.ts`,
  selectable in the wizard.
- ✅ **Alien / exotic species creation + mutations** — `data/aliens.ts` (lenses,
  PC benefits, body/social tables, example species).
- ✅ **Henchmen statblocks** — `data/henchmen.ts` (Peaceful/Martial Human + general
  & specific NPC statblocks).
- ✅ **Psychic techniques bought with skill points at creation** — SP-buying surfaced
  in `Step7Psychics.tsx` (1 SP × technique level).

## Equipment & Trade

- ✅ **Speculative trade** — `data/trade.ts` + Trade tab (`TradeCalculator.tsx`):
  goods tiers, 2d6 buy/sell pricing, bargaining, cargo-loss checks.
- ✅ **Vehicles, drones, mechs** — `data/vehicles.ts` + Mech Weapons + Vehicles tab
  (`VehicleReference.tsx`), incl. a saved **Mech Builder** (wizard → persisted roster
  with cards/edit/copy/retire, `MechWizard` + `MechRoster` + `useMechs`) matching the
  ship/character builder flow, with live Power/Mass/Hardpoint budgets.

## Sector / World / GM tools

- ✅ **World generation tables** — `data/world-gen.ts` (atmosphere, temperature,
  biosphere, population, tech-level 2d6 tables + world tags) and a World Generator
  in the Sector → Tools modal that can apply a rolled world to a planet.
- ✅ **Society / religion / culture / NPC / adventure generators** — GM random-
  generator toolset (`data/gm-generators.ts`) surfaced in a GM Tools tab
  (NPC / Adventure / Society / Religion / Names).
- ✅ **Spike-drive travel & navigation** — `data/spike-travel.ts` + Spike Travel
  calculator (drill difficulty, rutter modifiers, fuel, 6-days/hex÷rating travel
  time, 3d6 mishap table).

---

*See `RULES_AUDIT.md` for the rulebook-correctness audit findings and their fixes.*
