import test from "node:test";
import assert from "node:assert/strict";
import { supabase } from "../supabase.js";
import { fetchEntityHubProjection } from "./entityHubProjection.js";

const node = { id: "11111111-1111-4111-8111-111111111111", type: "number", label: "91", identity_key: "91", is_active: true, metadata: {} };
const row = { method: "רגיל", phrase: "synthetic expression", value: 91, bid_id: "synthetic-1", total_count: 1, is_verified: true };
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// Mock transport only. Exercise the real projection, family grouping and numeric
// router together; synthetic data makes no claim about a live calculation.
function installTransport(t, { graph = null, paged = { data: [row] }, full = { data: [row] }, missing = false } = {}) {
  const calls = [];
  t.mock.method(supabase, "rpc", (name, args) => {
    calls.push({ name, args });
    if (name === "fn_number_lookup") return Promise.resolve("p_limit" in args ? paged : full);
    return Promise.resolve({ data: name === "fn_zero_scale" ? { scale_chain: [91, 910] } : [] });
  });
  t.mock.method(supabase, "from", (table) => {
    const filters = [], flags = {};
    const result = async () => {
      let data = [];
      if (table === "nodes" && filters.some(([key]) => ["identity_key", "label", "id"].includes(key))) {
        if (filters.some(([key, value]) => key === "id" && value === node.id) && graph) await graph.promise;
        data = missing ? [] : [node];
      }
      if (table === "gematria_methods") data = [{ method_key: "רגיל", db_column: "ragil", display_label: "רגיל", active: true, in_engine: true }];
      return { data: flags.single ? data[0] || null : data, count: data.length, error: null };
    };
    const query = new Proxy({}, { get: (_, method) => {
      if (method === "then") return (resolve, reject) => result().then(resolve, reject);
      return (...args) => {
        if (method === "eq") filters.push(args);
        if (method === "maybeSingle" || method === "single") flags.single = true;
        return query;
      };
    } });
    return query;
  });
  return calls;
}

test("Number identity and canonical method families arrive while deep graph is still pending", async (t) => {
  const graph = deferred(), methods = deferred(), phases = [];
  const calls = installTransport(t, { graph });
  let complete = false;
  const pending = fetchEntityHubProjection({ type: "number", key: "91", onNumberCore(core) {
    phases.push(core);
    if (core.gematria.families) methods.resolve(core);
  } }).then(value => { complete = true; return value; });
  const core = await methods.promise;
  assert.equal(complete, false);
  assert.equal(phases[0].identity.nodeId, node.id);
  assert.equal(phases[0].gematria.pending, true);
  assert.equal(core.numberPagePending, true);
  assert.equal(core.gematria.families[0].phrases[0].phrase, row.phrase);
  assert.equal(core.graph, undefined, "unread graph must not be presented as an empty graph");
  graph.resolve();
  const full = await pending;
  assert.deepEqual(full.gematria.families, core.gematria.families);
  assert.equal(full.numberPagePending, undefined);
  assert.equal(calls.filter(call => call.name === "fn_number_lookup").length, 1, "exhaustive page feeds both families and numeric research");
});

test("a truncated numeric page never truncates the complete family population", async (t) => {
  const calls = installTransport(t, {
    paged: { data: [{ ...row, total_count: 501 }] },
    full: { data: [row, { ...row, phrase: "second synthetic expression", bid_id: "synthetic-2" }] },
  });
  const result = await fetchEntityHubProjection({ type: "number", key: "91" });
  assert.equal(result.gematria.families[0].count, 2);
  const reads = calls.filter(call => call.name === "fn_number_lookup");
  assert.equal(reads.length, 2);
  assert.equal(reads[0].args.p_limit, 500);
  assert.deepEqual(reads[1].args, { p_value: 91 });
});

test("legacy overload fallback is shared without pretending it is a complete paged response", async (t) => {
  const calls = installTransport(t, { paged: { error: { code: "PGRST202", message: "could not find the function" } } });
  const result = await fetchEntityHubProjection({ type: "number", key: "91" });
  assert.equal(result.gematria.families[0].count, 1);
  assert.equal(calls.filter(call => call.name === "fn_number_lookup").length, 2, "one paged attempt and one shared legacy read");
});

test("missing Number nodes do not emit a synthetic partial identity, including zero", async (t) => {
  const calls = installTransport(t, { missing: true });
  const phases = [];
  const result = await fetchEntityHubProjection({ type: "number", key: "0", onNumberCore: core => phases.push(core) });
  assert.equal(result, null);
  assert.deepEqual(phases, []);
  assert.deepEqual(calls, []);
});

test("a failed depth read rejects honestly after the core has arrived", async (t) => {
  const graph = deferred(), methods = deferred();
  installTransport(t, { graph });
  const pending = fetchEntityHubProjection({ type: "number", key: "91", onNumberCore(core) {
    if (core.gematria.families) methods.resolve();
  } });
  const rejected = assert.rejects(pending, /depth unavailable/);
  await methods.promise;
  graph.reject(new Error("depth unavailable"));
  await rejected;
});

test("separate projection requests do not share access-dependent reads", async (t) => {
  const calls = installTransport(t);
  await Promise.all([fetchEntityHubProjection({ type: "number", key: "91" }), fetchEntityHubProjection({ type: "number", key: "91" })]);
  assert.equal(calls.filter(call => call.name === "fn_number_lookup").length, 2);
});
