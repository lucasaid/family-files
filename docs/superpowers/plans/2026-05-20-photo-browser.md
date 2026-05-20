# Family Files Photo Browser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add metadata display/editing, face tagging, people roster, person detail views, and document management to the Family Files Electron app.

**Architecture:** A single `AppContext` (React `useReducer`) holds all shared state — photos, documents, people, and UI mode. Components read from context and dispatch actions; side effects (exiftool writes, JSON persistence) happen in event handlers before dispatching. The existing `Photos/index.tsx` is replaced by a split-panel layout; two new routes (`/documents`, `/people`) are added.

**Tech Stack:** React 18, TypeScript, Electron 28 (nodeIntegration=true, contextIsolation=false), react-bootstrap 2, react-router-dom 6, exiftool (system binary via `child_process`), exifreader (already installed, for reading only at startup fallback).

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `src/context/types.ts` | Create | All shared interfaces: Photo, FaceRegion, Document, Person, AppState, AppAction |
| `src/context/AppContext.tsx` | Create | useReducer, provider, useAppContext hook |
| `src/utils/exiftool.ts` | Create | readMetadata, writeMeta, writeFaceRegions |
| `src/utils/people.ts` | Create | readPeopleJson, writePeopleJson |
| `src/utils/documents.ts` | Create | readDocumentsJson, writeDocumentsJson, copyToDocumentsDir |
| `src/App.tsx` | Modify | Add AppProvider wrapper, update nav, add routes |
| `src/Photos/index.tsx` | Replace | PhotosRoute — split-panel shell |
| `src/Photos/PhotoViewer.tsx` | Create | Photo display, fullscreen, hosts overlays |
| `src/Photos/Filmstrip.tsx` | Create | Thumbnail strip + keyboard nav |
| `src/Photos/FaceOverlay.tsx` | Create | Bounding box rendering |
| `src/Photos/FaceTagger.tsx` | Create | Drag-to-draw + name picker |
| `src/Photos/MetadataPanel.tsx` | Create | Right panel shell |
| `src/Photos/MetadataFields.tsx` | Create | Editable date/location/caption fields |
| `src/Photos/PeopleList.tsx` | Create | Face-tagged people chips |
| `src/People/index.tsx` | Create | PeopleRoute — list + nested detail |
| `src/People/PeopleManager.tsx` | Create | Add/rename/delete people |
| `src/People/PersonDetail.tsx` | Create | /people/:id page |
| `src/People/PersonPhotoGrid.tsx` | Create | Photos filtered by personId |
| `src/People/PersonDocList.tsx` | Create | Documents filtered by personId |
| `src/Documents/index.tsx` | Create | DocumentsRoute — split-panel shell |
| `src/Documents/DocumentList.tsx` | Create | Scrollable document list + add buttons |
| `src/Documents/DocumentPanel.tsx` | Create | Right panel shell |
| `src/Documents/DocumentViewer.tsx` | Create | Inline image/PDF or external open |
| `src/Documents/DocumentFields.tsx` | Create | Editable title/date/description |
| `src/Documents/DocumentPeople.tsx` | Create | Linked people chips |
| `public/documents/` | Create | Directory for document files |
| `src/App.test.tsx` | Modify | Update to match new app shell |

---

## Task 1: Types

**Files:**
- Create: `src/context/types.ts`

- [ ] **Step 1: Create types file**

```ts
// src/context/types.ts

export interface FaceRegion {
  personId: string | null; // matched from people[] by name on read; null if unmatched
  name: string;            // source of truth — stored in XMP
  x: number; // 0–1, percentage of photo width
  y: number; // 0–1, percentage of photo height
  w: number;
  h: number;
}

export interface Photo {
  file: string;
  path: string;
  date: string | null;
  location: { lat: number; lng: number; placeName?: string } | null;
  camera: string | null;
  caption: string | null;
  faces: FaceRegion[];
}

export interface FamilyDocument {
  id: string;
  title: string;
  date: string | null;
  description: string;
  personIds: string[];
  type: 'file' | 'note';
  filePath?: string; // relative to public/documents/ for type='file'
  content?: string;  // inline text for type='note'
}

export interface Person {
  id: string;
  name: string;
}

export interface AppState {
  photos: Photo[];
  activePhoto: Photo | null;
  documents: FamilyDocument[];
  activeDocument: FamilyDocument | null;
  people: Person[];
  isTaggingMode: boolean;
}

export type AppAction =
  | { type: 'SET_PHOTOS'; photos: Photo[] }
  | { type: 'SET_ACTIVE_PHOTO'; photo: Photo }
  | { type: 'UPDATE_PHOTO_META'; file: string; meta: Partial<Pick<Photo, 'date' | 'location' | 'caption'>> }
  | { type: 'ADD_FACE_REGION'; file: string; region: FaceRegion }
  | { type: 'REMOVE_FACE_REGION'; file: string; regionName: string }
  | { type: 'SET_TAGGING_MODE'; enabled: boolean }
  | { type: 'SET_DOCUMENTS'; documents: FamilyDocument[] }
  | { type: 'SET_ACTIVE_DOCUMENT'; document: FamilyDocument | null }
  | { type: 'ADD_DOCUMENT'; document: FamilyDocument }
  | { type: 'UPDATE_DOCUMENT'; document: FamilyDocument }
  | { type: 'REMOVE_DOCUMENT'; id: string }
  | { type: 'SET_PEOPLE'; people: Person[] }
  | { type: 'ADD_PERSON'; person: Person }
  | { type: 'UPDATE_PERSON'; person: Person }
  | { type: 'REMOVE_PERSON'; id: string };
```

- [ ] **Step 2: Commit**

```bash
git add src/context/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 2: AppContext

**Files:**
- Create: `src/context/AppContext.tsx`

- [ ] **Step 1: Write failing reducer test**

```ts
// src/context/AppContext.test.ts
import { appReducer, initialState } from './AppContext';
import { Photo, Person, FamilyDocument, FaceRegion } from './types';

const photo: Photo = {
  file: 'IMG_001.jpg', path: '/images/IMG_001.jpg',
  date: '2020:01:01', location: null, camera: 'iPhone', caption: null, faces: [],
};
const person: Person = { id: 'p1', name: 'Alice' };
const doc: FamilyDocument = {
  id: 'd1', title: 'Birth cert', date: '1990:01:01',
  description: '', personIds: [], type: 'file', filePath: 'cert.pdf',
};

test('SET_PHOTOS sets photos and activePhoto to first', () => {
  const s = appReducer(initialState, { type: 'SET_PHOTOS', photos: [photo] });
  expect(s.photos).toEqual([photo]);
  expect(s.activePhoto).toEqual(photo);
});

test('SET_ACTIVE_PHOTO updates activePhoto', () => {
  const s0 = appReducer(initialState, { type: 'SET_PHOTOS', photos: [photo] });
  const photo2 = { ...photo, file: 'IMG_002.jpg' };
  const s1 = appReducer(s0, { type: 'SET_ACTIVE_PHOTO', photo: photo2 });
  expect(s1.activePhoto?.file).toBe('IMG_002.jpg');
});

test('UPDATE_PHOTO_META updates matching photo and activePhoto', () => {
  const s0 = appReducer(initialState, { type: 'SET_PHOTOS', photos: [photo] });
  const s1 = appReducer(s0, { type: 'UPDATE_PHOTO_META', file: 'IMG_001.jpg', meta: { caption: 'Hello' } });
  expect(s1.activePhoto?.caption).toBe('Hello');
  expect(s1.photos[0].caption).toBe('Hello');
});

test('ADD_FACE_REGION appends region to matching photo', () => {
  const s0 = appReducer(initialState, { type: 'SET_PHOTOS', photos: [photo] });
  const region: FaceRegion = { personId: 'p1', name: 'Alice', x: 0.1, y: 0.1, w: 0.2, h: 0.3 };
  const s1 = appReducer(s0, { type: 'ADD_FACE_REGION', file: 'IMG_001.jpg', region });
  expect(s1.activePhoto?.faces).toHaveLength(1);
  expect(s1.activePhoto?.faces[0].name).toBe('Alice');
});

test('REMOVE_FACE_REGION removes region by name', () => {
  const region: FaceRegion = { personId: 'p1', name: 'Alice', x: 0.1, y: 0.1, w: 0.2, h: 0.3 };
  const photoWithFace = { ...photo, faces: [region] };
  const s0 = appReducer(initialState, { type: 'SET_PHOTOS', photos: [photoWithFace] });
  const s1 = appReducer(s0, { type: 'REMOVE_FACE_REGION', file: 'IMG_001.jpg', regionName: 'Alice' });
  expect(s1.activePhoto?.faces).toHaveLength(0);
});

test('SET_TAGGING_MODE toggles isTaggingMode', () => {
  const s = appReducer(initialState, { type: 'SET_TAGGING_MODE', enabled: true });
  expect(s.isTaggingMode).toBe(true);
});

test('ADD_PERSON appends to people', () => {
  const s = appReducer(initialState, { type: 'ADD_PERSON', person });
  expect(s.people).toHaveLength(1);
  expect(s.people[0].name).toBe('Alice');
});

test('UPDATE_PERSON renames in-place', () => {
  const s0 = appReducer(initialState, { type: 'ADD_PERSON', person });
  const s1 = appReducer(s0, { type: 'UPDATE_PERSON', person: { ...person, name: 'Alicia' } });
  expect(s1.people[0].name).toBe('Alicia');
});

test('REMOVE_PERSON removes from people', () => {
  const s0 = appReducer(initialState, { type: 'ADD_PERSON', person });
  const s1 = appReducer(s0, { type: 'REMOVE_PERSON', id: 'p1' });
  expect(s1.people).toHaveLength(0);
});

test('ADD_DOCUMENT appends to documents', () => {
  const s = appReducer(initialState, { type: 'ADD_DOCUMENT', document: doc });
  expect(s.documents).toHaveLength(1);
});

test('UPDATE_DOCUMENT updates matching document', () => {
  const s0 = appReducer(initialState, { type: 'ADD_DOCUMENT', document: doc });
  const s1 = appReducer(s0, { type: 'UPDATE_DOCUMENT', document: { ...doc, title: 'Updated' } });
  expect(s1.documents[0].title).toBe('Updated');
});

test('REMOVE_DOCUMENT removes from documents', () => {
  const s0 = appReducer(initialState, { type: 'ADD_DOCUMENT', document: doc });
  const s1 = appReducer(s0, { type: 'REMOVE_DOCUMENT', id: 'd1' });
  expect(s1.documents).toHaveLength(0);
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
yarn test --watchAll=false --testPathPattern="AppContext.test"
```

Expected: FAIL — `appReducer` and `initialState` not found.

- [ ] **Step 3: Create AppContext**

```tsx
// src/context/AppContext.tsx
import React, { createContext, useContext, useReducer } from 'react';
import { AppState, AppAction, Photo } from './types';

export const initialState: AppState = {
  photos: [],
  activePhoto: null,
  documents: [],
  activeDocument: null,
  people: [],
  isTaggingMode: false,
};

function updatePhoto(photos: Photo[], file: string, updater: (p: Photo) => Photo): Photo[] {
  return photos.map(p => p.file === file ? updater(p) : p);
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PHOTOS':
      return { ...state, photos: action.photos, activePhoto: action.photos[0] ?? null };
    case 'SET_ACTIVE_PHOTO':
      return { ...state, activePhoto: action.photo, isTaggingMode: false };
    case 'UPDATE_PHOTO_META': {
      const photos = updatePhoto(state.photos, action.file, p => ({ ...p, ...action.meta }));
      const activePhoto = state.activePhoto?.file === action.file
        ? { ...state.activePhoto, ...action.meta } : state.activePhoto;
      return { ...state, photos, activePhoto };
    }
    case 'ADD_FACE_REGION': {
      const photos = updatePhoto(state.photos, action.file, p => ({
        ...p, faces: [...p.faces, action.region],
      }));
      const activePhoto = state.activePhoto?.file === action.file
        ? { ...state.activePhoto, faces: [...state.activePhoto.faces, action.region] }
        : state.activePhoto;
      return { ...state, photos, activePhoto };
    }
    case 'REMOVE_FACE_REGION': {
      const photos = updatePhoto(state.photos, action.file, p => ({
        ...p, faces: p.faces.filter(f => f.name !== action.regionName),
      }));
      const activePhoto = state.activePhoto?.file === action.file
        ? { ...state.activePhoto, faces: state.activePhoto.faces.filter(f => f.name !== action.regionName) }
        : state.activePhoto;
      return { ...state, photos, activePhoto };
    }
    case 'SET_TAGGING_MODE':
      return { ...state, isTaggingMode: action.enabled };
    case 'SET_DOCUMENTS':
      return { ...state, documents: action.documents };
    case 'SET_ACTIVE_DOCUMENT':
      return { ...state, activeDocument: action.document };
    case 'ADD_DOCUMENT':
      return { ...state, documents: [...state.documents, action.document] };
    case 'UPDATE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.map(d => d.id === action.document.id ? action.document : d),
        activeDocument: state.activeDocument?.id === action.document.id ? action.document : state.activeDocument,
      };
    case 'REMOVE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.filter(d => d.id !== action.id),
        activeDocument: state.activeDocument?.id === action.id ? null : state.activeDocument,
      };
    case 'SET_PEOPLE':
      return { ...state, people: action.people };
    case 'ADD_PERSON':
      return { ...state, people: [...state.people, action.person] };
    case 'UPDATE_PERSON':
      return { ...state, people: state.people.map(p => p.id === action.person.id ? action.person : p) };
    case 'REMOVE_PERSON':
      return { ...state, people: state.people.filter(p => p.id !== action.id) };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
yarn test --watchAll=false --testPathPattern="AppContext.test"
```

Expected: All 12 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/context/AppContext.tsx src/context/AppContext.test.ts
git commit -m "feat: add AppContext with useReducer and full test suite"
```

---

## Task 3: Utility Functions

**Files:**
- Create: `src/utils/exiftool.ts`
- Create: `src/utils/people.ts`
- Create: `src/utils/documents.ts`

- [ ] **Step 1: Create exiftool utility**

```ts
// src/utils/exiftool.ts
import { Photo, FaceRegion, Person } from '../context/types';

const { execFile } = (window as any).require('child_process') as typeof import('child_process');

function run(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('exiftool', args, { maxBuffer: 50 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });
}

function parseDate(raw: string | undefined): string | null {
  return raw ?? null;
}

function parseLocation(data: any): Photo['location'] {
  if (!data.GPSLatitude || !data.GPSLongitude) return null;
  return { lat: Number(data.GPSLatitude), lng: Number(data.GPSLongitude) };
}

function parseFaces(data: any, people: Person[]): FaceRegion[] {
  const regions = data['RegionList'] ?? data['XMP-mwg-rs:RegionList'] ?? [];
  return regions
    .filter((r: any) => r.RegionType === 'Face' || r.Type === 'Face')
    .map((r: any) => {
      const name: string = r.RegionName ?? r.Name ?? '';
      const area = r.RegionArea ?? r.Area ?? {};
      const personId = people.find(p => p.name === name)?.id ?? null;
      return {
        personId,
        name,
        x: Number(area.X ?? 0),
        y: Number(area.Y ?? 0),
        w: Number(area.W ?? 0),
        h: Number(area.H ?? 0),
      };
    });
}

export async function readMetadata(dirPath: string, people: Person[]): Promise<Photo[]> {
  const stdout = await run(['-j', '-n', '-struct', dirPath]);
  const items: any[] = JSON.parse(stdout);
  return items.map(item => ({
    file: item.FileName,
    path: `${dirPath}/${item.FileName}`,
    date: parseDate(item.DateTimeOriginal),
    location: parseLocation(item),
    camera: [item.Make, item.Model].filter(Boolean).join(' ') || null,
    caption: item.ImageDescription ?? null,
    faces: parseFaces(item, people),
  }));
}

export async function writeMeta(
  filePath: string,
  meta: { date?: string; caption?: string; location?: { lat: number; lng: number } }
): Promise<void> {
  const args = ['-overwrite_original'];
  if (meta.date) args.push(`-DateTimeOriginal=${meta.date}`);
  if (meta.caption !== undefined) args.push(`-ImageDescription=${meta.caption}`);
  if (meta.location) {
    args.push(`-GPSLatitude=${meta.location.lat}`);
    args.push(`-GPSLatitudeRef=${meta.location.lat >= 0 ? 'N' : 'S'}`);
    args.push(`-GPSLongitude=${Math.abs(meta.location.lng)}`);
    args.push(`-GPSLongitudeRef=${meta.location.lng >= 0 ? 'E' : 'W'}`);
  }
  args.push(filePath);
  await run(args);
}

export async function writeFaceRegions(filePath: string, faces: FaceRegion[]): Promise<void> {
  // Read image dimensions first (needed for mwg-rs applied dimensions)
  const dimOut = await run(['-j', '-n', '-ImageWidth', '-ImageHeight', filePath]);
  const [dim] = JSON.parse(dimOut);
  const w = dim.ImageWidth ?? 1;
  const h = dim.ImageHeight ?? 1;

  // Build struct args; writing the full list replaces any existing regions
  const args = ['-overwrite_original', '-struct'];

  if (faces.length === 0) {
    args.push('-XMP-mwg-rs:RegionList=');
  } else {
    const regionStructs = faces.map(f =>
      `{Type=Face,Name=${f.name},Area={X=${f.x},Y=${f.y},W=${f.w},H=${f.h},Unit=normalized}}`
    ).join(',');
    args.push(`-XMP-mwg-rs:AppliedToDimensions={W=${w},H=${h},Unit=pixel}`);
    args.push(`-XMP-mwg-rs:RegionList=[${regionStructs}]`);
  }
  args.push(filePath);
  await run(args);
}
```

- [ ] **Step 2: Create people utility**

```ts
// src/utils/people.ts
import { Person } from '../context/types';

const fs = (window as any).require('fs') as typeof import('fs');
const path = (window as any).require('path') as typeof import('path');

const PEOPLE_PATH = path.join(process.cwd(), 'people.json');

export async function readPeopleJson(): Promise<Person[]> {
  try {
    const raw = await fs.promises.readFile(PEOPLE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function writePeopleJson(people: Person[]): Promise<void> {
  await fs.promises.writeFile(PEOPLE_PATH, JSON.stringify(people, null, 2), 'utf-8');
}
```

- [ ] **Step 3: Create documents utility**

```ts
// src/utils/documents.ts
import { FamilyDocument } from '../context/types';

const fs = (window as any).require('fs') as typeof import('fs');
const path = (window as any).require('path') as typeof import('path');

const DOCS_PATH = path.join(process.cwd(), 'documents.json');
const DOCS_DIR = path.join(process.cwd(), 'public', 'documents');

export async function readDocumentsJson(): Promise<FamilyDocument[]> {
  try {
    const raw = await fs.promises.readFile(DOCS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function writeDocumentsJson(documents: FamilyDocument[]): Promise<void> {
  await fs.promises.writeFile(DOCS_PATH, JSON.stringify(documents, null, 2), 'utf-8');
}

export async function copyToDocumentsDir(sourcePath: string): Promise<string> {
  await fs.promises.mkdir(DOCS_DIR, { recursive: true });
  const filename = path.basename(sourcePath);
  const dest = path.join(DOCS_DIR, filename);
  await fs.promises.copyFile(sourcePath, dest);
  return filename; // relative path stored in FamilyDocument.filePath
}
```

- [ ] **Step 4: Commit**

```bash
git add src/utils/exiftool.ts src/utils/people.ts src/utils/documents.ts
git commit -m "feat: add exiftool, people, and documents utilities"
```

---

## Task 4: Wire AppContext into App + startup load

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Update App.test.tsx**

```tsx
// src/App.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// window.require is not available in jsdom — mock it
(window as any).require = () => ({
  promises: { readdir: jest.fn().mockResolvedValue([]) },
  readFile: jest.fn(),
  writeFile: jest.fn(),
});

test('renders Family Browser navbar brand', () => {
  render(<App />);
  expect(screen.getByText(/Family Browser/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
yarn test --watchAll=false --testPathPattern="App.test"
```

Expected: FAIL — current test checks for "learn react link" which no longer exists.

- [ ] **Step 3: Update App.tsx**

```tsx
// src/App.tsx
import React, { useEffect } from 'react';
import { Container, Nav } from 'react-bootstrap';
import Navbar from 'react-bootstrap/Navbar';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { LinkContainer } from 'react-router-bootstrap';
import { AppProvider, useAppContext } from './context/AppContext';
import Photos from './Photos';
import Documents from './Documents';
import People from './People';
import { readMetadata } from './utils/exiftool';
import { readPeopleJson } from './utils/people';
import { readDocumentsJson } from './utils/documents';

const path = (window as any).require('path') as typeof import('path');
const DIR_PATH = path.join(process.cwd(), 'public', 'images');

function AppShell() {
  const { dispatch } = useAppContext();

  useEffect(() => {
    async function load() {
      const people = await readPeopleJson();
      dispatch({ type: 'SET_PEOPLE', people });
      const photos = await readMetadata(DIR_PATH, people);
      dispatch({ type: 'SET_PHOTOS', photos });
      const documents = await readDocumentsJson();
      dispatch({ type: 'SET_DOCUMENTS', documents });
    }
    load();
  }, [dispatch]);

  return (
    <div style={{ boxSizing: 'border-box', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar expand="lg" className="bg-body-tertiary">
        <Container>
          <Navbar.Brand href="/">Family Browser</Navbar.Brand>
          <Navbar.Toggle aria-controls="main-nav" />
          <Navbar.Collapse id="main-nav">
            <Nav className="me-auto">
              <LinkContainer to="/"><Nav.Link>Home</Nav.Link></LinkContainer>
              <LinkContainer to="/photos"><Nav.Link>Photos</Nav.Link></LinkContainer>
              <LinkContainer to="/documents"><Nav.Link>Documents</Nav.Link></LinkContainer>
              <LinkContainer to="/people"><Nav.Link>People</Nav.Link></LinkContainer>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Routes>
        <Route path="/" element={<h1 style={{ padding: 24 }}>Home</h1>} />
        <Route path="/photos" element={<Photos />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/people/*" element={<People />} />
        <Route path="/tree" element={<h1 style={{ padding: 24 }}>Tree</h1>} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppShell />
      </HashRouter>
    </AppProvider>
  );
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
yarn test --watchAll=false --testPathPattern="App.test"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: wire AppContext into App with startup data loading"
```

---

## Task 5: PhotosRoute — split-panel shell + Filmstrip

**Files:**
- Replace: `src/Photos/index.tsx`
- Create: `src/Photos/Filmstrip.tsx`

- [ ] **Step 1: Create Filmstrip**

```tsx
// src/Photos/Filmstrip.tsx
import React from 'react';
import { Photo } from '../context/types';

interface Props {
  photos: Photo[];
  activePhoto: Photo | null;
  onSelect: (photo: Photo) => void;
}

export default function Filmstrip({ photos, activePhoto, onSelect }: Props) {
  return (
    <div style={{
      display: 'flex', gap: 4, padding: '4px 8px', background: '#0a0a0a',
      overflowX: 'auto', flexShrink: 0, borderTop: '1px solid #222',
    }}>
      {photos.map(photo => (
        <img
          key={photo.file}
          src={photo.path}
          alt={photo.file}
          onClick={() => onSelect(photo)}
          style={{
            width: 56, height: 44, objectFit: 'cover', flexShrink: 0,
            borderRadius: 2, cursor: 'pointer',
            border: photo.file === activePhoto?.file ? '2px solid #4a90d9' : '2px solid transparent',
          }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Replace Photos/index.tsx with PhotosRoute**

```tsx
// src/Photos/index.tsx
import React, { useCallback, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import PhotoViewer from './PhotoViewer';
import MetadataPanel from './MetadataPanel';
import Filmstrip from './Filmstrip';
import { Photo } from '../context/types';

export default function PhotosRoute() {
  const { state, dispatch } = useAppContext();
  const { photos, activePhoto } = state;

  const selectPhoto = useCallback((photo: Photo) => {
    dispatch({ type: 'SET_ACTIVE_PHOTO', photo });
  }, [dispatch]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!activePhoto || photos.length === 0) return;
      const idx = photos.findIndex(p => p.file === activePhoto.file);
      if (e.key === 'ArrowRight' && idx < photos.length - 1) selectPhoto(photos[idx + 1]);
      if (e.key === 'ArrowLeft' && idx > 0) selectPhoto(photos[idx - 1]);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [photos, activePhoto, selectPhoto]);

  if (photos.length === 0) {
    return <div style={{ padding: 24, color: '#888' }}>No photos found in public/images/</div>;
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>
      {/* Left pane */}
      <div style={{ flex: 1.6, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0d0d0d' }}>
        <PhotoViewer />
        <Filmstrip photos={photos} activePhoto={activePhoto} onSelect={selectPhoto} />
      </div>
      {/* Right pane */}
      <div style={{ width: 260, flexShrink: 0, borderLeft: '1px solid #2a2a3a', overflow: 'auto', background: '#161622' }}>
        <MetadataPanel />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Photos/index.tsx src/Photos/Filmstrip.tsx
git commit -m "feat: add PhotosRoute split-panel shell and Filmstrip"
```

---

## Task 6: PhotoViewer + FaceOverlay

**Files:**
- Create: `src/Photos/PhotoViewer.tsx`
- Create: `src/Photos/FaceOverlay.tsx`

- [ ] **Step 1: Create FaceOverlay**

```tsx
// src/Photos/FaceOverlay.tsx
import React from 'react';
import { FaceRegion } from '../context/types';

interface Props {
  faces: FaceRegion[];
  dimmed: boolean; // true when tagging mode active
}

export default function FaceOverlay({ faces, dimmed }: Props) {
  return (
    <>
      {faces.map((face, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${face.x * 100}%`,
            top: `${face.y * 100}%`,
            width: `${face.w * 100}%`,
            height: `${face.h * 100}%`,
            border: '2px solid #f0b060',
            borderRadius: 2,
            opacity: dimmed ? 0.5 : 1,
            pointerEvents: 'none',
          }}
        >
          <span style={{
            position: 'absolute', bottom: '100%', left: 0,
            background: '#f0b060', color: '#000',
            fontSize: 10, fontWeight: 'bold', padding: '1px 4px',
            borderRadius: '2px 2px 0 0', whiteSpace: 'nowrap',
          }}>
            {face.name}
          </span>
        </div>
      ))}
    </>
  );
}
```

- [ ] **Step 2: Create PhotoViewer**

```tsx
// src/Photos/PhotoViewer.tsx
import React, { useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import FaceOverlay from './FaceOverlay';
import FaceTagger from './FaceTagger';

export default function PhotoViewer() {
  const { state } = useAppContext();
  const { activePhoto, isTaggingMode } = state;
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgDims, setImgDims] = useState<{ width: number; height: number } | null>(null);

  if (!activePhoto) return null;

  const handleFullscreen = () => {
    containerRef.current?.requestFullscreen();
  };

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
    >
      <img
        src={activePhoto.path}
        alt={activePhoto.file}
        onLoad={e => {
          const el = e.currentTarget;
          setImgDims({ width: el.naturalWidth, height: el.naturalHeight });
        }}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
      />

      {/* Overlay container — sized to match the rendered image */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: isTaggingMode ? 'auto' : 'none' }}>
        <FaceOverlay faces={activePhoto.faces} dimmed={isTaggingMode} />
        {isTaggingMode && imgDims && (
          <FaceTagger filePath={activePhoto.path} fileName={activePhoto.file} />
        )}
      </div>

      {isTaggingMode && (
        <div style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(240,176,96,.15)', border: '1px solid rgba(240,176,96,.4)',
          borderRadius: 4, padding: '3px 12px', color: '#f0b060', fontSize: 11, pointerEvents: 'none',
        }}>
          Tagging mode — drag to mark a face · Press Esc to exit
        </div>
      )}

      <button
        onClick={handleFullscreen}
        style={{
          position: 'absolute', top: 8, right: 8,
          background: 'rgba(0,0,0,.6)', border: '1px solid #444',
          borderRadius: 3, padding: '3px 8px', color: '#aaa', fontSize: 11, cursor: 'pointer',
        }}
      >
        ⛶ Full screen
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Photos/PhotoViewer.tsx src/Photos/FaceOverlay.tsx
git commit -m "feat: add PhotoViewer and FaceOverlay"
```

---

## Task 7: MetadataPanel + MetadataFields + PeopleList

**Files:**
- Create: `src/Photos/MetadataPanel.tsx`
- Create: `src/Photos/MetadataFields.tsx`
- Create: `src/Photos/PeopleList.tsx`

- [ ] **Step 1: Create PeopleList**

```tsx
// src/Photos/PeopleList.tsx
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { writeFaceRegions } from '../utils/exiftool';

export default function PeopleList() {
  const { state, dispatch } = useAppContext();
  const { activePhoto } = state;
  if (!activePhoto) return null;

  const removeFace = async (name: string) => {
    const remaining = activePhoto.faces.filter(f => f.name !== name);
    try {
      await writeFaceRegions(activePhoto.path, remaining);
      dispatch({ type: 'REMOVE_FACE_REGION', file: activePhoto.file, regionName: name });
    } catch (err) {
      alert(`Failed to remove face tag: ${(err as Error).message}`);
    }
  };

  return (
    <div>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: '#555', marginBottom: 4 }}>
        People
      </div>
      {activePhoto.faces.length === 0 && (
        <div style={{ fontSize: 12, color: '#666' }}>No people tagged</div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {activePhoto.faces.map(face => (
          <span
            key={face.name}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: '#1e2a3a', border: '1px solid #2a3a4a',
              borderRadius: 12, padding: '2px 8px', fontSize: 11, color: '#9bb8f5',
            }}
          >
            👤 {face.name}
            <button
              onClick={() => removeFace(face.name)}
              style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 0, lineHeight: 1 }}
              title="Remove face tag"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create MetadataFields**

```tsx
// src/Photos/MetadataFields.tsx
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { writeMeta } from '../utils/exiftool';
import { Photo } from '../context/types';

type Draft = Pick<Photo, 'date' | 'caption'> & { locationStr: string };

function photoDraft(p: Photo): Draft {
  return {
    date: p.date ?? '',
    caption: p.caption ?? '',
    locationStr: p.location ? `${p.location.lat}, ${p.location.lng}` : '',
  };
}

function parseLocation(str: string): { lat: number; lng: number } | null {
  const parts = str.split(',').map(s => s.trim());
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

export default function MetadataFields({ readOnly }: { readOnly: boolean }) {
  const { state, dispatch } = useAppContext();
  const { activePhoto } = state;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(activePhoto ? photoDraft(activePhoto) : null);
    setError(null);
  }, [activePhoto?.file]);

  if (!activePhoto || !draft) return null;

  const isDirty =
    draft.date !== (activePhoto.date ?? '') ||
    draft.caption !== (activePhoto.caption ?? '') ||
    draft.locationStr !== (activePhoto.location ? `${activePhoto.location.lat}, ${activePhoto.location.lng}` : '');

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const location = draft.locationStr ? parseLocation(draft.locationStr) : null;
      await writeMeta(activePhoto.path, {
        date: draft.date || undefined,
        caption: draft.caption ?? undefined,
        location: location ?? undefined,
      });
      dispatch({
        type: 'UPDATE_PHOTO_META',
        file: activePhoto.file,
        meta: { date: draft.date || null, caption: draft.caption || null, location },
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => setDraft(photoDraft(activePhoto));

  const fieldStyle: React.CSSProperties = {
    width: '100%', background: '#1e1e30', border: '1px solid #2a2a40',
    borderRadius: 3, padding: '3px 6px', color: readOnly ? '#666' : '#ddd', fontSize: 12,
    boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: '#555', marginBottom: 3 }}>Date taken</div>
        <input style={fieldStyle} value={draft.date ?? ''} readOnly={readOnly}
          onChange={e => setDraft(d => d && ({ ...d, date: e.target.value }))} />
      </div>
      <div>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: '#555', marginBottom: 3 }}>Location (lat, lng)</div>
        <input style={fieldStyle} value={draft.locationStr} readOnly={readOnly}
          onChange={e => setDraft(d => d && ({ ...d, locationStr: e.target.value }))} />
      </div>
      <div>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: '#555', marginBottom: 3 }}>Camera</div>
        <input style={{ ...fieldStyle, color: '#555' }} value={activePhoto.camera ?? ''} readOnly />
      </div>
      <div>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: '#555', marginBottom: 3 }}>Caption</div>
        <textarea style={{ ...fieldStyle, minHeight: 56, resize: 'vertical', fontFamily: 'inherit' }}
          value={draft.caption ?? ''} readOnly={readOnly}
          onChange={e => setDraft(d => d && ({ ...d, caption: e.target.value }))} />
      </div>
      {error && <div style={{ color: '#e88', fontSize: 11 }}>{error}</div>}
      {isDirty && !readOnly && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={save} disabled={saving}
            style={{ background: '#2d5a2d', border: '1px solid #3a7a3a', borderRadius: 3, padding: '4px 12px', color: '#7ecfa0', fontSize: 11, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={cancel}
            style={{ background: '#2a2a3a', border: '1px solid #3a3a4a', borderRadius: 3, padding: '4px 12px', color: '#888', fontSize: 11, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create MetadataPanel**

```tsx
// src/Photos/MetadataPanel.tsx
import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import MetadataFields from './MetadataFields';
import PeopleList from './PeopleList';

export default function MetadataPanel() {
  const { state, dispatch } = useAppContext();
  const { activePhoto, isTaggingMode } = state;

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && isTaggingMode) dispatch({ type: 'SET_TAGGING_MODE', enabled: false });
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isTaggingMode, dispatch]);

  if (!activePhoto) return <div style={{ padding: 16, color: '#666', fontSize: 13 }}>No photo selected</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid #252535' }}>
        <div style={{ color: '#ddd', fontSize: 12, fontWeight: 'bold' }}>{activePhoto.file}</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <MetadataFields readOnly={isTaggingMode} />
        <PeopleList />
      </div>

      <div style={{ padding: '8px 12px', borderTop: '1px solid #252535' }}>
        <button
          onClick={() => dispatch({ type: 'SET_TAGGING_MODE', enabled: !isTaggingMode })}
          style={{
            width: '100%', background: isTaggingMode ? '#1e3a6a' : '#2d3a5a',
            border: `1px solid ${isTaggingMode ? '#4a70c0' : '#3a4a7a'}`,
            borderRadius: 4, padding: '6px 0', color: isTaggingMode ? '#6aaff5' : '#9bb8f5',
            fontSize: 12, cursor: 'pointer',
          }}
        >
          {isTaggingMode ? '✕ Exit tagging mode' : '＋ Tag faces'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/Photos/MetadataPanel.tsx src/Photos/MetadataFields.tsx src/Photos/PeopleList.tsx
git commit -m "feat: add MetadataPanel, MetadataFields, and PeopleList"
```

---

## Task 8: FaceTagger

**Files:**
- Create: `src/Photos/FaceTagger.tsx`

- [ ] **Step 1: Create FaceTagger**

```tsx
// src/Photos/FaceTagger.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { writeFaceRegions } from '../utils/exiftool';
import { FaceRegion } from '../context/types';

interface Props {
  filePath: string;
  fileName: string;
}

interface Box { x: number; y: number; w: number; h: number }

export default function FaceTagger({ filePath, fileName }: Props) {
  const { state, dispatch } = useAppContext();
  const { people, activePhoto } = state;
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [startPct, setStartPct] = useState<{ x: number; y: number } | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [nameQuery, setNameQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBox(null);
    setNameQuery('');
  }, [fileName]);

  function pctFromEvent(e: React.MouseEvent): { x: number; y: number } {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  const onMouseDown = (e: React.MouseEvent) => {
    const pct = pctFromEvent(e);
    setStartPct(pct);
    setDragging(true);
    setBox(null);
    setNameQuery('');
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !startPct) return;
    const cur = pctFromEvent(e);
    setBox({
      x: Math.min(startPct.x, cur.x),
      y: Math.min(startPct.y, cur.y),
      w: Math.abs(cur.x - startPct.x),
      h: Math.abs(cur.y - startPct.y),
    });
  };

  const onMouseUp = () => { setDragging(false); };

  const filteredPeople = people.filter(p =>
    p.name.toLowerCase().includes(nameQuery.toLowerCase())
  );

  const confirmTag = async (name: string) => {
    if (!box || !activePhoto) return;
    setSaving(true);
    const region: FaceRegion = {
      personId: people.find(p => p.name === name)?.id ?? null,
      name,
      x: box.x, y: box.y, w: box.w, h: box.h,
    };
    try {
      const updatedFaces = [...activePhoto.faces, region];
      await writeFaceRegions(filePath, updatedFaces);
      dispatch({ type: 'ADD_FACE_REGION', file: fileName, region });
      dispatch({ type: 'SET_TAGGING_MODE', enabled: false });
    } catch (err) {
      alert(`Failed to save face tag: ${(err as Error).message}`);
    } finally {
      setSaving(false);
      setBox(null);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{ position: 'absolute', inset: 0, cursor: 'crosshair' }}
    >
      {box && (
        <div style={{
          position: 'absolute',
          left: `${box.x * 100}%`, top: `${box.y * 100}%`,
          width: `${box.w * 100}%`, height: `${box.h * 100}%`,
          border: '2px dashed #fff', background: 'rgba(255,255,255,.05)',
          pointerEvents: 'none',
        }} />
      )}
      {box && !dragging && (
        <div style={{
          position: 'absolute',
          left: `${box.x * 100}%`,
          top: `${Math.max(0, box.y * 100 - 8)}%`,
          transform: 'translateY(-100%)',
          background: '#1e2535', border: '1px solid #4a70c0',
          borderRadius: 4, padding: 8, minWidth: 140, zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,.5)',
        }}>
          <input
            autoFocus
            value={nameQuery}
            onChange={e => setNameQuery(e.target.value)}
            placeholder="Search people…"
            style={{
              width: '100%', boxSizing: 'border-box', background: '#0d1520',
              border: '1px solid #2a3a5a', borderRadius: 3, padding: '3px 6px',
              color: '#ddd', fontSize: 11, marginBottom: 4,
            }}
          />
          {filteredPeople.map(p => (
            <div
              key={p.id}
              onClick={() => !saving && confirmTag(p.name)}
              style={{
                padding: '3px 6px', fontSize: 11, color: '#bbb',
                borderRadius: 2, cursor: saving ? 'wait' : 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2a3a5a')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              {p.name}
            </div>
          ))}
          {filteredPeople.length === 0 && (
            <div style={{ fontSize: 11, color: '#666', padding: '3px 6px' }}>No people found</div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Photos/FaceTagger.tsx
git commit -m "feat: add FaceTagger with drag-to-draw and name picker"
```

---

## Task 9: PeopleRoute + PeopleManager

**Files:**
- Create: `src/People/index.tsx`
- Create: `src/People/PeopleManager.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/People/PeopleManager.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import PeopleManager from './PeopleManager';

(window as any).require = () => ({
  promises: { writeFile: jest.fn().mockResolvedValue(undefined), readFile: jest.fn().mockRejectedValue(new Error()) },
});

function renderWithContext(ui: React.ReactElement) {
  return render(<AppProvider>{ui}</AppProvider>);
}

test('renders empty state message', () => {
  renderWithContext(<PeopleManager />);
  expect(screen.getByText(/No people/i)).toBeInTheDocument();
});

test('add person button shows input', () => {
  renderWithContext(<PeopleManager />);
  fireEvent.click(screen.getByText(/Add person/i));
  expect(screen.getByPlaceholderText(/Name/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
yarn test --watchAll=false --testPathPattern="PeopleManager.test"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create PeopleManager**

```tsx
// src/People/PeopleManager.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { writePeopleJson } from '../utils/people';
import { Person } from '../context/types';

function generateId() { return Math.random().toString(36).slice(2, 10); }

export default function PeopleManager() {
  const { state, dispatch } = useAppContext();
  const { people, photos, documents } = state;
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const photoCount = (id: string) => photos.filter(p => p.faces.some(f => f.personId === id)).length;
  const docCount = (id: string) => documents.filter(d => d.personIds.includes(id)).length;

  const addPerson = async () => {
    if (!newName.trim()) return;
    const person: Person = { id: generateId(), name: newName.trim() };
    const updated = [...people, person];
    dispatch({ type: 'ADD_PERSON', person });
    await writePeopleJson(updated);
    setNewName('');
    setAdding(false);
  };

  const startRename = (p: Person) => { setEditingId(p.id); setEditName(p.name); };

  const saveName = async (person: Person) => {
    if (!editName.trim()) return;
    const updated = people.map(p => p.id === person.id ? { ...p, name: editName.trim() } : p);
    dispatch({ type: 'UPDATE_PERSON', person: { ...person, name: editName.trim() } });
    await writePeopleJson(updated);
    setEditingId(null);
  };

  const deletePerson = async (person: Person) => {
    const pc = photoCount(person.id);
    const dc = docCount(person.id);
    const msg = pc + dc > 0
      ? `${person.name} appears in ${pc} photo(s) and ${dc} document(s). Delete anyway?`
      : `Delete ${person.name}?`;
    if (!window.confirm(msg)) return;
    const updated = people.filter(p => p.id !== person.id);
    dispatch({ type: 'REMOVE_PERSON', id: person.id });
    await writePeopleJson(updated);
  };

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: '#ddd' }}>People</h2>
        <button onClick={() => setAdding(true)}
          style={{ background: '#2d3a5a', border: '1px solid #3a4a7a', borderRadius: 4, padding: '5px 14px', color: '#9bb8f5', cursor: 'pointer', fontSize: 13 }}>
          Add person
        </button>
      </div>

      {adding && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addPerson(); if (e.key === 'Escape') setAdding(false); }}
            placeholder="Name" style={{ flex: 1, background: '#1e1e30', border: '1px solid #3a3a5a', borderRadius: 3, padding: '4px 8px', color: '#ddd', fontSize: 13 }} />
          <button onClick={addPerson} style={{ background: '#2d5a2d', border: '1px solid #3a7a3a', borderRadius: 3, padding: '4px 12px', color: '#7ecfa0', fontSize: 13, cursor: 'pointer' }}>Add</button>
          <button onClick={() => setAdding(false)} style={{ background: '#2a2a3a', border: '1px solid #3a3a4a', borderRadius: 3, padding: '4px 12px', color: '#888', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
        </div>
      )}

      {people.length === 0 && !adding && (
        <div style={{ color: '#666', fontSize: 14 }}>No people in roster yet. Add one to get started.</div>
      )}

      {people.map(person => (
        <div key={person.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #222' }}>
          {editingId === person.id ? (
            <>
              <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(person); if (e.key === 'Escape') setEditingId(null); }}
                style={{ flex: 1, background: '#1e1e30', border: '1px solid #3a3a5a', borderRadius: 3, padding: '3px 6px', color: '#ddd', fontSize: 13 }} />
              <button onClick={() => saveName(person)} style={{ background: '#2d5a2d', border: '1px solid #3a7a3a', borderRadius: 3, padding: '2px 8px', color: '#7ecfa0', fontSize: 12, cursor: 'pointer' }}>Save</button>
              <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
            </>
          ) : (
            <>
              <span onClick={() => navigate(`/people/${person.id}`)}
                style={{ flex: 1, color: '#9bb8f5', cursor: 'pointer', fontSize: 14 }}>
                {person.name}
              </span>
              <span style={{ color: '#555', fontSize: 11 }}>{photoCount(person.id)} photos · {docCount(person.id)} docs</span>
              <button onClick={() => startRename(person)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 12 }}>Rename</button>
              <button onClick={() => deletePerson(person)} style={{ background: 'none', border: 'none', color: '#e55', cursor: 'pointer', fontSize: 12 }}>Delete</button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create People/index.tsx**

```tsx
// src/People/index.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PeopleManager from './PeopleManager';
import PersonDetail from './PersonDetail';

export default function PeopleRoute() {
  return (
    <Routes>
      <Route index element={<PeopleManager />} />
      <Route path=":id" element={<PersonDetail />} />
    </Routes>
  );
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
yarn test --watchAll=false --testPathPattern="PeopleManager.test"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/People/index.tsx src/People/PeopleManager.tsx src/People/PeopleManager.test.tsx
git commit -m "feat: add PeopleRoute and PeopleManager with add/rename/delete"
```

---

## Task 10: PersonDetail + PersonPhotoGrid + PersonDocList

**Files:**
- Create: `src/People/PersonDetail.tsx`
- Create: `src/People/PersonPhotoGrid.tsx`
- Create: `src/People/PersonDocList.tsx`

- [ ] **Step 1: Create PersonPhotoGrid**

```tsx
// src/People/PersonPhotoGrid.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Photo } from '../context/types';
import { useAppContext } from '../context/AppContext';

interface Props { personId: string }

export default function PersonPhotoGrid({ personId }: Props) {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const photos = state.photos.filter(p => p.faces.some(f => f.personId === personId));

  if (photos.length === 0) return <div style={{ color: '#666', fontSize: 13 }}>No photos tagged.</div>;

  const openPhoto = (photo: Photo) => {
    dispatch({ type: 'SET_ACTIVE_PHOTO', photo });
    navigate('/photos');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6 }}>
      {photos.map(photo => (
        <img
          key={photo.file}
          src={photo.path}
          alt={photo.file}
          onClick={() => openPhoto(photo)}
          style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 4, cursor: 'pointer', border: '1px solid #2a2a3a' }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create PersonDocList**

```tsx
// src/People/PersonDocList.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FamilyDocument } from '../context/types';
import { useAppContext } from '../context/AppContext';

interface Props { personId: string }

function docIcon(doc: FamilyDocument) {
  if (doc.type === 'note') return '📝';
  const ext = doc.filePath?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return '📄';
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext ?? '')) return '🖼️';
  return '📎';
}

export default function PersonDocList({ personId }: Props) {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const docs = state.documents.filter(d => d.personIds.includes(personId));

  if (docs.length === 0) return <div style={{ color: '#666', fontSize: 13 }}>No documents linked.</div>;

  const openDoc = (doc: FamilyDocument) => {
    dispatch({ type: 'SET_ACTIVE_DOCUMENT', document: doc });
    navigate('/documents');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {docs.map(doc => (
        <div key={doc.id} onClick={() => openDoc(doc)}
          style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 10px', background: '#1a1a2a', borderRadius: 4, cursor: 'pointer', border: '1px solid #2a2a3a' }}>
          <span style={{ fontSize: 18 }}>{docIcon(doc)}</span>
          <div>
            <div style={{ color: '#ddd', fontSize: 13 }}>{doc.title}</div>
            {doc.date && <div style={{ color: '#666', fontSize: 11 }}>{doc.date}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create PersonDetail**

```tsx
// src/People/PersonDetail.tsx
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import PersonPhotoGrid from './PersonPhotoGrid';
import PersonDocList from './PersonDocList';

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>();
  const { state } = useAppContext();
  const navigate = useNavigate();
  const person = state.people.find(p => p.id === id);

  if (!person) return <div style={{ padding: 24, color: '#888' }}>Person not found.</div>;

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <button onClick={() => navigate('/people')}
        style={{ background: 'none', border: 'none', color: '#9bb8f5', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}>
        ← People
      </button>
      <h2 style={{ color: '#ddd', marginTop: 0, marginBottom: 24 }}>{person.name}</h2>

      <h3 style={{ color: '#aaa', fontSize: 13, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Photos</h3>
      <PersonPhotoGrid personId={person.id} />

      <h3 style={{ color: '#aaa', fontSize: 13, textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 24, marginBottom: 10 }}>Documents</h3>
      <PersonDocList personId={person.id} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/People/PersonDetail.tsx src/People/PersonPhotoGrid.tsx src/People/PersonDocList.tsx
git commit -m "feat: add PersonDetail with photo grid and document list"
```

---

## Task 11: DocumentsRoute + DocumentList

**Files:**
- Create: `src/Documents/index.tsx`
- Create: `src/Documents/DocumentList.tsx`

- [ ] **Step 1: Create DocumentList**

```tsx
// src/Documents/DocumentList.tsx
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { FamilyDocument } from '../context/types';
import { writeDocumentsJson, copyToDocumentsDir } from '../utils/documents';

const { ipcRenderer } = (window as any).require('electron');

function docIcon(doc: FamilyDocument) {
  if (doc.type === 'note') return '📝';
  const ext = doc.filePath?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return '📄';
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext ?? '')) return '🖼️';
  return '📎';
}

function generateId() { return Math.random().toString(36).slice(2, 10); }

export default function DocumentList() {
  const { state, dispatch } = useAppContext();
  const { documents, activeDocument, people } = state;

  const addFile = async () => {
    const result = await ipcRenderer.invoke('show-open-dialog', {
      properties: ['openFile'],
      filters: [{ name: 'All Files', extensions: ['*'] }],
    });
    if (result.canceled || !result.filePaths[0]) return;
    const sourcePath = result.filePaths[0];
    const filePath = await copyToDocumentsDir(sourcePath);
    const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
    const doc: FamilyDocument = {
      id: generateId(), title: filePath, date: null, description: '',
      personIds: [], type: 'file', filePath,
    };
    const updated = [...documents, doc];
    dispatch({ type: 'ADD_DOCUMENT', document: doc });
    dispatch({ type: 'SET_ACTIVE_DOCUMENT', document: doc });
    await writeDocumentsJson(updated);
  };

  const addNote = async () => {
    const doc: FamilyDocument = {
      id: generateId(), title: 'New note', date: null, description: '',
      personIds: [], type: 'note', content: '',
    };
    const updated = [...documents, doc];
    dispatch({ type: 'ADD_DOCUMENT', document: doc });
    dispatch({ type: 'SET_ACTIVE_DOCUMENT', document: doc });
    await writeDocumentsJson(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#111' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #222', display: 'flex', gap: 6 }}>
        <button onClick={addFile}
          style={{ flex: 1, background: '#2d3a5a', border: '1px solid #3a4a7a', borderRadius: 4, padding: '5px 0', color: '#9bb8f5', cursor: 'pointer', fontSize: 12 }}>
          + Add file
        </button>
        <button onClick={addNote}
          style={{ flex: 1, background: '#2a2a3a', border: '1px solid #3a3a5a', borderRadius: 4, padding: '5px 0', color: '#aaa', cursor: 'pointer', fontSize: 12 }}>
          + New note
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {documents.length === 0 && (
          <div style={{ padding: 16, color: '#666', fontSize: 13 }}>No documents yet.</div>
        )}
        {documents.map(doc => {
          const firstPerson = doc.personIds[0] ? people.find(p => p.id === doc.personIds[0])?.name : null;
          return (
            <div
              key={doc.id}
              onClick={() => dispatch({ type: 'SET_ACTIVE_DOCUMENT', document: doc })}
              style={{
                padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #1a1a1a',
                background: activeDocument?.id === doc.id ? '#1e2535' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{docIcon(doc)}</span>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ color: '#ddd', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</div>
                  <div style={{ color: '#555', fontSize: 11 }}>
                    {doc.date && <span>{doc.date} · </span>}
                    {firstPerson && <span>👤 {firstPerson}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Documents/index.tsx**

```tsx
// src/Documents/index.tsx
import React from 'react';
import DocumentList from './DocumentList';
import DocumentPanel from './DocumentPanel';

export default function DocumentsRoute() {
  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>
      <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid #2a2a3a', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <DocumentList />
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: '#161622' }}>
        <DocumentPanel />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Documents/index.tsx src/Documents/DocumentList.tsx
git commit -m "feat: add DocumentsRoute and DocumentList"
```

---

## Task 12: DocumentPanel + DocumentViewer + DocumentFields + DocumentPeople

**Files:**
- Create: `src/Documents/DocumentPanel.tsx`
- Create: `src/Documents/DocumentViewer.tsx`
- Create: `src/Documents/DocumentFields.tsx`
- Create: `src/Documents/DocumentPeople.tsx`

- [ ] **Step 1: Create DocumentViewer**

```tsx
// src/Documents/DocumentViewer.tsx
import React from 'react';
import { FamilyDocument } from '../context/types';

const path = (window as any).require('path') as typeof import('path');
const { shell } = (window as any).require('electron');

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
const PDF_EXT = 'pdf';

function getExt(filePath: string) {
  return filePath.split('.').pop()?.toLowerCase() ?? '';
}

interface Props { doc: FamilyDocument }

export default function DocumentViewer({ doc }: Props) {
  if (doc.type === 'note') {
    return (
      <div style={{ padding: 16, color: '#bbb', fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
        {doc.content || <span style={{ color: '#555' }}>No content.</span>}
      </div>
    );
  }

  if (!doc.filePath) return <div style={{ padding: 16, color: '#666' }}>No file attached.</div>;

  const docsDir = (window as any).require('path').join(process.cwd(), 'public', 'documents');
  const fullPath = path.join(docsDir, doc.filePath);
  const ext = getExt(doc.filePath);

  if (IMAGE_EXTS.includes(ext)) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <img src={fullPath} alt={doc.title} style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain', borderRadius: 4 }} />
      </div>
    );
  }

  if (ext === PDF_EXT) {
    return (
      <embed src={fullPath} type="application/pdf" style={{ width: '100%', height: 500, border: 'none' }} />
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>{doc.filePath}</div>
      <button
        onClick={() => shell.openPath(fullPath)}
        style={{ background: '#2d3a5a', border: '1px solid #3a4a7a', borderRadius: 4, padding: '6px 16px', color: '#9bb8f5', cursor: 'pointer', fontSize: 13 }}
      >
        Open in default app
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create DocumentFields**

```tsx
// src/Documents/DocumentFields.tsx
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { writeDocumentsJson } from '../utils/documents';
import { FamilyDocument } from '../context/types';

type Draft = Pick<FamilyDocument, 'title' | 'date' | 'description' | 'content'>;

export default function DocumentFields() {
  const { state, dispatch } = useAppContext();
  const { activeDocument, documents } = state;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeDocument) { setDraft(null); return; }
    setDraft({ title: activeDocument.title, date: activeDocument.date ?? '', description: activeDocument.description, content: activeDocument.content ?? '' });
  }, [activeDocument?.id]);

  if (!activeDocument || !draft) return null;

  const isDirty = draft.title !== activeDocument.title ||
    draft.date !== (activeDocument.date ?? '') ||
    draft.description !== activeDocument.description ||
    draft.content !== (activeDocument.content ?? '');

  const save = async () => {
    setSaving(true);
    const updated: FamilyDocument = {
      ...activeDocument,
      title: draft.title,
      date: draft.date || null,
      description: draft.description,
      content: draft.content,
    };
    const all = documents.map(d => d.id === updated.id ? updated : d);
    dispatch({ type: 'UPDATE_DOCUMENT', document: updated });
    await writeDocumentsJson(all);
    setSaving(false);
  };

  const cancel = () => setDraft({
    title: activeDocument.title, date: activeDocument.date ?? '',
    description: activeDocument.description, content: activeDocument.content ?? '',
  });

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#1e1e30', border: '1px solid #2a2a40',
    borderRadius: 3, padding: '4px 8px', color: '#ddd', fontSize: 13,
    boxSizing: 'border-box', marginBottom: 10,
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#555', marginBottom: 3 }}>Title</div>
      <input style={inputStyle} value={draft.title} onChange={e => setDraft(d => d && ({ ...d, title: e.target.value }))} />

      <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#555', marginBottom: 3 }}>Date</div>
      <input style={inputStyle} value={draft.date ?? ''} onChange={e => setDraft(d => d && ({ ...d, date: e.target.value }))} />

      <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#555', marginBottom: 3 }}>Description</div>
      <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
        value={draft.description} onChange={e => setDraft(d => d && ({ ...d, description: e.target.value }))} />

      {activeDocument.type === 'note' && (
        <>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#555', marginBottom: 3 }}>Content</div>
          <textarea style={{ ...inputStyle, minHeight: 120, resize: 'vertical', fontFamily: 'inherit' }}
            value={draft.content ?? ''} onChange={e => setDraft(d => d && ({ ...d, content: e.target.value }))} />
        </>
      )}

      {isDirty && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={save} disabled={saving}
            style={{ background: '#2d5a2d', border: '1px solid #3a7a3a', borderRadius: 3, padding: '4px 12px', color: '#7ecfa0', fontSize: 12, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={cancel}
            style={{ background: '#2a2a3a', border: '1px solid #3a3a4a', borderRadius: 3, padding: '4px 12px', color: '#888', fontSize: 12, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create DocumentPeople**

```tsx
// src/Documents/DocumentPeople.tsx
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { writeDocumentsJson } from '../utils/documents';

export default function DocumentPeople() {
  const { state, dispatch } = useAppContext();
  const { activeDocument, documents, people } = state;
  const [query, setQuery] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  if (!activeDocument) return null;

  const linkedPeople = people.filter(p => activeDocument.personIds.includes(p.id));
  const available = people.filter(p => !activeDocument.personIds.includes(p.id) && p.name.toLowerCase().includes(query.toLowerCase()));

  const link = async (personId: string) => {
    const updated = { ...activeDocument, personIds: [...activeDocument.personIds, personId] };
    const all = documents.map(d => d.id === updated.id ? updated : d);
    dispatch({ type: 'UPDATE_DOCUMENT', document: updated });
    await writeDocumentsJson(all);
    setShowPicker(false);
    setQuery('');
  };

  const unlink = async (personId: string) => {
    const updated = { ...activeDocument, personIds: activeDocument.personIds.filter(id => id !== personId) };
    const all = documents.map(d => d.id === updated.id ? updated : d);
    dispatch({ type: 'UPDATE_DOCUMENT', document: updated });
    await writeDocumentsJson(all);
  };

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#555', marginBottom: 6 }}>People</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {linkedPeople.map(p => (
          <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#1e2a3a', border: '1px solid #2a3a4a', borderRadius: 12, padding: '2px 8px', fontSize: 11, color: '#9bb8f5' }}>
            👤 {p.name}
            <button onClick={() => unlink(p.id)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
          </span>
        ))}
        <button onClick={() => setShowPicker(s => !s)}
          style={{ background: '#1e2535', border: '1px dashed #3a4a5a', borderRadius: 12, padding: '2px 10px', fontSize: 11, color: '#667', cursor: 'pointer' }}>
          + Link person
        </button>
      </div>

      {showPicker && (
        <div style={{ background: '#1e2535', border: '1px solid #2a3a5a', borderRadius: 4, padding: 8, maxWidth: 200 }}>
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search…"
            style={{ width: '100%', boxSizing: 'border-box', background: '#0d1520', border: '1px solid #2a3a5a', borderRadius: 3, padding: '3px 6px', color: '#ddd', fontSize: 11, marginBottom: 4 }} />
          {available.map(p => (
            <div key={p.id} onClick={() => link(p.id)}
              style={{ padding: '3px 6px', fontSize: 11, color: '#bbb', borderRadius: 2, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2a3a5a')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}>
              {p.name}
            </div>
          ))}
          {available.length === 0 && <div style={{ fontSize: 11, color: '#555', padding: '3px 6px' }}>No people found</div>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create DocumentPanel**

```tsx
// src/Documents/DocumentPanel.tsx
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { writeDocumentsJson } from '../utils/documents';
import DocumentViewer from './DocumentViewer';
import DocumentFields from './DocumentFields';
import DocumentPeople from './DocumentPeople';

export default function DocumentPanel() {
  const { state, dispatch } = useAppContext();
  const { activeDocument, documents } = state;

  if (!activeDocument) {
    return <div style={{ padding: 24, color: '#666', fontSize: 13 }}>Select a document from the list.</div>;
  }

  const deleteDoc = async () => {
    if (!window.confirm(`Delete "${activeDocument.title}"? The file will not be removed from disk.`)) return;
    const all = documents.filter(d => d.id !== activeDocument.id);
    dispatch({ type: 'REMOVE_DOCUMENT', id: activeDocument.id });
    await writeDocumentsJson(all);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid #2a2a3a', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#ddd', fontSize: 13, fontWeight: 'bold' }}>{activeDocument.title}</span>
        <button onClick={deleteDoc}
          style={{ background: 'none', border: 'none', color: '#e55', cursor: 'pointer', fontSize: 12 }}>
          Delete
        </button>
      </div>
      <DocumentViewer doc={activeDocument} />
      <div style={{ borderTop: '1px solid #2a2a3a' }}>
        <DocumentFields />
        <DocumentPeople />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/Documents/DocumentPanel.tsx src/Documents/DocumentViewer.tsx src/Documents/DocumentFields.tsx src/Documents/DocumentPeople.tsx
git commit -m "feat: add DocumentPanel with viewer, fields, and people linking"
```

---

## Task 13: Wire Electron dialog + update README

**Files:**
- Modify: `public/main.js`
- Modify: `README.md`

- [ ] **Step 1: Add IPC handler for file dialog in main.js**

The `DocumentList` uses `ipcRenderer.invoke('show-open-dialog', ...)`. Wire this up in the Electron main process:

```js
// public/main.js  (add after existing requires)
const { app, BrowserWindow, ipcMain, dialog } = require('electron')

// ... (keep existing createWindow and app lifecycle code unchanged) ...

// Add this at the bottom of the file:
ipcMain.handle('show-open-dialog', async (event, options) => {
  return dialog.showOpenDialog(options);
});
```

- [ ] **Step 2: Update README with setup requirements**

Add a `## Setup` section after the existing intro:

```markdown
## Setup

**Requirements:**
- Node.js 18+
- [exiftool](https://exiftool.org) installed and on your PATH
  - macOS: `brew install exiftool`
  - Linux: `sudo apt install libimage-exiftool-perl`
  - Windows: download from exiftool.org and add to PATH

**Run in development:**

```bash
# Terminal 1 — React dev server
yarn start

# Terminal 2 — Electron (after React server is up)
yarn electron-dev
```

Photos are read from `public/images/`. Documents are stored in `public/documents/`.
People and document metadata are saved to `people.json` and `documents.json` in the project root.
```

- [ ] **Step 3: Commit**

```bash
git add public/main.js README.md
git commit -m "feat: add Electron IPC dialog handler and update README setup instructions"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by task |
|---|---|
| Split panel layout (photo left, metadata right) | Task 5 |
| Fullscreen button | Task 6 (PhotoViewer) |
| AppContext with useReducer | Task 2 |
| exiftool read on startup | Tasks 3, 4 |
| Filmstrip + keyboard nav | Task 5 |
| FaceOverlay (bounding boxes) | Task 6 |
| FaceTagger (drag + name picker) | Task 8 |
| MetadataFields (date, location, camera, caption) | Task 7 |
| PeopleList with remove | Task 7 |
| Tag faces mode toggle + Esc | Tasks 7, 8 |
| writeMeta (exiftool) | Task 3 |
| writeFaceRegions (exiftool) | Task 3 |
| PeopleManager (add/rename/delete) | Task 9 |
| people.json persistence | Tasks 3, 9 |
| PersonDetail with photo grid | Task 10 |
| PersonDetail with doc list | Task 10 |
| Navigate from person → photo | Task 10 |
| Navigate from person → document | Task 10 |
| DocumentsRoute split panel | Task 11 |
| DocumentList (file + note add) | Task 11 |
| DocumentViewer (image/PDF inline, shell.openPath) | Task 12 |
| DocumentFields (title/date/description/content) | Task 12 |
| DocumentPeople (link/unlink) | Task 12 |
| documents.json persistence | Tasks 3, 11, 12 |
| copyToDocumentsDir | Task 3 |
| Electron dialog IPC | Task 13 |
| README setup docs | Task 13 |
| public/documents/ directory | Created in plan setup |
