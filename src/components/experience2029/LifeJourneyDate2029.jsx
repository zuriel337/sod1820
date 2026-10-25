import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import {
  createSupabasePersonalDateCrossProvider,
  gregorianToHebrewDateRepresentation,
  runPersonalDateResearch,
} from "../../lib/research/personalDateResearch.js";
import { buildAccessDescriptor } from "../../lib/research/researchPlanV2.js";
import { buildLifeJourneyFindingTraversalPatch } from "../../lib/research/lifeJourneyPersonContext.js";
import CanonicalProgress from "../CanonicalProgress.jsx";

const clean = value => String(value || "").trim();

export default function LifeJourneyDate2029({ user, profile, personRef, memberRef, onContinue, onReturn }) {
  const navigate = useNavigate();
  const research = useResearch();
  const birthdate = clean(profile?.birthdate);
  const representation = useMemo(() => gregorianToHebrewDateRepresentation(birthdate), [birthdate]);
  const [state, setState] = useState({ phase: birthdate ? "loading" : "missing", crossFindings: [], error: null });

  useEffect(() => {
    let alive = true;
    if (!birthdate || !representation || !user?.id) {
      setState({ phase: "missing", crossFindings: [], error: null });
      return () => { alive = false; };
    }
    setState({ phase: "loading", crossFindings: [], error: null });
    const accessDescriptor = buildAccessDescriptor({
      user_ref: user.id,
      authenticated: true,
      verified_authority: { source: "supabase_auth", subject_verified: true },
    }, "authenticated_user");
    const crossProvider = createSupabasePersonalDateCrossProvider(supabase);
    runPersonalDateResearch({
      name: clean(profile?.firstName) || clean(profile?.name),
      surname: clean(profile?.surname) || null,
      birthdateIso: birthdate,
      crossProvider,
      accessDescriptor,
    }).then((bundle) => {
      if (!alive) return;
      const seen = new Set();
      const crossFindings = (Array.isArray(bundle?.findings) ? bundle.findings : [])
        .filter(finding => finding?.kind === "date_cross")
        .map(finding => ({
          id: clean(finding?.id),
          value: Number(finding?.subject?.value),
          sourceRef: clean(finding?.source?.sourceRef),
          versionRef: clean(finding?.source?.adapter),
        }))
        .filter(finding => finding.id && Number.isSafeInteger(finding.value))
        .filter(finding => {
          const key = `${finding.id}:${finding.value}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      setState({ phase: "ready", crossFindings, error: null });
    }).catch(() => {
      if (alive) setState({ phase: "error", crossFindings: [], error: "הצלבת השם והתאריך אינה זמינה כרגע." });
    });
    return () => { alive = false; };
  }, [birthdate, profile?.firstName, profile?.name, profile?.surname, representation, user?.id]);

  const openFinding = (finding) => {
    const patch = buildLifeJourneyFindingTraversalPatch(research.context, {
      personRef,
      memberRef,
      findingId: finding.id,
      value: finding.value,
      sourceRef: finding.sourceRef,
      versionRef: finding.versionRef,
    });
    if (!patch) {
      setState(previous => ({ ...previous, error: "לא ניתן לפתוח את הממצא בלי הקשר אדם תקין." }));
      return;
    }
    const result = research.continueResearchPath?.({
      context: patch,
      kind: "person_life",
      mode: "organic",
      surface: "life_journey_2029",
      href: patch.subject.href,
      label: "ממצא שם ותאריך",
      reason: "explicit_person_finding_traversal",
    });
    if (!result?.ok) {
      setState(previous => ({ ...previous, error: "לא ניתן לפתוח כרגע את הממצא במסלול המחקר." }));
      return;
    }
    navigate(patch.subject.href);
  };

  return <div className="person-journey" data-experience-surface="life-journey-date-2029">
    <section className="person-journey-panel person-journey-capability" data-experience-capability="life-journey-name-date-bridge">
      <div className="person-journey-section-head">
        <div><small>מסע החיים</small><h2>שם ותאריך</h2></div>
        <span>תחנת מעבר פרטית</span>
      </div>
      <div className="person-journey-capability-nav">
        <button type="button" onClick={onReturn}>חזרה מדויקת למסע החיים</button>
        <p>השם והתאריך נשארים ב־Research Context הפרטי ואינם נכנסים לכתובת.</p>
      </div>

      {state.phase === "loading" ? <CanonicalProgress
        title="מחבר שם ותאריך"
        detail="ממיר את התאריך ומבקש מהמנוע הקנוני נקודות מפגש מחושבות."
        phase="שם ↔ תאריך"
        compact
      /> : null}

      <div className="person-journey-capability-summary" aria-label="סיכום שם ותאריך">
        <article><small>התאריך העברי</small><strong className="is-text">{representation?.hebrew?.pretty || "לא נשמר"}</strong></article>
        <article><small>נקודות מפגש</small><strong>{state.phase === "ready" ? state.crossFindings.length : "—"}</strong></article>
      </div>

      {state.phase === "missing" ? <div className="person-journey-empty">לא נשמר תאריך לאדם הזה. אפשר לחזור למרכז המשפחתי ולהשלים אותו בהמשך.</div> : null}
      {state.error ? <div className="person-journey-error" role="alert">{state.error}</div> : null}
      {state.phase === "ready" ? <div className="person-journey-crosses">
        <small>נקודות מפגש מחושבות שם ↔ תאריך</small>
        {state.crossFindings.length ? <div>{state.crossFindings.map(finding => <button
          type="button"
          className="person-journey-finding-link"
          key={`${finding.id}:${finding.value}`}
          onClick={() => openFinding(finding)}
          aria-label={`פתח את ממצא ${finding.value}`}
        >{finding.value}</button>)}</div> : <p>לא נמצאה נקודת מפגש בטווח שהמנוע בדק. זו אינה קביעה אישית.</p>}
        {state.crossFindings.length ? <p>כל מספר פותח במפורש את דף המספר הקיים. אלה נגזרות מנוע בלבד — לא פרשנות, גורל או החלטה.</p> : null}
      </div> : null}

      <div className="person-journey-actions">
        <button type="button" className="person-journey-primary" disabled={state.phase === "loading" || !onContinue} onClick={onContinue}>סיים וחזור למרכז המשפחתי</button>
        <small>התחנה מסכמת את האדם שנבחר בלבד. היא אינה מפעילה ELS ואינה חוקרת בני משפחה אחרים.</small>
      </div>
    </section>
  </div>;
}
