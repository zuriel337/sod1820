-- PROPOSAL ONLY - NOT APPLIED (S1, 27.11.2026). Needs ZURIEL's explicit approval for this exact file AND the contract amendment (CONTRACT_V14.md).
-- Owner: traffic_intelligence_law (fn_ti_clean_classification). Based on the LIVE definition read 27.11.2026 (md5 cf9bb5f396949bffb1c4dcfda3fbab71).
-- Change (same signature and columns): the dwell evidence ("dwell>=15s") now ALSO needs proof that a person acted: at least one engagement event with
-- max_scroll_pct > 0, or engaged_ms > 20,000 (more than the idle window: impossible without activity), or an engagement_version 2 event with engaged_ms > 0.
-- PROSPECTIVE ONLY: engagement events before the cutover keep the old rule, so past classifications and past traffic_daily rows do not change.
-- A session whose only engagement evidence is the automatic first-20-second credit becomes 'unknown' (never 'bot').
-- INTENSITY IS NOT EVIDENCE OF AUTOMATION: nothing in this function (or this proposal) uses volume, speed or number of sessions to mark a bot.
-- Provenance: clean_evidence gains 'engagement_activity_proof'. clean_classifier_version is unchanged.
-- Set the cutover at approval (it must not be in the past):
\set cutover '2026-12-02 00:00:00+00'
\set ON_ERROR_STOP on
begin;
  set local lock_timeout = '5s';
  select set_config('sod.cutover', :'cutover', true);
  do $$
  declare
    v_def text := pg_get_functiondef('public.fn_ti_clean_classification(date,date)'::regprocedure);
    v_cut text := current_setting('sod.cutover');
    v_o1 text := $q$filter (where event_type='engagement'),0) as engaged_ms_total$q$;
    v_n1 text := $q$filter (where event_type='engagement'),0) as engaged_ms_total,
      coalesce(bool_or(event_type='engagement' and (
        coalesce((props->>'max_scroll_pct')::numeric,0) > 0
        or (props->>'engaged_ms')::numeric > 20000
        or ((props->>'engagement_version') = '2' and coalesce((props->>'engaged_ms')::numeric,0) > 0)
      )), false) as eng_has_activity_proof,
      max(ts) filter (where event_type='engagement') as last_engagement_ts$q$;
    v_o2 text := $q$s.session_id, s.raw_is_bot, s.engaged_ms_total,$q$;
    v_n2 text := $q$s.session_id, s.raw_is_bot, s.engaged_ms_total, s.eng_has_activity_proof, s.last_engagement_ts,$q$;
    v_o3 text := $q$(s.engaged_ms_total>=15000) as ev_dwell15,$q$;
    v_n3 text := $q$(s.engaged_ms_total>=15000 and (s.eng_has_activity_proof or s.last_engagement_ts is null or s.last_engagement_ts < @@CUTOVER@@::timestamptz)) as ev_dwell15,$q$;
    v_o4 text := $q$'dwell_ms', s.engaged_ms_total,$q$;
    v_n4 text := $q$'dwell_ms', s.engaged_ms_total,
      'engagement_activity_proof', s.eng_has_activity_proof,$q$;
  begin
    if v_cut::timestamptz < now() then raise exception 'the cutover % is in the past: the rule is prospective only', v_cut; end if;
    if position('eng_has_activity_proof' in v_def) > 0 then return; end if;  -- already applied
    if md5(v_def) <> 'cf9bb5f396949bffb1c4dcfda3fbab71' then raise exception 'fn_ti_clean_classification changed since the 27.11.2026 read (md5 %); re-read before applying', md5(v_def); end if;
    if (length(v_def) - length(replace(v_def, v_o1, ''))) / length(v_o1) <> 1 then raise exception 'anchor 1: not found exactly once'; end if;
    if (length(v_def) - length(replace(v_def, v_o2, ''))) / length(v_o2) <> 1 then raise exception 'anchor 2: not found exactly once'; end if;
    if (length(v_def) - length(replace(v_def, v_o3, ''))) / length(v_o3) <> 1 then raise exception 'anchor 3: not found exactly once'; end if;
    if (length(v_def) - length(replace(v_def, v_o4, ''))) / length(v_o4) <> 1 then raise exception 'anchor 4: not found exactly once'; end if;
    execute replace(replace(replace(replace(v_def, v_o1, v_n1), v_o2, v_n2), v_o3, replace(v_n3, '@@CUTOVER@@', quote_literal(v_cut))), v_o4, v_n4);
  end $$;
commit;
