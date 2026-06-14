import React, { useState, useEffect } from "react";
import { C, F } from "../../theme.js";

// שורת ברכה עליונה — מתחלפת שורה אחת בכל פעם. מוצגת בכל הדפים (כולל דף הבית).
const LINES = [
  "🛠️ האתר בהקמה — ייתכנו עדיין תקלות",
  "ברוכים הבאים לעולם החדש",
  "המסע כבר החל — ובכל יום מתווספים עולמות, כלים ותגליות",
  "בינה מלאכותית בשירות הגאולה",
  "✨ עדכונים נוספים וחדשים בקרוב",
];

export default function LiveActivityBar() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % LINES.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      direction: "rtl", background: "rgba(10,7,2,0.9)",
      borderBottom: `1px solid ${C.border}`, overflow: "hidden",
    }}>
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "7px 18px", display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
        <span style={{
          fontSize: 11, fontWeight: 800, letterSpacing: 2, color: C.goldDim,
          fontFamily: F.heading, border: `1px solid ${C.border}`, borderRadius: 4,
          padding: "2px 7px", whiteSpace: "nowrap",
        }}>✦ סוד 1820</span>
        <span key={idx} style={{
          color: C.goldLight, fontFamily: F.royal, fontSize: 15, fontWeight: 500,
          animation: "activity-fade 5s ease-in-out",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {LINES[idx]}
        </span>
      </div>
    </div>
  );
}
