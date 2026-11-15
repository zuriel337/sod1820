-- GENERATED; review/approval required. NO automatic execution.
-- Unit rollback; source files are SHA-256 pinned in scripts/def001b-release-packet.mjs.
-- Guard covers the three table/column definitions, ACLs, RLS/policies and both RPC definitions/ACLs.
-- No guard against semantic changes outside these objects is claimed.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
set local search_path=public,pg_catalog;
lock table public.els_records,public.feedback,public.push_subscriptions in access exclusive mode;
do $role$ begin if current_user <> 'postgres' then raise exception 'DEF001B requires reviewed postgres owner'; end if; end $role$;
create or replace function pg_temp.def001b_catalogue_md5() returns text language sql stable as $catalogue$
  select md5(s.snapshot::text) from (select jsonb_build_object(
 'tables',(select jsonb_agg(jsonb_build_object('name',c.relname,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'kind',c.relkind,
 'grants',(select coalesce(jsonb_agg(jsonb_build_array(case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,pg_get_userbyid(a.grantor),a.privilege_type,a.is_grantable) order by a.grantee::regrole::text,a.privilege_type),'[]'::jsonb) from aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a))
 order by c.relname) from pg_class c where c.oid in ('public.feedback'::regclass,'public.els_records'::regclass,'public.push_subscriptions'::regclass)),
 'columns',(select jsonb_agg(jsonb_build_object('table',c.relname,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'default',(select pg_get_expr(d.adbin,d.adrelid) from pg_attrdef d where d.adrelid=a.attrelid and d.adnum=a.attnum),
 'grants',(select coalesce(jsonb_agg(jsonb_build_array(case when x.grantee=0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end,pg_get_userbyid(x.grantor),x.privilege_type,x.is_grantable) order by x.grantee::regrole::text,x.privilege_type),'[]'::jsonb) from aclexplode(a.attacl) x))
 order by c.relname,a.attnum) from pg_attribute a join pg_class c on c.oid=a.attrelid where c.oid in ('public.feedback'::regclass,'public.els_records'::regclass,'public.push_subscriptions'::regclass) and a.attnum>0 and not a.attisdropped),
 'policies',(select coalesce(jsonb_agg(to_jsonb(p)-'schemaname' order by p.tablename,p.policyname),'[]'::jsonb) from pg_policies p where p.schemaname='public' and p.tablename in ('feedback','els_records','push_subscriptions')),
 'functions',(select coalesce(jsonb_agg(jsonb_build_object('name',p.proname,'signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'config',p.proconfig,'body_md5',md5(p.prosrc),'args',pg_get_function_arguments(p.oid),'result',pg_get_function_result(p.oid),'language',(select lanname from pg_language where oid=p.prolang),'volatility',p.provolatile,'strict',p.proisstrict,'parallel',p.proparallel,'cost',p.procost,'rows',p.prorows,'leakproof',p.proleakproof,'returns_set',p.proretset,
 'grants',(select coalesce(jsonb_agg(jsonb_build_array(case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,pg_get_userbyid(a.grantor),a.privilege_type,a.is_grantable) order by a.grantee::regrole::text,a.privilege_type),'[]'::jsonb) from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a))
 order by p.oid::regprocedure::text),'[]'::jsonb) from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in ('push_subscription_upsert_v1','push_subscription_delete_v1'))
)) s(snapshot)
$catalogue$;
do $guard$
declare actual text;
begin
  select pg_temp.def001b_catalogue_md5() into actual;
  if actual is null or actual <> all(array['b102b6ce02aa10f0e805766f02fda434','cfd6f768976982e51158bf89b4468b64']) then
    raise exception 'DEF001B rollback precondition: unexpected catalogue %',actual;
  end if;
end $guard$;
-- Rollback of 20261106121000_def001b_visitor_id_exposure_step1.sql (and, if it was applied, of the step-2 lockdown). Restores the pre-change grants/policies.
-- Step-2 rollback (only if the lockdown file was applied):
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'push_subscriptions' and policyname = 'ps_anon_select') then
    create policy ps_anon_select on public.push_subscriptions for select to anon using (user_id is null);
    create policy ps_anon_insert on public.push_subscriptions for insert to anon with check (user_id is null);
    create policy ps_anon_update on public.push_subscriptions for update to anon using (user_id is null) with check (user_id is null);
    create policy ps_anon_delete on public.push_subscriptions for delete to anon using (user_id is null);
    grant select, insert, update, delete on public.push_subscriptions to anon;
  end if;
end $$;
-- Step-1 rollback:
drop policy if exists feedback_admin_read on public.feedback;
create policy feedback_public_read on public.feedback for select using (true);
grant select on public.feedback to anon;
revoke select on public.els_records from anon, authenticated;
grant select on public.els_records to anon, authenticated;
drop function if exists public.push_subscription_upsert_v1(text, text, text, text[], text, text);
drop function if exists public.push_subscription_delete_v1(text);

-- Exact reviewed live ACL restoration; the original rollback omits this permission.
grant maintain on public.push_subscriptions to anon;
do $guard$
declare actual text;
begin
  select pg_temp.def001b_catalogue_md5() into actual;
  if actual is null or actual <> all(array['cbfc8e604f7811199890789364e36651']) then
    raise exception 'DEF001B rollback postcondition: unexpected catalogue %',actual;
  end if;
end $guard$;
drop function pg_temp.def001b_catalogue_md5();
notify pgrst, 'reload schema';
commit;
