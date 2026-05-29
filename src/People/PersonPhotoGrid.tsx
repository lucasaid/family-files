// src/People/PersonPhotoGrid.tsx
import { useState, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Photo } from '../context/types';
import { useAppContext } from '../context/AppContext';

interface CellProps {
  photo: Photo;
  isPrimary: boolean;
  onOpen: (photo: Photo) => void;
  onSetPrimary?: (photo: Photo) => void;
}

const PhotoCell = memo(function PhotoCell({ photo, isPrimary, onOpen, onSetPrimary }: CellProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', borderRadius: 2, border: `1px solid ${isPrimary ? 'var(--accent)' : isHovered ? 'var(--border-muted)' : 'var(--border)'}`, transition: 'border-color 0.15s' }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(photo)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(photo); } }}
        aria-label={`Open ${photo.file}`}
        style={{ width: '100%', height: '100%', cursor: 'pointer' }}
      >
        <img
          src={photo.thumbnailPath ?? photo.path}
          alt={photo.file}
          loading="lazy"
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: isHovered ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.2s ease-out' }}
        />
      </div>

      {/* Primary badge */}
      {isPrimary && (
        <div style={{
          position: 'absolute', top: 5, left: 5,
          background: 'var(--accent)', borderRadius: 3,
          padding: '2px 5px', fontSize: 9, fontWeight: 600,
          letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase',
          color: 'var(--text-on-accent)', lineHeight: 1.4, pointerEvents: 'none',
        }}>
          Avatar
        </div>
      )}

      {/* Set as avatar button — only shown on hover when not already primary */}
      {isHovered && !isPrimary && onSetPrimary && (
        <button
          onClick={e => { e.stopPropagation(); onSetPrimary(photo); }}
          style={{
            position: 'absolute', top: 5, left: 5,
            background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 3,
            padding: '3px 6px', fontSize: 9, fontWeight: 600,
            letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase',
            color: 'var(--overlay-text)', cursor: 'pointer', lineHeight: 1.4,
          }}
        >
          Set avatar
        </button>
      )}

      {/* Filename / date overlay */}
      {isHovered && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,.7) 0%, transparent 100%)', padding: '14px 8px 6px', pointerEvents: 'none' }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', letterSpacing: 'var(--tracking-wordmark)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {photo.date ?? photo.file}
          </span>
        </div>
      )}
    </div>
  );
});

interface Props {
  personId: string;
  primaryPhotoFile?: string;
  onSetPrimary?: (file: string) => void;
}

export default function PersonPhotoGrid({ personId, primaryPhotoFile, onSetPrimary }: Props) {
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
    return <div style={{ color: 'var(--text-4)', fontSize: 'var(--font-size-body)', fontStyle: 'italic', padding: '8px 0' }}>No photos tagged.</div>;
  }

  // The effective primary: explicit choice, or first photo as default
  const effectivePrimary = primaryPhotoFile ?? photos[0]?.file;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 4 }}>
      {photos.map(photo => (
        <PhotoCell
          key={photo.path}
          photo={photo}
          isPrimary={photo.file === effectivePrimary}
          onOpen={openPhoto}
          onSetPrimary={onSetPrimary ? () => onSetPrimary(photo.file) : undefined}
        />
      ))}
    </div>
  );
}
