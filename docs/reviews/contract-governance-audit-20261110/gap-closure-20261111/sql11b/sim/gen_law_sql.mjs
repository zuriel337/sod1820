// Generates 11c (system_suggestions_law v6 → v7) and 18c (its rollback) from the exact v6 text and metadata. Local only; never connects to
// a live database. PGlite computes the jsonb text of the new metadata, so the md5 literal is the one PostgreSQL produces.
// Output: supabase/proposed/20261111120100_system_suggestions_law_v7_decision_record_only.sql (11c)
//         supabase/proposed/ROLLBACK_20261111120100_system_suggestions_law_v7.sql (18c)
//         new/rules/system_suggestions_law@v7.txt, new/rules/system_suggestions_law@v7.meta.json, sim/law_literals.json
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { FILES, L as FN_L } from "./gen_sql.mjs";

const G = new URL("../", import.meta.url).pathname;
const ROOT = new URL("../../../../../../", import.meta.url).pathname;
const md5 = (s) => createHash("md5").update(s, "utf8").digest("hex");
const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const chars = (s) => [...s].length; // PostgreSQL char_length counts code points

const v6 = readFileSync(G + "base/rules/system_suggestions_law@v6.txt", "utf8");
const v6meta = readFileSync(G + "base/rules/system_suggestions_law@v6.meta.json", "utf8");
const v5 = readFileSync(G + "base/rules/system_suggestions_law@v5.txt", "utf8");
const BASE = { v6Md5: "98d4d88e16d2ec5f70dac6e5a7f98ea5", v6MetaMd5: "f4e5216a8eb44645ea0978b35161a82e", v6Chars: 17885,
  v5Md5: "9b5c19de501b1985da01ddfc9c646d3c", v5MetaMd5: "aa247fb211e2fec0454cb457dd4fc86d" };
if (md5(v6) !== BASE.v6Md5 || chars(v6) !== BASE.v6Chars) throw new Error("v6 text is not the live one");
if (md5(v5) !== BASE.v5Md5) throw new Error("v5 text is not the live one");

// Exact-once replacements, in text order. Everything else in the law stays byte-identical.
export const FRAGMENTS = [
  ["[UPDATE v3 · Human-Gate ZURIEL · 19.9.2026 — GOVERNED SELF-MAINTENANCE · EXTEND_EXISTING]",
   "[UPDATE v3 · Human-Gate ZURIEL · 19.9.2026 — GOVERNED SELF-MAINTENANCE · EXTEND_EXISTING · §17–§21 aligned in v7 (ZURIEL, 11.11.2026): accepting records a decision only; work starts on an explicit instruction]"],
  ["17. ACCEPT = IMPLEMENTATION HANDOFF FOR UPGRADE RADAR. When ZURIEL accepts a dependency_upgrade_radar suggestion through the existing admin_suggestion_decide Human Gate, the system may automatically create one idempotent branch-only CLAUDE maintenance assignment carrying the exact package/current/latest/delta evidence. ZURIEL is the decision owner, not the messenger.",
   "17. ACCEPT RECORDS A DECISION ONLY. When ZURIEL accepts a dependency_upgrade_radar suggestion through the existing admin_suggestion_decide Human Gate, the system records the decision and nothing more: the suggestion status, and one idempotent passive work_log record to ZURIEL carrying the exact package/current/latest/delta evidence and a task_key, with no assignment mode and no dispatch. Accepting never creates an assignment and never starts an agent. Work starts only when ZURIEL gives an explicit instruction, in a conversation, to a specific agent, citing that task_key (inter_agent_coordination_law, active version: a new activation requires an explicit user instruction). The record carries the evidence, so ZURIEL decides and instructs but never relays the details by hand."],
  ["18. PREPARATION IS NOT RELEASE. The maintenance assignment may reverify current main, update only the bounded dependency/runtime files required by the accepted suggestion, regenerate the lockfile, run tests and open a PR. The assignment itself is BRANCH_ONLY_NO_MERGE_NO_DEPLOY and never grants publication/canonicalization or production release.",
   "18. PREPARATION IS NOT RELEASE. Once instructed under §17, that agent may reverify current main, update only the bounded dependency/runtime files required by the accepted suggestion, regenerate the lockfile, run tests and open a PR. That work is BRANCH_ONLY_NO_MERGE_NO_DEPLOY; neither the work, nor the accepted suggestion, nor its record grants publication/canonicalization or production release."],
  ["Major runtime/framework upgrades remain Foundation changes: they may be prepared after Human acceptance but require Foundation redesign-risk challenge and any applicable Human Gate before release.",
   "Major runtime/framework upgrades remain Foundation changes: they may be prepared only after Human acceptance and an explicit instruction under §17, and require Foundation redesign-risk challenge and any applicable Human Gate before release."],
  ["20. STALE SUGGESTION FAILS CLOSED. The maintenance agent must re-read origin/main",
   "20. STALE SUGGESTION FAILS CLOSED. The instructed agent must re-read origin/main"],
  ["21. ONE TREE / ONE TRACE. Upgrade work reuses system_suggestions, work_log dispatch, existing GitHub/CI and release owners. No Upgrade Store, Maintenance Queue, second scheduler or second release system. Suggestion id, assignment id, branch/PR/head, tests, rollback and final live verification remain traceable.",
   "21. ONE TREE / ONE TRACE. Upgrade work reuses system_suggestions, the work_log decision record, the existing agent conversations, GitHub/CI and release owners. No Upgrade Store, Maintenance Queue, second scheduler, second dispatcher or second release system. Suggestion id, decision record and task_key, ZURIEL's instruction, branch/PR/head, tests, rollback and final live verification remain traceable."],
];
let v7 = v6;
for (const [from, to] of FRAGMENTS) {
  const n = v7.split(from).length - 1;
  if (n !== 1) throw new Error(`fragment occurs ${n} times: ${from.slice(0, 60)}`);
  v7 = v7.replace(from, () => to);
}
export const META_ADD = {
  human_gate_v7_decision_record_only: {
    changed: [
      "§17: accepting a dependency_upgrade_radar suggestion records a decision only (one passive work_log record to ZURIEL; no assignment, no dispatch)",
      "§18: preparation starts only after ZURIEL's explicit instruction to a specific agent (§17)",
      "§19: major upgrades are prepared only after acceptance and an explicit instruction",
      "§20: the maintenance agent → the instructed agent",
      "§21: trace = suggestion id, decision record and task_key, ZURIEL's instruction, branch/PR/head",
      "v3 block header marked as aligned in v7",
    ],
    decision_text: "קבלת המלצה מתעדת החלטה בלבד. התחלת עבודה דורשת הוראה מפורשת שלי לסוכן מסוים בשיחה.",
    human_gate: "ZURIEL 2026-11-11",
    owner_check: "EXTEND_EXISTING",
    no_new_system: true,
    realigns_with: "opening decision 12.7.2026: אין ביצוע אוטומטי של המלצה — קבלה = החלטה אנושית, המימוש ידני",
    supersedes: ["v3_self_maintenance_2026_09_19.accepted_upgrade_auto_handoff", "v3_self_maintenance_2026_09_19.routine_release_owner"],
    requires_function: "admin_suggestion_decide md5 " + FN_L.newMd5,
  },
};
const LABEL = "System Intelligence v7 — Resource-Aware Reliability + Explicit Release Approval + Decision-Only Acceptance";

const db = new PGlite();
const metaBase = (await db.query("select md5($1::jsonb::text) m", [v6meta])).rows[0].m;
if (metaBase !== BASE.v6MetaMd5) throw new Error("v6 metadata does not reproduce the live jsonb text: " + metaBase);
const v5meta = readFileSync(G + "base/rules/system_suggestions_law@v5.meta.json", "utf8");
if ((await db.query("select md5($1::jsonb::text) m", [v5meta])).rows[0].m !== BASE.v5MetaMd5) throw new Error("v5 metadata differs from live");
const addJson = JSON.stringify(META_ADD);
if (addJson.includes("$sod_meta$")) throw new Error("metadata contains the tag");
const merged = (await db.query("select ($1::jsonb || $2::jsonb)::text t", [v6meta, addJson])).rows[0].t;
await db.close();

const LL = {
  ...BASE,
  v7Md5: md5(v7), v7Sha256: sha256(v7), v7Chars: chars(v7), v7MetaMd5: md5(merged), label: LABEL,
  fnNewMd5: FN_L.newMd5, rulesCompanions: "deploy_on_request@4,inter_agent_coordination_law@18",
};
const fragArray = FRAGMENTS.map(([a, b]) => "    $sod_frag$" + a + "$sod_frag$, $sod_frag$" + b + "$sod_frag$").join(",\n");
for (const [a, b] of FRAGMENTS) if ((a + b).includes("$sod_frag$")) throw new Error("fragment contains the tag");
const FN = "'public.admin_suggestion_decide(bigint,text,text)'::regprocedure";

const apply = [
  "-- SOD1820 · 11c · system_suggestions_law v6 → v7: accepting a recommendation records a decision only. PROPOSAL ONLY. NOT EXECUTED.",
  "-- ZURIEL 11.11.2026: «קבלת המלצה מתעדת החלטה בלבד. התחלת עבודה דורשת הוראה מפורשת שלי לסוכן מסוים בשיחה.»",
  "-- EXTEND_EXISTING: same rule_id, new version 7; v6 stays as inactive history; nothing is deleted; no new contract or system.",
  "-- Needs its own explicit ZURIEL approval of this file's SHA-256, for one run (CLAUDE.md §0.4).",
  "-- ORDER: 2nd. Runs only after " + FILES.apply,
  "--   (check A: admin_suggestion_decide must already be the 11b result). 11b itself refuses once v7 is active, so the order is fixed.",
  "-- One statement (one DO block), so it is all or nothing. Checked inside; any mismatch raises and nothing changes:",
  "--   A. admin_suggestion_decide md5 " + LL.fnNewMd5 + " (11b applied).",
  "--   B. deploy_on_request v4 and inter_agent_coordination_law v18 are the active companions.",
  "--   C. system_suggestions_law v6 is active, description md5 " + LL.v6Md5 + ", metadata md5 " + LL.v6MetaMd5 + "; no v7 or later; v5 history intact.",
  "--   D. six exact-once fragments (§17, §18, the major-upgrade sentence of §19, §20, §21, the v3 block header) rebuild v7:",
  "--      md5 " + LL.v7Md5 + ", SHA-256 " + LL.v7Sha256 + ", " + LL.v7Chars + " characters.",
  "--   E. metadata = v6 metadata + human_gate_v7_decision_record_only; jsonb text md5 " + LL.v7MetaMd5 + ".",
  "-- After: v7 active (supersedes 6); v6 inactive and unchanged. The rule versioning guard trigger stays in force.",
  "-- Rollback: ROLLBACK_20261111120100_system_suggestions_law_v7.sql (1st of the rollback), then ROLLBACK_20261111120000_admin_suggestion_decide.sql.",
  "do $sod_11c$",
  "declare",
  "  v_ssl public.nodes%rowtype;",
  "  v_txt text; v_meta jsonb; v_ops text[]; v_pos int; i int; v_new_id uuid; v_got text;",
  "begin",
  "  perform set_config('search_path', 'public', true);",
  "  -- A. order: 11b first",
  "  v_got := md5(pg_get_functiondef(" + FN + "));",
  "  if v_got <> '" + LL.fnNewMd5 + "' then",
  "    raise exception '11c refused: admin_suggestion_decide is not the 11b result (md5 %); run 11b first', v_got;",
  "  end if;",
  "  -- B. companion laws",
  "  v_got := (select string_agg(n.rule_id||'@'||n.rule_version::text, ',' order by n.rule_id) from public.nodes n where n.type='rule' and n.is_active and n.rule_id in ('deploy_on_request','inter_agent_coordination_law'));",
  "  if v_got is distinct from '" + LL.rulesCompanions + "' then",
  "    raise exception '11c refused: companion law versions changed: %', v_got;",
  "  end if;",
  "  -- C. lock and verify v6",
  "  select * into v_ssl from public.nodes where type='rule' and rule_id='system_suggestions_law' and is_active for update;",
  "  if not found then raise exception '11c refused: system_suggestions_law has no active version'; end if;",
  "  if v_ssl.rule_version <> 6 then raise exception '11c refused: active system_suggestions_law is v% (expected v6)', v_ssl.rule_version; end if;",
  "  if md5(v_ssl.description) <> '" + LL.v6Md5 + "' then raise exception '11c refused: v6 description drift (md5 %)', md5(v_ssl.description); end if;",
  "  if md5(v_ssl.metadata::text) <> '" + LL.v6MetaMd5 + "' then raise exception '11c refused: v6 metadata drift (md5 %)', md5(v_ssl.metadata::text); end if;",
  "  if exists (select 1 from public.nodes where type='rule' and rule_id='system_suggestions_law' and rule_version > 6) then",
  "    raise exception '11c refused: a system_suggestions_law version above v6 already exists';",
  "  end if;",
  "  if (select count(*) from public.nodes where type='rule' and rule_id='system_suggestions_law' and rule_version=5 and not is_active and md5(description)='" + LL.v5Md5 + "') <> 1 then",
  "    raise exception '11c refused: v5 history row missing or changed';",
  "  end if;",
  "  -- D. rebuild the text: each fragment must occur exactly once",
  "  v_txt := v_ssl.description;",
  "  v_ops := array[",
  fragArray,
  "  ];",
  "  for i in 1 .. coalesce(array_length(v_ops, 1), 0) by 2 loop",
  "    v_pos := strpos(v_txt, v_ops[i]);",
  "    if v_pos = 0 then raise exception '11c refused: fragment % not found', (i + 1) / 2; end if;",
  "    if strpos(substr(v_txt, v_pos + 1), v_ops[i]) > 0 then raise exception '11c refused: fragment % not unique', (i + 1) / 2; end if;",
  "    v_txt := overlay(v_txt placing v_ops[i + 1] from v_pos for char_length(v_ops[i]));",
  "  end loop;",
  "  if md5(v_txt) <> '" + LL.v7Md5 + "' or encode(sha256(convert_to(v_txt, 'UTF8')), 'hex') <> '" + LL.v7Sha256 + "' or char_length(v_txt) <> " + LL.v7Chars + " then",
  "    raise exception '11c refused: rebuilt v7 text differs from the reviewed literal (md5 %)', md5(v_txt);",
  "  end if;",
  "  -- E. metadata",
  "  v_meta := v_ssl.metadata || $sod_meta$" + addJson + "$sod_meta$::jsonb;",
  "  if md5(v_meta::text) <> '" + LL.v7MetaMd5 + "' then raise exception '11c refused: rebuilt v7 metadata differs (md5 %)', md5(v_meta::text); end if;",
  "  -- F. version swap (v6 kept as inactive history)",
  "  update public.nodes set is_active=false where id=v_ssl.id;",
  "  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)",
  "  values ('rule', $sod_lbl$" + LABEL + "$sod_lbl$, v_txt, v_meta, true, 'system_suggestions_law', 7,",
  "          v_ssl.depends_on, 6, v_ssl.weight, v_ssl.hebrew_date, v_ssl.axis_theme, v_ssl.gallery_id, v_ssl.identity_key)",
  "  returning id into v_new_id;",
  "  -- G. end state",
  "  if (select count(*) from public.nodes where id=v_new_id and is_active and rule_version=7 and supersedes_version=6 and md5(description)='" + LL.v7Md5 + "' and md5(metadata::text)='" + LL.v7MetaMd5 + "') <> 1 then",
  "    raise exception '11c failed after apply: v7 row not as reviewed; the statement is rolled back';",
  "  end if;",
  "  if (select count(*) from public.nodes where type='rule' and rule_id='system_suggestions_law' and is_active) <> 1 then",
  "    raise exception '11c failed after apply: active version count is not 1; the statement is rolled back';",
  "  end if;",
  "  if (select count(*) from public.nodes where id=v_ssl.id and not is_active and md5(description)='" + LL.v6Md5 + "' and md5(metadata::text)='" + LL.v6MetaMd5 + "') <> 1 then",
  "    raise exception '11c failed after apply: v6 not kept as unchanged inactive history; the statement is rolled back';",
  "  end if;",
  "  raise notice '11c applied: system_suggestions_law v7 active (row %), v6 kept inactive', v_new_id;",
  "end",
  "$sod_11c$;",
  "",
].join("\n");

const rollback = [
  "-- SOD1820 · 18c · ROLLBACK of 11c: system_suggestions_law back to v6. PROPOSAL ONLY. NOT EXECUTED.",
  "-- Needs its own explicit ZURIEL approval of this file's SHA-256, for one run (CLAUDE.md §0.4).",
  "-- ORDER: 1st of the rollback. ROLLBACK_20261111120000_admin_suggestion_decide.sql refuses until this has run.",
  "-- v7 is deactivated and v6 reactivated; the v7 row stays as inactive history; nothing is deleted.",
  "-- One statement (one DO block), all or nothing. Refuses unless v7 is exactly the version 11c wrote and v6 is unchanged.",
  "do $sod_18c$",
  "begin",
  "  perform set_config('search_path', 'public', true);",
  "  perform 1 from public.nodes where type='rule' and rule_id='system_suggestions_law' for update;",
  "  if (select count(*) from public.nodes where type='rule' and rule_id='system_suggestions_law' and is_active and rule_version=7 and supersedes_version=6 and md5(description)='" + LL.v7Md5 + "' and md5(metadata::text)='" + LL.v7MetaMd5 + "') <> 1 then",
  "    raise exception '18c refused: the active system_suggestions_law is not the v7 written by 11c';",
  "  end if;",
  "  if (select count(*) from public.nodes where type='rule' and rule_id='system_suggestions_law' and rule_version=6 and not is_active and md5(description)='" + LL.v6Md5 + "' and md5(metadata::text)='" + LL.v6MetaMd5 + "') <> 1 then",
  "    raise exception '18c refused: the v6 history row is missing or changed';",
  "  end if;",
  "  if exists (select 1 from public.nodes where type='rule' and rule_id='system_suggestions_law' and rule_version > 7) then",
  "    raise exception '18c refused: a version above v7 exists';",
  "  end if;",
  "  update public.nodes set is_active=false where type='rule' and rule_id='system_suggestions_law' and rule_version=7;",
  "  update public.nodes set is_active=true  where type='rule' and rule_id='system_suggestions_law' and rule_version=6;",
  "  if (select count(*) from public.nodes where type='rule' and rule_id='system_suggestions_law' and is_active and rule_version=6 and md5(description)='" + LL.v6Md5 + "' and md5(metadata::text)='" + LL.v6MetaMd5 + "') <> 1",
  "     or (select count(*) from public.nodes where type='rule' and rule_id='system_suggestions_law' and is_active) <> 1 then",
  "    raise exception '18c failed after apply: v6 is not the single active version; the statement is rolled back';",
  "  end if;",
  "  raise notice '18c applied: system_suggestions_law v6 active again; v7 kept as inactive history';",
  "end",
  "$sod_18c$;",
  "",
].join("\n");

if (process.argv[2] === "--write") {
  mkdirSync(G + "new/rules", { recursive: true });
  writeFileSync(G + "new/rules/system_suggestions_law@v7.txt", v7);
  writeFileSync(G + "new/rules/system_suggestions_law@v7.meta.json", merged + "\n");
  writeFileSync(ROOT + FILES.lawApply, apply);
  writeFileSync(ROOT + FILES.lawRollback, rollback);
  writeFileSync(G + "sim/law_literals.json", JSON.stringify(LL, null, 2) + "\n");
  console.log(JSON.stringify({ v7Md5: LL.v7Md5, v7Chars: LL.v7Chars, v7MetaMd5: LL.v7MetaMd5 }, null, 2));
}
export { LL, LABEL };
