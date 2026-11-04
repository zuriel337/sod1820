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
    if (u.pathname === "/rest/v1/rpc/public_post_slug_exists") return Response.json(options.postExists !== false);
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

test("genuine missing post and impossible media identity keep their original404", async () => {
  const agent = "Mozilla/5.0 Chrome/142.0.0.0";
  assert.equal((await invoke("/post/absent-source", agent, { postExists: false })).response.status, 404);
  assert.equal((await invoke("/video/not-an-asset", agent)).response.status, 404);
});
