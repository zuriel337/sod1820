import test from "node:test";
import assert from "node:assert/strict";
import { makeUniversalFinding } from "./universalFinding.js";
import { commitUniversalFinding, commitUniversalFindings } from "./universalWorkspaceCommit.js";

function finding(id) {
  return makeUniversalFinding({
    id,
    kind: "test",
    subject: { type: "entity", key: id, label: id },
    source: { sourceRef: `source:${id}` },
    identity: { sourceIdentity: `source:${id}` },
  });
}

test("Workspace commit reports the ResearchProvider result instead of optimistic success", () => {
  const item = finding("uf:commit:one");
  let received = null;
  assert.equal(commitUniversalFinding((entity) => { received = entity; return true; }, item), true);
  assert.equal(received.id, item.id);
  assert.equal(received.finding, item);
  assert.equal(commitUniversalFinding(() => false, item), false);
  assert.equal(commitUniversalFinding(() => undefined, item), false);
  assert.equal(commitUniversalFinding(null, item), false);
  assert.equal(commitUniversalFinding(() => true, null), false);
  assert.equal(commitUniversalFinding(() => true, { id: "not-a-universal-finding" }), false);
});

test("Workspace batch count includes only successful Provider commits", () => {
  const items = [finding("uf:commit:a"), finding("uf:commit:b"), finding("uf:commit:c")];
  const committed = commitUniversalFindings(
    (entity) => entity.id !== "uf:commit:b",
    [...items, null]
  );
  assert.equal(committed, 2);
});
