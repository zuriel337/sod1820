import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function LifeJourneyHints2029({ state = { loading: true, rows: [], error: null }, members = [], onSave, investigationState = null, onInvestigate, onExplain, onOpenTimeline }) {
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
      return <article key={hint.id}><div><strong>{hint.title || "רמז שמור"}</strong><small>{hint.number != null ? `מספר ${hint.number}` : hint.hint_type}</small><small>{date.state === "dated" ? <>מועד האירוע: <bdi>{date.dateIso}</bdi> · {date.hebrewDate} · ייצוג יום אזרחי, ללא קביעת שעת שקיעה</> : date.state === "unknown" ? "מועד האירוע לא צוין" : "מועד האירוע דורש הבהרה לפני בדיקה"}</small><small>{associatedName ? `משויך במפורש אל ${associatedName}` : "ללא שיוך אישי מאושר"}</small>{hint.note || hint.research_question ? <details><summary>פתח את התצפית הפרטית</summary>{hint.note ? <p>{hint.note}</p> : null}{hint.research_question ? <p><b>מה רציתי להבין:</b> {hint.research_question}</p> : null}</details> : null}</div><div className="person-journey-hint-actions">{canInvestigate && onInvestigate ? <button type="button" disabled={check?.state === "loading"} onClick={() => { if (explanation?.hintId === hint.id) setExplanation(null); onInvestigate(hint.id); }}>{check?.state === "loading" ? "בודק…" : check?.state === "ready" ? "בדוק שוב" : "בדוק תאריך ומספר"}</button> : <span>נדרש תאריך מדויק או מספר לבדיקה</span>}{hasNumberReference ? <button type="button" onClick={() => openNumberReference(number)}>פתח במספר {number}</button> : null}{href ? <a href={href} target="_blank" rel="noreferrer">פתח מקור קיים</a> : null}{date.state === "dated" && onOpenTimeline ? <button type="button" onClick={onOpenTimeline}>הצג בציר החיים</button> : null}</div><HintInvestigationResult state={check} explanation={hintExplanation} onExplain={check?.state === "ready" && onExplain ? () => requestExplanation(hint.id, check.result) : null} /></article>;
    })}</div> : null}
    <p className="person-journey-note">תוצאות הבדיקה נשמרות בזיכרון המסך בלבד ואינן משנות את הרמז. פענוח רזיאל מופעל רק בכפתור נפרד; ELS עדיין ממתין לחיבור.</p>
  </section>;
}
