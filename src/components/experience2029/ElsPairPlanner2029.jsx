import React, { useState } from "react";
import { prepareElsRelationshipResearchPlan } from "../../lib/research/elsAutomaticResearchPlan.js";

// Local preparation only. The parent owns the one canonical search route.
export default function ElsPairPlanner2029({ axis, scope, radius, letterGap, disabled, onSearchPair }) {
  const [targets, setTargets] = useState("");
  const [prepared, setPrepared] = useState(null);
  const [selected, setSelected] = useState("");
  const signature = JSON.stringify([axis, scope, radius, letterGap, targets]);
  const plan = prepared?.signature === signature ? prepared.plan : null;
  const pair = plan?.pairs?.find(item => item.id === selected);
  const prepare = () => {
    const result = prepareElsRelationshipResearchPlan({ primaryTerm: axis, additionalTerms: targets, scope, radius });
    setPrepared({ signature, plan: result });
    setSelected(result.pairs?.[0]?.id || "");
  };
  return <section className="els29-search-planner" aria-label="הכנת זוגות לחיפוש">
    <p>הציר הראשי: <strong>{axis || "כתבו מונח בשדה החיפוש"}</strong>. כל יעד ייבדק מולו בנפרד, ורק לאחר בחירה.</p>
    <label>יעדים להצלבה · עד שישה, אחד בכל שורה
      <textarea value={targets} rows={3} maxLength={600} autoComplete="off" onChange={event => setTargets(event.target.value)} />
    </label>
    <p>ההכנה מקומית, ללא סריקה או AI. אין חיפוש אוטומטי של כל הצירופים.</p>
    <button type="button" disabled={disabled} onClick={prepare}>הכן זוגות לחיפוש</button>
    {plan?.error ? <p role="alert">{plan.error}</p> : null}
    {plan?.pairs ? <>
      <fieldset><legend>בחרו זוג אחד להרצה</legend>
        {plan.pairs.map(item => <label className="els29-planner-choice" key={item.id}>
          <input type="radio" name="els-research-pair" checked={item.id === selected} onChange={() => setSelected(item.id)} />
          <span>{item.axis} × {item.term}</span>
        </label>)}
      </fieldset>
      <p>{scope === "tanakh" ? "כל התנ״ך" : "תורה"} · מרחק מהציר עד <bdi>{radius}</bdi> תאים · {letterGap ? `רווח בין אותיות עד ${letterGap} תאים` : "אותיות צמודות, בלי רווח"}. ההגדרות הן של חיפוש ההצלבה למעלה.</p>
      <button type="button" disabled={disabled || !pair} onClick={() => pair && onSearchPair(pair)}>חפש את הזוג שנבחר</button>
    </> : null}
  </section>;
}
