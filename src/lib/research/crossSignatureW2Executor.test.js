import test from "node:test";
import assert from "node:assert/strict";
import {
  createCrossSignatureW2Executor,
  CROSS_SIGNATURE_ADAPTER_VERSION,
} from "./crossSignatureW2Executor.js";
import { ACCESS_CLASS, CAPABILITY_STATUS, EVIDENCE_RELATION } from "./researchResultBundle.js";

function fakeSupabase({ lookup = [] } = {}) {
  return {
    async rpc(name, args) {
      assert.equal(name, "fn_number_lookup");
      assert.equal(args.p_after_bid_id, null);
      return { data: lookup.slice(0, args.p_limit), error: null };
    },
  };
}

const numberIdentity = (value, accessTier = null) => ({
  identities: [{
    type: "number",
    value,
    key: String(value),
    label: String(value),
    ref: String(value),
    ...(accessTier ? { access: { tier: accessTier } } : {}),
  }],
});

const STRENGTH_313 = {
  value: 313,
  phrase_count: 72,
  independent_phrase_count: 60,
  dependent_expression_phrase_count: 12,
  p1_hits: 9,
  independent_p1_method_count: 6,
  methods: ["רגיל", "מילוי", "מסתתר", "קדמי", "אתבש", "אלבם"],
  in_ragil: true,
  in_misratar: true,
  in_kadmi: true,
  signal: "CORE_AXIS_CANDIDATE",
  dependent_methods: ["גדול", "רגיל+משולש"],
  dependent_phrase_count: 8,
  unregistered_methods: [],
};

const governedReader = (row, {
  status = row ? "ok" : "not_found",
  accessTier = "public",
  includeTier = true,
} = {}) => async () => ({
  status,
  row,
  ...(includeTier ? { accessTier } : {}),
  sourceRef: "governed-reader:cross_method_strength",
  versionRef: "cross_method_strength:test-v1",
});

test("Cross Signature adapter projects canonical dependency-normalized counts without recomputing independence", async () => {
  const executor = createCrossSignatureW2Executor({
    supabase: fakeSupabase({
      lookup: [
        { phrase: "בושה", method: "רגיל", value: 313, bid_id: "b1", word_id: "w1", method_version: 1, total_count: 138 },
        { phrase: "המוריה", method: "אתבש", value: 313, bid_id: "b2", word_id: "w2", method_version: 1, total_count: 138 },
      ],
    }),
    fetchCrossMethodStrength: governedReader(STRENGTH_313),
    sampleLimit: 24,
  });
  const out = await executor({ identityResolution: numberIdentity(313) });

  assert.equal(out.status, CAPABILITY_STATUS.EXECUTED);
  assert.equal(out.semanticClass, "derivation");
  assert.equal(out.accessClass, ACCESS_CLASS.PUBLIC_SOURCE);
  assert.equal(out.findingOutcomes[0].evidenceRelation, EVIDENCE_RELATION.CONVERGENCE);
  assert.equal(out.findings.length, 1);

  const finding = out.findings[0];
  const sig = finding.projection.dimensions.cross_signature;
  assert.equal(finding.kind, "cross-signature");
  assert.equal(finding.source.adapter, CROSS_SIGNATURE_ADAPTER_VERSION);
  assert.equal(finding.access.tier, "public");
  assert.equal(sig.independent_p1_method_count, 6);
  assert.equal(sig.p1_hits, 9);
  assert.deepEqual(sig.dependent_methods, ["גדול", "רגיל+משולש"]);
  assert.equal(sig.sample_rows.length, 2);
  assert.equal(sig.sample_window.total_count, 138);
  assert.equal(sig.sample_window.truncated, true);
  assert.match(sig.truth_boundary, /never Truth/i);
  assert.match(out.findingOutcomes[0].reason, /independent corroboration/i);
});

test("Cross Signature keeps dependent/unregistered controls visible instead of deleting or promoting them", async () => {
  const executor = createCrossSignatureW2Executor({
    supabase: fakeSupabase(),
    fetchCrossMethodStrength: governedReader({
      ...STRENGTH_313,
      dependent_methods: ["גדול", "רגיל+משולש"],
      unregistered_methods: ["שיטה-ישנה"],
    }),
  });
  const out = await executor({ identityResolution: numberIdentity(313) });
  const sig = out.findings[0].projection.dimensions.cross_signature;

  assert.deepEqual(sig.dependent_methods, ["גדול", "רגיל+משולש"]);
  assert.deepEqual(sig.unregistered_methods, ["שיטה-ישנה"]);
  assert.equal(out.trace.dependent_method_count, 2);
  assert.equal(out.trace.unregistered_method_count, 1);
});

test("missing governed row is explicit negative result, not fabricated zero strength", async () => {
  const executor = createCrossSignatureW2Executor({
    supabase: fakeSupabase(),
    fetchCrossMethodStrength: governedReader(null),
  });
  const out = await executor({ identityResolution: numberIdentity(999999) });

  assert.equal(out.status, CAPABILITY_STATUS.NEGATIVE_RESULT);
  assert.deepEqual(out.findings, []);
  assert.equal(out.negativeScope.value, 999999);
  assert.match(out.reason, /found no row/i);
});

test("without governed reader Cross stays missing_adapter and never attempts a direct browser view read", async () => {
  let rpcCalls = 0;
  const executor = createCrossSignatureW2Executor({
    supabase: { rpc: async () => { rpcCalls += 1; return { data: [] }; } },
  });
  const out = await executor({ identityResolution: numberIdentity(313) });

  assert.equal(out.status, CAPABILITY_STATUS.MISSING_ADAPTER);
  assert.equal(out.accessClass, ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED);
  assert.equal(rpcCalls, 0);
  assert.match(out.reason, /injected governed reader/i);
});

test("reader result without explicit accessTier fails closed", async () => {
  const executor = createCrossSignatureW2Executor({
    supabase: fakeSupabase(),
    fetchCrossMethodStrength: governedReader(STRENGTH_313, { includeTier: false }),
  });
  const out = await executor({ identityResolution: numberIdentity(313) });

  assert.equal(out.status, CAPABILITY_STATUS.CONTEXT_REQUIRED);
  assert.deepEqual(out.findings, []);
  assert.match(out.reason, /explicit status \+ accessTier/);
});

test("access-controlled Cross result remains source_access_controlled and carries its tier", async () => {
  const executor = createCrossSignatureW2Executor({
    supabase: fakeSupabase(),
    fetchCrossMethodStrength: governedReader(STRENGTH_313, { accessTier: "public_candidate" }),
  });
  const out = await executor({ identityResolution: numberIdentity(313) });

  assert.equal(out.status, CAPABILITY_STATUS.EXECUTED);
  assert.equal(out.accessClass, ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED);
  assert.equal(out.findings[0].access.tier, "public_candidate");
  assert.equal(out.trace.restricted_payload_redacted, true);
  assert.equal(JSON.stringify(out.trace).includes("independent_p1_method_count"), false);
  assert.equal(JSON.stringify(out.trace).includes('"60"'), false);
});

test("restricted number identity is refused before reader/lookup and raw value does not enter trace", async () => {
  let readerCalls = 0;
  let rpcCalls = 0;
  const executor = createCrossSignatureW2Executor({
    supabase: { rpc: async () => { rpcCalls += 1; return { data: [] }; } },
    fetchCrossMethodStrength: async () => { readerCalls += 1; return null; },
  });
  const out = await executor({ identityResolution: numberIdentity(313, "personal") });

  assert.equal(out.status, CAPABILITY_STATUS.CONTEXT_REQUIRED);
  assert.equal(readerCalls, 0);
  assert.equal(rpcCalls, 0);
  assert.equal(JSON.stringify(out.trace).includes("313"), false);
  assert.equal(out.trace.restricted_input, true);
});

test("non-number semantic identity is refused even if its label looks numeric", async () => {
  let readerCalls = 0;
  const executor = createCrossSignatureW2Executor({
    supabase: fakeSupabase(),
    fetchCrossMethodStrength: async () => { readerCalls += 1; return governedReader(STRENGTH_313)(); },
  });
  const out = await executor({
    identityResolution: { identities: [{ type: "book", label: "313", key: "book:313" }] },
  });

  assert.equal(out.status, CAPABILITY_STATUS.SKIPPED);
  assert.deepEqual(out.findings, []);
  assert.equal(readerCalls, 0);
});

test("lookup sampling failure never fabricates source-exhaustive examples and does not destroy governed strength", async () => {
  const supabase = {
    rpc: async () => ({ data: null, error: { name: "LookupUnavailable" } }),
  };
  const executor = createCrossSignatureW2Executor({
    supabase,
    fetchCrossMethodStrength: governedReader(STRENGTH_313),
  });
  const out = await executor({ identityResolution: numberIdentity(313) });

  assert.equal(out.status, CAPABILITY_STATUS.EXECUTED);
  assert.equal(out.findings[0].projection.dimensions.cross_signature.sample_rows.length, 0);
  assert.equal(out.findings[0].projection.dimensions.cross_signature.independent_p1_method_count, 6);
  assert.equal(out.trace.lookup_error, "LookupUnavailable");
});

test("governed reader denied is context_required, never a negative research result", async () => {
  const executor = createCrossSignatureW2Executor({
    supabase: fakeSupabase(),
    fetchCrossMethodStrength: governedReader(null, { status: "denied", accessTier: "private" }),
  });
  const out = await executor({ identityResolution: numberIdentity(313) });

  assert.equal(out.status, CAPABILITY_STATUS.CONTEXT_REQUIRED);
  assert.equal(out.coverage, undefined);
  assert.deepEqual(out.findings, []);
});
