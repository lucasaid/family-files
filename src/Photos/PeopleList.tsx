// src/Photos/PeopleList.tsx
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { writeFaceRegions } from '../utils/exiftool';

export default function PeopleList() {
  const { state, dispatch } = useAppContext();
  const { activePhoto } = state;
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
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-4)', marginBottom: 4 }}>
        People
      </div>
      {activePhoto.faces.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>No people tagged</div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {activePhoto.faces.map(face => (
          <span
            key={face.name}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'var(--pill-bg)', border: '1px solid var(--pill-border)',
              borderRadius: 12, padding: '2px 8px', fontSize: 11, color: 'var(--pill-text)',
            }}
          >
            👤 {face.name}
            <button
              onClick={() => removeFace(face.name)}
              style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 0, lineHeight: 1 }}
              title="Remove face tag"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
