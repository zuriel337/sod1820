import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  AHAVAT_TORAH_FINDINGS,
  AHAVAT_TORAH_PIPELINE,
  AHAVAT_TORAH_SECTIONS,
  AHAVAT_TORAH_SOURCE,
  AHAVAT_TORAH_TRUTH_STATES,
  sectionForPage,
} from "../src/data/ahavatTorahSystem2029.js";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const app = read("src/App2029.jsx");
const page = read("src/pages/AhavatTorahSystem2029Page.jsx");
const css = read("src/pages/ahavatTorahSystem2029.css");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const bundle = JSON.parse(read("public/book-data/ahavat-torah.tables.json"));

test("Ahavat Torah system is an unlinked noindex read-only Preview surface", () => {
  assert.match(app, /surface"\) === "ahavat-torah-system"/);
  assert.match(app, /VITE_BOOK_PUBLICATION_REVIEW_PREVIEW/);
  assert.match(app, /AhavatTorahSystem2029Page/);
  assert.equal(frame.includes("ahavat-torah-system"), false);
  assert.match(page, /noindex:\s*true/);
  assert.match(page, /status="Preview מוגן · קריאה בלבד"/);
  assert.match(page, /data-preview-only="true"/);
  assert.match(page, /data-publication-effect="none"/);
  assert.doesNotMatch(page, /supabase|\.rpc\(|\.from\(["']|fetch\(|axios|insert|update\(/i);
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
  assert.deepEqual(Object.keys(AHAVAT_TORAH_TRUTH_STATES), ["source_verified", "source_located", "structural_map", "candidate", "open"]);
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

test("the reader keeps source, explanation, finding and publication axes separate", () => {
  assert.match(page, /function SourcePanel/);
  assert.match(page, /function OrbitMap/);
  assert.match(page, /function SectionReader/);
  assert.match(page, /הסבר זה נוצר כשכבת ניווט מסייעת/);
  assert.match(page, /המקור נשאר פתוח/);
  assert.match(page, /מעמד חישוב:/);
  assert.match(page, /מיפוי מלא אינו שווה לתעתיק מלא/);
  assert.equal(AHAVAT_TORAH_PIPELINE.at(-1).value, "0");
  assert.equal(AHAVAT_TORAH_PIPELINE.at(-1).state, "locked");
  assert.match(page, /AHAVAT_TORAH_SOURCE\.pdfUrl.*#page=\$\{page\}/s);
});

test("the spatial reader is responsive, readable and preserves the canonical frame", () => {
  assert.match(css, /\.sod29-root:has\(\.ahavat29\)\{[^}]*overflow-y:visible/);
  assert.match(css, /\.ahavat29-source\{[^}]*position:sticky[^}]*top:76px/);
  assert.match(css, /var\(--s29-type-body,18px\)/);
  assert.match(css, /var\(--s29-type-ui,16px\)/);
  assert.match(css, /@media\(max-width:900px\)[\s\S]*grid-template-areas:"source" "story"/);
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(page, /<Sod2029Shell/);
  assert.doesNotMatch(page, /position:\s*fixed|BottomDock|SystemFrame2029/);
});

