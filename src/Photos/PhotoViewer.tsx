// src/Photos/PhotoViewer.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { writeFaceRegions } from '../utils/exiftool';
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
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  if (!activePhoto) return null;

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
  };

  const handleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
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
            {showFaces && (
              <FaceOverlay
                faces={activePhoto.faces}
                dimmed={isTaggingMode}
                onMove={isTaggingMode ? async (regionName, newBox) => {
                  const updatedFaces = activePhoto.faces.map(f =>
                    f.name === regionName ? { ...f, ...newBox } : f
                  );
                  try {
                    await writeFaceRegions(activePhoto.fsPath, updatedFaces);
                    dispatch({ type: 'UPDATE_FACE_REGION', file: activePhoto.file, regionName, region: { ...activePhoto.faces.find(f => f.name === regionName)!, ...newBox } });
                  } catch (err) {
                    alert(`Failed to move face tag: ${(err as Error).message}`);
                  }
                } : undefined}
              />
            )}
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

      <button
        onClick={handleFullscreen}
        title={isFullscreen ? 'Exit full screen' : 'Full screen'}
        style={{
          position: 'absolute', top: 8, right: 8,
          background: isFullscreen ? 'rgba(155,184,245,.15)' : 'rgba(0,0,0,.6)',
          border: `1px solid ${isFullscreen ? 'rgba(155,184,245,.5)' : '#444'}`,
          borderRadius: 3, padding: '3px 8px',
          color: isFullscreen ? '#9bb8f5' : '#aaa',
          fontSize: 11, cursor: 'pointer',
        }}
      >
        {isFullscreen ? '⛶ Exit' : '⛶ Full screen'}
      </button>
    </div>
  );
}
