-- RECORD of the LIVE definition of public.record_feedback (read 27.11.2026, md5 of pg_get_functiondef = 49b426c751f4dc98cc728872efd3ec31).
-- The function was created outside the repository migration history and is already live (EXECUTE for PUBLIC, anon, authenticated: unchanged and not touched here).
-- It is recorded now because the support-report path of the measurement closure (src/lib/issueReport2029.js) calls it: test/rpc-deploy-order-contract.test.mjs
-- requires every shipped RPC to be defined in a migration or a deploy-order manifest, and a live function belongs in the migrations (the live baseline is frozen).
-- This file changes NOTHING when it is run on the live database: it is the same definition. It is not applied by any pull request; production DB changes need ZURIEL's approval.
create or replace function public.record_feedback(p_context text, p_verdict text, p_query text default null::text, p_target text default null::text, p_detail text default null::text, p_visitor text default null::text, p_meta jsonb default '{}'::jsonb)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_id uuid;
begin
  if p_context is null or p_verdict is null then return null; end if;
  insert into feedback (context, verdict, query, target, detail, visitor_id, meta)
  values (p_context, p_verdict, p_query, p_target, p_detail, p_visitor, coalesce(p_meta,'{}'::jsonb))
  returning id into v_id;
  return v_id;
end $function$;
