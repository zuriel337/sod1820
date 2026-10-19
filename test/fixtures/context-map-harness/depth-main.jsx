// Acceptance preview: the REAL 2029 post index card (PostIndexCard2029, production code and CSS) with the context-depth meter,
// the production exact-return helpers and the production region landing (landOnRenderedLocator). Post rows, graph edges,
// engine values and HTML excerpts are real reads (19.10.2026); only the long filler around the excerpts is placeholder text,
// and the router is a two-screen state machine instead of the full app. Clicks are real.
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import PostIndexCard from "../../../src/components/experience2029/PostIndexCard2029.jsx";
import { buildContextDepth } from "../../../src/lib/research/contextDepthProjection2029.js";
import { landOnRenderedLocator, locatorIdFromHash } from "../../../src/lib/research/topicSourceContext.js";
import { postLocatorSpec, renderedLocatorOf } from "../../../src/lib/research/worldSourceConnections.js";
import { cardReturnTo, cardRestoreFor } from "../../../src/lib/research/journeySourceReturn.js";
import { buildExactReturnPatch } from "../../../src/lib/research/researchContext.js";
import { getCurrentTemporalContext } from "../../../src/lib/timeFlow.js";
import { DESIGN_V2_PALETTES } from "../../../src/lib/palette.js";
import { matchUnitApproval } from "../../../src/lib/research/unitApproval2029.js";
import { POST_5112, NUMBERS_5112, POST_ROW_5112, POST_ROW_5113, GRAPH_BY_NUMBER, NODE_BY_NUMBER, ENGINE_BY_LABEL, YEAR_HINTS_5112, PATHS_5112, APPROVAL_ROW_5112 } from "./depthFixture.js";
import fixture from "../post-locators-5112-233.json";
import "../../../src/pages/posts2029.css";
import "../../../src/pages/post2029-reading.css";

const q = new URLSearchParams(location.search);
const preset = DESIGN_V2_PALETTES[q.get("theme")] ? q.get("theme") : "dark";
const audience = q.get("audience") === "admin" ? "admin" : "public";
const p = DESIGN_V2_PALETTES[preset];
const vars = { "--s29-page": p.pageBg, "--s29-panel": p.card, "--s29-panel-soft": p.cardSoft, "--s29-panel-grad": p.cardGrad, "--s29-line": p.border, "--s29-line-strong": p.borderStrong,
  "--s29-accent": p.accent, "--s29-accent-text": p.accentText, "--s29-focus-ring": p.focusRing, "--s29-warm-accent": p.warmAccent, "--s29-on-accent": p.onAccent, "--s29-ink": p.ink, "--s29-muted": p.inkSoft,
  "--s29-brand-gold": p.brandGold, "--s29-brand-sapphire": p.brandSapphire, "--s29-hero": p.heroNum,
  "--s29-type-micro": "12px", "--s29-type-small": "14px", "--s29-type-ui": "15px", "--s29-type-body": "16px", "--s29-type-lead": "18px", "--s29-motion": "160ms" };

const NOW = getCurrentTemporalContext(new Date(q.get("date") || "2026-10-20T12:00:00+03:00"));
const paths = q.get("selected") === "1" ? PATHS_5112.map((x) => ({ ...x, stations: x.stations.map((s) => (s.pending ? { ...s, editorialSelection: true } : s)) })) : PATHS_5112;
// approval=real (default): the real research_object, editorially approved and NOT published. published = the same row with
// scope "public" (a SIMULATION of publication, used only to show the live marker); none = no approval row at all.
const approvalRows = { real: [APPROVAL_ROW_5112], published: [{ ...APPROVAL_ROW_5112, privacy_scope: "public" }], none: [] }[q.get("approval") || "real"];
const approvals = Object.fromEntries(YEAR_HINTS_5112.map((h) => [h.id, matchUnitApproval(approvalRows, h)]));
const depth = buildContextDepth({ subject: POST_5112, numbers: NUMBERS_5112, audience, temporal: NOW, yearHints: YEAR_HINTS_5112, approvals, paths });
const byId = Object.fromEntries(Object.values(NODE_BY_NUMBER).map((n) => [n.id, n]));
const strip = (l) => l.replace(/[״"]/g, "");
const mapReaders = {
  resolveNode: async (focus) => NODE_BY_NUMBER[focus.label] || null,
  readGraph: async (id) => GRAPH_BY_NUMBER[byId[id]?.label] || [],
  readCalculations: async (labels, focus) => labels.map((label) => (ENGINE_BY_LABEL[strip(label)] && Number(focus.label) === ENGINE_BY_LABEL[strip(label)].value
    ? { label, ...ENGINE_BY_LABEL[strip(label)], verified: true, extra: [] } : null)).filter(Boolean),
};

const filler = (n) => Array.from({ length: n }, (_, i) => `<p style="margin:0 0 14px;opacity:.7">[המשך תוכן הפוסט — מציין מקום להדגמת גלילה, פסקה ${i + 1}]</p>`).join("");
const BODY = { 5112: `${filler(14)}${fixture.post5112.content}${filler(10)}`, 233: `${filler(12)}${fixture.post233.content}${filler(10)}` };

function PostScreen({ href, onBack }) {
  const ref = useRef(null);
  const id = locatorIdFromHash(href.slice(href.indexOf("#")));
  const spec = postLocatorSpec(id);
  useEffect(() => {
    if (!spec || !ref.current) return undefined;
    window.__before = ref.current.innerHTML;
    const landed = landOnRenderedLocator(ref.current, renderedLocatorOf(spec));
    window.__landed = landed.found ? landed.found.elements.length : 0;
    return landed.release;
  }, [id]);
  return <article data-post-screen={spec?.postId}>
    <button type="button" className="sod29-depth-open" data-return-to-card onClick={onBack}>חזרה לכרטיס</button>
    <div ref={ref} className="sod29-reading-source" dir="rtl" style={{ marginTop: 12, textAlign: "center" }} dangerouslySetInnerHTML={{ __html: BODY[spec?.postId] || "" }} />
  </article>;
}

function App() {
  const [screen, setScreen] = useState("list");
  const [context, setContext] = useState(null);
  const [target, setTarget] = useState(null);
  const leave = (post, source, number) => { setContext({ returnTo: cardReturnTo({ post, number, listHref: "/posts?page=1" }) }); setTarget(source.href); setScreen("post"); };
  const back = () => { setContext(buildExactReturnPatch(context)); setScreen("list"); };
  return <div className="sod29-root" dir="rtl" lang="he" data-frame-theme-preset={preset} style={{ ...vars, background: p.pageBg, color: p.ink, minHeight: "100vh", padding: 16, fontFamily: "Assistant, Arial, sans-serif" }}>
    <main className="sod29-posts-index" style={{ maxWidth: 1180, margin: "0 auto" }}>
      {screen === "post" ? <PostScreen href={target} onBack={back} /> :
        <section className="sod29-posts-index-stage" aria-label="פוסטים"><div className="sod29-posts-index-grid">
          {q.get("view") === "compare" ? <PostIndexCard post={POST_ROW_5112} index={0} /> : null}
          <PostIndexCard key={`c${screen}${context ? 1 : 0}`} post={POST_ROW_5112} index={1} depth={depth} mapReaders={mapReaders} onLocatorOpen={leave} onMapOpen={() => {}} restore={cardRestoreFor(context, 5112)} />
          <PostIndexCard post={POST_ROW_5113} index={2} />
        </div></section>}
    </main>
  </div>;
}
createRoot(document.getElementById("root")).render(<MemoryRouter><App /></MemoryRouter>);
