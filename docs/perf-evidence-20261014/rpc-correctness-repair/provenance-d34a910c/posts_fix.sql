-- v2: select/sort/limit first, regex only on the <= p_limit returned rows
CREATE OR REPLACE FUNCTION public.get_category_videos_v2(p_category text DEFAULT 'וידאו', p_limit integer DEFAULT 60) RETURNS TABLE(slug text, title text, poster_url text, video_url text, yt text, uploaded_at date, author text, post_only boolean, is_cipher boolean)
 LANGUAGE sql STABLE SET search_path TO 'public' AS $function$
  SELECT p.slug, p.title, coalesce(p.image_url, p.thumb_url), (regexp_match(p.content, 'https?://[^"''\s]+\.mp4', 'i'))[1],
    (regexp_match(p.content, '(?:youtube\.com/(?:watch\?v=|embed/)|youtu\.be/|youtube-nocookie\.com/embed/)([A-Za-z0-9_-]{11})', 'i'))[1], p.date::date, p.author,
    (p.content !~* 'https?://[^"''\s]+\.mp4' AND p.content !~* '(?:youtube\.com/(?:watch\?v=|embed/)|youtu\.be/|youtube-nocookie\.com/embed/)[A-Za-z0-9_-]{11}'),
    (coalesce(p.tags,'{}') @> ARRAY['הצופן התנכי'])
  FROM (SELECT * FROM public.posts q WHERE q.categories @> ARRAY[p_category] AND NOT (coalesce(q.tags,'{}') @> ARRAY['טיוטה']) ORDER BY q.date DESC NULLS LAST LIMIT p_limit) p
  ORDER BY p.date DESC NULLS LAST; $function$;
-- derived number index (maintained by trigger in the real design): which numbers a post title / tag mentions, rank 1 = title, 2 = tag
create table post_numbers as
  select wp_id, num, min(rnk) rnk from (
    select p.wp_id, (m)[1]::int num, 1 rnk from posts p, regexp_matches(p.title, '(?<![0-9])([0-9]{1,9})(?![0-9])', 'g') m
    union all select p.wp_id, (m)[1]::int, 2 from posts p, unnest(p.tags) t, regexp_matches(t, '(?<![0-9])([0-9]{1,9})(?![0-9])', 'g') m) s group by wp_id, num;
create index post_numbers_num_idx on post_numbers (num, rnk);
analyze post_numbers;
CREATE OR REPLACE FUNCTION public.posts_by_number_strict_v2(num integer, lim integer DEFAULT 3) RETURNS TABLE(wp_id bigint, slug text, title text, date timestamp with time zone) LANGUAGE sql STABLE AS $function$
  select p.wp_id, p.slug, p.title, p.date from post_numbers n join posts p on p.wp_id = n.wp_id where n.num = posts_by_number_strict_v2.num order by n.rnk asc, p.date desc limit lim; $function$;
