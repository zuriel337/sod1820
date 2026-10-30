import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { AHAVAT_COMPANION_PAGE_COUNTS, AHAVAT_TORAH_SOURCE, AHAVAT_TORAH_PIPELINE, ahavatCompanionReadingUnits } from "../src/data/ahavatTorahSystem2029.js";
import { AHAVAT_READER_UNITS, ahavatReaderUnit, ahavatReaderUnitHref } from "../src/data/ahavatTorahReaderUnits2029.js";
import { AHAVAT_PUBLIC_READING_BASE_DIGEST, AHAVAT_PUBLIC_READING_EDITS, ahavatBeforePublicReading } from "./fixtures/ahavat-public-reading-baseline-2029.mjs";

const read = file => readFileSync(new URL(`../${file}`, import.meta.url));
const hash = value => createHash("sha256").update(value).digest("hex");
const bundle = JSON.parse(read("public/book-data/ahavat-torah.commentary.json"));
const page = read("src/pages/AhavatTorahSystem2029Page.jsx").toString();

test("public prose changes exactly eight reviewed companion fields; every other field retains the preceding delivery", () => {
  assert.equal(AHAVAT_PUBLIC_READING_EDITS.length, 8);
  assert.equal(new Set(AHAVAT_PUBLIC_READING_EDITS.map(edit => `${edit.id}.${edit.field}`)).size, 8);
  for (const edit of AHAVAT_PUBLIC_READING_EDITS) {
    const unit = bundle.pages[edit.page - 1].companion_units.find(unit => unit.id === edit.id);
    assert.equal(unit[edit.field], edit.after, edit.id);
    assert.notEqual(edit.after, edit.before);
    assert.deepEqual(edit.after.match(/\d[\d,.]*/g), edit.before.match(/\d[\d,.]*/g), "no changed numeric reading");
    assert.ok(["explanation", "takeaway"].includes(edit.field));
  }
  const historical = { ...bundle, pages: bundle.pages.map(ahavatBeforePublicReading) };
  assert.equal(hash(JSON.stringify(historical)), AHAVAT_PUBLIC_READING_BASE_DIGEST);
  // This is an exact historical replay, not a permissive field exclusion.
  const bad = structuredClone(bundle.pages[4]);
  bad.companion_units[0].explanation += " changed";
  assert.equal(ahavatBeforePublicReading(bad).companion_units[0].explanation, bad.companion_units[0].explanation);
});

test("all selected lessons remain source-bound, distinct from original research coverage and free of system-directed prose", () => {
  let lessons = 0;
  for (const record of bundle.pages) {
    const units = ahavatCompanionReadingUnits(bundle, record.pdf_page);
    assert.equal(units.length, AHAVAT_COMPANION_PAGE_COUNTS[record.pdf_page] || 0);
    for (const unit of units) {
      lessons++;
      assert.equal(ahavatReaderUnit(unit.id).page, record.pdf_page);
      assert.equal(unit.source_anchor, `#page=${record.pdf_page}&view=FitH`);
      assert.doesNotMatch(`${unit.question} ${unit.explanation} ${unit.takeaway}`, /של המערכת|שהמערכת|מערכת העתידית|לוח זמנים קנוני/);
    }
  }
  assert.equal(lessons, 267);
  assert.equal(Object.keys(AHAVAT_COMPANION_PAGE_COUNTS).length, 98);
  assert.equal(AHAVAT_TORAH_SOURCE.pdfPages, 99);
  assert.equal(AHAVAT_TORAH_SOURCE.deepReadPages, 15);
  assert.equal(bundle.coverage.deep_research_pages, 15);
  assert.equal(AHAVAT_READER_UNITS.length, 287);
  assert.equal(bundle.pages[44].companion_units, undefined);
});

test("printed source, OCR and numeric tables are byte-identical; publication and engine status do not change", () => {
  for (const [name, expected] of Object.entries({
    "ahavat-torah.tables.json": "70b487b51ec7a61a0864563da03d063107441853c8716e4f4eb1247a546c0e53",
    "ahavat-torah.page-text.json": "5dfa0a866c71fd983e8f2f6fe45c8713e65155bacfbb6344ac7dbbcd6ae236d0",
    "ahavat-torah.roots.json": "c4dc52ea138c99ed33bee9de274e78b0c041fc69fa60b25e95f0224be28108f8",
  })) assert.equal(hash(read(`public/book-data/${name}`)), expected, name);
  assert.equal(bundle.source_pdf_sha256, "895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b");
  assert.equal(AHAVAT_TORAH_PIPELINE.at(-1).value, "0");
  assert.equal(AHAVAT_TORAH_PIPELINE.at(-1).state, "locked");
  assert.match(page, /status="Preview מוגן · קריאה בלבד"/);
  assert.match(page, /data-publication-effect="none"/);
  assert.match(page, /noindex:\s*true/);
  assert.doesNotMatch(page, /\.rpc\(|\.from\(["']|insert|update\(/i);
});

test("entry offers real deep lessons through canonical source identities, not a second reader", () => {
  assert.match(page, /aria-label="מאיפה מתחילים ללמוד"/);
  for (const id of ["ahavat-migdal-p006-01", "ahavat-novellae-p046-02", "ahavat-novellae-p093-03"]) {
    assert.ok(page.includes(`ahavatReaderUnitHref("${id}")`));
    const unit = ahavatReaderUnit(id);
    const url = new URL(ahavatReaderUnitHref(id), "https://books.invalid");
    assert.equal(url.searchParams.get("readerUnit"), id);
    assert.equal(url.searchParams.get("page"), String(unit.page));
    assert.equal(url.searchParams.get("surface"), "ahavat-torah-system");
  }
  assert.match(page, /יחידות הסבר נבחרות/);
  assert.match(page, /Object\.values\(AHAVAT_COMPANION_PAGE_COUNTS\)/);
  assert.doesNotMatch(page, /מפת עבודה|השלב הבא למאגר הזה|המערכת שאנחנו בונים|למערכת העתידית/);
  assert.match(page, /<summary>פרטי המקור ומצב המחקר<\/summary>/);
  assert.match(page, /<summary>פרטי המקור והמשך הבדיקה<\/summary>/);
  assert.match(page, /<summary>פרטי המקור והבדיקה<\/summary><p>מעמד חישוב:/);
});
