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

test("14.11.2026: steps 1 and 9 are recorded as applied live and are not in the remaining list; their source files are the ones that were applied", () => {
  assert.deepEqual(plan.live_state.applied, ["1", "9"]);
  assert.deepEqual(plan.live_state.remaining, ["2", "4", "5", "6", "7", "8", "10"]);
  assert.deepEqual(plan.steps.filter((s) => s.state === "not_applied").map((s) => s.step), plan.live_state.remaining);
  for (const k of ["1", "9"]) {
    const s = plan.steps.find((x) => x.step === k);
    assert.equal(s.state, "applied_live_do_not_reapply");
    assert.match(s.applied.packet, /PR #1339 head 50b72a7e3fef98b2c86a57f325d486bc9b8eea27/);
    assert.equal(s.applied.source_file_unchanged, true);
  }
  assert.match(plan.live_state.do_not_reapply, /steps 1 and 9 are in force/);
  assert.match(read("docs/reviews/db-foundations-extraction-20261113/README.md"), /steps 1 and 9 \(DEF-001b\) are APPLIED LIVE/);
});

// The text the fingerprint function of an apply / rollback file carries (between `as $f$` and `$f$;`).
const fingerprintBody = (sql, f) => {
  const m = sql.match(/language sql stable as \$f\$\n  ([\s\S]*?)\n\$f\$;/);
  assert.ok(m, `${f}: fingerprint function found`);
  return m[1];
};

test("steps 4, 5, 6 and 8 run as one transaction: own timeouts and search_path, the table locks come BEFORE the catalogue guard reads anything, and the fingerprints are the ones in the plan, the verifier and the pre-apply query", () => {
  const pre = read("tests/live/m0_pre_apply_fingerprints.sql");
  const ver = read("tests/live/m0_post_apply_verification.sql");
  for (const k of ["4", "5", "6", "8"]) {
    const s = plan.steps.find((x) => x.step === k);
    const g = s.guard;
    const before = g.fingerprint_before_live_14_11, after = g.fingerprint_after_fixture;
    assert.match(before, /^[0-9a-f]{32}$/); assert.match(after, /^[0-9a-f]{32}$/); assert.notEqual(before, after);
    assert.match(g.lock_timeout, /^[12]s$/, "a hot table is never held for more than 2 s (the first-generation files used 5 s)");
    assert.equal(g.statement_timeout, "60s"); assert.equal(g.search_path, "public, pg_catalog");
    assert.ok(g.lock_tables.length >= 1);
    const bodies = [];
    for (const f of [s.file, s.rollback]) {
      const sql = read(f);
      assert.ok(sql.includes(`\nset local lock_timeout = '${g.lock_timeout}';\n`), `${f} sets the lock timeout of the plan (${g.lock_timeout})`);
      assert.doesNotMatch(sql, /lock_timeout = '5s'/, `${f}: no 5 s lock timeout`);
      assert.ok(sql.includes(`\nlock table ${g.lock_tables.join(", ")} in share update exclusive mode;\n`), `${f} locks exactly the tables of the plan`);
      assert.match(sql, /^commit;$/m, `${f} ends with commit`);
      assert.ok(sql.includes(before) && sql.includes(after), `${f} carries both fingerprints`);
      // order: transaction, timeouts, search_path, LOCK, fingerprint function, first refusal, commit. The lock must precede every catalogue read.
      let prev = -1;
      for (const re of [/^begin;$/m, /^set local lock_timeout = /m, /^set local statement_timeout = '60s';$/m, /^set local search_path = public, pg_catalog;$/m,
        /^lock table /m, /create or replace function pg_temp\./, /raise exception/, /^commit;$/m]) {
        const i = sql.search(re);
        assert.ok(i > prev, `${f}: ${re} missing or out of order (begin, timeouts, search_path, lock table, fingerprint function, checks, commit)`);
        prev = i;
      }
      bodies.push(fingerprintBody(sql, f));
    }
    assert.equal(bodies[0], bodies[1], `step ${k}: apply and rollback compute the fingerprint from the same text`);
    // what the fingerprint covers (independent review D2/D6/D9/D10): column grants and policy comments for all four, client grants for step 6, the PUBLIC entry and ACL of wa_msg_count for step 4
    assert.match(bodies[0], /order by x collate "C"/, `step ${k}: the order of the rendering does not depend on the server collation`);
    assert.match(bodies[0], /'cacl\|'/); assert.match(bodies[0], /'cm\|'/);
    if (k === "4") { assert.match(bodies[0], /'pub\|wa_msg_count\|'/); assert.match(bodies[0], /'acl\|wa_msg_count\|'/); }
    if (k === "6") assert.match(bodies[0], /'g\|'\|\|c\.relname/, "step 6: the premise that clients hold SELECT only is part of the fingerprint");
    const apply = read(s.file), rollback = read(s.rollback);
    assert.match(apply, /nothing changed/); assert.match(apply, /Postcondition: the catalogue is exactly the "after" state/);
    assert.match(rollback, /already the state before the apply; nothing to roll back/); assert.match(rollback, /Postcondition: the exact state before the apply/);
    for (const [name, text] of [["pre-apply query", pre], ["verifier", ver]]) {
      assert.ok(text.includes(before) && text.includes(after), `step ${k}: the ${name} holds the same fingerprints`);
      assert.ok(text.includes(bodies[0]), `step ${k}: the ${name} computes the fingerprint from the same text as the apply file`);
    }
  }
});

test("step 5 can be re-run (the guard accepts its own result, so the file must be idempotent): the admin read policies are dropped before they are created", () => {
  const sql = read(plan.steps.find((x) => x.step === "5").file);
  for (const [name, table] of [["lab_notes_admin_read", "lab_notes"], ["lab_messages_admin_read", "lab_messages"]]) {
    const drop = sql.indexOf(`drop policy if exists ${name} on public.${table};`), create = sql.indexOf(`create policy ${name} on public.${table}`);
    assert.ok(drop > 0 && create > drop, `${name}: drop policy if exists before create policy`);
  }
});

test("the M0-A runner carries the concurrency cases K1 (apply), K2 (rollback) and K3 (a reader longer than the lock timeout) next to the drift cases", () => {
  const runner = read("scripts/run-m0a-db-permissions-sql-test.sh");
  for (const c of ["K1", "K2", "K3"]) assert.match(runner, new RegExp(`PASS ${c} `), `${c} is part of the runner`);
  assert.match(runner, /lock timeout/i);
  const sqlTest = read("tests/sql/m0a_db_permissions_v1.sql");
  assert.match(sqlTest, /re-run/i, "the SQL test re-runs steps 5 and 6 on their own result");
});

test("steps 2, 7 and 10 stay single atomic statements: no top-level transaction (the DEF-005 test executes the file text), files unchanged since their reviews", () => {
  for (const k of ["2", "7", "10"]) {
    const s = plan.steps.find((x) => x.step === k);
    for (const f of [s.file, s.rollback]) assert.doesNotMatch(read(f), /^(begin|commit);$/m, `${f} has no top-level transaction control`);
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

test("the 120 MiB upload ceiling is recorded as the product decision D-1 ADOPTED by ZURIEL (per NEW file, existing files retained) in the file and in the plan, and as a policy choice, not as an approval to apply", () => {
  const step8 = plan.steps.find((s) => s.step === "8");
  assert.equal(step8.decision_gates, undefined, "no open decision gate is left on step 8");
  assert.ok(step8.decision_record.some((g) => g.startsWith("D-1 ADOPTED by ZURIEL on 14.11.2026") && /120 MiB per NEW gallery file/.test(g) && /NOT an approval to apply/.test(g)));
  const sql = read(step8.file);
  assert.match(sql, /PRODUCT DECISION D-1: ADOPTED BY ZURIEL \(14\.11\.2026\), 120 MiB PER NEW FILE/);
  assert.match(sql, /NOT an\n-- approval to apply this file/);
  assert.doesNotMatch(sql, /NOT CONFIRMED/);
  assert.match(sql, /update storage\.buckets set file_size_limit = 125829120 where id = 'gallery';/);
});

test("a file that fails on its lock timeout changed nothing and the instruction is STOP and inspect, never to resend automatically (adopted rule O-7), in every guarded file and in the plan", () => {
  for (const k of ["4", "5", "6", "8"]) {
    const s = plan.steps.find((x) => x.step === k);
    for (const f of [s.file, s.rollback]) {
      const sql = read(f);
      assert.match(sql, /STOP and inspect \(pg_locks, pg_stat_activity\), do not resend automatically/, `${f} says stop and inspect`);
      assert.doesNotMatch(sql, /sent again|send again|resend it|retry/i, `${f} does not tell anyone to send it again`);
    }
  }
  assert.match(plan.execution_form.steps_4_5_6_8, /STOP and inspect \(pg_locks, pg_stat_activity\) and do not resend automatically/);
  assert.doesNotMatch(read("docs/reviews/db-foundations-extraction-20261113/README.md"), /simply sent again|is sent again/);
});

test("the live verification query is phase-aware: one `applied` line, change/preserve rows, fingerprints and a VERDICT row", () => {
  const v = read("tests/live/m0_post_apply_verification.sql");
  assert.match(v, /with applied\(step\) as \(values \('1'\), \('9'\)\)/, "the committed default lists exactly the two applied steps");
  assert.match(v, /'VERDICT' as step/); assert.match(v, /'change'/); assert.match(v, /'preserve'/);
  assert.match(v, /as_expected/);
  assert.match(v, /FP step 8/);
});

test("the live verification query covers this package only and checks signatures, not names", () => {
  const v = read("tests/live/m0_post_apply_verification.sql").split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
  assert.match(v, /A1b no unreviewed overload/);
  assert.doesNotMatch(v, /world_contributor_research_v[12]/, "the M0-D rows belong to package P3");
  assert.doesNotMatch(v, /'B ai_quota_check/, "the M0-B row belongs to step 3, which is not in this package");
});

test("DEF-005 apply and rollback are read-only until every check passed (all refusals come before the first revoke/grant)", () => {
  const apply = read("supabase/proposed/20261106131000_def005_revoke_internal_rpcs_from_clients.sql");
  const firstChange = apply.search(/execute format\('comment on function/);
  for (const marker of ["reviewed signature(s) missing", "unreviewed function(s) with a reviewed name", "drifted from the reviewed baseline"]) {
    const at = apply.indexOf(marker);
    assert.ok(at > 0 && at < firstChange, `${marker} is raised before the first change`);
  }
  const rb = read("supabase/proposed/ROLLBACK_20261106131000_def005.sql");
  const firstRb = rb.search(/execute format\('grant execute/);
  for (const marker of ["reviewed signature(s) missing", "not in the state the apply recorded"]) {
    const at = rb.indexOf(marker);
    assert.ok(at > 0 && at < firstRb, `${marker} is raised before the first change`);
  }
});

test("CR-X1: the apply records the definition md5 and the rollback refuses a state the apply did not record, before any change", () => {
  const apply = read("supabase/proposed/20261106131000_def005_revoke_internal_rpcs_from_clients.sql");
  const rb = read("supabase/proposed/ROLLBACK_20261106131000_def005.sql");
  for (const text of [apply, rb]) assert.match(text, /DEF-005 applied; def_md5=/, "both files use the same record prefix");
  // everything the rollback checks is checked before the first privilege or comment change
  const firstRb = rb.search(/execute format\('grant execute/);
  for (const marker of ["changed since the apply: kind", "definition changed since the apply", "without the apply record", "mixed state"]) {
    const at = rb.indexOf(marker);
    assert.ok(at > 0 && at < firstRb, `${marker} is raised before the first change`);
  }
  // the apply does not promise a body check it cannot make
  assert.match(apply, /holds no reviewed text of the twelve BODIES/);
  assert.match(read("tests/live/m0_post_apply_verification.sql"), /A1c apply record intact/);
  assert.ok(fs.existsSync(path.join(root, "tests/live/def005_pre_apply_definitions.sql")), "the operator's pre-apply query exists");
});
