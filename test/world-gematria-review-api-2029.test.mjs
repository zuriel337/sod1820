import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/world-finding-review.js";
import { WORLD_GEMATRIA_METHOD_COLUMNS } from "../src/lib/research/worldGematriaTriageProjection.js";

function jsonResponse(body, { status = 200, contentRange = null } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (contentRange) headers.set("content-range", contentRange);
  return new Response(JSON.stringify(body), { status, headers });
}

function responseRecorder() {
  return {
    statusCode: null,
    body: null,
    setHeader() {},
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
}

function row(id, phrase) {
  return {
    id,
    phrase,
    phrase_hint: null,
    is_encrypted: false,
    category: null,
    source: "corpus",
    created_at: "2026-10-26T00:00:00Z",
    updated_at: null,
    node_id: null,
    is_verified: false,
    is_published: false,
    unverified_reason: null,
    tags: [],
    ...Object.fromEntries(WORLD_GEMATRIA_METHOD_COLUMNS.map(({ key }, index) => [key, index + 1])),
  };
}

test("manager gematria mode reads one bounded page plus integrity and never loads the findings corpus", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  const readyId = "10000000-0000-4000-8000-000000000001";
  const outsideId = "10000000-0000-4000-8000-000000000002";
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    calls.push(url);
    if (url.pathname === "/auth/v1/user") return jsonResponse({ id: "admin-user" });
    if (url.pathname === "/rest/v1/users") return jsonResponse([{ role: "admin" }]);
    if (url.pathname === "/rest/v1/gematria_words") {
      assert.equal(url.searchParams.get("is_verified"), "eq.false");
      return jsonResponse([row(readyId, "סוד החשמל"), row(outsideId, "1820 סוד")], { contentRange: "0-1/2" });
    }
    if (url.pathname === "/rest/v1/gematria_integrity") return jsonResponse([]);
    throw new Error(`unexpected fetch ${url.pathname}`);
  };
  try {
    const response = responseRecorder();
    await handler({ method: "GET", headers: { authorization: "Bearer admin-token" }, query: { mode: "gematria", offset: "0" } }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.page.returned, 2);
    assert.equal(response.body.projection.rows[0].integrityState, "engine_parity_ready");
    assert.equal(response.body.projection.rows[1].integrityState, "outside_clean_hebrew");
    assert.equal(response.body.projection.rules.noAutomaticPromotion, true);
    assert.equal(calls.filter((url) => url.pathname === "/rest/v1/gematria_words").length, 1);
    assert.equal(calls.filter((url) => url.pathname === "/rest/v1/gematria_integrity").length, 1);
    assert.equal(calls.some((url) => url.pathname === "/rest/v1/world_contributor_research_v1"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
