-- GPT transactional replay fixture (run as table owner supabase_admin on a DISPOSABLE/branch DB; ends in ROLLBACK).
begin;
\i supabase/migrations/20261001060000_g3_wa_db_held_http_cutover_v4_net_acl.sql
\i supabase/migrations/20261001061000_g3_wa_db_held_http_cutover_v4_link_code.sql
select has_table_privilege('anon','net.http_request_queue','SELECT') as anon_q_must_be_false,
       has_table_privilege('authenticated','net._http_response','SELECT') as auth_r_must_be_false,
       has_function_privilege('anon','public.wa_vip_backfill_sql(text,int)','EXECUTE') as anon_vip_must_be_false,
       has_function_privilege('authenticated','public.fn_michael_execute(uuid)','EXECUTE') as auth_mich_must_be_false;
-- enqueue still works for postgres/security-definer callers, uncommitted
select net.http_post(url:='https://example.invalid/', body:='{}'::jsonb) as enqueued_request_id;
rollback;
