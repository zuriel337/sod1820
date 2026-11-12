// Numbers inside a public group-source message become links to their Number page (ZURIEL 12.11.2026: Kandro, Levi and Zvi write numbers
// such as 1237 in their messages and the reader should be able to tap them). A display rule only: it never changes the stored or
// redacted text, never makes a number "found" or "verified", and never calls anything. The reader already redacts phone-like runs.
//
// A number is a standalone integer of 2-5 digits without a leading zero. NOT a number here: a part of a date, time, decimal, range
// or phone-like group (10.11.2026, 22:41, 3.14, 050-0000000), a part of a word or id (abc123), anything inside a web address.
const LINKABLE = /(?<![\d.,:/\\_A-Za-z-])(?:[1-9]\d{1,4})(?![\d_A-Za-z]|[.,:/\\-]\d|%)/gu;
// "ב־1237" / "ל-358": a hyphen or maqaf after a Hebrew letter still starts a number; after a digit it is a range.
const HEBREW_PREFIXED = /(?<=[א-ת][\-־])(?:[1-9]\d{1,4})(?![\d_A-Za-z]|[.,:/\\-]\d|%)/gu;
const ADDRESS = /(?:https?:\/\/|www\.)\S+|(?:youtube\.com|youtu\.be)\/\S+/giu;

export const numberHref = (value) => `/number/${encodeURIComponent(String(value))}`;

/** Segments of one message: { text } or { number, text }. Concatenating every `text` gives the original string back. */
export function splitGroupMessageNumbers(input) {
  const text = input == null ? "" : String(input);
  if (!text) return [];
  const blocked = [];
  for (const m of text.matchAll(ADDRESS)) blocked.push([m.index, m.index + m[0].length]);
  const inAddress = (start, end) => blocked.some(([a, b]) => start < b && end > a);
  const hits = new Map();
  for (const re of [LINKABLE, HEBREW_PREFIXED]) {
    for (const m of text.matchAll(re)) {
      const start = m.index, end = start + m[0].length;
      if (!inAddress(start, end)) hits.set(start, end);
    }
  }
  const out = [];
  let at = 0;
  for (const start of [...hits.keys()].sort((a, b) => a - b)) {
    const end = hits.get(start);
    if (start < at) continue;
    if (start > at) out.push({ text: text.slice(at, start) });
    out.push({ number: Number(text.slice(start, end)), text: text.slice(start, end) });
    at = end;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}
