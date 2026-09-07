import { test } from "node:test";
import assert from "node:assert/strict";
import {
  enrichTanakhVerseResult,
  verseIdentityForEngineRow,
  verseLocatorFromDisplayRef,
} from "./tanakhVerseResultAdapter.js";

test("display ref parser resolves exact live corpus refs only", () => {
  assert.deepEqual(verseLocatorFromDisplayRef("ישעיהו 60:1"), { bookIdx: 11, chapter: 60, verse: 1 });
  assert.deepEqual(verseLocatorFromDisplayRef("שמואל א 3:4"), { bookIdx: 7, chapter: 3, verse: 4 });
  assert.equal(verseLocatorFromDisplayRef("תהילים 119:1"), null);
  assert.equal(verseLocatorFromDisplayRef("ישעיהו ס:א"), null);
});

test("direct engine row gets the same canonical identity as foundation adapter", () => {
  const id = verseIdentityForEngineRow({ book: "שמואל ב", chapter: 3, verse: 4, text: "x" });
  assert.equal(id.verseIdentity, "verse:shmuel-b:3:4");
  assert.equal(id.canonicalBookIdentity, "book:shmuel");
});

test("legacy ref-only row is enriched additively", () => {
  const raw = { ref: "ישעיהו 60:1", text: "קומי אורי", score: 7 };
  const out = enrichTanakhVerseResult(raw);
  assert.equal(out.ref, raw.ref);
  assert.equal(out.text, raw.text);
  assert.equal(out.score, raw.score);
  assert.equal(out.verseIdentity, "verse:yeshayahu:60:1");
  assert.equal(out.canonicalBookIdentity, "book:yeshayahu");
});

test("nested NameLab-like result families are enriched without changing shape", () => {
  const raw = {
    first: { ref: "בראשית 1:1", text: "א" },
    last: { ref: "דברי הימים ב 36:23", text: "ב" },
    samples: [{ ref: "שמואל א 3:4", text: "ג" }],
    same_verse: [{ ref: "עובדיה 1:1", text: "ד" }],
    same_chapter: [{ ref: "ישעיהו 60", verses: 2 }],
  };
  const out = enrichTanakhVerseResult(raw);
  assert.equal(out.first.verseIdentity, "verse:bereshit:1:1");
  assert.equal(out.last.verseIdentity, "verse:divrei-hayamim-b:36:23");
  assert.equal(out.samples[0].verseIdentity, "verse:shmuel-a:3:4");
  assert.equal(out.same_verse[0].canonicalBookIdentity, "book:trei-asar");
  assert.equal(out.same_chapter[0].verseIdentity, undefined);
  assert.deepEqual(out.same_chapter[0], raw.same_chapter[0]);
});

test("unknown/alternate refs stay untouched and never receive guessed identity", () => {
  const raw = { items: [{ ref: "תהילים 119:1", text: "x" }, { ref: "לא קיים 1:1", text: "y" }] };
  const out = enrichTanakhVerseResult(raw);
  assert.equal(out.items[0].verseIdentity, undefined);
  assert.equal(out.items[1].verseIdentity, undefined);
  assert.deepEqual(out, raw);
});

test("input is not mutated", () => {
  const row = Object.freeze({ ref: "מלכים א 1:1", text: "x" });
  const raw = Object.freeze({ verses: Object.freeze([row]) });
  const out = enrichTanakhVerseResult(raw);
  assert.equal(out.verses[0].verseIdentity, "verse:melachim-a:1:1");
  assert.equal(raw.verses[0].verseIdentity, undefined);
});
