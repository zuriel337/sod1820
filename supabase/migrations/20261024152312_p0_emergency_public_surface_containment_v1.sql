-- Emergency P0 containment for three accidentally public privileged surfaces.
--
-- This migration changes access only. It does not replace either function,
-- mutate gallery content, publish drafts, or alter the intended admin and
-- published-only policies.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $preflight$
declare
  v_oid oid;
  v_definition_md5 text;
  v_security_definer boolean;
  v_owner text;
  v_rls boolean;
  v_service_role_oid oid;
  v_policy_count integer;
  v_broad_policy_count integer;
begin
  select oid into v_service_role_oid from pg_roles where rolname = 'service_role';
  if v_service_role_oid is null then
    raise exception 'P0 preflight: service_role is missing';
  end if;

  v_oid := to_regprocedure('public.sod_fb_call(text,jsonb,integer,boolean)');
  if v_oid is null then
    raise exception 'P0 preflight: sod_fb_call signature is missing';
  end if;

  select md5(pg_get_functiondef(p.oid)), p.prosecdef, pg_get_userbyid(p.proowner)
    into v_definition_md5, v_security_definer, v_owner
  from pg_proc p
  where p.oid = v_oid;

  if v_definition_md5 <> '672b0dc0568a7c79c94fa49b03b580e0'
     or not v_security_definer
     or v_owner <> 'postgres' then
    raise exception 'P0 preflight: sod_fb_call drifted (md5 %, definer %, owner %)',
      v_definition_md5, v_security_definer, v_owner;
  end if;

  if exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    where p.oid = v_oid
      and a.privilege_type = 'EXECUTE'
      and a.grantee not in (0::oid, p.proowner, v_service_role_oid)
  ) then
    raise exception 'P0 preflight: sod_fb_call has an unexpected direct EXECUTE grantee';
  end if;

  if not has_function_privilege(
       'service_role', 'public.sod_fb_call(text,jsonb,integer,boolean)', 'EXECUTE')
     or has_function_privilege(
       'anon', 'public.sod_fb_call(text,jsonb,integer,boolean)', 'EXECUTE')
        <> has_function_privilege(
          'authenticated', 'public.sod_fb_call(text,jsonb,integer,boolean)', 'EXECUTE') then
    raise exception 'P0 preflight: sod_fb_call ACL is neither exact vulnerable nor contained state';
  end if;

  v_oid := to_regprocedure('public.wa_add_vip_word(text,text,text)');
  if v_oid is null then
    raise exception 'P0 preflight: wa_add_vip_word signature is missing';
  end if;

  select md5(pg_get_functiondef(p.oid)), p.prosecdef, pg_get_userbyid(p.proowner)
    into v_definition_md5, v_security_definer, v_owner
  from pg_proc p
  where p.oid = v_oid;

  if v_definition_md5 <> 'f1ab9e06ff969f474acb576a8d64d08e'
     or not v_security_definer
     or v_owner <> 'postgres' then
    raise exception 'P0 preflight: wa_add_vip_word drifted (md5 %, definer %, owner %)',
      v_definition_md5, v_security_definer, v_owner;
  end if;

  if exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    where p.oid = v_oid
      and a.privilege_type = 'EXECUTE'
      and a.grantee not in (0::oid, p.proowner, v_service_role_oid)
  ) then
    raise exception 'P0 preflight: wa_add_vip_word has an unexpected direct EXECUTE grantee';
  end if;

  if not has_function_privilege(
       'service_role', 'public.wa_add_vip_word(text,text,text)', 'EXECUTE')
     or has_function_privilege(
       'anon', 'public.wa_add_vip_word(text,text,text)', 'EXECUTE')
        <> has_function_privilege(
          'authenticated', 'public.wa_add_vip_word(text,text,text)', 'EXECUTE') then
    raise exception 'P0 preflight: wa_add_vip_word ACL is neither exact vulnerable nor contained state';
  end if;

  select c.relrowsecurity
    into v_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'gallery_posts';

  if not coalesce(v_rls, false) then
    raise exception 'P0 preflight: gallery_posts RLS is not enabled';
  end if;

  select
    count(*)::integer,
    count(*) filter (
      where policyname in ('allow_insert_anon', 'allow_select_anon')
    )::integer
  into v_policy_count, v_broad_policy_count
  from pg_policies
  where schemaname = 'public' and tablename = 'gallery_posts';

  if v_broad_policy_count not in (0, 2)
     or v_policy_count <> 2 + v_broad_policy_count
     or exists (
       select 1 from pg_policies
       where schemaname = 'public' and tablename = 'gallery_posts'
         and policyname not in (
           'allow_insert_anon',
           'allow_select_anon',
           'קריאה פתוחה לגלריה',
           'admin מנהל גלריה'
         )
     ) then
    raise exception 'P0 preflight: gallery policy inventory drifted (% total, % broad)',
      v_policy_count, v_broad_policy_count;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'gallery_posts'
      and policyname = 'allow_insert_anon'
  ) and not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'gallery_posts'
      and policyname = 'allow_insert_anon'
      and permissive = 'PERMISSIVE'
      and cmd = 'INSERT'
      and roles::text[] = array['anon','authenticated']::text[]
      and md5(coalesce(qual,'') || '|' || coalesce(with_check,'')) =
          '663636083cb0c137dbd994f4505e5127'
  ) then
    raise exception 'P0 preflight: allow_insert_anon policy drifted';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'gallery_posts'
      and policyname = 'allow_select_anon'
  ) and not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'gallery_posts'
      and policyname = 'allow_select_anon'
      and permissive = 'PERMISSIVE'
      and cmd = 'SELECT'
      and roles::text[] = array['anon','authenticated']::text[]
      and md5(coalesce(qual,'') || '|' || coalesce(with_check,'')) =
          'eb28d87532d6edd9b635727493ef89f7'
  ) then
    raise exception 'P0 preflight: allow_select_anon policy drifted';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'gallery_posts'
      and policyname = 'קריאה פתוחה לגלריה'
      and permissive = 'PERMISSIVE'
      and cmd = 'SELECT'
      and roles::text[] = array['public']::text[]
      and md5(coalesce(qual,'') || '|' || coalesce(with_check,'')) =
          '3b81c6a08144083bcfdd20cce8a6d069'
  ) then
    raise exception 'P0 preflight: published-only gallery policy is missing or drifted';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'gallery_posts'
      and policyname = 'admin מנהל גלריה'
      and permissive = 'PERMISSIVE'
      and cmd = 'ALL'
      and roles::text[] = array['public']::text[]
      and md5(coalesce(qual,'') || '|' || coalesce(with_check,'')) =
          'ebc49bc3d65640d685f76530f1771c55'
  ) then
    raise exception 'P0 preflight: admin gallery policy is missing or drifted';
  end if;
end
$preflight$;

revoke execute on function public.sod_fb_call(text,jsonb,integer,boolean)
  from public, anon, authenticated;
grant execute on function public.sod_fb_call(text,jsonb,integer,boolean)
  to service_role;

revoke execute on function public.wa_add_vip_word(text,text,text)
  from public, anon, authenticated;
grant execute on function public.wa_add_vip_word(text,text,text)
  to service_role;

drop policy if exists "allow_insert_anon" on public.gallery_posts;
drop policy if exists "allow_select_anon" on public.gallery_posts;

-- Keep authenticated INSERT for the existing admin role + RLS policy path.
-- Anonymous visitors have no legitimate writer path.
revoke insert on table public.gallery_posts from anon;

do $postconditions$
declare
  v_service_role_oid oid;
begin
  select oid into v_service_role_oid from pg_roles where rolname = 'service_role';

  if has_function_privilege(
      'anon', 'public.sod_fb_call(text,jsonb,integer,boolean)', 'EXECUTE')
     or has_function_privilege(
      'authenticated', 'public.sod_fb_call(text,jsonb,integer,boolean)', 'EXECUTE')
     or not has_function_privilege(
      'service_role', 'public.sod_fb_call(text,jsonb,integer,boolean)', 'EXECUTE') then
    raise exception 'P0 postcondition: sod_fb_call ACL is not contained';
  end if;

  if exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    where p.oid = to_regprocedure('public.sod_fb_call(text,jsonb,integer,boolean)')
      and a.privilege_type = 'EXECUTE'
      and a.grantee not in (p.proowner, v_service_role_oid)
  ) then
    raise exception 'P0 postcondition: sod_fb_call has an unexpected EXECUTE grantee';
  end if;

  if has_function_privilege(
      'anon', 'public.wa_add_vip_word(text,text,text)', 'EXECUTE')
     or has_function_privilege(
      'authenticated', 'public.wa_add_vip_word(text,text,text)', 'EXECUTE')
     or not has_function_privilege(
      'service_role', 'public.wa_add_vip_word(text,text,text)', 'EXECUTE') then
    raise exception 'P0 postcondition: wa_add_vip_word ACL is not contained';
  end if;

  if exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    where p.oid = to_regprocedure('public.wa_add_vip_word(text,text,text)')
      and a.privilege_type = 'EXECUTE'
      and a.grantee not in (p.proowner, v_service_role_oid)
  ) then
    raise exception 'P0 postcondition: wa_add_vip_word has an unexpected EXECUTE grantee';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'gallery_posts'
      and policyname in ('allow_insert_anon', 'allow_select_anon')
  ) then
    raise exception 'P0 postcondition: broad gallery policy remains';
  end if;

  if (select count(*) from pg_policies
      where schemaname = 'public' and tablename = 'gallery_posts') <> 2
     or exists (
       select 1 from pg_policies
       where schemaname = 'public' and tablename = 'gallery_posts'
         and policyname not in ('קריאה פתוחה לגלריה', 'admin מנהל גלריה')
     ) then
    raise exception 'P0 postcondition: unexpected gallery policy remains';
  end if;

  if has_table_privilege('anon', 'public.gallery_posts', 'INSERT') then
    raise exception 'P0 postcondition: anon still has gallery INSERT';
  end if;

  if not has_table_privilege('anon', 'public.gallery_posts', 'SELECT')
     or not has_table_privilege('authenticated', 'public.gallery_posts', 'SELECT')
     or not has_table_privilege('authenticated', 'public.gallery_posts', 'INSERT') then
    raise exception 'P0 postcondition: intended gallery grants were removed';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'gallery_posts'
      and policyname = 'קריאה פתוחה לגלריה'
      and md5(coalesce(qual,'') || '|' || coalesce(with_check,'')) =
          '3b81c6a08144083bcfdd20cce8a6d069'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'gallery_posts'
      and policyname = 'admin מנהל גלריה'
      and md5(coalesce(qual,'') || '|' || coalesce(with_check,'')) =
          'ebc49bc3d65640d685f76530f1771c55'
  ) then
    raise exception 'P0 postcondition: intended gallery policies changed';
  end if;
end
$postconditions$;

commit;
