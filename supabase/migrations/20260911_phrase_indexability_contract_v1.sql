-- Search Indexability Contract v1 — phrase sibling, EXTEND_EXISTING.
-- Keeps every /number/:phrase URL addressable, but only publishes phrases that already
-- carry canonical lifecycle/provenance signals. No new registry or quality score.

create or replace function public.sitemap_phrases()
returns table(phrase text, priority text, lastmod text)
language sql
stable
security invoker
set search_path = public
as $function$
  with eligible as (
    select
      btrim(g.phrase) as phrase,
      bool_or(g.dna_status in ('core','dna')) as strong_dna,
      bool_or(g.node_id is not null) as has_node,
      bool_or(coalesce(cardinality(g.source_wp_ids), 0) > 0) as has_source,
      max(coalesce(g.updated_at, g.created_at)) as changed_at
    from public.gematria_words g
    where g.is_verified = true
      and g.is_published = true
      and coalesce(g.is_encrypted, false) = false
      and nullif(btrim(g.phrase), '') is not null
      and (
        g.node_id is not null
        or g.dna_status in ('core','dna')
        or coalesce(cardinality(g.source_wp_ids), 0) > 0
      )
    group by btrim(g.phrase)
  )
  select
    e.phrase,
    case when e.strong_dna then '0.7' else '0.6' end as priority,
    to_char(coalesce(e.changed_at, timestamptz '2026-07-08'), 'YYYY-MM-DD') as lastmod
  from eligible e
  order by e.phrase;
$function$;

create or replace function public.is_phrase_indexable(p_phrase text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $function$
  select exists (
    select 1
    from public.sitemap_phrases() s
    where s.phrase = btrim(coalesce(p_phrase, ''))
  );
$function$;

grant execute on function public.sitemap_phrases() to anon, authenticated;
grant execute on function public.is_phrase_indexable(text) to anon, authenticated;

comment on function public.sitemap_phrases() is
  'Search Indexability Contract phrase projection: verified+published public phrases with existing canonical DNA/node/source provenance. Addressability is broader than indexability.';
comment on function public.is_phrase_indexable(text) is
  'Single phrase admission decision derived from sitemap_phrases(), sibling to is_number_indexable().';
