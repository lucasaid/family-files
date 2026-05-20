import React, { useEffect, useState } from 'react';
import { HashRouter, Route, Routes, NavLink } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { syncAndLoad, SyncStatus } from './utils/sync';
import Photos from './Photos';
import PeopleRoute from './People';
import DocumentsRoute from './Documents';
import LoadingScreen from './LoadingScreen';

interface LoadState {
  status: SyncStatus;
  addedPeople: string[];
  error: string | null;
  done: boolean;
}

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/photos', label: 'Photos' },
  { to: '/documents', label: 'Documents' },
  { to: '/people', label: 'People' },
];

function AppNav() {
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', gap: 0,
      background: '#09090f',
      borderBottom: '1px solid #1e1e2e',
      padding: '0 24px',
      height: 44,
      flexShrink: 0,
    }}>
      {/* Wordmark */}
      <span style={{
        fontFamily: '"Georgia", "Times New Roman", serif',
        fontSize: 15,
        fontWeight: 400,
        letterSpacing: '0.04em',
        color: '#c8d8f8',
        marginRight: 32,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}>
        Family Files
      </span>

      {/* Hairline separator */}
      <div style={{ width: 1, height: 16, background: '#2a2a3a', marginRight: 32, flexShrink: 0 }} />

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {NAV_LINKS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              height: 44,
              fontSize: 11,
              fontFamily: 'system-ui, sans-serif',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              color: isActive ? '#9bb8f5' : '#666',
              borderBottom: isActive ? '2px solid #9bb8f5' : '2px solid transparent',
              transition: 'color 0.15s, border-color 0.15s',
              boxSizing: 'border-box',
            })}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function AppShell() {
  const { dispatch } = useAppContext();
  const [load, setLoad] = useState<LoadState>({
    status: 'reading-people',
    addedPeople: [],
    error: null,
    done: false,
  });

  useEffect(() => {
    syncAndLoad(status => setLoad(prev => ({ ...prev, status })))
      .then(result => {
        dispatch({ type: 'SET_PEOPLE', people: result.people });
        dispatch({ type: 'SET_PHOTOS', photos: result.photos });
        dispatch({ type: 'SET_DOCUMENTS', documents: result.documents });
        setLoad(prev => ({ ...prev, addedPeople: result.addedPeople, done: true }));
      })
      .catch(err => {
        setLoad(prev => ({ ...prev, error: String(err), done: true }));
      });
  }, [dispatch]);

  if (!load.done) {
    return <LoadingScreen status={load.status} addedPeople={load.addedPeople} error={load.error} />;
  }

  return (
    <div style={{ boxSizing: 'border-box', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppNav />
      <Routes>
        <Route path="/" element={<h1 style={{ padding: 24 }}>Home</h1>} />
        <Route path="/photos" element={<Photos />} />
        <Route path="/documents" element={<DocumentsRoute />} />
        <Route path="/people/*" element={<PeopleRoute />} />
        <Route path="/tree" element={<h1 style={{ padding: 24 }}>Tree</h1>} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppShell />
      </HashRouter>
    </AppProvider>
  );
}
