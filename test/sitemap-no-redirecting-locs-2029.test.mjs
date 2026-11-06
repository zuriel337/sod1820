// DEF-002 regression: the sitemap must list the canonical, non-redirecting form of every URL. The edge answers `/<slug>/`
// with a 308 to `/<slug>`, so a legacy WordPress post (stored link with a trailing slash) is listed without it.
import test from "node:test";
import assert from "node:assert/strict";
import sitemap from "../api/sitemap.js";
import { PUBLIC_READING_PROFILE_ID } from "../src/lib/publicReadingRelease2029.js";

const posts = [
  { id: "1", slug: "legacy-one", source: "wordpress", wp_id: 100, link: "https://sod1820.co.il/legacy-one/", modified: "2025-01-02T00:00:00", date: "2020-01-01T00:00:00", tags: [], categories: [] },
  { id: "2", slug: encodeURIComponent("פוסט-ישן"), source: "wordpress", wp_id: 101, link: `https://sod1820.co.il/${encodeURIComponent("פוסט-ישן")}/`, modified: "2025-01-02T00:00:00", date: "2020-01-01T00:00:00", tags: [], categories: [] },
  { id: "3", slug: "native-one", source: "sod1820", wp_id: 40000, link: "https://sod1820.co.il/post/native-one", modified: "2026-10-01T00:00:00", date: "2026-10-01T00:00:00", tags: [], categories: [] },
];

async function run() {
  const original = globalThis.fetch;
  globalThis.fetch = async (raw, options = {}) => {
    const url = new URL(raw);
    if ((options.method || "GET") === "HEAD") return new Response(null, { status: 200, headers: { "Content-Type": "application/pdf" } });
    if (url.pathname === "/rest/v1/posts") return new Response(JSON.stringify(Number(url.searchParams.get("offset") || 0) === 0 ? posts : []));
    return new Response("[]");
  };
  const res = { code: null, headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, status(c) { this.code = c; return this; }, send(b) { this.body = b; return this; } };
  try {
    await sitemap({ publicFoundationPreview: true, publicReadingRelease: PUBLIC_READING_PROFILE_ID, publicReadingProductionArtifact: true }, res);
    return res;
  } finally { globalThis.fetch = original; }
}

test("legacy post URLs are listed without the trailing slash that the edge redirects", async () => {
  const res = await run();
  assert.equal(res.code, 200);
  const locs = [...res.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.ok(locs.includes("https://sod1820.co.il/legacy-one"), "slash-free legacy address present");
  assert.ok(locs.includes(`https://sod1820.co.il/${encodeURIComponent("פוסט-ישן")}`), "encoded Hebrew legacy address present");
  assert.ok(locs.includes("https://sod1820.co.il/post/native-one"), "native address unchanged");
  const redirecting = locs.filter(l => /^https:\/\/sod1820\.co\.il\/.+\/$/.test(l));
  assert.deepEqual(redirecting, [], "no listed URL may end with a slash (each would answer 308)");
  assert.equal(new Set(locs).size, locs.length, "no duplicate locs");
});
