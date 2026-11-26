import { startElsTelemetry } from "../../lib/research/elsTelemetryRuntime2029.js";
import { parseElsHitKey } from "../../lib/elsJourney.js";
import { presentElsStructureFamilies } from "../../lib/research/elsStructurePresentation.js";
import { describeElsDiscoveryPlan, elsResearchNextStep } from "../../lib/research/elsResearchAssessment.js";
import React, { useEffect, useMemo, useRef, useState } from "react";
import CanonicalProgress from "../CanonicalProgress.jsx";
import { elsLexiconWindowKey, ELS_LEXICON_PRESETS, expandElsLexiconPlan, filterElsForwardSource } from "../../lib/research/elsLexiconResearch.js";
import { elsStructureView, inspectElsStructures, isElsStructureMemberMarked, verifiedElsStructureCards, ELS_DISCOVERY_GROUP_LABELS } from "../../lib/research/elsStructureInspection.js";
import { projectElsDiscoveryStructures, prepareElsStructureAdditions, prepareElsStructureRestore } from "../../lib/research/elsDiscoveryStructureSources.js";
import ElsJointDiscovery2029 from "./ElsJointDiscovery2029.jsx";
import ElsStructureResearch2029 from "./ElsStructureResearch2029.jsx";
// Loaded on demand (Speed Law): the quality, notable-skip and angle panel only costs a request when its section is opened.
const ElsQualityMeter2029 = React.lazy(() => import("./ElsQualityMeter2029.jsx"));
import ElsSavedDiscovery2029 from "./ElsSavedDiscovery2029.jsx";
import { captureElsDiscoverySource, elsSavedDiscoveryMatches, elsDiscoveryResponseMatches } from "../../lib/research/elsSavedDiscovery.js";
import "./royal2029.css";
import "./elsLexiconResearch2029.css";

const errors = {
  "window-too-large": "חלון המחקר גדול מתקציב הסריקה. הקטינו אותו ונסו שוב.",
  "lexicon-unavailable": "אוצר הלשון לא נטען או לא עבר בדיקת תקינות. לא בוצעה סריקה.",
  "results-changed": "המופע השתנה. הפעילו סריקה חדשה במפורש.",
  "continuation-unavailable": "נקודת ההמשך אינה זמינה לחלון הזה. אפשר להתחיל סריקה חדשה.",
  "scan-failed": "הסריקה לא הושלמה. אין להסיק מכך שאין מילים באזור.",
};

const coverageLabel = coverage => `${coverage.completedRays} מתוך ${coverage.totalRays} קווים נבדקו · ${coverage.remainingRays} נותרו · ${coverage.els} מועמדי ELS · ${coverage.source} רצפי מקור`;
const structureFilters = [
  ["all", "כל הקשרים", []],
  ["intersections", "חיתוכים", ["intersection", "transversal"]],
  ["lines", "קווים", ["parallel", "continuation", "corridor"]],
  ["repeats", "חזרות", ["motif"]],
  ["clusters", "קבוצות קרבה", ["cluster"]],
];
const belongsTo = (card, types) => !types.length || card.types.some(type => types.includes(type));
const memberKey = card => card.members.map(member => `${member.term}:${member.hitId}`).sort().join("|");
const sourceLabel = ({ run }) => `${run.data.plan?.mode === "language" ? "ביטויים" : "מילים"}${run.data.savedSnapshot ? " · שמורה" : ""}${run.startedAt ? ` · ${run.startedAt}` : ""}`;

export default function ElsLexiconResearch2029({
  telemetrySource, state, scanWindow, visible, view, busy, response, onRequest, onRestore, onAdd, color, onFocus, onFindWords,
  onProgress, onOpenFable, onOpenDiscovery, projection, onShow, selectedKey, readingExtension, structureTools, onShowStructure, findingsOperation, viewNavigation, returnProjection, discoveryId, onQualityRun,
}) {
  const [run, setRun] = useState(null), [notice, setNotice] = useState("");
  const [structureSort, setStructureSort] = useState("diverse");
  const [page, setPage] = useState(0), [groupType, setGroupType] = useState("all");
  const [{ result, runs }, setDiscovery] = useState({ result: null, runs: {} });
  const [pendingStructure, setPendingStructure] = useState(null);
  const [inspectionVisited, setInspectionVisited] = useState(false);
  const [qualityVisited, setQualityVisited] = useState(false);
  const [plan, setPlan] = useState({ mode: "language", minLength: 5, maxLength: 16, maxDistance: 120, minMembers: 2 });
  const [hideForwardSource, setHideForwardSource] = useState(false);
  const [excludedSourceIds, setExcludedSourceIds] = useState([]);
  const languagePlan = plan.mode === "language";
  const [discoveryMode, setDiscoveryMode] = useState("language");
  const scanButton = useRef(null);
  const active = useRef(null), request = useRef(onRequest); request.current = onRequest;
  const queue = useRef([]);
  const scanState = scanWindow === undefined ? state : scanWindow ? { ...state, geometry: scanWindow.geometry } : null;
  const key = elsLexiconWindowKey(scanState);
  const cancel = (message = "המעקב הופסק ונשלחה בקשת ביטול למנוע. תוצאות מאוחרות לא יצורפו; אפשר להתחיל שוב בלחיצה.") => {
    queue.current = [];
    if (!active.current) return;
    active.current.telemetry?.cancel(); active.current.telemetry?.update("tracking_stopped");
    request.current({ ...active.current.target, cancel: true }); active.current = null; setRun(null); setNotice(message);
  };
  const pause = () => {
    const operation = active.current;
    if (!operation || operation.pausing) return;
    if (operation.target.plan.mode === "language") { cancel(); return; }
    queue.current = [];
    operation.pausing = true;
    request.current({ ...operation.target, pause: true });
  };
  useEffect(() => {
    if (!active.current) return;
    if (busy || key !== active.current.key) cancel("הסריקה נעצרה בעקבות שינוי החלון או המופע. הממצאים שנאספו במקטעים הקודמים נשמרו.");
    else if (!visible) pause();
  }, [visible, busy, key]);
  useEffect(() => () => {
    if (active.current) { active.current.telemetry?.cancel();active.current.telemetry?.update("tracking_stopped");request.current({ ...active.current.target, cancel: true }); }
    active.current = null;
  }, []);
  const progress = run && response?.pending && response.target?.scanId === run.target.scanId && run.key === key ? response : null;
  const liveCoverage = progress?.coverage;
  const phase = !run ? null : Number.isInteger(liveCoverage?.remainingRays) ? coverageLabel(liveCoverage)
    : progress?.phase === "scan" ? "בודק קווים בחלון הגילוי…" : "טוען ומאמת את אוצר הלשון…";
  useEffect(() => { onProgress(phase); }, [phase, onProgress]);
  useEffect(() => () => onProgress(null), [onProgress]);
  useEffect(() => {
    if (!run) return;
    const timer = setTimeout(() => cancel("הטעינה או הסריקה לא הסתיימו בזמן. המעקב הופסק ונשלחה בקשת ביטול; אפשר לנסות שוב במפורש."), 45000);
    return () => clearTimeout(timer);
  }, [run?.target.scanId]);
  useEffect(() => {
    if (!active.current || response?.target?.scanId !== active.current.target.scanId || active.current.key !== key) return;
    if (response.pending) return;
    const { key: runKey, previous, source, startedAt, target, sourceState, telemetry } = active.current; active.current = null; setRun(null);
    if (!response.ok) {
      telemetry?.update("failed");
      queue.current = []; setNotice(errors[response.reason] || errors["scan-failed"]);
      if (previous && response.reason === "continuation-unavailable") {
        const expired = { ...previous, data: { ...previous.data, continuation: null } };
        setDiscovery(current => ({ result: current.result === previous ? expired : current.result, runs: { ...current.runs, words: expired } }));
      }
      return;
    }
    const data = previous ? { ...response, items: [...previous.data.items, ...response.items] } : response;
    // The start snapshot owns this response. A changed UI can never lend it a new origin.
    if (source && !elsDiscoveryResponseMatches(source, response)) {
      telemetry?.update("failed");
      queue.current = []; setNotice("תשובת הסריקה אינה תואמת למקור הבקשה; היא לא צורפה למטריצה."); return;
    }
    telemetry?.update("done",{partial:response.coverage?.complete!==true,count:response.items?.length});
    const finished = { key: runKey, state: sourceState, data, source, id: previous?.id || target.scanId,
      startedAt: previous?.startedAt || startedAt, endedAt: new Date().toISOString() };
    const mode = response.plan?.mode === "language" ? "language" : "words";
    setDiscovery(current => ({ result: finished, runs: { ...current.runs, [mode]: finished } }));
    setPage(0); setNotice("");
    const next = queue.current.shift();
    if (next) startPlan(next);
  }, [response, key]);
  const startPlan = (selectedPlan, previous = null) => {
    if (!visible || busy || !key || active.current) return;
    const target = { scanId: crypto.randomUUID(), hitId: state.axis.hitId, scope: state.scope, plan: { ...selectedPlan },
      ...(previous ? { resumeId: previous.data.continuation } : {}),
      ...(scanWindow ? { foldWindowId: scanWindow.id } : {}) };
    const next = { key, target, previous, sourceState: scanState, telemetry:startElsTelemetry("discovery",{...telemetrySource,mode:"research",scope:state.scope}),
      source: previous?.source || captureElsDiscoverySource(state, scanState, returnProjection), startedAt: new Date().toISOString() };
    active.current = next; setRun(next); setNotice(""); onRequest(target);
  };
  const start = () => { queue.current = []; startPlan(plan); };
  const startBoth = () => {
    const words = plan.mode === "language" ? { ...plan, mode: "words", minLength: 5, maxLength: 10 } : { ...plan, mode: "words" };
    queue.current = [words];
    startPlan({ ...plan, mode: "language", minLength: 5, maxLength: 16 });
  };
  const updatePlan = (field, value) => setPlan(current => {
    const next = { ...current, [field]: Number(value) };
    if (field === "minLength" && next.maxLength < next.minLength) next.maxLength = next.minLength;
    if (field === "maxLength" && next.minLength > next.maxLength) next.minLength = next.maxLength;
    return next;
  });
  const data = result?.data, current = result?.key === key && !!key;
  const wordRun = runs.words?.key === key && key ? runs.words : null;
  const languageInspection = runs.language?.key === key ? runs.language?.data.languageInspection : null;
  // Findings/zoom notifications cannot repeat quadratic grouping when source/window did not change.
  const presented = useMemo(() => projectElsDiscoveryStructures(scanState, runs, { hideForwardSource, excludedIds: excludedSourceIds }),
    [key, state?.corpusLetters, runs, hideForwardSource, excludedSourceIds]);
  const latestItems = data ? filterElsForwardSource(data.items, hideForwardSource) : [];
  const structures = presented.structures, groups = presented.groups;
  const inspection = useMemo(() => visible && view === "structures" ? inspectElsStructures(scanState) : null, [visible, view, scanState]);
  const markedCards = useMemo(() => verifiedElsStructureCards(inspection), [inspection]);
  const groupOrigin = presented.included[0]?.run.data.origin;
  const axisMember = groupOrigin ? { term: groupOrigin.term, hitId: state.axis.hitId, kind: "axis", dir: groupOrigin.dir,
    positions: Array.from(groupOrigin.term, (_, i) => groupOrigin.start + i * groupOrigin.dir * groupOrigin.skip) } : null;
  const markedKeys = new Set(markedCards.map(memberKey));
  const discoveryCards = groups.map(group => ({ ...group, members: group.includesAxis ? [axisMember, ...group.items] : group.items }));
  const cards = [...markedCards.map(card => {
    const discovered = discoveryCards.find(found => memberKey(found) === memberKey(card));
    return discovered ? { ...card, sources: discovered.sources, memberSources: discovered.memberSources } : card;
  }), ...discoveryCards.filter(card => !markedKeys.has(memberKey(card)))];
  const types = structureFilters.find(([id]) => id === groupType)[2];
  const rows = cards.filter(card => belongsTo(card, types));
  const families = presentElsStructureFamilies(rows, structureSort);
  const nextPlan = data?.plan ? expandElsLexiconPlan(data.plan) : null;
  const pageIndex = Math.min(page, Math.max(0, Math.ceil(families.length / 20) - 1));
  const slice = families.slice(pageIndex * 20, pageIndex * 20 + 20);
  const isAdded = member => isElsStructureMemberMarked(state, member);
  const add = items => {
    if (!structures.ok || run) return;
    if (busy) { setNotice("התוספת הקודמת עדיין באימות. המתינו לסיומה ואז הוסיפו את הבאה."); return; }
    // The host's findings update adds to what is on the matrix. The older full reload is kept only for a host that has no such update.
    if (onAdd) {
      const prepared = prepareElsStructureAdditions(scanState, presented, items, color);
      if (prepared.error) {
        setNotice(prepared.error === "limit" ? "במטריצה כבר 24 מילים, וזו התקרה. הסירו מילה מרשימת הממצאים ואז הוסיפו."
          : "הגילוי אינו מתאר עוד את המטריצה שעל המסך. הפעילו סריקה חדשה ואז הוסיפו.");
        return;
      }
      const requestId = onAdd(prepared.findings);
      setNotice("נשלח לאימות במנוע. המופעים שאומתו יתווספו למטריצה.");
      return requestId;
    }
    const load = prepareElsStructureRestore(scanState, presented, items, color);
    if (!load) { setNotice("לא ניתן להוסיף: בדקו את המופע ואת מגבלת 24 המילים במטריצה."); return; }
    onRestore?.(load); setNotice("נשלח לאימות במנוע. רק ממצאים שאומתו יסומנו על המטריצה.");
  };
  const showStructure = card => {
    const relation = elsStructureView(card, scanState.geometry.S, state.corpusLetters);
    const viewRequest = { ...relation, axisHitId: state.axis.hitId, scope: state.scope };
    const missing = card.members.filter(member => !isAdded(member));
    if (!missing.length) { onShowStructure(viewRequest); return; }
    const requestId = add(missing);
    if (Number.isInteger(requestId)) setPendingStructure({ requestId, key, viewRequest });
  };
  useEffect(() => {
    if (!pendingStructure) return;
    const { requestId, key: originalKey, viewRequest } = pendingStructure;
    if (!visible || view !== "structures" || state?.axis?.hitId !== viewRequest.axisHitId || (key && key !== originalKey)
      || findingsOperation?.requestId > requestId) { setPendingStructure(null); return; }
    if (!key || findingsOperation?.requestId !== requestId || busy) return;
    setPendingStructure(null);
    if (viewRequest.members.every(isAdded)) {
      setNotice("");
      onShowStructure(viewRequest);
    } else setNotice("חלק מהמופעים ממתינים לאימות. אפשר לבדוק אותם ברשימת הממצאים.");
  }, [pendingStructure, key, state, visible, view, busy, findingsOperation, onShowStructure]);
  const overviewRuns = presented.available.map(source => source.run);
  const nextStep = elsResearchNextStep(overviewRuns, { ready: !!key, busy: busy || !!run });
  const launchPlans = discoveryMode === "both" ? [{ ...plan, mode: "language", minLength: 5, maxLength: 16 },
    { ...plan, mode: "words", minLength: 5, maxLength: 10 }] : [{ ...plan, mode: languagePlan ? "language" : "words" }];
  const canResume = discoveryMode === "words" && !!wordRun?.data.continuation
    && ["mode", "minLength", "maxLength", "maxDistance", "minMembers"].every(field => (field === "mode" ? (wordRun.data.plan.mode || "words") === "words" : wordRun.data.plan[field] === plan[field]));
  const planKinds = launchPlans.map(selected => describeElsDiscoveryPlan(selected, overviewRuns).kind);
  const shortStatus = !key ? "ממתינים למטריצה מאומתת" : busy || run ? "פעולה מתבצעת"
    : canResume ? "אפשר להמשיך מהמקום שבו הסריקה נעצרה"
    : planKinds.every(kind => ["repeat", "sample"].includes(kind)) ? "המסלול הזה כבר נבדק"
    : planKinds.some(kind => kind !== "new") ? "חלק מהמסלול כבר נבדק" : "מוכן לגילוי · ללא AI";
  const renderStructureCard = card => {
          const ready = card.members.every(isAdded);
          return <li key={memberKey(card)} data-structure-card={card.id} className="els29-structure-card">
            <strong>{card.types.map(type => ELS_DISCOVERY_GROUP_LABELS[type]).join(" · ")}</strong>
            {card.reasons.map(reason => <p key={reason}>{reason}</p>)}
            {card.sources?.length ? <details><summary>מקורות הקבוצה · {card.sources.length} סריקות</summary>
              {card.sources.map(source => <p key={source.id}>{sourceLabel(source)} · {source.run.data.coverage?.complete ? "כיסוי התכנית הושלם" : "כיסוי חלקי"}</p>)}
              {card.memberSources.map(member => <p key={`${member.term}:${member.hitId}`}><bdi>{member.term}</bdi> · {member.sourceIds.length} מקורות לאותו מופע, לא אישורים עצמאיים.</p>)}
            </details> : null}
            <div className="els29-structure-members">{card.members.map(member => <span key={`${member.term}:${member.hitId}`}>
              <bdi>{member.label || member.term}</bdi> <small>{member.kind === "axis" ? "ציר מאומת" : isAdded(member) ? member.kind === "source" ? "רצף מקור" : "מאומת" : "מועמד"}</small>
            </span>)}</div>
            {card.membersTruncated ? <p>מוצגים {card.members.length} מתוך {card.totalMembers} מופעים בקבוצה.</p> : null}
            <button className="r29-btn" type="button" disabled={!key || busy || !!run || !!pendingStructure || !onShowStructure || (!ready && !onAdd)}
              onClick={() => showStructure(card)}>{ready ? "הצג את הקשר" : "אמת והצג קבוצה"}</button>
          </li>;
  };
  return <section hidden={!visible} className="els29-lexicon-research r29" aria-label="גילוי וקשרים במטריצה">
    <header className="els29-discovery-header r29-hall">
      <span className="els29-research-eyebrow">מחקר הצופן</span>
      <strong>גילוי במטריצה הפעילה</strong>
    <label>מה לגלות?<select aria-label="מסלול הגילוי" disabled={!!run} value={discoveryMode}
      onChange={event => { setDiscoveryMode(event.target.value); setPlan(current => event.target.value === "language"
        ? { ...current, mode: "language", minLength: 5, maxLength: 16 }
        : { ...current, mode: "words", minLength: 5, maxLength: 10 }); }}>
      <option value="language">ביטויים וחלוקת רצפים{nextStep.mode === "language" ? " · מומלץ" : ""}</option>
      <option value="words">מילים — התאמה מילונית{nextStep.mode === "words" ? " · מומלץ" : ""}</option>
      <option value="both">מילים וביטויים יחד</option>
    </select></label>
    <p role="status" aria-label="מצב הבדיקה">{shortStatus}</p>
    <div className="els29-discovery-actions">
      <button ref={scanButton} type="button" className="els29-start-discovery r29-btn is-primary" disabled={!key || busy || !!run}
        onClick={canResume ? () => startPlan(wordRun.data.plan, wordRun) : discoveryMode === "both" ? startBoth : start}>
        {canResume ? "המשך סריקה" : "התחל גילוי"}
      </button>
      {onOpenFable ? <button className="r29-btn" type="button" onClick={onOpenFable}>הרחב עם Fable</button> : onFindWords ? <button className="r29-btn" type="button" aria-label="חפש מילה מסוימת" disabled={!key || busy || !!run} onClick={onFindWords}>חפש מילה</button> : null}
    </div>
    {onOpenFable && onFindWords ? <button className="r29-btn" type="button" aria-label="חפש מילה מסוימת" disabled={!key || busy || !!run} onClick={onFindWords}>חפש מילה</button> : null}
    {readingExtension}
    <details className="els29-discovery-settings"><summary>פרטי הסריקה</summary>
      {key ? <p><bdi>{state.term}</bdi> · {state.scope === "tanakh" ? "תנ״ך" : "תורה"} · דילוג <bdi>{state.axis.skip}</bdi> · רווח שורות <bdi>{scanWindow?.rowGap ?? 0}</bdi> · רוחב <bdi>{scanState.geometry.S}</bdi></p> : null}
      <section aria-label="תמונת מצב המחקר">
        <strong>מה כבר נבדק ומה הלאה</strong>
        <p role="status">{nextStep.text}</p>
        <details><summary>כיסוי והקשר · {overviewRuns.length} מקורות תואמים</summary>
          {key ? <p>מופע <bdi>{state.axis.hitId}</bdi> · גרסת קורפוס <bdi>{state.verification.corpus_id}</bdi> · שורות {scanState.geometry.r0}–{scanState.geometry.r1} · עמודות {scanState.geometry.c0}–{scanState.geometry.c0 + scanState.geometry.cw - 1} (מאפס).</p> : null}
          {Object.values(runs).some(scan => scan.key !== key) ? <p>יש תוצאות מהקשר קודם; הן אינן נספרות בכיסוי החלון הנוכחי.</p> : null}
          {presented.available.map(source => <p key={source.id}>{sourceLabel(source)} · {source.run.data.plan.mode === "language" ? "מדגם מוגבל, לא כיסוי מלא" : source.run.data.coverage?.complete ? "התכנית המוגדרת הושלמה" : "כיסוי חלקי"}
            · {source.run.data.coverage?.completedRays ?? "לא ידוע"}/{source.run.data.coverage?.totalRays ?? "לא ידוע"} קווים · {source.run.data.items.length} רשומות לפני איחוד כפילויות.</p>)}
          <p>אין אחוז כיסוי משותף למסלולים. מבנים וקבוצות מנתחים את מה שכבר נאסף, בלי סריקה נוספת.</p>
          <p>Fable מציעה פרשנות וכיווני בדיקה, ואינה משלימה כיסוי מילוני. הצעותיה דורשות אימות במנוע. קריאה אינה מתחילה בפתיחת תוצאה שמורה.</p>
          <p>קריאת Fable משתמשת כיום בהקשר המטריצה המקורי; אין כאן אישור שקראה את ההיטל המחולק או את כל ממצאי הגילוי. פרטי ההפעלה והקריאה נמצאים בכרטיס Fable הקיים.</p>
        </details>
      </section>
    <div aria-label="לפני הפעלת גילוי">{launchPlans.map(selected => <p key={selected.mode}>
      <b>{selected.mode === "language" ? "ביטויים" : "מילים"}</b> · {selected.minLength}–{selected.maxLength} אותיות · עד {selected.maxDistance} תאים. {key ? describeElsDiscoveryPlan(selected, overviewRuns).text : "נדרש חלון מאומת."}
    </p>)}</div>

    {!run && Number.isInteger(wordRun?.data.coverage?.remainingRays) ? <p role="status" aria-label="כיסוי הסריקה">{coverageLabel(wordRun.data.coverage)}</p> : null}
    {!key ? <p>{scanWindow === null ? "הגילוי יהיה זמין כשחלון המטריצה ייטען." : "בחרו מופע מאומת לפני סריקה."}</p>
      : scanWindow ? <p>הגילוי משתמש בחלון המוצג, ברוחב <bdi>{scanWindow.geometry.S}</bdi>.</p> : null}
    {wordRun?.data.continuation && !canResume ? <button className="r29-btn" type="button" disabled={busy || !!run}
      onClick={() => startPlan(wordRun.data.plan, wordRun)}>המשך סריקה קודמת</button> : null}
    {languagePlan ? <p>מילים וחלוקה לשתי מילים על אותו קו, במדגם מוגבל סביב הציר. האותיות נשמרות; הרווחים מוצעים לבדיקה שלכם.</p> : null}
    <details className="els29-discovery-plan"><summary>{languagePlan ? "גבולות בדיקת הביטויים" : "תכנית סריקה · מהיר, רחב או עמוק"}</summary>
      <p>הגדירו אילו מילים לחפש וכמה להתרחק מהציר. שינוי הגדרה אינו מתחיל סריקה.</p>
      {!languagePlan ? <div className="els29-discovery-actions" role="group" aria-label="תבניות סריקה">
        {[["quick", "מהיר"], ["broad", "רחב"], ["deep", "עמוק"]].map(([id, label]) => <button className="r29-btn" type="button" key={id} disabled={!!run}
          aria-pressed={Object.keys(ELS_LEXICON_PRESETS[id]).every(field => plan[field] === ELS_LEXICON_PRESETS[id][field])}
          onClick={() => setPlan({ ...ELS_LEXICON_PRESETS[id] })}>{label}</button>)}
      </div> : null}
      <fieldset disabled={!!run}><legend>גבולות הסריקה בחלון הפעיל</legend>
        {!languagePlan ? <><label>מינימום אותיות<select aria-label="מינימום אותיות בגילוי" value={plan.minLength} onChange={event => updatePlan("minLength", event.target.value)}>
          {[3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
        </select></label>
        <label>מקסימום אותיות<select aria-label="מקסימום אותיות בגילוי" value={plan.maxLength} onChange={event => updatePlan("maxLength", event.target.value)}>
          {[3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
        </select></label></> : <p>5–16 אותיות ברצף מוצג. המילון תומך עד 10 אותיות למילה; רצף ארוך יותר הוא הצעת חיבור של שתי מילים, לא הרחבה של המילון.</p>}
        <label>מרחק מרבי מהציר<select aria-label="מרחק מהציר בגילוי" value={plan.maxDistance} onChange={event => updatePlan("maxDistance", event.target.value)}>
          {[0,4,8,12,30,40,80,120].map(n => <option key={n} value={n}>{n === 0 ? "נוגע בציר בלבד" : `עד ${n} תאים`}</option>)}
        </select></label>
        <label>מינימום מופעים בקבוצה<select aria-label="מינימום מופעים בקבוצה" value={plan.minMembers} onChange={event => updatePlan("minMembers", event.target.value)}>
          {[2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
        </select></label>
      </fieldset>
      {!languagePlan ? <p>המילון הנוכחי תומך עד 10 אותיות. בחירה ב־3–4 אותיות מוגבלת לעד 12 תאים סביב ציר מאומת באורך 5 אותיות ומעלה. „עמוק” מרחיב את התכנית בתוך החלון בלבד, לא את כל התורה.</p>
        : <p>המרחק מסנן את הקריאות שהקורא החזיר; הוא אינו מרחיב את מדגם הקווים או את חלון המטריצה.</p>}
    </details>
    <label className="els29-discovery-source-filter"><input type="checkbox" checked={hideForwardSource}
      onChange={event => { setHideForwardSource(event.target.checked); setPage(0); }} />הסתר טקסט רגיל קדימה — דילוג 1</label>
    <details><summary>היקף הסריקה והמגבלות</summary>
      <p>הסתרת טקסט רגיל חלה על קריאה קדימה בלבד. קריאה לאחור בדילוג 1 נשארת מוצגת, ומסומנת כקריאה הפוכה. הסינון משנה גם את הקבוצות, בלי למחוק תוצאות או להריץ סריקה.</p>
      <p>התכנית הבאה: {plan.minLength}–{plan.maxLength} אותיות · עד {plan.maxDistance} תאים מהציר · לפחות {plan.minMembers} מופעים בקבוצה, כולל הציר כשהוא משתתף. עד 8,192 תאים, 256 שורות ו־129 עמודות.</p>
      <p>{languagePlan ? "קורא הלשון: עד 24 קווים, עד 24 אותיות בכל קו, בשני הכיוונים. עד 9,216 בדיקות רצף ו־196,608 בדיקות באינדקס. עד 24 קריאות ועד 24 חלוקות לפני סינון כפילויות, חלקי ציר ומרחק. אינו סריקה ממצה." : "בכל מקטע: עד 100,000 בדיקות רצף או 10 שניות, עם מכסות נפרדות של 300 מועמדי ELS ו־300 רצפי מקור. המשך הסריקה שומר את מה שכבר נמצא."}</p>
      <p>המילון נטען רק בלחיצה. הסריקה אינה מקיפה את כל התורה, את כל הדילוגים או כל ביטוי עברי. שמות וכתיבים שאינם במילון עלולים להחמיץ; אפשר לחפש אותם ידנית.</p>
      <p>שורות, טורים ושני האלכסונים בשני הכיוונים. קבוצות נבנות רק מההתאמות שנשמרו: מקבילות עד 8 תאים עם תמיכה משותפת, המשכים עד 3 תאים, חיתוכים, חזרות, מסדרונות ואשכולות של 3 מופעים ומעלה עד 4 תאים בין כל זוג. עד 240 קבוצות, עד 8 מופעים בקבוצה.</p>
    </details>
    </details>
    {run ? <CanonicalProgress compact title={run.target.plan.mode === "language" ? "בדיקת ביטויים" : "סריקה מילונית"} phase={progress?.phase === "scan" ? "בודק קווים בחלון" : "טוען ומאמת את אוצר הלשון"}
      detail={Number.isInteger(liveCoverage?.remainingRays) ? coverageLabel(liveCoverage) : null}
      current={liveCoverage?.completedRays ?? null} total={liveCoverage?.totalRays ?? null} onCancel={pause}
      copy={run.target.plan.mode === "language" ? null : { cancel: "השהה סריקה" }} /> : null}
    </header>
    {viewNavigation}
    <div hidden={view !== "discovery"} id="els29-discovery-view">
    <p>המילים והביטויים שנאספו, עם הסבר לסדר ההמלצות ואפשרות להוסיף למטריצה.</p>
    {data ? <details className="els29-discovery-report"><summary>דוח הסריקה האחרונה והכיסוי</summary><div aria-label="תוצאות הסריקה המילונית">
      <p>המופע שנסרק: <bdi>{data.origin.term}</bdi> · {data.origin.corpus === "tanakh" ? "תנ״ך" : "תורה"} · דילוג <bdi>{data.origin.skip}</bdi>.</p>
      {!current ? <p role="note">התוצאה שייכת לחלון קודם. סרקו את החלון הנוכחי לפני הוספת ממצא.</p> : null}
      <p>{data.plan?.mode === "language" ? "בדיקת מדגם קווים — לא סריקה מלאה של החלון" : data.coverage.complete ? "הסריקה המוגדרת הושלמה"
        : data.coverage.stop === "PAUSED" ? "הסריקה הושהתה" : "מקטע הסריקה הסתיים"} · {latestItems.length} קריאות זמינות מתוך {data.items.length} שנאספו בסריקה זו.</p>
      {hideForwardSource ? <p>{data.items.length - latestItems.length} קריאות מקור קדימה הוסתרו בסריקה זו. הקבוצות עודכנו בהתאם.</p> : null}
      {current && nextPlan ? <button className="r29-btn" type="button" disabled={busy || !!run} onClick={() => { setPlan(nextPlan); startPlan(nextPlan); }}>הרחב עוד טבעת · סרוק מחדש עד {nextPlan.maxDistance} תאים</button> : null}
      {nextPlan ? <p>{data.plan?.mode === "language" ? "הרחבה חוזרת על אותו מדגם קווים ומאפשרת להציג קריאות רחוקות יותר מתוכו. היא אינה מוסיפה קווים." : "הרחבה בודקת מחדש את התכנית בטווח רחב יותר בתוך אותו חלון."} האזור שמחוץ לחלון אינו נסרק.</p> : null}
      <p>הקבוצות הן מועמדות לבדיקה. הוספה למטריצה עוברת אימות במנוע.</p>
      {!structures?.ok ? <p role="status">{structures?.reason}</p> : null}
      {structures?.truncated ? <p>מוצג מדגם של עד 240 קבוצות מכל סוגי הקשרים שנמצאו. בחרו סוג קשר למיקוד; המספרים מציינים כמה מוצגות מתוך הקבוצות שנבנו.</p> : null}
      {structures?.excluded ? <p>{structures.excluded} התאמות עם זהות או מיקום לא שלמים לא צורפו לקבוצות.</p> : null}
      <details><summary>מקור, כיסוי וגבולות</summary>
        {data.plan ? <p>בוצע: <bdi>{data.plan.minLength}–{data.plan.maxLength}</bdi> אותיות, עד {data.plan.maxDistance} תאים מהציר, לפחות {data.plan.minMembers} מופעים בקבוצה.</p> : null}
        {hideForwardSource ? <p>הקבוצות נבנו מחדש מהקריאות שנותרו; הסינון אינו משלים התאמות שלא נשמרו בגלל תקרת הסריקה.</p> : null}
        <p>התחלת הציר: <bdi>{data.origin.start}</bdi>. {data.coverage.completedRays}/{data.coverage.totalRays} קווים · {data.coverage.windows} רצפים נבדקו. כדי לחזור לאחר רענון, שמרו במפורש בספריית המחקר.</p>
        <p>הסריקה מצאה התאמות לאותיות, לא דירוג של משמעות או נדירות. חלקי הציר ({data.coverage.axisFragments}) לא נספרו כממצאים חדשים.</p>
        <p>{groups.length} קבוצות משולבות מוצגות מתוך {structures?.totalGroups ?? 0} שנבנו ממקורות המבנים הנבחרים. סדר התצוגה נקבע בבורר המבנים; ברירת המחדל מציגה מגוון מילים וקשרים. זה אינו ציון חוזק.</p>
        <p>אוצר: מילות התנ״ך ומילון הליבה, {data.lexicon.entryCount} ערכים. התאמה מדויקת לאחר נרמול אותיות סופיות; אין השלמת אותיות.</p>
        <p>רוחב מטריצה {data.box.S}; שורות {data.box.r0}–{data.box.r1}, עמודות {data.box.c0}–{data.box.c1} (ספירה מאפס). חלון המחקר עשוי להיות גדול מהחלק המוצג במסך.</p>
        <p>סדר ההצגה: קרבה לציר, אורך, מילה ומיקום. הכיסוי מתייחס לחלון ולתכנית הסריקה שנבחרו.</p>
      </details>
      {Object.entries(runs).map(([mode, scan]) => scan.key === key ? <p key={mode}>
        {scan.data.plan?.mode === "language" ? "ביטויים וחלוקת רצפים" : "מילים ומבנים"} · {scan.data.coverage.completedRays}/{scan.data.coverage.totalRays} קווים
      </p> : null)}
    </div></details> : null}
    <ElsJointDiscovery2029 state={scanState} runs={runs} projection={projection} busy={busy || !!run}
      hideForwardSource={hideForwardSource} color={color} onFindingsChange={onAdd} onShow={onShow} selectedKey={selectedKey} />
    </div>
    <div hidden={view !== "depth" && view !== "axis"} id="els29-depth-view">
      <p>הרחבת המחקר: קריאת Fable והצעות חלוקה. כל פעולה מופעלת במפורש.</p>
      {languageInspection ? <details className="els29-language-advanced"><summary>מתקדם · קווים גולמיים והשערות חלוקה</summary>
        <p>רצפים גולמיים אינם מילים מזוהות. גבולות המילים הם השערות לפי פרופיל לשון, לא ממצאים מאומתים. לא בוצעה קריאת AI.</p>
        <p>{languageInspection.coverage.returnedRays} קווים נבחרו מתוך {languageInspection.coverage.totalRays}; כל קו קוצר לעד {languageInspection.coverage.maxLetters} אותיות סביב הציר ונבדק בשני הכיוונים.</p>
        <details><summary>הקווים שנבדקו</summary>{languageInspection.rays.map(ray => <p key={ray.id}><bdi>{ray.text}</bdi> · התחלה <bdi>{ray.start}</bdi> · צעד חתום <bdi>{ray.step}</bdi></p>)}</details>
        <details><summary>דוגמאות גבולות מילים — עד 24 מתוך {languageInspection.boundaries.length}</summary>
          {languageInspection.boundaries.slice(0,24).map((row,index) => <p key={index}><bdi>{row.leftContext} | {row.rightContext}</bdi> · מיקום הגבול <bdi>{row.leftEnd} → {row.rightStart}</bdi></p>)}
        </details>
      </details> : null}

    </div>
    <div hidden={view !== "structures"} id="els29-structures-view">
      <section aria-label="קשרים בין מופעים">
        <p>קשרים בין הממצאים: חיתוכים, קווים, חזרות וקבוצות קרבה. מעבר לכאן אינו מפעיל סריקה נוספת.</p>
        <p>הקבוצות משלבות את הסריקה האחרונה בכל מסלול וסריקות שמורות שצורפו במפורש, באותו מופע ובאותו חלון.</p>
        <details className="els29-structure-sources"><summary>מקורות לניתוח המבנים · {presented.included.length}/{presented.available.length}</summary>
          <p>בחירת המקורות משנה את ניתוח המבנים בלבד; הרשימה המשותפת שומרת את כל המועמדים שצורפו. לפני החלפת סריקה באותו מסלול אפשר לשמור אותה ולצרף אותה שוב.</p>
          {presented.available.map(source => <div key={source.id}>
            <label className="els29-discovery-source-filter"><input type="checkbox" checked={!excludedSourceIds.includes(source.id)} onChange={event => {
              const checked = event.target.checked;
              setExcludedSourceIds(ids => checked ? ids.filter(id => id !== source.id) : [...ids, source.id]); setPage(0);
            }} />{sourceLabel(source)}</label>
            <p>{source.run.data.coverage?.complete ? "הסריקה המוגדרת הושלמה" : "כיסוי חלקי"} · {source.run.data.coverage?.completedRays ?? "לא ידוע"}/{source.run.data.coverage?.totalRays ?? "לא ידוע"} קווים · עד {source.run.data.plan?.maxDistance} תאים · {source.run.data.plan?.minLength}–{source.run.data.plan?.maxLength} אותיות.</p>
          </div>)}
        </details>
        {presented.included.length ? <div aria-label="כיסוי המבנים המשולבים">
          <p>{presented.entries.size} מועמדים ייחודיים מתוך {presented.collected} רשומות ב־{presented.included.length} סריקות; {presented.duplicates} חזרות נספרו פעם אחת. חזרה על אותו מופע אינה אישור עצמאי.</p>
          <p>{presented.analyzed} מתוך {presented.items.length} המועמדים הזמינים נבחרו לתקציב ניתוח המבנים הקיים; {presented.omittedFromStructures} לא השתתפו. {presented.filtered} הוסתרו במסנן המקור; {presented.invalid} נפסלו בגלל זהות או מיקום לא שלמים.</p>
          <p>קבוצה מוצגת החל מ־{presented.minMembers} מופעים, לפי הסף הנמוך במקורות הנבחרים. הכיסוי מוצג לכל סריקה בנפרד; אין לחבר אחוזים של אזורים חופפים.{presented.partial ? " חלק מהמקורות מספקים כיסוי חלקי בלבד." : ""}</p>
        </div> : null}
        {inspection?.ok ? <p>{inspection.lines.length} מופעים מסומנים נבדקו, כולל הציר.</p> : null}
        {inspection?.ok === false && key ? <p>{inspection.reason}</p> : null}
        <div className="els29-structure-filters" role="group" aria-label="סוג הקשר">
          {structureFilters.map(([id, label, filter]) => <button className={`r29-btn${groupType === id ? " is-primary" : ""}`} type="button" key={id} aria-pressed={groupType === id}
            onClick={() => { setGroupType(id); setPage(0); }}>{label} <bdi>{cards.filter(card => belongsTo(card, filter)).length}</bdi></button>)}
        </div>
        {!rows.length ? <p>{cards.length ? "אין קשרים בסינון הזה." : "סמנו מופע נוסף במטריצה או הריצו גילוי כדי לבדוק קשרים."}</p> : null}
        <label>סדר המבנים<select aria-label="סדר המבנים" value={structureSort} onChange={event => { setStructureSort(event.target.value); setPage(0); }}>
          <option value="diverse">מגוון מילים וקשרים</option><option value="type">סוג הקשר</option>
          <option value="length">אורך הממצא</option><option value="distance">קרבה לציר</option>
        </select></label>
        <p>{rows.length} קבוצות ב־{families.length} כרטיסי מופעים · הקיבוץ אינו מוחק קבוצות ואינו ציון איכות. האורך מתייחס לממצא הארוך בקבוצה, ללא הציר.</p>
        <p>קשרים סביב אותו מופע מרוכזים יחד. במיון קרבה, קבוצות ללא נתון מרחק מופיעות בסוף.</p>
        <ol>{slice.map(family => { const anchor = parseElsHitKey(family.member?.hitId); return <li key={family.id} data-structure-family={family.id}>
          <strong>{family.member?.term || "קשרים במטריצה"}</strong>
          {anchor ? <p>מיקום <bdi>{anchor.start}</bdi> · דילוג <bdi>{anchor.skip}</bdi> · {anchor.dir === -1 ? "לאחור" : "קדימה"} · {family.cards.length} קבוצות</p> : null}
          <ol>{renderStructureCard(family.cards[0])}</ol>
          {family.cards.length > 1 ? <details><summary>עוד {family.cards.length - 1} קשרים עם המופע הזה</summary>
            <ol>{family.cards.slice(1).map(renderStructureCard)}</ol>
          </details> : null}
        </li>; })}</ol>
        {families.length > 20 ? <nav aria-label="עמודי מבנים"><button className="r29-btn" type="button" disabled={pageIndex === 0} onClick={() => setPage(pageIndex - 1)}>הקודם</button><span>עמוד {pageIndex + 1} מתוך {Math.ceil(families.length / 20)}</span><button className="r29-btn" type="button" disabled={(pageIndex + 1) * 20 >= families.length} onClick={() => setPage(pageIndex + 1)}>הבא</button></nav> : null}
      </section>
    <details className="els29-discovery-inspection" onToggle={event => { if (event.currentTarget.open) setInspectionVisited(true); }}>
      <summary>בדיקת הסימונים והשוואת מופעים</summary>
      {inspectionVisited ? <ElsStructureResearch2029 state={scanState} visible={visible} busy={busy || !!run} onRestore={onRestore} onFocus={onFocus}
        onFindWords={onFindWords} onOpenLexicon={() => {
          onOpenDiscovery();
          requestAnimationFrame(() => scanButton.current?.focus());
        }} /> : null}
    </details>
    <details className="els29-discovery-inspection" data-els-quality-section onToggle={event => { if (event.currentTarget.open) setQualityVisited(true); }}>
      <summary>איכות הצופן, דילוגים מיוחדים וזוויות</summary>
      {qualityVisited ? <React.Suspense fallback={<p role="status">טוען את נתוני האיכות…</p>}>
        <ElsQualityMeter2029 state={state} busy={busy || !!run} onRunMc={onQualityRun} />
      </React.Suspense> : null}
    </details>
    {structureTools}
    </div>
    {notice ? <p role="status">{notice}</p> : null}
    <footer className="els29-research-storage" aria-label="שמירת תוצאות המחקר">
    <ElsSavedDiscovery2029 key={discoveryId || "library"} runs={runs} state={scanState} busy={busy || !!run} discoveryId={discoveryId} onRestore={onRestore}
      onOpen={scan => {
        if (!elsSavedDiscoveryMatches(scan, scanState)) return;
        const opened = { ...scan, key, state: scanState };
        setDiscovery(current => ({ result: opened, runs: { ...current.runs, [`saved:${scan.id}`]: opened } }));
        setExcludedSourceIds(current => current.filter(id => id !== scan.id));
        setPage(0); onOpenDiscovery(); setNotice("תוצאה שמורה נטענה ללא סריקה. הוספת מועמדים למטריצה דורשת אימות במנוע.");
      }} />
    </footer>
  </section>;
}
