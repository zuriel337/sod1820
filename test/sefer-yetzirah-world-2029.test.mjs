import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  SEFER_YETZIRAH_DEPTHS,
  SEFER_YETZIRAH_LETTER_GROUPS,
  SEFER_YETZIRAH_READING_GATES,
  SEFER_YETZIRAH_SCENE_MODES,
  SEFER_YETZIRAH_SOURCE,
  SEFER_YETZIRAH_VOLUME_LAYERS,
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

test("the spatial grammar includes real 3D modes for sefirot, letters, gates and OSN", () => {
  assert.deepEqual(SEFER_YETZIRAH_SCENE_MODES.map(mode => mode.id), ["sefirot", "letters", "gates", "osn"]);
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

test("the new reader is local-only and responsive", () => {
  assert.doesNotMatch(page + scene, /supabase|\.rpc\(|\.from\(|fetch\(|insert\s+into|delete\s+from/i);
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /@media\(max-width:650px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /var\(--s29-font-display\)/);
  assert.match(css, /var\(--s29-brand-gold\)/);
});
