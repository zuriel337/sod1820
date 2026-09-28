-- SEARCH_INDEXING_2029_V1
-- One indexability decision for verified phrase pages, shared by page robots and sitemap.
-- Does not create a content registry; it projects existing gematria_words lifecycle state.

create index if not exists idx_gw_phrase_indexable
on public.gematria_words (phrase)
where coalesce(is_verified,false)
  and coalesce(is_published,false)
  and coalesce(visibility_tier,0) >= 1
  and nullif(btrim(phrase),'') is not null;

create or replace view public.sitemap_phrases_v1
with (security_invoker=true)
as
select
  btrim(phrase) as phrase,
  max(coalesce(updated_at,created_at))::date as lastmod
from public.gematria_words
where coalesce(is_verified,false)
  and coalesce(is_published,false)
  and coalesce(visibility_tier,0) >= 1
  and nullif(btrim(phrase),'') is not null
group by btrim(phrase);

grant select on public.sitemap_phrases_v1 to anon,authenticated,service_role;

create or replace function public.is_phrase_indexable(p_phrase text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.sitemap_phrases_v1 s
    where s.phrase = btrim(p_phrase)
  );
$$;

revoke all on function public.is_phrase_indexable(text) from public;
grant execute on function public.is_phrase_indexable(text) to anon,authenticated,service_role;

comment on view public.sitemap_phrases_v1 is
  'SEARCH_INDEXABILITY_2029_V1: verified+published+visible phrase SSOT shared by sitemap and page robots.';
comment on function public.is_phrase_indexable(text) is
  'SEARCH_INDEXABILITY_2029_V1: fail-closed phrase indexability decision derived only from sitemap_phrases_v1.';
