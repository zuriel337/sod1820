// EXP-16 prompt, version 3 (case U1). The background, the description of the region, the grid and the lines are exactly those of version 2 (they are taken from buildRound1V2, so
// the two cannot drift apart); only the task text and the schema differ. What is new is a request to look for geometric relations between proposals (parallel, crossing, near)
// without assuming they are the only interesting thing, to say briefly why each proposal or group was chosen, and two extra arrays in the answer (relations, groups). Like every
// other file in lib/, nothing here knows a target word, a phrase or a topic: the axis phrase comes from the region data.
import { MAX_FINDINGS, SYSTEM } from "./prompt.mjs";
import { FINDINGS_SCHEMA_V2, FIRST_GROUP_SIZE, buildRound1V2 } from "./prompt2.mjs";

export const RELATION_TYPES = Object.freeze(["parallel", "crossing", "near", "other"]);

export const FINDINGS_SCHEMA_V3 = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["findings", "relations", "groups", "observations"],
  properties: {
    findings: FINDINGS_SCHEMA_V2.properties.findings,
    relations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["a", "b", "type", "note"],
        properties: { a: { type: "string" }, b: { type: "string" }, type: { type: "string", enum: [...RELATION_TYPES] }, note: { type: "string" } },
      },
    },
    groups: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["ids", "why"],
        properties: { ids: { type: "array", items: { type: "string" } }, why: { type: "string" } },
      },
    },
    observations: { type: "string" },
  },
});

export function buildRound1V3(options) {
  const base = buildRound1V2(options);
  const task = [
    "## המשימה",
    "1. חפש בקטע מילים וביטויים בעברית תקינה שמופיעים כרצף רציף של אותיות באחד הקווים, בכל אחד משני הכיוונים. כלול צורות לשון: ריבוי, נסמך וסמיכות (ביטוי של שתי מילים או יותר), תחיליות (ו, ה, ב, כ, ל, מ, ש), סיומות שייכות, שמות פרטיים וצורות פעלים.",
    "2. מותר להציע גם חלוקה מעניינת של רצף ארוך למילים (השדה parts), אבל חיבור החלקים חייב לתת בדיוק את אותיות הרצף: בלי להוסיף, להשמיט, להחליף או לסדר מחדש אותיות. למשל הרצף \"ויאמרשלום\" מחולק ל-[\"ויאמר\",\"שלום\"].",
    "3. אל תגביל את עצמך לנושא כלשהו, ואל למילים שכיחות או למילים שנמצאות באמצע הקטע. הצע גם דברים שנראים לך מעניינים מסיבות אחרות (משמעות, ביטוי מוכר, שם, צירוף מפתיע). אל תדלג על הצעה כי היא אינה \"ראויה\": הבדיקה והסינון נעשים אחר כך מחוץ לשיחה.",
    "4. המשך ממילה שמצאת: לכל הצעה שנראית לך מעניינת בדוק את האותיות שלפניה ואחריה באותו קו (הקו המלא לפניך), את הקווים האחרים שחותכים אותה (כל תא שלה שייך לעוד שלושה קווים) ואת הסביבה הקרובה בגריד. אם הארכה, חיתוך או שכנות מניבים מילה או ביטוי בעברית, הצע אותם כהצעה נפרדת: בשדה from_finding כתוב את ה-id של ההצעה שממנה המשכת, וב-kind בחר extension או crossing. סמן continue_from=true על הצעות שתרצה לקבל עליהן כרטיס שכונה מפורט מהמנוע, אם יתאפשר סבב נוסף.",
    "5. קשרים גיאומטריים: חפש גם הצעות שיש ביניהן קשר גיאומטרי בקטע, והצע אותן כהצעות רגילות. סוגי הקשר: מקבילות (שני קווים מאותו סוג, למשל שני טורים או שני אלכסונים D, שמילים שעליהם רצות במקביל, בכיוון זהה או הפוך), חיתוך (שתי הצעות שחולקות תא) וקרבה (הצעות שהתאים שלהן סמוכים בגריד בלי לחתוך). רשום כל קשר כזה בשדה relations: a ו-b הם ה-id של שתי הצעות, type הוא parallel או crossing או near או other, ו-note משפט קצר. אל תניח שרק קשרים כאלה מעניינים: הצע גם הצעות בודדות שאינן קשורות לאחרות, בכל מקום בקטע ובכל סוג קו. אם אין קשר, השאר את relations ריק.",
    "6. הסבר קצר: בשדה note של כל הצעה כתוב משפט אחד על הסיבה שבחרת להציג אותה, כלומר למה היא נראית לך ראויה לתשומת לב. אם הצגת כמה הצעות כקבוצה (למשל הצעות שמתחברות לרעיון אחד, שיושבות באותו אזור או שקשורות זו לזו), רשום אותה בשדה groups: ids הם ה-id של ההצעות ו-why הסבר קצר למה הקבוצה מוצגת. זו פרשנות שלך ולא עובדה. אם אין קבוצות, השאר groups ריק.",
    `7. עד ${MAX_FINDINGS} הצעות. לכל הצעה: id קצר (F1, F2, ...), line (מזהה קו עם כיוון, למשל D17+), text (הרצף בדיוק כפי שהוא בקו, בלי רווחים), parts, kind, story_related, continue_from, from_finding (מחרוזת ריקה אם אין), tier, note.`,
    `8. tier הוא סדר הצגה בלבד, לא סינון: A = עד ${FIRST_GROUP_SIZE} ההצעות שהיית מציג ראשונות למי שקורא רק כמה שורות; B = מעניינות אבל פחות; C = כל השאר. כל ההצעות נשמרות ונבדקות. אל תדרג לפי קרבה לאמצע הקטע או לפי סוג הקו: כל רמה יכולה להכיל שורות, טורים ואלכסונים מכל מקום בקטע.`,
    "9. בשדה observations אפשר לכתוב עד שלוש שורות על אזורים או כיוונים שהקדשת להם פחות תשומת לב.",
  ].join("\n");
  const user = [base.prose.intro, base.prose.spec, base.data.grid, base.data.lines, task].filter((part) => part !== null).join("\n\n");
  return { system: SYSTEM, user, prose: { intro: base.prose.intro, spec: base.prose.spec, task }, data: base.data };
}
