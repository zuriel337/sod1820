-- PROPOSED, NOT APPLIED. Requires an explicit ZURIEL approval (CLAUDE.md 0.4) before any apply_migration.
-- Number-page admission to search (public.sitemap_numbers, read by is_number_indexable, api/sitemap.js and api/og.js).
--
-- Today (live, read 20.11.2026): a number is admitted when it has >= 20 phrases in gematria_words (verified or not), a gallery image,
-- or an approved topic card; numbers 1-9 are never admitted. Result: 450 numbers admitted. 1,275 numbers that have at least one
-- verified, published phrase are NOT admitted (820 of them have three or more), and 48 numbers named in a public post title are not
-- admitted either (for example 78 and 787).
--
-- Proposed: count only verified, published phrases (verified_only_public_gematria_law) and admit a number that has
--   (a) at least 3 verified published phrases, or
--   (b) a gallery image, or
--   (c) an approved topic card, or
--   (d) a public post that names it in its title (the same rule posts_by_number_strict ranks first) AND at least one verified
--       published phrase. Quality check 20.11.2026: without the phrase condition, 20 numbers entered on a post title alone with nothing
--       to show, among them years (2014, 2023, 2026, 5784) and HTML entity codes that sit in imported titles (8211, 8212, 8230).
-- Read-only check of this exact rule AS THE PUBLIC READER (role anon, which is how api/sitemap.js and api/og.js call it), 20.11.2026:
--   445 -> 1,273 numbers; none of today's 445 leaves; 828 join. (As the owner role the same rule gives 450 -> 1,274: two approved topic
--   cards are not visible to anon. The public figure is the one the sitemap and the robots answer use.)
--   The 828 that join: 255 have ten or more verified phrases, 366 have five to nine, 203 have three or four, 4 have one or two together
--   with a public post that names them. Priority of today's 445 does not change.
-- lastmod: the newest verified phrase now counts (before, only galleries and topic cards dated a number). 37 of today's 445 get a later
--   date, none an earlier one, none in the future. 759 of the 828 that join have had no change since the floor date and would carry
--   2026-07-08. Their documents do change on the day this package is released (first words), so the floor date is a release decision:
--   set it to the release day when the rule is applied with that release, or leave it.
create or replace function public.sitemap_numbers()
 returns table(value integer, priority text, lastmod text)
 language sql
 stable
as $function$
  with gem as (
    select ragil as v, count(distinct phrase)::int as c, max(created_at) as d
    from gematria_words
    where ragil >= 10 and is_verified and is_published
    group by ragil having count(distinct phrase) >= 3
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
  pt as (
    select x.v, x.d
    from (
      select (m[1])::int as v, max(p.date) as d
      from posts p, regexp_matches(p.title, '(?:^|[^0-9])([0-9]{2,6})(?:[^0-9]|$)', 'g') m
      where not (coalesce(p.tags, '{}'::text[]) && array['טיוטה'::text])
      group by 1
    ) x
    where exists (select 1 from gematria_words w where w.ragil = x.v and w.is_verified and w.is_published)
  ),
  ids as (select v from gem union select v from gal union select v from tp union select v from pt),
  agg as (
    select i.v,
      (select c from gem where gem.v = i.v) as gc,
      (i.v in (select v from gal)) as has_gal,
      -- the newest verified phrase counts as a change too; never a date in the future
      least(greatest((select d from gem where gem.v = i.v), (select d from gal where gal.v = i.v), (select d from tp where tp.v = i.v), (select d from pt where pt.v = i.v)), now()) as d
    from ids i where i.v >= 10 and i.v is not null
  )
  select v as value,
    case when coalesce(gc, 0) >= 20 or has_gal then '0.7' else '0.6' end as priority,
    to_char(greatest(coalesce(d, timestamptz '2026-07-08'), timestamptz '2026-07-08'), 'YYYY-MM-DD') as lastmod
  from agg
  order by v;
$function$;
