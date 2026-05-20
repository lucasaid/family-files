// src/Photos/PhotoViewer.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import FaceOverlay from './FaceOverlay';
import FaceTagger from './FaceTagger';

function getRenderedImageBounds(
  nat: { w: number; h: number },
  container: { w: number; h: number }
): { width: number; height: number } {
  const natAspect = nat.w / nat.h;
  const conAspect = container.w / container.h;
  if (natAspect > conAspect) {
    // constrained by width
    return { width: container.w, height: container.w / natAspect };
  } else {
    // constrained by height
    return { width: container.h * natAspect, height: container.h };
  }
}

export default function PhotoViewer() {
  const { state, dispatch } = useAppContext();
  const { activePhoto, isTaggingMode, showFaces } = state;
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!activePhoto) return null;

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
  };

  const handleFullscreen = () => {
    containerRef.current?.requestFullscreen();
  };

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#000' }}
    >
      <img
        src={activePhoto.path}
        alt={activePhoto.file}
        onLoad={handleImgLoad}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
      />

      {/* Overlay container — sized to match the rendered image only, not the full container */}
      {imgDims && containerSize && (() => {
        const bounds = getRenderedImageBounds(imgDims, containerSize);
        return (
          <div style={{
            position: 'absolute',
            width: bounds.width,
            height: bounds.height,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: isTaggingMode ? 'auto' : 'none',
          }}>
            {showFaces && <FaceOverlay faces={activePhoto.faces} dimmed={isTaggingMode} />}
            {isTaggingMode && (
              <FaceTagger filePath={activePhoto.fsPath} fileName={activePhoto.file} />
            )}
          </div>
        );
      })()}

      {isTaggingMode && (
        <div style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(240,176,96,.15)', border: '1px solid rgba(240,176,96,.4)',
          borderRadius: 4, padding: '3px 12px', color: '#f0b060', fontSize: 11, pointerEvents: 'none',
        }}>
          Tagging mode — drag to mark a face · Press Esc to exit
        </div>
      )}

      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_FACES' })}
          title={showFaces ? 'Hide face tags' : 'Show face tags'}
          style={{
            background: showFaces ? 'rgba(240,176,96,.25)' : 'rgba(0,0,0,.6)',
            border: `1px solid ${showFaces ? 'rgba(240,176,96,.6)' : '#444'}`,
            borderRadius: 3, padding: '3px 8px',
            color: showFaces ? '#f0b060' : '#aaa',
            fontSize: 11, cursor: 'pointer',
          }}
        >
          👤 Faces
        </button>
        <button
          onClick={handleFullscreen}
          style={{
            background: 'rgba(0,0,0,.6)', border: '1px solid #444',
            borderRadius: 3, padding: '3px 8px', color: '#aaa', fontSize: 11, cursor: 'pointer',
          }}
        >
          ⛶ Full screen
        </button>
      </div>
    </div>
  );
}
