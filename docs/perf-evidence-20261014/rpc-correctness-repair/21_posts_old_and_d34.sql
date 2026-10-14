\set ON_ERROR_STOP on
\i provenance-d34a910c/posts_fn.sql
-- d34 candidate (verbatim) needs its table; build it exactly as d34 posts_fix.sql does, but only the post_numbers part
drop table if exists post_numbers cascade;
create table post_numbers as
  select wp_id, num, min(rnk) rnk from (
    select p.wp_id, (m)[1]::int num, 1 rnk from posts p, regexp_matches(p.title, '(?<![0-9])([0-9]{1,9})(?![0-9])', 'g') m
    union all select p.wp_id, (m)[1]::int, 2 from posts p, unnest(p.tags) t, regexp_matches(t, '(?<![0-9])([0-9]{1,9})(?![0-9])', 'g') m) s group by wp_id, num;
create index post_numbers_num_idx on post_numbers (num, rnk);
CREATE OR REPLACE FUNCTION public.posts_by_number_strict_v2(num integer, lim integer DEFAULT 3) RETURNS TABLE(wp_id bigint, slug text, title text, date timestamp with time zone) LANGUAGE sql STABLE AS $function$
  select p.wp_id, p.slug, p.title, p.date from post_numbers n join posts p on p.wp_id = n.wp_id where n.num = posts_by_number_strict_v2.num order by n.rnk asc, p.date desc limit lim; $function$;
