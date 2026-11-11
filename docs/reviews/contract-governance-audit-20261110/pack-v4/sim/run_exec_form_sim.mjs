// Equivalence + safety simulation for the EXECUTION FORM (10e_/19e_) against the approved 10_/19_.
// Local PGlite only (PostgreSQL 16 in memory). Never connects to the live DB.
import { freshDb, read, md5, one, all, tryExec, check, results } from "./harness.mjs";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const EX = new URL("../", import.meta.url).pathname;
const sha = (p) => createHash("sha256").update(readFileSync(EX + p)).digest("hex");
const summary = JSON.parse(read("out/p0_summary.json"));
const form = JSON.parse(read("out/exec_form_summary.json"));
const RULES = Object.entries(summary.rules).map(([rule_id, s]) => ({ rule_id, v: s.from }));
const CODEX = [{ id: 4, slug: "publishing_conventions" }, { id: 9, slug: "branches_deploy" }];
const S10 = read("sql/10_p0_release_policy.sql"), S19 = read("sql/19_p0_release_policy_ROLLBACK.sql");
const E10 = read("sql/10e_p0_release_policy_EXEC.sql"), E19 = read("sql/19e_p0_release_policy_ROLLBACK_EXEC.sql");
const base = () => freshDb({ rules: RULES, codex: CODEX });

// content snapshot (ids/timestamps excluded) — used to compare two databases
async function content(db) {
  const n = await all(db, `select rule_id, rule_version, is_active, supersedes_version, label, description, metadata::text meta,
      depends_on, weight, hebrew_date, axis_theme, gallery_id, identity_key, type from public.nodes order by rule_id, rule_version`);
  const c = await all(db, "select id, slug, title, category, body, priority from public.project_codex order by id");
  return JSON.stringify({ n, c });
}
// full snapshot (with ids/timestamps) — proves that a refused run wrote nothing at all
async function full(db) {
  const n = await all(db, "select to_jsonb(x)::text j from public.nodes x order by id");
  const c = await all(db, "select to_jsonb(x)::text j from public.project_codex x order by id");
  return md5(JSON.stringify([n, c]));
}
async function endState(db) {
  const out = {};
  for (const [rid] of Object.entries(summary.rules)) {
    out[rid] = await all(db, "select rule_version v, md5(description) d, md5(metadata::text) m, is_active a from public.nodes where rule_id=$1 order by rule_version", [rid]);
  }
  for (const c of CODEX) out[c.slug] = (await one(db, "select md5(body) b from public.project_codex where id=$1", [c.id])).b;
  return out;
}

// 0. artifacts
check("10_ SHA-256 = approved d1ac658b…", sha("sql/10_p0_release_policy.sql") === "d1ac658b6e2ace922ac5d32a3021f6ef8aa88dc06390b05aca095da0d48963fb");
check("19_ SHA-256 = approved cbe420f7…", sha("sql/19_p0_release_policy_ROLLBACK.sql") === "cbe420f72e2ad43bcf244aee1e49dd363ead9f4d1b499000c2ebc3adc0b0d9c4");
check("10e_ SHA-256 = build summary", sha("sql/10e_p0_release_policy_EXEC.sql") === form["10e_p0_release_policy_EXEC.sql"].sha256);
check("19e_ SHA-256 = build summary", sha("sql/19e_p0_release_policy_ROLLBACK_EXEC.sql") === form["19e_p0_release_policy_ROLLBACK_EXEC.sql"].sha256);
check("10e_ is a single statement (one DO block, no BEGIN/COMMIT)", (E10.match(/^do \$sod_p0e\$$/gm) || []).length === 1 && !/^\s*(begin|commit)\s*;/im.test(E10));
check("19e_ is a single statement (one DO block, no BEGIN/COMMIT)", (E19.match(/^do \$sod_rbe\$$/gm) || []).length === 1 && !/^\s*(begin|commit)\s*;/im.test(E19));

// 1. equivalence: 10_ and 10e_ on identical bases give an identical end state
const A = await base(), B = await base();
const baseContent = await content(A);
const ra = await tryExec(A, S10), rb = await tryExec(B, E10);
check("10_ applies on the reviewed base", ra.ok, ra.error || "");
check("10e_ applies on the reviewed base", rb.ok, rb.error || "");
check("EQUIVALENCE: 10e_ end state = 10_ end state (labels, texts, metadata, versions, flags, codex bodies)", (await content(A)) === (await content(B)));
const es = await endState(B);
for (const [rid, s] of Object.entries(summary.rules)) {
  const act = es[rid].filter(r => r.a);
  check(`${rid}: one active row v${s.to} with md5 ${s.new_md5.slice(0, 8)}…`, act.length === 1 && act[0].v === s.to && act[0].d === s.new_md5);
  check(`${rid}: metadata md5 = 10_ literal (${form.targets[rid].meta_new_md5.slice(0, 8)}…)`, act[0]?.m === form.targets[rid].meta_new_md5);
}
for (const [slug, s] of Object.entries(summary.codex)) check(`codex ${slug}: body md5 = ${s.new_md5.slice(0, 8)}…`, es[slug] === s.new_md5);
const upd = await one(B, "select bool_and(updated_at > '2026-01-02') u from public.project_codex");
check("codex updated_at refreshed (as in 10_)", upd.u === true);

// 2. acceptance scan on the resulting ACTIVE texts (same patterns as run_p0_sim)
const active = await all(B, "select rule_id, description from public.nodes where type='rule' and is_active");
const codex = await all(B, "select slug, body from public.project_codex");
const grants = [/STANDING AUTHORIZATION\. ZURIEL grants standing/i, /RELEASE WHEN READY, NOT WHEN ASKED/i, /A separate “תעלה” \/ “העלה” message is no longer required/i,
  /proceeds through merge\/migration\/deploy\/live verification without a second user prompt/i, /כל push ל-main = פריסת Vercel/, /under deploy_on_request v2 standing authorization/i];
for (const p of grants) {
  const hits = active.filter(r => p.test(r.description)).map(r => r.rule_id).concat(codex.filter(c => p.test(c.body)).map(c => "codex:" + c.slug));
  check(`no active text grants standing release authorization: ${p.source.slice(0, 50)}`, hits.length === 0, hits.join(","));
}
const dor = active.find(r => r.rule_id === "deploy_on_request").description;
check("Raziel 600-char window of deploy_on_request states explicit approval + 2029", /אישור מפורש/.test(dor.slice(0, 600)) && /2029/.test(dor.slice(0, 600)));
check("canary gate preserved in deploy_on_request v4", /sod1820\/post-deploy-canary/.test(dor) && /fn_release_canary_override/.test(dor));

// 3. second run is refused and writes nothing
{
  const before = await full(B);
  const r = await tryExec(B, E10);
  check("10e_ second run refused (v4 already active)", !r.ok && /expected v3/.test(r.error), (r.error || "").slice(0, 90));
  check("refused second run wrote nothing", (await full(B)) === before);
}

// 4. rollback: 19e_ after 10e_ restores the base; 19_ after 10e_ and 19e_ after 10_ are interchangeable
{
  const r = await tryExec(B, E19);
  check("19e_ rollback runs after 10e_", r.ok, r.error || "");
  const s = await endState(B);
  for (const [rid, x] of Object.entries(summary.rules)) {
    const act = s[rid].filter(z => z.a);
    check(`rollback ${rid}: base v${x.from} single active with base md5; v${x.to} kept inactive`, act.length === 1 && act[0].v === x.from && act[0].d === x.base_md5 && s[rid].some(z => z.v === x.to && !z.a));
  }
  for (const [slug, x] of Object.entries(summary.codex)) check(`rollback codex ${slug}: exact base body`, s[slug] === x.base_md5);
  const cnt = await one(B, "select count(*)::int n from public.nodes");
  check("no row deleted (rules: predecessor + base + new = 3 each)", cnt.n === RULES.length * 3, String(cnt.n));
  const re = await tryExec(B, E10);
  check("re-applying 10e_ after rollback is refused (a version above the base exists)", !re.ok && /already exists/.test(re.error), (re.error || "").slice(0, 90));
  const re2 = await tryExec(B, S10);
  check("re-applying 10_ after rollback is refused as well", !re2.ok && /already exists/.test(re2.error));
  // compare with 19_ after 10_
  const r19 = await tryExec(A, S19);
  check("19_ rollback runs after 10_", r19.ok, r19.error || "");
  check("EQUIVALENCE: content after 10e_+19e_ = after 10_+19_", (await content(A)) === (await content(B)));
  const C = await base(); await tryExec(C, E10); const x1 = await tryExec(C, S19);
  check("cross: 19_ rolls back 10e_", x1.ok, x1.error || "");
  const D = await base(); await tryExec(D, S10); const x2 = await tryExec(D, E19);
  check("cross: 19e_ rolls back 10_", x2.ok, x2.error || "");
  check("cross: both cross-rollbacks give the same content", (await content(C)) === (await content(D)));
  await C.close(); await D.close();
}
await A.close(); await B.close();

// 5. drift refusals: any change in any of the six live rows stops everything, nothing written
const drifts = [
  ["deploy_on_request description", "update public.nodes set description = description || ' ' where rule_id='deploy_on_request' and is_active"],
  ["inter_agent_coordination_law description", "update public.nodes set description = replace(description, 'OWNER CHECK', 'OWNER  CHECK') where rule_id='inter_agent_coordination_law' and is_active"],
  ["foundation_closure_protocol_law metadata", "update public.nodes set metadata = metadata || '{\"x\":1}' where rule_id='foundation_closure_protocol_law' and is_active"],
  ["system_suggestions_law newer version exists", "insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,supersedes_version) select 'rule','x','x',metadata,false,'system_suggestions_law',6,5 from public.nodes where rule_id='system_suggestions_law' and is_active"],
  ["codex #4 concurrent edit", "update public.project_codex set body = body || ' (concurrent edit)' where id=4"],
  ["codex #9 concurrent edit", "update public.project_codex set body = replace(body, 'Safety', 'Safety ') where id=9"],
];
for (const [name, sql] of drifts) {
  const d = await base();
  await d.exec(sql);
  const before = await full(d);
  const r = await tryExec(d, E10);
  check(`drift (${name}) refuses 10e_`, !r.ok && /(drift|already exists|expected v)/.test(r.error), (r.error || "").slice(0, 80));
  check(`drift (${name}): nothing written`, (await full(d)) === before);
  await d.close();
}

// 6. cut-off file: any truncation inside the statement is a syntax error and writes nothing
{
  const cuts = [0.02, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 0.98].map(f => Math.floor(E10.length * f));
  cuts.push(E10.lastIndexOf("end\n$sod_p0e$;"), E10.length - 4);
  let allSafe = true;
  for (const at of cuts) {
    const d = await base(); const before = await full(d);
    const r = await tryExec(d, E10.slice(0, at));
    const safe = !r.ok && (await full(d)) === before;
    if (!safe) allSafe = false;
    await d.close();
  }
  check(`truncated 10e_ at ${cuts.length} points: every run fails and writes nothing`, allSafe);
  const d = await base(); const r = await tryExec(d, E10.slice(0, E10.length - 2));
  check("10e_ without its final ';' still is the complete statement (applies fully, not partially)", r.ok && (await endState(d)).deploy_on_request.some(z => z.v === 4 && z.a));
  await d.close();
}

// 7. one-character transcription errors are caught
{
  const newStart = E10.indexOf("$sod_frag$, $sod_frag$") + "$sod_frag$, $sod_frag$".length;   // replacement text of fragment 1
  const newEnd = E10.indexOf("$sod_frag$", newStart);
  check("flip point lies inside the replacement text of fragment 1", newEnd - newStart > 200);
  const at1 = newStart + 120;
  const flipNew = E10.slice(0, at1) + (E10[at1] === "a" ? "b" : "a") + E10.slice(at1 + 1);
  const firstOld = E10.indexOf("$sod_frag$") + 20;
  const flipOld = E10.slice(0, firstOld) + (E10[firstOld] === "a" ? "b" : "a") + E10.slice(firstOld + 1);
  const metaAt = E10.indexOf("$sod_meta${") + 15;
  const flipMeta = E10.slice(0, metaAt) + (E10[metaAt] === "a" ? "b" : "a") + E10.slice(metaAt + 1);
  for (const [name, txt, re] of [["replacement text", flipNew, /rebuilt text differs/], ["anchor text", flipOld, /not found|rebuilt text differs/], ["metadata delta", flipMeta, /rebuilt metadata differs|invalid input syntax|json/i]]) {
    const d = await base(); const before = await full(d);
    const r = await tryExec(d, txt);
    check(`one-character error in the ${name} is refused`, !r.ok && re.test(r.error), (r.error || "").slice(0, 90));
    check(`one-character error in the ${name}: nothing written`, (await full(d)) === before);
    await d.close();
  }
}

// 8. rollback refusals
{
  const d = await base(); const before = await full(d);
  const r = await tryExec(d, E19);
  check("19e_ on the unapplied base is refused and writes nothing", !r.ok && (await full(d)) === before, (r.error || "").slice(0, 80));
  await d.close();
  const e = await base(); await tryExec(e, E10);
  await e.exec("update public.project_codex set body = body || ' (later edit)' where id=4");
  const b2 = await full(e);
  const r2 = await tryExec(e, E19);
  check("19e_ refuses if codex #4 was edited after the apply (rollback window closed) and writes nothing", !r2.ok && /not the applied version/.test(r2.error) && (await full(e)) === b2);
  const r3 = await tryExec(e, S19);
  check("19_ refuses in the same situation", !r3.ok && /not the applied version/.test(r3.error));
  await e.close();
  const f = await base(); await tryExec(f, E10);
  const at = E19.indexOf("$sod_frag$", E19.indexOf("v_ops := array[")) + 30;
  const bad = E19.slice(0, at) + (E19[at] === "a" ? "b" : "a") + E19.slice(at + 1);
  const b3 = await full(f);
  const r4 = await tryExec(f, bad);
  check("one-character error in 19e_ is refused and writes nothing", !r4.ok && (await full(f)) === b3, (r4.error || "").slice(0, 80));
  await f.close();
}

writeFileSync(EX + "out/sim_exec_form_results.json", JSON.stringify(results, null, 1));
const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
