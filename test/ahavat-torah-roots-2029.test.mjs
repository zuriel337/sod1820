import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AHAVAT_ROOT_SECTIONS as sections, ahavatRootFragments } from "../src/data/ahavatTorahRoots2029.js";
import { AHAVAT_TORAH_DATASETS } from "../src/data/ahavatTorahSystem2029.js";
const bundle = JSON.parse(await readFile(new URL("../public/book-data/ahavat-torah.roots.json", import.meta.url), "utf8"));

test("roots have ten source-native columns on the five actual source pages", () => {
  assert.deepEqual(sections.map(section => section.page), [31, 32, 33, 34, 35]);
  const fragments = ahavatRootFragments(bundle);
  assert.equal(fragments.length, 10);
  assert.equal(new Set(fragments.map(fragment => fragment.id)).size, 10);
  for (const section of sections) assert.deepEqual(fragments.filter(fragment => fragment.pdf_page === section.page).map(fragment => fragment.column), ["right", "left"]);
  assert.ok(fragments.every(fragment => fragment.text.length > 100 && fragment.crop_350dpi.length === 4));
  assert.equal(bundle.status, "navigation_ocr_not_verified_quotation");
  assert.equal(bundle.pdf_sha256, "895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b");
});
test("section boundaries exclude attribution, alphabet tables and repeated catchwords", () => {
  const fragments = ahavatRootFragments(bundle);
  const text = fragments.map(fragment => fragment.text).join("\n");
  assert.doesNotMatch(text, /סופר ומונה|אותיות התורה|תיבות חמש|אוריין תליתאי/);
  assert.match(fragments[0].text, /בראשית ברא אלקים/);
  assert.doesNotMatch(fragments[1].text, /צפיר\s*$/);
  assert.match(fragments[2].text, /^צפור/);
  assert.match(fragments.at(-1).text, /שחקים/);
  const ds = AHAVAT_TORAH_DATASETS.find(item => item.id === "DS-11");
  assert.deepEqual(ds.pages, [31, 32, 33, 34, 35]);
  assert.equal(ds.state, "partial");
});
test("search is navigation over source columns, not a fabricated 1820-root dictionary", () => {
  assert.deepEqual(ahavatRootFragments(null), []);
  assert.deepEqual(ahavatRootFragments({ ...bundle, source_identity: "other" }), []);
  assert.deepEqual(ahavatRootFragments(bundle, "בְּרֵאשִׁית בָּרָא").map(fragment => fragment.pdf_page), [31]);
  assert.deepEqual(ahavatRootFragments(bundle, "שחקים").map(fragment => fragment.pdf_page), [35]);
  assert.deepEqual(ahavatRootFragments(bundle, "לאנמצאבספראיזהטקסט"), []);
  assert.ok(bundle.fragments.every(fragment => !("root" in fragment) && !("engine_verified" in fragment)));
});
test("OCR source asset loads only on request and source actions retain the existing dataset identity", async () => {
  const component = await readFile(new URL("../src/components/books2029/AhavatTorahSourceTables2029.jsx", import.meta.url), "utf8");
  assert.match(component, /if \(!expanded \|\| bundle\) return/);
  assert.match(component, /controller\.abort\(\)/);
  assert.match(component, /onPage\(next, "DS-11"\)/);
  assert.match(component, /התעתיק הוא כלי איתור בלבד ואינו ציטוט מאומת/);
});
