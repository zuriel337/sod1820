import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CONTENT_SERIES_2029 } from "../src/lib/research/contentSeries2029Identity.js";
import { shapeSharedCatalogRows2029, buildContentSeriesCatalog2029 } from "../src/lib/research/contentSeries2029Projection.js";

// ZURIEL 8.11.2026: one shared read, an EXPLICIT item count per series (no uniform cap) inside a 90-day window, and the feed's details unchanged.
const NOW = Date.parse("2026-11-08T12:00:00Z");
const day = n => new Date(NOW - n * 86400e3).toISOString();
const rowsFor = (spec, ages) => ({ key: spec.key, total: 99, rows: ages.map((age, index) => ({ id: spec.key.length * 1000 + index, slug: `${spec.key}-${index}`, title: `פוסט ${index}`, categories: spec.membership.filter(m => m.field === "categories").map(m => m.value), tags: spec.membership.filter(m => m.field === "tags").map(m => m.value), author: spec.exactAuthor, date: day(age), modified: day(age), home_hidden: false, source: "sod1820", wp_id: index + 1 })) });
const all = ages => CONTENT_SERIES_2029.map(spec => rowsFor(spec, spec.priorityLane === "primary" ? [400, 300, 200, 150, 120, 10] : ages));

test("every series declares its own explicit count; the flagship has no window and the others use 90 days; no single uniform cap", () => {
  const limits = CONTENT_SERIES_2029.map(spec => spec.homeDisplay.limit);
  assert.ok(CONTENT_SERIES_2029.every(spec => Number.isInteger(spec.homeDisplay?.limit) && spec.homeDisplay.limit >= 1));
  assert.ok(new Set(limits).size > 1, "counts differ by series");
  const primary = CONTENT_SERIES_2029.find(spec => spec.priorityLane === "primary");
  assert.deepEqual({ ...primary.homeDisplay }, { limit: 6, windowDays: null });
  assert.ok(CONTENT_SERIES_2029.filter(spec => spec !== primary).every(spec => spec.homeDisplay.windowDays === 90));
});

test("Home shape: each series shows at most its own count, only what is newer than 90 days; the flagship keeps old strong Posts", () => {
  const rows = all([1, 5, 20, 60, 89, 95]);
  const shaped = shapeSharedCatalogRows2029(rows, { homeDisplay: true, now: NOW });
  for (const spec of CONTENT_SERIES_2029) {
    const got = shaped.find(item => item.key === spec.key).rows;
    if (spec.priorityLane === "primary") assert.equal(got.length, 6, "flagship: all six, however old");
    else {
      assert.equal(got.length, Math.min(spec.homeDisplay.limit, 5), spec.key);
      assert.ok(got.every(row => NOW - Date.parse(row.date) <= 90 * 86400e3), "nothing older than 90 days");
    }
  }
});

test("feed details shape is exactly the previous one: first N rows per series (primary N too), no window, from the same rows", () => {
  const rows = all([1, 5, 20, 60, 100, 200]);
  const details = shapeSharedCatalogRows2029(rows, { limit: 4, homeDisplay: false, now: NOW });
  for (const spec of CONTENT_SERIES_2029) assert.equal(details.find(item => item.key === spec.key).rows.length, 4, spec.key);
  const catalog = buildContentSeriesCatalog2029(details, { homeOnly: true });
  assert.ok(catalog.series.every(series => series.items.length <= 4));
  const withPrimary = shapeSharedCatalogRows2029(rows, { limit: 4, primaryLimit: 6, now: NOW });
  assert.equal(withPrimary.find(item => item.key === "reality-map").rows.length, 6);
});

test("Home and the feed's details share ONE read: both call the default public reader, which caches a window-free superset per minute", async () => {
  const projection = await readFile(new URL("../src/lib/research/contentSeries2029Projection.js", import.meta.url), "utf8");
  const feedSources = await readFile(new URL("../src/lib/research/systemFeedPublicSources2029.js", import.meta.url), "utf8");
  const home = await readFile(new URL("../src/components/experience2029/HomeComposition2029.jsx", import.meta.url), "utf8");
  assert.match(projection, /client === getPublicResearchClient\(\)/);
  assert.match(projection, /sharedCatalogRead\.homeOnly === homeOnly && now - sharedCatalogRead\.at < CATALOG_TTL_MS/);
  assert.match(feedSources, /fetchContentSeriesCatalog2029\(\{ client: api, limitPerSeries: 4, homeOnly: true, signal \}\)/, "the details keep their exact call (no change in the Now owner's file)");
  assert.match(home, /fetchContentSeriesCatalog2029\(\{ homeOnly: true, homeDisplay: true, signal: controller\.signal \}\)/);
  assert.equal((home.match(/fetchContentSeriesCatalog2029\(/g) || []).length, 1, "Home reads the catalog once");
});

test("the feed hook reuses Home-loaded details (under a minute old) only for the first Now opening; retry, polling and reopening re-read", async () => {
  const hook = await readFile(new URL("../src/components/experience2029/useSystemFeed2029.js", import.meta.url), "utf8");
  assert.match(hook, /if \(!force && detailsFromHome\.current && Date\.now\(\) - detailsAt\.current < DETAILS_FRESH_MS\)/);
  assert.match(hook, /useEffect\(\(\) => \{ if \(!nowOpen\) return undefined; return \(\) => \{ detailsFromHome\.current = false; \}; \}, \[nowOpen\]\);/, "closing Now consumes the reuse");
  assert.match(hook, /const refreshNowDetails = useCallback\(\(\) => loadNowDetails\(true\)/);
  assert.match(hook, /const requestNowDetails = useCallback\(\(\) => loadNowDetails\(false\)/);
  assert.match(hook, /if \(enabled && \(nowOpen \|\| homeStrip\)\) loadNowDetails\(false\);/);
});
