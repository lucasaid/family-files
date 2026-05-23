import React, { useEffect, useRef } from 'react';
import * as f3 from 'family-chart';
import 'family-chart/styles/family-chart.css';
import { useAppContext } from '../context/AppContext';

export default function FamilyTree() {
  const { state } = useAppContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<f3.Chart | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !state.familyChart || state.familyChart.length === 0) return;

    // Clear any previous chart
    el.innerHTML = '';

    const chart = f3.createChart(el, state.familyChart as any);
    chart
      .setCardHtml()
      .setCardDisplay([['first name', 'last name'], ['birthday']]);
    chart.updateTree({ initial: true, tree_position: 'fit' });
    chartRef.current = chart;

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
      chartRef.current = null;
    };
  }, [state.familyChart]);

  if (!state.familyChart || state.familyChart.length === 0) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        color: 'var(--text-4)',
      }}>
        <div style={{ fontSize: 40 }}>🌳</div>
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-2)' }}>No family tree found</div>
        <div style={{ fontSize: 13 }}>
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
