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

- [x] **CometObject** — Pre-allocated `_vel` ref replaces `new THREE.Vector3()` each frame. `filter`+`forEach` (new array + closure) replaced by single reverse-iteration `for` loop with in-place `splice`.
- [x] **PlanetObject (tidally locked)** — Pre-allocated `_toStar`, `_upVec`, `_rotAxis`, `_rotQuat` refs; TidallyLocked block now mutates these instead of allocating 3 Vectors + 1 Quaternion per frame.
- [x] **PlanetObject (rings)** — `memoRingBands = useMemo(() => resolveRingBands(obj), [obj])` replaces per-frame call.
- [x] **FactionConnectionWeb** — MST throttled to ~10 Hz via `mstTimerRef`; cached in `lastMstRef`. Line positions still update every frame from live positions.
- [x] **PlanetPOIMarkers** — `_mouseVec` + `_sphere` pre-allocated via `useMemo`; no more per-drag-frame `new Vector2/Sphere`.
- [x] **CameraFollower** — Already implemented: `trackedObjRef` caches the resolved `Object3D`; `scene.getObjectByName()` only called when the cached ref's name doesn't match.
- [x] **SystemScene fadeGroup** — `introDoneRef` early-exits all frames after the intro completes. `Array.isArray ? [...] : [m]` temp array + `.forEach` closure replaced with direct `if/else` + `for...of`.

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

- [x] **WebGL context-loss recovery** — no `webglcontextlost` / `webglcontextrestored` handler anywhere. On mobile (esp. iOS Safari / PWA standalone) the GPU discards the context when backgrounded under memory pressure; the canvas then returns **blank/frozen**. Add handlers (r3f exposes this, or attach to `gl.domElement`). Most likely "it broke after I switched apps" bug.
- [x] **Delta-spike clamp** — first frame after resuming gets a huge `delta` (seconds), so orbits/animations lurch forward. Clamp in `useFrame` loops: `const dt = Math.min(delta, 0.05)`. Cheap, removes the visible jump.

---

## Tier 5 — Re-render architecture

Several components subscribe to the **whole** store (no selector), so any mutation anywhere re-renders them.

- [x] **Granular selectors** — replace full-store destructures with `useSectorStore(s => s.x)`:
  - `SectorHexView.tsx:108` (re-renders the canvas owner + all 80 HexCells on any store change)
  - `SystemViewer.tsx:147`, `GalaxyView.tsx:97`, `App.tsx:29`
  - Good pattern already used in `FactionZoneBands.tsx:15`.
- [x] **Memoize per-cell props** — `HexGrid.tsx:27` re-maps 80 cells with freshly computed props on every parent render. Moderate impact, but compounds with editing actions.

---

## Tier 6 — Storage & VRAM (correctness, not framerate)

### Rules PDF (serve it properly)
- [x] **Commit the file** — `public/swn-rules.pdf` already tracked by git (confirmed via `git ls-files`). No action needed.
- [x] **Fix the path** — `PDFViewer.tsx:121` updated to `file={import.meta.env.BASE_URL + 'swn-rules.pdf'}`.

### Binary blobs out of the store
Currently images and PDFs are stored as **base64 strings inside the persisted Zustand JSON**, which is re-serialized to IndexedDB on every unrelated edit (base64 also inflates binary ~33%).

- [x] **Character PDF attachment** — PDF data stored under `pdf:<charId>` in a separate `swn_blobs` localforage store. Main JSON record keeps only `{ name }`. 2 MB upload cap added. `character.ts` `data` field made optional.
- [x] **Portrait / ship images** — portraits stored under `portrait:<charId>` / `ship-portrait:<shipId>` in the blob store. Stripped from hot serialization path.

### Write & quota hygiene
- [x] **Debounce persistence** — `useSectorStore.ts` setItem debounced 500 ms via `_sectorSaveTimer`. `useCharacters` save effect debounced 500 ms via `saveTimerRef`.
- [x] **QuotaExceededError handling** — caught in `useCharacters` save; surfaces as `saveError` toast in App.tsx.
- [x] **Warn at high usage** — `navigator.storage.estimate()` checked after each save; warns via `saveWarning` toast when `usage/quota > 0.8`.

### VRAM disposal (system view — distinct from the galaxy)
The system view does **not** unmount its `<Canvas>` when switching systems, so the context stays alive and un-disposed resources accumulate.
- [x] **modelLoader.ts** — `SpaceStation.tsx` cleanup now traverses and disposes all geometries/materials before `bodyRef.current.clear()`.
- [x] **CanvasTextures** — `StarObject`, `NebulaObject` (incl. `SupernovaBackdrop`), `PlanetObject` all have `useEffect` disposal hooks for their memoized GPU resources (`glowTex`, `bhDisk`, `bhChunks`, `coronaData` slot materials, `nsJets`, `nsGeo`, layer textures, `geo`).

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
