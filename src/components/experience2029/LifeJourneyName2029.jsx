import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { runLifeJourneyNameResearch } from "../../lib/research/lifeJourneyNameResearch.js";
import { buildLifeJourneyFindingTraversalPatch } from "../../lib/research/lifeJourneyPersonContext.js";
import CanonicalProgress from "../CanonicalProgress.jsx";

export default function LifeJourneyName2029({ name, profile, personRef, memberRef, onContinue, onReturn }) {
  const navigate = useNavigate();
  const research = useResearch();
  const [state, setState] = useState({ phase: "loading", result: null, error: null });

  useEffect(() => {
    let alive = true;
    setState({ phase: "loading", result: null, error: null });
    runLifeJourneyNameResearch({
      firstName: profile?.firstName,
      surname: profile?.surname,
      fullName: profile?.name || name,
    })
      .then(result => {
        if (!alive) return;
        setState(result
          ? { phase: "ready", result, error: null }
          : { phase: "error", result: null, error: "מחקר השם אינו זמין כרגע." });
      })
      .catch(() => {
        if (alive) setState({ phase: "error", result: null, error: "מחקר השם אינו זמין כרגע." });
      });
    return () => { alive = false; };
  }, [name, profile?.firstName, profile?.name, profile?.surname]);

  const openFinding = (finding) => {
    const patch = buildLifeJourneyFindingTraversalPatch(research.context, {
      personRef,
      memberRef,
      findingId: finding.id,
      value: finding.value,
      sourceRef: finding.sourceRef,
      versionRef: finding.versionRef,
      focusKind: "life_journey_gematria",
    });
    if (!patch) {
      setState(previous => ({ ...previous, error: "לא ניתן לפתוח את הממצא בלי הקשר אדם תקין." }));
      return;
    }
    const continued = research.continueResearchPath?.({
      context: patch,
      kind: "person_life",
      mode: "organic",
      surface: "life_journey_2029",
      href: patch.subject.href,
      label: "ממצא גימטריה של שם",
      reason: "explicit_person_finding_traversal",
    });
    if (!continued?.ok) {
      setState(previous => ({ ...previous, error: "לא ניתן לפתוח כרגע את הממצא במסלול המחקר." }));
      return;
    }
    navigate(patch.subject.href);
  };

  const result = state.result;
  return <div className="person-journey is-2029" data-experience-surface="life-journey-name-2029">
    <section className="person-journey-panel person-journey-capability" data-experience-capability="life-journey-name-adapter">
      <div className="person-journey-section-head">
        <div><small>מסע החיים</small><h2>מסע השם</h2></div>
        <span>פרטי · ללא ELS</span>
      </div>
      <div className="person-journey-capability-nav">
        <button type="button" onClick={onReturn}>חזרה מדויקת למסע החיים</button>
        <p>מוצגות רק תוצאות גימטריה שחזרו מהמנוע הקנוני, בלי שכבת פרשנות מקבילה.</p>
      </div>

      {state.phase === "loading" ? <CanonicalProgress
        title="פותח את ערכי השם"
        detail="טוען את תוצאות מנוע הגימטריה הקנוני בלי להפעיל ELS."
        phase="מחקר שם"
        compact
      /> : null}
      {state.error ? <div className="person-journey-error" role="alert">{state.error}</div> : null}
      {state.phase === "ready" && result ? <>
        <article className="person-journey-research-message" aria-label="מסר מחקר השם">
          <small>מסר מנורמל · מבוסס תוצאות מנוע</small>
          <h3>{result.rawName}</h3>
          <p>{result.message}</p>
          <span>המסר נבנה פנימית משיטות קנוניות ומקבוצות שיטה עצמאיות. אין כאן קלפים, ELS או ניתוח אישיות.</span>
        </article>

        <div className="person-journey-capability-summary person-journey-name-summary" aria-label="סיכום מסע השם">
          <article><small>ערך רגיל</small><strong>{result.regularValue ?? "—"}</strong></article>
          <article><small>שיטות קנוניות</small><strong>{result.coverage.methodCount}</strong></article>
          <article><small>רכיבי שם</small><strong>{result.coverage.expressionCount}</strong></article>
        </div>

        <details className="person-journey-engine-layer">
        <summary>שכבת המנוע · רשימות הגימטריה של רכיבי השם</summary>
        <section className="person-journey-expression-matrix" aria-label="רשימות הגימטריה של רכיבי השם">
          <header><div><small>כל השיטות הזמינות</small><h3>רשימות הגימטריה</h3></div><span>{result.coverage.methodValueCount} ערכי מנוע</span></header>
          <div>{result.expressions.map(item => <article key={item.id}>
            <small>{item.label}</small>
            <strong>{item.text}</strong>
            <span>{item.methods.length} שיטות</span>
            <div>{item.methods.map(finding => <button
              type="button"
              className="person-journey-finding-link"
              key={finding.id}
              onClick={() => openFinding(finding)}
              aria-label={`פתח ${finding.methodLabel} ${finding.value} בדף המספר`}
            >{finding.methodLabel} <strong>{finding.value}</strong></button>)}</div>
          </article>)}</div>
          <p>לחיצה על מספר פותחת את דף המספר הקיים ומחזירה אחר כך בדיוק למסע החיים.</p>
        </section>
        </details>

        <div className="person-journey-actions">
          <button type="button" className="person-journey-primary" disabled={!profile?.birthdate} onClick={onContinue}>המשך למטריצת השם והתאריך</button>
          <small>{profile?.birthdate ? "השלב הבא מפרק את התאריך ומצליב אותו עם השם." : "כדי להמשיך למטריצת התאריך, חזרו למסע והשלימו תאריך לידה."}</small>
        </div>
      </> : null}
    </section>
  </div>;
}
