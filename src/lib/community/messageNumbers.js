// Clickable numbers in a Community message. A plain integer written in the message text opens the existing Number page
// (/number/<n>) or, inside the 2029 shell, the existing in-place Number capability; the stored text is never rewritten.
//
// Only an unambiguous integer is a link. These stay ordinary text: dates (10.11.2026), times (14:33), decimals and amounts
// (3.14, 12,50), digit runs joined by a hyphen or slash (054-1234567, 3/4), percentages, numbers glued to Latin letters or
// underscores (A1, 5G, id_7), numbers with a leading zero, zero, and anything longer than nine digits. A thousands group
// (1,158) is read as 1158. An ambiguous run such as "1237,1158" (no space) is left as text rather than guessed.
export const MESSAGE_NUMBER_MAX_DIGITS = 9;
// One-digit numbers are counts, list marks and footnotes far more often than values worth a Number page; the threshold is this one line.
export const MESSAGE_NUMBER_MIN_VALUE = 10;

const NUMBER = /\d{1,3}(?:,\d{3})+(?!\d)|\d+/g;
const DIGIT = /\d/;
const LATIN_OR_JOINER = /[A-Za-z_]/;
// "=" is deliberately not a blocker: it is the writers' own notation ("מיד הימין = 1237", "תעל=812").
const BEFORE_BLOCKERS = /[.,:/\\@#$%&+−]/u;

export function messageNumberValue(raw) {
  const digits = String(raw).replace(/,/g, "");
  if (!/^[1-9]\d*$/.test(digits) || digits.length > MESSAGE_NUMBER_MAX_DIGITS) return null;
  const value = Number(digits);
  return Number.isSafeInteger(value) && value >= MESSAGE_NUMBER_MIN_VALUE ? value : null;
}

// text -> [{ text }, { text, number }, ...] covering the whole string in order.
export function splitMessageNumbers(text = "") {
  const value = String(text);
  const parts = [];
  let cursor = 0;
  for (const match of value.matchAll(NUMBER)) {
    const start = match.index, end = start + match[0].length;
    const before = value[start - 1] || "", twoBefore = value[start - 2] || "";
    const after = value[end] || "", twoAfter = value[end + 1] || "";
    const number = messageNumberValue(match[0]);
    if (number == null) continue;
    if (DIGIT.test(before) || LATIN_OR_JOINER.test(before) || BEFORE_BLOCKERS.test(before)) continue;
    // A hyphen after a digit joins a range or a phone number; after a letter ("ב-1237") it is only a prefix.
    if ((before === "-" || before === "‐" || before === "‑" || before === "‒" || before === "–") && DIGIT.test(twoBefore)) continue;
    if (LATIN_OR_JOINER.test(after) || after === "%" || after === "‰") continue;
    if (/[.,:/\\-]/.test(after) && DIGIT.test(twoAfter)) continue;
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
