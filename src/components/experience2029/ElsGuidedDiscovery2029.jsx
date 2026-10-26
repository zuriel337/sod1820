import React, { useMemo, useRef, useState } from "react";
import {
  prepareElsCipherDiscoveryPlan,
  projectElsGuidedSearchStrategy,
  summarizeElsGuidedDiscoveryPlan,
} from "../../lib/research/elsAutomaticResearchPlan.js";

const clean = (value) => String(value ?? "").trim();

function selectedAxis(plan, axisId) {
  return plan?.anchorCandidates?.find((candidate) => candidate.id === axisId) || null;
}

export default function ElsGuidedDiscovery2029({ disabled = false, onLoad, onPlanSummary, onReset }) {
  const [story, setStory] = useState("");
  const [scope, setScope] = useState("torah");
  const [plan, setPlan] = useState(null);
  const [axisId, setAxisId] = useState(null);
  const [notice, setNotice] = useState("");
  const requestId = useRef(0);
  const axis = useMemo(() => selectedAxis(plan, axisId), [plan, axisId]);
  const strategy = useMemo(() => projectElsGuidedSearchStrategy(plan, axisId), [plan, axisId]);

  const runPlan = (nextPlan, nextAxisId) => {
    const nextAxis = selectedAxis(nextPlan, nextAxisId);
    if (!nextAxis) {
      setNotice("לא נמצא ציר קצר שאפשר להעביר למנוע. נסו לנסח את הסיפור מחדש.");
      return;
    }
    const contextTerms = nextPlan.contextCandidates
      .filter((candidate) => candidate.selected && candidate.canonicalTerm !== nextAxis.canonicalTerm)
      .slice(0, 6)
      .map((candidate) => ({ term: candidate.term, mode: candidate.mode, required: candidate.required === true, split: false }));
    onPlanSummary?.(summarizeElsGuidedDiscoveryPlan(nextPlan, nextAxis.id));
    onLoad?.({
      contract: "els_anchor_context_request_v1",
      researchCommand: true,
      guidedDiscovery: true,
      term: nextAxis.term,
      scope: nextPlan.scope,
      contextTerms,
      discoveryGoal: nextPlan.goal,
      researchNonce: ++requestId.current,
      returnLabel: "גילוי מודרך",
    });
    setNotice(`התוכנית נשלחה למנוע: ״${nextAxis.term}״ הוא הציר הראשון, והמילים שסביבו ייבדקו באותה מטריצה.`);
  };

  const submit = (event) => {
    event.preventDefault();
    const next = prepareElsCipherDiscoveryPlan({ text: story, scope });
    if (next.error) {
      setPlan(null);
      setAxisId(null);
      onPlanSummary?.(null);
      setNotice(next.error);
      return;
    }
    setPlan(next);
    setAxisId(next.recommendedAnchorId);
    runPlan(next, next.recommendedAnchorId);
  };

  const resetProposal = () => {
    setPlan(null);
    setAxisId(null);
    setNotice("");
    onPlanSummary?.(null);
    onReset?.();
  };

  return <section className="els29-guided-studio" data-els-cipher-discovery="v1" aria-labelledby="els-guided-title">
    <div className="els29-guided-studio-head">
      <div className="els29-guided-studio-mark" aria-hidden="true"><span>✦</span><i /><i /><i /></div>
      <div className="els29-guided-studio-copy">
        <div className="sod29-kicker">גילוי מודרך · סביבת עבודה נפרדת</div>
        <h2 id="els-guided-title">סיפור אחד נכנס. רק החיבורים החזקים נשארים.</h2>
        <p>המערכת בונה תוכנית קצרה, מאמתת ציר במנוע הקנוני ורק אז בודקת את הסביבה הקרובה שלו.</p>
      </div>
      <div className="els29-guided-studio-boundaries" aria-label="גבולות הגילוי המודרך">
        <span><b>01</b> בלי סריקה לפני שליחה</span>
        <span><b>02</b> בלי ערבוב עם קלאסי</span>
        <span><b>03</b> בלי ניחוש של AI</span>
      </div>
    </div>

    <form className="els29-cipher-discovery" onSubmit={submit}>
      <label htmlFor="els-guided-story"><span>מה תרצו לגלות?</span><small>אפשר לכתוב אירוע, אדם, מקום או סיפור שלם.</small></label>
      <textarea
        id="els-guided-story"
        aria-label="הסיפור לגילוי מודרך"
        value={story}
        onChange={(event) => { setStory(event.target.value);resetProposal(); }}
        rows={6}
        maxLength={6000}
        placeholder="לדוגמה: מעבורת החלל קולומביה התפרקה בחזרה לכדור הארץ ועלתה באש…"
      />

      <div className="els29-discovery-flow" aria-label="שלבי הגילוי">
        <span><b>1</b><i>הבנה</i><small>נושא ומילים מרכזיות</small></span>
        <span><b>2</b><i>אימות</i><small>ציר ומופעים מדויקים</small></span>
        <span><b>3</b><i>גילוי</i><small>קשרים מקומיים מדורגים</small></span>
      </div>

      <details className="els29-discovery-refine">
        <summary>הגדרה אחת בלבד · היקף החיפוש</summary>
        <div className="els29-discovery-refine-grid">
          <label>היכן לחפש
            <select aria-label="היקף גילוי מודרך" value={scope} onChange={(event) => { setScope(event.target.value === "tanakh" ? "tanakh" : "torah");resetProposal(); }}>
              <option value="torah">תורה</option>
              <option value="tanakh">כל התנ״ך</option>
            </select>
          </label>
          <p className="sod29-muted">אין כאן טווחי דילוג, מילון רחב או רשימת מילים. אפשר לצטט ״ביטוי״ כדי לתת לו קדימות; הרחבות ידניות נשארות במצב „מחקר”.</p>
        </div>
      </details>

      <button type="submit" className="sod29-action primary els29-guided-submit" disabled={disabled || !clean(story)}><span aria-hidden="true">✦</span> התחל גילוי מודרך</button>
      <small className="els29-guided-boundary">החיפוש מתחיל רק בלחיצה. רזיאל יצטרף רק אחרי שהמנוע ימצא ויאמת מופע.</small>
      {notice ? <p className="els29-guided-notice" role="status">{notice}</p> : null}

      {plan && axis ? <section className="els29-guided-plan" aria-label="תוכנית הגילוי שנשלחה">
        <header>
          <div><small>הציר הראשון שהוצע</small><strong><bdi>{axis.term}</bdi></strong></div>
          <span className="sod29-chip">הצעה · טרם ממצא</span>
        </header>
        <p className="els29-guided-axis-reason">למה הוא ראשון: {axis.reason}.</p>
        {strategy ? <div className="els29-guided-strategy" data-els-guided-search-strategy={strategy.contract} aria-label="סדר החיפוש המודרך">
          {strategy.lanes.map(lane => <article key={lane.id} data-lane={lane.id}>
            <span>{lane.order}</span>
            <div><strong>{lane.label}</strong><small>{lane.id === "exact-axis" ? `בודק את ״${axis.term}״ ומאמת כל מופע.`
              : lane.id === "story-context" ? (lane.terms.length ? lane.terms.join(" · ") : "אין כרגע מילת סיפור נוספת; ממשיכים רק אחרי אימות הציר.")
              : "מחפש מילים שלא נכתבו בסיפור רק בתוך המטריצה המאומתת, דרך אינדקס עצל ומוגבל."}</small></div>
          </article>)}
          <small>אין סריקה של כל האוצר. היפוכים, חלון רחב וגל נוסף נשארים כבויים עד פעולה מפורשת.</small>
        </div> : null}
        {plan.anchorCandidates.length > 1 ? <details className="els29-discovery-targets">
          <summary>צירים חלופיים שהמערכת זיהתה</summary>
          <p className="sod29-muted">בחירה כאן מתחילה חיפוש חדש באותו מנוע ואינה משנה את הסיפור.</p>
          <div className="els29-guided-axis-options">
            {plan.anchorCandidates.slice(0, 4).map((candidate) => <button key={candidate.id} type="button"
              className={candidate.id === axisId ? "sod29-action primary" : "sod29-action"}
              aria-pressed={candidate.id === axisId} disabled={disabled || candidate.id === axisId}
              onClick={() => { setAxisId(candidate.id);runPlan(plan, candidate.id); }}><bdi>{candidate.term}</bdi></button>)}
          </div>
        </details> : null}
        <small>הסיפור נשאר בזיכרון המסך. למנוע נשלחים רק הציר ועד שש מילות הקשר; אף אחת מהן אינה עובדה לפני אימות.</small>
      </section> : null}
    </form>
  </section>;
}
