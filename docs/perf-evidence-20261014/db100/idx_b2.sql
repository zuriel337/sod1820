-- precomputed membership (maintained by trigger in the real design): category -> newest first
drop table if exists post_category_feed;
create table post_category_feed as select p.id post_id, c category, p.modified from posts p, unnest(p.categories) c where not (p.tags @> '{טיוטה}') and not (p.tags @> '{פורום}');
create index on post_category_feed (category, modified desc nulls last) include (post_id);
analyze post_category_feed;
