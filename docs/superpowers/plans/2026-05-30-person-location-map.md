# Person Location Map — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a static world-map thumbnail to each PersonDetail page showing all GPS-located (and geocoded text-location) photos tagged with that person, cached on disk, clickable to open an interactive Leaflet modal with all points.

**Architecture:** A new `personMapThumbnail.ts` utility handles collecting location inputs from photos, geocoding text-only locations via Nominatim, hashing the input data for cache invalidation, fetching OSM tiles, compositing a PNG, and persisting it to `.peoplemaps/<hash>.png` at the app data root. `MapModal` is extended from single-point to multi-point. `PersonDetail` calls the utility on mount and renders the result.

**Tech Stack:** TypeScript, React, Leaflet (already in project), Node.js `fs`/`https`/`crypto` (via `window.require`), Vitest, HTML Canvas API, OSM tile API, Nominatim geocoding API.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/utils/personMapThumbnail.ts` | **Create** | All person-map logic: collect inputs, hash, geocode, generate PNG, `ensurePersonMapThumbnail` |
| `src/utils/personMapThumbnail.test.ts` | **Create** | Tests for pure helpers: `collectLocationInputs`, `personMapHash`, `personMapFilePath` |
| `src/Photos/MapModal.tsx` | **Modify** | Change props from `{lat,lng}` to `{points[]}`, use `fitBounds` for multi-point |
| `src/Photos/MetadataFields.tsx` | **Modify** | Update single `MapModal` call to `points={[{lat,lng}]}` |
| `src/People/PersonDetail.tsx` | **Modify** | Add state + effect for person map, render Locations section |

---

## Task 1: Pure helpers in `personMapThumbnail.ts` with tests

**Files:**
- Create: `src/utils/personMapThumbnail.ts`
- Create: `src/utils/personMapThumbnail.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/personMapThumbnail.test.ts`:

```ts
import { collectLocationInputs, personMapHash, personMapFilePath } from './personMapThumbnail';
import { Photo } from '../context/types';

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    file: 'a.jpg', path: '/images/a.jpg', fsPath: '/data/images/a.jpg',
    thumbnailPath: null, album: null, date: null,
    location: null, city: null, state: null, country: null,
    camera: null, caption: null, rating: null, keywords: [], faces: [],
    ...overrides,
  };
}

// ── collectLocationInputs ─────────────────────────────────────────────────────

test('collectLocationInputs: photo with GPS produces a gps entry', () => {
  const photos = [makePhoto({ location: { lat: 48.8566, lng: 2.3522 } })];
  const result = collectLocationInputs(photos);
  expect(result).toHaveLength(1);
  expect(result[0]).toEqual({ type: 'gps', lat: 48.8566, lng: 2.3522 });
});

test('collectLocationInputs: photo with text-only location produces a text entry', () => {
  const photos = [makePhoto({ city: 'Paris', state: '', country: 'France' })];
  const result = collectLocationInputs(photos);
  expect(result).toHaveLength(1);
  expect(result[0]).toEqual({ type: 'text', city: 'Paris', state: '', country: 'France' });
});

test('collectLocationInputs: photo with GPS and text fields uses GPS, not text', () => {
  const photos = [makePhoto({ location: { lat: 48.8566, lng: 2.3522 }, city: 'Paris', country: 'France' })];
  const result = collectLocationInputs(photos);
  expect(result).toHaveLength(1);
  expect(result[0].type).toBe('gps');
});

test('collectLocationInputs: photo with no location data is skipped', () => {
  const photos = [makePhoto()];
  expect(collectLocationInputs(photos)).toHaveLength(0);
});

test('collectLocationInputs: duplicate GPS coordinates are deduplicated', () => {
  const photos = [
    makePhoto({ file: 'a.jpg', location: { lat: 48.8566, lng: 2.3522 } }),
    makePhoto({ file: 'b.jpg', location: { lat: 48.8566, lng: 2.3522 } }),
  ];
  expect(collectLocationInputs(photos)).toHaveLength(1);
});

test('collectLocationInputs: duplicate text locations are deduplicated', () => {
  const photos = [
    makePhoto({ file: 'a.jpg', city: 'Paris', country: 'France' }),
    makePhoto({ file: 'b.jpg', city: 'Paris', country: 'France' }),
  ];
  expect(collectLocationInputs(photos)).toHaveLength(1);
});

test('collectLocationInputs: mixed GPS and text photos both appear', () => {
  const photos = [
    makePhoto({ file: 'a.jpg', location: { lat: 48.8566, lng: 2.3522 } }),
    makePhoto({ file: 'b.jpg', city: 'London', country: 'UK' }),
  ];
  const result = collectLocationInputs(photos);
  expect(result).toHaveLength(2);
  expect(result.some(r => r.type === 'gps')).toBe(true);
  expect(result.some(r => r.type === 'text')).toBe(true);
});

// ── personMapHash ─────────────────────────────────────────────────────────────

test('personMapHash: returns a 32-char hex string', () => {
  const photos = [makePhoto({ location: { lat: 48.8566, lng: 2.3522 } })];
  expect(personMapHash(photos)).toMatch(/^[0-9a-f]{32}$/);
});

test('personMapHash: same inputs produce same hash', () => {
  const photos = [makePhoto({ location: { lat: 48.8566, lng: 2.3522 } })];
  expect(personMapHash(photos)).toBe(personMapHash(photos));
});

test('personMapHash: different GPS coords produce different hash', () => {
  const a = [makePhoto({ location: { lat: 48.8566, lng: 2.3522 } })];
  const b = [makePhoto({ location: { lat: 51.5074, lng: -0.1278 } })];
  expect(personMapHash(a)).not.toBe(personMapHash(b));
});

test('personMapHash: adding a text location changes the hash', () => {
  const gpsOnly = [makePhoto({ location: { lat: 48.8566, lng: 2.3522 } })];
  const withText = [
    makePhoto({ location: { lat: 48.8566, lng: 2.3522 } }),
    makePhoto({ file: 'b.jpg', city: 'London', country: 'UK' }),
  ];
  expect(personMapHash(gpsOnly)).not.toBe(personMapHash(withText));
});

test('personMapHash: photo order does not affect hash', () => {
  const a = [
    makePhoto({ file: 'a.jpg', location: { lat: 48.8566, lng: 2.3522 } }),
    makePhoto({ file: 'b.jpg', location: { lat: 51.5074, lng: -0.1278 } }),
  ];
  const b = [
    makePhoto({ file: 'b.jpg', location: { lat: 51.5074, lng: -0.1278 } }),
    makePhoto({ file: 'a.jpg', location: { lat: 48.8566, lng: 2.3522 } }),
  ];
  expect(personMapHash(a)).toBe(personMapHash(b));
});

test('personMapHash: empty photos array produces a stable hash', () => {
  expect(personMapHash([])).toMatch(/^[0-9a-f]{32}$/);
  expect(personMapHash([])).toBe(personMapHash([]));
});

// ── personMapFilePath ─────────────────────────────────────────────────────────

test('personMapFilePath: joins mapsDir with hash and .png extension', () => {
  const result = personMapFilePath('/data/.peoplemaps', 'abc123');
  expect(result).toBe('/data/.peoplemaps/abc123.png');
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

```bash
yarn test:run src/utils/personMapThumbnail.test.ts
```

Expected: errors like `Cannot find module './personMapThumbnail'`.

- [ ] **Step 3: Create `src/utils/personMapThumbnail.ts` with pure helpers only**

```ts
const fs = (window as any).require('fs') as typeof import('fs');
const path = (window as any).require('path') as typeof import('path');
const https = (window as any).require('https') as typeof import('https');
const crypto = (window as any).require('crypto') as typeof import('crypto');

import { Photo } from '../context/types';
import { latLngToTile } from './mapThumbnail';

const TILE_SIZE = 256;
const OUTPUT_W = 400;
const OUTPUT_H = 220;

// ── Location input types ──────────────────────────────────────────────────────

export interface GpsInput {
  type: 'gps';
  lat: number;
  lng: number;
}

export interface TextInput {
  type: 'text';
  city: string;
  state: string;
  country: string;
}

export type LocationInput = GpsInput | TextInput;

// ── Pure helpers ──────────────────────────────────────────────────────────────

export function collectLocationInputs(photos: Photo[]): LocationInput[] {
  const gpsMap = new Map<string, GpsInput>();
  const textMap = new Map<string, TextInput>();

  for (const p of photos) {
    if (p.location) {
      const key = `${p.location.lat},${p.location.lng}`;
      if (!gpsMap.has(key)) {
        gpsMap.set(key, { type: 'gps', lat: p.location.lat, lng: p.location.lng });
      }
    } else if (p.city || p.state || p.country) {
      const key = `${p.city ?? ''}|${p.state ?? ''}|${p.country ?? ''}`;
      if (!textMap.has(key)) {
        textMap.set(key, { type: 'text', city: p.city ?? '', state: p.state ?? '', country: p.country ?? '' });
      }
    }
  }

  return [...gpsMap.values(), ...textMap.values()];
}

export function personMapHash(photos: Photo[]): string {
  const inputs = collectLocationInputs(photos);
  const gpsLines = inputs
    .filter((i): i is GpsInput => i.type === 'gps')
    .map(i => `${i.lat},${i.lng}`)
    .sort();
  const textLines = inputs
    .filter((i): i is TextInput => i.type === 'text')
    .map(i => `${i.city}|${i.state}|${i.country}`)
    .sort();
  const combined = [...gpsLines, ...textLines].join('\n');
  return crypto.createHash('md5').update(combined).digest('hex');
}

export function personMapFilePath(mapsDir: string, hash: string): string {
  return path.join(mapsDir, `${hash}.png`);
}

function personMapJsonPath(mapsDir: string, hash: string): string {
  return path.join(mapsDir, `${hash}.json`);
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
yarn test:run src/utils/personMapThumbnail.test.ts
```

Expected: all 14 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/personMapThumbnail.ts src/utils/personMapThumbnail.test.ts
git commit -m "feat: add personMapThumbnail pure helpers with tests"
```

---

## Task 2: Geocoding and tile generation in `personMapThumbnail.ts`

**Files:**
- Modify: `src/utils/personMapThumbnail.ts`

- [ ] **Step 1: Add `geocodeLocation`, `geocodeAll`, `fitZoom`, `fetchTile`, and `generatePersonMapThumbnail` to `personMapThumbnail.ts`**

Append the following to `src/utils/personMapThumbnail.ts` (after the `personMapJsonPath` function):

```ts
// ── Geocoding ─────────────────────────────────────────────────────────────────

export async function geocodeLocation(
  city: string, state: string, country: string
): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({ format: 'json', limit: '1' });
  if (city) params.set('city', city);
  if (state) params.set('state', state);
  if (country) params.set('country', country);

  return new Promise(resolve => {
    const url = `https://nominatim.openstreetmap.org/search?${params}`;
    https.get(
      url,
      { headers: { 'User-Agent': 'FamilyFiles/1.0 (personal family photo app)' } } as any,
      (res: any) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString());
            if (Array.isArray(data) && data.length > 0) {
              resolve({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      }
    ).on('error', () => resolve(null));
  });
}

async function geocodeAll(
  inputs: TextInput[]
): Promise<{ lat: number; lng: number }[]> {
  const results: { lat: number; lng: number }[] = [];
  for (const input of inputs) {
    const result = await geocodeLocation(input.city, input.state, input.country);
    if (result) results.push(result);
    // Nominatim usage policy: max 1 request per second
    await new Promise(r => setTimeout(r, 1100));
  }
  return results;
}

// ── Tile fetch ────────────────────────────────────────────────────────────────

function fetchTile(x: number, y: number, z: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    https.get(
      url,
      { headers: { 'User-Agent': 'FamilyFiles/1.0 (personal family photo app)' } } as any,
      (res: any) => {
        if (res.statusCode !== 200) {
          reject(new Error(`tile ${x}/${y} status ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(new Blob([Buffer.concat(chunks)], { type: 'image/png' })));
      }
    ).on('error', reject);
  });
}

// ── Zoom fitting ──────────────────────────────────────────────────────────────

function fitZoom(
  minLat: number, maxLat: number, minLng: number, maxLng: number
): number {
  for (let z = 6; z >= 1; z--) {
    const tl = latLngToTile(maxLat, minLng, z);
    const br = latLngToTile(minLat, maxLng, z);
    const cols = br.x - tl.x + 1;
    const rows = br.y - tl.y + 1;
    // Keep tile count manageable (max ~48 tiles)
    if (cols <= 8 && rows <= 6) return z;
  }
  return 1;
}

// ── Map generation ────────────────────────────────────────────────────────────

export async function generatePersonMapThumbnail(
  points: { lat: number; lng: number }[],
  hash: string,
  mapsDir: string
): Promise<void> {
  if (points.length === 0) return;

  // Compute bbox
  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  let minLat = Math.min(...lats), maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

  // Expand degenerate bbox (single point or all same location)
  if (maxLat - minLat < 1) { minLat -= 5; maxLat += 5; }
  if (maxLng - minLng < 1) { minLng -= 10; maxLng += 10; }

  // 10% padding
  const latPad = (maxLat - minLat) * 0.1;
  const lngPad = (maxLng - minLng) * 0.1;
  minLat = Math.max(-85, minLat - latPad);
  maxLat = Math.min(85, maxLat + latPad);
  minLng = Math.max(-180, minLng - lngPad);
  maxLng = Math.min(180, maxLng + lngPad);

  const zoom = fitZoom(minLat, maxLat, minLng, maxLng);

  // Tile range for bbox
  const tl = latLngToTile(maxLat, minLng, zoom);
  const br = latLngToTile(minLat, maxLng, zoom);
  let x0 = tl.x, y0 = tl.y;
  let x1 = br.x, y1 = br.y;

  // Ensure canvas is at least OUTPUT_W × OUTPUT_H
  const minCols = Math.ceil(OUTPUT_W / TILE_SIZE) + 1;
  const minRows = Math.ceil(OUTPUT_H / TILE_SIZE) + 1;
  while (x1 - x0 + 1 < minCols) { x0 = Math.max(0, x0 - 1); x1++; }
  while (y1 - y0 + 1 < minRows) { y0 = Math.max(0, y0 - 1); y1++; }

  const cols = x1 - x0 + 1;
  const rows = y1 - y0 + 1;

  // Fetch all tiles
  const tilePromises: Promise<Blob>[] = [];
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      tilePromises.push(fetchTile(tx, ty, zoom));
    }
  }
  let blobs: Blob[];
  try {
    blobs = await Promise.all(tilePromises);
  } catch {
    return; // any tile failure → abort silently
  }

  const bitmaps = await Promise.all(blobs.map(b => createImageBitmap(b)));

  // Composite tiles
  const canvas = document.createElement('canvas');
  canvas.width = cols * TILE_SIZE;
  canvas.height = rows * TILE_SIZE;
  const ctx = canvas.getContext('2d')!;
  bitmaps.forEach((bm, i) => {
    ctx.drawImage(bm, (i % cols) * TILE_SIZE, Math.floor(i / cols) * TILE_SIZE);
  });

  // Draw pins for each point
  for (const { lat, lng } of points) {
    const { x, y, fracX, fracY } = latLngToTile(lat, lng, zoom);
    const px = (x - x0) * TILE_SIZE + fracX * TILE_SIZE;
    const py = (y - y0) * TILE_SIZE + fracY * TILE_SIZE;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ee0055';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // OSM attribution (required by tile usage policy)
  const attribution = '© OpenStreetMap contributors';
  ctx.font = '10px sans-serif';
  const tw = ctx.measureText(attribution).width;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(canvas.width - tw - 8, canvas.height - 16, tw + 6, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(attribution, canvas.width - tw - 5, canvas.height - 5);

  // Crop to OUTPUT_W × OUTPUT_H centered on bbox center
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const { x: cx, y: cy, fracX: cfX, fracY: cfY } = latLngToTile(centerLat, centerLng, zoom);
  const centerPx = (cx - x0) * TILE_SIZE + cfX * TILE_SIZE;
  const centerPy = (cy - y0) * TILE_SIZE + cfY * TILE_SIZE;

  const out = document.createElement('canvas');
  out.width = OUTPUT_W;
  out.height = OUTPUT_H;
  const octx = out.getContext('2d')!;
  const srcX = Math.max(0, Math.min(centerPx - OUTPUT_W / 2, canvas.width - OUTPUT_W));
  const srcY = Math.max(0, Math.min(centerPy - OUTPUT_H / 2, canvas.height - OUTPUT_H));
  octx.drawImage(canvas, srcX, srcY, OUTPUT_W, OUTPUT_H, 0, 0, OUTPUT_W, OUTPUT_H);

  const buf = Buffer.from(
    out.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''),
    'base64'
  );
  try {
    fs.mkdirSync(mapsDir, { recursive: true });
    fs.writeFileSync(personMapFilePath(mapsDir, hash), buf);
  } catch (err) {
    console.error('[personMapThumbnail] write failed:', err);
  }
}

// ── Top-level entry point ─────────────────────────────────────────────────────

export async function ensurePersonMapThumbnail(
  photos: Photo[],
  mapsDir: string
): Promise<{ url: string; points: { lat: number; lng: number }[] } | null> {
  if (!navigator.onLine) return null;

  const inputs = collectLocationInputs(photos);
  if (inputs.length === 0) return null;

  const hash = personMapHash(photos);
  const filePath = personMapFilePath(mapsDir, hash);
  const jsonPath = personMapJsonPath(mapsDir, hash);

  // Cache hit: return immediately from saved points sidecar
  if (fs.existsSync(filePath) && fs.existsSync(jsonPath)) {
    try {
      const points = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as { lat: number; lng: number }[];
      return { url: `file://${filePath}`, points };
    } catch {
      // sidecar corrupt — fall through and regenerate
    }
  }

  const gpsPoints = inputs
    .filter((i): i is GpsInput => i.type === 'gps')
    .map(i => ({ lat: i.lat, lng: i.lng }));

  const textInputs = inputs.filter((i): i is TextInput => i.type === 'text');
  const geocoded = textInputs.length > 0 ? await geocodeAll(textInputs) : [];
  const allPoints = [...gpsPoints, ...geocoded];

  if (allPoints.length === 0) return null;

  await generatePersonMapThumbnail(allPoints, hash, mapsDir);

  if (!fs.existsSync(filePath)) return null;

  try {
    fs.mkdirSync(mapsDir, { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(allPoints));
  } catch { /* non-fatal */ }

  return { url: `file://${filePath}`, points: allPoints };
}
```

- [ ] **Step 2: Confirm existing tests still pass**

```bash
yarn test:run src/utils/personMapThumbnail.test.ts
```

Expected: all 14 tests PASS (new functions are not tested here; they require browser/network mocking outside project's existing test pattern).

- [ ] **Step 3: Confirm TypeScript compiles cleanly**

```bash
yarn build 2>&1 | head -30
```

Expected: build completes with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/utils/personMapThumbnail.ts
git commit -m "feat: add person map tile generation and geocoding"
```

---

## Task 3: Extend `MapModal` to support multiple points

**Files:**
- Modify: `src/Photos/MapModal.tsx`

- [ ] **Step 1: Replace the file contents**

Replace `src/Photos/MapModal.tsx` with:

```tsx
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Modal from '../components/Modal';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Props {
  points: { lat: number; lng: number }[];
  onClose: () => void;
}

export default function MapModal({ points, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const isOnline = navigator.onLine;

  useEffect(() => {
    if (!isOnline || !containerRef.current || points.length === 0) return;

    const map = L.map(containerRef.current);
    mapRef.current = map;

    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    });

    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a> — Esri, Maxar, Earthstar Geographics',
        maxZoom: 19,
      }
    );

    street.addTo(map);
    L.control.layers({ 'Map': street, 'Satellite': satellite }, {}, { position: 'topright' }).addTo(map);

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
      L.marker([points[0].lat, points[0].lng]).addTo(map);
    } else {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng] as L.LatLngTuple));
      map.fitBounds(bounds, { padding: [40, 40] });
      points.forEach(p => L.marker([p.lat, p.lng]).addTo(map));
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [points, isOnline]);

  return (
    <Modal title="Location" onClose={onClose} width="85vw" height="80vh">
      {isOnline ? (
        <div ref={containerRef} style={{ flex: 1, width: '100%' }} />
      ) : (
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 12, padding: 32, textAlign: 'center',
        }}>
          <div style={{ fontSize: 'var(--font-size-title)', fontWeight: 600, color: 'var(--text-1)' }}>
            You're offline
          </div>
          <div style={{ fontSize: 'var(--font-size-body)', color: 'var(--text-4)', maxWidth: 320, lineHeight: 1.6 }}>
            An internet connection is required to view the interactive map. Connect and try again.
          </div>
          <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-3)', marginTop: 4, fontFamily: 'var(--font-mono)', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {points.map((p, i) => (
              <span key={i}>{p.lat.toFixed(6)}, {p.lng.toFixed(6)}</span>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
```

- [ ] **Step 2: Confirm TypeScript compiles**

```bash
yarn build 2>&1 | head -30
```

Expected: TypeScript error pointing to `MetadataFields.tsx` — it still passes `lat` and `lng` props which no longer exist. This is expected and fixed in the next task.

- [ ] **Step 3: Commit (with the known type error noted)**

Skip commit here — proceed directly to Task 4 to fix the call site first, then commit both together.

---

## Task 4: Update `MetadataFields.tsx` call site

**Files:**
- Modify: `src/Photos/MetadataFields.tsx`

- [ ] **Step 1: Update the `MapModal` usage in `MetadataFields.tsx`**

Find this block in `src/Photos/MetadataFields.tsx` (around line 462):

```tsx
        {mapModalOpen && activePhoto.location && (
          <MapModal
            lat={activePhoto.location.lat}
            lng={activePhoto.location.lng}
            onClose={() => setMapModalOpen(false)}
          />
        )}
```

Replace with:

```tsx
        {mapModalOpen && activePhoto.location && (
          <MapModal
            points={[{ lat: activePhoto.location.lat, lng: activePhoto.location.lng }]}
            onClose={() => setMapModalOpen(false)}
          />
        )}
```

- [ ] **Step 2: Confirm TypeScript compiles cleanly**

```bash
yarn build 2>&1 | head -30
```

Expected: clean build with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/Photos/MapModal.tsx src/Photos/MetadataFields.tsx
git commit -m "feat: extend MapModal to support multiple points"
```

---

## Task 5: Add Locations section to `PersonDetail.tsx`

**Files:**
- Modify: `src/People/PersonDetail.tsx`

- [ ] **Step 1: Add imports at the top of `PersonDetail.tsx`**

The file already imports `React`, `useState`, `useMemo`, `useEffect`. Add the following to the existing imports block:

After the existing imports, add:

```tsx
import { ensurePersonMapThumbnail } from '../utils/personMapThumbnail';
import MapModal from '../Photos/MapModal';
import { dataPath } from '../utils/paths';

const path = (window as any).require('path') as typeof import('path');
```

Note: `dataPath` and `path` must be at module scope (not inside the component).

- [ ] **Step 2: Add state and effect to the `PersonDetail` component**

Inside `PersonDetail` (after the existing `const [showExport, setShowExport] = useState(false);` line), add:

```tsx
  const [personMapUrl, setPersonMapUrl] = useState<string | null>(null);
  const [personMapPoints, setPersonMapPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [personMapModalOpen, setPersonMapModalOpen] = useState(false);
```

After the existing `useEffect` for `hasResearchProfile`, add:

```tsx
  useEffect(() => {
    let cancelled = false;
    setPersonMapUrl(null);
    setPersonMapPoints([]);
    const photos = state.photos.filter(p => p.faces.some(f => f.personId === id));
    const mapsDir = path.join(dataPath, '.peoplemaps');
    ensurePersonMapThumbnail(photos, mapsDir).then(result => {
      if (!cancelled && result) {
        setPersonMapUrl(result.url);
        setPersonMapPoints(result.points);
      }
    });
    return () => { cancelled = true; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 3: Add the Locations section to the render**

In the render, locate the Photos section block:

```tsx
      {/* Photos section */}
      <div style={{ marginBottom: 36 }}>
```

Insert a new Locations section **between** the Photos section and the Documents section. The Documents section begins:

```tsx
      {/* Documents section */}
      <div>
```

Insert this block between them:

```tsx
      {/* Locations map */}
      {personMapUrl && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, letterSpacing: 'var(--tracking-section)', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 14 }}>
            Locations
          </div>
          <button
            onClick={() => setPersonMapModalOpen(true)}
            aria-label="View interactive location map"
            style={{ display: 'block', padding: 0, border: 'none', background: 'none', cursor: 'pointer', width: '100%' }}
          >
            <img
              src={personMapUrl}
              alt={`Map of locations for ${person.name}`}
              style={{
                display: 'block', width: '100%', height: 'auto',
                borderRadius: 6, border: '1px solid var(--border-muted)',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            />
          </button>
          {personMapModalOpen && (
            <MapModal
              points={personMapPoints}
              onClose={() => setPersonMapModalOpen(false)}
            />
          )}
        </div>
      )}
```

- [ ] **Step 4: Confirm TypeScript compiles cleanly**

```bash
yarn build 2>&1 | head -30
```

Expected: clean build with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/People/PersonDetail.tsx
git commit -m "feat: add Locations section to PersonDetail with person map thumbnail"
```

---

## Task 6: Smoke-test end-to-end

**Files:** none

- [ ] **Step 1: Run the full test suite**

```bash
yarn test:run
```

Expected: all existing tests pass plus the 14 new `personMapThumbnail` tests.

- [ ] **Step 2: Start the dev server and check a person page**

```bash
yarn start
# In a second terminal:
yarn electron-dev
```

Navigate to People → pick any person with tagged photos that have GPS data. Expected:
- A "Locations" section appears below Photos (may take a few seconds while tiles are fetched on first load)
- The section is absent for people with no located photos
- Clicking the map thumbnail opens the interactive Leaflet modal
- For a person with one GPS photo, the modal opens centred at zoom 13
- For a person with multiple GPS photos in different places, the modal uses `fitBounds` to show all pins

- [ ] **Step 3: Verify cache behaviour**

After the map thumbnail generates, navigate away and back to the same person. Expected:
- Map loads instantly from cache (no tile network requests in DevTools)
- `.peoplemaps/` directory exists at the app data root with `<hash>.png` and `<hash>.json` files

- [ ] **Step 4: Final commit if any touch-ups were needed**

```bash
git add -p  # stage only intentional changes
git commit -m "fix: smoke-test adjustments for person location map"
```
