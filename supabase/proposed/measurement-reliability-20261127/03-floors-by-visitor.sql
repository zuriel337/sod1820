-- PROPOSAL ONLY - NOT APPLIED (S1, 27.11.2026). Needs ZURIEL's explicit approval for this exact file AND the contract amendment (CONTRACT_V14.md).
-- Owner: traffic_intelligence_law (fn_ti_activity_pulse2029, the /stats producer). Based on the LIVE definition read 27.11.2026 (md5 83b931888f51de9429367006c6608e9d).
-- Change: the privacy and popularity floor counts DISTINCT VISITORS (sod_id, falling back to the session id when it is missing), not sessions.
-- The thresholds stay exactly 10 events and 5 (visitors). Reason: one visitor with 18 sessions passed the 5-session floor on its own (3 of the 6 popular numbers
-- passed with fewer than 5 visitors). Four things stay separate: a SESSION (30 min of inactivity), a VISITOR (sod_id, a browser), an IDENTIFIED PERSON (person_id, never shown) and ACTIVITY.
-- Also: the cache key moves to ...:v3: so a payload computed under the old rule is never served. No event row is read differently, none is rewritten.
\set ON_ERROR_STOP on
begin;
  set local lock_timeout = '5s';
  do $$
  declare
    v_def text := pg_get_functiondef('public.fn_ti_activity_pulse2029(integer)'::regprocedure);
    v_o1 text := $q$end as n,session_id,ts$q$;
    v_n1 text := $q$end as n,session_id,sod_id,ts$q$;
    v_o2 text := $q$select e.surface,e.event_type,e.session_id,c.clean_classification as cls$q$;
    v_n2 text := $q$select e.surface,e.event_type,e.session_id,e.sod_id,c.clean_classification as cls$q$;
    v_o3 text := $q$count(distinct session_id)$q$;
    v_n3 text := $q$count(distinct coalesce(sod_id,session_id))$q$;
    v_o4 text := $q$'threshold',jsonb_build_object('events',10,'sessions',5)$q$;
    v_n4 text := $q$'threshold',jsonb_build_object('events',10,'sessions',5,'floor_unit','distinct_visitor')$q$;
    v_o5 text := $q$lists: clean_human_only above 10 events/5 sessions$q$;
    v_n5 text := $q$lists: clean_human_only above 10 events/5 visitors$q$;
    v_o6 text := $q$'ti_activity_pulse2029:v2:'$q$;
    v_n6 text := $q$'ti_activity_pulse2029:v3:'$q$;
    v_count3 integer;
  begin
    if position('floor_unit' in v_def) > 0 then return; end if;  -- already applied
    if md5(v_def) <> '83b931888f51de9429367006c6608e9d' then raise exception 'fn_ti_activity_pulse2029 changed since the 27.11.2026 read (md5 %); re-read before applying', md5(v_def); end if;
    v_count3 := (length(v_def) - length(replace(v_def, v_o3, ''))) / length(v_o3);
    if v_count3 < 9 then raise exception 'anchor 3: expected the distinct-session counts of every list, found %', v_count3; end if;
    if (length(v_def) - length(replace(v_def, v_o1, ''))) / length(v_o1) <> 1 then raise exception 'anchor 1: unexpected occurrence count'; end if;
    if (length(v_def) - length(replace(v_def, v_o2, ''))) / length(v_o2) <> 1 then raise exception 'anchor 2: unexpected occurrence count'; end if;
    if (length(v_def) - length(replace(v_def, v_o3, ''))) / length(v_o3) <> v_count3 then raise exception 'anchor 3: unexpected occurrence count'; end if;
    if (length(v_def) - length(replace(v_def, v_o4, ''))) / length(v_o4) <> 1 then raise exception 'anchor 4: unexpected occurrence count'; end if;
    if (length(v_def) - length(replace(v_def, v_o5, ''))) / length(v_o5) <> 1 then raise exception 'anchor 5: unexpected occurrence count'; end if;
    if (length(v_def) - length(replace(v_def, v_o6, ''))) / length(v_o6) <> 1 then raise exception 'anchor 6: unexpected occurrence count'; end if;
    execute replace(replace(replace(replace(replace(replace(v_def, v_o1, v_n1), v_o2, v_n2), v_o3, v_n3), v_o4, v_n4), v_o5, v_n5), v_o6, v_n6);
  end $$;
commit;
