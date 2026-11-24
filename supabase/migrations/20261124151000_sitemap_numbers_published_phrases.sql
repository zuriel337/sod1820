-- ZURIEL 24.11.2026: bring back to Google every number page that has real content, and only those.
-- Until now a number entered the sitemap (and is_number_indexable) only with 20 distinct phrases of any status, a gallery image
-- or an approved topic. 1,275 numbers with verified, published phrases stayed noindex. This keeps the three existing rules and
-- adds one: at least 3 distinct verified, published, visible phrases (the same filter as sitemap_phrases_v1). Below that the
-- page has too little text of its own and stays noindex. The guard refuses an unexpected function version.
do $guard$
begin
  if md5(pg_get_functiondef('public.sitemap_numbers()'::regprocedure)) <> 'b4923140caf0487fcfebc2c23b9b6661' then
    raise exception 'Unexpected sitemap_numbers version';
  end if;
end;
$guard$;

CREATE OR REPLACE FUNCTION public.sitemap_numbers()
 RETURNS TABLE(value integer, priority text, lastmod text)
 LANGUAGE sql
 STABLE
AS $function$
  with gem as (
    select ragil as v, count(distinct phrase)::int as c
    from gematria_words where ragil >= 10 group by ragil having count(distinct phrase) >= 20
  ),
  pub as (
    select ragil as v, max(coalesce(updated_at, created_at)) as d
    from gematria_words
    where ragil >= 10 and ragil <= 2147483647
      and coalesce(is_verified, false) and coalesce(is_published, false)
      and coalesce(visibility_tier::integer, 0) >= 1 and nullif(btrim(phrase), '') is not null
    group by ragil having count(distinct btrim(phrase)) >= 3
  ),
  gal as (
    select primary_value as v, max(coalesce(occurred_at, created_at)) as d
    from gallery_images where primary_value >= 10 group by primary_value
  ),
  tp as (
    select v, max(coalesce(approved_at, created_at)) as d
    from (select unnest(numbers) as v, approved_at, created_at from topic_cards where status='approved') x
    group by v
  ),
  ids as (select v from gem union select v::integer from pub union select v from gal union select v from tp),
  agg as (
    select i.v,
      (select c from gem where gem.v = i.v) as gc,
      (i.v in (select v from gal)) as has_gal,
      greatest((select d from gal where gal.v = i.v), (select d from tp where tp.v = i.v), (select d from pub where pub.v = i.v)) as d
    from ids i where i.v >= 10 and i.v is not null
  )
  select v as value,
    case when coalesce(gc, 0) >= 20 or has_gal then '0.7' else '0.6' end as priority,
    to_char(greatest(coalesce(d, timestamptz '2026-07-08'), timestamptz '2026-07-08'), 'YYYY-MM-DD') as lastmod
  from agg
  order by v;
$function$;
