\set ON_ERROR_STOP on
update cron.job set command = replace(command, '''days'',7', '''days'',14') where jobname = 'gsc-daily-sync';
\ir ../../supabase/proposed/20261118190000_provider_freshness_watch_PROPOSAL.sql
