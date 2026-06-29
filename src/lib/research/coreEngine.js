// 🔵 CORE CALCULATION ENGINE — מקור-אמת יחיד (Single Source of Truth).
// כאן ורק כאן מחושבות כל השיטות, דרך המנוע הרשמי הנעול (gematria.js — gematria_engine_law).
// מנועי AI/שדה רק *קוראים* את הפלט ומפרשים — לעולם לא מחשבים. «אין שני מקורות אמת למספרים».
import { METHODS, DEPTH_METHODS } from "../gematria.js";

const ALL = [...METHODS, ...DEPTH_METHODS];
export const METHOD_KEYS = ALL.map(m => m.key);
export const PRIMARY = "רגיל";

// computeEntity(text) → ערכי כל השיטות לישות אחת. זה ה-API הסגור.
export function computeEntity(text) {
  const t = String(text || "").trim();
  const values = {};
  for (const m of ALL) values[m.key] = m.fn(t) || 0;
  return { text: t, primary: values[PRIMARY] || 0, values };
}

// connectToAxis(axis, ent) → כל הדרכים שבהן ישות מתחברת לציר הראשי (השם):
// ערך כלשהו של הישות = ערך כלשהו של הציר (חוצה-שיטות) = עובדה.
export function connectToAxis(axis, ent) {
  const links = [];
  if (!axis || !ent) return links;
  for (const ak of METHOD_KEYS) {
    const av = axis.values[ak]; if (!av) continue;
    for (const ek of METHOD_KEYS) {
      if (ent.values[ek] === av) links.push({ value: av, axisMethod: ak, entMethod: ek, same: ak === ek });
    }
  }
  // המובהק ביותר קודם: אותה שיטה > רגיל > השאר
  return links.sort((a, b) => (b.same - a.same) || (a.axisMethod === PRIMARY ? -1 : 0)).slice(0, 6);
}
