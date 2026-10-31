import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CanonicalProgress from "../CanonicalProgress.jsx";
import {
  lifeJourneyHintCaptureErrorMessage,
  LIFE_JOURNEY_HINT_CAPTURE_MAX_NOTE,
  LIFE_JOURNEY_HINT_CAPTURE_MAX_QUESTION,
} from "../../lib/research/lifeJourneyHintCapture.js";
import { projectLifeJourneyHintReferences } from "../../lib/research/lifeJourneyHintProjection.js";
import { lifeJourneyHintInvestigationErrorMessage } from "../../lib/research/lifeJourneyHintInvestigation.js";
import {
  buildLifeJourneyHintEvidenceExplanation,
  lifeJourneyHintExplanationErrorMessage,
} from "../../lib/research/lifeJourneyHintEvidenceExplanation.js";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { buildLifeJourneyHintReferencePatch } from "../../lib/research/lifeJourneyPersonContext.js";
import {
  attachLifeJourneyHintImage,
  detachLifeJourneyHintImage,
  LIFE_JOURNEY_HINT_IMAGE_ACCEPT,
  lifeJourneyHintMediaErrorMessage,
  readLifeJourneyHintImage,
  retryLifeJourneyHintImageCleanup,
} from "../../lib/research/lifeJourneyHintMedia.js";

const EMPTY_DRAFT = Object.freeze({ hintType: "idea", observation: "", question: "", occurredAt: "", memberRef: "", number: "", sourceUrl: "", captureRef: "" });
const HINT_TYPES = Object.freeze([
  { id: "idea", label: "תצפית" }, { id: "sync", label: "צירוף מקרים" },
  { id: "dream", label: "חלום" }, { id: "event", label: "אירוע" },
  { id: "plate", label: "מספר שראיתי" }, { id: "link", label: "מקור שקראתי" },
]);
const clean = value => value == null ? "" : String(value).trim();

function safeSourceUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function normalizeMembers(members) {
  const seen = new Set();
  return (Array.isArray(members) ? members : []).flatMap(member => {
    const memberRef = clean(member?.memberRef || member?.source_ref);
    if (!memberRef || seen.has(memberRef)) return [];
    seen.add(memberRef);
    return [{ memberRef, name: clean(member?.name) || "אדם במסע" }];
  });
}

function comparisonLabel(row) {
  if (row.sameCivilDay) return "אותו יום אזרחי בדיוק";
  if (row.sameMonthAndDay) return `${row.daysBetween} ימים · אותו יום וחודש בשנה אחרת`;
  return row.direction === "after_anchor"
    ? `${row.daysBetween} ימים אחרי תאריך הלידה`
    : `${row.daysBetween} ימים לפני תאריך הלידה`;
}

const MEDIA_PHASES = Object.freeze([
  { id: "issuing", label: "מכין העלאה פרטית" },
  { id: "uploading", label: "מעלה את התמונה" },
  { id: "verifying", label: "מאמת את הקובץ" },
  { id: "binding", label: "מחבר לרמז המדויק" },
]);

function activeHintMedia(hint) {
  const rows = Array.isArray(hint?.media) ? hint.media : [];
  return rows.find(item => item?.kind === "image" && item?.role === "evidence_image" && item?.visibility === "private" && item?.state === "bound")
    || rows.find(item => item?.kind === "image" && item?.role === "evidence_image" && item?.visibility === "private" && ["cleanup_pending", "delete_pending"].includes(item?.state))
    || null;
}

function PrivateHintImage2029({ hint, userId, onRefresh }) {
  const inputId = useId();
  const mountedEpoch = useRef(0);
  const controllerRef = useRef(null);
  const [localObjectId, setLocalObjectId] = useState(null);
  const [readTick, setReadTick] = useState(0);
  const [image, setImage] = useState({ state: "idle", url: null, error: null, failures: 0, objectId: null });
  const [operation, setOperation] = useState({ state: "idle", phase: null, progress: null, error: null, cleanupReceipt: null });
  const media = activeHintMedia(hint);
  const storageObjectId = media?.state === "bound" ? media.storage_object_id : localObjectId;
  const canAttach = Boolean(userId && hint?.id && !String(hint.id).startsWith("local-") && !media && !localObjectId);
  const busy = ["working", "removing"].includes(operation.state);

  const nextOperation = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const epoch = ++mountedEpoch.current;
    return { controller, epoch };
  }, []);
  const current = useCallback(epoch => mountedEpoch.current === epoch, []);

  useEffect(() => () => {
    mountedEpoch.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, [userId]);

  useEffect(() => {
    if (!userId || !storageObjectId || media?.state === "cleanup_pending" || media?.state === "delete_pending") {
      setImage({ state: "idle", url: null, error: null, failures: 0, objectId: null });
      return undefined;
    }
    const { controller, epoch } = nextOperation();
    setImage(previous => ({ state: "loading", url: null, error: null, failures: previous.objectId === storageObjectId ? previous.failures || 0 : 0, objectId: storageObjectId }));
    readLifeJourneyHintImage({
      hintId: hint.id,
      storageObjectId,
      expectedUserId: userId,
      signal: controller.signal,
    }).then(result => {
      if (!current(epoch)) return;
      setImage(previous => ({ state: "ready", url: result.signedUrl, error: null, failures: previous.failures || 0, objectId: storageObjectId }));
    }).catch(error => {
      if (!current(epoch) || error?.name === "AbortError") return;
      setImage(previous => ({ state: "error", url: null, error: lifeJourneyHintMediaErrorMessage(error), failures: (previous.failures || 0) + 1, objectId: storageObjectId }));
    });
    return () => controller.abort();
    // readTick intentionally refreshes the short-lived URL only after another owner check.
  }, [current, hint.id, media?.state, nextOperation, readTick, storageObjectId, userId]);

  const attach = async file => {
    if (!file || !canAttach || busy) return;
    const { controller, epoch } = nextOperation();
    setOperation({ state: "working", phase: "issuing", progress: null, error: null, cleanupReceipt: null });
    try {
      const result = await attachLifeJourneyHintImage({
        hintId: hint.id,
        file,
        expectedUserId: userId,
        signal: controller.signal,
        onPhase: phase => {
          if (current(epoch)) setOperation(previous => ({ ...previous, state: "working", phase, progress: phase === "uploading" ? previous.progress : null }));
        },
        onProgress: progress => {
          if (current(epoch)) setOperation(previous => ({ ...previous, state: "working", phase: "uploading", progress: progress.percentage }));
        },
      });
      if (!current(epoch)) return;
      setLocalObjectId(result.storageObjectId);
      setOperation({ state: "ready", phase: "ready", progress: 100, error: null, cleanupReceipt: null });
      Promise.resolve(onRefresh?.()).catch(() => {});
    } catch (error) {
      if (!current(epoch) || error?.name === "AbortError") return;
      setOperation({ state: "error", phase: null, progress: null, error: lifeJourneyHintMediaErrorMessage(error), cleanupReceipt: null });
    }
  };

  const detach = async () => {
    const targetId = media?.storage_object_id || localObjectId;
    if (!targetId || busy || !window.confirm("להסיר את התמונה הפרטית מהרמז? הקובץ יימחק מהאחסון הפרטי.")) return;
    const { controller, epoch } = nextOperation();
    setOperation({ state: "removing", phase: "removing", progress: null, error: null, cleanupReceipt: operation.cleanupReceipt });
    try {
      const result = operation.cleanupReceipt
        ? await retryLifeJourneyHintImageCleanup({ cleanupReceipt: operation.cleanupReceipt, expectedUserId: userId, signal: controller.signal })
        : await detachLifeJourneyHintImage({ hintId: hint.id, storageObjectId: targetId, expectedUserId: userId, signal: controller.signal });
      if (!current(epoch)) return;
      if (result.cleanupPending) {
        setOperation({ state: "cleanup_pending", phase: null, progress: null, error: "הקובץ כבר אינו קריא, אך מחיקתו מהאחסון עדיין ממתינה.", cleanupReceipt: result.cleanupReceipt });
      } else {
        setLocalObjectId(null);
        setImage({ state: "idle", url: null, error: null, failures: 0, objectId: null });
        setOperation({ state: "removed", phase: null, progress: null, error: null, cleanupReceipt: null });
      }
      await onRefresh?.();
    } catch (error) {
      if (!current(epoch) || error?.name === "AbortError") return;
      setOperation({ state: "error", phase: null, progress: null, error: lifeJourneyHintMediaErrorMessage(error), cleanupReceipt: operation.cleanupReceipt });
    }
  };

  const phaseIndex = MEDIA_PHASES.findIndex(item => item.id === operation.phase);
  return <section className="person-journey-hint-media" data-experience-capability="life-journey-private-hint-image">
    <header><div><strong>תמונה פרטית</strong><small>נשמרת באחסון הפרטי ומחוברת רק לרמז הזה.</small></div><span>{media?.state === "cleanup_pending" || operation.state === "cleanup_pending" ? "הסרה ממתינה" : media?.state === "delete_pending" ? "מחיקה ממתינה" : media?.state === "bound" || localObjectId ? "מצורפת" : "ללא תמונה"}</span></header>
    {image.state === "loading" ? <div className="person-journey-hint-media-reading" role="status" aria-busy="true">פותח תמונה פרטית לאחר בדיקת בעלות…</div> : null}
    {image.state === "ready" && image.url ? <figure><img src={image.url} alt={`תמונה פרטית המצורפת אל ${hint.title || "הרמז"}`} loading="lazy" onError={() => {
      if (image.failures < 2) {
        setImage(previous => ({ ...previous, failures: previous.failures + 1 }));
        setReadTick(value => value + 1);
      } else {
        setImage(previous => ({ ...previous, state: "error", url: null, error: "התמונה לא נטענה לאחר חידוש הרשאת הקריאה." }));
      }
    }} /><figcaption>URL חתום קצר־מועד · אינו נשמר ברמז</figcaption></figure> : null}
    {image.state === "error" ? <div className="person-journey-error" role="alert">{image.error}<button type="button" onClick={() => setReadTick(value => value + 1)}>נסה לפתוח שוב</button></div> : null}
    {operation.state === "working" ? <CanonicalProgress
      compact
      title="מצרף את התמונה לרמז"
      phase={MEDIA_PHASES[phaseIndex]?.label || "מבצע פעולה פרטית"}
      progress={operation.phase === "uploading" ? operation.progress : null}
      steps={MEDIA_PHASES.map((item, index) => ({ ...item, state: index < phaseIndex ? "done" : index === phaseIndex ? "active" : "pending" }))}
    /> : null}
    {operation.state === "removing" ? <CanonicalProgress compact title="מסיר את התמונה הפרטית" phase="מנתק את ההפניה ומוחק מהאחסון" /> : null}
    {operation.error && operation.state !== "cleanup_pending" ? <div className="person-journey-error" role="alert">{operation.error}</div> : null}
    {operation.state === "cleanup_pending" || media?.state === "cleanup_pending" ? <div className="person-journey-hint-media-pending" role="status"><span>{operation.error || "התמונה כבר אינה קריאה. מחיקת הקובץ עדיין ממתינה לניסיון חוזר."}</span><button type="button" disabled={busy} onClick={detach}>נסה להסיר שוב</button></div> : null}
    {media?.state === "delete_pending" ? <div className="person-journey-hint-media-pending" role="status">מחיקת הרמז והקובץ ממתינה להשלמה. התמונה אינה קריאה.</div> : null}
    <div className="person-journey-hint-media-actions">
      {canAttach ? <><input id={inputId} className="person-journey-hint-media-input" type="file" accept={LIFE_JOURNEY_HINT_IMAGE_ACCEPT} disabled={busy} onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; attach(file); }} /><label htmlFor={inputId} aria-disabled={busy}>צרף תמונה פרטית</label></> : null}
      {(media?.state === "bound" || localObjectId) && !["working", "removing"].includes(operation.state) ? <button type="button" onClick={detach}>הסר תמונה</button> : null}
    </div>
    {!userId ? <small>צירוף תמונה זמין רק בחשבון מחובר. רמז מקומי של אורח אינו מועלה.</small> : null}
  </section>;
}

function HintInvestigationResult({ state, explanation, onExplain }) {
  if (!state) return null;
  if (state.state === "loading") return <div className="person-journey-hint-check-state" role="status" aria-busy="true">בודק תאריך ומספר מול המקורות הקיימים…</div>;
  if (state.state === "error") return <div className="person-journey-error" role="alert">{lifeJourneyHintInvestigationErrorMessage(state.error)}</div>;
  const result = state.result;
  if (!result) return null;
  const comparisons = result.date.comparisons || [];
  const matches = result.number.existingMatches || [];
  const phrases = result.number.source?.phrases || [];
  const empty = !comparisons.length && !matches.length && !phrases.length;
  return <section className="person-journey-hint-check" data-experience-capability="life-journey-hint-bounded-checks">
    <header><div><small>בדיקה קנונית מוגבלת</small><h4>{result.status === "partial" ? "תוצאות חלקיות" : result.status === "error" ? "המקור לא היה זמין" : "מה נמצא בבדיקה"}</h4></div><span>ללא AI · ללא ELS</span></header>
    {result.date.representation ? <div className="person-journey-hint-check-date"><strong>ייצוג התאריך</strong><span><bdi>{result.date.representation.dateIso}</bdi> · {result.date.representation.hebrewDate}</span></div> : null}
    {comparisons.length ? <section><h5>מרחק מתאריכי הלידה שנבחרו</h5><ul>{comparisons.map(row => <li key={row.id}><strong>{row.memberName}</strong><span>{comparisonLabel(row)}</span></li>)}</ul></section> : null}
    {matches.length ? <section><h5>תוצאות קיימות במסע באותו מספר</h5><ul>{matches.map(row => <li key={row.id}><strong>{row.memberName}</strong><span>{row.expressionLabel} · {row.methodLabel} · {row.value}</span></li>)}</ul></section> : null}
    {phrases.length ? <section><h5>ביטויים ממקור המספר הקנוני</h5><ul>{phrases.map(row => <li key={row.id}><strong>{row.phrase}</strong><span>{row.methods.join(" · ")} · התאמת ערך בלבד</span></li>)}</ul></section> : null}
    {result.number.sourceState === "error" ? <p className="person-journey-hint-check-warning">מקור המספר לא היה זמין; לא הומצאה תוצאה חלופית.</p> : null}
    {empty ? <p>לא נמצאה כרגע התאמה בשדות שנבדקו. זו תוצאת בדיקה תקינה, לא הוכחה שאין קשר.</p> : null}
    <footer>הבדיקה לא קראה את סיפור הרמז, לא חיפשה שמות, ואינה מוכיחה סיבתיות, גורל או משמעות.</footer>
    <div className="person-journey-hint-explanation">
      <div><strong>פענוח רזיאל</strong><small>רזיאל יקבל רק את חבילת הראיות שלמעלה, בלי הסיפור, השאלה, שמות או תאריכים מדויקים.</small></div>
      <button type="button" disabled={explanation?.state === "loading" || typeof onExplain !== "function"} onClick={onExplain}>{explanation?.state === "loading" ? "פותח את רזיאל…" : "בקש פענוח מרזיאל"}</button>
      {explanation?.state === "ready" ? <p role="status">החבילה נשלחה בפעולה מפורשת והתשובה נפתחה ברזיאל.</p> : null}
      {explanation?.state === "error" ? <p className="person-journey-hint-check-warning" role="alert">{lifeJourneyHintExplanationErrorMessage(explanation.error)}</p> : null}
    </div>
  </section>;
}

export default function LifeJourneyHints2029({ state = { loading: true, rows: [], error: null }, members = [], userId = null, onSave, onRefresh, investigationState = null, onInvestigate, onExplain, onOpenTimeline }) {
  const navigate = useNavigate();
  const research = useResearch();
  const [mode, setMode] = useState("list");
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [openingError, setOpeningError] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const memberRows = useMemo(() => normalizeMembers(members), [members]);
  const memberNames = useMemo(() => new Map(memberRows.map(member => [member.memberRef, member.name])), [memberRows]);
  const authorizedMemberRefs = useMemo(() => memberRows.map(member => member.memberRef), [memberRows]);
  const projection = useMemo(() => projectLifeJourneyHintReferences(state, { authorizedMemberRefs }), [authorizedMemberRefs, state]);
  const byId = useMemo(() => new Map(projection.rows.map(row => [row.id, row])), [projection]);
  const visibleRows = useMemo(() => {
    const models = new Map();
    for (const row of state.rows || []) {
      const id = typeof row?.id === "string" ? row.id.trim() : "";
      if (id && !models.has(id)) models.set(id, row);
    }
    return projection.rows.map(row => ({ ...models.get(row.id), id: row.id }));
  }, [projection, state.rows]);

  const update = (key, value) => setDraft(previous => ({ ...previous, [key]: value }));
  const cancelCapture = () => { setDraft(EMPTY_DRAFT); setMode("list"); setNotice(null); };
  const reviewCapture = () => {
    if (!clean(draft.observation)) return setNotice({ type: "error", text: lifeJourneyHintCaptureErrorMessage("missing_observation") });
    if (!clean(draft.question)) return setNotice({ type: "error", text: lifeJourneyHintCaptureErrorMessage("missing_question") });
    const captureRef = draft.captureRef || globalThis.crypto?.randomUUID?.() || "";
    if (!captureRef) return setNotice({ type: "error", text: "לא ניתן להכין כרגע אישור שמירה בטוח." });
    setDraft(previous => ({ ...previous, captureRef }));
    setNotice(null);
    setMode("review");
  };
  const confirmCapture = async () => {
    if (saving || typeof onSave !== "function") return;
    setSaving(true);
    setNotice(null);
    try {
      const result = await onSave(draft);
      if (!result?.ok) return setNotice({ type: "error", text: lifeJourneyHintCaptureErrorMessage(result) });
      setDraft(EMPTY_DRAFT);
      setMode("list");
      setNotice({ type: "success", text: "התצפית נשמרה כרמז פרטי ואושרה על ידי הכותב הקיים." });
    } catch {
      setNotice({ type: "error", text: lifeJourneyHintCaptureErrorMessage("write_failed") });
    } finally {
      setSaving(false);
    }
  };
  const openNumberReference = number => {
    const patch = buildLifeJourneyHintReferencePatch(research.context, number);
    if (!patch || !research.setResearchContext?.(patch)) return setOpeningError("לא ניתן לפתוח כרגע את ההפניה השמורה.");
    navigate(patch.subject.href);
  };
  const requestExplanation = async (hintId, checkedResult) => {
    if (explanation?.state === "loading" || typeof onExplain !== "function") return;
    const built = buildLifeJourneyHintEvidenceExplanation(checkedResult);
    if (!built.ok) {
      setExplanation({ hintId, state: "error", error: built.error });
      return;
    }
    setExplanation({ hintId, state: "loading", error: null });
    try {
      const result = await onExplain(built.submission);
      setExplanation(result?.ok
        ? { hintId, state: "ready", error: null }
        : { hintId, state: "error", error: result?.error || "raziel_unavailable" });
    } catch {
      setExplanation({ hintId, state: "error", error: "transport_failed" });
    }
  };

  return <section className="person-journey-panel" data-experience-capability="life-journey-hint-references">
    <div className="person-journey-section-head"><div><small>04</small><h2>הרמזים האישיים שלי</h2></div><span>פרטי · באותו עץ</span></div>
    <p className="person-journey-note">כאן שומרים תצפית ואת השאלה שבגללה היא חשובה. תאריך ושיוך לאדם נשמרים רק אחרי אישור מפורש. בדיקת תאריך ומספר מתחילה רק בלחיצה נפרדת; AI ו־ELS אינם מופעלים.</p>

    {mode === "list" ? <div className="person-journey-hint-capture-entry"><div><strong>ראיתם משהו ששווה לזכור?</strong><span>שמרו אותו עם מטרה ברורה; הבדיקה תופעל בנפרד בעתיד.</span></div><button type="button" disabled={state.loading || Boolean(state.error) || typeof onSave !== "function"} onClick={() => { setNotice(null); setMode("edit"); }}>הוסף תצפית פרטית</button></div> : null}

    {mode === "edit" ? <form className="person-journey-hint-capture" onSubmit={event => { event.preventDefault(); reviewCapture(); }}>
      <header><div><small>שלב 1 מתוך 2</small><h3>מה ראיתם, ומה רוצים להבין?</h3></div><span>טרם נשמר</span></header>
      <label className="is-wide"><span>התצפית הפרטית</span><textarea required rows="4" maxLength={LIFE_JOURNEY_HINT_CAPTURE_MAX_NOTE} value={draft.observation} onChange={event => update("observation", event.target.value)} placeholder="תארו בקצרה מה קרה או מה חזר על עצמו" /></label>
      <label className="is-wide"><span>מה תרצו לבדוק בהמשך?</span><textarea required rows="2" maxLength={LIFE_JOURNEY_HINT_CAPTURE_MAX_QUESTION} value={draft.question} onChange={event => update("question", event.target.value)} placeholder="לדוגמה: האם יש קשר לתאריך או למספר שחזר?" /></label>
      <label><span>סוג התצפית</span><select value={draft.hintType} onChange={event => update("hintType", event.target.value)}>{HINT_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}</select></label>
      <label><span>מועד האירוע — אם ידוע בדיוק</span><input type="date" value={draft.occurredAt} onChange={event => update("occurredAt", event.target.value)} /></label>
      <label><span>למי זה קשור? — לא חובה</span><select value={draft.memberRef} onChange={event => update("memberRef", event.target.value)}><option value="">לכלל המסע / עדיין לא ידוע</option>{memberRows.map(member => <option key={member.memberRef} value={member.memberRef}>{member.name}</option>)}</select></label>
      <label><span>מספר מדויק — לא חובה</span><input type="number" min="0" step="1" inputMode="numeric" value={draft.number} onChange={event => update("number", event.target.value)} placeholder="למשל 337" /></label>
      <label className="is-wide"><span>קישור מקור — לא חובה</span><input type="url" inputMode="url" dir="ltr" value={draft.sourceUrl} onChange={event => update("sourceUrl", event.target.value)} placeholder="https://" /></label>
      <footer><button type="button" onClick={cancelCapture}>ביטול</button><button type="submit" className="person-journey-primary">המשך לאישור</button></footer>
    </form> : null}

    {mode === "review" ? <section className="person-journey-hint-review" aria-label="אישור תצפית פרטית">
      <header><div><small>שלב 2 מתוך 2</small><h3>אישור לפני שמירה</h3></div><span>לא מפעיל בדיקה</span></header>
      <dl><div><dt>התצפית</dt><dd>{draft.observation}</dd></div><div><dt>מטרת הבדיקה</dt><dd>{draft.question}</dd></div><div><dt>מועד</dt><dd>{draft.occurredAt || "לא צוין"}</dd></div><div><dt>שיוך</dt><dd>{memberNames.get(draft.memberRef) || "כלל המסע / לא ידוע"}</dd></div>{clean(draft.number) ? <div><dt>מספר</dt><dd>{draft.number}</dd></div> : null}{clean(draft.sourceUrl) ? <div><dt>מקור</dt><dd dir="ltr">{draft.sourceUrl}</dd></div> : null}</dl>
      <p>השמירה יוצרת רשומה אחת ב־research_items / hint. התוכן לא נכנס לכתובת, ל־telemetry או ל־Research Context.</p>
      <footer><button type="button" disabled={saving} onClick={() => setMode("edit")}>חזרה לעריכה</button><button type="button" className="person-journey-primary" disabled={saving} onClick={confirmCapture}>{saving ? "שומר…" : "אשר ושמור כפרטי"}</button></footer>
    </section> : null}

    {state.loading ? <div className="person-journey-state" aria-busy="true">טוען הפניות לרמזים הקיימים…</div> : null}
    {state.error ? <div className="person-journey-error" role="alert">{state.error}</div> : null}
    {notice ? <div className={notice.type === "error" ? "person-journey-error" : "person-journey-hint-notice"} role={notice.type === "error" ? "alert" : "status"}>{notice.text}</div> : null}
    {openingError ? <div className="person-journey-error" role="alert">{openingError}</div> : null}
    {!state.loading && !state.error && !state.rows.length ? <div className="person-journey-empty">אין כרגע רמזים שמורים ב־research_items / hint.</div> : null}
    {visibleRows.length ? <div className="person-journey-hint-list">{visibleRows.map(hint => {
      const reference = byId.get(hint.id);
      const date = reference.date;
      const href = safeSourceUrl(hint.source_url);
      const number = Number(hint.number);
      const hasNumberReference = hint.number != null && hint.number !== "" && Number.isSafeInteger(number) && number >= 0;
      const associatedName = reference.personRef ? memberNames.get(reference.personRef) : null;
      const check = investigationState instanceof Map ? investigationState.get(hint.id) : investigationState?.[hint.id];
      const canInvestigate = date.state === "dated" || hasNumberReference;
      const hintExplanation = explanation?.hintId === hint.id ? explanation : null;
      return <article key={hint.id}><div><strong>{hint.title || "רמז שמור"}</strong><small>{hint.number != null ? `מספר ${hint.number}` : hint.hint_type}</small><small>{date.state === "dated" ? <>מועד האירוע: <bdi>{date.dateIso}</bdi> · {date.hebrewDate} · ייצוג יום אזרחי, ללא קביעת שעת שקיעה</> : date.state === "unknown" ? "מועד האירוע לא צוין" : "מועד האירוע דורש הבהרה לפני בדיקה"}</small><small>{associatedName ? `משויך במפורש אל ${associatedName}` : "ללא שיוך אישי מאושר"}</small>{hint.note || hint.research_question ? <details><summary>פתח את התצפית הפרטית</summary>{hint.note ? <p>{hint.note}</p> : null}{hint.research_question ? <p><b>מה רציתי להבין:</b> {hint.research_question}</p> : null}</details> : null}</div><div className="person-journey-hint-actions">{canInvestigate && onInvestigate ? <button type="button" disabled={check?.state === "loading"} onClick={() => { if (explanation?.hintId === hint.id) setExplanation(null); onInvestigate(hint.id); }}>{check?.state === "loading" ? "בודק…" : check?.state === "ready" ? "בדוק שוב" : "בדוק תאריך ומספר"}</button> : <span>נדרש תאריך מדויק או מספר לבדיקה</span>}{hasNumberReference ? <button type="button" onClick={() => openNumberReference(number)}>פתח במספר {number}</button> : null}{href ? <a href={href} target="_blank" rel="noreferrer">פתח מקור קיים</a> : null}{date.state === "dated" && onOpenTimeline ? <button type="button" onClick={onOpenTimeline}>הצג בציר החיים</button> : null}</div><PrivateHintImage2029 hint={hint} userId={userId} onRefresh={onRefresh} /><HintInvestigationResult state={check} explanation={hintExplanation} onExplain={check?.state === "ready" && onExplain ? () => requestExplanation(hint.id, check.result) : null} /></article>;
    })}</div> : null}
    <p className="person-journey-note">תוצאות הבדיקה נשמרות בזיכרון המסך בלבד ואינן משנות את הרמז. פענוח רזיאל מופעל רק בכפתור נפרד; ELS עדיין ממתין לחיבור.</p>
  </section>;
}
