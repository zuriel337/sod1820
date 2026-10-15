-- Rollback for migration number_lookup_method_flags_20261014 (restores the pre-change definitions captured live on 2026-10-14).
-- fn_number_dossier / fn_number_journey: reverse the single substitution made by the migration.
do $$ declare d text; begin
  d := pg_get_functiondef('public.fn_number_dossier(integer)'::regprocedure);
  d := replace(d, 'from public.fn_number_lookup_core(p_value::bigint) l', 'from public.fn_number_lookup(p_value::bigint) l');
  execute d;
  d := pg_get_functiondef('public.fn_number_journey(integer)'::regprocedure);
  d := replace(d, 'cross join lateral public.fn_number_lookup_core(f.v::bigint) l', 'cross join lateral public.fn_number_lookup(f.v::bigint) l');
  execute d;
end $$;

-- fn_number_lookup: original body.
CREATE OR REPLACE FUNCTION public.fn_number_lookup(p_value bigint, p_limit integer DEFAULT NULL::integer, p_after_bid_id text DEFAULT NULL::text)
 RETURNS TABLE(method text, phrase text, value bigint, source text, vip_source text, is_verified boolean, dna_status text, node_id uuid, category text, tags text[], mathematical_family text, order_sensitive boolean, word_boundary_sensitive boolean, final_letter_sensitive boolean, atomic_or_composite text, component_methods text[], component_values bigint[], operator text, provenance text, method_evidence_class text, method_governed boolean, method_active boolean, method_scannable boolean, method_executable boolean, method_engine_verified boolean, row_provenance_state text, bid_id text, word_id uuid, method_version integer, dependency_version_snapshot jsonb, computed_at timestamp with time zone, engine_run_id uuid, verified_at timestamp with time zone, verified_run_id uuid, verified_method_version integer, verified_mismatch_value bigint, total_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
with base as (
  select
    b.method, b.phrase, b.value, gw.source, gw.vip_source,
    gw.is_verified, gw.dna_status, gw.node_id, gw.category, gw.tags,
    gm.mathematical_family, gm.order_sensitive, gm.word_boundary_sensitive,
    gm.final_letter_sensitive,
    case when gm.category = 'composite' then 'composite' else 'atomic' end as atomic_or_composite,
    case when gm.category = 'composite' then gm.derived_from else null end as component_methods,
    case when gm.category = 'composite'
         then (select c.component_values from public.fn_composite_calc(b.method, b.phrase) c)
         else null end as component_values,
    gm.operator,
    format(
      'bidim(method=%s,value=%s) joined gematria_words(id=%s) joined gematria_methods registry (execution_kind=%s, operator=%s, evidence_class=%s)',
      b.method, b.value, gw.id, gm.execution_kind, coalesce(gm.operator, '-'),
      public.fn_method_evidence_class(b.method)
    ) as provenance,
    public.fn_method_evidence_class(b.method) as method_evidence_class,
    public.fn_method_is_governed_evidence(b.method) as method_governed,
    gm.active as method_active,
    gm.scannable as method_scannable,
    public.fn_method_is_executable(b.method) as method_executable,
    public.fn_method_is_engine_verified(b.method) as method_engine_verified,
    b.provenance_state as row_provenance_state,
    b.bid_id, b.word_id, b.method_version, b.dependency_version_snapshot,
    b.computed_at, b.engine_run_id, b.verified_at, b.verified_run_id,
    b.verified_method_version, b.verified_mismatch_value,
    (not public.fn_method_is_governed_evidence(b.method)) as sort_not_governed,
    (gm.category = 'composite') as sort_composite
  from public.bidim b
  join public.gematria_words gw on gw.id = b.word_id
  left join public.gematria_methods gm on gm.method_key = b.method
  where b.value = p_value
    and gw.is_verified = true
    and coalesce(gw.is_published, false) = true
), cursor_row as (
  select x.sort_not_governed, x.sort_composite, x.method, x.phrase, x.bid_id
  from base x
  where x.bid_id = p_after_bid_id
  limit 1
), page_rows as (
  select x.*
  from base x
  where p_after_bid_id is null
     or (
       exists(select 1 from cursor_row)
       and (x.sort_not_governed, x.sort_composite, x.method, x.phrase, x.bid_id)
           > ((select c.sort_not_governed from cursor_row c),
              (select c.sort_composite from cursor_row c),
              (select c.method from cursor_row c),
              (select c.phrase from cursor_row c),
              (select c.bid_id from cursor_row c))
     )
  order by x.sort_not_governed, x.sort_composite, x.method, x.phrase, x.bid_id
  limit case when p_limit is null then null else greatest(1, least(p_limit, 500)) end
)
select
  p.method, p.phrase, p.value, p.source, p.vip_source,
  p.is_verified, p.dna_status, p.node_id, p.category, p.tags,
  p.mathematical_family, p.order_sensitive, p.word_boundary_sensitive,
  p.final_letter_sensitive, p.atomic_or_composite, p.component_methods,
  p.component_values, p.operator, p.provenance, p.method_evidence_class,
  p.method_governed, p.method_active, p.method_scannable, p.method_executable,
  p.method_engine_verified, p.row_provenance_state, p.bid_id, p.word_id,
  p.method_version, p.dependency_version_snapshot, p.computed_at, p.engine_run_id,
  p.verified_at, p.verified_run_id, p.verified_method_version,
  p.verified_mismatch_value, (select count(*) from base)::bigint as total_count
from page_rows p;
$function$;
drop function if exists public.fn_number_lookup_core(bigint);
