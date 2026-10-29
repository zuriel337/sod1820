import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizeElsMatrixReadingResult } from "../supabase/functions/_shared/elsMatrixReadingAction.js";
import { verifyJobToken } from "../supabase/functions/_shared/elsMatrixReading.js";

test("the actual signed fixture token survives the session boundary byte for byte", async () => {
  const { response } = JSON.parse(readFileSync(new URL("./fixtures/els-matrix-reading/card-examples/running-start.json", import.meta.url)));
  assert.ok(response.job.token.length > 700, "exercise a real token longer than the generic text bound");
  const kept = normalizeElsMatrixReadingResult({ ...response, poll_interrupted: { why: "network", can_resume: true } });
  assert.equal(kept.job.token, response.job.token);
  assert.deepEqual(kept.poll_interrupted, { why: "network", can_resume: true });
  assert.deepEqual(await verifyJobToken(kept.job.token, "wrong-key"), { ok: false, error: "invalid_job_token" });
  for (const token of ["short", "a".repeat(6001), response.job.token + "!"]) {
    assert.equal(normalizeElsMatrixReadingResult({ ...response, job: { token } }).job.token, undefined);
  }
});
