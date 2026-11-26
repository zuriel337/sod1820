-- ROLLBACK for PROPOSAL.sql: restores the exact function text read on 26.11.2026 (md5 ed1fd14a3309be7f01b290c7bd7f28d0). NOT APPLIED.
-- traffic_daily rows recomputed while v4 was active are recomputed again by the existing hourly refresh after the rollback (events are never touched).
begin;
  do $$
  declare
    v_def text := pg_get_functiondef('public.fn_human_entrances(date,date)'::regprocedure);
    v_old text := v_def;
    a1o text := E'      count(*) filter (where event_type in (''search'',''cross_search'')) searches,\n';
    a1n text := E'      count(*) filter (where event_type in (''search'',''cross_search'')) searches,\n      count(*) filter (where surface=''page'' and event_type=''engagement'') engagements,\n';
    a2o text := 'ent as (select session_id, views, interactions, searches, arrival_source from sess';
    a2n text := 'ent as (select session_id, views, interactions, searches, engagements, arrival_source from sess';
    a3o text := E'               and (l.landing_path=''/numbers'' or l.landing_path like ''/number/%''))\n           ), false) suspected_bot\n';
    a3n text := E'               and (l.landing_path=''/numbers'' or l.landing_path like ''/number/%''))\n             or\n             (l.source=''google'' and e.views=1 and e.interactions=0 and e.engagements=0\n               and count(*) filter (where l.source=''google'' and e.views=1 and e.interactions=0 and e.engagements=0)\n                     over (partition by date_trunc(''hour'', l.first_ts), l.landing_path) >= 25)\n           ), false) suspected_bot\n';
    a4o text := E'             then ''direct + numeric_landing + single_view + no_interaction (rule v3)''\n           else null\n';
    a4n text := E'             then ''direct + numeric_landing + single_view + no_interaction (rule v3)''\n           when j.suspected_bot and j.source=''google''\n             then ''google + single_view + no_interaction + no_engagement + hourly_volume_anomaly>=25 (rule v4)''\n           else null\n';
  begin
    if position('(rule v4)' in v_def) = 0 then return; end if;  -- already rolled back
    v_old := replace(replace(replace(replace(v_old, a4n, a4o), a3n, a3o), a2n, a2o), a1n, a1o);
    if md5(v_old) <> 'ed1fd14a3309be7f01b290c7bd7f28d0' then raise exception 'the function changed after the proposal; rollback by hand'; end if;
    execute v_old;
  end $$;
commit;
