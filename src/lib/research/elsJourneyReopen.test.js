// Exact-reopen resolver tests — pure logic, no React, no network.
// Run with: node --test src/lib/research/elsJourneyReopen.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveElsJourneyReopen } from "./elsJourneyReopen.js";
import { makeUniversalFinding } from "./universalFinding.js";

const VALID_SNAPSHOT = {
  term: "משיח",
  normalizedTerm: "משיח",
  scope: "torah",
  axis: { hitId: "7_1_1234", skip: 7, dir: 1, direction: "fwd", start: 1234, length: 4 },
  occurrence: { index: 0, count: 3, capped: false },
  findings: [{ t: "נחש", color: "#e8c84a", shown: ["7_1_1234"] }],
  view: { mode: null, viewMode: null, matrixRtl: null, cellSize: null },
};

function elsFinding(overrides = {}) {
  return makeUniversalFinding({
    kind: "els",
    subject: { type: "phrase", key: "משיח", label: "משיח", lang: "he" },
    source: { engine: "els", adapter: "els-state-v1", corpus: "torah" },
    identity: { sourceIdentity: "7_1_1234", occurrence: { hitId: "7_1_1234", skip: 7, dir: 1, start: 1234 } },
    verification: { verification_state: "not_tested" },
    projection: { journeySnapshot: VALID_SNAPSHOT },
    ...overrides,
  });
}

test("no findingId -> status none, no lookup performed", () => {
  const r = resolveElsJourneyReopen(null, [elsFinding()]);
  assert.equal(r.status, "none");
  assert.equal(r.journeyLoad, null);
  assert.equal(r.finding, null);
});

test("findingId not present in findings -> not-found", () => {
  const r = resolveElsJourneyReopen("uf1:els:x:y", [elsFinding()]);
  assert.equal(r.status, "not-found");
  assert.equal(r.journeyLoad, null);
});

test("finding exists but is not an ELS kind -> not-els, no restore attempted", () => {
  const other = makeUniversalFinding({ kind: "gematria", subject: { type: "phrase", key: "a", label: "a" } });
  const r = resolveElsJourneyReopen(other.id, [other]);
  assert.equal(r.status, "not-els");
  assert.equal(r.journeyLoad, null);
  assert.equal(r.finding, other);
});

test("ELS finding with no journeySnapshot -> no-snapshot", () => {
  const f = elsFinding({ projection: {} });
  const r = resolveElsJourneyReopen(f.id, [f]);
  assert.equal(r.status, "no-snapshot");
  assert.equal(r.journeyLoad, null);
});

test("ELS finding with an invalid snapshot (missing axis.hitId) -> invalid-snapshot, never invents an anchor", () => {
  const f = elsFinding({ projection: { journeySnapshot: { term: "משיח", axis: {} } } });
  const r = resolveElsJourneyReopen(f.id, [f]);
  assert.equal(r.status, "invalid-snapshot");
  assert.equal(r.journeyLoad, null);
});

test("valid ELS finding -> exact engine-owned loadItem, same hitId round trip", () => {
  const f = elsFinding();
  const r = resolveElsJourneyReopen(f.id, [f]);
  assert.equal(r.status, "ok");
  assert.ok(r.journeyLoad);
  assert.equal(r.journeyLoad.hitId, "7_1_1234");
  assert.equal(r.journeyLoad.skip, 7);
  assert.equal(r.journeyLoad.dir, 1);
  assert.equal(r.journeyLoad.start, 1234);
  assert.equal(r.journeyLoad.term, "משיח");
  assert.equal(r.journeyLoad.journey, true);
});

test("lookup is exact-id, does not fall back to any other finding in the list", () => {
  const a = elsFinding();
  const b = elsFinding({ subject: { type: "phrase", key: "אחר", label: "אחר", lang: "he" } });
  const r = resolveElsJourneyReopen(b.id, [a, b]);
  assert.equal(r.finding, b);
});
