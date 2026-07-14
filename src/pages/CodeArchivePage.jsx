import React from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import ElsGrid from "../components/ElsGrid.jsx";
import { rwCss } from "../lib/research/theme.js";

// 🗄️ ארכיון — מנוע הדילוגים הקודם (ElsGrid, React) שהיה ב-/code לפני «הצופן התנ״כי».
// נשמר חי ונגיש כדי לא לאבד עבודה קודמת. הדף הקנוני לדילוגים הוא עכשיו /code (הכלי החדש).
export default function CodeArchivePage() {
  const P = usePalette();
  return (
    <div className="rw" dir="rtl" style={{ position: "relative", zIndex: 1 }}>
      <style>{rwCss()}</style>
      <div className="rw-work" style={{ maxWidth: 1120, margin: "0 auto", padding: "18px clamp(12px,3vw,28px) 90px" }}>
        <div style={{
          direction: "rtl", textAlign: "center", marginBottom: 14,
          background: P.glow, border: `1px solid ${P.border}`, borderRadius: 12,
          padding: "10px 16px", color: P.inkSoft, fontFamily: F.body, fontSize: 13.5,
        }}>
          🗄️ <b style={{ color: P.accentText }}>ארכיון</b> — מנוע הדילוגים הקודם. הכלי הראשי נמצא עכשיו ב־{" "}
          <Link to="/code" style={{ color: P.accentText, fontWeight: 700 }}>הצופן התנ״כי →</Link>
        </div>
        <ElsGrid />
      </div>
    </div>
  );
}
