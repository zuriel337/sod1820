import React from "react";
import { useNavigate } from "react-router-dom";
import { F } from "../theme.js";

// 🌀 סמל «מימד חמש» — באדג' ייעודי לקטגוריה (canonical_ui_components_law). רכיב יחיד, מוצב
//    בכל מקום שמוצג בו כרטיס-פוסט, לצד באדג' הווידאו (▶). זהות ויזואלית: 🌀 + סגול-קוסמי.
export const DIM5_CATEGORY = "מימד חמש";
export const postHasDim5 = (p) =>
  !!p && Array.isArray(p.categories) && p.categories.includes(DIM5_CATEGORY);

// 💡 החלטת צוריאל: הסמל **אינו** יושב על התמונה אלא ליד הכותרת/«פוסט», והוא **לחיץ** —
//    לחיצה מנווטת לעמוד-הקטגוריה (/category/מימד חמש). <span role="link"> עם navigate + עצירת-אירוע.
// variant: 'chip' (ברירת-מחדל, אינליין ליד כותרת) · 'corner' נשמר לאחור אך אינו בשימוש על תמונות.
export default function DimensionFiveBadge({ variant = "chip", label = true, link = true, style = {} }) {
  const navigate = useNavigate();
  const go = (e) => { if (!link) return; e.preventDefault(); e.stopPropagation(); navigate(`/category/${encodeURIComponent(DIM5_CATEGORY)}`); };
  const onKey = (e) => { if (link && (e.key === "Enter" || e.key === " ")) go(e); };
  const base = {
    display: "inline-flex", alignItems: "center", gap: label ? 5 : 0, whiteSpace: "nowrap",
    background: "linear-gradient(135deg,#8458ff,#3a1d8a)", color: "#fff",
    fontFamily: F.heading, fontWeight: 800, borderRadius: 999, lineHeight: 1,
    boxShadow: "0 0 0 1px rgba(180,150,255,.35)", cursor: link ? "pointer" : "default",
  };
  const linkProps = link ? { role: "link", tabIndex: 0, onClick: go, onKeyDown: onKey } : {};
  if (variant === "corner") {
    return (
      <span aria-label="מימד חמש" title={link ? "מימד חמש — לקטגוריה" : "מימד חמש"} {...linkProps} style={{
        position: "absolute", top: 8, insetInlineEnd: 8, zIndex: 3,
        padding: label ? "3px 9px 3px 8px" : "4px 6px", fontSize: 11,
        ...base, ...style }}>
        <span style={{ fontSize: 11 }}>🌀</span>{label && <span>מימד חמש</span>}
      </span>
    );
  }
  return (
    <span aria-label="מימד חמש" title={link ? "מימד חמש — לקטגוריה" : "מימד חמש"} {...linkProps} style={{
      padding: label ? "2px 8px" : "2px 5px", fontSize: 10.5, ...base, ...style }}>
      <span style={{ fontSize: 10 }}>🌀</span>{label && <span>מימד חמש</span>}
    </span>
  );
}
