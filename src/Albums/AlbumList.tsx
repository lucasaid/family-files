import React, { useState, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Photo } from '../context/types';
import { createAlbum } from '../utils/albums';
import LazyCell from '../components/LazyCell';

type SearchField = 'all' | 'title' | 'caption' | 'date' | 'location' | 'camera' | 'keywords' | 'people';

const SEARCH_FIELDS: { value: SearchField; label: string }[] = [
  { value: 'all',      label: 'All fields' },
  { value: 'title',    label: 'Title' },
  { value: 'caption',  label: 'Caption' },
  { value: 'date',     label: 'Date' },
  { value: 'location', label: 'Location' },
  { value: 'camera',   label: 'Camera' },
  { value: 'keywords', label: 'Keywords' },
  { value: 'people',   label: 'People' },
];

function albumMatchesSearch(albumName: string, albumPhotos: Photo[], query: string, field: SearchField): boolean {
  const q = query.toLowerCase();
  const check = (v: string | null | undefined) => !!v && v.toLowerCase().includes(q);
  const anyPhoto = (test: (p: Photo) => boolean) => albumPhotos.some(test);
  switch (field) {
    case 'title':    return check(albumName);
    case 'caption':  return anyPhoto(p => check(p.caption));
    case 'date':     return anyPhoto(p => check(p.date));
    case 'location': return anyPhoto(p => check(p.city) || check(p.state) || check(p.country));
    case 'camera':   return anyPhoto(p => check(p.camera));
    case 'keywords': return anyPhoto(p => p.keywords.some(k => k.toLowerCase().includes(q)));
    case 'people':   return anyPhoto(p => p.faces.some(f => f.name.toLowerCase().includes(q)));
    case 'all':
      return check(albumName) ||
        anyPhoto(p =>
          check(p.caption) || check(p.date) ||
          check(p.city) || check(p.state) || check(p.country) ||
          check(p.camera) ||
          p.keywords.some(k => k.toLowerCase().includes(q)) ||
          p.faces.some(f => f.name.toLowerCase().includes(q))
        );
  }
}

interface AlbumCellProps {
  name: string;
  count: number;
  coverPhoto: Photo | undefined;
  onClick: (name: string) => void;
}

const AlbumCell = memo(function AlbumCell({ name, count, coverPhoto, onClick }: AlbumCellProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(name)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(name); } }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`Open album ${name}`}
      style={{ position: 'relative', aspectRatio: '1', cursor: 'pointer', overflow: 'hidden', borderRadius: 2, background: 'var(--bg-card)' }}
    >
      {coverPhoto ? (
        <img
          src={coverPhoto.thumbnailPath ?? coverPhoto.path}
          alt={name}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          style={{
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            opacity: loaded ? 1 : 0,
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
            transition: 'opacity 0.15s ease-out, transform 0.25s ease-out',
          }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--border-muted)', fontSize: 32 }}>
          ▦
        </div>
      )}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,.85) 0%, rgba(0,0,0,.2) 50%, transparent 100%)',
        opacity: coverPhoto ? (isHovered ? 1 : 0.7) : 1,
        transition: 'opacity 0.2s ease-out',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: '10px 10px 10px', pointerEvents: 'none',
      }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-body)', color: 'rgba(255,255,255,.9)', letterSpacing: 'var(--tracking-tight)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase', marginTop: 2 }}>
          {count} {count === 1 ? 'photo' : 'photos'}
        </span>
      </div>
    </div>
  );
});

export default function AlbumList() {
  const { state, dispatch } = useAppContext();
  const { albums, photos } = state;
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('all');
  const [sort, setSort] = useState<'title-asc' | 'title-desc' | 'count-desc' | 'count-asc'>('title-asc');

  // Only show root-level albums in the main list
  const rootAlbums = useMemo(() => albums.filter(a => !a.includes('/')), [albums]);

  // Build album→photos map — for root albums, include photos from all descendants
  const albumPhotoMap = useMemo(() => {
    const map = new Map<string, Photo[]>();
    for (const album of rootAlbums) map.set(album, []);
    for (const photo of photos) {
      if (!photo.album) continue;
      const root = photo.album.split('/')[0];
      map.get(root)?.push(photo);
    }
    return map;
  }, [photos, rootAlbums]);

  const albumPhotos = useCallback((name: string) => albumPhotoMap.get(name) ?? [], [albumPhotoMap]);
  const cover = useCallback((name: string) => albumPhotoMap.get(name)?.[0], [albumPhotoMap]);

  const filteredAlbums = useMemo(() => {
    const ap = (name: string) => albumPhotoMap.get(name) ?? [];
    return (search.trim()
      ? rootAlbums.filter(name => albumMatchesSearch(name, ap(name), search.trim(), searchField))
      : [...rootAlbums]
    ).sort((a, b) => {
      switch (sort) {
        case 'title-desc':  return b.localeCompare(a);
        case 'count-desc':  return (albumPhotoMap.get(b)?.length ?? 0) - (albumPhotoMap.get(a)?.length ?? 0);
        case 'count-asc':   return (albumPhotoMap.get(a)?.length ?? 0) - (albumPhotoMap.get(b)?.length ?? 0);
        case 'title-asc':
        default:   return a.localeCompare(b);
      }
    });
  }, [search, rootAlbums, albumPhotoMap, searchField, sort]);

  const inputStyle: React.CSSProperties = {
    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
    borderRadius: 3, padding: '5px 10px', color: 'var(--input-text)',
    fontSize: 'var(--font-size-ui)', fontFamily: 'var(--font-sans)',
  };

  const handleAlbumClick = useCallback((name: string) => {
    navigate(`/albums/${encodeURIComponent(name)}`);
  }, [navigate]);

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
    <div style={{ padding: '24px 24px', background: 'var(--bg)', minHeight: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexShrink: 0 }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'var(--font-size-headline)', fontWeight: 400, color: 'var(--text-heading)',
            margin: 0, letterSpacing: 'var(--tracking-tight)',
          }}>
            Albums
          </h1>
          {rootAlbums.length > 0 && (
            <span style={{ fontSize: 'var(--font-size-label)', fontWeight: 500, letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase', color: 'var(--text-4)' }}>
              {search.trim() && filteredAlbums.length !== rootAlbums.length
                ? `${filteredAlbums.length} of ${rootAlbums.length}`
                : `${rootAlbums.length} ${rootAlbums.length === 1 ? 'album' : 'albums'}`}
            </span>
          )}
        </div>

        {albums.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search albums…"
              aria-label="Search albums"
              style={{ ...inputStyle, flex: 1 }}
            />
            <select
              value={searchField}
              onChange={e => setSearchField(e.target.value as SearchField)}
              aria-label="Search by field"
              style={{ ...inputStyle, flexShrink: 0, cursor: 'pointer' }}
            >
              {SEARCH_FIELDS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as typeof sort)}
              aria-label="Sort order"
              style={{ ...inputStyle, flexShrink: 0, cursor: 'pointer' }}
            >
              <option value="title-asc">Title A–Z</option>
              <option value="title-desc">Title Z–A</option>
              <option value="count-desc">Most photos</option>
              <option value="count-asc">Fewest photos</option>
            </select>
          </div>
        )}

        {!creating && (
          <button
            onClick={() => setCreating(true)}
            style={{
              background: 'none', border: '1px solid var(--border-muted)', borderRadius: 3,
              padding: '4px 12px', color: 'var(--accent)', fontSize: 'var(--font-size-label)', flexShrink: 0,
              fontWeight: 500, letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase', cursor: 'pointer',
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
              flex: 1, background: 'var(--input-bg)', border: '1px solid var(--input-border)',
              borderRadius: 3, padding: '5px 10px', color: 'var(--input-text)',
              fontSize: 'var(--font-size-body)', fontFamily: 'var(--font-sans)',
            }}
          />
          <button onClick={handleCreate} style={{ background: 'var(--btn-save-bg)', border: '1px solid var(--btn-save-border)', borderRadius: 3, padding: '5px 12px', color: 'var(--btn-save-text)', fontSize: 'var(--font-size-label)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase', cursor: 'pointer' }}>
            Create
          </button>
          <button onClick={() => { setCreating(false); setNewName(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 'var(--font-size-label)', cursor: 'pointer', padding: '5px 8px' }}>
            Cancel
          </button>
        </div>
      )}

      {rootAlbums.length === 0 && !creating && (
        <div style={{ padding: '32px 0', color: 'var(--text-4)', fontSize: 'var(--font-size-body)', fontStyle: 'italic' }}>
          No albums yet. Create one to organise your photos.
        </div>
      )}
      {albums.length > 0 && filteredAlbums.length === 0 && (
        <div style={{ padding: '32px 0', color: 'var(--text-4)', fontSize: 'var(--font-size-body)', fontStyle: 'italic' }}>
          No albums match "{search}".
        </div>
      )}

      {/* Album grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 3 }}>
        {filteredAlbums.map(name => (
          <LazyCell key={name}>
            <AlbumCell
              name={name}
              count={albumPhotos(name).length}
              coverPhoto={cover(name)}
              onClick={handleAlbumClick}
            />
          </LazyCell>
        ))}
      </div>
    </div>
  );
}
