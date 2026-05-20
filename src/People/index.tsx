// src/People/index.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PeopleManager from './PeopleManager';
import PersonDetail from './PersonDetail';

export default function PeopleRoute() {
  return (
    <Routes>
      <Route index element={<PeopleManager />} />
      <Route path=":id" element={<PersonDetail />} />
    </Routes>
  );
}
