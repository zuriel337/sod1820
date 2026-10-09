import React from "react";
import "./navigationIcons2029.css";
import { ALEF_ICON_PATH, ALEF_ICON_TRANSFORM } from "./hebrewIconPaths.js";

const GLYPH_NAMES = { "⌂":"home", "◌":"world", "◇":"tools", "↟":"posts", "↝":"journey", "◎":"community", "123":"number", "▤":"books", "✦":"els" };
// Compatibility names route to this single approved menu family. No second SVG set.
export const RESEARCH_ICON_ALIASES = Object.freeze({
  research: "search", graph: "graph", journey: "journey", spatial: "depth",
  scan: "search", time: "now", layers: "layers", source: "posts", gallery: "gallery",
  dna: "dna", cipher: "els", globe: "world", signal: "signal", raziel: "conversation",
  portal: "kingdom", spark: "discovery", door: "kingdom", book: "books", cosmos: "world",
  gematria: "number", els: "els",
});
const SHAPES = {
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
  graph: <><circle cx="5" cy="5" r="2"/><circle cx="18" cy="4" r="2"/><circle cx="12" cy="13" r="2.5"/><circle cx="4" cy="20" r="2"/><circle cx="21" cy="20" r="2"/><path d="m6.3 6.5 4.1 4.5m3-0.2 3.5-5.2M10 15l-4.5 3.5m8.5-4 5.5 4"/></>,
  layers: <><path d="M5 3h11l3 3v10H5ZM8 19h14V8M2 6v16h14M14 3v5h5"/></>,
  dna: <><path d="M6 2c0 10 12 10 12 20M18 2C18 12 6 12 6 22M7 5h10M9 9h6m-6 6h6m-8 4h10"/></>,
  signal: <path d="M2 12h3l3-8 4 16 4-12 3 4h3"/>,
  gallery: <><path d="M3 5h18v14H3ZM3 16l6-7 5 6 3-3 4 4M6 2h12M6 22h12"/></>,
  focus: <><path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5M12 8v8m-4-4h8"/></>,
  save: <><path d="M6 3h12v18l-6-4-6 4ZM9 8l2 2 4-4"/></>,
  edit: <><path d="m4 16 12-12 4 4L8 20l-5 1ZM13 7l4 4M3 21h9"/></>,
  filter: <path d="M3 4h18l-7 8v7l-4 2v-9Z"/>,
  share: <><circle cx="18" cy="4" r="2.5"/><circle cx="5" cy="12" r="2.5"/><circle cx="18" cy="20" r="2.5"/><path d="m7 10.5 9-5m-9 8 9 5"/></>,
  copy: <><path d="M8 8h13v13H8ZM4 16H2V2h14v2"/></>,
  expand: <><path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6"/></>,
  settings: <><path d="M3 5h18M3 12h18M3 19h18M9 2v6m7 1v6m-9 1v6"/></>,
  conversation: <><path d="M4 3h16v13H9l-5 5ZM8 7h8M8 11h5"/></>,
  help: <><path d="M8 7a4 4 0 1 1 6 3.5c-2 1-2 2-2 3.5M12 18v.1"/></>,
  issue: <><circle cx="12" cy="12" r="9"/><path d="M12 6v7m0 4h.01"/></>,
};

// Catalogue metadata lives beside the shapes, so review/export cannot drift into a second family.
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

/** Decorative SVG: the enclosing control owns its live accessible name. */
export default function NavigationIcon2029({ name, glyph, label, size }) {
  const requested = name || (label === "היכל" ? "heichal" : GLYPH_NAMES[glyph]) || "tools";
  const resolved = RESEARCH_ICON_ALIASES[requested] || requested;
  const known = Boolean(SHAPES[resolved]) || resolved === "els";
  const shape = SHAPES[resolved] || SHAPES.help;
  return <svg data-icon-name={resolved} data-icon-fallback={known ? undefined : "true"} className={`sod29-ui-icon sod29-ui-icon--${resolved}`} width={size || 24} height={size || 24} style={size ? { width: size, height: size } : undefined} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {resolved === "els" ? Array.from({length:9},(_,i)=><rect key={i} className={i%4===0?`sod29-icon-diagonal is-${i/4}`:undefined} x={3+(i%3)*7} y={3+Math.floor(i/3)*7} width="4" height="4" rx=".8" fill={i%4===0?"currentColor":"none"}/>) : shape}
  </svg>;
}
