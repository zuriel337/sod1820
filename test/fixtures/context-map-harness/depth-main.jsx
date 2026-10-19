// Design preview: post card 5112 with the compact depth meter, and the expanded view after a click.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import ContextDepthMeter2029 from "../../../src/components/experience2029/ContextDepthMeter2029.jsx";
import { ContextMap2029 } from "../../../src/components/experience2029/ContextMap2029.jsx";
import { buildContextDepth } from "../../../src/lib/research/contextDepthProjection2029.js";
import { buildContextMap } from "../../../src/lib/research/contextMapProjection2029.js";
import { DESIGN_V2_PALETTES } from "../../../src/lib/palette.js";
import { POST_5112, NUMBERS_5112 } from "./depthFixture.js";

const q = new URLSearchParams(location.search);
const preset = DESIGN_V2_PALETTES[q.get("theme")] ? q.get("theme") : "dark";
const audience = q.get("audience") === "admin" ? "admin" : "public";
const p = DESIGN_V2_PALETTES[preset];
const vars = { "--s29-page": p.pageBg, "--s29-panel": p.card, "--s29-panel-soft": p.cardSoft, "--s29-panel-grad": p.cardGrad, "--s29-line": p.border, "--s29-line-strong": p.borderStrong,
  "--s29-accent": p.accent, "--s29-accent-text": p.accentText, "--s29-focus-ring": p.focusRing, "--s29-warm-accent": p.warmAccent, "--s29-on-accent": p.onAccent, "--s29-ink": p.ink, "--s29-muted": p.inkSoft,
  "--s29-type-micro": "12px", "--s29-type-small": "14px", "--s29-type-ui": "15px", "--s29-type-lead": "18px", "--s29-motion": "160ms" };
const depth = buildContextDepth({ subject: POST_5112, numbers: NUMBERS_5112, audience });

// Real 1718 edges (graph read 19.10.2026) for the map that opens from the meter.
const side = (id, type, label, href = null) => ({ id, type, label, href });
const N = side("f8c03161", "number", "1718", "/number/1718");
const edge = (id, a, b, t) => ({ projection: { relations: [{ id, fromNodeId: a.id, toNodeId: b.id, relationType: t, from: a, to: b }] } });
const findings = [edge("a", side("f42e2a16", "post", "פוסט המטוס 5112", "/post/flydubai-fz1073-363-14000-remzei-geula"), N, "documents"), edge("b", N, side("e67caa39", "entity", "כב בתשרי תשפד"), "equals"), edge("c", N, side("3fd27516", "post", "פוסט 233", "/post/233"), "mentions")];
const map = buildContextMap({ focus: { id: N.id, label: "1718", type: "number" }, findings, calculations: [{ label: "כ״ב בתשרי תשפ״ד", value: 1718, methodLabel: "רגיל", verified: true }], audience });

function Card({ look, withMeter, open, onToggle, children }) {
  return <article className="demo-card">
    <div className="demo-thumb" aria-hidden="true">תמונת הפוסט</div>
    <div className="demo-body">
      <small>רמזים חזקים · פוסט 5112</small>
      <h3>{POST_5112.label}</h3>
      {withMeter ? <ContextDepthMeter2029 depth={depth} variant="compact" look={look} expanded={open} onToggle={onToggle} /> : null}
    </div>
    {children}
  </article>;
}
function App() {
  const view = q.get("view") || "compare";
  const [open, setOpen] = useState(view === "expanded");
  const [sel, setSel] = useState(q.get("number") ? Number(q.get("number")) : null);
  const [mapSel, setMapSel] = useState(q.get("select") || null);
  const expanded = <ContextDepthMeter2029 depth={depth} variant="full" selectedValue={sel} onSelectValue={setSel}>
    {sel === 1718 ? <ContextMap2029 map={map} selectedId={mapSel} onSelect={setMapSel} audience={audience} /> : sel ? <p className="demo-note">מפת הקשר של {sel} נטענת בבקשה (L2), לא בפתיחת הפוסט.</p> : <p className="demo-note">בחרו מספר כדי לפתוח את מפת ההקשר שלו.</p>}
  </ContextDepthMeter2029>;
  return <div className="sod29-root" dir="rtl" lang="he" data-frame-theme-preset={preset} style={{ ...vars, background: p.pageBg, color: p.ink, minHeight: "100vh", padding: 16, fontFamily: "Assistant, Arial, sans-serif" }}>
    <style>{`.demo-card{display:grid;grid-template-columns:96px 1fr;gap:12px;border:1px solid var(--s29-line);border-radius:16px;padding:12px;background:var(--s29-panel);margin-bottom:10px}
      .demo-thumb{display:grid;place-items:center;background:var(--s29-panel-soft);border-radius:12px;color:var(--s29-muted);font-size:11px;min-height:96px;text-align:center}
      .demo-body{display:grid;gap:7px;align-content:start}.demo-body small{color:var(--s29-muted)}.demo-body h3{margin:0;font-size:16px;line-height:1.3}
      .demo-card>.sod29-depth{grid-column:1/-1}.demo-h{margin:14px 0 6px;font-size:13px;color:var(--s29-muted)}.demo-note{margin:0;color:var(--s29-muted);font-size:14px}
      @media(max-width:520px){.demo-card{grid-template-columns:72px 1fr}.demo-thumb{min-height:72px}}`}</style>
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      {view === "compare" ? <>
        <h2 className="demo-h">א · כרטיס היום, בלי מד</h2><Card />
        <h2 className="demo-h">ב · מד קטן: פסי כיסוי (6 ממדים)</h2><Card look="strip" withMeter />
        <h2 className="demo-h">ג · מד קטן: תוויות ממדים</h2><Card look="chips" withMeter />
      </> : <>
        <h2 className="demo-h">אחרי לחיצה על המד · {audience === "admin" ? "מנהל" : "אורח"}</h2>
        <Card look="strip" withMeter open={open} onToggle={() => setOpen((v) => !v)}>{open ? expanded : null}</Card>
      </>}
    </div>
  </div>;
}
createRoot(document.getElementById("root")).render(<App />);
