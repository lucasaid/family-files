import React, { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { writeFaceRegions } from '../utils/exiftool';
import FaceOverlay from './FaceOverlay';
import FaceTagger from './FaceTagger';

const MIN_SCALE = 1;
const MAX_SCALE = 8;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function getRenderedImageBounds(
  nat: { w: number; h: number },
  container: { w: number; h: number }
): { width: number; height: number } {
  const natAspect = nat.w / nat.h;
  const conAspect = container.w / container.h;
  if (natAspect > conAspect) {
    return { width: container.w, height: container.w / natAspect };
  } else {
    return { width: container.h * natAspect, height: container.h };
  }
}

export default function PhotoViewer() {
  const { state, dispatch } = useAppContext();
  const { activePhoto, isTaggingMode, showFaces } = state;
  const [searchParams] = useSearchParams();
  const highlightPersonId = searchParams.get('person');
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  // Zoom/pan state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  // Touch pinch state
  const lastTouchDistRef = useRef<number | null>(null);
  const lastTouchMidRef = useRef<{ x: number; y: number } | null>(null);
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });

  // Keep refs in sync for use inside event listeners
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    scaleRef.current = 1;
    offsetRef.current = { x: 0, y: 0 };
  }, []);

  const clampOffset = useCallback((ox: number, oy: number, s: number, cs: { w: number; h: number } | null) => {
    if (!cs) return { x: ox, y: oy };
    const maxX = (cs.w * (s - 1)) / 2;
    const maxY = (cs.h * (s - 1)) / 2;
    return { x: clamp(ox, -maxX, maxX), y: clamp(oy, -maxY, maxY) };
  }, []);

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

  // Trackpad pinch via wheel + ctrlKey; must be non-passive to call preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();

      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;

      const factor = e.deltaY < 0 ? 1.08 : 0.92;
      const prevScale = scaleRef.current;
      const nextScale = clamp(prevScale * factor, MIN_SCALE, MAX_SCALE);
      const ratio = nextScale / prevScale;

      const prevOffset = offsetRef.current;
      const rawX = cx + (prevOffset.x - cx) * ratio;
      const rawY = cy + (prevOffset.y - cy) * ratio;
      const nextOffset = clampOffset(rawX, rawY, nextScale, containerRef.current ? { w: containerRef.current.clientWidth, h: containerRef.current.clientHeight } : null);

      scaleRef.current = nextScale;
      offsetRef.current = nextOffset;
      setScale(nextScale);
      setOffset(nextOffset);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [clampOffset]);

  // Touch pinch
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const dist = (a: Touch, b: Touch) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const mid = (a: Touch, b: Touch) => ({
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2,
    });

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        lastTouchDistRef.current = dist(e.touches[0], e.touches[1]);
        lastTouchMidRef.current = mid(e.touches[0], e.touches[1]);
      } else if (e.touches.length === 1 && scaleRef.current > 1) {
        isPanningRef.current = true;
        panStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          ox: offsetRef.current.x,
          oy: offsetRef.current.y,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastTouchDistRef.current !== null && lastTouchMidRef.current !== null) {
        e.preventDefault();
        const newDist = dist(e.touches[0], e.touches[1]);
        const newMid = mid(e.touches[0], e.touches[1]);
        const rect = el.getBoundingClientRect();

        const factor = newDist / lastTouchDistRef.current;
        const prevScale = scaleRef.current;
        const nextScale = clamp(prevScale * factor, MIN_SCALE, MAX_SCALE);

        const cx = newMid.x - rect.left - rect.width / 2;
        const cy = newMid.y - rect.top - rect.height / 2;
        const ratio = nextScale / prevScale;
        const dx = newMid.x - lastTouchMidRef.current.x;
        const dy = newMid.y - lastTouchMidRef.current.y;

        const prevOffset = offsetRef.current;
        const rawX = cx + (prevOffset.x - cx) * ratio + dx;
        const rawY = cy + (prevOffset.y - cy) * ratio + dy;
        const cs = { w: el.clientWidth, h: el.clientHeight };
        const nextOffset = clampOffset(rawX, rawY, nextScale, cs);

        scaleRef.current = nextScale;
        offsetRef.current = nextOffset;
        setScale(nextScale);
        setOffset(nextOffset);

        lastTouchDistRef.current = newDist;
        lastTouchMidRef.current = newMid;
      } else if (e.touches.length === 1 && isPanningRef.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - panStartRef.current.x;
        const dy = e.touches[0].clientY - panStartRef.current.y;
        const cs = { w: el.clientWidth, h: el.clientHeight };
        const nextOffset = clampOffset(
          panStartRef.current.ox + dx,
          panStartRef.current.oy + dy,
          scaleRef.current,
          cs,
        );
        offsetRef.current = nextOffset;
        setOffset(nextOffset);
      }
    };

    const onTouchEnd = () => {
      lastTouchDistRef.current = null;
      lastTouchMidRef.current = null;
      isPanningRef.current = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [clampOffset]);

  // Mouse drag for pan when zoomed
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (scaleRef.current <= 1) return;
    isPanningRef.current = true;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    const cs = containerRef.current ? { w: containerRef.current.clientWidth, h: containerRef.current.clientHeight } : null;
    const nextOffset = clampOffset(panStartRef.current.ox + dx, panStartRef.current.oy + dy, scaleRef.current, cs);
    offsetRef.current = nextOffset;
    setOffset(nextOffset);
  }, [clampOffset]);

  const onMouseUp = useCallback(() => { isPanningRef.current = false; setIsPanning(false); }, []);

  useLayoutEffect(() => {
    if (activePhoto) {
      setIsLoading(true);
      setImgDims(null);
      resetZoom();
    }
  }, [activePhoto?.fsPath]);

  if (!activePhoto) return null;

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
    setIsLoading(false);
  };

  const handleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  };

  const zoomTransform = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`;
  const isZoomed = scale > 1;

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onDoubleClick={isZoomed ? resetZoom : undefined}
      style={{
        flex: 1, position: 'relative', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', background: 'var(--bg-viewer)',
        cursor: isZoomed ? (isPanning ? 'grabbing' : 'grab') : 'default',
      }}
    >
      {/* Zoomable layer — img + face overlay move together */}
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', height: '100%',
        transform: zoomTransform,
        transformOrigin: 'center center',
        willChange: 'transform',
        userSelect: 'none',
      }}>
        {activePhoto.thumbnailPath && (
          <img
            src={activePhoto.thumbnailPath}
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%', height: '100%',
              objectFit: 'contain',
              filter: 'blur(2px)',
              opacity: isLoading ? 1 : 0,
              transition: isLoading ? 'none' : 'opacity 0.35s ease-out',
              pointerEvents: 'none',
            }}
          />
        )}

        <img
          src={activePhoto.path}
          alt={activePhoto.file}
          onLoad={handleImgLoad}
          draggable={false}
          style={{
            maxWidth: '100%', maxHeight: '100%',
            objectFit: 'contain', display: 'block',
            opacity: isLoading ? 0 : 1,
            transition: isLoading ? 'none' : 'opacity 0.35s ease-out',
          }}
        />

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
              opacity: 1,
              transition: 'opacity 1s ease-out',
            }}>
              {showFaces && (
                <FaceOverlay
                  faces={activePhoto.faces}
                  dimmed={isTaggingMode}
                  highlightPersonId={highlightPersonId}
                  onMove={isTaggingMode ? async (regionName, newBox) => {
                    const originalFace = activePhoto.faces.find(f => f.name === regionName)!;
                    dispatch({ type: 'UPDATE_FACE_REGION', file: activePhoto.file, regionName, region: { ...originalFace, ...newBox } });
                    const updatedFaces = activePhoto.faces.map(f =>
                      f.name === regionName ? { ...f, ...newBox } : f
                    );
                    try {
                      await writeFaceRegions(activePhoto.fsPath, updatedFaces);
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
      </div>

      {isTaggingMode && (
        <div style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(240,176,96,.15)', border: '1px solid rgba(240,176,96,.4)',
          borderRadius: 4, padding: '3px 12px', color: 'var(--amber)', fontSize: 'var(--font-size-label)', pointerEvents: 'none',
        }}>
          Tagging mode: drag to mark a face · Esc to exit
        </div>
      )}

      {isZoomed && (
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,.55)', borderRadius: 3, padding: '2px 8px',
          color: 'rgba(255,255,255,.6)', fontSize: 10, pointerEvents: 'none',
          letterSpacing: '.04em',
        }}>
          {Math.round(scale * 100)}% · double-click to reset
        </div>
      )}

      {isLoading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.35)',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.15)',
            borderTopColor: 'rgba(255,255,255,0.7)',
            animation: 'photo-spin 0.7s linear infinite',
          }} />
        </div>
      )}

      <button
        onClick={handleFullscreen}
        aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
        style={{
          position: 'absolute', top: 8, right: 8,
          background: isFullscreen ? 'rgba(155,184,245,.15)' : 'rgba(0,0,0,.6)',
          border: `1px solid ${isFullscreen ? 'rgba(155,184,245,.5)' : 'var(--border)'}`,
          borderRadius: 3, padding: '3px 8px',
          color: isFullscreen ? 'var(--accent)' : 'var(--text-3)',
          fontSize: 'var(--font-size-label)', cursor: 'pointer',
        }}
      >
        {isFullscreen ? '⛶ Exit' : '⛶ Full screen'}
      </button>
    </div>
  );
}
