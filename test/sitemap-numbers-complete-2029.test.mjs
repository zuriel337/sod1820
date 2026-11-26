// S-63: the number part of the sitemap lists EVERY admitted number. PostgREST answers at most 1,000 rows per request and the admitted set is larger
// (1,273 live on 26.11.2026), so one unpaged call listed only 10-1066 and left out the 273 above it. The block now reads the set in complete pages with an
// exact total (src/lib/admittedNumbers2029.js), keeps each row's priority and lastmod, lists a number once, and fails closed when the set cannot be proven
// complete (the answer is then a no-store 503, as for every other source of the production sitemap).
import test from "node:test";
import assert from "node:assert/strict";
import sitemap from "../api/sitemap.js";
import { PUBLIC_READING_PROFILE_ID } from "../src/lib/publicReadingRelease2029.js";

const CAP = 1000;   // the live PostgREST row cap
const row = value => ({ value, priority: value % 7 === 0 ? "0.7" : "0.6", lastmod: `2026-11-${String(10 + (value % 15)).padStart(2, "0")}` });
const SET = [...Array.from({ length: 1200 }, (_, i) => 10 + i), 5000, 78100].map(row);   // 1,202 rows: more than one page, values above the first 1,000 rows

async function run({ set = SET, section = "catalog", onNumbers = null } = {}) {
  const original = globalThis.fetch, numberCalls = [];
  globalThis.fetch = async (raw, options = {}) => {
    const url = new URL(raw);
    if ((options.method || "GET") === "HEAD") return new Response(null, { status: 200, headers: { "Content-Type": "application/pdf" } });
    if (url.pathname === "/rest/v1/rpc/sitemap_numbers") {
      const offset = Number(url.searchParams.get("offset") || 0), limit = Math.min(CAP, Number(url.searchParams.get("limit") || CAP));
      numberCalls.push({ offset, limit, prefer: options.headers?.Prefer });
      const forced = onNumbers?.({ offset, call: numberCalls.length });
      if (forced) return forced;
      const rows = set.slice(offset, offset + limit);
      return new Response(JSON.stringify(rows), { status: 206, headers: { "content-range": rows.length ? `${offset}-${offset + rows.length - 1}/${set.length}` : `*/${set.length}` } });
    }
    if (url.pathname === "/rest/v1/posts") return new Response("[]");
    return new Response("[]", { headers: { "content-range": "*/0" } });
  };
  const res = { code: null, headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, status(c) { this.code = c; return this; }, send(b) { this.body = b; return this; } };
  try {
    await sitemap({ publicFoundationPreview: true, publicReadingRelease: PUBLIC_READING_PROFILE_ID, publicReadingProductionArtifact: true, sitemapSection: section }, res);
    return { res, numberCalls };
  } finally { globalThis.fetch = original; }
}
const numberEntries = body => [...body.matchAll(/<url>\s*<loc>https:\/\/sod1820\.co\.il\/number\/(\d+)<\/loc>([\s\S]*?)<\/url>/g)].map(m => ({ value: Number(m[1]), xml: m[2] }));

test("every admitted number is listed, including the ones above the first 1,000 rows, each once", async () => {
  const { res, numberCalls } = await run();
  assert.equal(res.code, 200);
  const listed = numberEntries(res.body);
  assert.equal(listed.length, SET.length, "all admitted numbers, not the first 1,000");
  assert.equal(new Set(listed.map(e => e.value)).size, listed.length, "no number twice");
  assert.deepEqual(listed.map(e => e.value).sort((a, b) => a - b), SET.map(r => r.value));
  assert.ok(listed.some(e => e.value === 78100) && listed.some(e => e.value === 5000) && listed.some(e => e.value === 1209));
  assert.deepEqual(numberCalls.map(c => [c.offset, c.limit]), [[0, 1000], [1000, 1000]]);
  assert.equal(numberCalls[0].prefer, "count=exact");
});

test("each number keeps its own priority and lastmod", async () => {
  const { res } = await run();
  const byValue = new Map(numberEntries(res.body).map(e => [e.value, e.xml]));
  for (const r of SET) {
    const xml = byValue.get(r.value);
    assert.match(xml, new RegExp(`<lastmod>${r.lastmod}</lastmod>`), `lastmod of ${r.value}`);
    assert.match(xml, new RegExp(`<priority>${r.priority}</priority>`), `priority of ${r.value}`);
  }
});

test("a set that is exactly one full page, an empty set and a short set are each read completely", async () => {
  for (const size of [0, 1, 999, 1000, 1001, 2000, 2001]) {
    const set = Array.from({ length: size }, (_, i) => row(10 + i));
    const { res } = await run({ set });
    assert.equal(res.code, 200, `size ${size}`);
    assert.equal(numberEntries(res.body).length, size, `size ${size}`);
  }
});

test("a set that changes between two pages is read again once; if it keeps changing, the sitemap fails closed and lists no partial numbers", async () => {
  // first attempt: the second page answers a different total (a number was added meanwhile) -> read again -> complete
  let moved = false;
  const ok = await run({ onNumbers: ({ offset }) => {
    if (offset === 1000 && !moved) {   // a number was admitted between the two pages: this page now has one row more than the first page's total allowed for
      moved = true;
      const rows = [...SET.slice(1000), row(99999)];
      return new Response(JSON.stringify(rows), { status: 206, headers: { "content-range": `1000-${1000 + rows.length - 1}/${SET.length + 1}` } });
    }
    return null;
  } });
  assert.equal(moved, true);
  assert.equal(ok.numberCalls.length, 4, "two pages, then the whole set again");
  assert.equal(ok.res.code, 200);
  assert.equal(numberEntries(ok.res.body).length, SET.length);
  // the pages never add up to the total: both attempts fail -> 503, no-store, no number listed
  const bad = await run({ onNumbers: ({ offset }) => offset === 1000 ? new Response(JSON.stringify(SET.slice(1000, 1100)), { status: 206, headers: { "content-range": `1000-1099/${SET.length}` } }) : null });
  assert.equal(bad.res.code, 503);
  assert.equal(bad.res.headers["cache-control"], "no-store");
  assert.equal(numberEntries(bad.res.body || "").length, 0);
});

test("a failing or unprovable read of the set fails closed: no total, a failed page, an invalid answer", async () => {
  const cases = {
    "no content-range": () => new Response(JSON.stringify(SET.slice(0, 1000)), { status: 200 }),
    "server error": () => new Response("{}", { status: 500 }),
    "not an array": () => new Response("{}", { status: 200, headers: { "content-range": "0-0/1" } }),
    "invalid value": () => new Response(JSON.stringify([{ value: "x" }]), { status: 206, headers: { "content-range": "0-0/1" } }),
  };
  for (const [name, make] of Object.entries(cases)) {
    const { res } = await run({ onNumbers: () => make() });
    assert.equal(res.code, 503, name);
    assert.equal(res.headers["cache-control"], "no-store", name);
    assert.equal(numberEntries(res.body || "").length, 0, `${name}: no partial list`);
  }
});

test("the content part does not read the set at all", async () => {
  const { numberCalls } = await run({ section: "content" });
  assert.equal(numberCalls.length, 0);
});

test("the sitemap and the number document decide from the same set: every listed number is admitted by the decision memo", async () => {
  const { readAdmittedNumbers2029 } = await import("../src/lib/admittedNumbers2029.js");
  const original = globalThis.fetch;
  globalThis.fetch = async raw => {
    const url = new URL(raw), offset = Number(url.searchParams.get("offset") || 0), rows = SET.slice(offset, offset + CAP);
    return new Response(JSON.stringify(rows), { status: 206, headers: { "content-range": `${offset}-${offset + rows.length - 1}/${SET.length}` } });
  };
  try {
    const set = await readAdmittedNumbers2029({ supabaseUrl: "https://x.invalid", headers: {} });
    const { res } = await run();
    assert.deepEqual(numberEntries(res.body).map(e => e.value).sort((a, b) => a - b), [...set].sort((a, b) => a - b));
  } finally { globalThis.fetch = original; }
});
