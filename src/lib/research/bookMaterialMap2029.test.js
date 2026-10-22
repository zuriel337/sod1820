import test from "node:test";
import assert from "node:assert/strict";
import {
  BOOK_MATERIAL_PREVIEW_SLUGS,
  buildBookMaterialMap,
  fetchBookMaterialMap,
  isBookMaterialPreview,
} from "./bookMaterialMap2029.js";

const SYNTHETIC_BUNDLE = {
  schema_version: 1,
  book_slug: "ahavat-torah",
  source_identity: "book:synthetic:1",
  generated_at: "2026-10-22",
  hero: {
    subtitle: "מקור בדיקה סינתטי",
    promise: "מפת חומר סינתטית בלבד",
    pdf: "https://example.test/source.pdf",
    metrics: [["12", "עמודים", "synthetic"]],
    coverage: [{ label: "Research Map", value: "PARTIAL", note: "synthetic" }],
    datasets: [["DS-X", "ממצא סינתטי", "p1", "OPEN", "fixture only"]],
    families: [{ title: "שיטה סינתטית", text: "fixture only" }],
    open: ["שאלה סינתטית פתוחה"],
    seeds: [{ key: "seed-x", label: "נקודת כניסה", family: "synthetic", status: "open", page: 1 }],
  },
  content_blocks: [{ id: "synthetic-block" }],
  datasets: [{ id: "synthetic-dataset" }],
  calculations: [{ id: "synthetic-calculation" }],
  relations: [{ relation_id: "CR-X", description: "קשר סינתטי", pdf_pages: [1], confidence: "SYNTHETIC" }],
};

test("material preview is explicitly bounded to the two pilot books", () => {
  assert.deepEqual(BOOK_MATERIAL_PREVIEW_SLUGS, ["ahavat-torah", "sefer-hapliah"]);
  assert.equal(isBookMaterialPreview("ahavat-torah"), true);
  assert.equal(isBookMaterialPreview("sefer-hapliah"), true);
  assert.equal(isBookMaterialPreview("other-book"), false);
});

test("public bundle is normalized into source, structure, findings, methods, connections and open questions", () => {
  const map = buildBookMaterialMap(SYNTHETIC_BUNDLE, { expectedSlug: "ahavat-torah" });
  assert.equal(map.available, true);
  assert.equal(map.source.identity, "book:synthetic:1");
  assert.equal(map.source.pdfUrl, "https://example.test/source.pdf");
  assert.equal(map.metrics[0].value, "12");
  assert.equal(map.coverage[0].value, "PARTIAL");
  assert.equal(map.findings[0].id, "DS-X");
  assert.equal(map.methods[0].title, "שיטה סינתטית");
  assert.equal(map.connections[0].id, "CR-X");
  assert.equal(map.openQuestions[0].text, "שאלה סינתטית פתוחה");
  assert.deepEqual(map.inventory.map(item => [item.key, item.value]), [
    ["content_blocks", 1],
    ["datasets", 1],
    ["calculations", 1],
    ["relations", 1],
  ]);
});

test("bundle identity mismatch fails closed", () => {
  const map = buildBookMaterialMap(SYNTHETIC_BUNDLE, { expectedSlug: "sefer-hapliah" });
  assert.equal(map.available, false);
  assert.equal(map.reason, "identity_mismatch");
});

test("fetcher reads only the explicit public asset path", async () => {
  let requested = null;
  const map = await fetchBookMaterialMap("ahavat-torah", {
    fetchImpl: async (url, options) => {
      requested = { url, options };
      return { ok: true, json: async () => SYNTHETIC_BUNDLE };
    },
  });
  assert.equal(requested.url, "/book-data/ahavat-torah.tables.json");
  assert.equal(requested.options.headers.Accept, "application/json");
  assert.equal(map.available, true);
});

test("fetcher does not request assets for books outside the preview", async () => {
  let called = false;
  const map = await fetchBookMaterialMap("../private-book", {
    fetchImpl: async () => { called = true; },
  });
  assert.equal(called, false);
  assert.equal(map.available, false);
  assert.equal(map.reason, "not_in_preview");
});

test("non-https source links are withheld from the presentation", () => {
  const bundle = structuredClone(SYNTHETIC_BUNDLE);
  bundle.hero.pdf = "javascript:alert(1)";
  const map = buildBookMaterialMap(bundle, { expectedSlug: "ahavat-torah" });
  assert.equal(map.available, true);
  assert.equal(map.source.pdfUrl, null);
});
