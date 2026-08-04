import React from "react";
import { F } from "../../theme.js";
import { useThemeMode } from "../../lib/themeMode.js";

// 🚧 רצועת-סטטוס «האתר בבנייה» — שורה זזה (marquee) גלובלית, מעל טיקר-החדשות.
// הודעת-מערכת (לא עדכון-שידור) → לא נכנסת ל-channel_updates; חיה כאן כרצועה קבועה.
// תמה-מודע (city_background_dual_theme_law §3): בבהיר טקסט כהה-קריא, בכהה גרסה חמה-כהה.
// המסילה = שני עותקים של הטקסט זה-אחר-זה, נגללים ברצף (translateX -50%) → לולאה חלקה
// בלי «קפיצה». overflow:hidden במיכל → אין גלילה-אופקית של הדף עצמו.
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
    <div className="mt-bar" style={{ direction: "rtl", background: barBg, borderBottom: `1px solid ${border}` }} role="status" aria-label="הודעת מערכת">
      <style>{`
        .mt-bar { position: relative; overflow: hidden; max-width: 100%; box-sizing: border-box; padding: 5px 0; }
        .mt-track { display: inline-flex; flex-wrap: nowrap; white-space: nowrap; will-change: transform;
          animation: mt-scroll 32s linear infinite; }
        .mt-track:hover { animation-play-state: paused; }
        .mt-item { flex: none; padding: 0 28px; font-family: ${F.heading}; font-size: 12.5px; font-weight: 800;
          letter-spacing: 0.2px; color: ${ink}; }
        /* המסילה מכילה שני עותקים (סה״כ 200% מרוחב-התוכן); הזזה ל-50% = בדיוק עותק אחד → לולאה חלקה */
        @keyframes mt-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (max-width: 640px) { .mt-item { font-size: 11px; padding: 0 20px; } .mt-track { animation-duration: 24s; } }
        @media (prefers-reduced-motion: reduce) { .mt-track { animation: none; } }
      `}</style>
      <div className="mt-track" aria-hidden="false">
        {/* שני עותקים זהים ליצירת רצף אינסופי חלק */}
        <span className="mt-item">{MAINTENANCE_MSG}</span>
        <span className="mt-item" aria-hidden="true">{MAINTENANCE_MSG}</span>
      </div>
    </div>
  );
}
