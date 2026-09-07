// Tanakh Verse Identity adapter tests — pure logic, no network, no live DB, no ELS engine required.
// Run with: node --test src/lib/research/tanakhVerseIdentity.test.js
//
// ELS Golden Case H reuses the REAL captured fixture from src/lib/spatial/torahElsPathFixture.js
// (production tzofen.html search, independently re-verified against tk-letters.txt — see that file's
// own provenance header) rather than inventing a synthetic locator.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TANAKH_BOOK_MAP,
  TANAKH_CANONICAL_BOOKS,
  resolveTanakhBook,
  verseIdentity,
  verseIdentityFromElsLocator,
  verseIdentitiesForElsPositions,
} from "./tanakhVerseIdentity.js";
import { TORAH_ELS_PATH_FIXTURE } from "../spatial/torahElsPathFixture.js";

// ── Structural invariants ────────────────────────────────────────────────────────────────────────

test("39 corpus rows, each mapped exactly once, book_idx 0..38 sequential", () => {
  assert.equal(TANAKH_BOOK_MAP.length, 39);
  TANAKH_BOOK_MAP.forEach((e, i) => assert.equal(e.bookIdx, i));
});

test("exactly 24 canonical Book identities are produced", () => {
  const slugs = new Set(TANAKH_BOOK_MAP.map((e) => e.canonicalBookSlug));
  assert.equal(slugs.size, 24);
  assert.equal(TANAKH_CANONICAL_BOOKS.length, 24);
});

test("no duplicate corpus-part slugs", () => {
  const slugs = TANAKH_BOOK_MAP.map((e) => e.corpusPartSlug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("the 5 split canonical books map to the correct corpus parts, in live book_idx order", () => {
  const partsOf = (slug) => TANAKH_BOOK_MAP.filter((e) => e.canonicalBookSlug === slug).map((e) => e.corpusPartSlug);
  assert.deepEqual(partsOf("shmuel"), ["shmuel-a", "shmuel-b"]);
  assert.deepEqual(partsOf("melachim"), ["melachim-a", "melachim-b"]);
  assert.deepEqual(partsOf("ezra-nechemia"), ["ezra", "nechemia"]);
  assert.deepEqual(partsOf("divrei-hayamim"), ["divrei-hayamim-a", "divrei-hayamim-b"]);
  assert.deepEqual(partsOf("trei-asar"), [
    "hoshea", "yoel", "amos", "ovadya", "yona", "micha",
    "nachum", "chavakuk", "tzefania", "chagai", "zecharia", "malachi",
  ]);
});

// ── resolveTanakhBook: multiple native shapes, fail-closed on anything unresolved ──────────────────

test("resolveTanakhBook accepts bookIdx, bookIndex (ELS shape), corpusPartSlug, and exact Hebrew string", () => {
  assert.equal(resolveTanakhBook({ bookIdx: 0 }).corpusPartSlug, "bereshit");
  assert.equal(resolveTanakhBook({ bookIndex: 7 }).corpusPartSlug, "shmuel-a");
  assert.equal(resolveTanakhBook({ corpusPartSlug: "shmuel-b" }).bookIdx, 8);
  assert.equal(resolveTanakhBook({ book: "ישעיהו" }).bookIdx, 11);
  assert.equal(resolveTanakhBook("תהלים").bookIdx, 26);
  assert.equal(resolveTanakhBook(26).corpusPartSlug, "tehilim");
});

test("resolveTanakhBook fails closed — never guesses spelling or out-of-range input", () => {
  assert.equal(resolveTanakhBook({ book: "תהילים" }), null); // alt spelling, NOT auto-resolved
  assert.equal(resolveTanakhBook({ bookIdx: 39 }), null);
  assert.equal(resolveTanakhBook({ bookIdx: -1 }), null);
  assert.equal(resolveTanakhBook({ book: "ספר שלא קיים" }), null);
  assert.equal(resolveTanakhBook(null), null);
  assert.equal(resolveTanakhBook(undefined), null);
});

// ── Golden Cases A–G ─────────────────────────────────────────────────────────────────────────────

test("Golden Case A — בראשית א:א (Torah)", () => {
  const r = verseIdentity({ book: "בראשית", chapter: 1, verse: 1 });
  assert.equal(r.verseIdentity, "verse:bereshit:1:1");
  assert.equal(r.canonicalBookIdentity, "book:bereshit");
  assert.equal(r.corpusBookKey, "bereshit");
  assert.equal(r.displayRef, "בראשית 1:1");
});

test("Golden Case B — ישעיהו ס:א / 60:1 (Nevi'im)", () => {
  const r = verseIdentity({ book: "ישעיהו", chapter: 60, verse: 1 });
  assert.equal(r.verseIdentity, "verse:yeshayahu:60:1");
  assert.equal(r.canonicalBookIdentity, "book:yeshayahu");
});

test("Golden Case C — תהלים קיט:א / 119:1 (Ketuvim)", () => {
  const r = verseIdentity({ book: "תהלים", chapter: 119, verse: 1 });
  assert.equal(r.verseIdentity, "verse:tehilim:119:1");
  assert.equal(r.canonicalBookIdentity, "book:tehilim");
});

test("Golden Case D/E — שמואל א ג:ד and שמואל ב ג:ד must NOT collide, but share one canonical Book", () => {
  const d = verseIdentity({ book: "שמואל א", chapter: 3, verse: 4 });
  const e = verseIdentity({ book: "שמואל ב", chapter: 3, verse: 4 });
  assert.equal(d.verseIdentity, "verse:shmuel-a:3:4");
  assert.equal(e.verseIdentity, "verse:shmuel-b:3:4");
  assert.notEqual(d.verseIdentity, e.verseIdentity);
  assert.equal(d.canonicalBookIdentity, "book:shmuel");
  assert.equal(e.canonicalBookIdentity, "book:shmuel");
  assert.equal(d.canonicalBookIdentity, e.canonicalBookIdentity);
});

test("Golden Case F — עובדיה א:א (one Trei Asar corpus-part)", () => {
  const r = verseIdentity({ book: "עובדיה", chapter: 1, verse: 1 });
  assert.equal(r.verseIdentity, "verse:ovadya:1:1");
  assert.equal(r.canonicalBookIdentity, "book:trei-asar");
  assert.equal(r.partIndex, 4);
  assert.equal(r.partCount, 12);
});

test("Golden Case G — עזרא א:א (Ezra-Nechemia corpus-part)", () => {
  const r = verseIdentity({ book: "עזרא", chapter: 1, verse: 1 });
  assert.equal(r.verseIdentity, "verse:ezra:1:1");
  assert.equal(r.canonicalBookIdentity, "book:ezra-nechemia");
});

// ── Golden Case H — ELS letter position → locateLetter()-shaped locator → Verse Identity round-trip ─
// Uses the REAL captured fixture (torahElsPathFixture.js): term "משיח" at Torah letter positions
// 13936/13944/13952/13960, independently verified to land in בראשית 11:29. We reconstruct the exact
// `loc` shape torahCorpusSource.locateLetter() returns for that fixture's expected locator, so this
// test exercises the bridge/adapter logic without needing the Vite-only tk-letters.txt raw import.

test("Golden Case H — ELS letter position round-trips to Verse Identity (real fixture, single verse)", () => {
  const { positions, expectedLocator } = TORAH_ELS_PATH_FIXTURE;
  const locateFn = (pos) => {
    if (!positions.includes(pos)) return null;
    return { book: expectedLocator.book, bookIndex: 0, chapter: expectedLocator.chapter, verse: expectedLocator.verse, offsetInVerse: 0, verseIndex: 42 };
  };
  const single = verseIdentityFromElsLocator(locateFn(positions[0]), { corpusIndex: positions[0] });
  assert.equal(single.verseIdentity, "verse:bereshit:11:29");
  assert.equal(single.canonicalBookIdentity, "book:bereshit");
  assert.equal(single.elsProvenance.corpusIndex, positions[0]);

  // All 4 letters of the fixture land in the SAME verse — honest single-verse result, not forced.
  const all = verseIdentitiesForElsPositions(positions, locateFn);
  assert.equal(all.length, 1);
  assert.equal(all[0].verseIdentity, "verse:bereshit:11:29");
});

test("multi-verse ELS occurrence is preserved honestly — never collapsed to one verse", () => {
  const locateFn = (pos) =>
    pos === 1
      ? { book: "בראשית", bookIndex: 0, chapter: 1, verse: 1, offsetInVerse: 0, verseIndex: 0 }
      : { book: "בראשית", bookIndex: 0, chapter: 1, verse: 2, offsetInVerse: 0, verseIndex: 1 };
  const result = verseIdentitiesForElsPositions([1, 2], locateFn);
  assert.equal(result.length, 2);
  assert.deepEqual(
    result.map((r) => r.verseIdentity),
    ["verse:bereshit:1:1", "verse:bereshit:1:2"]
  );
});

// ── Determinism + fail-closed on malformed input ────────────────────────────────────────────────

test("same native locator always produces the same identity (determinism)", () => {
  const a = verseIdentity({ bookIdx: 7, chapter: 3, verse: 4 });
  const b = verseIdentity({ book: "שמואל א", chapter: 3, verse: 4 });
  assert.deepEqual(a, b);
});

test("malformed/unknown locators fail honestly — never guess", () => {
  assert.equal(verseIdentity({ book: "בראשית", chapter: 0, verse: 1 }), null);
  assert.equal(verseIdentity({ book: "בראשית", chapter: 1, verse: 0 }), null);
  assert.equal(verseIdentity({ book: "בראשית", chapter: "א", verse: 1 }), null);
  assert.equal(verseIdentity({ book: "לא קיים", chapter: 1, verse: 1 }), null);
  assert.equal(verseIdentity({ bookIdx: 39, chapter: 1, verse: 1 }), null);
  assert.equal(verseIdentity(null), null);
  assert.equal(verseIdentityFromElsLocator(null), null);
});
