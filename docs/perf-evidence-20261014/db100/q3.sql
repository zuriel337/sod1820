\echo == Q1 via junction (b2) rare + big
explain (analyze, buffers, costs off, timing off) select p.id,p.slug,p.title from (select post_id from post_category_feed where category='שבילי שפה' order by modified desc nulls last limit 24) f join posts p on p.id=f.post_id;
explain (analyze, buffers, costs off, timing off) select p.id,p.slug,p.title from (select post_id from post_category_feed where category='תיעוד אירועים' order by modified desc nulls last limit 24) f join posts p on p.id=f.post_id;
