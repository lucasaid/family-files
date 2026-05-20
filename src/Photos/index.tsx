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
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (!activePhoto || photos.length === 0) return;
      const idx = photos.findIndex(p => p.file === activePhoto.file);
      if (e.key === 'ArrowRight' && idx < photos.length - 1) selectPhoto(photos[idx + 1]);
      if (e.key === 'ArrowLeft' && idx > 0) selectPhoto(photos[idx - 1]);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [photos, activePhoto, selectPhoto]);

  if (photos.length === 0) {
    return <div style={{ padding: 24, color: '#888' }}>No photos found in images/</div>;
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
