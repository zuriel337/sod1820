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
  for (const total of ["33", "5", "28", "3", "8", "22"]) assert.match(page, new RegExp(`<strong>${total}</strong>`));
  assert.match(page, /data-live-inventory="aggregate-only"/);
  assert.match(page, /0 \/ 33/);
  assert.match(page, /נדרשת בדיקת תחולה, לא כשל אוטומטי/);
  assert.match(page, /האיתור השמור מוצג מול חלון ה־PDF שנמצא בביקורת/);
  assert.match(page, /\{ page: 109, findings: 1 \}/);
  const sourceWindows = [...page.matchAll(/\{ page: (\d+), findings: (\d+) \}/g)];
  assert.equal(sourceWindows.length, 18);
  assert.equal(sourceWindows.reduce((total, match) => total + Number(match[2]), 0), 33);
});

test("locator audit is aggregate-only, complete and keeps stored locators distinct", () => {
  assert.match(page, /const LOCATOR_AUDIT_BY_STORED_PAGE/);
  assert.match(page, /reviewed:\s*33/);
  assert.match(page, /confirmed:\s*3/);
  assert.match(page, /expanded:\s*8/);
  assert.match(page, /correction:\s*22/);
  assert.match(page, /איתור שמור/);
  assert.match(page, /בדיקת PDF/);
  assert.match(page, /data-live-inventory="aggregate-only"/);
  assert.doesNotMatch(page, /finding_key|source_provenance_reconstructed_sections|direct_sequel_first_book/i);

  const audits = [...page.matchAll(/^\s+(\d+): \{ confirmed: (\d+), expanded: (\d+), correction: (\d+), verifiedPages: "([^"]+)" \},$/gm)];
  assert.equal(audits.length, 18);
  assert.equal(audits.reduce((total, match) => total + Number(match[2]) + Number(match[3]) + Number(match[4]), 0), 33);
  assert.equal(audits.reduce((total, match) => total + Number(match[2]), 0), 3);
  assert.equal(audits.reduce((total, match) => total + Number(match[3]), 0), 8);
  assert.equal(audits.reduce((total, match) => total + Number(match[4]), 0), 22);
});

test("fidelity work queue preserves overlap math and requires human classification", () => {
  assert.match(page, /const FIDELITY_WORK_QUEUE/);
  assert.match(page, /count:\s*15/);
  assert.match(page, /count:\s*18/);
  assert.match(page, /5 מנוע \+ 12 הליך − 2 חופפים/);
  assert.equal(5 + 12 - 2, 15);
  assert.equal(15 + 18, 33);
  assert.match(page, /derivations:\s*0/);
  assert.match(page, /mediaRefs:\s*0/);
  assert.match(page, /recordedIntegrity:\s*0/);
  assert.match(page, /אין סיווג אוטומטי ל־complete או partial/);
  assert.match(page, /היעדר סטטוס אינו כשל ואינו אישור/);
  assert.match(page, /data-fidelity-effect="assessment-only"/);
});

test("interactive controls are accessible and local-only", () => {
  assert.match(page, /aria-label="מפה אינטראקטיבית/);
  assert.match(page, /aria-pressed=/);
  assert.match(page, /role="group" aria-label="סינון לפי סוג ממצא"/);
  assert.match(page, /role="group" aria-label="בחירת קבוצת עבודה לבדיקת נאמנות"/);
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
