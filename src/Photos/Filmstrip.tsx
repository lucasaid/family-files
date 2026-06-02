import { memo, useEffect, useRef } from 'react';
import { Photo } from '../context/types';

interface ItemProps {
  photo: Photo;
  isActive: boolean;
  onSelect: (photo: Photo) => void;
}

const FilmstripItem = memo(function FilmstripItem({ photo, isActive, onSelect }: ItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(photo)}
      aria-label={photo.file}
      aria-pressed={isActive}
      style={{
        padding: 0, background: 'none', flexShrink: 0, display: 'block',
        border: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        borderRadius: 2, cursor: 'pointer',
      }}
    >
      <img
        src={photo.thumbnailPath ?? photo.path}
        alt=""
        loading="lazy"
        decoding="async"
        style={{ width: 56, height: 44, objectFit: 'cover', display: 'block', borderRadius: 1 }}
      />
    </button>
  );
});

interface Props {
  photos: Photo[];
  activePhoto: Photo | null;
  onSelect: (photo: Photo) => void;
}

export default function Filmstrip({ photos, activePhoto, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !activePhoto) return;
    const idx = photos.findIndex(p => p.file === activePhoto.file);
    if (idx === -1) return;
    const item = container.children[idx] as HTMLElement | undefined;
    item?.scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' });
  }, [activePhoto, activePhoto?.file, photos]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex', gap: 4, padding: '4px 8px',
        background: 'var(--bg-filmstrip)',
        overflowX: 'auto', flexShrink: 0,
        borderTop: '1px solid var(--border)',
      }}
    >
      {photos.map(photo => (
        <FilmstripItem
          key={photo.file}
          photo={photo}
          isActive={photo.file === activePhoto?.file}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
