import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { AHAVAT_LOCATED_DATASETS, AHAVAT_TORAH_SECTIONS, AHAVAT_TORAH_SOURCE } from "../src/data/ahavatTorahSystem2029.js";
import { ahavatReaderUnit } from "../src/data/ahavatTorahReaderUnits2029.js";
import { getBookReaderManifest } from "../src/data/bookReader2029.js";
import { AHAVAT_CARD_TOPICS, AHAVAT_COVER_IMAGE, AHAVAT_RECOMMENDED_STARTS, ahavatDivisionForPage, ahavatNavigationHierarchy, ahavatNavigationSearch } from "../src/data/ahavatBookNavigation2029.js";

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const page = read("src/pages/AhavatTorahSystem2029Page.jsx");
const books = read("src/pages/Books2029Page.jsx");
const entry = read("src/components/books2029/AhavatBookEntry2029.jsx");

test("seven divisions cover all 99 source pages exactly once and invent no chapter", () => {
  const manifest = getBookReaderManifest("ahavat-torah");
  const hierarchy = ahavatNavigationHierarchy();
  assert.deepEqual(hierarchy.map(item => [item.id, item.from, item.to]), manifest.chapters.map(item => [item.id, item.from, item.to]));
  assert.equal(hierarchy.length, 7);
  for (let pageNumber = 1; pageNumber <= AHAVAT_TORAH_SOURCE.pdfPages; pageNumber += 1) {
    assert.equal(hierarchy.filter(item => pageNumber >= item.from && pageNumber <= item.to).length, 1, `page ${pageNumber}`);
    assert.equal(ahavatDivisionForPage(pageNumber).id, hierarchy.find(item => pageNumber >= item.from && pageNumber <= item.to).id);
  }
});

test("eight areas are reconciled under divisions by page overlap only", () => {
  const hierarchy = ahavatNavigationHierarchy();
  for (const section of AHAVAT_TORAH_SECTIONS) {
    const homes = hierarchy.flatMap(division => division.areas.filter(area => area.id === section.id).map(area => ({ division, area })));
    assert.ok(homes.length >= 1, section.id);
    for (const { division, area } of homes) {
      assert.ok(area.from >= section.range[0] && area.to <= section.range[1] && area.from >= division.from && area.to <= division.to);
    }
    // The overlaps together reproduce the author's area range with no gap or extra page.
    const pages = new Set(homes.flatMap(({ area }) => Array.from({ length: area.to - area.from + 1 }, (_, index) => area.from + index)));
    assert.equal(pages.size, section.range[1] - section.range[0] + 1, section.id);
  }
});

test("every located topic appears once, under the division that holds its first source page", () => {
  const placed = ahavatNavigationHierarchy().flatMap(division => division.topics.map(topic => ({ id: topic.id, division })));
  assert.deepEqual(placed.map(item => item.id).sort(), AHAVAT_LOCATED_DATASETS.map(item => item.id).sort());
  for (const { id, division } of placed) {
    const dataset = AHAVAT_LOCATED_DATASETS.find(item => item.id === id);
    assert.ok(dataset.pages[0] >= division.from && dataset.pages[0] <= division.to);
  }
});

test("topic search finds the divine-name count and never searches OCR", () => {
  for (const query of ["1820", "1,820", "שם ה׳", "שם ה"]) assert.ok(ahavatNavigationSearch(query).some(item => item.datasetId === "DS-01"), query);
  assert.deepEqual(ahavatNavigationSearch("א"), []);
  assert.deepEqual(ahavatNavigationSearch("zzzzzz"), []);
  assert.doesNotMatch(read("src/data/ahavatBookNavigation2029.js"), /page-text|pageText|fetch\(/i);
});

test("the three recommendations stay the existing reader units under their own visible heading", () => {
  assert.equal(AHAVAT_RECOMMENDED_STARTS.length, 3);
  for (const item of AHAVAT_RECOMMENDED_STARTS) assert.ok(ahavatReaderUnit(item.id), item.id);
  assert.match(entry, /<h2 id="ahavat29-recommended-title">קטעים מומלצים להתחלה<\/h2>/);
  assert.match(entry, /aria-label="מאיפה מתחילים ללמוד"/);
  assert.match(page, /<AhavatBookToc2029 /);
  assert.ok(page.indexOf("<AhavatBookToc2029") > page.indexOf("<AhavatRecommendedStarts2029"), "contents follow the recommendations and are a separate component");
});

test("five coverage metrics moved into the source disclosure with their values intact", () => {
  const start = page.indexOf('<details className="ahavat29-source-details ahavat29-source-status">');
  const end = page.indexOf("</details>", start);
  assert.ok(start > 0 && end > start);
  const block = page.slice(start, end);
  assert.match(block, /פרטי המקור ומצב ההשלמה/);
  for (const label of ["עמודי מקור", "עמודי תעתיק", "יחידות הסבר נבחרות", "עמודים עם יחידות לימוד", "נושאים עם עמוד מקור"]) assert.ok(block.includes(label), label);
  assert.equal((block.match(/<article>/g) || []).length, 5);
  assert.ok(page.indexOf('className="ahavat29-metrics"') > start, "no metrics left in the opening");
});

test("only Ahavat Torah receives the prototype card; no third reader and no BookHubPage", () => {
  assert.match(books, /if \(slug === AHAVAT_BOOK_SLUG && reader\) return <AhavatPrototypeCard/);
  assert.equal((books.match(/AhavatPrototypeCard/g) || []).length, 2);
  for (const source of [page, books, entry]) assert.doesNotMatch(source, /BookHubPage/);
  assert.match(books, /className="sod29-book-tile books29-card"/);
  assert.equal(AHAVAT_CARD_TOPICS.length, 4);
  assert.match(books, /<h3 id="books29-card-ahavat-title">/);
  assert.match(books, /פתח את הספר/);
});

test("the card shows a real source page, not a generated illustration", () => {
  const file = new URL(`../public${AHAVAT_COVER_IMAGE.src}`, import.meta.url);
  assert.ok(existsSync(file));
  assert.ok(statSync(file).size > 10_000 && statSync(file).size < 120_000);
  assert.equal(readFileSync(file).subarray(8, 12).toString(), "WEBP");
  assert.match(AHAVAT_COVER_IMAGE.alt, /צילום PDF 1/);
  assert.match(AHAVAT_COVER_IMAGE.caption, /צילום מן המקור/);
});

test("connections use existing destinations only and report the missing ones as a gap", () => {
  assert.match(entry, /surface=books-unified-reader&book=\$\{AHAVAT_BOOK_SLUG\}&page=/);
  assert.match(entry, /\/2029\/number\/\$\{numeric\}/);
  assert.match(entry, /מה עדיין לא מחובר/);
  assert.match(entry, /החיבור לעץ, להיכל ולעולם עדיין אינו קיים עבור בחירה בתוך ספר/);
  assert.doesNotMatch(entry, /href=["'`]\/(heichal|world|היכל)/);
  assert.match(entry, /selectionToWorkspaceItem/);
  assert.doesNotMatch(entry, /updateResearchContext|setContext/, "the entry never rewrites the incoming research context");
});

test("in-page jumps wait for lazy layout and keep the header clearance", () => {
  assert.match(page, /function stableJump\(id\)/);
  assert.match(page, /new ResizeObserver\(align\)/);
  assert.match(page, /onClick=\{jumpOnClick\}>למד עם ההסברים/);
  const css = read("src/pages/ahavatTorahSystem2029.css");
  assert.match(css, /content-visibility:auto;contain-intrinsic-size:auto 1400px/, "optimization kept, not disabled");
  assert.match(read("src/components/books2029/ahavatBookEntry2029.css"), /scroll-margin-top:var\(--ahavat29-jump-clearance,92px\)/);
});
