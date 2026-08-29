-- SYSTEM GOVERNANCE FOUNDATION — M3 + M4 SECURITY CLOSURE
-- Human-Gate authorized by ZURIEL (work_log BEFORE entry 136e9c48-ced8-4bd4-b26d-e94e775970c6,
-- following the evidence pack in work_log 815ed991, decisions D1 + D2).
--
-- Narrow scope. This migration touches EXACTLY two functions and nothing else:
--   M3  public.admin_manage_alias(uuid, text, text)
--   M4  public.admin_storage_put(text, text, text, text)
-- It does NOT touch M1 epistemic lifecycle, M2 ELS self_published, Experience Governance,
-- word_aliases data, storage buckets, RLS policies, or any other admin RPC.
--
-- ── THE TWO FAILURES (verified live on project linswmnnkjxvweumprav before this migration) ──
--
-- M3  admin_manage_alias was SECURITY DEFINER with EXECUTE granted to `authenticated` and
--     ZERO authorization logic in its body. Proven live (inside a rolled-back transaction,
--     acting as role `authenticated` with a JWT sub belonging to a public.users row whose
--     role = 'user'): the calls returned 'verified' and 'deleted' without error. So any
--     logged-in non-admin user could flip word_aliases.verified and HARD DELETE alias rows.
--
-- M4  admin_storage_put was SECURITY DEFINER with EXECUTE held by PUBLIC (proacl '=X/postgres'),
--     so has_function_privilege('anon', ..., 'EXECUTE') was true. Its body reads FB_ADMIN_KEY
--     out of vault.decrypted_secrets and POSTs it as the x-fb-admin-key header to the
--     storage-put Edge Function. So an UNAUTHENTICATED caller could drive a privileged,
--     Vault-credentialed storage-write proxy. (Not exploited live -- invoking it would have
--     performed a real storage write; proof taken from proacl + has_function_privilege.)
--
-- ── THE FIX: defense in depth, both layers, for both functions ──
--
-- Layer A (body): the canonical SOD1820 admin predicate, copied verbatim from the existing
--   sibling RPCs admin_worklog_update / admin_worklog_archive_done / get_work_log_current:
--       if not exists (select 1 from public.users where id = auth.uid() and role = 'admin')
--       then raise exception 'not authorized'; end if;
--   No new role system, auth table, admin framework or permission engine is introduced.
--   A body check is required IN ADDITION to the ACL so that a future accidental GRANT
--   cannot silently re-expose either function.
--
-- Layer B (ACL): PUBLIC and anon are stripped from both. `authenticated` keeps EXECUTE --
--   that is intentional and matches admin_worklog_update's shape: the real admin reaches
--   these through a logged-in browser session, and the body check is what actually
--   authorizes. Client-side isAdmin is NOT authorization; the server-side check is.
--
-- ── DELETE SEMANTICS: DELIBERATELY UNCHANGED (everything_additive_law) ──
--   admin_manage_alias('delete') still hard-deletes for an authorized admin. That branch is a
--   LIVE intentional admin workflow (the 🗑 button + confirm() dialog in the Language Engine
--   tab, src/components/LanguageEngineTab.jsx), not dead legacy code. Redefining what delete
--   DOES for an authorized admin is a product decision requiring Human-Gate judgment, so this
--   migration only GATES delete behind the admin check and leaves its behaviour untouched.
--   Open Human-Gate item: whether hard delete should become a non-destructive state change
--   (word_aliases already carries a `verified` flag that 'hide' uses) to preserve provenance.
--
-- ── CALLERS VERIFIED BEFORE CHANGING ACLs ──
--   admin_manage_alias: 2 app call sites, both admin-only UI (LanguageEngineTab.jsx:382 and
--     :807 via manageAliasRpc in src/lib/supabase.js:841). Zero DB-internal callers. Keeping
--     `authenticated` EXECUTE keeps that admin workflow working.
--   admin_storage_put: ZERO callers anywhere -- no .rpc() in src/, no reference in
--     supabase/functions/, no other pg_proc body references it. Closing PUBLIC breaks nothing.
--
--   FB_ADMIN_KEY stays in Vault, read server-side inside the SECURITY DEFINER body, and is
--   never returned to any caller. No secret is moved to client code and the Vault pattern is
--   not replaced.

-- ─────────────────────────────────────────────────────────────────────────────
-- M3 — public.admin_manage_alias
-- Body is otherwise byte-identical to the live pre-migration definition; the only change is
-- the inserted authorization guard.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_manage_alias(p_id uuid, p_action text, p_by text DEFAULT 'admin'::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- canonical SOD1820 admin gate (same predicate as admin_worklog_update / get_work_log_current)
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'not authorized';
  end if;

  if p_action = 'delete' then delete from word_aliases where id = p_id; return 'deleted';
  elsif p_action = 'verify' then update word_aliases set verified=true where id = p_id; return 'verified';
  elsif p_action = 'hide' then update word_aliases set verified=false where id = p_id; return 'hidden';
  end if;
  return 'noop';
end $function$;

REVOKE ALL ON FUNCTION public.admin_manage_alias(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_manage_alias(uuid, text, text) FROM anon;
-- authenticated keeps EXECUTE on purpose: the admin UI calls it from a logged-in browser
-- session, and the body gate above is the actual authorization.
GRANT EXECUTE ON FUNCTION public.admin_manage_alias(uuid, text, text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- M4 — public.admin_storage_put
-- Body is otherwise byte-identical to the live pre-migration definition; the only change is
-- the inserted authorization guard. The Vault read and the Edge Function call are untouched.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_storage_put(p_path text, p_b64 text, p_mime text DEFAULT 'image/png'::text, p_bucket text DEFAULT 'gallery'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'vault'
AS $function$
declare v_key text; v_resp record;
begin
  -- canonical SOD1820 admin gate. Checked BEFORE the Vault secret is read, so a non-admin
  -- caller never reaches FB_ADMIN_KEY at all.
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'not authorized';
  end if;

  select decrypted_secret into v_key from vault.decrypted_secrets where name='FB_ADMIN_KEY' limit 1;
  if v_key is null then return jsonb_build_object('ok',false,'error','no FB_ADMIN_KEY in vault'); end if;
  select status, content into v_resp from extensions.http((
    'POST', 'https://linswmnnkjxvweumprav.supabase.co/functions/v1/storage-put',
    array[ extensions.http_header('x-fb-admin-key', v_key) ],
    'application/json',
    jsonb_build_object('bucket',p_bucket,'path',p_path,'mime',p_mime,'b64',p_b64)::text
  )::extensions.http_request);
  begin
    return jsonb_build_object('status', v_resp.status, 'body', v_resp.content::jsonb);
  exception when others then
    return jsonb_build_object('status', v_resp.status, 'raw', left(v_resp.content, 400));
  end;
end $function$;

-- This is the actual M4 closure: strip the PUBLIC grant that let anon in.
REVOKE ALL ON FUNCTION public.admin_storage_put(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_storage_put(text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_storage_put(text, text, text, text) TO authenticated;
