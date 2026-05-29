// src/Photos/PeopleList.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { writeFaceRegions } from '../utils/exiftool';

export default function PeopleList() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const { activePhoto, isTaggingMode } = state;
  if (!activePhoto) return null;

  const removeFace = async (name: string) => {
    const remaining = activePhoto.faces.filter(f => f.name !== name);
    try {
      await writeFaceRegions(activePhoto.fsPath, remaining);
      dispatch({ type: 'REMOVE_FACE_REGION', file: activePhoto.file, regionName: name });
    } catch (err) {
      alert(`Failed to remove face tag: ${(err as Error).message}`);
    }
  };

  return (
    <div>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--text-4)', marginBottom: 4 }}>
        People
      </div>
      {activePhoto.faces.length === 0 && (
        <div style={{ fontSize: 'var(--font-size-ui)', color: 'var(--text-3)' }}>No people tagged</div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {activePhoto.faces.map(face => (
          <span
            key={face.name}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'var(--pill-bg)', border: '1px solid var(--pill-border)',
              borderRadius: 12, padding: '2px 8px', fontSize: 'var(--font-size-label)', color: 'var(--pill-text)',
            }}
          >
            <span
              onClick={face.personId && !isTaggingMode ? () => navigate(`/people/${face.personId}`) : undefined}
              style={{ cursor: face.personId && !isTaggingMode ? 'pointer' : 'default' }}
            >
              👤 {face.name}
            </span>
            <button
              onClick={() => removeFace(face.name)}
              aria-label={`Remove ${face.name}`}
              style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 0, lineHeight: 1 }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
