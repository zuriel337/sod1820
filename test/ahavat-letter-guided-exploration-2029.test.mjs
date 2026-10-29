import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { AHAVAT_LETTER_FORMS } from "../src/data/ahavatTorahLetters2029.js";
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("letter stepping uses source order and preserves separate final/shin forms without wrapping", () => {
  const component = read("src/components/books2029/AhavatLetterStudy2029.jsx");
  assert.match(component, /AHAVAT_LETTER_FORMS\.findIndex/);
  assert.match(component, /disabled=\{position <= 0\}/);
  assert.match(component, /disabled=\{position >= AHAVAT_LETTER_FORMS.length - 1\}/);
  assert.match(component, /AHAVAT_LETTER_FORMS\[position \+ 1\]\.form/);
  const forms = AHAVAT_LETTER_FORMS.map(item => item.form);
  assert.equal(forms[forms.indexOf("כ") + 1], "ך");
  assert.equal(forms[forms.indexOf("שׁ") + 1], "שׂ");
  assert.match(read("src/pages/AhavatTorahSystem2029Page.jsx"), /onLetter=\{next => select\(next, bookId, true\)\}/);
});
test("camera commands are an explicit letter-only enhancement of the existing disposable controls", () => {
  const renderer = read("src/components/books2029/AhavatTorahSpatialScene2029.jsx");
  assert.match(renderer, /command=\{mode === "letter" \? cameraCommand : undefined\}/);
  assert.match(renderer, /controls\.dispose\(\)/);
  assert.match(renderer, /controls\.minDistance, Math.min\(controls.maxDistance/);
  assert.match(renderer, /disabled=\{!ready \|\| lost\}/);
  assert.match(renderer, /mode === "letter" \? <nav/);
  for (const action of ["front", "oblique", "closer", "farther", "reset"]) assert.ok(renderer.includes(`moveCamera("${action}")`));
});
test("parasha companion uses existing row values and a single existing unit anchor in focused study", () => {
  const component = read("src/components/books2029/AhavatLetterParasha2029.jsx");
  const page = read("src/pages/AhavatTorahSystem2029Page.jsx");
  assert.match(component, /selected\.count === null/);
  assert.match(component, /selected\.printed === "\?"/);
  assert.match(component, /הסבר נלווה/);
  assert.match(component, /ahavatReaderUnitDomId\(unitId\)/);
  assert.match(component, /onSource\(selected\)/);
  assert.doesNotMatch(component, /מאומת במנוע|fetch\(|localStorage|Canvas|Math\.round/);
  assert.match(page, /preserveSelectionPosition && row.parasha === selectedBar/);
  assert.match(page, /preservePosition: !openSource/);
});
