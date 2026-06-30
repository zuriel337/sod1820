import React from "react";

// 🌳 סט סמלים אחיד — «עץ אחד». קו דק, currentColor, סגנון Claude/Lucide.
// אותה שפה ויזואלית בכל הכלים/הקירות/הישויות — במקום אמוג'י שמרונדר שונה בכל מכשיר.
// כל אייקון = 24x24, stroke=currentColor → יורש צבע מההורה (זהב/דיו/כחול).

const SVG = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };

// כל ערך = JSX של ה-paths (בתוך <svg viewBox="0 0 24 24">).
const PATHS = {
  // — כלי מחקר —
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.4 8.6-2.1 4.8-4.8 2.1 2.1-4.8z" /></>,
  user: <><circle cx="12" cy="8" r="3.4" /><path d="M5.5 19a6.5 6.5 0 0 1 13 0" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3 3 0 0 1 0 5.6" /><path d="M17 14.2A5.5 5.5 0 0 1 20.5 19" /></>,
  compare: <><path d="M7 4v12" /><path d="M7 16a3 3 0 0 0 3 3h4" /><path d="m12 16 3 3-3 3" transform="translate(-1 -2)" /><path d="M17 20V8" /><path d="M17 8a3 3 0 0 0-3-3h-4" /><path d="m12 8 3-3-3-3" transform="translate(-1 2)" /></>,
  calculator: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8" /><path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v3.5" /></>,
  grid: <><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M9 4v16M15 4v16M4 9h16M4 15h16" /></>,
  hash: <><path d="M9 4 7 20M17 4l-2 16M5 9h14M4 15h14" /></>,
  scroll: <><path d="M7 5a2 2 0 0 0-2 2v1h4V7a2 2 0 0 0-2-2Z" /><path d="M5 8v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V6a1 1 0 0 0-1-1H7" /><path d="M11 9h5M11 13h5" /></>,
  activity: <><path d="M3 12h4l2.5-7 5 14L17 12h4" /></>,
  book: <><path d="M12 6v13" /><path d="M12 6c-1.5-1.3-3.5-2-6-2v13c2.5 0 4.5.7 6 2 1.5-1.3 3.5-2 6-2V4c-2.5 0-4.5.7-6 2Z" /></>,
  table: <><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M4 9.5h16M4 15h16M9.5 4v16" /></>,
  link: <><path d="M10 13a3 3 0 0 0 4.2.2l2.6-2.6a3 3 0 0 0-4.2-4.2l-1 .9" /><path d="M14 11a3 3 0 0 0-4.2-.2l-2.6 2.6a3 3 0 0 0 4.2 4.2l1-.9" /></>,
  type: <><path d="M5 19l4.2-12h.6L14 19" /><path d="M6.5 15h6" /><path d="M16 19V9M16 9h2.5a2.5 2.5 0 0 1 0 5H16" /></>,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 9.5h16M8 3v4M16 3v4" /><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01" /></>,
  sparkles: <><path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" /><path d="M18.5 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" /></>,
  bot: <><rect x="5" y="8" width="14" height="11" rx="2.5" /><path d="M12 8V4.5M12 4.5a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Z" /><path d="M9.5 13h.01M14.5 13h.01" /><path d="M2.5 12v3M21.5 12v3" /></>,
  // — קירות/פאנלים —
  bookmark: <><path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1Z" /></>,
  folder: <><path d="M4 7a2 2 0 0 1 2-2h3.2a2 2 0 0 1 1.4.6L12 7h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /></>,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  map: <><path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z" /><path d="M9 4v14M15 6v14" /></>,
  flask: <><path d="M9 3h6M10 3v6l-4.5 8A2 2 0 0 0 7.3 20h9.4a2 2 0 0 0 1.8-3L14 9V3" /><path d="M7.5 14h9" /></>,
  network: <><circle cx="12" cy="5" r="2.2" /><circle cx="5.5" cy="18" r="2.2" /><circle cx="18.5" cy="18" r="2.2" /><path d="M10.6 6.8 6.9 16M13.4 6.8 17.1 16M7.7 18h8.6" /></>,
  wrench: <><path d="M15.5 7.5a3.8 3.8 0 0 1-5 4.7L5 17.7a2 2 0 0 0 2.8 2.8l5.5-5.5a3.8 3.8 0 0 0 4.7-5l-2.3 2.3-2.3-.6-.6-2.3z" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.8-3.8" /></>,
  panel: <><rect x="4" y="4" width="16" height="16" rx="2.2" /><path d="M9.5 4v16" /></>,
  // — ישויות —
  image: <><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m5 17 4.5-4.5L14 17l2.5-2.5L20 18" /></>,
  puzzle: <><path d="M9 4.5h2.2a1 1 0 0 1 1 1.3 1.4 1.4 0 0 0 2.5 1.1 1 1 0 0 1 1.5.1l1.3 1.3a1 1 0 0 1 .1 1.5 1.4 1.4 0 0 0 1.1 2.5 1 1 0 0 1 .8 1V17a1.5 1.5 0 0 1-1.5 1.5h-2.5" /><path d="M9 4.5A1.5 1.5 0 0 0 7.5 6v2.3a1.4 1.4 0 0 1-2.5 1 1 1 0 0 0-1.5.1L2.2 10.8a1 1 0 0 0 .1 1.5 1.4 1.4 0 0 1-1 2.5 1 1 0 0 0-.8 1V18A1.5 1.5 0 0 0 2 19.5h6" /></>,
  star: <><path d="m12 4 2.3 5.1 5.5.5-4.1 3.7 1.2 5.4L12 16l-4.9 3.2 1.2-5.4L4.2 10l5.5-.5z" /></>,
  pray: <><path d="M12 3v7M9 6.5 12 10l3-3.5" /><path d="M6 13c2 0 3-1 6-1s4 1 6 1v3a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z" /></>,
  lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v2.5" /></>,
  open: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  dot: <circle cx="12" cy="12" r="3" />,
};

// כלי-מחקר → שם-אייקון (id ב-ResearchHome/TOOLS)
export const TOOL_ICON = {
  journey: "compass", name: "user", family: "users", compare: "compare",
  gematria: "calculator", els: "grid", number: "hash", midrash: "scroll",
  life: "activity", verse: "book", import: "table", cross: "link",
  notarikon: "type", dates: "calendar", ai: "sparkles",
};

// פאנלי-הקיר → שם-אייקון (id ב-ResearchCenter PANELS)
export const PANEL_ICON = {
  me: "user", active: "flask", saved: "folder", whatsnew: "bell",
  ai: "bot", roadmap: "map", map: "map", tools: "wrench", research: "network",
};

// ישות (type) → שם-אייקון (מאחד את ENTITY_ICON לשפת-הקו)
export const ENTITY_GLYPH = {
  number: "hash", phrase: "star", post: "book", verse: "scroll", image: "image",
  video: "image", convergence: "puzzle", cross: "link", event: "calendar", prayer: "pray",
  word: "type", name: "user", person: "user", place: "map", object: "star",
};

// <Ico> — רכיב הסמל היחיד. name מתוך PATHS · size · יורש currentColor.
export default function Ico({ name, size = 20, strokeWidth, style, className }) {
  const d = PATHS[name] || PATHS.dot;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...SVG}
      strokeWidth={strokeWidth ?? SVG.strokeWidth} style={style} className={className} aria-hidden="true">
      {d}
    </svg>
  );
}
