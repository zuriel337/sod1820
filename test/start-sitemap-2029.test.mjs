// "כאן מתחילים" (/start) is a public welcome page again (ZURIEL 25.11.2026). Under the Open Index Law every public page is in the sitemap:
// the production sitemap (foundation mode) lists /start exactly once. Found live after the 25.11 release: /start was index, but missing here.
import test from "node:test";
import assert from "node:assert/strict";

test("the production sitemap lists /start exactly once", async () => {
  const { default: sitemap } = await import("../api/sitemap.js");
  const { PUBLIC_READING_PROFILE_ID } = await import("../src/lib/publicReadingRelease2029.js");
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("[]", { headers: { "content-range": "*/0" } });   // every source empty: only the fixed addresses remain
  const res = { code: null, headers: {}, setHeader(key, value) { this.headers[key.toLowerCase()] = value; }, status(code) { this.code = code; return this; }, send(body) { this.body = body; return this; } };
  try { await sitemap({ publicFoundationPreview: true, publicReadingRelease: PUBLIC_READING_PROFILE_ID, publicReadingProductionArtifact: true }, res); }
  finally { globalThis.fetch = original; }
  assert.equal(res.code, 200);
  assert.equal((String(res.body).match(/<loc>https:\/\/sod1820\.co\.il\/start<\/loc>/g) || []).length, 1);
});
