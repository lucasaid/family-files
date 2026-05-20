// src/Photos/PhotoViewer.tsx
import React, { useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import FaceOverlay from './FaceOverlay';
import FaceTagger from './FaceTagger';

export default function PhotoViewer() {
  const { state } = useAppContext();
  const { activePhoto, isTaggingMode } = state;
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgDims, setImgDims] = useState<{ width: number; height: number } | null>(null);

  if (!activePhoto) return null;

  const handleFullscreen = () => {
    containerRef.current?.requestFullscreen();
  };

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
    >
      <img
        src={activePhoto.path}
        alt={activePhoto.file}
        onLoad={e => {
          const el = e.currentTarget;
          setImgDims({ width: el.naturalWidth, height: el.naturalHeight });
        }}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
      />

      {/* Overlay container — sized to match the rendered image */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: isTaggingMode ? 'auto' : 'none' }}>
        <FaceOverlay faces={activePhoto.faces} dimmed={isTaggingMode} />
        {isTaggingMode && imgDims && (
          <FaceTagger filePath={activePhoto.path} fileName={activePhoto.file} />
        )}
      </div>

      {isTaggingMode && (
        <div style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(240,176,96,.15)', border: '1px solid rgba(240,176,96,.4)',
          borderRadius: 4, padding: '3px 12px', color: '#f0b060', fontSize: 11, pointerEvents: 'none',
        }}>
          Tagging mode — drag to mark a face · Press Esc to exit
        </div>
      )}

      <button
        onClick={handleFullscreen}
        style={{
          position: 'absolute', top: 8, right: 8,
          background: 'rgba(0,0,0,.6)', border: '1px solid #444',
          borderRadius: 3, padding: '3px 8px', color: '#aaa', fontSize: 11, cursor: 'pointer',
        }}
      >
        ⛶ Full screen
      </button>
    </div>
  );
}
