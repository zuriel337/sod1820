import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("src/pages/AhavatTorahSystem2029Page.jsx");
const scene = read("src/components/books2029/AhavatTorahSpatialScene2029.jsx");
const css = read("src/pages/ahavatTorahSystem2029.css");
const bundle = JSON.parse(read("public/book-data/ahavat-torah.tables.json"));

test("Ahavat Torah spatial observatory encodes source footprint and truth state only", () => {
  assert.match(page, /lazy\(\(\) => import\("\.\.\/components\/books2029\/AhavatTorahSpatialScene2029\.jsx"\)\)/);
  assert.match(page, /גובה = מספר עמודי מקור/);
  assert.match(page, /צבע = מצב קריאה/);
  assert.match(page, /מיקום = סדר המאגר/);
  assert.match(scene, /dataset\.pages\.length/);
  assert.match(scene, /STATUS_COLORS\[dataset\.state\]/);
  assert.doesNotMatch(scene, /dataset\.total/);
  assert.match(page, /showScene \? <div className="ahavat29-spatial-scene">/);
  assert.match(page, /המודל נטען רק בלחיצה/);
});

test("the table explorer exposes every bounded structured layer", () => {
  assert.equal(bundle.datasets.length, 13);
  assert.equal(bundle.occurrence_tables.length, 3);
  assert.equal(bundle.occurrence_tables[0].rows.length, 187);
  assert.equal(bundle.occurrence_tables[1].rows.length, 37);
  assert.equal(bundle.occurrence_tables[1].current_reading.rows.length, 10);
  assert.equal(bundle.occurrence_tables[2].rows.length, 5);
  assert.equal(bundle.calculations.length, 7);
  assert.equal(bundle.number_families.length, 9);
  assert.equal(bundle.contradictions.length, 10);
  for (const count of [13, 187, 10, 5, 7, 9, 10]) assert.match(page, new RegExp(`count: ${count}`));
  assert.match(page, /function OccurrenceTable/);
  assert.match(page, /function ResearchCards/);
  assert.match(page, /פרטי המקור/);
});

test("every spatial and tabular selection keeps an exact PDF action", () => {
  assert.match(page, /onSelect\(dataset\)/);
  assert.match(page, /onPage\(page\)/);
  assert.match(page, /dataset\.pages\.length \? `פתח PDF \$\{dataset\.pages\[0\]\}` : "פרטי האיתור"/);
  assert.match(page, /ahavatDatasetSourcePage\(dataset, page\)/);
  assert.match(page, /PDF \{page\}/);
  assert.match(page, /AHAVAT_TORAH_SOURCE\.pdfPages/);
  assert.match(page, /שכבת הטבלאות לא נטענה\. ה־PDF המלא נשאר זמין/);
});

test("the spatial system remains accessible and responsive without WebGL", () => {
  assert.match(page, /role="list" aria-label="שלושה עשר מאגרי הספר"/);
  assert.match(page, /aria-expanded=\{showScene\}/);
  assert.match(page, /<table className="ahavat29-data-table">/);
  assert.match(scene, /role="img"/);
  assert.match(scene, /prefers-reduced-motion: reduce/);
  assert.match(css, /@media\(max-width:650px\)[\s\S]*\.ahavat29-spatial-legend\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(css, /\.ahavat29-data-table-wrap\{[^}]*overflow:auto/);
});
