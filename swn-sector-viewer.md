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

