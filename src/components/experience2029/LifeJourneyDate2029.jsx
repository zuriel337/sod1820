import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import {
  createSupabasePersonalDateCrossProvider,
  gregorianToHebrewDateRepresentation,
  runPersonalDateResearch,
} from "../../lib/research/personalDateResearch.js";
import { buildAccessDescriptor } from "../../lib/research/researchPlanV2.js";
import CanonicalProgress from "../CanonicalProgress.jsx";

const clean = value => String(value || "").trim();

function nameChoices(profile) {
  const full = clean(profile?.name);
  const first = clean(profile?.firstName) || full.split(/\s+/).filter(Boolean)[0] || "";
  const options = [
    full && { id: "full", label: "השם המלא", value: full },
    first && { id: "first", label: "השם הפרטי", value: first },
  ].filter(Boolean);
  return options.filter((item, index) => options.findIndex(option => option.value === item.value) === index);
}

export default function LifeJourneyDate2029({ user, profile, onContinue, onReturn }) {
  const choices = useMemo(() => nameChoices(profile), [profile?.firstName, profile?.name]);
  const birthdate = clean(profile?.birthdate);
  const representation = useMemo(() => gregorianToHebrewDateRepresentation(birthdate), [birthdate]);
  const [selectedName, setSelectedName] = useState(() => choices[0]?.value || "");
  const [state, setState] = useState({ phase: birthdate ? "loading" : "missing", crossValues: [], error: null });

  useEffect(() => {
    setSelectedName(choices[0]?.value || "");
  }, [choices]);

  useEffect(() => {
    let alive = true;
    if (!birthdate || !representation || !user?.id) {
      setState({ phase: "missing", crossValues: [], error: null });
      return () => { alive = false; };
    }
    setState({ phase: "loading", crossValues: [], error: null });
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
      const crossValues = [...new Set((Array.isArray(bundle?.findings) ? bundle.findings : [])
        .filter(finding => finding?.kind === "date_cross")
        .map(finding => Number(finding?.subject?.value))
        .filter(Number.isSafeInteger))];
      setState({ phase: "ready", crossValues, error: null });
    }).catch(() => {
      if (alive) setState({ phase: "error", crossValues: [], error: "הצלבת השם והתאריך אינה זמינה כרגע." });
    });
    return () => { alive = false; };
  }, [birthdate, profile?.firstName, profile?.name, profile?.surname, representation, user?.id]);

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
        <article><small>נקודות מפגש</small><strong>{state.phase === "ready" ? state.crossValues.length : "—"}</strong></article>
      </div>

      {state.phase === "missing" ? <div className="person-journey-empty">לא נשמר תאריך לאדם הזה. אפשר להמשיך ל־ELS בשם בלבד; לא תוצג הצלבת תאריך.</div> : null}
      {state.error ? <div className="person-journey-error" role="alert">{state.error}</div> : null}
      {state.phase === "ready" ? <div className="person-journey-crosses">
        <small>נקודות מפגש מחושבות שם ↔ תאריך</small>
        {state.crossValues.length ? <div>{state.crossValues.map(value => <span key={value}>{value}</span>)}</div> : <p>לא נמצאה נקודת מפגש בטווח שהמנוע בדק. זו אינה קביעה אישית.</p>}
        {state.crossValues.length ? <p>אלה נגזרות מנוע בלבד — לא פרשנות, גורל או החלטה.</p> : null}
      </div> : null}

      <fieldset className="person-journey-name-choice">
        <legend>איזה שם להעביר ל־ELS?</legend>
        {choices.map(choice => <label key={choice.id}>
          <input type="radio" name="life-journey-els-name" value={choice.value} checked={selectedName === choice.value} onChange={() => setSelectedName(choice.value)} />
          <span><strong>{choice.label}</strong><small>{choice.value}</small></span>
        </label>)}
      </fieldset>

      <div className="person-journey-actions">
        <button type="button" className="person-journey-primary" disabled={!selectedName || state.phase === "loading" || !onContinue} onClick={() => onContinue?.(selectedName)}>המשך ל־ELS בשם הנבחר</button>
        <small>רק השם שנבחר ייבדק. בני משפחה אחרים לא ייסרקו אוטומטית.</small>
      </div>
    </section>
  </div>;
}
