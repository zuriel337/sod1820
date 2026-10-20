// Design preview harness: the real 1718 case (graph edges + engine values read from canonical Supabase,
// 19.10.2026) rendered by the production ContextMap2029 under the three System Frame palettes.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ContextMap2029 } from "../../../src/components/experience2029/ContextMap2029.jsx";
import { buildContextMap } from "../../../src/lib/research/contextMapProjection2029.js";
import { DESIGN_V2_PALETTES } from "../../../src/lib/palette.js";

const side = (id, type, label, href = null) => ({ id, type, label, href });
const N1718 = side("f8c03161", "number", "1718", "/number/1718");
const P5112 = side("f42e2a16", "post", "טיסה 1073 — 14,000 רגל, 363 והנחיתה בסעודיה", "/post/flydubai-fz1073-363-14000-remzei-geula");
const PHRASE = side("e67caa39", "entity", "כב בתשרי תשפד");
const P233 = side("3fd27516", "post", "רמזי מלחמת \"חרבות ברזל\" שהתחילה בשעה 6:30 בשמחת תורה", "/post/233");
const edge = (id, from, to, relationType) => ({ projection: { relations: [{ id, fromNodeId: from.id, toNodeId: to.id, relationType, from, to }] } });
const findings = [edge("a", P5112, N1718, "documents"), edge("b", N1718, PHRASE, "equals"), edge("c", N1718, P233, "mentions")];
const calculations = [{ label: "כ״ב בתשרי תשפ״ד", value: 1718, methodLabel: "רגיל", verified: true, extra: [{ value: 1202, methodLabel: "מסתתר" }] }];

const q = new URLSearchParams(location.search);
const preset = DESIGN_V2_PALETTES[q.get("theme")] ? q.get("theme") : "dark";
const audience = q.get("audience") === "admin" ? "admin" : "public";
const p = DESIGN_V2_PALETTES[preset];
const vars = {
  "--s29-page": p.pageBg, "--s29-panel": p.card, "--s29-panel-soft": p.cardSoft, "--s29-panel-grad": p.cardGrad,
  "--s29-line": p.border, "--s29-line-strong": p.borderStrong, "--s29-accent": p.accent, "--s29-accent-text": p.accentText,
  "--s29-focus-ring": p.focusRing, "--s29-warm-accent": p.warmAccent, "--s29-on-accent": p.onAccent, "--s29-ink": p.ink, "--s29-muted": p.inkSoft,
  "--s29-type-micro": "12px", "--s29-type-small": "14px", "--s29-type-ui": "15px", "--s29-motion": "160ms",
};
const focusProp = q.get("focus") === "5112" ? { id: P5112.id, label: "פוסט המטוס 5112", type: "post" } : { id: N1718.id, label: "1718", type: "number" };
const graph = focusProp.type === "post" ? [findings[0], { projection: { relations: [{ ...findings[1].projection.relations[0], fromNodeId: N1718.id, toNodeId: PHRASE.id }] } }] : findings;

function App() {
  const [selectedId, setSelectedId] = useState(q.get("select") || null);
  const map = buildContextMap({ focus: focusProp, findings: graph, calculations, audience });
  return <div className="sod29-root" dir="rtl" lang="he" data-frame-theme-preset={preset} style={{ ...vars, background: p.pageBg, color: p.ink, minHeight: "100vh", padding: 16, fontFamily: "Assistant, Arial, sans-serif" }}>
    <div style={{ maxWidth: 440, margin: "0 auto" }}>
      <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>מפת הקשר · {audience === "admin" ? "מנהל" : "אורח"}</h2>
      <ContextMap2029 map={map} selectedId={selectedId} onSelect={setSelectedId} audience={audience} onRefocus={() => {}} onOpen={() => {}} />
    </div>
  </div>;
}
createRoot(document.getElementById("root")).render(<App />);
