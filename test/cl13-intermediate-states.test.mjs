// CL-13 — the intermediate states of the release, run on the DEPLOYED Edge code (the exact sources of the rollback manifests,
// read from git) against a throwaway PostgreSQL. Never a live project. Run by scripts/run-cl13-personal-memory-handlers-test.sh
// (second database), which pins the number of tests.
//
// Two orders exist between the Edge deployment and the database proposal:
//   Edge first, database after  = the REQUIRED order. Tested in test/cl13-personal-memory-pg.test.mjs (BEFORE 0-5, PAUSED 0-6).
//   Database first, Edge after  = NOT acceptable. This file shows why, reader by reader, on the code that is deployed today:
//     the proposal stops every WRITER in the database (trigger), and closes the readers that go through a database function,
//     but a reader that reads the table directly with the service key is not stopped by anything in the database.
// TODAY  = the deployed code on the live 12.11.2026 functions (the base line: it proves the harness really runs this code).
// DB-FIRST = the same deployed code after the proposal is applied.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { pgBridge } from "./helpers/cl13-pg-bridge.mjs";
import { siteThreadHandler, waRazielOnPg, runResearchBot, UA, BOT_PERSON } from "./helpers/cl13-edge-handlers.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url));
const M0 = JSON.parse(read("docs/reviews/m0-security-stabilization-20261112/edge-rollback/manifest.json"));
const CL13 = JSON.parse(read("docs/reviews/cl13-personal-memory-20261112/edge-rollback-manifest.json"));
const PLAN = JSON.parse(read("docs/reviews/cl13-personal-memory-20261112/apply-plan.json"));
const SIX = ["wa-raziel", "ai-analyze", "number-researcher", "raziel-attention", "wa-hatishbi", "wa-uriel"];
const entryOf = (slug) => (M0.functions[slug] || CL13.functions[slug]);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const haveHistory = (() => { try { for (const c of ["065aa022b9ecf1152c14aaf1be3460c7c8136e6c", "aa0f6bc82b8c94286374b1f51208037502994eab", "b4d5ec47132ed8003b822cc70de9e1b82447cb7c"]) execFileSync("git", ["cat-file", "-e", `${c}^{commit}`], { stdio: "ignore" }); return true; } catch { return false; } })();
// the deployed bytes of one file of one function, checked against the hash in its rollback manifest
function deployedFile(slug, suffix) {
  const fn = entryOf(slug), entry = fn.files.find((f) => f.deploy_path.endsWith(suffix));
  const bytes = entry.source.git ? execFileSync("git", ["show", `${entry.source.git}:${entry.source.path}`], { maxBuffer: 64 << 20 })
    : gunzipSync(read(`docs/reviews/m0-security-stabilization-20261112/edge-rollback/${entry.source.artifact}`));
  assert.equal(sha(bytes), entry.rollback_sha256, `${slug}/${suffix}: the bytes are the ones of the rollback manifest`);
  return bytes.toString("utf8");
}
const moduleOf = (text) => import(`data:text/javascript;base64,${Buffer.from(text).toString("base64")}`);

const pg = pgBridge();
const APPLY = "supabase/proposed/20261112230000_cl13_personal_memory_pause.sql";
const promptOf = (run) => run.models.map((m) => m.user).join("\n");
const rowsOf = (where) => pg.scalar(`(select count(*) from public.agent_user_memory where ${where})`);
const BOT_REPLY = {
  "wa-hatishbi": (tag) => `שמעתי את מה שהבאת ואני משקף אותו במילים שלי, עם שאלה אחת להמשך.\n— התשבי · סוד 1820\n###למידות###\n{"learnings":[{"topic":"בראשית ברא אלוהים","claim":"NEW-FINDING-${tag}","interpretation":"i"},{"topic":"TP-${tag}","claim":"NEW-PERSONAL-${tag}: הטלפון שלה 050-0000002","interpretation":"i"}],"question_asked":"NEW-QUESTION-${tag}"}`,
  "wa-uriel": (tag) => `קיבלתי את מה שהבאת ואני משקף אותו במילים שלי, עם שאלה אחת להמשך הלימוד.\n— אוריאל · סוד 1820\n###למידות###\n{"learnings":[{"word":"בראשית ברא אלוהים","decomposed_form":"x","interpretation":"NEW-FINDING-${tag}"},{"word":"WP-${tag}","decomposed_form":"y","interpretation":"NEW-PERSONAL-${tag}: שמי רחל"}],"question_asked":"NEW-QUESTION-${tag}"}`,
};
const stored = (tag) => pg.rows(`select memory_type, split_part(content, ':', 1) as content from public.agent_user_memory where content like '%${tag}%' order by 1, 2`).map((r) => [r.memory_type, r.content]);

// ───────────── no database needed: the plan, the order and the rollback sources ─────────────
test("every Edge function that CL-13 changes has a rollback source, and the plan deploys every direct reader before the database step", () => {
  assert.deepEqual(Object.keys(CL13.functions).sort(), ["raziel-attention", "wa-hatishbi", "wa-uriel"]);
  for (const slug of SIX) {
    const fn = entryOf(slug);
    assert.ok(fn && Number.isInteger(fn.version) && typeof fn.verify_jwt === "boolean" && fn.files.length > 0, `${slug}: a rollback source exists`);
    assert.match(String(fn.deployed_ezbr_sha256), /^[0-9a-f]{64}$/, `${slug}: the deployed bundle hash is recorded for the drift gate`);
  }
  for (const [slug, fn] of Object.entries(CL13.functions)) {
    assert.equal(fn.rollback_kind, "exact_source");
    for (const f of fn.files) { assert.ok(f.source.git && !f.source.artifact, `${slug}: git-sourced`); assert.equal(f.deployed_sha256, f.rollback_sha256, `${slug}/${f.deploy_path}: rollback == deployed bytes`); }
  }
  // the plan names the same six functions with the same deployed version and bundle hash, and none is left without a source
  assert.deepEqual(PLAN.edge_functions.map((f) => f.slug).sort(), [...SIX].sort());
  for (const f of PLAN.edge_functions) {
    const fn = entryOf(f.slug);
    assert.equal(f.deployed_version, fn.version, `${f.slug}: version`); assert.equal(f.deployed_ezbr_sha256, fn.deployed_ezbr_sha256, `${f.slug}: bundle hash`);
    assert.match(f.rollback_source, /manifest\.json/, `${f.slug}: the plan points to its rollback manifest`);
  }
  assert.doesNotMatch(JSON.stringify(PLAN), /NOT PREPARED/);
  // the order: every Edge function is a step before the database step, and every reader of the plan is closed by a named step
  const order = PLAN.required_order.map((s) => s.step);
  assert.deepEqual(order, ["EDGE-CL13", "CL13-1"], "Edge first, the database proposal after it");
  assert.deepEqual([...PLAN.required_order[0].functions].sort(), [...SIX].sort(), "the Edge step covers all six functions");
  for (const r of PLAN.readers) {
    assert.ok(["EDGE-CL13", "CL13-1", "not a context reader", "open decision"].includes(r.closed_by), `${r.reader}: closed_by`);
    if (r.reads === "table, directly") assert.equal(r.closed_by, "EDGE-CL13", `${r.reader}: a direct reader of the table is closed only by its own code, so it is deployed before the database step`);
  }
  const direct = PLAN.readers.filter((r) => r.reads === "table, directly").map((r) => r.reader).sort();
  assert.deepEqual(direct, ["number-researcher", "raziel-attention", "wa-hatishbi", "wa-uriel"]);
  // the same order is written in the SQL file itself (the earlier header contradicted the plan)
  const sql = read(APPLY).toString("utf8");
  assert.match(sql, /are deployed FIRST, this file AFTER them/); assert.match(sql, /This file BEFORE the Edge code is NOT acceptable/);
  assert.doesNotMatch(sql, /safe whether[^.]*before or after/i);
});

test("the deployed wa-raziel and ai-analyze reach the memory only through database functions (so the database step alone closes them)", { skip: haveHistory ? false : "clone too shallow (fetch the commits of the rollback manifests)" }, () => {
  const direct = /agent_user_memory/;
  const wa = deployedFile("wa-raziel", "wa-raziel/index.ts"), ai = deployedFile("ai-analyze", "index.ts");
  assert.doesNotMatch(wa, direct); assert.doesNotMatch(ai, direct);
  const memoryCalls = (text) => [...new Set([...text.matchAll(/\b(fn_raziel_context|fn_raziel_remember|fn_raziel_fact|fn_raziel_upsert_summary|fn_mem_add|fn_research_output_context_v1|fn_personal_memory_[a-z0-9_]+)\b/g)].map((m) => m[1]))].sort();
  assert.deepEqual(memoryCalls(wa), ["fn_raziel_context", "fn_raziel_fact", "fn_raziel_remember"]);
  assert.deepEqual(memoryCalls(ai), ["fn_raziel_context", "fn_raziel_remember"]);
  // and the four direct readers are exactly the ones the plan lists
  for (const [slug, suffix] of [["number-researcher", "number-researcher/index.ts"], ["raziel-attention", "raziel-attention/index.ts"], ["wa-hatishbi", "wa-hatishbi/index.ts"], ["wa-uriel", "wa-uriel/index.ts"]]) assert.match(deployedFile(slug, suffix), direct, `${slug}: the deployed code reads the table directly`);
});

if (!pg) {
  test("the intermediate states need the throwaway PostgreSQL of scripts/run-cl13-personal-memory-handlers-test.sh", { skip: "start them with the runner script" }, () => {});
} else if (!haveHistory) {
  test("the intermediate states need the commits of the rollback manifests", { skip: "clone too shallow (fetch 065aa022, aa0f6bc82, b4d5ec47)" }, () => {});
} else {
  const site = async (name) => siteThreadHandler(name, pg, { deployed: { text: deployedFile(name, `${name}/index.ts`), materialGate: await moduleOf(deployedFile(name, "_shared/materialGate.js")) } });
  const SITE = [["number-researcher", "token-user-a", { values: [787] }], ["raziel-attention", "token-admin-a", { digest: null, profile: "ZURIEL_RESEARCH" }]];
  const turn = (tag) => ({ message: `NEW-MESSAGE-${tag}`, history: [{ role: "user", text: `NEW-EARLIER-${tag}` }, { role: "assistant", text: `NEW-EARLIER-REPLY-${tag}` }] });

  // ───────────── TODAY: the deployed code on the live functions ─────────────
  test("TODAY: the deployed site threads read the stored thread, prefer it to the new turns, and store every turn", async () => {
    for (const [name, token, body] of SITE) {
      const h = await site(name), before = rowsOf(`user_ref = '${UA}' and source = 'site'`);
      const r = await h.call({ ...body, ...turn(`TODAY-${name}`) }, token);
      assert.equal(r.status, 200); assert.equal(r.body.persisted, true, `${name}: reports saved`);
      assert.match(promptOf(h), /OLD-SITE-THREAD-A/, `${name}: the stored thread is in the prompt`);
      assert.doesNotMatch(promptOf(h), new RegExp(`NEW-EARLIER-TODAY-${name}`), `${name}: the turns the client sent are dropped when a stored thread exists`);
      assert.equal(rowsOf(`user_ref = '${UA}' and source = 'site'`), before + 1, `${name}: the turn was stored`);
    }
  });
  test("TODAY: the deployed research bots read the questions and every finding (a personal detail included) and store all of it", async () => {
    for (const name of ["wa-hatishbi", "wa-uriel"]) {
      const letter = name === "wa-hatishbi" ? "H" : "U", tag = `TODAY-${letter}`;
      const run = await runResearchBot(name, pg, { incomingText: "הודעה חדשה", modelText: BOT_REPLY[name](tag), deployedText: deployedFile(name, `${name}/index.ts`) });
      assert.equal(run.sent.length, 1);
      const prompt = promptOf(run);
      assert.match(prompt, new RegExp(`OLD-BOT-QUESTION-${letter}`)); assert.match(prompt, new RegExp(`OLD-BOT-FINDING-${letter}`));
      assert.match(prompt, new RegExp(`OLD-BOT-PERSONAL-${letter}`), `${name}: today a personal detail inside a "research" row reaches the model`);
      assert.deepEqual(stored(tag), [["conversation", `NEW-QUESTION-${tag}`], [name === "wa-hatishbi" ? "research_note" : "method_discovery", `NEW-FINDING-${tag}`], [name === "wa-hatishbi" ? "research_note" : "method_discovery", `NEW-PERSONAL-${tag}`]].sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1])));
    }
  });
  test("TODAY: the deployed wa-raziel reads the stored context and stores the message and the profile detail", async () => {
    pg.statements.length = 0;
    const run = await waRazielOnPg(pg, { text: "שמי דוד כהן. מה הגימטריה של אור?", linked: true, source: deployedFile("wa-raziel", "wa-raziel/index.ts") });
    assert.ok(run.sent.length >= 1);
    assert.deepEqual([...new Set(pg.statements.filter((s) => s.kind === "rpc").map((s) => s.name))].sort(), ["fn_raziel_context", "fn_raziel_fact", "fn_raziel_remember"]);
    assert.ok(rowsOf(`user_ref = '${UA}' and memory_type = 'personal_context' and topic = 'name'`) >= 1, "the profile detail was stored");
    assert.ok(run.inserts.some((x) => /facts-captured/.test(String(x.row?.reply_out))));
  });

  // ───────────── DB-FIRST: the proposal applied under the deployed code ─────────────
  test("DB-FIRST 0: the proposal applies on the live state", () => {
    pg.run("delete from public.agent_user_memory where id not in (select id from public.cl13_original_ids);");   // back to the rows of the base
    pg.file(APPLY);
    assert.equal(pg.rpc("fn_personal_memory_policy_v1", { p_user_ref: UA }).data.policy, "cl13_pause_v1");
  });
  test("DB-FIRST 1: the deployed site threads STILL read the stored thread (nothing in the database stops a direct reader); the write is refused, and both report 'saved' without a row", async () => {
    for (const [name, token, body] of SITE) {
      const h = await site(name), before = pg.stamp();
      const r = await h.call({ ...body, ...turn(`DBFIRST-${name}`) }, token);
      assert.equal(r.status, 200);
      assert.match(promptOf(h), /OLD-SITE-THREAD-A/, `${name}: the stored thread is still read without consent`);
      assert.doesNotMatch(promptOf(h), new RegExp(`NEW-EARLIER-DBFIRST-${name}`), `${name}: and it still replaces the turns the client sent`);
      const after = pg.stamp();
      assert.equal(after.rows, before.rows, `${name}: the database refused the write`); assert.equal(after.original, before.original);
      // neither deployed version looks at the answer of the write: both say "saved" although the database refused it
      // (number-researcher learned to check only later, in code that is on origin/main but was never deployed)
      assert.equal(r.body.persisted, true, `${name}: the deployed code reports persisted=true without a stored row`);
      const reload = await h.call({ op: "history" }, token);
      assert.ok(reload.body.history.some((x) => /OLD-SITE-THREAD-A/.test(x.text)), `${name}: a reload still returns the stored thread`);
    }
  });
  test("DB-FIRST 2: the deployed research bots STILL read the questions and the personal detail directly; the database stores the clean finding only", async () => {
    for (const name of ["wa-hatishbi", "wa-uriel"]) {
      const letter = name === "wa-hatishbi" ? "H" : "U", tag = `DBFIRST-${letter}`;
      const run = await runResearchBot(name, pg, { incomingText: "הודעה חדשה", modelText: BOT_REPLY[name](tag), deployedText: deployedFile(name, `${name}/index.ts`) });
      assert.equal(run.sent.length, 1);
      const prompt = promptOf(run);
      assert.match(prompt, new RegExp(`OLD-BOT-QUESTION-${letter}`), `${name}: the stored questions are still read without consent`);
      assert.match(prompt, new RegExp(`OLD-BOT-PERSONAL-${letter}`), `${name}: the personal detail inside a "research" row still reaches the model`);
      assert.deepEqual(stored(tag), [[name === "wa-hatishbi" ? "research_note" : "method_discovery", `NEW-FINDING-${tag}`]], `${name}: the writer function decides - the question and the "finding" with a personal detail are not stored`);
    }
  });
  test("DB-FIRST 3: the deployed wa-raziel is closed by the database functions (no context, nothing stored) but still records 'facts-captured' for a fact that was not stored", async () => {
    const before = pg.stamp(); pg.statements.length = 0;
    const run = await waRazielOnPg(pg, { text: "שמי דוד כהן. מה הגימטריה של אור?", linked: true, source: deployedFile("wa-raziel", "wa-raziel/index.ts") });
    assert.ok(run.sent.length >= 1, "the person is still answered");
    assert.doesNotMatch(JSON.stringify(run.aiCalls), /OLD-|PRE-LINK|BARE-PHONE/, "no stored memory is sent on: fn_raziel_context is closed in the database");
    const after = pg.stamp(); assert.equal(after.rows, before.rows, "nothing was stored"); assert.equal(after.original, before.original);
    assert.ok(run.inserts.some((x) => /facts-captured/.test(String(x.row?.reply_out))), "the deployed code writes the 'captured' record without checking the writer's answer (fixed in the Edge code of this branch)");
  });
}

// ───────────── the release units (13.11.2026): what each of the six functions ships, as a checkable statement ─────────────
// apply-plan.json → release_units lists, per function, the exact bundle at the review point (every file the entry imports,
// transitively), its SHA-256 and its state against the deployed bundle. This turns "what is deployed together" from a sentence
// into something that fails when a file of a bundle changes without the plan being updated.
import { existsSync, readdirSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
const ROOT = new URL("../", import.meta.url).pathname;
function bundleFiles(entry) {
  const files = new Map(), stack = [entry];
  while (stack.length) {
    const f = stack.pop(); if (files.has(f)) continue;
    const bytes = readFileSync(`${ROOT}${f}`); files.set(f, bytes);
    const text = bytes.toString("utf8");
    const specs = [...text.matchAll(/^(?:import|export)\s[^;]*?from\s+["']([^"']+)["']/gms)].map((m) => m[1]).concat([...text.matchAll(/import\(\s*["'](\.[^"']+)["']\s*\)/g)].map((m) => m[1]));
    for (const spec of specs) if (spec.startsWith(".")) { const p = relative(ROOT, resolve(ROOT, dirname(f), spec)); if (existsSync(`${ROOT}${p}`)) stack.push(p); }
  }
  return files;
}
const deployedEntry = (slug, path) => (entryOf(slug).files.find((f) => `supabase/${f.deploy_path}`.replace("supabase/supabase/", "supabase/") === path || f.deploy_path === path.replace(/^supabase\//, "")));

test("independence: the database proposal is alone in naming the memory; the full release is stated as NOT independent of M0", () => {
  const files = readdirSync(`${ROOT}supabase/proposed`).filter((n) => n.endsWith(".sql") || n.endsWith(".json"));
  const names = /agent_user_memory|fn_raziel_context|fn_raziel_remember|fn_raziel_fact|fn_raziel_upsert_summary|fn_mem_add|fn_personal_memory|fn_research_output/;
  const naming = files.filter((n) => names.test(readFileSync(`${ROOT}supabase/proposed/${n}`, "utf8"))).sort();
  assert.deepEqual(naming, ["20261112230000_cl13_personal_memory_pause.sql", "ROLLBACK_20261112230000_cl13_personal_memory_pause.sql"], "no other proposed SQL file touches the memory");
  assert.match(PLAN.independence.database_proposal, /^INDEPENDENT of M0/);
  assert.match(PLAN.independence.full_release, /^NOT independent of M0/);
  assert.match(PLAN.independence.full_release, /wa-raziel, ai-analyze, number-researcher/);
  assert.equal(PLAN.depends_on_tracks, undefined, "the old one-line statement (\"none\") is gone");
  assert.equal(PLAN.review_point.sha, "0e928e34b4a26ca694dd49b4698ed8431cc68020");
});

test("release units: each function's bundle at the review point is exactly the listed files, with their SHA-256 and their state against the deployed bundle", () => {
  assert.deepEqual(PLAN.release_units.map((u) => u.slug).sort(), [...SIX].sort());
  for (const unit of PLAN.release_units) {
    const files = bundleFiles(`supabase/functions/${unit.slug}/index.ts`);
    assert.deepEqual(unit.bundle_at_review_point.map((f) => f.path).sort(), [...files.keys()].sort(), `${unit.slug}: the bundle is exactly these files`);
    assert.equal(unit.in_m0_edge_package, Boolean(M0.functions[unit.slug]), `${unit.slug}: M0 membership matches the M0 manifest`);
    for (const f of unit.bundle_at_review_point) {
      assert.equal(f.sha256, sha(files.get(f.path)), `${unit.slug}/${f.path}: sha256`);
      const dep = unit.deployed_as_single_bundle ? null : deployedEntry(unit.slug, f.path);
      const expected = unit.deployed_as_single_bundle ? "deployed as one bundled file (v91)" : !dep ? "new in the bundle" : dep.deployed_sha256 === f.sha256 ? "identical to deployed" : "changed";
      assert.equal(f.vs_deployed, expected, `${unit.slug}/${f.path}: state against the deployed file`);
    }
    for (const key of ["cl13", "m0", "other"]) assert.ok(Array.isArray(unit.ships_together[key]), `${unit.slug}: ships_together.${key}`);
    assert.ok(unit.ships_together.cl13.length > 0, `${unit.slug}: every function ships CL-13`);
    assert.ok(unit.verification_after_deploy.length >= 3 && unit.rollback.manifest && unit.decisions_missing.length >= 1, `${unit.slug}: verification, rollback and missing decisions are stated`);
    assert.equal(unit.deployed.version, entryOf(unit.slug).version); assert.equal(unit.deployed.ezbr_sha256, entryOf(unit.slug).deployed_ezbr_sha256);
  }
});

test("the first group is CL-13 and nothing else: its bundles differ from the deployed ones only in index.ts and the policy module", () => {
  const first = PLAN.recommended_first_group;
  assert.deepEqual(first.functions, ["wa-hatishbi", "wa-uriel"]);
  for (const slug of first.functions) {
    const unit = PLAN.release_units.find((u) => u.slug === slug);
    assert.equal(unit.unit, "U1"); assert.deepEqual(unit.ships_together.m0, []); assert.deepEqual(unit.ships_together.other, []); assert.deepEqual(unit.needs_before, []); assert.deepEqual(unit.secrets_and_settings, []);
    const touched = unit.bundle_at_review_point.filter((f) => f.vs_deployed !== "identical to deployed").map((f) => f.path).sort();
    assert.deepEqual(touched, [`supabase/functions/${slug}/index.ts`, "supabase/functions/_shared/personalMemoryPolicy.js"].sort(), `${slug}: nothing else changes`);
  }
  // the units that are NOT CL-13 only are the ones that carry other changes, and they say so
  for (const slug of ["raziel-attention", "number-researcher", "ai-analyze", "wa-raziel"]) {
    const unit = PLAN.release_units.find((u) => u.slug === slug);
    assert.ok(unit.ships_together.m0.length + unit.ships_together.other.length > 0, `${slug}: carries more than CL-13 and says what`);
  }
  assert.deepEqual(PLAN.release_sequence.map((s) => s.unit), ["U1", "U2", "U3", "U4"]);
  assert.deepEqual(PLAN.release_sequence.find((s) => s.unit === "U3").functions.sort(), ["ai-analyze", "number-researcher", "wa-raziel"]);
  assert.equal(PLAN.alternative_requiring_a_decision.id, "D-ORDER"); assert.ok(PLAN.missing_decisions.some((d) => d.id === "D-ORDER" && /Codex/.test(d.who)));
  assert.match(first.not_an_approval, /not an approval/);
});

test("negative control: a bundle file that changes without the plan being updated is detected", () => {
  const unit = PLAN.release_units.find((u) => u.slug === "wa-hatishbi");
  const files = bundleFiles("supabase/functions/wa-hatishbi/index.ts");
  const changed = Buffer.concat([files.get("supabase/functions/wa-hatishbi/index.ts"), Buffer.from("\n// edited\n")]);
  assert.notEqual(sha(changed), unit.bundle_at_review_point.find((f) => f.path.endsWith("wa-hatishbi/index.ts")).sha256);
});

test("round 8: the plan states the research rule with the two cases of Codex, the enforcement of research_output_write, and the minimal release of wa-raziel", () => {
  const r = PLAN.research_eligibility;
  assert.match(r.rule, /POSITIVELY|attested by ONE of/); assert.match(r.rule, /approval/); assert.match(r.rule, /curated_source/); assert.match(r.rule, /verse/);
  assert.deepEqual(Object.keys(r.codex_cases).sort(), ["a_sentence_no_pattern_sees", "depression_sentence", "verse_analysis"]);
  assert.match(r.research_output_write, /writer function and in the trigger/); assert.match(r.effect_on_live_rows, /383/); assert.match(r.effect_on_live_rows, /72/); assert.match(r.effect_on_live_rows, /311/);
  assert.ok(PLAN.missing_decisions.some((d) => d.id === "D-RESEARCH-SOURCES") && PLAN.missing_decisions.some((d) => d.id === "D-RESEARCH-APPROVAL"));
  const w = PLAN.wa_raziel_minimal_release;
  assert.ok(w.minimal_conditions.length >= 7); assert.ok(w.minimal_conditions.some((c) => /ZURIEL_WA/.test(c)) && w.minimal_conditions.some((c) => /D-CARRY/.test(c)) && w.minimal_conditions.some((c) => /drift gate/.test(c)));
  assert.ok(w.what_it_does_not_prove.some((c) => /U1 does not close the active collection/.test(c)));
  assert.match(PLAN.edge_before_database, /all six Edge functions before the database step/);
  assert.equal(PLAN.release_sequence.find((s) => s.unit === "U1").closes_live_collection, false, "U1 is not the closing of the active collection");
});
