-- GENERATED; review/approval required. NO automatic execution.
-- Unit prepare; source files are SHA-256 pinned in scripts/def001b-release-packet.mjs.
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
  if actual is null or actual <> all(array['cbfc8e604f7811199890789364e36651']) then
    raise exception 'DEF001B prepare precondition: unexpected catalogue %',actual;
  end if;
end $guard$;
do $index$ begin
  if not exists(select 1 from pg_index i join pg_attribute a on a.attrelid=i.indrelid and a.attname='endpoint'
    where i.indrelid='public.push_subscriptions'::regclass and i.indisunique and i.indisvalid and i.indisready
      and i.indpred is null and i.indexprs is null and i.indnkeyatts=1 and i.indkey[0]=a.attnum)
  then raise exception 'DEF001B endpoint unique index missing'; end if;
end $index$;
-- DEF-001b (step 1 of 2) - stop guest visitor ids (bearer-style identifiers used by the guest notification RPCs and
-- watch_toggle) from being readable by clients. Companion of 20261106120000_def001_revoke_resolve_visitor_email.sql.
--
-- Exposure found in the audit: `visitor_id` is readable by anon in public.push_subscriptions (policy ps_anon_select),
-- public.feedback (policy feedback_public_read = true) and public.els_records (table-level SELECT). A visitor id is enough
-- to call notification_prefs_guest_save_v1 / watch_toggle for that guest.
--
-- Step 1 (this file) is backward compatible and safe to apply before any frontend deployment:
--   * feedback: no reader exists in src/, api/ or supabase/functions; only administrators keep read access.
--   * els_records: every reader selects an explicit column list that never contains visitor_id; the table-level SELECT
--     is replaced by a column grant that excludes it (service_role and the owner are unaffected).
--   * push_subscriptions: ADDS the two SECURITY DEFINER RPCs the client will use. Table access is NOT touched here.
-- Step 2 (supabase/proposed/20261106121500_def001b_push_subscriptions_lockdown.sql) removes the anon table access and
-- must only be applied AFTER the frontend that calls these RPCs (src/lib/push.js) is live.
--
-- NOT applied by this repository change. Apply only with explicit ZURIEL approval (production DB change).

-- feedback: administrators only.
drop policy if exists feedback_public_read on public.feedback;
create policy feedback_admin_read on public.feedback for select to authenticated
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));
revoke select on public.feedback from anon;

-- els_records: every column except visitor_id stays readable under the existing row policies.
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'els_records' and column_name <> 'visitor_id';
  if cols is null then raise exception 'els_records not found'; end if;
  execute 'revoke select on public.els_records from anon, authenticated';
  execute format('grant select (%s) on public.els_records to anon, authenticated', cols);
end $$;

-- push_subscriptions: write path through RPCs (the browser can then lose direct table access in step 2).
create or replace function public.push_subscription_upsert_v1(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_topics text[] default null,
  p_user_agent text default null,
  p_visitor text default null
) returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_endpoint text := btrim(coalesce(p_endpoint, ''));
  v_visitor text := nullif(lower(btrim(coalesce(p_visitor, ''))), '');
  v_topics text[] := coalesce(p_topics, '{}'::text[]);
begin
  if v_endpoint !~ '^https://' or length(v_endpoint) > 2048 then raise exception 'invalid endpoint'; end if;
  if length(coalesce(p_p256dh, '')) not between 1 and 512 or length(coalesce(p_auth, '')) not between 1 and 512 then
    raise exception 'invalid keys';
  end if;
  if v_visitor is not null and v_visitor !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'bad visitor identity';
  end if;
  if cardinality(v_topics) > 100 or exists (select 1 from unnest(v_topics) t where btrim(t) = '' or length(t) > 160) then
    raise exception 'invalid topics';
  end if;

  insert into public.push_subscriptions (endpoint, p256dh, auth, user_id, visitor_id, topics, user_agent, last_seen)
  values (v_endpoint, p_p256dh, p_auth, v_uid, case when v_uid is null then v_visitor end, v_topics,
          left(p_user_agent, 512), now())
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_id = excluded.user_id,
        visitor_id = excluded.visitor_id,
        topics = excluded.topics,
        user_agent = excluded.user_agent,
        last_seen = excluded.last_seen
    where public.push_subscriptions.user_id is null or public.push_subscriptions.user_id = v_uid;
end
$function$;

create or replace function public.push_subscription_delete_v1(p_endpoint text) returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  delete from public.push_subscriptions
  where endpoint = btrim(coalesce(p_endpoint, ''))
    and (user_id is null or user_id = auth.uid());
end
$function$;

revoke all on function public.push_subscription_upsert_v1(text, text, text, text[], text, text) from public;
revoke all on function public.push_subscription_delete_v1(text) from public;
grant execute on function public.push_subscription_upsert_v1(text, text, text, text[], text, text) to anon, authenticated, service_role;
grant execute on function public.push_subscription_delete_v1(text) to anon, authenticated, service_role;

do $guard$
declare actual text;
begin
  select pg_temp.def001b_catalogue_md5() into actual;
  if actual is null or actual <> all(array['b102b6ce02aa10f0e805766f02fda434']) then
    raise exception 'DEF001B prepare postcondition: unexpected catalogue %',actual;
  end if;
end $guard$;
drop function pg_temp.def001b_catalogue_md5();
notify pgrst, 'reload schema';
commit;
