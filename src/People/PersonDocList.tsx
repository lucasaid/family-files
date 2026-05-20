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
    return (
      <div style={{ color: '#444', fontSize: 13, fontStyle: 'italic', padding: '8px 0' }}>
        No documents linked.
      </div>
    );
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
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '10px 0',
              borderBottom: '1px solid #1a1a26',
              cursor: 'pointer',
            }}
          >
            {/* Type pill */}
            <span style={{
              fontSize: 9, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: '#555',
              background: '#141420', border: '1px solid #222',
              borderRadius: 2, padding: '2px 6px',
              flexShrink: 0,
            }}>
              {docTypeLabel(doc)}
            </span>

            {/* Title */}
            <span style={{
              flex: 1, fontSize: 13,
              color: isHovered ? '#c8d8f8' : '#aaa',
              transition: 'color 0.12s',
              fontFamily: '"Georgia", "Times New Roman", serif',
              letterSpacing: '0.01em',
            }}>
              {doc.title}
            </span>

            {/* Date */}
            {doc.date && (
              <span style={{ fontSize: 10, color: '#444', letterSpacing: '0.04em', flexShrink: 0 }}>
                {doc.date}
              </span>
            )}

            {/* Arrow — visible on hover */}
            <span style={{
              fontSize: 10, color: '#9bb8f5',
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 0.15s',
              flexShrink: 0,
            }}>
              →
            </span>
          </div>
        );
      })}
    </div>
  );
}
