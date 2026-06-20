# Performance & Storage Optimization Plan

Audit date: 2026-06-20 (supersedes 2026-06-16 audit)

Whole-app performance pass, focused on mobile/PWA. The lag has two distinct sources:

1. **Sustained GPU fill cost** → steady low framerate. Dominated by uncapped device-pixel-ratio (every canvas renders at full retina res, 2.5–3.5× on phones), antialias on everywhere, and shadows on in the system view.
2. **Per-frame GC churn** → intermittent micro-stutter / "jitter". Several `useFrame` loops allocate `new THREE.*` objects and arrays every frame.

Tiers are ordered by impact-per-effort. We implement **tier by tier** so each change can be tested in isolation.

> Architecture note: each view (Galaxy / SectorHex / System) owns its **own `<Canvas>`**. Navigating away unmounts the Canvas, which tears down the whole WebGL context and frees all its GPU memory automatically. This is why the galaxy view (incl. its 5,000-instance sparkle mesh) needs no manual cleanup on navigation, and it is **deliberately left as-is** in this plan. The system view is different — see Tier 6.

---

## Tier 1 — Global cheap wins (do first, biggest mobile gain)

Touches all three canvases; dominates mobile cost. Confirmed: no `dpr`, no `frameloop`, `antialias: true` everywhere, `shadows` on in system view.

- [x] **Cap DPR** — added `dpr={[1, isMobile ? 1.5 : 2]}` to all three `<Canvas>`.
  - `GalaxyView.tsx`, `SectorHexView.tsx`, `SystemViewer.tsx`
  - Single biggest mobile win. Cuts fragment/fill work ~2–4×.
- [x] **Disable antialias on mobile** — `gl={{ antialias: !isMobile, ... }}` on all three.
  - ~Halves GPU load on mobile. A slightly higher DPR cap offsets the visual loss.
- [x] **Keep shadows on mobile, but make them cheap** (chose to keep shadows — they look great — and cut their cost instead of disabling):
  - Asteroid belt (~2200 instances) + comet particle trail shadows are now gated behind a new **"Asteroid shadows (high performance impact)"** toggle in System Settings, **default off**. `SystemPrefs.asteroidShadows` → `AsteroidBelt`/`CometObject` `castShadows` prop. Comet nucleus still casts always (single cheap mesh).
  - Capped shadow map at **1024 on mobile** (desktop unchanged: 2048 HQ / 512 LQ) — `StarObject.tsx` `shadowMapSize`.
  - `SystemViewer.tsx` shadows left **on** for all devices.
  - Kept: planet, ring, station (and comet nucleus) shadows.
  - (Added a local `isMobile` in `SystemViewer.tsx` and `StarObject.tsx`; the other canvases already had it.)

> Not pursuing `frameloop="demand"`: the galaxy rotates, planets orbit, and the selected hex pulses continuously, so "demand" rarely idles and risks freezing animation. DPR/AA/shadows are the better levers.

---

## Tier 2 — Per-frame allocations (kills the jitter)

Each allocates inside `useFrame`. Convert to pre-allocated module/ref scratch objects (the codebase already does this correctly elsewhere, e.g. `_worldPos`).

- [ ] **CometObject** `CometObject.tsx:~192` — `new THREE.Vector3()` every frame (velocity) **+** `particlesRef.filter(...)` allocating a new array every frame. Likely the worst per-frame offender (also 40-vertex ribbon × 6 attribute setters + 3 `needsUpdate` GPU syncs/frame). Pre-allocate the vector; mutate the particle array in place.
- [ ] **PlanetObject (tidally locked)** `PlanetObject.tsx:~190` — 3× `Vector3` + 1× `Quaternion` allocated every frame. Pre-allocate scratch objects.
- [ ] **PlanetObject (rings)** `PlanetObject.tsx:~222` — `resolveRingBands(obj)` recomputed every frame for ringed planets. Memoize on `obj`.
- [ ] **FactionConnectionWeb** `FactionConnectionWeb.tsx:~95` — O(n²) Prim's MST recomputed every frame (with array allocs) while the web is visible. Recompute only when positions change meaningfully, or throttle to a few Hz.
- [ ] **PlanetPOIMarkers** `PlanetPOIMarkers.tsx:~89` — `new Vector2()` + `new Sphere()` every frame *while dragging a POI*. Pre-allocate.
- [ ] **CameraFollower** `SystemViewer.tsx:~51` — `scene.getObjectByName()` walks the whole graph every frame when an object is selected. Cache the resolved object ref; re-resolve only when `selectedObjectId` changes.
- [ ] **SystemScene fadeGroup** `SystemScene.tsx:~48` — `Array.isArray(material)` alloc + `.forEach` closure inside a full `traverse()` each intro frame. Minor (intro only); also `return` early once intro opacity reaches 1.

---

## Tier 3 — Scene-complexity reductions on mobile

Hard-coded counts with no mobile scaling. Gate on the existing `isMobile` flag. (Galaxy sparkle count intentionally excluded.)

- [x] **AsteroidBelt** `AsteroidBelt.tsx` — mobile: 700, desktop: 3200 (increased). Also reduced asteroid base-size multiplier (0.0035→0.002) and per-instance scale range ([0.5,1.5]→[0.3,1.0]) for all devices.
- [x] **BackgroundGalaxies** — mobile: 60 galaxies / 150 stars, desktop: 120 / 350. Replaced per-frame `traverse()` with direct material refs (no array alloc, no tree walk).
- [x] **Starfield** — SectorHexView: 400 mobile / 1200 desktop. SystemScene: 350 mobile / 900 desktop.
- [x] **StarObject** — `highQuality` default changed to `!isMobile` in SystemScene, so mobile uses LQ path (2 prominence slots × 36, 36 BH chunks) instead of HQ (3 slots, 80 chunks).

---

## Tier 4 — Background / tab-switching (mobile leave-and-return)

Correction to the previous audit: browsers already suspend `requestAnimationFrame` on hidden tabs, so `useFrame` loops pause on their own — background battery drain is **not** the real issue. The real issues on returning are:

- [ ] **WebGL context-loss recovery** — no `webglcontextlost` / `webglcontextrestored` handler anywhere. On mobile (esp. iOS Safari / PWA standalone) the GPU discards the context when backgrounded under memory pressure; the canvas then returns **blank/frozen**. Add handlers (r3f exposes this, or attach to `gl.domElement`). Most likely "it broke after I switched apps" bug.
- [ ] **Delta-spike clamp** — first frame after resuming gets a huge `delta` (seconds), so orbits/animations lurch forward. Clamp in `useFrame` loops: `const dt = Math.min(delta, 0.05)`. Cheap, removes the visible jump.

---

## Tier 5 — Re-render architecture

Several components subscribe to the **whole** store (no selector), so any mutation anywhere re-renders them.

- [ ] **Granular selectors** — replace full-store destructures with `useSectorStore(s => s.x)`:
  - `SectorHexView.tsx:108` (re-renders the canvas owner + all 80 HexCells on any store change)
  - `SystemViewer.tsx:147`, `GalaxyView.tsx:97`, `App.tsx:29`
  - Good pattern already used in `FactionZoneBands.tsx:15`.
- [ ] **Memoize per-cell props** — `HexGrid.tsx:27` re-maps 80 cells with freshly computed props on every parent render. Moderate impact, but compounds with editing actions.

---

## Tier 6 — Storage & VRAM (correctness, not framerate)

### Rules PDF (serve it properly)
- [ ] **Commit the file** — `public/swn-rules.pdf` (11 MB) exists but is **not tracked by git**, so it never deploys. Commit it (consider Git LFS to keep clones small). Workbox `maximumFileSizeToCacheInBytes` is 5 MB, so the SW won't precache it — it'll fetch on demand, which is correct.
- [ ] **Fix the path** — `PDFViewer.tsx:121` hardcodes `file="/swn-rules.pdf"`. With `base: '/swn-builder/'` this 404s on GitHub Pages. Use `file={import.meta.env.BASE_URL + 'swn-rules.pdf'}`.

### Binary blobs out of the store
Currently images and PDFs are stored as **base64 strings inside the persisted Zustand JSON**, which is re-serialized to IndexedDB on every unrelated edit (base64 also inflates binary ~33%).

- [ ] **Character PDF attachment** — keep PDF as the format (don't make users convert; PDFs don't recompress). Change storage: save the raw `File`/`Blob` under its own localforage key (`pdf:<charId>`), keep only an id on the character (`character.ts:120`, `CharacterSheet.tsx:132`). Display via `URL.createObjectURL(blob)` (react-pdf accepts it directly; `CharacterSheet.tsx:1073`). Add a **size cap (~1–2 MB)** and `try/catch` for `QuotaExceededError` with a visible message.
- [ ] **Portrait / ship images** — keep the feature (15–25 KB each is fine). Move to the same blob-key pattern so they're out of the hot serialization path (`PortraitEditor.tsx:95`). Optional: quality 0.75 or WebP.

### Write & quota hygiene
- [ ] **Debounce persistence** — Zustand `persist` (`useSectorStore.ts:609`) and the `useCharacters` effect (`useCharacters.ts:131`) serialize the entire store to IndexedDB on every mutation (every keystroke in a name/notes field). Debounce ~500 ms.
- [ ] **QuotaExceededError handling** — `useCharacters.ts:134` only logs. Surface a visible error toast on failed writes.
- [ ] **Warn at high usage** — use `navigator.storage.estimate()` after saves; warn if `usage/quota > 0.8`.

### VRAM disposal (system view — distinct from the galaxy)
The system view does **not** unmount its `<Canvas>` when switching systems, so the context stays alive and un-disposed resources accumulate.
- [ ] **modelLoader.ts** — caches then `.clone()`s with no disposal. Dispose cloned geometries/materials on `SpaceStation` unmount.
- [ ] **CanvasTextures** — StarObject / NebulaObject / PlanetObject textures are memoized but never disposed on unmount. Dispose on unmount to bound VRAM growth across many system switches (also reduces context-loss risk from Tier 4).

---

## Suggested order
Tier 1 (huge mobile gain) → Tier 4 (context-loss + delta clamp) → Tier 2 (jitter) → Tier 3 (mobile counts) → Tier 5 (selectors) → Tier 6 (storage/VRAM).

---

## Estimated storage footprint (reference)

| Scenario | Estimated size |
|---|---|
| 1 sector, no characters | ~100 KB |
| 5 sectors, 4 characters (no portraits) | ~700 KB |
| 10 sectors, 4 characters with portraits | ~1.1 MB |
| 20 sectors, 2 full parties with portraits | ~3.5–4.5 MB |
| Any character with PDF attachment (base64, current) | +15 MB — exceeds quota |
