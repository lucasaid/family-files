// src/Photos/MetadataPanel.tsx
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import MetadataFields from './MetadataFields';
import PeopleList from './PeopleList';
import AlbumPicker from './AlbumPicker';

export default function MetadataPanel() {
  const { state, dispatch } = useAppContext();
  const { activePhoto, isTaggingMode, showFaces } = state;
  const alwaysEdit = !!state.settings.photosAlwaysEdit;
  const [isEditing, setIsEditing] = useState(false);

  // Reset to read-only when switching photos (no-op when alwaysEdit is on)
  useEffect(() => { if (!alwaysEdit) setIsEditing(false); }, [activePhoto?.file, alwaysEdit]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && isTaggingMode) dispatch({ type: 'SET_TAGGING_MODE', enabled: false });
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isTaggingMode, dispatch]);

  if (!activePhoto) return <div style={{ padding: 16, color: 'var(--text-3)', fontSize: 13 }}>No photo selected</div>;

  const metaReadOnly = (!isEditing && !alwaysEdit) || isTaggingMode;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: 'var(--text-1)', fontSize: 12, fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activePhoto.file}</div>
        {!isTaggingMode && !alwaysEdit && (
          <button
            onClick={() => setIsEditing(e => !e)}
            style={{
              flexShrink: 0, marginLeft: 8,
              background: isEditing ? 'var(--bg-elevated)' : 'none',
              border: `1px solid ${isEditing ? 'var(--border-muted)' : 'transparent'}`,
              borderRadius: 3, padding: '2px 8px',
              color: isEditing ? 'var(--text-3)' : 'var(--accent)',
              fontSize: 11, cursor: 'pointer',
            }}
          >
            {isEditing ? 'Done' : 'Edit'}
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <MetadataFields readOnly={metaReadOnly} onExitEdit={() => setIsEditing(false)} />
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
          aria-label={showFaces ? 'Hide face tags' : 'Show face tags'}
          aria-pressed={showFaces}
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
          aria-label={isTaggingMode ? 'Close face tag editor' : 'Open face tag editor'}
          aria-pressed={isTaggingMode}
          style={{
            width: '100%', background: isTaggingMode ? 'var(--btn-toggle-on-bg)' : 'var(--btn-primary-bg)',
            border: `1px solid ${isTaggingMode ? 'var(--btn-toggle-on-border)' : 'var(--btn-primary-border)'}`,
            borderRadius: 4, padding: '6px 0', color: isTaggingMode ? 'var(--btn-toggle-on-text)' : 'var(--btn-primary-text)',
            fontSize: 12, cursor: 'pointer',
          }}
        >
          {isTaggingMode ? '✕ Close face tag editor' : 'Face tag editor'}
        </button>
      </div>
    </div>
  );
}
