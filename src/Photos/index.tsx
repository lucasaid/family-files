import React, { useCallback, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PhotoViewer from './PhotoViewer';
import MetadataPanel from './MetadataPanel';
import Filmstrip from './Filmstrip';
import { Photo } from '../context/types';

export default function PhotosRoute() {
  const { state, dispatch } = useAppContext();
  const { photos, activePhoto } = state;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const albumFilter = searchParams.get('album');
  const personFilter = searchParams.get('person');

  const filteredPhotos: Photo[] = (() => {
    if (albumFilter !== null) return photos.filter(p => p.album === albumFilter);
    if (personFilter !== null) return photos.filter(p => p.faces.some(f => f.personId === personFilter));
    return photos;
  })();

  const personName = personFilter
    ? state.people.find(p => p.id === personFilter)?.name ?? null
    : null;

  const selectPhoto = useCallback((photo: Photo) => {
    dispatch({ type: 'SET_ACTIVE_PHOTO', photo });
  }, [dispatch]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (!activePhoto || filteredPhotos.length === 0) return;
      const idx = filteredPhotos.findIndex(p => p.file === activePhoto.file);
      if (e.key === 'ArrowRight' && idx < filteredPhotos.length - 1) selectPhoto(filteredPhotos[idx + 1]);
      if (e.key === 'ArrowLeft' && idx > 0) selectPhoto(filteredPhotos[idx - 1]);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [filteredPhotos, activePhoto, selectPhoto]);

  if (photos.length === 0) {
    return <div style={{ padding: 24, color: '#888' }}>No photos found in images/</div>;
  }

  const backLabel = albumFilter !== null ? albumFilter : personName;
  const backPath = albumFilter !== null
    ? `/albums/${encodeURIComponent(albumFilter)}`
    : personFilter ? `/people/${personFilter}` : null;

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%', flexDirection: 'column' }}>
      {/* Breadcrumb — only shown when a filter is active */}
      {backLabel && backPath && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 16px',
          height: 32, flexShrink: 0,
          borderBottom: '1px solid #1e1e2e',
          background: '#09090f',
        }}>
          <button
            onClick={() => navigate(backPath)}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 500, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#555',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#9bb8f5')}
            onMouseLeave={e => (e.currentTarget.style.color = '#555')}
          >
            <span style={{ fontSize: 9 }}>←</span> {backLabel}
          </button>
          <span style={{ color: '#2a2a3a', fontSize: 10 }}>·</span>
          <span style={{ fontSize: 11, color: '#333', letterSpacing: '0.06em' }}>
            {filteredPhotos.length} {filteredPhotos.length === 1 ? 'photo' : 'photos'}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left pane */}
        <div style={{ flex: 1.6, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0d0d0d' }}>
          <PhotoViewer />
          <Filmstrip photos={filteredPhotos} activePhoto={activePhoto} onSelect={selectPhoto} />
        </div>
        {/* Right pane */}
        <div style={{ width: 260, flexShrink: 0, borderLeft: '1px solid #2a2a3a', overflow: 'auto', background: '#161622' }}>
          <MetadataPanel />
        </div>
      </div>
    </div>
  );
}
