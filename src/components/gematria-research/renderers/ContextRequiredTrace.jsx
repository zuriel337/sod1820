import React from "react";
import { G } from "../theme.js";

// context_required disposition: honest state, not a fabricated calculation. Shows the canonical
// result (still correct) plus the declared context contract the live dispatch cannot carry yet.
export default function ContextRequiredTrace({ trace }) {
  return (
    <div>
      <div style={{
        background: G.goldSoft, border: `1px solid ${G.gold}`, borderRadius: 10, padding: "12px 14px",
        color: "#5b4108", fontFamily: G.body, fontSize: 13.5, lineHeight: 1.7,
      }}>
        שיטה זו פועלת רק בהקשר מפורש — לא ניתן להציג כרגע פירוק שלב-אחר-שלב בלי לדעת אילו אותיות
        מסומנות בהקשר הנדרש. התוצאה המספרית עצמה מגיעה מהמנוע הקנוני ואינה מומצאת.
      </div>
      <div style={{ marginTop: 10, textAlign: "center", fontFamily: G.mono, fontSize: 18, fontWeight: 800, color: G.ink }}>
        תוצאה: {trace?.result}
      </div>
      {trace?.contextContract && (
        <div style={{ marginTop: 10, background: G.bg, borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ color: G.sub, fontFamily: G.heading, fontSize: 11.5, fontWeight: 800, marginBottom: 6 }}>הקשר נדרש (context contract)</div>
          <pre style={{ margin: 0, fontFamily: G.mono, fontSize: 12, color: G.ink, whiteSpace: "pre-wrap", direction: "ltr", textAlign: "left" }}>
            {JSON.stringify(trace.contextContract, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
