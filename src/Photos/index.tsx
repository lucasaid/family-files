import { useCallback, useEffect } from 'react';
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

  const navigatePhoto = useCallback((dir: 'prev' | 'next') => {
    if (!activePhoto || filteredPhotos.length === 0) return;
    const idx = filteredPhotos.findIndex(p => p.file === activePhoto.file);
    if (dir === 'next' && idx < filteredPhotos.length - 1) selectPhoto(filteredPhotos[idx + 1]);
    if (dir === 'prev' && idx > 0) selectPhoto(filteredPhotos[idx - 1]);
  }, [filteredPhotos, activePhoto, selectPhoto]);

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
    return <div style={{ padding: 24, color: 'var(--text-3)' }}>No photos found in images/</div>;
  }

  const backLabel = albumFilter !== null ? albumFilter : personName;
  const backPath = albumFilter !== null
    ? `/albums/${encodeURIComponent(albumFilter)}`
    : personFilter ? `/people/${personFilter}` : null;

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%', flexDirection: 'column' }}>
      {backLabel && backPath && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 16px', height: 32, flexShrink: 0,
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
        }}>
          <button
            onClick={() => navigate(backPath)}
            className="btn-ghost-hover"
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 'var(--font-size-label)', fontWeight: 500, letterSpacing: 'var(--tracking-wider)',
              textTransform: 'uppercase', color: 'var(--text-3)',
            }}
          >
            <span style={{ fontSize: 9 }}>←</span> {backLabel}
          </button>
          <span style={{ color: 'var(--border-muted)', fontSize: 10 }}>·</span>
          <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)', letterSpacing: 'var(--tracking-wide)' }}>
            {filteredPhotos.length} {filteredPhotos.length === 1 ? 'photo' : 'photos'}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1.6, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-viewer)' }}>
          <PhotoViewer />
          <Filmstrip photos={filteredPhotos} activePhoto={activePhoto} onSelect={selectPhoto} />
        </div>
        <div style={{ width: 260, flexShrink: 0, borderLeft: '1px solid var(--border)', overflow: 'auto', background: 'var(--bg-panel)' }}>
          <MetadataPanel onNavigate={navigatePhoto} />
        </div>
      </div>
    </div>
  );
}
