import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { supabase } from "../lib/supabase.js";
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
    <div className="ai-vdisc" style={{
      direction: "rtl",
      background: "linear-gradient(135deg, rgba(62,166,255,0.07), rgba(8,5,16,0.4))",
      border: `1px solid #3ea6ff55`, borderRadius: 14, padding: "14px 16px", margin: "0 auto 30px", maxWidth: 720,
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
        <p style={{ color: C.muted, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8, margin: 0, flex: "1 1 220px", minWidth: 0, textAlign: "right" }}>
          {AI_DISCLAIMER}
        </p>
      </div>
      <div className="ai-vdisc-chips" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <Link to="/cross" style={linkChip("#3ea6ff")}>🔗 הצלבות השיטות שמצא ה-AI ←</Link>
        <Link to="/verified" style={linkChip(C.gold)}>✓ פוסטים מאומתים באתר ←</Link>
      </div>
    </div>
  );
}

// תיבת אימות ה-AI — קטנה, ממורכזת, בחלק הראשון של הפוסט.
// מציגה את ai_addition (אימות בלבד) + 3 גימטריות של המספר + קישור לבית המדרש על אותו מספר.
export function AiAdditionBox({ html, number }) {
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
          background: "rgba(212,175,55,0.08)", border: `1px solid ${C.border}`,
          color: C.goldLight, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7,
        }}>
          <b style={{ color: C.goldDim, fontFamily: F.heading }}>✦ עוד גימטריות ב-{number}: </b>
          {eq.join(" · ")}
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <Link to={number ? `/beit-midrash?n=${number}` : "/beit-midrash"} style={{
          display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none",
          background: "rgba(62,166,255,0.1)", border: `1px solid #3ea6ff55`, borderRadius: 999,
          color: "#9fd0ff", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: "7px 15px",
        }}>📚 ראה עוד על {number || "המספרים"} בבית המדרש ←</Link>
      </div>
    </div>
  );
}
