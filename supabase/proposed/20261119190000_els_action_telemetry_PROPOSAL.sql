-- PROPOSAL ONLY: never applied by this session. Existing ingest_event allowlist, no new table/collector/budget.
-- Requires ZURIEL approval for this exact SQL and release SHA. Hash-pinned to read-only inspection on 19.11.2026.
begin;
do $$
declare
 v_def text := pg_get_functiondef('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure);
 v_old text := '"els":{"events":["search","cross_search"],"fields":{"kind":"token","scope":"token","skip":"int"}}';
 v_new text := '"els":{"events":["search","cross_search","ui_action","operation_started","operation_phase","operation_finished","cancel_requested"],"fields":{"kind":"token","scope":"token","skip":"int","mode":"token","region":"token","control":"token","control_index":"int","gesture":"token","operation":"token","operation_id":"token","phase":"token","outcome":"token","elapsed_ms":"int","count":"int"}}';
begin
 if position(v_new in v_def)>0 then
   if md5(replace(v_def,v_new,v_old))<>'897f442aaa8f75a2f1f2dd332ad92c0a' then raise exception 'ingest_event drift: re-review before apply'; end if;
   return;
 end if;
 if md5(v_def)<>'897f442aaa8f75a2f1f2dd332ad92c0a' or position(v_old in v_def)=0 then raise exception 'ingest_event drift: re-review before apply'; end if;
 execute replace(v_def,v_old,v_new);
end $$;
commit;
