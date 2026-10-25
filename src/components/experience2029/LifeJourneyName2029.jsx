import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { runLifeJourneyNameResearch } from "../../lib/research/lifeJourneyNameResearch.js";
import { buildLifeJourneyFindingTraversalPatch } from "../../lib/research/lifeJourneyPersonContext.js";
import CanonicalProgress from "../CanonicalProgress.jsx";

export default function LifeJourneyName2029({ name, personRef, memberRef, onContinue, onReturn }) {
  const navigate = useNavigate();
  const research = useResearch();
  const [state, setState] = useState({ phase: "loading", result: null, error: null });

  useEffect(() => {
    let alive = true;
    setState({ phase: "loading", result: null, error: null });
    runLifeJourneyNameResearch(name, { fetchNameLab: false })
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
  }, [name]);

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
  return <div className="person-journey" data-experience-surface="life-journey-name-2029">
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
        <div className="person-journey-capability-summary person-journey-name-summary" aria-label="סיכום מסע השם">
          <article><small>ערך רגיל</small><strong>{result.regularValue ?? "—"}</strong></article>
          <article><small>שיטות שחזרו</small><strong>{result.methodFindings.length}</strong></article>
        </div>

        <div className="person-journey-crosses" aria-label="ערכי השם לפי שיטה">
          <small>ערכי מנוע קנוניים</small>
          {result.methodFindings.length ? <div>{result.methodFindings.map(finding => <button
            type="button"
            className="person-journey-finding-link"
            key={finding.id}
            onClick={() => openFinding(finding)}
            aria-label={`פתח ${finding.methodLabel} ${finding.value} בדף המספר`}
          ><span>{finding.methodLabel}</span> <strong>{finding.value}</strong></button>)}</div>
            : <p>המנוע הקנוני לא החזיר ערכים. לא חושב ערך חלופי בדפדפן.</p>}
          <p>לחיצה על מספר פותחת את דף המספר הקיים ומחזירה אחר כך בדיוק למסע החיים.</p>
        </div>

        <div className="person-journey-actions">
          <button type="button" className="person-journey-primary" onClick={onContinue}>המשך למטריצת השם והתאריך</button>
          <small>המסר נוצר בשלב הבא רק לאחר פירוק התאריך והצלבת תוצאות מנוע מנורמלות.</small>
        </div>
      </> : null}
    </section>
  </div>;
}
