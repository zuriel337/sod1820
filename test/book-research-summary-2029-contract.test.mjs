import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("src/pages/Books2029Page.jsx", "utf8");
const projection = fs.readFileSync("src/lib/research/bookResearchProjection.js", "utf8");
const css = fs.readFileSync("src/components/experience2029/sod2029.css", "utf8");

test("Books 2029 research summary is human-first and stays on existing owners", () => {
  for (const text of ["מצב הספר עכשיו", "מאיפה החומר מגיע", "מפת הכיסוי", "מחקר סביב הספר", "נקודות להמשך בדיקה"]) {
    assert.match(page, new RegExp(text));
  }
  assert.match(page, /buildBookResearchPresentation/);
  assert.match(page, /fetchBookResearch\(book, \{ limit: 80 \}\)/);
  assert.doesNotMatch(page, /Book adapter נכשל/);
  assert.doesNotMatch(page, /nodes\(type=book,is_active=true\)/);
});

test("Book research families group existing representation shapes without a new engine/store", () => {
  assert.match(projection, /id: "methods".*shapes: \["procedure"\]/s);
  assert.match(projection, /id: "structures".*\["matrix", "composition", "grammar", "spatial"\]/s);
  assert.match(projection, /id: "findings".*\["terms", "narrative"\]/s);
  assert.match(projection, /researchRowToBookRepresentation/);
  assert.doesNotMatch(projection, /create table|new store|new engine/i);
});

test("Follow-up panel derives from explicit stored signals, not a synthetic truth score", () => {
  assert.match(projection, /REVIEW_SIGNAL_RE/);
  assert.match(page, /presentation\.reviewCount/);
  assert.match(page, /coverage\.unresolved_total/);
  assert.match(page, /coverage\.residuals/);
  assert.doesNotMatch(page, /truthScore|importanceScore|researchScore/);
});

test("Book summary styling reuses 2029 theme tokens and is mobile-first", () => {
  assert.match(css, /\.sod29-book-overview-grid/);
  assert.match(css, /\.sod29-book-family/);
  assert.match(css, /var\(--s29-line\)/);
  assert.match(css, /@media\(max-width:620px\)[\s\S]*\.sod29-book-overview-grid\{grid-template-columns:1fr\}/);
});
