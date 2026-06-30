import React from "react";

// ❓ הדרכת-כלי אחידה להיכל הגילוי — «איך משתמשים בכלי». מתקפלת (פתוחה כברירת-מחדל),
// כדי שכל אחד יבין מיד מה הכלי עושה ואיך מפעילים אותו. עיצוב בהיר-נקי (research_workspace_law).
// שימוש: <ToolGuide title intro steps={[...]} tip />. כל כלי בהיכל מקבל הדרכה משלו.
export default function ToolGuide({ title = "איך משתמשים בכלי", intro, steps = [], tip, defaultOpen = true }) {
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
