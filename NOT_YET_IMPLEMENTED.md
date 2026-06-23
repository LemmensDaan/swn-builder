# SWN Tool — Not Yet Implemented

A running list of *Stars Without Number (Revised)* rulebook content that the tool
does **not** yet model. Created alongside the `RULES_AUDIT.md` fixes (all audit
items are now fully implemented and RULES_AUDIT.md has been removed).

Legend: 🟥 large subsystem · 🟧 medium feature · 🟨 small/polish

---

## Factions

The asset/goal/tag **data** and the **HP formula** are now correct, and reference
fields (cost / TL / category / maintenance / P-A-S note / special) are stored and
displayed. The faction *play loop* is not modeled:

- 🟥 **Faction turn / action system** — turn order, and the action list (Attack,
  Buy Asset, Move, Expand Influence, Refit, Repair, Sell, Seize Planet, Change
  Homeworld, Use Asset Ability). Attack resolution is `1d10 + attribute` vs
  `1d10 + attribute` with damage/counter on hit/miss/tie.
- 🟥 **FacCreds economy** — per-turn income = `ceil(Wealth/2) + floor((Force+Cunning)/4)`;
  asset purchase costs, sell-for-half, per-turn **maintenance** (incl. the
  "over rating-max" +1 FC/asset rule), and the 1 FacCred ≈ 100,000 cr conversion.
- 🟧 **Rating-raise XP spending & validation** — spend XP per the `RATING_COST`
  table to raise Force/Cunning/Wealth (max **8**). The stat spinner already caps
  at 8, but XP is not deducted and raises aren't gated by XP. (`RATING_COST` is
  implemented in `faction-assets.ts`.)
- 🟧 **Creation presets** — `FACTION_PRESETS` (minor 4/3/1, major 6/5/3, hegemon
  8/7/5, PC 2/1/1) are defined in data but not offered as a "new faction" preset
  in the builder, nor do they auto-place starting assets.
- 🟧 **Homeworld / Base of Influence / per-asset location** — assets have no world
  location; Bases of Influence (variable HP = faction HP, damage hits faction HP)
  and homeworld tracking aren't modeled. Asset move/transport abilities are flavor
  text only.
- 🟧 **Tag mechanical effects** — the 20 tags carry effects (`FACTION_TAGS_FULL`)
  but they're informational; none are applied automatically.
- 🟨 **Eugenics Cult "Gengineered Slaves"** tag-gated asset (Force 1, 6 HP, 2 FC,
  TL4) isn't selectable; described in the tag text only.
- 🟨 **Asset special-ability automation** — special abilities (FacCred generation,
  moves, reveals, etc.) are shown but not executed.

## Starships

Costs, drive scaling, weapon stats, the 7 missing fittings, build-constraint
checks (drive/fitting/weapon class + crew bounds), System Drive bonuses, weapon
ammo capacity scaling, quality mechanics, special-cost fitting flags, and ship
combat (command points, departments, crisis table) are all now implemented.

- 🟨 **Foxer Drones ammo tracking** — description notes "Ammo 5 per engagement"
  but the defense panel has no interactive ammo counter (defenses lack the ammo
  tracking UI that weapons have).

## Character / Crew

- 🟥 **True AI / VI rules** — AI crew/NPCs, their stats and integration are not
  modeled. (Explicitly requested as a tracked TODO.)
- 🟥 **Cyberware / implants** — no cyberware system (System Strain costs, implant
  list).
- 🟧 **Transhuman / origin foci** — the alien / robot / VI "origin" foci from
  other chapters (book pp.199/209) are intentionally excluded from the core focus
  list and not selectable.
- 🟧 **Alien / exotic species creation** and **mutations** — only "Human" species
  is meaningfully supported; no alien-generation or mutation rules.
- 🟨 **Henchmen statblocks** — Henchkeeper references "Peaceful/Martial Humans"
  from the Xenobestiary; those NPC statblocks aren't included.
- 🟨 **Psychic techniques bought with skill points** — the book also lets you buy
  a technique for `1 SP × technique level` outside of a level-up free pick; the
  level-up UI supports this, but creation does not surface SP-bought techniques.

## Equipment & Trade

- 🟧 **Speculative trade** — trade goods (50 cr) and trade metals (10 cr) and the
  speculative-cargo / merchant trade rules are not modeled (no natural gear
  category; left out deliberately).
- 🟨 **Vehicles, drones, mechs** — vehicle/mech creation and stat blocks, and the
  separate Mech Weapons table, are not implemented (mechs exist only as a carried
  reference on ships).

## Sector / World / GM tools

- 🟥 **World / sector generation tables** — world tags, atmosphere/biosphere/
  population/TL generators and the sector-creation procedure aren't automated
  (the hex map is hand-edited).
- 🟧 **Society / religion / culture / NPC / adventure generators** — the GM
  random-generator toolset isn't included.
- 🟨 **Spike-drive travel & navigation rules** — drill difficulty, fuel, mishaps,
  and travel-time computation aren't modeled.

---

*Maintenance note:* when one of these is implemented, delete its entry here.
