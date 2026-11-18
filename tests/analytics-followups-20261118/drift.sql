\set ON_ERROR_STOP on
create or replace function public.fn_raziel_activity_notify(p_sender text, p_channel text) returns integer language sql as $$ select 0 $$;
\ir ../../supabase/proposed/20261118210000_analytics_followups_PROPOSAL.sql
