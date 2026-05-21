// src/People/PeopleManager.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { writePeopleJson } from '../utils/people';
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

  const photoCount = (id: string) => photos.filter(p => p.faces.some(f => f.personId === id)).length;
  const docCount = (id: string) => documents.filter(d => d.personIds.includes(id)).length;

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
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h2 style={{ fontFamily: '"Georgia", "Times New Roman", serif', fontSize: 22, fontWeight: 400, color: 'var(--text-heading)', margin: 0 }}>People</h2>
          {people.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)' }}>
              {people.length} {people.length === 1 ? 'record' : 'records'}
            </span>
          )}
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} style={{ background: 'none', border: '1px solid var(--border-muted)', borderRadius: 3, padding: '5px 14px', color: 'var(--accent)', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
            + Add person
          </button>
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

      <div>
        {people.map((person, i) => {
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
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <PersonAvatar personId={person.id} size={40} />
                  <span
                    onClick={() => navigate(`/people/${person.id}`)}
                    style={{ flex: 1, color: isHovered ? 'var(--text-heading)' : 'var(--text-2)', fontSize: 14, cursor: 'pointer', fontFamily: '"Georgia", "Times New Roman", serif', letterSpacing: '0.01em', transition: 'color 0.12s' }}
                  >
                    {person.name}
                  </span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {pc > 0 && <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{pc} photo{pc !== 1 ? 's' : ''}</span>}
                    {dc > 0 && <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{dc} doc{dc !== 1 ? 's' : ''}</span>}
                    {pc === 0 && dc === 0 && <span style={{ fontSize: 10, color: 'var(--text-5)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>no records</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 4, opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s' }}>
                    <button onClick={() => startRename(person)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: '2px 6px', letterSpacing: '0.04em' }}>Rename</button>
                    <button onClick={() => deletePerson(person)} style={{ background: 'none', border: 'none', color: '#664444', fontSize: 11, cursor: 'pointer', padding: '2px 6px', letterSpacing: '0.04em' }}>Delete</button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
