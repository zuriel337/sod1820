create index posts_categories_gin on posts using gin (categories);
create index posts_public_modified_idx on posts (modified desc nulls last) where slug is not null and not (tags @> '{טיוטה}') and not (tags @> '{פורום}') and home_hidden = false;
create index posts_public_cat_feed on posts (modified desc nulls last) where not (tags @> '{טיוטה}') and not (tags @> '{פורום}');
analyze posts;
