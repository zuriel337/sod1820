import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { els2029ReplaySelectionKey } from "../../lib/research/els2029ReplayClient.js";
import {
  prepareLifeJourneyElsPlan,
  replayLifeJourneyElsSelection,
  runLifeJourneyElsPlanSlice,
  verifyLifeJourneyElsOccurrence,
} from "../../lib/research/lifeJourneyElsAdapter.js";

const invokeEls = body => supabase.functions.invoke("els-search-bridge", { body });

function stateLabel(row) {
  if (row.state === "OK") return `${row.count} מופעים בדף שנבדק`;
  if (row.state === "EXECUTED_EMPTY") return "לא נמצאו מופעים בטווח שנבדק";
  if (row.state === "FAILED") return "הבדיקה לא הושלמה";
  return "ממתין לבדיקה מפורשת";
}

export default function LifeJourneyEls2029({ name, context, onVerified, onReturn }) {
  const plan = useMemo(() => prepareLifeJourneyElsPlan(name), [name]);
  const [slice, setSlice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [activeTerm, setActiveTerm] = useState(null);
  const [notice, setNotice] = useState("");
  const [verification, setVerification] = useState(null);
  const revision = useRef(0);
  const verifiedKey = useRef(null);
  const exactSelection = context?.selection?.entityType === "els" ? context.selection : null;
  const replayKey = els2029ReplaySelectionKey(exactSelection);

  useEffect(() => {
    if (!replayKey) return undefined;
    if (verifiedKey.current === replayKey) return undefined;
    let alive = true;
    setVerification({ state: "VERIFYING", selection: exactSelection, loadItem: null });
    replayLifeJourneyElsSelection(exactSelection, invokeEls).then((result) => {
      if (!alive) return;
      setVerification(result);
      if (!result.ok) setNotice(`השחזור המדויק לא אומת: ${result.state}.`);
      else verifiedKey.current = replayKey;
    });
    return () => { alive = false; };
  }, [replayKey]); // replayKey is the complete exact locus; raw input never enters the URL.

  const runPlan = async () => {
    if (plan?.error || busy) return;
    const seq = ++revision.current;
    setBusy(true);
    setSlice(null);
    setNotice("");
    try {
      const result = await runLifeJourneyElsPlanSlice(plan, invokeEls, (progress) => {
        if (seq === revision.current) setActiveTerm(progress.phase === "searching" ? progress.term : null);
      });
      if (seq !== revision.current) return;
      if (result.error) {
        setNotice(result.error);
        return;
      }
      setSlice(result);
      if (result.rows.some((row) => row.state === "FAILED")) {
        setNotice("חלק מהצורות לא הושלמו. אין להסיק מכך שלא קיימים מופעים.");
      }
    } catch (error) {
      if (seq === revision.current) setNotice(`התוכנית לא הושלמה: ${error?.message || "שגיאת תקשורת"}`);
    } finally {
      if (seq === revision.current) {
        setBusy(false);
        setActiveTerm(null);
      }
    }
  };

  const verifyOccurrence = async (occurrence, projection) => {
    if (busy) return;
    const seq = ++revision.current;
    setBusy(true);
    setNotice("");
    setVerification({ state: "VERIFYING", selection: null, loadItem: null });
    try {
      const result = await verifyLifeJourneyElsOccurrence({
        occurrence,
        projection,
        scope: plan.scope,
        invoke: invokeEls,
      });
      if (seq !== revision.current) return;
      setVerification(result);
      if (!result.ok) {
        setNotice(`המופע לא אומת: ${result.state}. בחרו מופע אחר.`);
        return;
      }
      verifiedKey.current = els2029ReplaySelectionKey(result.selection);
      onVerified(result.selection, result.loadItem);
    } catch (error) {
      if (seq === revision.current) setNotice(`אימות המופע לא הושלם: ${error?.message || "שגיאת תקשורת"}`);
    } finally {
      if (seq === revision.current) setBusy(false);
    }
  };

  const rows = slice?.rows || [];
  const occurrenceCount = rows.reduce((total, row) => total + (row.projection?.occurrences?.length || 0), 0);

  return <div className="person-journey is-2029" data-experience-surface="life-journey-els-2029">
    <section className="person-journey-panel person-journey-capability" data-experience-capability="els_automatic_research_plan_v1">
      <div className="person-journey-section-head">
        <div><small>מסע החיים</small><h2>תוכנית ELS אוטומטית</h2></div>
        <span>els_automatic_research_plan_v1</span>
      </div>
      <div className="person-journey-capability-nav">
        <button type="button" onClick={onReturn}>חזרה מדויקת למסע החיים</button>
        <p>התוכנית הוכנה לשם שנבחר בלבד. בני משפחה אחרים לא נסרקים אוטומטית.</p>
      </div>

      {plan?.error ? <div className="person-journey-error" role="alert">{plan.error}</div> : <>
        <div className="person-journey-plan-summary">
          <strong>{plan.candidates.length}</strong>
          <span>צורות בתוכנית · תורה · דילוגים {plan.skipMin}–{plan.skipMax}</span>
        </div>
        {plan.canonicalFormsPending ? <p className="person-journey-note">צורות FORMS של המנוע אינן נטענות במסך זה; יוצגו רק הצורות שהחוזה הקיים הכין ואכן נסרקו.</p> : null}
        {!slice && !replayKey ? <div className="person-journey-actions">
          <button type="button" className="person-journey-primary" disabled={busy} onClick={runPlan}>הפעל בדיקה מפורשת</button>
          <small>הפתיחה אינה מתחילה חיפוש. הבדיקה מתחילה רק בלחיצה הזאת.</small>
        </div> : null}
        {busy ? <div className="person-journey-state" role="status">
          {verification?.state === "VERIFYING" ? "מאמת את המופע המדויק…" : activeTerm ? "בודק צורה אחת בתוכנית…" : "מפעיל את התוכנית הקנונית…"}
        </div> : null}
        {notice ? <div className="person-journey-error" role="alert">{notice}</div> : null}
        {slice ? <div className="person-journey-els-results" aria-label="תוצאות תוכנית ELS">
          <p>{occurrenceCount} מופעים נטענו מהטווח שנבדק. כל מופע דורש אימות חוזר לפני פתיחה.</p>
          {rows.map((row) => <article key={row.canonicalTerm}>
            <div><strong><bdi>{row.term}</bdi></strong><small>{stateLabel(row)}</small></div>
            <div className="person-journey-actions">
              {(row.projection?.occurrences || []).map((occurrence) => <button
                key={occurrence.occurrenceId}
                type="button"
                disabled={busy}
                onClick={() => verifyOccurrence(occurrence, row.projection)}
              >
                אמת ופתח · דילוג {occurrence.skip} · {occurrence.dir === 1 ? "קדימה" : "אחורה"} · מיקום {occurrence.start + 1}
              </button>)}
            </div>
          </article>)}
        </div> : null}
        {verification?.ok ? <div className="person-journey-verified" role="status">
          <strong>המופע אומת במנוע הקנוני</strong>
          <span>דילוג {verification.loadItem.skip} · {verification.loadItem.dir === 1 ? "קדימה" : "אחורה"} · מיקום {verification.loadItem.start + 1}</span>
          <small>זהו exact load לפי term/scope/skip/dir/start. הוא ממצא מאומת, לא פרשנות ולא החלטה.</small>
        </div> : null}
      </>}
    </section>
  </div>;
}
