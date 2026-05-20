// src/LoadingScreen.tsx
import React from 'react';
import { SyncStatus } from './utils/sync';

const STATUS_LABELS: Record<SyncStatus, string> = {
  'reading-people': 'Reading people…',
  'reading-documents': 'Reading documents…',
  'scanning-images': 'Scanning images for face tags…',
  'syncing-people': 'Syncing people…',
  'done': 'Done',
};

const STATUS_ORDER: SyncStatus[] = [
  'reading-people',
  'reading-documents',
  'scanning-images',
  'syncing-people',
  'done',
];

interface Props {
  status: SyncStatus;
  addedPeople: string[];
  error: string | null;
}

export default function LoadingScreen({ status, addedPeople, error }: Props) {
  const currentIdx = STATUS_ORDER.indexOf(status);

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#0d0d14', color: '#ddd', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 32, color: '#9bb8f5' }}>
        Family Files
      </div>

      <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {STATUS_ORDER.filter(s => s !== 'done').map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                background: done ? '#4a9a6a' : active ? '#9bb8f5' : '#2a2a3a',
                border: `2px solid ${done ? '#4a9a6a' : active ? '#9bb8f5' : '#3a3a4a'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {done && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1 }}>✓</span>}
                {active && (
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#9bb8f5', animation: 'pulse 1s infinite',
                  }} />
                )}
              </div>
              <span style={{
                fontSize: 13,
                color: done ? '#6a9a6a' : active ? '#ddd' : '#555',
              }}>
                {STATUS_LABELS[s]}
              </span>
            </div>
          );
        })}
      </div>

      {addedPeople.length > 0 && (
        <div style={{
          marginTop: 24, padding: '10px 16px', background: '#1a2a1a',
          border: '1px solid #2a4a2a', borderRadius: 6, maxWidth: 320, width: '100%',
        }}>
          <div style={{ fontSize: 11, color: '#6a9a6a', marginBottom: 6 }}>
            Added {addedPeople.length} new {addedPeople.length === 1 ? 'person' : 'people'} from image tags:
          </div>
          {addedPeople.map(name => (
            <div key={name} style={{ fontSize: 12, color: '#aaa' }}>+ {name}</div>
          ))}
        </div>
      )}

      {error && (
        <div style={{
          marginTop: 24, padding: '10px 16px', background: '#2a1a1a',
          border: '1px solid #4a2a2a', borderRadius: 6, maxWidth: 320, width: '100%',
          fontSize: 12, color: '#e07070',
        }}>
          {error}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
