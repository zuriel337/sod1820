import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { projectLifeJourneyHintReferences } from "../../lib/research/lifeJourneyHintProjection.js";
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

export default function LifeJourneyHints2029({ state = { loading: true, rows: [], error: null } }) {
  const navigate = useNavigate();
  const research = useResearch();
  const [openingError, setOpeningError] = useState(null);
  const projection = useMemo(() => projectLifeJourneyHintReferences(state), [state]);
  const byId = useMemo(() => new Map(projection.rows.map(row => [row.id, row])), [projection]);
  const visibleRows = useMemo(() => {
    const models = new Map();
    for (const row of state.rows || []) {
      const id = typeof row?.id === "string" ? row.id.trim() : "";
      if (id && !models.has(id)) models.set(id, row);
    }
    return projection.rows.map(row => ({ ...models.get(row.id), id: row.id }));
  }, [projection, state.rows]);

  const openNumberReference = (number) => {
    const patch = buildLifeJourneyHintReferencePatch(research.context, number);
    if (!patch || !research.setResearchContext?.(patch)) {
      setOpeningError("לא ניתן לפתוח כרגע את ההפניה השמורה.");
      return;
    }
    navigate(patch.subject.href);
  };

  return <section className="person-journey-panel" data-experience-capability="life-journey-hint-references">
    <div className="person-journey-section-head">
      <div><small>04</small><h2>הרמזים האישיים שלי</h2></div>
      <span>הפניות בלבד</span>
    </div>
    <p className="person-journey-note">הרמזים הם תצפיות פרטיות שתרצה להבין בהקשר של המסע. הם אינם ממצאים מאומתים ואינם מתפרסמים לקהילה מעצמם. הצלבת התאריכים ופענוח AI עדיין ממתינים לחיבור.</p>
    {state.loading ? <div className="person-journey-state" aria-busy="true">טוען הפניות לרמזים הקיימים…</div> : null}
    {state.error ? <div className="person-journey-error" role="alert">{state.error}</div> : null}
    {openingError ? <div className="person-journey-error" role="alert">{openingError}</div> : null}
    {!state.loading && !state.error && !state.rows.length ? <div className="person-journey-empty">אין כרגע רמזים שמורים ב־research_items / hint.</div> : null}
    {visibleRows.length ? <div className="person-journey-hint-list">
      {visibleRows.map((hint) => {
        const date = byId.get(hint.id).date;
        const href = safeSourceUrl(hint.source_url);
        const number = Number(hint.number);
        const hasNumberReference = hint.number != null && hint.number !== ""
          && Number.isSafeInteger(number) && number >= 0;
        return <article key={hint.id}>
          <div>
            <strong>{hint.title || "רמז שמור"}</strong>
            <small>{hint.number != null ? `מספר ${hint.number}` : hint.hint_type}</small>
            <small>{date.state === "dated"
              ? <>מועד האירוע: <bdi>{date.dateIso}</bdi> · {date.hebrewDate} · ייצוג יום אזרחי, ללא קביעת שעת שקיעה</>
              : date.state === "unknown" ? "מועד האירוע לא צוין" : "מועד האירוע דורש הבהרה לפני בדיקה"}</small>
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
