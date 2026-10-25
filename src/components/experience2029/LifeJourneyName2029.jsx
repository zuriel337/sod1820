import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { runLifeJourneyNameResearch } from "../../lib/research/lifeJourneyNameResearch.js";
import {
  createNameLabReflectionRuntimeProviders,
  NAME_LAB_REFLECTION_FAILURE_REASON,
  runNameLabReflectionRuntime,
} from "../../lib/research/nameLabReflectionRuntime.js";
import { buildLifeJourneyFindingTraversalPatch } from "../../lib/research/lifeJourneyPersonContext.js";
import { getAiAnalysis, getNameMultiWithoutEls, supabase } from "../../lib/supabase.js";
import CanonicalProgress from "../CanonicalProgress.jsx";

const VISIBLE_NAME_LAB_ROWS = 12;

const REFLECTION_ERROR = Object.freeze({
  [NAME_LAB_REFLECTION_FAILURE_REASON.INVALID_NAME]: "לא ניתן ליצור מסר בלי שם שנבחר במפורש.",
  [NAME_LAB_REFLECTION_FAILURE_REASON.ZERO_FINDINGS]: "אין כרגע מספיק ממצאי NameLab כדי להרכיב מסר בלי להמציא.",
  [NAME_LAB_REFLECTION_FAILURE_REASON.AI_UNAVAILABLE]: "מנוע הניסוח אינו זמין כרגע. לא נשלפו קלפים ולא נוצר מסר חלופי.",
});

function ReflectionExperience({ state, onOpen }) {
  const reflection = state.result?.payload?.messageReflection || null;
  const relationByPosition = useMemo(() => new Map(
    (reflection?.reflection_check?.cards || []).map((row) => [row.position, row])
  ), [reflection]);

  return <section
    className="person-journey-reflection"
    data-experience-capability="life-journey-normalized-message-reflection"
    aria-labelledby="life-journey-reflection-title"
  >
    <header>
      <div>
        <small>מסר מנורמל · שכבת השתקפות</small>
        <h3 id="life-journey-reflection-title">המסר ושלושת הקלפים</h3>
      </div>
      {state.phase === "ready" ? <span>המסר הוקפא לפני הקלפים</span> : null}
    </header>

    {state.phase === "idle" ? <div className="person-journey-reflection-intro">
      <p>המערכת תרכיב מסר רק מתוך ממצאי NameLab שכבר נטענו, תקפיא אותו, ואז תפתח שלושה קלפי השתקפות: מצב, אתגר ועצה.</p>
      <button type="button" className="person-journey-primary" onClick={onOpen}>פתח מסר ושלושה קלפים</button>
    </div> : null}

    {state.phase === "loading" ? <CanonicalProgress
      title="מרכיב את מסר השם"
      detail="מנרמל את הממצאים, מקפיא את המסר ורק אחר כך פותח שלושה קלפים."
      phase="מסר וקלפים"
      compact
    /> : null}

    {state.phase === "error" ? <div className="person-journey-reflection-failure" role="alert">
      <p>{state.error}</p>
      <button type="button" className="person-journey-secondary" onClick={onOpen}>נסה שוב</button>
    </div> : null}

    {state.phase === "ready" && reflection ? <>
      <article className="person-journey-reflection-message">
        <small>המסר המוקפא</small>
        <p>{reflection.message}</p>
      </article>

      {reflection.motifs?.length ? <div className="person-journey-reflection-motifs" aria-label="מוטיבים במסר">
        {reflection.motifs.map((motif) => <article key={motif.key}>
          <strong>{motif.label || "מוטיב"}</strong>
          {motif.summary ? <p>{motif.summary}</p> : null}
          {motif.frame?.power ? <small><b>כוח:</b> {motif.frame.power}</small> : null}
          {motif.frame?.shadow ? <small><b>צל:</b> {motif.frame.shadow}</small> : null}
          {motif.frame?.balance ? <small><b>איזון:</b> {motif.frame.balance}</small> : null}
          {motif.frame?.action ? <small><b>כיוון:</b> {motif.frame.action}</small> : null}
        </article>)}
      </div> : null}

      <div className="person-journey-reflection-cards" aria-label="שלושה קלפי השתקפות">
        {reflection.cards.map((card) => {
          const relation = relationByPosition.get(card.position);
          const echoed = relation?.relation === "echo";
          return <article key={`${card.position}:${card.n}`} data-relation={echoed ? "echo" : "none"}>
            <div><small>{card.position}</small><span>{card.n}</span></div>
            <strong>{card.arcana}</strong>
            {card.theme ? <p>{card.theme}</p> : null}
            {card.meaning ? <p>{card.meaning}</p> : null}
            <footer>
              {card.letter ? <span>אות · {card.letter}</span> : null}
              {card.orientation ? <span>{card.orientation}</span> : null}
              <span>{echoed ? "הד מבני למסר" : "ללא הד מבני מזוהה"}</span>
            </footer>
          </article>;
        })}
      </div>

      <p className="person-journey-note">הקלפים הם שכבת השתקפות בלבד: משקל הראיה שלהם אפס, הם אינם משנים את המסר ואינם קביעה או נבואה. המשיכה הנוכחית נשמרת בזיכרון המסך בלבד ואינה נפתחת אוטומטית מחדש לאחר רענון.</p>
    </> : null}
  </section>;
}

export default function LifeJourneyName2029({ name, personRef, memberRef, onContinue, onReturn }) {
  const navigate = useNavigate();
  const research = useResearch();
  const reflectionRequestRef = useRef(0);
  const [showAll, setShowAll] = useState(false);
  const [state, setState] = useState({ phase: "loading", result: null, error: null });
  const [reflectionState, setReflectionState] = useState({ phase: "idle", result: null, error: null });

  useEffect(() => {
    let alive = true;
    reflectionRequestRef.current += 1;
    setShowAll(false);
    setReflectionState({ phase: "idle", result: null, error: null });
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
    return () => {
      alive = false;
      reflectionRequestRef.current += 1;
    };
  }, [name]);

  const openReflection = async () => {
    if (reflectionState.phase === "loading") return;
    const requestId = ++reflectionRequestRef.current;
    setReflectionState({ phase: "loading", result: null, error: null });
    try {
      const providers = createNameLabReflectionRuntimeProviders({
        getNameMulti: getNameMultiWithoutEls,
        getAiAnalysis,
        supabase,
      });
      const result = await runNameLabReflectionRuntime({ name, ...providers });
      if (requestId !== reflectionRequestRef.current) return;
      if (result?.status !== "ok" || !result?.payload?.messageReflection) {
        setReflectionState({
          phase: "error",
          result: null,
          error: REFLECTION_ERROR[result?.reason] || "לא ניתן להרכיב כרגע מסר מבוסס־ממצאים.",
        });
        return;
      }
      setReflectionState({ phase: "ready", result, error: null });
    } catch {
      if (requestId !== reflectionRequestRef.current) return;
      setReflectionState({
        phase: "error",
        result: null,
        error: "המסר או הקלפים לא הושלמו. לא נשמרה תוצאה חלקית ולא נוצר מסר חלופי.",
      });
    }
  };

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

        <ReflectionExperience state={reflectionState} onOpen={openReflection} />

        <div className="person-journey-actions">
          <button type="button" className="person-journey-primary" onClick={onContinue}>המשך לשם ותאריך</button>
          <small>ELS נשאר מחוץ לשרשרת הזאת. בני משפחה אחרים נחקרים רק לאחר בחירה והפעלה מפורשות.</small>
        </div>
      </> : null}
    </section>
  </div>;
}
