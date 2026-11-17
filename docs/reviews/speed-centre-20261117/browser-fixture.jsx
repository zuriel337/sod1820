// Controlled UI fixture for the speed centre (ZURIEL 17.11.2026). The real Control Plane page, Frame and CSS; a synthetic AuthContext and
// stub readers (visits.js, analytics2029.js) whose answers the browser test sets per scenario. No live read or write.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthFixture } from 'fixture-auth';
import ResearchProvider from '../../../src/lib/research/ResearchProvider.jsx';
import ControlPlane2029Page from '../../../src/pages/ControlPlane2029Page.jsx';

createRoot(document.getElementById('root')).render(<BrowserRouter><AuthFixture><ResearchProvider>
  <Routes>
    <Route path="/2029/control" element={<ControlPlane2029Page />} />
    <Route path="*" element={<main data-fixture-away="true"><p>signed-out</p></main>} />
  </Routes>
</ResearchProvider></AuthFixture></BrowserRouter>);
