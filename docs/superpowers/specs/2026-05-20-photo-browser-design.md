# Family Files — Photo Browser Design Spec

**Date:** 2026-05-20  
**Status:** Approved

---

## Overview

Add full photo metadata display, metadata editing, face tagging with bounding boxes, and a people roster to the existing Family Files Electron + React + TypeScript app.

---

## Decisions

| Decision | Choice |
|---|---|
| Layout | Split panel — photo left (~60%), metadata right (~40%), with fullscreen button |
| Architecture | React Context (`useReducer`) + `exiftool` via `child_process` |
| Metadata storage | Write back to image file (EXIF/XMP) |
| Face region format | XMP `mwg-rs:Regions` (Apple Photos / Lightroom compatible) |
| Face coordinates | Stored as percentage of photo dimensions |
| People roster storage | `people.json` at `process.cwd()/people.json`, read at startup |
| Face tagging trigger | Explicit "Tag faces" mode toggle |

---

## Architecture

### Component Tree

```
PhotoContext (useReducer)
  state: { photos[], activePhoto, people[], isTaggingMode, dirPath }

└── App (HashRouter + Navbar — nav gains /people link)
    ├── PhotosRoute  (/photos — replaces current Photos/index.tsx)
    │   ├── PhotoViewer           (left panel)
    │   │   ├── FaceOverlay       (renders existing bounding boxes + labels)
    │   │   ├── FaceTagger        (mounted only when isTaggingMode=true)
    │   │   └── Filmstrip         (thumbnail strip, keyboard nav)
    │   └── MetadataPanel         (right panel)
    │       ├── MetadataFields    (date, location, camera, caption)
    │       ├── PeopleList        (people tagged in active photo)
    │       └── TagFacesButton    (dispatches SET_TAGGING_MODE)
    └── PeopleRoute  (/people)
        └── PeopleManager         (add / rename / remove people)
```

### Context State Shape

```ts
interface Photo {
  file: string;
  path: string;
  date: string | null;
  location: { lat: number; lng: number; placeName?: string } | null;
  camera: string | null;
  caption: string | null;
  faces: FaceRegion[];
}

interface FaceRegion {
  personId: string | null; // matched from people[] by name on read; null if no roster match
  name: string;            // source of truth — stored in XMP, always populated
  // all values as percentage of photo dimensions (0–1)
  x: number; y: number; w: number; h: number;
}

interface Person {
  id: string;  // uuid
  name: string;
}

interface PhotoState {
  photos: Photo[];
  activePhoto: Photo | null;
  people: Person[];
  isTaggingMode: boolean;
  dirPath: string;
}
```

### Context Actions

```
SET_PHOTOS          — initial load
SET_ACTIVE_PHOTO    — filmstrip / arrow nav
UPDATE_PHOTO_META   — after successful exiftool metadata write
ADD_FACE_REGION     — after successful exiftool face region write
REMOVE_FACE_REGION  — delete a face tag
SET_TAGGING_MODE    — toggle face tagging on/off
SET_PEOPLE          — initial load from people.json
ADD_PERSON          — people roster
UPDATE_PERSON       — rename
REMOVE_PERSON       — delete (does not remove from existing face tags)
```

---

## Data Flow

### 1 — Startup

1. `dirPath` defaults to `${process.cwd()}/public/images/`; making it user-configurable is a future enhancement
2. `fs.readdir(dirPath)` lists image files
3. Single `exiftool -j -n <dir>/*.jpg` batch call returns JSON array with all metadata
4. Parse into `Photo[]`; for each face region, match name against `people[]` to populate `personId` (null if unmatched); dispatch `SET_PHOTOS`; first photo becomes `activePhoto`
5. Read `people.json` at `process.cwd()/people.json` via `fs.readFile` (empty array if file absent), dispatch `SET_PEOPLE`

### 2 — Photo Selection

- Filmstrip click or arrow key → `SET_ACTIVE_PHOTO`
- No disk I/O — metadata already in memory
- `PhotoViewer` swaps photo; `MetadataPanel` populates from `activePhoto`; `FaceOverlay` draws bounding boxes from `activePhoto.faces[]`

### 3 — Metadata Edit

- `MetadataFields` maintains local `draft` state; shows unsaved indicator when dirty
- If user navigates away with unsaved changes: prompt to save or discard
- On Save: shell out to `exiftool`:
  ```
  exiftool -DateTimeOriginal="YYYY:MM:DD HH:MM:SS" \
           -ImageDescription="caption" \
           -GPSLatitude=lat -GPSLatitudeRef=N \
           -GPSLongitude=lng -GPSLongitudeRef=W \
           path/to/file.jpg
  ```
- On success: dispatch `UPDATE_PHOTO_META`; no full reload needed
- Camera (`Make`, `Model`) is read-only — not editable

### 4 — Face Tagging

1. "Tag faces" button → `SET_TAGGING_MODE true`; cursor becomes crosshair; metadata fields become read-only; existing face boxes dim to 50% opacity
2. User drags on photo → `FaceTagger` captures `mousedown → mousemove → mouseup`; draws dashed preview box
3. On `mouseup`: name-picker dropdown appears anchored above the box, filtered by typing
4. User selects a person → shell out to `exiftool` to write `mwg-rs:Regions` XMP struct
5. On success: dispatch `ADD_FACE_REGION`; new box appears in `FaceOverlay`
6. `Esc` or "Exit tagging mode" button → `SET_TAGGING_MODE false`

### 5 — Remove a face tag

- `PeopleList` chip `×` → `REMOVE_FACE_REGION` dispatched with `{ file, regionName }`
- Shell out to `exiftool` to delete that specific region from the XMP struct
- On success: context updates `activePhoto.faces[]`

### 6 — People Roster

- `/people` route renders `PeopleManager`
- Add / rename / remove dispatches to context immediately
- Every change writes full `people.json` via `fs.writeFile`
- Removing a person does **not** strip their name from existing face tags in photos (tags become orphaned but still display their stored name string)

---

## Component Responsibilities

### `PhotoViewer`
- Renders the active photo at full height of the left pane
- Hosts `FaceOverlay` (always) and `FaceTagger` (tagging mode only)
- Contains fullscreen button — calls `element.requestFullscreen()` (CSS fullscreen); metadata panel is hidden while fullscreen is active
- Passes photo dimensions to children so face coordinates can be converted from % to px

### `FaceOverlay`
- Reads `activePhoto.faces[]` from context
- Renders absolutely-positioned boxes over the photo; labels above each box
- In tagging mode: all boxes render at 50% opacity

### `FaceTagger`
- Only rendered when `isTaggingMode = true`
- Absolutely positioned over photo, `cursor: crosshair`, `z-index` above overlay
- On drag: renders dashed preview box
- On `mouseup`: shows name-picker; on confirm writes face region and dispatches

### `Filmstrip`
- Horizontal thumbnail strip at the bottom of the left pane
- Arrow key listeners attached at `PhotosRoute` level
- Active photo highlighted with blue border

### `MetadataPanel`
- Right panel, always visible in split view
- Hidden in fullscreen mode
- Scrollable if content overflows

### `MetadataFields`
- Click any field to enter edit mode inline
- Save/Cancel bar appears when draft differs from saved values
- Fields: Date taken (editable), Location (editable), Camera (read-only), Caption (editable textarea)

### `PeopleList`
- Shows chips for each person tagged in `activePhoto.faces[]`
- Each chip has an `×` to remove the face region (writes to file)

### `PeopleManager` (`/people` route)
- Lists all people in roster with add / rename (inline) / delete actions
- Delete warns if person has face tags in any photo (informational only)

---

## `exiftool` Integration

- Invoked via Electron's `child_process.execFile`
- `exiftool` binary must be installed on the host machine (documented in README)
- All calls are async; loading state shown in the UI during writes
- On error: surface message in the panel, do not update context state

**Key commands:**

```bash
# Read all metadata (startup)
exiftool -j -n /path/to/images/

# Write basic metadata
exiftool -DateTimeOriginal="2019:06:14 12:00:00" \
         -ImageDescription="caption text" \
         -GPSLatitude=47.6062 -GPSLatitudeRef=N \
         -GPSLongitude=122.3321 -GPSLongitudeRef=W \
         image.jpg

# Write face region (one region — exiftool handles merging with existing)
exiftool -XMP-mwg-rs:RegionAppliedToDimensionsW=4032 \
         -XMP-mwg-rs:RegionAppliedToDimensionsH=3024 \
         -XMP-mwg-rs:RegionAppliedToDimensionsUnit=pixel \
         -XMP-mwg-rs:RegionName="Mom" \
         -XMP-mwg-rs:RegionType=Face \
         -XMP-mwg-rs:RegionAreaX=0.25 -XMP-mwg-rs:RegionAreaY=0.20 \
         -XMP-mwg-rs:RegionAreaW=0.18 -XMP-mwg-rs:RegionAreaH=0.28 \
         -XMP-mwg-rs:RegionAreaUnit=normalized \
         image.jpg
```

---

## File Structure Changes

```
src/
  context/
    PhotoContext.tsx        — context + useReducer + provider
    types.ts                — Photo, FaceRegion, Person interfaces
  Photos/
    index.tsx               — PhotosRoute (thin shell, consumes context)
    PhotoViewer.tsx
    FaceOverlay.tsx
    FaceTagger.tsx
    Filmstrip.tsx
    MetadataPanel.tsx
    MetadataFields.tsx
    PeopleList.tsx
  People/
    index.tsx               — PeopleRoute
    PeopleManager.tsx
  utils/
    exiftool.ts             — execFile wrappers (readMetadata, writeMeta, writeFaceRegion)
    people.ts               — readPeopleJson, writePeopleJson
```

---

## Out of Scope

- Automatic face detection / AI tagging
- HEIC / RAW file support (JPEG only for now)
- Cloud sync or remote directories
- The `/tree` route (placeholder remains)
