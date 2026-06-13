import React from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import VerifiedBadge from "./VerifiedBadge.jsx";

/**
 * חוק מערכת: ai_disclaimer_law (חקוק)
 * פוסט שאומת ע״י AI מציג נוסח קבוע — זהה בכל האתר:
 *  1. דיסקליימר בראש הפוסט: הנתונים (תאריכים/מספרים) נבדקו ואומתו ע״י AI; הפרשנות של המערכת.
 *  2. תוספת ה-AI מופיעה *אחרי* מה שהמערכת כתבה, בריבוע מסומן — לא משתלבת בטקסט.
 *  3. כל תוספת AI מפנה לבית המדרש (ללמוד על המספרים), לא לפוסטים אחרים.
 */

// הנוסח הקבוע — מקור אמת אחד.
export const AI_DISCLAIMER =
  "הנתונים בפוסט זה (תאריכים ומספרים) נבדקו ואומתו על ידי בינה מלאכותית. הפרשנות והחידוש הם של המערכת. כל תוספת המסומנת כ-AI נוספה על ידי הבינה המלאכותית — לא על ידי המערכת.";

const linkChip = (color) => ({
  display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none",
  background: `${color}14`, border: `1px solid ${color}55`, borderRadius: 999,
  color, fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: "5px 12px",
});

export function AiVerifiedDisclaimer() {
  return (
    <div style={{
      direction: "rtl",
      background: "linear-gradient(135deg, rgba(62,166,255,0.07), rgba(8,5,16,0.4))",
      border: `1px solid #3ea6ff55`, borderRadius: 14, padding: "14px 16px", margin: "0 auto 30px", maxWidth: 720,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <VerifiedBadge variant="ai" size={18} label="AI · מאומת" />
        <p style={{ color: C.muted, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8, margin: 0, flex: 1, textAlign: "right" }}>
          {AI_DISCLAIMER}
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <Link to="/beit-midrash" style={linkChip("#3ea6ff")}>🔵 חידושי AI בבית המדרש ←</Link>
        <Link to="/verified" style={linkChip(C.gold)}>✓ פוסטים מאומתים באתר ←</Link>
      </div>
    </div>
  );
}

// תיבת אימות ה-AI — קטנה, בחלק הראשון של הפוסט. מציגה את ai_addition (אימות בלבד) + קישור לבית המדרש.
export function AiAdditionBox({ html }) {
  if (!html) return null;
  return (
    <div style={{ direction: "rtl", maxWidth: 720, margin: "0 auto 28px" }}>
      <div style={{ display: "inline-block" }} dangerouslySetInnerHTML={{ __html: html }} />
      <div style={{ marginTop: 10 }}>
        <Link to="/beit-midrash" style={{
          display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none",
          background: "rgba(62,166,255,0.1)", border: `1px solid #3ea6ff55`, borderRadius: 999,
          color: "#9fd0ff", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: "7px 15px",
        }}>📚 ללמוד עוד על המספרים — בבית המדרש ←</Link>
      </div>
    </div>
  );
}
