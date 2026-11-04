import test from "node:test";
import assert from "node:assert/strict";

import { runAiAnalyze } from "./helpers/ai-analyze-handler.mjs";

test("generic ai-analyze keeps its numeric provenance allowlist alive at runtime", async () => {
  const run = await runAiAnalyze({
    allowed: true,
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
