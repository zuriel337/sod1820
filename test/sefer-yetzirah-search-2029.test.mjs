import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getBookReaderManifest } from "../src/data/bookReader2029.js";

const ROOT = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, ROOT), "utf8"));

test("Sefer Yetzirah OCR covers every searchable scan without filling visual pages", async () => {
  const bundle = await readJson("public/book-data/sefer-yetzirah.page-text.json");
  assert.equal(bundle.schema_version, "book-page-text.v1");
  assert.equal(bundle.book_slug, "sefer-yetzirah");
  assert.equal(bundle.source_identity, "book:sefer-yetzirah-9perushim");
  assert.equal(bundle.source_pdf_sha256, "2cc0710667dde3db94745b4f652d4b2e3eb8ea9c64424ab52f1f2ce44281c13a");
  assert.equal(bundle.fidelity_status, "machine_candidate_for_search_and_navigation");
  assert.deepEqual(bundle.pages.map(item => item.pdf_page), Array.from({ length: 220 }, (_, index) => index + 1));
  assert.equal(bundle.pages.filter(item => item.extraction_status === "machine_candidate").length, 207);
  assert.deepEqual(
    bundle.pages.filter(item => item.extraction_status === "image_only").map(item => item.pdf_page),
    [1, 2, 3, 27, 33, 110, 114, 115, 202, 217, 218, 219, 220],
  );
  assert.equal(bundle.pages.filter(item => item.extraction_status === "image_only").every(item => item.text === ""), true);
  assert.ok(bundle.pages.reduce((total, item) => total + item.character_count, 0) > 600_000);
  assert.match(bundle.pages[60].text, /ספירות בלימה/);
  assert.match(bundle.pages[154].text, /שלשים ושתים/);
});

test("the canonical reader lazily connects Sefer Yetzirah OCR search", () => {
  const manifest = getBookReaderManifest("sefer-yetzirah");
  assert.equal(manifest.pageTextUrl, "/book-data/sefer-yetzirah.page-text.json");
  assert.equal(manifest.commentaryUrl, "/book-data/sefer-yetzirah.commentary.json");
});
