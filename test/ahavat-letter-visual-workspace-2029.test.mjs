import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { AHAVAT_LETTER_FORMS, AHAVAT_LETTER_READINGS } from "../src/data/ahavatTorahLetters2029.js";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const component = read("src/components/books2029/AhavatLetterStudy2029.jsx");
const css = read("src/components/books2029/ahavatLetterStudy2029.css");
const page = read("src/pages/AhavatTorahSystem2029Page.jsx");

test("letter landscape consumes the existing 28 forms and five source-book checkpoints, not a parallel dataset", () => {
  assert.equal(AHAVAT_LETTER_FORMS.length, 28);
  for (const { form } of AHAVAT_LETTER_FORMS) assert.equal(AHAVAT_LETTER_READINGS[form].length, 5);
  assert.match(component, /books\.map/);
  assert.match(component, /book\.count === null/);
  assert.match(component, /data-value-missing/);
  assert.match(component, /ערך חסר נשאר חסר/);
  assert.doesNotMatch(component, /מאומת במנוע|localStorage|fetch\(|Canvas|three/);
});

test("focused study remains a projection of the existing reader and closes hidden nonletter scenes", () => {
  assert.match(page, /data-study-focus=\{letterFocus/);
  assert.match(page, /if \(focusedLetters\) setActiveScene\(current => current === "letter" \? current : ""\)/);
  assert.match(page, /focusedLetters=\{letterFocus\}/);
  assert.match(page, /onBook=\{id => select\(form, id, true\)\}/);
  assert.match(page, /if \(!options.preservePosition\) scrollToBookSource\(behavior\)/);
  assert.doesNotMatch(component, /BookHubPage|createContext|createRoot|BrowserRouter/);
});

test("letters use semantic Design V2 roles and no per-book palette, font or perpetual motion", () => {
  assert.doesNotMatch(css, /#[a-f\d]{3,8}\b|rgba?\(|hsla?\(|@font-face|infinite/gi);
  for (const role of ["--s29-accent", "--s29-accent-secondary", "--s29-focus-ring", "--s29-font-ui", "--s29-font-body", "--s29-font-numeric"]) assert.ok(css.includes(role), role);
  assert.match(css, /min-height:44px/);
  assert.match(css, /data-value-missing=true.*font-family:var\(--s29-font-body\)/);
  assert.match(css, /grid-template-areas:"story" "source"/);
  assert.match(css, /i\[data-missing=true\]\{display:none\}/);
});
