import React, { useEffect, useRef } from "react";
import { iconPress2029 } from "./iconPress2029.js";
import "./navigationIcons2029.css";
import { ALEF_ICON_PATH, ALEF_ICON_TRANSFORM } from "./hebrewIconPaths.js";

const GLYPH_NAMES = { "⌂":"home", "◌":"world", "◇":"tools", "↟":"posts", "↝":"journey", "◎":"community", "123":"number", "▤":"books", "✦":"els" };
const SHAPES = {
  letters: <path d={ALEF_ICON_PATH} transform={ALEF_ICON_TRANSFORM} stroke="none" fill="currentColor"/>,
  milui: <><path d="M4 4v5m0 6v5M20 4v5m0 6v5M2 12h5m10 0h5m-8-9-2 2-2-2m0 18 2-2 2 2"/><g transform="translate(5.4 5.4) scale(.55)"><path d={ALEF_ICON_PATH} transform={ALEF_ICON_TRANSFORM} stroke="none" fill="currentColor"/></g></>,
  contour: <><path d="M5 18C5 8 9 5 18 5M5 18H2m16-13V2M5 12H2m10-7V2"/><path d="M3.5 16.5h3v3h-3Zm13-13h3v3h-3Z" fill="currentColor"/></>,
  depth: <><path d="m3 7 9-4 9 4-9 4ZM3 12l9 4 9-4M3 17l9 4 9-4"/></>,
  front: <><path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5M8 8h8v8H8Z"/></>,
  rotate: <><path d="M4 10a8 8 0 0 1 13-6l3 3M20 2v5h-5M20 14a8 8 0 0 1-13 6l-3-3m0 5v-5h5"/></>,
  garden: <><path d="M12 21v-9M12 16C5 16 3 12 3 7c6 0 9 3 9 9ZM12 12c0-6 3-9 9-9 0 6-3 9-9 9ZM8 21h8"/></>,
  mine: <><path d="m4 20 12-12M6 4c5-3 10 0 14 5l-1 3c-3-5-7-7-13-8ZM3 9l2 2-2 2-2-2Zm15 7 3 3-3 3-3-3Z"/></>,
  combinations: <><path d="M3 5h4c5 0 5 14 10 14h4M3 19h4c2 0 3-3 4-5m2-4c1-3 2-5 4-5h4m-3-3 3 3-3 3m0 8 3 3-3 3"/></>,
  kingdom: <><path d="M5 21V10c0-4 3-6 7-8 4 2 7 4 7 8v11M9 21V11c0-2 1-3 3-4 2 1 3 2 3 4v10M2 21h7m6 0h7M3 10h2m14 0h2M3 15h2m14 0h2"/></>,
  discovery: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM3 3l2 2m14 14 2 2m0-18-2 2M5 19l-2 2"/></>,
  upgrade: <><path d="m6 9 6-6 6 6M12 3v12M3 15v5h18v-5M6 20v-3m12 3v-3"/></>,
  journal: <><path d="M6 3h14v18H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3ZM7 3v18M12 3v7l2-1.5 2 1.5V3M11 15h5"/></>,
  focus: <><path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5M12 8v8m-4-4h8"/></>,
  edit: <><path d="m4 16 12-12 4 4L8 20l-5 1ZM13 7l4 4M3 21h9"/></>,
  filter: <path d="M3 4h18l-7 8v7l-4 2v-9Z"/>,
  expand: <><path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6"/></>,
  settings: <><path d="M3 5h18M3 12h18M3 19h18M9 2v6m7 1v6m-9 1v6"/></>,
  conversation: <><path d="M4 3h16v13H9l-5 5ZM8 7h8M8 11h5"/></>,
  help: <><path d="M8 7a4 4 0 1 1 6 3.5c-2 1-2 2-2 3.5M12 18v.1"/></>,
  home: <><path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z" /></>,
  world: <><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/></>,
  heichal: <><path d="M3 4h18v3H3ZM5 7v13m4-13v13m6-13v13m4-13v13M3 21h8m2 0h8"/></>,
  posts: <><path d="M5 3h10l4 4v14H5ZM14 3v5h5M8 12h8M8 16h8"/></>,
  number: <text x="12" y="16" textAnchor="middle" stroke="none" fill="currentColor" fontSize="12" fontWeight="750" fontFamily="Arial, sans-serif">123</text>,
  books: <><path d="M12 5v16M3 4c4-1 6 0 9 1 3-1 5-2 9-1v16c-4-1-6 0-9 1-3-1-5-2-9-1Z"/></>,
  journey: <><circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h7a4 4 0 0 1 0 8h-4a3 3 0 0 0 0 6h7"/></>,
  community: <><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3ZM17 4a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 4v3h-3"/></>,
  search: <><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></>,
  now: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/></>,
  tools: <>{[[3,3],[14,3],[3,14],[14,14]].map(([x,y])=><rect key={`${x}-${y}`} x={x} y={y} width="7" height="7" rx="1.5"/>)}</>,
  personal: <><circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3Z"/></>,
  action: <path d="m13 2-9 12h7l-1 8 10-13h-7Z"/>,
  back: <><path d="m9 4-6 6 6 6M3 10h11a6 6 0 0 1 0 12"/></>,
  issue: <><circle cx="12" cy="12" r="9"/><path d="M12 6v7m0 4h.01"/></>,

  share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></>,
  save: <path d="M6 3h12v18l-6-4-6 4Z"/>,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  add: <path d="M12 4v16M4 12h16"/>,
  video: <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3Z"/></>,
  research: <><circle cx="12" cy="12" r="6.5"/><path d="M12 3.5v17M3.5 12h17"/><circle cx="12" cy="12" r="2"/></>,
  graph: <><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="6" r="2.2"/><circle cx="19" cy="12" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M6.8 10.6 10.2 7.5M13.8 7.5l3.4 3.1M17.2 13.4l-3.4 3.1M10.2 16.5l-3.4-3.1"/></>,
  spatial: <><path d="m12 3 7 4v10l-7 4-7-4V7z"/><path d="m5 7 7 4 7-4M12 11v10"/></>,
  scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M7 12h10"/><circle cx="12" cy="12" r="3"/></>,
  layers: <><path d="m12 4 8 4-8 4-8-4z"/><path d="m4 12 8 4 8-4M4 16l8 4 8-4"/></>,
  gallery: <><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.7"/><path d="m5.5 17 4.5-4 3 2 2.5-2 3 4"/></>,
  dna: <><path d="M7 4c8 4 8 12 0 16M17 4c-8 4-8 12 0 16M8 7h8M7 12h10M8 17h8"/></>,
  cipher: <><circle cx="12" cy="12" r="8"/><path d="M8 9h8M8 15h8M9 6l6 12M15 6 9 18"/></>,
  signal: <><path d="M5 17a10 10 0 0 1 14 0M8 14a6 6 0 0 1 8 0M11 11a2 2 0 0 1 2 0"/><circle cx="12" cy="18" r="1.3"/></>,
  raziel: <><path d="M12 3 18 7v7c0 4-2.6 6.2-6 7-3.4-.8-6-3-6-7V7z"/><path d="M9 11.5c1.6-2 4.4-2 6 0-1.6 2-4.4 2-6 0Z"/><circle cx="12" cy="11.5" r="1"/></>,
  portal: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><path d="M12 4v3M20 12h-3M12 20v-3M4 12h3"/></>,
  spark: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z"/><circle cx="18.5" cy="5.5" r="1.2"/></>,
  door: <><path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21"/><path d="M9 21V7h6v14M4 21h16"/><circle cx="13.2" cy="14" r=".7"/></>,
  cosmos: <><ellipse cx="12" cy="12" rx="8" ry="3.6" transform="rotate(-18 12 12)"/><ellipse cx="12" cy="12" rx="3.5" ry="8" transform="rotate(28 12 12)"/><circle cx="12" cy="12" r="2"/><circle cx="18.5" cy="6" r="1"/><path d="m5 5 .6 1.8L7.4 7.4l-1.8.6L5 9.8 4.4 8 2.6 7.4l1.8-.6z"/></>,
};

export const RESEARCH_ICON_ALIASES = Object.freeze({ time: "now", source: "posts", globe: "world", book: "books", gematria: "number" });
export const ICON_CATALOG = Object.freeze([
  ["home","בית","ניווט","כניסה לדף הבית"],
  ["world","העולם","ניווט","גילויים במרחב הציבורי"],
  ["heichal","היכל","ניווט","כניסה למחקר"],
  ["posts","פוסטים","ניווט","תוכן ופרסומים"],
  ["number","דף המספר","ניווט","ערכים ושיטות חישוב"],
  ["books","ספרים","ניווט","ספרים ומקורות"],
  ["journey","מסע","ניווט","דרך והמשכיות בין תחנות"],
  ["community","קהילה","ניווט","אנשים ומחקר משותף"],
  ["search","חיפוש","ניווט","איתור תוכן"],
  ["now","עכשיו","ניווט","זמן ועדכונים"],
  ["tools","כלים","ניווט","בחירת כלי עבודה"],
  ["personal","האזור שלי","ניווט","גישה למרחב האישי"],
  ["action","פעולה","ניווט","הפעולה הראשית"],
  ["back","חזרה","ניווט","חזרה להקשר הקודם"],
  ["issue","דיווח","ניווט","דיווח על בעיה"],
  ["els","צפנים","מחקר","מטריצה ומסלול דילוג"],
  ["letters","אותיות","מחקר","אות עברית מקווי המתאר המקוריים"],
  ["milui","מילוי","מחקר","פתיחת השכבה הפנימית של האות"],
  ["graph","קשרים","מחקר","קשרים בין ממצאים"],
  ["layers","שכבות","מחקר","מקורות ושכבות מידע"],
  ["dna","מבנה","מחקר","דפוס ומבנה משותף"],
  ["signal","אות מחקרי","מחקר","רצף או שינוי שנמצא"],
  ["gallery","גלריה","מחקר","תמונות וחומר חזותי"],
  ["conversation","שיחה","מחקר","שאלות והסבר בהקשר"],
  ["contour","קווי מתאר","מרחב","גבולות הצורה ונקודות חיבור"],
  ["depth","עומק","מרחב","מעבר בין שכבות במרחב"],
  ["front","מבט חזית","מרחב","יישור הצורה לקריאה"],
  ["rotate","סיבוב","מרחב","בחינת הצורה מזווית אחרת"],
  ["focus","מיקוד","מרחב","בחירה והעמקה באובייקט"],
  ["kingdom","שער הממלכה","ממלכה","כניסה לעולם הגילויים"],
  ["garden","גן האותיות","ממלכה","צמיחה וגילוי מתוך האותיות"],
  ["mine","מכרה המספרים","ממלכה","חשיפת שכבות וערכים"],
  ["combinations","צירופים","ממלכה","מפגש וחיבור של רצפים"],
  ["discovery","גילוי","ממלכה","גילוי חדש במשחק; אינו חותמת אימות"],
  ["upgrade","שדרוג","ממלכה","התקדמות ופתיחת יכולת"],
  ["journal","מחברת","ממלכה","תיעוד המסע והגילויים"],
  ["save","שמירה","פעולות","שמירת העבודה"],
  ["edit","עריכה","פעולות","עריכת תוכן"],
  ["filter","סינון","פעולות","צמצום התוצאות"],
  ["share","שיתוף","פעולות","שיתוף קישור או תוצאה"],
  ["copy","העתקה","פעולות","העתקת תוכן"],
  ["expand","הרחבה","פעולות","פתיחת תצוגה רחבה"],
  ["settings","התאמות","פעולות","שינוי הגדרות"],
  ["help","עזרה","פעולות","הסבר או סמל שאינו מוכר"],
].map(([name,label,group,description])=>Object.freeze({name,label,group,description})));

export const NAVIGATION_ICON_NAMES = Object.freeze([...Object.keys(SHAPES), "els"]);
const ALIASES = { time: "now", source: "posts", globe: "world", book: "books", gematria: "number" };

/** Decorative SVG: the enclosing control owns its live accessible name. */
export default function NavigationIcon2029({ name, glyph, label, size = 24, className = "" }) {
  const iconRef = useRef(null);
  useEffect(() => {
    const icon = iconRef.current;
    // Bind to the existing hit area: touch feedback must not depend on hitting
    // a thin SVG stroke, or on a browser's delayed touch :active projection.
    const control = icon?.closest("button,a") || icon;
    if (!control) return undefined;
    const press = (event) => iconPress2029({ currentTarget: icon, isPrimary: event.isPrimary, pointerType: event.pointerType, button: event.button });
    const key = (event) => {
      if (!event.repeat && (event.key === "Enter" || (event.key === " " && control.matches("button")))) press(event);
    };
    control.addEventListener("pointerdown", press, { passive: true });
    control.addEventListener("keydown", key);
    return () => {
      control.removeEventListener("pointerdown", press);
      control.removeEventListener("keydown", key);
    };
  }, []);
  const resolved = name || (label === "היכל" ? "heichal" : GLYPH_NAMES[glyph]) || "tools";
  const canonical = ALIASES[resolved] || (NAVIGATION_ICON_NAMES.includes(resolved) ? resolved : "tools");
  return <svg ref={iconRef} className={`sod29-ui-icon sod29-ui-icon--${canonical} ${className}`} data-icon-shape={canonical} data-icon-name={canonical} data-icon-fallback={canonical === "tools" && resolved !== "tools" ? "true" : undefined} style={{ width: size, height: size }} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {canonical === "els" ? Array.from({length:9},(_,i)=><rect key={i} className={i%4===0?`sod29-icon-diagonal is-${i/4}`:undefined} x={3+(i%3)*7} y={3+Math.floor(i/3)*7} width="4" height="4" rx=".8" fill={i%4===0?"currentColor":"none"}/>) : SHAPES[canonical]}
  </svg>;
}
