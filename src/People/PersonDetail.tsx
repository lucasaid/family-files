// src/People/PersonDetail.tsx
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import PersonPhotoGrid from './PersonPhotoGrid';
import PersonDocList from './PersonDocList';

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>();
  const { state } = useAppContext();
  const navigate = useNavigate();
  const person = state.people.find(p => p.id === id);

  if (!person) return <div style={{ padding: 24, color: '#888' }}>Person not found.</div>;

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <button onClick={() => navigate('/people')}
        style={{ background: 'none', border: 'none', color: '#9bb8f5', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}>
        ← People
      </button>
      <h2 style={{ color: '#ddd', marginTop: 0, marginBottom: 24 }}>{person.name}</h2>

      <h3 style={{ color: '#aaa', fontSize: 13, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Photos</h3>
      <PersonPhotoGrid personId={person.id} />

      <h3 style={{ color: '#aaa', fontSize: 13, textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 24, marginBottom: 10 }}>Documents</h3>
      <PersonDocList personId={person.id} />
    </div>
  );
}
