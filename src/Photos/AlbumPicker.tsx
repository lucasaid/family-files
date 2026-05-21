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

  const labelFor = (a: string) => a === NO_ALBUM ? 'No album' : a;
  const currentLabel = labelFor(currentAlbum);

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        onClick={() => !moving && setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: open ? 'rgba(74,112,192,.1)' : '#0d0d14',
          border: `1px solid ${open ? 'rgba(74,112,192,.5)' : '#2a2a3a'}`,
          borderRadius: 3, padding: '5px 10px',
          color: currentAlbum ? '#c8d8f8' : '#555',
          fontSize: 12, fontFamily: 'system-ui, sans-serif',
          cursor: moving ? 'wait' : 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
          textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {moving ? 'Moving…' : currentLabel}
        </span>
        <span style={{ fontSize: 9, color: '#444', marginLeft: 6, flexShrink: 0 }}>▾</span>
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
            background: 'rgba(10, 13, 22, 0.97)',
            border: '1px solid rgba(74,112,192,.5)',
            borderRadius: 6,
            zIndex: 300,
            boxShadow: '0 8px 32px rgba(0,0,0,.7), 0 0 0 1px rgba(74,112,192,.15)',
            overflow: 'hidden',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Search input */}
          <div style={{ padding: '8px 10px 6px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                fontSize: 11, color: '#3a5080', pointerEvents: 'none', userSelect: 'none',
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
                  border: '1px solid rgba(74,112,192,.3)',
                  borderRadius: 4, padding: '5px 8px 5px 24px',
                  color: '#d0dff8', fontSize: 12,
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
              <div style={{ padding: '10px 12px', fontSize: 11, color: '#3a4a6a', fontStyle: 'italic' }}>
                No albums found
              </div>
            )}
            {filtered.map((album, i) => {
              const isActive = i === activeIdx;
              const isCurrent = album === currentAlbum;
              const label = labelFor(album);
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
                    padding: '0 12px',
                    fontSize: 12,
                    color: isActive ? '#d0dff8' : isCurrent ? '#9bb8f5' : '#7a90b8',
                    background: isActive ? 'rgba(74,112,192,.18)' : 'transparent',
                    borderLeft: `2px solid ${isActive ? '#4a70c0' : 'transparent'}`,
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
                        <mark style={{ background: 'rgba(155,184,245,.25)', color: '#c8d8f8', borderRadius: 2, padding: '0 1px' }}>
                          {label.slice(matchIdx, matchIdx + q.length)}
                        </mark>
                        {label.slice(matchIdx + q.length)}
                      </>
                    ) : label}
                  </span>
                  {isCurrent && (
                    <span style={{ fontSize: 9, color: '#4a70c0', letterSpacing: '0.06em' }}>current</span>
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
                  color: activeIdx === filtered.length ? '#7ecfa0' : '#3a6a4a',
                  background: activeIdx === filtered.length ? 'rgba(126,207,160,.1)' : 'transparent',
                  borderTop: filtered.length > 0 ? '1px solid rgba(255,255,255,.05)' : 'none',
                  borderLeft: `2px solid ${activeIdx === filtered.length ? '#7ecfa0' : 'transparent'}`,
                  cursor: 'pointer',
                  transition: 'background 0.08s, color 0.08s',
                  userSelect: 'none',
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1, opacity: 0.8 }}>+</span>
                <span>
                  Create <span style={{ color: activeIdx === filtered.length ? '#a0e8bc' : '#4a8a5a', fontStyle: 'italic' }}>"{trimmed}"</span>
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '5px 12px', borderTop: '1px solid rgba(255,255,255,.04)', display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 9, color: '#2a3a5a', letterSpacing: '0.06em', textTransform: 'uppercase' }}>↑↓ navigate</span>
            <span style={{ fontSize: 9, color: '#2a3a5a', letterSpacing: '0.06em', textTransform: 'uppercase' }}>↵ move</span>
            <span style={{ fontSize: 9, color: '#2a3a5a', letterSpacing: '0.06em', textTransform: 'uppercase' }}>esc cancel</span>
          </div>
        </div>
      )}
    </div>
  );
}
