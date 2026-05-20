// src/Documents/DocumentFields.tsx
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { writeDocumentsJson } from '../utils/documents';
import { FamilyDocument } from '../context/types';

type Draft = Pick<FamilyDocument, 'title' | 'date' | 'description' | 'content'>;

export default function DocumentFields() {
  const { state, dispatch } = useAppContext();
  const { activeDocument, documents } = state;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeDocument) { setDraft(null); return; }
    setDraft({
      title: activeDocument.title,
      date: activeDocument.date ?? '',
      description: activeDocument.description,
      content: activeDocument.content ?? '',
    });
  }, [activeDocument?.id]);

  if (!activeDocument || !draft) return null;

  const isDirty =
    draft.title !== activeDocument.title ||
    draft.date !== (activeDocument.date ?? '') ||
    draft.description !== activeDocument.description ||
    draft.content !== (activeDocument.content ?? '');

  const save = async () => {
    setSaving(true);
    const updated: FamilyDocument = {
      ...activeDocument,
      title: draft.title,
      date: draft.date || null,
      description: draft.description,
      content: draft.content,
    };
    const all = documents.map(d => d.id === updated.id ? updated : d);
    dispatch({ type: 'UPDATE_DOCUMENT', document: updated });
    try {
      await writeDocumentsJson(all);
    } catch (err) {
      dispatch({ type: 'UPDATE_DOCUMENT', document: activeDocument });
      alert(`Failed to save: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => setDraft({
    title: activeDocument.title,
    date: activeDocument.date ?? '',
    description: activeDocument.description,
    content: activeDocument.content ?? '',
  });

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#1e1e30', border: '1px solid #2a2a40',
    borderRadius: 3, padding: '4px 8px', color: '#ddd', fontSize: 13,
    boxSizing: 'border-box', marginBottom: 10,
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#555', marginBottom: 3 }}>Title</div>
      <input style={inputStyle} value={draft.title} onChange={e => setDraft(d => d && ({ ...d, title: e.target.value }))} />

      <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#555', marginBottom: 3 }}>Date</div>
      <input style={inputStyle} value={draft.date ?? ''} onChange={e => setDraft(d => d && ({ ...d, date: e.target.value }))} />

      <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#555', marginBottom: 3 }}>Description</div>
      <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
        value={draft.description} onChange={e => setDraft(d => d && ({ ...d, description: e.target.value }))} />

      {activeDocument.type === 'note' && (
        <>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#555', marginBottom: 3 }}>Content</div>
          <textarea style={{ ...inputStyle, minHeight: 120, resize: 'vertical', fontFamily: 'inherit' }}
            value={draft.content ?? ''} onChange={e => setDraft(d => d && ({ ...d, content: e.target.value }))} />
        </>
      )}

      {isDirty && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={save} disabled={saving}
            style={{ background: '#2d5a2d', border: '1px solid #3a7a3a', borderRadius: 3, padding: '4px 12px', color: '#7ecfa0', fontSize: 12, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={cancel}
            style={{ background: '#2a2a3a', border: '1px solid #3a3a4a', borderRadius: 3, padding: '4px 12px', color: '#888', fontSize: 12, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
