// src/People/PersonDetail.tsx
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import PersonPhotoGrid from './PersonPhotoGrid';
import PersonDocList from './PersonDocList';
import PersonAvatar from './PersonAvatar';

export default function PersonDetail() {
  const { id } = useParams<{ id?: string }>();
  const { state } = useAppContext();
  const navigate = useNavigate();

  if (!id) return <div style={{ padding: 24, color: 'var(--text-3)' }}>Invalid URL.</div>;
  const person = state.people.find(p => p.id === id);
  if (!person) return <div style={{ padding: 24, color: 'var(--text-3)' }}>Person not found.</div>;

  const photoCount = state.photos.filter(p => p.faces.some(f => f.personId === id)).length;
  const docCount = state.documents.filter(d => d.personIds.includes(id)).length;

  return (
    <div style={{ padding: '32px 36px', maxWidth: 800, fontFamily: 'system-ui, sans-serif', color: 'var(--text-1)' }}>
      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/people')}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 500, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 24,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
      >
        <span style={{ fontSize: 9 }}>←</span> People
      </button>

      {/* Name + meta header */}
      <div style={{ marginBottom: 36, paddingBottom: 24, borderBottom: '1px solid var(--border)', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <PersonAvatar personId={person.id} size={200} />
        <div>
          <h1 style={{ fontFamily: '"Georgia", "Times New Roman", serif', fontWeight: 400, fontSize: 28, color: 'var(--text-heading)', margin: '0 0 8px', letterSpacing: '0.01em' }}>
            {person.name}
          </h1>
          <div style={{ display: 'flex', gap: 16 }}>
            <span style={{ fontSize: 11, color: 'var(--text-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--border-muted)' }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--text-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {docCount} {docCount === 1 ? 'document' : 'documents'}
            </span>
          </div>
        </div>
      </div>

      {/* Photos section */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 14 }}>
          Photos
        </div>
        <PersonPhotoGrid personId={person.id} />
      </div>

      {/* Documents section */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 14 }}>
          Documents
        </div>
        <PersonDocList personId={person.id} />
      </div>
    </div>
  );
}
