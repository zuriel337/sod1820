import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migration = readFileSync(
  resolve(ROOT, "supabase/migrations/20260915224500_g3_openai_agents_gpt_wake_v1.sql"),
  "utf8",
);

assert.doesNotMatch(migration, /\bcreate\s+table\b/i, "GPT wake must not create a parallel queue/store");
assert.match(migration, /OPENAI_API_KEY/, "GPT wake credential must come from existing Vault");
assert.match(migration, /https:\/\/api\.openai\.com\/v1\/agents\/sessions/, "GPT wake must use OpenAI Agents API");
assert.match(migration, /OpenAI-Beta['"],['"]agents=v1/i, "Agents API beta header must be explicit");
assert.match(migration, /agent_dispatch_emit_gpt/, "GPT event emitter must exist");
assert.match(migration, /agent_dispatch_reconcile_gpt_wake/, "GPT wake response reconciler must exist");
assert.match(migration, /agent_dispatch_recover_gpt_wakes/, "bounded completion recovery must exist");
assert.match(migration, /to_actor\s*<>\s*'GPT'|to_actor='GPT'/i, "transport must be GPT-target bounded");
assert.match(migration, /dispatch_kind\s*<>\s*'RESULT_WAKE'|dispatch_kind='RESULT_WAKE'/i, "transport must be RESULT_WAKE bounded");
assert.match(migration, /assignment_mode,'READ_ONLY'/i, "transport must be READ_ONLY bounded");
assert.match(migration, /environment[^\n]*'type','none'/i, "v1 GPT wake must expose no sandbox/project tools");
assert.match(migration, /\/items\?limit=20&order=desc/, "completed agent output must be read from session items");
assert.match(migration, /GPT_WAKE_COMPLETED_OPENAI_AGENTS_API/, "completion must leave explicit provenance");
assert.match(migration, /WAKE ACK/, "completion must create one non-dispatch wake acknowledgement");
assert.match(migration, /trg_work_log_dispatch_00_gpt_event/, "GPT trigger must run before existing generic event trigger");
assert.doesNotMatch(migration, /\b(?:perform|select)\s+(?:public\.)?agent_dispatch_finish\s*\(/i, "GPT RESULT_WAKE completion must not execute reverse RESULT_WAKE finish/ping-pong");
assert.doesNotMatch(migration, /\/v1\/responses|\/v1\/chat\/completions/i, "plain model APIs are not an agent-wake fallback");
assert.doesNotMatch(migration, /merge_pull_request|git push|functions\.v1\/deploy/i, "wake transport must not automate release");

console.log("GPT OpenAI Agents API result-wake architecture contract: PASS");
