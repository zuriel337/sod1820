import test from "node:test";
import assert from "node:assert/strict";
import canonicalMiddleware, { config as canonicalConfig } from "../middleware.js";
import publicMiddleware, { config } from "../public-reading-deploy/middleware.js";

test("selected public project root binds the exact existing function and static matcher", () => {
  assert.equal(publicMiddleware, canonicalMiddleware);
  assert.deepEqual(config, canonicalConfig);
});

// All effects are synthetic. No test here can reach log_edge, log_crawl or a
// country policy on the shared server; the canonical code is otherwise real.
async function invoke(path, agent, options = {}) {
  const pending = [], calls = [], original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = new URL(url); calls.push({ path: u.pathname, method: init?.method || "GET" });
    if (u.pathname === "/rest/v1/edge_blocked_countries") return Response.json([]);
    if (u.pathname === "/rest/v1/rpc/public_post_slug_exists") {
      // a lookup that never answers on its own: only the middleware's bound can end it
      if (options.postLookupHangs) return new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal.reason)));
      return Response.json(options.postExists !== false);
    }
    if (u.pathname === "/rest/v1/rpc/content_big_numbers") return Response.json([]);
    if (["/rest/v1/rpc/log_edge", "/rest/v1/rpc/log_crawl"].includes(u.pathname)) return new Response(null, { status: 204 });
    throw new Error("unexpected synthetic dependency: " + u.pathname);
  };
  try {
    const response = await publicMiddleware(new Request("https://sod1820.co.il" + path, {
      headers: { "user-agent": agent, "x-vercel-ip-country": "IL", ...(options.headers || {}) },
    }), { waitUntil: promise => pending.push(promise) });
    await Promise.all(pending); return { response, calls };
  } finally { globalThis.fetch = original; }
}

test("known blocked bot stays403 on public documents, with both existing security counters", async () => {
  for (const path of ["/", "/world", "/number/1820"]) {
    const { response, calls } = await invoke(path, "curl/8.0 SOD1820-MW-UNIT");
    assert.equal(response.status, 403); assert.equal(await response.text(), "Access denied");
    assert.ok(calls.some(c => c.path.endsWith("/log_edge")));
    assert.ok(calls.some(c => c.path.endsWith("/log_crawl")));
  }
});

test("ordinary browser keeps all accepted public route families, without a parallel route policy", async () => {
  for (const path of ["/", "/world", "/post", "/post/existing-source", "/tag/שלום", "/category/וידאו",
    "/community/chat", "/community/calculator", "/books", "/gallery", "/gematria", "/number/1820", "/number/משיח",
    "/2029/number/1820", "/2029/calculator", "/contact", "/privacy", "/unsubscribe"]) {
    const { response } = await invoke(path, "Mozilla/5.0 AppleWebKit/537.36 Chrome/142.0.0.0 Safari/537.36");
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("x-middleware-next"), "1", path);
    assert.match(response.headers.get("set-cookie"), /vb=browser/);
  }
});

test("good public crawler is admitted on Home while costly research stays blocked", async () => {
  assert.equal((await invoke("/", "Googlebot/2.1")).response.status, 200);
  assert.equal((await invoke("/research", "Googlebot/2.1")).response.status, 403);
  assert.equal((await invoke("/number/123456789", "Googlebot/2.1")).response.status, 403);
});

test("public artifact or browser-cookie claims cannot turn a blocked bot into an admitted caller", async () => {
  const { response } = await invoke("/world", "curl/8.0", {
    headers: { "x-sod-public-reading": "true", "cookie": "vb=browser; vc=IL" },
  });
  assert.equal(response.status, 403);
});

test("crawler: genuine missing post keeps the cheap edge 404; impossible media identity keeps its 404 for everyone", async () => {
  for (const [index, agent] of ["Googlebot/2.1", "Mozilla/5.0 (compatible; GPTBot/1.0)"].entries()) {
    // distinct addresses per agent: the edge caches an answer per address for ten minutes
    for (const path of [`/post/absent-source-${index}`, `/absent-old-address-${index}`]) {
      const { response, calls } = await invoke(path, agent, { postExists: false });
      assert.equal(response.status, 404, `${agent} ${path}`);
      assert.equal(response.headers.get("x-sod-route"), "not-found");
      assert.ok(calls.some(c => c.path === "/rest/v1/rpc/public_post_slug_exists"), "the crawler path still asks the exact slug owner");
    }
  }
  assert.equal((await invoke("/video/not-an-asset", "Mozilla/5.0 Chrome/142.0.0.0")).response.status, 404);
  assert.equal((await invoke("/video/not-an-asset", "Googlebot/2.1")).response.status, 404);
});

// 16.11.2026: a browser's Post document no longer waits for the edge lookup. The public document handler reads the same exact post and answers 404 +
// noindex (missing/suppressed) or 503 (source unavailable) itself — proven in public-reading-production-artifact.test.mjs — so the edge round trip
// to the database was a second read on the same question, paid before every old-address and /post/ document.
test("browser: Post documents (old address and /post/) pass the edge without the slug lookup; the document handler owns their 404", async () => {
  const agent = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/142.0.0.0 Mobile Safari/537.36";
  for (const path of ["/post/absent-source", "/absent-old-address", "/%D7%AA%D7%A4%D7%99%D7%9C%D7%94-%D7%9C%D7%A8%D7%A4%D7%95%D7%90%D7%94", "/post/existing-source"]) {
    const { response, calls } = await invoke(path, agent, { postExists: false });
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("x-middleware-next"), "1", path);
    assert.equal(calls.some(c => c.path === "/rest/v1/rpc/public_post_slug_exists"), false, `${path}: no edge lookup for a browser document`);
  }
  // HEAD follows the same rule
  const head = await publicMiddlewareHead("/absent-old-address", agent);
  assert.equal(head.status, 200);
});

test("crawler lookup is bounded: an unanswered lookup fails open instead of holding the document", async () => {
  const started = Date.now();
  // Node does not hold the process open for AbortSignal.timeout's timer (the edge runtime does): keep the loop alive while the bound runs
  const keepAlive = setInterval(() => {}, 50);
  let response;
  try { ({ response } = await invoke("/slow-old-address", "Googlebot/2.1", { postLookupHangs: true })); } finally { clearInterval(keepAlive); }
  const elapsed = Date.now() - started;
  assert.equal(response.status, 200, "fail-open: the document handler decides");
  assert.ok(elapsed < 2500, `bounded (${elapsed} ms)`);
});

async function publicMiddlewareHead(path, agent) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = new URL(url);
    if (u.pathname === "/rest/v1/edge_blocked_countries") return Response.json([]);
    if (["/rest/v1/rpc/log_edge", "/rest/v1/rpc/log_crawl"].includes(u.pathname)) return new Response(null, { status: 204 });
    throw new Error("unexpected dependency for a browser HEAD: " + u.pathname);
  };
  try {
    const pending = [];
    const response = await publicMiddleware(new Request("https://sod1820.co.il" + path, { method: "HEAD", headers: { "user-agent": agent, "x-vercel-ip-country": "IL" } }), { waitUntil: p => pending.push(p) });
    await Promise.all(pending); return response;
  } finally { globalThis.fetch = original; }
}
