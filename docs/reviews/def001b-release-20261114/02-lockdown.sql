-- GENERATED; review/approval required. NO automatic execution.
-- Unit lockdown; source files are SHA-256 pinned in scripts/def001b-release-packet.mjs.
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
  if actual is null or actual <> all(array['b102b6ce02aa10f0e805766f02fda434']) then
    raise exception 'DEF001B lockdown precondition: unexpected catalogue %',actual;
  end if;
end $guard$;
do $index$ begin
  if not exists(select 1 from pg_index i join pg_attribute a on a.attrelid=i.indrelid and a.attname='endpoint'
    where i.indrelid='public.push_subscriptions'::regclass and i.indisunique and i.indisvalid and i.indisready
      and i.indpred is null and i.indexprs is null and i.indnkeyatts=1 and i.indkey[0]=a.attnum)
  then raise exception 'DEF001B endpoint unique index missing'; end if;
end $index$;
-- OPERATOR GATE: confirm both RPC routes in the live PostgREST schema before executing this file.
-- DEF-001b (step 2 of 2) - PROPOSED, not in supabase/migrations on purpose.
-- Precondition: step 1 is applied AND the frontend that uses push_subscription_upsert_v1 / push_subscription_delete_v1
-- (src/lib/push.js) is live. Applying this earlier breaks anonymous Web Push subscribe / unsubscribe.
-- After this, visitor_id, endpoint and the push keys of anonymous subscribers are no longer readable by clients.
-- Rollback: re-create the four ps_anon_* policies and `grant select, insert, update, delete ... to anon`.

drop policy if exists ps_anon_select on public.push_subscriptions;
drop policy if exists ps_anon_insert on public.push_subscriptions;
drop policy if exists ps_anon_update on public.push_subscriptions;
drop policy if exists ps_anon_delete on public.push_subscriptions;
revoke all on public.push_subscriptions from anon;

do $guard$
declare actual text;
begin
  select pg_temp.def001b_catalogue_md5() into actual;
  if actual is null or actual <> all(array['cfd6f768976982e51158bf89b4468b64']) then
    raise exception 'DEF001B lockdown postcondition: unexpected catalogue %',actual;
  end if;
end $guard$;
drop function pg_temp.def001b_catalogue_md5();
notify pgrst, 'reload schema';
commit;
