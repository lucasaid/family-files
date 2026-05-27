// src/People/PeopleManager.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { writePeopleJson } from '../utils/people';
import { dataPath } from '../utils/paths';
import { writeFaceRegions } from '../utils/exiftool';
import { Person } from '../context/types';
import PersonAvatar from './PersonAvatar';

function generateId() { return crypto.randomUUID(); }

export default function PeopleManager() {
  const { state, dispatch } = useAppContext();
  const { people, photos, documents } = state;
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<'name-asc' | 'name-desc' | 'photos-desc' | 'photos-asc'>('name-asc');

  const profileIds = useMemo(() => {
    const set = new Set<string>();
    try {
      const fs   = (window as any).require('fs')   as typeof import('fs');
      const path = (window as any).require('path') as typeof import('path');
      for (const person of people) {
        if (fs.existsSync(path.join(dataPath, 'research', `${person.id}.json`))) {
          set.add(person.id);
        }
      }
    } catch { /* not in Electron */ }
    return set;
  }, [people]);

  // Build count maps once per photos/documents change — avoids O(n²) scans during sort
  const photoCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const photo of photos) {
      for (const face of photo.faces) {
        if (face.personId) map.set(face.personId, (map.get(face.personId) ?? 0) + 1);
      }
    }
    return map;
  }, [photos]);

  const docCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const doc of documents) {
      for (const id of doc.personIds) {
        map.set(id, (map.get(id) ?? 0) + 1);
      }
    }
    return map;
  }, [documents]);

  const photoCount = useCallback((id: string) => photoCountMap.get(id) ?? 0, [photoCountMap]);
  const docCount = useCallback((id: string) => docCountMap.get(id) ?? 0, [docCountMap]);

  const filteredPeople = useMemo(() => (
    search.trim()
      ? people.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      : [...people]
  ).sort((a, b) => {
    switch (sort) {
      case 'name-asc':    return a.name.localeCompare(b.name);
      case 'name-desc':   return b.name.localeCompare(a.name);
      case 'photos-desc': return (photoCountMap.get(b.id) ?? 0) - (photoCountMap.get(a.id) ?? 0);
      case 'photos-asc':  return (photoCountMap.get(a.id) ?? 0) - (photoCountMap.get(b.id) ?? 0);
    }
  }), [people, search, sort, photoCountMap]);

  const totalPages = Math.max(1, Math.ceil(filteredPeople.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pagedPeople = useMemo(
    () => filteredPeople.slice((clampedPage - 1) * pageSize, clampedPage * pageSize),
    [filteredPeople, clampedPage, pageSize]
  );

  const addPerson = async () => {
    if (!newName.trim()) return;
    const person: Person = { id: generateId(), name: newName.trim() };
    const updated = [...people, person];
    try {
      dispatch({ type: 'ADD_PERSON', person });
      await writePeopleJson(updated);
      setNewName('');
      setAdding(false);
    } catch (err) {
      dispatch({ type: 'REMOVE_PERSON', id: person.id });
      alert(`Failed to save: ${(err as Error).message}`);
    }
  };

  const startRename = (p: Person) => { setEditingId(p.id); setEditName(p.name); };

  const saveName = async (person: Person) => {
    if (!editName.trim()) return;
    const newName = editName.trim();
    if (newName === person.name) { setEditingId(null); return; }
    const updatedPeople = people.map(p => p.id === person.id ? { ...p, name: newName } : p);
    try {
      dispatch({ type: 'UPDATE_PERSON', person: { ...person, name: newName } });
      dispatch({ type: 'RENAME_PERSON_IN_FACES', personId: person.id, newName });
      await writePeopleJson(updatedPeople);
      const affectedPhotos = photos.filter(p => p.faces.some(f => f.personId === person.id));
      await Promise.all(affectedPhotos.map(photo => {
        const updatedFaces = photo.faces.map(f =>
          f.personId === person.id ? { ...f, name: newName } : f
        );
        return writeFaceRegions(photo.fsPath, updatedFaces);
      }));
      setEditingId(null);
    } catch (err) {
      dispatch({ type: 'UPDATE_PERSON', person });
      dispatch({ type: 'RENAME_PERSON_IN_FACES', personId: person.id, newName: person.name });
      alert(`Failed to save: ${(err as Error).message}`);
    }
  };

  const deletePerson = async (person: Person) => {
    const pc = photoCount(person.id);
    const dc = docCount(person.id);
    const msg = pc + dc > 0
      ? `${person.name} appears in ${pc} photo(s) and ${dc} document(s). Delete anyway?`
      : `Delete ${person.name}?`;
    if (!window.confirm(msg)) return;
    const updated = people.filter(p => p.id !== person.id);
    try {
      dispatch({ type: 'REMOVE_PERSON', id: person.id });
      await writePeopleJson(updated);
    } catch (err) {
      dispatch({ type: 'ADD_PERSON', person });
      alert(`Failed to delete: ${(err as Error).message}`);
    }
  };

  const inputStyle: React.CSSProperties = {
    flex: 1, background: 'var(--input-bg)', border: '1px solid var(--input-border)',
    borderRadius: 3, padding: '5px 10px', color: 'var(--input-text)',
    fontSize: 13, fontFamily: 'system-ui, sans-serif', outline: 'none',
  };

  return (
    <div style={{ padding: '32px 36px', maxWidth: 680, color: 'var(--text-1)', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: 28, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h2 style={{ fontFamily: '"Georgia", "Times New Roman", serif', fontSize: 22, fontWeight: 400, color: 'var(--text-heading)', margin: 0 }}>People</h2>
            {people.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)' }}>
                {filteredPeople.length === people.length ? `${people.length} ${people.length === 1 ? 'record' : 'records'}` : `${filteredPeople.length} of ${people.length}`}
              </span>
            )}
          </div>
          {!adding && (
            <button onClick={() => setAdding(true)} style={{ background: 'none', border: '1px solid var(--border-muted)', borderRadius: 3, padding: '5px 14px', color: 'var(--accent)', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
              + Add person
            </button>
          )}
        </div>
        {people.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="search"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search people…"
              style={{ ...inputStyle, flex: 1, boxSizing: 'border-box' }}
            />
            <select
              value={sort}
              onChange={e => { setSort(e.target.value as typeof sort); setPage(1); }}
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 3, padding: '5px 8px', color: 'var(--input-text)', fontSize: 11, cursor: 'pointer', outline: 'none', flexShrink: 0 }}
            >
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="photos-desc">Most photos</option>
              <option value="photos-asc">Fewest photos</option>
            </select>
          </div>
        )}
      </div>

      {adding && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
          <input
            autoFocus value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addPerson(); if (e.key === 'Escape') { setAdding(false); setNewName(''); } }}
            placeholder="Full name"
            style={inputStyle}
          />
          <button onClick={addPerson} style={{ background: 'var(--btn-save-bg)', border: '1px solid var(--btn-save-border)', borderRadius: 3, padding: '5px 12px', color: 'var(--btn-save-text)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>Save</button>
          <button onClick={() => { setAdding(false); setNewName(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 11, cursor: 'pointer', padding: '5px 8px' }}>Cancel</button>
        </div>
      )}

      {people.length === 0 && !adding && (
        <div style={{ padding: '32px 0', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic', letterSpacing: '0.02em' }}>No people in the archive yet.</div>
      )}
      {people.length > 0 && filteredPeople.length === 0 && (
        <div style={{ padding: '32px 0', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic', letterSpacing: '0.02em' }}>No people match "{search}".</div>
      )}

      <div>
        {pagedPeople.map((person, i) => {
          const globalIndex = (clampedPage - 1) * pageSize + i;
          const pc = photoCount(person.id);
          const dc = docCount(person.id);
          const isHovered = hoveredId === person.id;
          const isEditing = editingId === person.id;

          return (
            <div
              key={person.id}
              onMouseEnter={() => setHoveredId(person.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
            >
              {isEditing ? (
                <>
                  <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveName(person); if (e.key === 'Escape') setEditingId(null); }} style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={() => saveName(person)} style={{ background: 'var(--btn-save-bg)', border: '1px solid var(--btn-save-border)', borderRadius: 3, padding: '5px 12px', color: 'var(--btn-save-text)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>Save</button>
                  <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 11, cursor: 'pointer', padding: '5px 8px' }}>Cancel</button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-5)', letterSpacing: '0.06em', width: 24, textAlign: 'right', flexShrink: 0, userSelect: 'none' }}>
                    {String(globalIndex + 1).padStart(2, '0')}
                  </span>
                  <PersonAvatar personId={person.id} size={40} />
                  <span
                    onClick={() => navigate(`/people/${person.id}`)}
                    style={{ flex: 1, color: isHovered ? 'var(--text-heading)' : 'var(--text-2)', fontSize: 14, cursor: 'pointer', fontFamily: '"Georgia", "Times New Roman", serif', letterSpacing: '0.01em', transition: 'color 0.12s' }}
                  >
                    {person.name}
                  </span>
                  {profileIds.has(person.id) && (
                    <span title="Research profile available" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', flexShrink: 0, opacity: 0.85 }} />
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {pc > 0 && <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{pc} photo{pc !== 1 ? 's' : ''}</span>}
                    {dc > 0 && <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{dc} doc{dc !== 1 ? 's' : ''}</span>}
                    {pc === 0 && dc === 0 && <span style={{ fontSize: 10, color: 'var(--text-5)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>no records</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 4, opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s' }}>
                    <button onClick={() => startRename(person)} aria-label={`Rename ${person.name}`} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: '2px 6px', letterSpacing: '0.04em' }}>Rename</button>
                    <button onClick={() => deletePerson(person)} aria-label={`Delete ${person.name}`} style={{ background: 'none', border: 'none', color: 'var(--color-error)', fontSize: 11, cursor: 'pointer', padding: '2px 6px', letterSpacing: '0.04em' }}>Delete</button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {filteredPeople.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[10, 20, 30, 50].map(size => (
              <button
                key={size}
                onClick={() => { setPageSize(size); setPage(1); }}
                style={{
                  background: pageSize === size ? 'var(--accent)' : 'none',
                  border: `1px solid ${pageSize === size ? 'var(--accent)' : 'var(--border-muted)'}`,
                  borderRadius: 3, padding: '4px 9px',
                  color: pageSize === size ? 'var(--text-5)' : 'var(--text-3)',
                  fontSize: 11, cursor: 'pointer', fontWeight: pageSize === size ? 600 : 400,
                }}
              >
                {size}
              </button>
            ))}
            <span style={{ fontSize: 10, color: 'var(--text-5)', letterSpacing: '0.06em', textTransform: 'uppercase', marginLeft: 2 }}>per page</span>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={clampedPage === 1}
                style={{ background: 'none', border: '1px solid var(--border-muted)', borderRadius: 3, padding: '4px 10px', color: clampedPage === 1 ? 'var(--text-5)' : 'var(--text-3)', fontSize: 11, cursor: clampedPage === 1 ? 'default' : 'pointer' }}
              >
                ←
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    background: p === clampedPage ? 'var(--accent)' : 'none',
                    border: `1px solid ${p === clampedPage ? 'var(--accent)' : 'var(--border-muted)'}`,
                    borderRadius: 3, padding: '4px 9px',
                    color: p === clampedPage ? 'var(--text-5)' : 'var(--text-3)',
                    fontSize: 11, cursor: 'pointer', fontWeight: p === clampedPage ? 600 : 400,
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={clampedPage === totalPages}
                style={{ background: 'none', border: '1px solid var(--border-muted)', borderRadius: 3, padding: '4px 10px', color: clampedPage === totalPages ? 'var(--text-5)' : 'var(--text-3)', fontSize: 11, cursor: clampedPage === totalPages ? 'default' : 'pointer' }}
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
