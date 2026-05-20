import React, { useEffect, useState } from 'react';
import { Container, Nav } from 'react-bootstrap';
import Navbar from 'react-bootstrap/Navbar';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { LinkContainer } from 'react-router-bootstrap';
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
      <Navbar expand="lg" className="bg-body-tertiary">
        <Container>
          <Navbar.Brand href="/">Family Browser</Navbar.Brand>
          <Navbar.Toggle aria-controls="main-nav" />
          <Navbar.Collapse id="main-nav">
            <Nav className="me-auto">
              <LinkContainer to="/"><Nav.Link>Home</Nav.Link></LinkContainer>
              <LinkContainer to="/photos"><Nav.Link>Photos</Nav.Link></LinkContainer>
              <LinkContainer to="/documents"><Nav.Link>Documents</Nav.Link></LinkContainer>
              <LinkContainer to="/people"><Nav.Link>People</Nav.Link></LinkContainer>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
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
