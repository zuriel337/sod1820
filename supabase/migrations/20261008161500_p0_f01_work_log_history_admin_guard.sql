-- F01 / SOD1820_P0_F01_F02_PATCH_BUILD_V1
-- Branch-only candidate. NOT APPLIED. Preserve the browser/admin history contract.
-- Historical unsecured definition is evidence only; never use it as an automatic rollback.
do $preflight$
declare
  v_body text;
  v_acl aclitem[];
begin
  select pg_get_functiondef(p.oid), p.proacl
    into v_body, v_acl
  from pg_proc p
  where p.oid = to_regprocedure('public.get_work_log()');
  if v_body is null
     or v_body not like '%RETURNS SETOF work_log%'
     or v_body not like '%SECURITY DEFINER%'
     or v_body not like '%order by created_at desc limit 1000%'
     or v_body like '%auth.uid()%'
  then
    raise exception 'F01 preflight drift: legacy function differs; stop for owner review';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='work_log'
      and policyname='work_log_admin_all' and cmd='ALL'
  ) then
    raise exception 'F01 preflight drift: admin work_log RLS policy missing';
  end if;
  if not exists (
    select 1 from pg_proc p
    where p.oid=to_regprocedure('public.get_work_log_current()')
      and pg_get_functiondef(p.oid) like '%role = ''admin''%'
  ) then
    raise exception 'F01 preflight drift: current admin-only sibling missing';
  end if;
end
$preflight$;

create or replace function public.get_work_log()
returns setof public.work_log
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'not authorized';
  end if;
  return query
    select * from public.work_log
    order by created_at desc
    limit 1000;
end;
$function$;

revoke execute on function public.get_work_log() from public, anon;
grant execute on function public.get_work_log() to authenticated;
-- service_role/postgres direct table or authorized view SQL remains the privileged
-- agent-history path; an RPC call without a real admin JWT fails the body check.

comment on function public.get_work_log() is
'Admin browser work-log history: authenticated admin JWT only, latest 1000 rows descending. Server/agent full history reads directly through privileged SQL, not this RPC. F01 fix; do not restore unauthenticated access as rollback.';
