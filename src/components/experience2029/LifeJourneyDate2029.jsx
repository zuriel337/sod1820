import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import {
  compileLifeJourneyDateExpressionMatrix,
  createSupabaseLifeJourneyDateMatrixProviders,
  runLifeJourneyDateMatrixResearch,
} from "../../lib/research/lifeJourneyDateMatrix.js";
import { buildLifeJourneyFindingTraversalPatch } from "../../lib/research/lifeJourneyPersonContext.js";
import CanonicalProgress from "../CanonicalProgress.jsx";

const clean = value => String(value || "").trim();
const VISIBLE_RELATIONS = 6;

export default function LifeJourneyDate2029({ user, profile, personRef, memberRef, onContinue, onReturn }) {
  const navigate = useNavigate();
  const research = useResearch();
  const birthdate = clean(profile?.birthdate);
  const firstName = clean(profile?.firstName) || clean(profile?.name).split(/\s+/u)[0] || "";
  const surname = clean(profile?.surname);
  const previewMatrix = useMemo(() => compileLifeJourneyDateExpressionMatrix({
    firstName,
    surname,
    birthdateIso: birthdate,
  }), [birthdate, firstName, surname]);
  const [showAllRelations, setShowAllRelations] = useState(false);
  const [state, setState] = useState({ phase: previewMatrix ? "loading" : "missing", result: null, error: null });

  useEffect(() => {
    let alive = true;
    setShowAllRelations(false);
    if (!previewMatrix || !user?.id) {
      setState({ phase: "missing", result: null, error: null });
      return () => { alive = false; };
    }
    setState({ phase: "loading", result: null, error: null });
    const providers = createSupabaseLifeJourneyDateMatrixProviders(supabase);
    runLifeJourneyDateMatrixResearch({ firstName, surname, birthdateIso: birthdate, providers })
      .then(result => {
        if (!alive) return;
        if (!result) {
          setState({ phase: "missing", result: null, error: null });
          return;
        }
        setState({ phase: "ready", result, error: null });
      })
      .catch(() => {
        if (alive) setState({
          phase: "error",
          result: null,
          error: "מטריצת השם והתאריך אינה זמינה כרגע. לא חושבה תוצאה חלופית בדפדפן.",
        });
      });
    return () => { alive = false; };
  }, [birthdate, firstName, previewMatrix, surname, user?.id]);

  const openMethodValue = (row) => {
    const patch = buildLifeJourneyFindingTraversalPatch(research.context, {
      personRef,
      memberRef,
      findingId: row.id,
      value: row.value,
      sourceRef: row.sourceRef,
      versionRef: row.versionRef,
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
      label: "ערך ממטריצת שם ותאריך",
      reason: "explicit_person_date_matrix_finding",
    });
    if (!continued?.ok) {
      setState(previous => ({ ...previous, error: "לא ניתן לפתוח כרגע את הממצא במסלול המחקר." }));
      return;
    }
    navigate(patch.subject.href);
  };

  const result = state.result;
  const visibleRelations = showAllRelations
    ? result?.relationRows || []
    : result?.relationRows?.slice(0, VISIBLE_RELATIONS) || [];

  return <div className="person-journey is-2029" data-experience-surface="life-journey-date-2029">
    <section className="person-journey-panel person-journey-capability person-journey-matrix" data-experience-capability="life-journey-name-date-matrix">
      <div className="person-journey-section-head">
        <div><small>מסע החיים</small><h2>השם והתאריך שלי</h2></div>
        <span>פרטי · ללא ELS</span>
      </div>
      <div className="person-journey-capability-nav">
        <button type="button" onClick={onReturn}>חזרה מדויקת למסע החיים</button>
        <p>השם והתאריך נשלחים בגוף הקריאה המורשה בלבד. הם אינם נכנסים לכתובת או לטלמטריה.</p>
      </div>

      {state.phase === "loading" ? <CanonicalProgress
        title="בונה את מטריצת השם והתאריך"
        detail="מפרק לביטויים, מחשב בכל השיטות הזמינות ומצליב כל זוג דרך מנוע הקשרים הקנוני."
        phase="ביטויים → גימטריה → הצלבות → מסר"
        compact
      /> : null}

      {state.phase === "missing" ? <div className="person-journey-empty">כדי לפתוח את המחקר יש לשמור שם פרטי ותאריך לידה.</div> : null}
      {state.error ? <div className="person-journey-error" role="alert">{state.error}</div> : null}

      {state.phase === "ready" && result ? <>
        <div className="person-journey-capability-summary" aria-label="כיסוי מטריצת השם והתאריך">
          <article><small>התאריך העברי</small><strong className="is-text">{result.representation.hebrew.pretty}</strong></article>
          <article><small>ביטויים</small><strong>{result.coverage.expressionCount}</strong></article>
          <article><small>שיטות זמינות</small><strong>{result.coverage.methodCount}</strong></article>
          <article><small>זוגות שנבדקו</small><strong>{result.coverage.searchedPairCount}</strong></article>
        </div>

        <article className="person-journey-research-message" aria-labelledby="life-journey-date-message-title">
          <small>המסר המחקרי</small>
          <h3 id="life-journey-date-message-title">מה המטריצה מראה עכשיו</h3>
          <p>{result.message}</p>
          <span>המסר נגזר מתוצאות המנוע לאחר נרמול תלות. הוא אינו נבואה ולא נשען על חישוב מקומי.</span>
        </article>

        <details className="person-journey-engine-layer">
        <summary>שכבת המנוע · מה בדיוק נבדק</summary>
        <section className="person-journey-expression-matrix" aria-labelledby="life-journey-expression-matrix-title">
          <header>
            <div><small>מטריצת ביטויים</small><h3 id="life-journey-expression-matrix-title">מה בדיוק נבדק</h3></div>
            <span>{result.coverage.methodValueCount} ערכי שיטה</span>
          </header>
          <div>{result.expressions.map(item => <article key={item.id}>
            <small>{item.label}</small>
            <strong>{item.text}</strong>
            <span>{item.methods.length} שיטות</span>
          </article>)}</div>
        </section>
        </details>

        <section className="person-journey-relation-list" aria-labelledby="life-journey-relation-list-title">
          <header>
            <div><small>חתימת הצלבה</small><h3 id="life-journey-relation-list-title">החיבורים הבולטים</h3></div>
            <span>{result.coverage.relationCount} מתוך {result.coverage.searchedPairCount} זוגות</span>
          </header>
          {visibleRelations.length ? <div>{visibleRelations.map(row => <article key={row.id}>
            <strong>{row.left.label} ↔ {row.right.label}</strong>
            <p><b>{row.left.text}</b> · <b>{row.right.text}</b></p>
            <small>{Number.isSafeInteger(row.independentGroupCount)
              ? `${row.independentGroupCount} קבוצות שיטה עצמאיות לאחר נרמול`
              : "התכנסות קנונית לאחר נרמול תלות"}</small>
          </article>)}</div> : <div className="person-journey-empty">המנוע השלים את כל הזוגות ולא מצא כרגע התכנסות מהותית. זו אינה קביעה שאין קשר.</div>}
          {result.relationRows.length > VISIBLE_RELATIONS ? <button
            type="button"
            className="person-journey-secondary"
            onClick={() => setShowAllRelations(value => !value)}
          >{showAllRelations ? "הצג רק את החיבורים הבולטים" : `הצג את כל ${result.relationRows.length} החיבורים`}</button> : null}
        </section>

        <details className="person-journey-method-ledger">
          <summary>רשימות הגימטריה המלאות</summary>
          <p>כל ערך הגיע ממנוע הגימטריה הקנוני. לחיצה על מספר פותחת את דף המספר ומחזירה לכאן בדיוק.</p>
          <div>{result.expressions.map(item => <section key={item.id}>
            <header><strong>{item.label}</strong><span>{item.text}</span></header>
            <div>{item.methods.map(row => <button
              type="button"
              className="person-journey-finding-link"
              key={row.id}
              onClick={() => openMethodValue(row)}
              aria-label={`פתח ${row.methodLabel} ${row.value} עבור ${item.label}`}
            ><span>{row.methodLabel}</span><strong>{row.value}</strong></button>)}</div>
          </section>)}</div>
        </details>

        <div className="person-journey-actions">
          <button type="button" className="person-journey-primary" onClick={onContinue}>סיים וחזור למסע החיים</button>
          <small>המחקר מוגבל לאדם שנבחר. בני משפחה אינם נחקרים אוטומטית ו־ELS נשאר מחוץ לשלב הזה.</small>
        </div>
      </> : null}
    </section>
  </div>;
}
