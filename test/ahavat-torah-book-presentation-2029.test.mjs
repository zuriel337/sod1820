import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../src/pages/AhavatTorahSystem2029Page.jsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/components/books2029/ahavatBookPresentation2029.css", import.meta.url), "utf8");

test("book depth wraps the original exact-page source instead of replacing it with artwork", () => {
  assert.match(page, /\[bookPresentation, setBookPresentation\] = useState\(true\)/);
  assert.match(page, /data-book-presentation=\{bookPresentation \? "book" : "straight"\}/);
  assert.match(page, /<iframe key=\{page\} src=\{pdfUrl\}/);
  assert.match(page, /#page=\$\{page\}&view=FitH/);
  assert.match(page, /aria-controls="ahavat29-pdf-frame"/);
  assert.match(page, /ahavat29-book-page-edges" aria-hidden="true"/);
  assert.doesNotMatch(css, /url\(|#[\da-fA-F]{3,8}\b|rgba?\(|perspective|rotate|transform|animation/);
});

test("book decoration uses theme roles and yields the whole frame in fullscreen", () => {
  assert.match(css, /var\(--s29-brand-gold\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /pointer-events:none/);
  assert.match(css, /:fullscreen \.ahavat29-pdf-frame\[data-book-presentation\]/);
  assert.match(css, /:fullscreen \.ahavat29-book-page-edges/);
  assert.match(css, /min-height:44px/);
});
