import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { F } from "../../theme.js";
import { usePalette } from "../../lib/palette.js";
import { supabase, getSearchCount, getNumberNeighbors } from "../../lib/supabase.js";
import { fetchEntityHubProjection } from "../../lib/research/entityHubProjection.js";
import { fetchGematriaMethodTrace } from "../../lib/research/gematriaTrace.js";
import { numberAnchorToUniversalFinding } from "../../lib/research/numberAnchorFinding.js";
import { entityFromNumber } from "../../lib/research/entity.js";
import PulseRing, { pulseFromCounts } from "../PulseRing.jsx";
import QuickActions from "../QuickActions.jsx";
import WatchButton from "../WatchButton.jsx";
import AskRaziel from "../AskRaziel.jsx";

function phraseOf(item) {
  if (typeof item === "string") return item;
  return item?.phrase || item?.label || "";
}

function methodLabel(group) {
  return group?.registry?.display_label || group?.method || "שיטה";
}

function methodKey(group) {
  return group?.registry?.method_key || group?.method || "";
}

function cleanAnchorPhrase(fact, number) {
  const text = String(fact || "").trim();
  if (!text) return "";
  const rhs = text.split("=").slice(1).join("=").trim();
  if (!rhs) return "";
  return rhs.replace(new RegExp(`^${number}\\s*`), "").replace(/\([^)]*\)\s*$/, "").trim();
}

function short(text, max = 105) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max).trim()}…` : s;
}

function Metric({ P, icon, value, label, note, onClick }) {
  const inner = <>
    <div className="ncm-metric__top"><span className="ncm-metric__icon">{icon}</span><strong>{value}</strong></div>
    <div className="ncm-metric__label">{label}</div>
    {note && <div className="ncm-metric__note">{note}</div>}
  </>;
  return onClick
    ? <button type="button" className="ncm-metric" onClick={onClick}>{inner}</button>
    : <div className="ncm-metric">{inner}</div>;
}

function Signal({ icon, value, label }) {
  return <div className="ncm-signal"><span>{icon}</span><b>{Number(value || 0).toLocaleString("he")}</b><small>{label}</small></div>;
}

/**
 * ONE MASTER / MANY PROJECTIONS.
 * variant="hub" is the full Number/Phrase core.
 * variant="drawer" is the compact NumberDrawer projection over the same semantic structure.
 * This component owns presentation/context only; truth remains in existing Engine/Registry/Research adapters.
 */
export default function NumberCoreMaster2029({ number, variant = "hub", onOpenNumber }) {
  const P = usePalette();
  const nav = useNavigate();
  const compact = variant === "drawer";
  const root = Number(number);

  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [anchorFinding, setAnchorFinding] = useState(null);
  const [metrics, setMetrics] = useState({ views: 0, searches: 0 });
  const [neighbors, setNeighbors] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [activePhrase, setActivePhrase] = useState("");
  const [resolverDraft, setResolverDraft] = useState("");
  const [traceFinding, setTraceFinding] = useState(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const [showAllMethods, setShowAllMethods] = useState(false);
  const [razielOpen, setRazielOpen] = useState(false);

  useEffect(() => {
    let live = true;
    if (!Number.isInteger(root)) return undefined;
    setState({ loading: true, data: null, error: null });
    fetchEntityHubProjection({ type: "number", key: String(root), relationLimit: 100, researchLimit: 50, topicLimit: 16 })
      .then(data => live && setState({ loading: false, data, error: null }))
      .catch(error => live && setState({ loading: false, data: null, error }));
    return () => { live = false; };
  }, [root]);

  useEffect(() => {
    let live = true;
    if (!Number.isInteger(root)) return undefined;
    Promise.allSettled([
      supabase.from("number_anchors").select("value,category,fact,hint,created_at,updated_at").eq("value", root).maybeSingle(),
      getSearchCount(root),
      supabase.from("page_views").select("*", { count: "exact", head: true }).eq("kind", "number").eq("ref", String(root)),
      getNumberNeighbors(root, 12),
    ]).then(results => {
      if (!live) return;
      const anchorRow = results[0].status === "fulfilled" ? results[0].value?.data : null;
      setAnchorFinding(numberAnchorToUniversalFinding(anchorRow));
      setMetrics({
        searches: results[1].status === "fulfilled" ? Number(results[1].value || 0) : 0,
        views: results[2].status === "fulfilled" ? Number(results[2].value?.count || 0) : 0,
      });
      setNeighbors(results[3].status === "fulfilled" && Array.isArray(results[3].value) ? results[3].value : []);
    });
    return () => { live = false; };
  }, [root]);

  const data = state.data;
  const families = Array.isArray(data?.gematria?.families) ? data.gematria.families : [];
  const topics = Array.isArray(data?.topics?.rows) ? data.topics.rows : [];
  const relations = Array.isArray(data?.graph?.relations) ? data.graph.relations : [];
  const surface = data?.surface || {};
  const zeroChain = Array.isArray(data?.zeroScale?.scale_chain) ? data.zeroScale.scale_chain : [];
  const anchor = anchorFinding?.projection?.dimensions?.legacyNumberAnchor || null;
  const anchorPhrase = cleanAnchorPhrase(anchor?.fact, root);
  const leadTopic = topics[0] || null;

  useEffect(() => {
    if (!families.length) return;
    const withAnchor = anchorPhrase ? families.find(g => (g.phrases || []).some(x => phraseOf(x) === anchorPhrase)) : null;
    const preferred = withAnchor || families.find(g => g.method === "רגיל") || families[0];
    const phrase = anchorPhrase && (preferred?.phrases || []).some(x => phraseOf(x) === anchorPhrase)
      ? anchorPhrase
      : phraseOf(preferred?.phrases?.[0]);
    setSelectedMethod(preferred?.method || "");
    setActivePhrase(phrase || anchorPhrase || String(root));
    setResolverDraft(phrase || anchorPhrase || "");
  }, [families, anchorPhrase, root]);

  const selectedGroup = useMemo(
    () => families.find(g => g.method === selectedMethod) || families[0] || null,
    [families, selectedMethod],
  );

  const selectedPhrases = (selectedGroup?.phrases || []).map(phraseOf).filter(Boolean).slice(0, compact ? 6 : 12);
  const coreMethods = useMemo(() => {
    const wanted = ["רגיל", "מסתתר", "קדמי", "מילוי", "אתבש", "אי״ק בכ״ר"];
    const out = [];
    for (const w of wanted) {
      const found = families.find(g => String(g.method || "").includes(w) || String(methodLabel(g)).includes(w));
      if (found && !out.includes(found)) out.push(found);
    }
    for (const g of families) if (out.length < 6 && !out.includes(g)) out.push(g);
    return out.slice(0, 6);
  }, [families]);
  const visibleMethods = showAllMethods ? families : coreMethods;

  useEffect(() => {
    let live = true;
    const key = methodKey(selectedGroup);
    if (!key || !activePhrase) { setTraceFinding(null); return undefined; }
    setTraceLoading(true);
    fetchGematriaMethodTrace(key, activePhrase)
      .then(finding => { if (live) { setTraceFinding(finding || null); setTraceLoading(false); } })
      .catch(() => { if (live) { setTraceFinding(null); setTraceLoading(false); } });
    return () => { live = false; };
  }, [selectedGroup, activePhrase]);

  const trace = traceFinding?.projection?.dimensions?.trace || null;
  const activeResult = traceFinding?.subject?.value ?? trace?.result ?? trace?.value ?? null;
  const steps = Array.isArray(trace?.steps) ? trace.steps : [];
  const pulse = pulseFromCounts({
    posts: surface.postsCount ?? surface.posts?.length ?? 0,
    galleries: surface.galleriesCount ?? surface.galleries?.length ?? 0,
    words: surface.phrasesCount ?? surface.phrases?.length ?? 0,
    events: surface.eventsCount ?? 0,
    ai: surface.insightsCount ?? surface.insights?.length ?? 0,
    comm: surface.commentsCount ?? 0,
  });
  const entity = Number.isInteger(root) ? entityFromNumber(root) : null;

  function chooseMethod(group) {
    const phrases = (group?.phrases || []).map(phraseOf).filter(Boolean);
    setSelectedMethod(group?.method || "");
    setActivePhrase(current => phrases.includes(current) ? current : (phrases[0] || current));
    setTraceOpen(false);
  }

  function resolveInput(e) {
    e?.preventDefault?.();
    const q = String(resolverDraft || "").trim();
    if (!q) return;
    if (/^\d+$/.test(q)) {
      const target = Number(q);
      if (onOpenNumber) onOpenNumber(target);
      else nav(`/entity-hub-preview/number/${target}`);
      return;
    }
    setActivePhrase(q);
    setTraceOpen(false);
  }

  if (!Number.isInteger(root)) return null;
  if (state.loading) return <section className={`number-core-master number-core-master--${variant}`}><div className="ncm-loading">טוען את ליבת המספר…</div></section>;
  if (state.error || !data) return <section className={`number-core-master number-core-master--${variant}`}><div className="ncm-loading">ליבת המספר אינה זמינה כרגע.</div></section>;

  const css = `
    .number-core-master{direction:rtl;color:${P.ink};font-family:${F.ui};background:${P.cardGrad};border:1px solid ${P.borderStrong};border-radius:${compact ? 18 : 26}px;box-shadow:${P.mode === "dark" ? "0 22px 65px rgba(0,0,0,.34)" : "0 14px 42px rgba(70,50,10,.10)"};overflow:hidden;position:relative}
    .number-core-master *{box-sizing:border-box}
    .ncm-inner{padding:${compact ? "13px" : "18px 18px 20px"}}
    .ncm-resolver{display:flex;gap:7px;margin-bottom:${compact ? 10 : 15}px}
    .ncm-resolver input{min-width:0;flex:1;border:1px solid ${P.borderStrong};background:${P.cardSoft};color:${P.ink};border-radius:999px;padding:${compact ? "9px 12px" : "11px 15px"};font:600 ${compact ? 12.5 : 14}px ${F.body};outline:none}
    .ncm-resolver button,.ncm-pill{border:1px solid ${P.border};background:${P.cardSoft};color:${P.ink};border-radius:999px;padding:${compact ? "8px 10px" : "9px 13px"};font:800 ${compact ? 11.5 : 12.5}px ${F.ui};cursor:pointer;white-space:nowrap}
    .ncm-resolver button{border-color:${P.borderStrong};background:${P.accentBtn};color:${P.onAccent}}
    .ncm-hero{text-align:center;padding:${compact ? "5px 0 10px" : "8px 0 14px"}}
    .ncm-eyebrow{color:${P.accentDim};font:800 ${compact ? 10 : 11}px ${F.ui};letter-spacing:1.8px}
    .ncm-expression{color:${P.accentText};font:850 ${compact ? 23 : "clamp(28px,6vw,42px)"} ${F.display};line-height:1.15;margin-top:6px}
    .ncm-number{color:${P.heroNum};font:900 ${compact ? 50 : "clamp(66px,14vw,104px)"} ${F.numeric};line-height:1;letter-spacing:${compact ? 4 : 8}px;margin-top:5px;text-shadow:0 0 34px ${P.glow}}
    .ncm-context-tag{display:inline-flex;margin-top:8px;border:1px solid ${P.border};background:${P.cardSoft};color:${P.accentText};border-radius:999px;padding:5px 11px;font:800 ${compact ? 10.5 : 11.5}px ${F.ui}}
    .ncm-anchor{max-width:620px;margin:${compact ? "7px auto 0" : "10px auto 0"};color:${P.inkSoft};font:${compact ? 11.5 : 13}px ${F.body};line-height:1.55}
    .ncm-board{margin-top:${compact ? 9 : 13}px;border:1px solid ${P.borderStrong};border-radius:${compact ? 16 : 20}px;background:linear-gradient(145deg,${P.cardSoft},${P.card});padding:${compact ? 9 : 12}px;box-shadow:inset 0 1px rgba(255,255,255,.025)}
    .ncm-board-grid{display:grid;grid-template-columns:minmax(0,1fr) ${compact ? 112 : 148}px minmax(0,1fr);grid-template-areas:"m1 pulse m3" "m2 pulse m4";gap:${compact ? 6 : 9}px;align-items:stretch}
    .ncm-pulse{grid-area:pulse;display:flex;align-items:center;justify-content:center;min-height:${compact ? 160 : 188}px;border-inline:1px solid ${P.border};padding-inline:${compact ? 5 : 9}px}
    .ncm-metric{width:100%;text-align:start;border:1px solid ${P.border};background:transparent;color:${P.ink};border-radius:13px;padding:${compact ? 8 : 10}px;min-width:0;font-family:${F.ui}}
    button.ncm-metric{cursor:pointer}
    button.ncm-metric:hover{border-color:${P.borderStrong};background:${P.glow}}
    .ncm-board-grid>.ncm-metric:nth-child(1){grid-area:m1}.ncm-board-grid>.ncm-metric:nth-child(2){grid-area:m2}.ncm-board-grid>.ncm-metric:nth-child(4){grid-area:m3}.ncm-board-grid>.ncm-metric:nth-child(5){grid-area:m4}
    .ncm-metric__top{display:flex;align-items:center;justify-content:space-between;gap:5px}.ncm-metric__top strong{color:${P.accentText};font:900 ${compact ? 17 : 20}px ${F.numeric}}.ncm-metric__icon{font-size:${compact ? 17 : 20}px}.ncm-metric__label{color:${P.ink};font:850 ${compact ? 10.5 : 12}px ${F.ui};margin-top:4px}.ncm-metric__note{color:${P.inkSoft};font:${compact ? 9.5 : 10.5}px ${F.body};line-height:1.35;margin-top:2px}
    .ncm-signals{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid ${P.border}}
    .ncm-signal{display:flex;align-items:center;justify-content:center;gap:4px;min-width:0;color:${P.inkSoft};font-family:${F.ui}.ncm-signal b{color:${P.ink};font:850 ${compact ? 12 : 14}px ${F.numeric}}.ncm-signal small{font-size:${compact ? 8.5 : 10}px;white-space:nowrap}
    .ncm-actions{display:flex;gap:7px;justify-content:center;flex-wrap:wrap;margin-top:${compact ? 10 : 13}px}
    .ncm-methods{margin-top:${compact ? 12 : 16}px;padding-top:${compact ? 11 : 14}px;border-top:1px solid ${P.border}}
    .ncm-section-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.ncm-section-title{color:${P.accentText};font:900 ${compact ? 12.5 : 15}px ${F.ui}}.ncm-section-sub{color:${P.inkSoft};font:${compact ? 9.5 : 10.5}px ${F.body};margin-top:2px}
    .ncm-method-rail{display:flex;gap:6px;overflow-x:auto;scrollbar-width:thin;padding-bottom:4px}.ncm-method{flex:0 0 auto;border:1px solid ${P.border};background:${P.cardSoft};color:${P.ink};border-radius:999px;padding:${compact ? "7px 10px" : "8px 12px"};font:800 ${compact ? 10.5 : 11.5}px ${F.ui};cursor:pointer}.ncm-method.is-active{background:${P.accentBtn};color:${P.onAccent};border-color:${P.accent}}
    .ncm-phrases{display:flex;gap:5px;overflow-x:auto;margin-top:7px;padding-bottom:3px}.ncm-phrase{flex:0 0 auto;border:1px solid ${P.border};background:transparent;color:${P.inkSoft};border-radius:999px;padding:5px 8px;font:${compact ? 9.5 : 10.5}px ${F.body};cursor:pointer}.ncm-phrase.is-active{color:${P.accentText};border-color:${P.borderStrong};background:${P.glow}}
    .ncm-calc{margin-top:10px;border:1px solid ${P.border};background:${P.cardSoft};border-radius:14px;padding:${compact ? 9 : 11}px}.ncm-calc-main{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}.ncm-calc-value{color:${P.accentText};font:850 ${compact ? 12.5 : 14}px ${F.body}}.ncm-calc-actions{display:flex;gap:5px;flex-wrap:wrap}.ncm-calc-actions button{border:1px solid ${P.border};background:${P.card};color:${P.ink};border-radius:999px;padding:6px 9px;font:800 ${compact ? 9.5 : 10.5}px ${F.ui};cursor:pointer}.ncm-trace{margin-top:8px;padding-top:8px;border-top:1px solid ${P.border};color:${P.inkSoft};font:${compact ? 10 : 11}px ${F.body};line-height:1.55}
    .ncm-focus-row{display:grid;grid-template-columns:${compact ? "1fr" : "1.15fr .85fr"};gap:8px;margin-top:10px}.ncm-focus-card{border:1px solid ${P.border};background:${P.cardSoft};border-radius:14px;padding:${compact ? 9 : 11}px}.ncm-focus-kicker{color:${P.accentDim};font:800 9.5px ${F.ui};letter-spacing:1px}.ncm-focus-title{color:${P.accentText};font:850 ${compact ? 12 : 13.5}px ${F.ui};line-height:1.45;margin-top:4px}.ncm-focus-text{color:${P.inkSoft};font:${compact ? 9.5 : 10.5}px ${F.body};line-height:1.45;margin-top:3px}.ncm-zero{display:flex;gap:5px;overflow-x:auto;margin-top:7px}.ncm-zero button{flex:0 0 auto;border:1px solid ${P.border};background:${P.card};color:${P.heroNum};border-radius:999px;padding:5px 8px;font:800 ${compact ? 10 : 11}px ${F.numeric};cursor:pointer}
    .ncm-raziel{margin-top:10px}.ncm-loading{padding:28px;text-align:center;color:${P.inkSoft};font-family:${F.body}}
    @media(max-width:430px){.number-core-master--hub .ncm-board-grid{grid-template-columns:minmax(0,1fr) 112px minmax(0,1fr)}.number-core-master--hub .ncm-pulse{min-height:160px}.number-core-master--hub .ncm-metric__note{display:none}.number-core-master--hub .ncm-focus-row{grid-template-columns:1fr}}
    @media(prefers-reduced-motion:reduce){.number-core-master *{scroll-behavior:auto!important;transition:none!important}}
  `;

  return <section className={`number-core-master number-core-master--${variant}`}>
    <style>{css}</style>
    <div className="ncm-inner">
      <form className="ncm-resolver" onSubmit={resolveInput}>
        <input value={resolverDraft} onChange={e => setResolverDraft(e.target.value)} placeholder="שם · ביטוי · מספר" aria-label="חיפוש בתוך דף המספר" />
        <button type="submit">חפש</button>
      </form>

      <div className="ncm-hero">
        <div className="ncm-eyebrow">{compact ? "חלונית המספר" : "דף המספר"}</div>
        <div className="ncm-expression">{activePhrase || anchorPhrase || root}</div>
        <div className="ncm-number">{root}</div>
        <div className="ncm-context-tag">{traceLoading ? "מחשב…" : activeResult != null ? `${methodLabel(selectedGroup)} · ${activeResult}` : "ביטוי חי"}</div>
        {(anchor?.hint || leadTopic?.title) && <div className="ncm-anchor">{short(anchor?.hint || `התכנסות מובילה: ${leadTopic?.title}`, compact ? 86 : 125)}</div>}
      </div>

      <div className="ncm-board" aria-label={`מרכז ההקשר של ${root}`}>
        <div className="ncm-board-grid">
          <Metric P={P} icon="🧬" value={topics.length} label="DNA" note="צירי מהות פעילים" onClick={() => !compact && document.getElementById("convergence")?.scrollIntoView({ behavior: "smooth" })} />
          <Metric P={P} icon="🧮" value={families.length} label="שיטות" note={`${coreMethods.length} שיטות ליבה`} onClick={() => setShowAllMethods(v => !v)} />
          <div className="ncm-pulse"><PulseRing value={pulse} size={compact ? 104 : 132} core={false} /></div>
          <Metric P={P} icon="◎" value={topics.length} label="התכנסויות" note={leadTopic ? "יש חיבור מוביל" : "אין מובילה כרגע"} onClick={() => !compact && document.getElementById("convergence")?.scrollIntoView({ behavior: "smooth" })} />
          <Metric P={P} icon="🔗" value={neighbors.length} label="נתיבים" note={`${relations.length} קשרי גרף`} onClick={() => !compact && document.getElementById("paths")?.scrollIntoView({ behavior: "smooth" })} />
        </div>
        <div className="ncm-signals">
          <Signal icon="👁" value={metrics.views} label="צפיות" />
          <Signal icon="🔎" value={metrics.searches} label="חיפושים" />
          <Signal icon="🔗" value={relations.length} label="חיבורים" />
        </div>
      </div>

      <div className="ncm-actions">
        <WatchButton topic={`number:${root}`} source={`number_core_master_${variant}`} compact ghost label="עקוב" />
        {!compact && <button type="button" className="ncm-pill" onClick={() => nav(`/research?tool=gematria&q=${encodeURIComponent(activePhrase || String(root))}`)}>פתח מחקר</button>}
        {compact && <button type="button" className="ncm-pill" onClick={() => nav(`/entity-hub-preview/number/${root}`)}>פתח דף מלא</button>}
      </div>
      {!compact && entity && <QuickActions entity={entity} hideAnalyze style={{ "--acc": P.accent, "--onAcc": P.onAccent, "--line": P.border, "--card": P.cardSoft, "--ink": P.ink, "--ink2": P.inkSoft, "--accS": P.glow }} />}

      <div className="ncm-methods">
        <div className="ncm-section-head">
          <div><div className="ncm-section-title">שיטות ליבה</div><div className="ncm-section-sub">אותו ביטוי · השיטה משנה את ההקשר</div></div>
          {families.length > coreMethods.length && <button type="button" className="ncm-pill" onClick={() => setShowAllMethods(v => !v)}>{showAllMethods ? "פחות" : `עוד ${families.length - coreMethods.length}`} {showAllMethods ? "▴" : "▾"}</button>}
        </div>
        <div className="ncm-method-rail">
          {visibleMethods.map(group => <button type="button" key={group.method} onClick={() => chooseMethod(group)} className={`ncm-method ${group.method === selectedGroup?.method ? "is-active" : ""}`}>{methodLabel(group)}</button>)}
        </div>
        {selectedPhrases.length > 1 && <div className="ncm-phrases">{selectedPhrases.map(phrase => <button type="button" key={phrase} onClick={() => { setActivePhrase(phrase); setResolverDraft(phrase); }} className={`ncm-phrase ${phrase === activePhrase ? "is-active" : ""}`}>{phrase}</button>)}</div>}
      </div>

      <div className="ncm-calc">
        <div className="ncm-calc-main">
          <div className="ncm-calc-value">{activePhrase || "—"} · {methodLabel(selectedGroup)} {traceLoading ? "…" : activeResult != null ? `= ${activeResult}` : ""}</div>
          <div className="ncm-calc-actions">
            <button type="button" onClick={() => setTraceOpen(v => !v)}>איך מחשבים?</button>
            <button type="button" onClick={() => setRazielOpen(v => !v)}>שאל את רזיאל</button>
            {!compact && <button type="button" onClick={() => nav(`/research?tool=gematria&q=${encodeURIComponent(activePhrase || String(root))}`)}>המשך מחקר</button>}
          </div>
        </div>
        {traceOpen && <div className="ncm-trace">{trace ? (steps.length ? short(steps.map(s => typeof s === "string" ? s : (s.word || s.label || s.step || "")).filter(Boolean).join(" · "), compact ? 180 : 320) : "החישוב אומת במנוע הקנוני; פירוט הצעדים זמין ב־Trace.") : "Trace לא זמין כרגע."}</div>}
      </div>

      <div className="ncm-focus-row">
        <div className="ncm-focus-card">
          <div className="ncm-focus-kicker">החיבור המוביל</div>
          <div className="ncm-focus-title">{leadTopic?.title || "אין כרגע התכנסות מאושרת להצגה"}</div>
          {leadTopic?.subtitle && <div className="ncm-focus-text">{short(leadTopic.subtitle, compact ? 80 : 130)}</div>}
          {leadTopic?.slug && <button type="button" className="ncm-pill" style={{ marginTop: 7 }} onClick={() => nav(`/topic/${encodeURIComponent(leadTopic.slug)}`)}>למה זה חשוב?</button>}
        </div>
        <div className="ncm-focus-card">
          <div className="ncm-focus-kicker">Zero Scale</div>
          <div className="ncm-focus-title">אותו שורש · סדר גודל אחר</div>
          {zeroChain.length > 0 ? <div className="ncm-zero">{zeroChain.slice(0, compact ? 3 : 5).map(n => <button type="button" key={n} onClick={() => onOpenNumber ? onOpenNumber(Number(n)) : nav(`/entity-hub-preview/number/${n}`)}>{n}</button>)}</div> : <div className="ncm-focus-text">אין כרגע שרשרת זמינה.</div>}
        </div>
      </div>

      {razielOpen && <div className="ncm-raziel"><AskRaziel subject={`${activePhrase || root} · ${methodLabel(selectedGroup)} · ${root}`} facts={[anchor?.fact || null, leadTopic?.title ? `התכנסות מובילה: ${leadTopic.title}` : null, activeResult != null ? `${activePhrase} · ${methodLabel(selectedGroup)} = ${activeResult}` : null].filter(Boolean)} context={`Root number ${root}; active expression ${activePhrase || "—"}; selected method ${methodLabel(selectedGroup)}. Explain the current connection and suggest one bounded next research step without recalculating authoritative gematria.`} title="רזיאל · הצעד הבא" subtitle="אותו הקשר, בלי מוח נפרד לחלונית" greeting={`אני רואה את ${root}, את הביטוי «${activePhrase || ""}» ואת שיטת ${methodLabel(selectedGroup)}.`} cta={false} /></div>}
    </div>
  </section>;
}
