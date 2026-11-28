-- ROLLBACK for 02-classifier-activity-proof.sql. Restores the exact live 27.11.2026 text (md5 cf9bb5f3...). NOT APPLIED.
\set ON_ERROR_STOP on
begin;
  do $$
  declare
    v_def text := pg_get_functiondef('public.fn_ti_clean_classification(date,date)'::regprocedure);
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
    if position('eng_has_activity_proof' in v_def) = 0 then return; end if;  -- already rolled back
    v_def := regexp_replace(v_def, '\(s\.engaged_ms_total>=15000 and \(s\.eng_has_activity_proof or s\.last_engagement_ts is null or s\.last_engagement_ts < ''[^'']+''::timestamptz\)\) as ev_dwell15,', v_o3, 'n');
    v_def := replace(v_def, v_n1, v_o1);
    v_def := replace(v_def, v_n2, v_o2);
    v_def := replace(v_def, v_n4, v_o4);
    if md5(v_def) <> 'cf9bb5f396949bffb1c4dcfda3fbab71' then raise exception 'the rest of fn_ti_clean_classification changed after the proposal; rollback by hand'; end if;
    execute v_def;
  end $$;
commit;
