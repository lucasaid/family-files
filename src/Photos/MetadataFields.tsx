// src/Photos/MetadataFields.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { writeMeta } from '../utils/exiftool';
import { Photo } from '../context/types';

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
    draft.rating !== (photo.rating ?? null) ||
    JSON.stringify(draft.keywords) !== JSON.stringify(photo.keywords ?? [])
  );
}

const label: React.CSSProperties = {
  fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: '#555', marginBottom: 3,
};

const fieldBase: React.CSSProperties = {
  width: '100%', background: '#1e1e30', border: '1px solid #2a2a40',
  borderRadius: 3, padding: '3px 6px', color: '#ddd', fontSize: 12,
  boxSizing: 'border-box', fontFamily: 'inherit',
};

const readOnlyField: React.CSSProperties = { ...fieldBase, color: '#666' };

// ── Star rating ────────────────────────────────────────────────────────────────

function StarRating({ value, onChange, readOnly }: {
  value: number | null;
  onChange: (v: number | null) => void;
  readOnly: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(star => {
        const filled = (hovered ?? value ?? 0) >= star;
        return (
          <span
            key={star}
            onMouseEnter={() => !readOnly && setHovered(star)}
            onMouseLeave={() => !readOnly && setHovered(null)}
            onClick={() => {
              if (readOnly) return;
              onChange(value === star ? null : star);
            }}
            style={{
              fontSize: 16, lineHeight: 1,
              color: filled ? '#f0b060' : '#333',
              cursor: readOnly ? 'default' : 'pointer',
              transition: 'color 0.1s',
              userSelect: 'none',
            }}
          >
            ★
          </span>
        );
      })}
      {value != null && !readOnly && (
        <button
          onClick={() => onChange(null)}
          style={{ background: 'none', border: 'none', color: '#444', fontSize: 10, cursor: 'pointer', padding: '0 2px', marginLeft: 2 }}
          title="Clear rating"
        >
          ×
        </button>
      )}
    </div>
  );
}

// ── Keyword tags ───────────────────────────────────────────────────────────────

function KeywordInput({ keywords, onChange, readOnly }: {
  keywords: string[];
  onChange: (kw: string[]) => void;
  readOnly: boolean;
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
            background: '#1a2230', border: '1px solid #2a3a50',
            borderRadius: 10, padding: '1px 7px', fontSize: 11, color: '#9bb8f5',
          }}>
            {kw}
            {!readOnly && (
              <button onClick={() => remove(kw)}
                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 0, fontSize: 11, lineHeight: 1 }}>
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

export default function MetadataFields({ readOnly }: { readOnly: boolean }) {
  const { state, dispatch } = useAppContext();
  const { activePhoto } = state;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(activePhoto ? photoDraft(activePhoto) : null);
    setError(null);
  }, [activePhoto?.file]);

  if (!activePhoto || !draft) return null;

  const isDirty = draftDirty(draft, activePhoto);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const location = draft.locationStr ? parseLocation(draft.locationStr) : null;
      await writeMeta(activePhoto.fsPath, {
        date: draft.date || undefined,
        caption: draft.caption,
        location,
        city: draft.city,
        state: draft.state,
        country: draft.country,
        rating: draft.rating,
        keywords: draft.keywords,
      });
      dispatch({
        type: 'UPDATE_PHOTO_META',
        file: activePhoto.file,
        meta: {
          date: draft.date || null,
          caption: draft.caption || null,
          location,
          city: draft.city || null,
          state: draft.state || null,
          country: draft.country || null,
          rating: draft.rating,
          keywords: draft.keywords,
        },
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => { setDraft(photoDraft(activePhoto)); setError(null); };
  const set = (patch: Partial<Draft>) => setDraft(d => d ? { ...d, ...patch } : d);

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
          {ratingSaving && <span style={{ color: '#555', fontSize: 9, letterSpacing: '.06em' }}>saving…</span>}
        </div>
        <StarRating value={draft.rating} onChange={saveRating} readOnly={readOnly} />
      </div>

      {/* Date */}
      <div>
        <div style={label}>Date taken</div>
        <input style={readOnly ? readOnlyField : fieldBase} value={draft.date} readOnly={readOnly}
          onChange={e => set({ date: e.target.value })} />
      </div>

      {/* Caption */}
      <div>
        <div style={label}>Caption</div>
        <textarea style={{ ...(readOnly ? readOnlyField : fieldBase), minHeight: 52, resize: 'vertical' }}
          value={draft.caption} readOnly={readOnly}
          onChange={e => set({ caption: e.target.value })} />
      </div>

      {/* Keywords */}
      <div>
        <div style={label}>Keywords</div>
        <KeywordInput keywords={draft.keywords} onChange={kw => set({ keywords: kw })} readOnly={readOnly} />
      </div>

      {/* Location coords */}
      <div>
        <div style={label}>GPS (lat, lng)</div>
        <input style={readOnly ? readOnlyField : fieldBase} value={draft.locationStr} readOnly={readOnly}
          onChange={e => set({ locationStr: e.target.value })} />
      </div>

      {/* Structured location */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={label}>Location</div>
        <input style={readOnly ? readOnlyField : fieldBase} value={draft.city} readOnly={readOnly}
          placeholder="City" onChange={e => set({ city: e.target.value })} />
        <input style={readOnly ? readOnlyField : fieldBase} value={draft.state} readOnly={readOnly}
          placeholder="State / Province" onChange={e => set({ state: e.target.value })} />
        <input style={readOnly ? readOnlyField : fieldBase} value={draft.country} readOnly={readOnly}
          placeholder="Country" onChange={e => set({ country: e.target.value })} />
      </div>

      {/* Camera (read-only) */}
      <div>
        <div style={label}>Camera</div>
        <input style={readOnlyField} value={activePhoto.camera ?? ''} readOnly />
      </div>

      {error && <div style={{ color: '#e88', fontSize: 11 }}>{error}</div>}

      {isDirty && !readOnly && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={save} disabled={saving}
            style={{ background: '#2d5a2d', border: '1px solid #3a7a3a', borderRadius: 3, padding: '4px 12px', color: '#7ecfa0', fontSize: 11, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={cancel}
            style={{ background: '#2a2a3a', border: '1px solid #3a3a4a', borderRadius: 3, padding: '4px 12px', color: '#888', fontSize: 11, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
