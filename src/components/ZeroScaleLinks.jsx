import React from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";

// 🔗 זיקת האפסים — חוק DB `zero_scale_law` (צוריאל פולייס).
// אותו שורש בסדר גודל אחר: ×10 (הוספת אפס) ו-÷10 (הסרת אפס, כשנגמר ב-0).
// הגרעין נשמר, רק הדרגה משתנה. 216↔2160 (יראה) · 358→3580 (משיח).
// רכיב אחד שמשרת את החוק בכל מקום שמוצג בו ערך מספרי.
export default function ZeroScaleLinks({ value, compact = false, showEssence = true }) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 10) return null;
  const down = (n % 10 === 0 && n >= 20) ? n / 10 : null;
  const up = n * 10;

  const size = compact ? 13 : 15.5;
  const chip = (num, label) => (
    <Link key={label} to={`/number/${num}`} title={`אותו שורש — ${label}`} style={{
      textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5,
      background: "rgba(212,175,55,0.08)", border: `1px solid ${C.borderGold}`, borderRadius: 999,
      padding: compact ? "3px 10px" : "6px 14px", color: C.goldBright, fontFamily: F.mono, fontWeight: 800, fontSize: size,
    }}>{num}<span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: compact ? 10 : 11, fontWeight: 700 }}>{label}</span></Link>
  );

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: compact ? 6 : 9, flexWrap: "wrap" }}>
        <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: compact ? 11 : 12.5 }}>🔗 אותו שורש · סדר גודל אחר:</span>
        {down && chip(down, "÷10")}
        <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: size, fontWeight: 800, opacity: 0.55 }}>{n}</span>
        {chip(up, "×10")}
      </div>
      {showEssence && !compact && (
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 1.6, marginTop: 6, maxWidth: 460, marginInline: "auto" }}>
          מהות השיטה: האפס מסמן את <b style={{ color: C.goldDim }}>סדר הגודל</b>, לא את המהות — מספר קטן וגדול הם אותו שורש.
        </div>
      )}
    </div>
  );
}
