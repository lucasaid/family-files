// src/Documents/index.tsx
import React from 'react';
import DocumentList from './DocumentList';
import DocumentPanel from './DocumentPanel';

export default function DocumentsRoute() {
  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>
      <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid #2a2a3a', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <DocumentList />
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: '#161622' }}>
        <DocumentPanel />
      </div>
    </div>
  );
}
