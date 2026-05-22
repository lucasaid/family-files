// src/People/PersonPhotoGrid.tsx
import React, { useState, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Photo } from '../context/types';
import { useAppContext } from '../context/AppContext';

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
      style={{ position: 'relative', aspectRatio: '1', cursor: 'pointer', overflow: 'hidden', borderRadius: 2, border: `1px solid ${isHovered ? 'var(--border-muted)' : 'var(--border)'}`, transition: 'border-color 0.15s' }}
    >
      <img
        src={photo.thumbnailPath ?? photo.path}
        alt={photo.file}
        loading="lazy"
        decoding="async"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: isHovered ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.2s ease-out' }}
      />
      {isHovered && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.7) 0%, transparent 50%)', display: 'flex', alignItems: 'flex-end', padding: '6px 8px' }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', letterSpacing: '0.04em', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            {photo.date ?? photo.file}
          </span>
        </div>
      )}
    </div>
  );
});

interface Props { personId: string }

export default function PersonPhotoGrid({ personId }: Props) {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const photos = useMemo(
    () => state.photos.filter(p => p.faces.some(f => f.personId === personId)),
    [state.photos, personId]
  );

  const openPhoto = useCallback((photo: Photo) => {
    dispatch({ type: 'SET_ACTIVE_PHOTO', photo });
    navigate(`/photos?person=${encodeURIComponent(personId)}`);
  }, [dispatch, navigate, personId]);

  if (photos.length === 0) {
    return <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic', padding: '8px 0' }}>No photos tagged.</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 4 }}>
      {photos.map(photo => (
        <PhotoCell key={photo.path} photo={photo} onClick={openPhoto} />
      ))}
    </div>
  );
}
