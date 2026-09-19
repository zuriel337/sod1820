// G3_SYSTEM_SELF_MAINTENANCE_V1 — contract guard.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const mig = read("supabase/migrations/20260919084719_g3_system_self_maintenance_v1.sql");

// 1. EXTEND_EXISTING owner/versioning; no parallel maintenance store/scheduler.
assert.match(mig, /rule_id='system_suggestions_law'/);
assert.match(mig, /rule_version=2/);
assert.match(mig, /'system_suggestions_law',\s*\n\s*3,/);
assert.match(mig, /supersedes_version/i);
assert.match(mig, /GOVERNED SELF-MAINTENANCE/);
assert.match(mig, /not exists \(\s*select 1\s*from public\.nodes existing[\s\S]*existing\.rule_id='system_suggestions_law'[\s\S]*existing\.rule_version=3\s*\)/i, "rule v3 creation must be replay/idempotent");
assert.ok(!/create table/i.test(mig), "no new maintenance table/store");
assert.ok(!/cron\.schedule\s*\(/i.test(mig), "no new maintenance cron");

// 2. Existing Human Gate remains mandatory: accepted Upgrade Radar suggestion only.
assert.match(mig, /if not public\.rd_is_admin\(\) then raise exception 'admin only'/i);
assert.match(mig, /p_status not in \('accepted','rejected','later','pending'\)/);
assert.match(mig, /p_status='accepted' and v_s\.detector='dependency_upgrade_radar'/g);
assert.ok(!/set status\s*=\s*'accepted'/i.test(mig), "system must not auto-accept suggestions");
assert.match(mig, /update public\.system_suggestions\s+set status=p_status/i);

// 3. Maintenance input is bounded and fail-closed.
for (const name of [
  "react","react-dom","react-router-dom","vite","@vitejs/plugin-react",
  "@supabase/supabase-js","@vercel/edge","@vercel/og","@hebcal/core","node",
]) {
  assert.ok(mig.includes("'" + name + "'"), name + " must be in the maintenance allowlist");
}
assert.match(mig, /v_current !~ '\^\[0-9\]\+\[\.\]\[0-9\]\+\[\.\]\[0-9\]\+\$'/);
assert.match(mig, /v_latest !~ '\^\[0-9\]\+\[\.\]\[0-9\]\+\[\.\]\[0-9\]\+\$'/);
assert.match(mig, /v_delta not in \('patch','minor','major'\)/);
assert.match(mig, /raise exception 'unsupported maintenance package'/);
assert.match(mig, /raise exception 'invalid maintenance suggestion payload'/);

// 4. Reuse work_log/Claude dispatch. One accepted target -> one idempotent branch-only assignment.
assert.match(mig, /insert into public\.work_log/i);
assert.match(mig, /'ZURIEL',\s*\n\s*'CLAUDE',\s*\n\s*'WRITE'/);
assert.match(mig, /'BRANCH_ONLY_NO_MERGE_NO_DEPLOY'/);
assert.match(mig, /'ASSIGNMENT',\s*\n\s*'QUEUED'/);
assert.match(mig, /exception when unique_violation then\s*\n\s*null/i);
assert.match(mig, /AUTO_DEP_UPGRADE_/);
assert.match(mig, /'_S' \|\| p_id::text/, "assignment identity must include suggestion_id for retry-safe idempotency");
assert.match(mig, /v_scope := 'dependency-maintenance:runtime-packages'/);
assert.match(mig, /raise exception 'dependency maintenance already active'/);
assert.match(mig, /lower\(coalesce\(w\.assignment_scope,''\)\)='dependency-maintenance:runtime-packages'/);
assert.match(mig, /coalesce\(w\.dispatch_state,'QUEUED'\) not in \('FAILED','CANCELLED','COMPLETED'\)/);
assert.match(mig, /dependency-maintenance:/);
assert.match(mig, /'human_decision','accepted'/);
assert.match(mig, /'auto_maintenance',true/);

// 5. Stale evidence, package-manager bypasses and release semantics are explicit in assignment.
assert.match(mig, /Reverify origin\/main and authoritative stable provider metadata before editing/i);
assert.match(mig, /STOP as stale\/no-op/i);
assert.match(mig, /never use --force or --legacy-peer-deps/i);
assert.match(mig, /Do not merge\/deploy from this assignment/i);
assert.match(mig, /MAJOR: branch\/PR preparation only; release advice must be BLOCKED_BY Foundation/i);
assert.match(mig, /PATCH\/MINOR: branch\/PR preparation only/i);
assert.match(mig, /deploy_on_request v2/);

// 6. DB function itself does not perform GitHub/release/network execution; dispatch trigger owns transport.
assert.ok(!/net\.http_post|extensions\.http|pg_net/i.test(mig), "decision RPC must not become a network/release executor");
assert.ok(!/git\s+(push|commit|merge)|gh\s+pr\s+merge/i.test(mig), "DB function must not execute repository release actions");

// 7. Security-definer transport narrowed after adding dispatch side effect.
assert.match(mig, /security definer/i);
assert.match(mig, /set search_path to 'public'/i);
assert.match(mig, /revoke all on function public\.admin_suggestion_decide\(bigint,text,text\) from public, anon;/i);
assert.match(mig, /grant execute on function public\.admin_suggestion_decide\(bigint,text,text\) to authenticated, service_role;/i);

console.log("system-self-maintenance-v1-contract: PASS");
