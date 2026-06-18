// ===== 🌳 CORE — אבן הראש היחידה של מנוע המספרים =====
// חוק: זהו ה-ENTRY POINT היחיד. כל שער/עדשה קורא מכאן בלבד — לא מהפונקציות הפנימיות.
//
//   CORE (כאן):   resolve · getScore · getBundle · coreEngine/getTree
//   PLUGINS (פנימיים, לא entry points): calcGem · getEntityBundle · convergence_meter · buildMessages
//
// הוספת שפה/מקור חדש (אנגלית / חילוץ-מתמונה / השוואה) = registerResolver(adapter).
// הליבה לא משתנה אף פעם. value-as-trunk: הערך הוא הגזע, הכל מתחבר דרכו.

import { calcGem } from "../theme.js";
import { supabase, getEntityBundle, getRecentSearches } from "./supabase.js";
import { buildMessages } from "./numberMessage.js";

// — מתאמי קלט (plugins): שפה/מקור. הליבה לא משתנה כשמוסיפים מתאם —
// adapter(term) → { value, term?, isNumber?, lang? } | null   (null = "לא שלי, נסה הבא")
const RESOLVERS = [];
export function registerResolver(fn) { if (typeof fn === "function") RESOLVERS.push(fn); }

// 🔑 resolve — דלת אחת: כל קלט → { term, value, isNumber, lang }
export function resolve(input) {
  const term = String(input ?? "").trim();
  for (const a of RESOLVERS) {
    try { const r = a(term); if (r && r.value != null) return { lang: "he", isNumber: false, term, ...r }; }
    catch { /* מתאם נכשל → נסה הבא */ }
  }
  const isNumber = /^\d+$/.test(term);
  return { term, value: isNumber ? Number(term) : calcGem(term), isNumber, lang: "he" };
}

// ⭐ getScore — עוצמת התכנסות 0-100 (plugin: convergence_meter). מקור יחיד למד/כוכבים/דופק.
export async function getScore(value) {
  if (!value || value < 10) return null;
  try {
    const { data } = await supabase.rpc("convergence_meter", { p_n: value });
    return typeof data?.score === "number" ? data.score : null;
  } catch { return null; }
}

// 📦 getBundle — כל הישויות המחוברות לערך (plugin: getEntityBundle). מקבל קלט גולמי או resolved.
export function getBundle(input) {
  const r = (input && typeof input === "object" && "value" in input) ? input : resolve(input);
  return getEntityBundle(r);
}

// 🌳 coreEngine / getTree — האורקסטרטור היחיד: קלט אחד → כל העץ (חיבורים + מסרים + עוצמה).
export async function getTree(input) {
  const r = resolve(input);
  const [bundle, score] = await Promise.all([ getBundle(r).catch(() => null), getScore(r.value) ]);
  const messages = buildMessages({ ...r, phrases: bundle?.phrases || [] });
  return { ...r, bundle, score, messages };
}
export const coreEngine = getTree; // שם נרדף קנוני

// ✨ getQualityDiscoveries — חיפושים אחרונים שעברו שער איכות (עץ אחד שמזין את בית המדרש).
// "מעניין" = נגע בעוגן (A) / מבנה חזק כריבוע (D) / עוצמת התכנסות ≥ 50. אף פעם לא רעש גולמי.
export async function getQualityDiscoveries(limit = 6) {
  const recent = await getRecentSearches(24).catch(() => []);
  const out = [], rest = [];
  for (const r of recent) {
    const v = r.value;
    if (!v || v < 10) continue;
    const isNum = /^\d+$/.test(r.term);
    const top = buildMessages({ term: r.term, value: v, isNumber: isNum, phrases: [] })[0];
    if (top && top.fact && (top.layer === "A" || top.layer === "D")) out.push({ term: r.term, value: v, reason: top.text });
    else rest.push(r);
    if (out.length >= limit) return out;
  }
  for (const r of rest.slice(0, 6)) {
    if (out.length >= limit) break;
    const s = await getScore(r.value);
    if (s != null && s >= 50) out.push({ term: r.term, value: r.value, reason: `עוצמת התכנסות ${s}/100` });
  }
  return out.slice(0, limit);
}

// משטח-יבוא אחד: כל שער מייבא מכאן בלבד.
export { buildMessages, calcGem };
