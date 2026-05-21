// src/People/PersonDocList.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FamilyDocument } from '../context/types';
import { useAppContext } from '../context/AppContext';

interface Props { personId: string }

function docTypeLabel(doc: FamilyDocument): string {
  if (doc.type === 'note') return 'Note';
  const ext = doc.filePath?.split('.').pop()?.toUpperCase();
  return ext ?? 'File';
}

export default function PersonDocList({ personId }: Props) {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const docs = state.documents.filter(d => d.personIds.includes(personId));

  if (docs.length === 0) {
    return <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic', padding: '8px 0' }}>No documents linked.</div>;
  }

  const openDoc = (doc: FamilyDocument) => {
    dispatch({ type: 'SET_ACTIVE_DOCUMENT', document: doc });
    navigate('/documents');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {docs.map(doc => {
        const isHovered = hoveredId === doc.id;
        return (
          <div
            key={doc.id}
            onClick={() => openDoc(doc)}
            onMouseEnter={() => setHoveredId(doc.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
          >
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)', borderRadius: 2, padding: '2px 6px', flexShrink: 0 }}>
              {docTypeLabel(doc)}
            </span>
            <span style={{ flex: 1, fontSize: 13, color: isHovered ? 'var(--text-heading)' : 'var(--text-2)', transition: 'color 0.12s', fontFamily: '"Georgia", "Times New Roman", serif', letterSpacing: '0.01em' }}>
              {doc.title}
            </span>
            {doc.date && <span style={{ fontSize: 10, color: 'var(--text-4)', letterSpacing: '0.04em', flexShrink: 0 }}>{doc.date}</span>}
            <span style={{ fontSize: 10, color: 'var(--accent)', opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}>→</span>
          </div>
        );
      })}
    </div>
  );
}
