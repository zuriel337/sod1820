-- G2 Gate 1: reversible quiesce of legacy autonomous semantic/projection regeneration.
-- Preserve payload/history/functions for replay. Do not touch wa-raziel.

do $$
declare r record;
begin
  for r in
    select jobid from cron.job
    where jobname in (
      'metatron-weekly',
      'metatron-seeds',
      'graph-wire-daily',
      'ti-demand-daily',
      'metatron-recommend',
      'research-extract-scan'
    )
  loop
    perform cron.unschedule(r.jobid);
  end loop;
end $$;

alter table public.posts disable trigger trg_convergence_promote;

revoke execute on function public.fn_ti_daily() from public, anon, authenticated;
grant execute on function public.fn_ti_daily() to service_role;

revoke execute on function public.fn_metatron_recommend() from public, anon, authenticated;
grant execute on function public.fn_metatron_recommend() to service_role;

revoke execute on function public.project_language_bridges() from public, anon, authenticated;
grant execute on function public.project_language_bridges() to service_role;

revoke execute on function public.fn_convergence_promote() from public, anon, authenticated;

comment on function public.fn_ti_daily() is 'Legacy TI->semantic-demand/Metatron materializer. Autonomous schedule quiesced in G2 2029 Gate 1; retained for bounded internal replay only.';
comment on function public.fn_metatron_recommend() is 'Legacy Metatron recommendation materializer. Autonomous schedule quiesced in G2 2029 Gate 1; retained for bounded internal replay only.';
comment on function public.project_language_bridges() is 'Legacy language-link graph projection. Client execution quiesced in G2 2029 Gate 1; retained for bounded internal replay only.';
comment on function public.fn_convergence_promote() is 'Legacy posts convergence-score/signature trigger function. Trigger disabled in G2 2029 Gate 1; function retained as historical/replay payload.';
