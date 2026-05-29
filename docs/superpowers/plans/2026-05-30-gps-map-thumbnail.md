# GPS Map Thumbnail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display a cached static map thumbnail in the photo metadata panel when GPS coordinates are present, generated on-demand from OpenStreetMap tiles using HTML5 Canvas.

**Architecture:** A new `src/utils/mapThumbnail.ts` module handles all tile fetching, canvas compositing, and file I/O. `MetadataFields.tsx` imports the utility to check, display, generate, and delete map thumbnails, reacting to photo selection and GPS saves. Maps are cached as `{lat}_{lng}.png` in `public/images/.maps/` — a location derived from each photo's `fsPath` — and shared across photos with identical coordinates.

**Tech Stack:** HTML5 Canvas API (Electron renderer), Node.js `https`/`fs` via `window.require`, OpenStreetMap raster tiles (no API key), TypeScript, Vitest.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/utils/mapThumbnail.ts` | Create | Tile math, OSM fetch, canvas composite, file I/O, cache helpers |
| `src/utils/mapThumbnail.test.ts` | Create | Unit tests for pure helpers |
| `src/Photos/MetadataFields.tsx` | Modify | Map thumbnail display; trigger generate/delete on photo change and GPS save |
| `src/setupTests.ts` | Modify | Add `dirname`/`basename`/`extname` to the path mock |

---

### Task 1: Extend path mock and create pure helpers in mapThumbnail.ts

**Files:**
- Modify: `src/setupTests.ts`
- Create: `src/utils/mapThumbnail.ts`
- Create: `src/utils/mapThumbnail.test.ts`

- [ ] **Step 1: Extend the path mock in `src/setupTests.ts`**

The existing mock only has `join`. Replace the entire file with:

```typescript
/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';

// window.require is not available in jsdom — mock it globally so modules that
// call it at load time (e.g. src/utils/exiftool.ts) don't throw.
(window as any).require = (mod: string) => {
  if (mod === 'path') return {
    join: (...args: string[]) => args.join('/'),
    dirname: (p: string) => p.split('/').slice(0, -1).join('/') || '/',
    basename: (p: string, ext?: string) => {
      const base = p.split('/').pop() ?? '';
      return ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base;
    },
    extname: (p: string) => { const m = (p.split('/').pop() ?? '').match(/\.[^.]+$/); return m ? m[0] : ''; },
  };
  if (mod === 'child_process') return { execFile: vi.fn() };
  if (mod === 'electron') return { ipcRenderer: { sendSync: vi.fn().mockReturnValue('/tmp') } };
  return {
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    promises: {
      readFile: vi.fn().mockRejectedValue(new Error('not found')),
      readdir: vi.fn().mockResolvedValue([]),
    },
  };
};
```

- [ ] **Step 2: Confirm existing tests still pass after the mock change**

```
yarn test --watchAll=false
```

Expected: all existing tests PASS

- [ ] **Step 3: Write the failing tests in `src/utils/mapThumbnail.test.ts`**

```typescript
import { latLngToTile, mapFileName, mapFilePath, isCoordShared } from './mapThumbnail';
import { Photo } from '../context/types';

function makePhoto(file: string, lat: number | null, lng: number | null): Photo {
  return {
    file, path: `/images/${file}`, fsPath: `/data/images/${file}`,
    thumbnailPath: null, album: null, date: null,
    location: lat !== null && lng !== null ? { lat, lng } : null,
    city: null, state: null, country: null,
    camera: null, caption: null, rating: null, keywords: [], faces: [],
  };
}

test('latLngToTile: null island at zoom 0 maps to tile (0,0)', () => {
  const { x, y } = latLngToTile(0, 0, 0);
  expect(x).toBe(0);
  expect(y).toBe(0);
});

test('latLngToTile: fracX and fracY are in [0, 1)', () => {
  const { fracX, fracY } = latLngToTile(48.8566, 2.3522, 13);
  expect(fracX).toBeGreaterThanOrEqual(0);
  expect(fracX).toBeLessThan(1);
  expect(fracY).toBeGreaterThanOrEqual(0);
  expect(fracY).toBeLessThan(1);
});

test('latLngToTile: x and y are non-negative integers', () => {
  const { x, y } = latLngToTile(51.5074, -0.1278, 10);
  expect(Number.isInteger(x)).toBe(true);
  expect(Number.isInteger(y)).toBe(true);
  expect(x).toBeGreaterThanOrEqual(0);
  expect(y).toBeGreaterThanOrEqual(0);
});

test('mapFileName: formats as lat_lng.png', () => {
  expect(mapFileName(48.8566, 2.3522)).toBe('48.8566_2.3522.png');
});

test('mapFileName: handles negative coordinates', () => {
  expect(mapFileName(-33.8688, 151.2093)).toBe('-33.8688_151.2093.png');
});

test('mapFilePath: joins mapsDir and filename', () => {
  expect(mapFilePath('/images/.maps', 48.8566, 2.3522)).toBe('/images/.maps/48.8566_2.3522.png');
});

test('isCoordShared: returns false when no other photo has those coords', () => {
  const photos = [
    makePhoto('a.jpg', 48.8566, 2.3522),
    makePhoto('b.jpg', 51.5074, -0.1278),
  ];
  expect(isCoordShared(photos, 'a.jpg', 48.8566, 2.3522)).toBe(false);
});

test('isCoordShared: returns true when another photo shares those coords', () => {
  const photos = [
    makePhoto('a.jpg', 48.8566, 2.3522),
    makePhoto('b.jpg', 48.8566, 2.3522),
  ];
  expect(isCoordShared(photos, 'a.jpg', 48.8566, 2.3522)).toBe(true);
});

test('isCoordShared: does not count the current file itself', () => {
  const photos = [
    makePhoto('a.jpg', 48.8566, 2.3522),
    makePhoto('b.jpg', null, null),
  ];
  expect(isCoordShared(photos, 'a.jpg', 48.8566, 2.3522)).toBe(false);
});
```

- [ ] **Step 4: Run to confirm tests fail**

```
yarn test --watchAll=false src/utils/mapThumbnail.test.ts
```

Expected: FAIL — "Cannot find module './mapThumbnail'"

- [ ] **Step 5: Create `src/utils/mapThumbnail.ts` with the pure helpers**

```typescript
const fs = (window as any).require('fs') as typeof import('fs');
const path = (window as any).require('path') as typeof import('path');
const https = (window as any).require('https') as typeof import('https');

import { Photo } from '../context/types';

const ZOOM = 13;
const TILE_SIZE = 256;
const OUTPUT_W = 236;
const OUTPUT_H = 140;

export function latLngToTile(
  lat: number, lng: number, zoom: number
): { x: number; y: number; fracX: number; fracY: number } {
  const n = Math.pow(2, zoom);
  const xF = (lng + 180) / 360 * n;
  const latRad = lat * Math.PI / 180;
  const yF = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
  return { x: Math.floor(xF), y: Math.floor(yF), fracX: xF - Math.floor(xF), fracY: yF - Math.floor(yF) };
}

export function mapFileName(lat: number, lng: number): string {
  return `${lat}_${lng}.png`;
}

export function mapFilePath(mapsDir: string, lat: number, lng: number): string {
  return path.join(mapsDir, mapFileName(lat, lng));
}

export function isCoordShared(photos: Photo[], currentFile: string, lat: number, lng: number): boolean {
  return photos.some(p => p.file !== currentFile && p.location?.lat === lat && p.location?.lng === lng);
}

export function getMapUrl(mapsDir: string, lat: number, lng: number): string | null {
  const fp = mapFilePath(mapsDir, lat, lng);
  return fs.existsSync(fp) ? `file://${fp}` : null;
}
```

- [ ] **Step 6: Run tests to confirm they pass**

```
yarn test --watchAll=false src/utils/mapThumbnail.test.ts
```

Expected: PASS — all 9 tests green

- [ ] **Step 7: Commit**

```bash
git add src/setupTests.ts src/utils/mapThumbnail.ts src/utils/mapThumbnail.test.ts
git commit -m "feat: add mapThumbnail pure helpers and tests"
```

---

### Task 2: Add generation and deletion functions to mapThumbnail.ts

**Files:**
- Modify: `src/utils/mapThumbnail.ts`

These functions are side-effectful (tile fetch, canvas, fs write) and run in the Electron renderer only. Correctness is verified manually in Tasks 3 and 4.

- [ ] **Step 1: Append the side-effectful functions to `src/utils/mapThumbnail.ts`**

Add the following after the existing exports:

```typescript
function fetchTile(x: number, y: number, z: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    https.get(url, { headers: { 'User-Agent': 'FamilyFiles/1.0 (personal family photo app)' } } as any, (res: any) => {
      if (res.statusCode !== 200) { reject(new Error(`tile ${x}/${y} status ${res.statusCode}`)); return; }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(new Blob([Buffer.concat(chunks)], { type: 'image/png' })));
    }).on('error', reject);
  });
}

export async function generateMapThumbnail(lat: number, lng: number, mapsDir: string): Promise<void> {
  if (!navigator.onLine) return;

  const { x: cx, y: cy, fracX, fracY } = latLngToTile(lat, lng, ZOOM);

  const tilePromises: Promise<Blob>[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      tilePromises.push(fetchTile(cx + dx, cy + dy, ZOOM));
    }
  }

  let blobs: Blob[];
  try {
    blobs = await Promise.all(tilePromises);
  } catch {
    return; // any tile failure → abort silently
  }

  const bitmaps = await Promise.all(blobs.map(b => createImageBitmap(b)));

  // Composite 3×3 tiles onto a 768×768 canvas
  const canvas = document.createElement('canvas');
  canvas.width = TILE_SIZE * 3;
  canvas.height = TILE_SIZE * 3;
  const ctx = canvas.getContext('2d')!;
  bitmaps.forEach((bm, i) => {
    ctx.drawImage(bm, (i % 3) * TILE_SIZE, Math.floor(i / 3) * TILE_SIZE);
  });

  // Pin: centre tile offset + fractional pixel position within that tile
  const pinX = TILE_SIZE + fracX * TILE_SIZE;
  const pinY = TILE_SIZE + fracY * TILE_SIZE;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.arc(pinX, pinY, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#ee0055';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Attribution (required by OSM tile usage policy)
  const attribution = '© OpenStreetMap contributors';
  ctx.font = '10px sans-serif';
  const tw = ctx.measureText(attribution).width;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(TILE_SIZE * 3 - tw - 8, TILE_SIZE * 3 - 16, tw + 6, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(attribution, TILE_SIZE * 3 - tw - 5, TILE_SIZE * 3 - 5);

  // Crop to OUTPUT_W × OUTPUT_H centred on the pin
  const out = document.createElement('canvas');
  out.width = OUTPUT_W;
  out.height = OUTPUT_H;
  const octx = out.getContext('2d')!;
  const srcX = Math.max(0, Math.min(pinX - OUTPUT_W / 2, TILE_SIZE * 3 - OUTPUT_W));
  const srcY = Math.max(0, Math.min(pinY - OUTPUT_H / 2, TILE_SIZE * 3 - OUTPUT_H));
  octx.drawImage(canvas, srcX, srcY, OUTPUT_W, OUTPUT_H, 0, 0, OUTPUT_W, OUTPUT_H);

  const buf = Buffer.from(out.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''), 'base64');
  try {
    fs.mkdirSync(mapsDir, { recursive: true });
    fs.writeFileSync(mapFilePath(mapsDir, lat, lng), buf);
  } catch (err) {
    console.error('[mapThumbnail] write failed:', err);
  }
}

export async function ensureMapThumbnail(lat: number, lng: number, mapsDir: string): Promise<void> {
  if (fs.existsSync(mapFilePath(mapsDir, lat, lng))) return;
  await generateMapThumbnail(lat, lng, mapsDir);
}

export function deleteMapIfUnshared(
  photos: Photo[], currentFile: string,
  lat: number, lng: number, mapsDir: string
): void {
  if (isCoordShared(photos, currentFile, lat, lng)) return;
  const fp = mapFilePath(mapsDir, lat, lng);
  try {
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  } catch (err) {
    console.error('[mapThumbnail] delete failed:', err);
  }
}
```

- [ ] **Step 2: Confirm tests still pass**

```
yarn test --watchAll=false src/utils/mapThumbnail.test.ts
```

Expected: all 9 tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/utils/mapThumbnail.ts
git commit -m "feat: add OSM tile fetch, canvas generation and cache deletion to mapThumbnail"
```

---

### Task 3: Display map thumbnail in MetadataFields.tsx

**Files:**
- Modify: `src/Photos/MetadataFields.tsx`

- [ ] **Step 1: Add imports and module-level setup at the top of `MetadataFields.tsx`**

After the existing import block (after `import { Photo } from '../context/types';`), add:

```typescript
import { generateMapThumbnail, getMapUrl } from '../utils/mapThumbnail';

const path = (window as any).require('path') as typeof import('path');

function getMapsDir(fsPath: string): string {
  return path.join(path.dirname(fsPath), '.maps');
}
```

- [ ] **Step 2: Add `mapUrl` state inside the `MetadataFields` component**

After the existing `const [error, setError] = useState<string | null>(null);` line, add:

```typescript
const [mapUrl, setMapUrl] = useState<string | null>(null);
```

- [ ] **Step 3: Add the photo-change effect inside the component**

After the existing `useLayoutEffect` block, add:

```typescript
useEffect(() => {
  if (!activePhoto?.location) {
    setMapUrl(null);
    return;
  }
  const { lat, lng } = activePhoto.location;
  const mapsDir = getMapsDir(activePhoto.fsPath);
  const cached = getMapUrl(mapsDir, lat, lng);
  if (cached) {
    setMapUrl(cached);
    return;
  }
  if (!navigator.onLine) {
    setMapUrl(null);
    return;
  }
  setMapUrl(null);
  generateMapThumbnail(lat, lng, mapsDir).then(() => {
    setMapUrl(getMapUrl(mapsDir, lat, lng));
  });
}, [activePhoto?.file, activePhoto?.location?.lat, activePhoto?.location?.lng]);
```

- [ ] **Step 4: Render the map thumbnail below the GPS field**

Find the `{/* Location coords */}` block (the `<div>` containing `GPS (lat, lng)`). Replace it with:

```tsx
{/* Location coords */}
<div>
  <div style={label}>GPS (lat, lng)</div>
  {readOnly
    ? <ReadValue value={draft.locationStr} />
    : <input style={fieldBase} value={draft.locationStr} onChange={e => set({ locationStr: e.target.value })} onKeyDown={e => { onEnter?.(e); onNavKeyDown(e); }} />}
  {mapUrl && (
    <img
      src={mapUrl}
      alt="Map showing photo location"
      style={{
        display: 'block', marginTop: 6, width: '100%', height: 'auto',
        borderRadius: 4, border: '1px solid var(--border-muted)',
      }}
    />
  )}
</div>
```

- [ ] **Step 5: Start the app and verify**

```bash
# Terminal 1
yarn start
# Terminal 2 (after React is up)
yarn electron-dev
```

- Select a photo with GPS coordinates → map thumbnail appears below the GPS field, pin visible, OSM attribution in bottom-right corner
- Select a photo without GPS → no thumbnail shown
- Turn off WiFi, select a photo with GPS but no cached map → no thumbnail, no error in the UI
- The `.maps/` directory is created inside `public/images/` on first generation

- [ ] **Step 6: Commit**

```bash
git add src/Photos/MetadataFields.tsx
git commit -m "feat: display OSM map thumbnail in metadata panel for photos with GPS"
```

---

### Task 4: Wire generate/delete into save()

**Files:**
- Modify: `src/Photos/MetadataFields.tsx`

- [ ] **Step 1: Update the mapThumbnail import to include `ensureMapThumbnail` and `deleteMapIfUnshared`**

Find the import added in Task 3:

```typescript
import { generateMapThumbnail, getMapUrl } from '../utils/mapThumbnail';
```

Replace with:

```typescript
import { generateMapThumbnail, getMapUrl, ensureMapThumbnail, deleteMapIfUnshared } from '../utils/mapThumbnail';
```

- [ ] **Step 2: Add map handling inside the `save()` function**

Inside `save()`, find the `onExitEdit?.();` line. After it, before the closing `} catch`, add:

```typescript
    const mapsDir = getMapsDir(activePhoto.fsPath);
    const oldLocation = activePhoto.location;
    const newLocation = location; // already computed: const location = draft.locationStr ? parseLocation(draft.locationStr) : null

    if (oldLocation && (oldLocation.lat !== newLocation?.lat || oldLocation.lng !== newLocation?.lng)) {
      deleteMapIfUnshared(state.photos, activePhoto.file, oldLocation.lat, oldLocation.lng, mapsDir);
    }

    if (newLocation) {
      if (navigator.onLine) {
        await ensureMapThumbnail(newLocation.lat, newLocation.lng, mapsDir);
      }
      setMapUrl(getMapUrl(mapsDir, newLocation.lat, newLocation.lng));
    } else {
      setMapUrl(null);
    }
```

- [ ] **Step 3: Verify save behaviour in the running app**

With the dev server still running from Task 3:

- Select a photo, enter edit mode, change the GPS coords to a valid location, click Save → the thumbnail updates to show the new location
- Clear the GPS coords on a photo that had a map, click Save → the thumbnail disappears; confirm `public/images/.maps/` no longer contains that coord file (if no other photo shares those coords)
- Turn off WiFi, change GPS coords on a photo, click Save → old map deleted from disk, no new map appears, no error in UI

- [ ] **Step 4: Commit**

```bash
git add src/Photos/MetadataFields.tsx
git commit -m "feat: update map thumbnail on GPS save, delete stale map when coords change"
```

---

### Task 5: Wire generate/delete into autoSave()

**Files:**
- Modify: `src/Photos/MetadataFields.tsx`

`autoSave` fires when navigating between photos while "Save on navigate" is enabled. It manages disk state for the photo being navigated *away from*. The `useEffect` from Task 3 handles the new active photo's map display automatically.

- [ ] **Step 1: Add `photosRef` inside the component**

After the existing `saveOnNavigateRef` lines, add:

```typescript
const photosRef = useRef(state.photos);
photosRef.current = state.photos;
```

- [ ] **Step 2: Add map handling inside `autoSave()`**

Inside `autoSave`, find the `dispatch({ type: 'UPDATE_PHOTO_META', ... })` call. After it, before the closing `} catch {`, add:

```typescript
    const mapsDir = getMapsDir(photo.fsPath);
    const oldLocation = photo.location;
    const newLocation = location; // already computed: const location = d.locationStr ? parseLocation(d.locationStr) : null

    if (oldLocation && (oldLocation.lat !== newLocation?.lat || oldLocation.lng !== newLocation?.lng)) {
      deleteMapIfUnshared(photosRef.current, photo.file, oldLocation.lat, oldLocation.lng, mapsDir);
    }

    if (newLocation && navigator.onLine) {
      await ensureMapThumbnail(newLocation.lat, newLocation.lng, mapsDir);
    }
```

- [ ] **Step 3: Verify auto-save behaviour in the running app**

In Settings, enable "Save on navigate":

- Select a photo with GPS, enter edit mode, change the coords, press the right arrow key to navigate to the next photo without clicking Save
- Navigate back — the map should show the updated location
- Repeat while offline — the old map file is deleted from disk, no new map appears, no error

- [ ] **Step 4: Commit**

```bash
git add src/Photos/MetadataFields.tsx
git commit -m "feat: generate/delete map thumbnail on auto-save navigation"
```
