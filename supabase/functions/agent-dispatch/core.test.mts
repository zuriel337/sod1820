import assert from "node:assert/strict";
import {
  boundedGithubPaths,
  buildSpecialistPrompt,
  extractAnthropicText,
  parseSpecialistResult,
  statusForVerdict,
  type SpecialistContext,
} from "./core.ts";

assert.deepEqual(
  boundedGithubPaths({ github_paths: [
    "src/App.jsx",
    "./SOD1820_MASTER_OWNER_INDEX.md",
    "../secret",
    "/etc/passwd",
    "src\\bad.js",
    "supabase/functions/agent-upload/index.ts",
  ]}),
  ["src/App.jsx", "SOD1820_MASTER_OWNER_INDEX.md", "supabase/functions/agent-upload/index.ts"],
  "github path list must be bounded and traversal-safe",
);

const parsed = parseSpecialistResult(JSON.stringify({
  verdict: "MINIMAL_FIXES",
  summary: "One bounded correction changes release confidence.",
  evidence: ["owner v11 says no parallel queue"],
  blockers: [],
  minimal_fixes: ["keep work_log authoritative"],
  open_threads: ["replay race test"],
  recommended_next: "patch then replay",
}));
assert.equal(parsed.verdict, "MINIMAL_FIXES");
assert.equal(statusForVerdict(parsed), "AFTER_READ_ONLY_SPECIALIST_MINIMAL_FIXES");

const invalid = parseSpecialistResult("not json");
assert.equal(invalid.verdict, "BLOCKED_NEEDS_MORE_CONTEXT");
assert.match(invalid.blockers[0], /invalid_specialist_output_contract/);

const ctx: SpecialistContext = {
  canonicalSupabase: "linswmnnkjxvweumprav",
  mainSha: "a".repeat(40),
  assignment: {
    id: "11111111-1111-4111-8111-111111111111",
    task_key: "TEST_TASK_V1",
    from_actor: "GPT",
    to_actor: "CLAUDE",
    assignment_mode: "READ_ONLY",
    assignment_scope: "test-scope",
    primary_owner: "inter_agent_coordination_law v11",
    release_authorization_state: "NOT_AUTHORIZED",
    dispatch_context: { objective: "challenge concurrency", do_not_touch: ["no writes"] },
  },
  owner: {
    identifier: "inter_agent_coordination_law v11",
    source: "rule",
    body: "work_log remains Coordination Ledger; no parallel queue authority",
    dependencies: [{ identifier: "live_state_resolution_law v2", body: "live-first" }],
  },
  workLog: [],
  files: [],
};
const prompt = buildSpecialistPrompt(ctx);
assert.match(prompt.system, /READ_ONLY/);
assert.match(prompt.system, /not a Source of Truth/i);
assert.match(prompt.system, /Never propose a parallel Agent System/i);
assert.match(prompt.user, /RELEASE_AUTHORIZATION=NOT_AUTHORIZED/);
assert.match(prompt.user, /PRIMARY_OWNER=inter_agent_coordination_law v11/);

assert.equal(
  extractAnthropicText({ content: [{ type: "text", text: "a" }, { type: "tool_use" }, { type: "text", text: "b" }] }),
  "a\nb",
);

console.log("agent-dispatch core contract: PASS");
