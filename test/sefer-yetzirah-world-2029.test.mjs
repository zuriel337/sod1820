import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  SEFER_YETZIRAH_COMMENTATORS,
  SEFER_YETZIRAH_DEPTHS,
  SEFER_YETZIRAH_LETTER_GROUPS,
  SEFER_YETZIRAH_LETTERS,
  SEFER_YETZIRAH_PAGE_ATLAS,
  SEFER_YETZIRAH_READING_GATES,
  SEFER_YETZIRAH_SCENE_MODES,
  SEFER_YETZIRAH_SOURCE,
  SEFER_YETZIRAH_VOLUME_LAYERS,
  getSeferYetzirahGateNumber,
} from "../src/data/seferYetzirahWorld2029.js";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const app = read("src/App2029.jsx");
const page = read("src/pages/SeferYetzirahWorld2029Page.jsx");
const scene = read("src/components/books2029/SeferYetzirahScene2029.jsx");
const css = read("src/pages/seferYetzirahWorld2029.css");

test("Sefer Yetzirah world is an unlinked noindex Preview surface", () => {
  assert.match(app, /VITE_BOOK_PUBLICATION_REVIEW_PREVIEW/);
  assert.match(app, /surface.*sefer-yetzirah-world/);
  assert.match(app, /lazy\(\(\) => import\("\.\/pages\/SeferYetzirahWorld2029Page\.jsx"\)\)/);
  assert.match(page, /noindex: true/);
  assert.doesNotMatch(page, /<Link|href="\/2029\/control\?surface=sefer-yetzirah-world/);
});

test("the complete reading architecture stays anchored to the 220-page source", () => {
  assert.equal(SEFER_YETZIRAH_SOURCE.pdfPages, 220);
  assert.equal(SEFER_YETZIRAH_SOURCE.identity, "book:sefer-yetzirah-9perushim");
  assert.equal(SEFER_YETZIRAH_READING_GATES.length, 12);
  assert.equal(SEFER_YETZIRAH_VOLUME_LAYERS.length, 5);
  assert.ok(SEFER_YETZIRAH_READING_GATES.every(gate => gate.page >= 1 && gate.page <= 220));
  assert.ok(SEFER_YETZIRAH_READING_GATES.every(gate => gate.sourceRef.startsWith(`${SEFER_YETZIRAH_SOURCE.identity}#p${gate.page}:`)));
  assert.match(page, /דברי הספר/);
  assert.match(page, /פירוש עברי/);
  assert.match(page, /BookFullscreenButton2029/);
  assert.match(page, /data-book-pdf-frame/);
});

test("the spatial grammar includes real 3D modes for sefirot, letters, gates, OSN and commentaries", () => {
  assert.deepEqual(SEFER_YETZIRAH_SCENE_MODES.map(mode => mode.id), ["sefirot", "letters", "gates", "osn", "commentaries"]);
  assert.equal(SEFER_YETZIRAH_DEPTHS.length, 10);
  assert.deepEqual(SEFER_YETZIRAH_LETTER_GROUPS.map(group => group.count), [3, 7, 12]);
  assert.equal(SEFER_YETZIRAH_LETTER_GROUPS.reduce((sum, group) => sum + group.count, 0), 22);
  assert.match(page, /lazy\(\(\) => import\("\.\.\/components\/books2029\/SeferYetzirahScene2029\.jsx"\)\)/);
  assert.match(scene, /Canvas/);
  assert.match(scene, /OrbitControls/);
  assert.match(scene, /lineSegments/);
  assert.match(scene, /for \(let j = i \+ 1; j < points\.length; j \+= 1\)/);
  assert.match(scene, /prefers-reduced-motion/);
  assert.match(page, /class SpatialErrorBoundary/);
});

test("the commentary atlas covers the full volume and all nine printed voices", () => {
  assert.equal(SEFER_YETZIRAH_COMMENTATORS.length, 9);
  assert.equal(SEFER_YETZIRAH_PAGE_ATLAS.length, 220);
  assert.deepEqual(SEFER_YETZIRAH_PAGE_ATLAS.map(item => item.page), Array.from({ length: 220 }, (_, index) => index + 1));
  assert.ok(SEFER_YETZIRAH_PAGE_ATLAS.every(item => item.zoneId && item.title && item.guide));
  assert.ok(SEFER_YETZIRAH_COMMENTATORS.every(item => item.start >= 1 && item.end <= 220 && item.start <= item.end));
  assert.match(page, /אטלס 220 העמודים/);
  assert.match(scene, /CommentariesModel/);
});

test("the letter laboratory exposes all letters, standard values and exactly 231 unordered gates", () => {
  assert.equal(SEFER_YETZIRAH_LETTERS.length, 22);
  assert.equal(new Set(SEFER_YETZIRAH_LETTERS.map(item => item.letter)).size, 22);
  assert.equal(getSeferYetzirahGateNumber("א", "ב"), 1);
  assert.equal(getSeferYetzirahGateNumber("ש", "ת"), 231);
  assert.equal(getSeferYetzirahGateNumber("א", "א"), null);
  const gates = new Set();
  for (let first = 0; first < 22; first += 1) for (let second = first + 1; second < 22; second += 1) gates.add(getSeferYetzirahGateNumber(SEFER_YETZIRAH_LETTERS[first].letter, SEFER_YETZIRAH_LETTERS[second].letter));
  assert.equal(gates.size, 231);
  assert.match(page, /מעבדת כ״ב האותיות/);
  assert.match(page, /גימטריה רגילה/);
});

test("the new reader is local-only and responsive", () => {
  assert.doesNotMatch(page + scene, /supabase|\.rpc\(|\.from\(|fetch\(|insert\s+into|delete\s+from/i);
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /@media\(max-width:650px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /var\(--s29-font-display\)/);
  assert.match(css, /var\(--s29-brand-gold\)/);
});
