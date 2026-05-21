import React, { memo, useEffect, useRef } from 'react';
import { Photo } from '../context/types';

interface ItemProps {
  photo: Photo;
  isActive: boolean;
  onSelect: (photo: Photo) => void;
}

const FilmstripItem = memo(function FilmstripItem({ photo, isActive, onSelect }: ItemProps) {
  return (
    <img
      src={photo.thumbnailPath ?? photo.path}
      alt={photo.file}
      loading="lazy"
      decoding="async"
      onClick={() => onSelect(photo)}
      style={{
        width: 56, height: 44, objectFit: 'cover', flexShrink: 0,
        borderRadius: 2, cursor: 'pointer',
        border: isActive ? '2px solid var(--accent)' : '2px solid transparent',
      }}
    />
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
    item?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activePhoto?.file, photos]);

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
