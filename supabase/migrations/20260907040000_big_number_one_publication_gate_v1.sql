-- BIG_NUMBER_ONE_PUBLICATION_GATE_V1
-- Human Gate: ZURIEL, 2026-09-07.
--
-- One publication decision for pure numeric pages > 9999:
--   sitemap_numbers() = canonical publication/indexability SSOT
--   is_number_indexable() already derives from sitemap_numbers()
--   content_big_numbers() remains only as the legacy middleware compatibility adapter
--   and MUST NOT maintain a second definition of "rich enough".
--
-- Human/browser access is unchanged. middleware.js continues to fail closed for bots
-- when this RPC is unavailable. Future Number Page richness signals belong in
-- sitemap_numbers(); once admitted there, high-number crawler access follows automatically.

create or replace function public.content_big_numbers()
returns integer[]
language sql
stable
as $function$
  select coalesce(array_agg(s.value order by s.value), '{}'::integer[])
  from public.sitemap_numbers() s
  where s.value > 9999;
$function$;

comment on function public.content_big_numbers() is
  'Legacy middleware compatibility adapter. Since 2026-09-07 it derives exclusively from sitemap_numbers(), the canonical Number publication/indexability gate. Do not add independent richness logic here.';
