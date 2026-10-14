import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { switchesFromFlags, RUNTIME_SWITCHES_2029 } from "../src/lib/runtimeSwitches2029.js";

test("absent rows and lock flags leave every switch ON; only fx_* enabled=false turns one OFF", () => {
  const all = switchesFromFlags({});
  assert.ok(RUNTIME_SWITCHES_2029.every(({ key }) => all[key] === true));
  const off = switchesFromFlags({ fx_now_feed: { enabled: false }, fx_number_journey: { enabled: true }, lock_world: { enabled: false } });
  assert.equal(off.fx_now_feed, false);
  assert.equal(off.fx_number_journey, true);
  assert.equal(Object.keys(off).some((key) => key.startsWith("lock_")), false);
});
test("switches cannot reach saves, authorization, consent or research context (analytics is an explicit owner switch)", async () => {
  const catalog = RUNTIME_SWITCHES_2029.map(({ key }) => key).join(" ");
  assert.doesNotMatch(catalog, /consent|save|auth|research_context/i);
});
test("wiring: feed, lenses, Home strip and control panel use the one owner", async () => {
  const read = (p) => readFile(new URL(p, import.meta.url), "utf8");
  assert.match(await read("../src/components/experience2029/useSystemFeed2029.js"), /useRuntimeSwitch\("fx_now_feed"\)/);
  assert.match(await read("../src/lib/research/numericResearchBase.js"), /fx_number_journey/);
  assert.match(await read("../src/lib/research/numericResearchBase.js"), /fx_number_dossier/);
  assert.match(await read("../src/components/experience2029/HomeComposition2029.jsx"), /fx_home_convergences/);
  assert.match(await read("../src/App2029.jsx"), /useRuntimeSwitch\("fx_analytics"\)/);
  assert.match(await read("../src/lib/supabase.js"), /fx_analytics/);
  assert.match(await read("../src/pages/ControlPlane2029Page.jsx"), /<RuntimeSwitches \/>/);
});

test("every switch has a label, a group and (when measured) a well-formed cost; the writer accepts only fx_ keys", async () => {
  const { RUNTIME_SWITCH_COSTS_2029 } = await import("../src/lib/runtimeSwitches2029.js");
  for (const entry of RUNTIME_SWITCHES_2029) {
    assert.match(entry.key, /^fx_[a-z0-9_]{3,60}$/);
    assert.ok(entry.label && entry.group && entry.note);
    for (const cost of Object.values(RUNTIME_SWITCH_COSTS_2029[entry.key] || {})) {
      assert.ok(Number.isFinite(cost.n) && Number.isFinite(cost.kb) && Number.isFinite(cost.ms));
    }
  }
  assert.equal(new Set(RUNTIME_SWITCHES_2029.map((entry) => entry.key)).size, RUNTIME_SWITCHES_2029.length);
});

test("number research: switched-off journey/dossier lenses send no RPC and are reported as disabled_by_owner", async () => {
  globalThis.window = {};
  globalThis.__SOD_2029_BUILD__ = true;
  try {
    const { primeRuntimeSwitches } = await import("../src/lib/runtimeSwitches2029.js");
    const { researchNumber } = await import("../src/lib/research/numericResearchBase.js");
    const calls = [];
    const rpc = async (name) => { calls.push(name); return { data: name === "fn_number_lookup" ? [] : {}, error: null }; };
    const run = (lenses) => researchNumber(1820, { rpc, lenses });

    primeRuntimeSwitches({});
    calls.length = 0; await run(["number_lookup", "number_dossier", "number_journey"]);
    assert.deepEqual([...calls].sort(), ["fn_number_dossier", "fn_number_journey", "fn_number_lookup"]);

    primeRuntimeSwitches({ fx_number_journey: false });
    calls.length = 0; let result = await run(["number_lookup", "number_dossier", "number_journey"]);
    assert.deepEqual([...calls].sort(), ["fn_number_dossier", "fn_number_lookup"]);
    assert.equal(result.per_lens.number_journey.status, "disabled_by_owner");

    primeRuntimeSwitches({ fx_number_dossier: false, fx_number_journey: false });
    calls.length = 0; result = await run(["number_lookup", "number_dossier", "number_journey"]);
    assert.deepEqual(calls, ["fn_number_lookup"]);
    assert.equal(result.per_lens.number_dossier.status, "disabled_by_owner");
  } finally { delete globalThis.window; delete globalThis.__SOD_2029_BUILD__; }
});
