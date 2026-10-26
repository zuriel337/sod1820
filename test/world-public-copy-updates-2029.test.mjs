import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const world = readFileSync(new URL("../src/pages/World2029Page.jsx", import.meta.url), "utf8");
const updates = readFileSync(new URL("../src/components/research/WorldPublicUpdates2029.jsx", import.meta.url), "utf8");
const people = readFileSync(new URL("../src/components/research/WorldPeopleSources2029.jsx", import.meta.url), "utf8");
const subjects = readFileSync(new URL("../src/components/research/WorldPublicSourceSubjects2029.jsx", import.meta.url), "utf8");
const zvi = readFileSync(new URL("../src/components/research/ZviGroupTimeline2029.jsx", import.meta.url), "utf8");

test("World public copy is neutral and no longer addresses the visitor directly", () => {
  for (const phrase of ["אותך", "מה אתה רוצה", "שביקשת", "שפתחת", "שעברת", "בחירתך", "הגעת לסוף"]) {
    assert.doesNotMatch(world, new RegExp(phrase));
  }
  assert.match(world, /מפת הידע של SOD1820/);
  assert.match(world, /שכבות המידע/);
  assert.doesNotMatch(world, /מבט כללי|המבט הנוכחי/);
});

test("one bounded public activity projection reuses World readers without personal seen state", () => {
  assert.match(world, /<WorldPublicUpdates2029/);
  assert.doesNotMatch(world, /<SourceArrivalList2029/);
  assert.match(updates, /canonicalPublicActivityPresentation/);
  assert.match(updates, /items = EMPTY_ROWS, arrivals = EMPTY_ROWS, people = EMPTY_ROWS/);
  assert.doesNotMatch(updates, /supabase|localStorage|readSeen|markSeen|fetch\(/i);
  assert.doesNotMatch(zvi, /readSeen|markSeen|טרם נקראה|נקראה/);
  assert.match(world, /publicUpdatesReturnHref/);
  assert.match(world, /returnTo: publicUpdatesReturnHref/);
});

test("World search and action labels consume canonical public copy", () => {
  assert.match(people, /CANONICAL_PUBLIC_UI_COPY\.search\.personTitleNumber/);
  assert.match(people, /CANONICAL_PUBLIC_UI_COPY\.action\.writer/);
  assert.match(subjects, /CANONICAL_PUBLIC_UI_COPY\.search\.subjectSourceNumber/);
  assert.match(updates, /CANONICAL_PUBLIC_UI_COPY\.action\.source/);
});

test("activity labels keep update, approval and research addition separate", () => {
  assert.match(updates, /מקורות שעודכנו/);
  assert.match(updates, /דפי כתבים/);
  assert.match(updates, /נושאים/);
  assert.match(updates, /ממצאים/);
  assert.match(updates, /אינו ציון אמת, איכות או חוזק מחקרי/);
});
