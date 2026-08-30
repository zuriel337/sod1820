-- Search Indexability Contract v1 — Number Page search gate.
-- ────────────────────────────────────────────────────────────────────────────
-- Human-Gate (ZURIEL): the Number Page search gate IS the existing canonical
-- "diamond" admission (gallery ∪ gematria-rich≥20 ∪ approved-convergence), the
-- exact same decision that public.sitemap_numbers() already computes.
--
-- STRICT single-source-of-truth: this predicate DERIVES from sitemap_numbers()
-- by consuming it directly. It does NOT re-implement or copy the diamond CTEs.
-- There is exactly one place the admission logic lives (sitemap_numbers); both
-- the sitemap builder (api/sitemap.js) and the per-page lookup (EntityPage)
-- resolve through that one source.
--
-- noindex is a SEARCH-publication state only — a non-admitted number page still
-- renders and stays fully accessible; it is merely not advertised for indexing.
create or replace function public.is_number_indexable(p_value integer)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.sitemap_numbers() s where s.value = p_value
  );
$$;

comment on function public.is_number_indexable(integer) is
  'Search publication gate for /number/:value pages. TRUE iff the value is admitted by the canonical diamond logic in public.sitemap_numbers() (single source of truth). Consumed by EntityPage to mirror sitemap admission as index/noindex. Not an existence/access gate — noindex pages still render.';

-- EntityPage runs in the browser as the anon role; mirror the grant that
-- sitemap_numbers() itself already carries (PUBLIC/anon/authenticated).
grant execute on function public.is_number_indexable(integer) to anon, authenticated;
