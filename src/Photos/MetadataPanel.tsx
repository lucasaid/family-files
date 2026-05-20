// src/Photos/MetadataPanel.tsx
import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import MetadataFields from './MetadataFields';
import PeopleList from './PeopleList';

export default function MetadataPanel() {
  const { state, dispatch } = useAppContext();
  const { activePhoto, isTaggingMode } = state;

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && isTaggingMode) dispatch({ type: 'SET_TAGGING_MODE', enabled: false });
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isTaggingMode, dispatch]);

  if (!activePhoto) return <div style={{ padding: 16, color: '#666', fontSize: 13 }}>No photo selected</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid #252535' }}>
        <div style={{ color: '#ddd', fontSize: 12, fontWeight: 'bold' }}>{activePhoto.file}</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <MetadataFields readOnly={isTaggingMode} />
        <PeopleList />
      </div>

      <div style={{ padding: '8px 12px', borderTop: '1px solid #252535' }}>
        <button
          onClick={() => dispatch({ type: 'SET_TAGGING_MODE', enabled: !isTaggingMode })}
          style={{
            width: '100%', background: isTaggingMode ? '#1e3a6a' : '#2d3a5a',
            border: `1px solid ${isTaggingMode ? '#4a70c0' : '#3a4a7a'}`,
            borderRadius: 4, padding: '6px 0', color: isTaggingMode ? '#6aaff5' : '#9bb8f5',
            fontSize: 12, cursor: 'pointer',
          }}
        >
          {isTaggingMode ? '✕ Exit tagging mode' : '＋ Tag faces'}
        </button>
      </div>
    </div>
  );
}
