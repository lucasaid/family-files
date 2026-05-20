// src/People/PersonPhotoGrid.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Photo } from '../context/types';
import { useAppContext } from '../context/AppContext';

interface Props { personId: string }

export default function PersonPhotoGrid({ personId }: Props) {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const photos = state.photos.filter(p => p.faces.some(f => f.personId === personId));

  if (photos.length === 0) return <div style={{ color: '#666', fontSize: 13 }}>No photos tagged.</div>;

  const openPhoto = (photo: Photo) => {
    dispatch({ type: 'SET_ACTIVE_PHOTO', photo });
    navigate('/photos');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6 }}>
      {photos.map(photo => (
        <img
          key={photo.file}
          src={photo.path}
          alt={photo.file}
          onClick={() => openPhoto(photo)}
          style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 4, cursor: 'pointer', border: '1px solid #2a2a3a' }}
        />
      ))}
    </div>
  );
}
