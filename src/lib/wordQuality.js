// 🛡️ בקרת-איכות מילים (Hebrew/English Quality Control) — חוק צוריאל: «אם יש ספק, לא ליצור ישות».
// מסווג מועמד-מילה: סוג · מספר-מילים · דגלי-בטיחות · ניקוד-איכות · סיבה — ומחליט אם בטוח ליצירה
// אוטומטית או שחייב לעבור דרך תור-הבקרה. שמרני מאוד בכוונה (עדיף לפספס מאשר לזהם).

const EMOJI_RE = /\p{Extended_Pictographic}/u;
const URL_RE   = /(https?:\/\/|www\.|\b[\w-]+\.(com|co|il|net|org|ru|io|me)\b)/i;
const PHONE_RE = /(?:\+?\d[\d\-\s()]{6,}\d)/;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const WEIRD_RE = /[<>{}[\]\\|~^*_@#$%&+=]/;   // סימנים שאינם חלק מביטוי-גימטריה תקין

// ניקוי לעברית-בלבד (כמו המנוע): מסיר ניקוד/פיסוק, משאיר א-ת ורווח.
export function hebClean(s) {
  return String(s || "").replace(/[֑-ׇ]/g, "").replace(/[^א-ת\s]/g, " ").replace(/\s+/g, " ").trim();
}

// classifyWord(text, opts) — הלב. opts: { confidence(0..1|0..100), reason, source, hits }
export function classifyWord(text, opts = {}) {
  const original = String(text || "");
  const extracted = hebClean(original);
  const words = extracted ? extracted.split(" ").filter(Boolean) : [];
  const wc = words.length;
  const bareLen = extracted.replace(/\s+/g, "").length;

  const flags = {
    empty:        wc === 0,
    has_emoji:    EMOJI_RE.test(original),
    has_url:      URL_RE.test(original),
    has_phone:    PHONE_RE.test(original),
    has_email:    EMAIL_RE.test(original),
    weird_punct:  WEIRD_RE.test(original),
    too_many_words: wc > 4,
    is_sentence:  wc >= 5,
    too_long:     bareLen > 40,
    too_short:    bareLen > 0 && bareLen < 2,
  };

  // סוג: ✅ מילה (1) · ⚠️ צירוף (2–4) · ❌ משפט (5+)
  const kind = wc === 0 ? "empty" : wc === 1 ? "word" : wc <= 4 ? "phrase" : "sentence";

  // ניקוד-איכות 0–100
  let score = 100;
  if (flags.has_url || flags.has_phone || flags.has_email) score -= 70;
  if (flags.has_emoji) score -= 40;
  if (flags.weird_punct) score -= 30;
  if (kind === "sentence") score -= 55;
  else if (kind === "phrase") score -= (wc - 1) * 10;
  if (flags.too_long) score -= 20;
  if (flags.too_short) score -= 50;
  if (flags.empty) score = 0;
  score = Math.max(0, Math.min(100, score));

  // ביטחון לנרמול ל-0..100
  const conf = opts.confidence == null ? null
    : Math.round(opts.confidence <= 1 ? opts.confidence * 100 : opts.confidence);

  // ⛔ חוקי-בטיחות — לעולם לא אוטומטי אם מתקיים אחד מאלה:
  const hardBlock = flags.empty || flags.has_url || flags.has_phone || flags.has_email ||
    flags.has_emoji || flags.weird_punct || flags.is_sentence || flags.too_many_words ||
    flags.too_long || flags.too_short || (conf != null && conf < 80);

  // אוטומטי רק למילה בודדת נקייה בניקוד גבוה. כל השאר → תור-בקרה. (שמרני מאוד.)
  const safe_to_auto = !hardBlock && kind === "word" && score >= 90;

  return {
    original, extracted, kind, word_count: wc, flags,
    quality_score: score, confidence: conf,
    reason: opts.reason || null, source: opts.source || null,
    hard_block: hardBlock, safe_to_auto,
  };
}

// לתצוגה — תווית-סוג עם אייקון (בקשת צוריאל: ✅/⚠️/❌).
export function kindBadge(kind) {
  return kind === "word" ? "✅ מילה" : kind === "phrase" ? "⚠️ צירוף מילים"
    : kind === "sentence" ? "❌ משפט" : "— ריק";
}

// רשימת הדגלים הפעילים כטקסט קריא (לכרטיס-הבקרה).
export function activeFlags(flags) {
  const L = {
    has_url: "🔗 URL", has_phone: "📞 טלפון", has_email: "✉️ מייל", has_emoji: "😀 אימוג׳י",
    weird_punct: "❗ פיסוק חריג", is_sentence: "❌ משפט", too_many_words: "יותר מדי מילים",
    too_long: "ארוך מדי", too_short: "קצר מדי", empty: "ריק",
  };
  return Object.keys(L).filter(k => flags[k]).map(k => L[k]);
}
