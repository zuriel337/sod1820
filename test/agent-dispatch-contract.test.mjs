import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migration = readFileSync(
  resolve(ROOT, "supabase/migrations/20260915165000_g3_inter_agent_event_dispatch_runtime_v1.sql"),
  "utf8",
);
const edge = readFileSync(resolve(ROOT, "supabase/functions/agent-dispatch/index.ts"), "utf8");

assert.doesNotMatch(migration, /\bcreate\s+table\b/i, "dispatcher must not create a parallel queue/store table");
assert.match(migration, /alter table public\.work_log/i, "existing Coordination Ledger must be extended");
assert.match(migration, /work_log_one_active_writer_scope_uidx/i, "DB must enforce one active WRITE scope");
assert.match(migration, /work_log_assignment_idempotency_uidx/i, "assignment idempotency must be DB-enforced");
assert.match(migration, /net\.http_post/i, "event transport must use pg_net");
assert.match(migration, /AGENT_DISPATCH_WEBHOOK_KEY/i, "transport secret must use existing Vault");
assert.match(migration, /cron\.schedule/i, "recovery scheduler must exist");
assert.match(migration, /agent_dispatch_claim/i);
assert.match(migration, /agent_dispatch_finish/i);
assert.match(migration, /agent_dispatch_requeue/i);
assert.match(migration, /dispatch_attempts=0|dispatch_attempts\s*=\s*0/i, "explicit requeue must reset retry budget");
assert.match(migration, /RESULT_WAKE/i, "result must preserve origin-controller wake provenance");

assert.match(edge, /only_assignment_id_is_accepted/, "public webhook must not accept arbitrary prompt text");
assert.match(edge, /DEFERRED_GPT_RUNTIME_ENDPOINT_NOT_CONFIGURED/, "GPT wake must remain honest until a runtime exists");
assert.match(edge, /DEFERRED_WRITE_REQUIRES_GOVERNED_TOOL_RUNTIME/, "WRITE may not auto-run in read-only dispatcher");
assert.match(edge, /agent_dispatch_verify_webhook/, "Edge must verify DB transport secret");
assert.match(edge, /agent_dispatch_claim/, "Edge must claim before execution");
assert.match(edge, /agent_dispatch_finish/, "Edge must close through canonical work_log state machine");
assert.doesNotMatch(edge, /functions\.v1\/deploy|merge_pull_request|git push/i, "dispatcher must not contain release automation");

console.log("agent-dispatch migration/edge architecture contract: PASS");
