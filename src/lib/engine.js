// ===== 🌳 הליבה הקנונית של מנוע המספרים — אבן הראש =====
// כל שער (כללי / שם / תמונה / השוואה / אנגלית עתידי) עובר דרך כאן בלבד.
// resolve(קלט) → ערך · getTree(קלט) → כל העץ. אין מקור אמת מקביל.

import { calcGem } from "../theme.js";
import { supabase, getEntityBundle } from "./supabase.js";
import { buildMessages } from "./numberMessage.js";

// 🔑 resolve — דלת אחת: כל קלט → { term, value, isNumber }.
// כאן יתווספו בעתיד מתאמי שפה (אנגלית) / חילוץ-מתמונה — בלי לגעת בשום עדשה.
export function resolve(input) {
  const term = String(input ?? "").trim();
  const isNumber = /^\d+$/.test(term);
  const value = isNumber ? Number(term) : calcGem(term);
  return { term, value, isNumber };
}

// ⭐ getScore — עוצמת ההתכנסות (0-100) של ערך. מקור יחיד למד/כוכבים/דופק.
export async function getScore(value) {
  if (!value || value < 10) return null;
  try {
    const { data } = await supabase.rpc("convergence_meter", { p_n: value });
    return typeof data?.score === "number" ? data.score : null;
  } catch { return null; }
}

// 🌳 getTree — מקור אמת אחד לכל עדשה: ערך → כל העץ (חיבורים + מסרים + עוצמה).
export async function getTree(input) {
  const r = resolve(input);
  const [bundle, score] = await Promise.all([
    getEntityBundle(r).catch(() => null),
    getScore(r.value),
  ]);
  const messages = buildMessages({ ...r, phrases: bundle?.phrases || [] });
  return { ...r, bundle, score, messages };
}

// משטח-יבוא אחד ל"מנוע": כל שער מייבא מכאן.
export { getEntityBundle, buildMessages, calcGem };
