// Simulate 10_p0_release_policy.sql, its rollback, drift refusal, and 11_admin_suggestion_decide_text.sql on a local copy.
import { freshDb, read, md5, one, all, tryExec, check, results } from "./harness.mjs";
import { writeFileSync } from "node:fs";

const summary = JSON.parse(read("out/p0_summary.json"));
const RULES = Object.entries(summary.rules).map(([rule_id, s]) => ({ rule_id, v: s.from }));
const CODEX = [{ id: 4, slug: "publishing_conventions" }, { id: 9, slug: "branches_deploy" }];
const DB_META = JSON.parse(read("base/meta/_db_meta_md5.json"));

// 0. parity: local jsonb text and function reconstruction must match the live DB fingerprints
{
  const db = await freshDb({ rules: RULES, codex: CODEX, fns: ["admin_suggestion_decide"] });
  for (const r of RULES) {
    const row = await one(db, "select md5(metadata::text) m, md5(description) d from public.nodes where rule_id=$1 and is_active", [r.rule_id]);
    check(`parity metadata md5 ${r.rule_id}@v${r.v}`, row.m === DB_META[`${r.rule_id}@v${r.v}`], row.m);
    check(`parity description md5 ${r.rule_id}@v${r.v}`, row.d === summary.rules[r.rule_id].base_md5);
  }
  const f = await one(db, "select md5(pg_get_functiondef('public.admin_suggestion_decide(bigint,text,text)'::regprocedure)) m");
  check("parity admin_suggestion_decide pg_get_functiondef md5 = live", f.m === md5(read("base/fn/admin_suggestion_decide.sql")), f.m);
  await db.close();
}

// 1. apply P0 → verify
const db = await freshDb({ rules: RULES, codex: CODEX, fns: ["admin_suggestion_decide"] });
const apply = await tryExec(db, read("sql/10_p0_release_policy.sql"));
check("P0 applies cleanly on the reviewed base", apply.ok, apply.error || "");
for (const [rid, s] of Object.entries(summary.rules)) {
  const act = await all(db, "select rule_version v, md5(description) d, supersedes_version sup, metadata from public.nodes where rule_id=$1 and is_active", [rid]);
  check(`${rid}: exactly one active row, v${s.to}`, act.length === 1 && act[0].v === s.to, JSON.stringify(act.map(a => a.v)));
  check(`${rid}: new description md5 matches the reviewed proposal`, act[0]?.d === s.new_md5);
  check(`${rid}: supersedes_version = ${s.from}`, act[0]?.sup === s.from);
  const m = act[0]?.metadata || {};
  check(`${rid}: governed metadata kept (g3/compaction/owner_routing)`, !!(m.g3_disposition_v1 && m.compaction_v1 && m.owner_routing));
  const old = await one(db, "select is_active from public.nodes where rule_id=$1 and rule_version=$2", [rid, s.from]);
  check(`${rid}: v${s.from} kept as inactive history`, old && old.is_active === false);
}
for (const [slug, s] of Object.entries(summary.codex)) {
  const row = await one(db, "select md5(body) b, updated_at > '2026-01-02' upd from public.project_codex where slug=$1", [slug]);
  check(`codex ${slug}: body md5 matches proposal`, row.b === s.new_md5);
  check(`codex ${slug}: updated_at refreshed`, row.upd === true);
}

// 2. acceptance scan on the resulting ACTIVE texts (what agents and Raziel read)
const active = await all(db, "select rule_id, description, metadata::text meta from public.nodes where type='rule' and is_active");
const codex = await all(db, "select slug, body from public.project_codex");
const grantPatterns = [
  /STANDING AUTHORIZATION\. ZURIEL grants standing/i, /RELEASE WHEN READY, NOT WHEN ASKED/i,
  /A separate “תעלה” \/ “העלה” message is no longer required/i, /proceeds through merge\/migration\/deploy\/live verification without a second user prompt/i,
  /standing Human-Gate authorization under deploy_on_request v2 permits/i, /may be released only after[^.]*under deploy_on_request v2/i,
  /כל push ל-main = פריסת Vercel/, /“תעלה” REMAINS AN OVERRIDE\/EXPEDITE COMMAND, NOT A REQUIRED TOKEN/,
];
for (const p of grantPatterns) {
  const hits = active.filter(r => p.test(r.description)).map(r => r.rule_id).concat(codex.filter(c => p.test(c.body)).map(c => "codex:" + c.slug));
  check(`no active text grants standing release authorization: ${p.source.slice(0, 60)}`, hits.length === 0, hits.join(","));
}
const metaGrant = active.filter(r => /"standing_auto_release": true/.test(r.meta) && !/"status": "STANDING_AUTO_RELEASE_REVOKED/.test(r.meta));
check("no active metadata asserts standing_auto_release=true without a revoked marker", metaGrant.length === 0, metaGrant.map(r => r.rule_id).join(","));
const legacyProd = [/CURRENT PRODUCTION = legacy\/transitional until explicit cutover; TARGET/, /main` = production\./, /מכבדים את היעד שנקבע \(Legacy, 2029, או אחר\)/, /לרבות Legacy אם הוזכר/];
for (const p of legacyProd) {
  const hits = active.filter(r => p.test(r.description)).map(r => r.rule_id).concat(codex.filter(c => p.test(c.body)).map(c => "codex:" + c.slug));
  check(`no active text treats Legacy as Production: ${p.source.slice(0, 50)}`, hits.length === 0, hits.join(","));
}
const dor = active.find(r => r.rule_id === "deploy_on_request");
check("deploy_on_request: Raziel's 600-char window states explicit approval + 2029", /אישור מפורש/.test(dor.description.slice(0, 600)) && /2029/.test(dor.description.slice(0, 600)));
check("deploy_on_request: canary gate preserved", /sod1820\/post-deploy-canary/.test(dor.description) && /fn_release_canary_override/.test(dor.description));
check("modified-date requirement kept for 2029 (re-scoped, not dropped)", /POST MODIFIED DATE REQUIRED/.test(codex.find(c => c.slug === "publishing_conventions").body) && /fetchPostsCatalog2029/.test(codex.find(c => c.slug === "publishing_conventions").body));

// 3. admin_suggestion_decide text fix, functional smoke
const fx = await tryExec(db, read("sql/11_admin_suggestion_decide_text.sql"));
check("admin_suggestion_decide proposal applies and verifies its own md5", fx.ok, fx.error || "");
await db.exec(`insert into public.system_suggestions (id, detector, observed, status) values (77, 'dependency_upgrade_radar', '{"package":"vite","current":"5.4.1","latest":"5.4.2","delta":"patch"}', 'pending')`);
await db.exec(`select public.admin_suggestion_decide(77, 'accepted', 'sim')`);
const wl = await one(db, "select open_threads, primary_owner from public.work_log order by created_at desc limit 1");
check("admin_suggestion_decide: new advice text emitted (READY_FOR_APPROVAL, no AUTO_RELEASE_NOW)", /READY_FOR_APPROVAL/.test(wl.open_threads) && !/AUTO_RELEASE_NOW/.test(wl.open_threads), wl.open_threads.slice(0, 120));
check("admin_suggestion_decide: provenance cites v4/v18", wl.primary_owner === "system_suggestions_law v3 + deploy_on_request v4 + inter_agent_coordination_law v18");

// 4. rollbacks restore the exact base
const rb2 = await tryExec(db, read("sql/18_admin_suggestion_decide_ROLLBACK.sql"));
check("admin_suggestion_decide rollback restores the live definition", rb2.ok, rb2.error || "");
const rb = await tryExec(db, read("sql/19_p0_release_policy_ROLLBACK.sql"));
check("P0 rollback runs", rb.ok, rb.error || "");
for (const [rid, s] of Object.entries(summary.rules)) {
  const act = await one(db, "select rule_version v, md5(description) d from public.nodes where rule_id=$1 and is_active", [rid]);
  check(`rollback ${rid}: base v${s.from} active again with base md5`, act.v === s.from && act.d === s.base_md5);
}
for (const [slug, s] of Object.entries(summary.codex)) {
  const row = await one(db, "select md5(body) b from public.project_codex where slug=$1", [slug]);
  check(`rollback codex ${slug}: base body restored`, row.b === s.base_md5);
}
const re = await tryExec(db, read("sql/10_p0_release_policy.sql"));
check("re-applying after rollback is refused (version above base exists) — no double version", !re.ok && /already exists/.test(re.error), re.error.slice(0, 100));
const cnt = await one(db, "select count(*)::int n from public.nodes");
check("no row was deleted at any step (rules: base + predecessor + new)", cnt.n === RULES.length * 3, String(cnt.n));
await db.close();

// 5. drift refusal: a changed live row must stop the whole batch with nothing applied
{
  const d2 = await freshDb({ rules: RULES, codex: CODEX });
  await d2.exec("update public.project_codex set body = body || ' (concurrent edit)' where slug='publishing_conventions'");
  const r = await tryExec(d2, read("sql/10_p0_release_policy.sql"));
  check("drift in publishing_conventions refuses the batch", !r.ok && /drift/.test(r.error), r.error.slice(0, 90));
  const act = await all(d2, "select rule_id, rule_version v from public.nodes where is_active order by 1");
  check("after refusal nothing changed (all base versions still active)", act.every(a => summary.rules[a.rule_id].from === a.v), JSON.stringify(act));
  await d2.close();
}
writeFileSync(new URL("../out/sim_p0_results.json", import.meta.url), JSON.stringify(results, null, 1));
const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
