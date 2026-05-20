// src/People/PeopleManager.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { writePeopleJson } from '../utils/people';
import { Person } from '../context/types';

function generateId() { return Math.random().toString(36).slice(2, 10); }

export default function PeopleManager() {
  const { state, dispatch } = useAppContext();
  const { people, photos, documents } = state;
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const photoCount = (id: string) => photos.filter(p => p.faces.some(f => f.personId === id)).length;
  const docCount = (id: string) => documents.filter(d => d.personIds.includes(id)).length;

  const addPerson = async () => {
    if (!newName.trim()) return;
    const person: Person = { id: generateId(), name: newName.trim() };
    const updated = [...people, person];
    dispatch({ type: 'ADD_PERSON', person });
    await writePeopleJson(updated);
    setNewName('');
    setAdding(false);
  };

  const startRename = (p: Person) => { setEditingId(p.id); setEditName(p.name); };

  const saveName = async (person: Person) => {
    if (!editName.trim()) return;
    const updated = people.map(p => p.id === person.id ? { ...p, name: editName.trim() } : p);
    dispatch({ type: 'UPDATE_PERSON', person: { ...person, name: editName.trim() } });
    await writePeopleJson(updated);
    setEditingId(null);
  };

  const deletePerson = async (person: Person) => {
    const pc = photoCount(person.id);
    const dc = docCount(person.id);
    const msg = pc + dc > 0
      ? `${person.name} appears in ${pc} photo(s) and ${dc} document(s). Delete anyway?`
      : `Delete ${person.name}?`;
    if (!window.confirm(msg)) return;
    const updated = people.filter(p => p.id !== person.id);
    dispatch({ type: 'REMOVE_PERSON', id: person.id });
    await writePeopleJson(updated);
  };

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: '#ddd' }}>People</h2>
        <button onClick={() => setAdding(true)}
          style={{ background: '#2d3a5a', border: '1px solid #3a4a7a', borderRadius: 4, padding: '5px 14px', color: '#9bb8f5', cursor: 'pointer', fontSize: 13 }}>
          Add person
        </button>
      </div>

      {adding && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addPerson(); if (e.key === 'Escape') setAdding(false); }}
            placeholder="Name" style={{ flex: 1, background: '#1e1e30', border: '1px solid #3a3a5a', borderRadius: 3, padding: '4px 8px', color: '#ddd', fontSize: 13 }} />
          <button onClick={addPerson} style={{ background: '#2d5a2d', border: '1px solid #3a7a3a', borderRadius: 3, padding: '4px 12px', color: '#7ecfa0', fontSize: 13, cursor: 'pointer' }}>Add</button>
          <button onClick={() => setAdding(false)} style={{ background: '#2a2a3a', border: '1px solid #3a3a4a', borderRadius: 3, padding: '4px 12px', color: '#888', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
        </div>
      )}

      {people.length === 0 && !adding && (
        <div style={{ color: '#666', fontSize: 14 }}>No people in roster yet. Add one to get started.</div>
      )}

      {people.map(person => (
        <div key={person.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #222' }}>
          {editingId === person.id ? (
            <>
              <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(person); if (e.key === 'Escape') setEditingId(null); }}
                style={{ flex: 1, background: '#1e1e30', border: '1px solid #3a3a5a', borderRadius: 3, padding: '3px 6px', color: '#ddd', fontSize: 13 }} />
              <button onClick={() => saveName(person)} style={{ background: '#2d5a2d', border: '1px solid #3a7a3a', borderRadius: 3, padding: '2px 8px', color: '#7ecfa0', fontSize: 12, cursor: 'pointer' }}>Save</button>
              <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
            </>
          ) : (
            <>
              <span onClick={() => navigate(`/people/${person.id}`)}
                style={{ flex: 1, color: '#9bb8f5', cursor: 'pointer', fontSize: 14 }}>
                {person.name}
              </span>
              <span style={{ color: '#555', fontSize: 11 }}>{photoCount(person.id)} photos · {docCount(person.id)} docs</span>
              <button onClick={() => startRename(person)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 12 }}>Rename</button>
              <button onClick={() => deletePerson(person)} style={{ background: 'none', border: 'none', color: '#e55', cursor: 'pointer', fontSize: 12 }}>Delete</button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
