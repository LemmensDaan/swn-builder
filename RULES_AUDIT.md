# SWN Rules Audit — Tool vs. `public/swn-rules.pdf`

Audit of the character, ship, and faction data in `src/data/` against the
*Stars Without Number (Revised)* rulebook (325-page PDF). Page references are
PDF page numbers. Each domain was cross-checked rule-by-rule against the
extracted rulebook text.

**Verdict at a glance**

| Domain | State | Notes |
|---|---|---|
| Attributes / derived stats | ✅ Correct | `attrMod`, HP, saves, attack bonus, skill stacking all match |
| Backgrounds | 🟡 Minor errors | 5 backgrounds have wrong growth/learning entries; 20/20 present |
| Skills | ✅ Correct | 19 skills + 6 disciplines complete |
| Foci | 🟡 Minor errors | 25/25 present; 4 hardcode a "choice" bonus skill |
| Leveling | ✅ Correct | XP table, focus levels, skill/attr costs all match |
| Psionics | 🟡 Minor errors | All 6 disciplines + every technique present; a few effect texts + Effort calc wrong |
| Equipment | 🟡 Gaps | 3 stat errors; Heavy Weapons table + ~15 gear items missing |
| **Starships** | 🔴 Major errors | Cost multiplier wrong (1/2/4/8 vs 1/10/25/100); drive costs wrong; 4 weapons wrong; 7 fittings missing |
| **Factions** | 🔴 Largely wrong | ~9 invented assets, most stats wrong, ~58 real assets missing, goals/tags mostly fabricated, HP formula wrong |

---

## 1. Attributes, Backgrounds & Derived Stats

`derivation.ts` and `types/character.ts` are **correct**: attribute modifier table
(p.6/8), `calcSaves` (16−level−bestMod ≡ book's "15, −1/level past 1", p.49),
`calcAttackBonus` (Warrior = level; Partial Warrior cumulative +1 at L1 & L5, p.61),
HP (1d6 + CON mod, p.8), Die Hard +2/level, and the creation skill-stacking cap
(−1→0→1, p.10). The 3d6-down-the-line / swap-to-14 and the 14/12/11/10/9/7 array
are implemented correctly. All 20 backgrounds are present (none missing or extra).

### Incorrect

- **`backgrounds.ts` Spacer `growth`** (~line 143): tool `['+1 Any Stat','+2 Physical','+2 Mental','+2 Mental','Connect','Any Skill']`. Book: `+1 Any Stat / +2 Physical / +2 Physical / +2 Mental / Exert / Any Skill` (p.18). Roll-3 should be **+2 Physical** (not Mental) and roll-5 should be **Exert** (not Connect). Changes outcome distribution.
- **`backgrounds.ts` Official `learning`** (~line 88): tool `['Administer','Connect','Know','Lead','Notice','Talk','Talk','Trade']`. Book d8: `Administer / Any Skill / Connect / Know / Lead / Notice / Talk / Trade` (p.16). Tool is **missing "Any Skill"** (slot 2) and has a **duplicate "Talk"**.
- **`backgrounds.ts` Courtesan `growth`** (~line 39): tool has rolls 3/4 = `+2 Physical, +2 Mental`. Book: roll-3 `+2 Mental`, roll-4 `+2 Physical` (p.15). Same multiset but wrong roll→result mapping.
- **`backgrounds.ts` Pilot `quickSkills`** (~line 110): tool `['Pilot','Fix','Shoot']`. Book lists the third as **"Shoot or Trade"** (p.17) — the Trade alternative is dropped.
- **`backgrounds.ts` Thug `learning`** (~line 160): slot 6 is `Stab`. Book: **"Stab or Shoot"** (p.18) — the Shoot alternative is dropped.

---

## 2. Skills, Foci & Leveling

Skill list (19) + psychic disciplines (6) complete and correctly named (p.12).
All **25 foci present**, none missing or invented. `leveling.ts` fully correct:
XP_TABLE (p.60, incl. 11+ = +24/level), `FOCUS_LEVELS = {2,5,7,10}` (p.61),
`skillRaiseCost = toLevel+1` (p.61: L0=1…L4=5), `maxSkillLevel` thresholds,
`ATTR_BOOST_COSTS = [1,2,3,4,5]` with required levels 3/6/9. `isCombat` flags all
correct (8 combat foci).

### Incorrect (all are "choice collapsed to a fixed value")

- **`foci.ts` Close Combatant `bonusSkill`** (~line 60): hardcodes `'Stab'`. Book: "Gain **any combat skill** as a bonus" (p.20). Its own description says "any combat skill" — data contradicts it.
- **`foci.ts` Shocking Assault `bonusSkill`** (~line 160): hardcodes `'Punch'`. Book: "**Punch or Stab**" (p.22).
- **`foci.ts` Specialist** (~line 173): no `bonusSkill`. Book: "any **non-combat, non-psychic** skill" (p.22) — should be a player choice.
- **`foci.ts` Psychic Training** (~line 137): no `bonusSkill`. Book: "any **psychic** skill" (p.22).
- *(Consistency:* Close Combatant/Shocking Assault hardcode an arbitrary skill while Specialist/Psychic Training leave it blank — pick one representation for "choice" bonus skills.)*
- **`foci.ts` Henchkeeper level-1** (~line 123): omits that base henchmen are **Peaceful Humans** (p.21); level-2 "Martial Humans" is correct.

### Missing
None. (Origin foci live in other chapters, p.199/209, outside the core focus list — not a gap.)

---

## 3. Psionics

All **6 disciplines and every technique are present and correctly tiered**
(verified pp.36–47): Biopsionics (11), Metapsionics (12), Precognition (10),
Telekinesis (12), Telepathy (8), Teleportation (10). No missing/extra techniques.

### Incorrect

- **`psychics.ts` Teratic Overload (Biopsionics)** (~line 42): describes only the cancer; **omits "damage is tripled" on a failed save** (p.36).
- **`psychics.ts` Slip Field (Telekinesis)** (~line 122): missing the **"targets who save are immune to this technique for the scene"** clause (p.42).
- **`psychics.ts` Unity of Thought (Telepathy)** (~line 154): says one member gets an extra **action**; book says an extra **round of action** (p.41).
- **`psychics.ts` Telekinetic Manipulation core/level-0** (~line 110): omits base mechanics — Main Action + Commit Effort for the scene, 1d6/skill-level/round to immobile unliving objects only, 20 m/round (p.42).
- **`character.ts` `calcEffort`** (~lines 144–149): base formula `1 + highest psychic skill + best(WIS/CON)` is correct (p.31), but **ignores Metapsionics "Psychic Refinement"** (+1 max Effort at skill 1, another +1 at skill 3, p.38) and the Psychic Training focus +1. Max Effort is under-reported by 1 (skill 1+) or 2 (skill 3+) for Metapsions. The data file even documents these bonuses but the calc doesn't apply them.
- **`Step7Psychics.tsx`** (~lines 148–151): the `available = tech.level <= skillLevel + 1` gate lets a **level-0 discipline pick a level-1 technique**. Book (p.34): a technique pick is granted only when you **improve a skill level**, and you can't pick a technique above your mastered level. A level-0 discipline has earned no pick.

### Missing
- **System Strain cost of Psychic Succor** (1 point, 2 if mortally wounded, p.36) not represented on the Biopsionics core entry. (Otherwise effort/action costs are inconsistently captured across core techniques but present in level text.)

---

## 4. Equipment

Ranged weapons (24) and melee weapons all match (pp.67–68). Most armor and gear
stats correct (pp.69, 74).

### Incorrect (stat mismatches)
- **`equipment.ts` Shield `enc`** (~line 112): tool `1`; book **2** (p.69).
- **`equipment.ts` Field Radio `tl`** (~line 230): tool `3`; book **4** (p.74).
- **`equipment.ts` Vacc Fresher `enc`** (~line 276): tool `3`; book **1** (p.74).

### Missing
- **Entire Heavy Weapons table** (p.73): Heavy Machine Gun, Rocket Launcher, Demolition Charge, Railgun, Anti-Vehicle Laser, Hydra Array, Wheatcutter Belt, Vortex Cannon.
- **Gear** (p.74): Data phase tap, Data protocol, Remote link unit, Stiletto charge, Storage unit, Tightbeam link unit, Tailored antiallergens, Portabox, Telescoping pole, and pharmaceuticals Bezoar, Brainwave, Reverie, Squeal. (Trade goods/metals lower priority.)
- **Dual-TL variants** not modeled: Grav Chute (TL5/1,000cr orbital version) and Rope (TL0/4cr/enc 2 variant). Backpack is already correctly split.
- Flavor-only notes (not stat errors): Mag ammo "no power cells needed"; Solar Recharger / Binoculars descriptive specs.

---

## 5. Starships 🔴

Hulls (12) all match the p.99 table. Defenses (9) all match (p.105). But there are
systemic cost errors and several wrong/missing items.

### Incorrect

**Cost-scaling (systemic):**
- **`ships.ts` `COST_MULT`** (~lines 142–147): tool uses **Fighter 1 / Frigate 2 / Cruiser 4 / Capital 8**. Book asterisk rule is **×10 / ×25 / ×100** for frigate/cruiser/capital (pp.100, 105; explicit example p.101: a frigate Drill Course Regulator pays 250,000 not 25,000). **Every cost-scaled (`*`) fitting/defense is wrong.** (`PM_MULT` for power/mass = 1/2/3/4 is correct.)

**Drive upgrades** (`DRIVE_UPGRADES`, ~lines 364–410; table p.101) — costs wrong and cost-scaling unimplemented (`deriveShip` uses flat `drive.cost`):
- Drive-2: tool 25,000 → book **10k\***
- Drive-3: tool 40,000 → book **20k\***
- Drive-4: tool 100,000 → book **40k\***
- Drive-5: tool 200,000 → book **100k\***
- Drive-6: tool 500,000 (base ok) → book **500k\*** (still missing scaling)
- (Power/mass values 1/2/2/3/3 and 1/2/3/3/4 are correct.)

**Weapons** (table p.106–107):
- **Singularity Gun** (~line 660): damage `1d20`→**5d20**; power `15`→**25**.
- **Mass Cannon** (~line 634): damage `3d20`→**2d20**; power `20`→**10**; mass `10`→**5**.
- **Vortex Tunnel Inductor** (~line 621): power `15`→**20**; mass `5`→**10**.

**Fittings** (table p.101):
- **Mobile Factory** (~line 1100): cost `100,000`→**50k\***; minClass `Frigate`→**Cruiser**.
- **Workshop** (~line 1230): cost `10,000`→**500\***; mass `2`→**0.5**.
- **Mobile Extractor** (~line 1087): tool marks `costScaled`/`massScaled` true; book "Mobile extractor 50k" has **no asterisk and no `#`** — both should be flat.

**Build constraints not enforced** (`deriveShip`, ~lines 1256–1363): minimum-crew bounds vs `hull.crewMin/Max`; fitting `minClass`/`maxClass` availability; drive `minClass` (Drive-4/5 need Frigate, Drive-6 needs Cruiser). Over-power/mass/hardpoint checks **are** implemented.

### Missing
- **Fittings**: Cargo Lighter (25k), Colony Core (100k\*), Exodus Bay (50k\*), Psionic Anchorpoint, System Drive, Teleportation Pads, Tractor Beams (10k\*).
- **Weapon-quality modeling**: no field for ammo-capacity scaling by hull class, included free ammo unit, or Flak/Cloud/Clumsy mechanics; Foxer Drones' "Ammo 5" unmodeled.
- (No hulls, weapons, or defenses are missing.)

---

## 6. Factions 🔴

`faction-assets.ts` (63 lines) is largely incorrect. Of ~27 asset entries, ~9 are
invented names and most others have wrong rating/HP/attack/counter. The rulebook
defines ~60+ assets across Force/Cunning/Wealth (pp.219, 221, 223); the bulk are
missing, and none carry cost/TL/maintenance/type. Goals and tags are mostly
fabricated.

### Incorrect — HP formula & data model
- **`FactionScreen.tsx` `derivedMaxHp`** (~lines 8–10): returns `force + cunning + wealth + 3`. Book: Max HP = **4 + sum of the XP-cost values** of the three ratings, where rating→value is non-linear (1→1, 2→2, 3→4, 4→6, 5→9, 6→12, 7→16, 8→20). E.g. Force 3/Cun 2/Wealth 2 = 4+4+2+2 = **12** (tool gives 10). Constant should be **+4**, and ratings ≥3 are non-linear (p.221).

### Incorrect — invented assets (do not exist in the book)
`Free Company`, `Soldiers`, `Fighters` (Force); `Vory`, `Assassins` (Cunning); `Merchants`, `Preachers`, `Speculators`, `Usurers` (Wealth). (~lines 16–18, 31, 33, 38–41.)

### Incorrect — wrong stats on real assets (selected; see file for all)
- **Militia Unit**: HP 3→**4**, counter `1d6`→**1d4+1** (p.221).
- **Hardened Personnel**: Force 3→**2**, HP 8→**4**, no Attack, counter **1d4+1** (p.221).
- **Beachhead Landers**: Force 3→**4**, HP 8→**10**, Facility, no Attack/Counter (p.221).
- **Guerrilla Populace**: Force 4→**2**, HP 12→**6**, Force-vs-**Cunning** 1d4+1, no Counter (p.221).
- **Strike Fleet**: HP 12→**8**, attack→**2d6**, counter→**1d8** (p.221).
- **Planetary Defenses**: Force 5→**6**, HP 12→**20**, no Attack, counter **2d6+6** (p.221).
- **Capital Fleet**: Force 6→**8**, HP 16→**30**, attack **3d10+4**, counter **3d8** (p.221).
- **Smugglers** ("Smuggling Fleet"): attack **1d4 vs Wealth**, no Counter (p.219).
- **Saboteurs**: HP 5→**6**, attack **2d4**, no Counter (p.219).
- **Blackmail**: attack `2d6`→**1d4+1** (p.219).
- **Seductress**: Cunning 3→**2**, HP 6→**4**, special no-damage attack (p.219).
- **Covert Shipping**: Cunning 4→**3**, HP 8→**4**, Logistics Facility, no Attack/Counter (p.219).
- **Franchise**: HP 2→**3**, attack **1d4**, counter **1d4-1** (p.223).
- **Harvesters**: no Attack, counter **1d4** (p.223).
- **Mercenaries**: Wealth 2→**3**, attack **2d4+2 vs Force** (p.223).
- **Monopoly**: HP 10→**12**, attack **1d6**, counter **1d6** (p.223).
- **Pretech Researchers**: HP 10→**6**, no Attack/Counter (TL5 enabler) (p.223).
- **Informers**: attack should be "Cunning vs Cunning special", no Counter (p.219).

### Incorrect — goals (`FACTION_GOALS`, ~lines 54–62)
Mostly fabricated names/XP. Real goals (p.217) use **difficulty-derived** XP, not flat values:
- "Smash the Foe" → real: **Military/Commercial/Intelligence** (destroy F/C/W assets = your rating; Diff ½ destroyed).
- "Blood the Sword" → **Blood the Enemy** (damage = total F+C+W; **Diff 2**).
- "Peaceable Kingdom" → don't Attack for **four turns**; **Diff 1**.
- "Wealth of Worlds" → spend FacCreds = **4× Wealth** on bribes; **Diff 2**.
- "Infiltrate the Foe" → **Inside Enemy Territory** (stealthed assets on foreign worlds = Cunning; Diff 2).
- "Destroy the Foe" → Diff = **1 + avg of F/C/W**, not flat 5.
- "Seize the Pretech" → real **Planetary Seizure**.
- "Subvert the Foe" → no such goal.
- "Expand Influence" → **Diff 1** (+1 if contested).
- Also missing: **Invincible Valor**.

### Incorrect — tags (`FACTION_TAGS`, ~lines 47–51)
Only **Colonists, Imperialists, Perimeter Agency, Eugenics Cult, Pirates** are real;
the other ~15 (Psionics, Religious, Hegemony, Corporate, Military, Academic, etc.)
are invented. Real list (pp.224–225): Colonists, Deep Rooted, Eugenics Cult,
Exchange Consulate, Fanatical, Imperialists, Machiavellian, Mercenary Group,
Perimeter Agency, Pirates, Planetary Government, Plutocratic, Preceptor Archive,
Psychic Academy, Savage, Scavengers, Secretive, Technical Expertise, Theocratic,
Warlike. Tags also carry mechanical effects (none modeled).

### Missing — whole subsystems
- **Asset cost / TL / maintenance / type / special-note (P/A/S) fields** on `FactionAsset`/`ReferenceAsset` (the book defines all for every asset).
- **~58 real assets** absent (full per-asset list with `HP/Cost/TL/Type/Attack/Counter` is in the agent findings). Highlights: Security Personnel, Hitmen, Base of Influence (×3), Cyberninjas, Demagogue, Space Marines, Gravtank Formation, Scavenger Fleet, Pretech Manufactory, Bank, Medical Center, etc.
- **FacCreds** resource (income = ½ Wealth ↑ + ¼(Force+Cunning) ↓ per turn; asset buy/maint costs).
- **Rating→XP-cost table** and rating-raise validation (max rating **8**); `force/cunning/wealth` are currently unbounded.
- **Homeworld / Base of Influence / per-asset location**.
- **Faction turn mechanics**: turn order, action list (Attack, Buy Asset, Move, Expand Influence, Refit, Repair, Sell, Seize Planet, Use Ability), 1d10+attribute attack resolution, max-assets-per-type = rating.
- **Creation presets** (p.226): minor 4/3/1 (15 HP), major 6/5/3 (29 HP), hegemon 8/7/5 (49 HP); PC faction 2/1/1 (8 HP, one asset).

---

## Recommended fix priority

1. **Factions** — the data is fundamentally wrong (invented assets, wrong stats, wrong HP formula, fabricated goals/tags). Rebuild `faction-assets.ts` from the pp.219–225 tables and add cost/TL/maintenance/type fields.
2. **Starship costs** — fix `COST_MULT` to 1/10/25/100 and the drive-upgrade base costs + scaling; fix Singularity Gun / Mass Cannon / Vortex Tunnel Inductor / Mobile Factory / Workshop; add the 7 missing fittings.
3. **Equipment** — add the Heavy Weapons table; fix Shield/Field Radio/Vacc Fresher stats; add missing gear.
4. **Psionics** — fix `calcEffort` (Metapsionics/Psychic Training Effort bonus) and the Step7 level-0 technique gate; correct Teratic Overload / Slip Field / Unity of Thought text.
5. **Backgrounds & Foci** — fix the 5 background tables; decide on a "choice" representation for the 4 foci bonus skills.
