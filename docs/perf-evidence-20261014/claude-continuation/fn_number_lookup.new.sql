create or replace function public.fn_number_lookup(p_value bigint, p_limit integer default null::integer, p_after_bid_id text default null::text)
 returns table(method text, phrase text, value bigint, source text, vip_source text, is_verified boolean, dna_status text, node_id uuid, category text, tags text[], mathematical_family text, order_sensitive boolean, word_boundary_sensitive boolean, final_letter_sensitive boolean, atomic_or_composite text, component_methods text[], component_values bigint[], operator text, provenance text, method_evidence_class text, method_governed boolean, method_active boolean, method_scannable boolean, method_executable boolean, method_engine_verified boolean, row_provenance_state text, bid_id text, word_id uuid, method_version integer, dependency_version_snapshot jsonb, computed_at timestamptz, engine_run_id uuid, verified_at timestamptz, verified_run_id uuid, verified_method_version integer, verified_mismatch_value bigint, total_count bigint)
 language sql
 stable
 set search_path to 'public'
as $function$
with b0 as (
  select b.method, b.phrase, b.value, b.bid_id, b.word_id, b.provenance_state, b.method_version, b.dependency_version_snapshot,
    b.computed_at, b.engine_run_id, b.verified_at, b.verified_run_id, b.verified_method_version, b.verified_mismatch_value,
    gw.id gw_id, gw.source, gw.vip_source, gw.is_verified, gw.dna_status, gw.node_id, gw.category, gw.tags
  from public.bidim b join public.gematria_words gw on gw.id = b.word_id
  where b.value = p_value and gw.is_verified = true and coalesce(gw.is_published, false) = true
), mf as materialized (
  select m.method, public.fn_method_evidence_class(m.method) ec, public.fn_method_is_executable(m.method) ex, public.fn_method_is_engine_verified(m.method) ev
  from (select distinct method from b0) m
), base as (
  select x.method, x.phrase, x.value, x.source, x.vip_source, x.is_verified, x.dna_status, x.node_id, x.category, x.tags,
    gm.mathematical_family, gm.order_sensitive, gm.word_boundary_sensitive, gm.final_letter_sensitive,
    case when gm.category = 'composite' then 'composite' else 'atomic' end as atomic_or_composite,
    case when gm.category = 'composite' then gm.derived_from else null end as component_methods,
    case when gm.category = 'composite' then (select c.component_values from public.fn_composite_calc(x.method, x.phrase) c) else null end as component_values,
    gm.operator,
    format('bidim(method=%s,value=%s) joined gematria_words(id=%s) joined gematria_methods registry (execution_kind=%s, operator=%s, evidence_class=%s)',
      x.method, x.value, x.gw_id, gm.execution_kind, coalesce(gm.operator, '-'), mf.ec) as provenance,
    mf.ec as method_evidence_class, (mf.ec = 'governed') as method_governed, gm.active as method_active, gm.scannable as method_scannable,
    mf.ex as method_executable, mf.ev as method_engine_verified, x.provenance_state as row_provenance_state, x.bid_id, x.word_id, x.method_version,
    x.dependency_version_snapshot, x.computed_at, x.engine_run_id, x.verified_at, x.verified_run_id, x.verified_method_version, x.verified_mismatch_value,
    (mf.ec <> 'governed') as sort_not_governed, (gm.category = 'composite') as sort_composite
  from b0 x left join mf on mf.method is not distinct from x.method left join public.gematria_methods gm on gm.method_key = x.method
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
