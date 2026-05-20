// src/Documents/DocumentViewer.tsx
import React from 'react';
import { FamilyDocument } from '../context/types';

const path = (window as any).require('path') as typeof import('path');
const { shell } = (window as any).require('electron');

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

function getExt(filePath: string) {
  return filePath.split('.').pop()?.toLowerCase() ?? '';
}

interface Props { doc: FamilyDocument }

export default function DocumentViewer({ doc }: Props) {
  if (doc.type === 'note') {
    return (
      <div style={{ padding: 16, color: '#bbb', fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
        {doc.content || <span style={{ color: '#555' }}>No content.</span>}
      </div>
    );
  }

  if (!doc.filePath) return <div style={{ padding: 16, color: '#666' }}>No file attached.</div>;

  const docsDir = path.join(process.cwd(), 'public', 'documents');
  const fullPath = path.join(docsDir, doc.filePath);
  const ext = getExt(doc.filePath);

  if (IMAGE_EXTS.includes(ext)) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <img src={fullPath} alt={doc.title} style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain', borderRadius: 4 }} />
      </div>
    );
  }

  if (ext === 'pdf') {
    return (
      <embed src={fullPath} type="application/pdf" style={{ width: '100%', height: 500, border: 'none' }} />
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>{doc.filePath}</div>
      <button
        onClick={() => shell.openPath(fullPath)}
        style={{ background: '#2d3a5a', border: '1px solid #3a4a7a', borderRadius: 4, padding: '6px 16px', color: '#9bb8f5', cursor: 'pointer', fontSize: 13 }}
      >
        Open in default app
      </button>
    </div>
  );
}
