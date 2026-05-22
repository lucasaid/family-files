// src/Photos/FaceTagger.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { writeFaceRegions } from '../utils/exiftool';
import { writePeopleJson } from '../utils/people';
import { FaceRegion, Person } from '../context/types';

interface Props { filePath: string; fileName: string }
interface Box { x: number; y: number; w: number; h: number }

const ITEM_HEIGHT = 30;
const MAX_VISIBLE = 6;

export default function FaceTagger({ filePath, fileName }: Props) {
  const { state, dispatch } = useAppContext();
  const { people, activePhoto } = state;
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);
  const [startPct, setStartPct] = useState<{ x: number; y: number } | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [nameQuery, setNameQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => { setBox(null); setNameQuery(''); setActiveIdx(0); }, [fileName]);

  useEffect(() => {
    if (!dragging) return;
    const stop = () => setDragging(false);
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, [dragging]);

  // Reset active index when query changes
  useEffect(() => { setActiveIdx(0); }, [nameQuery]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[activeIdx] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  function pctFromEvent(e: React.MouseEvent) {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  }

  const onMouseDown = (e: React.MouseEvent) => {
    const pct = pctFromEvent(e);
    if (!pct) return;
    setStartPct(pct); setDragging(true); setBox(null); setNameQuery('');
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !startPct) return;
    const cur = pctFromEvent(e);
    if (!cur) return;
    setBox({ x: Math.min(startPct.x, cur.x), y: Math.min(startPct.y, cur.y), w: Math.abs(cur.x - startPct.x), h: Math.abs(cur.y - startPct.y) });
  };
  const onMouseUp = () => setDragging(false);

  const filteredPeople = people.filter(p => p.name.toLowerCase().includes(nameQuery.toLowerCase()));
  const trimmed = nameQuery.trim();
  const exactMatch = people.find(p => p.name.toLowerCase() === trimmed.toLowerCase());
  const canAddNew = trimmed.length > 0 && !exactMatch;
  const totalItems = filteredPeople.length + (canAddNew ? 1 : 0);

  const confirmTag = async (person: Person) => {
    if (!box || !activePhoto) return;
    setSaving(true);
    const region: FaceRegion = { personId: person.id, name: person.name, x: box.x, y: box.y, w: box.w, h: box.h };
    try {
      await writeFaceRegions(filePath, [...activePhoto.faces, region]);
      dispatch({ type: 'ADD_FACE_REGION', file: fileName, region });
    } catch (err) {
      alert(`Failed to save face tag: ${(err as Error).message}`);
    } finally {
      setSaving(false);
      setBox(null);
    }
  };

  const createAndTag = async () => {
    if (!trimmed) return;
    const person: Person = { id: crypto.randomUUID(), name: trimmed };
    dispatch({ type: 'ADD_PERSON', person });
    try { await writePeopleJson([...people, person]); } catch { /* non-fatal */ }
    confirmTag(person);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx < filteredPeople.length) confirmTag(filteredPeople[activeIdx]);
      else if (canAddNew) createAndTag();
    } else if (e.key === 'Escape') {
      setBox(null);
    }
  };

  // Decide whether dropdown opens upward or downward based on box position
  const opensUpward = box ? box.y > 0.5 : true;

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{ position: 'absolute', inset: 0, cursor: saving ? 'wait' : 'crosshair' }}
    >
      {/* Selection rectangle */}
      {box && (
        <div style={{
          position: 'absolute',
          left: `${box.x * 100}%`, top: `${box.y * 100}%`,
          width: `${box.w * 100}%`, height: `${box.h * 100}%`,
          border: saving ? '2px solid rgba(155,184,245,.6)' : '2px dashed rgba(255,255,255,.8)',
          background: saving ? 'rgba(155,184,245,.08)' : 'rgba(255,255,255,.04)',
          pointerEvents: 'none',
          transition: 'border-color 0.2s, background 0.2s',
        }} />
      )}

      {/* Picker panel */}
      {box && !dragging && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: `${Math.min(box.x * 100, 70)}%`,
            ...(opensUpward
              ? { top: `${box.y * 100}%`, transform: 'translateY(-100%) translateY(-4px)' }
              : { top: `${(box.y + box.h) * 100}%`, transform: 'translateY(4px)' }),
            width: 210,
            background: 'var(--overlay-bg)',
            border: '1px solid var(--overlay-border)',
            borderRadius: 6,
            zIndex: 200,
            boxShadow: 'var(--overlay-shadow)',
            overflow: 'hidden',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Search input */}
          <div style={{
            padding: '8px 10px 6px',
            borderBottom: '1px solid rgba(255,255,255,.06)',
          }}>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                fontSize: 11, color: 'var(--overlay-search-icon)', pointerEvents: 'none', userSelect: 'none',
              }}>
                ⌕
              </span>
              <input
                ref={inputRef}
                autoFocus
                value={nameQuery}
                onChange={e => setNameQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search people…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,.04)',
                  border: '1px solid var(--overlay-input-border)',
                  borderRadius: 4,
                  padding: '5px 8px 5px 24px',
                  color: 'var(--overlay-text)',
                  fontSize: 12,
                  fontFamily: 'system-ui, sans-serif',
                  outline: 'none',
                  letterSpacing: '0.01em',
                }}
              />
            </div>
            {saving && (
              <div style={{
                fontSize: 10, color: 'var(--accent)', letterSpacing: '0.08em',
                textTransform: 'uppercase', marginTop: 5, textAlign: 'center',
                animation: 'facePulse 1.2s ease-in-out infinite',
              }}>
                Saving…
              </div>
            )}
          </div>

          {/* Results list */}
          <div
            ref={listRef}
            style={{
              maxHeight: ITEM_HEIGHT * MAX_VISIBLE,
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            {filteredPeople.length === 0 && !canAddNew && (
              <div style={{
                padding: '10px 12px',
                fontSize: 11, color: 'var(--overlay-text-dim)',
                fontStyle: 'italic', letterSpacing: '0.02em',
              }}>
                No people found
              </div>
            )}

            {filteredPeople.map((p, i) => {
              const isActive = i === activeIdx;
              // Highlight matching characters
              const query = nameQuery.toLowerCase();
              const nameL = p.name.toLowerCase();
              const matchIdx = nameL.indexOf(query);

              return (
                <div
                  key={p.id}
                  onClick={() => !saving && confirmTag(p)}
                  onMouseEnter={() => setActiveIdx(i)}
                  style={{
                    height: ITEM_HEIGHT,
                    display: 'flex', alignItems: 'center',
                    padding: '0 12px',
                    fontSize: 12,
                    color: isActive ? 'var(--overlay-text)' : 'var(--overlay-text-muted)',
                    background: isActive ? 'var(--overlay-active-bg)' : 'transparent',
                    cursor: saving ? 'wait' : 'pointer',
                    transition: 'background 0.08s, color 0.08s',
                    borderLeft: `2px solid ${isActive ? 'var(--overlay-active-border)' : 'transparent'}`,
                    letterSpacing: '0.01em',
                    userSelect: 'none',
                    position: 'relative',
                  }}
                >
                  {query && matchIdx >= 0 ? (
                    <span>
                      {p.name.slice(0, matchIdx)}
                      <mark style={{ background: 'rgba(155,184,245,.25)', color: 'var(--overlay-text)', borderRadius: 2, padding: '0 1px' }}>
                        {p.name.slice(matchIdx, matchIdx + query.length)}
                      </mark>
                      {p.name.slice(matchIdx + query.length)}
                    </span>
                  ) : p.name}
                </div>
              );
            })}

            {canAddNew && (
              <div
                onClick={() => !saving && createAndTag()}
                onMouseEnter={() => setActiveIdx(filteredPeople.length)}
                style={{
                  height: ITEM_HEIGHT,
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '0 12px',
                  fontSize: 12,
                  color: activeIdx === filteredPeople.length ? 'var(--overlay-new-text-active)' : 'var(--overlay-new-text)',
                  background: activeIdx === filteredPeople.length ? 'var(--overlay-new-bg-active)' : 'transparent',
                  borderTop: filteredPeople.length > 0 ? '1px solid rgba(255,255,255,.05)' : 'none',
                  borderLeft: `2px solid ${activeIdx === filteredPeople.length ? 'var(--overlay-new-text-active)' : 'transparent'}`,
                  cursor: saving ? 'wait' : 'pointer',
                  transition: 'background 0.08s, color 0.08s',
                  userSelect: 'none',
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1, opacity: 0.8 }}>+</span>
                <span>
                  Add <span style={{ color: activeIdx === filteredPeople.length ? 'var(--overlay-new-mark-active)' : 'var(--overlay-new-mark)', fontStyle: 'italic' }}>"{trimmed}"</span>
                </span>
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div style={{
            padding: '5px 12px',
            borderTop: '1px solid rgba(255,255,255,.04)',
            display: 'flex', gap: 10,
          }}>
            <span style={{ fontSize: 9, color: 'var(--overlay-text-hint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>↑↓ navigate</span>
            <span style={{ fontSize: 9, color: 'var(--overlay-text-hint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>↵ select</span>
            <span style={{ fontSize: 9, color: 'var(--overlay-text-hint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>esc cancel</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes facePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
