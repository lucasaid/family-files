// src/LoadingScreen.tsx
import React from 'react';
import { SyncStatus } from './utils/sync';

const STATUS_LABELS: Record<SyncStatus, string> = {
  'reading-gedcom': 'Loading family tree…',
  'reading-people': 'Reading people…',
  'reading-documents': 'Reading documents…',
  'scanning-images': 'Scanning images for face tags…',
  'syncing-people': 'Syncing people…',
  'done': 'Done',
};

const STATUS_ORDER: SyncStatus[] = [
  'reading-gedcom',
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
      background: 'var(--bg)', color: 'var(--text-1)', fontFamily: 'var(--font-sans)',
    }}>
      <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 32, color: 'var(--accent)' }}>
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
                background: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--bg-elevated)',
                border: `2px solid ${done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {done && <span style={{ color: 'var(--bg)', fontSize: 9, lineHeight: 1 }}>✓</span>}
                {active && (
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--accent)', animation: 'pulse 1s infinite',
                  }} />
                )}
              </div>
              <span style={{
                fontSize: 'var(--font-size-body)',
                color: done ? 'var(--green)' : active ? 'var(--text-1)' : 'var(--text-5)',
              }}>
                {STATUS_LABELS[s]}
              </span>
            </div>
          );
        })}
      </div>

      {addedPeople.length > 0 && (
        <div style={{
          marginTop: 24, padding: '10px 16px', background: 'var(--bg-card)',
          border: '1px solid var(--border-muted)', borderRadius: 6, maxWidth: 320, width: '100%',
        }}>
          <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--green)', marginBottom: 6 }}>
            Added {addedPeople.length} new {addedPeople.length === 1 ? 'person' : 'people'} from image tags:
          </div>
          {addedPeople.map(name => (
            <div key={name} style={{ fontSize: 'var(--font-size-ui)', color: 'var(--text-2)' }}>+ {name}</div>
          ))}
        </div>
      )}

      {error && (
        <div style={{
          marginTop: 24, padding: '10px 16px', background: 'var(--bg-card)',
          border: '1px solid var(--color-error-border)', borderRadius: 6, maxWidth: 320, width: '100%',
          fontSize: 'var(--font-size-ui)', color: 'var(--color-error)',
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
