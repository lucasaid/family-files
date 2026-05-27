import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { writeSettings } from '../utils/settings';
import { FamilyChartPerson } from '../context/types';

function fcName(fc: FamilyChartPerson) {
  return [fc.data['first name'], fc.data['last name']].filter(Boolean).join(' ');
}

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const { state, dispatch } = useAppContext();
  const [query, setQuery] = useState('');

  const currentStart = state.settings.familyTreeStartId
    ? state.familyChart?.find(fc => fc.id === state.settings.familyTreeStartId) ?? null
    : null;

  const candidates = useMemo(() => {
    if (!state.familyChart) return [];
    const q = query.toLowerCase();
    if (!q) return [...state.familyChart].sort((a, b) => fcName(a).localeCompare(fcName(b)));
    return state.familyChart
      .filter(fc => fcName(fc).toLowerCase().includes(q))
      .sort((a, b) => {
        const aFirst = a.data['first name'].toLowerCase().startsWith(q);
        const bFirst = b.data['first name'].toLowerCase().startsWith(q);
        if (aFirst !== bFirst) return aFirst ? -1 : 1;
        return fcName(a).localeCompare(fcName(b));
      });
  }, [state.familyChart, query]);

  async function select(id: string | undefined) {
    const updated = { ...state.settings, familyTreeStartId: id };
    dispatch({ type: 'SET_SETTINGS', settings: updated });
    await writeSettings(updated);
    setQuery('');
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          width: 480,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '0.01em' }}>
            Settings
          </span>
          <button
            onClick={onClose}
            className="btn-ghost-hover"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Setting: photos always in edit mode */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>
              Photos
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!state.settings.photosAlwaysEdit}
                onChange={async e => {
                  const updated = { ...state.settings, photosAlwaysEdit: e.target.checked };
                  dispatch({ type: 'SET_SETTINGS', settings: updated });
                  await writeSettings(updated);
                }}
                style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--accent)' }}
              />
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-1)' }}>Always show edit fields</div>
                <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
                  Photo metadata is always editable — no need to click Edit first.
                </div>
              </div>
            </label>
          </div>

          {/* Setting: family tree start point */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>
              Family Tree Start Point
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 12 }}>
              The person shown at the centre of the tree when you open Family Tree.
            </div>

            {/* Current selection */}
            {currentStart ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', marginBottom: 12,
                background: 'var(--bg-card)', border: '1px solid var(--accent)',
                borderRadius: 6,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{fcName(currentStart)}</div>
                  {currentStart.data.birthday && (
                    <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>b. {currentStart.data.birthday}</div>
                  )}
                </div>
                <button
                  onClick={() => select(undefined)}
                  className="btn-ghost-hover"
                  style={{ background: 'none', border: '1px solid var(--border-muted)', borderRadius: 4, padding: '3px 9px', fontSize: 11, cursor: 'pointer', color: 'var(--text-4)' }}
                >
                  Clear
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-4)', fontStyle: 'italic', marginBottom: 12 }}>
                No start point set — tree opens on the first person in the file.
              </div>
            )}

            {/* Search — only shown when no start point is set */}
            {!currentStart && state.familyChart && state.familyChart.length > 0 && (
              <div style={{ border: '1px solid var(--border-muted)', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ padding: '9px 12px', borderBottom: '1px solid var(--border-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-4)' }}>⌕</span>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search family tree…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-1)' }}
                  />
                  {query && (
                    <button onClick={() => setQuery('')} className="btn-ghost-hover" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                  )}
                </div>
                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                  {candidates.length === 0 ? (
                    <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-4)' }}>No matches</div>
                  ) : (
                    candidates.map(fc => {
                      const isSelected = fc.id === state.settings.familyTreeStartId;
                      return (
                        <button
                          key={fc.id}
                          onClick={() => select(isSelected ? undefined : fc.id)}
                          className="btn-ghost-hover"
                          style={{
                            width: '100%', textAlign: 'left', background: isSelected ? 'var(--bg-elevated)' : 'none',
                            border: 'none', borderBottom: '1px solid var(--border-muted)',
                            padding: '9px 14px', cursor: 'pointer',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                          }}
                        >
                          <span style={{ fontSize: 13, color: isSelected ? 'var(--accent)' : 'var(--text-1)' }}>
                            {fcName(fc)}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            {fc.data.birthday && (
                              <span style={{ fontSize: 11, color: 'var(--text-4)' }}>b. {fc.data.birthday}</span>
                            )}
                            {isSelected && (
                              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)' }}>Selected</span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {!currentStart && !state.familyChart && (
              <div style={{ fontSize: 12, color: 'var(--text-4)', fontStyle: 'italic' }}>
                No family tree loaded — add a family-tree.ged file to enable this setting.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
