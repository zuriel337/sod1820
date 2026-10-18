import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import { gematriaTraceLines, traceNumber, isVerifiedMethodTrace } from "../lib/research/gematriaTracePresentation.js";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { fetchWorldProminenceInputs } from "../lib/research/worldProminenceInputs.js";
import { buildWorldContextualProminence } from "../lib/research/worldContextualProminence.js";
import { buildNumberDeepViewProjection } from "../lib/research/numberDeepViewProjection.js";
import { fetchGematriaMethodTrace } from "../lib/research/gematriaTrace.js";
import { runNumberMathProfile } from "../lib/research/numberMathProfileFinding.js";
import { fetchNumberSystemMethods } from "../lib/research/numberSystemMethods.js";
import {
  buildNumberCoreProjection,
  fetchNumberMethodProfile,
  fetchNumberHiddenCrossings,
  deriveHiddenCrossings,
  methodProfileEntry,
} from "../lib/research/numberCoreProjection.js";
import WatchButton from "../components/WatchButton.jsx";
import { SHARE_SITE } from "../lib/share.js";
import NumberCore2029 from "../components/number2029/NumberCore2029.jsx";
import NumberDeepView2029 from "../components/number2029/NumberDeepView2029.jsx";
import NumberLivingWorld2029 from "../components/number2029/NumberLivingWorld2029.jsx";
import NumberPathContinuation2029 from "../components/number2029/NumberPathContinuation2029.jsx";
import { selectedTopicSourceReturn, resolveJourneySourceReturn } from "../lib/research/journeySourceReturn.js";
import { applySeo } from "../lib/seo.js";
import { getValuePhrasesPage, langLinksList } from "../lib/supabase.js";
import { canonicalMethodPublicLabel, canonicalResearchPublicLabel } from "../lib/presentation/canonicalPresentation.js";
import { numberExpressionFocusHref, parseNumberExpressionFocus, resolveExpressionFocus } from "../lib/research/numberExpressionFocus.js";
import { buildNumberCuration2029, fetchCurationCatalog2029 } from "../lib/research/curationProjection2029.js";
import { DEFAULT_VERSE_GEMATRIA_LIMIT, fetchVersesByGematria } from "../lib/research/numberSystemMethods.js";
import { GOLDEN_WORLD_JOURNEY_878 } from "../lib/research/worldJourneyProjection.js";
import {
  createLatestNumberRequestGate,
  fetchTopicSourceContextOnDemand,
  numberOpeningOrchestrator2029,
  numberProjectionAccessContext,
  summarizeNumberOpening,
} from "../lib/research/numberOpeningOrchestration2029.js";
import { PaletteProvider, useNumber2029Scope } from "../lib/palette.js";
import "./number2029.css";
import "./number2029-wide.css";

const GOLDEN_878_JOURNEY_ID = GOLDEN_WORLD_JOURNEY_878.id;
const GOLDEN_878_JOURNEY_OPEN = GOLDEN_WORLD_JOURNEY_878.locked !== true;
const CONVERGENCE_LABEL = canonicalResearchPublicLabel("convergence");
const CONVERGENCES_LABEL = canonicalResearchPublicLabel("convergence", { plural: true });
const NUMBER_HIDDEN_CROSS_CACHE = new Map();
const NUMBER_SYSTEM_METHODS_CACHE = new Map();
const NUMBER_METHOD_PROFILE_CACHE = new Map();
const NUMBER_METHOD_PROFILE_INFLIGHT = new Map();
const clean = (value) => value == null ? "" : String(value).trim();

function rememberBounded(cache, key, value, max = 36) {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > max) cache.delete(cache.keys().next().value);
  return value;
}

// Engine-returned method profiles are deterministic per expression, so a bounded cache is safe.
// In-flight requests are shared so a prefetch and a real selection never double-fetch.
function loadMethodProfileCached(expression, accessContext) {
  const expr = clean(expression);
  const key = `${accessContext}::${expr}`;
  const cached = NUMBER_METHOD_PROFILE_CACHE.get(key);
  if (cached) return Promise.resolve(cached);
  const inflight = NUMBER_METHOD_PROFILE_INFLIGHT.get(key);
  if (inflight) return inflight;
  const pending = fetchNumberMethodProfile(expr)
    .then((rows) => {
      if (Array.isArray(rows) && rows.length) rememberBounded(NUMBER_METHOD_PROFILE_CACHE, key, rows, 48);
      return rows;
    })
    .finally(() => { NUMBER_METHOD_PROFILE_INFLIGHT.delete(key); });
  NUMBER_METHOD_PROFILE_INFLIGHT.set(key, pending);
  return pending;
}

function hiddenCrossCacheKey(expression, profileRows, accessContext) {
  const profileKey = (profileRows || [])
    .map((row) => `${row?.methodKey || ""}:${row?.computedValue ?? ""}`)
    .join("|");
  return `${accessContext}::${clean(expression)}::${profileKey}`;
}

function railNeighbourPhrases(rows, active, reach = 2) {
  const list = (rows || []).map((row) => clean(row?.phrase)).filter(Boolean);
  const at = list.indexOf(clean(active));
  if (at < 0) return [];
  const out = [];
  for (let step = 1; step <= reach; step += 1) {
    if (list[at + step]) out.push(list[at + step]);
    if (list[at - step]) out.push(list[at - step]);
  }
  return out;
}

function deferClientWork(callback, { delay = 120, timeout = 700 } = {}) {
  if (typeof window === "undefined") {
    callback();
    return () => {};
  }
  let cancelled = false;
  let timer = null;
  let idle = null;
  const run = () => {
    if (cancelled) return;
    if (typeof window.requestIdleCallback === "function") {
      idle = window.requestIdleCallback(() => { if (!cancelled) callback(); }, { timeout });
    } else {
      callback();
    }
  };
  timer = window.setTimeout(run, delay);
  return () => {
    cancelled = true;
    if (timer != null) window.clearTimeout(timer);
    if (idle != null && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
  };
}

function worldSnapshotKindLabel(item) {
  const kind = clean(item?.kind);
  const type = clean(item?.type);
  if (kind === "graph-relation") return type === "number" ? "מספר מחובר" : "קשר";
  if (kind === "research") return "מחקר";
  if (kind === "topic") return CONVERGENCE_LABEL;
  if (kind === "source") return "מקור";
  if (kind === "temporal-control") return "זמן";
  return type || "חיבור";
}

function phraseOf(item) {
  if (typeof item === "string") return clean(item);
  return clean(item?.phrase || item?.label);
}

function methodKey(group) {
  return clean(group?.registry?.method_key || group?.method_key || group?.method);
}

function methodLabel(group) {
  return canonicalMethodPublicLabel({
    method_key: group?.registry?.method_key || group?.method_key || group?.method,
    display_label: group?.registry?.display_label || group?.display_label,
  });
}

function methodProfileLabel(profile) {
  return canonicalMethodPublicLabel({
    method_key: profile?.methodKey,
    display_label: profile?.displayLabel,
  });
}

function openingMethodProfile(families, expression, root) {
  const phrase = clean(expression);
  if (!phrase) return [];
  return (Array.isArray(families) ? families : []).flatMap((group) => {
    const containsExpression = (Array.isArray(group?.phrases) ? group.phrases : [])
      .some((item) => phraseOf(item) === phrase);
    const registry = group?.registry || null;
    const key = methodKey(group);
    if (!containsExpression || !key) return [];
    return [{
      methodKey: key,
      displayLabel: registry?.display_label || group?.display_label || group?.method || key,
      category: registry?.category || null,
      mathematicalFamily: registry?.mathematical_family || null,
      lifecycleActive: registry?.active !== false,
      requiredEntitlement: registry?.required_entitlement || null,
      atomicOrComposite: group?.composite === true ? "composite" : "atomic",
      computedValue: root,
      definitionVersion: registry?.version ?? null,
      dbColumn: registry?.db_column || null,
      sortOrder: registry?.sort_order ?? null,
      sub: registry?.sub || null,
      soul: registry?.soul || null,
      executionKind: registry?.execution_kind || null,
      operator: registry?.operator || group?.operator || null,
      derivedFrom: Array.isArray(registry?.derived_from) ? registry.derived_from : [],
      sourceOfTruth: registry?.source_of_truth || null,
      dependencyRules: Array.isArray(registry?.dependency_rules) ? registry.dependency_rules : [],
      dependencyVersion: registry?.dependency_version ?? null,
      openingSample: true,
    }];
  });
}

function normalizedMethodName(value) {
  return clean(value).replace(/[\s"'״׳’‘\-_/]/g, "");
}

function isRegularMethodIdentity(value) {
  return normalizedMethodName(value) === "רגיל";
}

function technicalSourceText(value) {
  const text = clean(value);
  return /^(chat:|channel_updates:|wa_bot_log:|work_log:|gallery_images:|research-cue:|book:|https?:\/\/)/i.test(text);
}

function sourceLabel(row) {
  const label = clean(row?.label || row?.display_name || row?.title || row?.name || row?.source_label);
  if (label && !technicalSourceText(label)) return label;
  const type = clean(row?.type || row?.kind);
  if (type === "verse") return "מקור מקראי";
  if (type.includes("book")) return "ספר / מקור";
  return "מקור מחקר";
}

function sourceDetail(row) {
  const detail = clean(row?.locator || row?.citation || row?.reference || row?.subtitle);
  return detail && !technicalSourceText(detail) ? detail : "";
}



function anchorExpression(fact, root, families) {
  const text = clean(fact);
  if (!text || !text.includes("=")) return "";
  const candidate = clean(text.split("=").slice(1).join("="))
    .replace(new RegExp(`^${root}\\s*`), "")
    .replace(/\([^)]*\)\s*$/, "")
    .trim();
  // An anchor explanation is prose, never an expression or calculation input.
  return (families || []).some((group) => (group?.phrases || []).some((row) => phraseOf(row) === candidate))
    ? candidate : "";
}

function expressionItems(families) {
  const seen = new Set();
  const rows = [];
  for (const group of families || []) {
    const method = methodLabel(group);
    const key = methodKey(group);
    for (const raw of Array.isArray(group?.phrases) ? group.phrases : []) {
      const phrase = phraseOf(raw);
      if (!phrase || seen.has(phrase)) continue;
      seen.add(phrase);
      rows.push({ phrase, method, methodKey: key });
    }
  }
  return rows;
}

function firstPathTarget(topics, root, zeroScale) {
  for (const topic of topics || []) {
    const values = [
      ...(Array.isArray(topic?.highlight_numbers) ? topic.highlight_numbers : []),
      ...(Array.isArray(topic?.numbers) ? topic.numbers : []),
    ].map(Number).filter(Number.isSafeInteger);
    const target = values.find((value) => value !== root);
    if (target != null) return { target, topic };
  }
  const scaleTarget = (zeroScale || []).map(Number).find((value) => Number.isSafeInteger(value) && value !== root);
  return scaleTarget != null ? { target: scaleTarget, topic: null } : null;
}

const MATH_FAMILY_HE = {
  prime: "מספר ראשוני",
  triangular: "מספר משולשי",
  square: "מספר ריבועי",
  pentagonal: "מספר מחומש",
  hexagonal: "מספר משושה",
  heptagonal: "מספר משובע",
  octagonal: "מספר מתומן",
  cube: "מספר מעוקב",
  power_of_two: "חזקה של 2",
  perfect: "מספר מושלם",
  abundant: "מספר שופע",
  deficient: "מספר חסר",
  semiprime: "חצי־ראשוני",
  palindrome_base10: "פלינדרום עשרוני",
  repdigit_base10_multi_digit: "ספרות חוזרות",
  harshad_base10: "Harshad / Niven",
  happy_base10: "מספר שמח",
  narcissistic_base10: "Armstrong",
  palindromic_prime_base10: "ראשוני פלינדרומי",
};

function factorizationText(profile) {
  const factors = profile?.arithmetic?.factorization?.factors || [];
  if (!profile?.arithmetic?.factorization?.complete) return "פירוק מוגבל — לא הושלם";
  if (!factors.length) return profile?.input?.value < 2 ? "ללא פירוק ראשוני" : "—";
  return factors.map((item) => item.exponent > 1 ? `${item.prime}^${item.exponent}` : String(item.prime)).join(" × ");
}

function NumberPageBody() {
  const numberScope = useNumber2029Scope();
  const { value } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const shell = use2029Shell();
  const research = useResearch();
  const { user, profile, isAdmin, isMember, loading: authLoading } = useAuth();
  const accessContext = useMemo(() => numberProjectionAccessContext({
    loading: authLoading,
    user,
    profile,
    isAdmin,
    isMember,
  }), [authLoading, user, profile, isAdmin, isMember]);
  // The literal "0" is valid. Empty, malformed or unsafe root strings are not.
  // Preserve existing leading-zero URL compatibility while still rejecting absent/blank route input.
  const root = /^\d+$/.test(String(value || "")) && Number.isSafeInteger(Number(value))
    ? Number(value)
    : null;
  const urlFocus = useMemo(() => parseNumberExpressionFocus(location.search), [location.search]);
  // Wide-screen layout preview: ?wide=a (default) | c | 0 (current single column). Remembered per tab.
  const wideLayout = useMemo(() => {
    try {
      const requested = new URLSearchParams(location.search).get("wide");
      if (requested) sessionStorage.setItem("sod29-number-wide", requested);
      const value = requested || sessionStorage.getItem("sod29-number-wide");
      return value === "c" || value === "0" ? value : "a";
    } catch { return "a"; }
  }, [location.search]);
  // Smart expression rail preview: ?rail=smart enables cached profiles, idle neighbour prefetch and keyboard stepping.
  const smartRail = useMemo(() => {
    try {
      const requested = new URLSearchParams(location.search).get("rail");
      if (requested) sessionStorage.setItem("sod29-number-rail", requested);
      return (requested || sessionStorage.getItem("sod29-number-rail")) === "smart";
    } catch { return false; }
  }, [location.search]);

  const [openingState, setOpeningState] = useState({ status: "loading", data: null, error: null, key: null });
  const [openingRetry, setOpeningRetry] = useState(0);
  const [depthState, setDepthState] = useState({ status: "idle", data: null, error: null, key: null });
  const [depthRetry, setDepthRetry] = useState(0);
  const [selectedMethodKey, setSelectedMethodKey] = useState("");
  const [activeExpression, setActiveExpression] = useState("");
  const [traceState, setTraceState] = useState({ loading: false, finding: null, error: null });
  const [methodProfileState, setMethodProfileState] = useState({ loading: false, rows: [], error: null });
  const [methodResultState, setMethodResultState] = useState({ loading: false, data: null, error: null, key: null });
  const [languageBridgeState, setLanguageBridgeState] = useState({ loading: false, rows: [] });
  const [regularPhraseState, setRegularPhraseState] = useState({ loading: false, rows: [], count: 0, error: null });
  const [traceOpen, setTraceOpen] = useState(false);
  const [deepViewInputState, setDeepViewInputState] = useState({ loading: false, data: null, error: null });
  const [hiddenCrossState, setHiddenCrossState] = useState({ loading: false, rows: [], error: null });
  const [systemMethodsState, setSystemMethodsState] = useState({ loading: false, cards: [], error: null, key: null });
  const [curationState, setCurationState] = useState({ loading: false, catalog: null, error: null });
  const [deepRequested, setDeepRequested] = useState(false);
  const [focusExplicit, setFocusExplicit] = useState(false);
  const [focusedCrossingPartner, setFocusedCrossingPartner] = useState("");
  const [expandedVerseState, setExpandedVerseState] = useState({
    loading: false,
    rows: null,
    count: null,
    limit: DEFAULT_VERSE_GEMATRIA_LIMIT,
    error: null,
  });
  const deepSentinelRef = useRef(null);
  const openingRequestGate = useRef(createLatestNumberRequestGate());
  const depthRequestGate = useRef(createLatestNumberRequestGate());

  useEffect(() => {
    if (!Number.isSafeInteger(root) || root < 0) {
      setOpeningState({ status: "error", data: null, error: new Error("invalid-number"), key: null });
      return undefined;
    }
    const sameContextRoot = research.context?.subject?.type === "number" && String(research.context.subject.id) === String(root);
    const contextExplicit = sameContextRoot && research.context?.dimensions?.expressionFocusExplicit === true;
    const contextExpression = contextExplicit ? clean(research.context?.selection?.expression) : "";
    const contextMethod = contextExplicit ? clean(research.context?.selection?.method) : "";
    const contextCrossing = contextExplicit ? clean(research.context?.selection?.crossingPartner) : "";
    const explicit = Boolean(urlFocus.explicit || contextExplicit);
    setFocusExplicit(explicit);
    setSelectedMethodKey(clean(urlFocus.method) || contextMethod);
    setActiveExpression(clean(urlFocus.expression) || contextExpression);
    setFocusedCrossingPartner(clean(urlFocus.crossingPartner) || contextCrossing);
    setTraceOpen(false);
    setDeepRequested(false);
    setDepthState({ status: "idle", data: null, error: null, key: null });
    setDepthRetry(0);
    setExpandedVerseState({
      loading: false,
      rows: null,
      count: null,
      limit: DEFAULT_VERSE_GEMATRIA_LIMIT,
      error: null,
    });
  }, [root, urlFocus.expression, urlFocus.method, urlFocus.crossingPartner, urlFocus.explicit]);

  useEffect(() => {
    if (!Number.isSafeInteger(root) || root < 0 || authLoading || !accessContext) return undefined;
    const key = `${accessContext}::${root}`;
    const token = openingRequestGate.current.begin();
    setOpeningState({ status: "loading", data: null, error: null, key });
    setDepthState({ status: "idle", data: null, error: null, key });
    numberOpeningOrchestrator2029.loadOpening(root, { accessContext })
      .then((result) => {
        if (!openingRequestGate.current.isCurrent(token)) return;
        if (result.status === "empty") setOpeningState({ status: "empty", data: null, error: null, key });
        else setOpeningState({ status: "ready", data: result.data, error: null, key });
      })
      .catch((error) => {
        if (openingRequestGate.current.isCurrent(token)) {
          setOpeningState({ status: "error", data: null, error, key });
        }
      });
    return () => openingRequestGate.current.cancel(token);
  }, [root, authLoading, accessContext, openingRetry]);

  const projectionContextKey = Number.isSafeInteger(root) && accessContext ? `${accessContext}::${root}` : null;
  const openingMatchesContext = Boolean(projectionContextKey && openingState.key === projectionContextKey);
  const depthMatchesContext = Boolean(projectionContextKey && depthState.key === projectionContextKey);
  const openingStatus = openingMatchesContext ? openingState.status : "loading";
  const depthStatus = depthMatchesContext ? depthState.status : "idle";
  const openingData = openingMatchesContext ? openingState.data : null;
  const depthData = depthMatchesContext ? depthState.data : null;
  const data = depthData || openingData;
  const compactOpening = Boolean(openingData && !depthData);
  const openingSummary = useMemo(() => summarizeNumberOpening(openingData), [openingData]);

  useEffect(() => {
    if (depthStatus !== "ready" || !data || !Number.isSafeInteger(root)) return undefined;
    let alive = true;
    fetchVersesByGematria(root, { limit: DEFAULT_VERSE_GEMATRIA_LIMIT })
      .then((result) => {
        if (alive) setExpandedVerseState((current) => current.limit > DEFAULT_VERSE_GEMATRIA_LIMIT
          ? current : { loading: false, rows: result.verses, count: result.count, limit: DEFAULT_VERSE_GEMATRIA_LIMIT, error: null });
      })
      .catch((error) => {
        if (alive) setExpandedVerseState((current) => ({ ...current, error }));
      });
    return () => { alive = false; };
  }, [depthStatus, data, root]);

  useEffect(() => {
    if (!deepRequested) return undefined;
    let alive = true;
    setCurationState((current) => current.catalog ? current : { loading: true, catalog: null, error: null });
    fetchCurationCatalog2029()
      .then((catalog) => { if (alive) setCurationState({ loading: false, catalog, error: null }); })
      .catch((error) => { if (alive) setCurationState({ loading: false, catalog: null, error }); });
    return () => { alive = false; };
  }, [deepRequested]);

  useEffect(() => {
    const node = deepSentinelRef.current;
    if (!node || deepRequested || openingStatus !== "ready") return undefined;
    if (typeof IntersectionObserver === "undefined") {
      // Without proximity observation, keep the bounded explicit depth action available.
      return undefined;
    }
    let scrollIntent = window.scrollY > 0;
    const requestWhenNear = () => {
      if (!scrollIntent) return;
      const bounds = node.getBoundingClientRect();
      if (bounds.top <= window.innerHeight + 900 && bounds.bottom >= -900) {
        setDeepRequested(true);
        observer.disconnect();
      }
    };
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) requestWhenNear();
    }, { rootMargin: "900px 0px", threshold: 0 });
    const onScroll = () => {
      if (window.scrollY <= 0) return;
      scrollIntent = true;
      requestWhenNear();
    };
    observer.observe(node);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [data, root, deepRequested, openingStatus]);

  useEffect(() => {
    if (!deepRequested || openingStatus !== "ready" || !Number.isSafeInteger(root) || root < 0 || !accessContext) return undefined;
    const key = `${accessContext}::${root}`;
    const token = depthRequestGate.current.begin();
    setDepthState((current) => ({ status: "loading", data: current.key === key ? current.data : null, error: null, key }));
    numberOpeningOrchestrator2029.loadDepth(root, { accessContext })
      .then((full) => {
        if (depthRequestGate.current.isCurrent(token)) {
          // Canonical full truth replaces the compact projection wholesale. Compact samples are
          // never merged into findings, graph rows or the full family population.
          setDepthState({ status: "ready", data: full, error: null, key });
        }
      })
      .catch((error) => {
        if (depthRequestGate.current.isCurrent(token)) {
          setDepthState({ status: "error", data: null, error, key });
        }
      });
    return () => depthRequestGate.current.cancel(token);
  }, [deepRequested, openingStatus, root, accessContext, depthRetry]);

  useEffect(() => {
    if (depthStatus !== "ready" || !data?.identity || data.identity.type !== "number") {
      if (!deepRequested) setDeepViewInputState({ loading: false, data: null, error: null });
      return undefined;
    }
    let alive = true;
    setDeepViewInputState({ loading: true, data: null, error: null });
    fetchWorldProminenceInputs(data)
      .then((next) => {
        if (alive) setDeepViewInputState({ loading: false, data: next || null, error: null });
      })
      .catch((error) => {
        if (alive) {
          setDeepViewInputState({
            loading: false,
            data: { crossMethodStrength: null, access: { crossMethodStrength: false } },
            error,
          });
        }
      });
    return () => { alive = false; };
  }, [deepRequested, depthStatus, data, root]);

  const families = Array.isArray(data?.gematria?.families) ? data.gematria.families : [];
  const topics = Array.isArray(data?.topics?.rows) ? data.topics.rows : [];
  const relations = Array.isArray(data?.graph?.relations) ? data.graph.relations : [];
  const numberCuration = useMemo(() => buildNumberCuration2029({
    root,
    relations,
    catalog: curationState.catalog,
  }), [root, relations, curationState.catalog]);
  const sources = Array.isArray(data?.sources) ? data.sources : [];
  const worlds = Array.isArray(data?.numberWorlds) ? data.numberWorlds : [];
  const researchFindings = Array.isArray(data?.research?.findings) ? data.research.findings : [];
  const timeline = Array.isArray(data?.timeline) ? data.timeline : [];
  const zeroScaleData = data?.zeroScale || null;
  const zeroScale = Array.isArray(zeroScaleData?.scale_chain) ? zeroScaleData.scale_chain : [];
  const mediaItems = Array.isArray(data?.media?.items) ? data.media.items : [];
  const surface = data?.surface || {};
  const anchorRow = data?.anchorProfile?.row || null;
  const anchorPhrase = anchorExpression(anchorRow?.fact, root, families);

  const initialVerseGematriaRows = Array.isArray(data?.journeys?.numberKnowledgeJourney?.sources)
    ? data.journeys.numberKnowledgeJourney.sources.filter((source) => source?.type === "verse")
    : [];
  const initialVerseGematriaCount = Number.isFinite(Number(data?.journeys?.numberKnowledgeJourney?.sourceSummary?.count))
    ? Number(data.journeys.numberKnowledgeJourney.sourceSummary.count)
    : initialVerseGematriaRows.length;
  const verseGematriaRows = Array.isArray(expandedVerseState.rows)
    ? expandedVerseState.rows
    : initialVerseGematriaRows;
  const verseGematriaCount = Number.isFinite(Number(expandedVerseState.count))
    ? Number(expandedVerseState.count)
    : initialVerseGematriaCount;

  const loadMoreVerseGematria = async () => {
    if (!Number.isSafeInteger(root) || root < 0 || expandedVerseState.loading) return;
    const loaded = verseGematriaRows.length;
    const total = Math.max(verseGematriaCount, loaded);
    const nextLimit = Math.min(total || loaded + 18, Math.max(expandedVerseState.limit + 18, loaded + 1));
    if (nextLimit <= loaded) return;
    setExpandedVerseState((current) => ({ ...current, loading: true, error: null }));
    try {
      const result = await fetchVersesByGematria(root, { limit: nextLimit });
      setExpandedVerseState({
        loading: false,
        rows: result.verses,
        count: result.count,
        limit: nextLimit,
        error: null,
      });
    } catch (error) {
      setExpandedVerseState((current) => ({ ...current, loading: false, error }));
    }
  };

  const math = useMemo(() => {
    if (!Number.isSafeInteger(root) || root < 0) return null;
    try {
      return runNumberMathProfile(root, {
        provenance: { requestSource: "number-2029-preview", inputRef: `number:${root}` },
      })?.profile || null;
    } catch {
      return null;
    }
  }, [root]);

  const expressions = useMemo(() => expressionItems(families), [families]);
  const compactMethodProfile = useMemo(
    () => openingMethodProfile(families, activeExpression, root),
    [families, activeExpression, root],
  );
  const followOnReadsAllowed = focusExplicit || deepRequested;

  useEffect(() => {
    if (!Number.isSafeInteger(root) || root < 1) {
      setRegularPhraseState({ loading: false, rows: [], count: 0, error: null });
      return undefined;
    }
    const regular = families.find((group) => (
      isRegularMethodIdentity(methodKey(group)) || isRegularMethodIdentity(methodLabel(group))
    )) || null;
    const rows = (Array.isArray(regular?.phrases) ? regular.phrases : []).map((row) => (
      typeof row === "string" ? { phrase: row } : row
    ));
    setRegularPhraseState({
      loading: false,
      rows,
      count: Math.max(rows.length, Number(regular?.count) || 0),
      error: null,
    });
    return undefined;
  }, [root, families]);

  const loadMoreRegularPhrases = async () => {
    if (regularPhraseState.loading || regularPhraseState.rows.length >= regularPhraseState.count) return;
    setRegularPhraseState((current) => ({ ...current, loading: true, error: null }));
    try {
      const page = await getValuePhrasesPage(root, { offset: regularPhraseState.rows.length, limit: 30 });
      setRegularPhraseState((current) => {
        return { loading: false, rows: [...current.rows, ...page.rows], count: page.count, error: null };
      });
    } catch (error) {
      setRegularPhraseState((current) => ({ ...current, loading: false, error }));
    }
  };

  useEffect(() => {
    if (!families.length) return;
    if (activeExpression && (selectedMethodKey || focusExplicit)) return;

    const anchorFamily = anchorPhrase
      ? families.find((group) => (group?.phrases || []).some((item) => phraseOf(item) === anchorPhrase))
      : null;
    const first = anchorFamily || families[0];
    const phrase = activeExpression || anchorPhrase || phraseOf(first?.phrases?.[0]) || String(root);
    if (!selectedMethodKey) setSelectedMethodKey(methodKey(first));
    if (!activeExpression) setActiveExpression(phrase);
  }, [families, root, selectedMethodKey, activeExpression, anchorPhrase, focusExplicit]);

  useEffect(() => {
    const expr = clean(activeExpression);
    if (!expr || /^\d+$/.test(expr)) {
      setMethodProfileState({ loading: false, rows: [], error: null });
      return undefined;
    }
    if (!followOnReadsAllowed) {
      setMethodProfileState({ loading: false, rows: [], expression: expr, error: null });
      return undefined;
    }
    let alive = true;
    const profileCacheKey = `${accessContext}::${expr}`;
    const warm = smartRail ? NUMBER_METHOD_PROFILE_CACHE.get(profileCacheKey) : null;
    if (warm) {
      // Prefetched by the smart rail: settle instantly, no empty/loading flash between neighbours.
      setMethodProfileState({ loading: false, rows: warm, expression: expr, error: null });
      const selectedWarm = warm.find((row) => row.methodKey === selectedMethodKey)
        || (!focusExplicit ? warm.find((row) => isRegularMethodIdentity(row.methodKey)) || warm[0] : null);
      if (selectedWarm && selectedWarm.methodKey !== selectedMethodKey) setSelectedMethodKey(selectedWarm.methodKey);
      return undefined;
    }
    setMethodProfileState({ loading: true, rows: [], error: null });
    (smartRail ? loadMethodProfileCached(expr, accessContext) : fetchNumberMethodProfile(expr))
      .then((rows) => {
        if (!alive) return;
        setMethodProfileState({ loading: false, rows, expression: expr, error: null });
        const selected = rows.find((row) => row.methodKey === selectedMethodKey)
          || (!focusExplicit ? rows.find((row) => isRegularMethodIdentity(row.methodKey)) || rows[0] : null);
        if (selected && selected.methodKey !== selectedMethodKey) setSelectedMethodKey(selected.methodKey);
      })
      .catch((error) => {
        if (alive) setMethodProfileState({ loading: false, rows: [], error });
      });
    return () => { alive = false; };
  }, [activeExpression, followOnReadsAllowed, accessContext]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveMethodProfile = methodProfileState.rows.length
    ? methodProfileState.rows
    : compactMethodProfile;

  const selectedMethodProfile = useMemo(
    () => methodProfileEntry(effectiveMethodProfile, selectedMethodKey),
    [effectiveMethodProfile, selectedMethodKey],
  );


  useEffect(() => {
    const expr = clean(activeExpression);
    if (!followOnReadsAllowed || !expr || /^\d+$/.test(expr) || !effectiveMethodProfile.length) {
      setHiddenCrossState({ loading: false, rows: [], error: null });
      return undefined;
    }

    const cacheKey = hiddenCrossCacheKey(expr, effectiveMethodProfile, accessContext);
    const cached = NUMBER_HIDDEN_CROSS_CACHE.get(cacheKey);
    if (cached) {
      setHiddenCrossState({ loading: false, rows: cached, error: null });
      return undefined;
    }

    let alive = true;
    let cancelDeferred = null;
    setHiddenCrossState({ loading: true, rows: [], error: null });
    cancelDeferred = deferClientWork(() => {
      if (!alive) return;
      setHiddenCrossState({ loading: true, rows: [], error: null });
      fetchNumberHiddenCrossings(expr, effectiveMethodProfile, { limit: 13 })
        .then((rows) => {
          const next = Array.isArray(rows) ? rows : [];
          rememberBounded(NUMBER_HIDDEN_CROSS_CACHE, cacheKey, next, 48);
          if (alive) setHiddenCrossState({ loading: false, rows: next, error: null });
        })
        .catch((error) => {
          if (alive) setHiddenCrossState({ loading: false, rows: [], error });
        });
    }, { delay: 220, timeout: 900 });
    return () => {
      alive = false;
      cancelDeferred?.();
    };
  }, [followOnReadsAllowed, activeExpression, effectiveMethodProfile, accessContext]);


  const regularMethodProfile = useMemo(
    () => effectiveMethodProfile.find((row) => (
      isRegularMethodIdentity(row?.methodKey) || isRegularMethodIdentity(row?.displayLabel)
    )) || null,
    [effectiveMethodProfile],
  );
  const regularGroup = useMemo(
    () => families.find((group) => (
      isRegularMethodIdentity(methodKey(group)) || isRegularMethodIdentity(methodLabel(group))
    )) || null,
    [families],
  );
  const regularExpressions = useMemo(() => {
    const seen = new Set();
    const rows = [];
    const add = (phrase, source = "lead_rank", meta = {}) => {
      const text = clean(phrase);
      if (!text || seen.has(text)) return;
      seen.add(text);
      rows.push({ phrase: text, value: root, source, ...meta });
    };

    // Existing Human-Gate curation is the ordering authority for equal-Regular phrases.
    for (const row of regularPhraseState.rows) {
      add(row?.phrase, "lead_rank", {
        leadRank: row?.lead_rank ?? null,
        verified: row?.is_verified === true,
      });
    }

    // During the bounded read only, keep the old projection as an honest fallback.
    if (!rows.length && regularPhraseState.loading) {
      for (const raw of Array.isArray(regularGroup?.phrases) ? regularGroup.phrases : []) add(phraseOf(raw), "family");
    }

    // A searched expression may be valid by the canonical Regular engine before it is stored/published.
    // Preserve it without reordering an already-curated public row.
    if (
      activeExpression
      && regularMethodProfile
      && Number(regularMethodProfile.computedValue) === root
      && !seen.has(clean(activeExpression))
    ) rows.unshift({ phrase: clean(activeExpression), value: root, source: "active_unstored", leadRank: null, verified: null });

    return rows;
  }, [activeExpression, regularMethodProfile, regularGroup, regularPhraseState, root]);

  // Smart rail compare: pin one expression, slide another. Uses the existing pure same-method crossing rule
  // (equivalence collapse, anagram exclusion, at least two distinct methods) over engine-returned profiles only.
  const [pinnedCompare, setPinnedCompare] = useState(null);
  const pinCompare = (expression) => {
    const expr = clean(expression);
    if (!expr) { setPinnedCompare(null); return; }
    if (methodProfileState.expression !== expr || !methodProfileState.rows.length) return;
    setPinnedCompare({ expression: expr, rows: methodProfileState.rows });
  };
  const compareModel = useMemo(() => {
    if (!smartRail || !pinnedCompare) return null;
    const a = pinnedCompare.expression;
    const b = clean(activeExpression);
    if (!b || b === a) return { state: "same", a };
    if (methodProfileState.loading || methodProfileState.expression !== b || !methodProfileState.rows.length) return { state: "loading", a, b };
    const columnByMethod = new Map(pinnedCompare.rows.map((row) => [row.methodKey, row.dbColumn]));
    const candidate = { phrase: b, lead_rank: null };
    let compared = 0;
    let equal = 0;
    const ownByMethod = new Map(pinnedCompare.rows.map((row) => [row.methodKey, traceNumber(row.computedValue)]));
    for (const row of methodProfileState.rows) {
      const column = columnByMethod.get(row.methodKey);
      const other = traceNumber(row.computedValue);
      const own = ownByMethod.get(row.methodKey);
      if (!column || other == null || own == null) continue;
      candidate[column] = other;
      compared += 1;
      if (other === own) equal += 1;
    }
    const [crossing = null] = deriveHiddenCrossings({ expression: a, methodProfile: pinnedCompare.rows, candidates: [candidate], limit: 1 });
    return { state: "ready", a, b, compared, equal, crossing };
  }, [smartRail, pinnedCompare, activeExpression, methodProfileState]);

  // Smart rail: crossing counts appear on a chip only after the canonical reader computed them (unknown stays blank).
  const [railSignals, setRailSignals] = useState({});
  useEffect(() => {
    if (!smartRail || !followOnReadsAllowed) return;
    const expr = clean(activeExpression);
    if (!expr || methodProfileState.expression !== expr || methodProfileState.loading || !methodProfileState.rows.length) return;
    const known = NUMBER_HIDDEN_CROSS_CACHE.get(hiddenCrossCacheKey(expr, methodProfileState.rows, accessContext));
    if (!Array.isArray(known)) return;
    setRailSignals((prev) => (prev[expr] === known.length ? prev : { ...prev, [expr]: known.length }));
  }, [smartRail, followOnReadsAllowed, activeExpression, methodProfileState, hiddenCrossState, accessContext]);

  // Idle-time warm-up of the nearest rail neighbours, one request chain at a time, cancelled on any selection.
  useEffect(() => {
    if (!smartRail || !followOnReadsAllowed || typeof window === "undefined") return undefined;
    const expr = clean(activeExpression);
    if (!expr || methodProfileState.expression !== expr || methodProfileState.loading || hiddenCrossState.loading) return undefined;
    const connection = typeof navigator !== "undefined" ? navigator.connection : null;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || "")) return undefined;
    const targets = railNeighbourPhrases(regularExpressions, expr, 2).filter((phrase) => !/^\d+$/.test(phrase));
    if (!targets.length) return undefined;
    let alive = true;
    const run = async () => {
      for (const phrase of targets) {
        if (!alive) return;
        try {
          const rows = await loadMethodProfileCached(phrase, accessContext);
          if (!alive || !Array.isArray(rows) || !rows.length) continue;
          const key = hiddenCrossCacheKey(phrase, rows, accessContext);
          let crossings = NUMBER_HIDDEN_CROSS_CACHE.get(key);
          if (!Array.isArray(crossings)) {
            crossings = await fetchNumberHiddenCrossings(phrase, rows, { limit: 13 });
            crossings = Array.isArray(crossings) ? crossings : [];
            rememberBounded(NUMBER_HIDDEN_CROSS_CACHE, key, crossings, 48);
          }
          if (alive) setRailSignals((prev) => (prev[phrase] === crossings.length ? prev : { ...prev, [phrase]: crossings.length }));
        } catch { /* warm-up is best effort; a real selection still loads normally */ }
        await new Promise((resolve) => window.setTimeout(resolve, 150));
      }
    };
    const cancel = deferClientWork(() => { if (alive) void run(); }, { delay: 600, timeout: 2500 });
    return () => { alive = false; cancel(); };
  }, [smartRail, followOnReadsAllowed, activeExpression, methodProfileState.expression, methodProfileState.loading, hiddenCrossState.loading, regularExpressions, accessContext]);

  const selectedGroup = useMemo(
    () => families.find((group) => methodKey(group) === selectedMethodKey) || null,
    [families, selectedMethodKey],
  );
  useEffect(() => {
    const key = selectedMethodProfile?.methodKey || selectedMethodKey;
    if (!followOnReadsAllowed || !key || !activeExpression) {
      setTraceState({ loading: false, finding: null, error: null });
      return undefined;
    }
    let alive = true;
    setTraceState({ loading: true, finding: null, error: null });
    fetchGematriaMethodTrace(key, activeExpression)
      .then((finding) => {
        if (alive) setTraceState({ loading: false, finding: finding || null, error: null });
      })
      .catch((error) => {
        if (alive) setTraceState({ loading: false, finding: null, error });
      });
    return () => { alive = false; };
  }, [followOnReadsAllowed, selectedMethodProfile?.methodKey, selectedMethodKey, activeExpression]);

  const rawTrace = traceState.finding?.projection?.dimensions?.trace || null;
  const trace = isVerifiedMethodTrace(rawTrace, { expression: activeExpression, methodKey: selectedMethodProfile?.methodKey || selectedMethodKey }) ? rawTrace : null;
  const activeResult = traceNumber(trace?.result ?? selectedMethodProfile?.computedValue);
  const traceSteps = gematriaTraceLines(trace, { expression: activeExpression, methodKey: selectedMethodKey });

  useEffect(() => {
    const next = traceNumber(activeResult);
    if (!followOnReadsAllowed || !Number.isSafeInteger(next) || next < 0) {
      setSystemMethodsState({ loading: false, cards: [], error: null, key: null });
      return undefined;
    }

    const systemCacheKey = `${accessContext}::${next}`;
    const cached = NUMBER_SYSTEM_METHODS_CACHE.get(systemCacheKey);
    if (cached) {
      setSystemMethodsState({ loading: false, cards: cached, error: null, key: next });
      return undefined;
    }

    let alive = true;
    let cancelDeferred = null;
    setSystemMethodsState({ loading: false, cards: [], error: null, key: next });
    cancelDeferred = deferClientWork(() => {
      if (!alive) return;
      setSystemMethodsState({ loading: true, cards: [], error: null, key: next });
      fetchNumberSystemMethods(next)
        .then((result) => {
          if (!alive) return;
          const cards = Array.isArray(result?.cards) ? result.cards : [];
          rememberBounded(NUMBER_SYSTEM_METHODS_CACHE, systemCacheKey, cards, 48);
          setSystemMethodsState({ loading: false, cards, error: null, key: next });
        })
        .catch((error) => {
          if (alive) setSystemMethodsState({ loading: false, cards: [], error, key: next });
        });
    }, { delay: 280, timeout: 950 });
    return () => {
      alive = false;
      cancelDeferred?.();
    };
  }, [followOnReadsAllowed, activeResult, accessContext]);

  useEffect(() => {
    const next = traceNumber(activeResult);
    if (!focusExplicit || !Number.isSafeInteger(next) || next === root || !accessContext) {
      setMethodResultState({ loading: false, data: null, error: null, key: null });
      return undefined;
    }

    let alive = true;
    setMethodResultState({ loading: true, data: null, error: null, cached: false, key: next });
    numberOpeningOrchestrator2029.loadStage(next, { accessContext }).then((nextData) => {
      const dataValue = nextData || null;
      if (alive) setMethodResultState({ loading: false, data: dataValue, error: null, cached: false, key: next });
    }).catch((error) => {
      if (alive) setMethodResultState({ loading: false, data: null, error, cached: false, key: next });
    });
    return () => { alive = false; };
  }, [focusExplicit, activeResult, root, accessContext]);

  useEffect(() => {
    const expr = clean(activeExpression);
    if (!followOnReadsAllowed || !expr || /^\d+$/.test(expr)) {
      setLanguageBridgeState({ loading: false, rows: [] });
      return undefined;
    }
    let alive = true;
    setLanguageBridgeState({ loading: true, rows: [] });
    langLinksList()
      .then((rows) => {
        if (!alive) return;
        const approved = (Array.isArray(rows) ? rows : []).filter((row) => (
          clean(row?.hebrew) === expr
          && ["approved", "verified"].includes(clean(row?.status).toLowerCase())
          && row?.human_verified === true
        ));
        setLanguageBridgeState({ loading: false, rows: approved.slice(0, 6) });
      })
      .catch(() => { if (alive) setLanguageBridgeState({ loading: false, rows: [] }); });
    return () => { alive = false; };
  }, [followOnReadsAllowed, activeExpression]);

  const leadMeeting = topics[0] || null;
  const leadExpression = expressions.find((item) => item.phrase !== activeExpression) || expressions[0] || null;
  const leadSource = sources[0] || null;
  const leadPath = firstPathTarget(topics, root, zeroScale);
  const leadMedia = mediaItems[0] || null;

  const activityCount = [
    Number(surface.postsCount ?? surface.posts?.length ?? 0),
    Number(surface.galleriesCount ?? surface.galleries?.length ?? 0),
    Number(surface.insightsCount ?? surface.insights?.length ?? 0),
    Number(surface.commentsCount ?? 0),
    Number(surface.eventsCount ?? 0),
  ].reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);

  const coreProjection = useMemo(() => buildNumberCoreProjection({
    root,
    expression: activeExpression,
    selectedMethodKey,
    methodProfile: effectiveMethodProfile,
    families,
    topics,
    relations,
    sources,
    worlds,
    findings: researchFindings,
    timeline,
    media: mediaItems,
    surface,
    zeroScale: zeroScaleData,
    activityCount,
    journeyAvailable: true,
    heroMedia: leadMedia,
  }), [root, activeExpression, selectedMethodKey, effectiveMethodProfile, families, topics, relations, sources, worlds, researchFindings, timeline, mediaItems, surface, zeroScaleData, activityCount, leadMedia]);

  const explicitStageResult = focusExplicit && (traceNumber(activeResult) != null)
    ? Number(activeResult)
    : root;
  const stageData = explicitStageResult !== root
    ? (methodResultState.key === explicitStageResult ? methodResultState.data : null)
    : data;
  const stageRoot = explicitStageResult;
  const stageFamilies = Array.isArray(stageData?.gematria?.families) ? stageData.gematria.families : [];
  const stageTopics = Array.isArray(stageData?.topics?.rows) ? stageData.topics.rows : [];
  const stageRelations = Array.isArray(stageData?.graph?.relations) ? stageData.graph.relations : [];
  const stageSources = Array.isArray(stageData?.sources) ? stageData.sources : [];
  const stageWorlds = Array.isArray(stageData?.numberWorlds) ? stageData.numberWorlds : [];
  const stageFindings = Array.isArray(stageData?.research?.findings) ? stageData.research.findings : [];
  const stageTimeline = Array.isArray(stageData?.timeline) ? stageData.timeline : [];
  const stageMedia = Array.isArray(stageData?.media?.items) ? stageData.media.items : [];
  const stageSurface = stageData?.surface || {};
  const stageZeroScale = stageData?.zeroScale || null;
  const stageActivityCount = [
    Number(stageSurface.postsCount ?? stageSurface.posts?.length ?? 0),
    Number(stageSurface.galleriesCount ?? stageSurface.galleries?.length ?? 0),
    Number(stageSurface.insightsCount ?? stageSurface.insights?.length ?? 0),
    Number(stageSurface.commentsCount ?? 0),
    Number(stageSurface.eventsCount ?? 0),
  ].reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);

  const stageProjection = useMemo(() => buildNumberCoreProjection({
    root: stageRoot,
    expression: activeExpression,
    selectedMethodKey,
    methodProfile: effectiveMethodProfile,
    families: stageFamilies,
    topics: stageTopics,
    relations: stageRelations,
    sources: stageSources,
    worlds: stageWorlds,
    findings: stageFindings,
    timeline: stageTimeline,
    media: stageMedia,
    surface: stageSurface,
    zeroScale: stageZeroScale,
    activityCount: stageActivityCount,
    journeyAvailable: true,
    heroMedia: stageMedia[0] || null,
  }), [stageRoot, activeExpression, selectedMethodKey, effectiveMethodProfile, stageFamilies, stageTopics, stageRelations, stageSources, stageWorlds, stageFindings, stageTimeline, stageMedia, stageSurface, stageZeroScale, stageActivityCount]);

  const deepViewModel = useMemo(() => buildNumberDeepViewProjection({
    root,
    researchRows: Array.isArray(data?.research?.rows) ? data.research.rows : [],
    crossMethodStrength: deepViewInputState.data?.crossMethodStrength || null,
    crossMethodStrengthAvailable: deepViewInputState.data?.access?.crossMethodStrength !== false,
  }), [root, data?.research?.rows, deepViewInputState.data]);


  const contextualWorld = useMemo(() => (
    data?.identity
      ? buildWorldContextualProminence(data, deepViewInputState.data || {}, { limit: 7, timeAware: true })
      : null
  ), [data, deepViewInputState.data]);

  const researchState = useMemo(() => {
    const items = Array.isArray(contextualWorld?.items) ? contextualWorld.items : [];
    const cross = contextualWorld?.contextSignals?.crossMethodStrength || null;
    const gold = items.filter((item) => item?.explainWhy?.humanCuration?.tier === "gold").length;
    const silver = items.filter((item) => item?.explainWhy?.humanCuration?.tier === "silver").length;
    const engineMatches = items.filter((item) => item?.explainWhy?.researchStrengthSignals?.includes("engine_match")).length;
    const withProvenance = items.filter((item) => item?.explainWhy?.researchStrengthSignals?.includes("provenance_present")).length;
    const uncertain = items.filter((item) => item?.explainWhy?.uncertainty).length;
    return {
      items,
      cross,
      gold,
      silver,
      engineMatches,
      withProvenance,
      uncertain,
      independent: Number.isFinite(Number(cross?.independentPhraseCount)) ? Number(cross.independentPhraseCount) : null,
      independentMethods: Number.isFinite(Number(cross?.independentP1MethodCount)) ? Number(cross.independentP1MethodCount) : null,
    };
  }, [contextualWorld]);

  // An inbound `cross` parameter is untrusted navigation state, not evidence.
  // Show/persist a crossing only after the existing verified reader found it.
  const verifiedCrossingPartner = (Array.isArray(hiddenCrossState.rows) ? hiddenCrossState.rows : [])
    .some((item) => clean(item?.partner) === clean(focusedCrossingPartner))
    ? clean(focusedCrossingPartner) : "";
  const activeMethodLabel = selectedMethodProfile ? methodProfileLabel(selectedMethodProfile) : methodLabel(selectedGroup);
  const focusMethodKey = selectedMethodProfile?.methodKey || selectedMethodKey || null;
  const focusExpression = focusExplicit ? clean(activeExpression) : "";
  const focusTrace = trace?.input === focusExpression && trace?.method_key === focusMethodKey ? trace : null;
  const focusProfile = methodProfileState.expression === focusExpression ? selectedMethodProfile : null;
  const focusResult = focusTrace?.result ?? focusProfile?.computedValue ?? null;
  const originTopicSlug = clean(research.context?.dimensions?.topicSlug);
  const currentNumberHref = numberExpressionFocusHref(root, {
    expression: focusExpression || null,
    method: focusExplicit ? focusMethodKey : null,
    crossingPartner: focusExplicit ? verifiedCrossingPartner : null,
  }) || `/number/${root}`;
  const focusSelection = (entityId = root) => ({
    ...(research.context?.selection?.entityId === String(entityId)
      && (research.context.selection.expression || "") === focusExpression ? {
        sourceRef: research.context.selection.sourceRef,
        locator: research.context.selection.locator,
        versionRef: research.context.selection.versionRef,
      } : {}),
    entityId: String(entityId),
    entityType: "number",
    expression: focusExpression || null,
    method: focusExplicit ? focusMethodKey : null,
    methodVersion: focusExplicit ? focusTrace?.method_version ?? focusProfile?.definitionVersion ?? null : null,
    findingId: focusTrace ? traceState.finding?.id || null : null,
    resultValue: focusExplicit && (traceNumber(activeResult) != null) ? Number(activeResult) : null,
    focusKind: focusExplicit ? (verifiedCrossingPartner ? "crossing" : "expression") : null,
    crossingPartner: focusExplicit ? verifiedCrossingPartner || null : null,
  });

  const clearExpressionFocus = () => {
    setFocusExplicit(false);
    setFocusedCrossingPartner("");
    setActiveExpression("");
    setSelectedMethodKey("");
    setTraceOpen(false);
    research.updateResearchContext?.({
      selection: { entityId: String(root), entityType: "number" },
      lens: "number",
      dimensions: { ...(research.context?.dimensions || {}), expressionFocusExplicit: false },
    });
    navigate(`/number/${root}`, { replace: true });
  };

  const returnToOriginTopic = () => {
    if (!originTopicSlug) return;
    const href = `/topic/${encodeURIComponent(originTopicSlug)}`;
    research.setResearchContext?.({
      subject: { id: originTopicSlug, type: "topic", label: originTopicSlug, href },
      selection: { entityId: originTopicSlug, entityType: "topic" },
      lens: "topic",
      locale: research.context?.locale || "he",
      dimensions: {},
      journey: research.context?.journey || null,
      returnTo: null,
    });
    navigate(href);
  };

  const clearCrossingFocus = () => {
    setFocusedCrossingPartner("");
    const href = numberExpressionFocusHref(root, {
      expression: focusExpression || null,
      method: focusExplicit ? focusMethodKey : null,
    });
    // Preserve the selected expression/method, while clearing only the crossing.
    research.updateResearchContext?.({
      selection: { ...focusSelection(root), focusKind: focusExpression ? "expression" : null, crossingPartner: null },
      dimensions: { ...(research.context?.dimensions || {}), expressionFocusExplicit: Boolean(focusExpression) },
    });
    if (href) navigate(href, { replace: true });
  };

  const activateExpressionFocus = (expression, preferredMethod = null) => {
    const expr = clean(expression);
    if (!expr) return;
    const key = clean(preferredMethod) || clean(regularMethodProfile?.methodKey)
      || methodKey(families.find((group) => isRegularMethodIdentity(methodKey(group))));
    setFocusExplicit(true);
    setFocusedCrossingPartner("");
    setActiveExpression(expr);
    setSelectedMethodKey(key);
    setTraceOpen(false);
    const href = numberExpressionFocusHref(root, { expression: expr, method: key || null });
    if (href) navigate(href, { replace: true });
  };

  const activateMethodFocus = (methodKey) => {
    const key = clean(methodKey);
    if (!key) return;
    setSelectedMethodKey(key);
    setTraceOpen(false);
    if (!clean(activeExpression) || /^\d+$/.test(clean(activeExpression))) return;
    setFocusExplicit(true);
    setFocusedCrossingPartner("");
    const href = numberExpressionFocusHref(root, { expression: activeExpression, method: key });
    if (href) navigate(href, { replace: true });
  };

  useEffect(() => {
    if (!Number.isInteger(root)) return;
    const subject = {
      id: String(root),
      type: "number",
      label: String(root),
      href: currentNumberHref,
    };
    const selection = focusSelection(root);
    // Merge against the provider's current snapshot: the route effect may have
    // captured the selected Topic source after this render was scheduled.
    research.updateResearchContext?.({ subject, selection, lens: "number",
      dimensions: { expressionFocusExplicit: Boolean(focusExplicit) } });
  }, [root, focusExplicit, activeExpression, focusMethodKey, activeResult, focusResult, focusTrace?.method_version, focusProfile?.definitionVersion, verifiedCrossingPartner, currentNumberHref]); // eslint-disable-line react-hooks/exhaustive-deps

  const [pathError, setPathError] = useState(null);
  const sourceReturnRequest = useRef(0);
  useEffect(() => () => { sourceReturnRequest.current += 1; }, [location.pathname, location.search, research.setResearchContext]);
  const sourceReturn = selectedTopicSourceReturn(research.context?.returnTo);
  const returnToSelectedSource = async () => {
    const request = ++sourceReturnRequest.current;
    const result = await resolveJourneySourceReturn(sourceReturn, fetchTopicSourceContextOnDemand);
    if (request !== sourceReturnRequest.current) return;
    if (!result.ok) { setPathError("המקור אינו זמין כעת. הבחירה והמסע נשמרו; אפשר לנסות שוב."); return; }
    // Destination Topic re-reads the envelope; no saved content/access is rendered.
    const applied = research.setResearchContext?.({ ...result.source, journey: research.context?.journey,
      returnTo: { ...research.context, href: currentNumberHref, label: String(root) } });
    if (applied) navigate(result.href);
  };
  const continueJourney = () => {
    const current = research.context || {};
    const result = research.continueResearchPath?.({
      context: { ...current,
        subject: { id: String(root), type: "number", label: String(root), href: currentNumberHref },
        selection: focusSelection(root), lens: "number" },
      href: currentNumberHref, surface: "number", kind: "number_expression",
      reason: focusExplicit ? (verifiedCrossingPartner ? "selected_crossing" : "selected_method") : "selected_number",
    });
    setPathError(result?.ok ? null : "הבחירה לא נוספה. אפשר לשמור את המסע ולנסות שוב.");
    if (!result?.ok) return;
    // Keep the existing 878 teaching route as a semantic preset of this Path.
    if (GOLDEN_878_JOURNEY_OPEN && root === GOLDEN_WORLD_JOURNEY_878.rootValue && !focusExplicit) {
      research.updateResearchContext?.({
        lens: "world",
        dimensions: { ...result.context.dimensions, journeySource: "number-2029-preview",
          journeySemanticId: GOLDEN_878_JOURNEY_ID, journeyRoot: 878,
          journeyVisitedValues: [878], journeyMeetingSlugs: [] },
        returnTo: { ...result.context, href: currentNumberHref, label: `דף ${root}` },
      });
      navigate("/world");
    }
  };

  const openWorld = ({ meetingSlug = null } = {}) => {
    if (!Number.isInteger(root)) return;
    const current = research.context || {};
    const subject = {
      id: String(root),
      type: "number",
      label: String(root),
      href: currentNumberHref,
    };
    const selection = focusSelection(root);
    const returnTo = {
      href: currentNumberHref,
      label: `דף ${root}`,
      subject,
      selection,
      lens: "number",
      dimensions: current.dimensions || {},
      journey: current.journey || null,
    };

      research.setResearchContext?.({
        subject,
        selection,
        lens: "world",
        journey: current.journey || null,
        dimensions: {
          ...(current.dimensions || {}),
          numberHome: currentNumberHref,
          ...(meetingSlug ? { meetingSlug } : {}),
        },
        returnTo,
      });
    navigate("/world");
  };

  const focusSurfaceContext = (focus) => {
    if (!focus || !Number.isSafeInteger(root)) return;
    const current = research.context || {};
    const targetId = clean(focus.locator).replace(/^#/, "") || null;
    research.updateResearchContext?.({
      selection: {
        ...focusSelection(root),
        sourceRef: clean(focus.sourceRef) || null,
        locator: clean(focus.locator) || null,
      },
      lens: "number",
      dimensions: {
        ...(current.dimensions || {}),
        surfaceFocus: focus,
        bottomTrail: [
          { id: "number", label: String(root), number: root },
          { id: "focus", label: clean(focus.label || focus.primary) || "הקשר", ...(targetId ? { targetId } : {}), active: true },
        ],
      },
    });
    shell.openInspect(focus);
  };

  const askRaziel = (intent = "number_context", focus = {}) => {
    if (shell.razielLocked) {
      shell.openRaziel();
      return;
    }
    const focusPatch = focus && typeof focus === "object" ? focus : {};
    const forcedExpression = clean(focusPatch.expression) || (intent === "explain_crossing" ? clean(activeExpression) : focusExpression);
    const forcedCrossing = clean(focusPatch.partner || focusPatch.crossingPartner) || verifiedCrossingPartner;
    const numberCoreFocus = {
      root,
      expression: forcedExpression || activeExpression || null,
      method: focusMethodKey,
      resultValue: (traceNumber(activeResult) != null) ? Number(activeResult) : null,
      crossingPartner: forcedCrossing || coreProjection?.crossing?.partner || null,
      zeroScaleNext: coreProjection?.zeroScale?.next ?? null,
      ...focusPatch,
    };
    const selection = {
      ...focusSelection(root),
      expression: forcedExpression || focusSelection(root).expression,
      method: forcedExpression ? focusMethodKey : focusSelection(root).method,
      focusKind: forcedCrossing ? "crossing" : forcedExpression ? "expression" : focusSelection(root).focusKind,
      crossingPartner: forcedCrossing || null,
    };
    research.updateResearchContext?.({
      selection,
      lens: "number",
      dimensions: {
        ...(research.context?.dimensions || {}),
        expressionFocusExplicit: Boolean(forcedExpression || forcedCrossing || focusExplicit),
        razielMicroIntent: intent,
        numberCoreFocus,
      },
    });
    shell.openRaziel({ razielMicroIntent: intent, numberCoreFocus });
  };

  const resolveNumberQuery = async (rawValue) => {
    const raw = clean(rawValue);
    if (!raw) return;
    if (/^\d+$/.test(raw) && Number.isSafeInteger(Number(raw))) {
      setFocusExplicit(false);
      setFocusedCrossingPartner("");
      navigate(`/number/${Number(raw)}`);
      return;
    }
    try {
      const focus = await resolveExpressionFocus(raw);
      if (!focus?.href) {
        setActiveExpression(raw);
        return;
      }
      const next = Number(focus.root);
      const current = research.context || {};
      const currentSelection = focusSelection(root);
      const returnTo = next === root
        ? current.returnTo || null
        : (Number.isSafeInteger(root) ? {
          href: currentNumberHref,
          label: focusExpression ? `${focusExpression} · ${root}` : `דף ${root}`,
          subject: current.subject || { id: String(root), type: "number", label: String(root), href: currentNumberHref },
          selection: currentSelection,
          lens: current.lens || "number",
          dimensions: current.dimensions || {},
          journey: current.journey || null,
        } : null);

      setFocusExplicit(true);
      setFocusedCrossingPartner("");
      setActiveExpression(focus.expression);
      if (focus.method) setSelectedMethodKey(focus.method);
      setTraceOpen(false);
      research.setResearchContext?.({
        subject: { id: String(next), type: "number", label: String(next), href: focus.href },
        selection: {
          entityId: String(next),
          entityType: "number",
          expression: focus.expression,
          method: focus.method,
          resultValue: focus.resultValue,
          focusKind: "expression",
        },
        lens: "number",
        journey: current.journey || null,
        locale: current.locale || "he",
        dimensions: {
          ...(current.dimensions || {}),
          expressionFocusExplicit: true,
          focusOrigin: "number-query",
        },
        returnTo,
      });
      navigate(focus.href, { replace: next === root });
    } catch {
      setActiveExpression(raw);
    }
  };

  const openNumberRoot = (nextValue, { preserveFocus = false } = {}) => {
    const next = Number(nextValue);
    if (!Number.isSafeInteger(next)) return;
    const keepFocus = Boolean(preserveFocus && focusExplicit && focusExpression);
    const selection = focusSelection(root);
    const nextHref = keepFocus
      ? numberExpressionFocusHref(next, { expression: focusExpression, method: focusMethodKey })
      : `/number/${next}`;
    const nextSelection = keepFocus
      ? { ...focusSelection(next), resultValue: next }
      : { entityId: String(next), entityType: "number" };
    research.setResearchContext?.({
      subject: { id: String(next), type: "number", label: String(next), href: nextHref },
      selection: nextSelection,
      lens: "number",
      journey: research.context?.journey || null,
      locale: research.context?.locale || "he",
      dimensions: {
        ...(research.context?.dimensions || {}),
        expressionFocusExplicit: keepFocus,
      },
      returnTo: {
        href: currentNumberHref,
        label: focusExpression ? `${focusExpression} · ${root}` : `דף ${root}`,
        subject: { id: String(root), type: "number", label: String(root), href: currentNumberHref },
        selection,
        lens: "number",
        dimensions: research.context?.dimensions || {},
        journey: research.context?.journey || null,
      },
    });
    navigate(nextHref);
  };

  const retryOpening = () => {
    // Browser module-map failures can retain a rejected dynamic import for the document lifetime.
    // A reload is the only reliable retry for that case; RPC/data failures retry in place.
    if (openingState.error?.code === "NUMBER_OPENING_MODULE_UNAVAILABLE" && typeof window !== "undefined") {
      window.location.reload();
      return;
    }
    setOpeningRetry((value) => value + 1);
  };

  // Loading / unavailable states live inside the same Number colour scope as the ready page.
  const inNumberScope = (node) => <PaletteProvider value={numberScope.palette}><div className="sod29-number-page" style={numberScope.style} data-number-scope={numberScope.scopeAttr} data-experience-surface="number" data-wide-layout={wideLayout} data-number-root={root}>{node}</div></PaletteProvider>;

  if (!Number.isSafeInteger(root) || root < 0) {
    return inNumberScope(<FrameState kind="error" title="המספר לא תקין">הדוגמה הזאת מקבלת כרגע מספר שלם בלבד.</FrameState>);
  }
  if ((authLoading || openingStatus === "loading") && !data) {
    return inNumberScope(<FrameState kind="loading" title={`פותח את ${root}`}>טוען את דף המספר.</FrameState>);
  }
  // A valid numeric zero currently has no public Number node. Render a bounded
  // full-page empty state, not a fabricated Research/Graph or a fake 0 result.
  // A real canonical node, if approved later, naturally uses NumberCore instead.
  if (openingStatus === "empty" && !data) {
    return <div className="sod29-number-page" data-experience-surface="number" data-number-root={root} data-number-empty="true">
      <section className="sod29-number-zero-empty" aria-label={`דף המספר ${root}`}>
        <div className="sod29-number-zero-identity">
          <span>דף המספר · Root</span>
          <strong>{root}</strong>
        </div>
        <div>
          <h1>אין עדיין חומר מחקרי מקושר ל־{root}</h1>
          <p>המספר {root} הוא ערך תקין. מאגר המחקר לא החזיר עבורו כרגע רשומת מספר ציבורית. אין כאן חישוב, מקור או הצלבה שנוצרו באופן מלאכותי.</p>
          <form className="sod29-number-zero-search" onSubmit={(event) => {
            event.preventDefault();
            const input = event.currentTarget.elements.namedItem("number");
            void resolveNumberQuery(input?.value || "");
          }}>
            <input name="number" placeholder="חפש מספר או ביטוי אחר" aria-label="חפש מספר או ביטוי אחר" required />
            <button type="submit">חפש</button>
          </form>
        </div>
      </section>
    </div>;
  }
  if (openingStatus === "error" && !data) {
    return inNumberScope(<section data-number-opening-status="error"><FrameState
      kind="unavailable"
      title="דף המספר לא זמין כרגע"
      action={<button type="button" className="sod29-frame-state-retry" data-number-opening-action="retry" onClick={retryOpening}>נסה שוב</button>}
    >הפתיחה המצומצמת לא נטענה. אפשר לנסות שוב; חומר העומק לא ייטען במקומה.</FrameState></section>);
  }
  if (!data) {
    return inNumberScope(<FrameState kind="unavailable" title="דף המספר לא זמין כרגע">נסה שוב בעוד רגע.</FrameState>);
  }
  return <PaletteProvider value={numberScope.palette}><div className="sod29-number-page" style={numberScope.style} data-number-scope={numberScope.scopeAttr} data-experience-surface="number" data-experience-question="מה זה?" data-wide-layout={wideLayout} data-number-root={root} data-truth-safe="true" data-number-opening-status="ready" data-number-opening-complete={openingSummary?.fullProjectionComplete === true ? "true" : "false"} data-number-depth-status={depthStatus}>
    {focusExplicit && focusExpression ? <section className="sod29-number-focus-ribbon" aria-label="מיקוד ביטוי פעיל" data-expression-focus="true">
      <div>
        <span>מיקוד פעיל</span>
        <strong>{verifiedCrossingPartner ? `${focusExpression} ↔ ${verifiedCrossingPartner}` : focusExpression}</strong>
        <small>{activeMethodLabel || focusMethodKey || "שיטה"} {(traceNumber(activeResult) != null) ? `= ${activeResult}` : ""} · הבית המספרי {root}</small>
      </div>
      <div className="sod29-actions">
        {research.context?.returnTo?.href
          ? <button className="sod29-action" type="button" onClick={sourceReturn ? returnToSelectedSource : () => shell.returnExact()}>↩ {research.context.returnTo.label || "חזרה מדויקת"}</button>
          : originTopicSlug
            ? <button className="sod29-action" type="button" onClick={returnToOriginTopic}>↩ חזרה להתכנסות</button>
            : null}
        <button className="sod29-action" type="button" onClick={clearExpressionFocus}>הצג את {root} בלי מיקוד</button>
      </div>
    </section> : null}
    {compactOpening && openingSummary ? <section
      className="sod29-section sod29-number-opening-status"
      data-number-opening-sample="true"
      data-number-opening-returned={openingSummary.returnedCount}
      data-number-opening-total={openingSummary.totalCount}
      data-number-opening-samples-complete={openingSummary.samplesComplete ? "true" : "false"}
      aria-live="polite"
    >
      <div className="sod29-number-core2029-note">
        תצוגה ראשונית: {openingSummary.returnedCount} מתוך {openingSummary.totalCount} ביטויים ב־{openingSummary.familyCount} שיטות. {openingSummary.samplesComplete ? "כל דוגמאות הפתיחה מוצגות; חומר העומק עדיין ממתין לבקשה." : "אלו דוגמאות בלבד; חומר העומק ממתין לבקשה."}
      </div>
    </section> : null}
    <section className="sod29-number-hero" id="number-now">
      <NumberCore2029
        projection={coreProjection}
        mode="page"
        curation={numberCuration}
        curationCatalog={curationState.catalog}
        traceState={traceState}
        traceOpen={traceOpen}
        traceSteps={traceSteps}
        traceDetail={trace}
        stageProjection={stageProjection}
        stageLoading={methodResultState.loading}
        contentPending={depthStatus === "loading"}
        contentError={false}
        methodsLoading={methodProfileState.loading}
        languageBridges={languageBridgeState.rows}
        regularExpressions={regularExpressions}
        regularExpressionsLoading={regularPhraseState.loading}
        smartRail={smartRail}
        railSignals={railSignals}
        compareModel={compareModel}
        pinnedExpression={pinnedCompare?.expression || null}
        onPinCompare={pinCompare}
        onClearCompare={() => setPinnedCompare(null)}
        shareUrl={`${SHARE_SITE}${currentNumberHref}`}
        shareTitle={`SOD1820 · ${focusExpression || root}`}
        onExpressionSelect={(phrase, preferredMethod = null) => activateExpressionFocus(phrase, preferredMethod || regularMethodProfile?.methodKey || null)}
        onResolveQuery={resolveNumberQuery}
        onMethodSelect={activateMethodFocus}
        onToggleTrace={() => setTraceOpen((value) => !value)}
        hiddenCrossings={hiddenCrossState.rows}
        hiddenCrossingsLoading={hiddenCrossState.loading || methodProfileState.loading}
        systemMethods={systemMethodsState.key === stageRoot ? systemMethodsState.cards : []}
        systemMethodsLoading={systemMethodsState.key === stageRoot && systemMethodsState.loading}
        activeCrossingPartner={focusExplicit ? verifiedCrossingPartner : null}
        onClearCrossing={clearCrossingFocus}
        onOpenCrossing={(crossing) => {
          const partner = clean(crossing?.partner);
          if (partner && clean(activeExpression)) {
            setFocusExplicit(true);
            setFocusedCrossingPartner(partner);
            const href = numberExpressionFocusHref(root, {
              expression: activeExpression,
              method: focusMethodKey,
              crossingPartner: partner,
            });
            research.updateResearchContext?.({
              selection: {
                ...focusSelection(root),
                focusKind: "crossing",
                crossingPartner: partner,
              },
              dimensions: {
                ...(research.context?.dimensions || {}),
                expressionFocusExplicit: true,
              },
            });
            if (href) navigate(href, { replace: true });
          }
          // Selection is navigation, not consent to run the gated/paid Raziel tool.
        }}
        onOpenZero={(next) => openNumberRoot(next, { preserveFocus: false })}
        onOpenResult={(next) => openNumberRoot(next, { preserveFocus: true })}
        onOpenWorld={() => openWorld()}
        onOpenHeichal={() => shell.go("/heichal")}
        onOpenJourney={continueJourney}
        journeyLabel={research.context?.dimensions?.journey2029Active ? "המשך במסע" : GOLDEN_878_JOURNEY_OPEN && root === GOLDEN_WORLD_JOURNEY_878.rootValue ? "צא למסע 878" : "צא למסע"}
        onOpenLife={() => document.getElementById("number-essential")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        onRazielAction={askRaziel}
        onExpandRaziel={() => askRaziel("expand_panel")}
      />

    </section>

    <NumberPathContinuation2029
      active={research.context?.dimensions?.journey2029Active === true}
      selectionLabel={focusExpression ? `${focusExpression} · ${activeMethodLabel}${verifiedCrossingPartner ? ` · ${verifiedCrossingPartner}` : ""}` : `המספר ${root}`}
      steps={research.researchPathSteps || []}
      onContinue={continueJourney}
      onWorkspace={() => shell.openWorkspace()}
      onSourceReturn={sourceReturn ? returnToSelectedSource : null}
      onOpenStep={async (index) => {
        const request = ++sourceReturnRequest.current;
        const step = research.researchPathSteps?.[index];
        if (selectedTopicSourceReturn(step?.context)) {
          const source = await resolveJourneySourceReturn(step.context, fetchTopicSourceContextOnDemand);
          if (request !== sourceReturnRequest.current) return;
          if (!source.ok) { setPathError("המקור אינו זמין כעת. הבחירה והמסע נשמרו."); return; }
        }
        const result = research.openResearchPathStep?.(index);
        if (result?.ok) { setPathError(null); navigate(result.href); }
        else setPathError("המקור אינו זמין לפתיחה. הבחירה והמסע נשמרו.");
      }}
      error={pathError}
    />

    <div ref={deepSentinelRef} aria-hidden="true" style={{ height: 1 }} />
    {depthStatus === "idle" ? <section className="sod29-section sod29-number-depth-boundary" data-number-depth-boundary="deferred">
      <div className="sod29-number-core2029-note">הקשרים, המקורות ושכבות המחקר המלאות עדיין לא נטענו.</div>
      <div className="sod29-number-depth-nav"><button type="button" data-number-depth-action="load" onClick={() => setDeepRequested(true)}>טען קשרים ומקורות</button></div>
    </section> : null}
    {depthStatus === "loading" ? <section className="sod29-section sod29-number-depth-boundary" data-number-depth-boundary="loading"><FrameState kind="loading" title="טוען את הקשרים והמקורות">אפשר כבר לחקור את המספר והשיטות.</FrameState></section> : null}
    {depthStatus === "error" ? <section className="sod29-section sod29-number-depth-boundary" data-number-depth-boundary="error"><FrameState
      kind="unavailable"
      title="הקשרים והמקורות לא זמינים כרגע"
      action={<button type="button" className="sod29-frame-state-retry" data-number-depth-action="retry" onClick={() => { setDeepRequested(true); setDepthRetry((value) => value + 1); }}>נסה שוב</button>}
    >הפתיחה נשארת זמינה. אפשר לנסות שוב כאן בלי לטעון מחדש את הדף.</FrameState></section> : null}
    {depthStatus === "ready" ? <NumberLivingWorld2029
      root={root}
      data={data}
      activeExpression={activeExpression}
      activeMethodLabel={activeMethodLabel}
      families={families}
      regularExpressions={regularExpressions}
      regularExpressionCount={regularPhraseState.count}
      regularExpressionsLoading={regularPhraseState.loading}
      regularExpressionsError={regularPhraseState.error}
      onLoadMoreExpressions={loadMoreRegularPhrases}
      onExpressionSelect={activateExpressionFocus}
      languageBridges={languageBridgeState.rows}
      topics={topics}
      relations={relations}
      projectionRelatedNumbers={coreProjection?.relatedNumbers || []}
      sources={sources}
      verseRows={verseGematriaRows}
      verseCount={verseGematriaCount}
      versesLoading={expandedVerseState.loading}
      onLoadMoreVerses={loadMoreVerseGematria}
      worlds={worlds}
      researchFindings={researchFindings}
      timeline={timeline}
      zeroScale={zeroScale}
      mediaItems={mediaItems}
      math={math}
      activityCount={activityCount}
      researchState={researchState}
      onOpenWorld={openWorld}
      onOpenHeichal={(focus) => shell.go(focus?.kind === "els_saved_from_number" ? "/els?library=public" : focus?.kind === "els_new_from_number" ? "/els" : "/heichal")}
      onRazielAction={askRaziel}
      onOpenNumber={(next) => openNumberRoot(next, { preserveFocus: false })}
      onFocusContext={focusSurfaceContext}
      onJourney={continueJourney}
      onPersonalJourney={() => askRaziel("personal_journey_from_number", {
        kind: "personal_journey",
        root,
        expression: activeExpression || null,
        method: selectedMethodProfile?.methodKey || selectedMethodKey || null,
      })}
    /> : null}

    {depthStatus === "ready" && deepRequested && deepViewModel ? <NumberDeepView2029
      model={deepViewModel}
      onRazielAction={askRaziel}
    /> : deepRequested && deepViewInputState.loading ? <section className="sod29-section sod29-number-deep-view" id="number-deep-view" aria-busy="true">
      <div className="sod29-number-core2029-note">טוען את מפת המחקר כשמגיעים אליה…</div>
    </section> : null}

    {/* Follow v19: a distinct, value-last gate after the Number content — never mixed into the share icons. */}
    <div className="sod29-number-follow-gate" data-follow-owner="WatchButton" data-follow-placement="after-content">
      <WatchButton topic={`number:${root}`} source="number_page" gate ui2029 heading={`לעקוב אחרי ${root}?`} explainer="נשמור את המספר במעקב שלך באתר. עדכונים יופיעו כאן בתוך האתר; מייל או התראות נבחרים בנפרד ורק בהסכמה." label="עקוב אחרי המספר" followLabel="עוקב" />
    </div>

  </div></PaletteProvider>;
}

export default function Number2029Page() {
  const { value } = useParams();

  useEffect(() => {
    applySeo({
      title: `${value || "מספר"} · דף המספר`,
      description: "דף המספר — עולמות, קשרים, מתמטיקה, מקורות ומסע סביב המספר.",
      path: `/number/${value || ""}`,
      noindex: true,
    });
  }, [value]);

  return <Sod2029Shell
    surface="number"
    symbol={<NavigationIcon2029 name="number" />}
    status="LIVING NUMBER · DESIGN PREVIEW"
  >
    <NumberPageBody key={value} />
  </Sod2029Shell>;
}
