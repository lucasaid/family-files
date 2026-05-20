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
  path: string;   // display URL (e.g. /images/foo.jpg)
  fsPath: string; // absolute filesystem path for exiftool
  date: string | null;
  location: { lat: number; lng: number } | null;
  city: string | null;
  state: string | null;
  country: string | null;
  camera: string | null;
  caption: string | null;
  rating: number | null;   // 1–5
  keywords: string[];
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
  showFaces: boolean;
}

export type AppAction =
  | { type: 'SET_PHOTOS'; photos: Photo[] }
  | { type: 'SET_ACTIVE_PHOTO'; photo: Photo }
  | { type: 'UPDATE_PHOTO_META'; file: string; meta: Partial<Pick<Photo, 'date' | 'location' | 'city' | 'state' | 'country' | 'caption' | 'rating' | 'keywords'>> }
  | { type: 'ADD_FACE_REGION'; file: string; region: FaceRegion }
  | { type: 'REMOVE_FACE_REGION'; file: string; regionName: string }
  | { type: 'SET_TAGGING_MODE'; enabled: boolean }
  | { type: 'TOGGLE_FACES' }
  | { type: 'RENAME_PERSON_IN_FACES'; personId: string; newName: string }
  | { type: 'SET_DOCUMENTS'; documents: FamilyDocument[] }
  | { type: 'SET_ACTIVE_DOCUMENT'; document: FamilyDocument | null }
  | { type: 'ADD_DOCUMENT'; document: FamilyDocument }
  | { type: 'UPDATE_DOCUMENT'; document: FamilyDocument }
  | { type: 'REMOVE_DOCUMENT'; id: string }
  | { type: 'SET_PEOPLE'; people: Person[] }
  | { type: 'ADD_PERSON'; person: Person }
  | { type: 'UPDATE_PERSON'; person: Person }
  | { type: 'REMOVE_PERSON'; id: string };
