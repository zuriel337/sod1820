import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const app = read("src/App2029.jsx");
const page = read("src/pages/BooksLibraryJourney2029Page.jsx");
const css = read("src/pages/booksLibraryJourney2029.css");
const projection = read("src/lib/research/bookLibraryJourneyProjection.js");

test("all-books journey is an unlinked Preview surface", () => {
  assert.match(app, /books-library-journey/);
  assert.match(app, /VITE_BOOK_PUBLICATION_REVIEW_PREVIEW/);
  assert.match(app, /BooksLibraryJourney2029Page/);
  assert.match(page, /noindex:\s*true/);
  assert.match(page, /data-publication-effect="none"/);
});

test("screen keeps unverified material visible without calling it public", () => {
  assert.match(page, /גם ספר שלא אומת נשאר נראה/);
  assert.match(page, /זהות אינה אימות/);
  assert.match(page, /כל ספר נשאר נראה, בכל מצב/);
  assert.match(page, /טרם הופעל/);
  assert.match(page, /החלטת פרסום/);
  assert.match(page, /המסלול אינו ציון אמת/);
  assert.doesNotMatch(page, /\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/);
});

test("reader is bounded and projection strips raw Book metadata", () => {
  assert.match(projection, /\.eq\("type", "book"\)/);
  assert.match(projection, /\.limit\(MAX_BOOK_LIBRARY_ITEMS\)/);
  assert.match(projection, /publicationEffect: "none"/);
  assert.doesNotMatch(page, /source_ref_prefixes|digital_object|metadata\./);
  assert.doesNotMatch(page, /privacy_scope|research_objects/);
});

test("spatial library is responsive, semantic and motion-safe", () => {
  assert.match(css, /perspective:1000px/);
  assert.match(css, /transform-style:preserve-3d/);
  assert.match(css, /@keyframes books-journey29-spin/);
  assert.match(css, /@media\(max-width:520px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /var\(--s29-/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
});

