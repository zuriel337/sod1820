// 📖 Tanakh Verse Identity adapter (additive, read-only-derivation, no engine/schema/store change).
//
// Human-Gate (ZURIEL, TANAKH/BOOKS · VERSE IDENTITY ADAPTER V1): canonical Tanakh Book identity = the
// 24 Jewish-canon books. Verse locator/identity preserves the EXISTING 39 corpus-part granularity —
// that is the lossless axis already shared by public.tanach_verses / public/tanakh-verses.json /
// tools/els/data (tk-meta.json bookLetterStart, tk-vchap.txt, tk-vlens.txt) and every live engine
// (fn_verses_by_gematria, fn_ev_verses, fn_name_in_tanach, fn_name_in_verse, fn_name_verse,
// fn_tanach_proximity, fn_tanach_together). The 39 corpus parts are NOT 39 canonical Book identities —
// they are a locator/representation dimension that points back to one of the 24 canonical books.
//
//   canonicalBookIdentity = "book:shmuel"        (24-count, Jewish-canon)
//   corpusBookKey         = "shmuel-a"           (39-count, engine-native, lossless)
//   verseIdentity         = "verse:shmuel-a:3:4" (built over the 39-count key, never the 24-count one)
//
// This mirrors the identity_key ("book:<slug>") + metadata.identity_tiers convention already live on
// nodes.type='book' for research-library books (e.g. book:sefer-yetzirah) — EXTEND_EXISTING, not a new
// naming scheme. See work_log 4d2deb16 (independent audit) for the full live-fact verification this
// module is built from.
//
// FAIL-CLOSED: every resolver here returns null on anything it cannot identify exactly. Nothing here
// ever guesses, normalizes spelling variants, or infers ordering from alphabetic strings — book order
// below is the live book_idx order from public.tanach_verses / tk-meta.json, not alphabetical.
//
// DOES NOT create nodes, does not touch tanach_verses, does not touch the ELS engine, does not rewrite
// any RPC. Pure functions only — safe to unit-test with node:test, no Vite-only imports in this file.

// ── 39-part live corpus order (book_idx 0..38 — verified against public.tanach_verses AND
// tools/els/data/tk-meta.json AND public/tanakh-verses.json, all three identical) ──────────────────
// Each row: [bookIdx, hebrewLabel, corpusPartSlug, canonicalBookSlug, partIndex, partCount]
// partIndex/partCount are 1/1 for a book that is not split at the 24-book canonical level.
const RAW_MAP = [
  [0, "בראשית", "bereshit", "bereshit", 1, 1],
  [1, "שמות", "shmot", "shmot", 1, 1],
  [2, "ויקרא", "vayikra", "vayikra", 1, 1],
  [3, "במדבר", "bamidbar", "bamidbar", 1, 1],
  [4, "דברים", "devarim", "devarim", 1, 1],
  [5, "יהושע", "yehoshua", "yehoshua", 1, 1],
  [6, "שופטים", "shoftim", "shoftim", 1, 1],
  [7, "שמואל א", "shmuel-a", "shmuel", 1, 2],
  [8, "שמואל ב", "shmuel-b", "shmuel", 2, 2],
  [9, "מלכים א", "melachim-a", "melachim", 1, 2],
  [10, "מלכים ב", "melachim-b", "melachim", 2, 2],
  [11, "ישעיהו", "yeshayahu", "yeshayahu", 1, 1],
  [12, "ירמיהו", "yirmiyahu", "yirmiyahu", 1, 1],
  [13, "יחזקאל", "yechezkel", "yechezkel", 1, 1],
  [14, "הושע", "hoshea", "trei-asar", 1, 12],
  [15, "יואל", "yoel", "trei-asar", 2, 12],
  [16, "עמוס", "amos", "trei-asar", 3, 12],
  [17, "עובדיה", "ovadya", "trei-asar", 4, 12],
  [18, "יונה", "yona", "trei-asar", 5, 12],
  [19, "מיכה", "micha", "trei-asar", 6, 12],
  [20, "נחום", "nachum", "trei-asar", 7, 12],
  [21, "חבקוק", "chavakuk", "trei-asar", 8, 12],
  [22, "צפניה", "tzefania", "trei-asar", 9, 12],
  [23, "חגי", "chagai", "trei-asar", 10, 12],
  [24, "זכריה", "zecharia", "trei-asar", 11, 12],
  [25, "מלאכי", "malachi", "trei-asar", 12, 12],
  [26, "תהלים", "tehilim", "tehilim", 1, 1],
  [27, "משלי", "mishlei", "mishlei", 1, 1],
  [28, "איוב", "iyov", "iyov", 1, 1],
  [29, "שיר השירים", "shir-hashirim", "shir-hashirim", 1, 1],
  [30, "רות", "rut", "rut", 1, 1],
  [31, "איכה", "eicha", "eicha", 1, 1],
  [32, "קהלת", "kohelet", "kohelet", 1, 1],
  [33, "אסתר", "ester", "ester", 1, 1],
  [34, "דניאל", "daniel", "daniel", 1, 1],
  [35, "עזרא", "ezra", "ezra-nechemia", 1, 2],
  [36, "נחמיה", "nechemia", "ezra-nechemia", 2, 2],
  [37, "דברי הימים א", "divrei-hayamim-a", "divrei-hayamim", 1, 2],
  [38, "דברי הימים ב", "divrei-hayamim-b", "divrei-hayamim", 2, 2],
];

export const TANAKH_BOOK_MAP = Object.freeze(
  RAW_MAP.map(([bookIdx, hebrewLabel, corpusPartSlug, canonicalBookSlug, partIndex, partCount]) =>
    Object.freeze({
      bookIdx,
      hebrewLabel,
      corpusPartSlug,
      canonicalBookSlug,
      canonicalBookIdentity: `book:${canonicalBookSlug}`,
      partIndex,
      partCount,
    })
  )
);

const BY_HEBREW = new Map(TANAKH_BOOK_MAP.map((e) => [e.hebrewLabel, e]));
const BY_SLUG = new Map(TANAKH_BOOK_MAP.map((e) => [e.corpusPartSlug, e]));

// The 24 canonical books, in first-appearance (book_idx) order — derived, never hand-maintained twice.
export const TANAKH_CANONICAL_BOOKS = Object.freeze(
  Array.from(
    TANAKH_BOOK_MAP.reduce((acc, e) => {
      if (!acc.has(e.canonicalBookSlug)) {
        acc.set(e.canonicalBookSlug, {
          canonicalBookSlug: e.canonicalBookSlug,
          canonicalBookIdentity: e.canonicalBookIdentity,
          partCount: e.partCount,
          corpusPartSlugs: TANAKH_BOOK_MAP.filter((x) => x.canonicalBookSlug === e.canonicalBookSlug).map(
            (x) => x.corpusPartSlug
          ),
        });
      }
      return acc;
    }, new Map())
    .values()
  ).map(Object.freeze)
);

// Two separately-owned text-witness assets for the same (book_idx,chapter,verse) locator — never
// collapse these into "the text" (see work_log 4d2deb16 §9). Purely descriptive, no data fetched here.
export const TANAKH_TEXT_WITNESSES = Object.freeze({
  displayText: "public.tanach_verses.text / public/tanakh-verses.json (spaces + final letter forms)",
  elsDisplayText: "tools/els/data/tk-vtext.txt (display text rebuilt from Sefaria/WLC, verse-aligned)",
  elsSearchStream: "tools/els/data/tk-letters.txt (ELS search-only stream — no spaces/finals, not for display)",
});

export const TANAKH_CORPUS_SOURCE_ID = "sod1820:public.tanach_verses (public/tanakh-verses.json mirror)";

// resolveTanakhBook — accepts any of the native shapes engines already return:
//   number/numeric-string bookIdx · {bookIdx} · {bookIndex} (ELS locateLetter() shape) ·
//   {corpusPartSlug} · {book} (Hebrew display string, exact match only) · a bare Hebrew string.
// Fails closed (null) on anything not an EXACT match — never fuzzy-matches or guesses spelling.
export function resolveTanakhBook(input) {
  if (input == null) return null;
  if (typeof input === "number" || (typeof input === "string" && /^\d+$/.test(input))) {
    const idx = Number(input);
    return TANAKH_BOOK_MAP[idx] ?? null;
  }
  if (typeof input === "string") {
    return BY_HEBREW.get(input.trim()) ?? null;
  }
  if (typeof input === "object") {
    if (Number.isInteger(input.bookIdx)) return TANAKH_BOOK_MAP[input.bookIdx] ?? null;
    if (Number.isInteger(input.bookIndex)) return TANAKH_BOOK_MAP[input.bookIndex] ?? null;
    if (typeof input.corpusPartSlug === "string") return BY_SLUG.get(input.corpusPartSlug.trim()) ?? null;
    if (typeof input.book === "string") return BY_HEBREW.get(input.book.trim()) ?? null;
  }
  return null;
}

// verseIdentity — the one canonical adapter. Input: anything resolveTanakhBook accepts, plus
// chapter/verse (positive integers). Output: a plain, additive envelope — never a node, never written
// anywhere by this function. Returns null (fail-closed) on any unresolved book or invalid chapter/verse.
//
// opts.textWitness — optional, one of TANAKH_TEXT_WITNESSES' keys, ONLY when the caller genuinely knows
// which text asset it read the verse text from. Never inferred/guessed when omitted (stays null).
export function verseIdentity(input, opts = {}) {
  if (!input || typeof input !== "object") return null;
  const book = resolveTanakhBook(input);
  if (!book) return null;
  const chapter = Number(input.chapter);
  const verse = Number(input.verse);
  if (!Number.isInteger(chapter) || chapter < 1) return null;
  if (!Number.isInteger(verse) || verse < 1) return null;

  const textWitness =
    typeof opts.textWitness === "string" && Object.prototype.hasOwnProperty.call(TANAKH_TEXT_WITNESSES, opts.textWitness)
      ? opts.textWitness
      : null;

  return Object.freeze({
    verseIdentity: `verse:${book.corpusPartSlug}:${chapter}:${verse}`,
    canonicalBookIdentity: book.canonicalBookIdentity,
    corpusBookKey: book.corpusPartSlug,
    corpusBookIndex: book.bookIdx,
    chapter,
    verse,
    displayRef: `${book.hebrewLabel} ${chapter}:${verse}`,
    hebrewLabel: book.hebrewLabel,
    partIndex: book.partIndex,
    partCount: book.partCount,
    source: Object.freeze({
      corpusSourceId: TANAKH_CORPUS_SOURCE_ID,
      textWitness,
      textWitnessCandidates: TANAKH_TEXT_WITNESSES,
    }),
  });
}

// verseIdentityFromElsLocator — the thin ELS bridge entry point. Takes the EXACT return shape of
// src/lib/spatial/torahCorpusSource.js's locateLetter(pos): {book,bookIndex,chapter,verse,
// offsetInVerse,verseIndex}. Does not re-derive any letter->verse arithmetic (that stays owned by
// torahCorpusSource.js) — this only normalizes its output into the same Verse Identity as every other
// engine. `corpusIndex` (the absolute letter position that produced `loc`) is optional provenance.
export function verseIdentityFromElsLocator(loc, { corpusIndex = null } = {}) {
  if (!loc) return null;
  const result = verseIdentity({ bookIndex: loc.bookIndex, chapter: loc.chapter, verse: loc.verse });
  if (!result) return null;
  return Object.freeze({
    ...result,
    elsProvenance: Object.freeze({
      corpusIndex,
      offsetInVerse: loc.offsetInVerse ?? null,
      verseIndex: loc.verseIndex ?? null,
    }),
  });
}

// verseIdentitiesForElsPositions — honest multi-letter occurrence handling: an ELS occurrence (e.g. a
// found skip-term) is a SEQUENCE of absolute letter positions, and MAY legitimately span more than one
// verse. This never forces a span into one verse — it returns one Verse Identity per DISTINCT verse
// actually touched (length 1 for the common single-verse case, >1 when the occurrence genuinely spans
// verses), each carrying its own elsProvenance. `locateFn` is the caller's torahCorpusSource.locateLetter
// (not imported here, to keep this module free of Vite-only imports and independently unit-testable).
export function verseIdentitiesForElsPositions(positions, locateFn) {
  const seen = new Map();
  for (const pos of Array.isArray(positions) ? positions : []) {
    const loc = typeof locateFn === "function" ? locateFn(pos) : null;
    if (!loc) continue;
    if (!seen.has(loc.verseIndex)) {
      seen.set(loc.verseIndex, verseIdentityFromElsLocator(loc, { corpusIndex: pos }));
    }
  }
  return Array.from(seen.values());
}
