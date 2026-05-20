import React, { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { readMetadata } from '../utils/exiftool';
import PhotoViewer from './PhotoViewer';
import MetadataPanel from './MetadataPanel';
import Filmstrip from './Filmstrip';
import { Photo } from '../context/types';

const ipcRenderer = (window as any).require('electron').ipcRenderer;
const STORAGE_KEY = 'family-files-photo-dir';

export default function PhotosRoute() {
  const { state, dispatch } = useAppContext();
  const { photos, activePhoto, people } = state;
  const [photoDir, setPhotoDir] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPhotos = useCallback(async (dir: string) => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await readMetadata(dir, people);
      dispatch({ type: 'SET_PHOTOS', photos: loaded });
    } catch (e: any) {
      setError(e.message ?? 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, [people, dispatch]);

  useEffect(() => {
    if (photoDir) loadPhotos(photoDir);
  }, [photoDir]); // eslint-disable-line react-hooks/exhaustive-deps

  const chooseFolder = async () => {
    const result = await ipcRenderer.invoke('show-open-dialog', { properties: ['openDirectory'] });
    if (!result.canceled && result.filePaths.length > 0) {
      const dir = result.filePaths[0];
      localStorage.setItem(STORAGE_KEY, dir);
      setPhotoDir(dir);
    }
  };

  const selectPhoto = useCallback((photo: Photo) => {
    dispatch({ type: 'SET_ACTIVE_PHOTO', photo });
  }, [dispatch]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (!activePhoto || photos.length === 0) return;
      const idx = photos.findIndex(p => p.file === activePhoto.file);
      if (e.key === 'ArrowRight' && idx < photos.length - 1) selectPhoto(photos[idx + 1]);
      if (e.key === 'ArrowLeft' && idx > 0) selectPhoto(photos[idx - 1]);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [photos, activePhoto, selectPhoto]);

  if (!photoDir || (photos.length === 0 && !loading)) {
    return (
      <div style={{ padding: 32, color: '#888', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
        {error && <div style={{ color: '#e07070', marginBottom: 8 }}>{error}</div>}
        <div>{photoDir ? `No photos found in: ${photoDir}` : 'No photo folder selected.'}</div>
        <button
          onClick={chooseFolder}
          style={{ background: '#2d3a5a', border: '1px solid #3a4a7a', borderRadius: 4, padding: '6px 16px', color: '#9bb8f5', cursor: 'pointer', fontSize: 13 }}
        >
          Choose folder…
        </button>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 32, color: '#888' }}>Loading photos…</div>;
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>
      {/* Left pane */}
      <div style={{ flex: 1.6, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0d0d0d' }}>
        <PhotoViewer />
        <Filmstrip photos={photos} activePhoto={activePhoto} onSelect={selectPhoto} />
        <div style={{ padding: '4px 8px', background: '#111', borderTop: '1px solid #222', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#555', fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photoDir}</span>
          <button
            onClick={chooseFolder}
            style={{ background: 'none', border: '1px solid #333', borderRadius: 3, padding: '2px 8px', color: '#666', cursor: 'pointer', fontSize: 11, flexShrink: 0 }}
          >
            Change folder
          </button>
        </div>
      </div>
      {/* Right pane */}
      <div style={{ width: 260, flexShrink: 0, borderLeft: '1px solid #2a2a3a', overflow: 'auto', background: '#161622' }}>
        <MetadataPanel />
      </div>
    </div>
  );
}
