import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

const METHOD_STATE_FIELDS = "method_key,display_label,category,sort_order,active,executable,engine_verified,scannable,execution_kind,operator,method_version,required_entitlement";
const METHOD_DEF_FIELDS = "method_key,display_label,category,sort_order,sub,soul,version,required_entitlement";
const TOPIC_INSPECT_FIELDS = "id,slug,title,subtitle,status,quality,approved_at,numbers";

function phraseOf(item) {
  if (typeof item === "string") return item;
  return item?.phrase || item?.label || "";
}

function methodLabel(method) {
  return method?.display_label || method?.registry?.display_label || method?.method || method?.method_key || "שיטה";
}

function methodKey(method) {
  return method?.method_key || method?.registry?.method_key || method?.method || "";
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

function Metric({ icon, value, label, note, onClick }) {
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

function hasFinalLetters(text) {
  return /[ךםןףץ]/.test(String(text || ""));
}

function isSingleToken(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length === 1;
}

function conditionalFamily(key, expression) {
  const noFinal = !hasFinalLetters(expression);
  const single = isSingleToken(expression);
  if (noFinal) {
    const noFinalMap = {
      "גדול": "רגיל",
      "משולש גדול": "קדמי",
      "ריבוע גדול": "ריבוע",
      "הכפלה גדולה": "הכפלה",
      "מסתתר גדול": "מסתתר",
      "מיקום האות": "סידורי",
    };
    if (noFinalMap[key]) return noFinalMap[key];
  }
  if (single) {
    if (key === "משולש מילה") return "ריבוע";
    if (key === "משולש מדרגות") return "משולש הפוך";
  }
  return key;
}

function buildCoreMethods(eligible, expression, compact) {
  const priority = ["רגיל", "מילוי", "מסתתר", "מילוי בלבד", "קדמי", "אתבש", "איק בכר", "אלבם", "ריבוע", "סידורי", "משולש הפוך"];
  const byKey = new Map(eligible.map(m => [m.method_key, m]));
  const limit = compact ? 5 : 6;
  const out = [];
  const presentationFamilies = new Set();

  const add = method => {
    if (!method || out.includes(method)) return;
    const family = conditionalFamily(method.method_key, expression);
    if (presentationFamilies.has(family)) return;
    presentationFamilies.add(family);
    out.push(method);
  };

  priority.forEach(key => { if (out.length < limit) add(byKey.get(key)); });
  eligible.forEach(method => { if (out.length < limit) add(method); });
  return out.slice(0, limit);
}

/**
 * ONE MASTER / MANY PROJECTIONS.
 * variant="hub" is the expanded Number/Phrase core.
 * variant="drawer" is the compact NumberDrawer projection over the SAME semantic state.
 * Truth/calculation remain owned by the canonical Registry/Engine/Research adapters.
 */
export default function NumberCoreMaster2029({ number, variant = "hub", onOpenNumber }) {
  const P = usePalette();
  const nav = useNavigate();
  const location = useLocation();
  const compact = variant === "drawer";
  const root = Number(number);
  const initRootRef = useRef(null);

  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [anchorFinding, setAnchorFinding] = useState(null);
  const [metrics, setMetrics] = useState({ views: 0, searches: 0 });
  const [neighbors, setNeighbors] = useState([]);
  const [eligibleMethods, setEligibleMethods] = useState([]);
  const [methodDefs, setMethodDefs] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [activePhrase, setActivePhrase] = useState("");
  const [resolverDraft, setResolverDraft] = useState("");
  const [mixedChoice, setMixedChoice] = useState(null);
  const [traceFinding, setTraceFinding] = useState(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const [showAllMethods, setShowAllMethods] = useState(false);
  const [razielOpen, setRazielOpen] = useState(false);
  const [crossWhyOpen, setCrossWhyOpen] = useState(false);
  const [inspect, setInspect] = useState(null);
  const [inspectState, setInspectState] = useState({ loading: false, topic: null, neighbors: [] });
  const [inspectRazielOpen, setInspectRazielOpen] = useState(false);

  useEffect(() => {
    let live = true;
    if (!Number.isInteger(root)) return undefined;
    setState({ loading: true, data: null, error: null });
    initRootRef.current = null;
    setActivePhrase("");
    setResolverDraft("");
    setSelectedMethod("");
    setMixedChoice(null);
    setInspect(null);
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
      supabase.from("v_method_states").select(METHOD_STATE_FIELDS).eq("active", true).eq("executable", true).eq("engine_verified", true).order("sort_order", { ascending: true }),
      supabase.from("gematria_methods").select(METHOD_DEF_FIELDS).eq("active", true).order("sort_order", { ascending: true }),
    ]).then(results => {
      if (!live) return;
      const anchorRow = results[0].status === "fulfilled" ? results[0].value?.data : null;
      const states = results[4].status === "fulfilled" ? (results[4].value?.data || []) : [];
      setAnchorFinding(numberAnchorToUniversalFinding(anchorRow));
      setMetrics({
        searches: results[1].status === "fulfilled" ? Number(results[1].value || 0) : 0,
        views: results[2].status === "fulfilled" ? Number(results[2].value?.count || 0) : 0,
      });
      setNeighbors(results[3].status === "fulfilled" && Array.isArray(results[3].value) ? results[3].value : []);
      setEligibleMethods(states.filter(m => m.execution_kind !== "context_activated"));
      setMethodDefs(results[5].status === "fulfilled" ? (results[5].value?.data || []) : []);
    });
    return () => { live = false; };
  }, [root]);

  const data = state.data;
  const families = Array.isArray(data?.gematria?.families) ? data.gematria.families : [];
  const topics = Array.isArray(data?.topics?.rows) ? data.topics.rows : [];
  const relations = Array.isArray(data?.graph?.relations) ? data.graph.relations : [];
  const surface = data?.surface || {};
  const zeroChain = Array.isArray(data?.zeroScale?.scale_chain) ? data.zeroScale.scale_chain : [];
  const sources = Array.isArray(data?.sources) ? data.sources : [];
  const researchRows = Array.isArray(data?.research?.rows) ? data.research.rows : [];
  const anchor = anchorFinding?.projection?.dimensions?.legacyNumberAnchor || null;
  const anchorPhrase = cleanAnchorPhrase(anchor?.fact, root);
  const leadTopic = topics[0] || null;

  const familyByMethod = useMemo(() => {
    const map = new Map();
    for (const family of families) {
      const key = methodKey(family);
      if (key) map.set(key, family);
    }
    return map;
  }, [families]);

  const defsByKey = useMemo(() => new Map(methodDefs.map(d => [d.method_key, d])), [methodDefs]);
  const eligibleByKey = useMemo(() => new Map(eligibleMethods.map(m => [m.method_key, m])), [eligibleMethods]);

  useEffect(() => {
    if (initRootRef.current === root || !families.length || !eligibleMethods.length) return;
    const familyWithAnchor = anchorPhrase
      ? families.find(group => (group.phrases || []).some(item => phraseOf(item) === anchorPhrase))
      : null;
    const preferredKey = methodKey(familyWithAnchor) || (eligibleByKey.has("רגיל") ? "רגיל" : eligibleMethods[0]?.method_key) || "";
    const preferredFamily = familyByMethod.get(preferredKey) || familyWithAnchor || families[0];
    const fallbackPhrase = phraseOf(preferredFamily?.phrases?.[0]);
    const phrase = anchorPhrase || fallbackPhrase || String(root);
    setSelectedMethod(preferredKey);
    setActivePhrase(phrase);
    setResolverDraft(phrase);
    initRootRef.current = root;
  }, [root, families, eligibleMethods, eligibleByKey, familyByMethod, anchorPhrase]);

  const selectedMethodMeta = eligibleByKey.get(selectedMethod) || eligibleMethods[0] || null;
  const selectedFamily = familyByMethod.get(selectedMethod) || null;
  const selectedDef = defsByKey.get(selectedMethod) || null;
  const selectedPhrases = (selectedFamily?.phrases || []).map(phraseOf).filter(Boolean).slice(0, compact ? 6 : 12);
  const coreMethods = useMemo(() => buildCoreMethods(eligibleMethods, activePhrase, compact), [eligibleMethods, activePhrase, compact]);
  const visibleMethods = useMemo(() => {
    if (showAllMethods) return eligibleMethods;
    if (!selectedMethodMeta || coreMethods.some(m => m.method_key === selectedMethodMeta.method_key)) return coreMethods;
    if (!coreMethods.length) return [selectedMethodMeta];
    return [...coreMethods.slice(0, -1), selectedMethodMeta];
  }, [showAllMethods, eligibleMethods, coreMethods, selectedMethodMeta]);

  useEffect(() => {
    let live = true;
    const key = selectedMethodMeta?.method_key || selectedMethod;
    if (!key || !activePhrase) { setTraceFinding(null); return undefined; }
    setTraceLoading(true);
    fetchGematriaMethodTrace(key, activePhrase)
      .then(finding => { if (live) { setTraceFinding(finding || null); setTraceLoading(false); } })
      .catch(() => { if (live) { setTraceFinding(null); setTraceLoading(false); } });
    return () => { live = false; };
  }, [selectedMethodMeta, selectedMethod, activePhrase]);

  const trace = traceFinding?.projection?.dimensions?.trace || null;
  const activeResult = traceFinding?.subject?.value ?? trace?.result ?? trace?.value ?? null;
  const steps = Array.isArray(trace?.steps) ? trace.steps : [];
  const activityPulse = pulseFromCounts({
    posts: surface.postsCount ?? surface.posts?.length ?? 0,
    galleries: surface.galleriesCount ?? surface.galleries?.length ?? 0,
    words: surface.phrasesCount ?? surface.phrases?.length ?? 0,
    events: surface.eventsCount ?? 0,
    ai: surface.insightsCount ?? surface.insights?.length ?? 0,
    comm: surface.commentsCount ?? 0,
  });
  const entity = Number.isInteger(root) ? entityFromNumber(root) : null;
  const mediaCount = Number(surface.galleriesCount ?? surface.galleries?.length ?? 0) + Number(surface.postsCount ?? surface.posts?.length ?? 0);
  const dnaAxes = [families.length, topics.length, relations.length, sources.length, researchRows.length, mediaCount, zeroChain.length].filter(n => Number(n || 0) > 0).length;
  const activeEqualsRoot = Number(activeResult) === root;
  const activeTarget = Number.isFinite(Number(activeResult)) ? Number(activeResult) : null;

  useEffect(() => {
    let live = true;
    setInspectRazielOpen(false);
    if (!inspect?.value) {
      setInspectState({ loading: false, topic: null, neighbors: [] });
      return undefined;
    }
    const n = Number(inspect.value);
    setInspectState({ loading: true, topic: null, neighbors: [] });
    Promise.allSettled([
      supabase.from("topic_cards_public").select(TOPIC_INSPECT_FIELDS).contains("numbers", [n]).order("quality", { ascending: false, nullsFirst: false }).limit(1),
      getNumberNeighbors(n, 5),
    ]).then(results => {
      if (!live) return;
      setInspectState({
        loading: false,
        topic: results[0].status === "fulfilled" ? results[0].value?.data?.[0] || null : null,
        neighbors: results[1].status === "fulfilled" && Array.isArray(results[1].value) ? results[1].value : [],
      });
    });
    return () => { live = false; };
  }, [inspect?.value]);

  function chooseMethod(method) {
    const key = methodKey(method);
    if (!key) return;
    // Human-Gate invariant: method switch changes the calculation/result context, NOT the active Expression or Root.
    setSelectedMethod(key);
    setTraceOpen(false);
    setLearnOpen(false);
    setRazielOpen(false);
  }

  function resolveInput(e) {
    e?.preventDefault?.();
    const q = String(resolverDraft || "").trim();
    if (!q) return;
    const digit = q.match(/\d+/);
    const text = q.replace(/\d+/g, " ").replace(/\s+/g, " ").trim();
    if (digit && text) {
      setMixedChoice({ number: Number(digit[0]), expression: text, raw: q });
      return;
    }
    setMixedChoice(null);
    if (/^\d+$/.test(q)) {
      openNumber(Number(q));
      return;
    }
    setActivePhrase(q);
    setTraceOpen(false);
    setLearnOpen(false);
  }

  function openNumber(target) {
    const n = Number(target);
    if (!Number.isFinite(n)) return;
    if (onOpenNumber) { onOpenNumber(n); return; }
    const returnTo = encodeURIComponent(`${location.pathname}${location.search || ""}`);
    nav(`/entity-hub-preview/number/${n}?returnTo=${returnTo}`);
  }

  function openInspectNumber(value, reason) {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    setInspect({ value: n, ...(reason || {}) });
  }

  if (!Number.isInteger(root)) return null;
  if (state.loading) return <section className={`number-core-master number-core-master--${variant}`}><div className="ncm-loading">טוען את ליבת המספר…</div></section>;
  if (state.error || !data) return <section className={`number-core-master number-core-master--${variant}`}><div className="ncm-loading">ליבת המספר אינה זמינה כרגע.</div></section>;

  const css = `
    .number-core-master{direction:rtl;color:${P.ink};font-family:${F.ui};background:${P.cardGrad};border:1px solid ${P.borderStrong};border-radius:${compact ? 18 : 26}px;box-shadow:${P.mode === "dark" ? "0 22px 65px rgba(0,0,0,.34)" : "0 14px 42px rgba(70,50,10,.10)"};overflow:hidden;position:relative}
    .number-core-master *{box-sizing:border-box}.ncm-inner{padding:${compact ? "13px" : "18px 18px 20px"}}
    .ncm-resolver{display:flex;gap:7px;margin-bottom:${compact ? 10 : 15}px}.ncm-resolver input{min-width:0;flex:1;border:1px solid ${P.borderStrong};background:${P.cardSoft};color:${P.ink};border-radius:999px;padding:${compact ? "9px 12px" : "11px 15px"};font:600 ${compact ? 12.5 : 14}px ${F.body};outline:none}.ncm-resolver button,.ncm-pill{border:1px solid ${P.border};background:${P.cardSoft};color:${P.ink};border-radius:999px;padding:${compact ? "8px 10px" : "9px 13px"};font:800 ${compact ? 11.5 : 12.5}px ${F.ui};cursor:pointer;white-space:nowrap}.ncm-resolver>button{border-color:${P.borderStrong};background:${P.accentBtn};color:${P.onAccent}}
    .ncm-mixed{margin:-4px 0 12px;padding:10px;border:1px solid ${P.border};background:${P.cardSoft};border-radius:14px}.ncm-mixed-title{color:${P.accentText};font:850 11px ${F.ui};margin-bottom:7px}.ncm-mixed-actions{display:flex;gap:6px;flex-wrap:wrap}
    .ncm-hero{text-align:center;padding:${compact ? "5px 0 10px" : "8px 0 14px"}}.ncm-eyebrow{color:${P.accentDim};font:800 ${compact ? 10 : 11}px ${F.ui};letter-spacing:1.8px}.ncm-expression{color:${P.accentText};font:850 ${compact ? 23 : "clamp(28px,6vw,42px)"} ${F.display};line-height:1.15;margin-top:6px}.ncm-number{color:${P.heroNum};font:900 ${compact ? 50 : "clamp(66px,14vw,104px)"} ${F.numeric};line-height:1;letter-spacing:${compact ? 4 : 8}px;margin-top:5px;text-shadow:0 0 34px ${P.glow}}.ncm-context-tag{display:inline-flex;margin-top:8px;border:1px solid ${P.border};background:${P.cardSoft};color:${P.accentText};border-radius:999px;padding:5px 11px;font:800 ${compact ? 10.5 : 11.5}px ${F.ui}}.ncm-anchor{max-width:620px;margin:${compact ? "7px auto 0" : "10px auto 0"};color:${P.inkSoft};font:${compact ? 11.5 : 13}px ${F.body};line-height:1.55}
    .ncm-board{margin-top:${compact ? 9 : 13}px;border:1px solid ${P.borderStrong};border-radius:${compact ? 16 : 20}px;background:linear-gradient(145deg,${P.cardSoft},${P.card});padding:${compact ? 9 : 12}px;box-shadow:inset 0 1px rgba(255,255,255,.025)}.ncm-board-grid{display:grid;grid-template-columns:minmax(0,1fr) ${compact ? 112 : 148}px minmax(0,1fr);grid-template-areas:"m1 pulse m3" "m2 pulse m4";gap:${compact ? 6 : 9}px;align-items:stretch}.ncm-pulse{grid-area:pulse;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:${compact ? 160 : 188}px;border-inline:1px solid ${P.border};padding-inline:${compact ? 5 : 9}px}.ncm-pulse-note{color:${P.inkSoft};font:700 ${compact ? 8.5 : 9.5}px ${F.body};text-align:center;margin-top:3px}.ncm-metric{width:100%;text-align:start;border:1px solid ${P.border};background:transparent;color:${P.ink};border-radius:13px;padding:${compact ? 8 : 10}px;min-width:0;font-family:${F.ui}}button.ncm-metric{cursor:pointer}button.ncm-metric:hover{border-color:${P.borderStrong};background:${P.glow}}.ncm-board-grid>.ncm-metric:nth-child(1){grid-area:m1}.ncm-board-grid>.ncm-metric:nth-child(2){grid-area:m2}.ncm-board-grid>.ncm-metric:nth-child(4){grid-area:m3}.ncm-board-grid>.ncm-metric:nth-child(5){grid-area:m4}.ncm-metric__top{display:flex;align-items:center;justify-content:space-between;gap:5px}.ncm-metric__top strong{color:${P.accentText};font:900 ${compact ? 17 : 20}px ${F.numeric}}.ncm-metric__icon{font-size:${compact ? 17 : 20}px}.ncm-metric__label{color:${P.ink};font:850 ${compact ? 10.5 : 12}px ${F.ui};margin-top:4px}.ncm-metric__note{color:${P.inkSoft};font:${compact ? 9.5 : 10.5}px ${F.body};line-height:1.35;margin-top:2px}.ncm-signals{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid ${P.border}}.ncm-signal{display:flex;align-items:center;justify-content:center;gap:4px;min-width:0;color:${P.inkSoft};font-family:${F.ui}.ncm-signal b{color:${P.ink};font:850 ${compact ? 12 : 14}px ${F.numeric}}.ncm-signal small{font-size:${compact ? 8.5 : 10}px;white-space:nowrap}
    .ncm-actions{display:flex;gap:7px;justify-content:center;flex-wrap:wrap;margin-top:${compact ? 10 : 13}px}.ncm-methods{margin-top:${compact ? 12 : 16}px;padding-top:${compact ? 11 : 14}px;border-top:1px solid ${P.border}}.ncm-section-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.ncm-section-title{color:${P.accentText};font:900 ${compact ? 12.5 : 15}px ${F.ui}}.ncm-section-sub{color:${P.inkSoft};font:${compact ? 9.5 : 10.5}px ${F.body};margin-top:2px}.ncm-method-rail{display:flex;gap:6px;overflow-x:auto;scrollbar-width:thin;padding-bottom:4px}.ncm-method{flex:0 0 auto;border:1px solid ${P.border};background:${P.cardSoft};color:${P.ink};border-radius:999px;padding:${compact ? "7px 10px" : "8px 12px"};font:800 ${compact ? 10.5 : 11.5}px ${F.ui};cursor:pointer}.ncm-method.is-active{background:${P.accentBtn};color:${P.onAccent};border-color:${P.accent}}.ncm-phrases{display:flex;gap:5px;overflow-x:auto;margin-top:7px;padding-bottom:3px}.ncm-phrase{flex:0 0 auto;border:1px solid ${P.border};background:transparent;color:${P.inkSoft};border-radius:999px;padding:5px 8px;font:${compact ? 9.5 : 10.5}px ${F.body};cursor:pointer}.ncm-phrase.is-active{color:${P.accentText};border-color:${P.borderStrong};background:${P.glow}}.ncm-plan-note{margin-top:7px;color:${P.inkSoft};font:${compact ? 9 : 10}px ${F.body};line-height:1.45}
    .ncm-calc,.ncm-intel,.ncm-inspect{margin-top:10px;border:1px solid ${P.border};background:${P.cardSoft};border-radius:14px;padding:${compact ? 9 : 11}px}.ncm-calc-main{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}.ncm-calc-value{color:${P.accentText};font:850 ${compact ? 12.5 : 14}px ${F.body}}.ncm-calc-actions{display:flex;gap:5px;flex-wrap:wrap}.ncm-calc-actions button,.ncm-inspect-actions button{border:1px solid ${P.border};background:${P.card};color:${P.ink};border-radius:999px;padding:6px 9px;font:800 ${compact ? 9.5 : 10.5}px ${F.ui};cursor:pointer}.ncm-trace,.ncm-learn{margin-top:8px;padding-top:8px;border-top:1px solid ${P.border};color:${P.inkSoft};font:${compact ? 10 : 11}px ${F.body};line-height:1.55}.ncm-learn b{color:${P.accentText}}.ncm-intel-title{color:${P.accentText};font:900 ${compact ? 11.5 : 13}px ${F.ui};margin-bottom:6px}.ncm-intel-row{display:grid;grid-template-columns:${compact ? 72 : 92}px 1fr;gap:7px;padding:4px 0;color:${P.inkSoft};font:${compact ? 9.5 : 10.5}px ${F.body};line-height:1.45}.ncm-intel-row b{color:${P.ink};font-family:${F.ui}}
    .ncm-related{margin-top:10px}.ncm-related-rail{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px}.ncm-related-card{flex:0 0 ${compact ? 116 : 138}px;text-align:start;border:1px solid ${P.border};background:${P.cardSoft};border-radius:13px;padding:9px;color:${P.ink};cursor:pointer}.ncm-related-card strong{display:block;color:${P.heroNum};font:900 ${compact ? 18 : 21}px ${F.numeric}}.ncm-related-card span{display:block;color:${P.accentText};font:800 ${compact ? 9 : 10}px ${F.ui};margin-top:3px}.ncm-related-card small{display:block;color:${P.inkSoft};font:${compact ? 8.5 : 9.5}px ${F.body};line-height:1.35;margin-top:3px}.ncm-inspect-title{color:${P.accentText};font:900 13px ${F.ui}}.ncm-inspect-text{color:${P.inkSoft};font:${compact ? 9.5 : 10.5}px ${F.body};line-height:1.5;margin-top:5px}.ncm-inspect-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
    .ncm-focus-row{display:grid;grid-template-columns:${compact ? "1fr" : "1.15fr .85fr"};gap:8px;margin-top:10px}.ncm-focus-card{border:1px solid ${P.border};background:${P.cardSoft};border-radius:14px;padding:${compact ? 9 : 11}px}.ncm-focus-kicker{color:${P.accentDim};font:800 9.5px ${F.ui};letter-spacing:1px}.ncm-focus-title{color:${P.accentText};font:850 ${compact ? 12 : 13.5}px ${F.ui};line-height:1.45;margin-top:4px}.ncm-focus-text{color:${P.inkSoft};font:${compact ? 9.5 : 10.5}px ${F.body};line-height:1.45;margin-top:3px}.ncm-zero{display:flex;gap:5px;overflow-x:auto;margin-top:7px}.ncm-zero button{flex:0 0 auto;border:1px solid ${P.border};background:${P.card};color:${P.heroNum};border-radius:999px;padding:5px 8px;font:800 ${compact ? 10 : 11}px ${F.numeric};cursor:pointer}.ncm-why{margin-top:8px;padding-top:8px;border-top:1px solid ${P.border};color:${P.inkSoft};font:${compact ? 9.5 : 10.5}px ${F.body};line-height:1.5}.ncm-raziel{margin-top:10px}.ncm-loading{padding:28px;text-align:center;color:${P.inkSoft};font-family:${F.body}}
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

      {mixedChoice && <div className="ncm-mixed">
        <div className="ncm-mixed-title">מצאתי גם ביטוי וגם מספר — מה לפתוח?</div>
        <div className="ncm-mixed-actions">
          <button type="button" className="ncm-pill" onClick={() => { setActivePhrase(mixedChoice.expression); setResolverDraft(mixedChoice.expression); setMixedChoice(null); }}>חקור «{mixedChoice.expression}» בתוך {root}</button>
          <button type="button" className="ncm-pill" onClick={() => openNumber(mixedChoice.number)}>פתח את {mixedChoice.number}</button>
        </div>
      </div>}

      <div className="ncm-hero">
        <div className="ncm-eyebrow">{compact ? "חלונית המספר" : "דף המספר"}</div>
        <div className="ncm-expression">{activePhrase || anchorPhrase || root}</div>
        <div className="ncm-number">{root}</div>
        <div className="ncm-context-tag">{traceLoading ? "מחשב…" : activeResult != null ? `${methodLabel(selectedMethodMeta)} · ${activeResult}` : "ביטוי חי"}</div>
        {(anchor?.hint || leadTopic?.title) && <div className="ncm-anchor">{short(anchor?.hint || `התכנסות מובילה: ${leadTopic?.title}`, compact ? 86 : 125)}</div>}
      </div>

      <div className="ncm-board" aria-label={`מרכז ההקשר של ${root}`}>
        <div className="ncm-board-grid">
          <Metric icon="🧬" value={dnaAxes} label="DNA" note={`${sources.length} מקורות · ${mediaCount} מדיה`} onClick={() => !compact && document.getElementById("convergence")?.scrollIntoView({ behavior: "smooth" })} />
          <Metric icon="🧮" value={eligibleMethods.length || families.length} label="שיטות" note={`${coreMethods.length} מוצגות עכשיו`} onClick={() => setShowAllMethods(v => !v)} />
          <div className="ncm-pulse"><PulseRing value={activityPulse} size={compact ? 104 : 132} core={false} /><div className="ncm-pulse-note">דופק פעילות · לא ציון אמת</div></div>
          <Metric icon="◎" value={topics.length} label="התכנסויות" note={leadTopic ? "יש חיבור מוביל" : "אין מובילה כרגע"} onClick={() => !compact && document.getElementById("convergence")?.scrollIntoView({ behavior: "smooth" })} />
          <Metric icon="🔗" value={neighbors.length} label="נתיבים" note={`${relations.length} קשרי גרף`} onClick={() => !compact && document.getElementById("paths")?.scrollIntoView({ behavior: "smooth" })} />
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
        {compact && <button type="button" className="ncm-pill" onClick={() => openNumber(root)}>פתח דף מלא</button>}
      </div>
      {entity && <QuickActions entity={entity} hideAnalyze style={{ "--acc": P.accent, "--onAcc": P.onAccent, "--line": P.border, "--card": P.cardSoft, "--ink": P.ink, "--ink2": P.inkSoft, "--accS": P.glow }} />}

      <div className="ncm-methods">
        <div className="ncm-section-head">
          <div><div className="ncm-section-title">שיטות ליבה</div><div className="ncm-section-sub">הביטוי וה־Root נשארים · השיטה משנה את התוצאה ואת ההקשר</div></div>
          {eligibleMethods.length > coreMethods.length && <button type="button" className="ncm-pill" onClick={() => setShowAllMethods(v => !v)}>{showAllMethods ? "פחות" : `עוד ${eligibleMethods.length - coreMethods.length}`} {showAllMethods ? "▴" : "▾"}</button>}
        </div>
        <div className="ncm-method-rail">
          {visibleMethods.map(method => <button type="button" key={method.method_key} onClick={() => chooseMethod(method)} className={`ncm-method ${method.method_key === selectedMethod ? "is-active" : ""}`}>{methodLabel(method)}</button>)}
        </div>
        {showAllMethods && <div className="ncm-plan-note">הרחבת השיטות נקראת מה־Registry החי. בפריסת Free/Premium העתידית entitlement משנה עומק ורוחב — לא את האמת המתמטית. שיטות תלויות־הקשר אינן מוצגות בלי ההקשר שלהן.</div>}
        {selectedPhrases.length > 0 && <>
          <div className="ncm-section-sub" style={{ marginTop: 7 }}>ביטויים אחרים שמגיעים ל־{root} בשיטה הזאת — בחירה כאן משנה ביטוי במפורש</div>
          <div className="ncm-phrases">{selectedPhrases.map(phrase => <button type="button" key={phrase} onClick={() => { setActivePhrase(phrase); setResolverDraft(phrase); setTraceOpen(false); }} className={`ncm-phrase ${phrase === activePhrase ? "is-active" : ""}`}>{phrase}</button>)}</div>
        </>}
      </div>

      <div className="ncm-calc">
        <div className="ncm-calc-main">
          <div><div className="ncm-section-sub">החישוב שלי</div><div className="ncm-calc-value">{activePhrase || "—"} · {methodLabel(selectedMethodMeta)} {traceLoading ? "…" : activeResult != null ? `= ${activeResult}` : ""}</div></div>
          <div className="ncm-calc-actions">
            <button type="button" onClick={() => setTraceOpen(v => !v)}>איך מחשבים?</button>
            <button type="button" onClick={() => setLearnOpen(v => !v)}>למד את השיטה</button>
            <button type="button" onClick={() => nav(`/research?tool=gematria&q=${encodeURIComponent(activePhrase || String(root))}&method=${encodeURIComponent(selectedMethod || "")}`)}>חקור את השיטה</button>
            <button type="button" onClick={() => setRazielOpen(v => !v)}>שאל את רזיאל</button>
          </div>
        </div>
        {traceOpen && <div className="ncm-trace">{trace ? (steps.length ? short(steps.map(s => typeof s === "string" ? s : (s.word || s.label || s.step || "")).filter(Boolean).join(" · "), compact ? 180 : 320) : "החישוב אומת במנוע הקנוני; פירוט הצעדים זמין ב־Trace.") : "Trace לא זמין כרגע."}</div>}
        {learnOpen && <div className="ncm-learn">
          <div><b>מנגנון · עובדה:</b> {selectedDef?.sub || "ההגדרה המפורטת עדיין אינה זמינה בפרויקטציה הזאת."}</div>
          {selectedDef?.soul && <div style={{ marginTop: 5 }}><b>קריאה מחקרית · פרשנות:</b> {selectedDef.soul}</div>}
          <div style={{ marginTop: 5, opacity: .8 }}>המספרים עצמם מגיעים מ־Trace; ההסבר אינו מחשב אותם מחדש.</div>
        </div>}
      </div>

      <div className="ncm-intel">
        <div className="ncm-intel-title">✦ Number Intelligence · תמונת מצב פעילה</div>
        <div className="ncm-intel-row"><b>עובדה</b><span>{activeResult != null ? `«${activePhrase}» · ${methodLabel(selectedMethodMeta)} = ${activeResult}` : "אין כרגע תוצאת מנוע זמינה."}</span></div>
        <div className="ncm-intel-row"><b>הקשר</b><span>{activeResult == null ? `Root המחקר נשאר ${root}.` : activeEqualsRoot ? `התוצאה הפעילה חוזרת ל־Root ${root}.` : `התוצאה הפעילה היא ${activeResult}; Root המחקר נשאר ${root} עד שתפתח מספר אחר במפורש.`}</span></div>
        <div className="ncm-intel-row"><b>אות מחקר</b><span>{activeEqualsRoot && leadTopic ? `החיבור המוביל כרגע: ${leadTopic.title}.` : activeEqualsRoot ? `${neighbors.length} נתיבים מחקריים זמינים סביב ה־Root.` : "המספר הפעיל יכול להיפתח ב־Quick Inspect בלי לאבד את ההקשר הנוכחי."}</span></div>
        <div className="ncm-intel-row"><b>הצעד הבא</b><span>{activeTarget && activeTarget !== root ? <button type="button" className="ncm-pill" onClick={() => openInspectNumber(activeTarget, { kind: "calculation", phrase: activePhrase, method: methodLabel(selectedMethodMeta) })}>בדוק את {activeTarget} כאן</button> : leadTopic ? "בדוק למה ההתכנסות המובילה נמצאת כאן, או שאל את רזיאל." : "פתח אחד הנתיבים הקשורים ובדוק את סיבת הקשר."}</span></div>
      </div>

      {neighbors.length > 0 && <div className="ncm-related">
        <div className="ncm-section-head"><div><div className="ncm-section-title">קשורים עכשיו</div><div className="ncm-section-sub">קודם Quick Inspect · מעבר Root רק בלחיצה מפורשת</div></div></div>
        <div className="ncm-related-rail">{neighbors.slice(0, compact ? 4 : 5).map(item => <button type="button" className="ncm-related-card" key={item.value} onClick={() => openInspectNumber(item.value, { kind: "research_relation", via_topic: item.via_topic, via_gallery: item.via_gallery, weight: item.weight })}>
          <strong>{item.value}</strong><span>קשר מחקרי</span><small>{Number(item.via_topic || 0)} התכנסויות · {Number(item.via_gallery || 0)} הצבות מדיה</small>
        </button>)}</div>
      </div>}

      {inspect && <div className="ncm-inspect">
        <div className="ncm-inspect-title">Quick Inspect · {inspect.value}</div>
        {inspect.kind === "calculation" && <div className="ncm-inspect-text"><b>קשר חישובי:</b> «{inspect.phrase}» · {inspect.method} = {inspect.value}. זו תוצאת מנוע פעילה; היא אינה משנה את Root {root} עד שתפתח אותה.</div>}
        {inspect.kind === "research_relation" && <div className="ncm-inspect-text"><b>למה כאן?</b> {inspect.value} הופיע יחד עם {root} ב־{Number(inspect.via_topic || 0)} התכנסויות מאושרות להצגה וב־{Number(inspect.via_gallery || 0)} הצבות מדיה. זה <b>קשר מחקרי לדירוג</b>, לא שוויון מספרי ולא הוכחת אמת.</div>}
        {inspectState.loading && <div className="ncm-inspect-text">טוען תמונת הקשר…</div>}
        {inspectState.topic && <div className="ncm-inspect-text"><b>התכנסות בולטת סביב {inspect.value}:</b> {inspectState.topic.title}{inspectState.topic.subtitle ? ` — ${short(inspectState.topic.subtitle, 100)}` : ""}</div>}
        <div className="ncm-inspect-actions">
          <button type="button" onClick={() => openNumber(inspect.value)}>פתח {inspect.value}</button>
          <button type="button" onClick={() => setInspectRazielOpen(v => !v)}>שאל את רזיאל על הקשר</button>
          <button type="button" onClick={() => setInspect(null)}>סגור</button>
        </div>
        {inspectRazielOpen && <div className="ncm-raziel"><AskRaziel subject={`${root} → ${inspect.value}`} facts={[inspect.kind === "calculation" ? `${inspect.phrase} · ${inspect.method} = ${inspect.value}` : null, inspect.kind === "research_relation" ? `${root} ו-${inspect.value}: ${inspect.via_topic || 0} התכנסויות, ${inspect.via_gallery || 0} הצבות מדיה` : null, inspectState.topic?.title || null].filter(Boolean)} context={`Explain why ${inspect.value} is shown next to root ${root}. Preserve the distinction between calculation, research relation, signal and interpretation. Do not infer numeric equality unless explicitly supplied.`} title="רזיאל · למה המספר הזה כאן?" subtitle="אותו Research Context · הסבר קשר, לא המצאת קשר" greeting={`אני בודק את הנתיב ${root} → ${inspect.value} בתוך אותו מחקר.`} cta={false} /></div>}
      </div>}

      <div className="ncm-focus-row">
        <div className="ncm-focus-card">
          <div className="ncm-focus-kicker">החיבור המוביל</div>
          <div className="ncm-focus-title">{leadTopic?.title || "אין כרגע התכנסות מאושרת להצגה"}</div>
          {leadTopic?.subtitle && <div className="ncm-focus-text">{short(leadTopic.subtitle, compact ? 80 : 130)}</div>}
          {leadTopic && <button type="button" className="ncm-pill" style={{ marginTop: 7 }} onClick={() => setCrossWhyOpen(v => !v)}>למה זה כאן?</button>}
          {crossWhyOpen && leadTopic && <div className="ncm-why">
            הכרטיס מאושר להצגה ומכיל את {root} כחלק מההתכנסות{Array.isArray(leadTopic.numbers) && leadTopic.numbers.length ? ` לצד ${leadTopic.numbers.filter(n => Number(n) !== root).slice(0, 6).join(" · ")}` : ""}. אישור הכרטיס הוא ממשל־מקור, לא ציון אמת. עומק שיטות/ראיות/תלות נפתח בשכבת המחקר.
            <div className="ncm-inspect-actions">{leadTopic.slug && <button type="button" onClick={() => nav(`/topic/${encodeURIComponent(leadTopic.slug)}`)}>פתח את ההתכנסות</button>}{leadTopic.slug && <WatchButton topic={`convergence:${leadTopic.slug}`} source={`number_core_master_${variant}`} compact ghost label="עקוב אחרי החיבור" />}</div>
          </div>}
        </div>
        <div className="ncm-focus-card">
          <div className="ncm-focus-kicker">Zero Scale · DERIVATION</div>
          <div className="ncm-focus-title">נגזרת ×10/÷10 · לא שוויון</div>
          {zeroChain.length > 0 ? <div className="ncm-zero">{zeroChain.slice(0, compact ? 3 : 5).map(n => <button type="button" key={n} onClick={() => openNumber(Number(n))}>{n}</button>)}</div> : <div className="ncm-focus-text">אין כרגע שרשרת זמינה.</div>}
        </div>
      </div>

      {razielOpen && <div className="ncm-raziel"><AskRaziel subject={`${activePhrase || root} · ${methodLabel(selectedMethodMeta)} · root ${root}`} facts={[anchor?.fact || null, leadTopic?.title ? `התכנסות מובילה: ${leadTopic.title}` : null, activeResult != null ? `${activePhrase} · ${methodLabel(selectedMethodMeta)} = ${activeResult}` : null].filter(Boolean)} context={`Root number ${root}; active expression ${activePhrase || "—"}; selected method ${methodLabel(selectedMethodMeta)}; active result ${activeResult ?? "unknown"}. Focus on the selected method but remain aware of sibling-method context. Explain facts first and suggest one bounded next research step. Never recalculate authoritative gematria.`} title="רזיאל · הצעד הבא" subtitle="Micro → אותו הקשר יכול להמשיך למחקר עמוק" greeting={`אני רואה את Root ${root}, את הביטוי «${activePhrase || ""}», את שיטת ${methodLabel(selectedMethodMeta)} ואת התוצאה ${activeResult ?? "—"}.`} cta={false} /></div>}
    </div>
  </section>;
}
