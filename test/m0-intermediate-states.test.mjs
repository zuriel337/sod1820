// M0 intermediate states (12.11.2026). The SQL steps, the nine Edge deploys and the site deploy are separate approvals, so the
// system must stay correct in every partial state. These checks read only repository files (and git history when present).
// A check that cannot run in a shallow clone is SKIPPED with its reason - never counted as passed.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { gunzipSync } from "node:zlib";

const root = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(root + p, "utf8");
const plan = JSON.parse(read("docs/reviews/m0-security-stabilization-20261112/apply-plan.json"));
const rb = JSON.parse(read("docs/reviews/m0-security-stabilization-20261112/edge-rollback/manifest.json"));
const has = (rev) => { try { execFileSync("git", ["-C", root, "cat-file", "-e", `${rev}^{commit}`], { stdio: "ignore" }); return true; } catch { return false; } };
const show = (rev, p) => execFileSync("git", ["-C", root, "show", `${rev}:${p}`], { maxBuffer: 64 << 20 }).toString("utf8");
const deployedSource = (slug) => rb.functions[slug].files.map((f) => f.source.git ? (has(f.source.git) ? show(f.source.git, f.source.path) : null)
  : gunzipSync(readFileSync(root + "docs/reviews/m0-security-stabilization-20261112/edge-rollback/" + f.source.artifact)).toString("utf8"));

// RPCs the proposal Edge code calls, each verified to exist in the live schema on 12.11.2026 (read-only pg_proc).
const LIVE_RPCS_READ_20261112 = new Set(("ai_quota_check chat_search_facts edge_rate_limit_check els_search_page_core_v1 els_verify_batch_v1 els_verify_occurrence_v1 "
  + "fn_all_methods fn_bot_referral_touch fn_capability_execution_gate_v1 fn_engine_snapshot fn_method_profile fn_number_dossier fn_outbox_bump "
  + "fn_raziel_activity_notify fn_raziel_answer fn_raziel_claim fn_raziel_context fn_raziel_fact fn_raziel_identity fn_raziel_persona fn_raziel_plan "
  + "fn_raziel_remember fn_relation_candidate fn_research_path_resume_v1 fn_research_path_append_v1 research_artifact_save admin_research_review "
  + "fn_rules_snapshot metatron_context op_trace_begin_v1 op_trace_finish_v1 op_trace_link_ai_cost_v1 op_trace_record_span_v1 "
  + "private_contribution_media_access rd_is_admin router_rate_check wa_admin wa_green_config wa_raziel_intake_source_v1 "
  + "els_matrix_reading_job_attach_v1 els_matrix_reading_job_claim_v1 els_matrix_reading_job_cost_v1 els_matrix_reading_job_finish_v1 "
  + "els_matrix_reading_job_get_v1 els_matrix_reading_job_mark_unknown_v1").split(" "));


test("apply plan: every SQL file and rollback exists and matches its SHA-256; statuses and dependencies are explicit", () => {
  assert.ok(plan.steps.length >= 12);
  for (const s of plan.steps) {
    for (const [f, h] of [[s.file, s.sha256], [s.rollback, s.rollback_sha256]]) {
      assert.ok(existsSync(root + f), f);
      assert.equal(createHash("sha256").update(readFileSync(root + f)).digest("hex"), h, `${f} changed since the apply plan was written`);
    }
    assert.ok(["mandatory", "mandatory-after-site", "optional"].includes(s.status), s.step);
    assert.ok(s.verify && s.what, s.step);
  }
  const lockdown = plan.steps.find((s) => s.file.endsWith("def001b_push_subscriptions_lockdown.sql"));
  const step1 = plan.steps.find((s) => s.file.endsWith("def001b_visitor_id_exposure_step1.sql"));
  assert.ok(Number(lockdown.step) > Number(step1.step) && lockdown.depends_on.includes(step1.step), "push lockdown only after step 1");
});

test("SQL before the site: the contributor view admitting candidates is ordered AFTER the M0-D site deploy", () => {
  const view = plan.steps.find((s) => s.file.endsWith("m0d_world_contributor_research_candidates.sql"));
  assert.equal(view.status, "mandatory-after-site");
  assert.match(view.depends_on.join(" "), /site deploy containing M0-D/);
  assert.equal(Number(view.step), Math.max(...plan.steps.filter((s) => s.status !== "optional").map((s) => Number(s.step))), "it is the last mandatory step");
});

// Production read from Vercel on 12.11.2026: sod1820.co.il -> dpl_9sJPZEwhbu7a13cakoeTbjXasm3A, built from 146f2f0e7 (#1318).
// The base the M0 branch was cut from (949c24ad5) was Production earlier the same day. Both are checked.
for (const [label, rev] of [["Production 146f2f0e7", "146f2f0e7e5e6dcd17f49af33e70808e7549ea1f"], ["base 949c24ad5", "949c24ad549ae9e95ced528a4ee8159670b52678"]]) {
  test(`why that order: the ${label} contributor reader has no status filter of its own`, { skip: has(rev) ? false : `commit ${rev.slice(0, 9)} not in this clone` }, () => {
    const live = show(rev, "src/lib/research/contributorFindingsProjection.js");
    const fetchFn = live.slice(live.indexOf("async function fetchResearchObjects"), live.indexOf("async function fetchContributorContributions"));
    assert.match(fetchFn, /from\("world_contributor_research_v1"\)/);
    assert.doesNotMatch(fetchFn, /\.in\("status"|\.eq\("status", "candidate"/, "the live reader would pass candidates straight through");
    assert.doesNotMatch(show(rev, "src/lib/research/researchObjectPresentation.js"), /researchPublicStatusPresentation/, "the live site has no candidate label yet");
    assert.match(read("src/lib/research/researchObjectPresentation.js"), /researchPublicStatusPresentation/, "the branch carries the label");
  });
}

// SQL before Edge: the old deployed code keeps calling the functions DEF-005 / M0-B revoke from clients, but only with the service role.
const gitNeeded = (slug) => rb.functions[slug].files.map((f) => f.source.git).filter(Boolean).find((rev) => !has(rev));
const OLD_SERVICE_CALLS = {
  "ai-analyze": [/rest\/v1\/rpc\/ai_quota_check`,\s*\{\s*method: "POST",\s*headers: svcHeaders\(\)/],
  "field-router": [/rpc\/router_rate_check`, \{\s*method: "POST", headers: \{ apikey: SERVICE_KEY, Authorization: `Bearer \$\{SERVICE_KEY\}`/],
  "wa-raziel": [/const sb = createClient\(Deno\.env\.get\("SUPABASE_URL"\) \?\? "", Deno\.env\.get\("SUPABASE_SERVICE_ROLE_KEY"\) \?\? ""\)/,
    /sb\.rpc\("fn_raziel_claim"/, /sb\.rpc\("fn_outbox_bump"/],
};
for (const [slug, patterns] of Object.entries(OLD_SERVICE_CALLS)) {
  const missing = gitNeeded(slug);
  test(`SQL before Edge: OLD deployed ${slug} calls the revoked functions with the service role`, { skip: missing ? `commit ${missing.slice(0, 9)} not in this clone` : false }, () => {
    const src = deployedSource(slug).join("\n");
    assert.ok(src.length > 1000, `${slug} deployed source available`);
    for (const re of patterns) assert.match(src, re, `${slug}: ${re}`);
  });
}
for (const slug of Object.keys(rb.functions)) {
  const missing = gitNeeded(slug);
  test(`SQL before Edge: OLD deployed ${slug} never calls a function M0 makes server-only without a deployed caller`, { skip: missing ? `commit ${missing.slice(0, 9)} not in this clone` : false }, () => {
    const src = deployedSource(slug).join("\n");
    for (const name of ["wa_msg_count", "fn_edge_grant_audit", "fn_rls_grant_audit", "check_security_spike", "snapshot_seo_wave", "fn_scan_reeval"]) {
      assert.doesNotMatch(src, new RegExp(`rpc[/(]\\s*["'\`]?${name}\\b`), `${slug} calls ${name}`);
    }
  });
}

test("Edge before SQL: the proposal Edge code calls only RPCs that exist live today, all through the service role", () => {
  const files = ["supabase/functions/_shared/edgeCallerLimits.js", "supabase/functions/_shared/materialGate.js", "supabase/functions/contact-notify/core.js",
    ...["ai-analyze", "number-researcher", "lab-teacher", "journey-message", "field-router", "wa-raziel", "els-search-bridge", "research-run", "contact-notify"].map((f) => `supabase/functions/${f}/index.ts`)];
  const text = files.map(read).join("\n");
  const called = new Set([...text.matchAll(/(?:serviceRpc|traceRpc|sb\.rpc|svcRpc)\(\s*["'`]([a-z][a-z_0-9]+)["'`]|\/rest\/v1\/rpc\/([a-z][a-z_0-9]+)/g)].map((m) => m[1] || m[2]));
  const missing = [...called].filter((n) => !LIVE_RPCS_READ_20261112.has(n));
  assert.deepEqual(missing, [], "an Edge deploy before the SQL would call an RPC that does not exist yet");
  // the limiter RPCs are server-only both before and after DEF-005, and the helper always uses the caller's service RPC
  assert.match(read("supabase/functions/_shared/edgeCallerLimits.js"), /serviceRpc\("edge_rate_limit_check"/);
});

test("old site with new Edge: the public worker still forwards paid AI only for the administrator", () => {
  const sw = read("public-reading-deploy/transport.js");
  const admin = /const adminFunctions = new Set\(\[([^\]]+)\]\)/.exec(sw)?.[1] || "";
  for (const fn of ["ai-analyze", "journey-message", "number-researcher", "lab-teacher"]) assert.match(admin, new RegExp(`"${fn}"`), fn);
});

test("new site with old SQL and Edge: the new public measurement uses only the existing ingest_event sink", () => {
  const events = read("src/lib/events.js");
  const emitter = events.slice(events.indexOf("function emitPublicReadingAction"), events.indexOf("const ARRIVAL_SOURCES"));
  assert.match(emitter, /supabase\.rpc\("ingest_event", body\)/);
  assert.doesNotMatch(emitter, /\.from\(|rpc\("(?!ingest_event)/);
});

test("Edge drift: the rollback manifest marks which deploys also ship main code that never went live", () => {
  const older = Object.entries(rb.functions).filter(([, f]) => /OLDER than base|not reproducible/.test(f.class)).map(([s]) => s).sort();
  assert.deepEqual(older, ["ai-analyze", "els-search-bridge", "number-researcher", "research-run", "wa-raziel"]);
  const same = Object.entries(rb.functions).filter(([, f]) => f.class === "deployed == base 949c24ad5").map(([s]) => s).sort();
  assert.deepEqual(same, ["field-router", "journey-message", "lab-teacher"]);
});
