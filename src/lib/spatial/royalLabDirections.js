// src/lib/spatial/royalLabDirections.js — PURE presentation presets for the 3060 lab experiments (Royal V2). No three/React import.
// Three design DIRECTIONS and the previous look run on ONE engine, ONE research model and ONE dataset: a direction chooses how the SAME
// bound paths are presented (lighting, material tier, camera behaviour, which controls and which panel). It adds no value, geometry,
// calculation or contract of its own. A direction id is a display choice, never a research fact.
export const ROYAL_LAB_DIRECTIONS = Object.freeze({
  museum: Object.freeze({
    id: "museum", letter: "A", label: "מוזיאון", name: "Royal Museum",
    brief: "מוצג מלכותי: תאורת מוזיאון, מצלמה רגועה ופרטים עשירים",
    look: Object.freeze({ style: "royal", rig: "museum", bezel: true, shadows: true, drift: true, elevation: Math.PI / 7.4, padding: 1.0 }),
    chrome: "museum", autoFocus: false, autoExplode: false, progressive: false,
  }),
  discovery: Object.freeze({
    id: "discovery", letter: "B", label: "גילוי", name: "Royal Discovery",
    brief: "גילוי פעיל: בוחרים צורה, מתקרבים, פותחים שכבות וחושפים את החישוב בהדרגה",
    look: Object.freeze({ style: "royal", rig: "discovery", bezel: true, shadows: true, drift: false, elevation: Math.PI / 6.6, padding: 1.02 }),
    chrome: "discovery", autoFocus: true, autoExplode: true, progressive: true,
  }),
  lab: Object.freeze({
    id: "lab", letter: "C", label: "מעבדה", name: "Royal Spatial Lab",
    brief: "מעבדת מחקר: תלת־ממד במרכז, כלים נקיים, מסלולים, מקור וחישוב מדויק",
    look: Object.freeze({ style: "royal", rig: "lab", bezel: true, shadows: false, drift: false, elevation: Math.PI / 6.4, padding: 1.04 }),
    chrome: "lab", autoFocus: false, autoExplode: false, progressive: false,
  }),
  v1: Object.freeze({
    id: "v1", letter: "V1", label: "קודם", name: "Royal V1 (rollback look)",
    brief: "המראה והבקרות של הגרסה הקודמת (קומיט 030f668), נשמרו לחזרה והשוואה",
    look: Object.freeze({ style: "v1", rig: "v1", bezel: false, shadows: false, drift: false, elevation: Math.PI / 6.4, padding: 1.06 }),
    chrome: "v1", autoFocus: false, autoExplode: false, progressive: false,
  }),
});

export const ROYAL_LAB_DIRECTION_ORDER = Object.freeze(["museum", "discovery", "lab", "v1"]);
export const DEFAULT_ROYAL_LAB_DIRECTION = "museum";

// Accepts an id, a letter (a/b/c) or nothing; anything unknown falls back to the default (never throws, never trusts the URL).
export function resolveRoyalLabDirection(value) {
  const key = String(value ?? "").trim().toLowerCase();
  const byLetter = { a: "museum", b: "discovery", c: "lab" };
  // own keys only: "constructor" / "__proto__" from a URL must never resolve to an inherited member
  const id = Object.hasOwn(ROYAL_LAB_DIRECTIONS, key) ? key : Object.hasOwn(byLetter, key) ? byLetter[key] : DEFAULT_ROYAL_LAB_DIRECTION;
  return ROYAL_LAB_DIRECTIONS[id];
}

// Quality tier for the GPU scene. "rich" = shadow maps + 2x pixel ratio; "lite" = no shadow pass, capped pixel ratio (phones, low-end).
// Pure: the caller passes what it measured. Reduced motion does not lower quality (it only stops motion).
export function pickLabQuality({ width = 1024, cores = 8, saveData = false } = {}) {
  if (saveData) return "lite";
  if (width <= 700) return "lite";
  if (Number.isFinite(cores) && cores <= 2) return "lite";
  return "rich";
}

// The three primary actions shown before the scene; everything else lives in the secondary control. Single source for tests and the UI.
export const LAB_PRIMARY_ACTIONS = Object.freeze([
  Object.freeze({ id: "explore", label: "חקור" }),
  Object.freeze({ id: "explode", label: "פרק שכבות", labelOn: "הרכב שכבות" }),
  Object.freeze({ id: "paths", label: "מסלולים" }),
]);
