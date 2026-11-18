\set ON_ERROR_STOP on
create or replace function public.fn_system_suggestion_notify_high() returns trigger language plpgsql as $$ begin return new; end $$;
\ir ../../supabase/proposed/20261118190000_provider_freshness_watch_PROPOSAL.sql
