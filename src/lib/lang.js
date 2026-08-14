// src/lib/lang.js — שכבת-שפה כללית (Language Layer · לא «English layer»).
// זיהוי-שפה בצד-לקוח (heuristic עם confidence כן), ברירת-שפת-תשובה, ובניית בקשת-תרגום.
// ⛔ חוקי-ברזל: המקור לעולם לא מוחלף · ניתוח-מחקרי תמיד על המקור · תרגום = שכבת-תקשורת בלבד, לא מקור-מחקר.
// ⚠️ זהו detector-סקריפט (heuristic) — מבחין היטב בין סקריפטים (עברית/ערבית/קירילי) אך פחות בין שפות-לטיניות.
//    זיהוי מודל-מלא (confidence גבוה ל-es/fr/pt/de) יגיע ממצב-raw של video-transcribe (עתיד, gated).

export const CANON_LANGS = ["he", "en", "ar", "es", "fr", "ru", "pt", "de"];
export const LANG_HE = { he: "עברית", en: "אנגלית", ar: "ערבית", es: "ספרדית", fr: "צרפתית", ru: "רוסית", pt: "פורטוגזית", de: "גרמנית", el: "יוונית", cjk: "סינית/יפנית", unknown: "לא-ודאי" };

const RE = {
  he: /[֐-׿]/g, ar: /[؀-ۿ]/g, ru: /[Ѐ-ӿ]/g,
  el: /[Ͱ-Ͽ]/g, cjk: /[぀-ヿ一-鿿]/g, latin: /[A-Za-z]/g,
};
const cnt = (s, re) => (String(s || "").match(re) || []).length;

// סימני-היכר קלים לשפות-לטיניות (לא NLP — אינדיקציה בלבד).
const STOP = {
  fr: /\b(le|la|les|une|des|est|vous|nous|avec|pour|dans|qui)\b|[éèêàùçôî]/i,
  es: /\b(el|la|los|las|una|que|para|con|por|como|pero|está)\b|[ñ¿¡áíóúü]/i,
  de: /\b(der|die|das|und|ich|nicht|mit|ein|eine|ist|auch|sind)\b|[äöüß]/i,
  pt: /\b(de|que|não|uma|com|para|você|está|isso|mas)\b|[ãõçáéí]/i,
  en: /\b(the|and|is|you|of|to|for|with|this|that|are|have)\b/i,
};

// detectLanguage(text) → { code, name, confidence(0-1), script, mixed, why }. code='unknown' כשלא-ודאי — לא מנחשים.
export function detectLanguage(text) {
  const t = String(text || "").trim();
  if (!t) return { code: "unknown", name: LANG_HE.unknown, confidence: 0, script: null, why: "טקסט ריק" };
  const c = { he: cnt(t, RE.he), ar: cnt(t, RE.ar), ru: cnt(t, RE.ru), el: cnt(t, RE.el), cjk: cnt(t, RE.cjk), latin: cnt(t, RE.latin) };
  const letters = c.he + c.ar + c.ru + c.el + c.cjk + c.latin;
  if (!letters) return { code: "unknown", name: LANG_HE.unknown, confidence: 0, script: null, why: "אין אותיות לזיהוי" };
  // סקריפט לא-לטיני דומיננטי → confidence גבוה
  for (const k of ["he", "ar", "ru", "el", "cjk"]) {
    if (c[k] / letters >= 0.35) {
      const conf = Math.min(0.98, 0.6 + (c[k] / letters) * 0.4);
      const code = (k === "el" || k === "cjk") ? "unknown" : k;   // לא בסט-הקנוני → מציגים סקריפט, code=unknown
      return { code, name: LANG_HE[k], confidence: +conf.toFixed(2), script: k, mixed: c.latin > letters * 0.15, why: `סקריפט ${LANG_HE[k]} דומיננטי (${c[k]}/${letters})` };
    }
  }
  // לטיני → הבחנה לפי סימני-היכר
  if (c.latin / letters >= 0.5) {
    const hits = Object.entries(STOP).filter(([, re]) => re.test(t)).map(([l]) => l);
    const nonEn = hits.filter(h => h !== "en");
    if (nonEn.length === 1) return { code: nonEn[0], name: LANG_HE[nonEn[0]], confidence: 0.72, script: "latin", why: `לטיני + סימני ${LANG_HE[nonEn[0]]}` };
    if (nonEn.length > 1) return { code: nonEn[0], name: LANG_HE[nonEn[0]], confidence: 0.5, script: "latin", why: `לטיני, מועמדים ${nonEn.map(l => LANG_HE[l]).join("/")} — confidence נמוך` };
    if (hits.includes("en")) return { code: "en", name: LANG_HE.en, confidence: 0.7, script: "latin", why: "לטיני + מילות-en" };
    return { code: "en", name: LANG_HE.en, confidence: 0.4, script: "latin", why: "לטיני ללא סימנים מובהקים — ברירת en (confidence נמוך)" };
  }
  return { code: "unknown", name: LANG_HE.unknown, confidence: 0.3, script: "mixed", why: "מעורב/לא-מובהק — לא מנחשים" };
}

// replyLanguage(detected, preferred) — ברירת שפת-תשובה: העדפה מאומתת גוברת; אחרת שפת-ההודעה; אם לא-ודאי → עברית (בטוח), ניתן-לשינוי-ידני.
export function replyLanguage(detected, preferred) {
  if (preferred && preferred.verified && CANON_LANGS.includes(preferred.code)) return { code: preferred.code, source: "preference", note: "העדפה מאומתת של המשתמש" };
  if (detected && detected.code !== "unknown" && (detected.confidence ?? 0) >= 0.5) return { code: detected.code, source: "detected", note: "כשפת-ההודעה שזוהתה" };
  return { code: "he", source: "fallback", note: "שפה לא-ודאית — ברירת-מחדל עברית · ניתן לשנות ידנית" };
}

// בקשת-תרגום למצב-raw של video-transcribe (עתיד, gated). לא שולח — רק בונה את ה-payload הקנוני.
export function buildTranslateRequest({ text, target = "he", ref = null, refName = null, userRef = null }) {
  return { action: "raw", text: String(text || ""), target_lang: target, ref, ref_name: refName, user_ref: userRef };
}
