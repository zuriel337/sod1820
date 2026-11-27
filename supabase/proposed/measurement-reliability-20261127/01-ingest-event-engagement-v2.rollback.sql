-- ROLLBACK for 01-ingest-event-engagement-v2.sql. Restores the exact version-1-only clause and requires the exact pre-change text. NOT APPLIED.
-- WARNING: after a rollback, version-2 payloads from an already released client are refused (data loss of that client's engagement events). Roll the client back first.
begin;
  do $$
  declare
    v_def text := pg_get_functiondef('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure);
    v_old text := $q$or v_props->'engagement_version' is distinct from '1'::jsonb$q$;
    v_new text := $q$or (v_props->'engagement_version' is distinct from '1'::jsonb and v_props->'engagement_version' is distinct from '2'::jsonb)$q$;
  begin
    if position(v_new in v_def) = 0 then return; end if;
    if md5(replace(v_def, v_new, v_old)) not in ('3d2fa7cf1aa7513b981d338cab5aebc2','54b4c76942c8a4ff3553ecdd43341dde') then raise exception 'the rest of ingest_event changed after the proposal; rollback by hand'; end if;
    execute replace(v_def, v_new, v_old);
  end $$;
commit;
