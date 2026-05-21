// src/Documents/DocumentViewer.tsx
import React from 'react';
import { FamilyDocument } from '../context/types';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

function getExt(filePath: string) {
  return filePath.split('.').pop()?.toLowerCase() ?? '';
}

interface Props { doc: FamilyDocument }

export default function DocumentViewer({ doc }: Props) {
  if (doc.type === 'note') {
    return (
      <div style={{ padding: 16, color: 'var(--text-2)', fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
        {doc.content || <span style={{ color: 'var(--text-5)' }}>No content.</span>}
      </div>
    );
  }

  if (!doc.filePath) return <div style={{ padding: 16, color: 'var(--text-4)' }}>No file attached.</div>;

  const { shell } = (window as any).require('electron');
  const path = (window as any).require('path') as typeof import('path');
  const ext = getExt(doc.filePath);
  const fullPath = path.join(process.cwd(), 'documents', doc.filePath);
  const fileUrl = `file://${fullPath}`;

  if (IMAGE_EXTS.includes(ext)) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <img src={fileUrl} alt={doc.title} style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain', borderRadius: 4 }} />
      </div>
    );
  }

  if (ext === 'pdf') {
    return (
      <embed src={fileUrl} type="application/pdf" style={{ width: '100%', height: 500, border: 'none' }} />
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 12 }}>{doc.filePath}</div>
      <button
        onClick={() => shell.openPath(fullPath)}
        style={{ background: 'var(--btn-primary-bg)', border: '1px solid var(--btn-primary-border)', borderRadius: 4, padding: '6px 16px', color: 'var(--btn-primary-text)', cursor: 'pointer', fontSize: 13 }}
      >
        Open in default app
      </button>
    </div>
  );
}
