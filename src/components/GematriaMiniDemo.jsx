import React, { useState } from "react";
import { Link } from "react-router-dom";
import { F, calcGem } from "../theme.js";
import { usePalette } from "../lib/palette.js";

// 🧮 <GematriaMiniDemo> — טעימה חיה מהמנוע בראש «כאן מתחילים»: הקלד מילה עברית → ערך מיָּדי → קישורים.
// מחשב רגיל בצד-לקוח (calcGem) — עובדה, לא המצאה. הקישורים ממשיכים למנוע המלא (עץ אחד).
export default function GematriaMiniDemo() {
  const P = usePalette();
  const [w, setW] = useState("");
  const clean = (w.match(/[א-ת]/g) || []).join("");
  const val = clean ? calcGem(clean) : null;

  return (
    <div style={{
      background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 16, padding: "18px 20px",
      boxShadow: `0 6px 24px ${P.glow}`, maxWidth: 560, margin: "0 auto 22px",
    }}>
      <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, letterSpacing: 1, marginBottom: 10 }}>
        🧮 טעימה חיה — נסו את המנוע עכשיו
      </div>
      <input
        value={w}
        onChange={e => setW(e.target.value)}
        placeholder="הקלידו מילה בעברית… (למשל: משיח)"
        dir="rtl"
        aria-label="מילה לחישוב גימטריה"
        style={{
          width: "100%", boxSizing: "border-box", background: P.cardSoft, border: `1px solid ${P.border}`,
          borderRadius: 12, outline: "none", color: P.ink, fontFamily: F.body, fontSize: 17,
          padding: "12px 15px", minHeight: 48,
        }}
      />
      {val != null && (
        <div style={{ marginTop: 14, textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ color: P.ink, fontFamily: F.regal, fontSize: 22, fontWeight: 700 }}>{clean}</span>
            <span style={{ color: P.accentDim, fontFamily: F.mono, fontSize: 20 }}>=</span>
            <span style={{ color: P.accentText, fontFamily: F.mono, fontSize: 34, fontWeight: 800 }}>{val}</span>
          </div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap", justifyContent: "center", marginTop: 12 }}>
            <Link to={`/number/${val}`} style={{
              textDecoration: "none", background: P.cardSoft, color: P.accentText, border: `1px solid ${P.border}`,
              borderRadius: 999, padding: "7px 15px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700,
            }}>✦ מה עוד שווה {val}? ←</Link>
            <Link to={`/research?tool=midrash&tab=calc&w=${encodeURIComponent(clean)}`} style={{
              textDecoration: "none", background: P.accentBtn, color: P.onAccent,
              borderRadius: 999, padding: "7px 17px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800,
            }}>🧮 פתחו במחשבון המלא ←</Link>
          </div>
        </div>
      )}
    </div>
  );
}
