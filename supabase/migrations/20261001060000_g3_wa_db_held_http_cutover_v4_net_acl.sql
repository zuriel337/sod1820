-- G3_WA_DB_HELD_HTTP_CUTOVER_V4 (1/2) — pg_net queue confidentiality.
-- BRANCH-ONLY CANDIDATE: not applied to live DB. No new table/queue/transport.
--
-- net.http_request_queue / net._http_response hold queued provider URLs (Green API id+token in the path)
-- and message bodies. Live ACL (2026-10-01): owner supabase_admin, PUBLIC = arwdDxtm (anon/authenticated can SELECT).
-- net.http_post/http_get are SECURITY DEFINER owned by supabase_admin, so enqueue by postgres /
-- security-definer callers does not depend on caller table privileges. net.http_* EXECUTE is NOT changed.
--
-- LIVE CAVEAT: the tables are owned by supabase_admin and postgres is neither owner nor member
-- (pg_has_role = false). REVOKE issued as postgres only emits "no privileges could be revoked" and is a no-op.
-- This migration therefore verifies the outcome and FAILS LOUDLY instead of claiming success; it must be
-- applied by a role that owns the tables (supabase_admin / Supabase support), then re-verified.

do $m$
declare
  t text;
  r text;
begin
  foreach t in array array['net.http_request_queue','net._http_response'] loop
    execute format('revoke all on table %s from public, anon, authenticated', t);
    execute format('grant select on table %s to service_role', t);
  end loop;

  foreach t in array array['net.http_request_queue','net._http_response'] loop
    foreach r in array array['anon','authenticated'] loop
      if has_table_privilege(r, t, 'SELECT,INSERT,UPDATE,DELETE') then
        raise exception 'pg_net ACL still open: % has privileges on % (apply as table owner supabase_admin)', r, t;
      end if;
    end loop;
    if exists (select 1 from pg_class c, aclexplode(c.relacl) a
               where c.oid = t::regclass and a.grantee = 0) then
      raise exception 'pg_net ACL still open: PUBLIC has privileges on %', t;
    end if;
  end loop;
end
$m$;
