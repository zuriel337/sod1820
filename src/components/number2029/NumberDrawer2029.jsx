import { gematriaTraceLines, traceNumber, isVerifiedMethodTrace } from "../../lib/research/gematriaTracePresentation.js";
import React, { useEffect, useMemo, useRef, useState } from "react";
import NumberCore2029 from "./NumberCore2029.jsx";
import { fetchEntityHubProjection } from "../../lib/research/entityHubProjection.js";
import { fetchGematriaMethodTrace } from "../../lib/research/gematriaTrace.js";
import {
  buildNumberCoreProjection,
  fetchNumberMethodProfile,
  fetchNumberHiddenCrossings,
  methodProfileEntry,
  methodKey as familyMethodKey,
  phraseOf,
} from "../../lib/research/numberCoreProjection.js";
import { getAllValuePhrases, langLinksList } from "../../lib/supabase.js";
import "./numberDrawer2029.css";

const NUMBER_METHOD_RESULT_CACHE = new Map();
const clean = (value) => value == null ? "" : String(value).trim();
const normalizedMethodName = (value) => clean(value).replace(/[\s"'״׳’‘\-_/]/g, "");
const isRegularMethodIdentity = (value) => normalizedMethodName(value) === "רגיל";
const numberContextSignature = (root, expression, methodKey) => `${root ?? ""}|${clean(expression)}|${clean(methodKey)}`;

function anchorExpression(fact, root) {
  const text = clean(fact);
  if (!text || !text.includes("=")) return "";
  return clean(text.split("=").slice(1).join("="))
    .replace(new RegExp(`^${root}\\s*`), "")
    .replace(/\([^)]*\)\s*$/, "")
    .trim();
}



function defaultExpression(data, root, contextExpression) {
  const fromContext = clean(contextExpression);
  if (fromContext) return fromContext;
  const anchor = anchorExpression(data?.anchorProfile?.row?.fact, root);
  if (anchor) return anchor;
  const families = Array.isArray(data?.gematria?.families) ? data.gematria.families : [];
  for (const group of families) {
    const phrase = phraseOf(group?.phrases?.[0]);
    if (phrase) return phrase;
  }
  return "";
}

export default function NumberDrawer2029({
  target,
  context,
  research,
  go,
  openRaziel,
} = {}) {
  const targetNumber = target?.type === "number" && Number.isSafeInteger(Number(target?.id)) ? Number(target.id) : null;
  // A contextual Learn/Inspect handoff may carry an already-selected phrase + method + result.
  // These values seed selection/navigation only; NumberDrawer still fetches the canonical
  // method profile and trace before rendering calculation truth.
  const targetResult = Number(target?.resultValue ?? target?.number);
  const targetResultRoot = Number.isSafeInteger(targetResult) ? targetResult : null;
  const targetMethodKey = clean(target?.method || target?.methodKey);
  const contextRoot = context?.subject?.type === "number" && Number.isSafeInteger(Number(context.subject.id)) ? Number(context.subject.id) : null;
  const contextExpression = clean(context?.selection?.expression);
  const initialExpression = target?.type === "phrase" ? clean(target.expression || target.label || target.id) : (targetNumber != null ? "" : contextExpression);
  const initialMethodKey = targetMethodKey || clean(context?.selection?.method);
  const initialRoot = targetNumber ?? targetResultRoot ?? contextRoot;

  const [root, setRoot] = useState(initialRoot);
  const [input, setInput] = useState(initialExpression || (targetNumber != null ? String(targetNumber) : ""));
  const [expression, setExpression] = useState(initialExpression);
  const [surfaceMode, setSurfaceMode] = useState(initialExpression ? "focus" : "number");
  const [originFocus, setOriginFocus] = useState(() => initialExpression ? {
    expression: initialExpression,
    methodKey: initialMethodKey || null,
    root: Number.isSafeInteger(Number(initialRoot)) ? Number(initialRoot) : null,
  } : null);
  const [dataState, setDataState] = useState({ loading: false, data: null, error: null, key: null });
  const [profileState, setProfileState] = useState({ loading: false, rows: [], error: null });
  const [selectedMethodKey, setSelectedMethodKey] = useState(initialMethodKey);
  const [traceState, setTraceState] = useState({ loading: false, finding: null, error: null });
  const [methodResultState, setMethodResultState] = useState({ loading: false, data: null, error: null, key: null });
  const [languageBridgeState, setLanguageBridgeState] = useState({ loading: false, rows: [] });
  const [regularPhraseState, setRegularPhraseState] = useState({ loading: false, rows: [] });
  const [traceOpen, setTraceOpen] = useState(false);
  const [hiddenCrossState, setHiddenCrossState] = useState({ loading: false, rows: [] });
  const internalContextSignatureRef = useRef(null);
  const modeRef = useRef(null);
  const previousSurfaceModeRef = useRef(surfaceMode);

  useEffect(() => {
    const incomingSignature = numberContextSignature(contextRoot, context?.selection?.expression, context?.selection?.method);
    if (internalContextSignatureRef.current && internalContextSignatureRef.current === incomingSignature) {
      internalContextSignatureRef.current = null;
      return;
    }
    const nextRoot = targetNumber ?? targetResultRoot ?? contextRoot;
    setRoot(nextRoot);
    const nextExpression = target?.type === "phrase" ? clean(target.expression || target.label || target.id) : (targetNumber != null ? "" : clean(context?.selection?.expression));
    const nextMethodKey = targetMethodKey || clean(context?.selection?.method);
    setExpression(nextExpression);
    setInput(nextExpression || (nextRoot != null ? String(nextRoot) : ""));
    setSelectedMethodKey(nextMethodKey);
    setSurfaceMode(nextExpression ? "focus" : "number");
    setOriginFocus(nextExpression ? {
      expression: nextExpression,
      methodKey: nextMethodKey || null,
      root: Number.isSafeInteger(Number(nextRoot)) ? Number(nextRoot) : null,
    } : null);
    setTraceOpen(false);
  }, [
    target?.type,
    target?.id,
    target?.label,
    target?.expression,
    target?.method,
    target?.methodKey,
    target?.resultValue,
    target?.number,
    targetNumber,
    targetResultRoot,
    targetMethodKey,
    contextRoot,
    context?.selection?.expression,
    context?.selection?.method,
  ]);

  useEffect(() => {
    if (!Number.isSafeInteger(root)) {
      setDataState({ loading: false, data: null, error: null });
      return undefined;
    }
    let alive = true;
    setDataState({ loading: true, data: null, error: null });
    fetchEntityHubProjection({
      type: "number",
      key: String(root),
      relationLimit: 80,
      researchLimit: 40,
      topicLimit: 12,
    }).then((data) => {
      if (!alive) return;
      setDataState({ loading: false, data, error: null });
      if (!expression) {
        const nextExpression = defaultExpression(data, root, contextExpression);
        if (nextExpression) {
          setExpression(nextExpression);
          setInput(nextExpression);
        }
      }
    }).catch((error) => {
      if (alive) setDataState({ loading: false, data: null, error });
    });
    return () => { alive = false; };
  }, [root]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!Number.isSafeInteger(root) || root < 1) {
      setRegularPhraseState({ loading: false, rows: [] });
      return undefined;
    }
    let alive = true;
    setRegularPhraseState({ loading: true, rows: [] });
    getAllValuePhrases(root, 500)
      .then((rows) => { if (alive) setRegularPhraseState({ loading: false, rows: Array.isArray(rows) ? rows : [] }); })
      .catch(() => { if (alive) setRegularPhraseState({ loading: false, rows: [] }); });
    return () => { alive = false; };
  }, [root]);

  useEffect(() => {
    const expr = clean(expression);
    if (!expr || /^\d+$/.test(expr)) {
      setProfileState({ loading: false, rows: [], error: null });
      return undefined;
    }
    let alive = true;
    setProfileState({ loading: true, rows: [], error: null });
    fetchNumberMethodProfile(expr)
      .then((rows) => {
        if (!alive) return;
        setProfileState({ loading: false, rows, error: null });
        const requested = clean(selectedMethodKey);
        const selected = rows.find((row) => row.methodKey === requested) || rows[0] || null;
        if (selected && selected.methodKey !== requested) setSelectedMethodKey(selected.methodKey);
        if (!Number.isSafeInteger(root) && selected?.computedValue != null) setRoot(Number(selected.computedValue));
      })
      .catch((error) => {
        if (alive) setProfileState({ loading: false, rows: [], error });
      });
    return () => { alive = false; };
  }, [expression]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const expr = clean(expression);
    if (!expr || /^\d+$/.test(expr) || !profileState.rows.length) {
      setHiddenCrossState({ loading: false, rows: [] });
      return undefined;
    }
    let alive = true;
    setHiddenCrossState({ loading: true, rows: [] });
    fetchNumberHiddenCrossings(expr, profileState.rows, { limit: 13 })
      .then((rows) => { if (alive) setHiddenCrossState({ loading: false, rows: Array.isArray(rows) ? rows : [] }); })
      .catch(() => { if (alive) setHiddenCrossState({ loading: false, rows: [] }); });
    return () => { alive = false; };
  }, [expression, profileState.rows]);

  useEffect(() => {
    const expr = clean(expression);
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
  }, [expression]);

  const selectedProfile = useMemo(
    () => methodProfileEntry(profileState.rows, selectedMethodKey),
    [profileState.rows, selectedMethodKey],
  );

  useEffect(() => {
    const expr = clean(expression);
    if (surfaceMode !== "focus" || !expr) return;
    const computed = traceNumber(selectedProfile?.computedValue);
    const focusRoot = Number.isSafeInteger(Number(root))
      ? Number(root)
      : (Number.isSafeInteger(computed) ? computed : null);
    setOriginFocus({
      expression: expr,
      methodKey: selectedProfile?.methodKey || clean(selectedMethodKey) || null,
      root: focusRoot,
      traceOpen,
    });
  }, [surfaceMode, expression, selectedProfile?.methodKey, selectedProfile?.computedValue, selectedMethodKey, root, traceOpen]);

  useEffect(() => {
    if (previousSurfaceModeRef.current === surfaceMode) return;
    previousSurfaceModeRef.current = surfaceMode;
    requestAnimationFrame(() => modeRef.current?.focus?.());
  }, [surfaceMode]);
  const regularProfile = useMemo(
    () => profileState.rows.find((row) => (
      isRegularMethodIdentity(row?.methodKey) || isRegularMethodIdentity(row?.displayLabel)
    )) || null,
    [profileState.rows],
  );

  useEffect(() => {
    const expr = clean(expression);
    const key = selectedProfile?.methodKey || clean(selectedMethodKey);
    if (!expr || !key) {
      setTraceState({ loading: false, finding: null, error: null });
      return undefined;
    }
    let alive = true;
    setTraceState({ loading: true, finding: null, error: null });
    fetchGematriaMethodTrace(key, expr)
      .then((finding) => {
        if (alive) setTraceState({ loading: false, finding: finding || null, error: null });
      })
      .catch((error) => {
        if (alive) setTraceState({ loading: false, finding: null, error });
      });
    return () => { alive = false; };
  }, [expression, selectedProfile?.methodKey, selectedMethodKey]);

  const data = dataState.data;
  const families = Array.isArray(data?.gematria?.families) ? data.gematria.families : [];
  const regularGroup = useMemo(
    () => families.find((group) => {
      const key = familyMethodKey(group);
      const label = clean(group?.registry?.display_label || group?.display_label || group?.method || group?.method_key);
      return isRegularMethodIdentity(key) || isRegularMethodIdentity(label);
    }) || null,
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
    for (const row of regularPhraseState.rows) {
      add(row?.phrase, "lead_rank", {
        leadRank: row?.lead_rank ?? null,
        verified: row?.is_verified === true,
      });
    }
    if (!rows.length && regularPhraseState.loading) {
      for (const raw of Array.isArray(regularGroup?.phrases) ? regularGroup.phrases : []) add(phraseOf(raw), "family");
    }
    if (
      expression
      && regularProfile
      && Number(regularProfile.computedValue) === root
      && !seen.has(clean(expression))
    ) rows.unshift({ phrase: clean(expression), value: root, source: "active_unstored", leadRank: null, verified: null });
    return rows;
  }, [expression, regularProfile, regularGroup, regularPhraseState, root]);
  const topics = Array.isArray(data?.topics?.rows) ? data.topics.rows : [];
  const sources = Array.isArray(data?.sources) ? data.sources : [];
  const relations = Array.isArray(data?.graph?.relations) ? data.graph.relations : [];
  const worlds = Array.isArray(data?.numberWorlds) ? data.numberWorlds : [];
  const findings = Array.isArray(data?.research?.findings) ? data.research.findings : [];
  const timeline = Array.isArray(data?.timeline) ? data.timeline : [];
  const media = Array.isArray(data?.media?.items) ? data.media.items : [];
  const zeroScale = data?.zeroScale || null;
  const surface = data?.surface || {};
  const activityCount = [
    Number(surface.postsCount ?? surface.posts?.length ?? 0),
    Number(surface.galleriesCount ?? surface.galleries?.length ?? 0),
    Number(surface.insightsCount ?? surface.insights?.length ?? 0),
    Number(surface.commentsCount ?? 0),
    Number(surface.eventsCount ?? 0),
  ].reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);

  const projection = useMemo(() => {
    if (!Number.isSafeInteger(root)) return null;
    return buildNumberCoreProjection({
      root,
      expression,
      selectedMethodKey,
      methodProfile: profileState.rows,
      families,
      topics,
      relations,
      sources,
      worlds,
      findings,
      timeline,
      media,
      surface,
      zeroScale,
      activityCount,
      journeyAvailable: Number(root) === 878,
      heroMedia: media[0] || null,
    });
  }, [root, expression, selectedMethodKey, profileState.rows, families, topics, relations, sources, worlds, findings, timeline, media, surface, zeroScale, activityCount]);

  const rawTrace = traceState.finding?.projection?.dimensions?.trace || null;
  const trace = isVerifiedMethodTrace(rawTrace, { expression: expression, methodKey: selectedProfile?.methodKey || selectedMethodKey }) ? rawTrace : null;
  const traceSteps = gematriaTraceLines(trace, { expression: expression, methodKey: selectedMethodKey });
  const activeResult = traceNumber(trace?.result ?? selectedProfile?.computedValue);

  useEffect(() => {
    const next = traceNumber(activeResult);
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
      relationLimit: 50,
      researchLimit: 28,
      topicLimit: 10,
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

  const stageData = (traceNumber(activeResult) != null) && Number(activeResult) !== root
    ? (methodResultState.key === Number(activeResult) ? methodResultState.data : null)
    : data;
  const stageRoot = (traceNumber(activeResult) != null) ? Number(activeResult) : root;
  const stageFamilies = Array.isArray(stageData?.gematria?.families) ? stageData.gematria.families : [];
  const stageTopics = Array.isArray(stageData?.topics?.rows) ? stageData.topics.rows : [];
  const stageSources = Array.isArray(stageData?.sources) ? stageData.sources : [];
  const stageRelations = Array.isArray(stageData?.graph?.relations) ? stageData.graph.relations : [];
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
    expression,
    selectedMethodKey,
    methodProfile: profileState.rows,
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
  }), [stageRoot, expression, selectedMethodKey, profileState.rows, stageFamilies, stageTopics, stageRelations, stageSources, stageWorlds, stageFindings, stageTimeline, stageMedia, stageSurface, stageZeroScale, stageActivityCount]);

  const updateContext = (patch = {}, selectionOverride = null) => {
    if (!Number.isSafeInteger(root)) return;
    const hasOverride = selectionOverride && typeof selectionOverride === "object";
    const activeExpression = hasOverride && Object.prototype.hasOwnProperty.call(selectionOverride, "expression")
      ? clean(selectionOverride.expression) || null
      : clean(expression) || null;
    const activeMethodKey = hasOverride && Object.prototype.hasOwnProperty.call(selectionOverride, "methodKey")
      ? clean(selectionOverride.methodKey) || null
      : selectedProfile?.methodKey || clean(selectedMethodKey) || null;
    const activeResultValue = hasOverride && Object.prototype.hasOwnProperty.call(selectionOverride, "resultValue")
      ? selectionOverride.resultValue ?? null
      : selectedProfile?.computedValue ?? null;
    const selection = {
      entityId: String(root),
      entityType: "number",
      expression: activeExpression,
      method: activeMethodKey,
      resultValue: activeResultValue,
    };
    const subject = { id: String(root), type: "number", label: String(root), href: `/2029/number/${root}` };
    internalContextSignatureRef.current = numberContextSignature(root, selection.expression, activeMethodKey);
    if (context?.subject?.type === "number" && String(context.subject.id) === String(root)) {
      research?.updateResearchContext?.({ selection, lens: "number", ...patch });
    } else {
      research?.setResearchContext?.({ subject, selection, lens: "number", locale: context?.locale || "he", ...patch });
    }
  };

  const resolveInputValue = async (rawValue) => {
    const raw = clean(rawValue);
    if (!raw) return;
    setInput(raw);
    if (/^\d+$/.test(raw) && Number.isSafeInteger(Number(raw))) {
      setRoot(Number(raw));
      setExpression("");
      setSelectedMethodKey("");
      setSurfaceMode("number");
      setTraceOpen(false);
      return;
    }
    setExpression(raw);
    setSurfaceMode("focus");
    setTraceOpen(false);
    try {
      const rows = await fetchNumberMethodProfile(raw);
      const regular = rows.find((row) => {
        const label = clean(row?.displayLabel || row?.methodKey).replace(/[\s"'״׳’‘\-_/]/g, "");
        return label === "רגיל" || clean(row?.methodKey) === "רגיל";
      }) || rows[0] || null;
      setProfileState({ loading: false, rows, error: null });
      if (regular?.methodKey) setSelectedMethodKey(regular.methodKey);
      const next = Number(regular?.computedValue);
      if (Number.isSafeInteger(next)) setRoot(next);
      setOriginFocus({
        expression: raw,
        methodKey: regular?.methodKey || null,
        root: Number.isSafeInteger(next) ? next : null,
      });
    } catch {
      // expression remains usable; profile effect owns the visible error state.
    }
  };

  const commitInput = (event) => {
    event?.preventDefault?.();
    resolveInputValue(input);
  };

  const selectMethod = (key) => {
    const nextProfile = methodProfileEntry(profileState.rows, key);
    setSelectedMethodKey(key);
    setSurfaceMode("focus");
    setTraceOpen(false);
    updateContext({}, {
      expression: clean(expression) || null,
      methodKey: nextProfile?.methodKey || clean(key) || null,
      resultValue: nextProfile?.computedValue ?? null,
    });
  };

  const openExplicitRoot = (value) => {
    const next = Number(value);
    if (!Number.isSafeInteger(next)) return;
    if (surfaceMode === "focus" && clean(expression)) {
      setOriginFocus({
        expression: clean(expression),
        methodKey: selectedProfile?.methodKey || clean(selectedMethodKey) || null,
        root: Number.isSafeInteger(Number(root)) ? Number(root) : null,
        traceOpen,
      });
    }
    const sameRoot = Number.isSafeInteger(Number(root)) && Number(root) === next;
    setRoot(next);
    setInput(String(next));
    if (!sameRoot) {
      setExpression("");
      setSelectedMethodKey("");
    }
    setSurfaceMode("number");
    setTraceOpen(false);
  };

  const restoreOriginFocus = () => {
    if (!originFocus?.expression) return;
    setSurfaceMode("focus");
    setExpression(originFocus.expression);
    setInput(originFocus.expression);
    setSelectedMethodKey(originFocus.methodKey || "");
    if (Number.isSafeInteger(Number(originFocus.root))) setRoot(Number(originFocus.root));
    setTraceOpen(originFocus.traceOpen === true);
  };

  const razielIntent = (intent, focus = {}) => {
    const numberCoreFocus = {
      root,
      expression: clean(expression) || null,
      method: selectedProfile?.methodKey || null,
      resultValue: selectedProfile?.computedValue ?? null,
      crossingPartner: projection?.crossing?.partner || null,
      zeroScaleNext: projection?.zeroScale?.next ?? null,
      ...(focus && typeof focus === "object" ? focus : {}),
    };
    updateContext({
      dimensions: {
        ...(context?.dimensions || {}),
        razielMicroIntent: intent,
        numberCoreFocus,
      },
    });
    openRaziel?.({ razielMicroIntent: intent, numberCoreFocus });
  };

  const openPage = () => {
    updateContext();
    go?.(`/2029/number/${root}`);
  };

  const openWorld = () => {
    if (!Number.isSafeInteger(root)) return;
    const current = context || {};
    const selection = {
      entityId: String(root),
      entityType: "number",
      expression: clean(expression) || null,
      method: selectedProfile?.methodKey || null,
      resultValue: selectedProfile?.computedValue ?? null,
    };
    research?.setResearchContext?.({
      subject: { id: String(root), type: "number", label: String(root), href: `/2029/number/${root}` },
      selection,
      lens: "world",
      dimensions: { ...(current.dimensions || {}), numberHome: `/2029/number/${root}` },
      returnTo: {
        href: current?.subject?.href || `/2029/number/${root}`,
        label: current?.subject?.label || `דף ${root}`,
        subject: current?.subject || null,
        selection: current?.selection || null,
        lens: current?.lens || null,
        dimensions: current?.dimensions || {},
        journey: current?.journey || null,
      },
    });
    go?.("/world", { preserve: false });
  };

  if (!target && !context?.subject) {
    return <div className="sod29-number-drawer-empty">
      <strong>מספר / ביטוי</strong>
      <p>בחר מספר או ביטוי בעמוד, או הקלד כאן.</p>
      <form onSubmit={commitInput}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="התגלות · 1237" /><button type="submit">פתח</button></form>
    </div>;
  }

  return <div
    className="sod29-number-drawer2029"
    data-contextual-number-surface="v1"
    data-contextual-number-mode={surfaceMode}
  >
    <div className="sod29-number-drawer-mode" role="region" aria-label="מצב חלונית המספר" tabIndex={-1} ref={modeRef}>
      <div>
        <span>{surfaceMode === "focus" ? "FOCUS · איך זה מחושב" : "NUMBER PREVIEW · מה חי סביב המספר"}</span>
        <strong>{surfaceMode === "focus" ? (clean(expression) || "ביטוי") : (Number.isSafeInteger(Number(root)) ? String(root) : "מספר")}</strong>
        <small>{surfaceMode === "focus"
          ? `${selectedProfile?.displayLabel || selectedProfile?.methodKey || clean(selectedMethodKey) || "בחר שיטה"} · אותה חלונית, אותו הקשר`
          : "תצוגת המספר באותה חלונית · בלי לפתוח Drawer נוסף"}</small>
      </div>
      {surfaceMode === "number" && originFocus?.expression ? <button
        type="button"
        className="sod29-number-drawer-back"
        data-experience-action="contextual-number-back"
        onClick={restoreOriginFocus}
      >↩ חזרה ל־{originFocus.expression}</button> : null}
    </div>

    <form className="sod29-number-drawer-search" onSubmit={commitInput}>
      <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="שם · ביטוי · מספר" aria-label="שם ביטוי או מספר" />
      <button type="submit">פתח</button>
    </form>

    {dataState.loading || profileState.loading ? <div className="sod29-number-drawer-status">מחבר את ליבת המספר…</div> : null}
    {dataState.error ? <div className="sod29-number-drawer-status error">ה־Root לא נטען כרגע. לא נעשה fallback ל־Legacy.</div> : null}
    {profileState.error ? <div className="sod29-number-drawer-status error">השיטות לא נטענו כרגע מהמנוע הקנוני.</div> : null}

    {surfaceMode === "focus" && clean(expression) && (traceNumber(activeResult) != null) ? <div className="sod29-surface-context-expression sod29-number-drawer-identity"><span>{clean(expression)}</span><small>{selectedProfile?.displayLabel || selectedProfile?.methodKey || clean(selectedMethodKey)}</small><b>{Number(activeResult)}</b></div> : null}

    {projection ? <NumberCore2029
      projection={projection}
      stageProjection={stageProjection}
      stageLoading={methodResultState.loading}
      methodsLoading={profileState.loading}
      languageBridges={languageBridgeState.rows}
      regularExpressions={regularExpressions}
      hiddenCrossings={hiddenCrossState.rows}
      hiddenCrossingsLoading={hiddenCrossState.loading}
      mode="drawer"
      traceState={traceState}
      traceOpen={traceOpen}
      traceSteps={traceSteps}
      traceDetail={trace}
      onExpressionSelect={(phrase) => {
        setExpression(phrase);
        setInput(phrase);
        setSurfaceMode("focus");
        if (regularProfile?.methodKey) setSelectedMethodKey(regularProfile.methodKey);
        setTraceOpen(false);
      }}
      onResolveQuery={resolveInputValue}
      onMethodSelect={selectMethod}
      onToggleTrace={() => setTraceOpen((value) => !value)}
      onOpenCrossing={(crossing) => razielIntent("explain_crossing", { kind: "crossing", partner: crossing?.partner || null, methods: crossing?.methods || [] })}
      onOpenZero={openExplicitRoot}
      onOpenResult={openExplicitRoot}
      onOpenPage={openPage}
      onOpenWorld={openWorld}
      onRazielAction={razielIntent}
      onExpandRaziel={() => razielIntent("expand_panel")}
    /> : !dataState.loading ? <div className="sod29-number-drawer-status">הקלד ביטוי כדי לקבל שיטות, או מספר כדי לפתוח את ה־Root.</div> : null}
  </div>;
}
