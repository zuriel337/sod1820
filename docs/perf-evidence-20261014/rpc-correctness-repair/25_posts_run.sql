\echo '####' :fn
select count(*) cases, count(*) filter (where miss<>0 or extra<>0 or not seq_equal or not subset_ok) diff_cases from lab_posts_matrix(:'fn');
select n, l, miss, extra, seq_equal, subset_ok from lab_posts_matrix(:'fn') where miss<>0 or extra<>0 or not seq_equal or not subset_ok order by n, l nulls first limit 12;
