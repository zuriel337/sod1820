import test from "node:test";
import assert from "node:assert/strict";
import ogHandler from "../api/og.js";
import { publicReadingDocumentHandler } from "../public-reading-deploy/api/public-document.js";

const SITE = "https://sod1820.co.il";
const shell = '<html><head><title>shell</title></head><body><div id="root">application shell</div></body></html>';
function response() {
  return { headers: new Map(), code: null, body: "", setHeader(key, value) { this.headers.set(key.toLowerCase(), value); },
    status(code) { this.code = code; return this; }, send(body) { this.body = String(body); return this; } };
}
const request = (path, method = "GET") => {
  const url = new URL(path, SITE);
  return { method, url: path, headers: { host: url.host }, query: { ...Object.fromEntries(url.searchParams), path: url.pathname } };
};
async function run(path, { indexable = true, fail = false, method = "GET", legacy = false } = {}) {
  const originalFetch = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const u = new URL(url); calls.push({ path: u.pathname, method: options.method || "GET", body: options.body });
    assert.ok(!u.pathname.includes("/functions/"), "metadata must not invoke a model or Edge action");
    if (u.pathname.endsWith("/is_number_indexable") || u.pathname.endsWith("/is_phrase_indexable")) {
      if (fail) throw Error("synthetic admission outage");
      return Response.json(indexable);
    }
    // Open only the synthetic standalone Number gate so the final test reaches
    // the existing Golden metadata branch, rather than the closed-gate page.
    if (legacy && u.pathname === "/rest/v1/site_flags") return Response.json([{ key: "lock_number", enabled: false, mode: "all" }]);
    assert.equal(options.method || "GET", "GET", "only the existing read RPCs can POST");
    assert.ok(["/rest/v1/number_anchors", "/rest/v1/posts", "/rest/v1/site_flags"].includes(u.pathname));
    return Response.json([]);
  };
  try {
    const req = request(path, method), unchanged = structuredClone(req), res = response();
    if (legacy) await ogHandler({ query: req.query }, res);
    else await publicReadingDocumentHandler({ authorized: () => true, indexable: origin => origin === SITE,
      readDocument: async () => shell })(req, res);
    assert.deepEqual(req, unchanged, "query bytes/selectors/return context must not be mutated");
    return { res, calls };
  } finally { globalThis.fetch = originalFetch; }
}

for (const [address, rpc, body] of [["1820", "is_number_indexable", { p_value: 1820 }],
  [encodeURIComponent("משיח"), "is_phrase_indexable", { p_phrase: "משיח" }]]) {
  for (const admitted of [true, false]) test(`Number address ${address}: canonical and admission use the existing public reader (${admitted})`, async () => {
    const { res, calls } = await run(`/number/${address}?method=regular&returnTo=%2Fworld%3Fpart%3D2&part=2&part=7`, { indexable: admitted });
    assert.equal(res.code, 200);
    assert.ok(res.body.includes(`rel="canonical" href="${SITE}/number/${address}"`));
    assert.ok(res.body.includes(`property="og:url" content="${SITE}/number/${address}"`));
    assert.match(res.headers.get("x-robots-tag"), admitted ? /^index/ : /^noindex/);
    assert.equal(res.headers.get("location"), undefined);
    const reads = calls.filter(call => call.path.endsWith("/" + rpc));
    assert.equal(reads.length, 1); assert.deepEqual(JSON.parse(reads[0].body), body);
    assert.ok(!res.body.includes("returnTo="));
  });
  test(`Number address ${address}: source outage fails closed instead of advertising an indexed result`, async () => {
    const { res } = await run(`/number/${address}`, { fail: true });
    assert.equal(res.code, 503); assert.match(res.headers.get("x-robots-tag"), /^noindex/);
  });
}

test("Number address HEAD reuses admission, remains no-store and sends no document body", async () => {
  const { res, calls } = await run("/number/1820", { method: "HEAD" });
  assert.equal(res.code, 200); assert.equal(res.body, "");
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(calls.filter(x => x.path.endsWith("/is_number_indexable")).length, 1);
});

// ZURIEL 11.11.2026: the compatibility /2029/number/<address> and a number with leading zeros continue to the canonical /number/<address>
// in one permanent hop, keeping the exact query and the exact expression address; no reader is called for a redirect.
for (const [from, to] of [["/2029/number/1820?method=regular&part=2&part=7", "/number/1820?method=regular&part=2&part=7"],
  ["/2029/number/" + encodeURIComponent("משיח") + "?focus=x", "/number/" + encodeURIComponent("משיח") + "?focus=x"],
  ["/2029/number/01820", "/number/1820"], ["/number/001820?from=calc&focus=dna", "/number/1820?from=calc&focus=dna"], ["/number/00", "/number/0"]]) {
  test(`Number continuation ${from} -> ${to}`, async () => {
    const { res, calls } = await run(from);
    assert.equal(res.code, 308);
    assert.equal(res.headers.get("location"), to);
    assert.equal(calls.length, 0);
  });
}
test("the real zero and an expression with digits keep their own address", async () => {
  const { res } = await run("/number/0", { indexable: false });
  assert.equal(res.code, 200); assert.equal(res.headers.get("location"), undefined);
  const expression = await run("/number/" + encodeURIComponent("0358 משיח"), { indexable: false });
  assert.equal(expression.res.code, 200); assert.equal(expression.res.headers.get("location"), undefined);
});

test("Gallery collection metadata is public without querying a Post or exposing a selected image", async () => {
  const { res, calls } = await run("/gallery");
  assert.equal(res.code, 200); assert.equal(calls.length, 0);
  assert.ok(res.body.includes(`rel="canonical" href="${SITE}/gallery"`));
  assert.match(res.body, /<title>.*גלרי/); assert.ok(!res.body.includes("הפוסט לא נמצא"));
  assert.match(res.headers.get("x-robots-tag"), /^index/);
});

test("Gallery HEAD is a real successful public document response with an empty body", async () => {
  const { res } = await run("/gallery", { method: "HEAD" });
  assert.equal(res.code, 200); assert.equal(res.body, "");
  assert.match(res.headers.get("x-robots-tag"), /^index/);
});

test("unverified Gallery selectors are not published as image metadata", async () => {
  const { res, calls } = await run("/gallery?gallery=synthetic-private&image=synthetic-image&q=synthetic");
  assert.equal(res.code, 200); assert.equal(calls.length, 0);
  assert.match(res.headers.get("x-robots-tag"), /^noindex/);
  assert.ok(!res.body.includes("synthetic-private")); assert.ok(!res.body.includes("synthetic-image"));
});

for (const query of ["q=synthetic", "page=2", "series=synthetic-series"]) test(`ordinary Posts selection remains noindex (${query})`, async () => {
  const { res } = await run("/2029/posts?" + query);
  assert.equal(res.code, 200);
  assert.ok(res.body.includes(`rel="canonical" href="${SITE}/post"`));
  assert.match(res.headers.get("x-robots-tag"), /^noindex/);
});

test("unfiltered public Posts retain their canonical identity and indexability", async () => {
  const { res } = await run("/post");
  assert.equal(res.code, 200); assert.match(res.headers.get("x-robots-tag"), /^index/);
});

test("a Gallery collection fix cannot turn an unknown Post/child path into a public success", async () => {
  for (const path of ["/not-a-real-public-post-synthetic", "/gallery/not-a-real-gallery-synthetic"]) {
    const { res } = await run(path); assert.equal(res.code, 404);
    assert.match(res.headers.get("x-robots-tag"), /^noindex/);
  }
});

test("public normalization cannot strip internal aliases or grant account access", async () => {
  for (const [path, canonical] of [["/2029/journey", "/2029/journey"], ["/2029/me/research", "/login"]]) {
    const { res, calls } = await run(path);
    assert.equal(res.code, 200); assert.equal(calls.length, 0);
    assert.ok(res.body.includes(`rel="canonical" href="${SITE}${canonical}"`));
    assert.match(res.headers.get("x-robots-tag"), /^noindex/);
  }
});

test("dormant admission cannot be bypassed by selecting the newly fixed public routes", async () => {
  for (const path of ["/2029/number/1820", "/gallery"]) {
    const res = response(); let reads = 0;
    await publicReadingDocumentHandler({ readDocument: async () => { reads++; return shell; } })(request(path), res);
    assert.equal(res.code, 503); assert.equal(reads, 0);
  }
});

test("the standalone Golden Number metadata profile is unchanged by public document alias normalization", async () => {
  const { res, calls } = await run("/2029/number/1820", { legacy: true });
  assert.equal(res.code, 200);
  assert.ok(res.body.includes(`rel="canonical" href="${SITE}/2029/number/1820"`));
  assert.ok(res.body.includes('content="noindex, nofollow"'));
  assert.ok(!calls.some(x => x.path.endsWith("/is_number_indexable")));
});
