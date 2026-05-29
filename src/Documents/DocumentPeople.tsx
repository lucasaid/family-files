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
    try {
      await writeDocumentsJson(all);
      setShowPicker(false);
      setQuery('');
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
      <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: 6 }}>People</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {linkedPeople.map(p => (
          <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--pill-bg)', border: '1px solid var(--pill-border)', borderRadius: 12, padding: '2px 8px', fontSize: 'var(--font-size-label)', color: 'var(--pill-text)' }}>
            {p.name}
            <button type="button" onClick={() => unlink(p.id)} aria-label={`Unlink ${p.name}`} style={{ background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
          </span>
        ))}
        <button type="button" onClick={() => setShowPicker(s => !s)}
          style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border-muted)', borderRadius: 12, padding: '2px 10px', fontSize: 'var(--font-size-label)', color: 'var(--text-4)', cursor: 'pointer' }}>
          + Link person
        </button>
      </div>

      {showPicker && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)', borderRadius: 4, padding: 8, maxWidth: 200 }}>
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search…"
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 3, padding: '3px 6px', color: 'var(--input-text)', fontSize: 'var(--font-size-label)', marginBottom: 4 }} />
          {available.map(p => (
            <button type="button" key={p.id} onClick={() => link(p.id)}
              className="btn-row-hover"
              style={{ width: '100%', textAlign: 'left', padding: '3px 6px', fontSize: 'var(--font-size-label)', color: 'var(--text-2)', borderRadius: 2, cursor: 'pointer', background: 'none', border: 'none' }}>
              {p.name}
            </button>
          ))}
          {available.length === 0 && <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-5)', padding: '3px 6px' }}>No people found</div>}
        </div>
      )}
    </div>
  );
}
