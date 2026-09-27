import test from "node:test";
import assert from "node:assert/strict";
import {
  createCrossSignatureW2Executor,
  CROSS_SIGNATURE_ADAPTER_VERSION,
} from "./crossSignatureW2Executor.js";
import { EVIDENCE_RELATION } from "./researchResultBundle.js";

function fakeSupabase({ strength = null, lookup = [] } = {}) {
  return {
    from(name) {
      assert.equal(name, "cross_method_strength");
      return {
        select(fields) {
          assert.match(fields, /independent_p1_method_count/);
          return {
            eq(column, value) {
              assert.equal(column, "value");
              return {
                async maybeSingle() {
                  if (strength && Number(strength.value) === Number(value)) return { data: strength, error: null };
                  return { data: null, error: null };
                },
              };
            },
          };
        },
      };
    },
    async rpc(name, args) {
      assert.equal(name, "fn_number_lookup");
      assert.equal(args.p_after_bid_id, null);
      return { data: lookup.slice(0, args.p_limit), error: null };
    },
  };
}

const numberIdentity = (value) => ({
  identities: [{ type: "number", value, key: String(value), label: String(value), ref: String(value) }],
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

test("Cross Signature adapter projects canonical dependency-normalized counts without recomputing independence", async () => {
  const executor = createCrossSignatureW2Executor({
    supabase: fakeSupabase({
      strength: STRENGTH_313,
      lookup: [
        { phrase: "בושה", method: "רגיל", value: 313, bid_id: "b1", word_id: "w1", method_version: 1, total_count: 138 },
        { phrase: "המוריה", method: "אתבש", value: 313, bid_id: "b2", word_id: "w2", method_version: 1, total_count: 138 },
      ],
    }),
    sampleLimit: 24,
  });
  const out = await executor({ identityResolution: numberIdentity(313) });

  assert.equal(out.status, "executed");
  assert.equal(out.semanticClass, "derivation");
  assert.equal(out.findingOutcomes[0].evidenceRelation, EVIDENCE_RELATION.CONVERGENCE);
  assert.equal(out.findings.length, 1);
  const finding = out.findings[0];
  const sig = finding.projection.dimensions.cross_signature;
  assert.equal(finding.kind, "cross-signature");
  assert.equal(finding.source.adapter, CROSS_SIGNATURE_ADAPTER_VERSION);
  assert.equal(sig.independent_p1_method_count, 6);
  assert.equal(sig.p1_hits, 9);
  assert.deepEqual(sig.dependent_methods, ["גדול", "רגיל+משולש"]);
  assert.equal(sig.sample_rows.length, 2);
  assert.equal(sig.sample_window.total_count, 138);
  assert.equal(sig.sample_window.truncated, true);
  assert.match(sig.truth_boundary, /never Truth/i);
  assert.match(out.findingOutcomes[0].reason, /never independent corroboration/i);
});

test("Cross Signature keeps dependent/unregistered controls visible instead of deleting or promoting them", async () => {
  const executor = createCrossSignatureW2Executor({
    supabase: fakeSupabase({
      strength: {
        ...STRENGTH_313,
        dependent_methods: ["גדול", "רגיל+משולש"],
        unregistered_methods: ["שיטה-ישנה"],
      },
    }),
  });
  const out = await executor({ identityResolution: numberIdentity(313) });
  const sig = out.findings[0].projection.dimensions.cross_signature;

  assert.deepEqual(sig.dependent_methods, ["גדול", "רגיל+משולש"]);
  assert.deepEqual(sig.unregistered_methods, ["שיטה-ישנה"]);
  assert.equal(out.trace.dependent_method_count, 2);
  assert.equal(out.trace.unregistered_method_count, 1);
});

test("missing cross_method_strength row is an explicit negative result, not fabricated zero strength", async () => {
  const executor = createCrossSignatureW2Executor({ supabase: fakeSupabase() });
  const out = await executor({ identityResolution: numberIdentity(999999) });

  assert.equal(out.status, "negative_result");
  assert.deepEqual(out.findings, []);
  assert.equal(out.negativeScope.value, 999999);
  assert.match(out.reason, /no row/i);
});

test("non-number semantic identity is refused even if its label looks numeric", async () => {
  const executor = createCrossSignatureW2Executor({ supabase: fakeSupabase({ strength: STRENGTH_313 }) });
  const out = await executor({
    identityResolution: { identities: [{ type: "book", label: "313", key: "book:313" }] },
  });
  assert.equal(out.status, "skipped");
  assert.deepEqual(out.findings, []);
});

test("lookup sampling failure never fabricates source-exhaustive examples and does not destroy canonical strength", async () => {
  const supabase = fakeSupabase({ strength: STRENGTH_313 });
  supabase.rpc = async () => ({ data: null, error: { name: "LookupUnavailable" } });
  const executor = createCrossSignatureW2Executor({ supabase });
  const out = await executor({ identityResolution: numberIdentity(313) });

  assert.equal(out.status, "executed");
  assert.equal(out.findings[0].projection.dimensions.cross_signature.sample_rows.length, 0);
  assert.equal(out.findings[0].projection.dimensions.cross_signature.independent_p1_method_count, 6);
  assert.equal(out.trace.lookup_error, "LookupUnavailable");
});
