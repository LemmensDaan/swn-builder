# Performance & Storage Optimization Options

Audit date: 2026-06-16

---

## 1. Mobile / PWA Performance

### High priority
- **Disable antialias on mobile** — hardcoded `antialias: true` in `GalaxyView.tsx:154` roughly doubles GPU load on mobile. Detect via `window.innerWidth < 768` or `navigator.userAgentData?.mobile` and pass `antialias: false` to the Canvas.
- **Reduce asteroid count on mobile** — `AsteroidBelt.tsx` defaults to 2,200 instances with per-frame matrix updates. Drop to ~600 on mobile.
- **Pause animation when tab is inactive** — all `useFrame()` loops run continuously even in the background. Add a `document.addEventListener('visibilitychange', ...)` that pauses the render loop, saving battery for PWA users.

### Medium priority
- **Reduce background galaxy count on mobile** — `BackgroundGalaxies.tsx` defaults to 120 galaxies with per-frame opacity traversal across all meshes. Drop to ~30–40 on mobile.
- **Memoize canvas texture creation** — `NebulaBackground.tsx` and `BackgroundGalaxies.tsx` recreate canvas textures on every mount. Wrap in `useMemo` or create once outside the component.
- **Reduce starfield count on mobile** — `Starfield.tsx` defaults to 900 particles. Drop to ~300 on mobile.

### Low priority
- **Dispose geometries/materials on scene unmount** — `modelLoader.ts` has no disposal logic. Add `geometry.dispose()` / `material.dispose()` when switching between sector and system views to prevent VRAM leaks.
- **Add WebGL context loss recovery** — no handler for `webglcontextlost` event; page will silently break if GPU memory is exhausted.

---

## 2. Storage (IndexedDB / Safari eviction)

### High priority
- **Handle `QuotaExceededError`** — `useSectorStore.ts` and `useCharacters.ts` have no `try/catch` around `localforage.setItem`. If quota is hit, saves silently fail and the user loses data. Wrap all writes and show a visible error toast.
- **Block or remove PDF attachment feature** — `character.pdfAttachment` stores the full PDF as base64. The bundled rules PDF is 11 MB → ~15 MB base64, which exceeds Safari's typical per-origin quota alone. Either remove the feature and link to the hosted PDF, or hard-cap uploads at ~500 KB.

### Medium priority
- **Warn at 80% storage usage** — use `navigator.storage.estimate()` after each save and show a warning banner if `usage / quota > 0.8`.
- **Export / archive old campaigns** — provide a "export campaign" button that downloads JSON so users can free up space without losing data.

### Low priority
- **Reduce portrait JPEG quality** — `PortraitEditor.tsx` uses quality `0.85`. Dropping to `0.75` saves ~20% per portrait with negligible visual difference. Consider WebP for further savings.
- **Compress sector data** — for very large campaigns (20+ sectors), JSON-serialized sector data can reach 3–5 MB. Running it through a small compression library (e.g. `lz-string`) before storage would cut this by ~60%.

---

## Estimated storage footprint (reference)

| Scenario | Estimated size |
|---|---|
| 1 sector, no characters | ~100 KB |
| 5 sectors, 4 characters (no portraits) | ~700 KB |
| 10 sectors, 4 characters with portraits | ~1.1 MB |
| 20 sectors, 2 full parties with portraits | ~3.5–4.5 MB |
| Any character with PDF attachment | +15 MB — exceeds quota |
