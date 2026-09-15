import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baseMigration = readFileSync(
  resolve(ROOT, "supabase/migrations/20260915165000_g3_inter_agent_event_dispatch_runtime_v1.sql"),
  "utf8",
);
const routineMigration = readFileSync(
  resolve(ROOT, "supabase/migrations/20260915165100_g3_claude_code_routine_transport_v2.sql"),
  "utf8",
);
const combined = `${baseMigration}\n${routineMigration}`;

assert.doesNotMatch(combined, /\bcreate\s+table\b/i, "dispatcher must not create a parallel queue/store table");
assert.match(baseMigration, /alter table public\.work_log/i, "existing Coordination Ledger must be extended");
assert.match(baseMigration, /work_log_one_active_writer_scope_uidx/i, "DB must enforce one active WRITE scope");
assert.match(baseMigration, /work_log_assignment_idempotency_uidx/i, "assignment idempotency must be DB-enforced");
assert.match(baseMigration, /cron\.schedule/i, "recovery scheduler must exist");
assert.match(baseMigration, /agent_dispatch_finish/i, "canonical finish path must remain work_log based");
assert.match(baseMigration, /RESULT_WAKE/i, "result provenance must preserve controller wake intent");

assert.match(routineMigration, /CLAUDE_CODE_ROUTINE_FIRE_URL/, "Routine fire URL must come from existing Vault");
assert.match(routineMigration, /CLAUDE_CODE_ROUTINE_TOKEN/, "Routine bearer token must come from existing Vault");
assert.match(routineMigration, /claude_code\/routines\//i, "Claude wake must use the Claude Code Routine API");
assert.match(routineMigration, /experimental-cc-routine-2026-04-01/, "Routine beta contract must be explicit");
assert.match(routineMigration, /claude_code_session_id/, "wake proof must capture Claude Code session id");
assert.match(routineMigration, /claude_code_session_url/, "wake proof must capture Claude Code session URL");
assert.match(routineMigration, /FIRE_REQUESTED/, "fire request must be distinct from session start");
assert.match(routineMigration, /SESSION_STARTED/, "actual session start must be represented explicitly");
assert.match(routineMigration, /DEFERRED_CLAUDE_CODE_ROUTINE_NOT_CONFIGURED/, "missing Routine config must fail closed");
assert.match(routineMigration, /DEFERRED_GPT_RUNTIME_ENDPOINT_NOT_CONFIGURED/, "GPT wake must remain honest until a real GPT runtime endpoint exists");
assert.match(routineMigration, /DEFERRED_WRITE_REQUIRES_GOVERNED_AGENT_RUNTIME/, "WRITE may not auto-start in v2");
assert.match(routineMigration, /agent_dispatch_reconcile_routine_response/, "pg_net response must be reconciled to session provenance");
assert.match(routineMigration, /FIRE_REQUESTED','SESSION_STARTED/, "Routine must be able to claim before or after fire-response reconciliation");
assert.match(routineMigration, /delete from vault\.secrets where name = 'AGENT_DISPATCH_WEBHOOK_KEY'/i, "obsolete Edge transport secret must be retired");
assert.match(routineMigration, /drop function if exists public\.agent_dispatch_verify_webhook/i, "obsolete Edge verifier must be retired");
assert.doesNotMatch(routineMigration, /\/v1\/messages/i, "Messages API is not an agent wake fallback");
assert.doesNotMatch(routineMigration, /merge_pull_request|git push|functions\.v1\/deploy/i, "dispatch transport must not contain release automation");

assert.equal(existsSync(resolve(ROOT, "supabase/functions/agent-dispatch/index.ts")), false, "Messages API pseudo-agent Edge executor must not remain in the branch");

console.log("agent-dispatch Claude Code Routine architecture contract: PASS");
