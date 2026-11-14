// Clickable numbers in a Community message. A plain integer written in the message text opens the existing Number page
// (/number/<n>) or, inside the 2029 shell, the existing in-place Number capability; the stored text is never rewritten.
//
// ZURIEL: a number is a link from 1 upward, one-digit numbers and a year that stands by itself included.
// These stay ordinary text: dates (10.11.2026, 12-11-2026, 12–11–2026, 2026-11-12), times (14:33), decimals and amounts (3.14, 12,50),
// digit runs joined without a space by a dash, slash, dot or colon (3/4, 10-20, 054-1234567), telephone numbers written with spaces
// (050 123 4567, +972 50 123 4567, (03) 123 4567), anything inside a web address or an e-mail address (https://x.co/p?id=1237,
// www.x.co/a?t=5, x.co?id=7), percentages, numbers glued to Latin letters or underscores (A1, 5G, id_7), numbers with a leading zero,
// zero, and anything longer than nine digits. A thousands group (1,158) is read as 1158. An ambiguous run such as "1237,1158" (no
// space) is left as text rather than guessed. A list of numbers separated by spaces or ", " (812 848 1237) is a list of numbers.
export const MESSAGE_NUMBER_MAX_DIGITS = 9;
export const MESSAGE_NUMBER_MIN_VALUE = 1;

const NUMBER = /\d{1,3}(?:,\d{3})+(?!\d)|\d+/g;
const DIGIT = /\d/;
const LATIN_OR_JOINER = /[A-Za-z_]/;
// Every dash a writer may type between the parts of a date or a range: hyphen-minus, hyphen, non-breaking hyphen, figure dash, en dash,
// em dash, horizontal bar, minus sign, Hebrew maqaf, small hyphen-minus, full-width hyphen-minus.
const DASH = "\\-\\u2010\\u2011\\u2012\\u2013\\u2014\\u2015\\u2212\\u05BE\\uFE58\\uFE63\\uFF0D";
const DASH_CHAR = new RegExp(`[${DASH}]`, "u");
const AFTER_JOINER = new RegExp(`[.,:/\\\\${DASH}]`, "u");
// "=" is deliberately not a blocker: it is the writers' own notation ("מיד הימין = 1237", "תעל=812").
const BEFORE_BLOCKERS = /[.,:/\\@#$%&+−]/u;

// Spans that are never numbers, found before any digit is looked at.
const SPACE_OR_JOINER = `[\\s\\u00A0.${DASH}]`;
const PROTECTED_SPANS = [
  // A web address or an e-mail address: scheme, www., domain followed by a path/query/anchor/port, or user@host.tld. Whole token.
  { token: true, test: /(?:https?:\/\/|ftp:\/\/|www\.|[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}[/?#:]|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i },
  // International telephone number: a plus, a country code, then groups with spaces, dots, dashes or brackets.
  { span: new RegExp(`\\+\\s?\\d[\\d\\s().${DASH}]{5,}\\d`, "gu") },
  // Local telephone number: a prefix that starts with a zero, then 3+4, 3+2+2, 3+3 or 7 digits ("050 123 4567", "050-123-45-67",
  // "03-1234567", "(03) 123 4567", "0501234567"). A number that follows it after a space stays a number.
  { span: new RegExp(`(?<![\\d\\w])\\(?0\\d{1,2}\\)?(?:${SPACE_OR_JOINER}?\\d{3}${SPACE_OR_JOINER}?\\d{4}|${SPACE_OR_JOINER}?\\d{3}${SPACE_OR_JOINER}?\\d{2}${SPACE_OR_JOINER}?\\d{2}|${SPACE_OR_JOINER}?\\d{3}${SPACE_OR_JOINER}?\\d{3}|${SPACE_OR_JOINER}?\\d{7})(?!\\d)`, "gu") },
  // Israeli country code written without a plus ("972 50 123 4567").
  { span: new RegExp(`(?<![\\d\\w])972${SPACE_OR_JOINER}?\\d{1,2}${SPACE_OR_JOINER}?\\d{3}${SPACE_OR_JOINER}?\\d{4}(?!\\d)`, "gu") },
];

export function messageNumberValue(raw) {
  const digits = String(raw).replace(/,/g, "");
  if (!/^[1-9]\d*$/.test(digits) || digits.length > MESSAGE_NUMBER_MAX_DIGITS) return null;
  const value = Number(digits);
  return Number.isSafeInteger(value) && value >= MESSAGE_NUMBER_MIN_VALUE ? value : null;
}

function protectedRanges(value) {
  const ranges = [];
  for (const rule of PROTECTED_SPANS) {
    if (rule.token) {
      for (const token of value.matchAll(/\S+/g)) if (rule.test.test(token[0])) ranges.push([token.index, token.index + token[0].length]);
    } else for (const found of value.matchAll(rule.span)) ranges.push([found.index, found.index + found[0].length]);
  }
  return ranges;
}

// text -> [{ text }, { text, number }, ...] covering the whole string in order.
export function splitMessageNumbers(text = "") {
  const value = String(text);
  const parts = [];
  const ranges = protectedRanges(value);
  let cursor = 0;
  for (const match of value.matchAll(NUMBER)) {
    const start = match.index, end = start + match[0].length;
    const before = value[start - 1] || "", twoBefore = value[start - 2] || "";
    const after = value[end] || "", twoAfter = value[end + 1] || "";
    const number = messageNumberValue(match[0]);
    if (number == null) continue;
    if (ranges.some(([from, to]) => start >= from && start < to)) continue;
    if (DIGIT.test(before) || LATIN_OR_JOINER.test(before) || BEFORE_BLOCKERS.test(before)) continue;
    // A dash after a digit joins a date, a range or a phone number; after a letter ("ב-1237") it is only a prefix.
    if (DASH_CHAR.test(before) && DIGIT.test(twoBefore)) continue;
    if (LATIN_OR_JOINER.test(after) || after === "%" || after === "‰") continue;
    if (AFTER_JOINER.test(after) && DIGIT.test(twoAfter)) continue;
    // A file name or an address ("2.jpeg", "7.co.il"), a footnote mark ("[12]") and a numbered list item ("12. text", "3) text").
    if (after === "." && LATIN_OR_JOINER.test(twoAfter)) continue;
    if (before === "[" && after === "]") continue;
    if ((after === "." || after === ")") && /^[\s]*$/.test(value.slice(value.lastIndexOf("\n", start - 1) + 1, start)) && /\s/.test(twoAfter)) continue;
    if (start > cursor) parts.push({ text: value.slice(cursor, start) });
    parts.push({ text: match[0], number });
    cursor = end;
  }
  if (cursor < value.length) parts.push({ text: value.slice(cursor) });
  return parts.length ? parts : [{ text: value }];
}
