import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import WorldPeopleSources2029 from "../../src/components/research/WorldPeopleSources2029.jsx";
import WorldZviSourceFindings2029 from "../../src/components/research/WorldZviSourceFindings2029.jsx";
import "../../src/pages/world2029-human.css";
import "../../src/pages/worldComposition2029.css";
import "../../src/components/experience2029/systemFrame2029.css";

const A = "channel_updates:e720a119-00e7-4e27-8c8a-d8671ae7b474";
const B = "channel_updates:f720a119-00e7-4e27-8c8a-d8671ae7b474";
const zvi = { id: "c66f0464-0928-490e-be9b-66d8a87e7fc8", slug: "tzvi-opoc", displayName: "צבי", href: "/writer/zvi" };
const other = { id: "22222222-2222-4222-8222-222222222222", slug: "other", displayName: "מחבר אחר", href: "/writer/other" };

function Fixture() {
  const location = useLocation();
  const [ref, setRef] = useState(A);
  const style = { "--s29-font-ui": "Rubik, sans-serif", "--s29-font-body": "'Noto Sans Hebrew', sans-serif",
    "--s29-type-body": "18px", "--s29-accent-text": "#174873", "--s29-panel": "#fff",
    "--s29-line": "#666", "--s29-ink": "#151515", "--s29-ink-soft": "#333" };
  return <main className="sod29-root surface-world" style={style} dir="rtl">
    {location.pathname === "/world" && new URLSearchParams(location.search).has("finding")
      ? <h1>ממצא ממוקד</h1>
      : <WorldPeopleSources2029 index={{ bySlug: { "tzvi-opoc": zvi, other }, people: [zvi, other] }} />}
    <section aria-label="בדיקת החלפת מקור">
      <button type="button" onClick={() => setRef(A)}>מקור בדיקה א</button>
      <button type="button" onClick={() => setRef(B)}>מקור בדיקה ב</button>
      <WorldZviSourceFindings2029 sourceRef={ref} returnTo="/world?view=sources&source=tzvi-opoc#exact" />
    </section>
  </main>;
}
createRoot(document.getElementById("root")).render(<BrowserRouter><Fixture /></BrowserRouter>);
