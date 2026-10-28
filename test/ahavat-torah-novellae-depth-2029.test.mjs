import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const bundle = JSON.parse(readFileSync(new URL("../public/book-data/ahavat-torah.commentary.json", import.meta.url), "utf8"));
const expanded = bundle.pages.filter(page => page.companion_units);

test("selected novellae passages extend the existing companion without replacing any page or source identity", () => {
  assert.equal(bundle.source_pdf_sha256, "895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b");
  assert.deepEqual(bundle.pages.map(page => page.pdf_page), Array.from({ length: 99 }, (_, i) => i + 1));
  assert.equal(bundle.coverage.deep_research_pages, 15, "original source-research coverage is a separate axis");
  assert.deepEqual(bundle.coverage.visual_or_blank_pages, [45]);
  const preserved = bundle.pages.filter(page => page.pdf_page < 46 || page.pdf_page > 70);
  assert.equal(createHash("sha256").update(JSON.stringify(preserved)).digest("hex"), "826847163723a266bd05a32d2897b4ebae928f8cfae5b1dc1f75f4b7021b971e");
  for (const page of bundle.pages) {
    assert.equal(page.work_id, `ahavat-torah-pdf-${page.pdf_page}`);
    assert.equal(page.source_anchor, `#page=${page.pdf_page}&view=FitH`);
  }
});

test("expanded pages have three distinct companion units with stable IDs and exact source pages", () => {
  assert.ok(expanded.length >= 5 && expanded.length <= 25);
  const ids = [];
  for (const page of expanded) {
    assert.ok(page.pdf_page >= 46 && page.pdf_page <= 70);
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
