import React, { useEffect, useRef, useState } from "react";
import { loadRazielInterview, startRazielInterview, correctRazielInterpretation, askRazielInterview } from "../../lib/research/razielInterview.js";

// Temporary admin projection of the bounded capability, reusable by 2029.
// No seed/product write on mount; source/question references are chosen explicitly.
export default function RazielInterviewPilot() {
  const [result, setResult] = useState(null);
  const [source, setSource] = useState("");
  const [refs, setRefs] = useState("");
  const [path, setPath] = useState("");
  const [questionId, setQuestionId] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState("");
  const [exceptions, setExceptions] = useState("");
  const [ask, setAsk] = useState("איך הפירוש המתוקן משנה את הבנת החיבור 787?");
  const [answer, setAnswer] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const retry = useRef(null);
  const apply = (next, selectNext = true) => {
    setResult(next);
    if (next.path_id) setPath(next.path_id);
    if (selectNext) setQuestionId(next.next_question?.id || next.questions?.[0]?.id || "");
  };
  useEffect(() => {
    let active = true;
    loadRazielInterview().then(next => { if (active) { if (next.ok) apply(next); else setNote("לא ניתן לטעון את הראיון כרגע."); } }).catch(() => { if (active) setNote("לא ניתן לטעון את הראיון כרגע."); });
    return () => { active = false; };
  }, []);
  const key = (payload) => {
    const signature = JSON.stringify(payload);
    if (retry.current?.signature !== signature) retry.current = { signature, id: crypto.randomUUID() };
    return retry.current.id;
  };
  const run = async (operation, success) => {
    if (busy) return;
    setBusy(true); setNote("");
    try {
      const next = await operation();
      if (!next.ok) {
        setNote(`הפעולה לא הושלמה${next.stage ? ` בשלב ${next.stage}` : ""}. השאלה לא קודמה (${next.error || "unavailable"}).`);
        if (result?.path_id) { const live = await loadRazielInterview(result.path_id); if (live.ok) apply(live, false); }
        return;
      }
      apply(next); retry.current = null; setAnswer(""); setNote(next.found ? success : "לא נמצא ראיון שמור.");
    } catch { setNote("הפעולה לא הושלמה. אפשר לנסות שוב; לא התקבל אישור שמירה."); }
    finally { setBusy(false); }
  };
  const save = () => {
    const payload = { pathId: result.path_id, questionId, interpretation: interpretation.trim(), reason: reason.trim(), scope: scope.trim(), exceptions: exceptions.split("\n").map(x => x.trim()).filter(Boolean) };
    return run(() => correctRazielInterpretation({ ...payload, revisionNo: result.revision_no, requestId: key(payload) }), "הפירוש נשמר ואושר כפירוש אדם מיוחס. המשך הראיון נשמר.");
  };
  const askNext = async () => {
    if (busy || !ask.trim()) return;
    setBusy(true); setNote(""); setAnswer("");
    try {
      const response = await askRazielInterview(result.path_id, ask.trim());
      if (response.error || !response.answer || response.degraded) { setNote("לא התקבלה תשובה מלאה. מצב הראיון נשמר בנפרד."); return; }
      setAnswer(response.answer);
      if (!response.persisted) setNote("התשובה התקבלה, אך שמירת השיחה לא אושרה. מצב הראיון נשמר בנפרד.");
    } catch { setNote("לא התקבלה תשובה. אפשר לנסות שוב."); }
    finally { setBusy(false); }
  };
  const field = { display: "block", width: "100%", margin: "6px 0", color: "inherit", background: "transparent", border: "1px solid currentColor", borderRadius: 6, padding: 6 };
  return <details data-raziel-interview-pilot="787" style={{ margin: "12px 0" }}>
    <summary>פיילוט ראיון 787</summary>
    <p>פירוש מיוחס למקור, עם נימוק, תחולה וחריגים. ההתקדמות מתייחסת לשאלות שנבחרו בלבד.</p>
    <label>מסלול שמור<input aria-label="מסלול ראיון שמור" style={field} value={path} onChange={e => setPath(e.target.value)} /></label>
    <button type="button" disabled={busy} onClick={() => run(() => loadRazielInterview(path.trim() || null), "המסלול והשאלה הפתוחה נטענו מחדש.")}>המשך ראיון שמור</button>
    {!result?.found && <>
      <label>הפניית המקור<input aria-label="הפניית מקור 787" style={field} value={source} onChange={e => setSource(e.target.value)} maxLength={1000} /></label>
      <label>מזהי שאלות קיימות, לפי סדר הראיון<textarea aria-label="שאלות קיימות לראיון" style={field} value={refs} onChange={e => setRefs(e.target.value)} placeholder="מזהה לכל שורה" /></label>
      <button type="button" disabled={busy || !source.trim() || !refs.trim()} onClick={() => {
        const payload = { sourceRef: source.trim(), questionIds: refs.split(/[\s,]+/).filter(Boolean) };
        run(() => startRazielInterview({ ...payload, requestId: key(payload) }), "הראיון נפתח על השאלות הקיימות שבחרת.");
      }}>פתח ראיון מהשאלות שנבחרו</button>
    </>}
    {result?.found && <>
      <p data-interview-progress="true">{result.progress.resolved} מתוך {result.progress.selected} שאלות נענו; {result.progress.remaining} נותרו.</p>
      <p data-next-question="true">{result.next_question ? `השאלה הבאה: ${result.next_question.question}` : "השאלות שנבחרו הושלמו."}</p>
      {result.last_decision && <blockquote data-last-interpretation="true">
        הפירוש האחרון: {result.last_decision.interpretation}<br />
        נימוק: {result.last_decision.reason}<br />
        תחולה: {result.last_decision.scope}<br />
        {result.last_decision.exceptions.length > 0 && <>חריגים: {result.last_decision.exceptions.join(" · ")}<br /></>}
        מקור: {result.last_decision.source_ref}
      </blockquote>}
      <label>השאלה לפירוש או לתיקון<select aria-label="שאלה לפירוש או לתיקון" style={field} value={questionId} onChange={e => setQuestionId(e.target.value)}>{result.questions.map(q => <option key={q.id} value={q.id}>{q.question}</option>)}</select></label>
      <label>הפירוש<textarea aria-label="פירוש מיוחס" style={field} maxLength={1200} value={interpretation} onChange={e => setInterpretation(e.target.value)} /></label>
      <label>נימוק<textarea aria-label="נימוק הפירוש" style={field} maxLength={600} value={reason} onChange={e => setReason(e.target.value)} /></label>
      <label>תחולה<input aria-label="תחולת הפירוש" style={field} maxLength={400} value={scope} onChange={e => setScope(e.target.value)} /></label>
      <label>חריגים, אחד בכל שורה<textarea aria-label="חריגי הפירוש" style={field} value={exceptions} onChange={e => setExceptions(e.target.value)} /></label>
      <button type="button" disabled={busy || !questionId || !interpretation.trim() || !reason.trim() || !scope.trim()} onClick={save}>שמור ואשר את הפירוש המיוחס</button>
      <label>שאלה לרזיאל על הפירוש<input aria-label="שאלה לרזיאל על הפירוש" style={field} value={ask} onChange={e => setAsk(e.target.value)} maxLength={2000} /></label>
      <button type="button" disabled={busy || !ask.trim()} onClick={askNext}>שאל את רזיאל</button>
      {answer && <p data-interview-answer="true" style={{ whiteSpace: "pre-line" }}>{answer}</p>}
    </>}
    {note && <p role="status">{note}</p>}
  </details>;
}
