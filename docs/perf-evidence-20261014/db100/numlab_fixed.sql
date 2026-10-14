-- PROPOSED fn_number_lookup_v2: same columns and same result, but (1) the per-method flags (evidence class, governed, executable, verified) are computed ONCE per
-- distinct method in the result (<= 41 registry rows) instead of 3-9 registry lookups per matching row; (2) composite component calc and provenance text are
-- computed only for the returned page; (3) total_count = count over the cheap base.
CREATE OR REPLACE FUNCTION public.fn_number_lookup_v2(p_value bigint, p_limit integer DEFAULT NULL::integer, p_after_bid_id text DEFAULT NULL::text)
 RETURNS TABLE(method text, phrase text, value bigint, source text, vip_source text, is_verified boolean, dna_status text, node_id uuid, category text, tags text[], mathematical_family text, order_sensitive boolean, word_boundary_sensitive boolean, final_letter_sensitive boolean, atomic_or_composite text, component_methods text[], component_values bigint[], operator text, provenance text, method_evidence_class text, method_governed boolean, method_active boolean, method_scannable boolean, method_executable boolean, method_engine_verified boolean, row_provenance_state text, bid_id text, word_id uuid, method_version integer, dependency_version_snapshot jsonb, computed_at timestamp with time zone, engine_run_id uuid, verified_at timestamp with time zone, verified_run_id uuid, verified_method_version integer, verified_mismatch_value bigint, total_count bigint)
 LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
with hits as (
  select b.method, b.phrase, b.value, b.bid_id, b.word_id, b.provenance_state, b.method_version, b.dependency_version_snapshot, b.computed_at, b.engine_run_id,
         b.verified_at, b.verified_run_id, b.verified_method_version, b.verified_mismatch_value,
         gw.id gw_id, gw.source, gw.vip_source, gw.is_verified, gw.dna_status, gw.node_id, gw.category, gw.tags
  from public.bidim b join public.gematria_words gw on gw.id = b.word_id
  where b.value = p_value and gw.is_verified = true and coalesce(gw.is_published, false) = true
), mflags as materialized (            -- one row per distinct method, registry functions run once each
  select m.method,
         public.fn_method_evidence_class(m.method) ev,
         public.fn_method_is_executable(m.method) executable,
         public.fn_method_is_engine_verified(m.method) engine_verified
  from (select distinct method from hits) m
), base as (
  select h.*, f.ev, f.executable, f.engine_verified, (f.ev = 'governed') governed,
         gm.mathematical_family, gm.order_sensitive, gm.word_boundary_sensitive, gm.final_letter_sensitive, gm.category mcat, gm.operator, gm.derived_from,
         gm.active, gm.scannable, gm.execution_kind
  from hits h join mflags f on f.method is not distinct from h.method left join public.gematria_methods gm on gm.method_key = h.method
), cursor_row as (
  select x.governed, x.mcat, x.method, x.phrase, x.bid_id from base x where x.bid_id = p_after_bid_id limit 1
), page_rows as (
  select x.* from base x
  where p_after_bid_id is null
     or (exists(select 1 from cursor_row)
         and ((not x.governed), (x.mcat = 'composite'), x.method, x.phrase, x.bid_id)
             > ((select not c.governed from cursor_row c), (select c.mcat = 'composite' from cursor_row c), (select c.method from cursor_row c), (select c.phrase from cursor_row c), (select c.bid_id from cursor_row c)))
  order by (not x.governed), (x.mcat = 'composite'), x.method, x.phrase, x.bid_id
  limit case when p_limit is null then null else greatest(1, least(p_limit, 500)) end
)
select p.method, p.phrase, p.value, p.source, p.vip_source, p.is_verified, p.dna_status, p.node_id, p.category, p.tags,
  p.mathematical_family, p.order_sensitive, p.word_boundary_sensitive, p.final_letter_sensitive,
  case when p.mcat = 'composite' then 'composite' else 'atomic' end,
  case when p.mcat = 'composite' then p.derived_from else null end,
  case when p.mcat = 'composite' then (select c.component_values from public.fn_composite_calc(p.method, p.phrase) c) else null end,
  p.operator,
  format('bidim(method=%s,value=%s) joined gematria_words(id=%s) joined gematria_methods registry (execution_kind=%s, operator=%s, evidence_class=%s)', p.method, p.value, p.gw_id, p.execution_kind, coalesce(p.operator, '-'), p.ev),
  p.ev, p.governed, p.active, p.scannable, p.executable, p.engine_verified, p.provenance_state, p.bid_id, p.word_id, p.method_version, p.dependency_version_snapshot,
  p.computed_at, p.engine_run_id, p.verified_at, p.verified_run_id, p.verified_method_version, p.verified_mismatch_value,
  (select count(*) from base)::bigint
from page_rows p;
$function$;
