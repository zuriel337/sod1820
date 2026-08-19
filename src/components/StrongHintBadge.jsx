import React from "react";
import { useNavigate } from "react-router-dom";
import { F } from "../theme.js";

// 💎 סימון «רמז חזק» לכרטיס-פוסט (canonical_ui_components_law) — רכיב יחיד, מוצב בכל מקום
// שבו מוצג כרטיס-פוסט. פוסט «רמז חזק» = הקטגוריה שלו כוללת «רמזים חזקים» (תוכן-הדגל של צוריאל).
export const STRONG_HINT_CATEGORY = "רמזים חזקים";
export const postHasStrongHint = (p) =>
  !!p && Array.isArray(p.categories) && p.categories.includes(STRONG_HINT_CATEGORY);

// 💡 החלטת צוריאל: היהלום **אינו** יושב על התמונה אלא ליד הכותרת/«פוסט», והוא **לחיץ** —
//    לחיצה על היהלום מנווטת לעמוד-הקטגוריה (/category/רמזים חזקים). כרטיס-פוסט הוא לרוב <a>,
//    לכן זה <span role="link"> עם navigate + עצירת-אירוע (בלי לקנן <a> בתוך <a>).
// variant: 'chip' (ברירת-מחדל, אינליין ליד כותרת) · 'corner' נשמר לאחור אך אינו בשימוש על תמונות.
export default function StrongHintBadge({ variant = "chip", label = true, link = true, style = {} }) {
  const navigate = useNavigate();
  const go = (e) => { if (!link) return; e.preventDefault(); e.stopPropagation(); navigate(`/category/${encodeURIComponent(STRONG_HINT_CATEGORY)}`); };
  const onKey = (e) => { if (link && (e.key === "Enter" || e.key === " ")) go(e); };
  const base = {
    display: "inline-flex", alignItems: "center", gap: label ? 5 : 0, whiteSpace: "nowrap",
    background: "linear-gradient(135deg,#f7e08a,#d4af37 55%,#b8891f)", color: "#2a1c00",
    fontFamily: F.heading, fontWeight: 900, borderRadius: 999, lineHeight: 1,
    boxShadow: "0 0 0 1px rgba(255,230,150,.55)", cursor: link ? "pointer" : "default",
  };
  const linkProps = link ? { role: "link", tabIndex: 0, onClick: go, onKeyDown: onKey } : {};
  if (variant === "corner") {
    return (
      <span aria-label="רמז חזק" title={link ? "רמז חזק — לקטגוריה" : "רמז חזק"} {...linkProps} style={{
        position: "absolute", top: 8, insetInlineEnd: 8, zIndex: 3,
        padding: label ? "3px 9px 3px 8px" : "4px 6px", fontSize: 11,
        boxShadow: "0 2px 8px rgba(0,0,0,.4), 0 0 0 1px rgba(255,230,150,.55)", ...base, ...style }}>
        <span style={{ fontSize: 11 }}>💎</span>{label && <span>רמז חזק</span>}
      </span>
    );
  }
  return (
    <span aria-label="רמז חזק" title={link ? "רמז חזק — לקטגוריה" : "רמז חזק"} {...linkProps} style={{
      padding: label ? "2px 8px" : "2px 5px", fontSize: 10.5, ...base, ...style }}>
      <span style={{ fontSize: 10 }}>💎</span>{label && <span>רמז חזק</span>}
    </span>
  );
}
