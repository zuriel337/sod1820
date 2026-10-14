\timing off
\set ON_ERROR_STOP 0
\echo == Q1 home category list (cat overlap, not draft/forum, order modified desc, limit 24) narrow
explain (analyze, buffers, costs off, timing off) select id,slug,title,home_hidden,categories,modified from posts where categories && array['שבילי שפה']::text[] and not (tags @> '{טיוטה}') and not (tags @> '{פורום}') order by modified desc nulls last limit 24;
\echo == Q1b same with count exact (what getPostsFromSupabase does)
explain (analyze, buffers, costs off, timing off) select count(*) from posts where categories && array['שבילי שפה']::text[] and not (tags @> '{טיוטה}') and not (tags @> '{פורום}');
\echo == Q2 latest feed (home_hidden=false, not draft/forum, source in, order modified desc, limit 21)
explain (analyze, buffers, costs off, timing off) select id,slug,title,image_url,thumb_url,date,modified,tags,home_hidden from posts where home_hidden=false and slug is not null and not (tags @> '{טיוטה}') and not (tags @> '{פורום}') and source in ('wordpress','SOD1820','sod1820') order by modified desc nulls last limit 21;
\echo == Q3 slug lookup
explain (analyze, buffers, costs off, timing off) select * from posts where slug='slug-777' limit 1;
\echo == Q4 ai_addition-like leading wildcard scan (as in Home query ilike %787%) on title
explain (analyze, buffers, costs off, timing off) select id from posts where title ilike '%787%' limit 12;
