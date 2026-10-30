import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AHAVAT_READER_UNITS as units, ahavatReaderUnit, ahavatReaderUnitDomId, ahavatReaderUnitHref, ahavatReaderQuery } from "../src/data/ahavatTorahReaderUnits2029.js";
import { AHAVAT_PEOPLE_BOOKS, ahavatPeopleRows } from "../src/data/ahavatTorahPeople2029.js";
import { AHAVAT_ROOT_COLUMNS, ahavatRootFragments } from "../src/data/ahavatTorahRoots2029.js";
import { AHAVAT_MEGILLOT, ahavatMegillahRows, ahavatMegillahBalance } from "../src/data/ahavatTorahMegillot2029.js";
import { AHAVAT_TORAH_SOURCE, AHAVAT_TORAH_DATASETS } from "../src/data/ahavatTorahSystem2029.js";

test("all 287 existing source units retain unique stable identifiers and exact legal PDF pages", () => {
  assert.equal(units.length, 287); // 122 attribution + 10 columns + 140 letters + 5 words + 10 totals.
  assert.equal(new Set(units.map(unit => unit.id)).size, units.length);
  assert.equal(new Set(units.map(unit => ahavatReaderUnitDomId(unit.id))).size, units.length);
  for (const unit of units) {
    assert.ok(Object.isFrozen(unit));
    assert.ok(Number.isSafeInteger(unit.page) && unit.page >= 1 && unit.page <= AHAVAT_TORAH_SOURCE.pdfPages);
    assert.ok(AHAVAT_TORAH_DATASETS.find(dataset => dataset.id === unit.datasetId).pages.includes(unit.page));
    const href = new URL(ahavatReaderUnitHref(unit.id), "https://books.invalid");
    assert.equal(href.pathname, "/2029/control");
    assert.equal(href.searchParams.get("surface"), "ahavat-torah-system");
    assert.equal(href.searchParams.get("readerUnit"), unit.id);
    assert.equal(href.searchParams.get("page"), String(unit.page));
    assert.equal(href.searchParams.get("dataset"), unit.datasetId);
    assert.equal(decodeURIComponent(href.hash.slice(1)), ahavatReaderUnitDomId(unit.id));
    assert.ok(!("engine_verified" in unit) && !("count" in unit));
  }
  assert.equal(ahavatReaderUnit("people:bereshit:37").page, 27);
  assert.equal(ahavatReaderUnit("scrolls:esther:פ").page, 42);
  assert.equal(ahavatReaderUnit("scrolls:esther:ף").page, 43);
});

test("link projection preserves source rows, null cells and the unresolved Eicha balance", () => {
  assert.equal(AHAVAT_PEOPLE_BOOKS.flatMap(book => book.rows).flatMap(row => [row.times, row.words]).filter(cell => cell.value === null).length, 1);
  assert.deepEqual(ahavatMegillahRows().filter(row => row.count === null).map(row => row.id), ["kohelet:א", "esther:ב", "esther:ד"]);
  assert.deepEqual(ahavatMegillahBalance("eicha"), { rowTotal: 5784, delta: -190 });
  assert.equal(AHAVAT_MEGILLOT.find(item => item.id === "eicha").letters[1], 5974);
  for (const row of ahavatPeopleRows()) assert.equal(ahavatReaderUnit(`people:${row.id}`).page, row.page);
  for (const kind of ["words", "letters"]) for (const row of ahavatMegillahRows(kind)) assert.equal(ahavatReaderUnit(`scrolls:${row.id}`).page, row.page);
});

test("ten companion column explanations match original bounded OCR identities without turning OCR into quotations", async () => {
  const bundle = JSON.parse(await readFile(new URL("../public/book-data/ahavat-torah.roots.json", import.meta.url), "utf8"));
  assert.deepEqual(AHAVAT_ROOT_COLUMNS.map(column => column.id), bundle.fragments.map(fragment => fragment.id));
  for (const column of AHAVAT_ROOT_COLUMNS) {
    assert.ok(column.explanation.length > 100 && column.title.length > 5);
    assert.equal(ahavatReaderUnit(column.id).page, column.page);
    assert.equal(bundle.fragments.find(fragment => fragment.id === column.id).pdf_page, column.page);
    assert.ok(!("quotation" in column) && !("count" in column));
  }
  const crossed = { ...bundle, fragments: [{ ...bundle.fragments[0], pdf_page: 32 }, ...bundle.fragments.slice(1)] };
  assert.equal(ahavatRootFragments(crossed).length, 9, "an id attached to the wrong source page is not a valid column");
  assert.equal(bundle.status, "navigation_ocr_not_verified_quotation");
});

test("canonical return links preserve matching filters but cannot hide their own target", () => {
  const people = new URL(ahavatReaderUnitHref("people:bereshit:37", "/2029/control?peopleQuery=יעקב&peopleMetric=times&finding=old"), "https://books.invalid");
  assert.equal(people.searchParams.get("peopleQuery"), "יעקב");
  assert.equal(people.searchParams.get("peopleMetric"), "times");
  assert.equal(people.searchParams.get("finding"), null);
  const conflict = new URL(ahavatReaderUnitHref("people:bereshit:37", "/2029/control?peopleQuery=משה"), "https://books.invalid");
  assert.equal(conflict.searchParams.get("peopleQuery"), null);
  const roots = new URL(ahavatReaderUnitHref("roots:35:left", "/2029/control?rootsQuery=other"), "https://books.invalid");
  assert.equal(roots.searchParams.get("rootsOpen"), "1");
  assert.equal(roots.searchParams.get("rootsPage"), "35");
  assert.equal(roots.searchParams.get("rootsQuery"), "other", "the lazy column reader, not an eager OCR import, validates restored root queries");
  const scroll = new URL(ahavatReaderUnitHref("scrolls:esther:ף", "/2029/control?scrollQuery=לאנמצא"), "https://books.invalid");
  assert.equal(scroll.searchParams.get("scrollQuery"), null);
  assert.equal(scroll.searchParams.get("scroll"), "esther");
  assert.equal(scroll.searchParams.get("scrollKind"), "letters");
});

test("invalid unit IDs cannot invent a source locator or an arbitrary fragment", () => {
  for (const id of [null, undefined, "", "roots:70:left", "scrolls:esther:unknown", "people:bereshit:999", "../../profile", "__proto__"]) {
    assert.equal(ahavatReaderUnit(id), null);
    assert.equal(ahavatReaderUnitHref(id), "");
    assert.equal(ahavatReaderUnitDomId(id), "");
  }
  assert.equal(ahavatReaderQuery(new URLSearchParams(), "peopleQuery"), "");
  assert.equal(ahavatReaderQuery(new URLSearchParams({ peopleQuery: "א".repeat(500) }), "peopleQuery").length, 200);
});
