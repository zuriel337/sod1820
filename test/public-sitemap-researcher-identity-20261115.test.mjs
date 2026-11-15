// URL continuity (15.11.2026): a researcher address in the sitemap must be the address the person page resolves.
// Evidence (live read-only, 15.11.2026): contributors.slug = "israel-panzer", contributors.code = "panzer" (text, not numeric).
//   - the sitemap listed /community/researcher/panzer (code || slug)            -> the page answers 404 (api/og.js looks a non-numeric segment up by slug)
//   - /community/researcher/israel-panzer                                        -> 200, index, self canonical, but absent from the sitemap
// api/og.js (production reading): `${/^\d+$/.test(segment) ? 'code' : 'slug'}=eq.<segment>`. The sitemap must emit the same identity.
import test from "node:test";
import assert from "node:assert/strict";
import sitemap from "../api/sitemap.js";
import { PUBLIC_READING_PROFILE_ID } from "../src/lib/publicReadingRelease2029.js";

const contributors = [
  { slug: "israel-panzer", code: "panzer" },        // text code that differs from the slug: the page resolves the slug
  { slug: "plain-writer", code: null },               // no code: slug
  { slug: "same-writer", code: "same-writer" },      // code equals slug: unchanged
  { slug: "numbered-writer", code: "888" },           // numeric code: the page resolves a numeric segment through code
  { slug: null, code: "code-only" },                  // no slug: the code is the only identity
  { slug: "r-0123456789abcdef0123", code: null },     // automatic profile: never listed (existing rule)
];

async function invoke() {
  const original = globalThis.fetch;
  globalThis.fetch = async (raw, options = {}) => {
    const url = new URL(raw);
    if (url.pathname === "/rest/v1/contributors") return new Response(JSON.stringify(contributors), { headers: { "content-range": `0-${contributors.length - 1}/${contributors.length}` } });
    return new Response("[]", { headers: { "content-range": "*/0" } });
  };
  const res = { code: null, headers: {}, setHeader(key, value) { this.headers[key.toLowerCase()] = value; },
    status(code) { this.code = code; return this; }, send(body) { this.body = body; return this; } };
  try {
    await sitemap({ publicFoundationPreview: true, publicReadingRelease: PUBLIC_READING_PROFILE_ID, publicReadingProductionArtifact: true }, res);
    return res;
  } finally { globalThis.fetch = original; }
}
const locs = body => [...String(body).matchAll(/<loc>([^<]*)<\/loc>/g)].map(match => match[1]);

test("the sitemap lists the identity the researcher page resolves: slug for a text code, code only when it is numeric", async () => {
  const res = await invoke();
  assert.equal(res.code, 200);
  const researchers = locs(res.body).filter(loc => loc.startsWith("https://sod1820.co.il/community/researcher/")).map(loc => loc.slice("https://sod1820.co.il/community/researcher/".length));
  assert.ok(researchers.includes("israel-panzer"), "the slug is what /community/researcher/<segment> resolves for a non-numeric segment");
  assert.ok(!researchers.includes("panzer"), "a text code is not resolved by the page (404); it must not be listed");
  assert.ok(researchers.includes("plain-writer"));
  assert.ok(researchers.includes("same-writer"));
  assert.ok(researchers.includes("888"), "a numeric segment is resolved by code");
  assert.ok(!researchers.includes("numbered-writer"), "a numeric code is the page identity; the slug address is not added as a duplicate");
  assert.ok(researchers.includes("code-only"), "without a slug the code is the only identity");
  assert.ok(!researchers.some(segment => /^r-[0-9a-f]{16,}$/i.test(segment)), "automatic profiles stay out");
  assert.equal(new Set(researchers).size, researchers.length, "no duplicate address");
});
