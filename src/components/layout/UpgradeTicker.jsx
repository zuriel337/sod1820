import React, { useEffect, useMemo, useState } from "react";
import { F } from "../../theme.js";
import { useThemeMode } from "../../lib/themeMode.js";

// 🏗️ טיקר «בונים את 2.0» — רצועה גלובלית שמחליפה הודעות-מעבר, כל הודעה נחשפת
//   בתנועת «תריסים אחד אחרי השני» (venetian-blind): שורת-שלבים אופקיים שנפתחים
//   בזה-אחר-זה ומגלים את הטקסט שמתחת (בקשת צוריאל). אפס גלילה אופקית → רגוע במובייל.
//   תמה-מודע + קריא בשני המצבים (city_background_dual_theme_law §3): במצב בהיר טקסט כהה.
const MESSAGES = [
  "מתחת לפני השטח מתבצעת עכשיו בנייה ושדרוג משמעותיים של המערכת",
  "משדרגים תשתיות, מוסיפים יכולות חדשות ובונים את הדור הבא של SOD1820",
  "בתקופה הזו ייתכנו תקלות זמניות, שינויים ודברים שלא יפעלו כרגיל",
  "🙏 מבקשים קצת סבלנות והבנה בתקופת המעבר",
  "המערכת ממשיכה להתפתח ולהיבנות — תוך כדי תנועה",
  "תודה שאתם איתנו בדרך לגרסה 2.0 🚀",
];
const ROTATE_MS = 4600;
const SLATS = 9; // מספר «שלבי-התריס»

export default function UpgradeTicker() {
  const isLight = useThemeMode() === "light";
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) setIdx(i => i + 1); }, ROTATE_MS);
    return () => clearInterval(t);
  }, []);

  const cur = MESSAGES[idx % MESSAGES.length];
  const slats = useMemo(() => Array.from({ length: SLATS }), []);

  // פלטת-צבע תמה-מודעת (זהב-מלכותי; בהיר = ניגודיות גבוהה וקריאה)
  const barBg = isLight
    ? "linear-gradient(90deg,#f3e4bd,#efd9a2 45%,#f3e4bd)"
    : "linear-gradient(90deg,#1a1205,#2c1d06 45%,#1a1205)";
  const ink = isLight ? "#33260a" : "#ffe6ad";
  const accent = isLight ? "#6d4e0b" : "#f6cf6a";
  const border = isLight ? "rgba(120,86,12,0.45)" : "rgba(212,175,55,0.30)";
  // שלב-תריס: פס אופקי עם ברק עדין וקו-צל בתחתית (מראה של תריס אמיתי)
  const slatBg = isLight
    ? "linear-gradient(180deg,#f6e9c8,#e7cf98)"
    : "linear-gradient(180deg,#3a2a0b,#221606)";
  const slatEdge = isLight ? "rgba(120,86,12,0.35)" : "rgba(0,0,0,0.55)";

  return (
    <div dir="rtl" role="status" aria-label="עדכון מערכת — בונים את גרסה 2.0"
      style={{
        position: "relative", overflow: "hidden", background: barBg,
        borderBottom: `1px solid ${border}`, boxShadow: "0 2px 10px rgba(0,0,0,.18)",
        display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", minHeight: 36,
      }}>
      <style>{`
        @keyframes ut-slat-open{0%{transform:scaleY(1)}100%{transform:scaleY(0)}}
        @keyframes ut-text-in{0%{opacity:0;transform:translateY(4px)}60%{opacity:0}100%{opacity:1;transform:none}}
        @keyframes ut-badge{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
        @keyframes ut-stripe{0%{background-position:0 0}100%{background-position:28px 0}}
        @media (max-width:600px){
          .ut-badge-txt{display:none !important;}
          .ut-msg{font-size:12px !important;}
        }
      `}</style>

      {/* תג «בונים 2.0» */}
      <span style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 6,
        background: accent, color: isLight ? "#fff" : "#1a1205", borderRadius: 999,
        padding: "3px 10px", fontFamily: "sans-serif", fontWeight: 900, fontSize: 11.5,
        letterSpacing: 0.3, animation: "ut-badge 2.6s ease-in-out infinite", whiteSpace: "nowrap" }}>
        <span aria-hidden style={{ fontSize: 13 }}>🏗️</span>
        <span className="ut-badge-txt">בונים את 2.0</span>
      </span>

      {/* אזור-ההודעה + תריס-הגילוי */}
      <div style={{ position: "relative", flex: "1 1 auto", minWidth: 0, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span key={"t" + idx} className="ut-msg" style={{
          fontFamily: F.heading, fontWeight: 800, fontSize: 13.5, color: ink, letterSpacing: 0.2,
          textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          maxWidth: "100%", animation: "ut-text-in .55s ease both",
        }}>{cur}</span>

        {/* שכבת-התריס: שלבים אופקיים שנפתחים בזה-אחר-זה ומגלים את הטקסט */}
        <div key={"s" + idx} aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", flexDirection: "column" }}>
          {slats.map((_, i) => (
            <span key={i} style={{
              flex: 1, background: slatBg, borderBottom: `1px solid ${slatEdge}`,
              transformOrigin: "top", transform: "scaleY(1)",
              animation: `ut-slat-open .42s cubic-bezier(.5,0,.2,1) both`,
              animationDelay: `${i * 55}ms`,
            }} />
          ))}
        </div>
      </div>

      {/* פס-אזהרה עדין בקצה (מוטיב בנייה) */}
      <span aria-hidden style={{ flex: "0 0 auto", width: 26, height: 10, borderRadius: 3,
        backgroundImage: `repeating-linear-gradient(45deg, ${accent} 0 6px, transparent 6px 14px)`,
        backgroundSize: "28px 100%", opacity: 0.6, animation: "ut-stripe 1.1s linear infinite" }} />

      {/* נקודות-מצב */}
      <span aria-hidden style={{ position: "absolute", insetInlineStart: 12, bottom: 3, display: "inline-flex", gap: 3 }}>
        {MESSAGES.map((_, i) => (
          <span key={i} style={{ width: i === (idx % MESSAGES.length) ? 12 : 5, height: 3, borderRadius: 999,
            background: i === (idx % MESSAGES.length) ? accent : (isLight ? "rgba(109,78,11,.3)" : "rgba(246,207,106,.3)"),
            transition: "width .25s" }} />
        ))}
      </span>
    </div>
  );
}
