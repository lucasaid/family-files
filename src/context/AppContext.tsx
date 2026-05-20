import React, { createContext, useContext, useReducer } from 'react';
import { AppState, AppAction, Photo } from './types';

export const initialState: AppState = {
  photos: [],
  activePhoto: null,
  documents: [],
  activeDocument: null,
  people: [],
  isTaggingMode: false,
  showFaces: true,
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
