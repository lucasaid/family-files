// src/Documents/DocumentPanel.tsx
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { writeDocumentsJson } from '../utils/documents';
import DocumentViewer from './DocumentViewer';
import DocumentFields from './DocumentFields';
import DocumentPeople from './DocumentPeople';

export default function DocumentPanel() {
  const { state, dispatch } = useAppContext();
  const { activeDocument, documents } = state;

  if (!activeDocument) {
    return <div style={{ padding: 24, color: '#666', fontSize: 13 }}>Select a document from the list.</div>;
  }

  const deleteDoc = async () => {
    if (!window.confirm(`Delete "${activeDocument.title}"? The file will not be removed from disk.`)) return;
    const all = documents.filter(d => d.id !== activeDocument.id);
    dispatch({ type: 'REMOVE_DOCUMENT', id: activeDocument.id });
    try {
      await writeDocumentsJson(all);
    } catch (err) {
      dispatch({ type: 'ADD_DOCUMENT', document: activeDocument });
      alert(`Failed to delete: ${(err as Error).message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid #2a2a3a', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#ddd', fontSize: 13, fontWeight: 'bold' }}>{activeDocument.title}</span>
        <button onClick={deleteDoc}
          style={{ background: 'none', border: 'none', color: '#e55', cursor: 'pointer', fontSize: 12 }}>
          Delete
        </button>
      </div>
      <DocumentViewer doc={activeDocument} />
      <div style={{ borderTop: '1px solid #2a2a3a' }}>
        <DocumentFields />
        <DocumentPeople />
      </div>
    </div>
  );
}
