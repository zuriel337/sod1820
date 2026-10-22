import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const app = read("src/App2029.jsx");
const page = read("src/pages/BookPublicationReview2029Page.jsx");
const css = read("src/pages/bookPublicationReview2029.css");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const desk = read("src/lib/research/bookPublicationEvidenceReviewDesk.js");

test("Books review surface is unlinked, preview-only and reuses the internal noindex route", () => {
  assert.match(app, /VITE_BOOK_PUBLICATION_REVIEW_PREVIEW/);
  assert.match(app, /params\.get\("surface"\) === "books-publication-review"/);
  assert.match(app, /params\.get\("book"\)/);
  assert.match(app, /path="\/2029\/control" element=\{<ControlEntry2029 \/>\}/);
  assert.equal(frame.includes("books-publication-review"), false, "internal Books review must not enter global navigation");
  assert.match(page, /noindex:\s*true/);
  assert.match(page, /surface:\s*"books"/);
});

test("unified desk keeps server-derived admin verification before Book resolution", () => {
  const firstVerify = desk.indexOf("const adminVerified = await verifyAdminAccess()");
  const bookRead = desk.indexOf("const book = await readBookEntity(safeSlug)");
  assert.ok(firstVerify >= 0 && bookRead > firstVerify, "Book identity must not load before rd_is_admin succeeds");
  assert.match(page, /loadBookPublicationEvidenceReviewDesk\(slug, \{ limit: PAGE_SIZE, offset \}\)/);
  assert.doesNotMatch(page, /verifyBookPublicationReviewAdmin|fetchBookEntityBySlug/);
  assert.doesNotMatch(page, /useAuth|\bisAdmin\b/, "a client profile flag must not authorize this screen");
  assert.match(desk, /if \(!adminVerified\) return restrictedState\("admin", false\)/);
});

test("UI consumes the unified bounded desk and inspects the canonical Judgment contract without a write path", () => {
  assert.match(page, /loadBookPublicationEvidenceReviewDesk\(slug, \{ limit: PAGE_SIZE, offset \}\)/);
  assert.match(page, /availableBookReviewJudgments/);
  assert.doesNotMatch(page, /executeBookReviewJudgment|admin_research_review|\.rpc\(|\.from\(["']research_objects|\.update\(|\.insert\(|\.upsert\(/);
  assert.doesNotMatch(page, /onRequestJudgment|onConfirm|requestJudgment|executeJudgment/);
  assert.doesNotMatch(page, /decision:\s*["']publish["']/);
  assert.match(page, /החלטות ממשל אפשריות בעתיד/);
  assert.match(page, /לא פעיל/);
  assert.match(page, /status:\s*"מנהל · קריאה בלבד"/);
});

test("authorized evidence presentation is paired by id and remains human-gated", () => {
  assert.match(page, /new Map\(\(evidencePresentation\?\.packets \|\| \[\]\)\.map\(item => \[item\.id, item\]\)\)/);
  assert.match(page, /evidence=\{evidenceById\.get\(item\.id\)\}/);
  assert.match(page, /מה כבר מוכן ומה דורש השלמה/);
  assert.match(page, /מוכנות להכרעת נאמנות אנושית בלבד/);
  assert.match(page, /השער נשאר אנושי/);
  assert.match(page, /השלמת הראיות אינה קובעת נאמנות ואינה משנה את מצב הפרסום/);
  assert.doesNotMatch(page, /requirement\.evidence|evidence\.claim|evidence\.source/);
});

test("governance, access and publication remain visibly separate", () => {
  assert.match(page, /public_candidate/);
  assert.match(page, /<code dir="ltr">public<\/code>/);
  assert.match(page, /בדיקת ממשל אינה פרסום/);
  assert.match(page, /אין כרגע גבול פרסום מאושר במסך/);
  assert.match(page, /אינו משנה ממשל, גישה או פרטיות ואינו מפרסם חומר/);
  assert.match(page, /״מוכן לביקורת אנושית״ אינו ״מוכן לפרסום״/);
  assert.match(page, /אינו מחשב מוכנות לפרסום ואינו קובע שלמות חילוץ/);
  assert.match(page, /לא מוצג כחסר או כנכשל/);
  assert.match(page, /נאמנות חילוץ/);
  assert.match(page, /not_recorded/);
  assert.match(page, /היעדר ערך אינו מוכיח חילוץ מלא ואינו מוכיח כשל/);
  assert.match(page, /data-publication-effect="none"/);
  assert.match(page, /presentBookAccessStatus/);
  assert.match(page, /presentBookResearchStatus/);
  assert.match(page, /presentBookVerificationState/);
});

test("restricted and failure states stay fail-closed without fixtures or raw backend errors", () => {
  assert.match(page, /restriction === "reader"/);
  assert.match(page, /אין fallback, נתוני דמה או הרחבת הרשאות/);
  assert.doesNotMatch(page, /error\?\.message|String\(error|console\.error/);
  assert.doesNotMatch(page, /fixture|mockReview|synthetic/i);
});

test("visual contract uses semantic tokens and covers narrow mobile and reduced motion", () => {
  assert.match(css, /var\(--s29-/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i, "page-local color literals are forbidden");
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /min-height:44px/);
  assert.match(page, /aria-label="צירי מצב נפרדים"/);
  assert.match(page, /aria-label="חבילת ראיות להכרעת נאמנות"/);
  assert.doesNotMatch(page, /<dialog|showModal/);
});
