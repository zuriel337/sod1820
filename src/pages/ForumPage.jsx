import React, { useEffect } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useThemeMode, setForcedMode } from "../lib/themeMode.js";
import { track } from "../lib/tracking.js";
import { applySeo } from "../lib/seo.js";
import ForumFeed from "../components/ForumFeed.jsx";
import ContributorsUpdatesRail from "../components/ContributorsUpdatesRail.jsx";

// 🌐 הפורום — פיד-מחקר מאוחד (research_contribution_law + עץ אחד). הגוף (סינונים + כרטיסים)
// חי ברכיב המשותף <ForumFeed>, שמרונדר גם כאן (דף עצמאי /forum) וגם בטאב «פורום» במרכז
// השידורים — כך רואים בדיוק את אותו הפורום בשני המקומות. כאן רק ההירו + מצב-בהיר + SEO.
export default function ForumPage() {
  const P = usePalette();
  const mode = useThemeMode();

  useEffect(() => { track("forum"); applySeo({ title: "פורום המחקר הקהילתי · סוד 1820", description: "כל חידושי, השערות, מקורות ומאמרי הכתבים של הקהילה במקום אחד — פורום המחקר של סוד 1820.", path: "/forum" }); }, []);
  // 🌞 הפורום נפתח במצב בהיר כברירת-מחדל (כמו בית המדרש), עם אפשרות לעבור לכהה.
  useEffect(() => { setForcedMode("light"); return () => setForcedMode(null); }, []);

  return (
    <div dir="rtl" style={{ maxWidth: 780, margin: "0 auto", padding: "26px 16px 90px", position: "relative", zIndex: 1 }}>
      {/* 🌗 מתג מראה — בהיר/כהה */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
        <button onClick={() => setForcedMode(mode === "light" ? "dark" : "light")} title="מצב יום / לילה" aria-label="החלפת מצב בהיר/כהה"
          style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, background: "transparent",
            border: `1px solid ${P.border}`, color: P.accentText, borderRadius: 999, padding: "5px 12px",
            fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>
          {mode === "light" ? "🌙 מצב כהה" : "☀️ מצב בהיר"}
        </button>
      </div>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>מחקר קהילתי · פורום</div>
        <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(26px,5vw,40px)", fontWeight: 800, margin: "0 0 8px" }}>🌐 פורום המחקר</h1>
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15, lineHeight: 1.8, maxWidth: 560, margin: "0 auto" }}>
          חידושי הקהילה ומאמרי הכתבים — מכל האתר, במקום אחד, החדשים למעלה. לחיצה מובילה לפוסט או לדיון המלא.
        </p>
      </div>

      <ContributorsUpdatesRail limit={12} />
      <ForumFeed maxWidth={780} />
    </div>
  );
}
