// End-to-end local simulation of every proposal in the recommended order, acceptance scans on the final state,
// then the full reverse rollback back to the exact base. In-memory PGlite only — never the live DB.
import { freshDb, read, md5, one, all, tryExec, check, results } from "./harness.mjs";
import { writeFileSync } from "node:fs";

const RULES = [
  ["deploy_on_request", 3], ["inter_agent_coordination_law", 17], ["foundation_closure_protocol_law", 7], ["system_suggestions_law", 5],
  ["platform_tiers_law", 5], ["canonical_methods_registry_law", 6], ["number_page_law", 1], ["no_row_without_number_law", 1],
  ["worlds_color_law", 1], ["subscription_funnel_law", 22], ["experience_governance_foundation_v1_law", 10], ["identity_architecture_law", 1],
  ["brand_spelling_law", 1], ["canonical_colors_law", 2], ["logo_integrity_law", 3], ["sod1820_canonical_identity_law", 5], ["research_workspace_law", 5],
].map(([rule_id, v]) => ({ rule_id, v }));
const CODEX = [[1, "_index"], [2, "project_overview"], [3, "data_model_map"], [4, "publishing_conventions"], [5, "gematria_engine"], [8, "system_rules_index"],
  [9, "branches_deploy"], [12, "golden_entities"], [13, "number_page_1820"], [15, "convergence_law"], [30, "experience_governance_foundation_v1"],
  [37, "sod1820_reality_stream_os_master_v3_20261016_draft"]].map(([id, slug]) => ({ id, slug }));
const specs = JSON.parse(read("base/spec/_specs.json"));

const db = await freshDb({ rules: RULES, codex: CODEX, fns: ["admin_suggestion_decide"] });
for (const s of specs) await db.query("insert into public.nodes (id,type,label,description,metadata,is_active) values ($1,'spec',$2,$3,$4::jsonb,true)", [s.id, s.label, read(`base/spec/${s.id}.txt`), JSON.stringify(s.metadata)]);
const baseState = async () => ({
  rules: await all(db, "select rule_id, rule_version v, is_active a, md5(description) d, md5(metadata::text) m from public.nodes where type='rule' order by 1,2"),
  codex: await all(db, "select id, md5(body) b from public.project_codex order by 1"),
  specs: await all(db, "select id::text, is_active a from public.nodes where type='spec' order by 1"),
  fn: (await one(db, "select md5(pg_get_functiondef('public.admin_suggestion_decide(bigint,text,text)'::regprocedure)) m")).m,
});
const before = await baseState();
const BASE_NODE_COUNT = (await one(db, "select count(*)::int n from public.nodes")).n;
const S = { p0: JSON.parse(read("out/p0_summary.json")), s2: JSON.parse(read("out/stage2_summary.json")), gb: JSON.parse(read("out/groupB_summary.json")) };
const REVIEWED_CODEX = {
  publishing_conventions: S.p0.codex.publishing_conventions.new_md5, branches_deploy: S.p0.codex.branches_deploy.new_md5,
  project_overview: S.s2.codex_project_overview.new_md5, data_model_map: S.s2.codex_data_model_map.new_md5,
  system_rules_index: S.s2.codex_system_rules_index.new_md5, number_page_1820: S.s2.codex_number_page_1820.new_md5,
  _index: S.gb.codex._index.new_md5, experience_governance_foundation_v1: S.gb.codex.experience_governance_foundation_v1.new_md5,
  convergence_law: S.gb.codex.convergence_law.new_md5, gematria_engine: S.gb.codex.gematria_engine.new_md5, golden_entities: S.gb.codex.golden_entities.new_md5,
  sod1820_reality_stream_os_master_v3_20261016_draft: md5(read("base/codex/37_plan37.txt") + read("new/codex/37_plan37_appended_record_12_58.txt")),
};

const ORDER = ["10_p0_release_policy", "11_admin_suggestion_decide_text", "20_number_principles_to_2029_owners", "23_shared_contracts_groupB",
  "24_design_v1_v2_alignment", "21_retire_9_legacy_specs", "22_codex_stale_banners", "30_STAGE3_retire_number_laws", "50_plan37_series_decisions_6_7"];
for (const f of ORDER) {
  const r = await tryExec(db, read(`sql/${f}.sql`));
  check(`apply ${f}`, r.ok, r.error || "");
}

// ---- acceptance on the final simulated state ----
const active = await all(db, "select rule_id, rule_version v, description, metadata::text meta from public.nodes where type='rule' and is_active");
const codex = await all(db, "select slug, body from public.project_codex");
const texts = active.map(r => ["rule:" + r.rule_id, r.description]).concat(codex.map(c => ["codex:" + c.slug, c.body]));
const grant = [/STANDING AUTHORIZATION\. ZURIEL grants standing/i, /RELEASE WHEN READY, NOT WHEN ASKED/i, /without a second user prompt\.$/m,
  /standing Human-Gate authorization under deploy_on_request v2 permits/i, /no writer overlap under deploy_on_request v2/i, /כל push ל-main = פריסת Vercel/];
for (const p of grant) { const h = texts.filter(([, t]) => p.test(t)).map(([n]) => n); check(`[1] no active standing-authorization grant: ${p.source.slice(0, 48)}`, h.length === 0, h.join(",")); }
const legacyProd = [/CURRENT PRODUCTION = legacy\/transitional until explicit cutover; TARGET/, /^- `main` = production\.$/m, /\(Legacy, 2029, או אחר\)/, /לרבות Legacy אם הוזכר/,
  /Public product language\/visual language\/typography\/icons → SOD1820_DESIGN_CONTRACT_V1\.md\./];
for (const p of legacyProd) { const h = texts.filter(([, t]) => p.test(t)).map(([n]) => n); check(`[2] agents are not routed to Legacy as Production/owner: ${p.source.slice(0, 48)}`, h.length === 0, h.join(",")); }
const sp = await all(db, "select label, is_active from public.nodes where type='spec'");
check("[3] 9 Legacy specs inactive, rows kept; bnei_haheichal active", sp.length === 10 && sp.filter(s => !s.is_active).length === 9 && sp.find(s => s.label.startsWith("בני ההיכל")).is_active);
const pt = active.find(r => r.rule_id === "platform_tiers_law"), cm = active.find(r => r.rule_id === "canonical_methods_registry_law");
check("[4] number principles live in active 2029 owners", pt?.v === 6 && /המספר לא מוסתר, העומק כן/.test(pt.description) && cm?.v === 7 && /VALUE BESIDE A GEMATRIA MATCH ROW/.test(cm.description));
check("[4] the two Legacy number laws are inactive only after their successors are active", !active.some(r => ["number_page_law", "no_row_without_number_law"].includes(r.rule_id)));
const allSql = ORDER.map(f => read(`sql/${f}.sql`)).join("\n");
check("[5] no proposal touches gematria_words / wa_word_review (2,894 pending words untouched)", !/gematria_words|wa_word_review/i.test(allSql.replace(/--.*$/gm, "").replace(/\$sod_txt\$[\s\S]*?\$sod_txt\$/g, "").replace(/\$sod_meta\$[\s\S]*?\$sod_meta\$/g, "")));
check("[6] «בני ההיכל» spec untouched (label/description unchanged)", (await one(db, "select md5(description) d from public.nodes where type='spec' and label like 'בני ההיכל%'")).d === specs.find(s => s.label.startsWith("בני ההיכל")).d_md5);
check("[7] no DELETE / TRUNCATE / DROP statement in any proposal", !/\b(delete\s+from|truncate|drop\s+(table|function|index|view))\b/i.test(allSql.replace(/\$sod_txt\$[\s\S]*?\$sod_txt\$/g, "").replace(/\$sod_meta\$[\s\S]*?\$sod_meta\$/g, "")));
const counts = await one(db, "select (select count(*) from public.nodes)::int n, (select count(*) from public.project_codex)::int c");
const NEW_VERSIONS = 15; // P0 4 + principles 2 + group B 4 + design 5
check("[7] row counts only grow by the new versions; nothing removed", counts.n === BASE_NODE_COUNT + NEW_VERSIONS && counts.c === CODEX.length, JSON.stringify({ ...counts, base: BASE_NODE_COUNT }));
for (const c of CODEX) {
  const b = read(`base/codex/${String(c.id).padStart(2, "0")}_${c.slug}.txt`);
  const now = codex.find(x => x.slug === c.slug).body;
  // every original line that is not an intended edit target must still be present
  const reviewed = REVIEWED_CODEX[c.slug];
  check(`[7] codex ${c.slug}: final body = the reviewed proposal (md5)`, md5(now) === reviewed, `${b.split("\n").filter(l => l.length > 40 && !now.includes(l)).length} edited lines`);
}

const f11 = read("base/codex/09_branches_deploy.txt").split("\n").slice(44, 53);
check("[7] branches_deploy rewrite keeps the F11 provenance lines verbatim", f11.every(l => codex.find(x => x.slug === "branches_deploy").body.includes(l)));

// ---- v2 checks (11.11.2026): successor wording, Raziel window, frozen exemption, V1 ownership, WordPress/history data ----
check("[4b] platform_tiers_law v6 §19 keeps the original scope (foundation numbers / golden entities, subscription only)",
  /within its original scope: the display model of foundation numbers and golden entities/.test(pt.description) && !/Access, entitlement, availability and budget never hide/.test(pt.description));
check("[4b] canonical_methods_registry_law v7 §26 has no wording beyond v1 (no 'never typed by hand')", !/never typed by hand/.test(cm.description) && /the stored value, or, when none is stored, the value computed by the canonical engine at render time/.test(cm.description));
check("[4b] Raziel's 600-char window of both successors states the carried principle", /המספר לא מוסתר, העומק כן/.test(pt.description.slice(0, 600)) && /כל שורה מציגה את ערכה/.test(cm.description.slice(0, 600)));
const FROZEN49 = "ai_analyze_contract,auto_share_uses_live_post_law,big_number,brand_spelling_law,canonical_colors_law,canonical_ui_components_law,convergence_blocklist_law,corpus_admission_foundation_v1,cross_reference_is_not_disclosure,cross_vs_convergence_criteria,decimal_point_join_law,els_seed_expansion_law,els_single_engine_law,gematria_auto_registry_law,gematria_db_first_and_enrich_law,gematria_engine_law,golden_entity_law,graph_privacy_foundation_law,israel_time_law,ktiv_male_haser_repair_law,live_state_resolution_law,logo_integrity_law,master_anchor_1820_law,method_lifecycle,method_priority,mobile_acceptance_law,moment_clock_law,no_kolel_no_additions,post_system_voice_law,raw_vs_curated,raziel_full_answer_and_route_law,raziel_group_privacy_law,raziel_routing_law,raziel_voice_law,reality_stream_law,research_object_identity_invariant_law,root_exception,shared_expression_extraction_contract_v1,shitat_haechad_alef_law,signal_vs_curation,sod1820_canonical_identity_law,testimony_not_prophecy,verify_seal_manual_only,video_transcription_law,workspace_layout_standard,writer_material_home_law,zero_navigation,zero_scale_law,zuriel_surname_privacy_law".split(",");
const bumped = (await all(db, "select distinct rule_id from public.nodes where type='rule' and supersedes_version is not null and is_active")).map(r => r.rule_id);
const frozenTouched = bumped.filter(r => FROZEN49.includes(r)).sort();
check("[9] among the 49 frozen rules only the 4 exempted brand rules get a new version", JSON.stringify(frozenTouched) === JSON.stringify(["brand_spelling_law", "canonical_colors_law", "logo_integrity_law", "sod1820_canonical_identity_law"]), JSON.stringify(frozenTouched));
const v1Owner = active.filter(r => { const m = JSON.parse(r.meta); return [m.canonical_owner, m.visual_owner, m.owner_routing?.canonical_owner, m.compaction_v1?.canonical_owner].includes("SOD1820_DESIGN_CONTRACT_V1.md") || /under SOD1820_DESIGN_CONTRACT_V1\.md|extends SOD1820_DESIGN_CONTRACT_V1\.md/.test(r.description); }).map(r => r.rule_id);
check("[10] no active rule still names SOD1820_DESIGN_CONTRACT_V1.md as its owner (V1 stays only as history/previous_owner)", v1Owner.length === 0, v1Owner.join(","));
const bare = allSql.replace(/\$sod_txt\$[\s\S]*?\$sod_txt\$/g, "").replace(/\$sod_meta\$[\s\S]*?\$sod_meta\$/g, "").replace(/\$rec\$[\s\S]*?\$rec\$/g, "").replace(/\$function\$[\s\S]*?\$function\$/g, "").replace(/--.*$/gm, "");
check("[11] no proposal statement touches posts, images, media, galleries, word data or WordPress ids", !/\b(public\.)?(posts|images|media_assets|galleries|gallery_items|gematria_words|post_gematria_links|wp_[a-z_]+)\b/i.test(bare.replace(/project_codex|public\.nodes|admin_suggestion_decide/g, "")));
const p37 = codex.find(c => c.id === 37 || c.slug === "sod1820_reality_stream_os_master_v3_20261016_draft");
check("[12] PLAN37 record is appended after the untouched original text", p37 && p37.body.startsWith(read("base/codex/37_plan37.txt")) && /### 12\.58 — 11\.11\.2026/.test(p37.body.slice(-1300)));
// ---- full reverse rollback ----
for (const f of ["59_plan37_series_decisions_6_7_ROLLBACK", "39_STAGE3_retire_number_laws_ROLLBACK", "27_codex_stale_banners_ROLLBACK", "28_retire_9_legacy_specs_ROLLBACK",
  "25_design_v1_v2_alignment_ROLLBACK", "26_shared_contracts_groupB_ROLLBACK",
  "29_number_principles_ROLLBACK", "18_admin_suggestion_decide_ROLLBACK", "19_p0_release_policy_ROLLBACK"]) {
  const r = await tryExec(db, read(`sql/${f}.sql`));
  check(`rollback ${f}`, r.ok, r.error || "");
}
const after = await baseState();
const activeBefore = before.rules.filter(r => r.a).map(r => `${r.rule_id}@${r.v}:${r.d}:${r.m}`).sort().join("|");
const activeAfter = after.rules.filter(r => r.a).map(r => `${r.rule_id}@${r.v}:${r.d}:${r.m}`).sort().join("|");
check("after full rollback: active rules identical to base (version, description md5, metadata md5)", activeBefore === activeAfter);
check("after full rollback: codex bodies identical to base", JSON.stringify(before.codex) === JSON.stringify(after.codex));
check("after full rollback: spec states identical to base", JSON.stringify(before.specs) === JSON.stringify(after.specs));
check("after full rollback: admin_suggestion_decide identical to base", before.fn === after.fn);
await db.close();
writeFileSync(new URL("../out/sim_all_v2_results.json", import.meta.url), JSON.stringify(results, null, 1));
const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
