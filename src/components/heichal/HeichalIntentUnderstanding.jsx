import React, { useMemo, useState } from "react";
import { projectHeichalEntryDirections, projectFreeQuestionPlan, questionWordChoices } from "../../lib/research/heichalEntryDirections.js";
import "./heichalIntentUnderstanding.css";

// "מה הבנתי": the first screen after a free question. Presentation only over the existing intent gate
// (projectHeichalEntryInput) and the existing Research Context. It runs nothing: every direction is a proposal,
// and Gematria/ELS/relations open only after the person explicitly chooses an EXACT expression.
export default function HeichalIntentUnderstanding({ question, busy = false, error = null, onChoose, onExact, onReset }) {
  const view = useMemo(() => projectHeichalEntryDirections(question), [question]);
  const words = useMemo(() => questionWordChoices(question), [question]);
  const [exactFor, setExactFor] = useState(null); // direction key waiting for an exact expression
  const [picked, setPicked] = useState([]);
  const [manual, setManual] = useState("");
  if (!view.ready) return null;

  const exactText = (manual.trim() || picked.join(" ")).trim();
  const choose = (direction) => {
    if (direction.action === "exact") { setExactFor(direction.key); setPicked([]); setManual(""); return; }
    setExactFor(null);
    onChoose?.(direction);
  };
  const toggleWord = (word) => setPicked((list) => (list.includes(word) ? list.filter((w) => w !== word) : [...list, word]));

  return (
    <section className="sod29-section heichal-intent" data-experience-capability="heichal-intent-understanding" aria-label="מה הבנתי מהשאלה">
      <div className="sod29-kicker">מה הבנתי · הטקסט נשמר כפי שנכתב</div>
      <blockquote className="heichal-intent-quote" dir="auto">{view.question}</blockquote>
      <div className="heichal-intent-chips">
        <span className="sod29-chip">שאלה חופשית</span>
        <span className="sod29-chip">לא ביטוי לחישוב</span>
        <span className="sod29-chip">לא הופעל אף מנוע</span>
      </div>
      <p className="sod29-muted heichal-intent-reason">{view.reason}</p>

      <div className="heichal-intent-directions" role="group" aria-label="כיווני מחקר מוצעים">
        {view.directions.map((direction) => (
          <button
            type="button"
            key={direction.key}
            className={"heichal-intent-direction" + (direction.recommended ? " is-recommended" : "")}
            aria-pressed={exactFor === direction.key}
            disabled={busy}
            onClick={() => choose(direction)}
          >
            <span className="heichal-intent-direction-head">
              <strong>{direction.label}</strong>
              <span className="sod29-chip">{direction.action === "exact" ? "דורש ביטוי מדויק" : direction.recommended ? "מומלץ · לא הופעל" : "מוצע · לא הופעל"}</span>
            </span>
            <small>{direction.status}</small>
          </button>
        ))}
      </div>
      <div className="sod29-actions"><button type="button" className="sod29-action" onClick={onReset}>שנה שאלה</button></div>

      {exactFor ? (
        <div className="sod29-state heichal-intent-exact" role="group" aria-label="בחירת ביטוי מדויק">
          <strong>איזה ביטוי מדויק לבדוק?</strong>
          <p className="sod29-muted">בחר מילים מהשאלה לפי הסדר, או הקלד ביטוי. רק הביטוי שתבחר ייבדק; השאלה כולה לא תחושב.</p>
          <div className="heichal-intent-words">
            {words.map((word) => (
              <button type="button" key={word} className={"sod29-action" + (picked.includes(word) ? " primary" : "")} aria-pressed={picked.includes(word)} onClick={() => { setManual(""); toggleWord(word); }}>{word}</button>
            ))}
          </div>
          <input className="sod29-input" value={manual} onChange={(e) => { setManual(e.target.value); setPicked([]); }} placeholder="או הקלד ביטוי מדויק" aria-label="ביטוי מדויק" />
          <div className="sod29-actions">
            <button type="button" className="sod29-action primary" disabled={!exactText || busy} onClick={() => onExact?.(exactText, exactFor)}>
              {busy ? "פותר את הביטוי…" : "אשר ביטוי מדויק"}
            </button>
            <button type="button" className="sod29-action" onClick={() => setExactFor(null)}>חזרה לכיוונים</button>
          </div>
          {error ? <div className="sod29-state error" role="status">{error}</div> : null}
        </div>
      ) : null}
    </section>
  );
}

// The plan for the direction the person chose. Shown as a proposal: nothing here was executed.
export function HeichalFreeQuestionPlan({ question, direction }) {
  const plan = useMemo(() => projectFreeQuestionPlan(question, direction || "sources"), [question, direction]);
  const [showWhy, setShowWhy] = useState(false);
  if (!plan.ready) return null;
  return (
    <section className="sod29-section heichal-intent" data-experience-capability="heichal-free-question-plan" aria-label="תוכנית מוצעת לשאלה">
      <div className="sod29-kicker">תוכנית מוצעת · לא הופעלה</div>
      <p className="sod29-muted">{plan.message}</p>
      <ol className="sod29-list" aria-label="צעדים מוצעים">
        {plan.steps.map((step) => (
          <li className="sod29-row" key={step.key}>
            <div><strong>{step.label}</strong><small className="heichal-intent-step">{step.explanation}</small></div>
            <span className="sod29-chip">מוצע · לא הופעל</span>
          </li>
        ))}
      </ol>
      <div className="sod29-actions">
        <button type="button" className="sod29-action" aria-expanded={showWhy} onClick={() => setShowWhy((x) => !x)}>{showWhy ? "הסתר הסבר" : "למה הכיוון הזה?"}</button>
      </div>
      {showWhy ? (
        <div className="sod29-state" data-decoding-explain-why="true">
          <strong>למה התוכנית הזו?</strong>
          <p>המתכנן הקנוני סיווג את השאלה כאסטרטגיה מסוג {plan.strategy || "לא ידוע"} ולא בחר כלים אוטומטית. הכיוון נבחר על ידך, והניסוח כאן אינו קובע שקיים מופע, רמז או קשר.</p>
        </div>
      ) : null}
    </section>
  );
}
