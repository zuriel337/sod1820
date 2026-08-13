// src/lib/cost.js — הפרדת-עלות תלת-שכבתית (חובה ארכיטקטונית · אושר ע״י צוריאל).
// ⛔ שלוש שכבות שלעולם לא מתערבבות:
//   ① עלות-ספק בפועל   (provider $/₪) — מחושבת מטוקנים אמיתיים · מקור-האמת = ai_token_log → agent_token_costs (שרת).
//   ② קרדיטים-שנצרכו   (מטבע-פנימי)   — CREDIT_COST · Human-Gate: לא נגבה כאן.
//   ③ מחיר-לקוח        (מוצר, עתידי)  — עדיין לא מוגדר · null מפורש כדי לא להתבלבל עם ①/②.
import { CREDIT_COST } from "./credits.js";

// מחירון-מודלים — מראָה קליינטית של api_pricing (READ-ONLY · מקור-האמת בשרת: api_pricing). $ למיליון-טוקנים.
export const MODEL_PRICES = {
  "claude-sonnet-5": { in: 3.0, out: 15.0 },
  "claude-haiku-4-5": { in: 1.0, out: 5.0 },
  "gemini-2.5-flash": { in: 0.30, out: 2.50 },
};
export const USD_ILS = 3.01;

// ① עלות-ספק בפועל — מטוקנים אמיתיים (להצגה; המקור-הרשמי מחושב בשרת ב-agent_token_costs).
export function providerCost(model, inTok = 0, outTok = 0) {
  const p = MODEL_PRICES[model] || MODEL_PRICES["claude-sonnet-5"];
  const usd = (inTok / 1e6) * p.in + (outTok / 1e6) * p.out;
  return { usd: +usd.toFixed(5), ils: +(usd * USD_ILS).toFixed(4), model, inTok, outTok };
}

// ② קרדיטים לפי-פעולה — כמה *ייגבו* (לא נגבה כאן · Human-Gate). ממופה ל-CREDIT_COST הקיים.
export const OP_CREDITS = {
  ai: CREDIT_COST.report, translate: CREDIT_COST.cross, search: CREDIT_COST.cross,
  els: CREDIT_COST.els, journey: CREDIT_COST.journey, gematria: 0, axis: 0,
};
export function creditsFor(operation) { return OP_CREDITS[operation] ?? 0; }

// ③ מחיר-לקוח — מוצר עתידי. כרגע לא-מוגדר → null מפורש.
export function customerPrice(/* operation, plan */) { return null; }

// provenance לרישום-עלות: user → conversation(group) → message → operation → model.
// השרת ממלא tokens/cost; כאן רק המזהים הקיימים (ai_token_log.ref/ref_name/user_id). בלי schema חדש.
export function costProvenance({ userRef = null, group = null, msgId = null, operation = null, model = null } = {}) {
  return { user_ref: userRef, ref: msgId, ref_name: group, operation, model };
}
