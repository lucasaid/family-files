// src/Photos/AlbumPicker.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { movePhotoToAlbum, createAlbum } from '../utils/albums';

const ITEM_HEIGHT = 30;
const MAX_VISIBLE = 6;

export default function AlbumPicker() {
  const { state, dispatch } = useAppContext();
  const { activePhoto, albums } = state;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [moving, setMoving] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // All options: "No album" sentinel + album names
  const NO_ALBUM = '';
  const allOptions = [NO_ALBUM, ...albums];

  const trimmed = query.trim();
  const filtered = allOptions.filter(a =>
    a.toLowerCase().includes(query.toLowerCase())
  );
  const exactMatch = albums.some(a => a.toLowerCase() === trimmed.toLowerCase());
  const canAddNew = trimmed.length > 0 && !exactMatch;
  const totalItems = filtered.length + (canAddNew ? 1 : 0);

  useEffect(() => { setActiveIdx(0); }, [query]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[activeIdx] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) { setQuery(''); setActiveIdx(0); inputRef.current?.focus(); }
  }, [open]);

  if (!activePhoto) return null;

  const currentAlbum = activePhoto.album ?? NO_ALBUM;

  const select = async (album: string) => {
    const target = album === NO_ALBUM ? null : album;
    if (target === activePhoto.album) { setOpen(false); return; }
    setMoving(true);
    setOpen(false);
    try {
      const { newFsPath, newPath } = await movePhotoToAlbum(activePhoto.fsPath, target);
      dispatch({ type: 'MOVE_PHOTO_TO_ALBUM', file: activePhoto.file, album: target, newFsPath, newPath });
    } catch (err) {
      alert(`Failed to move photo: ${(err as Error).message}`);
    } finally {
      setMoving(false);
    }
  };

  const createAndMove = async () => {
    if (!trimmed) return;
    setMoving(true);
    setOpen(false);
    try {
      await createAlbum(trimmed);
      dispatch({ type: 'ADD_ALBUM', name: trimmed });
      const { newFsPath, newPath } = await movePhotoToAlbum(activePhoto.fsPath, trimmed);
      dispatch({ type: 'MOVE_PHOTO_TO_ALBUM', file: activePhoto.file, album: trimmed, newFsPath, newPath });
    } catch (err) {
      alert(`Failed to create album: ${(err as Error).message}`);
    } finally {
      setMoving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, totalItems - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx < filtered.length) select(filtered[activeIdx]);
      else if (canAddNew) createAndMove();
    }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  const labelFor = (a: string) => a === NO_ALBUM ? 'No album' : a.split('/').pop()!;
  const depthOf = (a: string) => a === NO_ALBUM ? 0 : a.split('/').length - 1;
  const currentLabel = labelFor(currentAlbum);

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        onClick={() => !moving && setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: open ? 'rgba(74,112,192,.1)' : 'var(--input-bg)',
          border: `1px solid ${open ? 'var(--overlay-border)' : 'var(--input-border)'}`,
          borderRadius: 3, padding: '5px 10px',
          color: currentAlbum ? 'var(--text-1)' : 'var(--text-4)',
          fontSize: 12, fontFamily: 'system-ui, sans-serif',
          cursor: moving ? 'wait' : 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
          textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {moving ? 'Moving…' : currentLabel}
        </span>
        <span style={{ fontSize: 9, color: 'var(--text-4)', marginLeft: 6, flexShrink: 0 }}>▾</span>
      </button>

      {/* Palette */}
      {open && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0, right: 0,
            marginBottom: 4,
            background: 'var(--overlay-bg)',
            border: '1px solid var(--overlay-border)',
            borderRadius: 6,
            zIndex: 300,
            boxShadow: 'var(--overlay-shadow)',
            overflow: 'hidden',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Search input */}
          <div style={{ padding: '8px 10px 6px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                fontSize: 11, color: 'var(--overlay-search-icon)', pointerEvents: 'none', userSelect: 'none',
              }}>
                ⌕
              </span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search albums…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,.04)',
                  border: '1px solid var(--overlay-input-border)',
                  borderRadius: 4, padding: '5px 8px 5px 24px',
                  color: 'var(--overlay-text)', fontSize: 12,
                  fontFamily: 'system-ui, sans-serif',
                  outline: 'none', letterSpacing: '0.01em',
                }}
              />
            </div>
          </div>

          {/* List */}
          <div
            ref={listRef}
            style={{ maxHeight: ITEM_HEIGHT * MAX_VISIBLE, overflowY: 'auto', overflowX: 'hidden' }}
          >
            {filtered.length === 0 && !canAddNew && (
              <div style={{ padding: '10px 12px', fontSize: 11, color: 'var(--overlay-text-dim)', fontStyle: 'italic' }}>
                No albums found
              </div>
            )}
            {filtered.map((album, i) => {
              const isActive = i === activeIdx;
              const isCurrent = album === currentAlbum;
              const label = labelFor(album);
              const depth = depthOf(album);
              const q = query.toLowerCase();
              const lbl = label.toLowerCase();
              const matchIdx = q ? lbl.indexOf(q) : -1;

              return (
                <div
                  key={album === NO_ALBUM ? '__none__' : album}
                  onClick={() => select(album)}
                  onMouseEnter={() => setActiveIdx(i)}
                  style={{
                    height: ITEM_HEIGHT,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    paddingLeft: 12 + depth * 14, paddingRight: 12,
                    fontSize: 12,
                    color: isActive ? 'var(--overlay-text)' : isCurrent ? 'var(--accent)' : 'var(--overlay-text-muted)',
                    background: isActive ? 'var(--overlay-active-bg)' : 'transparent',
                    borderLeft: `2px solid ${isActive ? 'var(--overlay-active-border)' : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'background 0.08s, color 0.08s',
                    userSelect: 'none',
                    fontStyle: album === NO_ALBUM ? 'italic' : 'normal',
                  }}
                >
                  <span>
                    {q && matchIdx >= 0 ? (
                      <>
                        {label.slice(0, matchIdx)}
                        <mark style={{ background: 'rgba(155,184,245,.25)', color: 'var(--overlay-text)', borderRadius: 2, padding: '0 1px' }}>
                          {label.slice(matchIdx, matchIdx + q.length)}
                        </mark>
                        {label.slice(matchIdx + q.length)}
                      </>
                    ) : label}
                  </span>
                  {isCurrent && (
                    <span style={{ fontSize: 9, color: 'var(--overlay-active-border)', letterSpacing: '0.06em' }}>current</span>
                  )}
                </div>
              );
            })}

            {canAddNew && (
              <div
                onClick={createAndMove}
                onMouseEnter={() => setActiveIdx(filtered.length)}
                style={{
                  height: ITEM_HEIGHT,
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '0 12px',
                  fontSize: 12,
                  color: activeIdx === filtered.length ? 'var(--overlay-new-text-active)' : 'var(--overlay-new-text)',
                  background: activeIdx === filtered.length ? 'var(--overlay-new-bg-active)' : 'transparent',
                  borderTop: filtered.length > 0 ? '1px solid rgba(255,255,255,.05)' : 'none',
                  borderLeft: `2px solid ${activeIdx === filtered.length ? 'var(--overlay-new-text-active)' : 'transparent'}`,
                  cursor: 'pointer',
                  transition: 'background 0.08s, color 0.08s',
                  userSelect: 'none',
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1, opacity: 0.8 }}>+</span>
                <span>
                  Create <span style={{ color: activeIdx === filtered.length ? 'var(--overlay-new-mark-active)' : 'var(--overlay-new-mark)', fontStyle: 'italic' }}>"{trimmed}"</span>
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '5px 12px', borderTop: '1px solid rgba(255,255,255,.04)', display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 9, color: 'var(--overlay-text-hint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>↑↓ navigate</span>
            <span style={{ fontSize: 9, color: 'var(--overlay-text-hint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>↵ move</span>
            <span style={{ fontSize: 9, color: 'var(--overlay-text-hint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>esc cancel</span>
          </div>
        </div>
      )}
    </div>
  );
}
