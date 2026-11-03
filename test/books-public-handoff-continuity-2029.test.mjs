import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AHAVAT_READER_UNITS, ahavatReaderUnitHref } from "../src/data/ahavatTorahReaderUnits2029.js";
import { bookPreparation } from "../src/data/bookPreparation2029.js";

test("adopted source units stay on the public Ahavat reader and preserve the exact library return", () => {
  const current = "/book/ahavat-torah?reader=source&surface=books-unified-reader&returnTo=%2Fbooks%3Fq%3D%25D7%25AA%25D7%2595%25D7%25A8%25D7%2594%23list&ref=a&ref=b";
  for (const unit of AHAVAT_READER_UNITS) {
    const url = new URL(ahavatReaderUnitHref(unit.id, current), "https://sod1820.co.il");
    assert.equal(url.pathname, "/book/ahavat-torah");
    assert.equal(url.searchParams.get("readerUnit"), unit.id);
    assert.equal(url.searchParams.get("page"), String(unit.page));
    assert.equal(url.searchParams.has("surface"), false);
    assert.equal(url.searchParams.has("reader"), false);
    assert.equal(url.searchParams.get("returnTo"), "/books?q=%D7%AA%D7%95%D7%A8%D7%94#list");
    assert.deepEqual(url.searchParams.getAll("ref"), ["a", "b"]);
    // Existing protected control callers retain their established route.
    const old = new URL(ahavatReaderUnitHref(unit.id), "https://sod1820.co.il");
    assert.equal(old.pathname, "/2029/control");
    assert.equal(old.searchParams.get("surface"), "ahavat-torah-system");
  }
  assert.equal(ahavatReaderUnitHref("fabricated", current), "");
});

test("all eight handoff meters retain their meaning and exact documented values", () => {
  const bundle = JSON.parse(readFileSync(new URL("../public/book-data/books.preparation.json", import.meta.url)));
  assert.deepEqual(Object.fromEntries(Object.entries(bundle.books).map(([slug, value]) => [slug, bookPreparation(value).percent])), {
    "ahavat-torah":59,"daat-tevunot":60,"sefer-yetzirah":54,"sefer-raziel-hamalach":40,"sefer-hapliah":45,"sefer-habahir":56,"maamar-esther":60,"bentov-brief-tour-higher-consciousness":40,
  });
  for (const value of Object.values(bundle.books)) assert.equal(bookPreparation(value).ready, false);
});
