import React, { useState } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getAiAnalysis } from "../lib/supabase.js";
import { trackAi } from "../lib/tracking.js";

// 🤖 «נתח ב-AI» — רכיב לשימוש-חוזר לכל כלי מחקר (השוואה · נוטריקון · פסוק · פסוק-יומי).
// מקבל kind + subject + facts (עובדות מאומתות מהמנוע) → כפתור → קריאת AI אחת → כרטיס פרשנות.
// יושר: מסומן «פרשנות AI» (לא עובדה); נופל בחן אם אין מפתח/כשל. props.compact = כפתור קטן.
export default function AiAnalyze({ kind, subject, facts, label = "🤖 נתח ב-AI", compact = false }) {
  const P = usePalette();
  const [state, setState] = useState("idle"); // idle | busy | done | off
  const [text, setText] = useState(null);

  const run = async () => {
    if (state === "busy") return;
    if (state === "done") { setState("idle"); setText(null); return; } // לחיצה שנייה = הסתר
    setState("busy");
    trackAi(kind);   // 📊 שימוש ב-AI לפי כפתור (השוואה/נוטריקון/פסוק/פסוק-יומי)
    const a = await getAiAnalysis({ kind, subject, facts });
    if (a) { setText(a); setState("done"); } else setState("off");
  };

  const btn = {
    cursor: state === "busy" ? "wait" : "pointer", border: "none", borderRadius: 999,
    background: "linear-gradient(135deg,#3ea6ff,#2f7fd0)", color: "#fff",
    fontFamily: F.heading, fontWeight: 800, fontSize: compact ? 12.5 : 13.5,
    padding: compact ? "7px 15px" : "9px 20px", boxShadow: "0 4px 14px rgba(62,166,255,0.3)",
  };

  return (
    <div style={{ marginTop: 12 }}>
      {state !== "done" && (
        <div style={{ textAlign: "center" }}>
          <button onClick={run} disabled={state === "busy"} style={btn}>
            {state === "busy" ? "✍️ המנוע מנתח…" : label}
          </button>
          {state === "off" && (
            <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12, fontStyle: "italic", marginTop: 6 }}>
              הניתוח אינו זמין כרגע — נסו שוב מאוחר יותר.
            </div>
          )}
        </div>
      )}
      {state === "done" && text && (
        <div style={{ maxWidth: 560, margin: "0 auto", background: P.cardSoft, border: "1.5px solid #3ea6ff55", borderRadius: 16, padding: "14px 16px", textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 9 }}>
            <span style={{ color: "#3ea6ff", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>🔵 ניתוח AI · פרשנות</span>
            <button onClick={run} title="הסתר" style={{ cursor: "pointer", background: "none", border: "none", color: P.accentDim, fontSize: 13 }}>▴</button>
          </div>
          <p style={{ margin: 0, color: P.ink, fontFamily: F.body, fontSize: 14, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{text}</p>
          <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 10.5, marginTop: 9, fontStyle: "italic" }}>
            הגימטריה עובדה מאומתת במנוע · הפרשנות נכתבה ב-AI (רמז משלים, לא עובדה).
          </div>
        </div>
      )}
    </div>
  );
}
