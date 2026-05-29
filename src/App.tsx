import { useEffect, useState } from 'react';
import { HashRouter, Route, Routes, NavLink, useNavigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { syncAndLoad, SyncStatus } from './utils/sync';
import { getThumbnailPath } from './utils/thumbnails';
import Photos from './Photos';
import PeopleRoute from './People';
import DocumentsRoute from './Documents';
import LoadingScreen from './LoadingScreen';
import Home from './Home';
import AlbumsRoute from './Albums';
import FamilyTree from './FamilyTree';
import SettingsModal from './Settings';
import ResearchProfilePage from './ResearchProfiles/ResearchProfilePage';

interface LoadState {
  status: SyncStatus;
  addedPeople: string[];
  error: string | null;
  done: boolean;
}

const BASE_NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/photos', label: 'Photos' },
  { to: '/albums', label: 'Albums' },
  { to: '/documents', label: 'Documents' },
  { to: '/people', label: 'People' },
];
const TREE_NAV_LINK = { to: '/tree', label: 'Family Tree', end: false };

function AppNav({ onOpenSettings }: { onOpenSettings: () => void }) {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { state } = useAppContext();
  const navLinks = state.familyChart !== null
    ? [...BASE_NAV_LINKS, TREE_NAV_LINK]
    : BASE_NAV_LINKS;
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', gap: 0,
      background: 'var(--bg)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      height: 44,
      flexShrink: 0,
    }}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        aria-label="Go back"
        className="btn-ghost-hover"
        style={{
          background: 'none', border: 'none', padding: '0 12px 0 0',
          color: 'var(--text-4)', fontSize: 16, cursor: 'pointer',
          display: 'flex', alignItems: 'center', lineHeight: 1,
        }}
      >
        ←
      </button>

      {/* Wordmark */}
      <span style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 'var(--font-size-wordmark)', fontWeight: 400, letterSpacing: 'var(--tracking-wordmark)',
        color: 'var(--text-heading)',
        marginRight: 32, whiteSpace: 'nowrap', userSelect: 'none',
      }}>
        Family Files
      </span>

      {/* Hairline separator */}
      <div style={{ width: 1, height: 16, background: 'var(--border-muted)', marginRight: 32, flexShrink: 0 }} />

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
        {navLinks.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="nav-link"
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center',
              padding: '0 12px', height: 44,
              fontSize: 'var(--font-size-label)', fontFamily: 'var(--font-sans)',
              fontWeight: 500, letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase',
              textDecoration: 'none',
              color: isActive ? 'var(--accent)' : 'var(--text-3)',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'color 0.15s, border-color 0.15s',
              boxSizing: 'border-box',
            })}
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="btn-outline-hover"
          style={{ background: 'none', border: '1px solid var(--border-muted)', borderRadius: 4, padding: '4px 10px', color: 'var(--text-3)', fontSize: 'var(--font-size-ui)', cursor: 'pointer', letterSpacing: '0.02em' }}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <button
          onClick={onOpenSettings}
          aria-label="Settings"
          className="btn-outline-hover"
          style={{ background: 'none', border: '1px solid var(--border-muted)', borderRadius: 4, padding: '4px 8px', color: 'var(--text-3)', fontSize: 'var(--font-size-title)', cursor: 'pointer', lineHeight: 1 }}
        >
          ⚙
        </button>
      </div>
    </nav>
  );
}

function AppShell() {
  const { dispatch } = useAppContext();
  const [load, setLoad] = useState<LoadState>({
    status: 'reading-gedcom',
    addedPeople: [],
    error: null,
    done: false,
  });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    syncAndLoad(status => setLoad(prev => ({ ...prev, status })))
      .then(result => {
        dispatch({ type: 'SET_PEOPLE', people: result.people });
        dispatch({ type: 'SET_PHOTOS', photos: result.photos });
        dispatch({ type: 'SET_ALBUMS', albums: result.albums });
        dispatch({ type: 'SET_DOCUMENTS', documents: result.documents });
        dispatch({ type: 'SET_CATEGORIES', categories: result.categories });
        dispatch({ type: 'SET_FAMILY_CHART', data: result.familyChart });
        dispatch({ type: 'SET_SETTINGS', settings: result.settings });
        setLoad(prev => ({ ...prev, addedPeople: result.addedPeople, done: true }));

        // Generate thumbnails in background for photos that don't have a cached one yet
        for (const photo of result.photos) {
          if (!photo.thumbnailPath) {
            getThumbnailPath(photo.fsPath).then(thumbPath => {
              if (thumbPath) dispatch({ type: 'SET_PHOTO_THUMBNAIL', fsPath: photo.fsPath, thumbnailPath: thumbPath });
            });
          }
        }
      })
      .catch(err => {
        setLoad(prev => ({ ...prev, error: String(err), done: true }));
      });
  }, [dispatch]);

  if (!load.done) {
    return <LoadingScreen status={load.status} addedPeople={load.addedPeople} error={load.error} />;
  }

  return (
    <div style={{ boxSizing: 'border-box', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <AppNav onOpenSettings={() => setShowSettings(true)} />
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg)', color: 'var(--text-1)' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/photos" element={<Photos />} />
          <Route path="/albums" element={<AlbumsRoute />} />
          <Route path="/albums/*" element={<AlbumsRoute />} />
          <Route path="/documents" element={<DocumentsRoute />} />
          <Route path="/people/*" element={<PeopleRoute />} />
          <Route path="/tree" element={<FamilyTree />} />
          <Route path="/profile/:personId" element={<ResearchProfilePage />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <HashRouter>
          <AppShell />
        </HashRouter>
      </AppProvider>
    </ThemeProvider>
  );
}
