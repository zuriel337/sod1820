// Simulate stage-2/3 proposals (20, 21, 22, 30 + rollbacks) on a local in-memory copy. Never touches the live DB.
import { freshDb, read, md5, one, all, tryExec, check, results } from "./harness.mjs";
import { writeFileSync } from "node:fs";

const S = JSON.parse(read("out/stage2_summary.json"));
const specs = JSON.parse(read("base/spec/_specs.json"));
const RULES = [
  { rule_id: "platform_tiers_law", v: 5 }, { rule_id: "canonical_methods_registry_law", v: 6 },
  { rule_id: "number_page_law", v: 1 }, { rule_id: "no_row_without_number_law", v: 1 },
];
const CODEX = [{ id: 2, slug: "project_overview" }, { id: 3, slug: "data_model_map" }, { id: 8, slug: "system_rules_index" }, { id: 13, slug: "number_page_1820" }];

async function setup() {
  const db = await freshDb({ rules: RULES, codex: CODEX });
  for (const s of specs) {
    await db.query("insert into public.nodes (id,type,label,description,metadata,is_active) values ($1,'spec',$2,$3,$4::jsonb,true)",
      [s.id, s.label, read(`base/spec/${s.id}.txt`), JSON.stringify(s.metadata)]);
  }
  return db;
}

const db = await setup();
const early = await tryExec(db, read("sql/30_STAGE3_retire_number_laws.sql"));
check("stage 3 refuses to run before the principles are carried (successor guard)", !early.ok && /successor missing/.test(early.error), early.error?.slice(0, 90));
const still = await all(db, "select rule_id from public.nodes where is_active and rule_id in ('number_page_law','no_row_without_number_law')");
check("after the refusal both number laws are still active", still.length === 2);

const a20 = await tryExec(db, read("sql/20_number_principles_to_2029_owners.sql"));
check("20 (principles → v6/v7) applies on the reviewed base", a20.ok, a20.error || "");
for (const rid of ["platform_tiers_law", "canonical_methods_registry_law"]) {
  const r = await one(db, "select rule_version v, md5(description) d, metadata from public.nodes where rule_id=$1 and is_active", [rid]);
  check(`${rid}: v${S[rid].to} active with reviewed md5`, r.v === S[rid].to && r.d === S[rid].new_md5);
  check(`${rid}: governed metadata kept`, !!(r.metadata.g3_disposition_v1 && r.metadata.compaction_v1 && r.metadata.owner_routing));
}
const pt = await one(db, "select description from public.nodes where rule_id='platform_tiers_law' and is_active");
check("platform_tiers_law v6 states «המספר לא מוסתר, העומק כן» and no permission change", /המספר לא מוסתר, העומק כן/.test(pt.description) && /NO PERMISSION CHANGE/.test(pt.description));
check("platform_tiers_law v6 does not carry the quota or the tier name as rules", /are not carried/.test(pt.description));
const cm = await one(db, "select description from public.nodes where rule_id='canonical_methods_registry_law' and is_active");
check("canonical_methods_registry_law v7 keeps the authored-content truth boundary", /an authored phrase without an authored value is shown without a number/.test(cm.description));

const a30 = await tryExec(db, read("sql/30_STAGE3_retire_number_laws.sql"));
check("stage 3 applies once successors are active", a30.ok, a30.error || "");
const gone = await all(db, "select rule_id, is_active, md5(description) d, metadata->>'immutable' imm from public.nodes where rule_id in ('number_page_law','no_row_without_number_law')");
check("both number laws inactive, rows kept with unchanged content", gone.length === 2 && gone.every(g => g.is_active === false) &&
  gone.find(g => g.rule_id === "number_page_law").d === S.stage3.number_page_law_md5 && gone.find(g => g.rule_id === "no_row_without_number_law").d === S.stage3.no_row_without_number_law_md5);

const a21 = await tryExec(db, read("sql/21_retire_9_legacy_specs.sql"));
check("21 (9 Legacy specs) applies", a21.ok, a21.error || "");
const sp = await all(db, "select label, is_active from public.nodes where type='spec'");
check("exactly 9 specs inactive, bnei_haheichal still active, all 10 rows kept", sp.length === 10 && sp.filter(s => !s.is_active).length === 9 && sp.find(s => s.label.startsWith("בני ההיכל")).is_active === true);

const a22 = await tryExec(db, read("sql/22_codex_stale_banners.sql"));
check("22 (STALE banners) applies", a22.ok, a22.error || "");
for (const c of CODEX) {
  const r = await one(db, "select body from public.project_codex where id=$1", [c.id]);
  const base = read(`base/codex/${String(c.id).padStart(2, "0")}_${c.slug}.txt`);
  check(`codex ${c.slug}: banner prepended, original body intact`, r.body.startsWith("⚠️ STALE") && r.body.endsWith(base) && md5(r.body) === S["codex_" + c.slug].new_md5);
}

for (const [f, name] of [["sql/27_codex_stale_banners_ROLLBACK.sql", "27"], ["sql/28_retire_9_legacy_specs_ROLLBACK.sql", "28"], ["sql/39_STAGE3_retire_number_laws_ROLLBACK.sql", "39"], ["sql/29_number_principles_ROLLBACK.sql", "29"]]) {
  const r = await tryExec(db, read(f));
  check(`rollback ${name} runs`, r.ok, r.error || "");
}
for (const r of RULES) {
  const a = await one(db, "select rule_version v, md5(description) d from public.nodes where rule_id=$1 and is_active", [r.rule_id]);
  check(`after rollbacks ${r.rule_id} v${r.v} active again with base md5`, a && a.v === r.v && a.d === md5(read(`base/rules/${r.rule_id}@v${r.v}.txt`)));
}
const sp2 = await all(db, "select is_active from public.nodes where type='spec'");
check("after rollback all 10 specs active again", sp2.every(s => s.is_active === true));
for (const c of CODEX) {
  const r = await one(db, "select md5(body) b from public.project_codex where id=$1", [c.id]);
  check(`after rollback codex ${c.slug} body = base`, r.b === md5(read(`base/codex/${String(c.id).padStart(2, "0")}_${c.slug}.txt`)));
}
await db.close();

// drift: a concurrent change to a spec stops 21 with nothing applied
{
  const d2 = await setup();
  await d2.exec("update public.nodes set description = description || ' x' where type='spec' and label like 'שורת פעילות חיה%'");
  const r = await tryExec(d2, read("sql/21_retire_9_legacy_specs.sql"));
  check("21 refuses when a spec row changed", !r.ok && /spec drift/.test(r.error), r.error?.slice(0, 80));
  const act = await one(d2, "select count(*)::int n from public.nodes where type='spec' and is_active");
  check("after refusal all 10 specs still active", act.n === 10);
  await d2.close();
}
writeFileSync(new URL("../out/sim_stage2_results.json", import.meta.url), JSON.stringify(results, null, 1));
const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
