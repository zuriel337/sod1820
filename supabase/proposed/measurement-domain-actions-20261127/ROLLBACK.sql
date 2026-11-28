-- Exact revert of PROPOSAL.sql: drops the two new functions. Nothing else was touched.
\set ON_ERROR_STOP on
begin;
drop function if exists public.research_domain_actions_2029(text);
drop function if exists public.fn_ti_domain_actions2029(text);
commit;
