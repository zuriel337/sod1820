-- Exact revert of PROPOSAL.sql: drops the two new functions and their cache rows. Nothing else was touched.
\set ON_ERROR_STOP on
begin;
drop function if exists public.research_open_activity_2029(text);
drop function if exists public.fn_ti_open_activity2029(text);
delete from public.analytics_cache where producer='fn_ti_open_activity2029';
commit;
