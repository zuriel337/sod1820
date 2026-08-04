import React from "react";
import { F } from "../../theme.js";
import { useThemeMode } from "../../lib/themeMode.js";
import Marquee from "../Marquee.jsx";

// 🚧 רצועת-סטטוס «האתר בבנייה» — שורה זזה (marquee) גלובלית, מעל התוכן.
// הודעת-מערכת (לא עדכון-שידור) → לא נכנסת ל-channel_updates; חיה כאן כרצועה קבועה.
// משתמשת ברכיב הקנוני <Marquee> (ticker_marquee_law) → לולאה חלקה שתמיד חוזרת על עצמה,
// גם כשההודעה קצרה מרוחב-המסך. תמה-מודע (city_background_dual_theme_law §3): בבהיר טקסט
// כהה-קריא, בכהה גרסה חמה-כהה.
const MAINTENANCE_MSG =
  "🚧 האתר בבנייה · ייתכנו עומסים · עקב ריבוי הגולשים ייתכנו נפילות ותקלות — אנו מטפלים בהן, תודה על הסבלנות";

export default function MaintenanceTicker() {
  const isLight = useThemeMode() === "light";
  const barBg = isLight
    ? "linear-gradient(90deg, #f6e6c2, #f0dca8, #f6e6c2)"
    : "linear-gradient(90deg, rgba(74,48,4,0.85), rgba(96,62,6,0.9), rgba(74,48,4,0.85))";
  const ink = isLight ? "#4a3208" : "#ffe6ad";
  const border = isLight ? "rgba(120,86,12,0.5)" : "rgba(212,175,55,0.32)";

  return (
    <div style={{ direction: "rtl", background: barBg, borderBottom: `1px solid ${border}`, padding: "5px 0" }}
      role="status" aria-label="הודעת מערכת">
      <Marquee speedPxPerSec={55} gap={64} ariaLabel="האתר בבנייה">
        <span style={{ fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, letterSpacing: 0.2, color: ink }}>
          {MAINTENANCE_MSG}
        </span>
      </Marquee>
    </div>
  );
}
