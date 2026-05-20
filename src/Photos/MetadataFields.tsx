// src/Photos/MetadataFields.tsx
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { writeMeta } from '../utils/exiftool';
import { Photo } from '../context/types';

type Draft = Pick<Photo, 'date' | 'caption'> & { locationStr: string };

function photoDraft(p: Photo): Draft {
  return {
    date: p.date ?? '',
    caption: p.caption ?? '',
    locationStr: p.location ? `${p.location.lat}, ${p.location.lng}` : '',
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

export default function MetadataFields({ readOnly }: { readOnly: boolean }) {
  const { state, dispatch } = useAppContext();
  const { activePhoto } = state;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(activePhoto ? photoDraft(activePhoto) : null);
    setError(null);
  }, [activePhoto?.file]);

  if (!activePhoto || !draft) return null;

  const isDirty =
    draft.date !== (activePhoto.date ?? '') ||
    draft.caption !== (activePhoto.caption ?? '') ||
    draft.locationStr !== (activePhoto.location ? `${activePhoto.location.lat}, ${activePhoto.location.lng}` : '');

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const location = draft.locationStr ? parseLocation(draft.locationStr) : null;
      await writeMeta(activePhoto.path, {
        date: draft.date || undefined,
        caption: draft.caption ?? undefined,
        location: location ?? undefined,
      });
      dispatch({
        type: 'UPDATE_PHOTO_META',
        file: activePhoto.file,
        meta: { date: draft.date || null, caption: draft.caption || null, location },
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => setDraft(photoDraft(activePhoto));

  const fieldStyle: React.CSSProperties = {
    width: '100%', background: '#1e1e30', border: '1px solid #2a2a40',
    borderRadius: 3, padding: '3px 6px', color: readOnly ? '#666' : '#ddd', fontSize: 12,
    boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: '#555', marginBottom: 3 }}>Date taken</div>
        <input style={fieldStyle} value={draft.date ?? ''} readOnly={readOnly}
          onChange={e => setDraft(d => d && ({ ...d, date: e.target.value }))} />
      </div>
      <div>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: '#555', marginBottom: 3 }}>Location (lat, lng)</div>
        <input style={fieldStyle} value={draft.locationStr} readOnly={readOnly}
          onChange={e => setDraft(d => d && ({ ...d, locationStr: e.target.value }))} />
      </div>
      <div>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: '#555', marginBottom: 3 }}>Camera</div>
        <input style={{ ...fieldStyle, color: '#555' }} value={activePhoto.camera ?? ''} readOnly />
      </div>
      <div>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: '#555', marginBottom: 3 }}>Caption</div>
        <textarea style={{ ...fieldStyle, minHeight: 56, resize: 'vertical', fontFamily: 'inherit' }}
          value={draft.caption ?? ''} readOnly={readOnly}
          onChange={e => setDraft(d => d && ({ ...d, caption: e.target.value }))} />
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
