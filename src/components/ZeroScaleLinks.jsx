import React from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";

// 🔗 זיקת האפסים — חוק DB `zero_scale_law` (צוריאל פולייס).
// אותו שורש בסדר גודל אחר: ×10 (הוספת אפס) ו-÷10 (הסרת אפס, כשנגמר ב-0).
// הגרעין נשמר, רק הדרגה משתנה. 216↔2160 (יראה) · 358→3580 (משיח).
// רכיב אחד שמשרת את החוק בכל מקום שמוצג בו ערך מספרי. תמה-מודע (usePalette).
export default function ZeroScaleLinks({ value, compact = false, showEssence = true }) {
  const pal = usePalette();
  const n = Number(value);
  if (!Number.isFinite(n) || n < 10) return null;
  const down = (n % 10 === 0 && n >= 20) ? n / 10 : null;
  const up = n * 10;

  // פלטה גלובלית — מתחלפת יום/לילה עם המתג
  const P = { gold: pal.accentText, goldDeep: pal.accentText, dim: pal.accentDim, muted: pal.inkSoft, border: pal.borderStrong, chipBg: pal.glow };

  const size = compact ? 13 : 15.5;
  const chip = (num, label) => (
    <Link key={label} to={`/number/${num}`} title={`אותו שורש — ${label}`} style={{
      textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5,
      background: P.chipBg, border: `1px solid ${P.border}`, borderRadius: 999,
      padding: compact ? "3px 10px" : "6px 14px", color: P.goldDeep, fontFamily: F.mono, fontWeight: 800, fontSize: size,
    }}>{num}<span style={{ color: P.dim, fontFamily: F.heading, fontSize: compact ? 10 : 11, fontWeight: 700 }}>{label}</span></Link>
  );

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: compact ? 6 : 9, flexWrap: "wrap" }}>
        <span style={{ color: P.dim, fontFamily: F.heading, fontSize: compact ? 11 : 12.5 }}>🔗 אותו שורש · סדר גודל אחר:</span>
        {down && chip(down, "÷10")}
        <span style={{ color: P.goldDeep, fontFamily: F.mono, fontSize: size, fontWeight: 800, opacity: 0.55 }}>{n}</span>
        {chip(up, "×10")}
      </div>
      {showEssence && !compact && (
        <div style={{ color: P.muted, fontFamily: F.body, fontSize: 12, lineHeight: 1.6, marginTop: 6, maxWidth: 460, marginInline: "auto" }}>
          מהות השיטה: האפס מסמן את <b style={{ color: P.dim }}>סדר הגודל</b>, לא את המהות — מספר קטן וגדול הם אותו שורש.
        </div>
      )}
    </div>
  );
}
