import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { applySeo } from "../lib/seo.js";

// /lab — ריכוז כל חוויות הסולמות (תלת-מימד)
const ITEMS = [
  { to: "/sulamot", t: "גלקסיה · בסיס", d: "כדורי הצירים + קווי הצטלבות", g: "🌌" },
  { to: "/sulamot2", t: "גלקסיה 2", d: "+ כוכבי-לוויין (מספרים) + ניצוצות", g: "✨" },
  { to: "/sulamot3", t: "גלקסיה 3", d: "+ ריחוף + ליבה + קווים פועמים", g: "💫" },
  { to: "/sulamot4", t: "גלקסיה 4 · מקס", d: "הילות + נבולה + hi-poly", g: "🔥" },
  { to: "/sulamot5", t: "חדרים · מעגל", d: "הצירים סביבך, עפים ביניהם", g: "🟡" },
  { to: "/sulamot6", t: "חדרים · מסדרון", d: "טסים קדימה פנימה", g: "🚪" },
  { to: "/sulamot7", t: "חדרים · סולם עולה", d: "ספירלה מטפסת מעלה", g: "🪜" },
  { to: "/sulamot8", t: "DNA · סגול", d: "סליל כפול עולה", g: "🧬" },
  { to: "/sulamot9", t: "כיפת כוכבים · תכלת", d: "חדרים על פני כדור", g: "🧊" },
  { to: "/sulamot10", t: "מגדל · ברקת", d: "טיפוס אנכי בין קומות", g: "💚" },
  { to: "/sulamot11", t: "כניסה לתוך החדר · קוסמי", d: "עפים לתוך הכדור → התמונות עוטפות 360°", g: "🌠", hot: true },
];

export default function LabIndex() {
  useEffect(() => { applySeo({ title: "ניסויי תלת-מימד · סולמות", description: "כל חוויות התלת-מימד של סוד 1820", path: "/lab" }); }, []);
  return (
    <div style={{ direction: "rtl", maxWidth: 1100, margin: "0 auto", padding: "48px 18px 90px" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, textTransform: "uppercase" }}>מעבדת הניסויים</div>
        <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(26px,5vw,44px)", fontWeight: 700, margin: "4px 0 0", textShadow: "0 0 40px rgba(212,175,55,0.3)" }}>🧪 חוויות תלת-מימד</h1>
        <p style={{ color: C.muted, fontFamily: F.body, fontSize: 14.5, marginTop: 10, maxWidth: 560, marginInline: "auto", lineHeight: 1.7 }}>
          כל הגרסאות של "סולמות" — אותם צירים חזקים, מבנים וצבעים שונים. בחר, היכנס, ותגיד לי איזו הזוכה.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px,1fr))", gap: 16 }}>
        {ITEMS.map(it => (
          <Link key={it.to} to={it.to} style={{ textDecoration: "none" }}>
            <div style={{ position: "relative", height: "100%", background: it.hot ? "linear-gradient(150deg, rgba(132,88,255,0.18), rgba(8,5,2,0.5))" : "linear-gradient(150deg, rgba(212,175,55,0.10), rgba(8,5,2,0.5))",
              border: `1px solid ${it.hot ? "#9b7bff" : C.borderGold}`, borderRadius: 14, padding: "18px 18px" }}>
              {it.hot && <span style={{ position: "absolute", top: 10, insetInlineStart: 12, fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, color: "#1a0e00", background: "linear-gradient(135deg,#c9a6ff,#ff8ad1)", borderRadius: 999, padding: "2px 9px" }}>חדש</span>}
              <div style={{ fontSize: 32, marginBottom: 8 }}>{it.g}</div>
              <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, fontWeight: 700 }}>{it.t}</div>
              <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 13, lineHeight: 1.6, marginTop: 4 }}>{it.d}</div>
              <div style={{ color: it.hot ? "#c9a6ff" : C.goldLight, fontFamily: F.heading, fontSize: 13, fontWeight: 700, marginTop: 12 }}>היכנס →</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
