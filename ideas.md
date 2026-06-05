1.🔄️ STORAGE 💽⏳
- Now working with indexedDB through browser data. Export/Import should now be used for saving. Eventually we will use capacitator on android which will take care of saving/loading from and to that json

2.🔄️ Char builder/sheet ⚠️⏳
- Read up on rules first before editing wizard/char overview pages any further ⚠️
- ammo reloading should also keep track of stowed/ready ammo imo. reloading not possible if no ammo readied/stowed
- ready/stow for stacked items (including ammo), should follow rules of encumbrance as stated in swn source material. So it should be possible to stow separate items instead of a full stack, check on source material before editing
- check inner workings of psychic before further editing the layout

3.🔄️ Ship builder

- tracker for character/ship
pathbuilder lets you create your character but also use it as reference sheet and actual sheet.
so i want to be able to keep track of hp, equipment, ammo, certain abilities,notes etc so that i do not have to have a physical sheet.

4. Deluxe extras builders

5.✅ import/export for porting from and to different devices (choose easiest format will prob be xml or json, but you can choose)

6. PDF export
Every created thing should have an export to pdf for downloading.
We should leave some stuff empty for pdf so that when we print them we can manually edit our sheets with pencil. Think about stats, skills, equipment, credits etc.
For example Shoot-0 -> should probably be Shoot- , where we then can fill in the number ourselves.

- Import images for ship
- Import file for backstory for quick reference. This file should also be able to be opened like the pdf of swn itself 
(prob pdf, xml, md depending on what is automatically supported by android)

9. add Different styles of website
definitely keep the current style, very nicely done
add extra styles, my favorites of course based on, homeworld, mass effect, expanse, cyberpunk.
also change the background, i will provide them though  

10. Silly mode
 - with star wars esque changes of pages like those scenes switch.
 - space noices with each click/button (different kind of pitch if used a lot)
 - achievements
 - mini game

With any dice roll selection, roll actual dice that we can see the result of, so for example for rolling stats we should see the roll one by one. (could be silly mode addition)

11. !
🌌🌌🌌🌌🌌🌌

SWN SECTOR VIEWER — PROJECT OVERVIEW
What exists (v0.1 — prototype) (in a different project, if you want source code, i can give it to you, but i think you can come up with better stuff)
A working React + react-three-fiber proof of concept exists with:

A rotating low-poly Sun using sphereGeometry with emissive material and a pointLight
A planet (Earth) with inclined orbital mechanics via getOrbitPosition(angle, radius, inclination), self-rotation, and an orbit ring component
Objects casting shadows, animated via useFrame
The foundation is functional and the orbital math handles inclination correctly

What we're building
A two-layer interactive 3D sector map for a private SWN (Stars Without Number Deluxe Revised) TTRPG group.

Layer 1 - Galaxy view — low-poly swirl
Sector clusters as glowing points 

Layer 2 — Sector Overview (hex grid) -> could be 2.5D
A top-down hexagonal grid representing the sector. Each hex can contain a star system, a faction territory, or be empty. Hexes are color-coded by faction or content type. Clicking a hex opens a panel listing all objects in that system, ordered from star outward (star → inner planets → asteroid belt → outer planets → gas giants → moons → space stations etc.). This list is fully editable — the GM can add, remove, and reorder objects, define parent-child relationships (e.g. moon belongs to planet, station orbits gas giant), and set properties per object.
Editable properties per object:

Type: Star, Black Hole, Planet, Gas Giant, Moon, Asteroid Belt, Space Station, Jump Gate, etc.
Name, color, size (relative scale)
Orbit radius and inclination -> could be set manually, or we choose random orbits between certain margins, based on the location of the object in the system
Parent object (for moons, stations)
Custom notes / SWN world tags / factions

When hovered over hex cell, it could be highlighted and lifted a bit out of the grid. when clicked, system should be able to be edited as stated before. 

Layer 3 — System Viewer (3D render)
When the GM or player clicks "View System" from the hex panel, the app transitions into a 3D rendered view of that system built from the data defined in Layer 1. Uses the existing prototype as foundation.
Render features:

Sun(s) with emissive glow and point light
Planets and gas giants on inclined orbits with self-rotation
Moons orbiting their parent planet
Asteroid belts as particle rings
Space stations as low-poly angular meshes
Orbit rings visualizing each object's path
Shadows and basic lighting from the star

-> the way the system would be setup should be based on the "system tree" defined in layer 2.

Art style:

Fun over realistic — scale is exaggerated for readability
Low-poly / flat-shaded aesthetic where applicable
Color (1 or 2 depending on object) chosen per object by the GM
No attempt at scientific accuracy, with a few exceptions like lighting/shading/shadows from sun and others.

The aesthetic continuity across all three layers is going to look really cohesive — same flat shading, same color language, same particle starfield behind everything. Low-poly scales beautifully from galaxy down to moon.
Good additions, fits the vision perfectly.
All three layers should also use leader lines/callout lines with the name of the sector/system/object depending on the layer.

Tech stack, you may deviate if needed

Vite + React + TypeScript
react-three-fiber + @react-three/drei for 3D
Zustand for state
localStorage + JSON export/import for persistence
Tailwind for UI panels
PWA ready for mobile use

Phased build order:

Hex grid sector overview with clickable hexes
Object list panel (editable, ordered, parent-child)
System viewer pulling from that data
Polish — transitions, camera zoom, hover tooltips
Faction coloring and sector-level metadata

Galaxy → Sector zoom
A low-poly galaxy view as the entry point — think a flat swirling arm shape made of low-poly geometry with glowing cluster points representing sectors. Click a sector cluster → camera zooms in hard → hex grid fades in. Three layers total: Galaxy → Sector → System.
Hex zoom transition
From the hex grid, clicking a hex triggers a dramatic camera push toward that hex, stars/dots expanding as you close in — then the system renderer fades in at the end of the zoom. Sells the sense of actual space travel between scales.
Why this works technically
All three layers can live in the same Three.js scene or transition between scenes. The zoom is just a camera animation (lerp or spring via Drei's useSpring). The galaxy layer is cheap — a few hundred low-poly vertices and some particles.

