// src/Documents/DocumentList.tsx
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { FamilyDocument } from '../context/types';
import { writeDocumentsJson, copyToDocumentsDir } from '../utils/documents';

const { ipcRenderer } = (window as any).require('electron');

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-card)' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6 }}>
        <button onClick={addFile} disabled={loading}
          style={{ flex: 1, background: 'var(--btn-primary-bg)', border: '1px solid var(--btn-primary-border)', borderRadius: 4, padding: '5px 0', color: 'var(--btn-primary-text)', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1, fontSize: 12 }}>
          {loading ? 'Importing…' : '+ Add file'}
        </button>
        <button onClick={addNote}
          style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)', borderRadius: 4, padding: '5px 0', color: 'var(--text-2)', cursor: 'pointer', fontSize: 12 }}>
          + New note
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {documents.length === 0 && (
          <div style={{ padding: 16, color: 'var(--text-4)', fontSize: 13 }}>No documents yet.</div>
        )}
        {documents.map(doc => {
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
