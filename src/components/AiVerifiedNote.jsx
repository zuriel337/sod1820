import React from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import VerifiedBadge from "./VerifiedBadge.jsx";

/**
 * חוק מערכת: ai_disclaimer_law (חקוק)
 * פוסט שאומת ע״י AI מציג נוסח קבוע — זהה בכל האתר:
 *  1. דיסקליימר בראש הפוסט: הנתונים (תאריכים/מספרים) נבדקו ואומתו ע״י AI; הפרשנות של צוריאל.
 *  2. תוספת ה-AI מופיעה *אחרי* מה שצוריאל כתב, בתוך ריבוע מסומן — לא משתלבת בטקסט שלו.
 *  3. כל תוספת AI מפנה לבית המדרש (ללמוד על המספרים), לא לפוסטים אחרים.
 */

// הנוסח הקבוע — מקור אמת אחד.
export const AI_DISCLAIMER =
  "הנתונים בפוסט זה (תאריכים ומספרים) נבדקו ואומתו על ידי בינה מלאכותית. הפרשנות והחידוש הם של צוריאל. כל תוספת המסומנת כ-AI נוספה על ידי הבינה המלאכותית — לא על ידי צוריאל.";

export function AiVerifiedDisclaimer() {
  return (
    <div style={{
      direction: "rtl", display: "flex", alignItems: "flex-start", gap: 12,
      background: "linear-gradient(135deg, rgba(62,166,255,0.07), rgba(8,5,16,0.4))",
      border: `1px solid #3ea6ff55`, borderRadius: 14, padding: "14px 16px", margin: "0 auto 30px", maxWidth: 720,
    }}>
      <VerifiedBadge variant="ai" size={18} label="AI · מאומת" />
      <p style={{ color: C.muted, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8, margin: 0, flex: 1, textAlign: "right" }}>
        {AI_DISCLAIMER}
      </p>
    </div>
  );
}

// תיבת תוספת ה-AI — אחרי תוכן הפוסט. מציגה את ai_addition (HTML שכבר נוצר) + קישור לבית המדרש.
export function AiAdditionBox({ html }) {
  if (!html) return null;
  return (
    <div style={{ direction: "rtl", maxWidth: 720, margin: "40px auto 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ color: "#3ea6ff", fontFamily: F.heading, fontSize: 12, letterSpacing: 2, fontWeight: 700 }}>🔵 תוספת AI · אימות נתונים</span>
        <VerifiedBadge variant="ai" size={15} label="נוסף ע״י AI" />
      </div>
      <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7, margin: "0 0 12px", textAlign: "right" }}>
        הגימטריות והנתונים הבאים נוספו ואומתו על ידי AI מתוך מאגר סוד 1820 — לא נכתבו על ידי צוריאל.
      </p>
      {/* התוכן שה-AI הוסיף (כבר ממוסגר במקור) */}
      <div style={{ color: "#ede4d3", fontFamily: F.body, lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: html }} />
      <div style={{ textAlign: "center", marginTop: 16 }}>
        <Link to="/beit-midrash" style={{
          display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none",
          background: "rgba(62,166,255,0.1)", border: `1px solid #3ea6ff55`, borderRadius: 999,
          color: "#9fd0ff", fontFamily: F.heading, fontSize: 13, fontWeight: 700, padding: "9px 18px",
        }}>📚 ללמוד עוד על המספרים — בבית המדרש ←</Link>
      </div>
    </div>
  );
}
