-- W2.2d · bounded multi-anchor support + Gematria structural controls.
-- EXTEND_EXISTING only. No new engine/store/registry/graph/bundle.
--
-- IMPORTANT REPLAY CLOSURE:
-- earlier repo migrations recreate fn_number_lookup in an order where the later identity/provenance
-- migration can overwrite the publication predicate added by the earlier hardening migration.
-- The live DB is already publication-safe; this later migration makes clean replay end in the same
-- safe state AND adds optional server-side keyset paging without changing legacy one-argument calls.

-- 1) SAME canonical fn_number_lookup — optional server-side page args, no v2/parallel RPC.
drop function if exists public.fn_number_lookup(bigint);
drop function if exists public.fn_number_lookup(bigint, integer, text);

create function public.fn_number_lookup(
  p_value bigint,
  p_limit integer default null,
  p_after_bid_id text default null
)
returns table(
  method text, phrase text, value bigint, source text, vip_source text, is_verified boolean,
  dna_status text, node_id uuid, category text, tags text[], mathematical_family text,
  order_sensitive boolean, word_boundary_sensitive boolean, final_letter_sensitive boolean,
  atomic_or_composite text, component_methods text[], component_values bigint[], operator text,
  provenance text, method_evidence_class text, method_governed boolean, method_active boolean,
  method_scannable boolean, method_executable boolean, method_engine_verified boolean,
  row_provenance_state text, bid_id text, word_id uuid, method_version integer,
  dependency_version_snapshot jsonb, computed_at timestamptz, engine_run_id uuid,
  verified_at timestamptz, verified_run_id uuid, verified_method_version integer,
  verified_mismatch_value bigint, total_count bigint
)
language sql
stable
set search_path to 'public'
as $function$
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

comment on function public.fn_number_lookup(bigint, integer, text) is
  'Canonical public Number lookup. verified+published only. Optional server-side keyset page over the existing governed-first total order. p_limit NULL preserves legacy one-argument behavior; W2 supplies a bounded limit. Same source-native bidim identity/provenance; no v2/parallel lookup.';

grant execute on function public.fn_number_lookup(bigint, integer, text) to anon, authenticated, service_role;

-- 2) Research control runner for METHOD-PAIR INVARIANCE.
-- This is not a Gematria engine. It consumes canonical gematria_api outputs only.
create or replace function public.fn_gematria_pair_invariance_control(
  p_anchor_texts text[],
  p_control_texts text[] default '{}'::text[]
)
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
with anchor_input as (
  select trim(t) as text
  from unnest(coalesce(p_anchor_texts, '{}'::text[])) t
  where trim(coalesce(t,'')) <> ''
  limit 4
), control_input as (
  select trim(t) as text
  from unnest(coalesce(p_control_texts, '{}'::text[])) t
  where trim(coalesce(t,'')) <> ''
  limit 24
), anchor_results as (
  select text, (public.gematria_api(text)->'methods') as methods
  from anchor_input
), control_results as (
  select text, (public.gematria_api(text)->'methods') as methods
  from control_input
), method_keys as (
  select distinct jsonb_object_keys(methods) as method_key
  from anchor_results
), method_pairs as (
  select a.method_key as method_a, b.method_key as method_b
  from method_keys a
  join method_keys b on a.method_key < b.method_key
), anchor_pair_values as (
  select p.method_a, p.method_b, a.text,
         ((a.methods->>p.method_a)::numeric + (a.methods->>p.method_b)::numeric) as pair_value
  from method_pairs p
  cross join anchor_results a
  where a.methods ? p.method_a and a.methods ? p.method_b
), invariants as (
  select method_a, method_b, min(pair_value) as pair_value
  from anchor_pair_values
  group by method_a, method_b
  having count(*) = (select count(*) from anchor_results)
     and count(distinct pair_value) = 1
), control_pair_values as (
  select i.method_a, i.method_b, i.pair_value, c.text,
         ((c.methods->>i.method_a)::numeric + (c.methods->>i.method_b)::numeric) as control_pair_value
  from invariants i
  cross join control_results c
  where c.methods ? i.method_a and c.methods ? i.method_b
), stats as (
  select i.method_a, i.method_b, i.pair_value,
         count(c.text)::int as tested_count,
         count(c.text) filter (where c.control_pair_value = i.pair_value)::int as matched_count
  from invariants i
  left join control_pair_values c
    on c.method_a=i.method_a and c.method_b=i.method_b and c.pair_value=i.pair_value
  group by i.method_a, i.method_b, i.pair_value
), evaluations as (
  select jsonb_build_object(
    'methods', jsonb_build_array(method_a, method_b),
    'value', pair_value,
    'anchor_count', (select count(*) from anchor_results),
    'control_tested', tested_count,
    'control_matched', matched_count,
    'base_rate', case when tested_count > 0 then matched_count::numeric / tested_count else null end,
    'expectedness', case
      when tested_count = 0 then 'unestimated_no_controls'
      when matched_count = tested_count then 'certain_under_bounded_control_set'
      when matched_count::numeric/tested_count >= 0.8 then 'high_under_bounded_control_set'
      when matched_count::numeric/tested_count >= 0.2 then 'moderate_under_bounded_control_set'
      else 'low_under_bounded_control_set'
    end,
    'evidence_relation', case
      when tested_count > 0 and matched_count = tested_count then 'derivation'
      else 'convergence'
    end,
    'reason', case
      when tested_count > 0 and matched_count = tested_count
        then 'method-pair invariant reproduced across the entire bounded control set; structurally expected, not independent corroboration'
      else 'method-pair invariant observed across anchors; control set does not establish structural certainty'
    end
  ) as evaluation
  from stats
)
select jsonb_build_object(
  'status','ok',
  'model','gematria_pair_invariance_control_v1',
  'engine','gematria_api',
  'anchor_count',(select count(*) from anchor_results),
  'control_count',(select count(*) from control_results),
  'evaluations',coalesce((select jsonb_agg(evaluation order by evaluation->'methods') from evaluations),'[]'::jsonb),
  'truth_boundary','control evaluation only; does not canonicalize, publish or create independent evidence'
);
$function$;

comment on function public.fn_gematria_pair_invariance_control(text[], text[]) is
  'Bounded Research Strategy control runner over canonical gematria_api outputs. Dynamically tests method-pair sum invariants across anchors and a supplied control set. High/base-rate invariants are classified as DERIVATION, never independent evidence. No writes.';

grant execute on function public.fn_gematria_pair_invariance_control(text[], text[]) to anon, authenticated, service_role;
