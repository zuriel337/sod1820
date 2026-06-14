import React from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import UpdatesBox from "../components/UpdatesBox.jsx";

// ===== הצופן התנ"כי (ELS · דילוגי אותיות) — דף "בהקמה" עשיר, נשאר סגור =====
// כולל הסבר, תצוגת-טעימה של מטריצת אותיות עם מילה מודגשת, ורשימת יכולות עתידיות.
// אין מנוע חיפוש אמיתי עדיין — הכל תצוגה.

const HEB = "אבגדהוזחטיכלמנסעפצקרשת";
const COLS = 15, ROWS = 9;
const WORD = "משיח";              // המילה המודגשת בטעימה
const HL_COL = 7, HL_START = 2;   // עמודה ושורת-התחלה של המילה (אנכי = דילוג קבוע)

// מטריצת טעימה דטרמיניסטית: אותיות "אקראיות" + המילה מודגשת בעמודה
function buildMatrix() {
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const hlIdx = (c === HL_COL && r >= HL_START && r < HL_START + WORD.length) ? r - HL_START : -1;
      row.push({ ch: hlIdx >= 0 ? WORD[hlIdx] : HEB[(r * COLS + c) * 7 % 22], hl: hlIdx >= 0 });
    }
    rows.push(row);
  }
  return rows;
}
const MATRIX = buildMatrix();

const FEATURES = [
  { icon: "🔎", t: "חיפוש דילוגים (ELS)", d: "מזינים מילה או שם — והמנוע סורק את טקסט התורה בדילוגים קבועים ומוצא היכן היא מופיעה." },
  { icon: "✦", t: "אשכולות מצטלבים", d: "גילוי מילים קשורות שמצטלבות באותו אזור — 'מטריצה' של רמזים סביב נושא אחד." },
  { icon: "🧮", t: "חיבור לגימטריה", d: "כל מילה שנמצאה מתחברת לערך, לדף המספר ולהצלבת השיטות." },
  { icon: "🗺", t: "ויזואליזציה", d: "מפת אותיות אינטראקטיבית — הדגשת הדילוג, זום וניווט בטקסט." },
  { icon: "📊", t: "מובהקות סטטיסטית", d: "מדד לכמה הצירוף נדיר ומשמעותי — לא כל צירוף שווה." },
  { icon: "💾", t: "שמירה ושיתוף", d: "לשמור מטריצות מעניינות ולשתף כתמונה." },
];

export default function CodePage() {
  return (
    <div style={{ direction: "rtl", position: "relative", zIndex: 1, maxWidth: 960, margin: "0 auto", padding: "64px 22px 110px", textAlign: "center" }}>
      {/* כותרת */}
      <div style={{ fontSize: 44, marginBottom: 8, filter: "drop-shadow(0 0 16px rgba(212,175,55,0.4))" }}>📜🔍</div>
      <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12.5, letterSpacing: 5, textTransform: "uppercase", marginBottom: 10 }}>דילוגי אותיות · ELS</div>
      <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(30px,6vw,52px)", fontWeight: 800, margin: "0 0 14px", textShadow: "0 0 55px rgba(212,175,55,0.4)" }}>הצופן התנ״כי</h1>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(212,175,55,0.08)", border: `1px solid ${C.borderGold}`, borderRadius: 999, padding: "7px 18px", color: C.goldLight, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, marginBottom: 20 }}>
        🔒 המנוע בבנייה — ייפתח בקרוב
      </div>
      <p style={{ color: C.muted, fontFamily: F.body, fontSize: 16.5, lineHeight: 2, maxWidth: 600, margin: "0 auto 36px" }}>
        מתחת לטקסט הגלוי של התורה מסתתרת שכבה נוספת — מילים ושמות שמופיעים ב<b style={{ color: C.goldLight }}>דילוגים קבועים</b> של אותיות.
        אנחנו בונים מנוע שיאתר אותם, יצליב אותם, ויחבר אותם לשפת המספרים.
      </p>

      {/* טעימה: מטריצת אותיות עם מילה מודגשת */}
      <div style={{ display: "inline-block", background: "linear-gradient(160deg, rgba(20,15,12,0.7), rgba(8,5,2,0.55))", border: `1px solid ${C.borderGold}`, borderRadius: 16, padding: "16px 14px", marginBottom: 10, maxWidth: "100%", overflowX: "auto" }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 2, marginBottom: 10 }}>טעימה · המילה «{WORD}» בדילוג</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 3, direction: "ltr" }}>
          {MATRIX.flat().map((cell, i) => (
            <span key={i} style={{
              width: 22, height: 26, lineHeight: "26px", textAlign: "center",
              fontFamily: F.regal, fontSize: 15,
              color: cell.hl ? "#1a0e00" : C.goldDim,
              background: cell.hl ? `linear-gradient(135deg, ${C.goldBright}, ${C.gold})` : "transparent",
              borderRadius: 5, fontWeight: cell.hl ? 800 : 400,
              boxShadow: cell.hl ? "0 0 12px rgba(232,200,74,0.6)" : "none",
            }}>{cell.ch}</span>
          ))}
        </div>
      </div>
      <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginBottom: 38 }}>(תצוגה להמחשה — המנוע האמיתי בבנייה)</div>

      {/* שדה חיפוש מושבת */}
      <div style={{ maxWidth: 520, margin: "0 auto 44px", display: "flex", gap: 8, opacity: 0.6 }}>
        <input disabled placeholder="חיפוש דילוג ייפתח בקרוב…" dir="rtl" style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 999, color: C.goldDim, fontFamily: F.body, fontSize: 15, padding: "11px 18px", outline: "none", cursor: "not-allowed", textAlign: "center" }} />
        <span style={{ background: C.goldDeep, color: C.goldDim, border: `1px solid ${C.border}`, borderRadius: 999, fontFamily: F.heading, fontWeight: 700, fontSize: 14, padding: "11px 20px" }}>🔒</span>
      </div>

      {/* יכולות עתידיות */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 14, textAlign: "right", marginBottom: 44 }}>
        {FEATURES.map(f => (
          <div key={f.t} style={{ position: "relative", overflow: "hidden", background: "linear-gradient(160deg, rgba(20,15,12,0.6), rgba(8,5,2,0.5))", border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 18px" }}>
            <div style={{ fontSize: 25, marginBottom: 8 }}>{f.icon}</div>
            <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, fontWeight: 700, marginBottom: 5 }}>{f.t}</div>
            <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.75 }}>{f.d}</div>
          </div>
        ))}
      </div>

      {/* גישה מוקדמת */}
      <UpdatesBox source="code" title="רוצים להיות שם כשהצופן נפתח?" body="הירשמו ותהיו מהראשונים לחפש דילוגים ולגלות רמזים בטקסט התורה." cta="עדכנו אותי →" />

      <div style={{ marginTop: 26 }}>
        <Link to="/beit-midrash" style={{ color: C.goldLight, textDecoration: "none", fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>← בינתיים, חקרו גימטריה בבית המדרש</Link>
      </div>
    </div>
  );
}
