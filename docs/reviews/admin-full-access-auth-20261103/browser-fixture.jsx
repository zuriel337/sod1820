// Controlled UI fixture. Real Frame/Home/feature resolver/CSS; synthetic AuthContext and readers.
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { AuthFixture } from 'fixture-auth';
import ResearchProvider from '../../../src/lib/research/ResearchProvider.jsx';
import Sod2029Shell from '../../../src/components/experience2029/Sod2029Shell.jsx';
import HomeComposition2029 from '../../../src/components/experience2029/HomeComposition2029.jsx';
import { setThemePreset } from '../../../src/lib/themeMode.js';

const primaryReader = async () => window.__fixture.posts;
function Surface() {
  const location = useLocation(), navigate = useNavigate();
  const surface = location.pathname === '/' ? 'home' : location.pathname.split('/')[1] || 'home';
  useEffect(() => { window.fixtureNavigate = navigate; window.fixtureTheme = setThemePreset; }, [navigate]);
  return <Sod2029Shell surface={surface} title={surface === 'home' ? 'בית' : 'משטח בדיקה'} introVariant="none">
    {surface === 'home' ? <HomeComposition2029 primaryReader={primaryReader} worldOpen={false}
      projection={{}} onSelectPost={() => {}} calculator={<a href="/gematria">מחשבון גימטריה</a>} />
      : <section className="sod29-card"><h1>משטח בדיקה · {surface}</h1><p>תוכן מבוקר בלבד; אין קריאה או כתיבה חיה.</p></section>}
  </Sod2029Shell>;
}
createRoot(document.getElementById('root')).render(<BrowserRouter><AuthFixture><ResearchProvider><Surface /></ResearchProvider></AuthFixture></BrowserRouter>);
