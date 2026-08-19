import React from "react";
import { useNavigate } from "react-router-dom";
import { F } from "../theme.js";

// 🎬 סימון «יש וידאו» לכרטיס-פוסט (canonical_ui_components_law) — רכיב יחיד, מוצב בכל מקום
// שבו מוצג כרטיס-פוסט. פוסט «עם וידאו» = הקטגוריה שלו כוללת «וידאו».
export const VIDEO_CATEGORY = "וידאו";
export const postHasVideo = (p) =>
  !!p && Array.isArray(p.categories) && p.categories.includes(VIDEO_CATEGORY);

// 💡 החלטת צוריאל: הסמל **אינו** יושב על התמונה אלא ליד הכותרת/«פוסט», והוא **לחיץ** —
//    לחיצה על השבב מנווטת לעמוד-הקטגוריה (/category/וידאו). כרטיס-פוסט הוא לרוב <a>, לכן
//    זה <span role="link"> עם navigate + עצירת-אירוע (בלי לקנן <a> בתוך <a>).
// variant: 'chip' (ברירת-מחדל, אינליין ליד כותרת) · 'corner' נשמר לאחור אך אינו בשימוש על תמונות.
export default function VideoBadge({ variant = "chip", label = true, link = true, style = {} }) {
  const navigate = useNavigate();
  const go = (e) => { if (!link) return; e.preventDefault(); e.stopPropagation(); navigate(`/category/${encodeURIComponent(VIDEO_CATEGORY)}`); };
  const onKey = (e) => { if (link && (e.key === "Enter" || e.key === " ")) go(e); };
  const base = {
    display: "inline-flex", alignItems: "center", gap: label ? 5 : 0, whiteSpace: "nowrap",
    background: "linear-gradient(135deg,#8458ff,#5b32d6)", color: "#fff",
    fontFamily: F.heading, fontWeight: 800, borderRadius: 999, lineHeight: 1,
    cursor: link ? "pointer" : "default",
  };
  const linkProps = link ? { role: "link", tabIndex: 0, onClick: go, onKeyDown: onKey } : {};
  if (variant === "corner") {
    return (
      <span aria-label="פוסט עם וידאו" title={link ? "וידאו — לקטגוריה" : "פוסט עם וידאו"} {...linkProps} style={{
        position: "absolute", top: 8, insetInlineStart: 8, zIndex: 3,
        padding: label ? "3px 9px 3px 8px" : "4px 6px", fontSize: 11,
        boxShadow: "0 2px 8px rgba(0,0,0,.4)", ...base, ...style }}>
        <span style={{ fontSize: 9 }}>▶</span>{label && <span>וידאו</span>}
      </span>
    );
  }
  return (
    <span aria-label="פוסט עם וידאו" title={link ? "וידאו — לקטגוריה" : "פוסט עם וידאו"} {...linkProps} style={{
      padding: label ? "2px 8px" : "2px 5px", fontSize: 10.5, ...base, ...style }}>
      <span style={{ fontSize: 8.5 }}>▶</span>{label && <span>וידאו</span>}
    </span>
  );
}
