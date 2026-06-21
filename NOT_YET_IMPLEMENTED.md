# SWN Tool — Not Yet Implemented

A running list of *Stars Without Number (Revised)* rulebook content that the tool
does **not** yet model. Created alongside the `RULES_AUDIT.md` fixes (data
corrections for backgrounds, foci, psionics, equipment, starships, and factions
are **done**; the items below are deferred features, mostly new subsystems/UI).

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

Costs, drive scaling, weapon stats, the 7 missing fittings, and build-constraint
checks (drive/fitting/weapon class + crew bounds) are now correct.

- 🟧 **Weapon-quality modeling** — no fields for ammo capacity scaling by hull
  class, the included free ammo unit, or the Flak / Cloud / Clumsy combat
  mechanics; Foxer Drones' "Ammo 5" is unmodeled. (Qualities are stored as
  display strings only.)
- 🟨 **System Drive bonuses** — modeled as a normal fitting; its actual effect
  (−10% hull cost, +1/+2/+3/+4 power and ×2 free mass by class, no interstellar
  drills) isn't applied to derived stats.
- 🟨 **"Special"-cost fittings** (Psionic Anchorpoint, Teleportation Pads) are
  given nominal/placeholder costs since the book lists them as rarely-purchasable.
- 🟨 **Picker-level gating** — drive rating isn't disabled in the drive picker for
  too-small hulls (the review step flags it via `buildErrors`).
- 🟧 **Ship combat** — command points, gunnery, crisis resolution: the `Ship`
  type has fields (`commandPoints`, `departments`, `activeCrises`) but no combat
  loop drives them.

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

*Maintenance note:* when one of these is implemented, delete its entry here and
(if it was an audit item) update `RULES_AUDIT.md`.
