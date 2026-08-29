-- P1 ADMIN RPC SECURITY CLOSURE — 3 FUNCTIONS ONLY
-- Human-Gate authorized by ZURIEL. work_log BEFORE entry 74427d4f-9f5a-4484-a74e-8d9cd33d6a90,
-- following the read-only classification pass in work_log 88f99daa-8e4b-433c-80e1-1d52b75e0e89.
-- Continues the pattern established by 20260829124609_m3_m4_admin_rpc_authorization_closure.sql.
--
-- Narrow scope. This migration touches EXACTLY three functions and nothing else:
--   P1-A  public.admin_inbox(text)
--   P1-B  public.admin_mark_message_read(text, bigint, boolean)
--   P1-C  public.admin_live_visitors(integer)
-- It does NOT touch the 5 P3 functions (admin_realtime_now, admin_real_traffic, admin_traffic,
-- admin_ai_tokens, admin_journey_experiments), M1 epistemic lifecycle, M2 ELS, Experience
-- Governance, analytics semantics/retention/cache architecture, the visitor identity model,
-- the contact_messages schema, publication semantics, or any RLS policy.
--
-- ── THE THREE FAILURES (re-verified live on project linswmnnkjxvweumprav before this migration) ──
--
-- P1-A  admin_inbox(text) was SECURITY DEFINER, EXECUTE granted to anon + authenticated, and its
--       ONLY authorization was a literal string compare: IF p_key <> 'sod1820' THEN RAISE. That
--       exact string is the client-side constant ADMIN_PASSWORD at src/legacy/legacy.jsx:2897,
--       which Vite inlines into the public JS bundle — so the "secret" is published with the site
--       and rotating it fixes nothing. Proven live in this pass inside a rolled-back transaction
--       as role `anon`: returned 6 contact_messages rows (name, email, subject, full body) and
--       907 subscribers rows (name, email). Unauthenticated sensitive admin PII read.
--
-- P1-B  admin_mark_message_read(text,bigint,boolean) was SECURITY DEFINER, EXECUTE granted to
--       anon + authenticated, same published-string gate, and it UPDATEs contact_messages.read.
--       Unauthenticated privileged state mutation.
--
-- P1-C  admin_live_visitors(integer) was SECURITY DEFINER with NO authorization logic whatsoever,
--       and its ACL was even wider than the other two — it carried PUBLIC (proacl '=X/postgres')
--       on top of anon + authenticated. It returns per-visitor live telemetry: current path,
--       referrer, device, a 6-step path trail, session duration, returning flag, and the visitor's
--       email when visitor_identity has identified them. Unauthenticated sensitive admin telemetry.
--
-- ── THE FIX: defense in depth, both layers, for all three ──
--
-- Layer A (body): the canonical SOD1820 admin predicate, copied verbatim from the existing sibling
--   RPCs admin_worklog_update / get_work_log_current / admin_manage_alias (M3) / admin_storage_put (M4):
--       if not exists (select 1 from public.users where id = auth.uid() and role = 'admin')
--       then raise exception 'not authorized'; end if;
--   No new role system, auth table, admin framework or permission engine is introduced.
--   A body check is required IN ADDITION to the ACL so a future accidental GRANT cannot silently
--   re-expose any of the three.
--
-- Layer B (ACL): PUBLIC and anon are stripped from all three. `authenticated` keeps EXECUTE — that
--   is intentional and matches admin_worklog_update's shape and the M3/M4 result: the real admin
--   reaches these through a logged-in browser session, and the body check is what authorizes.
--   Client-side isAdmin / route hiding / the legacy password prompt are NOT authorization.
--
-- ── ON THE RETAINED p_key PARAMETER (deliberate, not an oversight) ──
--
-- admin_inbox and admin_mark_message_read KEEP p_key in their signature, now unused and ignored.
-- Reasons: (1) CREATE OR REPLACE FUNCTION cannot drop or rename an existing parameter, so removing
-- it would mean creating a NEW overload and leaving the old anon-exposed one alive behind it, which
-- is strictly worse; (2) a DROP FUNCTION is a destructive change that was not authorized in this
-- pass's scope. The parameter is now inert: any value, including NULL, is accepted and ignored, and
-- authorization comes solely from auth.uid(). The application callers are updated in the same commit
-- to stop passing the shared secret (they now pass NULL).
--
-- ── CALLERS (grepped across the repo at origin/main e5f21efc AND all 74 live Edge Functions) ──
--   ZERO Edge Function callers. All three are client-side only.
--   admin_inbox              -> src/lib/supabase.js getAdminInbox  -> src/legacy/legacy.jsx:3276
--   admin_mark_message_read  -> src/lib/supabase.js markMessageRead -> src/legacy/legacy.jsx:3287
--   admin_live_visitors      -> src/lib/supabase.js getLiveVisitors -> src/pages/AdminPage.jsx:2860
--   The admin_live_visitors caller is the modern role=admin panel and needs NO code change.
--   The other two are the legacy /traffic dashboard; their JS wrappers lose the `key` argument.

-- ────────────────────────────────────────────────────────────────────────────
-- P1-A  public.admin_inbox(text)
-- Body: shared-secret gate REMOVED, canonical admin gate ADDED.
-- Data shape, ordering and limits are preserved exactly — this is authorization-only.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_inbox(p_key text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- canonical SOD1820 admin gate (same predicate as admin_worklog_update / admin_manage_alias).
  -- p_key is retained for signature compatibility ONLY and is deliberately ignored:
  -- it was a client-side shared secret shipped in the public bundle, never an authorization factor.
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN json_build_object(
    'messages', (SELECT COALESCE(json_agg(t), '[]'::json)
                 FROM (SELECT id, name, email, subject, message, read, created_at
                       FROM public.contact_messages ORDER BY created_at DESC LIMIT 500) t),
    'subscribers', (SELECT COALESCE(json_agg(s), '[]'::json)
                    FROM (SELECT id, email, name, source, active, created_at
                          FROM public.subscribers ORDER BY created_at DESC LIMIT 1000) s),
    'unread', (SELECT count(*) FROM public.contact_messages WHERE NOT read),
    'subscriber_count', (SELECT count(*) FROM public.subscribers WHERE active)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_inbox(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_inbox(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_inbox(text) TO authenticated;

COMMENT ON FUNCTION public.admin_inbox(text) IS
  'Admin inbox (contact_messages + subscribers). Authorization: server-side auth.uid() must map to public.users.role=''admin''. p_key is a retained-but-ignored legacy parameter (former client-side shared secret) — pass NULL. Secured 2026-08-29, work_log 74427d4f-9f5a-4484-a74e-8d9cd33d6a90.';

-- ────────────────────────────────────────────────────────────────────────────
-- P1-B  public.admin_mark_message_read(text, bigint, boolean)
-- Body: shared-secret gate REMOVED, canonical admin gate ADDED.
-- The UPDATE itself is unchanged — mark read/unread still works exactly as before for admins.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_mark_message_read(p_key text, p_id bigint, p_read boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- canonical SOD1820 admin gate. p_key retained for signature compatibility ONLY and ignored.
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.contact_messages SET read = p_read WHERE id = p_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_mark_message_read(text, bigint, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_mark_message_read(text, bigint, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_mark_message_read(text, bigint, boolean) TO authenticated;

COMMENT ON FUNCTION public.admin_mark_message_read(text, bigint, boolean) IS
  'Mark a contact message read/unread. Authorization: server-side auth.uid() must map to public.users.role=''admin''. p_key is a retained-but-ignored legacy parameter (former client-side shared secret) — pass NULL. Secured 2026-08-29, work_log 74427d4f-9f5a-4484-a74e-8d9cd33d6a90.';

-- ────────────────────────────────────────────────────────────────────────────
-- P1-C  public.admin_live_visitors(integer)
-- Body: canonical admin gate ADDED at the very top, BEFORE the analytics_cache read — so an
-- unauthorized caller cannot even be served a cached telemetry payload.
-- Everything below the gate (bot filtering, the CTEs, the returned fields including email/path,
-- the 60-second analytics_cache read/write, retention) is preserved BYTE-FOR-BYTE.
-- This pass is authorization-only: no analytics redesign, no identity-model change, no field removal.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_live_visitors(p_minutes integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_key text := 'admin_live_visitors:'||p_minutes; v_payload jsonb; v_on boolean := public._analytics_cache_on();
begin
  -- canonical SOD1820 admin gate, evaluated before ANY telemetry is read or served from cache.
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'not authorized';
  end if;

  if v_on then
    select payload into v_payload from public.analytics_cache
    where cache_key = v_key and computed_at > now() - interval '60 seconds';
    if v_payload is not null then return v_payload; end if;
  end if;
  with bots as (select left(visitor, 9) as sig from site_visits
      where ts >= now() - interval '24 hours' and visitor is not null group by 1 having count(distinct visitor) >= 2),
  idmap as (select visitor, email from visitor_identity where email is not null),
  active as (select visitor, max(ts) as last_ts, min(ts) as first_ts, count(*) as pages from site_visits
      where ts >= now() - (p_minutes || ' minutes')::interval and visitor is not null and left(visitor, 9) not in (select sig from bots)
      group by visitor order by max(ts) desc limit 60),
  cur as (select distinct on (visitor) visitor, path, referrer, device from site_visits
      where ts >= now() - (p_minutes || ' minutes')::interval and visitor is not null order by visitor, ts desc),
  trail as (select a.visitor, jsonb_agg(t.path order by t.ts) as paths from active a
      join lateral (select path, ts from site_visits s where s.visitor = a.visitor and s.ts >= now() - interval '30 minutes'
        order by ts desc limit 6) t on true group by a.visitor)
  select jsonb_build_object(
    'minutes', p_minutes,
    'online', (select count(*) from active),
    'returning', (select count(*) from active a where exists (select 1 from site_visits s where s.visitor = a.visitor
        and s.ts < now() - (p_minutes || ' minutes')::interval and s.ts >= now() - interval '30 days')),
    'identified', (select count(*) from active a where exists (select 1 from idmap im where im.visitor = a.visitor)),
    'visitors', coalesce((select jsonb_agg(jsonb_build_object(
        'v', left(a.visitor, 10), 'email', im.email, 'device', c.device, 'path', c.path, 'referrer', c.referrer, 'pages', a.pages,
        'secs_ago', extract(epoch from (now() - a.last_ts))::int, 'dur', extract(epoch from (a.last_ts - a.first_ts))::int,
        'returning', exists (select 1 from site_visits s where s.visitor = a.visitor
            and s.ts < now() - (p_minutes || ' minutes')::interval and s.ts >= now() - interval '30 days'),
        'trail', tr.paths) order by a.last_ts desc)
      from active a left join cur c on c.visitor = a.visitor left join idmap im on im.visitor = a.visitor left join trail tr on tr.visitor = a.visitor
    ), '[]'::jsonb)
  ) into v_payload;
  if v_on then
    insert into public.analytics_cache(cache_key,payload,computed_at) values (v_key,v_payload,now())
    on conflict (cache_key) do update set payload=excluded.payload, computed_at=now();
  end if;
  return v_payload;
end; $function$;

REVOKE ALL ON FUNCTION public.admin_live_visitors(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_live_visitors(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_live_visitors(integer) TO authenticated;

COMMENT ON FUNCTION public.admin_live_visitors(integer) IS
  'Live visitor telemetry for the admin panel. Authorization: server-side auth.uid() must map to public.users.role=''admin'', checked before any read or cache hit. Analytics semantics, fields and cache behaviour unchanged. Secured 2026-08-29, work_log 74427d4f-9f5a-4484-a74e-8d9cd33d6a90.';
