// src/Documents/DocumentList.tsx
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { FamilyDocument } from '../context/types';
import { writeDocumentsJson, copyToDocumentsDir } from '../utils/documents';

const { ipcRenderer } = (window as any).require('electron');

type SearchField = 'all' | 'title' | 'date' | 'description' | 'people';

const SEARCH_FIELDS: { value: SearchField; label: string }[] = [
  { value: 'all',         label: 'All fields' },
  { value: 'title',       label: 'Title' },
  { value: 'date',        label: 'Date' },
  { value: 'description', label: 'Description' },
  { value: 'people',      label: 'People' },
];

function docIcon(doc: FamilyDocument) {
  if (doc.type === 'note') return '📝';
  const ext = doc.filePath?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return '📄';
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext ?? '')) return '🖼️';
  return '📎';
}

export default function DocumentList() {
  const { state, dispatch } = useAppContext();
  const { documents, activeDocument, people } = state;
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('all');

  const personName = (id: string) => people.find(p => p.id === id)?.name ?? '';

  const matchesSearch = (doc: FamilyDocument): boolean => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const check = (v: string | null | undefined) => !!v && v.toLowerCase().includes(q);
    switch (searchField) {
      case 'title':       return check(doc.title);
      case 'date':        return check(doc.date);
      case 'description': return check(doc.description) || check(doc.content);
      case 'people':      return doc.personIds.some(id => personName(id).toLowerCase().includes(q));
      case 'all':
        return check(doc.title) || check(doc.date) || check(doc.description) || check(doc.content) ||
          doc.personIds.some(id => personName(id).toLowerCase().includes(q));
    }
  };

  const filteredDocs = documents.filter(matchesSearch);

  const addFile = async () => {
    if (loading) return;
    const result = await ipcRenderer.invoke('show-open-dialog', {
      properties: ['openFile'],
      filters: [{ name: 'All Files', extensions: ['*'] }],
    });
    if (result.canceled || !result.filePaths[0]) return;
    setLoading(true);
    try {
      const filePath = await copyToDocumentsDir(result.filePaths[0]);
      const nameWithoutExt = filePath.replace(/\.[^.]+$/, '');
      const doc: FamilyDocument = {
        id: crypto.randomUUID(), title: nameWithoutExt, date: null, description: '',
        personIds: [], type: 'file', filePath,
      };
      dispatch({ type: 'ADD_DOCUMENT', document: doc });
      dispatch({ type: 'SET_ACTIVE_DOCUMENT', document: doc });
      try {
        await writeDocumentsJson([...documents, doc]);
      } catch (writeErr) {
        dispatch({ type: 'REMOVE_DOCUMENT', id: doc.id });
        alert(`Failed to save document: ${(writeErr as Error).message}`);
      }
    } catch (copyErr) {
      alert(`Failed to copy file: ${(copyErr as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    const doc: FamilyDocument = {
      id: crypto.randomUUID(), title: 'New note', date: null, description: '',
      personIds: [], type: 'note', content: '',
    };
    dispatch({ type: 'ADD_DOCUMENT', document: doc });
    dispatch({ type: 'SET_ACTIVE_DOCUMENT', document: doc });
    try {
      await writeDocumentsJson([...documents, doc]);
    } catch (err) {
      dispatch({ type: 'REMOVE_DOCUMENT', id: doc.id });
      alert(`Failed to save note: ${(err as Error).message}`);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
    borderRadius: 3, padding: '4px 8px', color: 'var(--input-text)',
    fontSize: 11, fontFamily: 'system-ui, sans-serif', outline: 'none', width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-card)' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={addFile} disabled={loading}
            style={{ flex: 1, background: 'var(--btn-primary-bg)', border: '1px solid var(--btn-primary-border)', borderRadius: 4, padding: '5px 0', color: 'var(--btn-primary-text)', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1, fontSize: 12 }}>
            {loading ? 'Importing…' : '+ Add file'}
          </button>
          <button onClick={addNote}
            style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)', borderRadius: 4, padding: '5px 0', color: 'var(--text-2)', cursor: 'pointer', fontSize: 12 }}>
            + New note
          </button>
        </div>
        {documents.length > 0 && (
          <div style={{ display: 'flex', gap: 6, minWidth: 0 }}>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              style={{ ...inputStyle, flex: 1, minWidth: 0, width: 0 }}
            />
            <select
              value={searchField}
              onChange={e => setSearchField(e.target.value as SearchField)}
              style={{ ...inputStyle, width: 'auto', flexShrink: 0, cursor: 'pointer' }}
            >
              {SEARCH_FIELDS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {documents.length === 0 && (
          <div style={{ padding: 16, color: 'var(--text-4)', fontSize: 13 }}>No documents yet.</div>
        )}
        {documents.length > 0 && filteredDocs.length === 0 && (
          <div style={{ padding: 16, color: 'var(--text-4)', fontSize: 12, fontStyle: 'italic' }}>No documents match "{search}".</div>
        )}
        {filteredDocs.map(doc => {
          const firstPerson = doc.personIds[0] ? people.find(p => p.id === doc.personIds[0])?.name : null;
          return (
            <div
              key={doc.id}
              onClick={() => dispatch({ type: 'SET_ACTIVE_DOCUMENT', document: doc })}
              style={{
                padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-dim)',
                background: activeDocument?.id === doc.id ? 'var(--bg-active)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{docIcon(doc)}</span>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ color: 'var(--text-1)', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</div>
                  <div style={{ color: 'var(--text-4)', fontSize: 11 }}>
                    {doc.date && <span>{doc.date} · </span>}
                    {firstPerson && <span>👤 {firstPerson}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
