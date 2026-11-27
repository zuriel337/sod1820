-- Read-only acceptance after an approved apply. Expected: every row true.
select 'rule_v4_present' k, position('(rule v4)' in pg_get_functiondef('public.fn_human_entrances(date,date)'::regprocedure)) > 0 ok
union all select 'same_signature_security', (select prosecdef and proconfig = array['search_path=public'] from pg_proc where oid='public.fn_human_entrances(date,date)'::regprocedure)
union all select 'no_flag_before_26_11', not exists (select 1 from public.fn_human_entrances(current_date-30, date '2026-11-25') where classification_reason like '%(rule v4)');
-- Evidence to read by eye: sessions flagged by v4 per day and landing path.
-- select day, landing_path, count(*) from public.fn_human_entrances(current_date-7, current_date) where classification_reason like '%(rule v4)' group by 1,2 order by 1,2;
