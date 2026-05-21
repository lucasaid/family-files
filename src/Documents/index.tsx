// src/Documents/index.tsx
import React from 'react';
import DocumentList from './DocumentList';
import DocumentPanel from './DocumentPanel';

export default function DocumentsRoute() {
  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>
      <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <DocumentList />
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-panel)' }}>
        <DocumentPanel />
      </div>
    </div>
  );
}
