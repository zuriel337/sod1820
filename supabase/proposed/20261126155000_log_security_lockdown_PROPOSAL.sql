-- log_security lockdown: service_role only + a global ceiling (PROPOSAL, NOT APPLIED).
-- Apply only on an explicit ZURIEL approval of this exact file (CLAUDE.md 0.4: DDL and grants on the shared DB). Apply as ONE transaction.
-- Package: docs/reviews/security-edge-package-20261126/README.md. Safe to apply BEFORE the edge change is deployed: the only code that
-- ever called log_security was api/honeypot.js, which is not in the live 2029 root (security_log has had no row since 4.11.2026).
--
-- Gap closed (decision 337): log_security was EXECUTABLE BY PUBLIC, anon AND authenticated (ACL {=X/postgres,anon=X/postgres,
-- authenticated=X/postgres,...}) with no check of who reports. Anyone holding the public anon key could write rows, forge spikes and fill
-- the table. After this file only service_role may call it; its single caller is the edge function security-probe-log, which verifies the
-- Vercel OIDC token of the Production deployment first (same verifier as sg-rate-limit). No new role, table or secret in the database.
-- Not changed here (same class of exposure, separate decision): log_edge and log_crawl are also anon-callable counters.
-- Global ceiling: 60 rows per rolling minute, exact under concurrency (advisory lock). See the body comment for why it cannot hide a spike.
-- Guard: the live source must be the one read on 26.11.2026 (md5 of prosrc 23b157d332e451d25a1c97794df0ad04).
-- Rollback: 20261126155000_log_security_lockdown_ROLLBACK.sql (restores the body and the PUBLIC/anon/authenticated grants).
do $guard$
begin
  if (select md5(prosrc) from pg_proc where oid='public.log_security(text,text,text,text)'::regprocedure) <> '23b157d332e451d25a1c97794df0ad04' then
    raise exception 'log_security drifted from the 26.11.2026 source; reconcile before applying';
  end if;
end
$guard$;

create or replace function public.log_security(p_country text, p_path text, p_ua text, p_ip text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_recent int;
begin
  -- Global admission for ALL callers and ALL edge instances (decision 337): at most 60 rows in any rolling minute (<= 3,600 per hour).
  -- check_security_spike alerts at 150 rows per hour (or 100 from one country), so the ceiling never hides a spike; it only bounds the
  -- growth of security_log under a flood (about 1 MB per hour at the 300-byte row limit). The advisory lock makes the count exact.
  perform pg_advisory_xact_lock(hashtextextended('public.log_security', 0));
  select count(*) into v_recent
    from (select ts from public.security_log order by id desc limit 60) r
   where r.ts > now() - interval '1 minute';
  if v_recent >= 60 then return; end if;

  insert into public.security_log (country, path, ua, ip)
  values (upper(left(coalesce(nullif(p_country,''),'XX'),2)),
          left(coalesce(p_path,''), 300),
          left(coalesce(p_ua,''), 300),
          left(coalesce(p_ip,''), 60));
end; $function$;

revoke all on function public.log_security(text,text,text,text) from public, anon, authenticated;
grant execute on function public.log_security(text,text,text,text) to service_role;
