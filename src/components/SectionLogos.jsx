import React from "react";

// 🎗 מקור-אמת יחיד ללוגואים של הסקשנים — כדי שכל מקום «יירש מהמקורי» (עץ אחד), בלי כפילות.
//   GiluiLogo = לוגו «היכל הגילוי» (המקורי, כפי שנוצר לפיד). RealityLogo = הסמל של «זרם המציאות» (🌊, כמו בסקשן).

// לוגו «היכל הגילוי» — המקור (זהה למה שהיה ב-LatestUpdatesFeed).
export const GiluiLogo = ({ s = 18 }) => (
  <svg viewBox="0 0 32 32" width={s} height={s} style={{ display: "block", flex: "0 0 auto" }} aria-hidden>
    <circle cx="16" cy="16" r="15" fill="#e8c15a" stroke="#7a5c12" />
    <g stroke="#4a3608" strokeWidth="1.7" strokeLinecap="round" fill="none">
      <path d="M9.5 23.5V15a6.5 6.5 0 0 1 13 0v8.5" /><path d="M7.5 23.5h17" /><path d="M16 4.8v2.6M11.6 6l1 2.1M20.4 6l-1 2.1" />
    </g><circle cx="16" cy="15.2" r="1.7" fill="#4a3608" />
  </svg>
);

// סמל «זרם המציאות» — 🌊, בדיוק כמו בכותרת הסקשן «🌊 זרם המציאות» (RealityWorld/Navbar).
export const RealityLogo = ({ s = 16 }) => (
  <span aria-hidden style={{ fontSize: Math.round(s * 1.05), lineHeight: 1, display: "inline-block", flex: "0 0 auto" }}>🌊</span>
);
