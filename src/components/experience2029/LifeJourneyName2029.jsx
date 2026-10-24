import React, { useEffect, useMemo, useState } from "react";
import { buildJourney } from "../../lib/nameJourney.js";
import { getNameProtocol } from "../../lib/supabase.js";
import CanonicalProgress from "../CanonicalProgress.jsx";

const STATUS_LABELS = Object.freeze({
  ok: "הושלם",
  empty: "הושלם ללא ממצא",
  skipped: "לא הופעל",
  fail: "לא הושלם",
  pending: "ממתין",
});

export default function LifeJourneyName2029({ name, onContinue, onReturn }) {
  const [state, setState] = useState({ phase: "loading", document: null, error: null });

  useEffect(() => {
    let alive = true;
    setState({ phase: "loading", document: null, error: null });
    getNameProtocol(name)
      .then((document) => {
        if (!alive) return;
        if (!document || document.error) {
          setState({ phase: "error", document, error: "מחקר השם אינו זמין כרגע." });
          return;
        }
        setState({ phase: "ready", document, error: null });
      })
      .catch(() => {
        if (alive) setState({ phase: "error", document: null, error: "מחקר השם אינו זמין כרגע." });
      });
    return () => { alive = false; };
  }, [name]);

  const journey = useMemo(
    () => state.document && !state.document.error ? buildJourney(state.document) : null,
    [state.document],
  );

  return <div className="person-journey" data-experience-surface="life-journey-name-2029">
    <section className="person-journey-panel person-journey-capability" data-experience-capability="life-journey-name-adapter">
      <div className="person-journey-section-head">
        <div><small>מסע החיים</small><h2>מסע השם</h2></div>
        <span>פרטי · Research Context</span>
      </div>
      <div className="person-journey-capability-nav">
        <button type="button" onClick={onReturn}>חזרה מדויקת למסע החיים</button>
        <p>השם מועבר בזיכרון הפרטי בלבד. כתובת העמוד נשארת קבועה.</p>
      </div>

      {state.phase === "loading" ? <CanonicalProgress
        title="פותח את מסע השם הקיים"
        detail="טוען את מסמך המחקר הקנוני ומקרין אותו למסע החיים."
        phase="מחקר שם"
        compact
      /> : null}
      {state.phase === "error" ? <div className="person-journey-error" role="alert">{state.error}</div> : null}
      {state.phase === "ready" && journey?.header ? <>
        <div className="person-journey-capability-summary" aria-label="סיכום מסע השם">
          <article><small>ערך</small><strong>{journey.header.value ?? "—"}</strong></article>
          <article><small>ממצאים</small><strong>{journey.header.findings}</strong></article>
          <article><small>הצלבות</small><strong>{journey.header.crossings}</strong></article>
          <article><small>עומק</small><strong>{journey.header.depth ?? "—"}</strong></article>
        </div>
        <ol className="person-journey-step-list" aria-label="שלבי מסע השם">
          {journey.steps.map((step) => <li key={step.id} data-state={step.st}>
            <span>{step.label}</span>
            <small>{STATUS_LABELS[step.st] || STATUS_LABELS.pending}</small>
          </li>)}
        </ol>
        <div className="person-journey-layer-list" aria-label="שכבות מסע השם">
          {journey.layers.filter((layer) => layer.kind !== "raw").map((layer) => <article key={layer.id}>
            <span aria-hidden="true">{layer.icon}</span>
            <strong>{layer.title}</strong>
            <small>{layer.kind === "fact" ? "שכבת ממצא עם מקור" : "שכבת סיכום"}</small>
          </article>)}
        </div>
        <div className="person-journey-actions">
          <button type="button" className="person-journey-primary" onClick={onContinue}>המשך לשם ותאריך</button>
          <small>לפני ELS עוברים בתחנת בדיקה פרטית ובוחרים במפורש את צורת השם.</small>
        </div>
      </> : null}
    </section>
  </div>;
}
