-- ROLLBACK for 03-floors-by-visitor.sql. Restores the exact live 27.11.2026 text (md5 83b93188...). NOT APPLIED.
\set ON_ERROR_STOP on
begin;
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
  begin
    if position('floor_unit' in v_def) = 0 then return; end if;  -- already rolled back
    v_def := replace(replace(replace(replace(replace(replace(v_def, v_n1, v_o1), v_n2, v_o2), v_n3, v_o3), v_n4, v_o4), v_n5, v_o5), v_n6, v_o6);
    if md5(v_def) <> '83b931888f51de9429367006c6608e9d' then raise exception 'the rest of fn_ti_activity_pulse2029 changed after the proposal; rollback by hand'; end if;
    execute v_def;
    delete from public.analytics_cache where cache_key like 'ti_activity_pulse2029:v3:%';
  end $$;
commit;
