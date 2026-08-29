-- SECURITY CLOSURE: get_work_log_current() access-contract mismatch.
--
-- Problem (GPT cross-verification of the prior Foundation pass): get_work_log_current()
-- was created as SECURITY DEFINER with EXECUTE granted to anon/authenticated, mirroring
-- get_work_log()'s grants verbatim -- but get_work_log() (legacy, out of scope here) has
-- no internal authorization check, so mirroring its grants silently let ANY anon/
-- authenticated caller read work_log rows via `/rest/v1/rpc/get_work_log_current`,
-- bypassing the table's own RLS policy (work_log_admin_all: authenticated admin only).
--
-- Fix: adopt this table's OWN existing convention instead of the legacy function's
-- grants -- admin_worklog_update/_delete/_archive_done already gate access with an
-- explicit `auth.uid()` admin check in plpgsql, not via grant restriction alone (their
-- proacl still lists PUBLIC=X, unrevoked default -- the check is what actually protects
-- them). get_work_log_current() now does the same: SECURITY DEFINER, plpgsql, raises an
-- exception unless the calling JWT's auth.uid() maps to a public.users row with
-- role='admin'. anon EXECUTE is additionally revoked outright (anon has no auth.uid(),
-- so it can never pass the check anyway -- revoking it too is defense-in-depth /
-- least-privilege, not required for correctness).
--
-- Does not touch: work_log rows, superseded_by_id, archived, get_work_log() (legacy,
-- explicitly out of scope), work_log_view, RLS policies, admin_worklog_* functions.

create or replace function public.get_work_log_current()
returns setof public.work_log
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'not authorized';
  end if;
  return query select * from public.work_log_current;
end;
$function$;

comment on function public.get_work_log_current() is
  'Canonical Current Work Projection RPC for admin/agent operational bootstrap. Authorization: SECURITY DEFINER + explicit auth.uid() admin check (same convention as admin_worklog_update/_delete/_archive_done), NOT grant-restriction alone -- a caller whose auth.uid() does not map to public.users.role=''admin'' gets ''not authorized'' regardless of EXECUTE grant. Returns only archived=false AND superseded_by_id IS NULL rows, newest first. For explicit historical/audit retrieval (all rows, capped at the latest 1000 -- NOT a complete-history endpoint) use get_work_log() instead; for a guaranteed-complete historical read use a direct service-role/postgres query against work_log with no limit.';

revoke execute on function public.get_work_log_current() from anon;
-- authenticated keeps EXECUTE (gated by the internal admin check, same as admin_worklog_*);
-- postgres/service_role keep EXECUTE (server/agent paths that in practice read work_log
-- directly via SQL, bypassing RLS as superuser/service_role -- this function is not their
-- only path, but leaving their grant costs nothing and matches the existing pattern).
