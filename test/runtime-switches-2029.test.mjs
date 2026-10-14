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
