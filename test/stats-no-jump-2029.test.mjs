import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// /stats on a phone (28.11.2026): the page used to land its readers one after another, each pushing everything below it (weekly +375 px, corpus +146 px, discoveries +1,608 px);
// a reader who scrolled early saw the rows and the footer move (field-like lab CLS 0.28-1.59 on Slow 4G). Source-level guard; the browser measurement is in
// docs/reviews/speed-jump-20261128/ (scripts/measure-stats-jump.mjs).
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const page = read("src/pages/Stats2029Page.jsx");
const css = read("src/pages/stats2029.css");

test("the data area draws once: it waits for the weekly trend, the week before and the corpus (or a short grace after the pulse), and stays drawn on a window switch", () => {
  assert.match(page, /const \[settled, setSettled\] = useState\(\{ weekly: false, before: false, corpus: false \}\)/);
  assert.match(page, /const everything = !state\.loading && settled\.weekly && settled\.before && settled\.corpus/);
  assert.match(page, /const open = shown \|\| Boolean\(d && !state\.loading && \(everything \|\| grace\)\)/, "a window switch keeps the page (shown) instead of inserting a loading block above it");
  assert.match(page, /setTimeout\(\(\) => setGrace\(true\), 900\)/, "the grace is short and fixed");
  for (const key of ["weekly", "before", "corpus"]) assert.ok(new RegExp(`settle\\("${key}"\\)`).test(page), `${key} settles on success and on failure`);
  assert.match(page, /\{d && open \? <>/, "the data renders only when open");
  assert.match(page, /\{!open && !state\.failed \? <CanonicalProgress/, "the loading block is only for the first draw");
});

test("while the page waits the footer is not part of it and the slowest block keeps most of its final height (so a late answer lands without a jump)", () => {
  assert.match(css, /\.stats29\[aria-busy="true"\]\{min-block-size:100svh\}/);
  assert.match(css, /\.sod29-root:has\(\.stats29\[aria-busy="true"\]\) \.f29\{display:none\}/);
  assert.match(css, /\.stats29-dc-slot\[data-dc-state="loading"\]\{min-block-size:var\(--stats29-dc-reserve\)/);
  assert.match(css, /repeating-linear-gradient/, "while it waits the reserved space shows placeholder cards, not an empty area");
  assert.match(page, /className="stats29-dc-wait" role="status"/, "and says what it waits for");
  for (const reserve of ["1500px", "1300px", "700px"]) assert.ok(css.includes(`--stats29-dc-reserve:${reserve}`), reserve);
  assert.match(page, /<div className="stats29-dc-slot" data-dc-state=\{center\.status\}>/);
});

test("the discovery block is not waited for and its content stays crawlable and linked as before (same components, same props)", () => {
  assert.doesNotMatch(page, /everything[^;]*center\.status/, "the slowest reader does not delay the page");
  for (const part of ["DiscoveryTotals", "DiscoveryFeatured", "DiscoveryLatest", "DiscoveryContributions", "DiscoveryWriters"]) assert.ok(page.includes(`<${part}`), part);
});

test("the cumulative open-activity section (#1589) cannot push rows: it is mounted after every other block and draws nothing until its first answer", () => {
  const comp = read("src/components/experience2029/OpenActivity2029.jsx");
  assert.ok(page.indexOf("<OpenActivity2029 />") > page.indexOf('id="stats29-since"'), "mounted below the sections, the discoveries and the history");
  assert.ok(page.indexOf("<OpenActivity2029 />") > page.indexOf("stats29-dc-slot"));
  assert.match(comp, /if \(state\.loading && !answered\.current\) return null/, "no loading block above or between the rows on the first read");
});
