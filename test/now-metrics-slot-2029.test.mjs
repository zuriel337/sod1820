import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { NOT_MEASURED_LABEL, metricDisplay, metricsPanelOf } from "../src/lib/nowMetricsSlot2029.js";

test("a missing metric is 'לא נמדד', never zero; only a real number prints as a number", () => {
  assert.equal(NOT_MEASURED_LABEL, "לא נמדד");
  for (const missing of [null, undefined, NaN, Infinity, "", "0", "12", {}, []]) assert.equal(metricDisplay(missing), "לא נמדד", String(missing));
  assert.equal(metricDisplay(0), "0", "a measured zero is still a real zero");
  assert.equal(metricDisplay(42), "42");
});

test("the slot stays closed without a provider component", () => {
  for (const provider of [null, undefined, {}, { Panel: null }, { Panel: "div" }, { Panel: {} }]) assert.equal(metricsPanelOf(provider), null);
  const Panel = () => null;
  assert.equal(metricsPanelOf({ Panel }), Panel);
});

test("the slot adds no data, fetch, storage, timer, AI call or field names (static contract check)", () => {
  for (const file of ["src/lib/nowMetricsSlot2029.js", "src/components/experience2029/NowMetricsSlot2029.jsx", "src/components/experience2029/nowMetricsContext2029.js"]) {
    const code = fs.readFileSync(file, "utf8").replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(code, /fetch\(|supabase|localStorage|sessionStorage|setInterval|setTimeout|XMLHttpRequest|raziel|anthropic/i, file);
  }
});
