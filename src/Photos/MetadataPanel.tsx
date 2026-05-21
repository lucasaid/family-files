// src/Photos/MetadataPanel.tsx
import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import MetadataFields from './MetadataFields';
import PeopleList from './PeopleList';
import AlbumPicker from './AlbumPicker';

export default function MetadataPanel() {
  const { state, dispatch } = useAppContext();
  const { activePhoto, isTaggingMode, showFaces } = state;

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && isTaggingMode) dispatch({ type: 'SET_TAGGING_MODE', enabled: false });
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isTaggingMode, dispatch]);

  if (!activePhoto) return <div style={{ padding: 16, color: 'var(--text-3)', fontSize: 13 }}>No photo selected</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid var(--border-dim)' }}>
        <div style={{ color: 'var(--text-1)', fontSize: 12, fontWeight: 'bold' }}>{activePhoto.file}</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <MetadataFields readOnly={isTaggingMode} />
        <PeopleList />
      </div>

      {/* Album assignment */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-dim)' }}>
        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: 5 }}>
          Album
        </div>
        <AlbumPicker />
      </div>

      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_FACES' })}
          style={{
            width: '100%', background: showFaces ? 'rgba(240,176,96,.15)' : 'var(--bg-elevated)',
            border: `1px solid ${showFaces ? 'rgba(240,176,96,.5)' : 'var(--border-muted)'}`,
            borderRadius: 4, padding: '6px 0', color: showFaces ? 'var(--amber)' : 'var(--text-3)',
            fontSize: 12, cursor: 'pointer',
          }}
        >
          👤 {showFaces ? 'Hide faces' : 'Show faces'}
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_TAGGING_MODE', enabled: !isTaggingMode })}
          style={{
            width: '100%', background: isTaggingMode ? '#1e3a6a' : 'var(--btn-primary-bg)',
            border: `1px solid ${isTaggingMode ? '#4a70c0' : 'var(--btn-primary-border)'}`,
            borderRadius: 4, padding: '6px 0', color: isTaggingMode ? '#6aaff5' : 'var(--btn-primary-text)',
            fontSize: 12, cursor: 'pointer',
          }}
        >
          {isTaggingMode ? '✕ Close face tag editor' : 'Face tag editor'}
        </button>
      </div>
    </div>
  );
}
