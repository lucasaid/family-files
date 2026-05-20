// src/Documents/DocumentList.tsx
import React from 'react';
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

  const addFile = async () => {
    const result = await ipcRenderer.invoke('show-open-dialog', {
      properties: ['openFile'],
      filters: [{ name: 'All Files', extensions: ['*'] }],
    });
    if (result.canceled || !result.filePaths[0]) return;
    const sourcePath = result.filePaths[0];
    const filePath = await copyToDocumentsDir(sourcePath);
    const doc: FamilyDocument = {
      id: crypto.randomUUID(), title: filePath, date: null, description: '',
      personIds: [], type: 'file', filePath,
    };
    const updated = [...documents, doc];
    dispatch({ type: 'ADD_DOCUMENT', document: doc });
    dispatch({ type: 'SET_ACTIVE_DOCUMENT', document: doc });
    await writeDocumentsJson(updated);
  };

  const addNote = async () => {
    const doc: FamilyDocument = {
      id: crypto.randomUUID(), title: 'New note', date: null, description: '',
      personIds: [], type: 'note', content: '',
    };
    const updated = [...documents, doc];
    dispatch({ type: 'ADD_DOCUMENT', document: doc });
    dispatch({ type: 'SET_ACTIVE_DOCUMENT', document: doc });
    await writeDocumentsJson(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#111' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #222', display: 'flex', gap: 6 }}>
        <button onClick={addFile}
          style={{ flex: 1, background: '#2d3a5a', border: '1px solid #3a4a7a', borderRadius: 4, padding: '5px 0', color: '#9bb8f5', cursor: 'pointer', fontSize: 12 }}>
          + Add file
        </button>
        <button onClick={addNote}
          style={{ flex: 1, background: '#2a2a3a', border: '1px solid #3a3a5a', borderRadius: 4, padding: '5px 0', color: '#aaa', cursor: 'pointer', fontSize: 12 }}>
          + New note
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {documents.length === 0 && (
          <div style={{ padding: 16, color: '#666', fontSize: 13 }}>No documents yet.</div>
        )}
        {documents.map(doc => {
          const firstPerson = doc.personIds[0] ? people.find(p => p.id === doc.personIds[0])?.name : null;
          return (
            <div
              key={doc.id}
              onClick={() => dispatch({ type: 'SET_ACTIVE_DOCUMENT', document: doc })}
              style={{
                padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #1a1a1a',
                background: activeDocument?.id === doc.id ? '#1e2535' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{docIcon(doc)}</span>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ color: '#ddd', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</div>
                  <div style={{ color: '#555', fontSize: 11 }}>
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
