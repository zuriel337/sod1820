import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchScriptureDiscoveryForFindings,
  scriptureDiscoverySeedsFromFindings,
  SCRIPTURE_DISCOVERY_MAX_SEEDS,
} from "./scriptureDiscoveryProjection.js";

function finding({
  id,
  value,
  engineResult = value,
  state = "match",
  method = "רגיל",
  sourceRef = null,
  label = null,
} = {}) {
  return {
    id,
    subject: { key: id, value, label: label || id },
    source: { sourceRef },
    verification: {
      verification_state: state,
      engine_result: engineResult,
      engine_method_tested: method,
      claimed_expression: label || id,
    },
  };
}

test("scripture discovery seeds are fail-closed to explicit engine matches", () => {
  const seeds = scriptureDiscoverySeedsFromFindings([
    finding({ id: "ok", value: 776, sourceRef: "posts:1" }),
    finding({ id: "mismatch", value: 358, engineResult: 357, state: "mismatch" }),
    finding({ id: "not-tested", value: 424, state: "not_tested" }),
    finding({ id: "unknown", value: 1202, state: "method_unknown" }),
    finding({ id: "missing-result", value: 73, engineResult: null }),
    finding({ id: "contradiction", value: 123, engineResult: 124, state: "match" }),
  ]);

  assert.deepEqual(seeds.map((seed) => seed.value), [776]);
  assert.deepEqual(seeds[0].sourceFindingRefs, ["ok"]);
  assert.deepEqual(seeds[0].sourceRefs, ["posts:1"]);
});

test("equal verified values dedupe while preserving source provenance", () => {
  const seeds = scriptureDiscoverySeedsFromFindings([
    finding({ id: "a", value: 358, sourceRef: "posts:92", method: "רגיל", label: "משיח" }),
    finding({ id: "b", value: 358, sourceRef: "posts:1110", method: "רגיל", label: "משיח" }),
    finding({ id: "c", value: 358, sourceRef: "posts:904", method: "מסתתר", label: "בדיקה אחרת" }),
  ]);

  assert.equal(seeds.length, 1);
  assert.equal(seeds[0].value, 358);
  assert.deepEqual(seeds[0].sourceFindingRefs, ["a", "b", "c"]);
  assert.deepEqual(seeds[0].sourceRefs, ["posts:92", "posts:1110", "posts:904"]);
  assert.deepEqual(seeds[0].methods, ["רגיל", "מסתתר"]);
  assert.deepEqual(seeds[0].expressions, ["משיח", "בדיקה אחרת"]);
});

test("seed count is hard-bounded", () => {
  const rows = Array.from({ length: SCRIPTURE_DISCOVERY_MAX_SEEDS + 5 }, (_, i) =>
    finding({ id: `f-${i}`, value: 1000 + i }),
  );
  assert.equal(
    scriptureDiscoverySeedsFromFindings(rows, { maxSeeds: 999 }).length,
    SCRIPTURE_DISCOVERY_MAX_SEEDS,
  );
});

test("discovery uses the injected canonical reader and never promotes truth", async () => {
  const calls = [];
  const out = await fetchScriptureDiscoveryForFindings([
    finding({ id: "a", value: 776, sourceRef: "posts:1110", label: "ביאת המשיח" }),
    finding({ id: "b", value: 424, sourceRef: "posts:5028", label: "משיח בן דוד" }),
    finding({ id: "held", value: 1202, state: "not_tested" }),
  ], {
    verseLimit: 4,
    fetchVerses: async (value, { limit }) => {
      calls.push({ value, limit });
      return {
        value,
        count: 1,
        verses: [{ type: "verse", ref: `Test ${value}:1`, text: `verse ${value}`, value }],
      };
    },
  });

  assert.deepEqual(calls, [{ value: 776, limit: 4 }, { value: 424, limit: 4 }]);
  assert.equal(out.coverage.inputFindings, 3);
  assert.equal(out.coverage.eligibleSeeds, 2);
  assert.equal(out.coverage.candidateVerses, 2);
  assert.equal(out.candidates.every((item) => item.truthPromotion === false), true);
  assert.equal(out.governance.readOnly, true);
  assert.equal(out.governance.automaticCanonicalPromotion, false);
  assert.equal(out.governance.semanticProof, false);
});

test("reader failure remains explicit and does not manufacture candidates", async () => {
  const out = await fetchScriptureDiscoveryForFindings(
    [finding({ id: "a", value: 1202 })],
    { fetchVerses: async () => { throw new Error("offline"); } },
  );

  assert.equal(out.results[0].status, "unavailable");
  assert.equal(out.coverage.unavailableSeeds, 1);
  assert.equal(out.coverage.candidateVerses, 0);
  assert.deepEqual(out.candidates, []);
});
