import test from "node:test";
import assert from "node:assert/strict";

import {
  PERSONAL_PAIR_PREVIEW_EXPRESSIONS,
  runPersonalGematriaPairPreviewFixture,
} from "./personalGematriaPairPreviewFixture.js";

test("hosted visual fixture is exact-sample-only, non-live and non-persistable", async () => {
  const rejected = await runPersonalGematriaPairPreviewFixture({ left: "משיח", right: "מלך" });
  assert.deepEqual(rejected, { ok: false, outcome: "error", error: "preview_fixture_only", networkCalls: 0 });

  const shown = await runPersonalGematriaPairPreviewFixture({
    left: PERSONAL_PAIR_PREVIEW_EXPRESSIONS[0],
    right: PERSONAL_PAIR_PREVIEW_EXPRESSIONS[1],
  });
  assert.equal(shown.ok, true);
  assert.equal(shown.previewFixture, true);
  assert.equal(shown.networkCalls, 0);
  assert.equal(shown.traceId, null);
  assert.equal(shown.cost.rpc_calls, 0);
  assert.equal(shown.cost.ai_calls, 0);
  assert.equal(shown.bundle.findings[0].access.tier, "personal");
  assert.equal(shown.bundle.findings[0].provenance.createdBy, "PREVIEW_FIXTURE");
});
