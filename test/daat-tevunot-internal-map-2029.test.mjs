import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getBookReaderManifest } from "../src/data/bookReader2029.js";
import { DAAT_TEVUNOT_SECTIONS } from "../src/data/daatTevunotSections2029.js";

const ROOT = new URL("../", import.meta.url);
const readText = path => readFile(new URL(path, ROOT), "utf8");
const readJson = async path => JSON.parse(await readText(path));

test("Daat Tevunot internal map covers all 99 PDF pages without inventing sections", async () => {
  const map = await readJson("public/book-data/daat-tevunot.internal-map.json");
  assert.equal(map.schema_version, "daat-tevunot-internal-map.v1");
  assert.equal(map.book_slug, "daat-tevunot");
  assert.deepEqual(map.coverage, {
    pdf_pages: 99,
    mapped_pdf_pages: 99,
    internal_units: 229,
    source_sections: 195,
    source_quoted_units: 195,
    status: "complete_source_anchored_map",
  });
  assert.deepEqual([...new Set(map.units.map(unit => unit.pdf_page))], Array.from({ length: 99 }, (_, index) => index + 1));
  assert.equal(map.units.filter(unit => unit.kind === "section_continuation_page").length, 31);
  assert.equal(map.units.filter(unit => unit.kind === "edition_matter").length, 3);
  assert.equal(map.units.filter(unit => unit.section_id && unit.kind !== "section_continuation_page").length, 195);
});

test("all 195 licensed source sections stay exact and source-anchored", async () => {
  const map = await readJson("public/book-data/daat-tevunot.internal-map.json");
  const sourceUnits = map.units.filter(unit => unit.quote_status === "licensed_source_section");
  assert.deepEqual(sourceUnits.map(unit => unit.section_id), Array.from({ length: 195 }, (_, index) => index + 1));
  for (const [index, unit] of sourceUnits.entries()) {
    const section = DAAT_TEVUNOT_SECTIONS[index];
    assert.equal(unit.section_marker, section.marker, unit.id);
    assert.equal(unit.speaker, section.speaker, unit.id);
    assert.equal(unit.pdf_page, section.pdfPage, unit.id);
    assert.equal(unit.source_quote, section.sourceText, unit.id);
    assert.equal(unit.source_anchor, `#page=${section.pdfPage}&view=FitH`, unit.id);
    assert.match(unit.source_url, new RegExp(`#page=${section.pdfPage}&view=FitH$`), unit.id);
    assert.ok(unit.argument_steps.length >= 3, unit.id);
    assert.ok(unit.companion_explanation.length > 100, unit.id);
  }
});

test("the governance tree remains typed and interpretation does not become source", async () => {
  const map = await readJson("public/book-data/daat-tevunot.internal-map.json");
  const judgment = map.units.find(unit => unit.section_id === 138 && unit.kind === "dialogue_explanation");
  assert.equal(judgment.chapter_title, "הנהגת המשפט");
  assert.deepEqual(judgment.cited_sources, ["דברים ח. ה", "משלי יג, כד", "ע\"ז ג ע\"ב"]);
  assert.deepEqual(judgment.governance_axes, ["הנהגת המשפט", "שכר ועונש", "זמן ותיקון כללי"]);
  assert.deepEqual(judgment.world_lenses, ["בריאה", "יצירה", "עשייה"]);
  assert.equal(judgment.world_lens_status, "interpretive_candidate");
  assert.equal(map.source_license, "CC BY-SA 4.0");
  assert.equal(map.display_contract.source_text, "דברי הספר");
  assert.equal(map.display_contract.companion, "הסבר נלווה");
  assert.doesNotMatch(JSON.stringify(map), /מאומת במנוע/);
});

test("the unified reader lazy-loads the Daat Tevunot map", async () => {
  const [readerSource, mapSource] = await Promise.all([
    readText("src/components/books2029/BookSourceReader2029.jsx"),
    readText("src/components/books2029/MaamarEstherInternalMap2029.jsx"),
  ]);
  const manifest = getBookReaderManifest("daat-tevunot");
  assert.equal(manifest.internalMapUrl, "/book-data/daat-tevunot.internal-map.json");
  assert.match(readerSource, /lazy\(\s*\(\) => import\("\.\/MaamarEstherInternalMap2029\.jsx"\)/s);
  assert.match(readerSource, /showInternalMap \? <Suspense/);
  assert.match(mapSource, /copy\.title/);
  assert.match(mapSource, /currentUnit\.governance_axes/);
  assert.match(mapSource, /currentUnit\.world_lenses/);
});
