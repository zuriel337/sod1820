CREATE OR REPLACE FUNCTION public.posts_by_number_strict(num integer, lim integer DEFAULT 3) RETURNS TABLE(wp_id bigint, slug text, title text, date timestamp with time zone) LANGUAGE sql STABLE AS $function$
  with ranked as (select p.wp_id, p.slug, p.title, p.date, case when p.title ~ ('(^|[^0-9])' || num::text || '([^0-9]|$)') then 1
        when exists (select 1 from unnest(p.tags) t where t ~ ('(^|[^0-9])' || num::text || '([^0-9]|$)')) then 2 else 9 end as rnk from posts p)
  select wp_id, slug, title, date from ranked where rnk < 9 order by rnk asc, date desc limit lim; $function$;
CREATE OR REPLACE FUNCTION public.get_category_videos(p_category text DEFAULT 'וידאו', p_limit integer DEFAULT 60) RETURNS TABLE(slug text, title text, poster_url text, video_url text, yt text, uploaded_at date, author text, post_only boolean, is_cipher boolean)
 LANGUAGE sql STABLE SET search_path TO 'public' AS $function$
  SELECT p.slug, p.title, coalesce(p.image_url, p.thumb_url) AS poster_url, (regexp_match(p.content, 'https?://[^"''\s]+\.mp4', 'i'))[1] AS video_url,
    (regexp_match(p.content, '(?:youtube\.com/(?:watch\?v=|embed/)|youtu\.be/|youtube-nocookie\.com/embed/)([A-Za-z0-9_-]{11})', 'i'))[1] AS yt, p.date::date AS uploaded_at, p.author,
    (p.content !~* 'https?://[^"''\s]+\.mp4' AND p.content !~* '(?:youtube\.com/(?:watch\?v=|embed/)|youtu\.be/|youtube-nocookie\.com/embed/)[A-Za-z0-9_-]{11}') AS post_only,
    (coalesce(p.tags,'{}') @> ARRAY['הצופן התנכי']) AS is_cipher
  FROM public.posts p WHERE p.categories @> ARRAY[p_category] AND NOT (coalesce(p.tags,'{}') @> ARRAY['טיוטה']) ORDER BY p.date DESC NULLS LAST LIMIT p_limit; $function$;
