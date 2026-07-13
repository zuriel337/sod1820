import React from "react";

// ❓ הדרכת-כלי אחידה להיכל הגילוי — «איך משתמשים בכלי». מתקפלת ו**סגורה כברירת-מחדל**
// (החלטת צוריאל): ההוראות לא «מול הפרצוף» — הכלי עצמו בולט, וההסבר נפתח בלחיצה למי שרוצה.
// עיצוב בהיר-נקי (research_workspace_law). שימוש: <ToolGuide title intro steps={[...]} tip />.
export default function ToolGuide({ title = "איך משתמשים בכלי", intro, steps = [], tip, defaultOpen = false }) {
  return (
    <details className="rw-guide" open={defaultOpen}>
      <summary>❓ {title}</summary>
      <div className="rw-guide-b">
        {intro && <p className="rw-guide-intro">{intro}</p>}
        {steps.length > 0 && (
          <ol className="rw-guide-steps">
            {steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        )}
        {tip && <div className="rw-guide-tip">💡 {tip}</div>}
      </div>
    </details>
  );
}
