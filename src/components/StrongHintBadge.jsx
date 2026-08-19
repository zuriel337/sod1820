import React from "react";
import { F } from "../theme.js";

// 💎 סמל «רמז חזק» — באדג' ייעודי לקטגוריית «רמזים חזקים» (canonical_ui_components_law).
//    רכיב יחיד, מוצב בכל מקום שמוצג בו כרטיס-פוסט, לצד באדג' הווידאו (▶) ומימד-חמש (🌀).
//    זהות ויזואלית: 💎 יהלום + זהב-מלכותי (בחירת צוריאל) — הרמזים החזקים = תוכן-הדגל של האתר.
export const STRONG_HINT_CATEGORY = "רמזים חזקים";
export const postHasStrongHint = (p) =>
  !!p && Array.isArray(p.categories) && p.categories.includes(STRONG_HINT_CATEGORY);

// variant:
//   'corner' — אוברליי פינתי על תמונת-הכרטיס (ההורה חייב position:relative)
//   'chip'   — שבב אינליין (ליד כותרת/מטא)
export default function StrongHintBadge({ variant = "corner", label = true, style = {} }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: label ? 5 : 0, whiteSpace: "nowrap",
    background: "linear-gradient(135deg,#f7e08a,#d4af37 55%,#b8891f)", color: "#2a1c00",
    fontFamily: F.heading, fontWeight: 900, borderRadius: 999, lineHeight: 1,
    boxShadow: "0 0 0 1px rgba(255,230,150,.55)",
  };
  if (variant === "corner") {
    return (
      <span aria-label="רמז חזק" title="רמז חזק" style={{
        position: "absolute", top: 8, insetInlineEnd: 8, zIndex: 3,
        padding: label ? "3px 9px 3px 8px" : "4px 6px", fontSize: 11,
        boxShadow: "0 2px 8px rgba(0,0,0,.4), 0 0 0 1px rgba(255,230,150,.55)",
        ...base, ...style }}>
        <span style={{ fontSize: 11 }}>💎</span>{label && <span>רמז חזק</span>}
      </span>
    );
  }
  return (
    <span aria-label="רמז חזק" title="רמז חזק" style={{
      padding: label ? "2px 8px" : "2px 5px", fontSize: 10.5, ...base, ...style }}>
      <span style={{ fontSize: 10 }}>💎</span>{label && <span>רמז חזק</span>}
    </span>
  );
}
