-- PROPOSAL ONLY. Do NOT execute without a separate SQL/security Human Gate.
-- Extend existing ingest_event action-family allowlist, no table, no cron, no broad permission.
-- Guard pins the live function fingerprint observed read-only 2026-11-23.
begin;
do $$
declare
  v_def text := pg_get_functiondef('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure);
  v_old text := '"calculator_2029":';
  v_new text := '"app_health":{"events":["save_started","save_confirmed","save_failed","auth_failed","load_failed","runtime_error"],"fields":{"reason":"token","stage":"token"}},';
begin
  if md5(v_def) <> '4006c82328aa8358a21ebdb5792024e3' then
    raise exception 'ingest_event drift; independent review required';
  end if;
  if position(v_old in v_def) = 0 or position(v_new in v_def) > 0 then
    raise exception 'Unexpected action spec, refusing';
  end if;
  execute replace(v_def, v_old, v_new || v_old);
end $$;
commit;
