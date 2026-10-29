import React, { useRef, useState } from "react";
import { ELS_MATRIX_READING_ACK_UPPER_BOUND_USD, ELS_MATRIX_READING_START, isLiveFableReading } from "../../../supabase/functions/_shared/elsMatrixReadingAction.js";
import { elsMatrixReadingMode, sameElsMatrixReadingAxis, selectElsMatrixReading } from "../../lib/research/elsMatrixReadingPresentation.js";

const labels = { PREVIEW: "כיסוי ועלות לפני סריקה", RUNNING: "הסריקה עדיין מתבצעת", COMPLETE: "הסריקה הושלמה",
  INCOMPLETE: "הסריקה לא הושלמה", FAILED_WITH_REASON: "הסריקה לא הסתיימה בהצלחה", CANCEL_REQUESTED: "בקשת הביטול נשלחה", REFUSED: "הסריקה לא הופעלה" };
const errors = { not_enabled: "הסריקה עדיין לא הופעלה בסביבה הזאת.", admin_only: "הסריקה הניסיונית זמינה למנהלים בלבד.",
  preview_mode_only: "כעת אפשר לבדוק כיסוי ועלות בלבד.", scope_not_supported: "הסריקה הזאת תומכת כרגע בתורה בלבד.",
  model_unavailable: "המודל אינו זמין כרגע.", replay_pending_or_changed: "המופע השתנה או ממתין לאימות. נסו לאחר האימות.",
  turn_pending: "רזיאל עסוק. המתינו לסיום הפעולה הנוכחית.", reading_disabled: "הסריקה עדיין לא הופעלה בסביבה הזאת." };
const number = value => typeof value === "number" && Number.isFinite(value);
const money = value => number(value) ? value.toFixed(2) : "לא ידוע";

function ReadingResult({ result }) {
  const fixture = result.is_test_fixture === true || result.provider?.kind === "test_double";
  const live = isLiveFableReading(result);
  const complete = result.state === "COMPLETE";
  const findings = complete && (fixture || live) ? (result.findings || []) : [];
  const verified = findings.filter(item => item.verification?.state === "ENGINE_VERIFIED");
  const plain = findings.filter(item => item.verification?.state === "PLAIN_TEXT_ONLY");
  const unverified = findings.filter(item => item.verification?.state === "NOT_VERIFIED");
  const coverage = result.coverage;
  return <section className="els29-matrix-reading-result" aria-label="תוצאת סריקת המטריצה" data-reading-state={result.state}>
    <strong>{labels[result.state] || "מצב הסריקה אינו ידוע"}</strong>
    {result.saved_snapshot ? <p role="note">תוצאה שמורה — לפי האימות בסריקה המקורית. לא בוצעה סריקה או בדיקת מנוע חדשה בשחזור.</p> : null}
    {fixture ? <p role="note">דוגמת בדיקה — לא קריאת AI חיה</p> : live ? <p>קריאת Fable</p> : <p>לא התקבל אישור לקריאת Fable חיה.</p>}
    {result.error || result.reason ? <p>{errors[result.error] || (result.reason === "max_tokens" ? "הקריאה הגיעה לתקרת הפלט בלי תשובה מלאה." : "הפעולה לא הושלמה. הפרטים נשארים בשיחת רזיאל.")}</p> : null}
    {coverage ? <p>נבדק אזור של {coverage.rows?.count} שורות × {coverage.cols?.count} עמודות · {coverage.cells} תאים · {coverage.lines_shown?.total} קווים. האזור שמחוץ לחלון לא נסרק.</p> : null}
    {number(result.timing?.elapsed_ms) ? <p>משך הקריאה: {Math.ceil(result.timing.elapsed_ms / 60000)} דקות</p> : null}
    {result.cost ? <p>עלות שנגרמה לפי שימוש ומחירון: <bdi>${money(result.cost.usd)}</bdi> · <bdi>₪{money(result.cost.ils?.amount)}</bdi> (הערכה)</p> : null}
    {result.state === "PREVIEW" && result.estimate ? <p>תקרת עלות מחושבת: <bdi>${money(result.estimate.upper_bound_usd)}</bdi> · <bdi>₪{money(result.estimate.upper_bound_ils?.amount)}</bdi> (הערכה)</p> : null}
    {complete && verified.length > 0 ? <>
      <h4>{result.saved_snapshot ? "ממצאים שאומתו בסריקה המקורית" : "ממצאים שאומתו במנוע"} · {verified.length}</h4>
      <ul>{verified.map((item, index) => <li key={item.id || index}>
        <p><strong>{item.text}</strong> · דילוג <bdi>{item.occurrence?.skip}</bdi> · מיקום <bdi>{item.occurrence?.start}</bdi></p>
        <small>{({ crosses: "חוצה את הציר", touches: "צמוד לציר", far: "מרוחק מהציר" })[item.relation_to_axis?.relation] || ""}
          {number(item.chance?.expected_occurrences) ? ` · E≈${item.chance.expected_occurrences.toPrecision(2)}` : ""}</small>
        {item.model_claims?.note ? <details><summary>קריאת המודל</summary><p>{item.model_claims.note}</p></details> : null}
      </li>)}</ul>
      <p>האימות מאשר אותיות ומיקומים. E הוא אומדן לפי שכיחות אותיות, לא מדד לחוזק הסיפור או מובהקות מתוקנת.</p>
    </> : null}
    {complete && plain.length > 0 ? <details><summary>רצפים בטקסט הרגיל · {plain.length}</summary><p>{plain.map(item => item.text).join(" · ")}</p></details> : null}
    {complete && unverified.length > 0 ? <p>{unverified.length} הצעות לא אומתו ואינן מוצגות כממצאים.</p> : null}
    {result.cap?.reached ? <p>הגענו לתקרת ההצעות. ייתכנו ממצאים נוספים באזור.</p> : null}
    {result.poll_interrupted ? <p>המעקב נקטע; הסריקה עשויה להמשיך אצל הספק.</p> : null}
    {result.tracking_unavailable ? <p role="alert">זהו תיעוד של סריקה שלא נאספה. מזהה המעקב אינו נשמר בשיחה, והסריקה עשויה להמשיך אצל הספק. לא ניתן לחדש את המעקב מהתיעוד הזה; סריקה חדשה חסומה כדי למנוע חיוב כפול.</p> : null}
  </section>;
}

export default function ElsMatrixReadingCard2029({ context, reading = {}, onSubmit, pending = false }) {
  const mode = elsMatrixReadingMode(reading.mode);
  const session = reading.session;
  const { active, matching, progress, result } = selectElsMatrixReading(session, context?.axis);
  const [local, setLocal] = useState({ pending: false, error: null });
  const submitting = useRef(false);
  const axis = context?.axis;
  const available = mode !== "off" && reading.isAdmin === true && !reading.locked && axis?.scope === "torah" && axis.skip >= 15;
  const resume = result?.job?.token && (result.poll_interrupted || ["RUNNING", "CANCEL_REQUESTED"].includes(result.state) || result.retryable);
  const submit = async (jobToken = null) => {
    if (!available || pending || session?.busy || submitting.current || result?.tracking_unavailable || typeof onSubmit !== "function") return;
    submitting.current = true; setLocal({ pending: true, error: null });
    try {
      const outcome = await onSubmit(context, jobToken ? { jobToken, op: "status" } : {
        op: mode === "preview" ? "preview" : "start", cap: 25,
        window: { rows: ELS_MATRIX_READING_START.rows, cols: ELS_MATRIX_READING_START.cols },
        ackUpperBoundUsd: ELS_MATRIX_READING_ACK_UPPER_BOUND_USD,
      });
      setLocal({ pending: false, axis, error: outcome?.ok ? null : errors[outcome?.error] || "לא התקבלה תוצאת סריקה. בדקו את החיבור בשיחת רזיאל." });
    } catch { setLocal({ pending: false, axis, error: "הבקשה לא הושלמה. לא נשלח ניסיון נוסף אוטומטית." }); }
    finally { submitting.current = false; }
  };
  const saveResult = async () => {
    if (session?.busy || submitting.current || result?.state !== "COMPLETE" || typeof session?.saveCurrentSession !== "function") return;
    submitting.current = true; setLocal({ saving: true, axis, error: null });
    try {
      const saved = await session.saveCurrentSession();
      setLocal({ saving: false, axis, savedResult: result, saved: saved?.ok === true, error: saved?.ok ? null : saved?.error === "session_too_large"
        ? "השיחה גדולה מדי לשמירה. התוצאה לא נשמרה; השאירו את הדף פתוח."
        : "השמירה לא הושלמה. התוצאה עדיין בשיחה הנוכחית." });
    } catch { setLocal({ saving: false, axis, error: "השמירה לא הושלמה. נסו שוב מתוך השיחה הנוכחית." }); }
    finally { submitting.current = false; }
  };
  return <section className="els29-native-workrail els29-matrix-ai-card" aria-label="רזיאל ומפת המטריצה">
    <strong>✦ נתח את המטריצה עם AI</strong>
    {axis ? <p>המופע הנבחר: {axis.term} · דילוג <bdi>{axis.skip}</bdi> · {axis.dir === -1 ? "לאחור" : "קדימה"} · מיקום <bdi>{axis.start}</bdi></p> : <p>בחרו מופע מאומת כדי להתחיל.</p>}
    {mode === "off" ? <p>חיבור הסריקה מוכן בקוד. ההפעלה החיה עדיין כבויה בסביבה הזאת.</p> : <>
      <p>סריקה ניסיונית באותה שיחת רזיאל · עד 25 הצעות.</p>
      {mode === "preview" ? <p>בדיקת כיסוי ועלות בלבד — ללא הפעלת מודל.</p> : <p>עד <bdi>$2</bdi> (כ־<bdi>₪7.40</bdi>, הערכה). ייתכן חיוב ספק גם ללא תשובה.</p>}
      <details><summary>אזור הסריקה וזמן ההמתנה</summary>
        <p>עד 33×41 תאים סביב המופע. בניסויים נמדדו 3–13 דקות. אין חיוב קרדיטים. אומדן השקל מבוסס על שער משוער של 3.70.</p>
        <p>השאירו את הדף פתוח בזמן הקריאה. רענון מאבד את המעקב ואינו מבטל את עלות הספק. שיחת רזיאל תפוסה עד הסיום.</p>
      </details>
      {!reading.isAdmin ? <p>השלב הניסיוני זמין למנהלים בלבד.</p> : reading.locked ? <p>רזיאל אינו זמין כרגע.</p> : axis && (axis.scope !== "torah" || axis.skip < 15) ? <p>הסריקה הזאת זמינה כרגע בתורה, במטריצה ברוחב 15 ומעלה.</p> : null}
    </>}
    <button type="button" disabled={!available || pending || local.pending || local.saving || session?.busy || Boolean(resume) || result?.tracking_unavailable} onClick={() => submit()}>
      {mode === "preview" ? "בדוק כיסוי ועלות" : "סרוק את המטריצה עם Fable"}
    </button>
    {active ? <div role="status">
      <p>{matching ? progress?.cancelling ? "ממתינים לאישור ביטול מהספק…" : "קריאת המטריצה מתבצעת…" : "רזיאל קורא כעת מופע אחר. התוצאה תישאר משויכת אליו."}
        {number(progress?.elapsedMs) ? ` חלפו ${Math.floor(progress.elapsedMs / 60000)} דקות.` : ""}</p>
      <p>רזיאל עסוק עד סיום הקריאה. השאירו את הדף פתוח: רענון מאבד את המעקב ואינו מבטל את עלות הספק.</p>
      <button type="button" disabled={progress?.cancelling === true} onClick={() => reading.onCancel?.()}>בקש ביטול סריקה</button>
    </div> : local.pending ? <p role="status">הבקשה נשלחת…</p> : session?.busy ? <p role="status">רזיאל עסוק בפעולה אחרת.</p> : null}
    {local.error && sameElsMatrixReadingAxis(local.axis, axis) ? <p role="alert">{local.error}</p> : null}
    {!active && resume ? <button type="button" disabled={!available || session?.busy || local.pending || local.saving} onClick={() => submit(result.job.token)}>המשך מעקב אחר הסריקה</button> : null}
    {result && !matching ? <ReadingResult result={result} /> : null}
    {!session?.busy && result?.state === "COMPLETE" && session?.saveCurrentSession ? <button type="button" disabled={local.saving || local.pending} onClick={saveResult}>
      {local.saving ? "שומר…" : "שמור את השיחה והתוצאה"}
    </button> : null}
    {local.saved && local.savedResult === result && sameElsMatrixReadingAxis(local.axis, axis) ? <p role="status">השיחה והתוצאה נשמרו בספרייה הפרטית. אפשר לשחזר אותן דרך השיחות השמורות ברזיאל; השחזור אינו מפעיל סריקה.
      {session?.savedSessionsSyncStatus !== "synced" ? " מצב הסנכרון למכשירים אחרים מופיע בשיחות השמורות." : ""}</p> : null}
  </section>;
}
