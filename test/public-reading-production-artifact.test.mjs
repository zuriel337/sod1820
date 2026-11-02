import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import { createHash } from "node:crypto";
import ogHandler from "../api/og.js";
import { publicReadingDocumentHandler } from "../public-reading-deploy/api/public-document.js";
import { publicReadingSitemapHandler } from "../public-reading-deploy/api/public-sitemap.js";
import { publicReadingRobotsHandler } from "../public-reading-deploy/api/public-robots.js";
import { publicReadingReadOnlyApi } from "../public-reading-deploy/read-only-api.js";
import { buildPublicReadingWorker, startPublicReading, PUBLIC_READING_POLICY_ID, COMMUNITY_PUBLIC_FIELDS } from "../public-reading-deploy/transport.js";
import { PUBLIC_READING_DEPLOYMENT_AUTHORIZATION, deploymentAuthorized } from "../public-reading-deploy/authorization.js";

const root = new URL("..", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const sha = "a".repeat(40), SITE = "https://sod1820.co.il", API = "https://linswmnnkjxvweumprav.supabase.co";
function response() {
  return { headers: new Map(), code: null, body: "", setHeader(k, v) { this.headers.set(k.toLowerCase(), v); },
    status(code) { this.code = code; return this; }, send(value) { this.body = String(value); return this; },
    json(value) { return this.send(JSON.stringify(value)); } };
}
const req = (path, extras = {}) => ({ method: "GET", headers: { host: "sod1820.co.il" }, url: path,
  query: { ...Object.fromEntries(new URL(path, SITE).searchParams), path: new URL(path, SITE).pathname }, ...extras });
const document = '<html><head><title>static</title><meta name="robots" content="index, follow"/></head><body><div id="root">existing shell</div></body></html>';
async function withFetch(fetcher, run) {
  const original = globalThis.fetch; globalThis.fetch = fetcher;
  try { return await run(); } finally { globalThis.fetch = original; }
}
const json = data => new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
const legacy = { id: 1, wp_id: 100, slug: "old-post", title: "Original", source: "wordpress", tags: [], categories: [], date: "2020-01-01" };
const modern = { id: 2, wp_id: 36936, slug: "new-post", title: "Native", source: "sod1820", tags: [], categories: [], date: "2026-01-01" };
const encoded = { ...legacy, id: 3, slug: "%d7%a9%d7%9c%d7%95%d7%9d", title: "שלום" };
const assetId = "b".repeat(32);

test("dormant default cannot be activated by environment, forged request or production branch name", async () => {
  assert.equal(PUBLIC_READING_DEPLOYMENT_AUTHORIZATION.state, "dormant"); assert.equal(deploymentAuthorized(), false);
  let reads = 0;
  const handler = publicReadingDocumentHandler({ readDocument: async () => { reads++; return document; } });
  const res = response(); await handler(req("/?publicReadingRelease=public-reading-20261101", {
    publicReadingProductionArtifact: true, publicReadingRelease: "public-reading-20261101" }), res);
  assert.equal(res.code, 503); assert.equal(reads, 0);
  for (const env of [{ VERCEL: "1" }, { VERCEL_ENV: "production" }, { VERCEL_ENV: "preview" }]) {
    const result = spawnSync(process.execPath, ["scripts/build-public-reading-production.mjs"], { cwd: root,
      env: { ...process.env, ...env }, encoding: "utf8" });
    assert.notEqual(result.status, 0); assert.match(result.stderr, /hosted_activation_requires_separate_guard_approval/);
  }
});

test("only dedicated 2029 compiler target can enable the signed service; default, Preview and stray Legacy flags cannot", () => {
  const source = read("src/lib/publicReadingRelease2029.js").replaceAll("export ", "")
    .replace("import.meta.env?.VITE_PUBLIC_READING_RELEASE", JSON.stringify("public-reading-20261101"));
  for (const [build, production, expected] of [[false, true, false], [true, false, false], [true, true, true]]) {
    const result = vm.runInNewContext(source + ';[PUBLIC_READING_PRODUCTION_ARTIFACT,publicReadingPath("/unsubscribe"),publicReadingPath("/updates")];',
      { __SOD_2029_BUILD__: build, __SOD_PUBLIC_READING_PRODUCTION_ARTIFACT__: production });
    assert.equal(result[0], expected); assert.equal(result[1], expected ? "public" : "service-closed"); assert.equal(result[2], "service-closed");
  }
});

test("Production document uses canonical owner, preserves old/native/encoded/wp addresses and genuine missing/failure status", async () => {
  const paths = [["/old-post", legacy, "/old-post"], ["/post/old-post", legacy, "/old-post"],
    ["/new-post", modern, "/post/new-post"], ["/post/new-post", modern, "/post/new-post"],
    ["/%D7%A9%D7%9C%D7%95%D7%9D", encoded, "/%D7%A9%D7%9C%D7%95%D7%9D"], ["/?p=100", legacy, "/old-post"]];
  for (const [path, post, canonical] of paths) await withFetch(async (url) => {
    assert.ok(String(url).includes("/rest/v1/posts?")); return json([post]);
  }, async () => {
    const res = response(); await publicReadingDocumentHandler({ authorized: () => true, readDocument: async () => document })(req(path), res);
    assert.equal(res.code, 200, path); assert.match(res.body, new RegExp(`rel="canonical" href="${SITE}${canonical}"`, "i"));
    assert.equal(res.headers.get("cache-control"), "no-store"); assert.equal(res.headers.get("x-robots-tag"), "index, follow");
    assert.ok(res.body.includes("existing shell")); assert.ok(!res.body.includes("http-equiv=\"refresh\""));
  });
  for (const [source, status] of [[[], 404], [[{ ...modern, tags: ["טיוטה"] }], 404], [null, 503]]) await withFetch(async () => {
    if (source === null) throw Error("synthetic outage"); return json(source);
  }, async () => {
    const res = response(); await publicReadingDocumentHandler({ authorized: () => true, readDocument: async () => document })(req("/missing-post"), res);
    assert.equal(res.code, status); assert.match(res.headers.get("x-robots-tag"), /noindex/); assert.equal(res.headers.get("cache-control"), "no-store");
  });
});

test("closed, private and unknown routes remain noindex without product lookups; service metadata preserves signed unsubscribe", async () => {
  await withFetch(async () => { throw Error("closed route must not query data"); }, async () => {
    for (const path of ["/login", "/2029/me", "/journey", "/raziel", "/els", "/books", "/updates", "/2029/control", "/unsubscribe?e=synthetic&t=synthetic"]) {
      const res = response(); await publicReadingDocumentHandler({ authorized: () => true, readDocument: async () => document })(req(path), res);
      assert.equal(res.code, path === "/2029/control" ? 404 : 200, path); assert.match(res.headers.get("x-robots-tag"), /noindex/, path);
      assert.ok(!res.body.includes("e=synthetic"));
      if (path.startsWith("/unsubscribe")) { assert.match(res.body, /הסרה מהדיוור/); assert.equal(res.headers.get("referrer-policy"), "no-referrer"); }
    }
  });
});

test("public aliases reuse metadata owner while old static tool names resolve through the actual Post boundary", async () => {
  await withFetch(async url => { assert.ok(String(url).includes("/posts?")); return json([]); }, async () => {
    const handler = publicReadingDocumentHandler({ authorized: () => true, readDocument: async () => document });
    for (const path of ["/2029", "/2029/posts", "/2029/gematria/viral", "/2029/calculator"]) {
      const res = response(); await handler(req(path), res); assert.equal(res.code, 200, path);
    }
    for (const path of ["/name", "/or-geula", "/forum"]) {
      const res = response(); await handler(req(path), res); assert.equal(res.code, 404, path); assert.match(res.headers.get("x-robots-tag"), /noindex/);
    }
  });
});

test("HTTP origin, path and method boundaries cannot select metadata profile or enter private readers", async () => {
  let metadataCalls = 0;
  const handler = publicReadingDocumentHandler({ authorized: () => true, readDocument: async () => document,
    metadataHandler: async (_req, res) => { metadataCalls++; return res.status(200).send('<head><meta name="robots" content="index, follow"/></head>'); } });
  for (const path of ["//evil.test/x", "/%ZZ", "/%00", "/%5cprivate", "/a?b", "/a#b"]) {
    const res = response(); await handler(req("/api/public-document", { query: { path } }), res); assert.equal(res.code, 400, path);
  }
  for (const extras of [{ method: "POST" }, { headers: { host: "evil.test" } }, { headers: { host: "sod1820.co.il", "x-forwarded-proto": "http" } }]) {
    const res = response(); await handler(req("/", extras), res); assert.ok([405, 421].includes(res.code));
  }
  assert.equal(metadataCalls, 0);
  const alias = response(); await handler(req("/old-post?part=2&part=7", { headers: { host: "www.sod1820.co.il" } }), alias);
  assert.equal(alias.code, 308); assert.equal(alias.headers.get("location"), SITE + "/old-post?part=2&part=7");
  const exact = response(); const address = "/old-post?part=2&part=7&encoded=%2f%2F+%20&path=%2Fkept";
  await handler(req(address, { headers: { host: "www.sod1820.co.il" } }), exact);
  assert.equal(exact.headers.get("location"), SITE + address);
  const rewritten = response(); await handler(req("/api/public-document?path=%2Fold-post&part=2&part=7", {
    headers: { host: "www.sod1820.co.il" }, query: { path: "/old-post" } }), rewritten);
  assert.equal(rewritten.code, 200); assert.equal(rewritten.headers.get("location"), undefined);
  const head = response(); await handler(req("/", { method: "HEAD" }), head); assert.equal(head.code, 200); assert.equal(head.body, "");
});

test("Numbers/phrases use the same canonical indexability readers; source failure is 503, false is noindex", async () => {
  for (const [path, rpc, expectedBody] of [["/number/1820", "is_number_indexable", { p_value: 1820 }],
    ["/number/בראשית", "is_phrase_indexable", { p_phrase: "בראשית" }]]) {
    for (const value of [true, false, null]) await withFetch(async (url, options) => {
      if (String(url).includes("/rpc/")) { assert.ok(String(url).endsWith(rpc)); assert.deepEqual(JSON.parse(options.body), expectedBody); return json(value); }
      return json([]);
    }, async () => {
      const res = response(); await publicReadingDocumentHandler({ authorized: () => true, readDocument: async () => document })(req(path), res);
      assert.equal(res.code, value === null ? 503 : 200); assert.match(res.headers.get("x-robots-tag"), value === true ? /^index/ : /^noindex/);
    });
  }
  const res = response(); await publicReadingDocumentHandler({ authorized: () => true, readDocument: async () => document })(req("/gematria?q=דוד&n=1"), res);
  assert.equal(res.code, 200); assert.match(res.headers.get("x-robots-tag"), /noindex/); assert.ok(!res.body.includes('content="דוד = 1'));
});

test("public topic/writer/video missing and failed source responses keep 404 and 503 distinct", async () => {
  for (const path of ["/topic/missing", "/community/researcher/missing", "/video/" + assetId]) {
    for (const [data, code] of [[[], 404], [{ error: "synthetic" }, 503]]) await withFetch(async (url) => {
      if (path.startsWith("/community")) assert.match(String(url), /active=eq.true.*locked=not.is.true.*visibility.eq.public/);
      return json(data);
    }, async () => {
      const res = response(); await publicReadingDocumentHandler({ authorized: () => true, readDocument: async () => document })(req(path), res);
      assert.equal(res.code, code, path); assert.match(res.headers.get("x-robots-tag"), /noindex/);
    });
  }
});

test("sitemap reuses eligible publication owner for both Post families, Numbers, phrases, topic, public writer and verified video", async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    const value = String(url); calls.push(value);
    if (value.includes("/posts?")) return json([legacy, modern, encoded]);
    if (value.includes("/rpc/sitemap_numbers")) { assert.equal(options.method, "POST"); return json([{ value: 1820 }]); }
    if (value.includes("/sitemap_phrases_v1?")) return json([{ phrase: "בראשית" }]);
    if (value.includes("/topic_cards_public?")) return json([{ slug: "subject" }]);
    if (value.includes("/contributors?")) { assert.match(value, /active=eq.true.*visibility.eq.public/); return json([{ slug: "writer", code: "2042" }]); }
    if (value.includes("/video_media_assets_v1?")) return json([{ public_id: assetId, title: "Video", google_indexable: true,
      media_url: "https://example.invalid/movie.mp4", video_kind: "video", primary_page_url: SITE + "/video/" + assetId }]);
    throw Error("unexpected public source " + new URL(value).pathname);
  };
  await withFetch(fetcher, async () => {
    const res = response(); await publicReadingSitemapHandler({ authorized: () => true })(req("/sitemap.xml"), res);
    assert.equal(res.code, 200); assert.equal(res.headers.get("cache-control"), "no-store");
    for (const path of ["/old-post", "/post/new-post", "/number/1820", "/number/" + encodeURIComponent("בראשית"),
      "/topic/subject", "/community/researcher/2042", "/video/" + assetId, "/gematria", "/gallery"])
      assert.ok(res.body.includes(`<loc>${SITE}${path}</loc>`), path);
    for (const path of ["/login", "/journey", "/books", "/unsubscribe", "/code"]) assert.ok(!res.body.includes(`<loc>${SITE}${path}</loc>`), path);
    assert.ok(!calls.some(url => /site_flags|research_contributions|els_records/.test(url)));
  });
  await withFetch(async () => { throw Error("synthetic outage"); }, async () => {
    const res = response(); await publicReadingSitemapHandler({ authorized: () => true })(req("/sitemap.xml"), res); assert.equal(res.code, 503);
  });
});

test("robots follows Production canonical sitemap while dormant mode fails closed; public GET APIs strip Legacy authority and reject POST", async () => {
  const dormant = response(); publicReadingRobotsHandler()(req("/robots.txt"), dormant); assert.equal(dormant.code, 503); assert.match(dormant.body, /Disallow: \//);
  const robots = response(); publicReadingRobotsHandler({ authorized: () => true })(req("/robots.txt"), robots);
  assert.equal(robots.code, 200); assert.match(robots.body, /Allow: \/\n/); assert.match(robots.body, /Sitemap: https:\/\/sod1820.co.il\/sitemap.xml/);
  let calls = 0;
  const api = publicReadingReadOnlyApi((request, res) => {
    calls++; assert.equal(request.headers.authorization, undefined); assert.equal(request.headers.cookie, undefined);
    return res.status(200).json({ state: "ready" });
  }, { authorized: () => true });
  const read = response(); await api(req("/api/contributor-interactions", { headers: { host: "sod1820.co.il", authorization: "saved Legacy", cookie: "saved" } }), read);
  const write = response(); await api(req("/api/contributor-interactions", { method: "POST" }), write);
  assert.equal(read.code, 200); assert.equal(write.code, 405); assert.equal(calls, 1);
});

function workerHarness({ clients = {}, fetcher = async () => json([]) } = {}) {
  const listeners = {}, calls = [];
  vm.runInNewContext(buildPublicReadingWorker(sha), { self: { location: { origin: SITE }, skipWaiting() {},
    clients: { claim() {}, get: async id => clients[id] }, addEventListener: (name, handler) => { listeners[name] = handler; } },
    URL, Response, Request, Set, JSON, fetch: async (...args) => { calls.push(args); return fetcher(...args); } });
  return { calls, listeners, async request(path, { method = "POST", body = "{}", clientId = "", origin = API } = {}) {
    let pending;
    listeners.fetch({ request: new Request(origin + path, { method, ...(!["GET", "HEAD"].includes(method) ? { body } : {}) }), clientId,
      respondWith(value) { pending = value; } });
    return pending ? await pending : null;
  } };
}

test("exact emitted worker denies A3/models/Auth/credits/writes through GET/POST/PATCH/DELETE and proxy paths before network", async () => {
  const harness = workerHarness({ fetcher: async () => { throw Error("live I/O forbidden"); } });
  for (const path of ["/functions/v1/research-run", "/functions/v1/ai-analyze", "/functions/v1/newsletter-signup", "/rest/v1/rpc/credit_reserve_v1",
    "/rest/v1/rpc/fn_get_or_create_my_person", "/rest/v1/rpc/research_state_apply_ops_v1", "/auth/v1/token?grant_type=password", "/auth/v1/logout"])
    for (const method of ["GET", "POST", "PATCH", "DELETE"]) assert.equal((await harness.request(path, { method })).status, 403, method + path);
  for (const path of ["/api/preview-raziel", "/api/contributor-self", "/api/contributor-interactions"])
    assert.equal((await harness.request(path, { origin: SITE })).status, 403, path);
  assert.equal(harness.calls.length, 0);
});

test("emitted worker retains public calculator/STABLE GET/community projection reads and context checks, never raw replies", async () => {
  const harness = workerHarness();
  assert.equal((await harness.request("/rest/v1/rpc/fn_method_profile")).status, 200);
  assert.equal((await harness.request("/rest/v1/rpc/writer_public_contributions_page_v1?p_limit=20", { method: "GET" })).status, 200);
  assert.equal((await harness.request("/rest/v1/rpc/convergence_meter", { body: '{"p_n":1820}' })).status, 200);
  assert.equal((await harness.request("/rest/v1/rpc/convergence_meter", { body: '{"p_n":1820,"write":true}' })).status, 403);
  assert.equal((await harness.request("/rest/v1/rpc/community_feed_page?select=" + encodeURIComponent(COMMUNITY_PUBLIC_FIELDS))).status, 200);
  const before = harness.calls.length;
  assert.equal((await harness.request("/rest/v1/rpc/community_feed_page?select=*" )).status, 403);
  assert.equal((await harness.request("/rest/v1/rpc/community_replies_page", { body: '{}' })).status, 403);
  assert.equal((await harness.request("/rest/v1/rpc/%63redit_reserve_v1", { method: "GET" })).status, 403);
  assert.equal(harness.calls.length, before);
  assert.ok(harness.calls.every(([request, options]) => request instanceof Request ? request.cache === "no-store" && request.credentials === "omit" : options.cache === "no-store"));
});

test("signed Legacy unsubscribe alone can reach its unchanged HMAC server from exact controlled service document", async () => {
  const e = "c3ludGhldGljQGV4YW1wbGUuaW52YWxpZA", t = "S".repeat(43), path = `/functions/v1/newsletter-unsubscribe?e=${e}&t=${t}&format=json`;
  const clients = { good: { type: "window", url: `${SITE}/unsubscribe?e=${e}&t=${t}` },
    wrong: { type: "window", url: `${SITE}/world?e=${e}&t=${t}` }, foreign: { type: "window", url: `https://foreign.invalid/unsubscribe?e=${e}&t=${t}` },
    other: { type: "window", url: `${SITE}/unsubscribe?e=other&t=${t}` } };
  const harness = workerHarness({ clients, fetcher: async () => json({ ok: true }) });
  for (const clientId of ["", "missing", "wrong", "foreign", "other"]) assert.equal((await harness.request(path, { method: "GET", clientId })).status, 403, clientId);
  for (const suffix of ["&callback=x", "&format=json", "&e=other"]) assert.equal((await harness.request(path + suffix, { method: "GET", clientId: "good" })).status, 403);
  for (const method of ["POST", "HEAD", "OPTIONS"]) assert.equal((await harness.request(path, { method, clientId: "good" })).status, 403);
  assert.equal(harness.calls.length, 0);
  assert.equal((await harness.request(path, { method: "GET", clientId: "good" })).status, 200); assert.equal(harness.calls.length, 1);
  const [request] = harness.calls[0]; assert.equal(request.url, API + path); assert.equal(request.credentials, "omit"); assert.equal(request.cache, "no-store");
});

test("bootstrap bounds every worker phase, rejects redundant/wrong policy and never imports after a late timeout", async () => {
  function runtime({ register, ready = Promise.resolve(), controller = "valid", installing } = {}) {
    const imports = [], document = { body: { textContent: "existing shell" } };
    class Channel {
      constructor() {
        this.port1 = { close() {}, onmessage: null };
        this.port2 = { close() {}, reply: value => queueMicrotask(() => this.port1.onmessage?.({ data: value })) };
      }
    }
    const sw = new EventTarget(); sw.ready = ready;
    sw.controller = controller === null ? null : { postMessage(_message, ports) {
      ports[0].reply({ policy: controller === "valid" ? PUBLIC_READING_POLICY_ID : "wrong", sourceSha: sha });
    } };
    sw.register = register || (async (_path, options) => { assert.equal(options.updateViaCache, "none"); return { installing }; });
    return { imports, document, navigator: { serviceWorker: sw }, MessageChannel: Channel, setTimeout, clearTimeout,
      loadEntry: async entry => { imports.push(entry); } };
  }
  const config = { entry: "/assets/entry.js", sourceSha: sha, policy: PUBLIC_READING_POLICY_ID, timeoutMs: 10 };
  const success = runtime(); assert.equal(await startPublicReading(config, success), true); assert.equal(success.imports.length, 1);
  const reused = runtime({ controller: "wrong" }); let updates = 0;
  const current = runtime().navigator.serviceWorker.controller;
  reused.navigator.serviceWorker.register = async () => ({ active: {}, update: async () => {
    updates++; reused.navigator.serviceWorker.controller = current;
  } });
  assert.equal(await startPublicReading(config, reused), true); assert.equal(updates, 1); assert.equal(reused.imports.length, 1);
  const stalledUpdate = runtime();
  stalledUpdate.navigator.serviceWorker.register = async () => ({ active: {}, update: () => new Promise(() => {}) });
  assert.equal(await startPublicReading(config, stalledUpdate), false); assert.equal(stalledUpdate.imports.length, 0);
  const redundant = new EventTarget(); redundant.state = "redundant";
  for (const failure of [runtime({ installing: redundant }), runtime({ ready: new Promise(() => {}) }),
    runtime({ controller: null }), runtime({ controller: "wrong" }), { ...runtime(), navigator: {} }]) {
    assert.equal(await startPublicReading(config, failure), false); assert.equal(failure.imports.length, 0); assert.match(failure.document.body.textContent, /העמוד לא נפתח/);
  }
  let release;
  const late = runtime({ register: () => new Promise(resolve => { release = resolve; }) });
  assert.equal(await startPublicReading(config, late), false); release({}); await new Promise(resolve => setImmediate(resolve));
  assert.equal(late.imports.length, 0, "late register resolution cannot import after timeout");
  const stalled = new EventTarget(); stalled.state = "installing";
  const installation = runtime({ installing: stalled }); assert.equal(await startPublicReading(config, installation), false);
  stalled.state = "activated"; stalled.dispatchEvent(new Event("statechange")); await new Promise(resolve => setImmediate(resolve));
  assert.equal(installation.imports.length, 0);
});

test("actual local artifact retains font fix, compiler isolation, no index shadow, no-store worker and byte-exact Legacy rollback worker", () => {
  assert.ok(existsSync(new URL("public-reading-deploy/dist/public-reading-artifact.json", root)), "run node scripts/build-public-reading-production.mjs before acceptance");
  const report = JSON.parse(read("public-reading-deploy/dist/public-reading-artifact.json"));
  const hash = data => createHash("sha256").update(data).digest("hex");
  const html = read("public-reading-deploy/.generated/2029.html"), worker = read("public-reading-deploy/dist/sw.js");
  assert.equal(report.activation.state, "dormant"); assert.equal(report.deployed, false); assert.equal(report.productionReady, false);
  assert.equal(report.workerSha256, hash(worker)); assert.equal(report.previewBypassFlags, false);
  assert.equal(report.documentTemplateSha256, hash(html)); assert.equal(report.documentTemplatePublic, false);
  assert.match(html, /media="print" onload="this.onload=null;this.media='all'"/);
  assert.match(html, /navigator.serviceWorker.register\("\/sw.js"/); assert.match(html, /worker_identity_mismatch/);
  assert.ok(html.indexOf("public-reading-policy") < html.indexOf("await loadEntry("));
  assert.equal(existsSync(new URL("public-reading-deploy/dist/index.html", root)), false);
  assert.equal(existsSync(new URL("public-reading-deploy/dist/2029.html", root)), false);
  assert.equal(existsSync(new URL("public-reading-deploy/dist/robots.txt", root)), false);
  for (const alias of ["public-reading-sw.js", "preview-readonly-sw.js"]) assert.equal(read("public-reading-deploy/dist/" + alias), worker);
  assert.equal(read("public-reading-deploy/dist/rollback/legacy-sw.js"), read("public/sw.js"));
  assert.equal(report.legacyRollbackWorkerSha256, hash(read("public/sw.js")));
  assert.ok(!worker.includes("caches.open")); assert.ok(!worker.includes("caches.match"));
  const config = JSON.parse(read("public-reading-deploy/vercel.json"));
  assert.equal(report.deploymentConfigSha256, hash(read("public-reading-deploy/vercel.json")));
  assert.ok(config.headers.some(rule => rule.source === "/assets/(.*)" && rule.headers.some(header => header.value === "public, max-age=31536000, immutable")));
  assert.ok(!JSON.stringify(config).includes("autoAssignCustomDomains"));
  assert.deepEqual(config.redirects, [...JSON.parse(read("vercel.json")).redirects,
    { source: "/posts", destination: "/post", permanent: true }]);
  const gate = spawnSync(process.execPath, ["scripts/test-legacy-production-lock.mjs"], { cwd: root, encoding: "utf8" }); assert.equal(gate.status, 0, gate.stderr);
});
