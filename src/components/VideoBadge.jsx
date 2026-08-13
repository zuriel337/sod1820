import React from "react";
import { F } from "../theme.js";

// 🎬 סימון «יש וידאו» לכרטיס-פוסט (canonical_ui_components_law) — רכיב יחיד, מוצב בכל מקום
// שבו מוצג כרטיס-פוסט. פוסט «עם וידאו» = הקטגוריה שלו כוללת «וידאו».
export const VIDEO_CATEGORY = "וידאו";
export const postHasVideo = (p) =>
  !!p && Array.isArray(p.categories) && p.categories.includes(VIDEO_CATEGORY);

// variant:
//   'corner' — אוברליי פינתי על תמונת-הכרטיס (ההורה חייב position:relative)
//   'chip'   — שבב אינליין (ליד כותרת/מטא)
export default function VideoBadge({ variant = "corner", label = true, style = {} }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: label ? 5 : 0, whiteSpace: "nowrap",
    background: "linear-gradient(135deg,#8458ff,#5b32d6)", color: "#fff",
    fontFamily: F.heading, fontWeight: 800, borderRadius: 999, lineHeight: 1,
  };
  if (variant === "corner") {
    return (
      <span aria-label="פוסט עם וידאו" title="פוסט עם וידאו" style={{
        position: "absolute", top: 8, insetInlineStart: 8, zIndex: 3,
        padding: label ? "3px 9px 3px 8px" : "4px 6px", fontSize: 11,
        boxShadow: "0 2px 8px rgba(0,0,0,.4)", ...base, ...style }}>
        <span style={{ fontSize: 9 }}>▶</span>{label && <span>וידאו</span>}
      </span>
    );
  }
  return (
    <span aria-label="פוסט עם וידאו" title="פוסט עם וידאו" style={{
      padding: label ? "2px 8px" : "2px 5px", fontSize: 10.5, ...base, ...style }}>
      <span style={{ fontSize: 8.5 }}>▶</span>{label && <span>וידאו</span>}
    </span>
  );
}
