// src/lib/triage.js — Research Triage (before Human Gate) · Orchestration טהורה בלבד.
// ⛔ אין מנוע-גימטריה חדש, אין extractor חדש, אין טבלה חדשה. עוטף רק את הקיים:
//   analysisFlow.js (extractCandidates/analyzeFull — חילוץ+הפרדת Claim≠Fact, כבר קיים ובוגר)
//   gematria.js (METHODS/DEPTH_METHODS/crossMethodPairs — המנוע הקנוני היחיד לחישוב)
// המטרה: "מה מעניין כאן, מה כבר-ידוע, לאן לנתב, ולמה" — לפני שצוריאל בוחר פעולה.
// ONE SYSTEM LAW: כל חלק שכבר קיים (חילוץ/מנוע/DB-First) מיובא ומורכב, לא משוכפל.
//
// חוזה-קלט (מוזרק מהרכיב — DB-First נשאר אצל הקורא, אותו דפוס כמו analysisFlow.js עצמו):
//   triageSource(item, { dbFirst, existingObjects }) — item = {raw, img?}, dbFirst = dbFirstLookup() result
//   (per unique phrase, אם נקרא), existingObjects = תוצאת select מ-research_objects עבור הערכים הרלוונטיים.
// שום קריאת-רשת לא קורית כאן — טהור לגמרי, ניתן-לבדיקה ב-Node בלי DOM/Supabase.

import { extractCandidates } from "./analysisFlow.js";
import { METHODS, DEPTH_METHODS } from "./gematria.js";

const VALUE_METHODS = [...METHODS, ...DEPTH_METHODS]; // כל שיטות-הערך הקריאות-ללקוח (23), עם fn אמיתי.
const METHOD_BY_KEY = Object.fromEntries(VALUE_METHODS.map(m => [m.key, m]));

// ⚠️ מיפוי-שיטה שמרני, בנוי ידנית מול gematria.js עצמו — לא reuse של analysisFlow.js:normMethod().
// סיבה: normMethod() ממפה "ריבוע|משולש"→"ריבוע" (נורמליזציה גסה לתצוגת gematria_claim.method ישן),
// בעוד gematria.js:methodLabel מתעד enum מדויק אחר: "קדמי מוצג כ'משולש' (בקשת צוריאל)" — התנגשות-תווית
// אמיתית בין שני הקבצים (drift, לא תוקן כאן — מתועד). כדי לא "לנחש שיטה" (gematria_engine_law),
// הבנייה כאן מבוססת רק על methodToken()/splitMethod() של analysisFlow.js (התוויות המדויקות שהחילוץ
// עצמו מפיק) + התיעוד הפנימי של gematria.js — לא על normMethod().
const METHOD_KEY_MAP = {
  "רגיל": "רגיל", "מילוי": "מילוי", "מסתתר": "מסתתר", "קדמי": "קדמי",
  "משולש": "קדמי", // gematria.js methodLabel(): "קדמי מוצג כ'משולש' (בקשת צוריאל)"
  "ריבוע": "ריבוע", "גדול": "גדול", "סידורי": "סידורי",
  "את\"בש": "אתבש", "אתבש": "אתבש", "אלבם": "אלבם",
  "נוטריקון": null, "מילים ואותיות": null, // structural — לא ניתן לאימות-ערך קליינטי
};

// ── PHASE 5 · Engine Match — "EXTRACTION קובעת מה לבדוק, המנוע הקנוני קובע איזו שיטה משחזרת אותו". ──
// לא מנחשים לפי method label שהחילוץ/הכותב ציין — מריצים את הביטוי מול *כל* השיטות האמיתיות
// הקריאות-מהקליינט (VALUE_METHODS, אותן METHODS+DEPTH_METHODS שכבר מיובאות למעלה — אין רשימה שנייה,
// אין DB fetch: אומת מול הקוד עצמו שאין ל-client גישה ל-gematria_methods החי מלבד המערכים האלה, ר'
// method_registry_law). Engine Match ≠ Truth — זה רק סיגנל-דטרמיניסטי-נוסף, לא קביעת-נכונות.
export function matchAnyMethod(phrase, value) {
  if (!phrase || value == null) return [];
  const matches = [];
  for (const m of VALUE_METHODS) {
    let computed;
    try { computed = m.fn(phrase); } catch { continue; }
    if (computed === value) matches.push({ method: m.key, computed });
  }
  return matches;
}

// ── PART 3 (Zvi Full Corpus Pass) · Compound/Composite Gematria Claims ────────────────────────
// "quantity × phrase = result" / "phrase(v) × phrase(v) = result" / "phrase+phrase+phrase = num+num+num = result"
// MUST be parsed as an OPERATION over verified operands — never as one literal phrase run through fn_ragil
// (the pre-existing bug: "5 פעמים ברית(612)=3060" would compute ragil("5 פעמים ברית")≠3060 and wrongly report
// ENGINE_MISMATCH for an arithmetically-true claim). New extraction here — NOT a change to analysisFlow.js/
// gematria.js. Every operand still resolves through the SAME METHODS/DEPTH_METHODS.fn; gematria.js's own
// onlyHeb() already strips spaces/hyphens/quotes/nikud before summing, so phrases are passed through as-is.
const NIKUD_G = /[֑-ׇ]/g;
const stripNikud2 = (s) => String(s || "").replace(NIKUD_G, "");
const HEB_PHRASE = `[א-ת][א-ת"'׳״\\-\\s]{0,30}[א-ת"'׳״]?`;

// resolveOperand: ערך-כתב מפורש (אם יש) → אימות מול "רגיל" קודם (ברירת-מחדל התוכן), ורק אם לא-תואם →
// PHASE 5 matchAnyMethod (לא לנחש-שיטה, לבדוק בפועל בכל השיטות הקנוניות). בלי ערך-כתב → "רגיל" הוא הערך.
function resolveOperand(phraseRaw, explicitValue) {
  const phrase = stripNikud2(phraseRaw).replace(/["'׳״]/g, "").trim();
  const ragilFn = METHOD_BY_KEY["רגיל"]?.fn;
  if (!phrase || !ragilFn) return { phrase: phraseRaw, ok: false, status: "METHOD_UNRESOLVED", reason: "ביטוי ריק" };
  const ragil = ragilFn(phrase);
  if (explicitValue == null || ragil === explicitValue) {
    return { phrase, value: ragil, method: "רגיל", ok: true, status: "verified" };
  }
  const matches = matchAnyMethod(phrase, explicitValue);
  if (matches.length) {
    return { phrase, value: explicitValue, method: matches[0].method, ok: true, status: "verified", allMatches: matches };
  }
  return { phrase, value: explicitValue, method: null, ok: false, status: "METHOD_UNRESOLVED",
    reason: `אף שיטה קנונית לא משחזרת ${explicitValue} עבור «${phrase}» (רגיל=${ragil})`, ragil };
}

// ── שלב א · N פעמים/× "phrase"(v)? = result — «5 פעמים "ברית"(612)=3060» · «180 פעמים טו"ב(17)=3060» ──
function extractQuantityProducts(text) {
  const re = new RegExp(`(\\d{1,4})\\s*(?:פעמים|[×xX*])\\s*"?(${HEB_PHRASE})"?\\s*(?:\\((\\d{1,6})\\))?\\s*=\\s*(\\d{1,7})`, "g");
  const out = [];
  let m;
  while ((m = re.exec(text))) {
    const [raw, qtyS, phraseRaw, explicitS, resultS] = m;
    const qty = Number(qtyS), result = Number(resultS), explicitValue = explicitS != null ? Number(explicitS) : null;
    const operand = resolveOperand(phraseRaw, explicitValue);
    const computedTotal = operand.value != null ? qty * operand.value : null;
    let status;
    if (!operand.ok) status = "METHOD_UNRESOLVED";
    else if (computedTotal === result) status = "ENGINE_VERIFIED_COMPOSITE";
    else status = "ENGINE_MISMATCH";
    out.push({ kind: "quantity-product", raw, text: raw.trim(), quantity: qty, operand, result, computedTotal, status });
  }
  return out;
}

// ── שלב ב · phrase(vA) × phrase(vB) = result — «א-הי-ה(21) × א-הי-ה(21)=441» ──
function extractTwoPhraseProducts(text) {
  const re = new RegExp(`(${HEB_PHRASE})\\((\\d{1,6})\\)\\s*[×xX*]\\s*(${HEB_PHRASE})\\((\\d{1,6})\\)\\s*=\\s*(\\d{1,7})`, "g");
  const out = [];
  let m;
  while ((m = re.exec(text))) {
    const [raw, pA, vAs, pB, vBs, resultS] = m;
    const result = Number(resultS);
    const a = resolveOperand(pA, Number(vAs)), b = resolveOperand(pB, Number(vBs));
    const computedTotal = a.value != null && b.value != null ? a.value * b.value : null;
    let status;
    if (!a.ok || !b.ok) status = "METHOD_UNRESOLVED";
    else if (computedTotal === result) status = "ENGINE_VERIFIED_COMPOSITE";
    else status = "ENGINE_MISMATCH";
    out.push({ kind: "two-phrase-product", raw, text: raw.trim(), operands: [a, b], result, computedTotal, status });
  }
  return out;
}

// ── שלב ג׳ · numA × numB = phrase — «21×21 =אמת» (הכיוון ההפוך של שלב ב׳: מכפלה-של-מספרים מול ביטוי-יעד) ──
function extractNumberProductEqualsPhrase(text) {
  const re = new RegExp(`(\\d{1,4})\\s*[×xX*]\\s*(\\d{1,4})\\s*=\\s*"?(${HEB_PHRASE})"?`, "g");
  const out = [];
  let m;
  while ((m = re.exec(text))) {
    const [raw, aS, bS, phraseRaw] = m;
    const a = Number(aS), b = Number(bS), computedTotal = a * b;
    const operand = resolveOperand(phraseRaw, computedTotal); // הכפלה עצמה היא חשבון-טהור; היעד = ערך-הביטוי
    let status;
    if (!operand.ok) status = "METHOD_UNRESOLVED";
    else if (operand.value === computedTotal) status = "ENGINE_VERIFIED_COMPOSITE";
    else status = "ENGINE_MISMATCH";
    out.push({ kind: "number-product-equals-phrase", raw, text: raw.trim(), a, b, computedTotal, operand, status });
  }
  return out;
}

// ── שלב ג · phrase+phrase(+phrase...) = num+num(+num...) = result — «ז+זי+זית=7+17+417=441» ──
// כל איבר-ביטוי מאומת בנפרד מול המספר-המקביל לו (לפי סדר), ואז סכום-המספרים מול result — לא ניחוש.
function extractPhraseSumChains(text) {
  const lines = text.split(/\n+/);
  const out = [];
  for (const line of lines) {
    const m = line.match(new RegExp(`^\\s*((?:${HEB_PHRASE}\\s*\\+\\s*)+${HEB_PHRASE})\\s*=\\s*(\\d{1,6}(?:\\s*\\+\\s*\\d{1,6})+)\\s*=\\s*(\\d{1,7})`));
    if (!m) continue;
    const phrases = m[1].split("+").map(s => s.trim()).filter(Boolean);
    const numbers = m[2].split("+").map(s => Number(s.trim()));
    const result = Number(m[3]);
    if (phrases.length !== numbers.length) continue; // מבנה לא-תואם — לא לנחש התאמה
    const operands = phrases.map((p, i) => resolveOperand(p, numbers[i]));
    const sum = numbers.reduce((s, n) => s + n, 0);
    let status;
    if (operands.some(o => !o.ok)) status = "METHOD_UNRESOLVED";
    else if (sum === result) status = "ENGINE_VERIFIED_COMPOSITE";
    else status = "ENGINE_MISMATCH";
    out.push({ kind: "phrase-sum-chain", raw: m[0], text: m[0].trim(), operands, numbers, sum, result, status });
  }
  return out;
}

// ── אורקסטרציה · כל שלושת הצורות, ללא כפילות מול extractCandidates() הרגיל (routing נשאר נפרד) ──
export function extractCompoundClaims(rawText) {
  const text = stripNikud2(String(rawText || ""));
  return [
    ...extractQuantityProducts(text),
    ...extractTwoPhraseProducts(text),
    ...extractNumberProductEqualsPhrase(text),
    ...extractPhraseSumChains(text),
  ];
}

// ── ניתוב+עניין לטענה-מורכבת — נפרד מ-classifyRouting/scoreInterest (סמנטיקה שונה: METHOD_UNRESOLVED
// אינו "not_applicable" סתמי, ENGINE_MISMATCH כאן הוא תמיד סתירה-אמיתית, לא מגבלת-parser — הפירוק כבר תיקן זאת). ──
function classifyCompoundRouting(cc, existing) {
  if (existing.status === "duplicate") {
    return { artifact_type: "claim", primary: "D", label: "קיים כבר — חבר במקום לשכפל",
      why: `אותה טענה-מורכבת כבר נשמרה (research_objects:${existing.detail.research_object_id}).` };
  }
  if (cc.status === "ENGINE_VERIFIED_COMPOSITE") {
    return { artifact_type: "claim", primary: "A", label: "טענה-מורכבת — אומתה במלואה (Composite)",
      why: "כל הרכיבים אומתו במנוע והפעולה החשבונית משחזרת את הערך הנטען." };
  }
  if (cc.status === "ENGINE_MISMATCH") {
    return { artifact_type: "claim", primary: "A", label: "טענה-מורכבת — סתירה אמיתית",
      why: "הרכיבים אומתו במנוע אך הפעולה החשבונית אינה משחזרת את הערך הנטען — סתירה גלויה, לא להסתיר (לא parser limitation — הפירוק לרכיבים כבר בוצע)." };
  }
  return { artifact_type: "claim", primary: "F", label: "שיטה לא-מזוהה — דורש בדיקה ידנית",
    why: "לפחות רכיב אחד בטענה לא נמצא באף שיטה קנונית — METHOD_UNRESOLVED, לא לנחש." };
}

function scoreCompoundInterest(cc, existing) {
  const reasons = [];
  if (cc.status === "ENGINE_VERIFIED_COMPOSITE") reasons.push("שרשרת-החישוב המלאה אומתה במנוע (כל הרכיבים + הפעולה)");
  if (cc.status === "ENGINE_MISMATCH") reasons.push("סתירה אמיתית בין הרכיבים המאומתים לתוצאה הנטענת");
  if (cc.status === "METHOD_UNRESOLVED") reasons.push("שיטת-גימטריה של רכיב אחד לפחות לא זוהתה בשום שיטה קנונית");
  if (existing.status === "new") reasons.push("לא נמצא קיים — פוטנציאל-חדש");
  if (existing.status === "strengthens") reasons.push("מצטרף/מחזק התכנסות-ערך קיימת");
  if (existing.status === "duplicate") reasons.push("כפול-מדויק לרשומת-מועמד קיימת");
  let interest;
  if (cc.status === "ENGINE_VERIFIED_COMPOSITE" && existing.status !== "duplicate") interest = "HIGH";
  else if (cc.status === "ENGINE_MISMATCH") interest = "LOW";
  else if (cc.status === "METHOD_UNRESOLVED") interest = "MEDIUM";
  else interest = "LOW";
  if (!reasons.length) reasons.push("אין אות מספק — הוצג להקשר בלבד");
  return { interest, reasons };
}

// ── אורקסטרציה · טענות-מורכבות מתוך מקור אחד, כולל existing-check מול אותו research_objects שהוזרק ──
export function extractAndVerifyCompound(item, { dbFirst, existingObjects } = {}) {
  const raw = String(item?.raw || "");
  const claims = extractCompoundClaims(raw);
  return claims.map((cc, idx) => {
    const pseudo = { text: cc.text, norm: cc.text, value: cc.result };
    const existing = checkExisting(pseudo, { dbFirst, existingObjects });
    const routing = classifyCompoundRouting(cc, existing);
    const { interest, reasons } = scoreCompoundInterest(cc, existing);
    return { idx, compound: cc, existing, routing, interest, reasons };
  });
}

// ── שלב 1 · אימות דטרמיניסטי (per candidate) — לעולם לא מחשב מזיכרון, רק METHODS/DEPTH_METHODS.fn ──
export function verifyCandidate(cand) {
  if (cand.type === "sum-equation" || cand.type === "product-equation" || cand.type === "diff-equation") {
    // כבר יש self-check חשבוני מ-extractCandidates עצמו (verifiedSum/verified) — לא גימטריה, חשבון-טהור.
    const ok = cand.verifiedSum ?? cand.verified;
    if (ok == null) return { engine_verified: "not_applicable", engine_detail: { reason: "אין נתוני-אימות במועמד" } };
    return { engine_verified: !!ok, engine_detail: { kind: "arithmetic", text: cand.text, ok: !!ok } };
  }
  if (cand.type === "equation") {
    // A = B — שני ביטויים, ברירת-מחדל "רגיל" (identifyMethod: "שקילות «=» ללא שיטה נקובה → רגיל").
    const m = METHOD_BY_KEY["רגיל"];
    const [a, b] = cand.parts || [];
    if (!a || !b) return { engine_verified: "not_applicable", engine_detail: { reason: "חסרים שני האיברים" } };
    const va = m.fn(a), vb = m.fn(b);
    return {
      engine_verified: va === vb,
      engine_detail: { method: "רגיל", a: { phrase: a, value: va }, b: { phrase: b, value: vb } },
    };
  }
  if (cand.type !== "explicit-claim" || cand.value == null) {
    return { engine_verified: "not_applicable", engine_detail: { reason: `סוג-מועמד «${cand.type}» אינו טענת-ערך` } };
  }
  // ⛔ DRIFT מתועד (method_identity_ambiguity) — לא תוקן ב-analysisFlow.js עצמו (מחוץ ל-scope), רק מנוטרל כאן:
  // extractCandidates() בעצמו מפיק method:"ריבוע" משני מסלולי-חילוץ שונים ובלתי-מסומנים: (א) "relation format"
  // (שורה 119, `normMethod(pm[2])`) — המנרמל הגס שממזג `/ריבוע|משולש/` לתווית אחת "ריבוע"; (ב) שרשרת-שוויון/
  // explicit-claim (שורות 134/146, `splitMethod`→`methodToken`) — המדויק ששומר "משולש"≠"ריבוע" בנפרד. אין שדה
  // מבחין בין שני המסלולים על ה-candidate היוצא, ו-METHOD_KEY_MAP כאן ממפה "משולש"→"קדמי" (per gematria.js
  // methodLabel) אך "ריבוע"→"ריבוע" (שיטה אמיתית שונה) — כך method:"ריבוע" עלול למעשה להיות "משולש" שנכתב
  // במקור ועבר דרך (א), מה שיגרום אימות מול הפונקציה הלא-נכונה (ריבוע במקום קדמי) ותוצאת engine_verified שגויה.
  // אין למפות מחדש (`gematria_engine_law` — אסור לנחש שיטה) — הפתרון היחיד הבטוח: לא לסמוך על "ריבוע" כלל.
  if (cand.method === "ריבוע") {
    // PHASE 5 fallback: אין לסמוך על ה-label, אבל אפשר עדיין לבדוק את הביטוי מול *כל* השיטות האמיתיות —
    // "EXTRACTION קובעת מה לבדוק (ביטוי+ערך), המנוע קובע איזו שיטה משחזרת אותו" — לא ניחוש-label, בדיקה ישירה.
    return { engine_verified: "not_applicable", engine_detail: {
      reason: "שיטה «ריבוע» מזוהה משני מסלולי-חילוץ שונים ב-analysisFlow.js שאינם מסומנים — לא ניתן לקבוע בבטחה אם זו שיטת «ריבוע» האמיתית או «משולש» שמוזג אליה (normMethod). נדרש אימות ידני/תיקון-שורש ב-analysisFlow.js.",
    }, engine_matches: matchAnyMethod(cand.norm || cand.text, cand.value) };
  }
  const key = METHOD_KEY_MAP[cand.method] ?? (cand.method ? undefined : "רגיל"); // ללא-שיטה מצוינת → רגיל (ברירת-מחדל, כמו identifyMethod)
  if (key === undefined) {
    return { engine_verified: "not_applicable", engine_detail: { reason: `שיטה «${cand.method}» לא מזוהה — נדרש אימות ידני` },
      engine_matches: matchAnyMethod(cand.norm || cand.text, cand.value) };
  }
  if (key === null) {
    return { engine_verified: "not_applicable", engine_detail: { reason: `שיטה «${cand.method}» מבנית (לא ערך) — אין אימות-ערך רלוונטי` } };
  }
  const m = METHOD_BY_KEY[key];
  if (!m) return { engine_verified: "not_applicable", engine_detail: { reason: `שיטה «${key}» ללא פונקציית-מנוע קליינטית` } };
  const phrase = cand.norm || cand.text;
  const computed = m.fn(phrase);
  const verified = computed === cand.value;
  // Engine Match (PHASE 5) — סיגנל נוסף, לא מחליף את engine_verified: גם כשה-label שהכתב/החילוץ ציין
  // לא-תואם, יתכן ששיטה *אחרת* (אמיתית, מהמנוע הקנוני) כן משחזרת את הערך — מוצג בנפרד, "Engine Match ≠ Truth".
  const engine_matches = verified ? [] : matchAnyMethod(phrase, cand.value).filter(mm => mm.method !== key);
  return {
    engine_verified: verified,
    engine_detail: { phrase, method: key, claimed: cand.value, computed },
    engine_matches,
  };
}

// ── שלב 2 · חדש/קיים — מול gematria_words (dbFirst, מוזרק) ומול research_objects (existingObjects, מוזרק) ──
// אף שאילתת-רשת לא קורית כאן. "existing" מתאר סיווג אחד, לא ציון.
export function checkExisting(cand, { dbFirst, existingObjects } = {}) {
  const phrase = cand.norm || cand.text;
  const value = cand.value ?? null;

  // מול research_objects — אותו phrase+value כבר נשמר בעבר? (מדויק: הביטוי מופיע ב-terms/statement).
  const dup = (existingObjects || []).find(r =>
    r.value === value && (
      (r.terms || []).includes(phrase) ||
      (r.statement || "").includes(phrase)
    )
  );
  if (dup) return { status: "duplicate", detail: { research_object_id: dup.id, source_ref: dup.source_ref } };

  // אותו ערך כבר קיים ל-*ביטוי-אחר* (בין אם ב-research_objects ובין אם בבנק) — "מחזק/מצטרף".
  const sharedValueRows = (existingObjects || []).filter(r => r.value === value);
  const knownPhrase = (dbFirst?.known || []).find(k => k.phrase === phrase && k.ragil === value);
  if (knownPhrase) return { status: "already_exists", detail: { source: "gematria_words", verified: !!knownPhrase.is_verified } };
  if (sharedValueRows.length) return { status: "strengthens", detail: { count: sharedValueRows.length, ids: sharedValueRows.map(r => r.id) } };
  const hubCount = dbFirst?.hubCounts?.get ? (dbFirst.hubCounts.get(value) || 0) : 0; // Map(value→count), per-artifact (לא ערך-משותף-יחיד)
  if (hubCount > 0) return { status: "strengthens", detail: { hubCount, source: "gematria_words" } };

  return { status: "new", detail: {} };
}

// ── שלב 3 · סוג-ארטיפקט + ניתוב מומלץ (Gate #18 — לא ממזג פיזית שום מאגר) ──
function classifyRouting(cand, verification, existing) {
  if (cand.type === "equation") {
    // שני ביטויים בשקילות — chiddush-shaped (השוואת-שתי-ביטויים), לא claim כללי.
    return {
      artifact_type: "relation",
      primary: "C", label: "חידוש-shaped — נתב ידנית דרך צינור-החידושים הקיים",
      why: "השוואת-שני-ביטויים (A=B) — תואם צורת-חידוש; לא מנותב אוטומטית (ConvergenceWizard/chiddush_submissions נשארים השער היחיד).",
    };
  }
  if (["explicit-claim", "sum-equation", "product-equation", "diff-equation"].includes(cand.type) && cand.value != null) {
    if (existing.status === "duplicate") {
      return { artifact_type: "claim", primary: "D", label: "קיים כבר — חבר במקום לשכפל",
        why: `אותו ביטוי+ערך כבר נשמר (research_objects:${existing.detail.research_object_id}) — הצע חיזוק/קישור, לא שורה כפולה.` };
    }
    return {
      artifact_type: "claim", primary: "A", label: "טענה — Research Intake (research_objects)",
      why: verification.engine_verified === true ? "טענת-ערך שאומתה במנוע — מועמד-מחקר תקין."
        : verification.engine_verified === false ? "טענת-ערך שהמנוע לא-תואם אותה — עדיין ראוי לתעד (סתירה גלויה, לא להסתיר)."
        : "טענת-ערך שלא ניתנת לאימות-מנוע קליינטי כרגע — עדיין ניתנת לתיעוד כמועמד לא-מאומת.",
    };
  }
  // ללא ערך/סוג-לא-מנותב (verse/emphasized/structural-trigger/number-anchor/AUTHOR_NOTE) — לא נכפה לשום מאגר.
  return {
    artifact_type: "unclear", primary: "F", label: "דורש סיווג-אנושי",
    why: "אין טענת-ערך ברורה לנתב אוטומטית — מוצג כהקשר, לא נעלם (Rank, Don't Hide).",
  };
}

// ── שלב 4 · עניין-מחקרי — איכותי ומוסבר, לא ציון-אטום אחד. HIGH/MEDIUM/LOW/NONE + reasons[]. ──
function scoreInterest(cand, verification, existing) {
  const reasons = [];
  if (verification.engine_verified === true) reasons.push("אומת במנוע (ערך תואם)");
  if (verification.engine_verified === false) reasons.push("המנוע לא-תואם את הערך הנטען — סתירה ראויה-לתיעוד");
  if (existing.status === "new") reasons.push("לא נמצא קיים — פוטנציאל-חדש");
  if (existing.status === "strengthens") reasons.push("מצטרף/מחזק התכנסות-ערך קיימת");
  if (existing.status === "already_exists") reasons.push("כבר קיים בבנק המאומת — לא חדש");
  if (existing.status === "duplicate") reasons.push("כפול-מדויק לרשומת-מועמד קיימת");

  let interest;
  if (cand.value == null && cand.type !== "equation") interest = "NONE";
  else if (verification.engine_verified === true && (existing.status === "new" || existing.status === "strengthens")) interest = "HIGH";
  else if (verification.engine_verified === true) interest = "MEDIUM";
  else if (existing.status === "duplicate") interest = "LOW";
  else if (verification.engine_verified === false) interest = "LOW";
  else interest = "MEDIUM"; // not_applicable אך יש ערך+ביטוי מפורש — עדיין ראוי-לתשומת-לב אנושית
  if (!reasons.length) reasons.push("אין אות מספק — הוצג להקשר בלבד");
  return { interest, reasons };
}

// ── עזר לרכיב: אילו phrases/values צריך לשלוף מה-DB לפני ריצה-שנייה עם הקשר אמיתי ──
// שני-מעברים בכוונה: מעבר-1 טהור (בלי DB) קובע *מה לשאול*, מעבר-2 (עם dbFirst/existingObjects אמיתיים)
// נותן את התוצאה הסופית. כך triage.js עצמו נשאר טהור-לגמרי (ניתן-לבדיקה ב-Node, כפי שנבדק בפועל).
export function collectQueryNeeds(item) {
  const cands = extractCandidates(String(item?.raw || ""));
  const phrases = [...new Set(cands.filter(c => c.type === "explicit-claim").map(c => c.norm || c.text))];
  const values = [...new Set(cands.filter(c => c.value != null).map(c => c.value))];
  return { phrases, values };
}

// ── שלב 5 · אורקסטרציה על מקור אחד ──
// מחזיר {artifacts:[...], overallInterest, hasAnyResearchValue}. אפס WRITE. אפס קריאת-רשת.
export function triageSource(item, { dbFirst, existingObjects } = {}) {
  const raw = String(item?.raw || "");
  const cands = extractCandidates(raw);
  const routable = cands.filter(c =>
    ["explicit-claim", "equation", "sum-equation", "product-equation", "diff-equation"].includes(c.type)
  );

  const artifacts = routable.map((cand, i) => {
    const verification = verifyCandidate(cand);
    const existing = checkExisting(cand, { dbFirst, existingObjects });
    const routing = classifyRouting(cand, verification, existing);
    const { interest, reasons } = scoreInterest(cand, verification, existing);
    return { idx: i, candidate: cand, verification, existing, routing, interest, reasons };
  });

  const weak = cands.filter(c => !routable.includes(c)).slice(0, 8); // הקשר בלבד — לא נעלם (Rank, Don't Hide)

  const anyHigh = artifacts.some(a => a.interest === "HIGH");
  const anyMed = artifacts.some(a => a.interest === "MEDIUM");
  const overallInterest = !artifacts.length ? "NONE" : anyHigh ? "HIGH" : anyMed ? "MEDIUM" : "LOW";

  return { artifacts, weakSignals: weak, overallInterest, hasAnyResearchValue: artifacts.length > 0 };
}

// ── שלב 6 · קשרים בין-ביטויים (section F של תיק-המחקר) — group-by טהור על ערך משותף בתוך אותו מקור. ──
// אין מנוע-חדש: רק extractCandidates() הקיים + קיבוץ. קשר = ≥2 ביטויים שונים המצטלבים באותו ערך
// (למשל 441 ↔ אמת ↔ ארץ זית שמן) — לא נקבע כאן FACT/CLAIM, רק "יש הצטלבות בטקסט", ההפרדה נשארת ב-artifacts.
export function findConnections(item) {
  const raw = String(item?.raw || "");
  const cands = extractCandidates(raw).filter(c => c.value != null);
  const byValue = new Map();
  for (const c of cands) {
    const phrase = c.norm || c.text;
    if (!byValue.has(c.value)) byValue.set(c.value, new Set());
    byValue.get(c.value).add(phrase);
  }
  const connections = [];
  for (const [value, phraseSet] of byValue) {
    if (phraseSet.size >= 2) connections.push({ value, phrases: [...phraseSet] });
  }
  return connections.sort((a, b) => b.phrases.length - a.phrases.length);
}

// ── תיק-המחקר (Research Case) · PROJECTION בלבד — לא Store חדש, לא טבלה חדשה. ──
// עוטף triageSource()+findConnections() הקיימים לתצוגה מאוחדת-אחת (Foundation נשאר כמו-שהוא, ר' triage_case_law
// ב-work_log). item יכול לשאת meta (credit/channel/date/cuId/img) שנשמר כאן רק כ-pass-through לתצוגה — לא נקרא.
export function buildResearchCase(item, ctx = {}) {
  const triage = triageSource(item, ctx);
  const connections = findConnections(item);
  return { ...triage, connections };
}
