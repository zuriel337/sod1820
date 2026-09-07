import { TANAKH_BOOK_MAP, verseIdentity } from "./tanakhVerseIdentity.js";

const REF_MATCHERS = TANAKH_BOOK_MAP
  .map((book) => ({ ...book, prefix: `${book.hebrewLabel} ` }))
  .sort((a, b) => b.prefix.length - a.prefix.length);

export function verseLocatorFromDisplayRef(ref) {
  if (typeof ref !== "string") return null;
  const text = ref.trim();
  for (const book of REF_MATCHERS) {
    if (!text.startsWith(book.prefix)) continue;
    const tail = text.slice(book.prefix.length);
    const match = tail.match(/^(\d+):(\d+)$/);
    if (!match) return null;
    const chapter = Number(match[1]);
    const verse = Number(match[2]);
    if (!Number.isInteger(chapter) || chapter < 1 || !Number.isInteger(verse) || verse < 1) return null;
    return { bookIdx: book.bookIdx, chapter, verse };
  }
  return null;
}

export function verseIdentityForEngineRow(row, { textWitness = null } = {}) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;

  const opts = textWitness ? { textWitness } : {};
  const direct = verseIdentity(row, opts);
  if (direct) return direct;

  const locator = verseLocatorFromDisplayRef(row.ref);
  if (!locator) return null;
  return verseIdentity(locator, opts);
}

function enrichValue(value, opts) {
  if (Array.isArray(value)) return value.map((item) => enrichValue(item, opts));
  if (!value || typeof value !== "object") return value;

  const identity = verseIdentityForEngineRow(value, opts);
  const out = {};
  for (const [key, child] of Object.entries(value)) out[key] = enrichValue(child, opts);
  if (!identity) return out;

  return {
    ...out,
    verseIdentity: identity.verseIdentity,
    canonicalBookIdentity: identity.canonicalBookIdentity,
    corpusBookKey: identity.corpusBookKey,
    corpusBookIndex: identity.corpusBookIndex,
    verseDisplayRef: identity.displayRef,
    verseSource: identity.source,
  };
}

/**
 * Adds canonical Verse Identity fields to legacy Tanakh-engine JSON without changing/removing
 * existing fields. Unknown/alternate refs remain untouched (fail-closed).
 *
 * This covers the current verse-returning engine/RPC shapes because they expose either
 * {book,chapter,verse,...} or exact live-corpus refs such as "ישעיהו 60:1" inside
 * verses/items/samples/first/last/same_verse and nested NameLab protocol envelopes.
 */
export function enrichTanakhVerseResult(result, opts = {}) {
  return enrichValue(result, opts);
}
