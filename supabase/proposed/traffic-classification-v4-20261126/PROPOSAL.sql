-- PROPOSAL ONLY - NOT APPLIED. Traffic classification rule v4 (26.11.2026). Needs ZURIEL's explicit approval for this exact file, plus the
-- traffic_intelligence_law amendment text in README.md of this folder (the contract owner is traffic_intelligence_law; this is EXTEND_EXISTING).
-- What it changes: ONE function, public.fn_human_entrances(date,date), the existing classifier that every traffic reader already uses
--   (refresh_traffic_daily_range_v1 and the admin/TI readers). Same signature, same columns, same return type. No new table, store, engine or cron.
-- Rule v4: a session is marked suspected_bot (with its own classification_reason) only when ALL hold: arrival source google, exactly one view,
--   no interaction, no page-engagement event, NOT an identified (logged-in) visitor, AND at least 25 such sessions landed on the same path in the same hour (a volume anomaly).
--   Normal Google readers of a page never reach 25 such sessions in an hour (30 days of history: the busiest normal hour has fewer than 10), so a real
--   visitor in an ordinary hour is never marked; the wave of 26.11 (13 hours on /community/chat, 2 on /codes/:item, 1 on /post/:item) is.
-- What it does NOT do: block, delete or rewrite anything. No event row is touched. The flag is computed at read time, as rules v2/v3 are. The only
--   stored numbers that move are the traffic_daily columns that the existing hourly refresh recomputes from the same events (30 days of history: only 26.11).
--   Retention snapshots the aggregate before dropping a partition, so flagged sessions still count under "suspected".
-- Guards: exact live md5 ed1fd14a3309be7f01b290c7bd7f28d0; every anchor must occur exactly once; a second apply is a no-op.
begin;
  set local lock_timeout = '5s';
  do $$
  declare
    v_def text := pg_get_functiondef('public.fn_human_entrances(date,date)'::regprocedure);
    v_new text := v_def;
    a1o text := E'      count(*) filter (where event_type in (''search'',''cross_search'')) searches,\n';
    a1n text := E'      count(*) filter (where event_type in (''search'',''cross_search'')) searches,\n      count(*) filter (where surface=''page'' and event_type=''engagement'') engagements,\n';
    a2o text := 'ent as (select session_id, views, interactions, searches, arrival_source from sess';
    a2n text := 'ent as (select session_id, views, interactions, searches, engagements, arrival_source from sess';
    a3o text := E'               and (l.landing_path=''/numbers'' or l.landing_path like ''/number/%''))\n           ), false) suspected_bot\n';
    a3n text := E'               and (l.landing_path=''/numbers'' or l.landing_path like ''/number/%''))\n             or\n             (l.source=''google'' and not l.is_logged_in and e.views=1 and e.interactions=0 and e.engagements=0\n               and count(*) filter (where l.source=''google'' and not l.is_logged_in and e.views=1 and e.interactions=0 and e.engagements=0)\n                     over (partition by date_trunc(''hour'', l.first_ts), l.landing_path) >= 25)\n           ), false) suspected_bot\n';
    a4o text := E'             then ''direct + numeric_landing + single_view + no_interaction (rule v3)''\n           else null\n';
    a4n text := E'             then ''direct + numeric_landing + single_view + no_interaction (rule v3)''\n           when j.suspected_bot and j.source=''google''\n             then ''google + single_view + no_interaction + no_engagement + hourly_volume_anomaly>=25 (rule v4)''\n           else null\n';
    a text; o text; n text; i int;
  begin
    if position('(rule v4)' in v_def) > 0 then
      return;  -- already applied (the rollback restores the exact old md5, so this is the only "applied" marker)
    end if;
    if md5(v_def) <> 'ed1fd14a3309be7f01b290c7bd7f28d0' then raise exception 'fn_human_entrances changed since the 26.11.2026 read (md5 %); re-read before applying', md5(v_def); end if;
    for i in 1..4 loop
      o := case i when 1 then a1o when 2 then a2o when 3 then a3o else a4o end;
      n := case i when 1 then a1n when 2 then a2n when 3 then a3n else a4n end;
      if (length(v_new) - length(replace(v_new, o, ''))) / length(o) <> 1 then raise exception 'anchor % not found exactly once', i; end if;
      v_new := replace(v_new, o, n);
    end loop;
    execute v_new;
  end $$;
commit;
