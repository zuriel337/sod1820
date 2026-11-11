// Generates 11b (apply) and 18b (rollback) from the exact definition files. Local only; never connects to a database.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const G = new URL("../", import.meta.url).pathname;
const md5 = (s) => createHash("md5").update(s, "utf8").digest("hex");
const base = readFileSync(G + "base/admin_suggestion_decide.sql", "utf8");
const neu = readFileSync(G + "new/admin_suggestion_decide.sql", "utf8");
for (const [n, s] of [["base", base], ["new", neu]]) {
  if (s.includes("$sod_def$")) throw new Error(n + " contains the payload tag");
  if (!s.endsWith("$function$\n")) throw new Error(n + " must end with $function$ + newline");
}
// Live values, read-only from linswmnnkjxvweumprav on 11.11.2026 (same expressions as the guards below).
const L = {
  baseMd5: md5(base), baseLen: Buffer.byteLength(base, "utf8"),
  newMd5: md5(neu), newLen: Buffer.byteLength(neu, "utf8"),
  meta: "true:search_path=public:postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres:postgres",
  rules: "deploy_on_request@4,inter_agent_coordination_law@18,system_suggestions_law@6",
  wlTriggers: "trg_work_log_dispatch_00_gpt_event:O:work_log_dispatch_gpt_after_write:a00ff986e51296e9e3f13a4f6d9b3dc6:cd6bdf501a101a57b27c33e9f0eeb28f,trg_work_log_dispatch_event:O:work_log_dispatch_after_write:dfac3f0c9cace0993c53ea8e967408ae:4b0735c8ada910e1084f8e09d0cae77b,trg_work_log_dispatch_prepare:O:work_log_dispatch_prepare:bba6f47639772c33d2eb7d774b2562b5:c8656de489529a748f0fed10fa6cd493,trg_work_log_zz_gpt_delivery_stop_v17:O:work_log_gpt_delivery_stop_v17:1492577ec06d4f38631d3ed70bede4a7:9a3ab0c02d17b34aaa700933f3d318f3",
  wlUnique: "work_log_assignment_idempotency_uidx:d0ff7092e20754986de6832b2ea35bb7,work_log_one_active_writer_scope_uidx:9b48809210921d799fd96f7611d01ce9,work_log_pkey:7626b73061ca271b8a5bdcf2b18dec08",
  wlChecks: "work_log_assignment_mode_ck:e8946be6403885be8060d5e7df574521,work_log_dispatch_attempts_ck:c33f41675ce5fbcfb6ae1cf292af237f,work_log_dispatch_kind_ck:d1918784965683712fdb60beddee6b5b,work_log_dispatch_state_ck:7135a05432c7ff6927a9036b8188cf9c,work_log_from_actor_ck:968810e0e64aebcbb85078ffb5ada0d2,work_log_no_self_supersede:6ad1bc61808f15cf4144bb9e34a57672,work_log_to_actor_ck:5c8d82bcbd624e6536a26c620296619e",
};
const FN = "'public.admin_suggestion_decide(bigint,text,text)'::regprocedure";
export const EXPR = {
  META: "(select p.prosecdef::text||':'||array_to_string(p.proconfig,';')||':'||array_to_string(p.proacl::text[],',')||':'||p.proowner::regrole::text from pg_proc p where p.oid=" + FN + ")",
  RULES: "(select string_agg(n.rule_id||'@'||n.rule_version::text, ',' order by n.rule_id) from public.nodes n where n.type='rule' and n.is_active and n.rule_id in ('system_suggestions_law','deploy_on_request','inter_agent_coordination_law'))",
  TRG: "(select string_agg(t.tgname::text||':'||t.tgenabled::text||':'||p.proname::text||':'||md5(pg_get_functiondef(p.oid))||':'||md5(pg_get_triggerdef(t.oid)), ',' order by t.tgname) from pg_trigger t join pg_proc p on p.oid=t.tgfoid where t.tgrelid='public.work_log'::regclass and not t.tgisinternal)",
  UNQ: "(select string_agg(c.relname::text||':'||md5(pg_get_indexdef(i.indexrelid)), ',' order by c.relname) from pg_index i join pg_class c on c.oid=i.indexrelid where i.indrelid='public.work_log'::regclass and i.indisunique)",
  CHK: "(select string_agg(k.conname::text||':'||md5(pg_get_constraintdef(k.oid)), ',' order by k.conname) from pg_constraint k where k.conrelid='public.work_log'::regclass and k.contype='c')",
};
const { META, RULES, TRG, UNQ, CHK } = EXPR;

const apply = [
  "-- SOD1820 · 11b · admin_suggestion_decide: accepting a recommendation does not activate an agent. PROPOSAL ONLY. NOT EXECUTED.",
  "-- Task CONTRACT_GOVERNANCE_REVIEW_GAP_CLOSURE_20261111. Replaces 11_admin_suggestion_decide_text.sql: do not run 11_.",
  "-- Needs its own explicit ZURIEL approval of this file's SHA-256, for one run (CLAUDE.md §0.4). Approval of this file is not approval of 18b.",
  "-- One statement (one DO block), so it is all or nothing. Every condition below is checked inside; any mismatch raises and nothing changes.",
  "--   1. The embedded definition is intact: " + L.newLen + " bytes, md5 " + L.newMd5 + ".",
  "--   2. The live definition is the reviewed base: md5 " + L.baseMd5 + " (refuses if 11_ ran, if 11b already ran, or on any drift).",
  "--   3. Function metadata: SECURITY DEFINER, search_path=public, owner postgres, EXECUTE for postgres, authenticated and service_role only.",
  "--   4. Active laws: system_suggestions_law v6, deploy_on_request v4, inter_agent_coordination_law v18.",
  "--   5. work_log triggers, unique indexes and check constraints are exactly the ones the no-activation proof was run against.",
  "-- After: md5 " + L.newMd5 + ", same metadata and permissions (CREATE OR REPLACE keeps the ACL).",
  "-- What changes: the accepted dependency_upgrade_radar branch writes one passive record to ZURIEL (no dispatch fields, no TO=CLAUDE,",
  "-- no assignment mode) instead of a QUEUED ASSIGNMENT to CLAUDE. Everything before it is unchanged: admin check, status check,",
  "-- row lock, payload validation, overlap guard and the status update. Exact diff: admin_suggestion_decide.diff",
  "-- Rollback: 18b_admin_suggestion_decide_not_activated_ROLLBACK.sql restores the exact base, which turns the automatic assignment back on.",
  "-- After an approved run, add the same definition as a migration under supabase/migrations so the repository matches the DB.",
  "do $sod_11b$",
  "declare",
  "  v_def constant text := $sod_def$" + neu + "$sod_def$;",
  "  v_got text;",
  "begin",
  "  perform set_config('search_path', 'public', true);",
  "  if octet_length(v_def) <> " + L.newLen + " or md5(v_def) <> '" + L.newMd5 + "' then",
  "    raise exception '11b refused: embedded definition is not intact (bytes %, md5 %)', octet_length(v_def), md5(v_def);",
  "  end if;",
  "  v_got := md5(pg_get_functiondef(" + FN + "));",
  "  if v_got <> '" + L.baseMd5 + "' then",
  "    raise exception '11b refused: live admin_suggestion_decide is not the reviewed base (md5 %)', v_got;",
  "  end if;",
  "  v_got := " + META + ";",
  "  if v_got is distinct from '" + L.meta + "' then",
  "    raise exception '11b refused: function metadata or permissions changed: %', v_got;",
  "  end if;",
  "  v_got := " + RULES + ";",
  "  if v_got is distinct from '" + L.rules + "' then",
  "    raise exception '11b refused: active law versions changed: %', v_got;",
  "  end if;",
  "  v_got := " + TRG + ";",
  "  if v_got is distinct from '" + L.wlTriggers + "' then",
  "    raise exception '11b refused: work_log triggers changed: %', v_got;",
  "  end if;",
  "  v_got := " + UNQ + ";",
  "  if v_got is distinct from '" + L.wlUnique + "' then",
  "    raise exception '11b refused: work_log unique indexes changed: %', v_got;",
  "  end if;",
  "  v_got := " + CHK + ";",
  "  if v_got is distinct from '" + L.wlChecks + "' then",
  "    raise exception '11b refused: work_log check constraints changed: %', v_got;",
  "  end if;",
  "",
  "  execute v_def;",
  "",
  "  v_got := md5(pg_get_functiondef(" + FN + "));",
  "  if v_got <> '" + L.newMd5 + "' then",
  "    raise exception '11b failed after apply: resulting md5 % (expected " + L.newMd5 + "); the statement is rolled back', v_got;",
  "  end if;",
  "  v_got := " + META + ";",
  "  if v_got is distinct from '" + L.meta + "' then",
  "    raise exception '11b failed after apply: metadata or permissions changed: %; the statement is rolled back', v_got;",
  "  end if;",
  "end",
  "$sod_11b$;",
  "",
].join("\n");

const rollback = [
  "-- SOD1820 · 18b · ROLLBACK of 11b: restores the exact base admin_suggestion_decide (md5 " + L.baseMd5 + "). PROPOSAL ONLY. NOT EXECUTED.",
  "-- Needs its own explicit ZURIEL approval of this file's SHA-256, for one run (CLAUDE.md §0.4).",
  "-- Warning: the restored base inserts a QUEUED WRITE ASSIGNMENT to CLAUDE when a dependency_upgrade_radar suggestion is accepted,",
  "-- and work_log_dispatch_after_write then calls agent_dispatch_emit. That is the state before 11b.",
  "-- One statement (one DO block), all or nothing. Refuses unless the live definition is exactly the 11b result (md5 " + L.newMd5 + ")",
  "-- with unchanged metadata. Records already written by the 11b version stay as they are (passive records to ZURIEL).",
  "do $sod_18b$",
  "declare",
  "  v_def constant text := $sod_def$" + base + "$sod_def$;",
  "  v_got text;",
  "begin",
  "  perform set_config('search_path', 'public', true);",
  "  if octet_length(v_def) <> " + L.baseLen + " or md5(v_def) <> '" + L.baseMd5 + "' then",
  "    raise exception '18b refused: embedded definition is not intact (bytes %, md5 %)', octet_length(v_def), md5(v_def);",
  "  end if;",
  "  v_got := md5(pg_get_functiondef(" + FN + "));",
  "  if v_got <> '" + L.newMd5 + "' then",
  "    raise exception '18b refused: live admin_suggestion_decide is not the 11b result (md5 %)', v_got;",
  "  end if;",
  "  v_got := " + META + ";",
  "  if v_got is distinct from '" + L.meta + "' then",
  "    raise exception '18b refused: function metadata or permissions changed: %', v_got;",
  "  end if;",
  "",
  "  execute v_def;",
  "",
  "  v_got := md5(pg_get_functiondef(" + FN + "));",
  "  if v_got <> '" + L.baseMd5 + "' then",
  "    raise exception '18b failed after apply: resulting md5 % (expected " + L.baseMd5 + "); the statement is rolled back', v_got;",
  "  end if;",
  "  v_got := " + META + ";",
  "  if v_got is distinct from '" + L.meta + "' then",
  "    raise exception '18b failed after apply: metadata or permissions changed: %; the statement is rolled back', v_got;",
  "  end if;",
  "end",
  "$sod_18b$;",
  "",
].join("\n");

if (process.argv[2] === "--write") {
  writeFileSync(G + "sql/11b_admin_suggestion_decide_not_activated.sql", apply);
  writeFileSync(G + "sql/18b_admin_suggestion_decide_not_activated_ROLLBACK.sql", rollback);
  writeFileSync(G + "sim/literals.json", JSON.stringify(L, null, 2) + "\n");
  console.log(JSON.stringify({ ...L, meta: undefined, wlTriggers: undefined, wlUnique: undefined, wlChecks: undefined }, null, 2));
}
export { L };
