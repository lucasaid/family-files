import React, { useState, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from './context/AppContext';
import { Photo } from './context/types';
import LazyCell from './components/LazyCell';

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

function matchesSearch(photo: Photo, query: string, field: SearchField): boolean {
  const q = query.toLowerCase();
  const check = (v: string | null | undefined) => !!v && v.toLowerCase().includes(q);
  switch (field) {
    case 'title':    return check(photo.file);
    case 'caption':  return check(photo.caption);
    case 'date':     return check(photo.date);
    case 'location': return check(photo.city) || check(photo.state) || check(photo.country);
    case 'camera':   return check(photo.camera);
    case 'keywords': return photo.keywords.some(k => k.toLowerCase().includes(q));
    case 'people':   return photo.faces.some(f => f.name.toLowerCase().includes(q));
    case 'all':
      return check(photo.file) || check(photo.caption) || check(photo.date) ||
        check(photo.city) || check(photo.state) || check(photo.country) ||
        check(photo.camera) ||
        photo.keywords.some(k => k.toLowerCase().includes(q)) ||
        photo.faces.some(f => f.name.toLowerCase().includes(q));
  }
}

interface CellProps {
  photo: Photo;
  onClick: (photo: Photo) => void;
}

const PhotoCell = memo(function PhotoCell({ photo, onClick }: CellProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(photo)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(photo); } }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`Open ${photo.file}`}
      style={{
        position: 'relative', aspectRatio: '1',
        cursor: 'pointer', overflow: 'hidden',
        borderRadius: 2, background: 'var(--bg-card)',
      }}
    >
      <img
        src={photo.thumbnailPath ?? photo.path}
        alt={photo.file}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        style={{
          width: '100%', height: '100%',
          objectFit: 'cover', display: 'block',
          opacity: loaded ? 1 : 0,
          transform: isHovered ? 'scale(1.05)' : 'scale(1)',
          transition: 'opacity 0.15s ease-out, transform 0.25s ease-out',
        }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,.75) 0%, rgba(0,0,0,.1) 45%, transparent 100%)',
        opacity: isHovered ? 1 : 0,
        transition: 'opacity 0.2s ease-out',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: '10px 10px 8px',
        pointerEvents: 'none',
      }}>
        {photo.date && (
          <span style={{
            fontSize: 10, color: 'rgba(255,255,255,.5)',
            letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase', marginBottom: 2,
          }}>
            {photo.date.slice(0, 10).replace(/:/g, '–')}
          </span>
        )}
        <span style={{
          fontSize: 'var(--font-size-label)', color: 'rgba(255,255,255,.85)',
          letterSpacing: 'var(--tracking-tight)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {photo.file}
        </span>
        {photo.faces.length > 0 && (
          <span style={{
            fontSize: 10, color: 'rgba(240,176,96,.7)',
            marginTop: 3, letterSpacing: 'var(--tracking-wordmark)',
          }}>
            {photo.faces.map(f => f.name).join(', ')}
          </span>
        )}
      </div>
      {photo.rating != null && photo.rating > 0 && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          background: 'rgba(0,0,0,.65)',
          borderRadius: 3, padding: '2px 5px',
          fontSize: 10, color: 'var(--amber)',
          letterSpacing: '0.5px', pointerEvents: 'none',
        }}>
          {'★'.repeat(photo.rating)}
        </div>
      )}
    </div>
  );
});

export default function Home() {
  const { state, dispatch } = useAppContext();
  const { photos } = state;
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('all');
  const [sort, setSort] = useState<'title-asc' | 'title-desc' | 'date-desc' | 'date-asc' | 'people-desc' | 'people-asc'>('date-desc');

  const filteredPhotos = useMemo(() => (
    search.trim()
      ? photos.filter(p => matchesSearch(p, search.trim(), searchField))
      : [...photos]
  ).sort((a, b) => {
    switch (sort) {
      case 'title-desc':   return b.file.localeCompare(a.file);
      case 'date-desc':    return (b.date ?? '').localeCompare(a.date ?? '');
      case 'date-asc':     return (a.date ?? '').localeCompare(b.date ?? '');
      case 'people-desc':  return b.faces.length - a.faces.length;
      case 'people-asc':   return a.faces.length - b.faces.length;
      case 'title-asc':
      default:   return a.file.localeCompare(b.file);
    }
  }), [photos, search, searchField, sort]);

  const openPhoto = useCallback((photo: Photo) => {
    dispatch({ type: 'SET_ACTIVE_PHOTO', photo });
    navigate('/photos');
  }, [dispatch, navigate]);

  if (photos.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 12, color: 'var(--text-3)',
        fontFamily: 'var(--font-sans)',
      }}>
        <span style={{ fontSize: 'var(--font-size-body)', fontStyle: 'italic' }}>No photos in the archive yet.</span>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
    borderRadius: 3, padding: '5px 10px', color: 'var(--input-text)',
    fontSize: 'var(--font-size-ui)', fontFamily: 'var(--font-sans)',
  };

  return (
    <div style={{ padding: '24px 24px', background: 'var(--bg)', minHeight: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, marginBottom: 20, paddingBottom: 16,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexShrink: 0 }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'var(--font-size-headline)', fontWeight: 400, color: 'var(--text-heading)',
            margin: 0, letterSpacing: 'var(--tracking-tight)',
          }}>
            Archive
          </h1>
          <span style={{
            fontSize: 'var(--font-size-label)', fontWeight: 500, letterSpacing: 'var(--tracking-wider)',
            textTransform: 'uppercase', color: 'var(--text-4)',
          }}>
            {search.trim() && filteredPhotos.length !== photos.length
              ? `${filteredPhotos.length} of ${photos.length}`
              : `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search photos…"
            aria-label="Search photos"
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
            <option value="date-desc">Date (newest)</option>
            <option value="date-asc">Date (oldest)</option>
            <option value="title-asc">Title A–Z</option>
            <option value="title-desc">Title Z–A</option>
            <option value="people-desc">Most people</option>
            <option value="people-asc">Fewest people</option>
          </select>
        </div>
      </div>

      {filteredPhotos.length === 0 ? (
        <div style={{ padding: '32px 0', color: 'var(--text-4)', fontSize: 'var(--font-size-body)', fontStyle: 'italic' }}>
          No photos match "{search}".
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 3,
        }}>
          {filteredPhotos.map(photo => (
            <LazyCell key={photo.path}>
              <PhotoCell photo={photo} onClick={openPhoto} />
            </LazyCell>
          ))}
        </div>
      )}
    </div>
  );
}
