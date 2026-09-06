import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchEntityHubProjection } from "../lib/research/entityHubProjection.js";
import { projectUniversalConvergence } from "../lib/research/universalConvergenceProjection.js";
import { fetchGematriaMethodTrace } from "../lib/research/gematriaTrace.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { usePalette } from "../lib/palette.js";
import { stripHtml } from "../lib/format.js";
import EntityHubGoldenControls from "../components/entity/EntityHubGoldenControls.jsx";
import EqualityMethodSection from "../components/research/EqualityMethodSection.jsx";
import TopicConvergenceContent from "../components/research/TopicConvergenceContent.jsx";

// 🎨 Palette = CSS variables from EntityHubObservatory.css (.eh-func) — light AND dark
// (city_background_dual_theme_law). No light-only island inside the observatory shell.
const C = {
  page: "var(--eh-page)",
  panel: "var(--eh-panel)",
  softBg: "var(--eh-soft)",
  ink: "var(--eh-ink)",
  soft: "var(--eh-muted)",
  line: "var(--eh-line)",
  gold: "var(--eh-gold)",
  gold2: "var(--eh-gold2)",
  goldBg: "var(--eh-goldbg)",
  green: "var(--eh-green)",
  greenBg: "var(--eh-greenbg)",
  violet: "var(--eh-violet)",
  violetBg: "var(--eh-violetbg)",
  warn: "var(--eh-warn)",
  warnBg: "var(--eh-warnbg)",
  red: "var(--eh-red)",
  redBg: "var(--eh-redbg)",
  onGold: "#1a1305",
};

const VERIFICATION_TXT = {
  match: "תואם לערך הקנוני השמור",
  mismatch: "סותר את הערך הקנוני השמור",
  method_unknown: "שיטה לא מזוהה במנוע",
  not_tested: "אין ערך שמור — לא נבדקה טענה",
};
const verificationTone = (state) => (state === "match" ? "ok" : state === "mismatch" ? "red" : "neutral");

const page = {
  minHeight: "100vh",
  direction: "rtl",
  background: C.page,
  color: C.ink,
  padding: "28px 16px 76px",
  fontFamily: "Heebo, Arial, sans-serif",
  position: "relative",
  zIndex: 1,
};
const shell = { maxWidth: 1240, margin: "0 auto" };
const card = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 20, boxShadow: "0 10px 34px var(--eh-shadow)" };
const muted = { color: C.soft, fontSize: 13.5, lineHeight: 1.65 };
const buttonReset = { border: 0, font: "inherit" };

function chipStyle(tone = "neutral") {
  const map = {
    ok: [C.greenBg, C.green],
    warn: [C.warnBg, C.warn],
    red: [C.redBg, C.red],
    private: [C.violetBg, C.violet],
    gold: [C.goldBg, C.gold],
    neutral: [C.softBg, C.soft],
  };
  const [background, color] = map[tone] || map.neutral;
  return { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 800, background, color };
}

function Section({ eyebrow, title, subtitle, action, children, style }) {
  return <section style={{ ...card, marginTop: 18, padding: 20, ...style }}>
    <div style={{ display: "flex", gap: 18, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", marginBottom: 15 }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow ? <div style={{ color: C.gold, fontSize: 10.5, letterSpacing: 1.8, fontWeight: 900, marginBottom: 4 }}>{eyebrow}</div> : null}
        <h2 style={{ margin: 0, fontSize: 22, lineHeight: 1.25 }}>{title}</h2>
        {subtitle ? <div style={{ ...muted, marginTop: 5, maxWidth: 820 }}>{subtitle}</div> : null}
      </div>
      {action || null}
    </div>
    {children}
  </section>;
}

function Stat({ label, value, note }) {
  return <div style={{ ...card, padding: "13px 15px", flex: "1 1 140px", minWidth: 130 }}>
    <div style={{ fontSize: 27, lineHeight: 1, fontWeight: 950, color: C.ink }}>{value}</div>
    <div style={{ color: C.gold, fontSize: 12, fontWeight: 850, marginTop: 5 }}>{label}</div>
    {note ? <div style={{ ...muted, fontSize: 11.5, marginTop: 2 }}>{note}</div> : null}
  </div>;
}

function Empty({ children = "אין מידע בשכבה הזאת כרגע." }) {
  return <div style={{ ...muted, padding: "8px 0" }}>{children}</div>;
}

function statusTone(status) {
  if (status === "approved" || status === "canonical") return "ok";
  if (status === "candidate") return "warn";
  return "neutral";
}

function cleanText(value, max = 220) {
  const text = stripHtml(String(value || "")).replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

function phraseOf(item) {
  if (typeof item === "string") return item;
  return item?.phrase || item?.label || "";
}

function GalleryCard({ item, onOpen, compact = false }) {
  if (!item) return null;
  const src = item.thumb_url || item.image_url;
  return <button onClick={() => onOpen(item)} style={{ ...buttonReset, cursor: "pointer", textAlign: "right", padding: 0, borderRadius: 15, overflow: "hidden", background: "#111", border: `1px solid ${C.line}`, minWidth: 0 }}>
    <div style={{ aspectRatio: compact ? "16 / 10" : "4 / 3", overflow: "hidden", background: "#181511" }}>
      <img src={src} alt={item.name || "עדות גלריה"} loading="lazy" style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }} />
    </div>
    <div style={{ background: C.panel, padding: compact ? "9px 10px" : "11px 12px" }}>
      <div style={{ color: C.ink, fontWeight: 850, fontSize: compact ? 13 : 14, lineHeight: 1.35 }}>{cleanText(item.name || item.description || "עדות חזותית", 72)}</div>
      <div style={{ ...muted, fontSize: 11.5, marginTop: 4, display: "flex", gap: 7, flexWrap: "wrap" }}>
        {item.occurred_at ? <span>{new Date(`${item.occurred_at}T00:00:00`).toLocaleDateString("he-IL")}</span> : null}
        {item.primary_value ? <span>מספר ראשי {item.primary_value}</span> : null}
      </div>
    </div>
  </button>;
}

function ImageModal({ item, onClose }) {
  if (!item) return null;
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(8,6,3,.94)", padding: 18, display: "grid", placeItems: "center", direction: "rtl" }}>
    <div onClick={e => e.stopPropagation()} style={{ width: "min(900px,96vw)", maxHeight: "94vh", overflowY: "auto" }}>
      <div style={{ textAlign: "left", marginBottom: 8 }}><button onClick={onClose} style={{ cursor: "pointer", width: 42, height: 42, borderRadius: 10, border: "1px solid rgba(212,175,55,.45)", color: "#f5df8a", background: "transparent", fontSize: 23 }}>×</button></div>
      <img src={item.image_url || item.thumb_url} alt={item.name || ""} style={{ width: "100%", maxHeight: "72vh", objectFit: "contain", display: "block", background: "#050403", borderRadius: 14, border: "1px solid rgba(212,175,55,.35)" }} />
      {(item.name || item.description) ? <div style={{ color: "#ddd5c7", lineHeight: 1.9, fontSize: 15, padding: "12px 3px", whiteSpace: "pre-wrap" }}>
        {item.name ? <div style={{ color: "#efd671", fontWeight: 850, marginBottom: 5 }}>{cleanText(item.name, 160)}</div> : null}
        {cleanText(item.description, 900)}
      </div> : null}
    </div>
  </div>;
}

// Method Inspector = Registry semantics (identity) + canonical Trace (existing gematria_method_trace
// path via fetchGematriaMethodTrace). Method is a DIMENSION; the Inspector renders it. Trace ≠ Finding ≠ Claim.
function MethodTracePanel({ methodKey, phrase }) {
  const [state, setState] = useState({ loading: true, finding: null, error: null });
  useEffect(() => {
    let alive = true;
    setState({ loading: true, finding: null, error: null });
    if (!methodKey || !phrase) { setState({ loading: false, finding: null, error: null }); return undefined; }
    fetchGematriaMethodTrace(methodKey, phrase)
      .then(finding => alive && setState({ loading: false, finding, error: null }))
      .catch(error => alive && setState({ loading: false, finding: null, error }));
    return () => { alive = false; };
  }, [methodKey, phrase]);
  if (!methodKey || !phrase) return null;
  const trace = state.finding?.projection?.dimensions?.trace || null;
  const steps = Array.isArray(trace?.steps) ? trace.steps : [];
  return <div style={{ marginTop: 16, border: `1px solid ${C.line}`, borderRadius: 13, padding: 12, background: C.softBg }} data-testid="method-trace">
    <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
      <b>🔍 Trace · {phrase}</b>
      <span style={chipStyle("gold")}>gematria_method_trace</span>
      {state.finding?.subject?.value != null ? <span style={chipStyle("ok")}>= {state.finding.subject.value}</span> : null}
    </div>
    {state.loading ? <div style={{ ...muted, marginTop: 6 }}>טוען את מסלול החישוב הקנוני…</div> : null}
    {state.error ? <div style={{ ...muted, marginTop: 6, color: C.red }}>Trace לא זמין: {String(state.error?.message || state.error)}</div> : null}
    {!state.loading && !state.error && !state.finding ? <div style={{ ...muted, marginTop: 6 }}>המנוע לא החזיר trace לשיטה הזו.</div> : null}
    {trace ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
      {trace.trace_kind ? <span style={chipStyle("neutral")}>{trace.trace_kind}</span> : null}
      {state.finding?.evidence?.facts?.[0]?.mathematical_family ? <span style={chipStyle("neutral")}>{state.finding.evidence.facts[0].mathematical_family}</span> : null}
      {trace.verification?.parity != null ? <span style={chipStyle(trace.verification.parity ? "ok" : "red")}>{trace.verification.parity ? `parity ✓ · קנוני ${trace.verification.canonical_value}` : "parity ✗"}</span> : null}
    </div> : null}
    {steps.length ? <ol style={{ margin: "8px 0 0", paddingInlineStart: 20, lineHeight: 1.7, fontSize: 13 }}>
      {steps.slice(0, 40).map((s, i) => {
        if (typeof s === "string") return <li key={i}>{s}</li>;
        if (s && s.word != null) {
          const letters = Array.isArray(s.letter_values) ? s.letter_values.join(" · ") : null;
          const pairs = Array.isArray(s.pairs) ? s.pairs.map(p => `|${p.left_value}−${p.right_value}|=${p.difference}`).join("  ") : null;
          return <li key={i}><b>{s.word}</b>{letters ? <span style={muted}> · אותיות: {letters}</span> : null}{pairs ? <div style={{ ...muted, fontFamily: "monospace", direction: "ltr", textAlign: "right" }}>{pairs}</div> : null}{s.word_subtotal != null ? <div>תת־סכום: <b>{s.word_subtotal}</b></div> : null}</li>;
        }
        const label = [s.step || s.label || s.op, s.input != null ? `${s.input}` : null, s.value != null ? `→ ${s.value}` : (s.result != null ? `→ ${s.result}` : null)].filter(Boolean).join(" ");
        return <li key={i}>{label || <code style={{ fontSize: 11.5 }}>{JSON.stringify(s).slice(0, 220)}</code>}</li>;
      })}
    </ol> : (trace ? <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.5 }}>{JSON.stringify(trace, null, 1).slice(0, 1800)}</pre> : null)}
    <div style={{ ...muted, fontSize: 11.5, marginTop: 8 }}>Trace = הסבר חישוב של המנוע · אינו Finding, אינו טענה, אינו קידום לקנון.</div>
  </div>;
}

function MethodModal({ group, onClose, onLeave }) {
  const [tracePhrase, setTracePhrase] = useState(null);
  useEffect(() => { setTracePhrase(group?.phrase || null); }, [group]);
  if (!group) return null;
  const r = group.registry || {};
  const methodKey = r.method_key || group.method;
  const entityLinks = group.phraseEntities || {};
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 510, background: "rgba(29,22,10,.62)", display: "flex", justifyContent: "flex-start", direction: "rtl" }}>
    <aside onClick={e => e.stopPropagation()} style={{ width: "min(430px,94vw)", height: "100%", overflowY: "auto", background: C.panel, borderInlineEnd: `1px solid ${C.line}`, boxShadow: "18px 0 60px rgba(0,0,0,.22)", padding: 22 }}>
      <button onClick={onClose} style={{ cursor: "pointer", float: "left", width: 38, height: 38, borderRadius: 10, border: `1px solid ${C.line}`, background: "transparent", fontSize: 21 }}>×</button>
      <div style={{ color: C.gold, fontSize: 10.5, letterSpacing: 1.6, fontWeight: 900 }}>METHOD INSPECTOR · DECISION PREVIEW</div>
      <h2 style={{ fontSize: 28, margin: "7px 0 4px" }}>{r.display_label || group.method}</h2>
      <div style={{ ...muted, fontSize: 15 }}>{r.sub || "הסבר השיטה יגיע מה־Registry הקנוני."}</div>
      {r.soul ? <p style={{ lineHeight: 1.8, margin: "13px 0 0" }}>{r.soul}</p> : null}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 14 }}>
        <span style={chipStyle("gold")}>version {r.version ?? "—"}</span>
        <span style={chipStyle(r.active ? "ok" : "warn")}>{r.active ? "active" : "inactive"}</span>
        <span style={chipStyle(r.in_engine ? "ok" : "warn")}>{r.in_engine ? "in engine" : "not in engine"}</span>
        <span style={chipStyle()}>{r.execution_kind || "execution unknown"}</span>
      </div>
      {Array.isArray(r.derived_from) && r.derived_from.length ? <div style={{ marginTop: 14, border: `1px solid ${C.line}`, borderRadius: 13, padding: 12 }}><b>מורכב מ:</b> {r.derived_from.join(" + ")}{r.operator ? ` · ${r.operator}` : ""}</div> : null}
      <div style={{ marginTop: 18, padding: 14, borderRadius: 14, border: `1px dashed ${C.gold2}`, background: C.goldBg }}>
        <div style={{ fontWeight: 900, color: C.gold }}>Method = Dimension · Inspector = Registry + Trace</div>
        <div style={{ ...muted, marginTop: 5 }}>ה־Inspector מציג את זהות השיטה מה־Registry הקנוני ואת מסלול החישוב מה־trace הקנוני. פירוק/מעבדה מעבר לכך נשארים החלטת Human-Gate.</div>
      </div>
      {group.phrase ? <MethodTracePanel methodKey={methodKey} phrase={tracePhrase || group.phrase} /> : null}
      {(group.phrases || []).length ? <>
        <h3 style={{ margin: "22px 0 9px" }}>דוגמאות ב־{group.value ?? "המספר"} <span style={{ ...muted, fontSize: 12 }}>· לחיצה על 🔍 פותחת trace לביטוי</span></h3>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {(group.phrases || []).slice(0, 18).map((item, i) => {
            const phrase = phraseOf(item);
            if (!phrase) return null;
            const ent = entityLinks[phrase] || null;
            const to = ent ? ent.href : `/number/${encodeURIComponent(phrase)}`;
            return <span key={`${phrase}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
              <Link to={to} onClick={() => onLeave?.(ent ? "entity" : "number", { entityId: ent ? ent.nodeId : phrase, entityType: ent ? "entity" : "phrase" })}
                style={{ textDecoration: "none", border: `1px solid ${ent ? C.gold2 : C.line}`, background: C.softBg, color: C.ink, borderRadius: 999, padding: "6px 10px", fontSize: 13 }}>{ent ? "🔹 " : ""}{phrase}</Link>
              <button type="button" onClick={() => setTracePhrase(phrase)} title={`trace · ${phrase}`} style={{ ...buttonReset, cursor: "pointer", background: "transparent", color: C.gold, padding: "4px 5px" }}>🔍</button>
            </span>;
          })}
        </div>
        {tracePhrase && !group.phrase ? <MethodTracePanel methodKey={methodKey} phrase={tracePhrase} /> : null}
      </> : null}
    </aside>
  </div>;
}

function TopicCard({ item, image, onImage }) {
  if (!item) return null;
  return <article style={{ border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden", background: C.panel, minWidth: 0 }}>
    {image ? <button onClick={() => onImage(image)} style={{ ...buttonReset, display: "block", width: "100%", padding: 0, cursor: "pointer", background: "#111" }}><img src={image.thumb_url || image.image_url} alt="" loading="lazy" style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} /></button> : null}
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}><span style={chipStyle("ok")}>מאושר</span>{item.quality != null ? <span style={chipStyle("gold")}>איכות {item.quality}</span> : null}</div>
      <Link to={`/topic/${encodeURIComponent(item.slug)}`} style={{ display: "block", marginTop: 9, color: C.ink, textDecoration: "none", fontWeight: 900, fontSize: 17, lineHeight: 1.35 }}>{item.title || item.slug}</Link>
      {item.subtitle ? <div style={{ ...muted, marginTop: 6 }}>{cleanText(item.subtitle, 180)}</div> : null}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>{(item.highlight_numbers || []).slice(0, 5).map(n => <span key={n} style={chipStyle("gold")}>{n}</span>)}</div>
    </div>
  </article>;
}

export default function EntityHubPreviewPage() {
  const { type = "number", key = "1237" } = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [zoom, setZoom] = useState(null);
  const [methodFocus, setMethodFocus] = useState(null);
  const research = useResearch();
  const palette = usePalette();

  useEffect(() => {
    let alive = true;
    setState({ loading: true, data: null, error: null });
    fetchEntityHubProjection({ type, key, relationLimit: 120, researchLimit: 60, topicLimit: 16 })
      .then(data => alive && setState({ loading: false, data, error: data ? null : new Error("הישות לא נמצאה") }))
      .catch(error => alive && setState({ loading: false, data: null, error }));
    return () => { alive = false; };
  }, [type, key]);

  // 🧠 Universal Research Context — same contract as TopicPage/EntityPage: the ROOT stays sticky
  // (never overwritten by a hub visit), the current selection/lens follow the hub entity, and a
  // link out of the hub records an exact return point. No new store: ResearchProvider only.
  const hubHref = `/entity-hub-preview/${encodeURIComponent(type)}/${encodeURIComponent(key)}`;
  useEffect(() => {
    const d = state.data;
    if (!d?.identity?.nodeId) return;
    const subject = { id: d.identity.nodeId, type: d.identity.type, label: String(d.identity.label || key), href: hubHref };
    const selection = { entityId: d.identity.nodeId, entityType: d.identity.type };
    const lens = d.identity.type === "number" ? "number" : "graph";
    const ctx = research?.context;
    // returnTo is deliberately NOT cleared on arrival — it is the exact reopen point the previous
    // surface recorded (↩), and only a new leave overwrites it.
    if (!ctx?.subject) research?.setResearchContext?.({ subject, selection, lens });
    else research?.updateResearchContext?.({ selection, lens });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.data]);
  const leaveHub = useCallback((lens, selection) => {
    const d = state.data;
    if (!d?.identity?.nodeId) return;
    const subject = { id: d.identity.nodeId, type: d.identity.type, label: String(d.identity.label || key), href: hubHref };
    research?.updateResearchContext?.({ lens, selection, returnTo: { href: hubHref, label: subject.label, subject } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.data, hubHref]);

  const relationGroups = useMemo(() => {
    const out = new Map();
    for (const finding of state.data?.graph?.relations || []) {
      const relation = finding?.projection?.dimensions?.relationFamily || "related";
      if (!out.has(relation)) out.set(relation, []);
      out.get(relation).push(finding);
    }
    return [...out.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [state.data]);

  // 🌐 UNIVERSAL_CONVERGENCE_PROJECTION_1111_V1 — pure, zero-network reshape of the projection
  // this page already fetched (topics/equality/graph), so the composition is explicit without a
  // second round-trip. See src/lib/research/universalConvergenceProjection.js.
  const ucp = useMemo(() => {
    if (state.data?.identity?.type !== "number") return null;
    return projectUniversalConvergence(state.data, Number(state.data.identity.label));
  }, [state.data]);

  if (state.loading) return <main style={page}><div style={shell}>טוען את היקום של הישות…</div></main>;
  if (state.error || !state.data) return <main style={page}><div style={shell}><h1>לא ניתן לטעון את הישות</h1><pre style={{ whiteSpace: "pre-wrap" }}>{state.error?.message}</pre></div></main>;

  const data = state.data;
  const identity = data.identity;
  const hg = data.research?.humanGate || { total: 0, status: {}, access: {} };
  const researchAvailable = data.research?.access?.available !== false;
  const journey = data.journeys?.numberKnowledgeJourney;
  const declaredLenses = data.lenses?.declared || [];
  const isNumber = identity.type === "number";
  const surface = data.surface || {};
  const galleries = Array.isArray(surface.galleries) ? surface.galleries : [];
  const posts = Array.isArray(surface.posts) ? surface.posts : [];
  const insights = Array.isArray(surface.insights) ? surface.insights : [];
  const topics = Array.isArray(data.topics?.rows) ? data.topics.rows : [];
  const families = Array.isArray(data.gematria?.families) ? data.gematria.families : [];
  const phraseEntities = data.gematria?.phraseEntities || {};
  const bridgeRows = Array.isArray(data.methodBridge?.results) ? data.methodBridge.results : [];
  const gematriaIdentity = data.identity?.gematria || null;
  const heroImages = galleries.slice(0, 3);
  const imageMap = new Map(galleries.map(item => [String(item.id), item]));

  return <main className="eh-func" style={page}>
    <div style={shell}>
      <header style={{ ...card, padding: 22, overflow: "hidden", position: "relative" }}>
        <div className="eh-hero-grid" style={{ display: "grid", gridTemplateColumns: heroImages.length ? "minmax(0,1.05fr) minmax(360px,.95fr)" : "1fr", gap: 22, alignItems: "stretch" }}>
          <div style={{ padding: "5px 4px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ color: C.gold, fontSize: 10.5, letterSpacing: 1.8, fontWeight: 900 }}>SOD1820 · UNIVERSAL ENTITY HUB · PUBLIC PREVIEW v2</div>
            <h1 style={{ margin: "7px 0 4px", fontSize: "clamp(48px,8vw,84px)", lineHeight: .95, letterSpacing: -2 }}>{identity.label}</h1>
            <div style={{ color: C.soft, fontSize: 17, lineHeight: 1.55, maxWidth: 610 }}>{identity.description || identity.finding?.subject?.description || "ישות אחת · כל העדשות שסביבה · אותה אמת מתחת."}</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 15 }}>
              <span style={chipStyle()}>{identity.definition?.icon || "🔹"} {identity.definition?.label || identity.type}</span>
              <span style={chipStyle("ok")}>Public preview</span>
              <span style={chipStyle("ok")}>Projection read-only</span>
              <span style={chipStyle("warn")}>Human Gate נשמר</span>
              {gematriaIdentity ? <span style={chipStyle("gold")} title={`gematria_words:${gematriaIdentity.gematriaWordId}`}>🔢 זהות גימטרית קנונית{gematriaIdentity.verified ? " · מאומת" : ""}{gematriaIdentity.published ? " · מפורסם" : ""}</span> : null}
            </div>
            {declaredLenses.length ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>{declaredLenses.slice(0, 10).map(lens => <span key={lens} style={chipStyle()}>{lens}</span>)}</div> : null}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
              {isNumber ? <Link to={`/number/${encodeURIComponent(identity.label)}`} style={{ textDecoration: "none", background: C.gold, color: C.onGold, padding: "10px 16px", borderRadius: 999, fontWeight: 900 }}>הדף הקיים ←</Link> : null}
              <Link to="/beit-midrash" style={{ textDecoration: "none", border: `1px solid ${C.gold2}`, color: C.gold, padding: "10px 16px", borderRadius: 999, fontWeight: 850 }}>בית המדרש ←</Link>
            </div>
          </div>
          {heroImages.length ? <div className="eh-mosaic" style={{ display: "grid", gridTemplateColumns: "1.35fr .65fr", gridTemplateRows: "1fr 1fr", minHeight: 360, gap: 7 }}>
            <button onClick={() => setZoom(heroImages[0])} style={{ ...buttonReset, cursor: "pointer", gridRow: "1 / 3", padding: 0, overflow: "hidden", borderRadius: 16, background: "#111" }}><img src={heroImages[0].thumb_url || heroImages[0].image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></button>
            {heroImages.slice(1, 3).map(item => <button key={item.id} onClick={() => setZoom(item)} style={{ ...buttonReset, cursor: "pointer", padding: 0, overflow: "hidden", borderRadius: 14, background: "#111" }}><img src={item.thumb_url || item.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></button>)}
          </div> : null}
        </div>
      </header>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
        <Stat label="תמונות גלריה" value={surface.galleriesCount ?? galleries.length} note="עדויות ציבוריות סביב הישות" />
        <Stat label="ביטויים" value={surface.phrasesCount ?? surface.phrases?.length ?? 0} note="מהמאגר הציבורי" />
        <Stat label="שיטות שפוגשות כאן" value={isNumber ? families.length : bridgeRows.length} note="Registry + engine" />
        <Stat label="Topics מאושרים" value={topics.length} note="אוצרות Human Gate" />
        <Stat label="קשרי Graph" value={data.graph?.relations?.length || 0} note="אותו Reality Graph" />
        <Stat label="פוסטים" value={surface.postsCount ?? posts.length} note="תוכן מחובר" />
      </div>

      {isNumber ? <EntityHubGoldenControls data={data} relationGroups={relationGroups} onLeave={leaveHub} /> : null}

      {/* ── ENTITY → NUMBER: generic method-result bridge (P1/P2 portability). One row per method the
          canonical engine returned; each engine value links to the EXISTING number node (hub + legacy page).
          Nothing is hardcoded to a phrase or a method; verification is honest (match/mismatch only when a
          stored canonical value exists). ── */}
      {!isNumber && (bridgeRows.length || gematriaIdentity) ? <Section eyebrow="GEMATRIA LENS · METHOD RESULTS" title={`${identity.label} בכל שיטה — ומאיפה זה מגיע`} subtitle={data.methodBridge?.note}
        action={gematriaIdentity ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={chipStyle("gold")} title={`gematria_words:${gematriaIdentity.gematriaWordId}`}>🔢 זהות גימטרית קנונית</span>
          <span style={chipStyle(gematriaIdentity.verified ? "ok" : "warn")}>{gematriaIdentity.verified ? "מאומת במנוע" : "לא מאומת"}</span>
          <span style={chipStyle(gematriaIdentity.published ? "ok" : "warn")}>{gematriaIdentity.published ? "מפורסם" : "לא מפורסם"}</span>
          <span style={chipStyle("neutral")}>מנוע: gematria_api · Registry</span>
        </div> : null}>
        {bridgeRows.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }} data-testid="method-bridge">
          {bridgeRows.map(row => <article key={row.dbColumn} style={{ border: `1px solid ${row.numberNode ? C.gold2 : C.line}`, background: C.panel, borderRadius: 15, padding: 14 }} data-method={row.dbColumn}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <button onClick={() => setMethodFocus({ method: row.methodKey, registry: row.registry, phrase: identity.label, value: row.engineValue, phrases: [] })} style={{ ...buttonReset, cursor: "pointer", background: "none", padding: 0, color: C.ink, textAlign: "right", flex: 1 }}>
                <div style={{ fontWeight: 950, fontSize: 17 }}>{row.displayLabel} <span style={{ color: C.gold, fontSize: 12 }}>↗ trace</span></div>
                <div style={{ ...muted, marginTop: 3 }}>{row.registry?.sub || (row.registry ? "שיטה רשומה" : "שיטה שהמנוע החזיר ואינה ב־Registry")}</div>
              </button>
              {row.hrefs ? <Link to={row.hrefs.hub} onClick={() => leaveHub("number", { entityId: String(row.engineValue), entityType: "number" })}
                style={{ textDecoration: "none", fontWeight: 950, fontSize: 24, color: C.onGold, background: "linear-gradient(135deg,#ffd86b,#d8b34a)", borderRadius: 12, padding: "4px 12px", lineHeight: 1.3 }} title={`מרכז המספר ${row.engineValue}`}>{row.engineValue}</Link>
                : <span style={{ fontWeight: 950, fontSize: 24, color: C.ink, border: `1px dashed ${C.line}`, borderRadius: 12, padding: "4px 12px", lineHeight: 1.3 }} title="אין עדיין node מספר לערך הזה">{row.engineValue}</span>}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              <span style={chipStyle(verificationTone(row.verificationState))} title="VERIFICATION axis">{VERIFICATION_TXT[row.verificationState] || row.verificationState}</span>
              <span style={chipStyle(row.governed ? "ok" : "warn")}>{row.governed ? "governed evidence" : "לא governed"}</span>
              {row.hrefs ? <Link to={row.hrefs.number} onClick={() => leaveHub("number", { entityId: String(row.engineValue), entityType: "number" })} style={{ ...chipStyle("neutral"), textDecoration: "none" }}>דף המספר ←</Link> : <span style={chipStyle("neutral")}>ללא node מספר</span>}
            </div>
          </article>)}
        </div> : <Empty>למנוע אין תוצאות לביטוי הזה.</Empty>}
      </Section> : null}

      {isNumber ? <section style={{ ...card, marginTop: 18, padding: 20 }}>
        <EqualityMethodSection
          subjectLabel={identity.label}
          families={families}
          phraseEntities={phraseEntities}
          onOpenMethod={(group) => setMethodFocus(group)}
          onLeave={leaveHub}
        />
      </section> : null}

      <Section eyebrow="VISUAL EVIDENCE" title={`גלריה חיה סביב ${identity.label}`} subtitle="אלו תמונות אמיתיות שכבר נמצאות במערכת ומקושרות למספר. זו לא גלריה חדשה — רק Projection של אותו מאגר גלריות קיים." action={<Link to="/gallery" style={{ color: C.gold, textDecoration: "none", fontWeight: 850 }}>לכל הגלריות ←</Link>}>
        {galleries.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 12 }}>{galleries.slice(0, 12).map(item => <GalleryCard key={item.id} item={item} onOpen={setZoom} />)}</div> : <Empty />}
        {(surface.galleriesCount || 0) > galleries.slice(0, 12).length ? <div style={{ ...muted, marginTop: 12, textAlign: "center" }}>זהו רק חלון ראשון מתוך {surface.galleriesCount} תמונות מחוברות.</div> : null}
      </Section>

      <Section eyebrow="CURATED CONVERGENCES" title="נושאים והתכנסויות" subtitle="כאן מופיעים רק Topic Cards מאושרים — לא Raw Signals ולא כל שוויון שנמצא במנוע.">
        {topics.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 12 }}>{topics.map(item => {
          const firstImage = (item.image_ids || []).map(id => imageMap.get(String(id))).find(Boolean) || null;
          return <TopicCard key={item.id || item.slug} item={item} image={firstImage} onImage={setZoom} />;
        })}</div> : <Empty />}
      </Section>

      {ucp && ucp.topics.findings.length ? <Section eyebrow="UNIVERSAL CONVERGENCE PROJECTION" title="ההתכנסות המלאה — מקור מחבר + שוויון מנוע + גרף, במקום אחד"
        subtitle="לא מערכת חדשה: אותו אימוץ-מחבר (topicConvergenceToUniversalFinding) שכבר מרונדר ב-/topic, אותה שכבת שוויון-Registry שלמעלה (GEMATRIA LENS), ואותו Reality Graph שלמטה (ONE REALITY GRAPH) — מוצגים כאן יחד לכל התכנסות מאושרת. אישור-עריכה ≠ אימות-מנוע ≠ קנוני.">
        {ucp.topics.findings.map(finding => <div key={finding.id} style={{ borderTop: `1px solid ${C.line}`, paddingTop: 14, marginTop: 14 }}>
          <TopicConvergenceContent finding={finding} palette={palette} onLeave={leaveHub} exclude={["caveat", "unsupported"]} />
        </div>)}
      </Section> : null}

      <Section eyebrow="CONNECTED CONTENT" title="פוסטים וחידושים שמתחברים לישות" subtitle="תוכן מוצג כעדשה נוספת על הישות — לא כחנות אמת נפרדת.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 14 }}>
          <div>
            <h3 style={{ margin: "0 0 9px" }}>📖 פוסטים</h3>
            {posts.length ? <div style={{ display: "grid", gap: 7 }}>{posts.slice(0, 8).map(p => <Link key={p.wp_id || p.id || p.slug} to={`/${p.slug}`} style={{ color: C.ink, textDecoration: "none", border: `1px solid ${C.line}`, background: C.panel, borderRadius: 12, padding: "10px 12px", fontWeight: 750 }}>{cleanText(typeof p.title === "string" ? p.title : p.title?.rendered || p.slug, 120)}</Link>)}</div> : <Empty />}
          </div>
          <div>
            <h3 style={{ margin: "0 0 9px" }}>✨ חידושים</h3>
            {insights.length ? <div style={{ display: "grid", gap: 7 }}>{insights.slice(0, 6).map(it => <div key={it.id} style={{ border: `1px solid ${C.line}`, background: C.panel, borderRadius: 12, padding: "10px 12px" }}><div style={{ fontWeight: 850 }}>{cleanText(it.title || "חידוש", 100)}</div>{it.body ? <div style={{ ...muted, marginTop: 4 }}>{cleanText(it.body, 170)}</div> : null}</div>)}</div> : <Empty />}
          </div>
        </div>
      </Section>

      <Section eyebrow="ONE REALITY GRAPH" title="הקשרים בעץ" subtitle="ה־Hub לא יוצר קשרים. הוא רק מקבץ את ה־edges שכבר חיים ב־Reality Graph.">
        {relationGroups.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 11 }}>{relationGroups.map(([relation, findings]) => <div key={relation} style={{ border: `1px solid ${C.line}`, background: C.panel, borderRadius: 14, padding: 12 }}><div style={{ fontWeight: 950, color: C.gold }}>{relation} · {findings.length}</div>{findings.slice(0, 7).map(f => <div key={f.id} style={{ ...muted, borderTop: `1px solid ${C.line}`, paddingTop: 6, marginTop: 6 }}>{f.subject?.label}</div>)}</div>)}</div> : <Empty />}
      </Section>

      {isNumber ? <Section eyebrow="JOURNEY" title="Number Knowledge Journey" subtitle="המסע הקיים נשאר traversal/snapshot של אותו מחקר; ה־Hub אינו ממציא Path Store נוסף.">
        {journey ? <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(260px,.55fr)", gap: 13 }} className="eh-journey-grid">
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 15, padding: 14, background: C.panel }}>
            <div style={{ fontSize: 19, fontWeight: 950 }}>{journey.seed?.title || `מסע ${identity.label}`}</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}><span style={chipStyle(statusTone(journey.seed?.governance?.status))}>seed: {journey.seed?.governance?.status || "unknown"}</span><span style={chipStyle()}>branches: {journey.branches?.length || 0}</span></div>
            {journey.branches?.length ? <div style={{ display: "grid", gap: 7, marginTop: 12 }}>{journey.branches.slice(0, 8).map((branch, i) => <div key={branch.id || i} style={{ border: `1px solid ${C.line}`, borderRadius: 11, padding: "9px 10px" }}><b>{branch.branch_name || branch.name || `ענף ${i + 1}`}</b>{branch.description ? <div style={{ ...muted, marginTop: 3 }}>{cleanText(branch.description, 170)}</div> : null}</div>)}</div> : null}
          </div>
          <div style={{ border: `1px dashed ${C.gold2}`, borderRadius: 15, padding: 14, background: C.goldBg }}><div style={{ fontWeight: 950, color: C.gold }}>Live map ≠ Approved</div><div style={{ ...muted, color: C.warn, marginTop: 5 }}>חישובים חיים אינם יורשים את האישור של ה־seed. זו בדיוק ההפרדה בין Projection לבין Human Gate.</div></div>
        </div> : <Empty>אין מסע זמין כרגע.</Empty>}
      </Section> : null}

      <Section eyebrow="GOVERNANCE / PROVENANCE" title="מה נשאר מאחורי הקלעים" subtitle="Preview ציבורי אינו עוקף את ה־RLS/GRANT. שכבה פרטית נשארת פרטית; אנחנו מציגים את החוויה בלי להחליש את האמת או את ההרשאות.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: 13, background: C.panel }}><b>Human Gate</b><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 9 }}>{researchAvailable ? Object.entries(hg.status || {}).filter(([, count]) => count).map(([name, count]) => <span key={name} style={chipStyle(statusTone(name))}>{name}: {count}</span>) : <span style={chipStyle("private")}>Research layer protected</span>}</div></div>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: 13, background: C.panel }}><b>Sources</b>{data.sources?.length ? <div style={{ ...muted, marginTop: 7 }}>{data.sources.slice(0, 7).map((source, i) => <div key={`${source.ref || source.label}-${i}`}>• {cleanText(source.label, 120)}</div>)}</div> : <Empty />}</div>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: 13, background: C.panel }}><b>Activity timeline v0</b>{data.timeline?.length ? <div style={{ ...muted, marginTop: 7 }}>{data.timeline.slice(-6).map(item => <div key={`${item.id}-${item.at}`}>{new Date(item.at).toLocaleDateString("he-IL")} · {cleanText(item.label, 90)}</div>)}</div> : <Empty />}</div>
        </div>
      </Section>

      <footer style={{ ...muted, marginTop: 24, textAlign: "center" }}>One Tree · One Research OS · Many Lenses · Foundation → Projection → Experience</footer>
    </div>

    <ImageModal item={zoom} onClose={() => setZoom(null)} />
    <MethodModal group={methodFocus} onClose={() => setMethodFocus(null)} onLeave={leaveHub} />

    <style>{`
      .eh-mosaic button img { transition: transform .3s ease, opacity .3s ease; }
      .eh-mosaic button:hover img { transform: scale(1.025); opacity: .94; }
      @media (max-width: 820px) {
        .eh-hero-grid { grid-template-columns: 1fr !important; }
        .eh-mosaic { min-height: 290px !important; }
        .eh-journey-grid { grid-template-columns: 1fr !important; }
      }
      @media (max-width: 520px) {
        .eh-mosaic { grid-template-columns: 1fr 1fr !important; grid-template-rows: 210px 120px !important; min-height: 0 !important; }
        .eh-mosaic > button:first-child { grid-column: 1 / 3; grid-row: 1 !important; }
      }
    `}</style>
  </main>;
}
