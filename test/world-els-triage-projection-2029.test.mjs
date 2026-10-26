import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchWorldElsTriageProjection,
  projectWorldElsTriageRows,
} from "../src/lib/research/worldElsTriageProjection.js";

const complete = {
  id: "a", slug: "a", title: "א", search_term: "אור", term_norm: "אור", scope: "torah",
  skip_distance: 18, direction: "fwd", start_index: 10, corpus_id: "torah-v1",
  status: "published", visibility: "public", source: "community", created_at: "2026-10-26T10:00:00Z",
};

test("ELS triage separates identity, engine envelope, replay evidence and publication", () => {
  const projection = projectWorldElsTriageRows([
    complete,
    { ...complete, id: "b", slug: "b", engine_detail: { ranking: { quality: { verified: false } } } },
    { ...complete, id: "c", slug: "c", engine_detail: { golden_scan_v1: { axis: { verification_state: "MATCH" } } } },
    { ...complete, id: "d", slug: "d", start_index: null, status: "draft", visibility: "unlisted" },
  ]);

  assert.deepEqual(projection.rows.map((row) => row.state), [
    "identity_incomplete",
    "missing_engine_envelope",
    "envelope_not_verified",
    "replay_evidence_available",
  ]);
  assert.equal(projection.counts.publicPublished, 3);
  assert.equal(projection.counts.outsidePublicReader, 1);
  assert.equal(projection.counts.missingEngineEnvelope, 2);
  assert.equal(projection.counts.replayEvidenceAvailable, 1);
  assert.equal(projection.rules.replayEvidenceIsNotTruth, true);
});

test("ELS triage detects only complete canonical identity duplicates and keeps every row", () => {
  const projection = projectWorldElsTriageRows([
    complete,
    { ...complete, id: "b", slug: "b" },
    { ...complete, id: "c", slug: "c", start_index: null },
  ]);
  assert.equal(projection.rows.length, 3);
  assert.deepEqual(projection.duplicateGroups, [["a", "b"]]);
  assert.equal(projection.counts.duplicateIdentityRows, 1);
});

test("ELS manager projection paginates one existing reader without N+1", async () => {
  const calls = [];
  const pages = [
    { rows: [complete], more: true },
    { rows: [{ ...complete, id: "b", slug: "b" }], more: false },
  ];
  const projection = await fetchWorldElsTriageProjection({
    pageSize: 48,
    reader: async (input) => { calls.push(input); return pages.shift(); },
  });
  assert.deepEqual(calls, [
    { view: "review", offset: 0, pageSize: 48 },
    { view: "review", offset: 48, pageSize: 48 },
  ]);
  assert.equal(projection.rows.length, 2);
});
