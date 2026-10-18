import test from "node:test";
import assert from "node:assert/strict";

import { supabase } from "../supabase.js";
import {
  fetchNumberAnchorProfile,
  fetchNumberOpeningContext,
  fetchNumberOpeningIdentity,
} from "./entityHubProjection.js";

const ANCHOR_FIELDS = "value,category,fact,hint,created_at,updated_at";

function installReadTransport(t, { nodes = [], anchors = [] } = {}) {
  const calls = [];

  t.mock.method(supabase, "from", (table) => {
    const call = { table, columns: null, filters: [], limit: null, single: false };
    calls.push(call);

    let query;
    const execute = async () => {
      let rows = table === "nodes" ? nodes : table === "number_anchors" ? anchors : [];
      for (const [column, value] of call.filters) {
        rows = rows.filter((row) => row?.[column] === value);
      }
      if (call.limit != null) rows = rows.slice(0, call.limit);
      return {
        data: call.single ? rows[0] || null : rows,
        error: null,
      };
    };

    query = new Proxy({}, {
      get(_target, method) {
        if (method === "then") return (resolve, reject) => execute().then(resolve, reject);
        return (...args) => {
          if (method === "select") call.columns = args[0];
          if (method === "eq") call.filters.push(args);
          if (method === "limit") call.limit = args[0];
          if (method === "maybeSingle" || method === "single") call.single = true;
          return query;
        };
      },
    });
    return query;
  });

  return calls;
}

test("exported anchor reader preserves the existing row, finding and access semantics", async (t) => {
  const anchor = {
    value: 718,
    category: "synthetic category",
    fact: "synthetic curated context",
    hint: "synthetic hint",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-02T00:00:00Z",
  };
  const calls = installReadTransport(t, { anchors: [anchor] });

  const profile = await fetchNumberAnchorProfile(718);

  assert.deepEqual(profile.row, anchor);
  assert.equal(profile.finding.source.sourceRef, "number_anchors:718");
  assert.equal(
    profile.finding.projection.dimensions.legacyNumberAnchor.semanticBoundary,
    "curated-context-not-verified-fact",
  );
  assert.deepEqual(profile.access, { available: true, reason: null });
  assert.deepEqual(calls, [{
    table: "number_anchors",
    columns: ANCHOR_FIELDS,
    filters: [["value", 718]],
    limit: null,
    single: true,
  }]);
});

test("bounded opening context resolves the existing Number node and reads its anchor once", async (t) => {
  const node = {
    id: "11111111-1111-4111-8111-111111111111",
    type: "number",
    label: "718",
    description: null,
    metadata: {},
    identity_key: "718",
    is_active: true,
    created_at: "2026-10-01T00:00:00Z",
  };
  const anchor = {
    value: 718,
    category: "synthetic category",
    fact: "synthetic curated context",
    hint: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: null,
  };
  const calls = installReadTransport(t, { nodes: [node], anchors: [anchor] });

  const context = await fetchNumberOpeningContext(718);

  assert.deepEqual(context.identity, {
    nodeId: node.id,
    type: "number",
    key: "718",
    label: "718",
    hubHref: "/entity-hub-preview/number/718",
  });
  assert.deepEqual(context.anchorProfile.row, anchor);
  assert.equal(context.anchorProfile.finding.identity.entityRef, "number:718");
  assert.equal(calls.filter((call) => call.table === "nodes").length, 1, "identity-key hit uses the existing resolver without a duplicate node read");
  const anchorCalls = calls.filter((call) => call.table === "number_anchors");
  assert.equal(anchorCalls.length, 1, "resolved identity selects one anchor");
  assert.deepEqual(anchorCalls[0].filters, [["value", 718]], "anchor selection follows the resolved Number label");
});

test("identity-only gate resolves the exact root without reading its anchor", async (t) => {
  const node = {
    id: "33333333-3333-4333-8333-333333333333",
    type: "number",
    label: "718",
    identity_key: "718",
    is_active: true,
  };
  const calls = installReadTransport(t, {
    nodes: [node],
    anchors: [{ value: 718, category: "must remain unread", fact: "must remain unread" }],
  });

  const result = await fetchNumberOpeningIdentity(718);

  assert.deepEqual(result, {
    value: 718,
    identity: {
      nodeId: node.id,
      type: "number",
      key: "718",
      label: "718",
      hubHref: "/entity-hub-preview/number/718",
    },
  });
  assert.equal(calls.filter((call) => call.table === "nodes").length, 1);
  assert.equal(calls.filter((call) => call.table === "number_anchors").length, 0);
});

test("identity-key hit with a different Number label fails closed before anchor read", async (t) => {
  const calls = installReadTransport(t, {
    nodes: [{
      id: "44444444-4444-4444-8444-444444444444",
      type: "number",
      label: "719",
      identity_key: "718",
    }],
    anchors: [{ value: 719, category: "wrong root", fact: "wrong root" }],
  });

  assert.equal(await fetchNumberOpeningIdentity(718), null);
  assert.equal(await fetchNumberOpeningContext(718), null);
  assert.equal(calls.filter((call) => call.table === "number_anchors").length, 0);
});

test("missing Number node, including zero, returns null without reading or inventing an anchor", async (t) => {
  const calls = installReadTransport(t, {
    nodes: [],
    anchors: [{ value: 0, category: "must not be read", fact: "must not be read" }],
  });

  assert.equal(await fetchNumberOpeningIdentity(0), null);
  assert.equal(await fetchNumberOpeningContext(0), null);
  assert.equal(calls.filter((call) => call.table === "nodes").length, 4, "each identity gate checks identity key then label");
  assert.equal(calls.filter((call) => call.table === "number_anchors").length, 0, "an orphan anchor cannot create a partial Number identity");
});

test("a valid Number identity survives an absent anchor as the existing empty profile", async (t) => {
  const node = {
    id: "22222222-2222-4222-8222-222222222222",
    type: "number",
    label: "1820",
    identity_key: "1820",
  };
  installReadTransport(t, { nodes: [node], anchors: [] });

  const context = await fetchNumberOpeningContext(1820);

  assert.equal(context.identity.nodeId, node.id);
  assert.deepEqual(context.anchorProfile, {
    row: null,
    finding: null,
    access: { available: true, reason: null },
  });
});

test("unsafe values fail closed before any database read", async (t) => {
  const calls = installReadTransport(t);

  assert.equal(await fetchNumberOpeningIdentity(Number.MAX_SAFE_INTEGER + 1), null);
  assert.equal(await fetchNumberOpeningIdentity("not-a-number"), null);
  assert.equal(await fetchNumberOpeningContext(Number.MAX_SAFE_INTEGER + 1), null);
  assert.equal(await fetchNumberOpeningContext("not-a-number"), null);
  assert.equal(await fetchNumberOpeningContext(null), null);
  assert.equal(await fetchNumberOpeningContext("  "), null);
  assert.deepEqual(calls, []);
});
