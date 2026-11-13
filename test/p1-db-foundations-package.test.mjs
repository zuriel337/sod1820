// Package P1 (DB foundations, extraction of PR #1321 onto main): the documented scope cannot drift silently.
// Repository files only - no database, no network.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, f))).digest("hex");
const plan = JSON.parse(read("docs/reviews/db-foundations-extraction-20261113/apply-plan.json"));

test("the apply plan lists exactly the steps 1, 2, 4, 5, 6, 7, 8, 9, 10 and every file hash is current", () => {
  assert.deepEqual(plan.steps.map((s) => s.step), ["1", "2", "4", "5", "6", "7", "8", "9", "10"]);
  for (const s of plan.steps) {
    assert.equal(sha(s.file), s.sha256, `${s.file} changed after the plan was written - regenerate the plan and re-run the tests`);
    assert.equal(sha(s.rollback), s.rollback_sha256, `${s.rollback} changed after the plan was written`);
    for (const t of s.tests) {
      const f = t.split(" ")[0];
      assert.ok(fs.existsSync(path.join(root, f)), `${s.step}: test file ${f} exists`);
    }
  }
});

test("steps 3, 11 and 12 are not part of this package: the files of steps 3 and 12 are on no branch of the extraction", () => {
  assert.deepEqual(plan.not_in_this_package.map((s) => s.step), ["3", "11", "12"]);
  // Step 11 (M0-D) is package P3: its files are legitimately present once P3 is merged, so only steps 3 and 12 are pinned absent here.
  for (const f of [
    "supabase/proposed/20261112120000_m0b_ai_quota_fail_closed.sql", "supabase/proposed/ROLLBACK_20261112120000_m0b_ai_quota_fail_closed.sql",
    "supabase/proposed/20261112132000_def005b_revoke_uncalled_client_rpcs_OPTIONAL.sql", "supabase/proposed/ROLLBACK_20261112132000_def005b.sql",
  ]) assert.equal(fs.existsSync(path.join(root, f)), false, `${f} must not be part of package P1`);
  assert.doesNotMatch(read("scripts/run-m0a-db-permissions-sql-test.sh"), /def005b/, "the M0-A runner does not load DEF-005b");
  assert.doesNotMatch(read("tests/sql/m0a_db_permissions_v1.sql"), /def005b/i, "the M0-A test does not exercise DEF-005b");
});

test("the rollback order is the reverse of the apply order and only step 9 depends on another step", () => {
  assert.deepEqual(plan.rollback_order, plan.steps.map((s) => s.step).reverse());
  for (const s of plan.steps) {
    if (s.step === "9") assert.ok(s.depends_on.some((d) => /step 1/.test(d)), "step 9 needs step 1");
    else assert.deepEqual(s.depends_on, [], `step ${s.step} has no dependency on another step`);
  }
});

test("every SQL runner the plan relies on loads the files of this package and nothing else", () => {
  const runner = read("scripts/run-m0a-db-permissions-sql-test.sh");
  for (const s of plan.steps.filter((x) => ["2", "4", "5", "6", "7", "10"].includes(x.step))) {
    assert.ok(runner.includes(s.file) && runner.includes(s.rollback), `the M0-A runner loads step ${s.step} and its rollback`);
  }
  assert.match(read("scripts/run-def001-sql-test.sh"), /def004_gallery_storage_upload_policies_v1\.sql/);
  assert.match(read("scripts/run-def001-sql-test.sh"), /def005_public_rpc_guards_v1\.sql/);
});

test("the 120 MiB upload ceiling stays marked as an unconfirmed product decision (D-1) in the file and in the plan", () => {
  const step8 = plan.steps.find((s) => s.step === "8");
  assert.ok(step8.decision_gates.some((g) => g.startsWith("D-1")));
  const sql = read(step8.file);
  assert.match(sql, /PRODUCT DECISION NOT CONFIRMED FOR THIS EXTRACTION/);
  assert.match(sql, /update storage\.buckets set file_size_limit = 125829120 where id = 'gallery';/);
});

test("the live verification query covers this package only and checks signatures, not names", () => {
  const v = read("tests/live/m0_post_apply_verification.sql").split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
  assert.match(v, /A1b no unreviewed overload/);
  assert.doesNotMatch(v, /world_contributor_research_v[12]/, "the M0-D rows belong to package P3");
  assert.doesNotMatch(v, /'B ai_quota_check/, "the M0-B row belongs to step 3, which is not in this package");
});

test("DEF-005 apply and rollback are read-only until every check passed (all refusals come before the first revoke/grant)", () => {
  const apply = read("supabase/proposed/20261106131000_def005_revoke_internal_rpcs_from_clients.sql");
  const firstChange = apply.search(/execute format\('revoke all/);
  for (const marker of ["reviewed signature(s) missing", "unreviewed function(s) with a reviewed name", "drifted from the reviewed baseline"]) {
    const at = apply.indexOf(marker);
    assert.ok(at > 0 && at < firstChange, `${marker} is raised before the first change`);
  }
  const rb = read("supabase/proposed/ROLLBACK_20261106131000_def005.sql");
  const firstRb = rb.search(/execute format\('grant execute/);
  for (const marker of ["reviewed signature(s) missing", "neither the applied nor the original state"]) {
    const at = rb.indexOf(marker);
    assert.ok(at > 0 && at < firstRb, `${marker} is raised before the first change`);
  }
});
