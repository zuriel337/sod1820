import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const app = read("src/App2029.jsx");
const page = read("src/pages/BentovFindingsProduct2029Page.jsx");
const css = read("src/pages/bentovFindingsProduct2029.css");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");

test("Bentov product is an unlinked Preview surface on the existing control document", () => {
  assert.match(app, /surface"\) === "bentov-findings-product"/);
  assert.match(app, /VITE_BOOK_PUBLICATION_REVIEW_PREVIEW/);
  assert.match(app, /BentovFindingsProduct2029Page/);
  assert.equal(frame.includes("bentov-findings-product"), false);
  assert.match(page, /noindex:\s*true/);
  assert.match(page, /status="Preview · קריאה בלבד"/);
});

test("product data is visibly a synthetic display model and cannot publish", () => {
  assert.match(page, /data-preview-data="synthetic"/);
  assert.match(page, /data-publication-effect="none"/);
  assert.match(page, /הדמיית מוצר — לא חומר שפורסם/);
  assert.match(page, /נוסחי הממצאים והקשרים במפה הם הדגמת ממשק בלבד/);
  assert.match(page, />0<\/strong><span>ציבוריים/);
  assert.doesNotMatch(page, /supabase|\.rpc\(|\.from\(["']|fetch\(|axios|admin_research_review|set_publication/i);
});

test("status axes and actual inventory totals remain separate", () => {
  assert.match(page, /const TOTAL_FINDINGS = 33/);
  assert.match(page, /\.\.\.Array\(17\)\.fill\("observation"\)/);
  assert.match(page, /\.\.\.Array\(6\)\.fill\("hypothesis"\)/);
  assert.match(page, /\.\.\.Array\(5\)\.fill\("claim"\)/);
  assert.match(page, /\.\.\.Array\(5\)\.fill\("relation"\)/);
  for (const label of ["קליטה", "התאמה", "אימות", "ממשל", "גישה"]) assert.match(page, new RegExp(label));
  for (const total of ["33", "5", "28", "18"]) assert.match(page, new RegExp(`<strong>${total}</strong>`));
  assert.match(page, /data-live-inventory="aggregate-only"/);
  assert.match(page, /0 \/ 33/);
  assert.match(page, /נדרשת בדיקת תחולה, לא כשל אוטומטי/);
  assert.match(page, /עמודי המקור והספירות משקפים את המלאי הקיים/);
  assert.match(page, /\{ page: 109, findings: 1 \}/);
  const sourceWindows = [...page.matchAll(/\{ page: (\d+), findings: (\d+) \}/g)];
  assert.equal(sourceWindows.length, 18);
  assert.equal(sourceWindows.reduce((total, match) => total + Number(match[2]), 0), 33);
});

test("interactive controls are accessible and local-only", () => {
  assert.match(page, /aria-label="מפה אינטראקטיבית/);
  assert.match(page, /aria-pressed=/);
  assert.match(page, /role="group" aria-label="סינון לפי סוג ממצא"/);
  assert.match(page, /הסימון זמני במכשיר ואינו נשמר, מאשר או מפרסם דבר/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});

test("visual layer uses the project semantic tokens and a local illustration", () => {
  assert.match(page, /\/2029\/books\/bentov\/bentov-consciousness-map\.webp/);
  assert.match(css, /var\(--s29-/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
});
