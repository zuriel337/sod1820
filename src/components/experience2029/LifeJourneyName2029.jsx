import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { runLifeJourneyNameResearch } from "../../lib/research/lifeJourneyNameResearch.js";
import { buildLifeJourneyFindingTraversalPatch } from "../../lib/research/lifeJourneyPersonContext.js";
import CanonicalProgress from "../CanonicalProgress.jsx";

const VISIBLE_NAME_LAB_ROWS = 12;

export default function LifeJourneyName2029({ name, personRef, memberRef, onContinue, onReturn }) {
  const navigate = useNavigate();
  const research = useResearch();
  const [showAll, setShowAll] = useState(false);
  const [state, setState] = useState({ phase: "loading", result: null, error: null });

  useEffect(() => {
    let alive = true;
    setShowAll(false);
    setState({ phase: "loading", result: null, error: null });
    runLifeJourneyNameResearch(name)
      .then((result) => {
        if (!alive) return;
        if (!result) {
          setState({ phase: "error", result: null, error: "מחקר השם אינו זמין כרגע." });
          return;
        }
        setState({ phase: "ready", result, error: null });
      })
      .catch((error) => {
        if (!alive) return;
        const blockedByEls = String(error?.message || error).includes("life_journey_name_research_els_boundary");
        setState({
          phase: "error",
          result: null,
          error: blockedByEls
            ? "מחקר השם נעצר משום שהמקור החזיר ELS בשלב שבו הוא מושבת."
            : "מחקר השם אינו זמין כרגע.",
        });
      });
    return () => { alive = false; };
  }, [name]);

  const displayRows = useMemo(() => {
    const rows = state.result?.displayFindings || [];
    return showAll ? rows : rows.slice(0, VISIBLE_NAME_LAB_ROWS);
  }, [showAll, state.result?.displayFindings]);

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
        <span>פרטי · Research Context</span>
      </div>
      <div className="person-journey-capability-nav">
        <button type="button" onClick={onReturn}>חזרה מדויקת למסע החיים</button>
        <p>השם מועבר בגוף הקריאה ובהקשר הפרטי בלבד. הוא אינו נכנס לכתובת או לטלמטריה.</p>
      </div>

      {state.phase === "loading" ? <CanonicalProgress
        title="פותח מחקר שם קנוני"
        detail="טוען את ערכי מנוע הגימטריה ואת שכבות NameLab הקיימות, בלי ELS."
        phase="מחקר שם"
        compact
      /> : null}
      {state.error ? <div className="person-journey-error" role="alert">{state.error}</div> : null}
      {state.phase === "ready" && result ? <>
        <div className="person-journey-capability-summary" aria-label="סיכום מסע השם">
          <article><small>ערך רגיל</small><strong>{result.regularValue ?? "—"}</strong></article>
          <article><small>שיטות קנוניות</small><strong>{result.methodFindings.length}</strong></article>
          <article><small>NameLab Findings</small><strong>{result.nameLabFindings.length}</strong></article>
          <article><small>שכבות עם תוצאה</small><strong>{result.tracksWithResults}</strong></article>
        </div>

        <div className="person-journey-crosses" aria-label="ערכי השם לפי שיטה">
          <small>ערכי מנוע קנוניים · כל ערך הוא Finding נפרד</small>
          {result.methodFindings.length ? <div>{result.methodFindings.map(finding => <button
            type="button"
            className="person-journey-finding-link"
            key={finding.id}
            onClick={() => openFinding(finding)}
            aria-label={`פתח ${finding.methodLabel} ${finding.value} בדף המספר`}
          ><span>{finding.methodLabel}</span> <strong>{finding.value}</strong></button>)}</div>
            : <p>המנוע הקנוני לא החזיר ערכי שיטות. לא חושב ערך חלופי בדפדפן.</p>}
          <p>לחיצה פותחת את דף המספר הקיים ומחזירה אחר כך בדיוק למסע החיים.</p>
        </div>

        <div className="person-journey-layer-list" aria-label="ממצאי NameLab מנורמלים לתצוגה">
          {displayRows.map(row => <article key={row.normalized_key}>
            <span aria-hidden="true">◇</span>
            <strong>{row.display_value}</strong>
            <small>{row.source_engines.map(source => source.engine).join(" · ")} · {row.occurrences} מופעים</small>
          </article>)}
        </div>
        {!result.displayFindings.length ? <div className="person-journey-empty">לא נמצאו כרגע ממצאי NameLab להצגה. ערכי הגימטריה נשארים זמינים למעלה.</div> : null}
        {result.displayFindings.length > VISIBLE_NAME_LAB_ROWS ? <button
          type="button"
          className="person-journey-secondary"
          onClick={() => setShowAll(value => !value)}
        >{showAll ? "הצג פחות" : `הצג את כל ${result.displayFindings.length} הממצאים`}</button> : null}
        {result.partial ? <p className="person-journey-note">NameLab לא היה זמין; לא נוצרה תוצאה חלופית. ערכי המנוע הקנוני מוצגים כרגיל.</p> : null}

        <div className="person-journey-actions">
          <button type="button" className="person-journey-primary" onClick={onContinue}>המשך לשם ותאריך</button>
          <small>ELS נשאר מחוץ לשרשרת הזאת. בני משפחה אחרים נחקרים רק לאחר בחירה והפעלה מפורשות.</small>
        </div>
      </> : null}
    </section>
  </div>;
}
