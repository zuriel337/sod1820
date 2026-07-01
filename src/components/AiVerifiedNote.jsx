import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { supabase } from "../lib/supabase.js";
import { usePalette } from "../lib/palette.js";
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

const linkChip = (color, tint) => ({
  display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none",
  background: tint, border: `1px solid ${color}66`, borderRadius: 999,
  color, fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: "5px 12px",
});

// 🎨 חוק post_theme_safe_colors_law: החותמת חייבת להיות קריאה **גם ביום וגם בלילה**.
// לכן משתמשים ב-usePalette (טוקנים סמנטיים שמתהפכים לפי התמה), לא בצבעים כהים קבועים.
export function AiVerifiedDisclaimer() {
  const P = usePalette();
  const dark = P.mode === "dark";
  const blue = dark ? "#7cc0ff" : "#1f6feb";       // כחול-AI קריא בשתי התמות
  const blueTint = dark ? "rgba(62,166,255,0.12)" : "rgba(31,111,235,0.08)";
  const goldTint = dark ? "rgba(212,175,55,0.14)" : "rgba(154,120,24,0.10)";
  return (
    <div className="ai-vdisc" style={{
      direction: "rtl",
      background: P.card,
      border: `1px solid ${dark ? "#3ea6ff44" : "#bcdcff"}`,
      borderInlineStart: `3px solid ${blue}`,
      borderRadius: 14, padding: "14px 16px", margin: "0 auto 30px", maxWidth: 720,
      boxShadow: dark ? "none" : "0 1px 8px rgba(60,120,200,0.08)",
    }}>
      <style>{`
        @media (max-width: 560px) {
          .ai-vdisc { padding: 12px 13px !important; border-radius: 12px !important; }
          .ai-vdisc .ai-vdisc-head { flex-direction: column !important; align-items: center !important; gap: 8px !important; text-align: center !important; }
          .ai-vdisc .ai-vdisc-head p { text-align: center !important; flex-basis: auto !important; }
          .ai-vdisc .ai-vdisc-chips a { flex: 1 1 100% !important; justify-content: center !important; }
        }
      `}</style>
      <div className="ai-vdisc-head" style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <VerifiedBadge variant="ai" size={18} label="AI · מאומת" />
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8, margin: 0, flex: "1 1 220px", minWidth: 0, textAlign: "right" }}>
          {AI_DISCLAIMER}
        </p>
      </div>
      <div className="ai-vdisc-chips" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <Link to="/cross" style={linkChip(blue, blueTint)}>🔗 הצלבות השיטות שמצא ה-AI ←</Link>
        <Link to="/verified" style={linkChip(P.accentText, goldTint)}>✓ פוסטים מאומתים באתר ←</Link>
      </div>
    </div>
  );
}

// תיבת אימות ה-AI — קטנה, ממורכזת, בחלק הראשון של הפוסט.
// מציגה את ai_addition (אימות בלבד) + 3 גימטריות של המספר + קישור לבית המדרש על אותו מספר.
export function AiAdditionBox({ html, number }) {
  const P = usePalette();
  const dark = P.mode === "dark";
  const [eq, setEq] = useState([]);
  useEffect(() => {
    if (!number) { setEq([]); return; }
    let live = true;
    supabase.from("gematria_words").select("phrase").eq("ragil", number).limit(24)
      .then(({ data }) => {
        if (!live) return;
        const words = (data || []).map(r => r.phrase).filter(p => p && !/\s/.test(p) && !/\d/.test(p));
        words.sort((a, b) => a.length - b.length);
        setEq(words.slice(0, 3));
      });
    return () => { live = false; };
  }, [number]);
  if (!html) return null;
  return (
    <div style={{ direction: "rtl", maxWidth: 720, margin: "0 auto 28px", textAlign: "center" }}>
      <div style={{ display: "inline-block", textAlign: "right" }} dangerouslySetInnerHTML={{ __html: html }} />
      {number && eq.length > 0 && (
        <div style={{
          maxWidth: 520, margin: "10px auto 0", padding: "8px 14px", borderRadius: 10,
          background: dark ? "rgba(212,175,55,0.10)" : "rgba(154,120,24,0.08)", border: `1px solid ${P.border}`,
          color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7,
        }}>
          <b style={{ color: P.accentText, fontFamily: F.heading }}>✦ עוד גימטריות ב-{number}: </b>
          {eq.join(" · ")}
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <Link to={number ? `/beit-midrash?n=${number}` : "/beit-midrash"} style={{
          display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none",
          background: dark ? "rgba(62,166,255,0.12)" : "rgba(31,111,235,0.08)", border: `1px solid ${dark ? "#3ea6ff55" : "#bcdcff"}`, borderRadius: 999,
          color: dark ? "#9fd0ff" : "#1f6feb", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: "7px 15px",
        }}>📚 ראה עוד על {number || "המספרים"} בבית המדרש ←</Link>
      </div>
    </div>
  );
}
