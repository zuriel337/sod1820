-- M0-A · remove four INACTIVE scheduled jobs that carry a secret in their URL - PROPOSED (production DB change, explicit approval).
-- Source: SOD1820_PERMISSIONS_MAP_20261112 §3.4-F / §6 item 8. Read-only evidence 12.11.2026 (the secret itself was never read out):
--   jobid 6  wa-deep-process  -> /functions/v1/wa-process   (inactive)
--   jobid 7  wa-poll          -> /functions/v1/wa-poll      (inactive)
--   jobid 22 wa-michael       -> /functions/v1/wa-michael   (inactive)
--   jobid 24 wa-gabriel       -> /functions/v1/wa-gabriel   (inactive)
-- All four embed the same 20-character value as "?s=..."; no other job, no public function and no code in the repository
-- contains or validates it (the four target functions in supabase/functions do not read the parameter). Removing the jobs removes
-- the value from cron.job; rotating it at its source is the runbook step in docs/reviews/m0-security-stabilization-20261112/README.md.
-- Every job is re-checked (name, id, inactive, carries the parameter) before removal; anything unexpected stops the file.
-- Rollback: supabase/proposed/ROLLBACK_20261112131500_m0a_cron_inactive_secret_jobs_unschedule.sql (re-creates them, inactive,
-- WITHOUT the old secret - by design).
do $$
declare r record; n int := 0;
begin
  for r in select * from (values (6::bigint, 'wa-deep-process'), (7, 'wa-poll'), (22, 'wa-michael'), (24, 'wa-gabriel')) as t(id, name) loop
    if not exists (select 1 from cron.job where jobid = r.id) then raise notice 'job % (%) already removed', r.id, r.name; continue; end if;
    if not exists (select 1 from cron.job where jobid = r.id and jobname = r.name and active = false and command ~ '[?&]s=') then
      raise exception 'M0-A cron: job % is not the reviewed inactive % with a query secret; stop', r.id, r.name;
    end if;
    perform cron.unschedule(r.id);
    n := n + 1;
  end loop;
  raise notice 'M0-A cron: % job(s) removed', n;
end $$;
