# Family Files — Photo Browser Design Spec

**Date:** 2026-05-20  
**Status:** Approved

---

## Overview

Add full photo metadata display, metadata editing, face tagging with bounding boxes, a people roster, person-filtered photo views, and document management to the existing Family Files Electron + React + TypeScript app.

---

## Decisions

| Decision | Choice |
|---|---|
| Layout | Split panel — photo left (~60%), metadata right (~40%), with fullscreen button |
| Architecture | React Context (`useReducer`) — single `AppContext` for photos, documents, and people |
| Metadata write mechanism | `exiftool` via `child_process` |
| Photo metadata storage | Write back to image file (EXIF/XMP) |
| Document metadata storage | `documents.json` at `process.cwd()/documents.json` |
| Face region format | XMP `mwg-rs:Regions` (Apple Photos / Lightroom compatible) |
| Face coordinates | Stored as percentage of photo dimensions |
| People roster storage | `people.json` at `process.cwd()/people.json`, read at startup |
| Face tagging trigger | Explicit "Tag faces" mode toggle |
| Document viewing | Inline for images + PDFs; `shell.openPath()` for all other types |
| Person detail | `/people/:id` — shows their tagged photos and linked documents |

---

## Architecture

### Component Tree

```
AppContext (useReducer)
  state: { photos[], activePhoto, people[], isTaggingMode,
           documents[], activeDocument }

└── App (HashRouter + Navbar)
    │   Nav links: Home · Photos · Documents · People · Tree
    │
    ├── PhotosRoute  (/photos)
    │   ├── PhotoViewer           (left panel)
    │   │   ├── FaceOverlay       (renders existing bounding boxes + labels)
    │   │   ├── FaceTagger        (mounted only when isTaggingMode=true)
    │   │   └── Filmstrip         (thumbnail strip, keyboard nav)
    │   └── MetadataPanel         (right panel)
    │       ├── MetadataFields    (date, location, camera, caption)
    │       ├── PeopleList        (people tagged in active photo)
    │       └── TagFacesButton    (dispatches SET_TAGGING_MODE)
    │
    ├── DocumentsRoute  (/documents)
    │   ├── DocumentList          (left panel — scrollable list of all documents)
    │   └── DocumentPanel         (right panel)
    │       ├── DocumentViewer    (inline PDF/image render or external open button)
    │       ├── DocumentFields    (title, date, description — editable)
    │       └── DocumentPeople    (linked people chips + add link)
    │
    └── PeopleRoute  (/people)
        ├── PeopleManager         (list with add / rename / delete)
        └── [/people/:id]
            └── PersonDetail
                ├── PersonPhotoGrid   (photos where this person is face-tagged)
                └── PersonDocList     (documents linked to this person)
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

interface Document {
  id: string;          // uuid
  title: string;
  date: string | null;
  description: string;
  personIds: string[]; // links to Person.id
  type: 'file' | 'note';
  // type='file': path relative to public/documents/
  filePath?: string;
  // type='note': content stored directly here, no external file
  content?: string;
}

interface Person {
  id: string;  // uuid
  name: string;
}

interface AppState {
  photos: Photo[];
  activePhoto: Photo | null;
  documents: Document[];
  activeDocument: Document | null;
  people: Person[];
  isTaggingMode: boolean;
}
```

### Context Actions

```
-- Photos --
SET_PHOTOS          — initial load
SET_ACTIVE_PHOTO    — filmstrip / arrow nav
UPDATE_PHOTO_META   — after successful exiftool metadata write
ADD_FACE_REGION     — after successful exiftool face region write
REMOVE_FACE_REGION  — delete a face tag
SET_TAGGING_MODE    — toggle face tagging on/off

-- Documents --
SET_DOCUMENTS       — initial load from documents.json
SET_ACTIVE_DOCUMENT — document list selection
ADD_DOCUMENT        — new file or note
UPDATE_DOCUMENT     — edit title / date / description / people links
REMOVE_DOCUMENT     — delete (removes from documents.json; does not delete the file)

-- People --
SET_PEOPLE          — initial load from people.json
ADD_PERSON
UPDATE_PERSON       — rename
REMOVE_PERSON       — delete (does not remove from face tags or document links)
```

---

## Data Flow

### 1 — Startup

1. `dirPath` defaults to `${process.cwd()}/public/images/`; making it user-configurable is a future enhancement
2. `fs.readdir(dirPath)` lists image files
3. Single `exiftool -j -n <dir>/*.jpg` batch call returns JSON array with all metadata
4. Read `people.json` at `process.cwd()/people.json` (empty array if absent), dispatch `SET_PEOPLE`
5. Parse photos into `Photo[]`; for each face region, match name against `people[]` to populate `personId` (null if unmatched); dispatch `SET_PHOTOS`; first photo becomes `activePhoto`
6. Read `documents.json` at `process.cwd()/documents.json` (empty array if absent), dispatch `SET_DOCUMENTS`

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

### 6 — Documents

- `DocumentList` shows all documents; clicking one → `SET_ACTIVE_DOCUMENT`
- **Add file document**: user clicks "Add document" → native file picker (Electron `dialog.showOpenDialog`) → file is copied to `public/documents/` → `ADD_DOCUMENT` dispatched → `documents.json` written
- **Add text note**: user clicks "New note" → blank `DocumentPanel` with empty fields → `ADD_DOCUMENT` dispatched on save → `documents.json` written
- **Edit**: `DocumentFields` inline edit → `UPDATE_DOCUMENT` dispatched → `documents.json` written
- **Link/unlink person**: `DocumentPeople` chip add/remove → `UPDATE_DOCUMENT` → `documents.json` written
- **View file**: images and PDFs render in `DocumentViewer` inline; other file types show an "Open in [app]" button using `shell.openPath()`
- **Delete**: `REMOVE_DOCUMENT` dispatched → removed from `documents.json`; the file in `public/documents/` is **not** deleted

### 7 — Person Detail (`/people/:id`)

- `PersonDetail` derives its data from context — no extra fetch needed
- `PersonPhotoGrid`: filters `photos[]` for entries where `faces[].personId === id`
- `PersonDocList`: filters `documents[]` for entries where `personIds.includes(id)`
- Clicking a photo in `PersonPhotoGrid` navigates to `/photos` with that photo as active
- Clicking a document in `PersonDocList` navigates to `/documents` with that document as active

### 8 — People Roster

- `/people` lists all people; "Add person" → `ADD_PERSON` → `people.json` written
- Rename inline → `UPDATE_PERSON` → `people.json` written
- Delete → `REMOVE_PERSON` → `people.json` written; face tags and document links retain the name/id string but become unresolvable (displayed as-is)

---

## Component Responsibilities

### `PhotoViewer`
- Renders the active photo at full height of the left pane
- Hosts `FaceOverlay` (always) and `FaceTagger` (tagging mode only)
- Contains fullscreen button — calls `element.requestFullscreen()`; metadata panel hidden while fullscreen is active
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
- Each chip has an `×` to remove the face region

### `DocumentList`
- Scrollable list of all documents in left panel of `/documents`
- Shows title, date, type icon (file vs note), and first linked person name
- "Add document" and "New note" buttons at top

### `DocumentPanel`
- Right panel for the selected document
- `DocumentViewer`: renders images with `<img>`, PDFs with `<iframe>` or `<embed>`; other types show filename + "Open in default app" button
- `DocumentFields`: title (editable), date (editable), description (editable textarea)
- `DocumentPeople`: people chips with `×` to unlink; autocomplete dropdown to add links

### `PersonDetail` (`/people/:id`)
- Header: person name with edit button
- `PersonPhotoGrid`: masonry or fixed-size grid of tagged photos; clicking navigates to `/photos`
- `PersonDocList`: list of linked documents; clicking navigates to `/documents`
- Back link to `/people`

### `PeopleManager` (`/people`)
- Lists all people with photo count and document count shown per person
- Each person name is a link to `/people/:id`
- Inline rename; delete with confirmation if person has any photo tags or document links

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

# Write face region
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
    AppContext.tsx         — unified context + useReducer + provider (replaces PhotoContext)
    types.ts               — Photo, FaceRegion, Document, Person interfaces

  Photos/
    index.tsx              — PhotosRoute
    PhotoViewer.tsx
    FaceOverlay.tsx
    FaceTagger.tsx
    Filmstrip.tsx
    MetadataPanel.tsx
    MetadataFields.tsx
    PeopleList.tsx

  Documents/
    index.tsx              — DocumentsRoute
    DocumentList.tsx
    DocumentPanel.tsx
    DocumentViewer.tsx
    DocumentFields.tsx
    DocumentPeople.tsx

  People/
    index.tsx              — PeopleRoute (list + PeopleManager)
    PeopleManager.tsx
    PersonDetail.tsx
    PersonPhotoGrid.tsx
    PersonDocList.tsx

  utils/
    exiftool.ts            — execFile wrappers (readMetadata, writeMeta, writeFaceRegion)
    people.ts              — readPeopleJson, writePeopleJson
    documents.ts           — readDocumentsJson, writeDocumentsJson

public/
  images/                  — photo files (existing)
  documents/               — document files (new)
```

---

## Out of Scope

- Automatic face detection / AI tagging
- HEIC / RAW file support (JPEG only for now)
- Cloud sync or remote directories
- The `/tree` route (placeholder remains)
- Deleting files from `public/documents/` through the app
