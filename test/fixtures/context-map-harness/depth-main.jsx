// Acceptance preview: the REAL 2029 post index card (PostIndexCard2029, production code and CSS) for post 5112 with the
// context-depth meter. Post row, graph edges, engine values and convergence facts are real reads (19.10.2026); the
// readers below implement the same interface as contextMapReaders2029 over that evidence. The click interactions are real.
import React from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import PostIndexCard from "../../../src/components/experience2029/PostIndexCard2029.jsx";
import { buildContextDepth } from "../../../src/lib/research/contextDepthProjection2029.js";
import { DESIGN_V2_PALETTES } from "../../../src/lib/palette.js";
import { POST_5112, NUMBERS_5112, POST_ROW_5112, GRAPH_BY_NUMBER, NODE_BY_NUMBER, ENGINE_BY_LABEL } from "./depthFixture.js";
import "../../../src/pages/posts2029.css";

const q = new URLSearchParams(location.search);
const preset = DESIGN_V2_PALETTES[q.get("theme")] ? q.get("theme") : "dark";
const audience = q.get("audience") === "admin" ? "admin" : "public";
const p = DESIGN_V2_PALETTES[preset];
const vars = { "--s29-page": p.pageBg, "--s29-panel": p.card, "--s29-panel-soft": p.cardSoft, "--s29-panel-grad": p.cardGrad, "--s29-line": p.border, "--s29-line-strong": p.borderStrong,
  "--s29-accent": p.accent, "--s29-accent-text": p.accentText, "--s29-focus-ring": p.focusRing, "--s29-warm-accent": p.warmAccent, "--s29-on-accent": p.onAccent, "--s29-ink": p.ink, "--s29-muted": p.inkSoft,
  "--s29-brand-gold": p.brandGold, "--s29-brand-sapphire": p.brandSapphire, "--s29-hero": p.heroNum,
  "--s29-type-micro": "12px", "--s29-type-small": "14px", "--s29-type-ui": "15px", "--s29-type-body": "16px", "--s29-type-lead": "18px", "--s29-motion": "160ms" };
const depth = buildContextDepth({ subject: POST_5112, numbers: NUMBERS_5112, audience });
const byId = Object.fromEntries(Object.values(NODE_BY_NUMBER).map((n) => [n.id, n]));
const mapReaders = {
  resolveNode: async (focus) => NODE_BY_NUMBER[focus.label] || null,
  readGraph: async (id) => GRAPH_BY_NUMBER[byId[id]?.label] || [],
  readCalculations: async (labels, focus) => labels.map((label) => ENGINE_BY_LABEL[label.replace(/[״"]/g, "")] && Number(focus.label) === ENGINE_BY_LABEL[label.replace(/[״"]/g, "")].value
    ? { label, ...ENGINE_BY_LABEL[label.replace(/[״"]/g, "")], verified: true, extra: [] } : null).filter(Boolean),
};

createRoot(document.getElementById("root")).render(<MemoryRouter>
  <div className="sod29-root" dir="rtl" lang="he" data-frame-theme-preset={preset} style={{ ...vars, background: p.pageBg, color: p.ink, minHeight: "100vh", padding: 16, fontFamily: "Assistant, Arial, sans-serif" }}>
    <main className="sod29-posts-index" style={{ maxWidth: 1180, margin: "0 auto" }}>
      <section className="sod29-posts-index-stage" aria-label="פוסטים">
        <div className="sod29-posts-index-grid">
          {q.get("view") === "compare" ? <PostIndexCard post={POST_ROW_5112} index={0} /> : null}
          <PostIndexCard post={POST_ROW_5112} index={q.get("view") === "compare" ? 1 : 0} depth={depth} mapReaders={mapReaders} />
        </div>
      </section>
    </main>
  </div>
</MemoryRouter>);
