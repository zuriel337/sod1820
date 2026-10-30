// The two instructions of EXP-23, for one small group of lines. They are identical except for the paragraph that says what to return for each proposal:
//   A  basic reading: find Hebrew words and phrases; return the line and the exact sequence
//   B  reading with a quality instruction: the same, plus a readable division into words (letters preserved exactly after normalising final letters), a classification and one short linguistic remark
// Neither names a word, marks an interesting line or hints at a topic. The shown lines are rendered by the product's own renderer.
import * as M from "../../../supabase/functions/_shared/elsMatrixReading.js";
import { CAP, MODEL } from "./plan.mjs";

export const CLASSIFICATIONS = Object.freeze(["clear_word_or_phrase", "name", "abbreviation", "unclear_split"]);

const item = (extra = {}) => ({ type: "object", additionalProperties: false, required: ["id", "line", "text", ...Object.keys(extra)], properties: { id: { type: "string" }, line: { type: "string" }, text: { type: "string" }, ...extra } });
const wrap = (items) => ({ type: "object", additionalProperties: false, required: ["findings", "observations"], properties: { findings: { type: "array", items }, observations: { type: "string" } } });
export const SCHEMA_A = Object.freeze(wrap(item()));
export const SCHEMA_B = Object.freeze(wrap(item({ display: { type: "string" }, classification: { type: "string", enum: [...CLASSIFICATIONS] }, explanation: { type: "string" } })));

const INTRO = ["## הרקע", "אין תיאור ואין נושא. חפש עברית מעניינת באופן כללי, לפי שיקול דעתך."].join("\n");
const spec = (rows, cols) => [
  "## מה לפניך",
  `קבוצה קטנה של קווים מתוך קטע ממטריצת אותיות של ${rows} שורות ו-${cols} עמודות. אינך רואה את הגריד: רק את הקווים של הקבוצה הזו, כרצפי אותיות. האותיות הן אותיות עבריות בלי ניקוד, והאותיות הסופיות (ך ם ן ף ץ) כתובות בצורתן הרגילה (כ מ נ פ צ).`,
  "הקווים: שורות R (הטקסט המקראי עצמו, בלי דילוג: שורות מקור), טורים C, אלכסונים D (יורדים ימינה ↘, כלומר מעמודה לעמודה עוקבת כשיורדים שורה) ואלכסונים A (יורדים שמאלה ↙). כל קו מוצג בשני כיווני קריאה. הכיוון `+` הוא: בשורות מעמודה 1 לעמודה האחרונה, בטורים מהשורה העליונה לתחתונה, ובאלכסונים (D ו-A) מלמעלה למטה. הכיוון `-` הוא ההפך. האותיות בכל שורת קו מסודרות לפי סדר הקריאה של אותו כיוון, בקבוצות של חמש לנוחות בלבד (ברצף אין רווחים). בכל שורת קו המזהה כולל את הכיוון, למשל D17+. הקווים נחתכים בגבול הקטע.",
].join("\n");
const COMMON_TASK = (cap) => [
  "1. חפש בקווים שלפניך מילים וביטויים בעברית שמופיעים כרצף רציף של אותיות באחד הקווים, בכל אחד משני הכיוונים. כלול צורות לשון: ריבוי, נסמך וסמיכות (ביטוי של שתי מילים או יותר), תחיליות (ו, ה, ב, כ, ל, מ, ש), סיומות שייכות, שמות פרטיים, קיצורים וצורות פעלים. קווי R (שורות מקור) הם מועמדים לגיטימיים כמו כל קו אחר; הם יסומנו בנפרד.",
  "2. אל תפסול הצעה רק משום שהמילה אינה במילון. הצע גם דברים שנראים לך מעניינים מסיבות אחרות (משמעות, ביטוי מוכר, שם, צירוף מפתיע).",
  `3. עד ${cap} הצעות. זו תקרה בלבד: אין מכסת מינימום ואין חובה למלא אותה, והצעה אחת או אפס הצעות הן תשובה תקינה.`,
];
const FIELDS_A = (cap) => `4. לכל הצעה: id קצר (F1, F2, ...), line (מזהה הקו עם הכיוון, למשל D17+) ו-text (הרצף בדיוק כפי שהוא בקו, בלי רווחים). לעולם אל תוסיף, תשמיט, תחליף או תסדר מחדש אותיות.`;
const FIELDS_B = (cap) => [
  "4. לכל הצעה החזר:",
  "   - id קצר (F1, F2, ...) ו-line (מזהה הקו עם הכיוון, למשל D17+);",
  "   - text: הרצף המקורי בדיוק כפי שהוא בקו, בלי רווחים. תמיד נשמר;",
  "   - display: תצוגה קריאה של אותו רצף, מחולקת למילים ברווחים (מותר להחזיר אותיות סופיות בצורתן הסופית). חיבור המילים בלי הרווחים, אחרי נרמול האותיות הסופיות, חייב לתת בדיוק את אותיות text: בלי להוסיף, להשמיט, להחליף או לסדר מחדש אות;",
  "   - classification: אחד מ-clear_word_or_phrase (מילה או ביטוי ברור), name (שם), abbreviation (קיצור), unclear_split (חלוקה לא ברורה);",
  "   - explanation: הסבר לשוני קצר, משפט אחד, על הקריאה ועל החלוקה, בלי לבנות סיפור או הקשר שאינם בקלט.",
].join("\n");
const LAST = "5. בשדה observations אפשר לכתוב עד שתי שורות על קווים שהקדשת להם פחות תשומת לב.";

export function buildGroupPrompt({ arm, groupLines, cap = CAP, rows = 33, cols = 41 }) {
  const fields = arm === "B" ? FIELDS_B(cap) : FIELDS_A(cap);
  const task = ["## המשימה", ...COMMON_TASK(cap), fields, LAST].join("\n");
  const data = `## הקווים\n${M.renderLines(groupLines)}`;
  const user = [INTRO, spec(rows, cols), data, task].join("\n\n");
  return { system: M.SYSTEM, user, prose: { intro: INTRO, spec: spec(rows, cols), task }, data, fields };
}

export function buildGroupRequest({ arm, groupLines, cap = CAP }) {
  const prompt = buildGroupPrompt({ arm, groupLines, cap });
  const request = { model: MODEL.id, max_tokens: MODEL.maxTokens, system: prompt.system, messages: [{ role: "user", content: prompt.user }] };
  request.thinking = { ...M.THINKING };
  request.output_config = { effort: MODEL.effort, format: { type: "json_schema", schema: arm === "B" ? SCHEMA_B : SCHEMA_A } };
  return { request, prompt };
}

/** The split rule of arm B, checked by code and never by the model: final letters folded, spaces removed, the letters must be exactly those of `text`. */
export const splitPreservesLetters = (display, text) => M.foldFinals(String(display ?? "").replace(/\s+/g, "")) === M.foldFinals(String(text ?? "").replace(/\s+/g, ""));
