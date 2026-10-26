import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const control = read("src/components/books2029/BookFullscreenButton2029.jsx");
const controlCss = read("src/components/books2029/bookFullscreen2029.css");
const readers = [
  read("src/pages/AhavatTorahSystem2029Page.jsx"),
  read("src/pages/DaatTevunotTree2029Page.jsx"),
  read("src/pages/BentovFindingsProduct2029Page.jsx"),
  read("src/pages/SeferYetzirahWorld2029Page.jsx"),
];

test("book readers share one accessible fullscreen control with a PDF fallback", () => {
  assert.match(control, /requestFullscreen/);
  assert.match(control, /webkitRequestFullscreen/);
  assert.match(control, /fullscreenchange/);
  assert.match(control, /window\.open\(fallbackHref/);
  assert.match(control, /aria-pressed=\{active\}/);
  assert.match(controlCss, /\.book-fullscreen29-target:fullscreen/);
  assert.match(controlCss, /\[data-book-pdf-frame\]/);
});

test("every current 2029 embedded book PDF uses the shared fullscreen contract", () => {
  for (const page of readers) {
    assert.match(page, /BookFullscreenButton2029/);
    assert.match(page, /book-fullscreen29-target/);
    assert.match(page, /data-book-pdf-frame/);
  }
});

test("fullscreen remains a local display capability and does not publish or write", () => {
  assert.doesNotMatch(control, /fetch\(|\.rpc\(|\.from\(|insert|update|delete/i);
  assert.doesNotMatch(control, /localStorage|sessionStorage/);
});
