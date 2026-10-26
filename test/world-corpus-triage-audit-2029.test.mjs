import test from "node:test";
import assert from "node:assert/strict";
import { WORLD_CORPUS_TRIAGE_AUDIT } from "../api/world-corpus-triage-audit.js";

test("manager corpus audit keeps publication, verification and catalog completeness separate", () => {
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.scope, "read_only_recommendations");
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.workstreams.length, 7);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.length, 22);
  assert.deepEqual(["medium", "weak"].map((key) => WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === key).total), [4164, 6362]);
  assert.match(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "duplicates").next, /בלי מחיקה/u);
  const zviReplay = WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_legacy_replay");
  assert.equal(zviReplay.total, 2299);
  assert.match(zviReplay.route, /verification=legacy_signal/u);
  assert.match(zviReplay.state, /2,468 הופעות/u);
  const deterministicReplay = WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_regular_replay_match");
  assert.equal(deterministicReplay.total, 227);
  assert.match(deterministicReplay.state, /232\/232/u);
  const arithmeticReplay = WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_arithmetic_replay");
  assert.equal(arithmeticReplay.total, 22);
  assert.match(arithmeticReplay.route, /replay=arithmetic_match/u);
  const compoundReplay = WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_compound_replay");
  assert.equal(compoundReplay.total, 33);
  assert.match(compoundReplay.route, /replay=compound_match/u);
  const unresolvedReplay = WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_compound_unresolved");
  assert.equal(unresolvedReplay.total, 1);
  assert.match(unresolvedReplay.route, /replay=compound_method_unresolved/u);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_explicit_match").total, 136);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_explicit_numeric_match").total, 4);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_explicit_review").total, 20);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_explicit_conflict").total, 2);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_legacy_matrix_match").total, 2179);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_legacy_matrix_claim_unmatched").total, 393);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_legacy_incomplete_method").total, 1);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_legacy_source_metadata").total, 3);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_missing_engine_unverified").total, 493);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_missing_engine_assessment").total, 2130);

  const els = WORLD_CORPUS_TRIAGE_AUDIT.workstreams.find((row) => row.key === "els");
  assert.equal(els.total, 135);
  assert.deepEqual(els.counts.slice(0, 4).map((item) => item.value), [112, 104, 8, 23]);
  assert.deepEqual(els.counts.slice(-3).map((item) => item.value), [15, 2, 0]);
  assert.match(els.next, /פרסום קיים אינו תחליף לאימות/u);

  const gematria = WORLD_CORPUS_TRIAGE_AUDIT.workstreams.find((row) => row.key === "gematria");
  assert.equal(gematria.counts.find((item) => item.label === "טרם אומתו").value, 2894);
  assert.match(gematria.state, /נפרדים/u);
});

test("audit routes only to existing canonical World views", () => {
  for (const stream of [...WORLD_CORPUS_TRIAGE_AUDIT.workstreams, ...WORLD_CORPUS_TRIAGE_AUDIT.findingBatches]) {
    assert.match(stream.route, /^\/world(?:\?|$)/u);
  }
  const zvi = WORLD_CORPUS_TRIAGE_AUDIT.workstreams.find((row) => row.key === "zvi_findings");
  assert.match(zvi.route, /contributorId=c66f0464-0928-490e-be9b-66d8a87e7fc8/u);
});
