\set ON_ERROR_STOP on
\echo '#### ' :fn ' matrix summary per role (cases, cases with any diff)'
select 'owner' as role, count(*) cases, count(*) filter (where old_only<>0 or new_only<>0 or not ordered_equal) diff_cases, count(*) filter (where err is not null) err_cases from lab_number_matrix(:'fn');
set role anon;
select 'anon', count(*), count(*) filter (where old_only<>0 or new_only<>0 or not ordered_equal), count(*) filter (where err is not null) from lab_number_matrix(:'fn');
set role authenticated;
select 'authenticated', count(*), count(*) filter (where old_only<>0 or new_only<>0 or not ordered_equal), count(*) filter (where err is not null) from lab_number_matrix(:'fn');
reset role;
\echo '-- first differing cases (owner)'
select v, lim, cursor_kind, old_only, new_only, ordered_equal, old_n, new_n, left(err,80) from lab_number_matrix(:'fn') where old_only<>0 or new_only<>0 or not ordered_equal order by v, lim nulls first, cursor_kind limit 8;
