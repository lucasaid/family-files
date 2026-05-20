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
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: '#555', marginBottom: 4 }}>
        People
      </div>
      {activePhoto.faces.length === 0 && (
        <div style={{ fontSize: 12, color: '#666' }}>No people tagged</div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {activePhoto.faces.map(face => (
          <span
            key={face.name}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: '#1e2a3a', border: '1px solid #2a3a4a',
              borderRadius: 12, padding: '2px 8px', fontSize: 11, color: '#9bb8f5',
            }}
          >
            👤 {face.name}
            <button
              onClick={() => removeFace(face.name)}
              style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 0, lineHeight: 1 }}
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
