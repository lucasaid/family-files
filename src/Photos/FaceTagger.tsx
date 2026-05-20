// src/Photos/FaceTagger.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { writeFaceRegions } from '../utils/exiftool';
import { FaceRegion } from '../context/types';

interface Props {
  filePath: string;
  fileName: string;
}

interface Box { x: number; y: number; w: number; h: number }

export default function FaceTagger({ filePath, fileName }: Props) {
  const { state, dispatch } = useAppContext();
  const { people, activePhoto } = state;
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [startPct, setStartPct] = useState<{ x: number; y: number } | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [nameQuery, setNameQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBox(null);
    setNameQuery('');
  }, [fileName]);

  useEffect(() => {
    if (!dragging) return;
    const stop = () => setDragging(false);
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, [dragging]);

  function pctFromEvent(e: React.MouseEvent): { x: number; y: number } | null {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  const onMouseDown = (e: React.MouseEvent) => {
    const pct = pctFromEvent(e);
    if (!pct) return;
    setStartPct(pct);
    setDragging(true);
    setBox(null);
    setNameQuery('');
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !startPct) return;
    const cur = pctFromEvent(e);
    if (!cur) return;
    setBox({
      x: Math.min(startPct.x, cur.x),
      y: Math.min(startPct.y, cur.y),
      w: Math.abs(cur.x - startPct.x),
      h: Math.abs(cur.y - startPct.y),
    });
  };

  const onMouseUp = () => { setDragging(false); };

  const filteredPeople = people.filter(p =>
    p.name.toLowerCase().includes(nameQuery.toLowerCase())
  );

  const confirmTag = async (name: string) => {
    if (!box || !activePhoto) return;
    setSaving(true);
    const region: FaceRegion = {
      personId: people.find(p => p.name === name)?.id ?? null,
      name,
      x: box.x, y: box.y, w: box.w, h: box.h,
    };
    try {
      const updatedFaces = [...activePhoto.faces, region];
      await writeFaceRegions(filePath, updatedFaces);
      dispatch({ type: 'ADD_FACE_REGION', file: fileName, region });
      dispatch({ type: 'SET_TAGGING_MODE', enabled: false });
    } catch (err) {
      alert(`Failed to save face tag: ${(err as Error).message}`);
    } finally {
      setSaving(false);
      setBox(null);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{ position: 'absolute', inset: 0, cursor: 'crosshair' }}
    >
      {box && (
        <div style={{
          position: 'absolute',
          left: `${box.x * 100}%`, top: `${box.y * 100}%`,
          width: `${box.w * 100}%`, height: `${box.h * 100}%`,
          border: '2px dashed #fff', background: 'rgba(255,255,255,.05)',
          pointerEvents: 'none',
        }} />
      )}
      {box && !dragging && (
        <div style={{
          position: 'absolute',
          left: `${box.x * 100}%`,
          top: `${box.y * 100}%`,
          transform: 'translateY(-100%)',
          background: '#1e2535', border: '1px solid #4a70c0',
          borderRadius: 4, padding: 8, minWidth: 140, zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,.5)',
        }}>
          <input
            autoFocus
            value={nameQuery}
            onChange={e => setNameQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && filteredPeople.length > 0) confirmTag(filteredPeople[0].name);
            }}
            placeholder="Search people…"
            style={{
              width: '100%', boxSizing: 'border-box', background: '#0d1520',
              border: '1px solid #2a3a5a', borderRadius: 3, padding: '3px 6px',
              color: '#ddd', fontSize: 11, marginBottom: 4,
            }}
          />
          {filteredPeople.map(p => (
            <div
              key={p.id}
              onClick={() => !saving && confirmTag(p.name)}
              style={{
                padding: '3px 6px', fontSize: 11, color: '#bbb',
                borderRadius: 2, cursor: saving ? 'wait' : 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2a3a5a')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              {p.name}
            </div>
          ))}
          {filteredPeople.length === 0 && (
            <div style={{ fontSize: 11, color: '#666', padding: '3px 6px' }}>No people found</div>
          )}
        </div>
      )}
    </div>
  );
}
