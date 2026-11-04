import test from "node:test";
import assert from "node:assert/strict";
import { loadPublicSitemapAdapter } from "./fixtures/public-sitemap-adapter.mjs";

const publicReadingSitemapHandler = await loadPublicSitemapAdapter();

const CANONICAL = "https://sod1820.co.il";
const PUBLIC_POLICY = "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400";
const req = (origin = CANONICAL, method = "GET") => ({ method, url: "/sitemap.xml", headers: { host: new URL(origin).host } });
const response = () => ({ code: null, headers: {}, body: null,
  setHeader(key, value) { this.headers[key.toLowerCase()] = value; }, status(code) { this.code = code; return this; },
  send(body) { this.body = body; return this; } });
const source = (code = 200, policy = PUBLIC_POLICY) => async (_req, res) => {
  res.setHeader("Content-Type", "application/xml"); res.setHeader("Cache-Control", policy);
  res.setHeader("X-Robots-Tag", "index, follow"); res.status(code).send("<urlset/>");
};
const invoke = async (request = req(), options = {}) => {
  const res = response();
  await publicReadingSitemapHandler({ authorized: () => true, indexable: origin => origin === CANONICAL,
    handler: source(), ...options })(request, res);
  return res;
};

test("only canonical indexable GET200 retains the existing XML owner's public CDN and stale policy", async () => {
  const res = await invoke();
  assert.equal(res.code, 200); assert.equal(res.headers["cache-control"], PUBLIC_POLICY);
  assert.equal(res.headers["content-type"], "application/xml"); assert.equal(res.body, "<urlset/>");
});

test("unadmitted review origins are rejected; noindex and alias origins cannot receive canonical caching", async () => {
  const res = await invoke(req("https://sod1820-protected-review.vercel.app"));
  assert.equal(res.code, 421); assert.equal(res.headers["cache-control"], "no-store");
  assert.equal(res.headers["x-robots-tag"], "noindex, nofollow, noarchive");
  const canonicalReview = await invoke(req(), { indexable: () => false });
  assert.equal(canonicalReview.code, 200);
  assert.equal(canonicalReview.headers["cache-control"], "no-store");
  const alias = await invoke(req("https://www.sod1820.co.il"), { indexable: () => true });
  assert.equal(alias.headers["cache-control"], "no-store", "indexable alias is still not the canonical source");
});

test("HEAD, rejected methods, missing activation and invalid origins cannot populate the public cache", async () => {
  const head = await invoke(req(CANONICAL, "HEAD"));
  assert.equal(head.code, 200); assert.equal(head.body, ""); assert.equal(head.headers["cache-control"], "no-store");
  for (const method of ["POST", "PUT", "DELETE"]) {
    const denied = await invoke(req(CANONICAL, method), { handler: () => assert.fail("method must not read sources") });
    assert.equal(denied.code, 405); assert.equal(denied.headers["cache-control"], "no-store");
  }
  const dormant = await invoke(req(), { authorized: () => false, handler: () => assert.fail("dormant source") });
  assert.equal(dormant.code, 503); assert.equal(dormant.headers["cache-control"], "no-store");
  const invalid = await invoke(req("https://evil.test"), { handler: () => assert.fail("unknown origin") });
  assert.equal(invalid.code, 421); assert.equal(invalid.headers["cache-control"], "no-store");
});

test("non200, thrown sources and private or incomplete source cache policies fail closed without stale errors", async () => {
  for (const code of [301, 308, 404, 500, 503]) {
    const res = await invoke(req(), { handler: source(code) });
    assert.equal(res.code, code); assert.equal(res.headers["cache-control"], "no-store");
  }
  const failed = await invoke(req(), { handler: async (_req, res) => {
    res.setHeader("Cache-Control", PUBLIC_POLICY); throw new Error("synthetic source unavailable");
  } });
  assert.equal(failed.code, 503); assert.equal(failed.headers["cache-control"], "no-store");
  for (const policy of ["private, max-age=3600", "public,max-age=120", "no-store"]) {
    assert.equal((await invoke(req(), { handler: source(200, policy) })).headers["cache-control"], "no-store");
  }
});
