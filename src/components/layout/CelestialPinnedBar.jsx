import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../../theme.js";
import { useThemeMode } from "../../lib/themeMode.js";

// 🌌 שורה נעוצה גלובלית — «שלושה דברים שמימיים בערב ראש חודש אלול».
//    מוצגת בכל האתר (מתחת לנאבבר), מפנה לפוסט הקנוני. פריט-אחד-בכל-פעם בדהייה רכה
//    (לא marquee) → רגוע במובייל. תמה-מודע (city_background_dual_theme_law §3):
//    בבהיר טקסט כהה-קריא, בכהה שמי-לילה זהב. ניתנת לסגירה לדפדפן (× → localStorage),
//    ותחזור אם צוריאל ירצה — או תוסר כשהאירוע יעבור.
const POST_PATH = "/shalosh-devarim-shemeymiyim-elul";
const DISMISS_KEY = "celestial_elul_5786_dismissed_v1";
const LABEL = "✦ ערב ראש חודש אלול";
const ITEMS = [
  "🌠 שיא מטר המטאורים «פרסאידים»",
  "🌑 ליקוי חמה מלא",
  "🪐 מצעד כוכבי־הלכת",
];

export default function CelestialPinnedBar() {
  const isLight = useThemeMode() === "light";
  const [idx, setIdx] = useState(0);
  const [hidden, setHidden] = useState(true); // מתחילים מוסתר עד בדיקת ה-flag (מונע הבהוב)

  useEffect(() => {
    try { setHidden(localStorage.getItem(DISMISS_KEY) === "1"); } catch { setHidden(false); }
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // כבוד ל-reduced-motion — נשאר על הפריט הראשון
    const id = setInterval(() => { if (!document.hidden) setIdx(i => i + 1); }, 3200);
    return () => clearInterval(id);
  }, []);

  if (hidden) return null;

  const cur = ITEMS[idx % ITEMS.length];

  const barBg = isLight
    ? "linear-gradient(90deg,#efe3c6,#e7d9b4 45%,#efe3c6)"
    : "linear-gradient(90deg,#0b0713,#1a0f2e 45%,#0b0713)";
  const ink = isLight ? "#33260a" : "#f6e7a8";
  const accent = isLight ? "#6d4e0b" : "#f2d789";
  const border = isLight ? "rgba(120,86,12,0.45)" : "rgba(212,175,55,0.32)";

  const dismiss = (e) => {
    e.preventDefault(); e.stopPropagation();
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    setHidden(true);
  };

  return (
    <div
      role="region" aria-label="עדכון שמימי — ערב ראש חודש אלול"
      style={{
        direction: "rtl", background: barBg, borderBottom: `1px solid ${border}`,
        borderTop: isLight ? "1px solid rgba(120,86,12,0.18)" : "1px solid rgba(212,175,55,0.18)",
        position: "relative", minHeight: 34, display: "flex", alignItems: "center",
      }}
    >
      <style>{`@keyframes cpb-fade{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}`}</style>
      <Link
        to={POST_PATH}
        style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          textDecoration: "none", padding: "6px 40px 6px 34px", overflow: "hidden", whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontFamily: F.heading, fontWeight: 900, fontSize: 12.5, color: accent, letterSpacing: 0.3, flexShrink: 0 }}>{LABEL}</span>
        <span aria-hidden style={{ color: accent, opacity: 0.6, flexShrink: 0 }}>·</span>
        <span key={idx} style={{
          fontFamily: F.heading, fontWeight: 800, fontSize: 12.5, color: ink,
          animation: "cpb-fade .5s ease both", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{cur}</span>
        <span style={{ fontFamily: F.heading, fontWeight: 800, fontSize: 11.5, color: accent, flexShrink: 0, opacity: 0.9 }}>← לקריאה</span>
      </Link>
      <button
        onClick={dismiss} aria-label="סגירת השורה"
        style={{
          position: "absolute", insetInlineStart: 8, top: "50%", transform: "translateY(-50%)",
          background: "transparent", border: "none", color: accent, opacity: 0.6, cursor: "pointer",
          fontSize: 16, lineHeight: 1, padding: 4, fontWeight: 700,
        }}
      >×</button>
    </div>
  );
}
