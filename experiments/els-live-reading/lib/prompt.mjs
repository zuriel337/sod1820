// What is sent to the model. Nothing here knows a target word: the instruction text is fixed prose, the data sections are the region and its lines as built from the
// canonical stream. The story description is the one ZURIEL wrote, verbatim. Round 2 (optional) is built from the model's own verified findings, by the harness.
import { KINDS, axisSummary, cellName } from "./region.mjs";

export const STORY = "אסון מעבורת החלל קולומביה, שהתפרקה בדרכה חזרה לכדור הארץ, ואנשי צוותה נספו";
export const MAX_FINDINGS = 60;
export const KIND_VALUES = Object.freeze(["word", "inflected_form", "construct_or_phrase", "name", "segmentation_of_longer_run", "extension", "crossing", "other"]);

export const FINDINGS_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["findings", "observations"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "line", "text", "parts", "kind", "story_related", "continue_from", "from_finding", "note"],
        properties: {
          id: { type: "string" },
          line: { type: "string" },
          text: { type: "string" },
          parts: { type: "array", items: { type: "string" } },
          kind: { type: "string", enum: [...KIND_VALUES] },
          story_related: { type: "boolean" },
          continue_from: { type: "boolean" },
          from_finding: { type: "string" },
          note: { type: "string" },
        },
      },
    },
    observations: { type: "string" },
  },
});

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

/** Round 1: the full region. Returns the pieces and the assembled user message; `data` holds the matrix sections, `prose` the instruction text. */
export function buildRound1({ region, lines }) {
  const axis = axisSummary(region);
  const prose = {
    intro: [
      "## הרקע",
      `„${STORY}”`,
      "זה תיאור כללי בלבד. אינך מחויב לנושא הזה ואין דרישה שההצעות יהיו קשורות אליו.",
    ].join("\n"),
    spec: [
      "## מה לפניך",
      `קטע מוגבל ממטריצת אותיות: ${region.nRows} שורות (R01–R${String(region.nRows).padStart(2, "0")}, מלמעלה למטה) ו-${region.nCols} עמודות (C01–C${String(region.nCols).padStart(2, "0")}). האותיות הן אותיות עבריות בלי ניקוד, והאותיות הסופיות (ך ם ן ף ץ) כתובות בצורתן הרגילה (כ מ נ פ צ).`,
      `המופע הנבחר הוא ${axis.cells} האותיות של טור C${String(axis.column).padStart(2, "0")} בשורות R${String(axis.rowFrom).padStart(2, "0")}–R${String(axis.rowTo).padStart(2, "0")}.`,
      "גבולות הקטע: למעלה, משמאל ומימין הקטע נחתך (המטריצה ממשיכה, אבל זה לא מוצג ולא נכלל בשום קו). למטה הקטע נגמר בשורה R" + String(region.nRows).padStart(2, "0") + " כי זרם האותיות נגמר שם בעמודות האלה.",
      "הקווים: שורות R, טורים C, אלכסונים D (יורדים ימינה ↘, כלומר מעמודה לעמודה עוקבת כשיורדים שורה) ואלכסונים A (יורדים שמאלה ↙). כל קו מוצג בשני כיווני קריאה. הכיוון `+` הוא: בשורות מעמודה 1 לעמודה האחרונה, בטורים מהשורה העליונה לתחתונה, ובאלכסונים (D ו-A) מלמעלה למטה. הכיוון `-` הוא ההפך. האותיות בכל שורת קו מסודרות לפי סדר הקריאה של אותו כיוון, בקבוצות של חמש לנוחות בלבד (ברצף אין רווחים). בכל שורת קו המזהה כולל את הכיוון, למשל D17+. קווים קצרים משלוש אותיות לא נכללו.",
    ].join("\n"),
    task: [
      "## המשימה",
      "1. חפש בקטע מילים וביטויים בעברית תקינה שמופיעים כרצף רציף של אותיות באחד הקווים, בכל אחד משני הכיוונים. כלול צורות לשון: ריבוי, נסמך וסמיכות (ביטוי של שתי מילים או יותר), תחיליות (ו, ה, ב, כ, ל, מ, ש), סיומות שייכות, שמות פרטיים וצורות פעלים.",
      "2. מותר להציע גם חלוקה מעניינת של רצף ארוך למילים (השדה parts), אבל חיבור החלקים חייב לתת בדיוק את אותיות הרצף: בלי להוסיף, להשמיט, להחליף או לסדר מחדש אותיות. למשל הרצף \"ויאמרשלום\" מחולק ל-[\"ויאמר\",\"שלום\"].",
      "3. אל תגביל את עצמך לנושא התיאור, ואל למילים שכיחות או למילים הקרובות לעמודה הנבחרת. הצע גם דברים שנראים לך מעניינים מסיבות אחרות (משמעות, ביטוי מוכר, שם, צירוף מפתיע) וסמן ב-story_related אם לדעתך הם קשורים לתיאור. אל תדלג על הצעה כי היא אינה \"ראויה\": הבדיקה והסינון נעשים אחר כך מחוץ לשיחה.",
      "4. המשך ממילה שמצאת: לכל הצעה שנראית לך מעניינת בדוק את האותיות שלפניה ואחריה באותו קו (הקו המלא לפניך), את הקווים האחרים שחותכים אותה (כל תא שלה שייך לעוד שלושה קווים) ואת הסביבה הקרובה בגריד. אם הארכה, חיתוך או שכנות מניבים מילה או ביטוי בעברית, הצע אותם כהצעה נפרדת: בשדה from_finding כתוב את ה-id של ההצעה שממנה המשכת, וב-kind בחר extension או crossing. סמן continue_from=true על הצעות שתרצה לקבל עליהן כרטיס שכונה מפורט מהמנוע, אם יתאפשר סבב נוסף.",
      `5. עד ${MAX_FINDINGS} הצעות. לכל הצעה: id קצר (F1, F2, ...), line (מזהה קו עם כיוון, למשל D17+), text (הרצף בדיוק כפי שהוא בקו, בלי רווחים), parts, kind, story_related, continue_from, from_finding (מחרוזת ריקה אם אין), note (משפט קצר בעברית על הקריאה המוצעת; זו פרשנות שלך ולא עובדה).`,
      "6. בשדה observations אפשר לכתוב עד שלוש שורות על אזורים או כיוונים שהקדשת להם פחות תשומת לב.",
    ].join("\n"),
  };
  const data = { grid: `## הגריד (אותו קטע, לעיון בחיתוכים ובשכנות)\n${renderGrid(region)}`, lines: `## הקווים\n${renderLines(lines)}` };
  const user = [prose.intro, prose.spec, data.grid, data.lines, prose.task].join("\n\n");
  return { system: SYSTEM, user, prose, data };
}

/** A neighbourhood card for one verified occurrence (round 2). `occurrence` = { line: "D17+", from, to } (0-based indices inside that reading). */
export function buildCard({ region, lines, byReading, findingId, text, readingId, from, to }) {
  const reading = byReading.get(readingId);
  const cells = reading.cells.slice(from, to + 1);
  const before = [...reading.letters].slice(Math.max(0, from - 8), from).join("");
  const after = [...reading.letters].slice(to + 1, to + 9).join("");
  const rows = [`### ${findingId}: ${text} (${readingId}, ${cellName(...cells[0])} עד ${cellName(...cells[cells.length - 1])})`, `באותו קו: …${before}  [${text}]  ${after}…  (עד שמונה אותיות לכל צד; אם הקו נגמר, זה סוף הקטע)`];
  const lineOf = (kind, i, j) => lines.find((l) => l.kind === kind && l.cells.some(([ci, cj]) => ci === i && cj === j));
  cells.forEach(([i, j], k) => {
    const parts = [];
    for (const kind of ["R", "C", "D", "A"]) {
      const line = lineOf(kind, i, j);
      if (!line || (`${line.id}+` === readingId || `${line.id}-` === readingId)) continue;
      const at = line.cells.findIndex(([ci, cj]) => ci === i && cj === j);
      const letters = [...line.letters];
      const left = letters.slice(Math.max(0, at - 4), at).join("");
      const right = letters.slice(at + 1, at + 5).join("");
      parts.push(`${line.id}+ …${left}[${letters[at]}]${right}…`);
    }
    rows.push(`תא ${k + 1} של ההצעה (${cellName(i, j)}, האות ${region.letterAt(i, j)}): ${parts.join(" | ")}`);
  });
  const rowsI = cells.map(([i]) => i);
  const colsJ = cells.map(([, j]) => j);
  const i0 = Math.max(1, Math.min(...rowsI) - 3);
  const i1 = Math.min(region.nRows, Math.max(...rowsI) + 3);
  const j0 = Math.max(1, Math.min(...colsJ) - 3);
  const j1 = Math.min(region.nCols, Math.max(...colsJ) + 3);
  rows.push(`הסביבה הקרובה (שורות R${String(i0).padStart(2, "0")}–R${String(i1).padStart(2, "0")}, עמודות C${String(j0).padStart(2, "0")}–C${String(j1).padStart(2, "0")}; האותיות של ההצעה במסגרת):`);
  const own = new Set(cells.map(([i, j]) => `${i},${j}`));
  const cellText = (i, j) => (own.has(`${i},${j}`) ? `[${region.letterAt(i, j)}]` : ` ${region.letterAt(i, j)} `);
  rows.push(`     ${Array.from({ length: j1 - j0 + 1 }, (_, k) => digits(j0 + k, 3)).join("")}`);
  for (let i = i0; i <= i1; i += 1) rows.push(`R${String(i).padStart(2, "0")}  ${Array.from({ length: j1 - j0 + 1 }, (_, k) => cellText(i, j0 + k)).join("")}`);
  return rows.join("\n");
}

/** The fixed text that every round-2 message starts with; the request-locked function accepts a continuation only if the message begins with exactly this and holds at most the allowed number of cards. */
export const ROUND2_PREFIX = `${[
  "## סבב המשך: כרטיסי שכונה",
  "להלן כרטיסים שהוכנו מהמנוע עבור הצעות שלך שהאותיות שלהן אומתו בקו שציינת. בכל כרטיס: האותיות לפני ואחרי ההצעה באותו קו, הקווים האחרים שחותכים כל תא שלה, והסביבה הקרובה.",
  "המשך מכל הצעה: בדוק הארכות (מילה או ביטוי שמכילים אותה), חיתוכים (מילים שעוברות דרך אחד מתאיה) ושכנות. הצע רק מה שהאותיות שבכרטיסים ובקטע המקורי מאפשרות, לפי אותן כללים: line עם כיוון, text בדיוק כפי שבקו, בלי להוסיף, להשמיט או להחליף אותיות, ובלי להגביל את עצמך לנושא התיאור.",
  "כתוב ב-from_finding את ה-id של ההצעה שממנה המשכת. אל תחזור על הצעות שכבר הצעת. השב באותה סכמת JSON.",
  "",
].join("\n")}\n`;

export function buildRound2Message({ cards }) {
  return [
    "## סבב המשך: כרטיסי שכונה",
    "להלן כרטיסים שהוכנו מהמנוע עבור הצעות שלך שהאותיות שלהן אומתו בקו שציינת. בכל כרטיס: האותיות לפני ואחרי ההצעה באותו קו, הקווים האחרים שחותכים כל תא שלה, והסביבה הקרובה.",
    "המשך מכל הצעה: בדוק הארכות (מילה או ביטוי שמכילים אותה), חיתוכים (מילים שעוברות דרך אחד מתאיה) ושכנות. הצע רק מה שהאותיות שבכרטיסים ובקטע המקורי מאפשרות, לפי אותן כללים: line עם כיוון, text בדיוק כפי שבקו, בלי להוסיף, להשמיט או להחליף אותיות, ובלי להגביל את עצמך לנושא התיאור.",
    "כתוב ב-from_finding את ה-id של ההצעה שממנה המשכת. אל תחזור על הצעות שכבר הצעת. השב באותה סכמת JSON.",
    "",
    cards.join("\n\n"),
  ].join("\n");
}
