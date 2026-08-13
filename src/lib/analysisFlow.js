// src/lib/analysisFlow.js — Smart Analysis Flow · לוגיקה טהורה (READ/preview · אין WRITE · אין הרצת-מנוע).
// שלבים 1+4: חילוץ-מועמדים · זיהוי-שיטת-הממצא · הצעת-שיטות — כל אחד עם `why`. (DB-First + פרופיל-כתב = reads ב-supabase.js.)
// ⛔ חוקי-ברזל: NO_COMPUTE_ALL (בוחר מועמדים, לא כל הטקסט) · EXPLAIN_WHY (כל פריט עם הסבר) ·
//    לא ממציא שיטה בלי מנוע · Claim≠Fact (חילוץ=מועמד בלבד, האימות בשלב-המנוע הגייטד).

// ── רישום-שיטות (רק כאלה עם מנוע קיים) — מיפוי label→engine fn. לא להוסיף בלי fn. ──
export const METHODS = {
  "רגיל":     { fn: "fn_ragil",           kind: "value" },
  "מסתתר":    { fn: "fn_misratar",        kind: "value" },
  "את\"בש":   { fn: "atbash_calc",        kind: "value" },
  "אלבם":     { fn: "fn_albam",           kind: "value" },
  "גדול":     { fn: "fn_gadol",           kind: "value" },
  "קדמי":     { fn: "fn_kadmi",           kind: "value" },
  "מילוי":    { fn: "fn_miluy",           kind: "value" },
  "סידורי":   { fn: "fn_siduri",          kind: "value" },
  "ריבוע":    { fn: "fn_ribua",           kind: "value" },
  "נוטריקון": { fn: "fn_notarikon",       kind: "structural" },
  "דילוג":    { fn: "fn_els_search",      kind: "structural" },
  "אנגרמה":   { fn: "fn_anagrams_engine", kind: "structural" },
};
// נרמול מחרוזת-שיטה (מ-gematria_claim/טקסט) לצורה קנונית ברישום. לא ממציא — לא-מזוהה נשאר כמו-שהוא.
export function normMethod(s) {
  const t = String(s || "").trim().toLowerCase().replace(/["'׳״]/g, "");
  if (/רגיל/.test(t)) return "רגיל";
  if (/מסתתר|מיסתתר/.test(t)) return "מסתתר";
  if (/אתבש|את.?בש/.test(t)) return "את\"בש";
  if (/אלבם/.test(t)) return "אלבם";
  if (/גדול/.test(t)) return "גדול";
  if (/קדמי/.test(t)) return "קדמי";
  if (/מילוי/.test(t)) return "מילוי";
  if (/סידורי/.test(t)) return "סידורי";
  if (/ריבוע|משולש/.test(t)) return "ריבוע";
  if (/נוטריקון|ראשי.?תיבות|סופי.?תיבות|ר.?ת|ס.?ת/.test(t)) return "נוטריקון";
  if (/דילוג|els/.test(t)) return "דילוג";
  if (/אנגרמ/.test(t)) return "אנגרמה";
  return String(s || "").trim() || null;   // לא-מזוהה — לא ממציאים, שומרים כפי-שהוא
}

const HEB = /[א-ת]/;
const NIKUD_G = /[֑-ׇ]/g;
const stripNikud = (s) => String(s || "").replace(NIKUD_G, "");
const clean = (s) => stripNikud(s).replace(/[«»"״]/g, "").replace(/\s+/g, " ").trim();

// ── שלב 2 · SMART EXTRACTION — טקסט → Candidate[] (מחרוזת טהורה, אפס גימטריה) ──
// טענות/שקילויות נחלצות **שורה-שורה** (הרווח/הירידה שוברים — כדי לא לבלוע מילים מיותרות משורה אחרת).
// ניקוד מוסר (המנוע והבנק אדישים לניקוד) כדי שההצלבה עם DB-First תתפוס. סוגים: explicit-claim · equation · verse · structural-trigger · number-anchor · emphasized.
const TRIGGERS = ["אותיות", "ראשי תיבות", "ר\"ת", "סופי תיבות", "ס\"ת", "נוטריקון", "דילוג", "אנגרמ", "מסתתר", "מילוי", "את\"בש", "ריבוע", "משולש"];
export function extractCandidates(rawText) {
  const text = stripNikud(rawText);
  if (!text.trim()) return [];
  const out = [];
  const seen = new Set();
  const add = (c) => { const k = c.type + "|" + c.text; if (!seen.has(k)) { seen.add(k); out.push(c); } };
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // explicit-claim (שורה): «ביטוי = מספר» — הביטוי הוא הקטע-שלפני-«=» באותה שורה (לא חוצה-שורות).
    let mm = line.match(/^(.*?[א-ת])\s*=\s*(\d{1,5})\b/);
    if (mm) {
      const phrase = clean(mm[1]);
      if (phrase && HEB.test(phrase) && phrase.length >= 2 && phrase.length <= 48)
        add({ type: "explicit-claim", text: phrase, value: Number(mm[2]), why: "הכתב כתב «=» מפורש עם ערך — טענה ישירה", score: 100 });
      continue;
    }
    // equation (שורה): «A = B» (שני ביטויים עבריים).
    let me = line.match(/^([א-ת][^=]{1,40}?)\s*=\s*([א-ת][^=]{1,40})$/);
    if (me) {
      const a = clean(me[1]), b = clean(me[2]);
      if (a && b && a !== b) add({ type: "equation", text: `${a} = ${b}`, parts: [a, b], why: "שני ביטויים שהכתב משווה — לבדוק שקילות-ערך", score: 80 });
    }
  }
  // structural-trigger: מילת-מפתח שמצביעה על שיטה מבנית.
  for (const t of TRIGGERS) if (text.includes(t)) { add({ type: "structural-trigger", text: t, why: `הכתב הזכיר «${t}» — רמז לשיטה מבנית`, score: 60 }); break; }
  // verse: ניקוד במקור = ציטוט-פסוק (בודקים את המקור לפני הסרת-ניקוד).
  if (/[֑-ׇ]/.test(String(rawText || ""))) {
    const seg = clean(String(rawText).split("\n").find(l => /[֑-ׇ]/.test(l)) || rawText).slice(0, 60);
    if (seg) add({ type: "verse", text: seg, why: "טקסט מנוקד — ציטוט-פסוק (מועמד לנוטריקון/ערך-פסוק)", score: 50 });
  }
  // number-anchor: מספר בודד (2–5 ספרות) שלא נלכד כטענה.
  const claimedVals = new Set(out.filter(c => c.value != null).map(c => c.value));
  let m; const numRe = /(?<![\d=])\b(\d{2,5})\b/g;
  while ((m = numRe.exec(text))) { const n = Number(m[1]); if (!claimedVals.has(n)) add({ type: "number-anchor", text: String(n), value: n, why: "מספר משמעותי בטקסט — עוגן-חיפוש (לא מחושב)", score: 40 }); }
  // emphasized: ביטוי ב-«...» — הכתב סימן.
  const emRe = /[«"]([^«»"]{2,40})[»"]/g;
  while ((m = emRe.exec(String(rawText || "")))) { const p = clean(m[1]); if (p && HEB.test(p)) add({ type: "emphasized", text: p, why: "ביטוי שהכתב הדגיש/סימן", score: 30 }); }

  return out.sort((a, b) => b.score - a.score);
}

// ── זיהוי שיטת-הממצא (של הפריט הבודד — לא של הכתב!) ──
// מהטקסט: אם נזכרה שיטה מפורשת → היא. אחרת «=» עם מספר = רגיל (ברירת-מחדל שמרנית).
export function identifyMethod(candidate, rawText) {
  const t = String(rawText || "");
  for (const key of Object.keys(METHODS)) {
    const alt = key.replace(/["'׳״]/g, "");
    if (t.includes(key) || (alt.length > 2 && t.includes(alt))) return { method: key, why: `הטקסט מזכיר במפורש «${key}»` };
  }
  if (/ראשי.?תיבות|סופי.?תיבות|ר"ת|ס"ת|נוטריקון|אותיות/.test(t)) return { method: "נוטריקון", why: "רמז מבני (ר״ת/ס״ת/אותיות)" };
  if (candidate?.type === "explicit-claim" || candidate?.type === "equation") return { method: "רגיל", why: "שקילות «=» ללא שיטה נקובה → רגיל (ברירת-מחדל)" };
  return { method: null, why: "לא זוהתה שיטה — יש להגדיר ידנית" };
}

// ── שלב 6 (הצעה) · METHOD SELECTION — שיטות רלוונטיות בלבד, כל אחת עם `why`. אין הרצה כאן. ──
// prior = פרופיל-שיטות-הכתב (מ-getWriterMethodProfile) — רמז לדירוג, לא מכריע (הממצא הבודד קובע קודם).
export function proposeMethods(candidate, identified, profile) {
  const list = [];
  const m = identified?.method;
  if (m && METHODS[m]) list.push({ fn: METHODS[m].fn, method: m, why: `לאמת את טענת-הכתב בשיטת «${m}»` });
  if (candidate?.type === "number-anchor" || candidate?.value != null) {
    const v = candidate.value;
    list.push({ fn: "read:gematria_words", method: "בנק", why: `לבדוק מה כבר קיים בערך ${v} (צביר)`, readonly: true });
    list.push({ fn: "fn_verses_by_gematria", method: "פסוקים", why: `לאתר פסוקים בערך ${v}` });
  }
  // רמז-פרופיל: אם השיטה הדומיננטית של הכתב שונה מזו של הממצא — לציין (לא לכפות).
  if (profile?.dominant && m && profile.dominant !== m)
    list.push({ fn: METHODS[profile.dominant]?.fn || null, method: profile.dominant, why: `שיטת-העבודה הדומיננטית של הכתב (${profile.total} מאומתים) — רמז, לא חובה`, hint: true });
  return list;
}

// ── פרופיל-שיטות של כתב (aggregation טהור מעל ממצאים מאומתים בלבד) ──
// rows = research_contributions עם gematria_claim מאומת. סופר method מכל engine_verified_layers.
// ⛔ Claim לא-מאומת לא נספר · לא קובע «דומיננטי» מממצא יחיד (דורש total≥2).
export function buildMethodProfile(rows = []) {
  const counts = new Map();
  let total = 0;
  const evidence = [];
  for (const r of rows) {
    const gc = r.gematria_claim;
    if (!gc || gc.verified !== true) continue;                 // מאומת בלבד
    const layers = Array.isArray(gc.engine_verified_layers) ? gc.engine_verified_layers : [];
    const methods = layers.length ? layers.map(l => l && l.method) : [gc.method];
    const uniq = [...new Set(methods.map(normMethod).filter(Boolean))];
    for (const mm of uniq) counts.set(mm, (counts.get(mm) || 0) + 1);
    total += 1;
    if (evidence.length < 5) evidence.push({ subject: gc.subject || r.title || "—", methods: uniq, value: gc.value ?? null });
  }
  const methods = [...counts.entries()].map(([method, count]) => ({ method, count })).sort((a, b) => b.count - a.count);
  // «דומיננטי» רק אם ≥2 ממצאים מאומתים *וגם* השיטה המובילה מופיעה ≥2 (לא מממצא בודד).
  const dominant = (total >= 2 && methods[0] && methods[0].count >= 2) ? methods[0].method : null;
  return { total, methods, dominant, evidence };
}
