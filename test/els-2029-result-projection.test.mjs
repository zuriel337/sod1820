import test from "node:test";
import assert from "node:assert/strict";
import { projectEls2029Result } from "../src/lib/research/els2029Projection.js";

test("search result projection preserves canonical occurrence identity and coordinates", () => {
  const out = projectEls2029Result({
    contract: "els_regular_search_result_v1",
    status: "OK",
    corpus_id: "torah-v1",
    input: { normalized: "משיח" },
    selection_protocol: "HYPOTHESIS_DRIVEN_FOLLOWUP",
    search: {
      ordering: "skip,start,forward-before-back-on-exact-tie",
      sampling: {
        policy: "ordered_prefix_v1",
        representative: false,
        bias: "shorter_skip_then_earlier_corpus_position",
      },
    },
    completion: {
      executed: true,
      total_hits: 12,
      returned_hits: 2,
      truncated: true,
      continuation: { kind: "els_keyset_v1" },
    },
    hits: [{
      occurrence_id: "els:torah-v1:משיח:17:1:100",
      skip: 17,
      dir: 1,
      start: 100,
      end: 151,
      positions: [100,117,134,151],
      dependency_group: "els:torah-v1:משיח",
    }],
  }, { selectedOccurrenceId: "els:torah-v1:משיח:17:1:100" });

  assert.equal(out.contract, "els_2029_projection_v1");
  assert.equal(out.occurrences[0].occurrenceId, "els:torah-v1:משיח:17:1:100");
  assert.equal(out.occurrences[0].direction, "fwd");
  assert.equal(out.occurrences[0].spatialReady, true);
  assert.equal(out.selectedOccurrence.occurrenceId, out.occurrences[0].occurrenceId);
  assert.equal(out.completion.totalHits, 12);
  assert.equal(out.completion.truncated, true);
});

test("sampling is presentation metadata and never mutates occurrence truth", () => {
  const out = projectEls2029Result({
    contract: "els_search_result_v1",
    status: "OK",
    corpus_id: "torah-v1",
    input: { normalized: "אלהים" },
    search: { sampling: { policy: "ordered_prefix_v1", representative: false, bias: "shorter_skip_then_earlier_corpus_position" } },
    completion: { executed: true, total_hits: 4000, returned_hits: 1000, truncated: true },
    hits: [{ skip: 7, dir: -1, start: 200, positions: [200,193,186,179,172] }],
  });

  assert.equal(out.presentation.policy, "ordered_prefix_v1");
  assert.equal(out.presentation.representative, false);
  assert.equal(out.occurrences.length, 1);
  assert.equal(out.projectionOnly, true);
});

test("exact replay projects only a canonical MATCH occurrence", () => {
  const match = projectEls2029Result({
    contract: "els_occurrence_replay_v1",
    status: "OK",
    verification_state: "MATCH",
    corpus_id: "torah-v1",
    input: { normalized: "דוד" },
    occurrence: { occurrence_id: "els:torah-v1:דוד:9:1:50", skip: 9, dir: 1, start: 50, positions: [50,59,68] },
  });
  const mismatch = projectEls2029Result({
    contract: "els_occurrence_replay_v1",
    status: "REPLAY_MISMATCH",
    verification_state: "MISMATCH",
    corpus_id: "torah-v1",
    input: { normalized: "דוד" },
  });

  assert.equal(match.selectedOccurrence.occurrenceId, "els:torah-v1:דוד:9:1:50");
  assert.equal(match.presentation.policy, "exact_replay_v1");
  assert.equal(mismatch.selectedOccurrence, null);
  assert.equal(mismatch.occurrences.length, 0);
});

test("unsupported input fails closed and projection never creates glyph truth", () => {
  const out = projectEls2029Result({ contract: "unknown" });
  assert.equal(out.status, "UNSUPPORTED_CONTRACT");
  assert.equal(out.occurrences.length, 0);
  assert.equal("glyphs" in out, false);
});

console.log("ELS 2029 result projection: PASS");
