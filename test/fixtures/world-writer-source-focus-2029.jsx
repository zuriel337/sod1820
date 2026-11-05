import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useSearchParams } from "react-router-dom";
import PublicContributor2029Page from "../../src/pages/PublicContributor2029Page.jsx";
import WorldPeopleSources2029 from "../../src/components/research/WorldPeopleSources2029.jsx";
import { fetchWorldPublicPeopleIndex } from "../../src/lib/research/worldPublicPeopleIndex.js";
import { use2029Palette } from "../../src/lib/palette.js";
import { setThemePreset } from "../../src/lib/themeMode.js";
import { TYPEFACE, TYPE_SCALE_V2 } from "../../src/lib/designTokens.js";
import "../../src/pages/world2029-human.css";
import "../../src/pages/worldComposition2029.css";

const requestedTheme = new URLSearchParams(location.search).get("theme");
if (requestedTheme) setThemePreset(requestedTheme);

function WorldReview() {
  const [params] = useSearchParams();
  const [state, setState] = useState({ index: null, loading: true, error: null });
  useEffect(() => {
    let active = true;
    fetchWorldPublicPeopleIndex().then((index) => active && setState({ index, loading: false, error: null }))
      .catch((error) => active && setState({ index: null, loading: false, error }));
    return () => { active = false; };
  }, []);
  return <WorldPeopleSources2029 {...state} focusedSourceRef={params.get("sourceRef")} />;
}

function Review() {
  const P = use2029Palette();
  const style = { background: P.pageBg, color: P.ink, minHeight: "100vh", padding: 16,
    "--s29-font-ui": TYPEFACE.ui, "--s29-font-body": TYPEFACE.body, "--s29-font-numeric": TYPEFACE.numeric,
    "--s29-ink": P.ink, "--s29-ink-soft": P.inkSoft, "--s29-panel": P.card, "--s29-line": P.border,
    "--s29-accent-text": P.accentText };
  for (const [key, value] of Object.entries(TYPE_SCALE_V2)) style[`--s29-type-${key}`] = `${value.fontSize}px`;
  return <main className="sod29-root surface-world" style={style}>
    <Routes>
      <Route path="/world" element={<WorldReview />} />
      <Route path="/community/researcher/:slug" element={<PublicContributor2029Page />} />
      <Route path="/:slug" element={<h1>מקור המאמר המקורי · נתוני בדיקה</h1>} />
    </Routes>
  </main>;
}

createRoot(document.getElementById("root")).render(<BrowserRouter><Review /></BrowserRouter>);
