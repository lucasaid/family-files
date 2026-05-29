import React, { useRef, useState, useCallback, useEffect } from 'react';
import { FamilyDocument } from '../context/types';
import { dataPath } from '../utils/paths';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

function getExt(filePath: string) {
  return filePath.split('.').pop()?.toLowerCase() ?? '';
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 10;
const SCROLL_ZOOM_SPEED = 0.001;
const PINCH_ZOOM_SPEED  = 0.02;   // pinch deltaY is ~10–50x smaller than scroll

function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  // Must use a non-passive listener so preventDefault() can block page scroll while zooming.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const speed = e.ctrlKey ? PINCH_ZOOM_SPEED : SCROLL_ZOOM_SPEED;
      setScale(s => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s - e.deltaY * speed * s)));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
  }, []);

  const onMouseUp = useCallback(() => { dragging.current = false; }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderBottom: '1px solid var(--border-1)', flexShrink: 0 }}>
        <button type="button" onClick={() => setScale(s => Math.min(MAX_SCALE, s * 1.25))} style={btnStyle} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => setScale(s => Math.max(MIN_SCALE, s / 1.25))} style={btnStyle} aria-label="Zoom out">−</button>
        <span style={{ fontSize: 'var(--font-size-ui)', color: 'var(--text-3)', minWidth: 40, textAlign: 'center' }}>
          {Math.round(scale * 100)}%
        </span>
        <button type="button" onClick={reset} style={{ ...btnStyle, marginLeft: 4 }} aria-label="Reset zoom">Reset</button>
      </div>

      {/* viewport */}
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onDoubleClick={reset}
        style={{
          flex: 1,
          overflow: 'hidden',
          cursor: dragging.current ? 'grabbing' : 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-2)',
          userSelect: 'none',
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            transition: dragging.current ? 'none' : undefined,
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'var(--btn-secondary-bg, var(--bg-3))',
  border: '1px solid var(--border-2)',
  borderRadius: 4,
  padding: '2px 10px',
  color: 'var(--text-2)',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1.4,
};

interface Props { doc: FamilyDocument }

export default function DocumentViewer({ doc }: Props) {
  if (doc.type === 'note') {
    return (
      <div style={{ padding: 16, color: 'var(--text-2)', fontSize: 'var(--font-size-title)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
        {doc.content || <span style={{ color: 'var(--text-5)' }}>No content.</span>}
      </div>
    );
  }

  if (!doc.filePath) return <div style={{ padding: 16, color: 'var(--text-4)' }}>No file attached.</div>;

  const { shell } = (window as any).require('electron');
  const path = (window as any).require('path') as typeof import('path');
  const ext = getExt(doc.filePath);
  const fullPath = path.join(dataPath, 'documents', doc.filePath);
  const fileUrl = `file://${fullPath}`;

  if (IMAGE_EXTS.includes(ext)) {
    return (
      <div style={{ height: 520, display: 'flex', flexDirection: 'column' }}>
        <ZoomableImage src={fileUrl} alt={doc.title} />
      </div>
    );
  }

  if (ext === 'pdf') {
    return (
      <embed src={fileUrl} type="application/pdf" style={{ width: '100%', height: 500, border: 'none' }} />
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ color: 'var(--text-3)', fontSize: 'var(--font-size-body)', marginBottom: 12 }}>{doc.filePath}</div>
      <button
        onClick={() => shell.openPath(fullPath)}
        style={{ background: 'var(--btn-primary-bg)', border: '1px solid var(--btn-primary-border)', borderRadius: 4, padding: '6px 16px', color: 'var(--btn-primary-text)', cursor: 'pointer', fontSize: 'var(--font-size-body)' }}
      >
        Open in default app
      </button>
    </div>
  );
}
