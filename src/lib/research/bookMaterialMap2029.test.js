import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
    completion: { phase: "MATERIAL_MAP_COMPLETE", label: "מיפוי הושלם", summary: "fixture complete", blocking_open: 0, extraction_backlog: 1, source_native_questions: 1, next_phase: "SELECTIVE_RESEARCH_INTAKE" },
    research_intake: { status: "READY_FOR_SELECTIVE_INTAKE", principle: "fixture intake", steps: [{ id: "RI-X", title: "שלב סינתטי", target: "research_items", status: "AVAILABLE", note: "fixture only" }] },
    datasets: [["DS-X", "ממצא סינתטי", "p1", "OPEN", "fixture only"]],
    sections: [{ id: "SEC-X", title: "חטיבה סינתטית", pages: "pp1–2", material: "fixture material", status: "MAPPED" }],
    families: [{ title: "שיטה סינתטית", text: "fixture only" }],
    witness_closures: [{ id: "WG-X", title: "עדות סינתטית", locus: "p2", status: "VISUALLY_VERIFIED", note: "fixture only", source_ref: "book:synthetic:1#p2:witness" }],
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

test("public bundle is normalized into source, structure, findings, methods, connections, closures and open questions", () => {
  const map = buildBookMaterialMap(SYNTHETIC_BUNDLE, { expectedSlug: "ahavat-torah" });
  assert.equal(map.available, true);
  assert.equal(map.source.identity, "book:synthetic:1");
  assert.equal(map.source.pdfUrl, "https://example.test/source.pdf");
  assert.equal(map.metrics[0].value, "12");
  assert.equal(map.coverage[0].value, "PARTIAL");
  assert.equal(map.findings[0].id, "DS-X");
  assert.deepEqual(map.sections[0], {
    id: "SEC-X",
    title: "חטיבה סינתטית",
    pages: "pp1–2",
    material: "fixture material",
    status: "MAPPED",
  });
  assert.equal(map.methods[0].title, "שיטה סינתטית");
  assert.equal(map.connections[0].id, "CR-X");
  assert.deepEqual(map.witnessClosures[0], {
    id: "WG-X",
    title: "עדות סינתטית",
    locus: "p2",
    status: "VISUALLY_VERIFIED",
    note: "fixture only",
    sourceRef: "book:synthetic:1#p2:witness",
  });
  assert.equal(map.openQuestions[0].text, "שאלה סינתטית פתוחה");
  assert.equal(map.completion.phase, "MATERIAL_MAP_COMPLETE");
  assert.equal(map.completion.blockingOpen, 0);
  assert.equal(map.researchIntake.steps[0].id, "RI-X");
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

test("Ahavat Torah public snapshot exposes the complete material map and preserves the corpus contradiction", async () => {
  const bundle = JSON.parse(await readFile(new URL("../../../public/book-data/ahavat-torah.tables.json", import.meta.url), "utf8"));
  const map = buildBookMaterialMap(bundle, { expectedSlug: "ahavat-torah" });
  assert.equal(map.available, true);
  assert.equal(map.witnessClosures.length, 5);
  assert.equal(map.openQuestions.length, 5);
  assert.equal(map.completion.phase, "MATERIAL_MAP_COMPLETE");
  assert.equal(map.completion.blockingOpen, 0);
  assert.equal(map.completion.extractionBacklog, 3);
  assert.equal(map.completion.sourceNativeQuestions, 2);
  assert.equal(map.researchIntake.status, "READY_FOR_SELECTIVE_INTAKE");
  assert.equal(map.researchIntake.steps.length, 5);
  assert.equal(map.sections.length, 8);
  assert.equal(map.sections[0].pages, "pp1–5");
  assert.equal(map.sections.at(-1).pages, "pp94–99");
  assert.deepEqual(map.inventory.find(item => item.key === "page_register"), {
    key: "page_register",
    label: "עמודים ברישום",
    value: 99,
  });
  assert.equal(map.inventory.find(item => item.key === "content_blocks")?.value, 303);
  assert.equal(map.witnessClosures[1].status, "CORPUS_RECONSTRUCTED · CONTRADICTION_PRESERVED");
  assert.match(map.witnessClosures[1].note, /90.*89.*88/);
  assert.equal(map.witnessClosures[2].locus, "PDF p14");
  assert.match(map.witnessClosures[2].note, /364/);
  assert.equal(map.witnessClosures[4].status, "ENGINE_VERIFIED");
  assert.match(map.witnessClosures[4].note, /1,820/);
  assert.equal(map.findings.find(item => item.id === "DS-03")?.locus, "p41");
  assert.equal(map.findings.find(item => item.id === "DS-04")?.locus, "p42");
  assert.equal(map.findings.find(item => item.id === "DS-05")?.status, "SOURCE INVENTORIED");
  assert.equal(map.findings.find(item => item.id === "DS-11")?.status, "SOURCE INVENTORIED");
});
