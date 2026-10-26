import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  AHAVAT_TORAH_DATASETS,
  AHAVAT_TORAH_DEEP_PAGES,
  AHAVAT_TORAH_AI_EXPLANATIONS_HE,
  AHAVAT_TORAH_EXTRACTION_LAYERS,
  AHAVAT_TORAH_FINDINGS,
  AHAVAT_TORAH_PIPELINE,
  AHAVAT_TORAH_READING_ARCS,
  AHAVAT_TORAH_SECTIONS,
  AHAVAT_TORAH_SOURCE,
  AHAVAT_TORAH_TRUTH_STATES,
  readingArcForPage,
  sectionForPage,
} from "../src/data/ahavatTorahSystem2029.js";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const app = read("src/App2029.jsx");
const page = read("src/pages/AhavatTorahSystem2029Page.jsx");
const css = read("src/pages/ahavatTorahSystem2029.css");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const bundle = JSON.parse(read("public/book-data/ahavat-torah.tables.json"));
const pageTextBundle = JSON.parse(read("public/book-data/ahavat-torah.page-text.json"));
const contract = read("SOD1820_DESIGN_CONTRACT_V2.md");

test("Ahavat Torah system is an unlinked noindex read-only Preview surface", () => {
  assert.match(app, /surface"\) === "ahavat-torah-system"/);
  assert.match(app, /VITE_BOOK_PUBLICATION_REVIEW_PREVIEW/);
  assert.match(app, /AhavatTorahSystem2029Page/);
  assert.equal(frame.includes("ahavat-torah-system"), false);
  assert.match(page, /noindex:\s*true/);
  assert.match(page, /status="Preview מוגן · קריאה בלבד"/);
  assert.match(page, /data-preview-only="true"/);
  assert.match(page, /data-publication-effect="none"/);
  assert.doesNotMatch(page, /\.rpc\(|\.from\(["']|axios|insert|update\(/i);
  assert.match(page, /fetch\(AHAVAT_TORAH_SOURCE\.researchBundleUrl, \{ credentials: "same-origin" \}\)/);
});

test("the bounded system keeps the canonical source identity and all 99 source pages", () => {
  assert.equal(AHAVAT_TORAH_SOURCE.identity, "book:hebrewbooks:5635");
  assert.equal(AHAVAT_TORAH_SOURCE.pdfPages, 99);
  assert.match(AHAVAT_TORAH_SOURCE.pdfUrl, /Hebrewbooks_org_5635\.pdf$/);
  assert.equal(bundle.source_identity, AHAVAT_TORAH_SOURCE.identity);
  assert.equal(bundle.book_slug, "ahavat-torah");
  assert.equal(AHAVAT_TORAH_SECTIONS.length, 8);
  const covered = new Set([44, 45]);
  for (const section of AHAVAT_TORAH_SECTIONS) {
    assert.ok(section.description.length > 20);
    assert.ok(section.guide.length > 50);
    assert.equal(section.status, "structural_map");
    for (let pageNumber = section.range[0]; pageNumber <= section.range[1]; pageNumber += 1) covered.add(pageNumber);
  }
  assert.deepEqual([...covered].sort((a, b) => a - b), Array.from({ length: 99 }, (_, index) => index + 1));
  assert.equal(sectionForPage(6).id, "migdal-oz");
  assert.equal(sectionForPage(31).id, "roots");
  assert.equal(sectionForPage(35).id, "counting-tables");
  assert.equal(sectionForPage(94).id, "addenda");
});

test("first findings remain typed and agree with the bounded source bundle", () => {
  assert.deepEqual(Object.keys(AHAVAT_TORAH_TRUTH_STATES), ["source_verified", "source_located", "structural_map", "candidate", "open", "machine_candidate"]);
  assert.equal(AHAVAT_TORAH_FINDINGS.length, 4);
  const byDataset = new Map(bundle.datasets.map(dataset => [dataset.dataset_id, dataset]));
  for (const finding of AHAVAT_TORAH_FINDINGS) {
    assert.ok(byDataset.has(finding.dataset));
    assert.ok(finding.page >= 1 && finding.page <= 99);
    assert.ok(AHAVAT_TORAH_TRUTH_STATES[finding.status]);
    assert.ok(finding.explanation.length > 50);
  }
  assert.equal(byDataset.get("DS-01").total, "1,820");
  assert.equal(byDataset.get("DS-03").total, "79,976");
  assert.equal(AHAVAT_TORAH_FINDINGS.find(finding => finding.dataset === "DS-04").status, "candidate");
  assert.equal(AHAVAT_TORAH_FINDINGS.find(finding => finding.dataset === "DS-09").status, "source_located");
});

test("all bounded datasets and deep-read pages are represented without upgrading truth", () => {
  assert.equal(AHAVAT_TORAH_DATASETS.length, 13);
  assert.equal(AHAVAT_TORAH_DEEP_PAGES.length, 15);
  assert.equal(AHAVAT_TORAH_EXTRACTION_LAYERS.length, 6);
  assert.ok(AHAVAT_TORAH_EXTRACTION_LAYERS.every(item => item.openingPage >= 1 && item.openingPage <= 99));
  assert.deepEqual(AHAVAT_TORAH_DATASETS.map(item => item.id), bundle.datasets.map(item => item.dataset_id));
  assert.deepEqual(AHAVAT_TORAH_DEEP_PAGES.map(item => item.page), bundle.page_register.map(item => item.pdf_page));
  for (const dataset of AHAVAT_TORAH_DATASETS) {
    assert.ok(AHAVAT_TORAH_TRUTH_STATES[dataset.truthState]);
    assert.ok(dataset.summary.length > 35);
    assert.ok(dataset.nextStep.length > 25);
    assert.ok(dataset.pages.every(value => value >= 1 && value <= 99));
  }
  assert.match(page, /כל 13 מאגרי הבדיקה/);
  assert.match(page, /99 עמודים · קורא מלא וחיפוש/);
  assert.match(page, /קריאת עומק בהמשך/);
  assert.match(page, /עוד שש שכבות מתוך הספר/);
  for (const block of bundle.content_blocks.filter(item => !item.text_he)) {
    assert.ok(AHAVAT_TORAH_AI_EXPLANATIONS_HE[block.block_id], `missing Hebrew AI explanation for ${block.block_id}`);
  }
  assert.match(page, /הסבר AI בעברית:/);
  assert.doesNotMatch(page, /block\.text_note/);
});

test("the full-book machine layer covers all pages without pretending to be verified", () => {
  assert.equal(pageTextBundle.schema_version, "ahavat-torah-page-text.v1");
  assert.equal(pageTextBundle.source_identity, AHAVAT_TORAH_SOURCE.identity);
  assert.equal(pageTextBundle.fidelity_status, "machine_candidate_requires_visual_verification");
  assert.equal(pageTextBundle.pages.length, 99);
  assert.deepEqual(pageTextBundle.pages.map(item => item.pdf_page), Array.from({ length: 99 }, (_, index) => index + 1));
  assert.ok(pageTextBundle.pages.filter(item => item.extraction_status === "machine_candidate").length >= 98);
  assert.ok(pageTextBundle.pages.reduce((sum, item) => sum + item.character_count, 0) > 250_000);
  assert.equal(AHAVAT_TORAH_READING_ARCS[0].range[0], 1);
  assert.equal(AHAVAT_TORAH_READING_ARCS.at(-1).range[1], 99);
  for (let pageNumber = 1; pageNumber <= 99; pageNumber += 1) assert.ok(readingArcForPage(pageNumber));
  assert.match(page, /AHAVAT_TORAH_SOURCE\.pageTextBundleUrl/);
  assert.match(page, /חיפוש בכל הספר/);
  assert.match(page, /תעתיק מלא לעמוד/);
  assert.match(page, /הסבר AI בעברית · מפת קריאה/);
});

test("the reader keeps source, explanation, finding and publication axes separate", () => {
  assert.match(page, /function SourcePanel/);
  assert.match(page, /function OrbitMap/);
  assert.match(page, /function SectionReader/);
  assert.match(page, /הסבר נלווה · המקור המלא פתוח לצדו/);
  assert.match(page, /המקור נשאר פתוח/);
  assert.match(page, /מעמד חישוב:/);
  assert.match(page, /המקור נשמר בשלמותו/);
  assert.equal(AHAVAT_TORAH_PIPELINE[1].value, "98");
  assert.equal(AHAVAT_TORAH_PIPELINE.at(-1).value, "0");
  assert.equal(AHAVAT_TORAH_PIPELINE.at(-1).state, "locked");
  assert.match(page, /AHAVAT_TORAH_SOURCE\.pdfUrl.*#page=\$\{page\}/s);
});

test("the spatial reader is responsive, readable and preserves the canonical frame", () => {
  assert.match(css, /\.sod29-root:has\(\.ahavat29\)\{[^}]*overflow-y:visible/);
  assert.match(css, /\.ahavat29-source\{[^}]*position:sticky[^}]*top:76px/);
  assert.match(css, /var\(--s29-type-body\)/);
  assert.match(css, /var\(--s29-type-ui\)/);
  assert.match(css, /@media\(max-width:900px\)[\s\S]*grid-template-areas:"source" "story"/);
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(page, /<Sod2029Shell/);
  assert.doesNotMatch(page, /position:\s*fixed|BottomDock|SystemFrame2029/);
});

test("Hebrew display weight and page colors follow the proposed canonical contract", () => {
  assert.match(contract, /Hebrew display weight and optical density/);
  assert.match(contract, /650–760/);
  assert.match(contract, /800–900/);
  assert.match(css, /\.ahavat29-intro h1\{[^}]*font:660/);
  assert.doesNotMatch(css, /font:(?:8[8-9]0|900)[^;]*var\(--s29-font-display\)/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(css, /rgba?\(/i);
  assert.match(css, /--a29-gold:var\(--s29-brand-gold\)/);
  assert.match(css, /--a29-discovery:var\(--s29-discovery\)/);
});
