import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyHints } from "../../lib/hints.js";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { buildLifeJourneyHintReferencePatch } from "../../lib/research/lifeJourneyPersonContext.js";

function safeSourceUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export default function LifeJourneyHints2029({ user }) {
  const navigate = useNavigate();
  const research = useResearch();
  const [state, setState] = useState({ loading: true, rows: [], error: null });
  const userId = user?.id || null;

  useEffect(() => {
    let alive = true;
    setState({ loading: true, rows: [], error: null });
    getMyHints(userId ? { id: userId } : null, { fallbackLocal: false })
      .then((rows) => {
        if (alive) setState({ loading: false, rows: Array.isArray(rows) ? rows : [], error: null });
      })
      .catch(() => {
        if (alive) setState({ loading: false, rows: [], error: "הרמזים אינם זמינים כרגע." });
      });
    return () => { alive = false; };
  }, [userId]);

  const openNumberReference = (number) => {
    const patch = buildLifeJourneyHintReferencePatch(research.context, number);
    if (!patch || !research.setResearchContext?.(patch)) {
      setState((current) => ({ ...current, error: "לא ניתן לפתוח כרגע את ההפניה השמורה." }));
      return;
    }
    navigate(patch.subject.href);
  };

  return <section className="person-journey-panel" data-experience-capability="life-journey-hint-references">
    <div className="person-journey-section-head">
      <div><small>04</small><h2>הרמזים האישיים שלי</h2></div>
      <span>הפניות בלבד</span>
    </div>
    {state.loading ? <div className="person-journey-state" aria-busy="true">טוען הפניות לרמזים הקיימים…</div> : null}
    {state.error ? <div className="person-journey-error" role="alert">{state.error}</div> : null}
    {!state.loading && !state.error && !state.rows.length ? <div className="person-journey-empty">אין כרגע רמזים שמורים ב־research_items / hint.</div> : null}
    {state.rows.length ? <div className="person-journey-hint-list">
      {state.rows.map((hint) => {
        const href = safeSourceUrl(hint.source_url);
        const number = Number(hint.number);
        const hasNumberReference = hint.number != null && hint.number !== ""
          && Number.isSafeInteger(number) && number >= 0;
        return <article key={hint.id}>
          <div>
            <strong>{hint.title || "רמז שמור"}</strong>
            <small>{hint.number != null ? `מספר ${hint.number}` : hint.hint_type}</small>
          </div>
          {hasNumberReference
            ? <button type="button" onClick={() => openNumberReference(number)}>פתח במספר {number}</button>
            : href
              ? <a href={href} target="_blank" rel="noreferrer">פתח מקור קיים</a>
              : <span>הפניה פרטית ללא יעד פתיחה</span>}
        </article>;
      })}
    </div> : null}
    <p className="person-journey-note">המסך קורא את הרשומות הקיימות בלבד. הוא אינו משכפל, מעדכן או יוצר research_items.</p>
  </section>;
}
