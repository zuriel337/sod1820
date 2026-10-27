// Lets a model (Claude) group the engine's findings around a research topic WITHOUT being able to invent letters or positions:
// the model receives only finding ids, the dictionary words the engine reported and their engine-reported cells; it must answer with
// ids. validateGrouping rejects anything else. No model is called here and no second AI route exists: the packet is plain text for the
// existing conversation (or the existing claude-raziel function) and the validator checks whatever comes back.
import { DIRECTIONS } from "./geometry.mjs";
import { baseLetters } from "./letters.mjs";

// Hebrew (right-to-left) display: column 1 is on the RIGHT, so "with the reading direction" points visually left.
export const DIRECTION_LABEL = Object.freeze({
  row_fwd: "שורה ← (בכיוון הקריאה)", row_back: "שורה → (נגד כיוון הקריאה)", col_down: "עמודה ↓", col_up: "עמודה ↑",
  diag_down_fwd: "אלכסון ↙ (מטה, בכיוון הקריאה)", diag_up_back: "אלכסון ↗ (מעלה, נגד כיוון הקריאה)",
  diag_down_back: "אלכסון ↘ (מטה, נגד כיוון הקריאה)", diag_up_fwd: "אלכסון ↖ (מעלה, בכיוון הקריאה)",
});

export const GROUPING_OUTPUT_SCHEMA = '{"groups":[{"label":"שם קצר לקבוצה","finding_ids":["F001","F007"],"why":"משפט קצר: איך הממצאים קשורים לנושא"}],"ungrouped_ids":["F002"]}';

export function buildGroupingPacket({ topic, region, findings, phrases = [], textRowsIncluded = true }) {
  const usable = findings.filter((finding) => textRowsIncluded || finding.kind === "els_in_matrix");
  const lines = [
    "ניסוי קיבוץ ממצאי ELS — חבילה דטרמיניסטית",
    "המילים והמיקומים הם פלט של מנוע ה-ELS הקנוני בלבד, מול מילון הפרויקט. אתה לא רשאי להוסיף אות, מילה, מיקום או ממצא.",
    "המשימה: לקבץ את הממצאים הקיימים לפי קשר לנושא המחקר, ולציין אילו אינם קשורים. אפשר להשאיר ממצאים בלי קבוצה.",
    "ענה ב-JSON בלבד, בדיוק בצורה הזו, רק עם מזהי ממצאים מהרשימה:",
    GROUPING_OUTPUT_SCHEMA,
    "בתוך label ו-why אסור לכתוב ספרות, קואורדינטות או אותיות/מילים שאינן ברשימה. קבוצה אחת לכל היותר לכל ממצא.",
    "",
    `נושא המחקר: ${topic}`,
    `אזור המטריצה: ${region.rows} שורות × ${region.cols} עמודות (רוחב מטריצה ${region.width}).`,
    "מספור: שורה 1 למעלה; עמודה 1 היא האות הראשונה בשורת הטקסט (הצד הימני בתצוגה עברית). 'בכיוון הקריאה' = לעמודות עולות.",
    "ממצאי 'שורה' הם טקסט רגיל של התורה ולא ELS; הם מסומנים (טקסט).",
    "",
    "ממצאים (מזהה | מילה | כיוון | מ-(שורה,עמודה) עד-(שורה,עמודה) באזור | מופעי המילה בכל המטריצה):",
    ...usable.map((finding) => `${finding.id} | ${finding.word} | ${DIRECTION_LABEL[finding.direction]}${finding.kind === "plain_text_row" ? " (טקסט)" : ""} | (${finding.local.fromRow + 1},${finding.local.fromCol + 1}) עד (${finding.local.toRow + 1},${finding.local.toCol + 1}) | ${finding.matrixHits}`),
  ];
  if (phrases.length) {
    lines.push("", "צירופים ברצף באותו כיוון (מורכבים ממילים שכבר ברשימה):", ...phrases.map((phrase) => `${phrase.id} | ${phrase.text} | ${DIRECTION_LABEL[phrase.direction]} | מרכיבים: ${phrase.components.join("+")}`));
  }
  return Object.freeze({ text: lines.join("\n"), ids: Object.freeze([...usable.map((f) => f.id), ...phrases.map((p) => p.id)]) });
}

const FORBIDDEN_KEYS = /^(row|col|rows|cols|start|end|positions|cells|letters|skip|word|words|coordinates|x|y)$/i;

/** Validates a model answer against the findings. Returns { ok, errors, groups, ungrouped }. Never throws. */
export function validateGrouping(raw, { findings, phrases = [], extraWords = [] }) {
  const errors = [];
  let value = raw;
  if (typeof raw === "string") {
    const text = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    try { value = JSON.parse(text); } catch { return { ok: false, errors: ["not valid JSON"], groups: [], ungrouped: [] }; }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, errors: ["answer must be an object"], groups: [], ungrouped: [] };
  const extra = Object.keys(value).filter((k) => !["groups", "ungrouped_ids"].includes(k));
  if (extra.length) errors.push(`unexpected top-level keys: ${extra.join(", ")}`);
  const known = new Map([...findings, ...phrases].map((item) => [item.id, item]));
  const knownWords = new Set([...findings.map((f) => f.word), ...phrases.flatMap((p) => p.words), ...phrases.map((p) => p.text), ...extraWords]);
  const used = new Set();
  const groups = [];
  for (const [index, group] of (Array.isArray(value.groups) ? value.groups : []).entries()) {
    const at = `groups[${index}]`;
    if (!group || typeof group !== "object" || Array.isArray(group)) { errors.push(`${at} must be an object`); continue; }
    for (const key of Object.keys(group)) {
      if (!["label", "finding_ids", "why"].includes(key)) errors.push(`${at}: unexpected key ${key}${FORBIDDEN_KEYS.test(key) ? " (positions and letters come only from the engine)" : ""}`);
    }
    const ids = Array.isArray(group.finding_ids) ? group.finding_ids : [];
    if (!ids.length) errors.push(`${at}: finding_ids required`);
    for (const id of ids) {
      if (typeof id !== "string" || !known.has(id)) errors.push(`${at}: unknown finding id ${JSON.stringify(id)}`);
      else if (used.has(id)) errors.push(`${at}: id ${id} used twice`);
      else used.add(id);
    }
    for (const field of ["label", "why"]) {
      const text = group[field];
      if (typeof text !== "string" || !text.trim() || text.length > 400) { errors.push(`${at}.${field} must be 1-400 characters`); continue; }
      if (/\d/u.test(text)) errors.push(`${at}.${field}: digits are not allowed`);
      for (const quoted of text.match(/[«"״'׳][^«»"״'׳]{2,40}[»"״'׳]/gu) || []) {
        const inner = quoted.slice(1, -1).trim();
        if (/[֐-׿]/u.test(inner) && !knownWords.has(inner)) errors.push(`${at}.${field}: quoted word ${JSON.stringify(inner)} is not an engine finding`);
      }
    }
    groups.push({ label: String(group.label || ""), finding_ids: ids.filter((id) => known.has(id)), why: String(group.why || "") });
  }
  const ungrouped = [];
  for (const id of Array.isArray(value.ungrouped_ids) ? value.ungrouped_ids : []) {
    if (typeof id !== "string" || !known.has(id)) errors.push(`ungrouped_ids: unknown finding id ${JSON.stringify(id)}`);
    else if (used.has(id)) errors.push(`ungrouped_ids: id ${id} also grouped`);
    else ungrouped.push(id);
  }
  return { ok: errors.length === 0, errors, groups, ungrouped };
}

export { DIRECTIONS as GROUPING_DIRECTIONS };

const ANGLE_LABEL = Object.freeze({ 0: "מקבילה", 45: "אלכסונית (45°)", 90: "מאונכת (90°)" });

/**
 * Grouping packet for CROSSING findings: every finding shares a stream position (a letter) with the anchor. The model sees the anchor, its
 * letters by index, and for each finding which anchor letter it crosses and at which letter of the word. Nothing else.
 */
export function buildCrossingPacket({ anchor, region, findings, chance = null, omittedFromPacket = 0 }) {
  const letters = [...baseLetters(anchor.term)].map((letter, index) => `${index + 1}=${letter}`).join(" ");
  const lines = [
    "ניסוי קיבוץ ממצאים החוצים צופן ELS — חבילה דטרמיניסטית",
    "הצופן, המילים והמיקומים הם פלט של מנוע ה-ELS הקנוני בלבד, מול מילון הפרויקט. אתה לא רשאי להוסיף אות, מילה, מיקום או ממצא.",
    "המשימה: לקבץ את הממצאים הקיימים לפי קשר לצופן ולנושא המחקר, ולציין אילו אינם קשורים. אפשר להשאיר ממצאים בלי קבוצה.",
    "ענה ב-JSON בלבד, בדיוק בצורה הזו, רק עם מזהי ממצאים מהרשימה:",
    GROUPING_OUTPUT_SCHEMA,
    "בתוך label ו-why אסור לכתוב ספרות, קואורדינטות או אותיות/מילים שאינן ברשימה (מותר לציין את שם הצופן). קבוצה אחת לכל היותר לכל ממצא.",
    "",
    `הצופן (עוגן): ${anchor.term} — ${anchor.positions.length} אותיות, דילוג ${anchor.skip}. אותיות הצופן לפי הסדר: ${letters}.`,
    `אזור הצגה: ${region.rows} שורות × ${region.cols} עמודות מתוך מטריצה ברוחב ${region.width}.`,
    "מספור: שורה 1 למעלה; עמודה 1 היא האות הראשונה בשורת הטקסט (הצד הימני בתצוגה עברית). 'בכיוון הקריאה' = לעמודות עולות.",
    "ממצא 'חוצה' = אחת מאותיותיו היא אותה אות בזרם (אותו מיקום) כמו אחת מאותיות הצופן. ממצאי 'שורה' הם טקסט רגיל של התורה ולא ELS; הם מסומנים (טקסט).",
    "",
    ...(chance && chance.observedTotal !== undefined ? [`הקשר סטטיסטי: אם האותיות בזרם היו בלתי תלויות (בתדירויות האותיות של הזרם עצמו), היו צפויים בממוצע ${chance.expectedTotal.toFixed(1)} ממצאים חוצים; נמצאו ${chance.observedTotal}. ממצא שמילתו קצרה ושכיחה הוא תוצאת מקרה צפויה; 'ציפיית מקרה' בכל שורה = כמה חיתוכים של המילה הזו צפויים בכלל בגלל מקרה (נמוך = נדיר יותר). קשר לנושא איננו הוכחה.`, ""] : []),
    "ממצאים (מזהה | מילה | כיוון | מה חוצה: אות הצופן = אות במילה, ובאיזה תא (שורה,עמודה) | זווית מול הצופן | ציפיית מקרה, או מופעי המילה בכל המטריצה אם נמדדו):",
    ...findings.map((finding) => {
      const cross = finding.crossing.shared.map((entry) => `אות הצופן ${entry.anchorIndex + 1} (${entry.letter}) = אות ${entry.wordIndex + 1} במילה, בתא (${entry.at.row + 1},${entry.at.col + 1})`).join("; ");
      const rarity = finding.chanceExpectation != null ? `ציפיית מקרה ${Number(finding.chanceExpectation).toPrecision(2)}` : finding.matrixHits ? finding.matrixHits : "לא נמדד";
      return `${finding.id} | ${finding.word} | ${DIRECTION_LABEL[finding.direction]}${finding.kind === "plain_text_row" ? " (טקסט)" : ""} | ${cross} | ${ANGLE_LABEL[finding.crossing.angle]} | ${rarity}`;
    }),
  ];
  if (omittedFromPacket) lines.push("", `הערה: ${omittedFromPacket} ממצאים נוספים לא נכללו בחבילה בגלל מגבלת גודל.`);
  return Object.freeze({ text: lines.join("\n"), ids: Object.freeze(findings.map((finding) => finding.id)) });
}
