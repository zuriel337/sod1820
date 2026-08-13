// src/lib/analysisFlow.js — Smart Analysis Flow · לוגיקה טהורה (READ/preview · אין WRITE · אין הרצת-מנוע).
// שלבים 1+4: חילוץ-מועמדים · זיהוי-שיטת-הממצא · הצעת-שיטות — כל אחד עם `why`. (DB-First + פרופיל-כתב = reads ב-supabase.js.)
// ⛔ חוקי-ברזל: NO_COMPUTE_ALL (בוחר מועמדים, לא כל הטקסט) · EXPLAIN_WHY (כל פריט עם הסבר) ·
//    לא ממציא שיטה בלי מנוע · Claim≠Fact (חילוץ=מועמד בלבד, האימות בשלב-המנוע הגייטד).
import { crossMethodPairs } from "./gematria.js"; // מנוע-הלקוח הקנוני (gematria_engine_law) — 7 שיטות קריאות.

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

// methodToken: מזהה טוקן-שיטה יחיד (עם קידומת ב/ה) ומחזיר את **תווית-הכתב** (משולש נשמר משולש, לא ריבוע). לא-שיטה → null.
function methodToken(tok) {
  const t = String(tok || "").replace(/["'׳״().]/g, "").trim();
  if (/^ה?ב?מילוי$/.test(t)) return "מילוי";
  if (/^ה?ב?משולש$/.test(t)) return "משולש";
  if (/^ה?ב?ריבוע$/.test(t)) return "ריבוע";
  if (/^ה?ב?רגיל$/.test(t)) return "רגיל";
  if (/^ה?ב?אתבש$/.test(t)) return "את\"בש";
  if (/^ה?ב?קדמי$/.test(t)) return "קדמי";
  if (/^ה?ב?סידורי$/.test(t)) return "סידורי";
  if (/^ה?ב?אלבם$/.test(t)) return "אלבם";
  if (/^ה?ב?מסתתר$/.test(t)) return "מסתתר";
  if (/^ה?ב?גדול$/.test(t)) return "גדול";
  if (/^ה?ב?נוטריקון$/.test(t)) return "נוטריקון";
  return null;
}
// splitMethod: מפריד «שיטה» מ«ביטוי» כשהכתב כתב אותה — בסוגריים בסוף «(מילים ואותיות)» או כמילה-אחרונה «… משולש».
// ⛔ לא ממציא: אם לא צוינה שיטה → method=null («שיטת החישוב לא צוינה»). לא פוגע בביטוי חד-מילתי.
export function splitMethod(rawPhrase) {
  let p = String(rawPhrase || "").trim();
  let method = null;
  const par = p.match(/\(([^)]+)\)\s*$/);            // «…(מילים ואותיות)» / «…(מילוי)»
  if (par) {
    const inner = par[1].trim();
    if (/מילים.{0,3}ו?אותיות/.test(inner)) { method = "מילים ואותיות"; p = p.slice(0, par.index).trim(); }
    else { const mm = methodToken(inner); if (mm) { method = mm; p = p.slice(0, par.index).trim(); } }
  }
  if (!method) {                                      // מילת-שיטה אחרונה (רק אם נשארות ≥2 מילים בביטוי)
    const words = p.split(/\s+/).filter(Boolean);
    if (words.length >= 2) { const mm = methodToken(words[words.length - 1]); if (mm) { method = mm; words.pop(); p = words.join(" ").trim(); } }
  }
  return { phrase: p, method };
}

const HEB = /[א-ת]/;
const NIKUD_G = /[֑-ׇ]/g;
const stripNikud = (s) => String(s || "").replace(NIKUD_G, "");
// origForm: הביטוי **כפי-שנכתב במקור** — מוריד ניקוד/מרכאות/(ערך)/פיסוק-קצה בלבד.
// ⛔ שומר את האותיות והמקפים בדיוק (י-ה-ו-ה נשאר י-ה-ו-ה) — אין החלפת-מילה, אין normalization-במקום.
const origForm = (s) => stripNikud(s).replace(/["'«»“”‘’׳״]/g, "").replace(/\(\s*\d+\s*\)/g, " ")
  .replace(/\s+/g, " ").replace(/^[\s.,;:!?()]+|[\s.,;:!?()]+$/g, "").trim();
// clean: צורת-מנוע/DB בלבד — כמו origForm + כיווץ מקפים (י-ה-ו-ה → יהוה, כדי שהבנק/ההצלבה יתפסו).
// ⚠️ משמשת ל-`norm` (מוצג *לצד* המקור, אם שונה) ולהזנת-המנוע — לעולם לא מחליפה את `text` המקורי.
const clean = (s) => origForm(s).replace(/[־\-]/g, "").replace(/\s+/g, " ").trim();
// מילות-מטא שאינן ביטוי-מחקר («כל הפסוק» = הפניה · «שלושתם» = כינוי-ריבוי המפנה לביטויים, לא ביטוי לחישוב).
const META_STOP = new Set([
  "כל הפסוק", "הפסוק", "פסוק זה", "הפסוק הזה", "הפסוק השלם", "פסוק שלם", "כל המילים", "המילה", "כל הפסוק הזה",
  "שלושתם", "שלשתם", "שלושתן", "שניהם", "שניהן", "שתיהם", "שתיהן", "ארבעתם", "חמשתם", "כולם", "כולן", "שניהמ",
]);
// ביטוי-תקף: עברית בלבד, 2–40 תווים, עד 6 מילים, בלי ספרות/נקודתיים/סוגריים, לא מילת-מטא.
const validPhrase = (p) => !!p && HEB.test(p) && p.length >= 2 && p.length <= 40 && !/[0-9:()]/.test(p) && p.split(/\s+/).filter(Boolean).length <= 6 && !META_STOP.has(p);

// ── שלב 2 · SMART EXTRACTION — טקסט → Candidate[] (מחרוזת טהורה, אפס גימטריה) ──
// טענות/שקילויות נחלצות **שורה-שורה** (הרווח/הירידה שוברים — כדי לא לבלוע מילים מיותרות משורה אחרת).
// ניקוד מוסר (המנוע והבנק אדישים לניקוד) כדי שההצלבה עם DB-First תתפוס. סוגים: explicit-claim · equation · verse · structural-trigger · number-anchor · emphasized.
const TRIGGERS = ["אותיות", "ראשי תיבות", "ר\"ת", "סופי תיבות", "ס\"ת", "נוטריקון", "דילוג", "אנגרמ", "מסתתר", "מילוי", "את\"בש", "ריבוע", "משולש"];
export function extractCandidates(rawText) {
  const text = stripNikud(rawText);
  if (!text.trim()) return [];
  const out = [];
  const seen = new Set();
  // dedup לפי type+text+**value+method** — אותו ביטוי בשני ערכים/שיטות (ברכו את ה' המברך=1402 וגם =922) = שתי טענות.
  const add = (c) => { const k = c.type + "|" + c.text + "|" + (c.value ?? "") + "|" + (c.method ?? ""); if (!seen.has(k)) { seen.add(k); out.push(c); } };
  // mk: בונה מועמד עם `text` = המקור-כפי-שנכתב, ו-`norm` (צורת-מנוע) **רק אם שונה** — לצד המקור, לא במקומו.
  const mk = (raw, base) => { const t = origForm(raw); const n = clean(raw); const o = { ...base, text: t }; if (n && n !== t) o.norm = n; return o; };
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // relation format: «מספר = ביטוי(שיטה) · ביטוי(שיטה) ⟵ …» (הצלבת-שיטות של מנוע-הגילויים).
    let mr = line.match(/^(\d{2,5})\s*=\s*(.+)/);
    if (mr && /[א-ת].*\(/.test(mr[2])) {
      const value = Number(mr[1]);
      const rhs = mr[2].replace(/[⟵←→].*$/, "");
      for (const seg of rhs.split(/[·•|]/).map(s => s.trim()).filter(Boolean)) {
        const pm = seg.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
        const rawP = pm ? pm[1] : seg;
        const disp = origForm(rawP), nf = clean(rawP);
        const method = pm ? normMethod(pm[2]) : null;
        if (disp && HEB.test(nf || disp) && (nf || disp).length >= 2)
          add(mk(rawP, { type: "explicit-claim", value, method, why: method ? `הכתב: «${disp}» ב${method} = ${value}` : `הכתב: «${disp}» = ${value}`, score: 100 }));
      }
      continue;
    }
    // explicit-claim (שורה): «ביטוי [שיטה] = מספר» — סובלני לפיסוק/כוכבית/סוגריים לפני «=» (ראש הממשלה*= 922 · …(מילים ואותיות)=1149).
    // שיטה נכתבת מופרדת לשדה `method` (ליל הבדלח משולש=434 → ביטוי «ליל הבדלח» · שיטה «משולש»). לא צוינה → method=null.
    let mm = line.match(/^(.+?)\s*=\s*(\d{1,5})\b/);
    if (mm && HEB.test(mm[1])) {
      const val = Number(mm[2]);
      const { phrase: ph, method } = splitMethod(mm[1]);
      const disp = origForm(ph), nf = clean(ph);
      if (disp && HEB.test(nf || disp) && (nf || disp).length >= 2 && disp.length <= 48)
        add(mk(ph, { type: "explicit-claim", value: val, method: method || undefined,
          why: method ? `הכתב: «${disp}» בשיטת «${method}» = ${val}` : `הכתב: «${disp}» = ${val} — שיטה לא צוינה (נדרש זיהוי/אימות)`, score: 100 }));
      continue;
    }
    // equation (שורה): «A = B» (שני ביטויים עבריים). דילוג על משוואות-סכום (מטופלות בנפרד).
    let me = line.includes("+") ? null : line.match(/^([א-ת][^=]{1,40}?)\s*=\s*([א-ת][^=]{1,40})$/);
    if (me) {
      const ao = origForm(me[1]), bo = origForm(me[2]), an = clean(me[1]), bn = clean(me[2]);  // text=מקור · parts=צורת-מנוע
      if (ao && bo && an !== bn) add({ type: "equation", text: `${ao} = ${bo}`, parts: [an, bn], why: "שני ביטויים שהכתב משווה — לבדוק שקילות-ערך", score: 80 });
    }
  }
  // ── פרוזה-גימטריה כללית (לא רק «phrase=number» בשורה) — עובד על צבי/ZURIEL/כל כתב ──
  // הכתב *מסמן* מבנה: מרכאות · (ערך) · «גימטריא» · משוואת-סכום. מחלצים את המסומן — לא כל מילה (NO_COMPUTE_ALL).
  const Q = "[\"'«»“”‘’׳״]";
  let m;
  // A0 · משוואת-סכום עם ביטויים: «A(x) + B(y) = C(z)» — מחלץ 3 ביטויים נקיים + מאמת a+b=c (כללי, לא צבי-ספציפי)
  const pSumRe = /([א-ת][א-ת\s]{1,30})\s*\((\d{2,5})\)\s*\+\s*([א-ת][א-ת\s]{1,30})\s*\((\d{2,5})\)\s*=\s*([א-ת][א-ת\s]{1,30})\s*\((\d{2,5})\)/g;
  while ((m = pSumRe.exec(text))) {
    const p1o = origForm(m[1]), p2o = origForm(m[3]), p3o = origForm(m[5]);  // תצוגה = מקור
    const a = +m[2], b = +m[4], c = +m[6];
    add({ type: "sum-equation", text: `${p1o}(${a}) + ${p2o}(${b}) = ${p3o}(${c})`, value: c, parts: [clean(m[1]), clean(m[3]), clean(m[5])], verifiedSum: a + b === c, why: `משוואת-סכום עם ביטויים${a + b === c ? " ✓ מאומתת-חשבונית" : " ⚠️ לא-שקולה"}`, score: 97 });
    [[m[1], a], [m[3], b], [m[5], c]].forEach(([rp, v]) => { if (validPhrase(clean(rp))) add(mk(rp, { type: "explicit-claim", value: v, why: "ביטוי במשוואת-הסכום", score: 94 })); });
  }
  const P = "[א-ת\\s־\\-]";  // תווי-ביטוי: אותיות + רווח + מקף (י-ה-ו-ה)
  // A · «ביטוי(ערך)» — נאות מדבר(703)
  const parenRe = new RegExp("([א-ת]" + P + "{1,38}?)\\s*\\((\\d{2,5})\\)", "g");
  while ((m = parenRe.exec(text))) { if (validPhrase(clean(m[1]))) add(mk(m[1], { type: "explicit-claim", value: Number(m[2]), why: "ביטוי + ערך בסוגריים (הכתב סימן)", score: 95 })); }
  // B1 · ביטוי + «גימטריא/שווה/עולה» + ערך  (הערך אחרי הביטוי): «נאות מדבר» גימטריא 703
  // ⛔ מדלג על «N פעמים …» (זו טענת-מכפלה, לא ערך ישיר — «ענן בגימטריא 10 פעמים טוב» ≠ ענן=10). נלכד ב-detectProducts.
  const gemAfter = new RegExp(Q + "?([א-ת]" + P + "{1,34}?)" + Q + "?\\s*(?:[בהלמושכ]?גימטרי[אה]|שוו?ה|עולה)\\s*[:=\\s]*(\\d{2,5})(?!\\s*פעמ)", "g");
  while ((m = gemAfter.exec(text))) { if (validPhrase(clean(m[1]))) add(mk(m[1], { type: "explicit-claim", value: Number(m[2]), why: "ביטוי + «גימטריא» + ערך", score: 92 })); }
  // B2 · «גימטריא» + ביטוי  (הביטוי אחרי המילה): בגימטריא «יומא דשבתא»
  const gemBefore = new RegExp("[בהלמושכ]?גימטרי[אה]\\s*[:=]?\\s*" + Q + "([א-ת]" + P + "{1,34}?)" + Q, "g");
  while ((m = gemBefore.exec(text))) { if (validPhrase(clean(m[1]))) add(mk(m[1], { type: "emphasized", why: "ביטוי שהוצג כשווה-גימטריא", score: 90 })); }
  // C · משוואת-סכום שהכתב הציג: 703 + 61 = 764 (בודקים שהיא נכונה חשבונית — לא מחשבים גימטריה)
  const sumRe = /(\d{2,5})\s*\+\s*(\d{2,5})\s*=\s*(\d{2,5})/g;
  while ((m = sumRe.exec(text))) { const a = +m[1], b = +m[2], c = +m[3]; add({ type: "sum-equation", text: `${a} + ${b} = ${c}`, value: c, parts: [a, b, c], verifiedSum: a + b === c, why: `משוואת-סכום שהכתב הציג${a + b === c ? " ✓ מאומתת-חשבונית" : " ⚠️ לא-שקולה"}`, score: 96 }); }
  // D · ביטויים במרכאות (הכתב סימן כמשמעותיים) — כולל מרכאות מסולסלות + מקפים (י-ה-ו-ה)
  const qRe = new RegExp(Q + "([א-ת]" + P + "{1,38}?)" + Q, "g");
  while ((m = qRe.exec(text))) { if (validPhrase(clean(m[1]))) add(mk(m[1], { type: "emphasized", why: "ביטוי במרכאות (הכתב סימן)", score: 30 })); }

  // structural-trigger: מילת-מפתח שמצביעה על שיטה מבנית.
  for (const t of TRIGGERS) if (text.includes(t)) { add({ type: "structural-trigger", text: t, why: `הכתב הזכיר «${t}» — רמז לשיטה מבנית`, score: 60 }); break; }
  // verse: ניקוד במקור = ציטוט-פסוק (בודקים את המקור לפני הסרת-ניקוד).
  if (/[֑-ׇ]/.test(String(rawText || ""))) {
    const seg = origForm(String(rawText).split("\n").find(l => /[֑-ׇ]/.test(l)) || rawText).slice(0, 60);
    if (seg) add({ type: "verse", text: seg, why: "טקסט מנוקד — ציטוט-פסוק (מועמד לנוטריקון/ערך-פסוק)", score: 50 });
  }
  // number-anchor: מספר בודד (2–5 ספרות) שלא נלכד כטענה.
  const claimedVals = new Set(out.filter(c => c.value != null).map(c => c.value));
  const numRe = /(?<![\d=])\b(\d{2,5})\b/g;
  while ((m = numRe.exec(text))) { const n = Number(m[1]); if (!claimedVals.has(n)) add({ type: "number-anchor", text: String(n), value: n, why: "מספר משמעותי בטקסט — עוגן-חיפוש (לא מחושב)", score: 40 }); }
  // (ביטויים-במרכאות מחולצים ב-qRe למעלה עם validPhrase — אין צורך ב-regex-מרכאות נוסף.)

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

// ── שלב 7 · הרצת-מנוע (פאזה 2) — מחשב כל ביטוי ב-7 השיטות הקריאות (מנוע-הלקוח הקנוני),
// ומזהה התכנסויות: ערך שמופיע ב-≥2 ביטויים שונים (הצלבת-שיטות). FACT = ערך-מנוע · CONVERGENCE = ערך-משותף.
// ⛔ חישוב בלבד (gematria_engine_law) — אין WRITE. הלכידה/ניתוב = שלב נפרד וגייטד.
export function runEngineOnTerms(terms = []) {
  const uniq = [...new Set((terms || []).map(t => String(t || "").trim()).filter(t => /[א-ת]/.test(t) && t.length >= 2))];
  const facts = [];
  const byValue = new Map();
  for (const t of uniq) {
    for (const p of crossMethodPairs(t)) {
      facts.push({ term: t, method: p.method, value: p.value });
      if (!byValue.has(p.value)) byValue.set(p.value, []);
      byValue.get(p.value).push({ term: t, method: p.method });
    }
  }
  // התכנסות = ערך המשותף ל-≥2 ביטויים *שונים* (לא אותו ביטוי בשתי שיטות-בנות).
  const convergences = [...byValue.entries()]
    .filter(([, mem]) => new Set(mem.map(m => m.term)).size >= 2)
    .map(([value, members]) => ({ value, members }))
    .sort((a, b) => b.members.length - a.members.length || b.value - a.value);
  return { terms: uniq, facts, convergences };
}

// ── «ניתוח מלא» · Orchestration מעל המנועים הקיימים (אין מנוע/טבלה חדשים) ──
// כל הפונקציות טהורות. DB-First + פרופיל-כתב מוזרקים מהרכיב (async). מקסימום-הקשר, לא brute-force.

// «כולל»/תוספות-חשבוניות — מסמן שהמספר הוא CLAIM עם מתודה (לא ערך-מנוע ישיר). לא מניחים שהמספר נכון.
const KOLL_MARKERS = ["עם הכולל", "הכולל", "כולל", "עם האות", "עם המילה", "עם המילים", "עם הכולל והמילה", "בחישוב", "סה\"כ", "סהכ"];
export function detectKoll(text) {
  const t = String(text || "");
  return [...new Set(KOLL_MARKERS.filter(mk => t.includes(mk)))];
}

// מקורות ספרותיים/תנ"כיים: «בספר X» · שם-ספר-תנ"ך + הפניה. לא מאבד את הקשר אם המקור באמצע פסקה.
const TANACH = ["תהילים", "תהלים", "יואל", "ישעיהו", "ישעיה", "ירמיהו", "ירמיה", "יחזקאל", "בראשית", "שמות", "ויקרא", "במדבר", "דברים", "זכריה", "עמוס", "הושע", "מיכה", "דניאל", "עזרא", "נחמיה", "משלי", "איוב", "קהלת", "רות", "אסתר", "עובדיה", "יונה", "נחום", "חבקוק", "צפניה", "חגי", "מלאכי", "שופטים", "שמואל", "מלכים", "יהושע"];
export function detectSources(text) {
  const t = String(text || ""); const out = []; const seen = new Set();
  let m; const bookRe = /ב?ספר\s+([א-ת][א-ת\s'"׳״]{1,28}?)(?=[\s.,;)"]|$)/g;
  const bookStop = new Set(["תורה", "התורה", "הזה", "זה"]);  // «ספר תורה» = מגילה, לא מקור-ציטוט
  while ((m = bookRe.exec(t))) { const name = clean(m[1]); if (name && !bookStop.has(name) && !seen.has("b:" + name)) { seen.add("b:" + name); out.push({ type: "book", name, citation: null }); } }
  for (const b of TANACH) {
    // גבול-מילה: לא תת-מחרוזת (רות בתוך «הבחירות» → נדחה). קידומת-אות אחת מותרת (בישעיהו). חייב מספר-הפניה אחרי כדי להיחשב ציטוט.
    const bm = t.match(new RegExp("(?:^|[^א-ת])[בהלמוכש]?(" + b + ")(?![א-ת])"));
    const idx = bm ? bm.index + bm[0].length - b.length : -1;
    if (idx >= 0 && !seen.has("t:" + b) && !seen.has("b:" + b)) {   // כבר נלכד כ«ספר X» → לא לשכפל
      const after = t.slice(idx + b.length, idx + b.length + 20);
      // הפניה תקינה: מספר-עברי עם גרשיים (ט"ז / מ"ד) או אות-בודדת (ו) — לא מילה-ארוכה בלי גרשיים («אשתי»).
      const NUM = "[א-ת]{1,2}[\"'׳״][א-ת]{0,2}";
      const cit0 = (after.match(new RegExp("^[\\s.,]*(" + NUM + "(?:\\s*[,:]\\s*" + NUM + ")?|[א-ת]['׳]?(?![א-ת]))")) || [])[1] || null;
      if (!cit0) continue;   // שם-ספר בלי הפניה-תקינה = לא ציטוט (מונע «רות» בתוך פרוזה)
      seen.add("t:" + b);
      out.push({ type: "tanach", name: b, citation: clean(cit0) });
    }
  }
  return out;
}

// פסוק: ניקוד = סימן חזק לציטוט-מקור (גם כשלא מסומן יפה). מחזיר את השורות המנוקדות.
export function detectVerses(text) {
  return String(text || "").split(/\n/).map(l => l.trim())
    .filter(l => /[֑-ׇ]/.test(l) && l.length > 6).map(l => ({ text: l.slice(0, 140), nikud: true }));
}

// טענת-מכפלה: «X בגימטריא N פעמים Y» (ענן = 10 פעמים טו"ב). המספר הוא CLAIM-מכפלה — לא ערך-מנוע ישיר.
// לא מניחים שהמתמטיקה נכונה: מציעים לבדוק N × gem(Y) מול הערך של X (Human-Gate).
export function detectProducts(text) {
  const t = stripNikud(String(text || "")); const out = []; let m;
  const re = /([א-ת][א-ת\s]{0,20}?)\s*(?:[בהלמושכ]?גימטרי[אה]|שוו?ה|עולה)?\s*(\d{1,4})\s*פעמים\s*["'«»“”‘’׳״]?([א-ת][א-ת\s"'׳״]{0,18}?)["'«»“”‘’׳״]?(?=[\s.,;)}]|$)/g;
  while ((m = re.exec(t))) {
    const phrase = origForm(m[1]), factor = Number(m[2]), unit = origForm(m[3]), ok = validPhrase(clean(m[1]));  // תצוגה = מקור
    if (unit && HEB.test(unit) && factor > 1) out.push({ phrase: ok ? phrase : null, factor, unit, why: `טענת-מכפלה: ${factor} × «${unit}»${ok ? ` = «${phrase}»` : ""} — לבדוק במנוע, לא להניח` });
  }
  return out;
}

// טענת-הופעה: «X מופיע פעם אחת / N פעמים בתורה/בתנ"ך/ב<ספר>» — Claim שניתן לבדוק בחיפוש-מקור, לא Fact.
// זה בדיוק המקום שבו ה-AI חוקר (מציע בדיקת-תנ״ך), לא מחשבון.
export function detectOccurrenceClaims(text) {
  const t = stripNikud(String(text || "")); const out = []; const seen = new Set(); let m;
  const re = /["'«»“”‘’׳״]([א-ת][א-ת\s]{1,24}?)["'«»“”‘’׳״]\s*(?:כבר\s*)?(?:מופיע|מופיעה|מוזכר|מוזכרת|נמצא|נמצאת|בא|באה)\s+(פעם\s+אחת|פעמיים|שלוש\s+פעמים|\d+\s*פעמים)/g;
  while ((m = re.exec(t))) { const phrase = origForm(m[1]); if (validPhrase(clean(m[1])) && !seen.has(phrase)) { seen.add(phrase); out.push({ phrase, count: m[2].replace(/\s+/g, " ").trim(), why: "טענת-הופעה בטקסט-מקור — ניתנת לבדיקה בחיפוש-תנ״ך, לא עובדת-מנוע" }); } }
  return out;
}

// ── אשכולות-ערך (writer-claimed) — קיבוץ טענות לפי הערך שהכתב ייחס. ≥2 ביטויים שונים = «התכנסות מועמדת» ──
// ⛔ מועמדת בלבד — מחכה לאימות-מנוע לכל ביטוי בנפרד. HOT≠TRUE · CLAIM≠FACT. השיטה שונה בין ביטויים → לא אחידה.
export function clusterClaims(claims = []) {
  const byVal = new Map();
  for (const c of claims) {
    if (c.type !== "explicit-claim" || c.value == null) continue;
    if (!byVal.has(c.value)) byVal.set(c.value, []);
    byVal.get(c.value).push({ text: c.text, method: c.method || null, norm: c.norm || null });
  }
  return [...byVal.entries()].map(([value, items]) => {
    const distinct = [...new Set(items.map(i => i.text))];
    const methods = [...new Set(items.map(i => i.method).filter(Boolean))];
    return { value, items, distinctExprs: distinct.length, methods, uniformMethod: methods.length <= 1, candidateConvergence: distinct.length >= 2 };
  }).sort((a, b) => b.distinctExprs - a.distinctExprs || b.value - a.value);
}

// ── מפת ביטוי×שיטה×ערך — לכל ביטוי חוזר, כל (שיטה,ערך) שהכתב ייחס לו. «לנסוע לאורך/רוחב/עומק» ללא הסקת-משמעות. ──
export function exprMethodValueMap(claims = []) {
  const byExpr = new Map();
  for (const c of claims) {
    if (c.type !== "explicit-claim" || c.value == null) continue;
    if (!byExpr.has(c.text)) byExpr.set(c.text, []);
    const arr = byExpr.get(c.text); const key = (c.method || "—") + "|" + c.value;
    if (!arr.some(x => x.key === key)) arr.push({ key, method: c.method || null, value: c.value });
  }
  return [...byExpr.entries()].map(([expr, rows]) => ({ expr, rows: rows.sort((a, b) => a.value - b.value) }))
    .filter(e => e.rows.length >= 2).sort((a, b) => b.rows.length - a.rows.length);
}

// ── טענות שטרם-נבדקו: «X - טרם נבדק» (כולל שגיאת-כתיב «טאם נבדק»). לא מחשבים — מסמנים כבדיקה-ממתינה. המקור נשמר כלשונו. ──
export function detectPending(text) {
  const out = []; const seen = new Set();
  for (const raw of String(text || "").split(/\n/)) {
    const m = raw.match(/^\s*(.+?)\s*[-–—]\s*(טרם\s*נבדק|טאם\s*נבדק|לא\s*נבדק|לבדוק|טרם\s*אומת)/);
    if (m) { const p = origForm(m[1]); if (p && HEB.test(p) && !/\d/.test(p) && p.length <= 40 && !seen.has(p)) { seen.add(p); out.push({ phrase: p, note: m[2].replace(/\s+/g, " ").trim(), why: "הטקסט מציין שהבדיקה טרם בוצעה — הצע בדיקת-גימטריה רגילה, ואז שיטות נוספות רק בהצדקה" }); } }
  }
  return out;
}

// ── הערת-כותב / טענת-תאריך (AUTHOR_NOTE · DATE_CLAIM) — תאריך עברי/לועזי + אירוע אישי → מועמד לשכבת-הציר, לא ממצא-גימטריה. ──
const HEB_MONTHS = ["מרחשון", "מר חשון", "חשון", "תשרי", "כסלו", "טבת", "שבט", "אדר", "ניסן", "אייר", "סיון", "סיוון", "תמוז", "אלול", "אב"];
export function detectDateClaims(text) {
  const t = String(text || ""); const out = [];
  const greg = t.match(/\b(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})\b/);
  const monthRe = new RegExp("([א-ת]{1,3}['\"׳״]?)\\s+((?:" + HEB_MONTHS.join(")|(?:") + "))");
  const hebDate = t.match(monthRe);
  const birthday = /יום\s*הולדת/.test(t);
  const age = (t.match(/יום\s*הולדת\S*\s*ה[־\-]?\s*(\d{1,3})/) || t.match(/בן\s*(\d{2,3})/) || [])[1] || null;
  const note = (t.match(/[^\n]*יום\s*הולדת[^\n]*/) || [])[0]?.trim() || (t.match(/[^\n]*ב"ה[^\n]*/) || [])[0]?.trim() || null;
  if (greg || (hebDate && birthday)) {
    out.push({
      kind: "AUTHOR_NOTE · DATE_CLAIM",
      hebDate: hebDate ? origForm(hebDate[0]) : null,
      gregDate: greg ? greg[0] : null,
      claim: birthday ? `יום הולדת${age ? ` ${age}` : ""}` : null,
      note: note ? note.slice(0, 160) : null,
      why: "הערת-כותב עם תאריך/אירוע — מועמד לשכבת-הציר בכפוף לאימות תאריך+אירוע. ⛔ לא נכנס למנוע-הגימטריה.",
    });
  }
  return out;
}

// המלצות-מחקר (H) — כל אחת עם `why` ו-`rank` (high=גבוהה · mid=בינונית · interp=פרשני·לא-Fact).
// מוצעות בלבד, לא מבוצעות ולא מקדמות (Human-Gate). ⛔ שרשרת-פרשנות = interp, לעולם לא Fact.
export function researchSuggestions({ engine, claims, clusters, exprMap, pending, dateClaims, koll, verses, sources, products, occurrences, writerName, dbHubKnown }) {
  const s = [];
  const conv = engine?.convergences || [];
  const cand = (clusters || []).filter(c => c.candidateConvergence);
  // ── גבוהה — אשכולות-מועמדים (writer-claimed) לפי כמות-הביטויים + התכנסויות-מנוע + הופעות/מכפלות/כולל ──
  cand.slice(0, 6).forEach(cl => s.push({
    rank: "high",
    t: `אמת את כל ${cl.distinctExprs} הביטויים באשכול ${cl.value}`,
    why: `הכתב ייחס ${cl.distinctExprs} ביטויים שונים לערך ${cl.value}${cl.uniformMethod ? "" : ` (שיטות שונות: ${cl.methods.join("·") || "לא-אחיד"} — כל ביטוי דורש אימות נפרד)`} — התכנסות מועמדת, לא מאומתת`,
  }));
  conv.slice(0, 2).forEach(hub => {
    const terms = [...new Set(hub.members.map(m => m.term))];
    s.push({ rank: "high", t: `התכנסות-מנוע ${hub.value}: ${terms.join(" ↔ ")}`, why: `${terms.length} ביטויים שהמנוע כבר מצא שווי-ערך (${[...new Set(hub.members.map(m => m.method))].join(",")}) — FACT חישובי` });
  });
  (occurrences || []).forEach(o => s.push({ rank: "high", t: `בדוק את טענת-ההופעה: «${o.phrase}» ${o.count}`, why: o.why }));
  (products || []).forEach(p => s.push({ rank: "high", t: `בדוק את טענת-המכפלה: ${p.factor} × «${p.unit}»${p.phrase ? ` = «${p.phrase}»` : ""}`, why: p.why }));
  (pending || []).forEach(p => s.push({ rank: "high", t: `בדוק «${p.phrase}» (${p.note})`, why: p.why }));
  if (koll?.length) s.push({ rank: "high", t: `אמת את מתודת-הכולל (${koll.join(" · ")})`, why: "המספר הוא CLAIM עם תוספת-חישוב — לאמת במנוע, לא להניח" });
  const sum = (claims || []).find(c => c.type === "sum-equation");
  if (sum) s.push({ rank: "high", t: `בדוק את המשוואה ${sum.text}`, why: `משוואת-סכום${sum.verifiedSum ? " (מאומתת חשבונית)" : ""} שהכתב הציג` });
  // ── בינונית — צמתים-חוזרים · השוואת-שיטות · DB-First · מקורות · דפוס-כתב ──
  (exprMap || []).slice(0, 3).forEach(e => s.push({ rank: "mid", t: `בדוק אם «${e.expr}» צומת-חוזר (${e.rows.length} שילובי שיטה×ערך)`, why: `הביטוי מופיע ב-${e.rows.map(r => `${r.method || "רגיל?"}→${r.value}`).join(" · ")} — השווה את השיטות במנוע` }));
  s.push({ rank: "mid", t: "בדוק אילו מהביטויים כבר קיימים ב-DB", why: dbHubKnown != null ? `חלק מהערכים כבר בבנק — חדש מול חיזוק-קיים` : "DB-First לכל אשכול — חדש או חיזוק-לקיים" });
  (sources || []).forEach(src => { if (src.type === "tanach") s.push({ rank: "mid", t: `אמת את המקור ${src.name}${src.citation ? ` ${src.citation}` : ""}`, why: "לזהות ספר/פרק ולבדוק אם כבר ב-DB (לא לשכפל)" }); });
  if (writerName) s.push({ rank: "mid", t: `בדוק ממצאים נוספים של ${writerName} עם מבנה דומה`, why: "לזהות דפוס-עבודה חוזר (פרופיל-שיטה)" });
  // ── ציר — טענות-תאריך (לא Fact-גימטריה) ──
  (dateClaims || []).forEach(d => s.push({ rank: "axis", t: `בדוק תאריך/אירוע: ${[d.hebDate, d.gregDate].filter(Boolean).join(" · ")}${d.claim ? ` (${d.claim})` : ""}`, why: d.why }));
  // ── פרשני — לא Fact ──
  s.push({ rank: "interp", t: "בחן את הקשרים הרעיוניים שהכתב מציע", why: "פרשנות/הקשר — Interpretation, לא עובדת-מנוע. לא לאמת כ-Fact ולא לקדם ל-Canonical" });
  return s;
}

// analyzeFull — מרכיב את כל השכבות הטהורות (B/C/E + koll/verses/sources/products/occurrences + suggestions).
// A(מקור)/D(DB-First)/פרופיל-כתב מגיעים מהרכיב (async) ומוזרקים ל-suggestions דרך dbHubKnown/writerName.
export function analyzeFull(rawText, { writerName = null, dbHubKnown = null } = {}) {
  const cands = extractCandidates(rawText);
  const claims = cands.filter(c => ["explicit-claim", "sum-equation", "equation"].includes(c.type));
  // הזנת-המנוע/DB = צורת-מנוע (norm||text) — ההצלבה/הבנק מנוקדים-ומקופים-אדישים. התצוגה נשארת `text` המקורי.
  const phrases = [...new Set(cands.filter(c => ["explicit-claim", "equation", "emphasized"].includes(c.type)).flatMap(c => c.parts || [c.norm || c.text]))];
  const engine = runEngineOnTerms(phrases);
  const koll = detectKoll(rawText);
  const verses = detectVerses(rawText);
  const sources = detectSources(rawText);
  const products = detectProducts(rawText);
  const occurrences = detectOccurrenceClaims(rawText);
  const clusters = clusterClaims(cands);             // אשכולות writer-claimed (מועמדי-התכנסות)
  const exprMap = exprMethodValueMap(cands);         // מפת ביטוי×שיטה×ערך
  const pending = detectPending(rawText);            // «טרם נבדק»
  const dateClaims = detectDateClaims(rawText);      // AUTHOR_NOTE · DATE_CLAIM
  const suggestions = researchSuggestions({ engine, claims, clusters, exprMap, pending, dateClaims, koll, verses, sources, products, occurrences, writerName, dbHubKnown });
  // מבנה-הממצא (🧩): המשוואה + ההתכנסות המרכזית + אשכולות + מפת-שיטות — «יחידות-טיעון».
  const sumEq = cands.find(c => c.type === "sum-equation");
  const structure = { sumEq: sumEq || null, hub: engine.convergences[0] || null, convergences: engine.convergences, clusters, exprMap, pending, dateClaims, phrases, verses, sources, products, occurrences };
  return { cands, claims, phrases, engine, koll, verses, sources, products, occurrences, clusters, exprMap, pending, dateClaims, suggestions, structure };
}
