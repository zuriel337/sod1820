import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/world-finding-review.js";

function jsonResponse(body, { status = 200, contentRange = null } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (contentRange) headers.set("content-range", contentRange);
  return new Response(JSON.stringify(body), { status, headers });
}

function researchRow(index) {
  const linked = index === 0;
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    created_at: `2026-10-22T00:${String(index).padStart(2, "0")}:00Z`,
    kind: "observation",
    statement: `ממצא ${index}`,
    terms: [String(1800 + index)],
    value: 1800 + index,
    relates: [],
    source: "wa_channel_research",
    source_ref: `channel_updates:${index}`,
    contributor: "צבי",
    confidence: null,
    engine_verified: linked,
    engine_detail: linked ? { verification_state: "match" } : {},
    evidence: null,
    status: "candidate",
    privacy_scope: "private",
    promoted_node_id: null,
    parent_id: null,
    meta: {
      ext: {
        wa_channel_intake: {
          tree_matches: linked ? [{ type: "topic", key: "target", label: "יעד", match: "number" }] : [],
        },
      },
    },
  };
}

function mockResponse() {
  const headers = new Map();
  return {
    statusCode: null,
    body: null,
    setHeader(name, value) { headers.set(name.toLowerCase(), value); },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
    headers,
  };
}

test("owner review validates admin, ranks server-side, and returns only 40 findings", async () => {
  const originalFetch = globalThis.fetch;
  const findings = Array.from({ length: 45 }, (_, index) => researchRow(index));
  const topic = {
    id: "10000000-0000-4000-8000-000000000000",
    created_at: "2026-10-22T00:00:00Z",
    approved_at: null,
    slug: "target",
    title: "יעד",
    subtitle: null,
    search_terms: [],
    image_ids: [],
    numbers: [1800],
    highlight_numbers: [1800],
    status: "candidate",
    quality: 8,
    meter_score: 91,
    created_by: "ZURIEL",
    node_id: null,
  };

  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const authorization = new Headers(init.headers).get("authorization") || "";
    if (url.pathname === "/auth/v1/user") {
      return jsonResponse({ id: authorization.includes("member-token") ? "member-user" : "admin-user" });
    }
    if (url.pathname === "/rest/v1/users") {
      return jsonResponse([{ role: authorization.includes("member-token") ? "member" : "admin" }]);
    }
    if (url.pathname === "/rest/v1/channel_updates") return jsonResponse([], { contentRange: "0-0/0" });
    if (url.pathname === "/rest/v1/topic_cards") return jsonResponse([topic], { contentRange: "0-0/1" });
    if (url.pathname === "/rest/v1/research_objects") return jsonResponse(findings, { contentRange: "0-44/45" });
    throw new Error(`unexpected fetch ${url.pathname}`);
  };

  try {
    const response = mockResponse();
    await handler({
      method: "GET",
      headers: { authorization: "Bearer admin-token" },
      query: { offset: "0", tree: "all", meter: "all" },
    }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.page.limit, 40);
    assert.equal(response.body.page.returned, 40);
    assert.equal(response.body.page.totalFiltered, 45);
    assert.equal(response.body.page.hasMore, true);
    assert.equal(response.body.projection.rows[0].sourceId, findings[0].id);
    assert.equal(response.body.projection.rows[0].linkedTopicRating.meterScore, 91);
    assert.equal(response.body.projection.rows.every((row) => row.family === "research_object"), true);
    assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");

    const secondPageResponse = mockResponse();
    await handler({
      method: "GET",
      headers: { authorization: "Bearer admin-token" },
      query: { offset: "40", tree: "all", meter: "all" },
    }, secondPageResponse);
    assert.equal(secondPageResponse.statusCode, 200);
    assert.equal(secondPageResponse.body.page.returned, 5);
    assert.equal(secondPageResponse.body.page.hasMore, false);
    assert.equal(secondPageResponse.body.page.nextOffset, 45);

    const memberResponse = mockResponse();
    await handler({
      method: "GET",
      headers: { authorization: "Bearer member-token" },
      query: {},
    }, memberResponse);
    assert.equal(memberResponse.statusCode, 403);
    assert.deepEqual(memberResponse.body, { error: "admin_required" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
