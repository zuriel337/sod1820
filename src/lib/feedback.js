// 🎯 משוב אוניברסלי + למידת-קהילה (לקוח) — «מצאנו את מה שחיפשת?»
// מנגנון אחד לכל האתר: חיפוש/תעתוק/AI/פוסטים/גלריה/הצלבות/דילוגים.
import { supabase } from "./supabase.js";

// מזהה-גולש יציב (לספירה הוגנת ומניעת gaming) — מקומי, בלי התחברות.
const VKEY = "sod_visitor_id";
export function visitorId() {
  try {
    let v = localStorage.getItem(VKEY);
    if (!v) { v = "v" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); localStorage.setItem(VKEY, v); }
    return v;
  } catch { return "anon"; }
}

// זיכרון «כבר ענה» — לא שואלים את אותו גולש על אותו דבר פעמיים (whats_new_law-סטייל: פר-משתמש).
const AKEY = "sod_fb_answered";
function answeredSet() { try { return new Set(JSON.parse(localStorage.getItem(AKEY) || "[]")); } catch { return new Set(); } }
export function alreadyAnswered(key) { return answeredSet().has(key); }
export function markAnswered(key) {
  try { const s = answeredSet(); s.add(key); localStorage.setItem(AKEY, JSON.stringify([...s].slice(-600))); } catch { /* ignore */ }
}

// רישום משוב אוניברסלי. context חופשי; verdict: found|not_found|partial.
export async function recordFeedback(context, verdict, opts = {}) {
  if (!supabase) return null;
  try {
    const { data } = await supabase.rpc("record_feedback", {
      p_context: context, p_verdict: verdict, p_query: opts.query || null,
      p_target: opts.target || null, p_detail: opts.detail || null,
      p_visitor: visitorId(), p_meta: opts.meta || {},
    });
    return data || null;
  } catch { return null; }
}

// ── למידת-תעתוק (נגזרת מהמשוב, לפי כלל-האיכות: אישור בודד לא משנה מילון) ──
export async function logTranslitQuery(input, lang, type, hebrew, conf, reason) {
  if (!supabase) return;
  try { await supabase.rpc("log_translit_query", { p_input: input, p_lang: lang, p_type: type, p_hebrew: hebrew, p_conf: conf, p_reason: reason }); } catch { /* ignore */ }
}
export async function voteTranslit(inputNorm, vote, hebrew = null) {
  if (!supabase) return;
  try { await supabase.rpc("vote_translit", { p_input_norm: inputNorm, p_vote: vote, p_hebrew: hebrew }); } catch { /* ignore */ }
}

// מילון-נלמד למנוע התעתוק: כל הכינויים המאומתים (verified) → gain: האלגוריתם לא נדרס בניחושים.
export async function getAliasLexicon() {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("word_aliases")
      .select("alias, method, confidence, verified, gematria_words(phrase)")
      .eq("verified", true).limit(3000);
    return (data || []).map(r => ({
      alias: r.alias, method: r.method, confidence: r.confidence, verified: r.verified,
      hebrew: r.gematria_words?.phrase,
    })).filter(r => r.hebrew);
  } catch { return []; }
}
