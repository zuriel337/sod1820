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
import { METHODS, DEPTH_METHODS, RABBATI_METHOD } from "./gematria.js";

// אות רבתי (rabbati_letter_method_law v1) מצטרף כאן ל-VALUE_METHODS — לא ל-METHODS/DEPTH_METHODS
// עצמם (ר' הערת gematria.js) — כי triage.js הוא בדיוק ה"רק-בהקשר-מפורש" הנכון: matchAnyMethod
// (למטה) נקרא רק כשכבר יש ערך-מפורש-נטען בכתב שלא-תואם רגיל (resolveOperand), לא סריקה-עיוורת
// על כל מילה. זה מספיק ל-ZVI 1112 (א(1000)+יבק(112)=1112) בלי לגעת בשום extractor קיים.
const VALUE_METHODS = [...METHODS, ...DEPTH_METHODS, RABBATI_METHOD]; // כל שיטות-הערך הקריאות-ללקוח (24), עם fn אמיתי.
const METHOD_BY_KEY = Object.fromEntries(VALUE_METHODS.map(m => [m.key, m]));

// ⚠️ מיפוי-שיטה שמרני, בנוי ידנית מול gematria.js עצמו — לא reuse של analysisFlow.js:normMethod().
// ✅ Foundation Closure (Method Identity, 26.8.2026) — אומת מול לוח gematria_methods **החי**:
// analysisFlow.js's normMethod() תוקן (הסרת המיזוג השגוי "ריבוע|משולש"→"ריבוע" — ריבוע=fn_ribua ו-משולש
// הם method_key שונים בלוח החי, לא כינוי-אחד). "קדמי"→"משולש" **כן** מאושר: gematria_methods.display_label
// של method_key='קדמי' הוא **מילולית** "קדמי · משולש" — זה alias קנוני מתועד, לא ניחוש. אבל "משולש" בפני-
// עצמו נשאר עמום-קנוני ביודעין: 4 method_key **נוספים** נושאים "משולש" ב-display_label (משולש גדול/מילה/
// הפוך/מדרגות — שיטות-עומק אמיתיות, שונות מקדמי). לכן: קדמי הוא ברירת-המחדל (alias מאושר), ואם היא לא-
// תואמת — ה-engine_matches הגנרי (Phase 5, כבר קיים) סורק את *כל* 23 השיטות כולל משפחת-משולש-העומק,
// ומציג התאמה-חלופית בלי לנחש-במקום-הכתב. STOP מפורש: איזו מ-5 המשמעויות "משולש" בפי הכתב מתכוון —
// לא ניתן לקבוע מהלוח הקנוני החי לבדו (needs Zuriel disambiguation, ר' דוח Foundation Closure).
const METHOD_KEY_MAP = {
  "רגיל": "רגיל", "מילוי": "מילוי", "מסתתר": "מסתתר", "קדמי": "קדמי",
  "משולש": "קדמי", // gematria_methods LIVE: method_key='קדמי' display_label="קדמי · משולש" — alias מאושר, לא ניחוש
  "ריבוע": "ריבוע", "גדול": "גדול", "סידורי": "סידורי",
  "את\"בש": "אתבש", "אתבש": "אתבש", "אלבם": "אלבם",
  // rabbati_letter_method_law v1 — הכתב עצמו ציין "אות רבתי" במפורש (explicit-context, בדיוק כנדרש
  // ע"י activation="explicit_rabbati_context_only"); לא ניחוש — הכתב אמר את זה.
  "אות רבתי": "אות רבתי",
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

// ── שלב ד · General Arithmetic-Chain Evaluator (Zvi Unresolved Cleanup Pass) ────────────────────
// המפרט המקורי (4 החלצנים למעלה) מכסה רק תבניות-פורמט קשיחות: "N×phrase=result" / "phrase(v)×phrase(v)=result" /
// "N×N=phrase" / "phrase+phrase=num+num=result". הניתוח האמיתי-על-הקורפוס (Zvi Unresolved Report) חשף עשרות
// וריאציות אמיתיות שחומקות: סדר-הפוך (phrase×N), תחילית-מילה לפני שרשרת ("וגם X+X+X"), "כפול" כמילה-נרדפת ל-
// "פעמים", שרשרת-שוויון ארוכה מ-2 חוליות (phrase=num+num=phrase=result), סוגריים/סוגריים-מסולסלים מקוננים
// ("י×{ה+ו+ה}"), תבנית-מעורבת product+phrase ("דמעה×6+חסד"), וחשבון-מספרים-טהור בלי גימטריה כלל ("911+909=1820").
// פתרון-שורש (במקום עוד רג'קסים ייעודיים): פרסר-אמיתי (recursive-descent) על דקדוק כללי אחד:
//   Chain := Link ('=' Link)*                         — שרשרת-שוויון, כל חוליה חייבת להיות שווה לכולן
//   Link  := Term (('+') Term)*                        — סכום-איברים
//   Term  := Factor ((TIMES) Factor)*                  — מכפלה (TIMES = × | x | X | * | פעמים | כפול)
//   Factor:= NUMBER | PHRASE('(' NUMBER ')')? | '(' Link ')' | '{' Link '}'
// כל עלה-ביטוי (PHRASE) עובר תמיד דרך resolveOperand הקיים (רגיל קודם; matchAnyMethod רק אם יש ערך-מפורש-
// בסוגריים שאינו-תואם — *לא* ניחוש-שיטה על עלה בלי ערך-מפורש-נטען, בדיוק לפי `gematria_engine_law`).
// "prefix-skip": אם השרשרת לא מתפרסת מהתחלת-הטווח (תחילית-פרוזה כמו "וגם"/"ד-"), הפרסר מנסה לדלג טוקן-טוקן
// מההתחלה (מוגבל ל-4 ניסיונות) — התאוששות תחבירית גנרית, לא ניחוש-מילה-ספציפית. אין המצאת-שיטה: METHOD_UNRESOLVED
// עולה בדיוק כמו בעלים-רגילים כשעלה-מפורש לא-משוחזר תחת אף שיטה קנונית.
const GEN_TIMES_WORDS = ["פעמים", "כפול"];
const GEN_SPAN_RE = /[0-9א-ת+×xX*(){}="'׳״\-\s]{4,220}/g;

function genTokenize(span) {
  const toks = [];
  let i = 0;
  const isHeb = (c) => c >= "א" && c <= "ת";
  const isDigit = (c) => c >= "0" && c <= "9";
  while (i < span.length) {
    const c = span[i];
    if (/\s/.test(c)) { i++; continue; }
    if (isDigit(c)) { let j = i; while (j < span.length && isDigit(span[j])) j++; toks.push({ t: "NUM", v: Number(span.slice(i, j)) }); i = j; continue; }
    if (c === "+") { toks.push({ t: "PLUS" }); i++; continue; }
    if (c === "×" || c === "x" || c === "X" || c === "*") { toks.push({ t: "TIMES" }); i++; continue; }
    if (c === "=") { toks.push({ t: "EQ" }); i++; continue; }
    if (c === "(") { toks.push({ t: "LP" }); i++; continue; }
    if (c === ")") { toks.push({ t: "RP" }); i++; continue; }
    if (c === "{") { toks.push({ t: "LB" }); i++; continue; }
    if (c === "}") { toks.push({ t: "RB" }); i++; continue; }
    if (isHeb(c)) {
      // ריצה מקסימלית של אותיות עבריות + מרכאות/מקף פנימיים (לא בגבול עם אופרטור/מספר) — כמו HEB_PHRASE.
      let j = i;
      while (j < span.length) {
        const cj = span[j];
        if (isHeb(cj) || cj === '"' || cj === "'" || cj === "׳" || cj === "״" || cj === "-") { j++; continue; }
        if (cj === " " && j + 1 < span.length && isHeb(span[j + 1])) { j++; continue; }
        break;
      }
      const runWords = span.slice(i, j).trim().split(/\s+/).filter(Boolean);
      // ── Zvi Unresolved Cleanup Pass · PART 3+4 ────────────────────────────────────────────────
      // ריצה רב-מילית ("כפל אמונה", "אלף בגימטריא") לא-נחשבת ביטוי-אחד באטימות: סורקים מילה-מילה —
      // "כפול"/"פעמים" *בכל מקום* בריצה (לא רק בתחילתה) שובר לטוקן-אופרטור אמיתי (מפריד גורמים, לא
      // מתמזג לפנים הביטוי — התיקון ל-"כפול טוב(17)" שהתמזג בטעות למחרוזת-ביטוי אחת ולא לאופרטור×גורם);
      // "גימטריא/גימטריה" (±ב-/ה-) מוסר בשקט (רעש-לוואי, לא אופרטור ולא חלק מהביטוי-לחישוב, PART 4).
      let acc = [];
      const flush = () => { if (acc.length) { toks.push({ t: "PHRASE", v: acc.join(" ") }); acc = []; } };
      for (const w of runWords) {
        if (GEN_TIMES_WORDS.includes(w)) { flush(); toks.push({ t: "TIMES" }); continue; }
        if (/^(?:ב|ה)?גימטרי[אה](?:ית)?$/.test(w)) continue; // מוסר, לא שובר צבירה
        acc.push(w);
      }
      flush();
      i = j;
      continue;
    }
    i++; // תו לא-מזוהה (פיסוק שנפל דרך הרשת) — מדולג, לא עוצר את הפרסר
  }
  return toks;
}

// ── Foundation Closure · RULE #36 — trailing-prose separation ("543 × 4 גילויים.. = 2172") ─────────
// מילת-פרוזה שנופלת *אחרי* ערך-שהושלם (NUM/סוגר-סוגריים) ו*לפני* EQ ישיר, בלי אופרטור משני הצדדים —
// עדות-מבנית ברורה שזו הערת-אגב ולא-אופרנד: אופרנד-אמיתי תמיד מגיע *אחרי* TIMES/PLUS/EQ, לעולם לא צמוד-
// ישירות ל-NUM בלי אופרטור ביניהם. ⛔ לא חותך ביטוי-יעד לגיטימי מהצורה "N×N=phrase" (שם ה-PHRASE בא
// ישר אחרי EQ, לא אחרי NUM — prevIsValueEnd=false שם, לא נוגעים). המילה המוסרת נשמרת (`stripped`) — לא
// נמחקת מהמקור, רק לא-נכנסת לחישוב-ה-AST (Do not destroy source text).
function stripStrandedTrailingPhrases(toks) {
  const out = [];
  const stripped = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const prev = out[out.length - 1];
    const next = toks[i + 1];
    const prevIsCompletedValue = prev && (prev.t === "NUM" || prev.t === "RP" || prev.t === "RB");
    // ⛔ דווקא-EQ-ממשי, לא סוף-מחרוזת: PHRASE שיושב *בסוף* הזרם (בלי המשך אחריו) הוא כמעט תמיד היעד-
    // הסופי-האמיתי של הכתב ("...=850 בגימטריא 'תכלת'" — "תכלת" היא הטענה, לא רעש) — לזהות זאת כ"תקוע"
    // ולמחוק אותו ייצר שקילות-מדומה-ריקה (850==850, טאוטולוגיה) שמסתירה את טענת-הכתב במקום לבדוק אותה
    // (נמצא-בפועל בבדיקת-רגרסיה מול קורפוס-צבי האמיתי, לפני התיקון הזה — Foundation Closure 26.8.2026).
    // רק PHRASE *לפני EQ ממשי* (כמו "543 × 4 גילויים.. = 2172") הוא הערת-אגב-מוכחת; בסוף-הזרם — משאירים.
    const nextIsRealEq = !!next && next.t === "EQ";
    if (t.t === "PHRASE" && prevIsCompletedValue && nextIsRealEq) { stripped.push(t.v); continue; }
    out.push(t);
  }
  return { toks: out, stripped };
}

// פרסר-מצב (מצביע-מיקום פשוט על מערך הטוקנים) — מחזיר null בכשל (לא זורק), כדי לאפשר prefix-skip נקי.
function genParseChain(toks, startPos) {
  let pos = startPos;
  const peek = () => toks[pos];
  const leaves = [];
  function parseFactor() {
    const tk = peek();
    if (!tk) return null;
    if (tk.t === "NUM") { pos++; return { kind: "num", value: tk.v }; }
    if (tk.t === "PHRASE") {
      pos++;
      let explicitValue = null;
      if (peek() && peek().t === "LP" && toks[pos + 1] && toks[pos + 1].t === "NUM" && toks[pos + 2] && toks[pos + 2].t === "RP") {
        explicitValue = toks[pos + 1].v;
        pos += 3;
      }
      const operand = resolveOperand(tk.v, explicitValue);
      leaves.push(operand);
      return { kind: "phrase", operand, value: operand.value };
    }
    if (tk.t === "LP" || tk.t === "LB") {
      const closer = tk.t === "LP" ? "RP" : "RB";
      pos++;
      const inner = parseLinkNode();
      if (!inner || !peek() || peek().t !== closer) return null;
      pos++;
      return inner;
    }
    return null;
  }
  function parseTerm() {
    let node = parseFactor();
    if (!node) return null;
    while (peek() && peek().t === "TIMES") {
      pos++;
      const rhs = parseFactor();
      if (!rhs) return null;
      node = { kind: "mul", value: (node.value == null || rhs.value == null) ? null : node.value * rhs.value, a: node, b: rhs };
    }
    return node;
  }
  function parseLinkNode() {
    let node = parseTerm();
    if (!node) return null;
    while (peek() && peek().t === "PLUS") {
      pos++;
      const rhs = parseTerm();
      if (!rhs) return null;
      node = { kind: "add", value: (node.value == null || rhs.value == null) ? null : node.value + rhs.value, a: node, b: rhs };
    }
    return node;
  }
  const links = [];
  const first = parseLinkNode();
  if (!first) return null;
  links.push(first);
  while (peek() && peek().t === "EQ") {
    pos++;
    const next = parseLinkNode();
    if (!next) return null;
    links.push(next);
  }
  return { links, leaves, endPos: pos };
}

// ── חלצן-כללי · שרשרת-שוויון (Chain), עם prefix-skip *ברמת-מילה-במחרוזת* (≤4 ניסיונות) ──────────
// ⚠️ ה-skip חייב לקרות *לפני* הטוקנייז (לא אחריו): הטוקנייזר ממזג-בתאבון ריצת-מילים-עבריות-רצופה
// בלי-אופרטור לביטוי-רב-מילים אחד (כדי לתמוך בביטויים כמו "ארך אפים"). אם ה-skip היה פועל על מערך
// הטוקנים *אחרי* המיזוג, מילת-תחילית ("וגם") הייתה כבר מתמזגת לתוך המילה האמיתית הראשונה ולא ניתנת
// לניתוק. לכן: מדלגים מילים-שלמות *מהמחרוזת עצמה* ומטוקנייזים-מחדש בכל ניסיון — כך "וגם נצח..." בניסיון
// skip=1 מטוקנייז מהתחלה טהורה "נצח+נצח+נצח=444" (בלי "וגם" בכלל), בעוד "ארך אפים=352" (בלי תחילית-זרה)
// כבר מצליח ב-skip=0 עם המיזוג-הרב-מילים השלם. אין ניחוש-מילה-ספציפית — זו הסרת-תחילית גנרית בלבד.
function extractGeneralArithmeticClaims(text) {
  const out = [];
  // ── Foundation Closure · RULE #36 (span-level half) ─────────────────────────────────────────────
  // "..“/"…" (2+ נקודות רצופות) = סימן-השהיה/אגב של הכתב, לא פיסוק-סוף-משפט — מכווץ לרווח-בודד *לפני*
  // חיתוך-הטווח, כדי ש-GEN_SPAN_RE (שלא כולל "." כלל — מגן על "7.10"/"1.11.26") לא ייעצר-בשקט באמצע
  // תבנית תקינה ("543 × 4 גילויים.. = 2172" → שני טווחים חתוכים בלי המשך). נקודה בודדת (תאריך) לא נוגעים בה.
  const dotsCollapsed = text.replace(/\.{2,}/g, " ");
  // סורקים שורה-שורה (לא על פני כל הטקסט): מונע מ-GEN_SPAN_RE (ש-\s כולל \n) לגלוש דרך שורות-ריקות
  // אל תוך שורת-קישוט הבאה ("+++++++++++++++++") ולבלוע אותה כאילו היא חלק מהביטוי — כל טענה אצל צבי
  // בפועל יושבת בשורה משלה (אותו דפוס בדיוק כמו extractPhraseSumChains המקורי).
  const spans = dotsCollapsed.split(/\n/).flatMap(line => line.match(GEN_SPAN_RE) || []);
  for (const rawSpan of spans) {
    const span0 = rawSpan.trim();
    if (!/\d/.test(span0)) continue;
    if (!/=/.test(span0)) continue;
    if (!(/[+×xX*]/.test(span0) || GEN_TIMES_WORDS.some(w => span0.includes(w)))) continue;
    const words = span0.split(/\s+/);
    // אוספים את *כל* ניסיונות ה-skip שמצליחים תחבירית (לא עוצרים בראשון) — כדי לא "לכבוש" בטעות
    // תחילית-פרוזה תמימה (כמו "וגם") לתוך הביטוי הראשון רק כי skip=0 "הצליח מבנית" באקראי.
    const attempts = [];
    let strippedAnnotations = [];
    for (let skip = 0; skip <= 4 && skip < words.length; skip++) {
      const attemptSpan = words.slice(skip).join(" ");
      const rawToks = genTokenize(attemptSpan);
      if (rawToks.length < 3) continue;
      // RULE #36 (token-level half) — מסירים PHRASE-תקוע בין ערך-שהושלם ל-EQ לפני-הפרסור (לא אחריו,
      // כדי שהפרסור עצמו יתמודד עם רצף-תקין ולא ייכשל על הטוקן-הבלתי-קשור).
      const { toks, stripped } = stripStrandedTrailingPhrases(rawToks);
      if (toks.length < 3) continue;
      const attempt = genParseChain(toks, 0);
      if (attempt && attempt.endPos === toks.length && attempt.links.length >= 2) {
        attempts.push({ ...attempt, skip, span: attemptSpan });
        if (stripped.length) strippedAnnotations = stripped;
      }
    }
    if (!attempts.length) continue;
    // עדיפות: (1) ניסיון-כלשהו שכל החוליות שלו שוות (התאמה-פנימית עצמאית לכל טוקניזציה — לא ניחוש-ערך,
    // רק בחירת-הקטע-הנכון מתוך חלוקות-תחביריות אפשריות) → (2) אחרת, ה-skip הקטן-ביותר (השמרני-ביותר).
    const consistent = attempts.find(a => a.links.every(l => l.value != null) && a.links.every(l => l.value === a.links[0].value));
    const parsed = consistent || attempts[0];
    const { skip: skipUsed, span } = parsed;
    const { links, leaves } = parsed;
    const values = links.map(l => l.value);
    const anyUnresolved = leaves.some(o => !o.ok);
    const allComputed = values.every(v => v != null);
    let status;
    if (anyUnresolved) status = "METHOD_UNRESOLVED";
    else if (!allComputed) status = "METHOD_UNRESOLVED";
    else if (values.every(v => v === values[0])) status = "ENGINE_VERIFIED_COMPOSITE";
    else status = "ENGINE_MISMATCH";
    const result = allComputed ? values[values.length - 1] : null;
    out.push({
      // origRaw = הטווח *לפני* prefix-skip (כולל מילת-תחילית כמו "וגם") — נשמר כדי שזיהוי-כפילות מול
      // extractCandidates() הישן (שתופס לרוב את הטקסט-המלא-כולל-תחילית) יוכל להתאים נכון (ר' Part 7).
      kind: "general-chain", raw: span, origRaw: span0, text: span, skipUsed, linkCount: links.length,
      linkValues: values, operands: leaves, result, computedTotal: allComputed ? values[0] : null, status,
      ...(strippedAnnotations.length ? { strippedAnnotations } : {}), // RULE #36 — מילים שהוסרו (לא-אופרנד), פרוונאנס
    });
  }
  return out;
}

// ── Foundation Closure · RULE #35 — vertical/multi-line arithmetic layout ("72\n27\n=\n99") ────────
// כתבים (בעיקר OCR/וואטסאפ) לפעמים כותבים משוואה אנכית — כל איבר בשורה נפרדת, בלי אופרטור מפורש בין
// המספרים (הסכימה מרומזת בפריסה עצמה, לא בטקסט). ⛔ לא מדביקים-בעיוורון שורות שכנות: "מבנה" נדרש —
// ריצה רציפה (שורה-ריקה/לא-עירומה שוברת) של ≥3 שורות "עירומות" (מספר-בלבד/אופרטור-בלבד/ביטוי-עברי-
// קצר-בלבד, בלי כל פיסוק-פרוזה אחר), עם ≥2 שורות-מספר וסימן "=" אחד לפחות — ריצה כמו "תהלים"→"כז"
// (ציטוט, לא משוואה, 2 שורות בלבד ואין בה אף שורת-מספר/"=") נדחית כבר במבחן-המבנה. פרוונאנס: כל שורת-
// מקור נשמרת ב-linesUsed. אופרטור מרומז (שתי שורות-ערך רצופות בלי מפריד) מתועד כ-syntheticPlusCount —
// לא מוסתר. משתמש-חוזר ב-genTokenize/genParseChain/stripStrandedTrailingPhrases הקיימים — אין דקדוק שני.
const BARE_SYM_RE = /^[\s0-9+×xX*(){}=]+$/;
const BARE_PHRASE_RE = /^[א-ת][א-ת\s"'׳״\-]{0,30}$/;
function classifyBareLine(line) {
  const t = line.trim();
  if (!t) return null;
  if (BARE_SYM_RE.test(t)) return { kind: "sym", text: t, hasDigit: /\d/.test(t), hasEq: /=/.test(t) };
  if (BARE_PHRASE_RE.test(t)) return { kind: "phrase", text: t, hasDigit: false, hasEq: false };
  return null;
}

function extractVerticalArithmetic(text) {
  const rawLines = String(text || "").split(/\n/);
  const out = [];
  let i = 0;
  while (i < rawLines.length) {
    let j = i;
    const runLines = [];
    while (j < rawLines.length) {
      const cls = classifyBareLine(rawLines[j]);
      if (!cls) break;
      runLines.push({ idx: j, raw: rawLines[j], ...cls });
      j++;
    }
    if (runLines.length >= 3) {
      const numLines = runLines.filter(l => l.kind === "sym" && l.hasDigit && !l.hasEq);
      const eqPresent = runLines.some(l => l.hasEq);
      if (numLines.length >= 2 && eqPresent) {
        let toks = [];
        let syntheticPlus = 0;
        for (const l of runLines) {
          const lineToks = genTokenize(l.text);
          if (!lineToks.length) continue;
          const prevLast = toks[toks.length - 1];
          const nextFirst = lineToks[0];
          const prevIsValueEnd = prevLast && (prevLast.t === "NUM" || prevLast.t === "PHRASE" || prevLast.t === "RP" || prevLast.t === "RB");
          const nextIsValueStart = nextFirst && (nextFirst.t === "NUM" || nextFirst.t === "PHRASE" || nextFirst.t === "LP" || nextFirst.t === "LB");
          if (prevIsValueEnd && nextIsValueStart) { toks.push({ t: "PLUS" }); syntheticPlus++; }
          toks.push(...lineToks);
        }
        const { toks: cleanToks, stripped } = stripStrandedTrailingPhrases(toks);
        const attempt = cleanToks.length >= 3 ? genParseChain(cleanToks, 0) : null;
        if (attempt && attempt.endPos === cleanToks.length && attempt.links.length >= 2) {
          const { links, leaves } = attempt;
          const values = links.map(l => l.value);
          const anyUnresolved = leaves.some(o => !o.ok);
          const allComputed = values.every(v => v != null);
          let status;
          if (anyUnresolved || !allComputed) status = "METHOD_UNRESOLVED";
          else if (values.every(v => v === values[0])) status = "ENGINE_VERIFIED_COMPOSITE";
          else status = "ENGINE_MISMATCH";
          const result = allComputed ? values[values.length - 1] : null;
          out.push({
            kind: "vertical-chain",
            raw: runLines.map(l => l.raw).join(" | "),
            text: runLines.map(l => l.text).join(" "),
            linesUsed: runLines.map(l => ({ lineIndex: l.idx, text: l.raw })),
            syntheticPlusCount: syntheticPlus,
            linkCount: links.length, linkValues: values, operands: leaves, result,
            computedTotal: allComputed ? values[0] : null, status,
            ...(stripped.length ? { strippedAnnotations: stripped } : {}),
          });
        }
      }
    }
    i = runLines.length >= 3 ? j : i + 1;
  }
  return out;
}

// ── מונע כפילות מול 4 החלצנים-הייעודיים: אם raw-span של general-chain חופף (substring) לטענה-ייעודית ──
// מאותו מקור — מדלגים (הייעודי מדויק-יותר לתבנית שלו, ה-general הוא רשת-ביטחון לתבניות שהם לא כיסו).
function dedupeGeneralAgainstSpecific(specific, general) {
  return general.filter(g => !specific.some(s => g.raw.includes(s.raw) || s.raw.includes(g.raw)));
}

// ── אורקסטרציה · כל 4 הצורות הייעודיות + General Chain (רשת-ביטחון), ללא כפילות מול extractCandidates() ──
export function extractCompoundClaims(rawText) {
  const text = stripNikud2(String(rawText || ""));
  const specific = [
    ...extractQuantityProducts(text),
    ...extractTwoPhraseProducts(text),
    ...extractNumberProductEqualsPhrase(text),
    ...extractPhraseSumChains(text),
  ];
  const general = dedupeGeneralAgainstSpecific(specific, extractGeneralArithmeticClaims(text));
  // RULE #35 — safety net נוסף, אחרי general (לא לפני): span-based (specific+general) כבר מכסה כל
  // תבנית חד-שורתית; vertical תופס רק מה שהם לא יכולים לתפוס מעצם-ההגדרה (ריצה רב-שורתית ללא אופרטור).
  const verticalSpecificLike = specific.concat(general);
  const vertical = extractVerticalArithmetic(text).filter(v =>
    !verticalSpecificLike.some(s => v.raw.includes(s.raw) || s.raw.includes(v.raw)));
  return [...specific, ...general, ...vertical];
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
    const engine_verified = va === vb;
    // ── Zvi Unresolved Cleanup Pass · PART 5 ──────────────────────────────────────────────────
    // תיקון-פער: עד כה equation-type לא נבדק כלל מול שיטות אחרות מלבד רגיל. התיקון: *לא* מחפשים
    // "איזו שיטה-כלשהי משחזרת שוויון-מקרי" (brute-force אסור — עלול למצוא שוויון מקרי בין שיטה-אחת
    // בצד A לשיטה-אחרת בצד B). בודקים אך ורק **אותה שיטה עצמה עקבית על שני הצדדים** — "זהות-שיטה"
    // (method identity), לא ניחוש. תוצאה = מידע-משני בלבד (alt_method_matches), engine_verified
    // עדיין נקבע רק לפי רגיל — לעולם לא "מאמתים" equation על סמך שיטה חלופית בלי שהכתב ציין אותה.
    let alt_method_matches = [];
    if (!engine_verified) {
      for (const meth of VALUE_METHODS) {
        if (meth.key === "רגיל" || meth.key === "ריבוע") continue; // ריבוע = drift מתועד למעלה, מדלגים
        let va2, vb2;
        try { va2 = meth.fn(a); vb2 = meth.fn(b); } catch { continue; }
        if (va2 === vb2) alt_method_matches.push({ method: meth.key, value: va2 });
      }
    }
    return {
      engine_verified,
      engine_detail: { method: "רגיל", a: { phrase: a, value: va }, b: { phrase: b, value: vb } },
      ...(alt_method_matches.length ? { alt_method_matches } : {}),
    };
  }
  if (cand.type !== "explicit-claim" || cand.value == null) {
    return { engine_verified: "not_applicable", engine_detail: { reason: `סוג-מועמד «${cand.type}» אינו טענת-ערך` } };
  }
  // ✅ Foundation Closure (Method Identity, 26.8.2026): DRIFT הקודם תוקן בשורש ב-analysisFlow.js:normMethod()
  // (המיזוג "ריבוע|משולש"→"ריבוע" הוסר) — שני מסלולי-החילוץ (relation-format + explicit-claim/chain) מייצרים
  // כעת method:"ריבוע" **רק** כשהכתב אכן ציין ריבוע, ו-method:"משולש" בעקביות בשני המסלולים. method:"ריבוע"
  // אמיתי זורם דרך המסלול הגנרי למטה כרגיל (METHOD_KEY_MAP["ריבוע"]="ריבוע"→fn_ribua). "משולש" עצמו נשאר
  // עמום-קנוני ביודעין (ר׳ הערת METHOD_KEY_MAP למעלה) — קדמי כברירת-מחדל מאושרת + engine_matches הגנרי
  // (למטה) סורק את משפחת-העומק "משולש" כנפילה-חזרה, בלי לנחש איזו מהן הכתב התכוון.
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
