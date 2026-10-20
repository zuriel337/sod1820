import React, { useMemo, useState } from "react";
import {
  HEICHAL_DECODING_DIRECTIONS,
  projectHeichalFirstDecoding,
} from "../../lib/research/heichalFirstDecodingPlan.js";

// A read-only, truthful first step over the EXISTING Research Plan + Research Context.
// "Pause" here pauses suggestions, never claims to cancel a server execution.
export default function HeichalGuidedFirstStep({
  subject,
  projection = null,
  loading = false,
  onRunNumber = null,
}) {
  const [direction, setDirection] = useState("overview");
  const [showWhy, setShowWhy] = useState(false);
  const [paused, setPaused] = useState(false);
  const family = subject?.type === "number" ? "number" : "phrase";
  const directions = HEICHAL_DECODING_DIRECTIONS[family];
  const plan = useMemo(() => projectHeichalFirstDecoding({
    subject, direction, projection, loading,
  }), [subject?.type, subject?.id, subject?.label, direction, projection, loading]);

  if (!plan.ready) return null;

  return (
    <section className="sod29-section" data-experience-capability="heichal-guided-decoding-stage1" aria-label="תוכנית פענוח מונחית">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">GUIDED DECODING · RESEARCH PLAN · READ ONLY</div>
          <h2>איך נתחיל לפענח?</h2>
          <p className="sod29-muted">
            אותו מנוע מחקר, אותו מקור ואותו עוגן. אתה בוחר את כיוון הבדיקה, ורזיאל יוכל
            להמשיך רק דרך הכלים וההרשאות הקיימים.
          </p>
        </div>
      </div>
      <div className="sod29-actions" role="group" aria-label="בחר כיוון לפענוח">
        {directions.map((entry) => (
          <button
            className={"sod29-action" + (direction === entry.key ? " primary" : "")}
            type="button"
            key={entry.key}
            aria-pressed={direction === entry.key}
            onClick={() => { setDirection(entry.key); setPaused(false); }}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div className="sod29-spine" aria-label="תוכנית הפענוח הנוכחית">
        <span>מקור נוכחי · {plan.type === "number" ? "מספר" : "ביטוי"} · {plan.label}</span>
        <span>כיוון · {directions.find((entry) => entry.key === direction)?.label}</span>
        <span>מצב · הצעה בלבד</span>
      </div>
      <p className="sod29-muted">{plan.message}</p>
      {paused ? (
        <div className="sod29-state" role="status">
          הצגת הצעדים הושהתה לבקשתך. אין כאן עבודת רקע או קריאת מנוע שצריך לבטל.
        </div>
      ) : plan.steps.length ? (
        <ol className="sod29-list" aria-label="צעדים מוצעים">
          {plan.steps.map((step) => (
            <li className="sod29-row" key={step.key}>
              <div>
                <strong>{step.label}</strong>
                <small>{step.explanation}</small>
              </div>
              <span className="sod29-chip">מוצע · לא הופעל</span>
            </li>
          ))}
        </ol>
      ) : null}
      <div className="sod29-actions">
        {plan.canRunBoundedNumber && typeof onRunNumber === "function" ? (
          <button className="sod29-action primary" type="button" onClick={onRunNumber}>
            בדוק את המספר במנוע הקיים
          </button>
        ) : null}
        <button className="sod29-action" type="button" aria-expanded={showWhy} onClick={() => setShowWhy((x) => !x)}>
          {showWhy ? "הסתר הסבר" : "למה הכיוון הזה?"}
        </button>
        <button className="sod29-action" type="button" onClick={() => setPaused((x) => !x)}>
          {paused ? "המשך הצגת תוכנית" : "השהה הצעות"}
        </button>
      </div>
      {showWhy ? (
        <div className="sod29-state" data-decoding-explain-why="true">
          <strong>למה התוכנית הזו?</strong>
          <p>
            המתכנן הקנוני בחר אסטרטגיה מסוג {plan.strategy || "לא ידוע"} לפי סוג העוגן
            וכיוון השאלה. הוא לא קבע שקיים רמז ולא אימת קשר. פעולות שלא מחוברות
            לביצוע ישיר מסומנות במפורש ככאלו.
          </p>
          <p className="sod29-muted">
            {plan.hasProjection
              ? <>בהקרנה הנוכחית: {plan.counts.findings ?? "לא זמין"} ממצאים,
                  {plan.counts.relations ?? "לא זמין"} קשרים ו-{plan.counts.sources ?? "לא זמין"} הפניות מקור.
                  אלו נתוני תצוגה בלבד, לא ספירת ראיות עצמאיות.</>
              : "נתוני ההקרנה לא נטענו. זה אינו חיפוש שהחזיר אפס ממצאים."}
          </p>
        </div>
      ) : null}
    </section>
  );
}
