// src/Albums/AlbumList.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { createAlbum } from '../utils/albums';

export default function AlbumList() {
  const { state, dispatch } = useAppContext();
  const { albums, photos } = state;
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [hoveredAlbum, setHoveredAlbum] = useState<string | null>(null);

  const albumPhotos = (name: string) => photos.filter(p => p.album === name);
  const cover = (name: string) => albumPhotos(name)[0];

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (albums.includes(trimmed)) { alert(`Album "${trimmed}" already exists.`); return; }
    try {
      await createAlbum(trimmed);
      dispatch({ type: 'ADD_ALBUM', name: trimmed });
      setNewName('');
      setCreating(false);
    } catch (err) {
      alert(`Failed to create album: ${(err as Error).message}`);
    }
  };

  return (
    <div style={{ padding: '24px 24px', background: '#09090f', minHeight: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #1e1e2e',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={{
            fontFamily: '"Georgia", "Times New Roman", serif',
            fontSize: 20, fontWeight: 400, color: '#c8d8f8',
            margin: 0, letterSpacing: '0.01em',
          }}>
            Albums
          </h1>
          {albums.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#333' }}>
              {albums.length} {albums.length === 1 ? 'album' : 'albums'}
            </span>
          )}
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            style={{
              background: 'none', border: '1px solid #2a2a3a', borderRadius: 3,
              padding: '4px 12px', color: '#9bb8f5', fontSize: 11,
              fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            + New album
          </button>
        )}
      </div>

      {/* New album input */}
      {creating && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName(''); } }}
            placeholder="Album name"
            style={{
              flex: 1, background: '#0d0d14', border: '1px solid #2a3a5a',
              borderRadius: 3, padding: '5px 10px', color: '#ddd',
              fontSize: 13, fontFamily: 'system-ui, sans-serif', outline: 'none',
            }}
          />
          <button onClick={handleCreate} style={{ background: 'none', border: '1px solid #2a4a2a', borderRadius: 3, padding: '5px 12px', color: '#7ecfa0', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Create
          </button>
          <button onClick={() => { setCreating(false); setNewName(''); }} style={{ background: 'none', border: 'none', color: '#444', fontSize: 11, cursor: 'pointer', padding: '5px 8px' }}>
            Cancel
          </button>
        </div>
      )}

      {albums.length === 0 && !creating && (
        <div style={{ padding: '32px 0', color: '#444', fontSize: 13, fontStyle: 'italic' }}>
          No albums yet. Create one to organise your photos.
        </div>
      )}

      {/* Album grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 3,
      }}>
        {albums.map(name => {
          const isHovered = hoveredAlbum === name;
          const coverPhoto = cover(name);
          const count = albumPhotos(name).length;
          return (
            <div
              key={name}
              onClick={() => navigate(`/albums/${encodeURIComponent(name)}`)}
              onMouseEnter={() => setHoveredAlbum(name)}
              onMouseLeave={() => setHoveredAlbum(null)}
              style={{
                position: 'relative',
                aspectRatio: '1',
                cursor: 'pointer',
                overflow: 'hidden',
                borderRadius: 2,
                background: '#111',
              }}
            >
              {coverPhoto ? (
                <img
                  src={coverPhoto.path}
                  alt={name}
                  style={{
                    width: '100%', height: '100%',
                    objectFit: 'cover', display: 'block',
                    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                    transition: 'transform 0.25s ease',
                  }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#2a2a3a', fontSize: 32,
                }}>
                  ▦
                </div>
              )}

              {/* Gradient overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,.85) 0%, rgba(0,0,0,.2) 50%, transparent 100%)',
                opacity: coverPhoto ? (isHovered ? 1 : 0.7) : 1,
                transition: 'opacity 0.2s ease',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                padding: '10px 10px 10px',
                pointerEvents: 'none',
              }}>
                <span style={{
                  fontFamily: '"Georgia", "Times New Roman", serif',
                  fontSize: 13, color: 'rgba(255,255,255,.9)',
                  letterSpacing: '0.01em',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {name}
                </span>
                <span style={{
                  fontSize: 10, color: 'rgba(255,255,255,.4)',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  marginTop: 2,
                }}>
                  {count} {count === 1 ? 'photo' : 'photos'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
