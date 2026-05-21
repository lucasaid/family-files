// src/Albums/AlbumView.tsx
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Photo } from '../context/types';

export default function AlbumView() {
  const { albumName: encoded } = useParams<{ albumName: string }>();
  const albumName = encoded ? decodeURIComponent(encoded) : '';
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  const photos = state.photos.filter(p => p.album === albumName);

  const openPhoto = (photo: Photo) => {
    dispatch({ type: 'SET_ACTIVE_PHOTO', photo });
    navigate(`/photos?album=${encodeURIComponent(albumName)}`);
  };

  return (
    <div style={{ padding: '24px 24px', background: 'var(--bg)', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => navigate('/albums')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-3)', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 8 }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
        >
          ← Albums
        </button>
        <h1 style={{ fontFamily: '"Georgia", "Times New Roman", serif', fontSize: 20, fontWeight: 400, color: 'var(--text-heading)', margin: 0, letterSpacing: '0.01em' }}>
          {albumName}
        </h1>
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)' }}>
          {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
        </span>
      </div>

      {photos.length === 0 && (
        <div style={{ padding: '32px 0', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>
          No photos in this album yet.
        </div>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 3 }}>
        {photos.map(photo => {
          const isHovered = hoveredPath === photo.path;
          return (
            <div
              key={photo.path}
              onClick={() => openPhoto(photo)}
              onMouseEnter={() => setHoveredPath(photo.path)}
              onMouseLeave={() => setHoveredPath(null)}
              style={{ position: 'relative', aspectRatio: '1', cursor: 'pointer', overflow: 'hidden', borderRadius: 2, background: 'var(--bg-card)' }}
            >
              <img src={photo.path} alt={photo.file} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: isHovered ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.25s ease' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.75) 0%, rgba(0,0,0,.1) 45%, transparent 100%)', opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s ease', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '10px 10px 8px', pointerEvents: 'none' }}>
                {photo.date && <span style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>{photo.date.slice(0, 10).replace(/:/g, '–')}</span>}
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.85)', letterSpacing: '0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photo.file}</span>
                {photo.faces.length > 0 && <span style={{ fontSize: 10, color: 'rgba(240,176,96,.7)', marginTop: 3, letterSpacing: '0.04em' }}>{photo.faces.map(f => f.name).join(', ')}</span>}
              </div>
              {photo.rating != null && photo.rating > 0 && (
                <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.65)', borderRadius: 3, padding: '2px 5px', fontSize: 10, color: '#f0b060', letterSpacing: '0.5px', pointerEvents: 'none' }}>
                  {'★'.repeat(photo.rating)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
