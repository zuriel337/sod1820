import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getBookReaderManifest } from "../src/data/bookReader2029.js";

const ROOT = new URL("../", import.meta.url);
const readText = path => readFile(new URL(path, ROOT), "utf8");
const readJson = async path => JSON.parse(await readText(path));

const EXPECTED_RANGES = {
  edition: [1, 4],
  opening: [5, 8],
  "chapter-1": [9, 24],
  "chapter-2": [25, 36],
  "chapter-3": [37, 42],
  "chapter-4": [43, 50],
  "chapter-5": [51, 55],
  "chapter-6": [56, 61],
  "chapter-7": [62, 64],
  "chapter-8": [65, 69],
  "chapter-9": [70, 82],
  "chapter-10": [83, 84],
};

test("Maamar Esther internal map covers every source page with stable source anchors", async () => {
  const map = await readJson("public/book-data/maamar-esther.internal-map.json");
  assert.equal(map.schema_version, "maamar-esther-internal-map.v1");
  assert.equal(map.book_slug, "maamar-esther");
  assert.equal(map.coverage.status, "complete_source_anchored_map");
  assert.equal(map.coverage.mapped_pdf_pages, 84);
  assert.ok(map.coverage.internal_units >= 84);
  assert.deepEqual([...new Set(map.units.map(unit => unit.pdf_page))], Array.from({ length: 84 }, (_, index) => index + 1));

  const ids = new Set(map.units.map(unit => unit.id));
  assert.equal(ids.size, map.units.length);
  for (const unit of map.units) {
    assert.match(unit.id, /^maamar-esther-(?:edition|opening|chapter-\d+)-p\d{2}-u\d{2}$/);
    assert.ok(unit.pdf_page >= 1 && unit.pdf_page <= 84, unit.id);
    assert.equal(unit.source_anchor, `#page=${unit.pdf_page}&view=FitH`, unit.id);
    assert.match(unit.source_url, new RegExp(`#page=${unit.pdf_page}&view=FitH$`), unit.id);
    assert.ok(unit.source_focus.length > 5, unit.id);
    assert.ok(unit.question.length > 10, unit.id);
    assert.ok(unit.argument_steps.length >= 2, unit.id);
    assert.ok(unit.conclusion.length > 10, unit.id);
    assert.ok(unit.companion_explanation.length > 50, unit.id);
    assert.ok(unit.related_unit_ids.every(id => ids.has(id)), unit.id);
  }
});

test("Maamar Esther map preserves the approved chapter ranges", async () => {
  const map = await readJson("public/book-data/maamar-esther.internal-map.json");
  assert.deepEqual(map.chapters.map(chapter => chapter.id), Object.keys(EXPECTED_RANGES));
  for (const chapter of map.chapters) {
    assert.deepEqual([chapter.from, chapter.to], EXPECTED_RANGES[chapter.id]);
    assert.ok(chapter.unit_ids.length > 0, chapter.id);
    const chapterUnits = map.units.filter(unit => unit.chapter_id === chapter.id);
    assert.deepEqual(chapterUnits.map(unit => unit.id), chapter.unit_ids);
    assert.ok(chapterUnits.every(unit => unit.pdf_page >= chapter.from && unit.pdf_page <= chapter.to));
  }
});

test("quotes are opt-in and extraction never claims engine verification", async () => {
  const map = await readJson("public/book-data/maamar-esther.internal-map.json");
  const quoted = map.units.filter(unit => unit.source_quote);
  assert.equal(quoted.length, 3);
  assert.ok(quoted.every(unit => unit.quote_status === "visually_readable_in_source_page"));
  assert.ok(map.units.filter(unit => !unit.source_quote).every(unit => unit.quote_status === "not_asserted"));
  assert.doesNotMatch(JSON.stringify(map), /מאומת במנוע/);
  assert.equal(map.display_contract.source_text, "דברי הספר");
  assert.equal(map.display_contract.companion, "הסבר נלווה");
  assert.match(map.display_contract.extraction, /לא תחליף/);
});

test("the internal map is discoverable but lazy-loaded from the unified reader", async () => {
  const [readerSource, mapSource] = await Promise.all([
    readText("src/components/books2029/BookSourceReader2029.jsx"),
    readText("src/components/books2029/MaamarEstherInternalMap2029.jsx"),
  ]);
  const manifest = getBookReaderManifest("maamar-esther");
  assert.equal(manifest.internalMapUrl, "/book-data/maamar-esther.internal-map.json");
  assert.match(readerSource, /lazy\(\s*\(\) => import\("\.\/MaamarEstherInternalMap2029\.jsx"\)/s);
  assert.match(readerSource, /showInternalMap \? <Suspense/);
  assert.match(mapSource, /חיפוש לפי פסוק, דמות, מקור או מושג/);
  assert.match(mapSource, /פתח את עמוד \{currentUnit\.pdf_page\} בדברי הספר/);
  assert.match(mapSource, /טקסט חילוץ · לא תחליף ל־PDF/);
});
