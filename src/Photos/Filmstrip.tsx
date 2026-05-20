import React from 'react';
import { Photo } from '../context/types';

interface Props {
  photos: Photo[];
  activePhoto: Photo | null;
  onSelect: (photo: Photo) => void;
}

export default function Filmstrip({ photos, activePhoto, onSelect }: Props) {
  return (
    <div style={{
      display: 'flex', gap: 4, padding: '4px 8px', background: '#0a0a0a',
      overflowX: 'auto', flexShrink: 0, borderTop: '1px solid #222',
    }}>
      {photos.map(photo => (
        <img
          key={photo.file}
          src={photo.path}
          alt={photo.file}
          onClick={() => onSelect(photo)}
          style={{
            width: 56, height: 44, objectFit: 'cover', flexShrink: 0,
            borderRadius: 2, cursor: 'pointer',
            border: photo.file === activePhoto?.file ? '2px solid #4a90d9' : '2px solid transparent',
          }}
        />
      ))}
    </div>
  );
}
