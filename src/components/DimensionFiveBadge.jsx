import React from "react";
import { F } from "../theme.js";

// 🌀 סמל «מימד חמש» — באדג' ייעודי לקטגוריה (canonical_ui_components_law). רכיב יחיד, מוצב
//    בכל מקום שמוצג בו כרטיס-פוסט, לצד באדג' הווידאו (▶). זהות ויזואלית: 🌀 + סגול-קוסמי.
export const DIM5_CATEGORY = "מימד חמש";
export const postHasDim5 = (p) =>
  !!p && Array.isArray(p.categories) && p.categories.includes(DIM5_CATEGORY);

// variant:
//   'corner' — אוברליי פינתי על תמונת-הכרטיס (ההורה חייב position:relative)
//   'chip'   — שבב אינליין (ליד כותרת/מטא)
export default function DimensionFiveBadge({ variant = "corner", label = true, style = {} }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: label ? 5 : 0, whiteSpace: "nowrap",
    background: "linear-gradient(135deg,#8458ff,#3a1d8a)", color: "#fff",
    fontFamily: F.heading, fontWeight: 800, borderRadius: 999, lineHeight: 1,
    boxShadow: "0 0 0 1px rgba(180,150,255,.35)",
  };
  if (variant === "corner") {
    return (
      <span aria-label="מימד חמש" title="מימד חמש" style={{
        position: "absolute", top: 8, insetInlineEnd: 8, zIndex: 3,
        padding: label ? "3px 9px 3px 8px" : "4px 6px", fontSize: 11,
        ...base, ...style }}>
        <span style={{ fontSize: 11 }}>🌀</span>{label && <span>מימד חמש</span>}
      </span>
    );
  }
  return (
    <span aria-label="מימד חמש" title="מימד חמש" style={{
      padding: label ? "2px 8px" : "2px 5px", fontSize: 10.5, ...base, ...style }}>
      <span style={{ fontSize: 10 }}>🌀</span>{label && <span>מימד חמש</span>}
    </span>
  );
}
