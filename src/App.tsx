import React, { useEffect } from 'react';
import { Container, Nav } from 'react-bootstrap';
import Navbar from 'react-bootstrap/Navbar';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { LinkContainer } from 'react-router-bootstrap';
import { AppProvider, useAppContext } from './context/AppContext';
import { readMetadata } from './utils/exiftool';
import { readPeopleJson } from './utils/people';
import { readDocumentsJson } from './utils/documents';

const path = (window as any).require('path') as typeof import('path');
const DIR_PATH = path.join(process.cwd(), 'public', 'images');

function AppShell() {
  const { dispatch } = useAppContext();

  useEffect(() => {
    async function load() {
      const people = await readPeopleJson();
      dispatch({ type: 'SET_PEOPLE', people });
      const photos = await readMetadata(DIR_PATH, people);
      dispatch({ type: 'SET_PHOTOS', photos });
      const documents = await readDocumentsJson();
      dispatch({ type: 'SET_DOCUMENTS', documents });
    }
    load();
  }, [dispatch]);

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
        <Route path="/photos" element={<div>Photos</div>} />
        <Route path="/documents" element={<div>Documents</div>} />
        <Route path="/people/*" element={<div>People</div>} />
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
