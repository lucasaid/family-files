# GPS Map Thumbnail — Design Spec

**Date:** 2026-05-30  
**Status:** Approved

## Overview

When a photo has GPS coordinates, display a small static map thumbnail in the metadata panel showing the location with a pin. The map image is generated once and cached to disk. Generation is skipped when offline; cached images are cleaned up when GPS data is removed or changed, but only if no other photo shares those coordinates.

---

## Tile Provider

**OpenStreetMap** (`tile.openstreetmap.org/{z}/{x}/{y}.png`)

- No API key required
- Globally recognised usage policy for personal/non-commercial apps
- Fallback: if a tile fetch fails (network error, rate limit), abort generation silently — do not show a broken image

Attribution text `© OpenStreetMap contributors` is rendered on the canvas in the bottom-right corner of the generated image (required by OSM tile usage policy).

---

## Cache

**Location:** `public/images/.maps/`

**Filename:** `{lat}_{lng}.png` — e.g. `48.8566_2.3522.png`

- Deterministic, human-readable, no hashing
- Multiple photos at the same coordinates share a single cached file
- The `.maps/` directory is created on first write if absent

---

## Map Image Generation

Runs entirely in the Electron renderer using Node.js APIs (`window.require('https')`, `window.require('fs')`) and the native HTML5 Canvas API. No additional npm packages.

**Parameters:**
- Zoom level: **13** (city-block scale; good for most GPS-tagged family photos)
- Tile grid: **3 × 3** tiles centred on the target coordinate
- Tile size: 256 × 256 px → raw canvas 768 × 768 px
- Output: cropped and saved at **236 × 140 px** (fits the 260 px metadata panel)

**Pin:**
- Filled circle (radius 6 px) in a distinct accent colour (e.g. `#e05`)
- White 2 px stroke outline for contrast against any tile background
- Small drop shadow for legibility

**Process:**
1. Convert lat/lng to slippy-map tile x/y at zoom 13
2. Fetch the 9 surrounding tiles in parallel via Node `https.get`
3. Decode each tile into an `ImageBitmap` via `createImageBitmap(blob)`
4. Draw tiles onto a 768 × 768 offscreen canvas
5. Draw the pin centred on the exact pixel position of the coordinate
6. Draw attribution text
7. Crop to 236 × 140 from the centre
8. Export via `canvas.toDataURL('image/png')` → strip data-URL prefix → write Buffer to disk with `fs.writeFile`

All tile fetches are done in parallel with `Promise.all`. If any tile fetch fails, the entire generation is aborted (no partial images saved).

---

## Trigger Logic

### Photo accessed (photo selected / active photo changes)

| GPS coords present | Online | Map file exists | Action |
|---|---|---|---|
| Yes | Yes | No | Generate map |
| Yes | Yes | Yes | No-op |
| Yes | No | — | No-op |
| No | — | — | No-op |

### GPS coords saved (explicit save or auto-save on navigate)

| Online | Old coords shared by another photo | Old map file exists | New coords provided | Action |
|---|---|---|---|---|
| Yes | — | — | Yes | Generate map for new coords; delete old map only if old coords are unshared |
| Yes | — | Yes | No (cleared) | Delete old map only if old coords are unshared |
| No | — | Yes | Yes or No | Delete old map only if old coords are unshared; do NOT generate |
| No | — | No | Yes or No | No-op |

"Old coords" = the coords stored on the photo **before** this save. "Unshared" = no other photo in `state.photos` has those exact same lat/lng values.

---

## UI

The map thumbnail is rendered **below the GPS (lat, lng) field** in `MetadataFields.tsx`, in both read-only and edit modes (it is always read-only display).

- Displayed as a rounded `<img>` element (border-radius 4 px, border matching panel style)
- Shown only when `activePhoto.location` is set **and** the map file exists on disk
- The component checks for file existence via `fs.existsSync` on mount and after any save
- No loading spinner — if the file is not there yet, nothing is shown; it appears once generation completes and the component re-checks

Re-check after generation: the generation utility resolves a Promise on completion; the component awaits it and then re-checks `fs.existsSync` to trigger a re-render showing the image.

---

## New Files

| File | Purpose |
|---|---|
| `src/utils/mapThumbnail.ts` | All map generation logic: tile math, fetch, canvas composite, file I/O |

## Modified Files

| File | Change |
|---|---|
| `src/Photos/MetadataFields.tsx` | Render map thumbnail below GPS field; call generate/delete on save |

---

## Error Handling

- Tile fetch failure → abort generation silently, no file written, no UI error shown
- `fs.writeFile` failure → log to console, no UI error shown
- Offline during generation attempt → skip entirely (checked via `navigator.onLine` before starting)
- Corrupt/partial existing file → overwrite on next generation (generation always overwrites)

---

## Out of Scope

- Map style customisation (zoom level, pin colour) — hardcoded values are sufficient
- Bulk regeneration of all map thumbnails
- Animated or interactive map view
- Satellite imagery (OSM raster tiles only)
