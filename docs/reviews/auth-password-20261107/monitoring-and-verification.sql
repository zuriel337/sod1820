-- READ-ONLY queries for the rollout (run in the Supabase SQL editor or through the read-only MCP). Nothing here writes.
-- A. Before the DB step: the live function must still be the exact source the proposal guards against.
--    expected: 8cbc40e56e8d8ce9869f70e09535a7e5   (the proposal refuses to run on anything else)
select md5(prosrc) as live_prosrc_md5, prosecdef as security_definer, proconfig
from pg_proc where oid = 'public.handle_new_user()'::regprocedure;

-- B. After the DB step: expected 297af9a064e502509b5b3d7935611fb6 (computed by scripts/run-handle-new-user-consent-sql-test.sh).
--    Same query as A.

-- C. After the DB step and a real test sign-up: no site-signup subscriber row may exist for accounts created since the change.
--    Replace :applied_at with the time the DB step was applied. expected: 0
select count(*) as accounts_auto_enrolled_since_change
from auth.users u
where u.created_at >= :'applied_at'::timestamptz
  and exists (select 1 from public.subscribers s where lower(s.email) = lower(u.email) and s.source = 'site-signup');

-- D. Account funnel (aggregate only; no addresses): created / confirmed / never signed in, per Israel day.
select (created_at at time zone 'Asia/Jerusalem')::date as day_il,
       count(*) as created,
       count(*) filter (where email_confirmed_at is not null) as confirmed,
       count(*) filter (where email_confirmed_at is not null and last_sign_in_at is null) as confirmed_never_signed_in,
       count(*) filter (where email_confirmed_at is null) as unconfirmed
from auth.users where created_at >= now() - interval '14 days' group by 1 order by 1 desc;

-- E. Gateway logs (Supabase query_logs, source edge_logs, ClickHouse): the Auth calls of the new flow by status. Watch for 500 and 429.
--   select log_attributes['request.method'] as method, log_attributes['request.path'] as path, log_attributes['response.status_code'] as status,
--          log_attributes['response.headers.x_sb_error_code'] as sb_error, count() as n
--   from logs where source = 'edge_logs'
--     and log_attributes['request.path'] in ('/auth/v1/signup','/auth/v1/resend','/auth/v1/recover','/auth/v1/verify','/auth/v1/user','/auth/v1/token')
--   group by method, path, status, sb_error order by n desc
-- Expected shape after rollout: no GET /auth/v1/verify (links are no longer sent), POST /auth/v1/verify 200, PUT /auth/v1/user 200 after recover.
