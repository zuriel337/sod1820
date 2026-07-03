// 🔤 מנוע תעתוק ומיפוי שפות — Transliteration & Language-Mapping Engine
// ═══════════════════════════════════════════════════════════════════════════
// זה **לא** מתרגם (Dream ≠ חלום). הוא **מתעתק** פונטית (Dream → דרים) ומדרג מועמדים
// עם רמת-ביטחון. שלושה קשרים שונים (נשמרים ב-word_aliases.method):
//   • transliteration — תעתוק צליל (Dream→דרים) · שומר את הערך העברי (=254)
//   • translation     — תרגום משמעות (Dream→חלום) · ערך אחר (=84)
//   • exact           — איות עברי מקובל (WhatsApp→וואטסאפ)
// ═══════════════════════════════════════════════════════════════════════════
// המנוע "לומד": המילון המאומת (LEXICON / word_aliases verified) **גובר תמיד** על האלגוריתם.
// כל תיקון שצוריאל מאשר נכנס למילון → מהפעם הבאה אותה מילה מתועתקת אוטומטית נכון.

export const normEn = s => String(s || "").toLowerCase().replace(/[^a-z' ]/g, "").replace(/\s+/g, " ").trim();

// דיגרפים (צירופי-אותיות) — נבדקים לפי אורך יורד. [en, he]
const DIGRAPHS = [
  ["tch", "צ'"], ["sch", "ש"], ["igh", "יי"],
  ["sh", "ש"], ["ch", "צ'"], ["ph", "פ"], ["th", "ת"], ["ck", "ק"], ["kh", "ח"],
  ["gh", "ג"], ["wh", "ו"], ["qu", "קוו"], ["ng", "נג"],
  ["oo", "ו"], ["ee", "י"], ["ea", "י"], ["oa", "ו"], ["ou", "או"], ["ow", "או"],
  ["au", "או"], ["aw", "או"], ["ai", "יי"], ["ay", "יי"], ["ei", "יי"], ["ey", "יי"],
  ["ie", "י"], ["oi", "וי"], ["oy", "וי"], ["ue", "ו"], ["ui", "ו"], ["oe", "ו"],
];
// אות בודדת → עברית. תנועות (a/e/i/o/u) מסומנות weak — עשויות ליפול בגרסה הדחוסה.
const SINGLE = {
  a: "א", b: "ב", c: "ק", d: "ד", e: "", f: "פ", g: "ג", h: "ה", i: "י", j: "ג'",
  k: "ק", l: "ל", m: "מ", n: "נ", o: "ו", p: "פ", q: "ק", r: "ר", s: "ס", t: "ט",
  u: "ו", v: "ו", w: "ו", x: "קס", y: "י", z: "ז",
};
const WEAK_VOWEL = new Set(["a", "e", "i", "o", "u"]);        // מטריס-לקציוניס — עשוי ליפול
const AMBIG = new Set(["c", "e", "o", "u", "x", "a", "y"]);   // אותיות רב-משמעיות → מורידות ביטחון
const SOFIT = { "מ": "ם", "נ": "ן", "צ": "ץ", "פ": "ף", "כ": "ך" };

// המרת אות אחרונה לצורתה הסופית (מנצפ״ך) — דרים→דרים (ם), לא דרימ.
function applyFinal(heb) {
  if (!heb) return heb;
  const last = heb[heb.length - 1];
  return SOFIT[last] ? heb.slice(0, -1) + SOFIT[last] : heb;
}

// תעתוק גולמי של מילה בודדת → { letters:[{en,he,weak,ambig}], base:"עברית מלאה" }
function rawTranslit(word) {
  const w = normEn(word).replace(/ /g, "");
  const letters = [];
  let i = 0;
  while (i < w.length) {
    let matched = null;
    for (const [en, he] of DIGRAPHS) {
      if (w.startsWith(en, i)) { matched = { en, he, weak: false, ambig: false }; i += en.length; break; }
    }
    if (!matched) {
      const ch = w[i];
      matched = { en: ch, he: SINGLE[ch] ?? "", weak: WEAK_VOWEL.has(ch), ambig: AMBIG.has(ch) };
      i += 1;
    }
    // כפל-עיצור באנגלית (pp/tt/ss/ll…) → אות אחת בעברית (happy→הפי, לא הפפי).
    if (matched.he !== "" && !(letters.length && letters[letters.length - 1].he === matched.he && !matched.weak)) {
      letters.push(matched);
    }
  }
  return { letters, base: letters.map(l => l.he).join("") };
}

// רמת-ביטחון: מתחיל ב-0.99, יורד לכל החלטה רב-משמעית/תנועה. תקרה [0.55, 0.99].
function scoreConfidence(letters) {
  let conf = 0.99;
  for (const l of letters) {
    if (l.ambig) conf -= 0.04;
    if (l.weak) conf -= 0.02;
  }
  return Math.max(0.55, Math.round(conf * 100) / 100);
}

/**
 * transliterate(word, opts) — מנוע התעתוק המרכזי.
 * @param {string} word            מילה/ביטוי באנגלית
 * @param {object} [opts]
 * @param {Map<string,object>} [opts.lexicon]  מילון-נלמד: normEn→{hebrew,confidence,method,verified}
 * @returns {{ input, source, candidates:Array<{hebrew,confidence,method,note}> }}
 *   source: 'lexicon' (מאומת, גובר) | 'algorithm' (ניחוש פונטי)
 */
export function transliterate(word, opts = {}) {
  const key = normEn(word);
  if (!key) return { input: word, source: "empty", candidates: [] };

  // 1) המילון-הנלמד גובר — אם צוריאל כבר אישר/תיקן, זו התשובה.
  const lex = opts.lexicon && opts.lexicon.get(key);
  if (lex && lex.hebrew) {
    return {
      input: key, source: "lexicon",
      candidates: [{ hebrew: lex.hebrew, confidence: lex.confidence ?? 1, method: lex.method || "transliteration", note: "מילון מאומת" }],
    };
  }

  // 2) תעתוק אלגוריתמי — לכל מילה בביטוי בנפרד, ואז מאחדים ברווח.
  const words = key.split(" ").filter(Boolean);
  const perWord = words.map(rawTranslit);
  const full = perWord.map(p => applyFinal(p.base)).join(" ");
  const conf = scoreConfidence(perWord.flatMap(p => p.letters));

  const candidates = [{ hebrew: full, confidence: conf, method: "transliteration", note: "תעתוק מלא (עם תנועות)" }];

  // גרסה דחוסה — מפילה תנועות-עזר לא-הכרחיות (סגנון דחוס, כמו שנפוץ ברמזים). ביטחון מעט נמוך יותר.
  const compressed = perWord.map(p => {
    const kept = p.letters.filter((l, idx) => !(l.weak && idx > 0 && idx < p.letters.length - 1));
    return applyFinal(kept.map(l => l.he).join(""));
  }).join(" ");
  if (compressed && compressed !== full) {
    candidates.push({ hebrew: compressed, confidence: Math.max(0.5, conf - 0.1), method: "transliteration", note: "תעתוק דחוס (ללא תנועות-עזר)" });
  }

  return { input: key, source: "algorithm", candidates };
}

// bestTransliteration — הצורה המומלצת היחידה (המילון קודם, אחרת המועמד המדורג ראשון).
export function bestTransliteration(word, opts = {}) {
  const r = transliterate(word, opts);
  return r.candidates[0] || null;
}

// buildLexicon(rows) — הופך שורות word_aliases (alias,hebrew,confidence,method,verified) למפה לחיפוש מהיר.
// מזינים רק verified=true (המילון-הנלמד) כדי שהאלגוריתם לא יידרס ע״י ניחושים לא-מאומתים.
export function buildLexicon(rows, { verifiedOnly = true } = {}) {
  const m = new Map();
  for (const r of rows || []) {
    if (verifiedOnly && !r.verified) continue;
    const k = normEn(r.alias);
    if (k && r.hebrew) m.set(k, { hebrew: r.hebrew, confidence: r.confidence ?? 1, method: r.method || "transliteration", verified: !!r.verified });
  }
  return m;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚦 Language Router — lane אחד: זיהוי סוג-קלט. (הראוטר המלא יעטוף את זה בעתיד.)
// מחזיר: 'empty' | 'number' | 'hebrew' | 'english' | 'mixed'
export function classifyInput(input) {
  const s = String(input || "").trim();
  if (!s) return "empty";
  if (/^\d[\d,]*$/.test(s)) return "number";
  const hasHeb = /[א-ת]/.test(s);
  const hasLat = /[A-Za-z]/.test(s);
  if (hasHeb && hasLat) return "mixed";
  if (hasLat) return "english";
  if (hasHeb) return "hebrew";
  return "mixed";
}

// ═══════════════════════════════════════════════════════════════════════════
// ❓ אוטומציית «המשתמשים בונים איתנו» (בקשת צוריאל): לפי סוג-הקלט + תוצאת-המנוע,
// מה לשאול את המשתמש כדי ללמוד ממנו. מחזיר { ask, kind, question, proposal }.
//   ask=false → אין שאלה (עברית/מספר/נמצא במילון) · ask=true → מציגים שאלה קטנה.
// resolved: האם כבר יש התאמה במאגר (word/alias). engineResult: פלט transliterate().
export function buildUserPrompt(input, { engineResult = null, resolved = false } = {}) {
  const type = classifyInput(input);
  if (type === "empty" || type === "number" || type === "hebrew" || resolved) {
    return { ask: false, kind: type, question: null, proposal: null };
  }
  const best = engineResult && engineResult.candidates && engineResult.candidates[0];
  if (type === "english") {
    if (engineResult && engineResult.source === "lexicon") return { ask: false, kind: "english", question: null, proposal: best };
    if (best && best.confidence >= REVIEW_THRESHOLD) {
      // ביטחון סביר → שאלת-אישור: «התכוונת ל…?»
      return { ask: true, kind: "confirm_translit", proposal: best,
        question: `חיפשת «${input}» — התכוונת ל־«${best.hebrew}»?` };
    }
    // ביטחון נמוך/אין → שאלה פתוחה: «איך כותבים בעברית?»
    return { ask: true, kind: "ask_hebrew", proposal: best || null,
      question: `איך כותבים את «${input}» בעברית?` };
  }
  // mixed
  return { ask: true, kind: "ask_language", proposal: null,
    question: `לא בטוח מה חיפשת — «${input}». אפשר לכתוב בעברית?` };
}

// מדיניות סף (בקשת צוריאל): גבוה→אוטומטי · בינוני→תור-אישור · נמוך→ידני בלבד.
export const AUTO_ADD_THRESHOLD = 0.95;
export const REVIEW_THRESHOLD = 0.75;
export function ingestDecision(confidence) {
  if (confidence >= AUTO_ADD_THRESHOLD) return "auto";      // מוסיף לבד כ-alias
  if (confidence >= REVIEW_THRESHOLD) return "review";      // לתור-אישור של צוריאל
  return "manual";                                          // נמוך מדי — ידני בלבד
}
