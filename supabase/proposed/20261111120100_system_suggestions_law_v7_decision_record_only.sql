-- SOD1820 · 11c · system_suggestions_law v6 → v7: accepting a recommendation records a decision only. PROPOSAL ONLY. NOT EXECUTED.
-- ZURIEL 11.11.2026: «קבלת המלצה מתעדת החלטה בלבד. התחלת עבודה דורשת הוראה מפורשת שלי לסוכן מסוים בשיחה.»
-- EXTEND_EXISTING: same rule_id, new version 7; v6 stays as inactive history; nothing is deleted; no new contract or system.
-- Needs its own explicit ZURIEL approval of this file's SHA-256, for one run (CLAUDE.md §0.4).
-- ORDER: 2nd. Runs only after supabase/proposed/20261111120000_admin_suggestion_decide_decision_record_only_v1.sql
--   (check A: admin_suggestion_decide must already be the 11b result). 11b itself refuses once v7 is active, so the order is fixed.
-- One statement (one DO block), so it is all or nothing. Checked inside; any mismatch raises and nothing changes:
--   A. admin_suggestion_decide md5 f44dc42fafdf4a8ef4ae3db700fbeacf (11b applied).
--   B. deploy_on_request v4 and inter_agent_coordination_law v18 are the active companions.
--   C. system_suggestions_law v6 is active, description md5 98d4d88e16d2ec5f70dac6e5a7f98ea5, metadata md5 f4e5216a8eb44645ea0978b35161a82e; no v7 or later; v5 history intact.
--   D. six exact-once fragments (§17, §18, the major-upgrade sentence of §19, §20, §21, the v3 block header) rebuild v7:
--      md5 a594e1fe21d41c644961771353b23934, SHA-256 4a619909880dcfe6751ec792d785394ac8d56da89f3fee6ba0194a0003aa942a, 18606 characters.
--   E. metadata = v6 metadata + human_gate_v7_decision_record_only; jsonb text md5 d2236c320e6b312b0bf57b5fb12a5582.
-- After: v7 active (supersedes 6); v6 inactive and unchanged. The rule versioning guard trigger stays in force.
-- Rollback: ROLLBACK_20261111120100_system_suggestions_law_v7.sql (1st of the rollback), then ROLLBACK_20261111120000_admin_suggestion_decide.sql.
do $sod_11c$
declare
  v_ssl public.nodes%rowtype;
  v_txt text; v_meta jsonb; v_ops text[]; v_pos int; i int; v_new_id uuid; v_got text;
begin
  perform set_config('search_path', 'public', true);
  -- A. order: 11b first
  v_got := md5(pg_get_functiondef('public.admin_suggestion_decide(bigint,text,text)'::regprocedure));
  if v_got <> 'f44dc42fafdf4a8ef4ae3db700fbeacf' then
    raise exception '11c refused: admin_suggestion_decide is not the 11b result (md5 %); run 11b first', v_got;
  end if;
  -- B. companion laws
  v_got := (select string_agg(n.rule_id||'@'||n.rule_version::text, ',' order by n.rule_id) from public.nodes n where n.type='rule' and n.is_active and n.rule_id in ('deploy_on_request','inter_agent_coordination_law'));
  if v_got is distinct from 'deploy_on_request@4,inter_agent_coordination_law@18' then
    raise exception '11c refused: companion law versions changed: %', v_got;
  end if;
  -- C. lock and verify v6
  select * into v_ssl from public.nodes where type='rule' and rule_id='system_suggestions_law' and is_active for update;
  if not found then raise exception '11c refused: system_suggestions_law has no active version'; end if;
  if v_ssl.rule_version <> 6 then raise exception '11c refused: active system_suggestions_law is v% (expected v6)', v_ssl.rule_version; end if;
  if md5(v_ssl.description) <> '98d4d88e16d2ec5f70dac6e5a7f98ea5' then raise exception '11c refused: v6 description drift (md5 %)', md5(v_ssl.description); end if;
  if md5(v_ssl.metadata::text) <> 'f4e5216a8eb44645ea0978b35161a82e' then raise exception '11c refused: v6 metadata drift (md5 %)', md5(v_ssl.metadata::text); end if;
  if exists (select 1 from public.nodes where type='rule' and rule_id='system_suggestions_law' and rule_version > 6) then
    raise exception '11c refused: a system_suggestions_law version above v6 already exists';
  end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='system_suggestions_law' and rule_version=5 and not is_active and md5(description)='9b5c19de501b1985da01ddfc9c646d3c') <> 1 then
    raise exception '11c refused: v5 history row missing or changed';
  end if;
  -- D. rebuild the text: each fragment must occur exactly once
  v_txt := v_ssl.description;
  v_ops := array[
    $sod_frag$[UPDATE v3 · Human-Gate ZURIEL · 19.9.2026 — GOVERNED SELF-MAINTENANCE · EXTEND_EXISTING]$sod_frag$, $sod_frag$[UPDATE v3 · Human-Gate ZURIEL · 19.9.2026 — GOVERNED SELF-MAINTENANCE · EXTEND_EXISTING · §17–§21 aligned in v7 (ZURIEL, 11.11.2026): accepting records a decision only; work starts on an explicit instruction]$sod_frag$,
    $sod_frag$17. ACCEPT = IMPLEMENTATION HANDOFF FOR UPGRADE RADAR. When ZURIEL accepts a dependency_upgrade_radar suggestion through the existing admin_suggestion_decide Human Gate, the system may automatically create one idempotent branch-only CLAUDE maintenance assignment carrying the exact package/current/latest/delta evidence. ZURIEL is the decision owner, not the messenger.$sod_frag$, $sod_frag$17. ACCEPT RECORDS A DECISION ONLY. When ZURIEL accepts a dependency_upgrade_radar suggestion through the existing admin_suggestion_decide Human Gate, the system records the decision and nothing more: the suggestion status, and one idempotent passive work_log record to ZURIEL carrying the exact package/current/latest/delta evidence and a task_key, with no assignment mode and no dispatch. Accepting never creates an assignment and never starts an agent. Work starts only when ZURIEL gives an explicit instruction, in a conversation, to a specific agent, citing that task_key (inter_agent_coordination_law, active version: a new activation requires an explicit user instruction). The record carries the evidence, so ZURIEL decides and instructs but never relays the details by hand.$sod_frag$,
    $sod_frag$18. PREPARATION IS NOT RELEASE. The maintenance assignment may reverify current main, update only the bounded dependency/runtime files required by the accepted suggestion, regenerate the lockfile, run tests and open a PR. The assignment itself is BRANCH_ONLY_NO_MERGE_NO_DEPLOY and never grants publication/canonicalization or production release.$sod_frag$, $sod_frag$18. PREPARATION IS NOT RELEASE. Once instructed under §17, that agent may reverify current main, update only the bounded dependency/runtime files required by the accepted suggestion, regenerate the lockfile, run tests and open a PR. That work is BRANCH_ONLY_NO_MERGE_NO_DEPLOY; neither the work, nor the accepted suggestion, nor its record grants publication/canonicalization or production release.$sod_frag$,
    $sod_frag$Major runtime/framework upgrades remain Foundation changes: they may be prepared after Human acceptance but require Foundation redesign-risk challenge and any applicable Human Gate before release.$sod_frag$, $sod_frag$Major runtime/framework upgrades remain Foundation changes: they may be prepared only after Human acceptance and an explicit instruction under §17, and require Foundation redesign-risk challenge and any applicable Human Gate before release.$sod_frag$,
    $sod_frag$20. STALE SUGGESTION FAILS CLOSED. The maintenance agent must re-read origin/main$sod_frag$, $sod_frag$20. STALE SUGGESTION FAILS CLOSED. The instructed agent must re-read origin/main$sod_frag$,
    $sod_frag$21. ONE TREE / ONE TRACE. Upgrade work reuses system_suggestions, work_log dispatch, existing GitHub/CI and release owners. No Upgrade Store, Maintenance Queue, second scheduler or second release system. Suggestion id, assignment id, branch/PR/head, tests, rollback and final live verification remain traceable.$sod_frag$, $sod_frag$21. ONE TREE / ONE TRACE. Upgrade work reuses system_suggestions, the work_log decision record, the existing agent conversations, GitHub/CI and release owners. No Upgrade Store, Maintenance Queue, second scheduler, second dispatcher or second release system. Suggestion id, decision record and task_key, ZURIEL's instruction, branch/PR/head, tests, rollback and final live verification remain traceable.$sod_frag$
  ];
  for i in 1 .. coalesce(array_length(v_ops, 1), 0) by 2 loop
    v_pos := strpos(v_txt, v_ops[i]);
    if v_pos = 0 then raise exception '11c refused: fragment % not found', (i + 1) / 2; end if;
    if strpos(substr(v_txt, v_pos + 1), v_ops[i]) > 0 then raise exception '11c refused: fragment % not unique', (i + 1) / 2; end if;
    v_txt := overlay(v_txt placing v_ops[i + 1] from v_pos for char_length(v_ops[i]));
  end loop;
  if md5(v_txt) <> 'a594e1fe21d41c644961771353b23934' or encode(sha256(convert_to(v_txt, 'UTF8')), 'hex') <> '4a619909880dcfe6751ec792d785394ac8d56da89f3fee6ba0194a0003aa942a' or char_length(v_txt) <> 18606 then
    raise exception '11c refused: rebuilt v7 text differs from the reviewed literal (md5 %)', md5(v_txt);
  end if;
  -- E. metadata
  v_meta := v_ssl.metadata || $sod_meta${"human_gate_v7_decision_record_only":{"changed":["§17: accepting a dependency_upgrade_radar suggestion records a decision only (one passive work_log record to ZURIEL; no assignment, no dispatch)","§18: preparation starts only after ZURIEL's explicit instruction to a specific agent (§17)","§19: major upgrades are prepared only after acceptance and an explicit instruction","§20: the maintenance agent → the instructed agent","§21: trace = suggestion id, decision record and task_key, ZURIEL's instruction, branch/PR/head","v3 block header marked as aligned in v7"],"decision_text":"קבלת המלצה מתעדת החלטה בלבד. התחלת עבודה דורשת הוראה מפורשת שלי לסוכן מסוים בשיחה.","human_gate":"ZURIEL 2026-11-11","owner_check":"EXTEND_EXISTING","no_new_system":true,"realigns_with":"opening decision 12.7.2026: אין ביצוע אוטומטי של המלצה — קבלה = החלטה אנושית, המימוש ידני","supersedes":["v3_self_maintenance_2026_09_19.accepted_upgrade_auto_handoff","v3_self_maintenance_2026_09_19.routine_release_owner"],"requires_function":"admin_suggestion_decide md5 f44dc42fafdf4a8ef4ae3db700fbeacf"}}$sod_meta$::jsonb;
  if md5(v_meta::text) <> 'd2236c320e6b312b0bf57b5fb12a5582' then raise exception '11c refused: rebuilt v7 metadata differs (md5 %)', md5(v_meta::text); end if;
  -- F. version swap (v6 kept as inactive history)
  update public.nodes set is_active=false where id=v_ssl.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)
  values ('rule', $sod_lbl$System Intelligence v7 — Resource-Aware Reliability + Explicit Release Approval + Decision-Only Acceptance$sod_lbl$, v_txt, v_meta, true, 'system_suggestions_law', 7,
          v_ssl.depends_on, 6, v_ssl.weight, v_ssl.hebrew_date, v_ssl.axis_theme, v_ssl.gallery_id, v_ssl.identity_key)
  returning id into v_new_id;
  -- G. end state
  if (select count(*) from public.nodes where id=v_new_id and is_active and rule_version=7 and supersedes_version=6 and md5(description)='a594e1fe21d41c644961771353b23934' and md5(metadata::text)='d2236c320e6b312b0bf57b5fb12a5582') <> 1 then
    raise exception '11c failed after apply: v7 row not as reviewed; the statement is rolled back';
  end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='system_suggestions_law' and is_active) <> 1 then
    raise exception '11c failed after apply: active version count is not 1; the statement is rolled back';
  end if;
  if (select count(*) from public.nodes where id=v_ssl.id and not is_active and md5(description)='98d4d88e16d2ec5f70dac6e5a7f98ea5' and md5(metadata::text)='f4e5216a8eb44645ea0978b35161a82e') <> 1 then
    raise exception '11c failed after apply: v6 not kept as unchanged inactive history; the statement is rolled back';
  end if;
  raise notice '11c applied: system_suggestions_law v7 active (row %), v6 kept inactive', v_new_id;
end
$sod_11c$;
