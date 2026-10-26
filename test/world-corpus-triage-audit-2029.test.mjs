import test from "node:test";
import assert from "node:assert/strict";
import { WORLD_CORPUS_TRIAGE_AUDIT } from "../api/world-corpus-triage-audit.js";

test("manager corpus audit keeps publication, verification and catalog completeness separate", () => {
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.scope, "read_only_recommendations");
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.workstreams.length, 7);

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
  for (const stream of WORLD_CORPUS_TRIAGE_AUDIT.workstreams) {
    assert.match(stream.route, /^\/world(?:\?|$)/u);
  }
});
