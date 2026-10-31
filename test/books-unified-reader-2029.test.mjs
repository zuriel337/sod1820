import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);

test("unified books reader keeps source, fullscreen and Hebrew guide in one capability", async () => {
  const source = await readFile(new URL("src/components/books2029/BookSourceReader2029.jsx", ROOT), "utf8");
  assert.match(source, /<iframe/);
  assert.match(source, /BookFullscreenButton2029/);
  assert.match(source, /דברי הספר · המקור פתוח תמיד/);
  assert.match(source, /הסבר נלווה · PDF/);
  assert.match(source, /ייצוג של מבנה הספר/);
  assert.match(source, /<summary>פרטי המקור<\/summary>/);
  assert.match(source, /replacePageInUrl/);
  assert.match(source, /פתח את עמוד/);
});

test("reader is wired into the canonical book detail and preview-only control surface", async () => {
  const [booksPage, app] = await Promise.all([
    readFile(new URL("src/pages/Books2029Page.jsx", ROOT), "utf8"),
    readFile(new URL("src/App2029.jsx", ROOT), "utf8"),
  ]);
  assert.match(booksPage, /<BookSourceReader2029 manifest=\{readerManifest\}/);
  assert.match(booksPage, /previewBookForManifest/);
  assert.match(booksPage, /previewOnly && readerManifest/);
  assert.match(booksPage, /previewOnly=\{Boolean\(previewSlug\)\}/);
  assert.match(app, /surface\"\) === \"books-unified-reader\"/);
  assert.match(app, /bookPublicationReviewPreviewEnabled && unifiedBooksReaderRequested/);
});
