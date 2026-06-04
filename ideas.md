
1. Char overview page.
-> instead of view sheet, i would make the card clickable, also add nice hover effect
-> on the card only show the following props with icons: name (person-standing), species (dna), class (sparkles), level (arrow-big-up), background (scroll-text). Keep the delete button, also add a retire button. (for char deaths, use skull icon)

2. Char builder/sheet
- ammo reloading should also keep track of stowed/ready ammo imo. reloading not possible if no ammo readied/stowed
- ready/stow for stacked items (including ammo), should follow rules of encumbrance as stated in swn source material. So it should be possible to stow separate items instead of a full stack, check on source material before editing
- check inner workings of psychic before further editing the layout

--- questions ---
->  How are characters saved at this moment? locally somewhere?

----- only do 1 and 2 for now ----

3. Ship builder

- tracker for character/ship
pathbuilder lets you create your character but also use it as reference sheet and actual sheet.
so i want to be able to keep track of hp, equipment, ammo, certain abilities,notes etc so that i do not have to have a physical sheet.

- Deluxe extras builders

import/export for porting from and to different devices (choose easiest format will prob be xml or json, but you can choose)

- PDF export
Every created thing should have an export to pdf for downloading.
We should leave some stuff empty for pdf so that when we print them we can manually edit our sheets with pencil. Think about stats, skills, equipment, credits etc.
For example Shoot-0 -> should probably be Shoot- , where we then can fill in the number ourselves.

- Import images for character/ship
- Import file for backstory for quick reference. This file should also be able to be opened like the pdf of swn itself 
(prob pdf, xml, md depending on what is automatically supported by android)

Silly mode
 - with star wars esque changes of pages like those scenes switch.
 - space noices with each click/button (different kind of pitch if used a lot)
 - achievements
 - mini game

With any dice roll selection, roll actual dice that we can see the result of, so for example for rolling stats we should see the roll one by one. (could be silly mode addition)

- add Different styles of website
definitely keep the current style, very nicely done
add extra styles, my favorites of course based on, homeworld, mass effect, expanse, cyberpunk.
also change the background, i will provide them though  

BIG QUESTION IF THIS IS POSSIBLE
- sector builder with selections of all kinds of different celestial objects (stars, black holes, quasars, super novas, neutron stars, comets, asteroid fields, gas giants, planets, moons, our current ship, armada's space stations, you name it.) that you can choose from to build your sector.
this should be pretty doable.
-but then the bigh trick is that i want a rendered 3d view of the sector (part of galaxy), then the local cluster, then a system, then a planet, then a base/ship/station
this would be pretty low polygon items. but would be cool if lets say on the solar system you would be able to see the planets revolve around the sun and themselves, moons around planets etc. we could let them choose between 1 or 2 colors just to get a feeling for it. No idea how feasable this is with current tools and or platform and if it wouldnt be too intensive on the system. But the low polygon art style would be pretty nice to have in that part.

WN SECTOR VIEWER — STANDALONE MODULE
Build a standalone 3D sector viewer as a React + TypeScript component using Three.js via react-three-fiber and @react-three/drei. It will later be dropped into an existing Vite + React + TypeScript + Tailwind + Zustand project as a /sector route.
Core features:

Hex-grid sector overview with named star systems as clickable low-poly stars
Click a star → smooth camera zoom into that system
System view: planets orbiting their star, moons orbiting planets, optional asteroid belt, optional space station
Hover tooltip on planets showing name and SWN world tags
Back button returns to sector overview
GM can add/edit/remove systems and planets via a simple sidebar panel
Sector data stored in Zustand + exported/imported as JSON

Interaction:

Click star → enter system
Hover planet → tooltip (name, world tags)
Back → sector overview
GM mode toggle → sidebar to add/edit celestial objects

3D style guide (strict):

All geometry flat-shaded: flatShading: true on all materials
Stars: IcosahedronGeometry detail 1, point light glow behind them
Planets: IcosahedronGeometry detail 0–1, visible chunky triangle faces, slight color variation per face
Moons: IcosahedronGeometry detail 0
Asteroid belts: particle points in a ring
Space stations: simple low-poly angular geometry
Background: particle starfield
UI overlay: monospace font, dark with subtle blue tint, minimal
Reference aesthetic: low-poly indie space game, flat triangle faces clearly visible, not smooth or realistic

Data model (JSON):
json{
  "sectorName": "Veiled Expanse",
  "systems": [
    {
      "id": "sys-1",
      "name": "Arcturus Prime",
      "x": -22, "z": -18,
      "starColor": "#88aaff",
      "tags": ["Pretech Remnants", "Hostile Space"],
      "planets": [
        {
          "id": "pl-1",
          "name": "Verdana",
          "tags": ["Inhabited", "Trade Hub"],
          "color": "#4488cc",
          "orbitRadius": 12,
          "hasMoon": true,
          "hasStation": false
        }
      ],
      "hasAsteroidBelt": true
    }
  ]
}
Notes:

Build as a self-contained route component, no tight coupling to the rest of the app
PWA/mobile friendly, runs well on mid-range Android
GM edit mode behind a simple toggle, no auth needed