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
    return { engine_verified: "not_applicable", engine_detail: {
      reason: "שיטה «ריבוע» מזוהה משני מסלולי-חילוץ שונים ב-analysisFlow.js שאינם מסומנים — לא ניתן לקבוע בבטחה אם זו שיטת «ריבוע» האמיתית או «משולש» שמוזג אליה (normMethod). נדרש אימות ידני/תיקון-שורש ב-analysisFlow.js.",
    } };
  }
  const key = METHOD_KEY_MAP[cand.method] ?? (cand.method ? undefined : "רגיל"); // ללא-שיטה מצוינת → רגיל (ברירת-מחדל, כמו identifyMethod)
  if (key === undefined) {
    return { engine_verified: "not_applicable", engine_detail: { reason: `שיטה «${cand.method}» לא מזוהה — נדרש אימות ידני` } };
  }
  if (key === null) {
    return { engine_verified: "not_applicable", engine_detail: { reason: `שיטה «${cand.method}» מבנית (לא ערך) — אין אימות-ערך רלוונטי` } };
  }
  const m = METHOD_BY_KEY[key];
  if (!m) return { engine_verified: "not_applicable", engine_detail: { reason: `שיטה «${key}» ללא פונקציית-מנוע קליינטית` } };
  const computed = m.fn(cand.norm || cand.text);
  return {
    engine_verified: computed === cand.value,
    engine_detail: { phrase: cand.norm || cand.text, method: key, claimed: cand.value, computed },
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
