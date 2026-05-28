// src/Albums/AlbumView.tsx
import React, { useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Photo } from '../context/types';

interface CellProps {
  photo: Photo;
  onClick: (photo: Photo) => void;
}

const PhotoCell = memo(function PhotoCell({ photo, onClick }: CellProps) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(photo)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(photo); } }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`Open ${photo.file}`}
      style={{ position: 'relative', aspectRatio: '1', cursor: 'pointer', overflow: 'hidden', borderRadius: 2, background: 'var(--bg-card)' }}
    >
      <img src={photo.thumbnailPath ?? photo.path} alt={photo.file} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: isHovered ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.25s ease-out' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.75) 0%, rgba(0,0,0,.1) 45%, transparent 100%)', opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s ease-out', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '10px 10px 8px', pointerEvents: 'none' }}>
        {photo.date && <span style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>{photo.date.slice(0, 10).replace(/:/g, '–')}</span>}
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.85)', letterSpacing: '0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photo.file}</span>
        {photo.faces.length > 0 && <span style={{ fontSize: 10, color: 'rgba(240,176,96,.7)', marginTop: 3, letterSpacing: '0.04em' }}>{photo.faces.map(f => f.name).join(', ')}</span>}
      </div>
      {photo.rating != null && photo.rating > 0 && (
        <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.65)', borderRadius: 3, padding: '2px 5px', fontSize: 10, color: 'var(--amber)', letterSpacing: '0.5px', pointerEvents: 'none' }}>
          {'★'.repeat(photo.rating)}
        </div>
      )}
    </div>
  );
});

interface SubAlbumCellProps {
  albumPath: string;
  label: string;
  count: number;
  coverPhoto: Photo | undefined;
  onClick: (albumPath: string) => void;
}

const SubAlbumCell = memo(function SubAlbumCell({ albumPath, label, count, coverPhoto, onClick }: SubAlbumCellProps) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(albumPath)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(albumPath); } }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`Open album ${label}`}
      style={{ position: 'relative', aspectRatio: '1', cursor: 'pointer', overflow: 'hidden', borderRadius: 2, background: 'var(--bg-card)' }}
    >
      {coverPhoto ? (
        <img
          src={coverPhoto.thumbnailPath ?? coverPhoto.path}
          alt={label}
          loading="lazy"
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: isHovered ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.25s ease-out' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--border-muted)', fontSize: 32 }}>▦</div>
      )}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,.85) 0%, rgba(0,0,0,.2) 50%, transparent 100%)',
        opacity: coverPhoto ? (isHovered ? 1 : 0.7) : 1,
        transition: 'opacity 0.2s ease-out',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: '10px 10px 10px', pointerEvents: 'none',
      }}>
        <span style={{ fontFamily: '"Georgia", "Times New Roman", serif', fontSize: 13, color: 'rgba(255,255,255,.9)', letterSpacing: '0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
          {count} {count === 1 ? 'photo' : 'photos'}
        </span>
      </div>
    </div>
  );
});

export default function AlbumView({ albumPath }: { albumPath: string }) {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();

  // Photos directly in this album (not in sub-albums)
  const photos = state.photos.filter(p => p.album === albumPath);

  // Direct child sub-albums: start with "albumPath/" and have no further "/"
  const prefix = albumPath + '/';
  const subAlbums = state.albums
    .filter(a => a.startsWith(prefix) && !a.slice(prefix.length).includes('/'))
    .sort();

  // Cover photo for each sub-album: first photo in that album or any of its descendants
  const coverForAlbum = useCallback((subPath: string) => {
    const subPrefix = subPath + '/';
    return state.photos.find(p => p.album === subPath || p.album?.startsWith(subPrefix));
  }, [state.photos]);

  // Count photos in sub-album including all descendants
  const countForAlbum = useCallback((subPath: string) => {
    const subPrefix = subPath + '/';
    return state.photos.filter(p => p.album === subPath || p.album?.startsWith(subPrefix)).length;
  }, [state.photos]);

  const openPhoto = useCallback((photo: Photo) => {
    dispatch({ type: 'SET_ACTIVE_PHOTO', photo });
    navigate(`/photos?album=${encodeURIComponent(albumPath)}`);
  }, [dispatch, navigate, albumPath]);

  const openSubAlbum = useCallback((subPath: string) => {
    navigate(`/albums/${subPath}`);
  }, [navigate]);

  // Breadcrumb segments for the current path
  const segments = albumPath.split('/');
  const parentPath = segments.length > 1 ? segments.slice(0, -1).join('/') : null;

  return (
    <div style={{ padding: '24px 24px', background: 'var(--bg)', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {/* Breadcrumb */}
        <button
          onClick={() => navigate('/albums')}
          className="btn-ghost-hover"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-3)', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}
        >
          ← Albums
        </button>
        {segments.map((seg, i) => {
          const segPath = segments.slice(0, i + 1).join('/');
          const isLast = i === segments.length - 1;
          return (
            <React.Fragment key={segPath}>
              <span style={{ color: 'var(--border-muted)', fontSize: 11 }}>/</span>
              {isLast ? (
                <h1 style={{ fontFamily: '"Georgia", "Times New Roman", serif', fontSize: 20, fontWeight: 400, color: 'var(--text-heading)', margin: 0, letterSpacing: '0.01em' }}>
                  {seg}
                </h1>
              ) : (
                <button
                  onClick={() => navigate(`/albums/${segPath}`)}
                  className="btn-ghost-hover"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-3)', fontSize: 13, fontFamily: '"Georgia", "Times New Roman", serif' }}
                >
                  {seg}
                </button>
              )}
            </React.Fragment>
          );
        })}
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)' }}>
          {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
          {subAlbums.length > 0 && ` · ${subAlbums.length} ${subAlbums.length === 1 ? 'album' : 'albums'}`}
        </span>
      </div>

      {/* Sub-albums grid */}
      {subAlbums.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10 }}>
            Albums
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 3 }}>
            {subAlbums.map(subPath => (
              <SubAlbumCell
                key={subPath}
                albumPath={subPath}
                label={subPath.split('/').pop()!}
                count={countForAlbum(subPath)}
                coverPhoto={coverForAlbum(subPath)}
                onClick={openSubAlbum}
              />
            ))}
          </div>
        </div>
      )}

      {/* Photos in this album */}
      {photos.length === 0 && subAlbums.length === 0 && (
        <div style={{ padding: '32px 0', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>
          No photos in this album yet.
        </div>
      )}
      {photos.length > 0 && (
        <>
          {subAlbums.length > 0 && (
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10 }}>
              Photos
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 3 }}>
            {photos.map(photo => (
              <PhotoCell key={photo.path} photo={photo} onClick={openPhoto} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
