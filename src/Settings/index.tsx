import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { writeSettings } from '../utils/settings';
import { FamilyChartPerson } from '../context/types';
import { fcName } from '../utils/people';

function Tip({ kbd, children }: { kbd: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{
        flexShrink: 0,
        fontSize: 10, fontWeight: 600,
        background: 'var(--bg)', border: '1px solid var(--border-muted)',
        borderRadius: 4, padding: '1px 6px',
        color: 'var(--text-2)', letterSpacing: '0.03em',
        fontFamily: 'var(--font-mono)',
      }}>
        {kbd}
      </span>
      <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)', lineHeight: 1.4 }}>{children}</span>
    </div>
  );
}

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const { state, dispatch } = useAppContext();
  const [query, setQuery] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Save previous focus, move focus into modal, restore on close
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    closeButtonRef.current?.focus();
    return () => { previousFocusRef.current?.focus(); };
  }, []);

  // Focus trap
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const focusable = Array.from(modal!.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    modal.addEventListener('keydown', onKeyDown);
    return () => modal.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

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
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
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
          <span id="settings-modal-title" style={{ fontSize: 'var(--font-size-title)', fontWeight: 600, color: 'var(--text-1)', letterSpacing: 'var(--tracking-tight)' }}>
            Settings
          </span>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close settings"
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
            <div style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>
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
                <div style={{ fontSize: 'var(--font-size-body)', color: 'var(--text-1)' }}>Always show edit fields</div>
                <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)', marginTop: 2 }}>
                  Photo metadata is always editable — no need to click Edit first.
                </div>
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 10 }}>
              <input
                type="checkbox"
                checked={!!state.settings.photosSaveOnNavigate}
                onChange={async e => {
                  const updated = { ...state.settings, photosSaveOnNavigate: e.target.checked };
                  dispatch({ type: 'SET_SETTINGS', settings: updated });
                  await writeSettings(updated);
                }}
                style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--accent)' }}
              />
              <div>
                <div style={{ fontSize: 'var(--font-size-body)', color: 'var(--text-1)' }}>Save on navigate away</div>
                <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)', marginTop: 2 }}>
                  Automatically save unsaved metadata changes when switching to another photo.
                </div>
              </div>
            </label>

            {(state.settings.photosAlwaysEdit || state.settings.photosSaveOnNavigate) && (
              <div style={{
                marginTop: 14,
                padding: '10px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-muted)',
                borderRadius: 6,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}>
                <div style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, color: 'var(--text-3)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase' }}>
                  How it works
                </div>
                <Tip kbd="⌥ ← / ⌥ →">
                  Navigate to the previous or next photo from any metadata field.
                </Tip>
                {state.settings.photosAlwaysEdit && (
                  <Tip kbd="↵ Enter">
                    Save changes from any single-line field without clicking Save.
                  </Tip>
                )}
                {state.settings.photosSaveOnNavigate && (
                  <Tip kbd="Auto-save">
                    Any unsaved changes are written to the file automatically when you navigate away.
                  </Tip>
                )}
              </div>
            )}
          </div>

          {/* Setting: family tree start point */}
          <div>
            <div style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>
              Family Tree Start Point
            </div>
            <div style={{ fontSize: 'var(--font-size-ui)', color: 'var(--text-4)', marginBottom: 12 }}>
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
                  <div style={{ fontSize: 'var(--font-size-body)', fontWeight: 500, color: 'var(--text-1)' }}>{fcName(currentStart)}</div>
                  {currentStart.data.birthday && (
                    <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)', marginTop: 2 }}>b. {currentStart.data.birthday}</div>
                  )}
                </div>
                <button
                  onClick={() => select(undefined)}
                  className="btn-ghost-hover"
                  style={{ background: 'none', border: '1px solid var(--border-muted)', borderRadius: 4, padding: '3px 9px', fontSize: 'var(--font-size-label)', cursor: 'pointer', color: 'var(--text-4)' }}
                >
                  Clear
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 'var(--font-size-ui)', color: 'var(--text-4)', fontStyle: 'italic', marginBottom: 12 }}>
                No start point set — tree opens on the first person in the file.
              </div>
            )}

            {/* Search — only shown when no start point is set */}
            {!currentStart && state.familyChart && state.familyChart.length > 0 && (
              <div style={{ border: '1px solid var(--border-muted)', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ padding: '9px 12px', borderBottom: '1px solid var(--border-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 'var(--font-size-ui)', color: 'var(--text-4)' }}>⌕</span>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search family tree…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    style={{ flex: 1, background: 'none', border: 'none', fontSize: 'var(--font-size-body)', color: 'var(--text-1)' }}
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="btn-ghost-hover" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 'var(--font-size-title)', lineHeight: 1, padding: 0 }}>×</button>
                  )}
                </div>
                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                  {candidates.length === 0 ? (
                    <div style={{ padding: '12px 14px', fontSize: 'var(--font-size-body)', color: 'var(--text-4)' }}>No matches</div>
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
                          <span style={{ fontSize: 'var(--font-size-body)', color: isSelected ? 'var(--accent)' : 'var(--text-1)' }}>
                            {fcName(fc)}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            {fc.data.birthday && (
                              <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)' }}>b. {fc.data.birthday}</span>
                            )}
                            {isSelected && (
                              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase', color: 'var(--accent)' }}>Selected</span>
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
              <div style={{ fontSize: 'var(--font-size-ui)', color: 'var(--text-4)', fontStyle: 'italic' }}>
                No family tree loaded — add a family-tree.ged file to enable this setting.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
