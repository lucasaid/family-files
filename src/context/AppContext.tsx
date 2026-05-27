import React, { createContext, useContext, useReducer } from 'react';
import { AppState, AppAction, Photo } from './types';

export const initialState: AppState = {
  photos: [],
  activePhoto: null,
  albums: [],
  documents: [],
  activeDocument: null,
  people: [],
  categories: [],
  isTaggingMode: false,
  showFaces: true,
  familyChart: null,
  settings: {},
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
    case 'TOGGLE_FACES':
      return { ...state, showFaces: !state.showFaces };
    case 'UPDATE_FACE_REGION': {
      const update = (p: Photo) => ({
        ...p, faces: p.faces.map(f => f.name === action.regionName ? action.region : f),
      });
      const photos = state.photos.map(p => p.file === action.file ? update(p) : p);
      const activePhoto = state.activePhoto?.file === action.file ? update(state.activePhoto) : state.activePhoto;
      return { ...state, photos, activePhoto };
    }
    case 'RENAME_PERSON_IN_FACES': {
      const renameFace = (p: Photo) => ({
        ...p,
        faces: p.faces.map(f =>
          f.personId === action.personId ? { ...f, name: action.newName } : f
        ),
      });
      const photos = state.photos.map(renameFace);
      const activePhoto = state.activePhoto ? renameFace(state.activePhoto) : null;
      return { ...state, photos, activePhoto };
    }
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
    case 'SET_ALBUMS':
      return { ...state, albums: action.albums };
    case 'ADD_ALBUM':
      return { ...state, albums: [...state.albums, action.name].sort() };
    case 'MOVE_PHOTO_TO_ALBUM': {
      const updatePhoto = (p: Photo) => p.file === action.file
        ? { ...p, album: action.album, fsPath: action.newFsPath, path: action.newPath }
        : p;
      return {
        ...state,
        photos: state.photos.map(updatePhoto),
        activePhoto: state.activePhoto?.file === action.file
          ? updatePhoto(state.activePhoto) : state.activePhoto,
      };
    }
    case 'SET_PEOPLE':
      return { ...state, people: action.people };
    case 'ADD_PERSON':
      return { ...state, people: [...state.people, action.person] };
    case 'UPDATE_PERSON':
      return { ...state, people: state.people.map(p => p.id === action.person.id ? action.person : p) };
    case 'REMOVE_PERSON':
      return { ...state, people: state.people.filter(p => p.id !== action.id) };
    case 'SET_PHOTO_THUMBNAIL': {
      const photos = state.photos.map(p =>
        p.fsPath === action.fsPath ? { ...p, thumbnailPath: action.thumbnailPath } : p
      );
      const activePhoto = state.activePhoto?.fsPath === action.fsPath
        ? { ...state.activePhoto, thumbnailPath: action.thumbnailPath }
        : state.activePhoto;
      return { ...state, photos, activePhoto };
    }
    case 'SET_FAMILY_CHART':
      return { ...state, familyChart: action.data };
    case 'SET_SETTINGS':
      return { ...state, settings: action.settings };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.categories };
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.category] };
    case 'UPDATE_CATEGORY':
      return { ...state, categories: state.categories.map(c => c.id === action.category.id ? action.category : c) };
    case 'REMOVE_CATEGORY':
      return { ...state, categories: state.categories.filter(c => c.id !== action.id) };
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
