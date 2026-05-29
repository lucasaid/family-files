import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { FamilyDocument, DocumentCategory } from '../context/types';
import { writeDocumentsJson, copyToDocumentsDir } from '../utils/documents';

const { ipcRenderer } = (window as any).require('electron');

type SearchField = 'all' | 'title' | 'date' | 'description' | 'people';

const SEARCH_FIELDS: { value: SearchField; label: string }[] = [
  { value: 'all',         label: 'All fields' },
  { value: 'title',       label: 'Title' },
  { value: 'date',        label: 'Date' },
  { value: 'description', label: 'Description' },
  { value: 'people',      label: 'People' },
];

function docIcon(doc: FamilyDocument) {
  if (doc.type === 'note') return '📝';
  const ext = doc.filePath?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return '📄';
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext ?? '')) return '🖼️';
  return '📎';
}

function DocRow({ doc, active, onClick, depth = 0 }: { doc: FamilyDocument; active: boolean; onClick: () => void; depth?: number }) {
  const { state } = useAppContext();
  const firstPerson = doc.personIds[0] ? state.people.find(p => p.id === doc.personIds[0])?.name : null;
  const paddingLeft = 12 + (depth + 1) * 12;
  return (
    <div
      onClick={onClick}
      style={{
        padding: `7px 12px 7px ${paddingLeft}px`, cursor: 'pointer', borderBottom: '1px solid var(--border-dim)',
        background: active ? 'var(--bg-active)' : 'transparent',
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--font-size-title)', flexShrink: 0 }}>{docIcon(doc)}</span>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ color: 'var(--text-1)', fontSize: 'var(--font-size-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</div>
          <div style={{ color: 'var(--text-4)', fontSize: 'var(--font-size-label)' }}>
            {doc.date && <span>{doc.date}{firstPerson ? ' · ' : ''}</span>}
            {firstPerson && <span>👤 {firstPerson}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function CategorySection({
  category, docs, allCategories, activeDocId, onSelect, depth,
}: {
  category: DocumentCategory;
  docs: FamilyDocument[];
  allCategories: DocumentCategory[];
  activeDocId: string | null | undefined;
  onSelect: (doc: FamilyDocument) => void;
  depth: number;
}) {
  const children = allCategories.filter(c => c.parentId === category.id);
  const directDocs = docs.filter(d => d.categoryId === category.id);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!activeDocId) return;
    const containsActiveDoc = (catId: string): boolean => {
      if (docs.some(d => d.id === activeDocId && d.categoryId === catId)) return true;
      return allCategories.filter(c => c.parentId === catId).some(c => containsActiveDoc(c.id));
    };
    if (containsActiveDoc(category.id)) setOpen(true);
  }, [activeDocId, docs, allCategories, category.id]);

  const totalCount = directDocs.length + children.reduce((n, child) => {
    return n + docs.filter(d => {
      const inChild = (catId: string): boolean => {
        if (d.categoryId === catId) return true;
        return allCategories.filter(c => c.parentId === catId).some(c => inChild(c.id));
      };
      return inChild(child.id);
    }).length;
  }, 0);

  const indent = depth * 12;

  return (
    <div>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: `5px 12px 5px ${12 + indent}px`,
          cursor: 'pointer', userSelect: 'none',
          borderBottom: '1px solid var(--border-dim)',
          background: 'var(--bg-card)',
        }}
      >
        <span style={{ fontSize: 9, color: 'var(--text-4)', width: 10, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
        <span style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, color: 'var(--text-3)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {category.name}
        </span>
        {totalCount > 0 && (
          <span style={{ fontSize: 10, color: 'var(--text-5)', flexShrink: 0 }}>{totalCount}</span>
        )}
      </div>
      {open && (
        <>
          {children.map(child => (
            <CategorySection
              key={child.id}
              category={child}
              docs={docs}
              allCategories={allCategories}
              activeDocId={activeDocId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
          {directDocs.map(doc => (
            <DocRow key={doc.id} doc={doc} active={doc.id === activeDocId} onClick={() => onSelect(doc)} depth={depth} />
          ))}
        </>
      )}
    </div>
  );
}

export default function DocumentList() {
  const { state, dispatch } = useAppContext();
  const { documents, activeDocument, categories } = state;
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('all');

  const personName = (id: string) => state.people.find(p => p.id === id)?.name ?? '';

  const matchesSearch = (doc: FamilyDocument): boolean => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const check = (v: string | null | undefined) => !!v && v.toLowerCase().includes(q);
    switch (searchField) {
      case 'title':       return check(doc.title);
      case 'date':        return check(doc.date);
      case 'description': return check(doc.description) || check(doc.content);
      case 'people':      return doc.personIds.some(id => personName(id).toLowerCase().includes(q));
      case 'all':
        return check(doc.title) || check(doc.date) || check(doc.description) || check(doc.content) ||
          doc.personIds.some(id => personName(id).toLowerCase().includes(q));
    }
  };

  const filteredDocs = documents.filter(matchesSearch);
  const isSearching = search.trim().length > 0;

  const addFile = async () => {
    if (loading) return;
    const result = await ipcRenderer.invoke('show-open-dialog', {
      properties: ['openFile'],
      filters: [{ name: 'All Files', extensions: ['*'] }],
    });
    if (result.canceled || !result.filePaths[0]) return;
    setLoading(true);
    try {
      const filePath = await copyToDocumentsDir(result.filePaths[0]);
      const nameWithoutExt = filePath.replace(/\.[^.]+$/, '');
      const doc: FamilyDocument = {
        id: crypto.randomUUID(), title: nameWithoutExt, date: null, description: '',
        personIds: [], type: 'file', filePath,
      };
      dispatch({ type: 'ADD_DOCUMENT', document: doc });
      dispatch({ type: 'SET_ACTIVE_DOCUMENT', document: doc });
      try {
        await writeDocumentsJson([...documents, doc]);
      } catch (writeErr) {
        dispatch({ type: 'REMOVE_DOCUMENT', id: doc.id });
        alert(`Failed to save document: ${(writeErr as Error).message}`);
      }
    } catch (copyErr) {
      alert(`Failed to copy file: ${(copyErr as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    const doc: FamilyDocument = {
      id: crypto.randomUUID(), title: 'New note', date: null, description: '',
      personIds: [], type: 'note', content: '',
    };
    dispatch({ type: 'ADD_DOCUMENT', document: doc });
    dispatch({ type: 'SET_ACTIVE_DOCUMENT', document: doc });
    try {
      await writeDocumentsJson([...documents, doc]);
    } catch (err) {
      dispatch({ type: 'REMOVE_DOCUMENT', id: doc.id });
      alert(`Failed to save note: ${(err as Error).message}`);
    }
  };

  const onSelect = (doc: FamilyDocument) => dispatch({ type: 'SET_ACTIVE_DOCUMENT', document: doc });

  const inputStyle: React.CSSProperties = {
    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
    borderRadius: 3, padding: '4px 8px', color: 'var(--input-text)',
    fontSize: 'var(--font-size-label)', fontFamily: 'var(--font-sans)', width: '100%',
    boxSizing: 'border-box',
  };

  const rootCategories = categories.filter(c => c.parentId === null);
  const uncategorized = filteredDocs.filter(d => !d.categoryId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-card)' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={addFile} disabled={loading}
            style={{ flex: 1, background: 'var(--btn-primary-bg)', border: '1px solid var(--btn-primary-border)', borderRadius: 4, padding: '5px 0', color: 'var(--btn-primary-text)', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1, fontSize: 'var(--font-size-ui)' }}>
            {loading ? 'Importing…' : '+ Add file'}
          </button>
          <button onClick={addNote}
            style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)', borderRadius: 4, padding: '5px 0', color: 'var(--text-2)', cursor: 'pointer', fontSize: 'var(--font-size-ui)' }}>
            + New note
          </button>
        </div>
        {documents.length > 0 && (
          <div style={{ display: 'flex', gap: 6, minWidth: 0 }}>
            <input
              type="search" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              style={{ ...inputStyle, flex: 1, minWidth: 0, width: 0 }}
            />
            <select
              value={searchField}
              onChange={e => setSearchField(e.target.value as SearchField)}
              style={{ ...inputStyle, width: 'auto', flexShrink: 0, cursor: 'pointer' }}
            >
              {SEARCH_FIELDS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {documents.length === 0 && (
          <div style={{ padding: 16, color: 'var(--text-4)', fontSize: 'var(--font-size-body)' }}>No documents yet.</div>
        )}

        {/* Search results — flat list */}
        {isSearching && (
          <>
            {filteredDocs.length === 0 && (
              <div style={{ padding: 16, color: 'var(--text-4)', fontSize: 'var(--font-size-ui)', fontStyle: 'italic' }}>No documents match "{search}".</div>
            )}
            {filteredDocs.map(doc => (
              <DocRow key={doc.id} doc={doc} active={doc.id === activeDocument?.id} onClick={() => onSelect(doc)} />
            ))}
          </>
        )}

        {/* Category tree — shown when not searching */}
        {!isSearching && documents.length > 0 && (
          <>
            {rootCategories.map(cat => (
              <CategorySection
                key={cat.id}
                category={cat}
                docs={filteredDocs}
                allCategories={categories}
                activeDocId={activeDocument?.id}
                onSelect={onSelect}
                depth={0}
              />
            ))}

            {/* Uncategorized */}
            {uncategorized.length > 0 && (
              <UncategorizedSection
                docs={uncategorized}
                activeDocId={activeDocument?.id}
                onSelect={onSelect}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function UncategorizedSection({ docs, activeDocId, onSelect }: {
  docs: FamilyDocument[];
  activeDocId: string | null | undefined;
  onSelect: (doc: FamilyDocument) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '5px 12px', cursor: 'pointer', userSelect: 'none',
          borderBottom: '1px solid var(--border-dim)',
          background: 'var(--bg-card)',
        }}
      >
        <span style={{ fontSize: 9, color: 'var(--text-4)', width: 10, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
        <span style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, color: 'var(--text-4)', flex: 1 }}>Uncategorized</span>
        <span style={{ fontSize: 10, color: 'var(--text-5)' }}>{docs.length}</span>
      </div>
      {open && docs.map(doc => (
        <DocRow key={doc.id} doc={doc} active={doc.id === activeDocId} onClick={() => onSelect(doc)} />
      ))}
    </div>
  );
}
