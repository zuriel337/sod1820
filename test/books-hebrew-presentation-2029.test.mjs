import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("src/pages/Books2029Page.jsx", "utf8");
const projection = fs.readFileSync("src/lib/research/bookResearchProjection.js", "utf8");

test("Books 2029 consumes the shared Hebrew adapter instead of page-local dictionaries", () => {
  for (const presenter of [
    "presentBookCoverageKey",
    "presentBookCoverageValue",
    "presentBookEditionStatus",
    "presentBookLocatorKind",
    "presentBookScreenState",
    "presentBookTechnicalTerm",
  ]) assert.match(page, new RegExp(presenter));
  assert.doesNotMatch(page, /const COVERAGE_LABELS/);
  assert.doesNotMatch(page, /replaceAll\("_", " "\)/);
});

test("Books research rows use the existing human presentation owner and preserve raw material off the primary path", () => {
  assert.match(projection, /resolveResearchObjectPresentation\(row, \{ locale: "he" \}\)/);
  assert.match(projection, /presentBookResearchStatus/);
  assert.match(projection, /presentBookVerificationState/);
  assert.match(page, /entry\.titleHe/);
  assert.doesNotMatch(page, /shortText\(row\.statement/);
  assert.doesNotMatch(page, /row\.statement \|\|/);
});

test("ordinary Books states do not expose backend errors or the retired technical copy", () => {
  assert.doesNotMatch(page, /state\.error\?\.message/);
  assert.doesNotMatch(page, />CORPUS PROJECTION</);
  assert.doesNotMatch(page, />PERSONAL SOURCE INTAKE</);
  assert.doesNotMatch(page, />[^<]*runtime pending/);
  assert.doesNotMatch(page, />[^<]*Research Objects/);
  assert.doesNotMatch(page, />[^<]*pending \/ unresolved \/ mismatch/);
  assert.doesNotMatch(page, /לא רשום unresolved_total|>unresolved_total</);
});

test("the wiring remains presentation-only", () => {
  const executablePage = page.replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(executablePage, /\.insert\(|\.update\(|\.delete\(|service_role|create policy|alter table/i);
  assert.doesNotMatch(page, /autoAssignCustomDomains|CORE_PUBLIC_LAUNCH_2029/);
});
