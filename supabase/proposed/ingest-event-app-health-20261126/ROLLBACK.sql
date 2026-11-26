-- ROLLBACK for PROPOSAL.sql. Removes only the app_health entry and requires the result to be the exact 26.11.2026 live text. NOT APPLIED.
begin;
  do $$
  declare
    v_def text := pg_get_functiondef('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure);
    v_new text := '"app_health":{"events":["save_started","save_confirmed","save_failed","auth_failed","load_failed","runtime_error"],"fields":{"reason":"token","stage":"token"}},';
  begin
    if position(v_new in v_def) = 0 then return; end if;  -- already rolled back
    if md5(replace(v_def, v_new, '')) <> '6dd7585345d10a3a323810fd768fcf3b' then raise exception 'the rest of ingest_event changed after the proposal; rollback by hand'; end if;
    execute replace(v_def, v_new, '');
  end $$;
commit;
