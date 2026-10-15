import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createNumberLookupTransport, resetNumberLookupTransportMemory } from "../src/lib/research/numberLookupTransport2029.js";
import { primeRuntimeSwitches } from "../src/lib/runtimeSwitches2029.js";

beforeEach(() => resetNumberLookupTransportMemory());
const ON = async () => ({ fx_number_lookup_page: true });
const OFF = async () => ({ fx_number_lookup_page: false });
const args = (n) => ({ p_value: n, p_limit: 20, p_after_bid_id: null });

for (const thrown of [false, true]) {
  test(`R2 missing function (${thrown ? "thrown" : "returned"}): one probe per page load, then the existing RPC directly`, async () => {
    const calls = [];
    const rpc = async (name, a) => {
      calls.push(name);
      if (name === "fn_number_lookup_2029_page") { const error = { code: "PGRST202", message: "not found" }; if (thrown) throw error; return { error }; }
      return { data: [a.p_value] };
    };
    const routed = createNumberLookupTransport(rpc, { is2029: true, readSwitches: ON });
    const results = [];
    for (const n of [26, 300, 613, 1820, 5112]) results.push(await routed("fn_number_lookup", args(n)));
    assert.deepEqual(results.map((r) => r.data[0]), [26, 300, 613, 1820, 5112]);                     // every search still answered
    assert.equal(calls.filter((c) => c === "fn_number_lookup_2029_page").length, 1);                  // missing RPC requested once
    assert.equal(calls.filter((c) => c === "fn_number_lookup").length, 5);                            // baseline answered all five
  });
}

test("R2 the memory holds only 'function not found': permission, SQL and timeout errors still reach the caller every time", async () => {
  for (const code of ["42501", "57014", "XX000"]) {
    resetNumberLookupTransportMemory();
    let optimizedCalls = 0; const failure = { error: { code, message: "keep" } };
    const routed = createNumberLookupTransport(async (name) => { if (name === "fn_number_lookup_2029_page") optimizedCalls += 1; return failure; }, { is2029: true, readSwitches: ON });
    assert.equal(await routed("fn_number_lookup", args(26)), failure);
    assert.equal(await routed("fn_number_lookup", args(26)), failure);
    assert.equal(optimizedCalls, 2);                                                                  // not remembered, not hidden, no fallback
  }
});

test("R2 a new page load (fresh memory) tries the function again, e.g. after it was installed", async () => {
  const calls = []; let installed = false;
  const rpc = async (name) => { calls.push(name); if (name === "fn_number_lookup_2029_page" && !installed) return { error: { code: "PGRST202" } }; return { data: [] }; };
  const routed = createNumberLookupTransport(rpc, { is2029: true, readSwitches: ON });
  await routed("fn_number_lookup", args(1)); await routed("fn_number_lookup", args(2));
  assert.equal(calls.filter((c) => c === "fn_number_lookup_2029_page").length, 1);
  installed = true; resetNumberLookupTransportMemory();                                                // = page refresh
  calls.length = 0; await routed("fn_number_lookup", args(3));
  assert.deepEqual(calls, ["fn_number_lookup_2029_page"]);                                            // fast path used, no baseline call
});

test("R2 switch OFF always uses the existing RPC directly, whatever the memory holds", async () => {
  const calls = [];
  const rpc = async (name) => { calls.push(name); return { data: [] }; };
  const routed = createNumberLookupTransport(rpc, { is2029: true, readSwitches: OFF });
  for (let i = 0; i < 4; i += 1) await routed("fn_number_lookup", args(i));
  assert.deepEqual(calls, Array(4).fill("fn_number_lookup"));
});

test("R4 rollback: ON uses the fast RPC; after OFF is read (new page load or settings window expiry) it is never used again", async () => {
  const calls = [];
  const rpc = async (name) => { calls.push(name); return { data: [] }; };
  const routed = createNumberLookupTransport(rpc, { is2029: true });                                  // default reader = the real settings cache
  primeRuntimeSwitches({ fx_number_lookup_page: true });
  await routed("fn_number_lookup", args(26));
  assert.deepEqual(calls, ["fn_number_lookup_2029_page"]);
  primeRuntimeSwitches({ fx_number_lookup_page: false });                                             // what a refresh / cache expiry / the writing tab sees
  calls.length = 0;
  await routed("fn_number_lookup", args(26)); await routed("fn_number_lookup", args(300));
  assert.deepEqual(calls, ["fn_number_lookup", "fn_number_lookup"]);
});
