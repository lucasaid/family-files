import { memo, useEffect, useRef, useState } from 'react';

interface Props {
  children: React.ReactNode;
  /** Extra space around the viewport to start mounting before the cell is visible. Default 600px. */
  rootMargin?: string;
}

/**
 * Defers mounting children until the cell is near the viewport.
 * Renders a same-size skeleton placeholder until then so the CSS grid
 * layout is preserved. Once mounted, the children stay mounted.
 */
const LazyCell = memo(function LazyCell({ children, rootMargin = '600px' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setMounted(true); obs.disconnect(); } },
      { rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin]);

  if (mounted) return <>{children}</>;

  return (
    <div
      ref={ref}
      className="skeleton-shimmer"
      style={{ aspectRatio: '1', borderRadius: 2 }}
    />
  );
});

export default LazyCell;
