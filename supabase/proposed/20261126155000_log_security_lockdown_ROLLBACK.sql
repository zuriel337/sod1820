-- Rollback of 20261126155000_log_security_lockdown_PROPOSAL.sql (NOT APPLIED; only after an explicit ZURIEL approval).
-- Restores the exact log_security read live on 26.11.2026 (md5 of prosrc 23b157d332e451d25a1c97794df0ad04) AND its original grants: EXECUTE for PUBLIC, anon and
-- authenticated. Re-opening those grants re-opens the gap; use it only to undo an unexpected break. Apply as ONE transaction.
do $guard$
begin
  if (select md5(prosrc) from pg_proc where oid='public.log_security(text,text,text,text)'::regprocedure) <> '5da1a927d79c1afcbf6e8cdbc4e4d528' then
    raise exception 'log_security is not the lockdown version; reconcile before rolling back';
  end if;
end
$guard$;

create or replace function public.log_security(p_country text, p_path text, p_ua text, p_ip text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  insert into public.security_log (country, path, ua, ip)
  values (upper(left(coalesce(nullif(p_country,''),'XX'),2)),
          left(coalesce(p_path,''), 300),
          left(coalesce(p_ua,''), 300),
          left(coalesce(p_ip,''), 60));
end; $function$;

grant execute on function public.log_security(text,text,text,text) to public, anon, authenticated;
