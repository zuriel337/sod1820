// EXP-12 pilot: what the model is shown. The data sections are built from a pool file (items and relations computed and engine-confirmed beforehand); the instruction text is fixed prose that
// is the same in every arm. Nothing here knows a cipher, a word or a target: the axis phrase, when it is given at all, comes from the pool's data (`axis.term`).
import { FAMILIES } from "./geometry.mjs";

export const SYSTEM = [
  "אתה קורא עברית קפדן. לפניך מאגר של ממצאים שמנוע דילוגי האותיות הקנוני כבר אימת, ויחסים בין הממצאים שחושבו מראש. אינך מחשב אותיות, מיקומים או דילוגים ואינך מוסיף ממצאים.",
  "ממצא הוא רצף אותיות שהוא מילה מתוך רשימת מילים, על קו ישר באזור מטריצה. קיומו של ממצא או של יחס אינו אומר שיש לו משמעות: ברוב המאגר הממצאים והיחסים הם מקריים, וזה צפוי.",
  "תפקידך: לבחור מתוך המאגר מבנים של כמה ממצאים שנראים לך מבנה משותף, ולהסביר בקצרה למה. כל מה שתכתוב יתייחס לממצאים לפי מזהה בלבד (למשל F012) ולאותיות שמוצגות לפניך.",
  "השב אך ורק ב-JSON לפי הסכמה שניתנה.",
].join("\n");

export const HINT_STRUCTURE = "רמז אבחוני (ניסוי בדיקה, לא חלק מהריצות העיוורות): מבנים של מילים שרצות במקביל זו לזו, באותו כיוון או בכיוון הפוך, הם מסוג המבנים שמעניינים אותנו. בדוק במיוחד קבוצות כאלה, ואל תסנן לפי מילון או לפי קרבה לציר.";

export const ANSWER_SCHEMA = Object.freeze({
  type: "object", additionalProperties: false,
  required: ["groups", "singles", "phrases", "continuations", "chance_note"],
  properties: {
    groups: { type: "array", items: { type: "object", additionalProperties: false, required: ["ids", "relation_ids", "kind", "why"], properties: { ids: { type: "array", items: { type: "string" } }, relation_ids: { type: "array", items: { type: "string" } }, kind: { type: "string", enum: ["pair", "chain", "cluster"] }, why: { type: "string" } } } },
    singles: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "why"], properties: { id: { type: "string" }, why: { type: "string" } } } },
    phrases: { type: "array", items: { type: "object", additionalProperties: false, required: ["ids", "why"], properties: { ids: { type: "array", items: { type: "string" } }, why: { type: "string" } } } },
    continuations: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "before_letters", "after_letters", "why"], properties: { id: { type: "string" }, before_letters: { type: "string" }, after_letters: { type: "string" }, why: { type: "string" } } } },
    chance_note: { type: "string" },
  },
});
export const LIMITS = Object.freeze({ groups: 12, singles: 15, phrases: 10, continuations: 10, why: 400 });

const RELATION_LABEL = Object.freeze({ continuation: "המשך", same_line: "אותו קו", crossing: "חיתוך", parallel: "מקבילה", near: "סמוך" });
const AXIS_LABEL = (axis) => {
  if (!axis || axis.type === "none" || axis.type === "inside") return "-";
  if (axis.type === "crossing") return "חוצה";
  if (axis.type === "continuation") return "ממשיך";
  if (axis.type === "same_line") return `באותו קו (רווח ${axis.gap})`;
  if (axis.type === "parallel") return `מקביל (היסט ${axis.offset})`;
  if (axis.type === "near") return `קרוב (מרחק ${axis.distance})`;
  return "-";
};
const fmtE = (e) => (e === null || e === undefined ? "טקסט" : e >= 100 ? `E=${e.toFixed(0)}` : e >= 1 ? `E=${e.toFixed(1)}` : `E=${e.toExponential(1).replace("e-", "e-")}`);
const sign = (item) => (item.dir > 0 ? "+" : "-");
const cellText = (cell) => `(${cell[0]},${cell[1]})`;

/** Which relations of the pool are listed in the packet (the registered filter, Amendment 1). The pool file keeps all of them. */
export function listedRelations(pool) {
  const byId = new Map(pool.items.map((item) => [item.id, item]));
  return pool.relations.filter((r) => {
    if (r.type === "continuation" || r.type === "same_line" || r.type === "crossing") return true;
    if (r.type === "parallel") return r.offset <= 3 && r.overlap >= 3;
    if (r.type === "near") return byId.get(r.a).text.length >= 5 && byId.get(r.b).text.length >= 5;
    return false;
  });
}

const relationLine = (r) => {
  const detail = r.type === "parallel" ? `היסט ${r.offset}|חפיפה ${r.overlap}|${r.same_direction ? "אותו כיוון" : "כיוון הפוך"}` : r.type === "crossing" ? `${r.families}` : r.type === "continuation" ? `חפיפה ${r.overlap}` : r.type === "same_line" ? `רווח ${r.gap}` : `מרחק ${r.distance}`;
  return `${r.id}|${RELATION_LABEL[r.type]}|${r.a}|${r.b}|${detail}`;
};

/** arm: { named: bool, hint: null | "structure" }. Returns the system text, the user message and what the validator needs. */
export function buildPacket({ pool, arm }) {
  const w = pool.window;
  const axisRows = pool.axis.cells.map((c) => c[0]), axisCol = pool.axis.cells[0][1];
  const listed = listedRelations(pool);
  const background = arm.named
    ? ["## הרקע", `הציר המסומן באזור הוא הביטוי „${pool.axis.term}”. אין תיאור נוסף ואין נושא. אינך מחויב לביטוי הציר.`]
    : ["## הרקע", `באזור יש ציר מסומן אחד: קטע של ${pool.axis.cells.length} אותיות בעמודה אחת (עמודה ${axisCol}, שורות ${Math.min(...axisRows)}–${Math.max(...axisRows)}). אין לו שם, אין תיאור ואין נושא.`];
  const families = FAMILIES.map((f) => `${f.id} = ${f.label}`).join("; ");
  const what = [
    "## מה לפניך",
    `אזור של ${w.nRows} שורות × ${w.nCols} עמודות ממטריצת אותיות (שורה 1 למעלה; עמודה 1 היא האות הראשונה בשורת הטקסט, הצד הימני בתצוגה עברית; בכיוון הקריאה העמודות עולות). האותיות הסופיות כתובות בצורתן הרגילה.`,
    `המאגר: ${pool.items.length} ממצאים שהמנוע אימת, ו-${listed.length} יחסים שחושבו ביניהם. כל ממצא על קו ישר מאחת המשפחות: ${families}. קו R הוא טקסט רגיל של התורה, לא דילוג; כל השאר דילוגים.`,
    "לכל ממצא: מזהה | המילה | משפחה וכיוון (+ בכיוון הזרם, - נגדו) | תא ראשון → תא אחרון (שורה,עמודה) | E | היחס לציר | האותיות שלפניו ואחריו על אותו קו בתוך האזור (עד שש).",
    "E = כמה מופעים של המילה הזו, באותו דילוג, היו צפויים בכל התורה אילו האותיות היו אקראיות (בשכיחויות האותיות בתורה). E מעל 1 הוא רעש רגיל; E נמוך אומר שהמילה נדירה בדילוג הזה, לא שיש לה משמעות. 'טקסט' = שורת טקסט רגיל.",
    "יחסים: המשך (אותו קו, חופפים או צמודים), אותו קו (באותו קו עם רווח), חיתוך (תא משותף בין שני קווים שונים), מקבילה (אותה משפחה בקווים שונים; היסט במשבצות; חפיפה בתאים; אותו כיוון או הפוך), סמוך (תאים צמודים). רק חלק מהיחסים מוצג, והרשימה אינה כוללת יחסים שלא עברו את הסף.",
  ];
  const itemLines = pool.items.map((i) => `${i.id}|${i.text}|${i.family}${sign(i)}|${cellText(i.cells[0])}→${cellText(i.cells.at(-1))}|${fmtE(i.E)}|${AXIS_LABEL(i.axis)}|לפני:${i.before || "-"}|אחרי:${i.after || "-"}`);
  const task = [
    "## המשימה",
    "1. מבנים: הצע קבוצות של שני ממצאים או יותר שנראים לך מבנה משותף (שדה groups), לפי סדר החשיבות שלך (הראשונה היא החשובה ביותר). בכל קבוצה: ids, relation_ids (מזהי היחסים מהרשימה שעליהם אתה נשען, אפשר להשאיר ריק), kind (pair = זוג, chain = שרשרת, cluster = צביר) ו-why (משפט או שניים: למה אלה מבנה משותף ומה הקשר ביניהם).",
    "2. בודדים: הצע ממצאים בודדים שבולטים לדעתך, עם הסבר קצר (שדה singles).",
    "3. צירופים והמשך: צירוף (phrases) הוא רשימת ממצאים שמתחברים זה לזה על אותו קו, לפי הסדר; המשך (continuations) הוא ממצא שמורחב באותיות שמוצגות לפניו או אחריו (before_letters הן האותיות שמיד לפניו, after_letters האותיות שמיד אחריו, בדיוק כפי שהן מוצגות).",
    `4. הגבלות: עד ${LIMITS.groups} קבוצות, ${LIMITS.singles} בודדים, ${LIMITS.phrases} צירופים ו-${LIMITS.continuations} המשכים. השתמש רק במזהים ובאותיות שמוצגות; אל תכתוב מיקומים, דילוגים או מילים שלא במאגר. ב-why ובשאר הטקסטים אפשר להזכיר מזהים אבל לא להמציא ספרות או קואורדינטות.`,
    "5. chance_note: משפט או שניים על אילו יחסים במאגר נראים לך מקריים ולמה.",
    ...(arm.hint === "structure" ? ["", HINT_STRUCTURE] : []),
  ];
  const user = [...background, "", ...what, "", "## הממצאים", itemLines.join("\n"), "", "## היחסים", listed.map(relationLine).join("\n"), "", ...task].join("\n");
  return { system: SYSTEM, user, listedRelationIds: new Set(listed.map((r) => r.id)), prose: { background: background.join("\n"), what: what.join("\n"), task: task.join("\n") } };
}
