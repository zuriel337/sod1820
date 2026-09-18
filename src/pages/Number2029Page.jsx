import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { fetchEntityHubProjection } from "../lib/research/entityHubProjection.js";
import { fetchGematriaMethodTrace } from "../lib/research/gematriaTrace.js";
import { runNumberMathProfile } from "../lib/research/numberMathProfileFinding.js";
import {
  buildNumberCoreProjection,
  fetchNumberMethodProfile,
  methodProfileEntry,
} from "../lib/research/numberCoreProjection.js";
import NumberCore2029 from "../components/number2029/NumberCore2029.jsx";
import { applySeo } from "../lib/seo.js";
import { langLinksList } from "../lib/supabase.js";
import "./number2029.css";

const GOLDEN_878_JOURNEY_ID = "golden:878:v1";
const clean = (value) => value == null ? "" : String(value).trim();

function phraseOf(item) {
  if (typeof item === "string") return clean(item);
  return clean(item?.phrase || item?.label);
}

function methodKey(group) {
  return clean(group?.registry?.method_key || group?.method_key || group?.method);
}

function methodLabel(group) {
  return clean(group?.registry?.display_label || group?.display_label || group?.method || group?.method_key) || "שיטה";
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

function ObservatoryNode({ item, active, onClick }) {
  if (!item) return <div className="sod29-number-observatory-node is-empty" aria-hidden="true" />;
  return <button
    type="button"
    className={`sod29-number-observatory-node${active ? " is-active" : ""}`}
    onClick={onClick}
  >
    <span>{item.kicker}</span>
    <strong>{item.title}</strong>
    {item.note ? <small>{item.note}</small> : null}
  </button>;
}

function NumberPageBody() {
  const { value } = useParams();
  const navigate = useNavigate();
  const shell = use2029Shell();
  const research = useResearch();
  const root = Number(value);

  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [selectedMethodKey, setSelectedMethodKey] = useState("");
  const [activeExpression, setActiveExpression] = useState("");
  const [showAllMethods, setShowAllMethods] = useState(false);
  const [showAllExpressions, setShowAllExpressions] = useState(false);
  const [traceState, setTraceState] = useState({ loading: false, finding: null, error: null });
  const [methodProfileState, setMethodProfileState] = useState({ loading: false, rows: [], error: null });
  const [methodResultState, setMethodResultState] = useState({ loading: false, data: null, error: null });
  const [languageBridgeState, setLanguageBridgeState] = useState({ loading: false, rows: [] });
  const [traceOpen, setTraceOpen] = useState(false);
  const [observatoryFocus, setObservatoryFocus] = useState("now");

  useEffect(() => {
    if (!Number.isInteger(root) || root < 0) {
      setState({ loading: false, data: null, error: new Error("invalid-number") });
      return undefined;
    }
    let alive = true;
    setState({ loading: true, data: null, error: null });
    const sameContextRoot = research.context?.subject?.type === "number" && String(research.context.subject.id) === String(root);
    const contextExpression = sameContextRoot ? clean(research.context?.selection?.expression) : "";
    const contextMethod = sameContextRoot ? clean(research.context?.selection?.method) : "";
    setSelectedMethodKey(contextMethod);
    setActiveExpression(contextExpression);
    setShowAllMethods(false);
    setShowAllExpressions(false);
    setTraceOpen(false);
    setObservatoryFocus("now");
    fetchEntityHubProjection({
      type: "number",
      key: String(root),
      relationLimit: 140,
      researchLimit: 80,
      topicLimit: 24,
    })
      .then((data) => {
        if (alive) setState({ loading: false, data, error: null });
      })
      .catch((error) => {
        if (alive) setState({ loading: false, data: null, error });
      });
    return () => { alive = false; };
  }, [root]);

  const data = state.data;
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

  const selectedGroup = useMemo(
    () => families.find((group) => methodKey(group) === selectedMethodKey) || null,
    [families, selectedMethodKey],
  );
  const selectedPhrases = useMemo(
    () => (Array.isArray(selectedGroup?.phrases) ? selectedGroup.phrases : []).map(phraseOf).filter(Boolean).slice(0, 30),
    [selectedGroup],
  );
  const methodCards = useMemo(() => methodProfileState.rows.map((profile) => ({
    profile,
    family: families.find((group) => methodKey(group) === profile.methodKey) || null,
  })), [methodProfileState.rows, families]);
  const visibleMethods = showAllMethods ? methodCards : methodCards.slice(0, 6);
  const visibleExpressions = showAllExpressions ? expressions : expressions.slice(0, 18);

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
    if (!Number.isSafeInteger(next) || next === root) {
      setMethodResultState({ loading: false, data: null, error: null });
      return undefined;
    }
    let alive = true;
    setMethodResultState({ loading: true, data: null, error: null });
    fetchEntityHubProjection({
      type: "number",
      key: String(next),
      relationLimit: 70,
      researchLimit: 36,
      topicLimit: 12,
    }).then((nextData) => {
      if (alive) setMethodResultState({ loading: false, data: nextData || null, error: null });
    }).catch((error) => {
      if (alive) setMethodResultState({ loading: false, data: null, error });
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

  const observatoryItems = {
    meeting: leadMeeting ? {
      kicker: "מפגש",
      title: clean(leadMeeting.title) || `מפגש סביב ${root}`,
      note: Array.isArray(leadMeeting.numbers) ? leadMeeting.numbers.slice(0, 5).join(" · ") : null,
    } : null,
    expression: leadExpression ? {
      kicker: "ביטוי",
      title: leadExpression.phrase,
      note: `${leadExpression.method} → ${root}`,
    } : null,
    source: leadSource ? {
      kicker: "מקור",
      title: sourceLabel(leadSource),
      note: sourceDetail(leadSource) || "מקור מחקרי",
    } : null,
    path: leadPath ? {
      kicker: "שביל",
      title: `${root} → ${leadPath.target}`,
      note: leadPath.topic ? clean(leadPath.topic.title) || "דרך מפגש" : "Zero Scale · נגזרת",
    } : null,
  };

  const whySignals = useMemo(() => {
    const signals = [];
    if (anchorRow?.hint || anchorRow?.fact) signals.push({
      kind: "Anchor",
      title: "הקשר מחקרי אצור",
      text: clean(anchorRow?.hint || anchorRow?.fact),
    });
    if (topics.length) signals.push({
      kind: "מפגשים",
      title: `${topics.length} מפגשים זמינים`,
      text: clean(leadMeeting?.title) || "כמה שכבות מחקר נפגשות סביב המספר.",
    });
    if (sources.length) signals.push({
      kind: "מקורות",
      title: `${sources.length} מקורות בהקרנה`,
      text: sourceLabel(leadSource),
    });
    if (math?.families?.length) signals.push({
      kind: "מתמטיקה",
      title: MATH_FAMILY_HE[math.families[0]?.key] || math.families[0]?.label || "פרופיל מתמטי",
      text: math.families.slice(0, 3).map((family) => MATH_FAMILY_HE[family.key] || family.label).join(" · "),
    });
    if (leadPath) signals.push({
      kind: "מסלול",
      title: `יש שביל ל־${leadPath.target}`,
      text: leadPath.topic ? clean(leadPath.topic.title) || "דרך מפגש ציבורי" : "דרך Zero Scale קנוני.",
    });
    if (leadMedia) signals.push({
      kind: "מדיה",
      title: "יש ייצוג חזותי מחובר",
      text: clean(leadMedia.label || leadMedia.description) || "מדיה ציבורית עם relation provenance.",
    });
    return signals.slice(0, 5);
  }, [anchorRow, topics, sources, math, leadPath, leadMedia, leadMeeting, leadSource]);

  const nextStep = leadMeeting
    ? { title: "פתח את המפגש בעולם", text: clean(leadMeeting.title), action: () => openWorld({ meetingSlug: leadMeeting.slug || null }) }
    : leadPath
      ? { title: `בדוק את השביל ל־${leadPath.target}`, text: "המשך לעוגן הבא בלי לאבד את החזרה.", action: () => navigate(`/2029/number/${leadPath.target}`) }
      : { title: "פתח את המספר בעולם", text: "ראה את הקשרים סביב העוגן באותה Research Context.", action: () => openWorld() };

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
    ? methodResultState.data
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

  const activeMethodLabel = selectedMethodProfile?.displayLabel || methodLabel(selectedGroup);

  useEffect(() => {
    if (!Number.isInteger(root)) return;
    const subject = {
      id: String(root),
      type: "number",
      label: String(root),
      href: `/2029/number/${root}`,
    };
    const selection = {
      entityId: String(root),
      entityType: "number",
      expression: activeExpression || null,
      method: selectedMethodProfile?.methodKey || selectedMethodKey || null,
      resultValue: Number.isFinite(Number(activeResult)) ? Number(activeResult) : null,
    };
    const current = research.context;
    if (current?.subject?.type === "number" && String(current.subject.id) === String(root)) {
      research.updateResearchContext?.({ selection, lens: "number" });
    } else {
      research.setResearchContext?.({ subject, selection, lens: "number", locale: "he" });
    }
  }, [root, activeExpression, selectedMethodProfile?.methodKey, selectedMethodKey, activeResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const openWorld = ({ journey = false, meetingSlug = null } = {}) => {
    if (!Number.isInteger(root)) return;
    const current = research.context || {};
    const subject = {
      id: String(root),
      type: "number",
      label: String(root),
      href: `/2029/number/${root}`,
    };
    const selection = {
      entityId: String(root),
      entityType: "number",
      expression: activeExpression || null,
      method: selectedMethodProfile?.methodKey || selectedMethodKey || null,
      resultValue: Number.isFinite(Number(activeResult)) ? Number(activeResult) : null,
    };
    const returnTo = {
      href: `/2029/number/${root}`,
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
          numberHome: `/2029/number/${root}`,
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
    const subject = { id: String(root), type: "number", label: String(root), href: `/2029/number/${root}` };
    const selection = {
      entityId: String(root),
      entityType: "number",
      expression: activeExpression || null,
      method: selectedMethodProfile?.methodKey || selectedMethodKey || null,
      resultValue: Number.isFinite(Number(activeResult)) ? Number(activeResult) : null,
    };
    research.setResearchContext?.({
      subject,
      selection,
      lens: "heichal",
      locale: current.locale || "he",
      dimensions: {
        ...(current.dimensions || {}),
        numberHome: `/2029/number/${root}`,
        methodSpatialExplain: focus && typeof focus === "object" ? focus : {},
      },
      returnTo: {
        href: `/2029/number/${root}`,
        label: `דף ${root}`,
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
    const numberCoreFocus = {
      root,
      expression: activeExpression || null,
      method: selectedMethodProfile?.methodKey || selectedMethodKey || null,
      resultValue: Number.isFinite(Number(activeResult)) ? Number(activeResult) : null,
      crossingPartner: coreProjection?.crossing?.partner || null,
      zeroScaleNext: coreProjection?.zeroScale?.next ?? null,
      ...(focus && typeof focus === "object" ? focus : {}),
    };
    research.updateResearchContext?.({
      selection: {
        entityId: String(root),
        entityType: "number",
        expression: activeExpression || null,
        method: selectedMethodProfile?.methodKey || selectedMethodKey || null,
        resultValue: Number.isFinite(Number(activeResult)) ? Number(activeResult) : null,
      },
      lens: "number",
      dimensions: {
        ...(research.context?.dimensions || {}),
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
      navigate(`/2029/number/${Number(raw)}`);
      return;
    }
    try {
      const rows = await fetchNumberMethodProfile(raw);
      const regular = rows.find((row) => {
        const label = clean(row?.displayLabel || row?.methodKey).replace(/[\s"'״׳’‘\-_/]/g, "");
        return label === "רגיל" || clean(row?.methodKey) === "רגיל";
      }) || rows[0] || null;
      const next = Number(regular?.computedValue);
      if (!Number.isSafeInteger(next)) {
        setActiveExpression(raw);
        if (regular?.methodKey) setSelectedMethodKey(regular.methodKey);
        return;
      }
      research.setResearchContext?.({
        subject: { id: String(next), type: "number", label: String(next), href: `/2029/number/${next}` },
        selection: {
          entityId: String(next),
          entityType: "number",
          expression: raw,
          method: regular?.methodKey || null,
          resultValue: next,
        },
        lens: "number",
        locale: research.context?.locale || "he",
        returnTo: next === root ? research.context?.returnTo || null : (Number.isSafeInteger(root) ? {
          href: `/2029/number/${root}`,
          label: `דף ${root}`,
          subject: research.context?.subject || null,
          selection: research.context?.selection || null,
          lens: research.context?.lens || "number",
          dimensions: research.context?.dimensions || {},
          journey: research.context?.journey || null,
        } : null),
      });
      if (next === root) {
        setActiveExpression(raw);
        if (regular?.methodKey) setSelectedMethodKey(regular.methodKey);
        setTraceOpen(false);
        return;
      }
      navigate(`/2029/number/${next}`);
    } catch {
      setActiveExpression(raw);
    }
  };

  const openNumberRoot = (nextValue) => {
    const next = Number(nextValue);
    if (!Number.isSafeInteger(next)) return;
    const selection = {
      entityId: String(root),
      entityType: "number",
      expression: activeExpression || null,
      method: selectedMethodProfile?.methodKey || selectedMethodKey || null,
      resultValue: Number.isFinite(Number(activeResult)) ? Number(activeResult) : null,
    };
    research.setResearchContext?.({
      subject: { id: String(next), type: "number", label: String(next), href: `/2029/number/${next}` },
      selection: { entityId: String(next), entityType: "number", expression: activeExpression || null, method: selectedMethodProfile?.methodKey || selectedMethodKey || null },
      lens: "number",
      locale: research.context?.locale || "he",
      returnTo: {
        href: `/2029/number/${root}`,
        label: `דף ${root}`,
        subject: { id: String(root), type: "number", label: String(root), href: `/2029/number/${root}` },
        selection,
        lens: "number",
        dimensions: research.context?.dimensions || {},
        journey: research.context?.journey || null,
      },
    });
    navigate(`/2029/number/${next}`);
  };

  const chooseExpression = (item) => {
    if (!item?.phrase) return;
    setActiveExpression(item.phrase);
    if (item.methodKey) setSelectedMethodKey(item.methodKey);
    setTraceOpen(false);
    setObservatoryFocus("expression");
    document.getElementById("number-methods")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openFocusAction = () => {
    if (observatoryFocus === "meeting" && leadMeeting) return openWorld({ meetingSlug: leadMeeting.slug || null });
    if (observatoryFocus === "expression" && leadExpression) return chooseExpression(leadExpression);
    if (observatoryFocus === "source") return document.getElementById("number-sources")?.scrollIntoView({ behavior: "smooth" });
    if (observatoryFocus === "path" && leadPath) return navigate(`/2029/number/${leadPath.target}`);
    return null;
  };

  const focusCopy = (() => {
    if (observatoryFocus === "meeting" && leadMeeting) return {
      kicker: "מפגש",
      title: clean(leadMeeting.title) || `מפגש סביב ${root}`,
      text: clean(leadMeeting.subtitle) || "כמה שכבות נפגשות סביב אותו עוגן.",
      action: "פתח בעולם",
    };
    if (observatoryFocus === "expression" && leadExpression) return {
      kicker: "ביטוי",
      title: leadExpression.phrase,
      text: `${leadExpression.method} → ${root}. לחץ כדי להעביר אותו לביטוי הפעיל ולפתוח Trace.`,
      action: "העבר לביטוי הפעיל",
    };
    if (observatoryFocus === "source" && leadSource) return {
      kicker: "מקור",
      title: sourceLabel(leadSource),
      text: sourceDetail(leadSource) || "מקור שמופיע בהקרנה הנוכחית של המספר.",
      action: "למקורות",
    };
    if (observatoryFocus === "path" && leadPath) return {
      kicker: "שביל",
      title: `${root} → ${leadPath.target}`,
      text: leadPath.topic ? clean(leadPath.topic.title) || "הנתיב מגיע דרך מפגש קיים." : "Zero Scale · DERIVATION — אותו שורש בסדר גודל אחר, לא שוויון.",
      action: `פתח ${leadPath.target}`,
    };
    return {
      kicker: "LIVING NUMBER",
      title: String(root),
      text: clean(anchorRow?.hint || anchorRow?.fact) || "המספר פתוח כמערכת מחקר חיה: חישוב, מפגשים, מקורות ונתיבים.",
      action: null,
    };
  })();

  if (!Number.isInteger(root) || root < 0) {
    return <FrameState kind="error" title="המספר לא תקין">הדוגמה הזאת מקבלת כרגע מספר שלם בלבד.</FrameState>;
  }
  if (state.loading) {
    return <FrameState kind="loading" title={`פותח את ${root}`}>טוען את ליבת המספר מה־2029 projection.</FrameState>;
  }
  if (state.error || !data) {
    return <FrameState kind="unavailable" title="דף המספר לא זמין כרגע">לא מוצג חומר חלופי ולא נעשה fallback ל־Legacy בתוך עץ 2029.</FrameState>;
  }

  return <div className="sod29-number-page" data-number-root={root} data-truth-safe="true">
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
        languageBridges={languageBridgeState.rows}
        onResolveQuery={resolveNumberQuery}
        onMethodSelect={(key) => { setSelectedMethodKey(key); setTraceOpen(false); }}
        onToggleTrace={() => setTraceOpen((value) => !value)}
        onOpenCrossing={(crossing) => askRaziel("explain_crossing", { kind: "crossing", partner: crossing?.partner || null, methods: crossing?.methods || [] })}
        onOpenZero={openNumberRoot}
        onOpenResult={openNumberRoot}
        onOpenWorld={() => openWorld()}
        onOpenHeichal={openHeichal}
        onOpenJourney={root === 878 ? () => openWorld({ journey: true }) : null}
        journeyLabel={root === 878 ? "צא למסע 878" : null}
        onRazielAction={askRaziel}
        onExpandRaziel={() => askRaziel("expand_panel")}
      />

      <div className="sod29-number-observatory" aria-label={`מצפה המספר ${root}`}>
        <ObservatoryNode item={observatoryItems.meeting} active={observatoryFocus === "meeting"} onClick={() => setObservatoryFocus("meeting")} />
        <ObservatoryNode item={observatoryItems.expression} active={observatoryFocus === "expression"} onClick={() => setObservatoryFocus("expression")} />
        <div className={`sod29-number-observatory-center is-${observatoryFocus}`}>
          <button className="sod29-number-observatory-reset" type="button" onClick={() => setObservatoryFocus("now")} aria-label="חזור למבט החי">
            <span className="sod29-number-observatory-pulse" aria-hidden="true"><i /></span>
          </button>
          <span className="sod29-kicker">{focusCopy.kicker}</span>
          <strong>{focusCopy.title}</strong>
          <p>{focusCopy.text}</p>
          <div className="sod29-number-observatory-context">
            <span>{families.length} שיטות</span>
            <span>{topics.length} מפגשים</span>
            <span>{sources.length} מקורות</span>
            {activityCount ? <span>{activityCount} פעילויות</span> : null}
          </div>
          {focusCopy.action ? <button className="sod29-action" type="button" onClick={openFocusAction}>{focusCopy.action}</button> : null}
        </div>
        <ObservatoryNode item={observatoryItems.source} active={observatoryFocus === "source"} onClick={() => setObservatoryFocus("source")} />
        <ObservatoryNode item={observatoryItems.path} active={observatoryFocus === "path"} onClick={() => setObservatoryFocus("path")} />
      </div>

      <div className="sod29-number-jumpbar" aria-label="ניווט בדף המספר">
        <button type="button" onClick={() => document.getElementById("number-why-now")?.scrollIntoView({ behavior: "smooth" })}>למה עכשיו</button>
        <button type="button" onClick={() => document.getElementById("number-methods")?.scrollIntoView({ behavior: "smooth" })}>שיטות</button>
        <button type="button" onClick={() => document.getElementById("number-expressions")?.scrollIntoView({ behavior: "smooth" })}>ביטויים</button>
        <button type="button" onClick={() => document.getElementById("number-meetings")?.scrollIntoView({ behavior: "smooth" })}>מפגשים</button>
        <button type="button" onClick={() => document.getElementById("number-paths")?.scrollIntoView({ behavior: "smooth" })}>מסע</button>
        <button type="button" onClick={() => document.getElementById("number-sources")?.scrollIntoView({ behavior: "smooth" })}>מקורות</button>
      </div>
    </section>

    <section className="sod29-section sod29-number-section sod29-number-why-now" id="number-why-now">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">NUMBER INTELLIGENCE · DETERMINISTIC FIRST</div>
          <h2>למה {root} מעניין עכשיו?</h2>
          <p className="sod29-muted">המערכת אינה ממציאה “משמעות”. היא מסכמת אותות שכבר קיימים ומפרידה בין חישוב, הקשר אצור, מקור, מפגש ומסלול. סדר ההצגה הוא contextual projection — לא ציון אמת.</p>
        </div>
      </div>
      <div className="sod29-number-signal-grid">
        {whySignals.map((signal, index) => <article className="sod29-number-signal" key={`${signal.kind}:${index}`}>
          <span>{signal.kind}</span>
          <strong>{signal.title}</strong>
          <p>{signal.text}</p>
        </article>)}
      </div>
      <article className="sod29-number-next-step">
        <div><span className="sod29-kicker">NEXT RESEARCH STEP</span><strong>{nextStep.title}</strong><p>{nextStep.text}</p></div>
        <button className="sod29-action primary" type="button" onClick={nextStep.action}>המשך מכאן ←</button>
      </article>
    </section>

    <section className="sod29-section sod29-number-section" id="number-math">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">MATH PASSPORT · CANONICAL CAPABILITY</div>
          <h2>הדרכון המתמטי של {root}</h2>
          <p className="sod29-muted">פרופיל דטרמיניסטי שכבר קיים במערכת. הוא אינו פרשנות ואינו משודרג אוטומטית ל־Fact/Canonical.</p>
        </div>
        <span className="sod29-chip">{math?.arithmetic?.classification || "—"}</span>
      </div>
      {math ? <div className="sod29-number-math-grid">
        <article><span>פירוק</span><strong>{factorizationText(math)}</strong><small>{math.coverage?.factorization_complete ? "הושלם" : "bounded"}</small></article>
        <article><span>φ(n)</span><strong>{math.arithmetic?.totient ?? "—"}</strong><small>Euler totient</small></article>
        <article><span>שורש ספרות</span><strong>{math.digit_structure?.digital_root ?? "—"}</strong><small>סכום ספרות {math.digit_structure?.digit_sum ?? "—"}</small></article>
        <article><span>משפחות</span><strong>{math.families.length}</strong><small>{math.families.slice(0, 3).map((family) => MATH_FAMILY_HE[family.key] || family.label).join(" · ") || "ללא משפחה מיוחדת"}</small></article>
      </div> : <div className="sod29-number-inline-state">הדרכון המתמטי אינו זמין לערך הזה.</div>}
      {math?.families?.length ? <div className="sod29-number-family-rail">{math.families.map((family) => <span key={family.key}>{MATH_FAMILY_HE[family.key] || family.label}</span>)}</div> : null}
    </section>

    <section className="sod29-section sod29-number-section" id="number-methods">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">METHOD LENS</div>
          <h2>שיטות שחיות על {root}</h2>
          <p className="sod29-muted">כל כרטיס מראה שיטה, כמה ביטויים מגיעים דרכה ל־{root}, ודוגמה אמיתית. בחירה בשיטה אינה משנה את ה־Root — רק את עדשת החישוב הפעילה.</p>
        </div>
        {families.length > 6 ? <button className="sod29-action" type="button" onClick={() => setShowAllMethods((v) => !v)}>{showAllMethods ? "פחות שיטות" : `כל ${families.length} השיטות`}</button> : null}
      </div>

      <div className="sod29-number-method-grid" role="list">
        {visibleMethods.map(({ profile, family }) => {
          const key = profile.methodKey;
          const active = key === selectedMethodKey;
          const sample = phraseOf(family?.phrases?.[0]);
          return <button
            type="button"
            role="listitem"
            key={key}
            className={`sod29-number-method-card${active ? " is-active" : ""}`}
            aria-pressed={active}
            onClick={() => {
              setSelectedMethodKey(key);
              setTraceOpen(false);
              setObservatoryFocus("now");
            }}
          >
            <span>{profile.displayLabel}</span>
            <strong>→ {profile.computedValue ?? "—"}</strong>
            <small>{Number(family?.count ?? family?.phrases?.length ?? 0)} ביטויים על {root}</small>
            {sample ? <p>{sample}</p> : null}
          </button>;
        })}
      </div>

      {selectedPhrases.length ? <div className="sod29-number-expression-rail" aria-label="ביטויים בשיטה הפעילה">
        {selectedPhrases.map((phrase) => <button
          type="button"
          key={phrase}
          className={`sod29-number-expression-chip${phrase === activeExpression ? " is-active" : ""}`}
          onClick={() => {
            setActiveExpression(phrase);
            setTraceOpen(false);
            setObservatoryFocus("expression");
          }}
        >{phrase}</button>)}
      </div> : null}

      <div className="sod29-number-trace-card">
        <div>
          <span className="sod29-kicker">ACTIVE CALCULATION</span>
          <h3>{activeExpression || root} · {activeMethodLabel}{activeResult != null ? ` = ${activeResult}` : ""}</h3>
          <p>החישוב מגיע מ־Method Trace. רזיאל יכול לפרש אותו, אבל אינו מחשב את הגימטריה מחדש.</p>
        </div>
        <button className="sod29-action" type="button" disabled={!trace && !traceState.error} onClick={() => setTraceOpen((v) => !v)}>{traceOpen ? "סגור Trace" : "איך מחשבים?"}</button>
      </div>
      {traceState.error ? <div className="sod29-number-inline-state">Trace לא זמין כרגע לשילוב הזה.</div> : null}
      {traceOpen && trace ? <div className="sod29-number-trace-steps">
        {traceSteps.length ? traceSteps.map((step, index) => <span key={`${step}:${index}`}>{step}</span>) : <span>המנוע החזיר Trace מאומת ללא פירוט צעדים להצגה.</span>}
      </div> : null}
    </section>

    <section className="sod29-section sod29-number-section" id="number-expressions">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">LIVE EXPRESSIONS</div>
          <h2>ביטויים שחיים על {root}</h2>
          <p className="sod29-muted">לא רשימת טקסט מתה: כל ביטוי זוכר באיזו שיטה הוא מגיע אל המספר ויכול להפוך מיד לביטוי הפעיל.</p>
        </div>
        <button className="sod29-action" type="button" onClick={() => setShowAllExpressions((v) => !v)}>{showAllExpressions ? "הצג פחות" : `הצג את כל ${expressions.length}`}</button>
      </div>
      {visibleExpressions.length ? <div className="sod29-number-live-expressions">
        {visibleExpressions.map((item) => <button type="button" key={item.phrase} onClick={() => chooseExpression(item)}>
          <strong>{item.phrase}</strong><span>{item.method}</span><small>→ {root}</small>
        </button>)}
      </div> : <div className="sod29-number-inline-state">אין כרגע ביטויים להצגה.</div>}
    </section>

    {worlds.length ? <section className="sod29-section sod29-number-section" id="number-meaning">
      <div className="sod29-section-head"><div><div className="sod29-kicker">MEANING / CONCEPT</div><h2>עולמות ומושגים</h2><p className="sod29-muted">אלה שכבות מחקר קיימות סביב המספר. הן אינן מחליפות את החישוב ואינן מוצגות כמשמעות מיסטית שנוצרה אוטומטית.</p></div></div>
      <div className="sod29-number-card-grid">{worlds.slice(0, 8).map((item, index) => <article className="sod29-number-card" key={item?.world || item?.id || index}><span className="sod29-kicker">{item?.count ? `${item.count} פריטים` : "עולם מחקר"}</span><strong>{clean(item?.world || item?.title || item?.label || item?.name) || "עולם מחקר"}</strong><small>{clean(item?.description || item?.summary || item?.kind) || "שכבת מחקר קיימת"}</small></article>)}</div>
    </section> : null}

    <section className="sod29-section sod29-number-section" id="number-meetings">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">MEETINGS</div>
          <h2>מפגשים סביב {root}</h2>
          <p className="sod29-muted">מפגש הוא מקום שבו כמה שכבות נפגשות סביב אותו עוגן. Meter/quality יכולים לסייע להקרנה, אבל אינם הסתברות אמת.</p>
        </div>
        <span className="sod29-chip">{topics.length}</span>
      </div>
      {topics.length ? <div className="sod29-number-card-grid">
        {topics.slice(0, 8).map((topic) => <article className="sod29-number-card sod29-number-meeting" key={topic.id || topic.slug}>
          <span className="sod29-kicker">מפגש</span>
          <strong>{clean(topic.title) || `מפגש סביב ${root}`}</strong>
          <small>{clean(topic.subtitle) || (Array.isArray(topic.numbers) ? topic.numbers.slice(0, 6).join(" · ") : "מחקר קשור")}</small>
          <div className="sod29-number-card-meta">
            {Array.isArray(topic.numbers) ? <span>{topic.numbers.length} מספרים</span> : null}
            {topic.meter_score != null ? <span>בולטות מחקרית {topic.meter_score}</span> : null}
          </div>
          <button className="sod29-action" type="button" onClick={() => openWorld({ meetingSlug: topic.slug || null })}>פתח בעולם</button>
        </article>)}
      </div> : <div className="sod29-number-inline-state">אין כרגע מפגש ציבורי זמין לעוגן הזה.</div>}
    </section>

    <section className="sod29-section sod29-number-section" id="number-paths">
      <div className="sod29-section-head"><div><div className="sod29-kicker">PATHS · JOURNEY</div><h2>לאן אפשר ללכת מכאן?</h2><p className="sod29-muted">הנתיבים הם תנועה בתוך אותה מציאות מחקרית. כל מעבר צריך לשאת סיבה: מפגש, relation, derivation או מקור. Zero Scale נשאר DERIVATION, לא שוויון.</p></div></div>
      <div className="sod29-number-path-summary">
        <div><strong>{relations.length}</strong><span>קשרי גרף זמינים</span></div>
        <div><strong>{zeroScale.length}</strong><span>תחנות Zero Scale</span></div>
        <div><strong>{researchFindings.length}</strong><span>ממצאים בהקרנה</span></div>
      </div>
      <div className="sod29-number-path-actions">
        {leadPath ? <button className="sod29-number-feature-path" type="button" onClick={() => navigate(`/2029/number/${leadPath.target}`)}>
          <span>שביל מוצע</span><strong>{root} → {leadPath.target}</strong><small>{leadPath.topic ? clean(leadPath.topic.title) || "דרך מפגש" : "Zero Scale · נגזרת"}</small>
        </button> : null}
        {root === 878 ? <button className="sod29-number-feature-path is-golden" type="button" onClick={() => openWorld({ journey: true })}>
          <span>Golden Journey</span><strong>מסע 878</strong><small>פתח את המסילה שכבר חיה בעולם</small>
        </button> : <button className="sod29-number-feature-path" type="button" onClick={() => openWorld()}>
          <span>World</span><strong>פתח את {root} בעולם</strong><small>המשך עם אותו Research Context</small>
        </button>}
      </div>
      {zeroScale.length ? <div className="sod29-number-zero-rail">{zeroScale.slice(0, 10).map((n) => <button key={n} type="button" onClick={() => navigate(`/2029/number/${Number(n)}`)}><strong>{n}</strong><small>{Number(n) === root ? "עוגן" : "Zero Scale · נגזרת"}</small></button>)}</div> : null}
    </section>

    <section className="sod29-section sod29-number-section" id="number-sources">
      <div className="sod29-section-head"><div><div className="sod29-kicker">SOURCES</div><h2>מקורות</h2><p className="sod29-muted">המקור קודם לפרשנות. technical refs נשארים בפרובננס ולא הופכים לכותרת האנושית של הכרטיס.</p></div><span className="sod29-chip">{sources.length}</span></div>
      {sources.length ? <div className="sod29-number-source-list">{sources.slice(0, 12).map((source, index) => <div className="sod29-number-source-row" key={source?.id || source?.ref || index}><div><strong>{sourceLabel(source)}</strong>{sourceDetail(source) ? <small>{sourceDetail(source)}</small> : null}</div><span>מקור</span></div>)}</div> : <div className="sod29-number-inline-state">אין כרגע מקור אנושי זמין להצגה בדוגמה הזאת.</div>}
    </section>

    {mediaItems.length ? <section className="sod29-section sod29-number-section" id="number-media">
      <div className="sod29-section-head"><div><div className="sod29-kicker">MEDIA / REPRESENTATION</div><h2>ייצוגים חזותיים</h2><p className="sod29-muted">מדיה היא Representation עם provenance ו־placement; היא אינה ראיה עצמאית רק מפני שהשתמשו באותה תמונה בכמה מקומות.</p></div><span className="sod29-chip">{mediaItems.length}</span></div>
      <div className="sod29-number-media-grid">{mediaItems.slice(0, 6).map((item) => <figure key={item.galleryImageId || item.nodeId}><img src={item.thumbUrl || item.imageUrl} alt={item.label || "ייצוג חזותי"} loading="lazy" /><figcaption><strong>{item.label || "מדיה"}</strong><small>{item.relationType || "related"} · {item.imageType || "image"}</small></figcaption></figure>)}</div>
    </section> : null}

    {timeline.length ? <section className="sod29-section sod29-number-section" id="number-living-research">
      <div className="sod29-section-head"><div><div className="sod29-kicker">LIVING RESEARCH</div><h2>ציר המחקר</h2><p className="sod29-muted">זמן מחקר/יצירה אינו זמן האירוע ואינו הופך טענה לאמת. כאן רואים רק את רצף החומר שה־projection הנוכחי יכול להציג.</p></div></div>
      <div className="sod29-number-timeline">{timeline.slice(-8).reverse().map((item, index) => <div key={item.id || index}><time>{item.at ? new Date(item.at).toLocaleDateString("he-IL") : "—"}</time><strong>{clean(item.label) || item.kind || "פריט מחקר"}</strong><small>{clean(item.kind) || "research"}{item.status ? ` · ${item.status}` : ""}</small></div>)}</div>
    </section> : null}
  </div>;
}

export default function Number2029Page() {
  const { value } = useParams();

  useEffect(() => {
    applySeo({
      title: `${value || "מספר"} · Number 2029 Preview`,
      description: "דוגמת Living Number Observatory — Number / Expression native של SOD1820 2029",
      path: `/2029/number/${value || ""}`,
      noindex: true,
    });
  }, [value]);

  return <Sod2029Shell
    surface="number"
    symbol="123"
    status="V7 NUMBER CORE · BRANCH ONLY"
  >
    <NumberPageBody />
  </Sod2029Shell>;
}
