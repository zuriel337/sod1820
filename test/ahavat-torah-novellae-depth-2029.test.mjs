import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ahavatCompanionReadingUnits } from "../src/data/ahavatTorahSystem2029.js";
import { AHAVAT_READER_UNITS, ahavatReaderUnit, ahavatReaderUnitHref, ahavatReaderUnitDomId } from "../src/data/ahavatTorahReaderUnits2029.js";

const bundle = JSON.parse(readFileSync(new URL("../public/book-data/ahavat-torah.commentary.json", import.meta.url), "utf8"));
const expanded = bundle.pages.filter(page => page.companion_units);

test("selected novellae passages extend the existing companion without replacing any page or source identity", () => {
  assert.equal(bundle.source_pdf_sha256, "895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b");
  assert.deepEqual(bundle.pages.map(page => page.pdf_page), Array.from({ length: 99 }, (_, i) => i + 1));
  assert.equal(bundle.coverage.deep_research_pages, 15, "original source-research coverage is a separate axis");
  assert.deepEqual(bundle.coverage.visual_or_blank_pages, [45]);
  const preserved = bundle.pages.filter(page => page.pdf_page < 71 || page.pdf_page > 92);
  assert.equal(createHash("sha256").update(JSON.stringify(preserved)).digest("hex"), "549b8c6672a5da37222716f22952cae6f49e77a3cfe8d47a56ed79261c526f8c");
  const firstContinuation = bundle.pages.filter(page => page.pdf_page >= 71 && page.pdf_page <= 80);
  assert.equal(createHash("sha256").update(JSON.stringify(firstContinuation)).digest("hex"), "ad73603936cd33d1329a7f10d8896b211369c25b677629038bf83b56abb30a90");
  for (const page of bundle.pages) {
    assert.equal(page.work_id, `ahavat-torah-pdf-${page.pdf_page}`);
    assert.equal(page.source_anchor, `#page=${page.pdf_page}&view=FitH`);
  }
});

test("expanded pages have three distinct companion units with stable IDs and exact source pages", () => {
  assert.deepEqual(expanded.map(page => page.pdf_page), Array.from({ length: 47 }, (_, i) => i + 46));
  const ids = [];
  for (const page of expanded) {
    assert.ok(page.pdf_page >= 46 && page.pdf_page <= 92);
    assert.equal(page.companion_units.length, 3);
    assert.deepEqual(page.reading_points, page.companion_units.map(unit => unit.title));
    for (const [index, unit] of page.companion_units.entries()) {
      assert.equal(unit.id, `ahavat-novellae-p${String(page.pdf_page).padStart(3, "0")}-${String(index + 1).padStart(2, "0")}`);
      assert.equal(unit.pdf_page, page.pdf_page);
      assert.equal(unit.source_anchor, page.source_anchor);
      assert.equal(unit.display_label, "הסבר נלווה");
      assert.equal(unit.source_basis, "embedded_text_and_visual_page_review");
      assert.equal(unit.scope, "selected_passage_not_exhaustive");
      assert.ok(unit.title.length > 8 && unit.question.length > 20 && unit.explanation.length > 140 && unit.takeaway.length > 35);
      assert.ok(!("quote" in unit) && !("engine_verified" in unit) && !("count" in unit));
      ids.push(unit.id);
    }
  }
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, 141);
  assert.doesNotMatch(JSON.stringify(expanded), /מאומת במנוע/);
});

test("expanded content replaces generic orientation with page-specific lines of interpretation", () => {
  for (const page of expanded) {
    assert.doesNotMatch(page.companion_explanation, /עמוד זה נמצא בשער/);
    assert.ok(page.companion_explanation.length > 180);
  }
  assert.match(bundle.pages[45].companion_units[1].explanation, /האותיות|המחבר קורא/);
  assert.match(bundle.pages[47].companion_units[0].explanation, /מחסור|רעיונות/);
  assert.match(bundle.pages[49].companion_units[1].explanation, /בועז/);
});

test("all 141 companion links reuse exact return without inventing table ownership or changing the 287 source units", () => {
  assert.equal(AHAVAT_READER_UNITS.length, 287);
  for (const page of expanded) for (const unit of ahavatCompanionReadingUnits(bundle, page.pdf_page)) {
    const identity = ahavatReaderUnit(unit.id);
    assert.equal(identity.page, unit.pdf_page);
    assert.equal(identity.layer, "companion");
    assert.equal(identity.datasetId, "");
    assert.equal(identity.sectionId, "ahavat29-full-reader");
    const url = new URL(ahavatReaderUnitHref(unit.id, "/2029/control?dataset=DS-09&finding=old"), "https://books.invalid");
    assert.equal(url.searchParams.get("page"), String(unit.pdf_page));
    assert.equal(url.searchParams.get("readerUnit"), unit.id);
    assert.equal(url.searchParams.get("dataset"), null);
    assert.equal(url.searchParams.get("finding"), null);
    assert.equal(url.hash, `#${ahavatReaderUnitDomId(unit.id)}`);
    assert.ok(!("engine_verified" in unit) && !("display_label" in unit), "only the fixed companion rendering fields leave validation");
  }
  for (const id of ["ahavat-novellae-p045-01", "ahavat-novellae-p093-01", "ahavat-novellae-p046-04", "ahavat-novellae-p46-01"]) assert.equal(ahavatReaderUnit(id), null);
});

test("foreign, incomplete, mislabeled or wrong-page companion material cannot render as a valid expanded unit", () => {
  assert.deepEqual(ahavatCompanionReadingUnits(null, 55), []);
  assert.deepEqual(ahavatCompanionReadingUnits(bundle, 45), []);
  assert.deepEqual(ahavatCompanionReadingUnits(bundle, "55"), []);
  for (const mutate of [
    d => { d.source_identity = "foreign"; },
    d => { d.source_pdf_sha256 = "other"; },
    d => { d.pages[54].companion_units.pop(); },
    d => { d.pages[54].companion_units[0].pdf_page = 56; },
    d => { d.pages[54].companion_units[0].source_anchor = "#page=56&view=FitH"; },
    d => { d.pages[54].companion_units[0].display_label = "דברי הספר"; },
    d => { d.pages[54].companion_units[0].explanation = ""; },
    d => { d.pages[54].companion_units[1].id = d.pages[54].companion_units[0].id; },
  ]) {
    const damaged = structuredClone(bundle); mutate(damaged);
    assert.deepEqual(ahavatCompanionReadingUnits(damaged, 55), []);
  }
});
