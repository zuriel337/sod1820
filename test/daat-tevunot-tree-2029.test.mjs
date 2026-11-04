import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  DAAT_TEVUNOT_BRANCHES,
  DAAT_TEVUNOT_SECTIONS,
  DAAT_TEVUNOT_SOURCE,
} from "../src/data/daatTevunotSections2029.js";
import {
  DAAT_TEVUNOT_CONNECTIONS_BY_BRANCH,
  DAAT_TEVUNOT_RELATION_STATES,
  DAAT_TEVUNOT_WORLD_LENSES,
  connectionBundleForSection,
} from "../src/data/daatTevunotConnections2029.js";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const app = read("src/App2029.jsx");
const page = read("src/pages/DaatTevunotTree2029Page.jsx");
const css = read("src/pages/daatTevunotTree2029.css");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");

test("Daat Tevunot is an unlinked, noindex, read-only Preview surface", () => {
  assert.match(app, /surface"\) === "daat-tevunot-tree"/);
  assert.match(app, /VITE_BOOK_PUBLICATION_REVIEW_PREVIEW/);
  assert.match(app, /DaatTevunotTree2029Page/);
  assert.equal(frame.includes("daat-tevunot-tree"), false);
  assert.match(page, /noindex:\s*true/);
  assert.match(page, /status="Preview מוגן · קריאה בלבד"/);
  assert.match(page, /data-preview-only="true"/);
  assert.match(page, /data-publication-effect="none"/);
  assert.doesNotMatch(page, /supabase|\.rpc\(|\.from\(["']|fetch\(|axios|insert|update\(/i);
});

test("the licensed corpus contains exactly 195 sequential, source-backed sections", () => {
  assert.equal(DAAT_TEVUNOT_SOURCE.sectionCount, 195);
  assert.equal(DAAT_TEVUNOT_SOURCE.pdfPages, 99);
  assert.equal(DAAT_TEVUNOT_SOURCE.license, "CC BY-SA 4.0");
  assert.match(DAAT_TEVUNOT_SOURCE.wikisourceUrl, /wikisource\.org/);
  assert.match(DAAT_TEVUNOT_SOURCE.pdfUrl, /daat-tevunot-site-edition\.pdf$/);
  assert.equal(DAAT_TEVUNOT_SECTIONS.length, 195);
  assert.deepEqual(DAAT_TEVUNOT_SECTIONS.map(section => section.id), Array.from({ length: 195 }, (_, index) => index + 1));
  assert.equal(DAAT_TEVUNOT_SECTIONS[0].marker, "א");
  assert.equal(DAAT_TEVUNOT_SECTIONS.at(-1).marker, "קצה");
  assert.equal(DAAT_TEVUNOT_SECTIONS[0].pdfPage, 3);
  assert.equal(DAAT_TEVUNOT_SECTIONS.at(-1).pdfPage, 98);
  for (const section of DAAT_TEVUNOT_SECTIONS) {
    assert.ok(section.sourceText.length > 4, `section ${section.id} has source text`);
    assert.ok(section.focus.length > 4, `section ${section.id} has a reading focus`);
    assert.ok(section.pdfPage >= 3 && section.pdfPage <= 99, `section ${section.id} has a valid PDF page`);
    assert.ok(["הנשמה", "השכל"].includes(section.speaker));
  }
});

test("nine non-overlapping branches cover the whole book and include both governance modes", () => {
  assert.equal(DAAT_TEVUNOT_BRANCHES.length, 9);
  assert.equal(DAAT_TEVUNOT_BRANCHES.reduce((total, branch) => total + branch.range[1] - branch.range[0] + 1, 0), 195);
  const assigned = new Map();
  for (const branch of DAAT_TEVUNOT_BRANCHES) {
    assert.ok(branch.summary.length > 20);
    assert.ok(branch.plainGuide.length > 40);
    assert.equal(branch.questions.length, 2);
    for (let id = branch.range[0]; id <= branch.range[1]; id += 1) {
      assert.equal(assigned.has(id), false, `section ${id} assigned once`);
      assigned.set(id, branch.key);
    }
  }
  assert.equal(assigned.size, 195);
  assert.ok(DAAT_TEVUNOT_BRANCHES.some(branch => branch.title === "הנהגת המשפט"));
  assert.ok(DAAT_TEVUNOT_BRANCHES.some(branch => branch.title === "הנהגת הייחוד"));
  for (const section of DAAT_TEVUNOT_SECTIONS) assert.equal(section.branch, assigned.get(section.id));
});

test("every selected section keeps the full source, page and modern reading guide together", () => {
  assert.match(page, /function SourcePanel/);
  assert.match(page, /function ReadingPanel/);
  assert.match(page, /section\.sourceText/);
  assert.match(page, /branch\.plainGuide/);
  assert.match(page, /מוקד הסעיף · מתוך המקור/);
  assert.match(page, /מפתח קריאה נלווה · נוסח המקור המלא מופיע מעליו/);
  assert.match(page, /DAAT_TEVUNOT_SOURCE\.pdfUrl.*#page=\$\{section\.pdfPage\}/s);
  assert.match(page, /המקור המלא · PDF/);
  assert.match(page, /<dt>עד<\/dt><dd>מהדורת האתר<\/dd>/);
  assert.match(page, /שלוש שכבות שאינן מתערבבות/);
  assert.match(page, /הדוסייה הקנוני נשאר פרטי ומועמד/);
});

test("all 195 sections project into one typed connection tree without inventing numeric results", () => {
  assert.deepEqual(Object.keys(DAAT_TEVUNOT_RELATION_STATES), [
    "source_explicit",
    "structural_map",
    "interpretive_candidate",
    "engine_pending",
  ]);
  assert.equal(Object.keys(DAAT_TEVUNOT_CONNECTIONS_BY_BRANCH).length, DAAT_TEVUNOT_BRANCHES.length);
  assert.deepEqual(DAAT_TEVUNOT_WORLD_LENSES.map(world => world.title), ["אצילות", "בריאה", "יצירה", "עשייה"]);

  for (const section of DAAT_TEVUNOT_SECTIONS) {
    const bundle = connectionBundleForSection(section);
    assert.ok(bundle, `section ${section.id} has a bundle`);
    assert.ok(bundle.governance.length >= 3, `section ${section.id} has governance axes`);
    assert.equal(bundle.worlds.length, 4, `section ${section.id} sees all world lenses`);
    assert.ok(bundle.worlds.some(world => world.active), `section ${section.id} has an active world lens`);
    assert.ok(bundle.gematria.length >= 1, `section ${section.id} has a bounded gematria handoff`);
    assert.ok(bundle.gematria.every(item => item.calculationStatus === "engine_pending"));
    assert.ok(bundle.gematria.every(item => !("value" in item)), `section ${section.id} has no guessed value`);
    for (const concept of bundle.concepts) assert.ok(section.sourceText.includes(concept.label));
  }
});

test("connection experience separates source, structure, world comparison and canonical engine handoff", () => {
  assert.match(page, /function ConnectionTree/);
  assert.match(page, /עץ הקשרים · סעיף/);
  assert.match(page, /מן המקור אל ההנהגה, העולמות והמספר/);
  assert.match(page, /role="tablist" aria-label="שכבות עץ הקשרים"/);
  assert.match(page, /מפורשים בסעיף/);
  assert.match(page, /צירי ניווט/);
  assert.match(page, /עדשות השוואה/);
  assert.match(page, /מוכן למנוע/);
  assert.match(page, /href=\{`\/2029\/gematria\?q=\$\{encodeURIComponent\(item\.term\)\}`\}/);
  assert.match(page, /המסך אינו מציג ערך מספרי משוער/);
  assert.match(page, /אינם מיוחסים לטקסט בלי מקור משווה נוסף/);
  assert.match(page, /data-source-status=\{item\.sourceStatus\}/);
  assert.doesNotMatch(page, /gematriaValue|calculatedValue|numericResult/);
});

test("the responsive tree preserves a large sticky PDF and accessible reduced motion", () => {
  assert.match(css, /\.daat29-product-layout\{[^}]*grid-template-areas:"story source"/);
  assert.match(css, /\.daat29-source\{[^}]*position:sticky/);
  assert.match(css, /\.sod29-root:has\(\.daat29\)\{[^}]*overflow-y:visible/);
  assert.match(css, /\.daat29-source\{[^}]*top:76px/);
  assert.match(css, /grid-template-rows:auto minmax\(430px,1fr\)/);
  assert.match(css, /@media\(max-width:900px\)[\s\S]*grid-template-areas:"source" "story"/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /\.daat29-connection-map/);
  assert.match(css, /\.daat29-worlds/);
  assert.match(css, /\.daat29-gematria-terms/);
  assert.match(page, /aria-label="בחירת ענף"/);
  assert.match(page, /aria-label="מעבר בין סעיפים"/);
  assert.match(page, /aria-live="polite"/);
});
