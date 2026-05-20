// src/People/PersonDocList.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FamilyDocument } from '../context/types';
import { useAppContext } from '../context/AppContext';

interface Props { personId: string }

function docIcon(doc: FamilyDocument) {
  if (doc.type === 'note') return '📝';
  const ext = doc.filePath?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return '📄';
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext ?? '')) return '🖼️';
  return '📎';
}

export default function PersonDocList({ personId }: Props) {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const docs = state.documents.filter(d => d.personIds.includes(personId));

  if (docs.length === 0) return <div style={{ color: '#666', fontSize: 13 }}>No documents linked.</div>;

  const openDoc = (doc: FamilyDocument) => {
    dispatch({ type: 'SET_ACTIVE_DOCUMENT', document: doc });
    navigate('/documents');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {docs.map(doc => (
        <div key={doc.id} onClick={() => openDoc(doc)}
          style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 10px', background: '#1a1a2a', borderRadius: 4, cursor: 'pointer', border: '1px solid #2a2a3a' }}>
          <span style={{ fontSize: 18 }}>{docIcon(doc)}</span>
          <div>
            <div style={{ color: '#ddd', fontSize: 13 }}>{doc.title}</div>
            {doc.date && <div style={{ color: '#666', fontSize: 11 }}>{doc.date}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
