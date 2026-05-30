# Person Location Map — Design Spec
_Date: 2026-05-30_

## Overview

Add a static map thumbnail to each person's detail page showing all the GPS-located photos tagged with them. Clicking the thumbnail opens the interactive Leaflet map with all points plotted. The static image is cached on disk under `.peoplemaps/` at the app data root, keyed by an MD5 hash of the source location data so it auto-invalidates when locations change.

---

## Architecture

### 1. `src/utils/personMapThumbnail.ts` — new utility

**Responsibilities:**
- Collect GPS coordinates and text-only locations from a person's photos
- Geocode text-only locations (`city`, `state`, `country`) to `{lat, lng}` via Nominatim (OSM)
- Hash the input location data to produce a stable cache key
- Generate the static PNG and save it to `.peoplemaps/<hash>.png`
- Expose a single top-level function `ensurePersonMapThumbnail` that returns `{url, points}` or `null`

**Geocoding:**
- Endpoint: `https://nominatim.openstreetmap.org/search?city=X&state=Y&country=Z&format=json&limit=1`
- Required User-Agent header: `FamilyFiles/1.0 (personal family photo app)`
- Rate limited to 1 request per second using a simple sequential queue
- Failed geocodes are skipped silently; they do not block map generation
- Geocode results are not cached to disk (in-memory only per session); the output PNG is the durable artifact

**Hash function — `personMapHash(photos: Photo[]): string`:**
- Extract two input sets from the person's photos:
  - GPS set: all unique `"lat,lng"` strings from photos with `location != null`, sorted
  - Text set: all unique `"city|state|country"` strings from photos that have at least one of those fields but no GPS, sorted
- Concatenate both sorted arrays, join with `\n`, MD5-hash the result
- Returns the hex digest — this is the cache key

**Thumbnail generation — `generatePersonMapThumbnail(points, hash, mapsDir)`:**
- Input: array of `{lat, lng}` (after geocoding), hash string, maps directory path
- Determine bounding box of all points; add 10% padding
- Find the lowest zoom level (1–8) at which the padded bounding box fits within a `400×220` output at standard tile resolution
- Identify the tile grid needed to cover that bounding box at the chosen zoom
- Fetch all required tiles via `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (same approach as `mapThumbnail.ts`)
- Composite tiles onto a canvas
- Draw a red circle pin (radius 5, white stroke 1.5px, drop shadow) at each point's pixel position
- Add OSM attribution text (required by tile usage policy)
- Crop/scale to `400×220`
- Write PNG to `<mapsDir>/<hash>.png`

**Top-level export — `ensurePersonMapThumbnail(personId, photos, mapsDir)`:**
```ts
export async function ensurePersonMapThumbnail(
  personId: string,
  photos: Photo[],       // already filtered to this person's photos
  mapsDir: string
): Promise<{ url: string; points: { lat: number; lng: number }[] } | null>
```
- Returns `null` if the person has no photos with any location data, or if offline
- Returns `{ url: "file://...", points: [...] }` if the cached PNG exists (skipping regeneration)
- Generates the PNG (geocoding + tile fetch + compositing) if not cached
- Returns `null` if generation fails (tile fetch error, no points resolved)

**Helper exports (for tests):**
- `personMapHash(photos: Photo[]): string`
- `personMapFilePath(mapsDir: string, hash: string): string`

---

### 2. `src/Photos/MapModal.tsx` — extend props

**Current signature:** `{ lat: number; lng: number; onClose: () => void }`

**New signature:**
```ts
interface Props {
  points: { lat: number; lng: number }[];
  onClose: () => void;
}
```

All existing call sites pass a single GPS coordinate; they are updated to `points={[{ lat, lng }]}`.

**Behaviour changes:**
- Single point (`points.length === 1`): same as today — `setView([lat, lng], 13)`, one marker
- Multiple points (`points.length > 1`): `map.fitBounds(L.latLngBounds(points.map(...)))` with `padding: [40, 40]`, one marker per point
- Offline state: unchanged (shows coordinate list instead of interactive map; for multi-point, shows all coordinates)

---

### 3. `src/People/PersonDetail.tsx` — new Locations section

**New state:**
```ts
const [personMapUrl, setPersonMapUrl] = useState<string | null>(null);
const [personMapPoints, setPersonMapPoints] = useState<{ lat: number; lng: number }[]>([]);
const [personMapModalOpen, setPersonMapModalOpen] = useState(false);
```

**Effect:** fires when `person.id` or `state.photos` changes
- Filters photos tagged with this person
- Calls `ensurePersonMapThumbnail(person.id, photos, peoplemapsDir)`
- `peoplemapsDir` = `path.join(dataPath, '.peoplemaps')`
- Sets `personMapUrl` and `personMapPoints` from result (or clears them if `null`)

**Render:** new "Locations" section inserted between Photos and Documents:
- Renders nothing if `personMapUrl` is null (no empty state shown)
- Otherwise: section label "Locations", then a clickable `<img>` thumbnail (same style as the photo-level map thumbnail in `MetadataFields`)
- Click opens `MapModal` with `points={personMapPoints}`

---

## Data Flow

```
PersonDetail mounts
  → filter state.photos for this person
  → ensurePersonMapThumbnail(personId, photos, dataPath/.peoplemaps)
      → personMapHash(photos)           → hash string
      → check .peoplemaps/<hash>.png    → cache hit? return {url, points}
      → collect GPS points              → [{lat,lng}, ...]
      → collect text locations          → ["city|state|country", ...]
      → geocode each text location      → [{lat,lng} | null, ...]
      → merge & deduplicate all points
      → generatePersonMapThumbnail(points, hash, mapsDir)
          → compute bbox + zoom
          → fetch tiles
          → composite + draw pins + attribution
          → write PNG
      → return {url: "file://...", points}
  → setState → render thumbnail
User clicks thumbnail
  → setPersonMapModalOpen(true)
  → MapModal renders with all points → fitBounds
```

---

## Error Handling

- Offline: `ensurePersonMapThumbnail` returns `null`; map section is hidden
- Tile fetch failure: generation aborts silently; returns `null`
- Geocode failure: that location is skipped; map generates with remaining points
- Zero points resolved: returns `null`; map section hidden
- Write failure: logged to console; returns `null`
- Rapid navigation (switching people mid-generation): concurrent calls may run; safe because the write is idempotent (same hash → same output file). No deduplication guard needed.

---

## What is Not Changing

- The per-photo map thumbnail (`mapThumbnail.ts`, `.maps/`) is untouched
- The existing single-point `MapModal` call sites in `MetadataFields` are updated to the new `points` array prop but otherwise unchanged in behaviour
- No new npm dependencies

---

## Files Touched

| File | Change |
|---|---|
| `src/utils/personMapThumbnail.ts` | **New** |
| `src/Photos/MapModal.tsx` | Extend props: `{lat,lng}` → `{points[]}` |
| `src/Photos/MetadataFields.tsx` | Update `MapModal` call to `points={[{lat,lng}]}` |
| `src/People/PersonDetail.tsx` | Add Locations section + `ensurePersonMapThumbnail` effect |
