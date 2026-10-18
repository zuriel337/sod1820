-- Repository-only capability for a future 2029 Number-page adoption.
--
-- This is an additive compact projection over the existing canonical Number sources. It does
-- not replace fn_number_lookup, does not calculate Gematria, does not create a second registry,
-- and is not wired to a live flag or surface by this migration. The complete 37-field rows and
-- their Universal Finding projection remain an explicit depth read through fn_number_lookup.
--
-- RLS is load-bearing. SECURITY INVOKER preserves the caller's current visibility, including the
-- encrypted-word policy difference between a public/member caller and an authorized administrator.
create or replace function public.fn_number_opening_projection_2029(
  p_value bigint,
  p_per_method integer default 12
)
returns jsonb
language sql
stable
security invoker
set search_path to 'public'
as $function$
with params as (
  select greatest(1, least(coalesce(p_per_method, 12), 20))::integer as per_method
),
-- Same source and publication boundary as fn_number_lookup. An invoker sees only rows allowed by
-- the existing bidim/gematria_words RLS policies; no role or entitlement is inferred here.
hits as materialized (
  select
    b.method,
    b.phrase,
    b.value,
    b.bid_id,
    b.word_id,
    gw.id as gematria_word_id,
    gw.node_id,
    gw.ragil,
    gw.tags,
    gm.method_key,
    gm.db_column,
    gm.display_label,
    gm.sub,
    gm.soul,
    gm.required_entitlement,
    gm.version as registry_version,
    gm.category as method_category,
    gm.sort_order,
    gm.active,
    gm.in_engine,
    gm.scannable,
    gm.execution_kind,
    gm.derived_from,
    gm.operator,
    gm.mathematical_family,
    gm.order_sensitive,
    gm.word_boundary_sensitive,
    gm.final_letter_sensitive
  from public.bidim b
  join public.gematria_words gw on gw.id = b.word_id
  left join public.gematria_methods gm on gm.method_key = b.method
  where p_value is not null
    and b.value = p_value
    and gw.is_verified = true
    and coalesce(gw.is_published, false) = true
),
-- Registry functions run once per method, not once per phrase row.
method_flags as materialized (
  select
    m.method,
    public.fn_method_evidence_class(m.method) as evidence_class,
    public.fn_method_is_executable(m.method) as executable,
    public.fn_method_is_engine_verified(m.method) as engine_verified
  from (select distinct method from hits) m
),
ranked as materialized (
  select
    h.*,
    f.evidence_class,
    (f.evidence_class = 'governed') as governed,
    f.executable,
    f.engine_verified,
    row_number() over (
      partition by h.method, h.phrase
      order by h.bid_id nulls last, h.word_id nulls last
    ) as duplicate_rank
  from hits h
  left join method_flags f on f.method is not distinct from h.method
),
-- getValueFamilies counts unique phrases inside each method. Preserve that exact semantic while
-- retaining one stable source identity for each displayed phrase.
unique_phrases as materialized (
  select
    r.*,
    row_number() over (
      partition by r.method
      order by r.phrase nulls last, r.bid_id nulls last, r.word_id nulls last
    ) as phrase_rank,
    count(*) over (partition by r.method) as method_phrase_count
  from ranked r
  where r.duplicate_rank = 1
),
sample_rows as materialized (
  select u.*
  from unique_phrases u
  cross join params p
  where u.phrase_rank <= p.per_method
),
-- Enrich only rows that can appear in the opening. This avoids the old full-population composite
-- calculation and removes the client-side nodes/gematria_words enrichment fan-out.
enriched_samples as materialized (
  select
    s.*,
    case when s.method_category = 'composite' then (
      select c.component_values
      from public.fn_composite_calc(s.method, s.phrase) c
    ) else null end as component_values,
    nw.world
  from sample_rows s
  left join lateral (
    select n.metadata ->> 'world' as world
    from public.nodes n
    where n.type = 'entity'
      and (n.id = s.node_id or n.label = s.phrase)
    order by
      (n.id = s.node_id) desc,
      n.is_active desc nulls last,
      n.created_at desc nulls last,
      n.id
    limit 1
  ) nw on true
),
family_stats as materialized (
  select
    u.method,
    min(u.method_phrase_count)::bigint as phrase_count,
    count(*) filter (where u.phrase_rank <= p.per_method)::integer as sample_count,
    min(u.evidence_class) as evidence_class,
    bool_or(u.governed) as governed,
    bool_or(u.executable) as executable,
    bool_or(u.engine_verified) as engine_verified,
    min(u.method_key) as method_key,
    min(u.db_column) as db_column,
    min(u.display_label) as display_label,
    min(u.sub) as sub,
    min(u.soul) as soul,
    min(u.required_entitlement) as required_entitlement,
    min(u.registry_version) as registry_version,
    min(u.method_category) as method_category,
    min(u.sort_order) as sort_order,
    bool_or(u.active) as active,
    bool_or(u.in_engine) as in_engine,
    bool_or(u.scannable) as scannable,
    min(u.execution_kind) as execution_kind,
    min(u.derived_from) as derived_from,
    min(u.operator) as operator,
    min(u.mathematical_family) as mathematical_family,
    bool_or(u.order_sensitive) as order_sensitive,
    bool_or(u.word_boundary_sensitive) as word_boundary_sensitive,
    bool_or(u.final_letter_sensitive) as final_letter_sensitive
  from unique_phrases u
  cross join params p
  group by u.method
),
families as materialized (
  select
    f.*,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'phrase', s.phrase,
          'world', s.world,
          'ragil', s.ragil,
          'tags', to_jsonb(s.tags),
          'component_values', to_jsonb(s.component_values),
          'bid_id', s.bid_id
        )
        order by s.phrase_rank
      )
      from enriched_samples s
      where s.method is not distinct from f.method
    ), '[]'::jsonb) as samples,
    (
      select jsonb_build_object(
        'method', s.method,
        'phrase', s.phrase,
        'bid_id', s.bid_id
      )
      from enriched_samples s
      where s.method is not distinct from f.method
      order by s.phrase_rank desc
      limit 1
    ) as sample_cursor
  from family_stats f
),
totals as (
  select
    count(*)::bigint as source_row_count,
    (select count(*)::integer from families) as family_count,
    coalesce((select sum(phrase_count)::bigint from families), 0::bigint) as distinct_method_phrase_count,
    coalesce((select sum(sample_count)::bigint from families), 0::bigint) as opening_phrase_count,
    coalesce((select bool_and(sample_count::bigint = phrase_count) from families), true) as all_samples_complete
  from hits
)
select jsonb_build_object(
  'v', 1,
  'value', p_value,
  'per_method_limit', p.per_method,
  'ordering', 'registry_sort_order__then_count_desc__then_regular_governed_priority_method',
  'source_ordering', 'governed_first__then_atomic_before_composite__then_method__phrase__bid_id',
  'family_count', t.family_count,
  'source_row_count', t.source_row_count,
  'distinct_method_phrase_count', t.distinct_method_phrase_count,
  'opening_phrase_count', t.opening_phrase_count,
  'families', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'method', f.method,
        'priority', case f.method when 'רגיל' then 1 when 'מסתתר' then 1 when 'קדמי' then 1 when 'מילוי' then 2 when 'אתבש' then 3 else 4 end,
        'count', f.phrase_count,
        'composite', f.method_category = 'composite',
        'component_methods', case when f.method_category = 'composite' then to_jsonb(f.derived_from) else null end,
        'operator', f.operator,
        'governed', f.governed,
        'evidence_class', f.evidence_class,
        'method_active', f.active,
        'method_scannable', f.scannable,
        'method_executable', f.executable,
        'method_engine_verified', f.engine_verified,
        'registry', jsonb_build_object(
          'method_key', f.method_key,
          'db_column', f.db_column,
          'display_label', f.display_label,
          'sub', f.sub,
          'soul', f.soul,
          'required_entitlement', f.required_entitlement,
          'version', f.registry_version,
          'category', f.method_category,
          'sort_order', f.sort_order,
          'active', f.active,
          'in_engine', f.in_engine,
          'scannable', f.scannable,
          'execution_kind', f.execution_kind,
          'derived_from', to_jsonb(f.derived_from),
          'operator', f.operator,
          'mathematical_family', f.mathematical_family,
          'order_sensitive', f.order_sensitive,
          'word_boundary_sensitive', f.word_boundary_sensitive,
          'final_letter_sensitive', f.final_letter_sensitive
        ),
        'phrases', f.samples,
        'sample', jsonb_build_object(
          'limit', p.per_method,
          'returned_count', f.sample_count,
          'total_count', f.phrase_count,
          'cursor', f.sample_cursor,
          'has_more', f.sample_count::bigint < f.phrase_count,
          'complete', f.sample_count::bigint = f.phrase_count,
          'cursor_scope', 'opening_sample_checkpoint'
        )
      )
      order by
        f.sort_order asc nulls last,
        f.phrase_count desc,
        (f.method = 'רגיל') desc,
        f.governed desc,
        case f.method when 'רגיל' then 1 when 'מסתתר' then 1 when 'קדמי' then 1 when 'מילוי' then 2 when 'אתבש' then 3 else 4 end,
        f.method
    )
    from families f
  ), '[]'::jsonb),
  'completeness', jsonb_build_object(
    'opening', true,
    'families', true,
    'counts', true,
    'samples', t.all_samples_complete,
    'full_row_population', t.source_row_count = 0,
    'universal_findings', t.source_row_count = 0
  ),
  'depth', jsonb_build_object(
    'rpc', 'fn_number_lookup',
    'field_count', 37,
    'cursor', null,
    'cursor_field', 'bid_id',
    'has_more', t.source_row_count > 0,
    'complete', t.source_row_count = 0,
    'deferred', t.source_row_count > 0
  )
)
from params p
cross join totals t;
$function$;

comment on function public.fn_number_opening_projection_2029(bigint, integer) is
  'Compact exact Number opening: complete family list/counts + bounded displayed samples. Full 37-field rows and Universal Findings remain deferred to explicit fn_number_lookup depth. SECURITY INVOKER preserves RLS.';

-- Opt in only the same Data API roles used by the canonical public Number lookup. Avoid the
-- PostgreSQL default EXECUTE-to-PUBLIC exposure for future roles.
revoke all on function public.fn_number_opening_projection_2029(bigint, integer) from public;
grant execute on function public.fn_number_opening_projection_2029(bigint, integer) to anon, authenticated, service_role;
