import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const legacy = readFileSync(new URL("../src/pages/CodePage.jsx", import.meta.url), "utf8");
const els2029 = readFileSync(new URL("../src/pages/Els2029Page.jsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("legacy /code shows the bounded launch countdown and canonical signup instead of The First Verse", () => {
  assert.match(legacy, /ELS_LEGACY_COUNTDOWN_TARGET/);
  assert.match(legacy, /2026-10-12T22:57:00\+03:00/);
  assert.match(legacy, /⌛/);
  assert.match(legacy, /אתם תהיו הראשונים שתיהנו מהתוכנה החדשה/);
  assert.match(legacy, /source="els-2029-early-access"/);
  assert.doesNotMatch(legacy, /thefirstverse\.com/i);
  assert.doesNotMatch(legacy, /The First Verse/i);
  assert.match(legacy, /return <CodeClosed message=\{elsState\.message\} \/>/);
  assert.doesNotMatch(legacy, /!isAdmin\s*&&\s*elsState\.blocked/);
});

test("ELS 2029 remains the active build surface and is not launch-gated by the legacy countdown", () => {
  assert.match(els2029, /data-els-2029-surface="v1"/);
  assert.doesNotMatch(els2029, /ELS_LEGACY_COUNTDOWN_TARGET|els-2029-early-access|week-countdown/);
  assert.doesNotMatch(els2029, /href="\/lab\/els"/);
  assert.match(els2029, /NO LEGACY ROUTE/);
});

test("legacy ELS work-area route hands off to the canonical 2029 surface", () => {
  assert.match(app, /<Route path="\/lab\/els" element=\{<Navigate to="\/els" replace \/>\} \/>/);
  assert.doesNotMatch(app, /<Route path="\/lab\/els" element=\{<ElsWorkAreaPage \/>\} \/>/);
});

console.log("legacy ELS launch gate: PASS");
