-- M0-A · admin and account-data guards - PROPOSED (not in supabase/migrations; production DB change, needs explicit ZURIEL approval).
-- Source: SOD1820_PERMISSIONS_MAP_20261112 §3.4-B/C and §6 items 1 and 6, owner decision "public world by default" (12.11.2026):
-- account, device, personal-activity, admin-permission, system-operation and paid-AI data do not become public.
--
--   1. admin_resolve_translit(text,text,boolean) - approves/rejects and PROMOTES transliterations; executable by every signed-in
--      user with no admin check. Gets the canonical admin guard (rd_is_admin(), as in admin_suggestion_decide). No caller in code.
--   2. admin_ai_cost(integer) - found by the exact verification of §6 item 1 (same class B): executable by every signed-in user,
--      no admin check, and returns paid-AI cost per source/model AND per WhatsApp chat (chat id = phone or group id, sender name).
--      Same guard. Wrapper src/lib/supabase.js getAiCostMetrics has no importer in shipped code; admins keep access.
--   3. wa_msg_count(uuid) - anyone could read the WhatsApp activity count of any account id. Server-only; its two SECURITY DEFINER
--      callers owned by postgres (research_level_of, my_research_level) run as the owner and are unaffected. No caller in code.
--   4. link_visitor_identity(text) - a signed-in user could re-link ANY visitor id to himself (ON CONFLICT overwrote user_id).
--      Now a visitor id already linked to a different account is left untouched; first link and re-link by the same account work.
--   5. gematria_wall - rows saved as private (185 of 28,950 on 12.11) were readable through the public policy. The public wall
--      (getWallRecent) already filters private=false, so nothing visible changes; admins keep reading private rows.
--   (feedback admin-only read is DEF-001b step 1 - not repeated here.)
--
-- Function bodies are NOT retyped: each is read from the live catalogue, verified by md5 against the reviewed text (12.11.2026),
-- patched at one exact anchor and re-created (CREATE OR REPLACE keeps owner and grants). Any drift stops the whole file.
-- Re-running is a no-op (an already-patched body is recognised by its md5).
-- Rollback: supabase/proposed/ROLLBACK_20261112130000_m0a_admin_and_account_guards.sql. Test: tests/sql/m0a_db_permissions_v1.sql.
-- Revision 14.11.2026 (foundation package, after an independent review): the file runs as ONE transaction with a lock timeout, a statement timeout and its OWN search_path
-- (the text of policy expressions that the guard compares depends on it); it takes SHARE UPDATE EXCLUSIVE on the tables it changes BEFORE it reads the catalogue, so a
-- policy change made by another session (CREATE / ALTER / DROP POLICY take ACCESS EXCLUSIVE, which conflicts with it) is either finished and seen by the guard or still
-- running (the file then fails on the lock timeout and changes nothing); and it carries a catalogue fingerprint guard. Locks: the policy DDL of this file waits for
-- running reads for at most the lock timeout (2s) and new reads queue behind it meanwhile; on a timeout nothing changes and the file is sent again later.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '60s';
set local search_path = public, pg_catalog;
lock table public.gematria_wall in share update exclusive mode;

-- Catalogue guard: wa_msg_count privileges (effective list and the PUBLIC entry), the gematria_wall policy, its column grants and comments (the three function bodies of this step are guarded by md5 below) must be exactly the live "before" state read on 14.11.2026 (fingerprint a824022fbfbc6aeedf0d351be430e485),
-- or already the "after" state of this file (fingerprint 192223d65171d46c109ce53b16efce93: a re-run is then a no-op). Anything else stops the file before any change.
create or replace function pg_temp.m0a_fp_s4_tail() returns text language sql stable as $f$
  select md5(string_agg(x, E'\n' order by x collate "C")) from (
    select 'x|wa_msg_count|'||r||'|'||has_function_privilege(r, 'public.wa_msg_count(uuid)'::regprocedure, 'EXECUTE')::text as x from unnest(array['anon','authenticated','service_role']) r
    union all select 'pub|wa_msg_count|'||exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0 and a.privilege_type = 'EXECUTE')::text from pg_proc p where p.oid = 'public.wa_msg_count(uuid)'::regprocedure
    union all select 'acl|wa_msg_count|'||coalesce((select string_agg(case when a.grantee = 0 then 'PUBLIC' else a.grantee::regrole::text end||':'||a.privilege_type||':'||a.is_grantable::text, ',' order by (case when a.grantee = 0 then 'PUBLIC' else a.grantee::regrole::text end) collate "C") from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a), '-') from pg_proc p where p.oid = 'public.wa_msg_count(uuid)'::regprocedure
    union all select 'p|'||tablename||'|'||policyname||'|'||cmd||'|'||permissive||'|'||(select string_agg(r, ',' order by r collate "C") from unnest(roles) r)||'|'||coalesce(qual,'-')||'|'||coalesce(with_check,'-') from pg_policies where schemaname='public' and tablename in ('gematria_wall')
    union all select 'rls|gematria_wall|'||relrowsecurity::text||'|'||relforcerowsecurity::text from pg_class where oid='public.gematria_wall'::regclass
    union all select 'cacl|'||c.relname||'.'||a.attname||'|'||a.attacl::text from pg_attribute a join pg_class c on c.oid = a.attrelid where a.attacl is not null and not a.attisdropped and c.oid = any(array['public.gematria_wall'::regclass])
    union all select 'cm|'||c.relname||'|'||p.polname||'|'||obj_description(p.oid, 'pg_policy') from pg_policy p join pg_class c on c.oid = p.polrelid where obj_description(p.oid, 'pg_policy') is not null and c.oid = any(array['public.gematria_wall'::regclass])
  ) q
$f$;
do $$
declare v text := pg_temp.m0a_fp_s4_tail();
begin
  if v not in ('a824022fbfbc6aeedf0d351be430e485', '192223d65171d46c109ce53b16efce93') then
    raise exception 'M0-A step 4: the catalogue is not the reviewed one (fingerprint %, expected a824022fbfbc6aeedf0d351be430e485 before or 192223d65171d46c109ce53b16efce93 after); nothing changed', v;
  end if;
end $$;

create or replace function pg_temp.m0a_patch(p_sig text, p_md5_before text, p_md5_after text, p_anchor text, p_replacement text)
returns text language plpgsql as $f$
declare d text; n text;
begin
  d := pg_get_functiondef(p_sig::regprocedure);
  if md5(d) = p_md5_after then return 'already'; end if;
  if md5(d) <> p_md5_before then raise exception 'M0-A drift: % changed since review (md5 %)', p_sig, md5(d); end if;
  n := replace(d, p_anchor, p_replacement);
  if n = d or (length(d) - length(replace(d, p_anchor, ''))) <> length(p_anchor) then raise exception 'M0-A anchor not unique in %', p_sig; end if;
  execute n;
  if md5(pg_get_functiondef(p_sig::regprocedure)) <> p_md5_after then raise exception 'M0-A: % re-created with an unexpected body', p_sig; end if;
  return 'patched';
end $f$;

-- 1 + 2: admin guard as the first statement.
select pg_temp.m0a_patch('public.admin_resolve_translit(text,text,boolean)',
  '2aab330cb1f1fc77e51d902dfae5041b', '29151b32c06ed3c36fab0211f243403b',
  E'declare v record;\nbegin\n',
  E'declare v record;\nbegin\n  if not public.rd_is_admin() then raise exception ''admin only'' using errcode = ''42501''; end if;\n');

select pg_temp.m0a_patch('public.admin_ai_cost(integer)',
  '0487c48ca5e930f132c3b30cceb69ca9', 'd33b0bfbaf9d1f39177333bef3024b9f',
  E'v_wa jsonb;\nbegin\n',
  E'v_wa jsonb;\nbegin\n  if not public.rd_is_admin() then raise exception ''admin only'' using errcode = ''42501''; end if;\n');

-- 4: no hijack of a visitor id that belongs to another account.
select pg_temp.m0a_patch('public.link_visitor_identity(text)',
  '4622faa398b9531275077139de09cc4e', '310dde303e978757604318a3f82a652a',
  E'on conflict (visitor) do update set user_id = excluded.user_id, email = excluded.email, last_seen = now();\n',
  E'on conflict (visitor) do update set user_id = excluded.user_id, email = excluded.email, last_seen = now()\n    where public.visitor_identity.user_id is null or public.visitor_identity.user_id = excluded.user_id;\n');

-- 3: wa_msg_count server-only.
revoke all on function public.wa_msg_count(uuid) from public;
revoke all on function public.wa_msg_count(uuid) from anon, authenticated;
grant execute on function public.wa_msg_count(uuid) to service_role;

-- 5: gematria_wall private rows hidden from the public (same policy name; one tree).
drop policy if exists "wall public read" on public.gematria_wall;
create policy "wall public read" on public.gematria_wall for select to public
  using (coalesce(private, false) = false or (select public.rd_is_admin()));

-- Postcondition: the catalogue is exactly the "after" state proven on the isolated fixture.
do $$
declare v text := pg_temp.m0a_fp_s4_tail();
begin
  if v <> '192223d65171d46c109ce53b16efce93' then
    raise exception 'M0-A step 4: the catalogue after the change is not the reviewed one (fingerprint %, expected 192223d65171d46c109ce53b16efce93)', v;
  end if;
end $$;

commit;
