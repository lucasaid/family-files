// src/Documents/DocumentFields.tsx
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { writeDocumentsJson } from '../utils/documents';
import { FamilyDocument } from '../context/types';

type Draft = Pick<FamilyDocument, 'title' | 'date' | 'description' | 'content'>;

const labelStyle: React.CSSProperties = {
  fontSize: 10, textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: 3,
};

const valueStyle: React.CSSProperties = {
  fontSize: 13, color: 'var(--text-2)', marginBottom: 12, whiteSpace: 'pre-wrap', lineHeight: 1.5,
};

const emptyStyle: React.CSSProperties = {
  ...valueStyle, color: 'var(--text-5)', fontStyle: 'italic',
};

export default function DocumentFields() {
  const { state, dispatch } = useAppContext();
  const { activeDocument, documents } = state;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeDocument) { setDraft(null); setEditing(false); return; }
    setDraft({
      title: activeDocument.title,
      date: activeDocument.date ?? '',
      description: activeDocument.description,
      content: activeDocument.content ?? '',
    });
    setEditing(false);
  }, [activeDocument?.id]);

  if (!activeDocument || !draft) return null;

  const save = async () => {
    setSaving(true);
    const updated: FamilyDocument = {
      ...activeDocument,
      title: draft.title,
      date: draft.date || null,
      description: draft.description,
      ...(activeDocument.type === 'note' ? { content: draft.content } : {}),
    };
    const all = documents.map(d => d.id === updated.id ? updated : d);
    dispatch({ type: 'UPDATE_DOCUMENT', document: updated });
    try {
      await writeDocumentsJson(all);
      setEditing(false);
    } catch (err) {
      dispatch({ type: 'UPDATE_DOCUMENT', document: activeDocument });
      alert(`Failed to save: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft({
      title: activeDocument.title,
      date: activeDocument.date ?? '',
      description: activeDocument.description,
      content: activeDocument.content ?? '',
    });
    setEditing(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)',
    borderRadius: 3, padding: '4px 8px', color: 'var(--input-text)', fontSize: 13,
    boxSizing: 'border-box', marginBottom: 10,
  };

  if (!editing) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Details</span>
          <button onClick={() => setEditing(true)}
            style={{ background: 'var(--btn-secondary-bg, var(--bg-3))', border: '1px solid var(--border-2)', borderRadius: 4, padding: '3px 10px', color: 'var(--text-2)', cursor: 'pointer', fontSize: 11 }}>
            Edit
          </button>
        </div>

        <div style={labelStyle}>Title</div>
        <div style={activeDocument.title ? valueStyle : emptyStyle}>{activeDocument.title || 'No title'}</div>

        <div style={labelStyle}>Date</div>
        <div style={activeDocument.date ? valueStyle : emptyStyle}>{activeDocument.date || 'No date'}</div>

        <div style={labelStyle}>Description</div>
        <div style={activeDocument.description ? valueStyle : emptyStyle}>{activeDocument.description || 'No description'}</div>

        {activeDocument.type === 'note' && (
          <>
            <div style={labelStyle}>Content</div>
            <div style={activeDocument.content ? valueStyle : emptyStyle}>{activeDocument.content || 'No content'}</div>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Details</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={save} disabled={saving}
            style={{ background: 'var(--btn-save-bg)', border: '1px solid var(--btn-save-border)', borderRadius: 4, padding: '3px 10px', color: 'var(--btn-save-text)', fontSize: 11, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={cancel} disabled={saving}
            style={{ background: 'var(--btn-cancel-bg)', border: '1px solid var(--btn-cancel-border)', borderRadius: 4, padding: '3px 10px', color: 'var(--btn-cancel-text)', fontSize: 11, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>

      <div style={labelStyle}>Title</div>
      <input style={inputStyle} value={draft.title} onChange={e => setDraft(d => d && ({ ...d, title: e.target.value }))} />

      <div style={labelStyle}>Date</div>
      <input style={inputStyle} value={draft.date ?? ''} onChange={e => setDraft(d => d && ({ ...d, date: e.target.value }))} />

      <div style={labelStyle}>Description</div>
      <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
        value={draft.description} onChange={e => setDraft(d => d && ({ ...d, description: e.target.value }))} />

      {activeDocument.type === 'note' && (
        <>
          <div style={labelStyle}>Content</div>
          <textarea style={{ ...inputStyle, minHeight: 120, resize: 'vertical', fontFamily: 'inherit' }}
            value={draft.content ?? ''} onChange={e => setDraft(d => d && ({ ...d, content: e.target.value }))} />
        </>
      )}
    </div>
  );
}
