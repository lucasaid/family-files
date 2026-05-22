// src/Photos/FaceOverlay.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaceRegion } from '../context/types';

interface DragState {
  name: string;
  startMousePx: { x: number; y: number };
  originalBox: { x: number; y: number; w: number; h: number };
  offsetNorm: { x: number; y: number };
}

interface Props {
  faces: FaceRegion[];
  dimmed: boolean;
  highlightPersonId?: string | null;
  onMove?: (regionName: string, newBox: { x: number; y: number; w: number; h: number }) => void;
}

export default function FaceOverlay({ faces, dimmed, highlightPersonId, onMove }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!drag) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDrag(d => d ? {
        ...d,
        offsetNorm: {
          x: (e.clientX - d.startMousePx.x) / rect.width,
          y: (e.clientY - d.startMousePx.y) / rect.height,
        },
      } : null);
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!drag || !containerRef.current) { setDrag(null); return; }
      const rect = containerRef.current.getBoundingClientRect();
      const dx = (e.clientX - drag.startMousePx.x) / rect.width;
      const dy = (e.clientY - drag.startMousePx.y) / rect.height;
      const newX = Math.max(0, Math.min(1 - drag.originalBox.w, drag.originalBox.x + dx));
      const newY = Math.max(0, Math.min(1 - drag.originalBox.h, drag.originalBox.y + dy));
      onMove?.(drag.name, { ...drag.originalBox, x: newX, y: newY });
      setDrag(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [drag, onMove]);

  const startDrag = (face: FaceRegion, e: React.MouseEvent) => {
    if (!onMove) return;
    e.stopPropagation();
    e.preventDefault();
    setDrag({
      name: face.name,
      startMousePx: { x: e.clientX, y: e.clientY },
      originalBox: { x: face.x, y: face.y, w: face.w, h: face.h },
      offsetNorm: { x: 0, y: 0 },
    });
  };

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {faces.map((face) => {
        const isDragging = drag?.name === face.name;
        const isHighlighted = !!highlightPersonId && face.personId === highlightPersonId;
        const x = isDragging
          ? Math.max(0, Math.min(1 - face.w, face.x + drag!.offsetNorm.x))
          : face.x;
        const y = isDragging
          ? Math.max(0, Math.min(1 - face.h, face.y + drag!.offsetNorm.y))
          : face.y;
        const draggable = !!onMove;

        const baseColor = isHighlighted ? '#4caf50' : '#f0b060';
        const baseDimColor = isHighlighted ? 'rgba(76,175,80,.4)' : 'rgba(240,176,96,.4)';

        return (
          <div
            key={face.name}
            onMouseDown={draggable ? e => startDrag(face, e) : undefined}
            style={{
              position: 'absolute',
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: `${face.w * 100}%`,
              height: `${face.h * 100}%`,
              border: isDragging
                ? '2px solid rgba(155,184,245,.9)'
                : `2px solid ${dimmed ? baseDimColor : baseColor}`,
              borderRadius: 2,
              boxShadow: isDragging ? '0 0 0 1px rgba(155,184,245,.3), 0 4px 16px rgba(0,0,0,.5)' : 'none',
              pointerEvents: draggable ? 'auto' : 'none',
              cursor: draggable ? (isDragging ? 'grabbing' : 'grab') : 'default',
              zIndex: draggable ? 1 : 0,
              transition: isDragging ? 'none' : 'border-color 0.15s',
            }}
          >
            <span
              onClick={face.personId && !dimmed ? (e) => { e.stopPropagation(); navigate(`/people/${face.personId}`); } : undefined}
              style={{
                position: 'absolute', bottom: '100%', left: 0,
                background: isDragging ? '#9bb8f5' : baseColor,
                color: 'var(--text-on-accent)',
                fontSize: 10, fontWeight: 600, padding: '1px 5px',
                borderRadius: '2px 2px 0 0', whiteSpace: 'nowrap',
                userSelect: 'none',
                transition: 'background 0.15s',
                pointerEvents: 'auto',
                cursor: face.personId && !dimmed ? 'pointer' : 'default',
              }}
            >
              {face.name}
            </span>
            {draggable && !isDragging && (
              <span style={{
                position: 'absolute', top: 2, right: 3,
                fontSize: 8, color: `${baseColor}99`,
                userSelect: 'none', pointerEvents: 'none',
              }}>
                ⠿
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
