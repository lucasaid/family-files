import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import * as f3 from 'family-chart';
import 'family-chart/styles/family-chart.css';
import { useAppContext } from '../context/AppContext';
import { FaceRegion } from '../context/types';

// Replicates PersonAvatar crop math on a canvas and returns a data URL
function cropFaceToDataUrl(src: string, face: FaceRegion, outputSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      const PAD = 1.4;

      const cx = (face.x + face.w / 2) * W;
      const cy = (face.y + face.h / 2) * H;

      // Source pixels per output pixel (PersonAvatar uses Math.min for scale, so Math.max here)
      const srcPerOut = Math.max(
        (face.w * PAD * W) / outputSize,
        (face.h * PAD * H) / outputSize,
      );

      const half = (outputSize / 2) * srcPerOut;
      const sx = Math.max(0, cx - half);
      const sy = Math.max(0, cy - half);
      const sw = Math.min(W - sx, outputSize * srcPerOut);
      const sh = Math.min(H - sy, outputSize * srcPerOut);

      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('no canvas context')); return; }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputSize, outputSize);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => reject(new Error('failed to load image'));
    img.src = src;
  });
}

export default function FamilyTree() {
  const { state } = useAppContext();
  const location = useLocation();
  const focusId = new URLSearchParams(location.search).get('focus') ?? undefined;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<f3.Chart | null>(null);
  const [chartData, setChartData] = useState<any[] | null>(null);

  // Build enriched data — async because canvas crop is async
  useEffect(() => {
    if (!state.familyChart || state.familyChart.length === 0) {
      setChartData(null);
      return;
    }

    let cancelled = false;

    async function build() {
      const data = await Promise.all(
        (state.familyChart ?? []).map(async fc => {
          const linkedPerson = state.people.find(p => p.familyTreeId === fc.id);
          if (!linkedPerson) return fc;

          const tagged = state.photos.filter(p => p.faces.some(f => f.personId === linkedPerson.id));
          const photo = (linkedPerson.primaryPhotoFile
            ? tagged.find(p => p.file === linkedPerson.primaryPhotoFile)
            : undefined) ?? tagged[0];
          if (!photo) return fc;

          const face = photo.faces.find(f => f.personId === linkedPerson.id);
          if (!face) return fc;

          try {
            const avatar = await cropFaceToDataUrl(photo.path, face, 400);
            return { ...fc, data: { ...fc.data, avatar } };
          } catch {
            return fc;
          }
        })
      );

      if (!cancelled) setChartData(data);
    }

    build();
    return () => { cancelled = true; };
  }, [state.familyChart, state.people, state.photos]);

  // Render / re-render chart when data changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !chartData || chartData.length === 0) return;

    el.innerHTML = '';

    // Deep-copy before handing to the library. family-chart mutates the objects
    // in-place (createRelsToAdd pushes synthetic spouse IDs into rels.spouses and
    // rels.parents). Without a copy those synthetic IDs bleed back into
    // state.familyChart and cause "Cannot read properties of undefined" on the
    // next chart creation because the synthetic persons no longer exist.
    const safeData = chartData.map(fc => ({
      ...fc,
      data: { ...fc.data },
      rels: {
        ...(fc.rels.spouses  && { spouses:  [...fc.rels.spouses]  }),
        ...(fc.rels.children && { children: [...fc.rels.children] }),
        ...(fc.rels.parents  && { parents:  [...fc.rels.parents]  }),
      },
    }));

    const hasPhotos = safeData.some(fc => fc.data.avatar);
    const chart = f3.createChart(el, safeData);
    const card = chart.setCardHtml()
      .setCardDisplay([['first name', 'last name'], ['birthday']]);
    if (hasPhotos) card.setCardImageField('avatar');

    card.setOnCardClick((_e: MouseEvent, d: any) => {
      chart.store.updateMainId(d.data.id);
      chart.store.updateTree({ tree_position: 'main_to_middle', scale: 0.8, transition_time: 300 });
    });

    const activeId = focusId ?? state.settings.familyTreeStartId;
    if (activeId && safeData.some((fc: any) => fc.id === activeId)) {
      chart.updateMainId(activeId);
    }
    chart.updateTree({ initial: true, tree_position: 'main_to_middle', scale: 0.8, transition_time: 300 });

    if (activeId) {
      // After fit renders, zoom in on the active person at a comfortable scale
      requestAnimationFrame(() => {
        try {
          const datum = chart.store.getTreeMainDatum();
          const rect = el.getBoundingClientRect();
          f3.handlers.cardToMiddle({
            datum,
            svg: chart.svg,
            svg_dim: { width: rect.width, height: rect.height },
            scale: 0.8,
            transition_time: 300,
          });
        } catch {}
      });
    }
    chartRef.current = chart;

    return () => {
      if (el) el.innerHTML = '';
      chartRef.current = null;
    };
  }, [chartData, focusId, state.settings]);

  if (!state.familyChart || state.familyChart.length === 0) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        color: 'var(--text-4)',
      }}>
        <div style={{ fontSize: 40 }}>🌳</div>
        <div style={{ fontSize: 'var(--font-size-wordmark)', fontWeight: 500, color: 'var(--text-2)' }}>No family tree found</div>
        <div style={{ fontSize: 'var(--font-size-body)' }}>
          Add a <code style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 3 }}>family-tree.ged</code> file to your project folder to get started.
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 44px)', position: 'relative', overflow: 'hidden' }}>
      <div
        ref={containerRef}
        className="f3"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
