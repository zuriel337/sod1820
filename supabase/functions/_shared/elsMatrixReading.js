// Matrix reading layer (experimental, admin-only). Shared module used by ai-analyze (the existing AI route) and by the tests.
//   - The first block is copied verbatim from the experiment harness (experiments/els-live-reading, EXP-15/16/18) so that the request the model receives is byte-identical to the one that was measured.
//   - The second block is new: window selection from the canonical stream, replay of every proposal in the canonical ELS engine (els_verify_occurrence_v1), coverage, cost and the state machine.
// Owners: els_research_layer_law v9, els_single_engine_law v2 (one engine), ai_analyze_contract v2 (cost, completion, no max_tokens as COMPLETE), unified_credit_system (nothing is charged here).
// No chat, no Provider, no search engine and no AI route of its own: the entry point is the `els_matrix_reading` field of the ai-analyze request.
// Plain ES module with no imports: Node (tests) and Deno (edge) run the same text.

export const MAX_FINDINGS = 60;

// ===== Verbatim from the EXP-15/16/18 harness (experiments/els-live-reading/lib/region.mjs): region lines and engine parameters =====
const FOLD = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
export const foldFinals = (text) => text.replace(/[ךםןףץ]/g, (c) => FOLD[c]);
const pad = (n, width = 2) => String(n).padStart(width, "0");

/** The four line types. `step(W)` is the change of stream position per cell in the forward ('+') reading. */
export const KINDS = Object.freeze({
  R: { name: "row", label: "שורה", dr: 0, dc: 1, step: () => 1 },
  C: { name: "column", label: "טור", dr: 1, dc: 0, step: (W) => W },
  D: { name: "down-right", label: "אלכסון ↘", dr: 1, dc: 1, step: (W) => W + 1 },
  A: { name: "down-left", label: "אלכסון ↙", dr: 1, dc: -1, step: (W) => W - 1 },
});
export const MIN_LINE_LENGTH = 3;

export const cellName = (i, j) => `R${pad(i)}C${pad(j)}`;

/** Every line of the region with at least MIN_LINE_LENGTH cells. `cells` are in the forward ('+') order of the line. */
export function buildLines(region) {
  const lines = [];
  const walk = (kind, startI, startJ) => {
    const { dr, dc } = KINDS[kind];
    const cells = [];
    for (let i = startI, j = startJ; i >= 1 && i <= region.nRows && j >= 1 && j <= region.nCols; i += dr, j += dc) cells.push([i, j]);
    return cells;
  };
  const add = (kind, ordinal, cells) => {
    if (cells.length < MIN_LINE_LENGTH) { omitted.push({ kind, ordinal, length: cells.length }); return; }
    lines.push({ id: `${kind}${pad(ordinal)}`, kind, cells, letters: cells.map(([i, j]) => region.letterAt(i, j)).join("") });
  };
  const omitted = [];
  for (let i = 1; i <= region.nRows; i += 1) add("R", i, walk("R", i, 1));
  for (let j = 1; j <= region.nCols; j += 1) add("C", j, walk("C", 1, j));
  let d = 0;
  for (let j = 1; j <= region.nCols; j += 1) add("D", (d += 1), walk("D", 1, j));
  for (let i = 2; i <= region.nRows; i += 1) add("D", (d += 1), walk("D", i, 1));
  let a = 0;
  for (let j = region.nCols; j >= 1; j -= 1) add("A", (a += 1), walk("A", 1, j));
  for (let i = 2; i <= region.nRows; i += 1) add("A", (a += 1), walk("A", i, region.nCols));
  lines.omitted = omitted;
  return lines;
}

/** A line read in one direction: id like "D17+" or "D17-", the letters and the cells in reading order. */
export function readings(lines) {
  const out = new Map();
  for (const line of lines) {
    out.set(`${line.id}+`, { id: `${line.id}+`, lineId: line.id, kind: line.kind, sign: 1, letters: line.letters, cells: line.cells });
    out.set(`${line.id}-`, { id: `${line.id}-`, lineId: line.id, kind: line.kind, sign: -1, letters: [...line.letters].reverse().join(""), cells: line.cells.slice().reverse() });
  }
  return out;
}

/**
 * Engine parameters of a run of cells in reading order: the position of its first letter, the skip and the direction. Throws if the cells are not evenly spaced
 * in the stream (they always are for a straight line of the region).
 */
export function engineParams(region, cells) {
  const positions = cells.map(([i, j]) => region.position(i, j));
  const step = positions.length > 1 ? positions[1] - positions[0] : 0;
  for (let k = 0; k < positions.length; k += 1) if (positions[k] !== positions[0] + k * step) throw new Error("cells are not evenly spaced in the stream");
  return { start: positions[0], skip: Math.abs(step), dir: step > 0 ? 1 : -1, length: positions.length, step };
}

/** Plain-text hint for the axis cells: their region coordinates. */
export const axisSummary = (region) => { const rows = region.axisCells.map(([i]) => i); return { column: region.axisCells[0][1], rowFrom: Math.min(...rows), rowTo: Math.max(...rows), cells: region.axisCells.length, text: region.axis?.text ?? null }; };

// ===== Verbatim from the harness (lib/prompt.mjs and lib/prompt2.mjs): the instruction text, the schema and the data sections =====
export const KIND_VALUES = Object.freeze(["word", "inflected_form", "construct_or_phrase", "name", "segmentation_of_longer_run", "extension", "crossing", "other"]);

export const SYSTEM = [
  "אתה קורא עברית קפדן. לפניך קטע מוגבל ממטריצת אותיות שהוכנה מראש על ידי מנוע חיפוש: האותיות, הקווים והמזהים שלהם נקבעו שם ואינך מחשב אותם.",
  "תפקידך: להציע מילים וביטויים בעברית תקינה שנראים לך בעלי עניין בתוך הקטע, ולהצביע עליהם לפי מזהה קו וטקסט בלבד.",
  "כל הצעה תיבדק אחר כך מול המנוע הקנוני. הצעה שהאותיות שלה אינן רצף מדויק וקיים בקו שציינת תיפסל. לכן: לעולם אל תוסיף, תשמיט, תחליף או תסדר מחדש אותיות, גם כדי ליצור מילה יפה יותר.",
  "מה שאתה מציע הוא הצעת קריאה בלבד: לא ממצא, לא עובדה ולא משמעות מאומתת. אל תחשב מיקומים, מספרי דילוג או גימטריה.",
  "השב אך ורק ב-JSON לפי הסכמה שניתנה.",
].join("\n");

const groups = (letters) => [...letters].reduce((acc, ch, index) => acc + (index && index % 5 === 0 ? " " : "") + ch, "");
const digits = (n, width) => String(n).padStart(width, " ");

/** The grid with column numbers on top; rows that hold a cell of the selected occurrence are marked. */
export function renderGrid(region, { marked = true } = {}) {
  const axisRows = new Set(marked ? region.axisCells.map(([i]) => i) : []);
  const header1 = ["    "];
  const header2 = ["    "];
  for (let j = 1; j <= region.nCols; j += 1) { header1.push(j >= 10 ? String(Math.floor(j / 10)) : " "); header2.push(String(j % 10)); }
  const lines = [`      ${header1.slice(1).join(" ")}`, `      ${header2.slice(1).join(" ")}`];
  for (let i = 1; i <= region.nRows; i += 1) lines.push(`R${String(i).padStart(2, "0")}   ${region.rows[i - 1].join(" ")}${axisRows.has(i) ? "   ← בשורה הזו יש תא של המופע הנבחר" : ""}`);
  return lines.join("\n");
}

export function renderLines(lines) {
  const sections = [];
  for (const kind of ["R", "C", "D", "A"]) {
    if (!lines.some((l) => l.kind === kind)) continue; // a probe that shows only some line types prints no empty section
    const rows = [];
    for (const line of lines.filter((l) => l.kind === kind)) {
      rows.push(`${line.id}+  ${groups(line.letters)}`);
      rows.push(`${line.id}-  ${groups([...line.letters].reverse().join(""))}`);
    }
    const heads = lines.filter((l) => l.kind === kind).map((l) => `${l.id}=${cellName(...l.cells[0])}→${cellName(...l.cells[l.cells.length - 1])}`);
    sections.push(`### ${KINDS[kind].label} (${lines.filter((l) => l.kind === kind).length} קווים, כל אחד בשני הכיוונים)\nקצות הקווים: ${heads.join(" · ")}\n${rows.join("\n")}`);
  }
  return sections.join("\n\n");
}

export const TIERS = Object.freeze(["A", "B", "C"]);
export const FIRST_GROUP_SIZE = 12;

export const FINDINGS_SCHEMA_V2 = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["findings", "observations"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "line", "text", "parts", "kind", "story_related", "continue_from", "from_finding", "tier", "note"],
        properties: {
          id: { type: "string" },
          line: { type: "string" },
          text: { type: "string" },
          parts: { type: "array", items: { type: "string" } },
          kind: { type: "string", enum: [...KIND_VALUES] },
          story_related: { type: "boolean" },
          continue_from: { type: "boolean" },
          from_finding: { type: "string" },
          tier: { type: "string", enum: [...TIERS] },
          note: { type: "string" },
        },
      },
    },
    observations: { type: "string" },
  },
});

// ===== Verbatim from the harness (lib/validate.mjs): locating, verification items and classification =====
export const MAX_OCCURRENCES_VERIFIED = 6;
export const MAX_ELSEWHERE_LINES = 8;

export function parseModelOutput(text) {
  let value;
  try { value = JSON.parse(text); } catch (error) { return { ok: false, error: `not JSON: ${error.message}` }; }
  if (!value || !Array.isArray(value.findings)) return { ok: false, error: "no findings array" };
  return { ok: true, value };
}

const allIndexes = (haystack, needle) => {
  const out = [];
  for (let at = haystack.indexOf(needle); at >= 0; at = haystack.indexOf(needle, at + 1)) out.push(at);
  return out;
};

/**
 * Where a proposed text sits in the region. `byReading` is the Map from readings(lines). Whitespace and final letters are normalised (formatting only);
 * any other difference between the proposal and the line is a failure to locate. Returns the status, the reasons and the occurrences with their engine parameters.
 */
export function locateFinding(finding, { region, byReading }) {
  const raw = String(finding.text ?? "");
  const text = foldFinals(raw.replace(/\s+/g, ""));
  const result = { id: String(finding.id ?? ""), line: String(finding.line ?? ""), text, rawText: raw, reasons: [], status: "invalid_text", occurrences: [], totalOccurrences: 0, segmentationOk: true };
  if (!/^[א-ת]{2,}$/u.test(text)) { result.reasons.push("text is not 2+ Hebrew letters"); return result; }
  if (text !== raw) result.reasons.push("formatting normalised (spaces or final letters)");
  const parts = Array.isArray(finding.parts) ? finding.parts.map((p) => foldFinals(String(p).replace(/\s+/g, ""))) : [];
  if (parts.length && parts.join("") !== text) { result.segmentationOk = false; result.reasons.push("parts do not concatenate to text"); }
  const make = (reading, from) => ({ reading: reading.id, from, to: from + text.length - 1, cells: reading.cells.slice(from, from + text.length), params: engineParams(region, reading.cells.slice(from, from + text.length)) });
  const cited = byReading.get(result.line);
  let found = cited ? allIndexes(cited.letters, text).map((from) => make(cited, from)) : [];
  if (found.length) {
    result.status = "located_in_cited_line";
  } else {
    const elsewhere = [];
    for (const reading of byReading.values()) for (const from of allIndexes(reading.letters, text)) elsewhere.push(make(reading, from));
    found = elsewhere;
    if (elsewhere.length) { result.status = "located_in_other_line"; result.reasons.push(cited ? `not in ${result.line}` : `unknown line id ${result.line}`); } else { result.status = "not_in_region"; result.reasons.push("these letters do not appear as a contiguous run in any line of the region"); }
  }
  result.totalOccurrences = found.length;
  result.occurrences = found.slice(0, result.status === "located_in_cited_line" ? MAX_OCCURRENCES_VERIFIED : MAX_ELSEWHERE_LINES);
  return result;
}


export function verificationItems(located) {
  const items = [];
  for (const finding of located) finding.occurrences.forEach((occ, k) => items.push({ key: `${finding.id}.${k}`, term: finding.text, start: occ.params.start, skip: occ.params.skip, dir: occ.params.dir }));
  return items;
}


/** Combines the location with the engine's answer. `rows` are the objects returned by the verification SQL (matched by key). */
export function classify(located, rows) {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  return located.map((finding) => {
    const checks = finding.occurrences.map((occ, k) => {
      const row = byKey.get(`${finding.id}.${k}`);
      if (!row) return { occurrence: occ.reading, status: "not_checked" };
      const plain = row.engine?.status === "plain_text_row_not_els";
      const synthetic = row.engine?.status === "synthetic_region";
      return { occurrence: occ.reading, from: occ.from, letters_match: row.letters_match === true, plain_text: plain, synthetic, engine_found: plain || synthetic ? null : row.engine?.found === true, engine_status: row.engine?.status ?? null, engine_followup: Boolean(row.engine?.followup), engine_hits: row.engine?.hits ?? null, engine_truncated: row.engine?.completion?.truncated === true, params: occ.params };
    });
    const ok = (c) => c.letters_match === true && (c.plain_text || c.synthetic || c.engine_found === true);
    const verifiedChecks = checks.filter(ok);
    let verdict;
    if (finding.status === "not_in_region" || finding.status === "invalid_text") verdict = "not_verified";
    else if (!verifiedChecks.length) verdict = "not_verified";
    else if (verifiedChecks.some((c) => c.synthetic)) verdict = "verified_synthetic";
    else verdict = verifiedChecks.some((c) => !c.plain_text) ? "verified_by_engine" : "verified_plain_text_only";
    const reasons = finding.reasons.slice();
    if (verdict === "not_verified" && !reasons.length) reasons.push(checks.some((c) => c.letters_match === false) ? "letters at the claimed position differ in the stream" : checks.some((c) => c.engine_status && !["OK", "plain_text_row_not_els", "synthetic_region"].includes(c.engine_status)) ? `the engine answered with status ${checks.find((c) => c.engine_status && !["OK", "plain_text_row_not_els", "synthetic_region"].includes(c.engine_status)).engine_status}` : "the canonical engine returned no matching occurrence");
    return { ...finding, checks, verdict, verifiedOccurrences: verifiedChecks.length, reasons };
  });
}



// The harness builder (lib/prompt2.mjs buildRound1V2), reduced to the one path the layer uses: no background text, the selected occurrence marked and unnamed, all lines; `cap` replaces the number of proposals.
export function buildReadingPrompt({ region, lines, cap = MAX_FINDINGS }) {
  if (!region.axisCells.length) throw new Error("this region has no selected occurrence to mark");
  const axis = axisSummary(region);
  const intro = ["## הרקע", "אין תיאור ואין נושא. חפש עברית מעניינת באופן כללי, לפי שיקול דעתך. סמן story_related=false בכל ההצעות."].join("\n");
  const spec = [
    "## מה לפניך",
    `קטע מוגבל ממטריצת אותיות: ${region.nRows} שורות (R01–R${pad(region.nRows)}, מלמעלה למטה) ו-${region.nCols} עמודות (C01–C${pad(region.nCols)}). האותיות הן אותיות עבריות בלי ניקוד, והאותיות הסופיות (ך ם ן ף ץ) כתובות בצורתן הרגילה (כ מ נ פ צ).`,
    `המופע הנבחר הוא ${axis.cells} האותיות של טור C${pad(axis.column)} בשורות R${pad(axis.rowFrom)}–R${pad(axis.rowTo)}.`,
    "גבולות הקטע: מכל ארבעת הצדדים הקטע נחתך (המטריצה ממשיכה או נגמרת מחוץ לגבולות, וזה לא מוצג ולא נכלל בשום קו).",
    "הקווים: שורות R, טורים C, אלכסונים D (יורדים ימינה ↘, כלומר מעמודה לעמודה עוקבת כשיורדים שורה) ואלכסונים A (יורדים שמאלה ↙). כל קו מוצג בשני כיווני קריאה. הכיוון `+` הוא: בשורות מעמודה 1 לעמודה האחרונה, בטורים מהשורה העליונה לתחתונה, ובאלכסונים (D ו-A) מלמעלה למטה. הכיוון `-` הוא ההפך. האותיות בכל שורת קו מסודרות לפי סדר הקריאה של אותו כיוון, בקבוצות של חמש לנוחות בלבד (ברצף אין רווחים). בכל שורת קו המזהה כולל את הכיוון, למשל D17+. קווים קצרים משלוש אותיות לא נכללו.",
  ].join("\n");
  const task = [
    "## המשימה",
    "1. חפש בקטע מילים וביטויים בעברית תקינה שמופיעים כרצף רציף של אותיות באחד הקווים, בכל אחד משני הכיוונים. כלול צורות לשון: ריבוי, נסמך וסמיכות (ביטוי של שתי מילים או יותר), תחיליות (ו, ה, ב, כ, ל, מ, ש), סיומות שייכות, שמות פרטיים וצורות פעלים.",
    "2. מותר להציע גם חלוקה מעניינת של רצף ארוך למילים (השדה parts), אבל חיבור החלקים חייב לתת בדיוק את אותיות הרצף: בלי להוסיף, להשמיט, להחליף או לסדר מחדש אותיות. למשל הרצף \"ויאמרשלום\" מחולק ל-[\"ויאמר\",\"שלום\"].",
    "3. אל תגביל את עצמך לנושא שבפסקת הרקע (אם ניתן נושא), ואל למילים שכיחות או למילים שנמצאות באמצע הקטע. הצע גם דברים שנראים לך מעניינים מסיבות אחרות (משמעות, ביטוי מוכר, שם, צירוף מפתיע) וסמן ב-story_related אם לדעתך הם קשורים לתיאור שבפסקת הרקע. אל תדלג על הצעה כי היא אינה \"ראויה\": הבדיקה והסינון נעשים אחר כך מחוץ לשיחה.",
    "4. המשך ממילה שמצאת: לכל הצעה שנראית לך מעניינת בדוק את האותיות שלפניה ואחריה באותו קו (הקו המלא לפניך), את הקווים האחרים שחותכים אותה (כל תא שלה שייך לעוד שלושה קווים) ואת הסביבה הקרובה בגריד. אם הארכה, חיתוך או שכנות מניבים מילה או ביטוי בעברית, הצע אותם כהצעה נפרדת: בשדה from_finding כתוב את ה-id של ההצעה שממנה המשכת, וב-kind בחר extension או crossing. סמן continue_from=true על הצעות שתרצה לקבל עליהן כרטיס שכונה מפורט מהמנוע, אם יתאפשר סבב נוסף.",
    `5. עד ${cap} הצעות. לכל הצעה: id קצר (F1, F2, ...), line (מזהה קו עם כיוון, למשל D17+), text (הרצף בדיוק כפי שהוא בקו, בלי רווחים), parts, kind, story_related, continue_from, from_finding (מחרוזת ריקה אם אין), tier, note (משפט קצר בעברית על הקריאה המוצעת; זו פרשנות שלך ולא עובדה).`,
    `6. tier הוא סדר הצגה בלבד, לא סינון: A = עד ${FIRST_GROUP_SIZE} ההצעות שהיית מציג ראשונות למי שקורא רק כמה שורות; B = מעניינות אבל פחות; C = כל השאר. כל ההצעות נשמרות ונבדקות. אל תדרג לפי קרבה לאמצע הקטע או לפי סוג הקו: כל רמה יכולה להכיל שורות, טורים ואלכסונים מכל מקום בקטע.`,
    "7. בשדה observations אפשר לכתוב עד שלוש שורות על אזורים או כיוונים שהקדשת להם פחות תשומת לב.",
  ].join("\n");
  const data = { grid: `## הגריד (אותו קטע, לעיון בחיתוכים ובשכנות)\n${renderGrid(region, { marked: true })}`, lines: `## הקווים\n${renderLines(lines)}` };
  const user = [intro, spec, data.grid, data.lines, task].filter((part) => part !== null).join("\n\n");
  return { system: SYSTEM, user, prose: { intro, spec, task }, data };
}

// ===== The reading layer (new code) =====
// A bounded region of the Torah matrix around a selected occurrence is shown to Fable, every proposal is replayed in the canonical ELS engine (els_verify_occurrence_v1),
// and the result carries what was actually covered, the time, the cost and the state. Experimental and admin-only: nothing is charged to a user and nothing is promised back.
// Dependencies (fetch, keys, clock, the identity resolver) are injected so that the same code is tested with fakes and run inside ai-analyze.

export const READING_CONTRACT = "els_matrix_reading_v1";
export const REQUEST_CONTRACT = "els_matrix_reading_request_v1";
export const MODEL_DEFAULT = "claude-fable-5-1";
const MODEL_PATTERN = /^claude-fable-[a-z0-9.-]{1,24}$/;
export const API_VERSION = "2026-10-21";
export const BATCH_CUSTOM_ID = "els-reading-1";
export const TORAH_LENGTH = 304_805;
export const MAX_INPUT_TOKENS_GUARD = 150_000;
export const JOB_TTL_MS = 14 * 24 * 3600 * 1000;
export const UNLIKELY_E = 1; // fewer than one chance occurrence expected anywhere in the Torah at this skip

/** Experimental starting values (ZURIEL, 29.10.2026): not fixed rules. Every job records the values it used. */
export const DEFAULTS = Object.freeze({ rows: 33, cols: 41, cap: MAX_FINDINGS, effort: "medium", maxTokens: 64_000 });
export const LIMITS = Object.freeze({ minRows: 9, maxRows: 35, minCols: 15, maxCols: 45, minCap: 5, maxCap: MAX_FINDINGS, maxTokens: 64_000 });

/** Letter counts of the Torah stream (public.torah_stream, 304,805 letters, md5 0066c2431821863d258745e664d3883e); the chance model E is computed from them. */
export const TORAH_LETTER_COUNTS = Object.freeze({
  א: 27059, ב: 16345, ג: 2109, ד: 7032, ה: 28056, ו: 30513, ז: 2198, ח: 7189, ט: 1804, י: 31531, כ: 11968,
  ל: 21570, מ: 25090, נ: 14126, ס: 1833, ע: 11250, פ: 4805, צ: 3962, ק: 4695, ר: 18125, ש: 15595, ת: 17950,
});

/** USD per million tokens, list prices (claude-api model table cached 2026-10-06). Message Batches are charged at half. cacheRead defaults to 0.1x input. */
export const PRICES = Object.freeze({ "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25 } });
export const BATCH_FACTOR = 0.5;
export const FX_ASSUMED_ILS_PER_USD = 3.7; // ASSUMPTION, not a verified rate: every ILS figure is marked ESTIMATED (ai_analyze_contract v2, section A)

/** Measured readings of the same kind (EXP-16, EXP-18; Message Batches, list prices): the evidence behind the estimate, never a promise. */
export const COST_EVIDENCE = Object.freeze([
  Object.freeze({ cap: 25, output_tokens: 12_622, usd: 0.39984, stop_reason: "end_turn", source: "EXP-18 C3 (23x41, general instruction)" }),
  Object.freeze({ cap: 25, output_tokens: 16_335, usd: 0.492825, stop_reason: "end_turn", source: "EXP-18 C1 (23x41, focused instruction)" }),
  Object.freeze({ cap: 60, output_tokens: 58_146, usd: 1.560425, stop_reason: "end_turn", source: "EXP-16 S2 (33x41)" }),
  Object.freeze({ cap: 60, output_tokens: 64_000, usd: 1.68429, stop_reason: "max_tokens", source: "EXP-18 C2 (23x41): ended without an answer" }),
]);

export class ReadingError extends Error {
  constructor(code, detail = "") { super(`${code}${detail ? `: ${detail}` : ""}`); this.name = "ReadingError"; this.code = code; this.detail = detail; }
}

// ---------- hashing, canonical JSON, signed job token ----------
const encoder = new TextEncoder();
const toHex = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
export const sha256Hex = async (text) => toHex(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
export const requestSha256 = (request) => sha256Hex(JSON.stringify(request));
export const lockSha256 = (request) => sha256Hex(canonicalJson(request));

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (text) => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
async function hmacKey(secret) { return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]); }
const timingSafeEqual = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i += 1) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

/** The job token is stateless: it carries what the status call needs and a signature, so the layer needs no table. It is not a secret (admin only) and not an authority: the identity is checked again on every call. */
export async function signJobToken(payload, secret) {
  if (!secret) throw new ReadingError("job_secret_missing");
  const body = b64url(encoder.encode(JSON.stringify(payload)));
  const signature = b64url(await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(body)));
  return `${body}.${signature}`;
}
export async function verifyJobToken(token, secret, { now = Date.now() } = {}) {
  if (typeof token !== "string" || token.length < 40 || token.length > 6000 || !secret) return { ok: false, error: "invalid_job_token" };
  const [body, signature, ...rest] = token.split(".");
  if (!body || !signature || rest.length) return { ok: false, error: "invalid_job_token" };
  const expected = b64url(await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(body)));
  if (!timingSafeEqual(expected, signature)) return { ok: false, error: "invalid_job_token" };
  let payload;
  try { payload = JSON.parse(new TextDecoder().decode(fromB64url(body))); } catch { return { ok: false, error: "invalid_job_token" }; }
  if (payload?.v !== 1 || typeof payload.b !== "string") return { ok: false, error: "invalid_job_token" };
  if (!Number.isFinite(payload.x) || now > payload.x) return { ok: false, error: "job_token_expired" };
  return { ok: true, payload };
}

// ---------- request normalisation ----------
const isInt = (v) => Number.isInteger(v);
export function normalizeReadingRequest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "invalid_request" };
  if (value.contract !== REQUEST_CONTRACT) return { ok: false, error: "invalid_contract" };
  if (!["preview", "create", "status"].includes(value.op)) return { ok: false, error: "invalid_op" };
  if (value.op === "status") return typeof value.job_token === "string" ? { ok: true, op: "status", jobToken: value.job_token } : { ok: false, error: "invalid_job_token" };
  const a = value.axis;
  if (!a || typeof a !== "object") return { ok: false, error: "invalid_axis" };
  const term = foldFinals(String(a.term ?? "").replace(/\s+/g, ""));
  if (!/^[א-ת]{2,24}$/u.test(term)) return { ok: false, error: "invalid_axis_term" };
  if (a.scope !== "torah") return { ok: false, error: "scope_not_supported" };
  if (!isInt(a.skip) || a.skip < 2 || a.skip > TORAH_LENGTH) return { ok: false, error: "invalid_axis_skip" };
  if (a.dir !== 1 && a.dir !== -1) return { ok: false, error: "invalid_axis_dir" };
  if (!isInt(a.start) || a.start < 0 || a.start >= TORAH_LENGTH) return { ok: false, error: "invalid_axis_start" };
  const rows = value.window?.rows ?? DEFAULTS.rows, cols = value.window?.cols ?? DEFAULTS.cols, cap = value.cap ?? DEFAULTS.cap;
  if (!isInt(rows) || rows < LIMITS.minRows || rows > LIMITS.maxRows) return { ok: false, error: "invalid_window_rows" };
  if (!isInt(cols) || cols < LIMITS.minCols || cols > LIMITS.maxCols) return { ok: false, error: "invalid_window_cols" };
  if (!isInt(cap) || cap < LIMITS.minCap || cap > LIMITS.maxCap) return { ok: false, error: "invalid_cap" };
  const out = { ok: true, op: value.op, axis: { term, scope: "torah", skip: a.skip, dir: a.dir, start: a.start }, rows, cols, cap };
  if (value.op === "create") {
    const ack = value.ack_upper_bound_usd;
    if (typeof ack !== "number" || !Number.isFinite(ack) || ack <= 0) return { ok: false, error: "ack_required" };
    out.ackUpperBoundUsd = ack;
  }
  return out;
}

// ---------- the window ----------
/** The matrix whose width is the skip of the selected occurrence; the window keeps the requested size when the Torah allows it (it shifts inward at an edge instead of shrinking). */
export function selectWindow({ axis, rows = DEFAULTS.rows, cols = DEFAULTS.cols }) {
  const width = axis.skip;
  const length = [...axis.term].length;
  const positions = Array.from({ length }, (_, k) => axis.start + k * axis.skip * axis.dir);
  if (positions.some((p) => p < 0 || p >= TORAH_LENGTH)) throw new ReadingError("axis_outside_scope");
  const totalRows = Math.floor(TORAH_LENGTH / width); // complete rows only
  if (width < LIMITS.minCols) throw new ReadingError("matrix_too_narrow", `width ${width}`);
  const axisRows = positions.map((p) => Math.floor(p / width));
  if (axisRows.some((r) => r >= totalRows)) throw new ReadingError("axis_outside_complete_rows");
  const [axisMin, axisMax] = [Math.min(...axisRows), Math.max(...axisRows)];
  const nRows = Math.min(rows, totalRows), nCols = Math.min(cols, width);
  if (axisMax - axisMin + 1 > nRows) throw new ReadingError("window_smaller_than_axis");
  const axisCol = axis.start % width;
  const wantedR0 = Math.round((axisMin + axisMax) / 2 - (nRows - 1) / 2), wantedC0 = axisCol - Math.floor(nCols / 2);
  const r0 = Math.max(0, Math.min(wantedR0, totalRows - nRows)), c0 = Math.max(0, Math.min(wantedC0, width - nCols));
  const r1 = r0 + nRows - 1, c1 = c0 + nCols - 1;
  return {
    width, totalRows, r0, r1, c0, c1, rows: nRows, cols: nCols, axisCol, axisRows: [axisMin, axisMax],
    requested: { rows, cols }, shifted: { rows: r0 !== wantedR0, cols: c0 !== wantedC0 },
    touches_edge: { top: r0 === 0, bottom: r1 === totalRows - 1, left: c0 === 0, right: c1 === width - 1 },
    margin: { above: axisMin - r0, below: r1 - axisMax, left: axisCol - c0, right: c1 - axisCol },
  };
}

/** Region object in the exact shape the harness used (1-based cells inside the region, 0-based stream positions). */
export function makeRegion({ width, r0, c0, rows, axis = null }) {
  const grid = rows.map((s) => [...s]);
  const nRows = grid.length, nCols = grid[0].length;
  if (grid.some((row) => row.length !== nCols)) throw new ReadingError("region_rows_uneven");
  if (grid.some((row) => row.some((ch) => !/^[א-ת]$/u.test(ch) || /[ךםןףץ]/.test(ch)))) throw new ReadingError("region_letters_invalid");
  const r1 = r0 + nRows - 1, c1 = c0 + nCols - 1;
  const region = { scope: "torah", width, r0, r1, c0, c1, nRows, nCols, W: width, rows: grid, baseRows: null, synthetic: false, axis };
  region.letterAt = (i, j) => (i >= 1 && i <= nRows && j >= 1 && j <= nCols ? grid[i - 1][j - 1] : undefined);
  region.position = (i, j) => (r0 + i - 1) * width + (c0 + j - 1);
  region.axisCells = axis ? Array.from({ length: axis.length }, (_, k) => axis.start + k * axis.skip * axis.dir).map((p) => [Math.floor(p / width) - r0 + 1, (p % width) - c0 + 1]) : [];
  return region;
}

/** The letters of the window rows from the canonical stream, one REST read per row (public.torah_stream, idx = row * width + col + 1). */
export async function fetchWindowRows({ window, fetchImpl, supabaseUrl, restHeaders, concurrency = 8 }) {
  const rows = new Array(window.rows);
  let next = 0;
  const one = async (k) => {
    const r = window.r0 + k;
    const lo = r * window.width + window.c0 + 1, hi = r * window.width + window.c1 + 1;
    const res = await fetchImpl(`${supabaseUrl}/rest/v1/torah_stream?select=idx,ch&idx=gte.${lo}&idx=lte.${hi}&order=idx.asc&limit=${window.cols + 1}`, { headers: restHeaders() });
    if (!res.ok) throw new ReadingError("stream_unavailable", `HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length !== window.cols) throw new ReadingError("stream_rows_incomplete", `row ${r}`);
    data.forEach((d, i) => { if (d.idx !== lo + i) throw new ReadingError("stream_rows_misaligned", `row ${r}`); });
    rows[k] = data.map((d) => d.ch).join("");
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, window.rows) }, async () => { while (next < window.rows) { const k = next; next += 1; await one(k); } }));
  return rows;
}

// ---------- request, coverage, cost ----------
export const THINKING = Object.freeze({ type: "adaptive", display: "summarized" });
/** The request exactly as the harness built it (key order included), so that the hashes of the experiments carry over. */
export function buildReadingRequest({ model, region, lines, cap, effort = DEFAULTS.effort, maxTokens = DEFAULTS.maxTokens }) {
  const prompt = buildReadingPrompt({ region, lines, cap });
  const request = { model, max_tokens: maxTokens, system: prompt.system, messages: [{ role: "user", content: prompt.user }] };
  request.thinking = { ...THINKING };
  request.output_config = { effort, format: { type: "json_schema", schema: FINDINGS_SCHEMA_V2 } };
  return { request, prompt };
}

export function describeCoverage({ region, lines, window }) {
  const byKind = Object.fromEntries(["R", "C", "D", "A"].map((k) => [k, lines.filter((l) => l.kind === k).length]));
  const omittedByKind = Object.fromEntries(["R", "C", "D", "A"].map((k) => [k, (lines.omitted ?? []).filter((o) => o.kind === k).length]));
  return {
    scope: "torah", matrix_width: window.width, torah_complete_rows: window.totalRows,
    rows: { from: window.r0, to: window.r1, count: window.rows, requested: window.requested.rows },
    cols: { from: window.c0, to: window.c1, count: window.cols, requested: window.requested.cols },
    cells: region.nRows * region.nCols,
    axis: { column: window.axisCol, rows: window.axisRows, cells: region.axisCells.length },
    margin: window.margin, shifted_to_stay_inside_torah: window.shifted, touches_matrix_edge: window.touches_edge,
    lines_shown: { total: lines.length, by_kind: byKind, readings: lines.length * 2 },
    lines_omitted_shorter_than_3: { total: (lines.omitted ?? []).length, by_kind: omittedByKind },
    what_is_not_covered: "everything outside this window; lines are cut at the window boundary; the rest of the Torah and every other matrix width",
  };
}

/** E: expected number of occurrences of the text at one skip, both directions, over the whole Torah, with independent letters at the Torah's own frequencies (a rough chance model, not a significance test). */
export function expectedChance(text, skip) {
  const letters = [...text];
  const starts = Math.max(0, TORAH_LENGTH - (letters.length - 1) * skip);
  let p = 1;
  for (const ch of letters) p *= (TORAH_LETTER_COUNTS[ch] ?? 0) / TORAH_LENGTH;
  return 2 * starts * p;
}

/** Distance (cells, Chebyshev) from an occurrence to the selected occurrence: 0 shares a cell, 1 touches (also diagonally), more is farther. */
export function relationToAxis(region, cells) {
  const distance = Math.min(...cells.map(([i, j]) => Math.min(...region.axisCells.map(([a, b]) => Math.max(Math.abs(i - a), Math.abs(j - b))))));
  return { distance, relation: distance === 0 ? "crosses" : distance === 1 ? "touches" : "far" };
}

const ilsOf = (usd, fxRate, fxBasis) => ({ amount: usd === null ? null : Number((usd * fxRate).toFixed(4)), currency: "ILS", status: "ESTIMATED", fx: { ils_per_usd: fxRate, basis: fxBasis, effective_at: null } });

/** Cost from the usage object and list prices (not an invoice). Thinking tokens are part of output_tokens. */
export function costFromUsage(model, usage, { batch = true, fxRate = FX_ASSUMED_ILS_PER_USD, fxBasis = "ASSUMPTION_NOT_VERIFIED" } = {}) {
  const price = PRICES[model];
  if (!price || !usage) return { usd: null, ils: ilsOf(null, fxRate, fxBasis), basis: price ? "no usage" : `no list price recorded for ${model}`, provider_currency: "USD" };
  const read = price.cacheRead ?? price.input * 0.1;
  const parts = {
    input: ((usage.input_tokens ?? 0) * price.input) / 1e6,
    cacheWrite: ((usage.cache_creation_input_tokens ?? 0) * price.input * 1.25) / 1e6,
    cacheRead: ((usage.cache_read_input_tokens ?? 0) * read) / 1e6,
    output: ((usage.output_tokens ?? 0) * price.output) / 1e6,
  };
  const usd = Number((Object.values(parts).reduce((a, b) => a + b, 0) * (batch ? BATCH_FACTOR : 1)).toFixed(6));
  return { usd, ils: ilsOf(usd, fxRate, fxBasis), list_price_parts_usd: parts, batch_factor: batch ? BATCH_FACTOR : 1, provider_currency: "USD", basis: `list prices${batch ? ", Message Batches at 50%" : ""}; from the usage object; not an invoice`, certainty: "ESTIMATED_FROM_USAGE_AND_LIST_PRICES" };
}

/** Estimate before a run. Upper bound: the input counted plus the whole output allowance. Expected: an interpolation of the measured readings of the same kind (COST_EVIDENCE), shown with its evidence. */
export function estimateCost({ model, inputTokens, maxTokens, cap, fxRate = FX_ASSUMED_ILS_PER_USD, fxBasis = "ASSUMPTION_NOT_VERIFIED" }) {
  const price = PRICES[model];
  if (!price) return { usd: null, ils: ilsOf(null, fxRate, fxBasis), basis: `no list price recorded for ${model}` };
  const upper = Number((BATCH_FACTOR * ((inputTokens * price.input * 1.25 + maxTokens * price.output) / 1e6)).toFixed(4));
  const at = (lowCap, highCap, lowOut, highOut) => lowOut + ((Math.min(Math.max(cap, lowCap), highCap) - lowCap) / (highCap - lowCap)) * (highOut - lowOut);
  const outLow = Math.round(at(25, 60, 12_622, 58_146)), outHigh = Math.round(at(25, 60, 16_335, 64_000));
  const usdOf = (out) => Number((BATCH_FACTOR * ((inputTokens * price.input + out * price.output) / 1e6)).toFixed(4));
  const expectedLow = usdOf(outLow), expectedHigh = Math.min(usdOf(outHigh), upper);
  return {
    upper_bound_usd: upper, upper_bound_ils: ilsOf(upper, fxRate, fxBasis),
    expected_usd: { low: expectedLow, high: expectedHigh }, expected_ils: { low: ilsOf(expectedLow, fxRate, fxBasis).amount, high: ilsOf(expectedHigh, fxRate, fxBasis).amount, status: "ESTIMATED" },
    expected_output_tokens: { low: outLow, high: outHigh },
    basis: "Message Batches at 50% of list prices; expected = interpolation of four measured readings (evidence below), not a promise; a reading can end at the output allowance with no usable answer (then it is INCOMPLETE and the cost is still incurred)",
    evidence: COST_EVIDENCE,
    cost_exposure: { charged_to_user: false, credits: "NOT_CHARGED", refund: "NOT_PROMISED" },
  };
}

// ---------- the Anthropic side (existing key, existing route; nothing here is a Provider of its own) ----------
const anthropicHeaders = (key) => ({ "x-api-key": key, "anthropic-version": API_VERSION, "content-type": "application/json" });
async function anthropicJson(fetchImpl, key, path, init = {}, label) {
  let res;
  try { res = await fetchImpl(`https://api.anthropic.com${path}`, { ...init, headers: { ...anthropicHeaders(key), ...(init.headers ?? {}) } }); } catch (error) { throw new ReadingError("anthropic_unreachable", `${label}: ${String(error?.message ?? error).slice(0, 120)}`); }
  const text = await res.text();
  if (!res.ok) throw new ReadingError(res.status === 404 ? "anthropic_not_found" : "anthropic_error", `${label}: HTTP ${res.status} ${text.slice(0, 160)}`);
  try { return JSON.parse(text); } catch { throw new ReadingError("anthropic_bad_json", label); }
}

/** The model is listed and fits the request: name, availability, structured outputs, adaptive thinking, the effort level, the output allowance. */
export async function verifyModel({ fetchImpl, key, model, effort, maxTokens }) {
  const info = await anthropicJson(fetchImpl, key, `/v1/models/${encodeURIComponent(model)}`, { method: "GET" }, "model");
  const caps = info.capabilities ?? {};
  const checks = {
    id_matches: info.id === model,
    structured_outputs: caps.structured_outputs?.supported === true,
    adaptive_thinking: caps.thinking?.types?.adaptive?.supported === true,
    effort_level: caps.effort?.[effort]?.supported === true,
    max_tokens_within_model_limit: maxTokens <= (info.max_tokens ?? 0),
  };
  return { ok: Object.values(checks).every(Boolean), model: info.id ?? model, display_name: info.display_name ?? null, max_input_tokens: info.max_input_tokens ?? null, max_tokens_limit: info.max_tokens ?? null, checks };
}
export async function countInputTokens({ fetchImpl, key, request }) {
  const out = await anthropicJson(fetchImpl, key, "/v1/messages/count_tokens", { method: "POST", body: JSON.stringify({ model: request.model, system: request.system, messages: request.messages, thinking: request.thinking }) }, "count_tokens");
  if (!Number.isFinite(out.input_tokens)) throw new ReadingError("anthropic_bad_json", "count_tokens");
  return out.input_tokens;
}
export const createBatch = ({ fetchImpl, key, request }) => anthropicJson(fetchImpl, key, "/v1/messages/batches", { method: "POST", body: JSON.stringify({ requests: [{ custom_id: BATCH_CUSTOM_ID, params: request }] }) }, "batch_create");
export const retrieveBatch = ({ fetchImpl, key, batchId }) => anthropicJson(fetchImpl, key, `/v1/messages/batches/${encodeURIComponent(batchId)}`, { method: "GET" }, "batch_retrieve");
export async function fetchBatchEntry({ fetchImpl, key, batch }) {
  if (!batch.results_url) throw new ReadingError("anthropic_bad_json", "results_url missing");
  let res;
  try { res = await fetchImpl(batch.results_url, { headers: anthropicHeaders(key) }); } catch (error) { throw new ReadingError("anthropic_unreachable", `results: ${String(error?.message ?? error).slice(0, 120)}`); }
  const text = await res.text();
  if (!res.ok) throw new ReadingError("anthropic_error", `results: HTTP ${res.status} ${text.slice(0, 160)}`);
  const entry = text.split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line)).find((e) => e.custom_id === BATCH_CUSTOM_ID);
  if (!entry) throw new ReadingError("anthropic_bad_json", "result entry missing");
  return entry;
}

// ---------- the canonical ELS engine (the one engine: els_verify_occurrence_v1, replay of one occurrence) ----------
export async function replayOccurrence({ term, skip, dir, start }, { fetchImpl, supabaseUrl, restHeaders }) {
  let res;
  try { res = await fetchImpl(`${supabaseUrl}/rest/v1/rpc/els_verify_occurrence_v1`, { method: "POST", headers: restHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ p_term: term, p_scope: "torah", p_skip: skip, p_dir: dir, p_start: start }) }); } catch (error) { throw new ReadingError("engine_unavailable", String(error?.message ?? error).slice(0, 120)); }
  if (!res.ok) throw new ReadingError("engine_unavailable", `HTTP ${res.status}`);
  return res.json();
}

const lettersAtPositions = (region, positions) => positions.map((p) => {
  const row = Math.floor(p / region.W) - region.r0, col = (p % region.W) - region.c0;
  return row >= 0 && row < region.nRows && col >= 0 && col < region.nCols ? region.rows[row][col] : "";
}).join("");

/** One row per located occurrence, in the shape `classify` expects. skip >= 2 is replayed in the engine; skip 1 is the plain text row (verified as plain text only). Any occurrence the engine cannot answer aborts: an unanswered item must not look like "not verified". */
export async function verifyOccurrences(items, { region, replay, concurrency = 6 }) {
  const rows = new Array(items.length);
  let next = 0;
  const one = async (item) => {
    const positions = [...item.term].map((_, j) => item.start + item.dir * item.skip * j);
    const dbText = lettersAtPositions(region, positions);
    const row = { key: item.key, term: item.term, start: item.start, skip: item.skip, dir: item.dir, db_text: dbText, letters_match: dbText === item.term };
    if (item.skip < 2) return { ...row, engine: { status: "plain_text_row_not_els" } };
    const result = await replay(item);
    const state = result?.verification_state ?? null;
    return { ...row, engine: { status: result?.status ?? "no_status", found: state === "MATCH", verification_state: state, contract: result?.contract ?? null, corpus_id: result?.corpus_id ?? null, occurrence_id: result?.occurrence?.occurrence_id ?? null } };
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => { while (next < items.length) { const k = next; next += 1; rows[k] = await one(items[k]); } }));
  return rows;
}

// ---------- the result ----------
const VERDICT_STATE = Object.freeze({ verified_by_engine: "ENGINE_VERIFIED", verified_plain_text_only: "PLAIN_TEXT_ONLY", not_verified: "NOT_VERIFIED" });

export function viewFindings({ classified, raw, region, rows }) {
  const rawById = new Map(raw.map((f) => [f.id, f]));
  const engineByKey = new Map(rows.map((r) => [r.key, r.engine]));
  return classified.map((f) => {
    const model = rawById.get(f.id) ?? {};
    const state = VERDICT_STATE[f.verdict] ?? "NOT_VERIFIED";
    const verifiedIdx = f.occurrences.map((_, k) => k).filter((k) => f.checks[k]?.letters_match === true && (f.checks[k]?.plain_text || f.checks[k]?.engine_found === true));
    const pickIdx = state === "ENGINE_VERIFIED" ? verifiedIdx.find((k) => !f.checks[k].plain_text) : (verifiedIdx[0] ?? 0);
    const occ = f.occurrences[pickIdx] ?? null;
    const eng = state === "ENGINE_VERIFIED" ? engineByKey.get(`${f.id}.${pickIdx}`) : null;
    const E = state === "ENGINE_VERIFIED" && occ ? expectedChance(f.text, occ.params.skip) : null;
    return {
      id: f.id, text: f.text, parts: Array.isArray(model.parts) ? model.parts : [], line: f.line,
      verification: {
        state, reasons: state === "NOT_VERIFIED" ? f.reasons : [], letters_match: f.checks.some((c) => c.letters_match === true), occurrences_verified: f.verifiedOccurrences,
        engine: eng ? { verification_state: eng.verification_state, contract: eng.contract, occurrence_id: eng.occurrence_id, corpus_id: eng.corpus_id } : null,
      },
      occurrence: occ ? { reading: occ.reading, skip: occ.params.skip, dir: occ.params.dir, start: occ.params.start, length: occ.params.length, cells: occ.cells } : null,
      chance: E === null ? null : { expected_occurrences: Number(E.toPrecision(4)), unlikely_by_chance: E < UNLIKELY_E, basis: "independent letters at the Torah's own frequencies, both directions, whole Torah at this skip" },
      relation_to_axis: occ ? relationToAxis(region, occ.cells) : null,
      model_claims: { kind: model.kind ?? null, tier: model.tier ?? null, continue_from: model.continue_from === true, note: model.note ?? "", status: "UNVERIFIED_INTERPRETATION" },
    };
  });
}

export function summarizeFindings(findings) {
  const els = findings.filter((f) => f.verification.state === "ENGINE_VERIFIED");
  return {
    proposals: findings.length,
    engine_verified: els.length,
    plain_text_only: findings.filter((f) => f.verification.state === "PLAIN_TEXT_ONLY").length,
    not_verified: findings.filter((f) => f.verification.state === "NOT_VERIFIED").length,
    engine_verified_long: els.filter((f) => [...f.text].length >= 5).length,
    engine_verified_short: els.filter((f) => [...f.text].length <= 4).length,
    unlikely_by_chance: els.filter((f) => f.chance?.unlikely_by_chance === true).length,
    expected_by_chance: els.filter((f) => f.chance && f.chance.unlikely_by_chance === false).length,
    by_relation: Object.fromEntries(["crosses", "touches", "far"].map((r) => [r, els.filter((f) => f.relation_to_axis?.relation === r).length])),
  };
}

export const REPORTING_NOTES = Object.freeze([
  "verification = the letters at the claimed positions and (for skip >= 2) a replay in the canonical ELS engine; it is not meaning, and random windows give findings of the same kind",
  "the model's notes and readings are UNVERIFIED_INTERPRETATION; AI does not canonicalize or publish",
  "the cap on proposals is an output cap, not proof that nothing else exists in the window",
  "experimental, admin only; no credits charged; no refund promised",
]);

// ---------- cost log (the existing ai_token_log, idempotent by the batch id in `ref`) ----------
export async function logReadingCost({ batchId, model, usage, identity }, { fetchImpl, supabaseUrl, restHeaders }) {
  try {
    if (!usage || !batchId) return { logged: false, reason: "no_usage" };
    const found = await fetchImpl(`${supabaseUrl}/rest/v1/ai_token_log?select=id&ref=eq.${encodeURIComponent(batchId)}&kind=eq.els_matrix_reading&limit=1`, { headers: restHeaders() });
    if (found.ok) { const rows = await found.json().catch(() => []); if (Array.isArray(rows) && rows.length) return { logged: true, existed: true, id: rows[0].id ?? null }; }
    const userId = identity?.startsWith("u:") ? identity.slice(2) : null;
    const res = await fetchImpl(`${supabaseUrl}/rest/v1/ai_token_log?select=id`, {
      method: "POST", headers: restHeaders({ "Content-Type": "application/json", Prefer: "return=representation" }),
      body: JSON.stringify({ source: "analyze", kind: "els_matrix_reading", model, input_tokens: (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0), output_tokens: usage.output_tokens ?? 0, user_id: userId, ref: batchId, ref_name: `els_matrix_reading:${model}` }),
    });
    if (!res.ok) return { logged: false, reason: `HTTP ${res.status}` };
    const rows = await res.json().catch(() => []);
    return { logged: true, existed: false, id: Array.isArray(rows) ? rows[0]?.id ?? null : null };
  } catch (error) { return { logged: false, reason: String(error?.message ?? error).slice(0, 100) }; }
}

// ---------- the handler (inside ai-analyze: the existing AI route) ----------
const STATES = Object.freeze({ RUNNING: "RUNNING", COMPLETE: "COMPLETE", INCOMPLETE: "INCOMPLETE", FAILED: "FAILED_WITH_REASON", PREVIEW: "PREVIEW" });
export const READING_STATES = STATES;

const stripIdentityPrefix = (identity) => String(identity ?? "");
function resolveModel(env) {
  const model = String(env.model || MODEL_DEFAULT).trim();
  if (!MODEL_PATTERN.test(model)) throw new ReadingError("model_not_allowed", model.slice(0, 40));
  return model;
}
const fxOf = (env) => {
  const rate = Number(env.fxIlsPerUsd);
  return Number.isFinite(rate) && rate > 0 ? { fxRate: rate, fxBasis: "CONFIGURED_NOT_VERIFIED" } : { fxRate: FX_ASSUMED_ILS_PER_USD, fxBasis: "ASSUMPTION_NOT_VERIFIED" };
};

async function prepare({ deps, axis, rowsWanted, colsWanted }) {
  const { env, fetchImpl, restHeaders } = deps;
  const rest = { fetchImpl, supabaseUrl: env.supabaseUrl, restHeaders };
  const replayAxis = await replayOccurrence({ term: axis.term, skip: axis.skip, dir: axis.dir, start: axis.start }, rest);
  if (replayAxis?.verification_state !== "MATCH") throw new ReadingError("axis_unverified", String(replayAxis?.verification_state ?? replayAxis?.status ?? "no_answer"));
  const window = selectWindow({ axis, rows: rowsWanted, cols: colsWanted });
  const letters = await fetchWindowRows({ window, ...rest });
  const axisSpec = { start: axis.start, skip: axis.skip, dir: axis.dir, length: [...axis.term].length };
  const region = makeRegion({ width: window.width, r0: window.r0, c0: window.c0, rows: letters, axis: axisSpec });
  const axisLetters = lettersAtPositions(region, Array.from({ length: axisSpec.length }, (_, k) => axis.start + k * axis.skip * axis.dir));
  if (axisLetters !== axis.term) throw new ReadingError("axis_not_in_stream_window", "the letters of the window differ from the verified axis");
  const lines = buildLines(region);
  const windowDigest = await sha256Hex(letters.join("\n"));
  return { rest, replayAxis, window, letters, region, lines, windowDigest, axisSpec };
}

export async function handleElsMatrixReading({ body, deps }) {
  const { json, env } = deps;
  const respond = (payload, status = 200) => json({ contract: READING_CONTRACT, ...payload }, status);
  if (!env.enabled || !["1", "true", "on"].includes(String(env.enabled).toLowerCase())) return respond({ ok: false, error: "not_enabled" }, 404);
  const { identity, tier } = await deps.resolveIdentity();
  if (tier !== "admin") return respond({ ok: false, error: "admin_only" }, 403);
  if (!env.anthropicKey) return respond({ ok: false, error: "not_configured" }, 503);
  const request = normalizeReadingRequest(body?.els_matrix_reading);
  if (!request.ok) return respond({ ok: false, error: request.error }, 400);
  const now = deps.now ?? (() => Date.now());
  const secret = env.jobSecret || (env.serviceKey ? `els-matrix-reading-v1:${env.serviceKey}` : "");
  const fx = fxOf(env);
  try {
    const model = resolveModel(env);
    if (request.op === "status") return await handleStatus({ respond, deps, request, identity, secret, now, fx, model });
    const prepared = await prepare({ deps, axis: request.axis, rowsWanted: request.rows, colsWanted: request.cols });
    const { request: modelRequest } = buildReadingRequest({ model, region: prepared.region, lines: prepared.lines, cap: request.cap });
    let modelCheck, inputTokens;
    try {
      [modelCheck, inputTokens] = await Promise.all([
        verifyModel({ fetchImpl: deps.fetchImpl, key: env.anthropicKey, model, effort: DEFAULTS.effort, maxTokens: DEFAULTS.maxTokens }),
        countInputTokens({ fetchImpl: deps.fetchImpl, key: env.anthropicKey, request: modelRequest }),
      ]);
    } catch (error) {
      if (error instanceof ReadingError && error.code === "anthropic_not_found") return respond({ ok: false, error: "model_unavailable", model: { id: model, verified_available: false } }, 503);
      throw error;
    }
    if (!modelCheck.ok) return respond({ ok: false, error: "model_unavailable", model_check: modelCheck }, 503);
    if (inputTokens >= MAX_INPUT_TOKENS_GUARD) return respond({ ok: false, error: "input_too_large", input_tokens: inputTokens }, 413);
    const estimate = estimateCost({ model, inputTokens, maxTokens: DEFAULTS.maxTokens, cap: request.cap, ...fx });
    const [reqSha, lockSha] = await Promise.all([requestSha256(modelRequest), lockSha256(modelRequest)]);
    const common = {
      ok: true,
      experimental: { admin_only: true, credits_charged: false, note: "starting values (33x41, cap 60) are an experimental starting point, not fixed rules" },
      model: { id: model, verified_available: true, check: modelCheck, verified_at: new Date(now()).toISOString() },
      axis: { term: request.axis.term, scope: "torah", skip: request.axis.skip, dir: request.axis.dir, start: request.axis.start, verification_state: "MATCH", occurrence_id: prepared.replayAxis?.occurrence?.occurrence_id ?? null, corpus_id: prepared.replayAxis?.corpus_id ?? null },
      request: { instruction: "general_v2_axis_marked_unnamed", cap: request.cap, effort: DEFAULTS.effort, max_tokens: DEFAULTS.maxTokens, input_tokens: inputTokens, sha256: reqSha, lock_sha256: lockSha, window_sha256: prepared.windowDigest },
      coverage: describeCoverage({ region: prepared.region, lines: prepared.lines, window: prepared.window }),
      estimate,
      notes: REPORTING_NOTES,
    };
    if (request.op === "preview") return respond({ ...common, state: STATES.PREVIEW, spent: { usd: 0, ai_calls: 0, note: "preview reads the stream and the engine and counts tokens; it starts no model run" } });
    // create: the cost the caller acknowledged must cover the upper bound shown for these exact parameters
    if (request.ackUpperBoundUsd + 1e-9 < estimate.upper_bound_usd) return respond({ ...common, ok: false, error: "ack_below_upper_bound", state: STATES.PREVIEW, required_ack_upper_bound_usd: estimate.upper_bound_usd }, 409);
    let batch;
    try { batch = await createBatch({ fetchImpl: deps.fetchImpl, key: env.anthropicKey, request: modelRequest }); } catch (error) {
      return respond({ ...common, ok: false, state: STATES.FAILED, error: "batch_create_failed", reason: error instanceof ReadingError ? error.code : "unknown", detail: error?.detail ?? String(error?.message ?? error).slice(0, 160), spent: { usd: 0, ai_calls: 0 } }, 502);
    }
    const createdMs = Date.parse(batch.created_at) || now();
    const payload = {
      v: 1, b: batch.id, i: stripIdentityPrefix(identity), t: createdMs, x: createdMs + JOB_TTL_MS, m: model, rs: reqSha, ls: lockSha, ws: prepared.windowDigest,
      ax: { term: request.axis.term, skip: request.axis.skip, dir: request.axis.dir, start: request.axis.start }, w: { r0: prepared.window.r0, c0: prepared.window.c0, rows: prepared.window.rows, cols: prepared.window.cols, requested: prepared.window.requested }, cap: request.cap,
      est: { upper_bound_usd: estimate.upper_bound_usd, expected_usd: estimate.expected_usd, input_tokens: inputTokens },
    };
    const jobToken = await signJobToken(payload, secret);
    return respond({ ...common, state: STATES.RUNNING, job: { token: jobToken, batch_id: batch.id, created_at: batch.created_at ?? new Date(createdMs).toISOString(), poll_after_seconds: 20, expires_at: new Date(payload.x).toISOString() }, spent: { usd: null, note: "incurred on the provider side once the batch runs; the actual cost is computed from the usage object when the result is collected" } });
  } catch (error) {
    if (error instanceof ReadingError) {
      const status = { axis_unverified: 422, axis_outside_scope: 422, axis_outside_complete_rows: 422, matrix_too_narrow: 422, window_smaller_than_axis: 422, axis_not_in_stream_window: 422, model_not_allowed: 400, job_secret_missing: 503, engine_unavailable: 503, stream_unavailable: 503 }[error.code] ?? 502;
      return respond({ ok: false, error: error.code, detail: error.detail }, status);
    }
    return respond({ ok: false, error: "internal_error", detail: String(error?.message ?? error).slice(0, 160) }, 500);
  }
}

async function handleStatus({ respond, deps, request, identity, secret, now, fx, model }) {
  const { env, fetchImpl } = deps;
  const verified = await verifyJobToken(request.jobToken, secret, { now: now() });
  if (!verified.ok) return respond({ ok: false, error: verified.error }, verified.error === "job_token_expired" ? 410 : 400);
  const job = verified.payload;
  if (job.i !== stripIdentityPrefix(identity)) return respond({ ok: false, error: "job_belongs_to_another_identity" }, 403);
  const rest = { fetchImpl, supabaseUrl: env.supabaseUrl, restHeaders: deps.restHeaders };
  const base = { ok: true, experimental: { admin_only: true, credits_charged: false }, job: { batch_id: job.b, created_at: new Date(job.t).toISOString(), expires_at: new Date(job.x).toISOString() }, request: { sha256: job.rs, lock_sha256: job.ls, window_sha256: job.ws, cap: job.cap }, axis: { term: job.ax.term, skip: job.ax.skip, dir: job.ax.dir, start: job.ax.start }, estimate: job.est, notes: REPORTING_NOTES };
  const batch = await retrieveBatch({ fetchImpl, key: env.anthropicKey, batchId: job.b });
  if (batch.processing_status !== "ended") return respond({ ...base, state: STATES.RUNNING, job: { ...base.job, elapsed_ms: Math.max(0, now() - job.t), processing_status: batch.processing_status, poll_after_seconds: 20 } });
  const entry = await fetchBatchEntry({ fetchImpl, key: env.anthropicKey, batch });
  const timing = { created_at: batch.created_at ?? null, ended_at: batch.ended_at ?? null, elapsed_ms: Math.max(0, Date.parse(batch.ended_at) - Date.parse(batch.created_at)) || null };
  if (entry.result?.type !== "succeeded") return respond({ ...base, state: STATES.FAILED, reason: `batch_${entry.result?.type ?? "no_result"}`, timing, cost: { usd: null, note: "no usage object was returned; the provider-side cost cannot be computed here" } });
  const message = entry.result.message;
  const usage = message.usage ?? null;
  const cost = costFromUsage(message.model ?? job.m, usage, { fxRate: fx.fxRate, fxBasis: fx.fxBasis });
  const logged = await logReadingCost({ batchId: job.b, model: message.model ?? job.m, usage, identity }, rest);
  const text = (message.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const output = { stop_reason: message.stop_reason ?? null, output_tokens: usage?.output_tokens ?? null, thinking_tokens: usage?.output_tokens_details?.thinking_tokens ?? null, input_tokens: usage?.input_tokens ?? null };
  const common = { ...base, timing, cost: { ...cost, logged: logged.logged, ai_token_log_ref: job.b }, output };
  // ai_analyze_contract v2, section D: max_tokens (or any stop other than end_turn) is CONTINUATION_REQUIRED, never COMPLETE
  if (message.stop_reason !== "end_turn") return respond({ ...common, state: STATES.INCOMPLETE, reason: message.stop_reason ?? "no_stop_reason", continuation_required: message.stop_reason === "max_tokens", findings: [], summary: null, note: "the answer was cut off; nothing from it is shown; the cost was incurred" });
  const parsed = parseModelOutput(text);
  if (!parsed.ok) return respond({ ...common, state: STATES.INCOMPLETE, reason: "invalid_json", continuation_required: false, findings: [], summary: null, note: parsed.error });
  // rebuild the same window from the canonical stream and require it to be the one that was sent
  const w = job.w;
  const window = selectWindow({ axis: { ...job.ax, scope: "torah" }, rows: w.requested.rows, cols: w.requested.cols });
  if (window.r0 !== w.r0 || window.c0 !== w.c0) return respond({ ...common, state: STATES.FAILED, reason: "window_changed" });
  const letters = await fetchWindowRows({ window, ...rest });
  if ((await sha256Hex(letters.join("\n"))) !== job.ws) return respond({ ...common, state: STATES.FAILED, reason: "stream_changed_since_the_request" });
  const region = makeRegion({ width: window.width, r0: window.r0, c0: window.c0, rows: letters, axis: { start: job.ax.start, skip: job.ax.skip, dir: job.ax.dir, length: [...job.ax.term].length } });
  const lines = buildLines(region);
  const byReading = readings(lines);
  const rawFindings = parsed.value.findings.map((f, k) => ({ ...f, modelId: f.id, id: `r1.f${String(k + 1).padStart(2, "0")}` }));
  const located = rawFindings.map((f) => locateFinding(f, { region, byReading }));
  let rows;
  try { rows = await verifyOccurrences(verificationItems(located), { region, replay: (item) => replayOccurrence(item, rest) }); } catch (error) {
    if (error instanceof ReadingError) return respond({ ...common, state: STATES.FAILED, reason: error.code, retryable: error.code === "engine_unavailable", note: "the answer is saved on the provider side; ask again to verify it" }, 503);
    throw error;
  }
  const classified = classify(located, rows);
  const findings = viewFindings({ classified, raw: rawFindings, region, rows });
  const summary = summarizeFindings(findings);
  return respond({
    ...common, state: STATES.COMPLETE, findings, summary,
    cap: { requested: job.cap, proposals: rawFindings.length, reached: rawFindings.length >= job.cap, meaning: "an output cap, not proof that nothing else exists" },
    coverage: describeCoverage({ region, lines, window }),
    observations: { text: String(parsed.value.observations ?? "").slice(0, 600), status: "UNVERIFIED_INTERPRETATION" },
    data_class: "ENGINE_VERIFIED_AND_PLAIN_TEXT_FINDINGS", is_test_fixture: false,
  });
}
