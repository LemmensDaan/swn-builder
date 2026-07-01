# Rules Audit — swn_full.txt vs implementation

A correctness pass over the toolset against the *Stars Without Number (Revised)*
rulebook (`swn_full.txt`), covering the areas the app models. Findings are grouped
by area; ✅ = fixed, ◽ = verified correct / no action, 🟡 = known limitation.

## Starships & ship combat
- ✅ **Sensor Mask cost** — was `100,000` base; rulebook lists `10k*` → corrected to `10,000` (`ships.ts`).
- ✅ **Lightning Charge Mantle power** — was `10`; rulebook lists `15` → corrected (`ships.ts`).
- ✅ **Point Defense Lasers** — description said "+2 AC vs torpedo and charge weapons"; rulebook is "+2 AC vs any weapon that uses ammo" → broadened (`ships.ts`).
- ✅ **Foxer Drones comment** — code comment wrongly called Frigate the minimum class; it is Cruiser → comment corrected (`ships.ts`).
- ◽ Battleship/Carrier HP & AC — example ship blocks differ from the bare hull table (fittings); code correctly stores the bare-hull values.

## Vehicles & mechs
- ✅ **Missing mech weapons** — added Railgun, Razor Cloud, Rocket Launcher, Wheatcutter Belt to `MECH_WEAPONS` (`vehicles.ts`).
- ✅ **Power scaling flag** — Heavy Machine Gun & Hydra Array have the book's `#` (power scales with hull); added `powerScaled` to the weapon type and flagged both (`vehicles.ts`).
- ◽ Vehicle, drone, and mech-hull stat tables spot-checked against the book — correct. (Drone list order is cosmetic.)

## Factions, world generation, spike travel
- ✅ **Spike mishap table** — 3d6 ranges fixed from `13–16 / 17` to `13–15 / 16–17` (the book's printed `16-17` overlapped `13-16`) so a 16 reads as the better "twice base time" result (`spike-travel.ts`).
- ✅ **Over-cap maintenance arrears** — assets held over the per-type rating cap now also go into arrears (and can be lost after two unpaid turns), not just upkeep-costing assets (`useSectorStore.ts`).
- ✅ **Medical Center text** — clarified that a restored asset comes back at 1 HP (`faction-assets.ts`).
- ◽ Income `ceil(W/2)+floor((F+C)/4)`, `RATING_COST` XP costs, faction HP formula, attack resolution (1d10+attr), rutter modifiers, travel-time `6×hexes÷rating`, and all five world-gen 2d6 tables verified correct against the book.
- 🟡 Variable-difficulty faction goals (Military Conquest / Commercial Expansion / Intelligence Coup) store a default XP reward; actual XP equals the realized difficulty (GM adjudicates).

## Character creation, foci, psychics
- ◽ Background tables (free/quick/growth/learning), skill costs, save formula, attribute modifier table, class HP/attack/save progressions, Psychic Training & effort all spot-checked correct.
- 🟡 The wizard does not *enforce* that a Warrior's bonus focus be combat / an Expert's be non-combat (both are still freely selectable). Low impact; left as a soft rule.

_(Two of the read-only audit agents covering character creation and foci/psychics
stalled mid-run; the portions they completed surfaced no incorrect values, only the
soft-rule note above.)_
