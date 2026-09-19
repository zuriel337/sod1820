-- Expression Evidence Dependency Normalization v1
-- EXTEND_EXISTING:
--   research_gold_hints_law v3 (dependency_before_rank)
--   canonical_methods_registry_law v6
--   engine_governance_registry_authority_law v1
--
-- Purpose:
-- Preserve distinct expression identities while preventing same-letter permutations
-- from inflating Research Strength merely because order-insensitive methods
-- necessarily return the same value. Rank, don't hide.

create or replace function public.fn_expression_letter_multiset_key(p_phrase text)
returns text
language sql
immutable
set search_path = public
as $$
  with normalized as (
    select translate(
      regexp_replace(
        regexp_replace(coalesce(p_phrase, ''), '[֑-ׇ]', '', 'g'),
        '[^א-ת]', '', 'g'
      ),
      'ךםןףץ', 'כמנפצ'
    ) as letters
  ),
  sorted as (
    select string_agg(ch, '' order by strpos('אבגדהוזחטיכלמנסעפצקרשת', ch), ch) as key
    from normalized,
         lateral unnest(regexp_split_to_array(letters, '')) as ch
    where ch <> ''
  )
  select case
    when coalesce(key, '') <> '' then 'he:' || key
    else 'raw:' || lower(regexp_replace(trim(coalesce(p_phrase, '')), '\s+', ' ', 'g'))
  end
  from sorted;
$$;

comment on function public.fn_expression_letter_multiset_key(text) is
  'Evidence-dependency key only; NEVER expression identity. Strips niqqud/non-Hebrew, normalizes finals to base letters, sorts the Hebrew letter multiset. Same-letter permutations share one dependency family for ranking while their phrase identities remain distinct.';

-- cross_method_strength already collapses dependent METHODS. Extend the same
-- dependency-before-rank rule to expression permutations.
drop view if exists public.cross_method_strength;

create view public.cross_method_strength
with (security_invoker = on) as
with tagged as (
  select
    b.value,
    b.phrase,
    b.method,
    b.priority,
    coalesce(gm.category, 'unregistered') as m_category,
    coalesce(gm.order_sensitive, false) as order_sensitive,
    public.fn_expression_letter_multiset_key(b.phrase) as expression_family_key
  from public.bidim b
  left join public.gematria_methods gm on gm.method_key = b.method
),
phrase_support as (
  select
    value,
    phrase,
    expression_family_key,
    bool_or(order_sensitive and m_category <> 'composite') as has_order_sensitive_atomic
  from tagged
  group by value, phrase, expression_family_key
),
expression_counts as (
  select
    value,
    count(distinct phrase) as phrase_count,
    count(distinct (
      case
        when has_order_sensitive_atomic then 'phrase:' || phrase
        else 'multiset:' || expression_family_key
      end
    )) as independent_phrase_count
  from phrase_support
  group by value
),
aggregated as (
  select
    t.value,
    count(*) filter (where t.priority = 1 and t.m_category <> 'composite') as p1_hits,
    public.fn_independent_method_set(
      array_agg(distinct t.method order by t.method)
        filter (where t.priority = 1 and t.m_category <> 'composite')
    ) as p1_methods,
    public.fn_independent_method_set(
      array_agg(distinct t.method order by t.method)
        filter (where t.m_category <> 'composite')
    ) as methods,
    bool_or(t.method = 'רגיל' and t.m_category <> 'composite') as in_ragil,
    bool_or(t.method = 'מסתתר' and t.m_category <> 'composite') as in_misratar,
    bool_or(t.method = 'קדמי' and t.m_category <> 'composite') as in_kadmi,
    array_agg(distinct t.method order by t.method)
      filter (where t.m_category = 'composite') as dependent_methods,
    count(distinct t.phrase)
      filter (where t.m_category = 'composite') as dependent_phrase_count,
    array_agg(distinct t.method order by t.method)
      filter (where t.m_category = 'unregistered') as unregistered_methods
  from tagged t
  group by t.value
)
select
  a.value,
  e.phrase_count,
  e.independent_phrase_count,
  greatest(e.phrase_count - e.independent_phrase_count, 0) as dependent_expression_phrase_count,
  a.p1_hits,
  coalesce(cardinality(a.p1_methods), 0) as independent_p1_method_count,
  a.methods,
  a.in_ragil,
  a.in_misratar,
  a.in_kadmi,
  case
    when a.in_ragil and a.in_misratar and a.in_kadmi then 'CORE_AXIS_CANDIDATE'
    when coalesce(cardinality(a.p1_methods), 0) >= 2 then 'CROSS_METHOD'
    else 'SINGLE'
  end as signal,
  a.dependent_methods,
  a.dependent_phrase_count,
  a.unregistered_methods
from aggregated a
join expression_counts e using (value);

comment on view public.cross_method_strength is
  'Derived contextual/research-strength signal only, never Truth. Backward-compatible raw phrase_count/p1_hits are preserved. independent_phrase_count dependency-normalizes same-letter permutations only when their support at this value is order-insensitive; a phrase with atomic order-sensitive support remains independently countable. dependent_expression_phrase_count exposes the collapsed delta. independent_p1_method_count drives CROSS_METHOD rather than raw P1 rows. Existing method dependency normalization remains in force. Rank, do not hide.';

grant select on public.cross_method_strength to service_role;

-- Pair-level relation reliability already detects anagrams. Correct its
-- engine-strength calculation so order-insensitive method matches are not
-- counted as independent corroboration for same-letter permutations.
create or replace function public.fn_relation_candidate(p_a text, p_b text)
returns jsonb
language plpgsql
stable
set search_path = public
as $function$
declare
  node_a uuid; node_b uuid;
  engine_evidence jsonb; composite_evidence jsonb; independent_evidence jsonb; noise_flags text[];
  independent_composite_keys text[] := array[]::text[];
  raw_independent_group_count int; raw_position_sensitive_group_count int;
  effective_independent_group_count int; effective_position_sensitive_group_count int;
  dependent_expression_group_count int;
  min_rarity numeric; rarity_bonus numeric;
  engine_signal numeric; has_independent boolean; research_priority text; confidence text;
  same_letter_permutation boolean := false;
begin
  select node_id into node_a from gematria_words where phrase = p_a limit 1;
  select node_id into node_b from gematria_words where phrase = p_b limit 1;

  noise_flags := public.fn_relation_noise_flags(p_a, p_b);
  same_letter_permutation := 'anagram_same_letter_multiset' = any(noise_flags);

  -- Composite governance remains authoritative. A composite may count as a
  -- secondary independent lead only when the existing composite evaluator says
  -- its components do NOT already explain the match.
  composite_evidence := public.fn_relation_composite_evidence(p_a, p_b);
  select coalesce(array_agg(distinct e->>'composite_key'), array[]::text[])
  into independent_composite_keys
  from jsonb_array_elements(composite_evidence) e
  where coalesce((e->>'independent_evidence')::boolean, false)
    and coalesce(e->>'operator','') = 'sum';

  with dg as (
    select
      d.*,
      coalesce(gm.category, 'unregistered') as method_category,
      (d.method = any(independent_composite_keys)) as independent_composite
    from public.fn_relation_dependency_groups(p_a, p_b) d
    left join public.gematria_methods gm on gm.method_key = d.method
  ),
  group_stats as (
    select
      group_repr,
      bool_or(group_is_position_sensitive) as is_position_sensitive,
      bool_or(group_is_position_sensitive and method_category <> 'composite') as has_atomic_position_sensitive,
      bool_or(independent_composite) as has_independent_composite,
      min(normalized_rarity) as min_rarity
    from dg
    group by group_repr
  )
  select
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'method', d.method,
        'value', d.value,
        'group_repr', d.group_repr,
        'group_is_position_sensitive', d.group_is_position_sensitive,
        'method_category', d.method_category,
        'raw_frequency', d.raw_frequency,
        'method_population', d.method_population,
        'normalized_rarity', d.normalized_rarity,
        'expression_dependency',
          case
            when not same_letter_permutation then 'ordinary_relation'
            when d.method_category = 'composite' and d.independent_composite
              then 'same_letter_multiset_independent_composite_lead'
            when d.method_category = 'composite'
              then 'same_letter_multiset_dependent_composite'
            when d.group_is_position_sensitive
              then 'same_letter_multiset_order_sensitive_potentially_independent'
            else 'same_letter_multiset_order_insensitive_dependent'
          end
      ))
      from dg d
    ), '[]'::jsonb),
    (select count(*) from group_stats),
    (select count(*) from group_stats where is_position_sensitive),
    (select count(*) from group_stats
      where not same_letter_permutation
         or has_atomic_position_sensitive
         or has_independent_composite),
    (select count(*) from group_stats
      where (not same_letter_permutation and is_position_sensitive)
         or (same_letter_permutation and is_position_sensitive
             and (has_atomic_position_sensitive or has_independent_composite))),
    (select min(min_rarity) from group_stats),
    (select coalesce(sum(1 - min_rarity),0) from group_stats
      where not same_letter_permutation
         or has_atomic_position_sensitive
         or has_independent_composite)
  into
    engine_evidence,
    raw_independent_group_count,
    raw_position_sensitive_group_count,
    effective_independent_group_count,
    effective_position_sensitive_group_count,
    min_rarity,
    rarity_bonus;

  dependent_expression_group_count :=
    greatest(coalesce(raw_independent_group_count,0) - coalesce(effective_independent_group_count,0), 0);

  engine_signal := round(
    coalesce(effective_independent_group_count, 0)::numeric
    + coalesce(effective_position_sensitive_group_count, 0)::numeric
    + coalesce(rarity_bonus, 0), 3);

  independent_evidence := public.fn_relation_independent_evidence(p_a, p_b);

  has_independent := (jsonb_array_length(independent_evidence->'edges') > 0
                    or jsonb_array_length(independent_evidence->'topic_cards') > 0
                    or jsonb_array_length(independent_evidence->'research_objects') > 0);

  research_priority := case
    when has_independent and engine_signal >= 2 then 'HIGH_ENGINE_AND_EVIDENCE'
    when has_independent then 'EVIDENCE_BACKED'
    when 'exact_duplicate' = any(noise_flags) or 'niqqud_only_duplicate' = any(noise_flags)
      then 'NOISE_TECHNICAL_DUPLICATE'
    when same_letter_permutation and effective_independent_group_count = 0
      then 'LOW_DEPENDENT_ANAGRAM'
    when same_letter_permutation and effective_independent_group_count = 1
      then 'ANAGRAM_ORDER_SENSITIVE_LEAD'
    when engine_signal >= 3 then 'HIGH_ENGINE_NO_EVIDENCE_YET'
    else 'LOW_UNRANKED'
  end;

  confidence := case
    when 'exact_duplicate' = any(noise_flags) or 'niqqud_only_duplicate' = any(noise_flags)
      then 'noise'
    when has_independent then 'evidence_backed_candidate'
    when same_letter_permutation and effective_independent_group_count = 0
      then 'dependent_representation_only'
    when same_letter_permutation and effective_independent_group_count = 1
      then 'order_sensitive_anagram_lead'
    when engine_signal >= 3 then 'engine_strong_candidate'
    else 'weak_candidate'
  end;

  return jsonb_build_object(
    'entity_a', p_a, 'entity_a_node_id', node_a,
    'entity_b', p_b, 'entity_b_node_id', node_b,
    'relation_kind', 'gematria_convergence',
    'expression_dependency', jsonb_build_object(
      'same_letter_multiset', same_letter_permutation,
      'letter_multiset_key_a', public.fn_expression_letter_multiset_key(p_a),
      'letter_multiset_key_b', public.fn_expression_letter_multiset_key(p_b),
      'rule', 'same-letter permutations do not gain independent strength from order-insensitive method families; composites inherit existing composite-independence governance'
    ),
    'engine_evidence', engine_evidence,
    'composite_evidence', composite_evidence,
    'independent_evidence', independent_evidence,
    'noise_flags', to_jsonb(noise_flags),
    'engine_signal', engine_signal,
    'engine_signal_components', jsonb_build_object(
      'raw_independent_group_count', raw_independent_group_count,
      'raw_position_sensitive_group_count', raw_position_sensitive_group_count,
      'effective_independent_group_count', effective_independent_group_count,
      'effective_position_sensitive_group_count', effective_position_sensitive_group_count,
      'dependent_expression_group_count', dependent_expression_group_count,
      'independent_composite_keys', to_jsonb(independent_composite_keys),
      'rarity_bonus', round(rarity_bonus, 3),
      'min_rarity', min_rarity
    ),
    'research_priority', research_priority,
    'confidence', confidence,
    'provenance', format(
      'fn_relation_candidate computed %s <-> %s via dependency-aware methods + expression multiset normalization + governed composite evidence + existing independent evidence readers, read-only',
      p_a, p_b
    ),
    'status', 'candidate'
  );
end;
$function$;

comment on function public.fn_relation_candidate(text, text) is
  'Canonical Relation Candidate payload. Same-letter permutations retain distinct expression identity. Order-insensitive method matches are dependency-normalized; atomic order-sensitive groups may add independence; composite matches add independence only when fn_relation_composite_evidence says their components do not already match. One surviving order-sensitive family is a lead, not HIGH engine evidence by itself. External evidence remains separate. Candidate != Edge; Human Gate unchanged.';

-- Migration-level golden calibration. Fail closed if the intended dependency
-- semantics do not reproduce on the current canonical corpus.
do $$
declare
  k_daat text;
  k_adat text;
  k_teda text;
  k_kodesh text;
  k_shaked text;
  raw474 bigint;
  independent474 bigint;
  rel jsonb;
begin
  k_daat := public.fn_expression_letter_multiset_key('דעת');
  k_adat := public.fn_expression_letter_multiset_key('עדת');
  k_teda := public.fn_expression_letter_multiset_key('תדע');
  if k_daat is distinct from k_adat or k_daat is distinct from k_teda then
    raise exception 'expression normalization failed: דעת/עדת/תדע must share one letter-multiset dependency key';
  end if;

  k_kodesh := public.fn_expression_letter_multiset_key('קדש');
  k_shaked := public.fn_expression_letter_multiset_key('שקד');
  if k_kodesh is distinct from k_shaked then
    raise exception 'expression normalization failed: קדש/שקד must share one letter-multiset dependency key';
  end if;

  select phrase_count, independent_phrase_count
    into raw474, independent474
  from public.cross_method_strength
  where value = 474;

  if raw474 is null or independent474 is null or independent474 >= raw474 then
    raise exception '474 calibration failed: independent_phrase_count (%) must be below raw phrase_count (%)',
      independent474, raw474;
  end if;

  rel := public.fn_relation_candidate('דעת','עדת');
  if coalesce((rel->'expression_dependency'->>'same_letter_multiset')::boolean, false) is not true then
    raise exception 'relation calibration failed: דעת/עדת must be marked same-letter dependent';
  end if;
  if coalesce((rel->'engine_signal_components'->>'dependent_expression_group_count')::int, 0) <= 0 then
    raise exception 'relation calibration failed: דעת/עדת must expose dependent expression groups';
  end if;
  if rel->>'research_priority' in ('HIGH_ENGINE_NO_EVIDENCE_YET','HIGH_ENGINE_AND_EVIDENCE') then
    raise exception 'relation calibration failed: one surviving order-sensitive family for דעת/עדת must not self-promote to HIGH without separate independent evidence';
  end if;
end $;
