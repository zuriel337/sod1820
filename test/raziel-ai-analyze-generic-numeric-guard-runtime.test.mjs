import test from "node:test";
import assert from "node:assert/strict";

import { runAiAnalyze, UID, USER_JWT } from "./helpers/ai-analyze-handler.mjs";

test("generic ai-analyze keeps its numeric provenance allowlist alive at runtime", async () => {
  // M0-B (ZURIEL 12.11.2026): the generic paid analysis runs only for a verified signed-in user.
  const run = await runAiAnalyze({
    allowed: true, bearer: USER_JWT, verifiedUid: UID,
    genericProviderText: "המספר שנבדק הוא 776.",
    body: {
      persona: "",
      kind: "number",
      subject: "776",
      facts: "",
      fast: true,
    },
  });

  assert.equal(run.status, 200);
  assert.equal(run.result.error, undefined);
  assert.equal(run.result.analysis, "המספר שנבדק הוא 776.");
});
