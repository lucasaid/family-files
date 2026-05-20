// src/Documents/DocumentPeople.tsx
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { writeDocumentsJson } from '../utils/documents';

export default function DocumentPeople() {
  const { state, dispatch } = useAppContext();
  const { activeDocument, documents, people } = state;
  const [query, setQuery] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  if (!activeDocument) return null;

  const linkedPeople = people.filter(p => activeDocument.personIds.includes(p.id));
  const available = people.filter(
    p => !activeDocument.personIds.includes(p.id) && p.name.toLowerCase().includes(query.toLowerCase())
  );

  const link = async (personId: string) => {
    const updated = { ...activeDocument, personIds: [...activeDocument.personIds, personId] };
    const all = documents.map(d => d.id === updated.id ? updated : d);
    dispatch({ type: 'UPDATE_DOCUMENT', document: updated });
    setShowPicker(false);
    setQuery('');
    try {
      await writeDocumentsJson(all);
    } catch (err) {
      dispatch({ type: 'UPDATE_DOCUMENT', document: activeDocument });
      alert(`Failed to save: ${(err as Error).message}`);
    }
  };

  const unlink = async (personId: string) => {
    const updated = { ...activeDocument, personIds: activeDocument.personIds.filter(id => id !== personId) };
    const all = documents.map(d => d.id === updated.id ? updated : d);
    dispatch({ type: 'UPDATE_DOCUMENT', document: updated });
    try {
      await writeDocumentsJson(all);
    } catch (err) {
      dispatch({ type: 'UPDATE_DOCUMENT', document: activeDocument });
      alert(`Failed to save: ${(err as Error).message}`);
    }
  };

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#555', marginBottom: 6 }}>People</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {linkedPeople.map(p => (
          <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#1e2a3a', border: '1px solid #2a3a4a', borderRadius: 12, padding: '2px 8px', fontSize: 11, color: '#9bb8f5' }}>
            {p.name}
            <button onClick={() => unlink(p.id)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
          </span>
        ))}
        <button onClick={() => setShowPicker(s => !s)}
          style={{ background: '#1e2535', border: '1px dashed #3a4a5a', borderRadius: 12, padding: '2px 10px', fontSize: 11, color: '#667', cursor: 'pointer' }}>
          + Link person
        </button>
      </div>

      {showPicker && (
        <div style={{ background: '#1e2535', border: '1px solid #2a3a5a', borderRadius: 4, padding: 8, maxWidth: 200 }}>
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search…"
            style={{ width: '100%', boxSizing: 'border-box', background: '#0d1520', border: '1px solid #2a3a5a', borderRadius: 3, padding: '3px 6px', color: '#ddd', fontSize: 11, marginBottom: 4 }} />
          {available.map(p => (
            <div key={p.id} onClick={() => link(p.id)}
              style={{ padding: '3px 6px', fontSize: 11, color: '#bbb', borderRadius: 2, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2a3a5a')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}>
              {p.name}
            </div>
          ))}
          {available.length === 0 && <div style={{ fontSize: 11, color: '#555', padding: '3px 6px' }}>No people found</div>}
        </div>
      )}
    </div>
  );
}
