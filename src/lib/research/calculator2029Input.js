// Calculator 2029 input classification.
// Decides which method families can honestly be shown for an expression. It never calculates:
// Hebrew values come from fn_method_profile, English values from the English lane adapter.

const clean = (value) => value == null ? "" : String(value).trim();

const HEBREW_LETTER_RE = /[א-ת]/gu;
const LATIN_LETTER_RE = /[A-Za-z]/g;
const ANY_LETTER_RE = /\p{L}/gu;
const DIGIT_RE = /\d/;

export const CALCULATOR_INPUT_KIND = Object.freeze({
  EMPTY: "empty",
  HEBREW: "hebrew",
  MIXED: "mixed",
  LATIN: "latin",
  NUMERIC: "numeric",
  UNSUPPORTED: "unsupported",
});

const count = (text, re) => (text.match(re) || []).length;

export function classifyCalculatorInput(raw) {
  const expression = clean(raw);
  const hebrewLetters = count(expression, HEBREW_LETTER_RE);
  const latinLetters = count(expression, LATIN_LETTER_RE);
  const anyLetters = count(expression, ANY_LETTER_RE);
  const otherLetters = Math.max(0, anyLetters - hebrewLetters - latinLetters);
  const hasDigits = DIGIT_RE.test(expression);

  let kind;
  if (!expression) kind = CALCULATOR_INPUT_KIND.EMPTY;
  else if (hebrewLetters && latinLetters) kind = CALCULATOR_INPUT_KIND.MIXED;
  else if (hebrewLetters) kind = CALCULATOR_INPUT_KIND.HEBREW;
  else if (latinLetters) kind = CALCULATOR_INPUT_KIND.LATIN;
  else if (!anyLetters && hasDigits) kind = CALCULATOR_INPUT_KIND.NUMERIC;
  else kind = CALCULATOR_INPUT_KIND.UNSUPPORTED;

  let notice = null;
  if (kind === CALCULATOR_INPUT_KIND.MIXED) {
    notice = "בשיטות העבריות נספרות רק האותיות העבריות. באנגלית נספרות רק האותיות הלטיניות.";
  } else if (kind === CALCULATOR_INPUT_KIND.LATIN) {
    notice = "הקלט באותיות לטיניות. השיטות העבריות לא חלות עליו, ולכן מוצגות רק שיטות אנגליות.";
  } else if (kind === CALCULATOR_INPUT_KIND.NUMERIC) {
    notice = "הקלט הוא מספר, לא ביטוי. לפתיחת מספר השתמשו בדף המספר.";
  } else if (kind === CALCULATOR_INPUT_KIND.UNSUPPORTED) {
    notice = "הכתב הזה עדיין לא נתמך במחשבון. נתמכים עברית ואנגלית.";
  }
  if (latinLetters && otherLetters && kind !== CALCULATOR_INPUT_KIND.UNSUPPORTED) {
    notice = (notice ? notice + " " : "") + "אותיות עם סימנים (כמו ü) אינן נספרות באנגלית.";
  }

  return Object.freeze({
    kind,
    expression,
    hebrewLetters,
    latinLetters,
    otherLetters,
    hasDigits,
    hebrewApplicable: kind === CALCULATOR_INPUT_KIND.HEBREW || kind === CALCULATOR_INPUT_KIND.MIXED,
    englishApplicable: kind === CALCULATOR_INPUT_KIND.LATIN || kind === CALCULATOR_INPUT_KIND.MIXED,
    notice,
  });
}

// A computed 0 is "no letters counted", never a discovery: it is not selectable or shareable.
export function isReportableValue(value) {
  if (value == null || value === "") return false;
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

export const isEnglishMethodKey = (methodKey) => clean(methodKey).startsWith("en_");

// fn_method_profile runs every active method over any string. Rows that do not apply to the
// input language come back as 0 and must not be displayed as results.
export function filterProfileRowsForInput(rows, classification) {
  const list = Array.isArray(rows) ? rows : [];
  const info = classification || classifyCalculatorInput("");
  return list.filter((row) => {
    const english = isEnglishMethodKey(row?.methodKey);
    if (english) return info.englishApplicable && isReportableValue(row?.computedValue);
    return info.hebrewApplicable;
  });
}
