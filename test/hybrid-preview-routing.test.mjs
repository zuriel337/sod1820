import test from "node:test";
import assert from "node:assert/strict";
import { createHybridRouteResolver, loadHybridRoutePolicy, validateHybridRoutePolicy } from "../scripts/hybrid-preview-routing.mjs";

const policy = await loadHybridRoutePolicy();
const route = createHybridRouteResolver(policy);

test("hybrid policy is pinned to the exact live Legacy and accepted 2029 candidate inputs", () => {
  assert.equal(policy.sources.legacySha, "0f3443a9a4dcb78e935d74f2a937c47dbf35d18c");
  assert.equal(policy.sources.candidateSha, "e994cb67120fa0f735ab3859aa5acba67e24adba");
  assert.equal(policy.status, "acceptance-only-not-production-approved");
  assert.equal(policy.defaultRuntime, "legacy");
});

test("candidate acceptance routes resolve to the isolated 2029 document", () => {
  for (const path of ["/", "/posts", "/post/example?x=1#top", "/world/", "/topic/123", "/number/1820", "/היכל"]) {
    assert.deepEqual(route(path).runtime, "2029", path);
    assert.equal(route(path).document, "2029.html", path);
  }
});

test("Legacy is the fail-safe for explicit Legacy and every unknown route", () => {
  for (const path of ["/code", "/els", "/legacy-screen-we-have-not-mapped", "/admin/unknown", "/life-journey-old"]) {
    assert.equal(route(path).runtime, "legacy", path);
    assert.equal(route(path).document, "legacy.html", path);
  }
});

test("policy rejects a route assigned to both runtimes or a non-Legacy fallback", () => {
  assert.throws(() => validateHybridRoutePolicy({ ...policy, defaultRuntime: "2029" }), /fallback must be Legacy/);
  assert.throws(() => validateHybridRoutePolicy({
    ...policy,
    explicitLegacyRoutes: [...policy.explicitLegacyRoutes, "/world"],
  }), /also assigned to 2029/);
});
