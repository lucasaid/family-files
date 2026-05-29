import React, { useCallback, useEffect, useLayoutEffect, useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { writeMeta, normalizeExifDate, formatDisplayDate } from '../utils/exiftool';
import { Photo } from '../context/types';
import { generateMapThumbnail, getMapUrl, ensureMapThumbnail, deleteMapIfUnshared } from '../utils/mapThumbnail';

const path = (window as any).require('path') as typeof import('path');

function getMapsDir(fsPath: string): string {
  return path.join(path.dirname(fsPath), '.maps');
}

type Draft = {
  date: string;
  caption: string;
  locationStr: string;
  city: string;
  state: string;
  country: string;
  rating: number | null;
  keywords: string[];
};

function photoDraft(p: Photo): Draft {
  return {
    date: p.date ?? '',
    caption: p.caption ?? '',
    locationStr: p.location ? `${p.location.lat}, ${p.location.lng}` : '',
    city: p.city ?? '',
    state: p.state ?? '',
    country: p.country ?? '',
    rating: p.rating ?? null,
    keywords: p.keywords ?? [],
  };
}

function parseLocation(str: string): { lat: number; lng: number } | null {
  const parts = str.split(',').map(s => s.trim());
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

function draftDirty(draft: Draft, photo: Photo): boolean {
  return (
    draft.date !== (photo.date ?? '') ||
    draft.caption !== (photo.caption ?? '') ||
    draft.locationStr !== (photo.location ? `${photo.location.lat}, ${photo.location.lng}` : '') ||
    draft.city !== (photo.city ?? '') ||
    draft.state !== (photo.state ?? '') ||
    draft.country !== (photo.country ?? '') ||
    JSON.stringify(draft.keywords) !== JSON.stringify(photo.keywords ?? [])
  );
}

const label: React.CSSProperties = {
  fontSize: 'var(--font-size-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)',
  color: 'var(--text-3)', marginBottom: 3,
};

const fieldBase: React.CSSProperties = {
  width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)',
  borderRadius: 3, padding: '3px 6px', color: 'var(--input-text)', fontSize: 'var(--font-size-ui)',
  boxSizing: 'border-box', fontFamily: 'inherit',
};

function ReadValue({ value, multiline }: { value: string; multiline?: boolean }) {
  const style: React.CSSProperties = {
    fontSize: 'var(--font-size-ui)', color: value ? 'var(--text-2)' : 'var(--text-5)',
    lineHeight: 1.5, whiteSpace: multiline ? 'pre-wrap' : 'normal',
    minHeight: 18,
  };
  return <div style={style}>{value || '—'}</div>;
}

// ── Star rating ────────────────────────────────────────────────────────────────

function StarRating({ value, onChange, readOnly }: {
  value: number | null;
  onChange: (v: number | null) => void;
  readOnly: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div role="group" aria-label="Rating" style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(star => {
        const filled = (hovered ?? value ?? 0) >= star;
        return (
          <button
            key={star}
            type="button"
            aria-label={`${star} ${star === 1 ? 'star' : 'stars'}${value === star ? ', selected' : ''}`}
            aria-pressed={value === star}
            tabIndex={readOnly ? -1 : 0}
            onMouseEnter={() => !readOnly && setHovered(star)}
            onMouseLeave={() => !readOnly && setHovered(null)}
            onClick={() => { if (!readOnly) onChange(value === star ? null : star); }}
            style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: 16, lineHeight: 1,
              color: filled ? 'var(--amber)' : 'var(--text-5)',
              cursor: readOnly ? 'default' : 'pointer',
              transition: 'color 0.1s',
              userSelect: 'none',
            }}
          >
            ★
          </button>
        );
      })}
      {value != null && !readOnly && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Clear rating"
          style={{ background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 10, cursor: 'pointer', padding: '0 2px', marginLeft: 2 }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ── Keyword tags ───────────────────────────────────────────────────────────────

function KeywordInput({ keywords, onChange, readOnly, onNavigate }: {
  keywords: string[];
  onChange: (kw: string[]) => void;
  readOnly: boolean;
  onNavigate?: (dir: 'prev' | 'next') => void;
}) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || keywords.includes(trimmed)) { setInput(''); return; }
    onChange([...keywords, trimmed]);
    setInput('');
  };

  const remove = (kw: string) => onChange(keywords.filter(k => k !== kw));

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: keywords.length ? 5 : 0 }}>
        {keywords.map(kw => (
          <span key={kw} style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            background: 'var(--tag-bg)', border: '1px solid var(--tag-border)',
            borderRadius: 10, padding: '1px 7px', fontSize: 'var(--font-size-label)', color: 'var(--accent)',
          }}>
            {kw}
            {!readOnly && (
              <button onClick={() => remove(kw)}
                aria-label={`Remove keyword ${kw}`}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 0, fontSize: 'var(--font-size-label)', lineHeight: 1 }}>
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      {!readOnly && (
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
              e.preventDefault();
              onNavigate?.(e.key === 'ArrowRight' ? 'next' : 'prev');
              return;
            }
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input); }
            if (e.key === 'Backspace' && !input && keywords.length) remove(keywords[keywords.length - 1]);
          }}
          onBlur={() => { if (input.trim()) add(input); }}
          placeholder={keywords.length === 0 ? 'Add keywords…' : ''}
          style={{ ...fieldBase, width: '100%' }}
        />
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MetadataFields({ readOnly, alwaysEdit, saveOnNavigate, onNavigate, onExitEdit }: { readOnly: boolean; alwaysEdit?: boolean; saveOnNavigate?: boolean; onNavigate?: (dir: 'prev' | 'next') => void; onExitEdit?: () => void }) {
  const { state, dispatch } = useAppContext();
  const { activePhoto } = state;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapUrl, setMapUrl] = useState<string | null>(null);

  const prevPhotoRef = useRef<typeof activePhoto>(null);
  const prevDraftRef = useRef<Draft | null>(null);
  const saveOnNavigateRef = useRef(saveOnNavigate);
  saveOnNavigateRef.current = saveOnNavigate;
  const photosRef = useRef(state.photos);
  photosRef.current = state.photos;

  const autoSave = useCallback(async (photo: NonNullable<typeof activePhoto>, d: Draft) => {
    try {
      const location = d.locationStr ? parseLocation(d.locationStr) : null;
      const dateChanged = d.date !== (photo.date ?? '');
      const normalizedDate = dateChanged && d.date ? normalizeExifDate(d.date) : undefined;
      await writeMeta(photo.fsPath, {
        date: normalizedDate,
        caption: d.caption,
        location,
        city: d.city,
        state: d.state,
        country: d.country,
        rating: d.rating,
        keywords: d.keywords,
      });
      const savedDate = dateChanged ? (normalizedDate || null) : photo.date;
      dispatch({
        type: 'UPDATE_PHOTO_META',
        file: photo.file,
        meta: {
          date: savedDate,
          caption: d.caption || null,
          location,
          city: d.city || null,
          state: d.state || null,
          country: d.country || null,
          rating: d.rating,
          keywords: d.keywords,
        },
      });

      const mapsDir = getMapsDir(photo.fsPath);
      const oldLocation = photo.location;
      const newLocation = location;

      if (oldLocation && (oldLocation.lat !== newLocation?.lat || oldLocation.lng !== newLocation?.lng)) {
        deleteMapIfUnshared(photosRef.current, photo.file, oldLocation.lat, oldLocation.lng, mapsDir);
      }

      if (newLocation && navigator.onLine) {
        await ensureMapThumbnail(newLocation.lat, newLocation.lng, mapsDir);
      }
    } catch {
      // Auto-save is best-effort; errors are silently dropped
    }
  }, [dispatch]);

  useLayoutEffect(() => {
    const prev = prevPhotoRef.current;
    const prevDraft = prevDraftRef.current;
    if (saveOnNavigateRef.current && prev && prevDraft && draftDirty(prevDraft, prev)) {
      autoSave(prev, prevDraft);
    }
    prevPhotoRef.current = activePhoto;
    setDraft(activePhoto ? photoDraft(activePhoto) : null);
    setError(null);
  }, [activePhoto, activePhoto?.file, autoSave]);

  useEffect(() => {
    if (!activePhoto?.location) {
      setMapUrl(null);
      return;
    }
    const { lat, lng } = activePhoto.location;
    const mapsDir = getMapsDir(activePhoto.fsPath);
    const cached = getMapUrl(mapsDir, lat, lng);
    if (cached) {
      setMapUrl(cached);
      return;
    }
    if (!navigator.onLine) {
      setMapUrl(null);
      return;
    }
    setMapUrl(null);
    generateMapThumbnail(lat, lng, mapsDir).then(() => {
      setMapUrl(getMapUrl(mapsDir, lat, lng));
    });
  }, [activePhoto?.file, activePhoto?.location?.lat, activePhoto?.location?.lng]);

  if (!activePhoto || !draft) return null;

  prevDraftRef.current = draft;
  const isDirty = draftDirty(draft, activePhoto);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const location = draft.locationStr ? parseLocation(draft.locationStr) : null;
      const dateChanged = draft.date !== (activePhoto.date ?? '');
      const normalizedDate = dateChanged && draft.date ? normalizeExifDate(draft.date) : undefined;
      await writeMeta(activePhoto.fsPath, {
        date: normalizedDate,
        caption: draft.caption,
        location,
        city: draft.city,
        state: draft.state,
        country: draft.country,
        rating: draft.rating,
        keywords: draft.keywords,
      });
      const savedDate = dateChanged ? (normalizedDate || null) : activePhoto.date;
      dispatch({
        type: 'UPDATE_PHOTO_META',
        file: activePhoto.file,
        meta: {
          date: savedDate,
          caption: draft.caption || null,
          location,
          city: draft.city || null,
          state: draft.state || null,
          country: draft.country || null,
          rating: draft.rating,
          keywords: draft.keywords,
        },
      });
      setDraft(d => d ? { ...d, date: savedDate ?? '' } : d);
      onExitEdit?.();

      const mapsDir = getMapsDir(activePhoto.fsPath);
      const oldLocation = activePhoto.location;
      const newLocation = location; // already parsed: const location = draft.locationStr ? parseLocation(draft.locationStr) : null

      if (oldLocation && (oldLocation.lat !== newLocation?.lat || oldLocation.lng !== newLocation?.lng)) {
        deleteMapIfUnshared(state.photos, activePhoto.file, oldLocation.lat, oldLocation.lng, mapsDir);
      }

      if (newLocation) {
        if (navigator.onLine) {
          await ensureMapThumbnail(newLocation.lat, newLocation.lng, mapsDir);
        }
        setMapUrl(getMapUrl(mapsDir, newLocation.lat, newLocation.lng));
      } else {
        setMapUrl(null);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => { setDraft(photoDraft(activePhoto)); setError(null); onExitEdit?.(); };
  const set = (patch: Partial<Draft>) => setDraft(d => d ? { ...d, ...patch } : d);

  const onEnter = alwaysEdit
    ? (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }
    : undefined;

  const onNavKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    onNavigate?.(e.key === 'ArrowRight' ? 'next' : 'prev');
  };

  const saveRating = async (rating: number | null) => {
    set({ rating });
    setRatingSaving(true);
    try {
      await writeMeta(activePhoto.fsPath, { rating });
      dispatch({ type: 'UPDATE_PHOTO_META', file: activePhoto.file, meta: { rating } });
    } catch (err) {
      set({ rating: activePhoto.rating });
      setError((err as Error).message);
    } finally {
      setRatingSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Rating */}
      <div>
        <div style={{ ...label, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Rating</span>
          {ratingSaving && <span style={{ color: 'var(--text-4)', fontSize: 9, letterSpacing: '.06em' }}>saving…</span>}
        </div>
        <StarRating value={draft.rating} onChange={saveRating} readOnly={readOnly} />
      </div>

      {/* Date */}
      <div>
        <div style={label}>Date taken</div>
        {readOnly
          ? <ReadValue value={formatDisplayDate(draft.date)} />
          : <input style={fieldBase} value={draft.date} onChange={e => set({ date: e.target.value })} onKeyDown={e => { onEnter?.(e); onNavKeyDown(e); }} />}
      </div>

      {/* Caption */}
      <div>
        <div style={label}>Caption</div>
        {readOnly
          ? <ReadValue value={draft.caption} multiline />
          : <textarea style={{ ...fieldBase, minHeight: 52, resize: 'vertical' }}
              value={draft.caption} onChange={e => set({ caption: e.target.value })} onKeyDown={onNavKeyDown} />}
      </div>

      {/* Keywords */}
      <div>
        <div style={label}>Keywords</div>
        <KeywordInput keywords={draft.keywords} onChange={kw => set({ keywords: kw })} readOnly={readOnly} onNavigate={onNavigate} />
      </div>

      {/* Location coords */}
      <div>
        <div style={label}>GPS (lat, lng)</div>
        {readOnly
          ? <ReadValue value={draft.locationStr} />
          : <input style={fieldBase} value={draft.locationStr} onChange={e => set({ locationStr: e.target.value })} onKeyDown={e => { onEnter?.(e); onNavKeyDown(e); }} />}
        {mapUrl && (
          <img
            src={mapUrl}
            alt="Map showing photo location"
            style={{
              display: 'block', marginTop: 6, width: '100%', height: 'auto',
              borderRadius: 4, border: '1px solid var(--border-muted)',
            }}
          />
        )}
      </div>

      {/* Structured location */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={label}>Location</div>
        {readOnly
          ? <ReadValue value={[draft.city, draft.state, draft.country].filter(Boolean).join(', ')} />
          : <>
              <input style={fieldBase} value={draft.city} placeholder="City" onChange={e => set({ city: e.target.value })} onKeyDown={e => { onEnter?.(e); onNavKeyDown(e); }} />
              <input style={fieldBase} value={draft.state} placeholder="State / Province" onChange={e => set({ state: e.target.value })} onKeyDown={e => { onEnter?.(e); onNavKeyDown(e); }} />
              <input style={fieldBase} value={draft.country} placeholder="Country" onChange={e => set({ country: e.target.value })} onKeyDown={e => { onEnter?.(e); onNavKeyDown(e); }} />
            </>}
      </div>

      {/* Camera (always read-only) */}
      <div>
        <div style={label}>Camera</div>
        <ReadValue value={activePhoto.camera ?? ''} />
      </div>

      {error && <div role="alert" style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-label)' }}>{error}</div>}

      {isDirty && !readOnly && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={save} disabled={saving}
            style={{ background: 'var(--btn-save-bg)', border: '1px solid var(--btn-save-border)', borderRadius: 3, padding: '4px 12px', color: 'var(--btn-save-text)', fontSize: 'var(--font-size-label)', cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={cancel}
            style={{ background: 'var(--btn-cancel-bg)', border: '1px solid var(--btn-cancel-border)', borderRadius: 3, padding: '4px 12px', color: 'var(--btn-cancel-text)', fontSize: 'var(--font-size-label)', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
