// EXP-16 prompt, version 2. The same instruction text for every arm of the experiment; only the data (the region) and one paragraph (the background) differ between arms.
//   story  "columbia" = ZURIEL's sentence (as in EXP-15), "wrong" = an unrelated sentence, "none" = no description and no topic
//   marked true = the cells of a selected occurrence are named and marked in the grid (only the Columbia region has one); false = nothing is marked
//   hint   null for blind runs; a diagnostic run may add one paragraph (see HINTS), and then it is a diagnostic, never a blind result
//   onlyLines  null = all lines; or a list of line ids (a diagnostic that points the model at specific lines)
// Nothing in this file knows a target word. The first-group instruction (tier) asks for a presentation order, never a filter: every proposal is kept and verified.
import { KIND_VALUES, MAX_FINDINGS, STORY, SYSTEM, renderGrid, renderLines } from "./prompt.mjs";
import { axisSummary } from "./region.mjs";

export const STORY_WRONG = "קונצרט ענק באצטדיון, שבו אלפי אנשים שרו יחד עד חצות";
// "axis" = no description and no topic, but the phrase of the marked axis is given (taken from the region data, never from this file).
export const STORIES = Object.freeze({ columbia: STORY, wrong: STORY_WRONG, none: null, axis: null });
export const TIERS = Object.freeze(["A", "B", "C"]);
export const FIRST_GROUP_SIZE = 12;

export const HINTS = Object.freeze({
  names: "רמז אבחוני (ניסוי בדיקה, לא חלק מהריצות העיוורות): אל תסנן לפי מילון. הצע גם מחרוזות שנראות כשמות, ראשי תיבות, מילים לועזיות או צירופים בלתי שגרתיים, וחלוקות של רצפים ארוכים לשתי מילים או יותר, בעיקר בקווים שעוברים סמוך לתאים המסומנים.",
  lines: "רמז אבחוני (ניסוי בדיקה, לא חלק מהריצות העיוורות): הקווים שלפניך נבחרו כי הם עוברים ליד המופע הנבחר. עבור על כל אחד מהם ורשום כל קריאה אפשרית כמילה או כרצף של מילים בעברית, כולל חלוקות של רצפים ארוכים.",
});

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

const pad = (n) => String(n).padStart(2, "0");

export function buildRound1V2({ region, lines, story = "columbia", marked = false, hint = null, onlyLines = null }) {
  if (!(story in STORIES)) throw new Error(`unknown story mode: ${story}`);
  if (hint !== null && !(hint in HINTS)) throw new Error(`unknown hint: ${hint}`);
  if (marked && !region.axisCells.length) throw new Error("this region has no selected occurrence to mark");
  const shown = onlyLines ? lines.filter((line) => onlyLines.includes(line.id)) : lines;
  if (onlyLines && shown.length !== onlyLines.length) throw new Error("unknown line id in onlyLines");
  if (story === "axis" && (!marked || !region.axis?.text)) throw new Error("the axis background needs a marked axis with its phrase in the region data");
  const axis = marked ? axisSummary(region) : null;
  const intro = story === "axis"
    ? ["## הרקע", `הציר המסומן בקטע הוא הביטוי „${axis.text}”. אין תיאור נוסף ואין נושא. חפש עברית מעניינת באופן כללי, לפי שיקול דעתך, ואינך מחויב לביטוי הציר. סמן story_related=true רק אם לדעתך ההצעה קשורה בתוכנה לביטוי הציר.`].join("\n")
    : STORIES[story]
      ? ["## הרקע", `„${STORIES[story]}”`, "זה תיאור כללי בלבד. אינך מחויב לנושא הזה ואין דרישה שההצעות יהיו קשורות אליו."].join("\n")
      : ["## הרקע", "אין תיאור ואין נושא. חפש עברית מעניינת באופן כללי, לפי שיקול דעתך. סמן story_related=false בכל ההצעות."].join("\n");
  const spec = [
    "## מה לפניך",
    `קטע מוגבל ממטריצת אותיות: ${region.nRows} שורות (R01–R${pad(region.nRows)}, מלמעלה למטה) ו-${region.nCols} עמודות (C01–C${pad(region.nCols)}). האותיות הן אותיות עבריות בלי ניקוד, והאותיות הסופיות (ך ם ן ף ץ) כתובות בצורתן הרגילה (כ מ נ פ צ).`,
    ...(marked ? [`המופע הנבחר הוא ${axis.cells} האותיות של טור C${pad(axis.column)} בשורות R${pad(axis.rowFrom)}–R${pad(axis.rowTo)}.`] : []),
    "גבולות הקטע: מכל ארבעת הצדדים הקטע נחתך (המטריצה ממשיכה או נגמרת מחוץ לגבולות, וזה לא מוצג ולא נכלל בשום קו).",
    onlyLines
      ? "הקווים: מוצגים רק הקווים שמופיעים להלן (מזהה כמו D17 או A45, ובכל אחד שני כיווני קריאה). הכיוון `+` הוא: בשורות מעמודה 1 לעמודה האחרונה, בטורים מהשורה העליונה לתחתונה, ובאלכסונים מלמעלה למטה. הכיוון `-` הוא ההפך. האותיות מסודרות בקבוצות של חמש לנוחות בלבד (ברצף אין רווחים)."
      : "הקווים: שורות R, טורים C, אלכסונים D (יורדים ימינה ↘, כלומר מעמודה לעמודה עוקבת כשיורדים שורה) ואלכסונים A (יורדים שמאלה ↙). כל קו מוצג בשני כיווני קריאה. הכיוון `+` הוא: בשורות מעמודה 1 לעמודה האחרונה, בטורים מהשורה העליונה לתחתונה, ובאלכסונים (D ו-A) מלמעלה למטה. הכיוון `-` הוא ההפך. האותיות בכל שורת קו מסודרות לפי סדר הקריאה של אותו כיוון, בקבוצות של חמש לנוחות בלבד (ברצף אין רווחים). בכל שורת קו המזהה כולל את הכיוון, למשל D17+. קווים קצרים משלוש אותיות לא נכללו.",
  ].join("\n");
  const task = [
    "## המשימה",
    "1. חפש בקטע מילים וביטויים בעברית תקינה שמופיעים כרצף רציף של אותיות באחד הקווים, בכל אחד משני הכיוונים. כלול צורות לשון: ריבוי, נסמך וסמיכות (ביטוי של שתי מילים או יותר), תחיליות (ו, ה, ב, כ, ל, מ, ש), סיומות שייכות, שמות פרטיים וצורות פעלים.",
    "2. מותר להציע גם חלוקה מעניינת של רצף ארוך למילים (השדה parts), אבל חיבור החלקים חייב לתת בדיוק את אותיות הרצף: בלי להוסיף, להשמיט, להחליף או לסדר מחדש אותיות. למשל הרצף \"ויאמרשלום\" מחולק ל-[\"ויאמר\",\"שלום\"].",
    "3. אל תגביל את עצמך לנושא שבפסקת הרקע (אם ניתן נושא), ואל למילים שכיחות או למילים שנמצאות באמצע הקטע. הצע גם דברים שנראים לך מעניינים מסיבות אחרות (משמעות, ביטוי מוכר, שם, צירוף מפתיע) וסמן ב-story_related אם לדעתך הם קשורים לתיאור שבפסקת הרקע. אל תדלג על הצעה כי היא אינה \"ראויה\": הבדיקה והסינון נעשים אחר כך מחוץ לשיחה.",
    "4. המשך ממילה שמצאת: לכל הצעה שנראית לך מעניינת בדוק את האותיות שלפניה ואחריה באותו קו (הקו המלא לפניך), את הקווים האחרים שחותכים אותה (כל תא שלה שייך לעוד שלושה קווים) ואת הסביבה הקרובה בגריד. אם הארכה, חיתוך או שכנות מניבים מילה או ביטוי בעברית, הצע אותם כהצעה נפרדת: בשדה from_finding כתוב את ה-id של ההצעה שממנה המשכת, וב-kind בחר extension או crossing. סמן continue_from=true על הצעות שתרצה לקבל עליהן כרטיס שכונה מפורט מהמנוע, אם יתאפשר סבב נוסף.",
    `5. עד ${MAX_FINDINGS} הצעות. לכל הצעה: id קצר (F1, F2, ...), line (מזהה קו עם כיוון, למשל D17+), text (הרצף בדיוק כפי שהוא בקו, בלי רווחים), parts, kind, story_related, continue_from, from_finding (מחרוזת ריקה אם אין), tier, note (משפט קצר בעברית על הקריאה המוצעת; זו פרשנות שלך ולא עובדה).`,
    `6. tier הוא סדר הצגה בלבד, לא סינון: A = עד ${FIRST_GROUP_SIZE} ההצעות שהיית מציג ראשונות למי שקורא רק כמה שורות; B = מעניינות אבל פחות; C = כל השאר. כל ההצעות נשמרות ונבדקות. אל תדרג לפי קרבה לאמצע הקטע או לפי סוג הקו: כל רמה יכולה להכיל שורות, טורים ואלכסונים מכל מקום בקטע.`,
    "7. בשדה observations אפשר לכתוב עד שלוש שורות על אזורים או כיוונים שהקדשת להם פחות תשומת לב.",
    ...(hint ? ["", HINTS[hint]] : []),
  ].join("\n");
  const data = { grid: onlyLines ? null : `## הגריד (אותו קטע, לעיון בחיתוכים ובשכנות)\n${renderGrid(region, { marked })}`, lines: `## הקווים\n${renderLines(shown)}` };
  const user = [intro, spec, data.grid, data.lines, task].filter((part) => part !== null).join("\n\n");
  return { system: SYSTEM, user, prose: { intro, spec, task }, data };
}
