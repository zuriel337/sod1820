\echo == Q1 home category list via GIN/partial (b1)
explain (analyze, buffers, costs off, timing off) select id,slug,title,home_hidden,categories,modified from posts where categories && array['שבילי שפה']::text[] and not (tags @> '{טיוטה}') and not (tags @> '{פורום}') order by modified desc nulls last limit 24;
\echo == Q1 big category (תיעוד אירועים = most common)
explain (analyze, buffers, costs off, timing off) select id,slug,title,home_hidden,categories,modified from posts where categories && array['תיעוד אירועים']::text[] and not (tags @> '{טיוטה}') and not (tags @> '{פורום}') order by modified desc nulls last limit 24;
\echo == Q1b exact count
explain (analyze, buffers, costs off, timing off) select count(*) from posts where categories && array['תיעוד אירועים']::text[] and not (tags @> '{טיוטה}') and not (tags @> '{פורום}');
\echo == Q2 latest feed
explain (analyze, buffers, costs off, timing off) select id,slug,title,image_url,thumb_url,date,modified,tags,home_hidden from posts where home_hidden=false and slug is not null and not (tags @> '{טיוטה}') and not (tags @> '{פורום}') and source in ('wordpress','SOD1820','sod1820') order by modified desc nulls last limit 21;
\echo == Q3 slug lookup
explain (analyze, buffers, costs off, timing off) select * from posts where slug='slug-777' limit 1;
