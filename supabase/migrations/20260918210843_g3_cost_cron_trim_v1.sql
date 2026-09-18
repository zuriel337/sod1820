-- G3 cost reduction: reversible pg_cron trim.
-- Live migration version: 20260918210843
-- No job deletion, no command/secret mutation, no Edge deployment.

do $$
declare
  v_id bigint;
begin
  select jobid into v_id from cron.job where jobname='lab-reflect';
  if v_id is null then raise exception 'missing cron job: lab-reflect'; end if;
  perform cron.alter_job(job_id := v_id, active := false);

  select jobid into v_id from cron.job where jobname='wa-mora';
  if v_id is null then raise exception 'missing cron job: wa-mora'; end if;
  perform cron.alter_job(job_id := v_id, active := false);

  select jobid into v_id from cron.job where jobname='share-to-facebook';
  if v_id is null then raise exception 'missing cron job: share-to-facebook'; end if;
  perform cron.alter_job(job_id := v_id, schedule := '*/30 * * * *');

  select jobid into v_id from cron.job where jobname='welcome-auto-new';
  if v_id is null then raise exception 'missing cron job: welcome-auto-new'; end if;
  perform cron.alter_job(job_id := v_id, schedule := '15 * * * *');

  select jobid into v_id from cron.job where jobname='reply-email-auto';
  if v_id is null then raise exception 'missing cron job: reply-email-auto'; end if;
  perform cron.alter_job(job_id := v_id, schedule := '*/30 * * * *');

  select jobid into v_id from cron.job where jobname='page-ready-auto';
  if v_id is null then raise exception 'missing cron job: page-ready-auto'; end if;
  perform cron.alter_job(job_id := v_id, schedule := '35 * * * *');
end
$$;
