-- PROPOSAL ONLY. Requires shared cron change authorization. No job/log deletion.
BEGIN;
DO $$ BEGIN
  IF (SELECT count(*) FROM cron.job WHERE
      (jobid=125 AND jobname='g3-agent-dispatch-recovery' AND md5(command)='7e9dc0599817c3ff850f38fc07326525') OR
      (jobid=126 AND jobname='g3-agent-routine-response-reconcile' AND md5(command)='3baabcf4d902c47a87abb21a452c0fde') OR
      (jobid=127 AND jobname='g3-gpt-result-wake-recovery' AND md5(command)='f013a462e5b72501690bf6f7b821971f')) <> 3
  THEN RAISE EXCEPTION 'coordination_job_identity_drift'; END IF;
  IF EXISTS(SELECT 1 FROM public.work_log WHERE NOT archived AND superseded_by_id IS NULL
       AND dispatch_state IN ('QUEUED','FIRE_REQUESTED','SESSION_STARTED','CLAIMED','RETRY_WAIT','DEFERRED'))
  THEN RAISE EXCEPTION 'active_dispatch_requires_review'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.nodes WHERE type='rule' AND is_active AND rule_id='inter_agent_coordination_law' AND rule_version=17)
  THEN RAISE EXCEPTION 'coordination_authority_drift'; END IF;
END $$;
SELECT cron.alter_job(125, active := false);
SELECT cron.alter_job(126, active := false);
SELECT cron.alter_job(127, active := false);
COMMIT;

-- Rollback, only if the prior schedules are again explicitly required:
-- rerun identity/no-pending/authority review, then
-- BEGIN;
-- SELECT cron.alter_job(125, active := true);
-- SELECT cron.alter_job(126, active := true);
-- SELECT cron.alter_job(127, active := true);
-- COMMIT;
-- The command, schedule, grant and all existing research/dispatch history survive.
