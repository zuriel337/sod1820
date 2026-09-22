import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { fetchEntityHubProjection } from "../lib/research/entityHubProjection.js";
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
  methodProfileEntry,
} from "../lib/research/numberCoreProjection.js";
import NumberCore2029 from "../components/number2029/NumberCore2029.jsx";
import NumberDeepView2029 from "../components/number2029/NumberDeepView2029.jsx";
import NumberLivingWorld2029 from "../components/number2029/NumberLivingWorld2029.jsx";
import { applySeo } from "../lib/seo.js";
import { getAllValuePhrases, langLinksList } from "../lib/supabase.js";
import { canonicalMethodPublicLabel, canonicalResearchPublicLabel } from "../lib/presentation/canonicalPresentation.js";
import { numberExpressionFocusHref, parseNumberExpressionFocus, resolveExpressionFocus } from "../lib/research/numberExpressionFocus.js";
import "./number2029.css";

const GOLDEN_878_JOURNEY_ID = "golden:878:v1";
const CONVERGENCE_LABEL = canonicalResearchPublicLabel("convergence");
const CONVERGENCES_LABEL = canonicalResearchPublicLabel("convergence", { plural: true });
const NUMBER_METHOD_RESULT_CACHE = new Map();
const NUMBER_PAGE_PROJECTION_CACHE = new Map();
const NUMBER_REGULAR_PHRASE_CACHE = new Map();
const NUMBER_HIDDEN_CROSS_CACHE = new Map();
const NUMBER_SYSTEM_METHODS_CACHE = new Map();
const clean = (value) => value == null ? "" : String(value).trim();

function rememberBounded(cache, key, value, max = 36) {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > max) cache.delete(cache.keys().next().value);
  return value;
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

function traceStepLabel(step) {
  if (typeof step === "string") return clean(step);
  return clean(step?.label || step?.word || step?.step || step?.expression || step?.description);
}

function anchorExpression(fact, root) {
  const text = clean(fact);
  if (!text || !text.includes("=")) return "";
  return clean(text.split("=").slice(1).join("="))
    .replace(new RegExp(`^${root}\\s*`), "")
    .replace(/\([^)]*\)\s*$/, "")
    .trim();
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
  const { value } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const shell = use2029Shell();
  const research = useResearch();
  const root = Number(value);
  const urlFocus = useMemo(() => parseNumberExpressionFocus(location.search), [location.search]);

  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [selectedMethodKey, setSelectedMethodKey] = useState("");
  const [activeExpression, setActiveExpression] = useState("");
  const [traceState, setTraceState] = useState({ loading: false, finding: null, error: null });
  const [methodProfileState, setMethodProfileState] = useState({ loading: false, rows: [], error: null });
  const [methodResultState, setMethodResultState] = useState({ loading: false, data: null, error: null, key: null });
  const [languageBridgeState, setLanguageBridgeState] = useState({ loading: false, rows: [] });
  const [regularPhraseState, setRegularPhraseState] = useState({ loading: false, rows: [] });
  const [traceOpen, setTraceOpen] = useState(false);
  const [deepViewInputState, setDeepViewInputState] = useState({ loading: false, data: null, error: null });
  const [hiddenCrossState, setHiddenCrossState] = useState({ loading: false, rows: [], error: null });
  const [systemMethodsState, setSystemMethodsState] = useState({ loading: false, cards: [], error: null, key: null });
  const [deepRequested, setDeepRequested] = useState(false);
  const [focusExplicit, setFocusExplicit] = useState(false);
  const [focusedCrossingPartner, setFocusedCrossingPartner] = useState("");
  const deepSentinelRef = useRef(null);

  useEffect(() => {
    if (!Number.isInteger(root) || root < 0) {
      setState({ loading: false, data: null, error: new Error("invalid-number") });
      return undefined;
    }
    let alive = true;
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

    const cacheKey = String(root);
    const cached = NUMBER_PAGE_PROJECTION_CACHE.get(cacheKey);
    if (cached?.data) {
      setState({ loading: false, data: cached.data, error: null });
      return () => { alive = false; };
    }
    setState({ loading: true, data: null, error: null });

    const pending = cached?.promise || fetchEntityHubProjection({
      type: "number",
      key: cacheKey,
      relationLimit: 140,
      researchLimit: 80,
      topicLimit: 24,
    });
    if (!cached?.promise) rememberBounded(NUMBER_PAGE_PROJECTION_CACHE, cacheKey, { promise: pending }, 20);

    pending
      .then((data) => {
        if (data) rememberBounded(NUMBER_PAGE_PROJECTION_CACHE, cacheKey, { data }, 20);
        else NUMBER_PAGE_PROJECTION_CACHE.delete(cacheKey);
        if (alive) setState({ loading: false, data, error: null });
      })
      .catch((error) => {
        NUMBER_PAGE_PROJECTION_CACHE.delete(cacheKey);
        if (alive) setState({ loading: false, data: null, error });
      });
    return () => { alive = false; };
  }, [root, urlFocus.expression, urlFocus.method, urlFocus.crossingPartner, urlFocus.explicit]);

  const data = state.data;

  useEffect(() => {
    const node = deepSentinelRef.current;
    if (!node || deepRequested) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setDeepRequested(true);
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setDeepRequested(true);
        observer.disconnect();
      }
    }, { rootMargin: "900px 0px", threshold: 0 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [data, root, deepRequested]);

  useEffect(() => {
    if (!deepRequested || !data?.identity || data.identity.type !== "number") {
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
  }, [deepRequested, data, root]);

  const families = Array.isArray(data?.gematria?.families) ? data.gematria.families : [];
  const topics = Array.isArray(data?.topics?.rows) ? data.topics.rows : [];
  const relations = Array.isArray(data?.graph?.relations) ? data.graph.relations : [];
  const sources = Array.isArray(data?.sources) ? data.sources : [];
  const worlds = Array.isArray(data?.numberWorlds) ? data.numberWorlds : [];
  const researchFindings = Array.isArray(data?.research?.findings) ? data.research.findings : [];
  const timeline = Array.isArray(data?.timeline) ? data.timeline : [];
  const zeroScaleData = data?.zeroScale || null;
  const zeroScale = Array.isArray(zeroScaleData?.scale_chain) ? zeroScaleData.scale_chain : [];
  const mediaItems = Array.isArray(data?.media?.items) ? data.media.items : [];
  const surface = data?.surface || {};
  const anchorRow = data?.anchorProfile?.row || null;
  const anchorPhrase = anchorExpression(anchorRow?.fact, root);

  const verseGematriaRows = Array.isArray(data?.journeys?.numberKnowledgeJourney?.sources)
    ? data.journeys.numberKnowledgeJourney.sources.filter((source) => source?.type === "verse")
    : [];

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

  useEffect(() => {
    if (!Number.isSafeInteger(root) || root < 1) {
      setRegularPhraseState({ loading: false, rows: [] });
      return undefined;
    }
    let alive = true;
    const cacheKey = String(root);
    const cached = NUMBER_REGULAR_PHRASE_CACHE.get(cacheKey);
    if (cached) {
      setRegularPhraseState({ loading: false, rows: cached });
      return () => { alive = false; };
    }
    setRegularPhraseState({ loading: true, rows: [] });
    // The visible Number UI exposes at most 30 expression cards. Fetching 500 on first paint
    // moved hundreds of rows over the wire without exposing additional capability.
    getAllValuePhrases(root, 30)
      .then((rows) => {
        const next = Array.isArray(rows) ? rows : [];
        rememberBounded(NUMBER_REGULAR_PHRASE_CACHE, cacheKey, next, 40);
        if (alive) setRegularPhraseState({ loading: false, rows: next });
      })
      .catch(() => { if (alive) setRegularPhraseState({ loading: false, rows: [] }); });
    return () => { alive = false; };
  }, [root]);

  useEffect(() => {
    if (!families.length) return;
    if (activeExpression && selectedMethodKey) return;

    const anchorFamily = anchorPhrase
      ? families.find((group) => (group?.phrases || []).some((item) => phraseOf(item) === anchorPhrase))
      : null;
    const first = anchorFamily || families[0];
    const phrase = activeExpression || anchorPhrase || phraseOf(first?.phrases?.[0]) || String(root);
    if (!selectedMethodKey) setSelectedMethodKey(methodKey(first));
    if (!activeExpression) setActiveExpression(phrase);
  }, [families, root, selectedMethodKey, activeExpression, anchorPhrase]);

  useEffect(() => {
    const expr = clean(activeExpression);
    if (!expr || /^\d+$/.test(expr)) {
      setMethodProfileState({ loading: false, rows: [], error: null });
      return undefined;
    }
    let alive = true;
    setMethodProfileState({ loading: true, rows: [], error: null });
    fetchNumberMethodProfile(expr)
      .then((rows) => {
        if (!alive) return;
        setMethodProfileState({ loading: false, rows, error: null });
        const selected = rows.find((row) => row.methodKey === selectedMethodKey) || rows[0] || null;
        if (selected && selected.methodKey !== selectedMethodKey) setSelectedMethodKey(selected.methodKey);
      })
      .catch((error) => {
        if (alive) setMethodProfileState({ loading: false, rows: [], error });
      });
    return () => { alive = false; };
  }, [activeExpression]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedMethodProfile = useMemo(
    () => methodProfileEntry(methodProfileState.rows, selectedMethodKey),
    [methodProfileState.rows, selectedMethodKey],
  );


  useEffect(() => {
    const expr = clean(activeExpression);
    if (!expr || /^\d+$/.test(expr) || !methodProfileState.rows.length) {
      setHiddenCrossState({ loading: false, rows: [], error: null });
      return undefined;
    }

    const profileKey = methodProfileState.rows
      .map((row) => `${row?.methodKey || ""}:${row?.computedValue ?? ""}`)
      .join("|");
    const cacheKey = `${expr}::${profileKey}`;
    const cached = NUMBER_HIDDEN_CROSS_CACHE.get(cacheKey);
    if (cached) {
      setHiddenCrossState({ loading: false, rows: cached, error: null });
      return undefined;
    }

    let alive = true;
    let cancelDeferred = null;
    setHiddenCrossState({ loading: false, rows: [], error: null });
    cancelDeferred = deferClientWork(() => {
      if (!alive) return;
      setHiddenCrossState({ loading: true, rows: [], error: null });
      fetchNumberHiddenCrossings(expr, methodProfileState.rows, { limit: 13 })
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
  }, [activeExpression, methodProfileState.rows]);


  const regularMethodProfile = useMemo(
    () => methodProfileState.rows.find((row) => (
      isRegularMethodIdentity(row?.methodKey) || isRegularMethodIdentity(row?.displayLabel)
    )) || null,
    [methodProfileState.rows],
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

  const selectedGroup = useMemo(
    () => families.find((group) => methodKey(group) === selectedMethodKey) || null,
    [families, selectedMethodKey],
  );
  useEffect(() => {
    const key = selectedMethodProfile?.methodKey || selectedMethodKey;
    if (!key || !activeExpression) {
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
  }, [selectedMethodProfile?.methodKey, selectedMethodKey, activeExpression]);

  const trace = traceState.finding?.projection?.dimensions?.trace || null;
  const activeResult = traceState.finding?.subject?.value ?? trace?.result ?? trace?.value ?? selectedMethodProfile?.computedValue ?? null;
  const traceSteps = Array.isArray(trace?.steps) ? trace.steps.map(traceStepLabel).filter(Boolean) : [];

  useEffect(() => {
    const next = Number(activeResult);
    if (!Number.isSafeInteger(next) || next < 0) {
      setSystemMethodsState({ loading: false, cards: [], error: null, key: null });
      return undefined;
    }

    const cached = NUMBER_SYSTEM_METHODS_CACHE.get(next);
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
          rememberBounded(NUMBER_SYSTEM_METHODS_CACHE, next, cards, 48);
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
  }, [activeResult]);

  useEffect(() => {
    const next = Number(activeResult);
    if (!Number.isSafeInteger(next) || next === root) {
      setMethodResultState({ loading: false, data: null, error: null, key: null });
      return undefined;
    }

    const cached = NUMBER_METHOD_RESULT_CACHE.get(next);
    if (cached?.data) {
      setMethodResultState({ loading: false, data: cached.data, error: null, cached: true, key: next });
      return undefined;
    }

    let alive = true;
    setMethodResultState({ loading: true, data: null, error: null, cached: false, key: next });
    const pending = cached?.promise || fetchEntityHubProjection({
      type: "number",
      key: String(next),
      relationLimit: 36,
      researchLimit: 16,
      topicLimit: 8,
      numberResearchLenses: ["number_lookup", "neighbors"],
      numberLookupLimit: 80,
      includeMedia: false,
    });
    if (!cached?.promise) NUMBER_METHOD_RESULT_CACHE.set(next, { promise: pending });

    pending.then((nextData) => {
      const dataValue = nextData || null;
      if (dataValue) NUMBER_METHOD_RESULT_CACHE.set(next, { data: dataValue });
      else NUMBER_METHOD_RESULT_CACHE.delete(next);
      if (alive) setMethodResultState({ loading: false, data: dataValue, error: null, cached: false, key: next });
    }).catch((error) => {
      NUMBER_METHOD_RESULT_CACHE.delete(next);
      if (alive) setMethodResultState({ loading: false, data: null, error, cached: false, key: next });
    });
    return () => { alive = false; };
  }, [activeResult, root]);

  useEffect(() => {
    const expr = clean(activeExpression);
    if (!expr || /^\d+$/.test(expr)) {
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
  }, [activeExpression]);

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
    methodProfile: methodProfileState.rows,
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
    journeyAvailable: root === 878,
    heroMedia: leadMedia,
  }), [root, activeExpression, selectedMethodKey, methodProfileState.rows, families, topics, relations, sources, worlds, researchFindings, timeline, mediaItems, surface, zeroScaleData, activityCount, leadMedia]);

  const stageData = Number.isSafeInteger(Number(activeResult)) && Number(activeResult) !== root
    ? (methodResultState.key === Number(activeResult) ? methodResultState.data : null)
    : data;
  const stageRoot = Number.isSafeInteger(Number(activeResult)) ? Number(activeResult) : root;
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
    methodProfile: methodProfileState.rows,
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
    journeyAvailable: stageRoot === 878,
    heroMedia: stageMedia[0] || null,
  }), [stageRoot, activeExpression, selectedMethodKey, methodProfileState.rows, stageFamilies, stageTopics, stageRelations, stageSources, stageWorlds, stageFindings, stageTimeline, stageMedia, stageSurface, stageZeroScale, stageActivityCount]);

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

  const activeMethodLabel = selectedMethodProfile ? methodProfileLabel(selectedMethodProfile) : methodLabel(selectedGroup);
  const focusMethodKey = selectedMethodProfile?.methodKey || selectedMethodKey || null;
  const focusExpression = focusExplicit ? clean(activeExpression) : "";
  const currentNumberHref = numberExpressionFocusHref(root, {
    expression: focusExpression || null,
    method: focusExplicit ? focusMethodKey : null,
    crossingPartner: focusExplicit ? focusedCrossingPartner : null,
  }) || `/2029/number/${root}`;
  const focusSelection = (entityId = root) => ({
    entityId: String(entityId),
    entityType: "number",
    expression: focusExpression || null,
    method: focusExplicit ? focusMethodKey : null,
    resultValue: focusExplicit && Number.isFinite(Number(activeResult)) ? Number(activeResult) : null,
    focusKind: focusExplicit ? (focusedCrossingPartner ? "crossing" : "expression") : null,
    crossingPartner: focusExplicit ? focusedCrossingPartner || null : null,
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
    navigate(`/2029/number/${root}`, { replace: true });
  };

  const activateExpressionFocus = (expression, methodKey = null) => {
    const expr = clean(expression);
    if (!expr) return;
    const key = clean(methodKey) || clean(regularMethodProfile?.methodKey) || clean(focusMethodKey);
    setFocusExplicit(true);
    setFocusedCrossingPartner("");
    setActiveExpression(expr);
    if (key) setSelectedMethodKey(key);
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
    const dimensions = {
      ...(research.context?.dimensions || {}),
      expressionFocusExplicit: Boolean(focusExplicit),
    };
    const current = research.context;
    if (current?.subject?.type === "number" && String(current.subject.id) === String(root)) {
      research.updateResearchContext?.({ subject, selection, lens: "number", dimensions });
    } else {
      research.setResearchContext?.({ subject, selection, lens: "number", dimensions, locale: "he" });
    }
  }, [root, focusExplicit, activeExpression, focusMethodKey, activeResult, focusedCrossingPartner, currentNumberHref]); // eslint-disable-line react-hooks/exhaustive-deps

  const openWorld = ({ journey = false, meetingSlug = null } = {}) => {
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

    if (journey && root === 878) {
      research.addJourney?.({
        root: 878,
        path: [{ type: "number", value: 878 }],
        world: "world",
        msg: GOLDEN_878_JOURNEY_ID,
      });
      research.setResearchContext?.({
        subject,
        selection,
        lens: "world",
        journey: { id: GOLDEN_878_JOURNEY_ID, kind: "golden", position: 0 },
        dimensions: {
          ...(current.dimensions || {}),
          journeySource: "number-2029-preview",
          journeyRoot: 878,
          journeyVisitedValues: [878],
          journeyMeetingSlugs: [],
        },
        returnTo,
      });
    } else {
      research.setResearchContext?.({
        subject,
        selection,
        lens: "world",
        dimensions: {
          ...(current.dimensions || {}),
          numberHome: currentNumberHref,
          ...(meetingSlug ? { meetingSlug } : {}),
        },
        returnTo,
      });
    }
    navigate("/world");
  };

  const openHeichal = (focus = {}) => {
    if (!Number.isInteger(root)) return;
    const current = research.context || {};
    const subject = { id: String(root), type: "number", label: String(root), href: currentNumberHref };
    const selection = focusSelection(root);
    research.setResearchContext?.({
      subject,
      selection,
      lens: "heichal",
      locale: current.locale || "he",
      dimensions: {
        ...(current.dimensions || {}),
        numberHome: currentNumberHref,
        methodSpatialExplain: focus && typeof focus === "object" ? focus : {},
      },
      returnTo: {
        href: currentNumberHref,
        label: focusExpression ? `${focusExpression} · ${root}` : `דף ${root}`,
        subject,
        selection,
        lens: "number",
        dimensions: current.dimensions || {},
        journey: current.journey || null,
      },
    });
    navigate("/heichal");
  };

  const askRaziel = (intent = "number_context", focus = {}) => {
    const focusPatch = focus && typeof focus === "object" ? focus : {};
    const forcedExpression = clean(focusPatch.expression) || (intent === "explain_crossing" ? clean(activeExpression) : focusExpression);
    const forcedCrossing = clean(focusPatch.partner || focusPatch.crossingPartner) || focusedCrossingPartner;
    const numberCoreFocus = {
      root,
      expression: forcedExpression || activeExpression || null,
      method: focusMethodKey,
      resultValue: Number.isFinite(Number(activeResult)) ? Number(activeResult) : null,
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
      navigate(`/2029/number/${Number(raw)}`);
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
      : `/2029/number/${next}`;
    const nextSelection = keepFocus
      ? { ...focusSelection(next), resultValue: next }
      : { entityId: String(next), entityType: "number" };
    research.setResearchContext?.({
      subject: { id: String(next), type: "number", label: String(next), href: nextHref },
      selection: nextSelection,
      lens: "number",
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

  if (!Number.isInteger(root) || root < 0) {
    return <FrameState kind="error" title="המספר לא תקין">הדוגמה הזאת מקבלת כרגע מספר שלם בלבד.</FrameState>;
  }
  if (state.loading) {
    return <FrameState kind="loading" title={`פותח את ${root}`}>טוען את ליבת המספר מה־2029 projection.</FrameState>;
  }
  if (state.error || !data) {
    return <FrameState kind="unavailable" title="דף המספר לא זמין כרגע">לא מוצג חומר חלופי ולא נעשה fallback ל־Legacy בתוך עץ 2029.</FrameState>;
  }

  return <div className="sod29-number-page" data-experience-surface="number" data-experience-question="מה זה?" data-number-root={root} data-truth-safe="true">
    {focusExplicit && focusExpression ? <section className="sod29-number-focus-ribbon" aria-label="מיקוד ביטוי פעיל" data-expression-focus="true">
      <div>
        <span>מיקוד פעיל</span>
        <strong>{focusedCrossingPartner ? `${focusExpression} ↔ ${focusedCrossingPartner}` : focusExpression}</strong>
        <small>{activeMethodLabel || focusMethodKey || "שיטה"} {Number.isFinite(Number(activeResult)) ? `= ${activeResult}` : ""} · הבית המספרי {root}</small>
      </div>
      <div className="sod29-actions">
        {research.context?.returnTo?.href ? <button className="sod29-action" type="button" onClick={() => shell.returnExact()}>↩ {research.context.returnTo.label || "חזרה מדויקת"}</button> : null}
        <button className="sod29-action" type="button" onClick={clearExpressionFocus}>הצג את {root} בלי מיקוד</button>
      </div>
    </section> : null}
    <section className="sod29-number-hero" id="number-now">
      <NumberCore2029
        projection={coreProjection}
        mode="page"
        traceState={traceState}
        traceOpen={traceOpen}
        traceSteps={traceSteps}
        traceDetail={trace}
        stageProjection={stageProjection}
        stageLoading={methodResultState.loading}
        methodsLoading={methodProfileState.loading}
        languageBridges={languageBridgeState.rows}
        regularExpressions={regularExpressions}
        onExpressionSelect={(phrase) => activateExpressionFocus(phrase, regularMethodProfile?.methodKey || null)}
        onResolveQuery={resolveNumberQuery}
        onMethodSelect={activateMethodFocus}
        onToggleTrace={() => setTraceOpen((value) => !value)}
        hiddenCrossings={hiddenCrossState.rows}
        hiddenCrossingsLoading={hiddenCrossState.loading}
        systemMethods={systemMethodsState.key === stageRoot ? systemMethodsState.cards : []}
        systemMethodsLoading={systemMethodsState.key === stageRoot && systemMethodsState.loading}
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
          askRaziel("explain_crossing", { kind: "crossing", partner: partner || null, methods: crossing?.methods || [] });
        }}
        onOpenZero={(next) => openNumberRoot(next, { preserveFocus: false })}
        onOpenResult={(next) => openNumberRoot(next, { preserveFocus: true })}
        onOpenWorld={() => openWorld()}
        onOpenHeichal={openHeichal}
        onOpenJourney={root === 878 ? () => openWorld({ journey: true }) : null}
        journeyLabel={root === 878 ? "צא למסע 878" : null}
        onOpenLife={() => document.getElementById("number-essential")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        onRazielAction={askRaziel}
        onExpandRaziel={() => askRaziel("expand_panel")}
      />

    </section>

    <NumberLivingWorld2029
      root={root}
      data={data}
      activeExpression={activeExpression}
      activeMethodLabel={activeMethodLabel}
      families={families}
      regularExpressions={regularExpressions}
      languageBridges={languageBridgeState.rows}
      topics={topics}
      relations={relations}
      projectionRelatedNumbers={coreProjection?.relatedNumbers || []}
      sources={sources}
      verseRows={verseGematriaRows}
      versesLoading={false}
      worlds={worlds}
      researchFindings={researchFindings}
      timeline={timeline}
      zeroScale={zeroScale}
      mediaItems={mediaItems}
      math={math}
      activityCount={activityCount}
      researchState={researchState}
      onOpenWorld={openWorld}
      onOpenHeichal={openHeichal}
      onRazielAction={askRaziel}
      onOpenNumber={(next) => openNumberRoot(next, { preserveFocus: false })}
      onJourney={() => root === 878 ? openWorld({ journey: true }) : openWorld()}
      onPersonalJourney={() => askRaziel("personal_journey_from_number", {
        kind: "personal_journey",
        root,
        expression: activeExpression || null,
        method: selectedMethodProfile?.methodKey || selectedMethodKey || null,
      })}
    />

    <div ref={deepSentinelRef} aria-hidden="true" style={{ height: 1 }} />
    {deepRequested && deepViewModel ? <NumberDeepView2029
      model={deepViewModel}
      onOpenHeichal={openHeichal}
      onRazielAction={askRaziel}
    /> : deepRequested && deepViewInputState.loading ? <section className="sod29-section sod29-number-deep-view" id="number-deep-view" aria-busy="true">
      <div className="sod29-number-core2029-note">טוען את מפת המחקר כשמגיעים אליה…</div>
    </section> : null}

  </div>;
}

export default function Number2029Page() {
  const { value } = useParams();

  useEffect(() => {
    applySeo({
      title: `${value || "מספר"} · דף המספר 2029`,
      description: "דף המספר 2029 — עולמות, קשרים, מתמטיקה, מקורות ומסע סביב המספר.",
      path: `/2029/number/${value || ""}`,
      noindex: true,
    });
  }, [value]);

  return <Sod2029Shell
    surface="number"
    symbol="123"
    status="LIVING NUMBER · DESIGN PREVIEW"
  >
    <NumberPageBody />
  </Sod2029Shell>;
}
