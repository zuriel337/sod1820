import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/world-finding-review.js";

function jsonResponse(body, { contentRange = null } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (contentRange) headers.set("content-range", contentRange);
  return new Response(JSON.stringify(body), { status: 200, headers });
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

test("manager insight mode returns one bounded read-only page without loading findings", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    calls.push(url);
    if (url.pathname === "/auth/v1/user") return jsonResponse({ id: "admin-user" });
    if (url.pathname === "/rest/v1/users") return jsonResponse([{ role: "admin" }]);
    if (url.pathname === "/rest/v1/insights") return jsonResponse([{
      id: "10000000-0000-4000-8000-000000000001",
      title: "תובנה",
      body: "גוף",
      source_type: "sod1820",
      source_ref: null,
      related_numbers: [],
      related_phrases: [],
      tags: [],
      is_active: true,
      created_at: "2026-10-26T00:00:00Z",
      updated_at: null,
      proof: null,
      proof_method: null,
      category: null,
      evidence_level: null,
      space: "core",
      verified: false,
    }], { contentRange: "0-0/315" });
    throw new Error(`unexpected fetch ${url.pathname}`);
  };
  try {
    const response = responseRecorder();
    await handler({ method: "GET", headers: { authorization: "Bearer admin-token" }, query: { mode: "insights", offset: "0" } }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.page.limit, 40);
    assert.equal(response.body.page.totalFiltered, 315);
    assert.equal(response.body.projection.rows[0].state, "missing_source");
    assert.equal(response.body.projection.rules.sourceIsSeparateFromEvidence, true);
    assert.equal(calls.filter((url) => url.pathname === "/rest/v1/insights").length, 1);
    assert.equal(calls.some((url) => url.pathname === "/rest/v1/world_contributor_research_v1"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
