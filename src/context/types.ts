
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
  path: string;          // display URL for the original full-res image
  fsPath: string;        // absolute filesystem path for exiftool
  thumbnailPath: string | null; // cached resized version (~400px), null until generated
  album: string | null;  // subdirectory name within images/, null = root
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

export interface DocumentCategory {
  id: string;
  name: string;
  parentId: string | null;
}

export interface FamilyDocument {
  id: string;
  title: string;
  date: string | null;
  description: string;
  personIds: string[];
  categoryId?: string | null;
  type: 'file' | 'note';
  filePath?: string; // relative to public/documents/ for type='file'
  content?: string;  // inline text for type='note'
}

export interface Person {
  id: string;
  name: string;
  familyTreeId?: string;
  primaryPhotoFile?: string;
  summary?: string;
}

export interface FamilyChartMarriage {
  spouseId: string;
  date?: string;
  place?: string;
  divorceDate?: string;
}

export interface FamilyChartPerson {
  id: string;
  data: {
    gender: 'M' | 'F' | '';
    'first name': string;
    'last name': string;
    nickname?: string;
    prefix?: string;
    suffix?: string;
    // birth
    birthday: string;
    birthPlace?: string;
    // death
    death: string;
    deathPlace?: string;
    deathCause?: string;
    // burial
    burialDate?: string;
    burialPlace?: string;
    // christening
    christeningDate?: string;
    christeningPlace?: string;
    // personal attributes
    occupation?: string;
    nationality?: string;
    religion?: string;
    residence?: string;
    education?: string;
    title?: string;
    // life events
    emigrationDate?: string;
    emigrationPlace?: string;
    immigrationDate?: string;
    immigrationPlace?: string;
    // marriages (filled from FAM records)
    marriages?: FamilyChartMarriage[];
  };
  rels: {
    spouses?: string[];
    children?: string[];
    parents?: string[];
  };
}

export interface AppSettings {
  familyTreeStartId?: string;
  photosAlwaysEdit?: boolean;
  photosSaveOnNavigate?: boolean;
  aiProvider?: string | null;
  aiOllamaUrl?: string;
  aiOllamaKeywordsModel?: string;
  aiOllamaSummaryModel?: string;
}

export interface AppState {
  photos: Photo[];
  activePhoto: Photo | null;
  albums: string[];
  documents: FamilyDocument[];
  activeDocument: FamilyDocument | null;
  people: Person[];
  categories: DocumentCategory[];
  isTaggingMode: boolean;
  showFaces: boolean;
  showFacesBeforeTagging: boolean | null;
  familyChart: FamilyChartPerson[] | null;
  settings: AppSettings;
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
  | { type: 'UPDATE_FACE_REGION'; file: string; regionName: string; region: FaceRegion }
  | { type: 'SET_DOCUMENTS'; documents: FamilyDocument[] }
  | { type: 'SET_ACTIVE_DOCUMENT'; document: FamilyDocument | null }
  | { type: 'ADD_DOCUMENT'; document: FamilyDocument }
  | { type: 'UPDATE_DOCUMENT'; document: FamilyDocument }
  | { type: 'REMOVE_DOCUMENT'; id: string }
  | { type: 'SET_ALBUMS'; albums: string[] }
  | { type: 'ADD_ALBUM'; name: string }
  | { type: 'MOVE_PHOTO_TO_ALBUM'; file: string; album: string | null; newFsPath: string; newPath: string }
  | { type: 'SET_PEOPLE'; people: Person[] }
  | { type: 'ADD_PERSON'; person: Person }
  | { type: 'UPDATE_PERSON'; person: Person }
  | { type: 'REMOVE_PERSON'; id: string }
  | { type: 'SET_PHOTO_THUMBNAIL'; fsPath: string; thumbnailPath: string }
  | { type: 'SET_FAMILY_CHART'; data: FamilyChartPerson[] | null }
  | { type: 'SET_SETTINGS'; settings: AppSettings }
  | { type: 'SET_CATEGORIES'; categories: DocumentCategory[] }
  | { type: 'ADD_CATEGORY'; category: DocumentCategory }
  | { type: 'UPDATE_CATEGORY'; category: DocumentCategory }
  | { type: 'REMOVE_CATEGORY'; id: string }
  | { type: 'UPDATE_PERSON_SUMMARY'; id: string; summary: string };
