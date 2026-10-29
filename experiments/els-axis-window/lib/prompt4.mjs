// EXP-18 prompt, version 4. The system text, the schema, the description of the region (spec) and the grid and lines are those of version 2 (taken from buildRound1V2). What differs:
// no background text, and a task that asks only for words that cross the selected occurrence or touch it, at most 25 proposals. Nothing here knows a target word.
import { SYSTEM } from "../../els-live-reading/lib/prompt.mjs";
import { FINDINGS_SCHEMA_V2, buildRound1V2 } from "../../els-live-reading/lib/prompt2.mjs";

export const MAX_FINDINGS_V4 = 25;
export const FIRST_GROUP_V4 = 8;
export const FINDINGS_SCHEMA_V4 = FINDINGS_SCHEMA_V2;

export function buildRound1V4({ region, lines }) {
  const base = buildRound1V2({ region, lines, story: "none", marked: true, hint: null, onlyLines: null });
  const intro = ["## הרקע", "אין תיאור ואין נושא. המופע הנבחר מסומן בקטע, והקטע נחתך סביבו. סמן story_related=false בכל ההצעות."].join("\n");
  const task = [
    "## המשימה",
    "1. חפש בקטע מילים וביטויים בעברית תקינה שמופיעים כרצף רציף של אותיות באחד הקווים, בכל אחד משני הכיוונים, ורק כאלה הקשורים גאומטרית למופע הנבחר: (א) חוצים אותו, כלומר הקו שלהם עובר דרך אחד מתאיו; (ב) צמודים אליו, כלומר לפחות תא אחד של הרצף סמוך (מעל, מתחת, מימין, משמאל או באלכסון) לאחד מתאי המופע הנבחר. אל תציע מילים שאינן חוצות ואינן צמודות. כלול צורות לשון: ריבוי, נסמך וסמיכות (ביטוי של שתי מילים או יותר), תחיליות (ו, ה, ב, כ, ל, מ, ש), סיומות שייכות, שמות פרטיים וצורות פעלים.",
    "2. מותר להציע גם חלוקה מעניינת של רצף ארוך למילים (השדה parts), אבל חיבור החלקים חייב לתת בדיוק את אותיות הרצף: בלי להוסיף, להשמיט, להחליף או לסדר מחדש אותיות. למשל הרצף \"ויאמרשלום\" מחולק ל-[\"ויאמר\",\"שלום\"].",
    "3. אל תגביל את עצמך למילים שכיחות. הצע גם דברים שנראים לך מעניינים מסיבות אחרות (משמעות, ביטוי מוכר, שם, צירוף מפתיע). אל תדלג על הצעה כי היא אינה \"ראויה\": הבדיקה והסינון נעשים אחר כך מחוץ לשיחה.",
    "4. המשך ממילה שמצאת: לכל הצעה שנראית לך מעניינת בדוק את האותיות שלפניה ואחריה באותו קו (הקו המלא לפניך), את הקווים האחרים שחותכים אותה (כל תא שלה שייך לעוד שלושה קווים) ואת הסביבה הקרובה בגריד. אם הארכה, חיתוך או שכנות מניבים מילה או ביטוי בעברית, הצע אותם כהצעה נפרדת: בשדה from_finding כתוב את ה-id של ההצעה שממנה המשכת, וב-kind בחר extension או crossing. סמן continue_from=true על הצעות שתרצה לקבל עליהן כרטיס שכונה מפורט מהמנוע, אם יתאפשר סבב נוסף.",
    `5. עד ${MAX_FINDINGS_V4} הצעות. לכל הצעה: id קצר (F1, F2, ...), line (מזהה קו עם כיוון, למשל D17+), text (הרצף בדיוק כפי שהוא בקו, בלי רווחים), parts, kind, story_related, continue_from, from_finding (מחרוזת ריקה אם אין), tier, note (משפט קצר בעברית על הקריאה המוצעת ועל איך היא חוצה את המופע הנבחר או צמודה אליו; זו פרשנות שלך ולא עובדה).`,
    `6. tier הוא סדר הצגה בלבד, לא סינון: A = עד ${FIRST_GROUP_V4} ההצעות שהיית מציג ראשונות למי שקורא רק כמה שורות; B = מעניינות אבל פחות; C = כל השאר. כל ההצעות נשמרות ונבדקות.`,
    "7. בשדה observations אפשר לכתוב עד שלוש שורות על כיוונים שהקדשת להם פחות תשומת לב.",
  ].join("\n");
  const user = [intro, base.prose.spec, base.data.grid, base.data.lines, task].join("\n\n");
  return { system: SYSTEM, user, prose: { intro, spec: base.prose.spec, task }, data: base.data };
}

/**
 * The previous (v2) instruction, unchanged, for the window comparison: no background text and the axis marked (as in v4), the general task of EXP-16. `cap` is only an output cap
 * on the number of proposals: 60 is the v2 text as it was; a smaller number replaces that single number and nothing else, so that the effect of the cap can be separated from the
 * effect of the focused instruction of v4.
 */
export function buildRound1General({ region, lines, cap = 60 }) {
  const base = buildRound1V2({ region, lines, story: "none", marked: true, hint: null, onlyLines: null });
  if (cap === 60) return base;
  const from = "עד 60 הצעות.";
  if (base.prose.task.split(from).length !== 2) throw new Error("the output cap sentence of v2 was not found exactly once");
  const task = base.prose.task.replace(from, `עד ${cap} הצעות.`);
  const user = [base.prose.intro, base.prose.spec, base.data.grid, base.data.lines, task].join("\n\n");
  return { ...base, user, prose: { ...base.prose, task } };
}
