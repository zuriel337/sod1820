-- Expression Word-Multiset Dependency Normalization v1
-- EXTEND_EXISTING:
--   research_gold_hints_law v3 (dependency_before_rank)
--   canonical_methods_registry_law v6
--   engine_governance_registry_authority_law v1
--   truth_axes_foundation_law v3
--
-- Calibration target:
--   "סוד עת התגלותך" <-> "עת התגלותך סוד"
-- are the same exact Hebrew words in a different order. Equality produced by
-- order-insensitive or per-word-reset methods is dependent representation, not
-- independent corroboration. Distinct expression identity is always preserved.

create or replace function public.fn_expression_word_multiset_key(p_phrase text)
returns text
language sql
immutable
set search_path = public
as $function$
  with words as (
    select regexp_replace(token, '[^א-ת]', '', 'g') as word
    from regexp_split_to_table(
      regexp_replace(coalesce(p_phrase, ''), '[֑-ׇ]', '', 'g'),
      '\s+'
    ) as token
  ),
  sorted as (
    select string_agg(word, '|' order by word) as key
    from words
    where word <> ''
  )
  select case
    when coalesce(key, '') <> '' then 'he-words:' || key
    else 'raw-words:' || lower(regexp_replace(trim(coalesce(p_phrase, '')), '\s+', ' ', 'g'))
  end
  from sorted;
$function$;

comment on function public.fn_expression_word_multiset_key(text) is
  'Evidence-dependency key only; NEVER expression identity. Strips niqqud/non-Hebrew per token, preserves final-letter spelling inside each word, sorts the word multiset, and therefore recognizes identical words reordered across a phrase.';

create or replace view public.cross_method_strength
with (security_invoker = on) as
with tagged as (
  select
    b.value,
    b.phrase,
    b.method,
    b.priority,
    coalesce(gm.category, 'unregistered') as m_category,
    (
      coalesce(gm.order_sensitive, false)
      or (coalesce(gm.final_letter_sensitive, false) and b.phrase ~ '[ךםןףץ]')
      or (coalesce(gm.word_boundary_sensitive, false) and trim(coalesce(b.phrase,'')) ~ '\s')
    ) as structure_sensitive,
    (
      coalesce(gm.order_sensitive, false)
      and coalesce(gm.full_phrase_continuation, false)
    ) as word_order_load_bearing,
    public.fn_expression_letter_multiset_key(b.phrase) as expression_family_key,
    public.fn_expression_word_multiset_key(b.phrase) as word_family_key
  from public.bidim b
  left join public.gematria_methods gm on gm.method_key = b.method
),
value_universe as (
  select distinct value from tagged
),
phrase_support as (
  select
    value,
    phrase,
    expression_family_key,
    word_family_key,
    bool_or(structure_sensitive) as has_structure_sensitive_atomic,
    bool_or(word_order_load_bearing) as has_word_order_load_bearing_atomic
  from tagged
  where m_category <> 'composite'
  group by value, phrase, expression_family_key, word_family_key
),
word_family_counts as (
  select
    value,
    word_family_key,
    count(distinct phrase) as phrase_variants
  from phrase_support
  group by value, word_family_key
),
expression_counts as (
  select
    v.value,
    count(distinct ps.phrase) as phrase_count,
    count(distinct
      case
        when ps.phrase is null then null
        when wfc.phrase_variants > 1 and not ps.has_word_order_load_bearing_atomic
          then 'word-multiset:' || ps.word_family_key
        when ps.has_structure_sensitive_atomic
          then 'phrase:' || ps.phrase
        else 'letter-multiset:' || ps.expression_family_key
      end
    ) as independent_phrase_count
  from value_universe v
  left join phrase_support ps using (value)
  left join word_family_counts wfc
    on wfc.value = ps.value
   and wfc.word_family_key = ps.word_family_key
  group by v.value
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
  greatest(e.phrase_count - e.independent_phrase_count, 0::bigint) as dependent_expression_phrase_count,
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
  'Derived contextual/research-strength signal only, never Truth. Raw phrase_count/p1_hits stay backward-compatible. independent_phrase_count first normalizes exact word-multiset permutations unless the value has atomic full-phrase order-sensitive support, then applies existing letter-multiset normalization. Dependent expressions remain visible. Rank, do not hide.';

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
  raw_independent_group_count int; raw_structure_sensitive_group_count int;
  effective_independent_group_count int; effective_structure_sensitive_group_count int;
  dependent_expression_group_count int;
  min_rarity numeric; rarity_bonus numeric;
  engine_signal numeric; has_independent boolean; research_priority text; confidence text;
  same_letter_permutation boolean := false;
  same_word_permutation boolean := false;
  word_key_a text; word_key_b text;
begin
  select node_id into node_a from gematria_words where phrase = p_a limit 1;
  select node_id into node_b from gematria_words where phrase = p_b limit 1;

  noise_flags := public.fn_relation_noise_flags(p_a, p_b);
  same_letter_permutation := 'anagram_same_letter_multiset' = any(noise_flags);

  word_key_a := public.fn_expression_word_multiset_key(p_a);
  word_key_b := public.fn_expression_word_multiset_key(p_b);
  same_word_permutation :=
    word_key_a = word_key_b
    and regexp_replace(trim(coalesce(p_a,'')), '\s+', ' ', 'g')
        <> regexp_replace(trim(coalesce(p_b,'')), '\s+', ' ', 'g');

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
      (
        coalesce(gm.order_sensitive, false)
        or (
          coalesce(gm.final_letter_sensitive, false)
          and (coalesce(p_a,'') ~ '[ךםןףץ]' or coalesce(p_b,'') ~ '[ךםןףץ]')
        )
        or (
          coalesce(gm.word_boundary_sensitive, false)
          and (trim(coalesce(p_a,'')) ~ '\s' or trim(coalesce(p_b,'')) ~ '\s')
        )
      ) as method_structure_sensitive,
      (
        coalesce(gm.order_sensitive, false)
        and coalesce(gm.full_phrase_continuation, false)
      ) as method_word_order_load_bearing,
      (d.method = any(independent_composite_keys)) as independent_composite,
      coalesce((
        select bool_and((r->>'order_is_load_bearing')::boolean is true)
        from jsonb_array_elements(coalesce(gm.dependency_rules, '[]'::jsonb)) r
        where r->>'type' = 'composition'
      ), false) as composite_order_load_bearing
    from public.fn_relation_dependency_groups(p_a, p_b) d
    left join public.gematria_methods gm on gm.method_key = d.method
  ),
  group_stats as (
    select
      group_repr,
      bool_or(group_is_position_sensitive) as is_position_sensitive,
      bool_or(method_structure_sensitive) as is_structure_sensitive,
      bool_or(method_word_order_load_bearing) as is_word_order_load_bearing,
      bool_or(method_structure_sensitive and method_category <> 'composite') as has_atomic_structure_sensitive,
      bool_or(method_word_order_load_bearing and method_category <> 'composite') as has_atomic_word_order_load_bearing,
      bool_or(independent_composite) as has_independent_composite,
      bool_or(independent_composite and composite_order_load_bearing) as has_independent_order_load_bearing_composite,
      min(normalized_rarity) as min_rarity
    from dg
    group by group_repr
  ),
  eligible as (
    select
      gs.*,
      case
        when not same_letter_permutation then true
        when same_word_permutation then
          gs.has_atomic_word_order_load_bearing
          or gs.has_independent_order_load_bearing_composite
        else
          gs.has_atomic_structure_sensitive
          or gs.has_independent_composite
      end as effective,
      case
        when not same_letter_permutation then gs.is_structure_sensitive
        when same_word_permutation then
          gs.has_atomic_word_order_load_bearing
          or gs.has_independent_order_load_bearing_composite
        else
          gs.is_structure_sensitive
          and (gs.has_atomic_structure_sensitive or gs.has_independent_composite)
      end as effective_structure_sensitive
    from group_stats gs
  )
  select
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'method', d.method,
        'value', d.value,
        'group_repr', d.group_repr,
        'group_is_position_sensitive', d.group_is_position_sensitive,
        'method_structure_sensitive', d.method_structure_sensitive,
        'method_word_order_load_bearing', d.method_word_order_load_bearing,
        'method_category', d.method_category,
        'raw_frequency', d.raw_frequency,
        'method_population', d.method_population,
        'normalized_rarity', d.normalized_rarity,
        'expression_dependency',
          case
            when not same_letter_permutation then 'ordinary_relation'
            when same_word_permutation and d.method_category = 'composite'
                 and d.independent_composite and d.composite_order_load_bearing
              then 'same_word_multiset_independent_composite_lead'
            when same_word_permutation and d.method_category = 'composite'
              then 'same_word_multiset_dependent_composite'
            when same_word_permutation and d.method_word_order_load_bearing
              then 'same_word_multiset_word_order_sensitive_potentially_independent'
            when same_word_permutation
              then 'same_word_multiset_word_order_insensitive_dependent'
            when d.method_category = 'composite' and d.independent_composite
              then 'same_letter_multiset_independent_composite_lead'
            when d.method_category = 'composite'
              then 'same_letter_multiset_dependent_composite'
            when d.method_structure_sensitive
              then 'same_letter_multiset_structure_sensitive_potentially_independent'
            else 'same_letter_multiset_structure_insensitive_dependent'
          end
      ))
      from dg d
    ), '[]'::jsonb),
    (select count(*) from eligible),
    (select count(*) from eligible where is_structure_sensitive),
    (select count(*) from eligible where effective),
    (select count(*) from eligible where effective_structure_sensitive),
    (select min(e.min_rarity) from eligible e),
    (select coalesce(sum(1 - e.min_rarity),0) from eligible e where e.effective)
  into
    engine_evidence,
    raw_independent_group_count,
    raw_structure_sensitive_group_count,
    effective_independent_group_count,
    effective_structure_sensitive_group_count,
    min_rarity,
    rarity_bonus;

  dependent_expression_group_count :=
    greatest(coalesce(raw_independent_group_count,0) - coalesce(effective_independent_group_count,0), 0);

  engine_signal := round(
    coalesce(effective_independent_group_count, 0)::numeric
    + coalesce(effective_structure_sensitive_group_count, 0)::numeric
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
    when same_word_permutation and effective_independent_group_count = 0
      then 'LOW_DEPENDENT_WORD_PERMUTATION'
    when same_word_permutation and effective_independent_group_count = 1
      then 'WORD_ORDER_SENSITIVE_LEAD'
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
    when same_word_permutation and effective_independent_group_count = 0
      then 'dependent_word_permutation_only'
    when same_word_permutation and effective_independent_group_count = 1
      then 'word_order_sensitive_lead'
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
      'same_word_multiset', same_word_permutation,
      'word_multiset_key_a', word_key_a,
      'word_multiset_key_b', word_key_b,
      'rule', 'same words reordered do not gain independent strength from methods whose order is not load-bearing; otherwise same-letter dependency normalization applies'
    ),
    'engine_evidence', engine_evidence,
    'composite_evidence', composite_evidence,
    'independent_evidence', independent_evidence,
    'noise_flags', to_jsonb(noise_flags),
    'engine_signal', engine_signal,
    'engine_signal_components', jsonb_build_object(
      'raw_independent_group_count', raw_independent_group_count,
      'raw_structure_sensitive_group_count', raw_structure_sensitive_group_count,
      'effective_independent_group_count', effective_independent_group_count,
      'effective_structure_sensitive_group_count', effective_structure_sensitive_group_count,
      'dependent_expression_group_count', dependent_expression_group_count,
      'independent_composite_keys', to_jsonb(independent_composite_keys),
      'rarity_bonus', round(rarity_bonus, 3),
      'min_rarity', min_rarity
    ),
    'research_priority', research_priority,
    'confidence', confidence,
    'provenance', format(
      'fn_relation_candidate computed %s <-> %s via method dependency groups + word/letter multiset normalization + governed composite evidence + independent evidence readers, read-only',
      p_a, p_b
    ),
    'status', 'candidate'
  );
end;
$function$;

comment on function public.fn_relation_candidate(text, text) is
  'Canonical Relation Candidate payload. Distinct expressions remain distinct. Identical word multisets reordered are dependency-normalized first: per-word/reset or otherwise order-insensitive matches do not add independent weight; only explicit full-phrase order-sensitive atomic methods or composites whose registry metadata says order_is_load_bearing may add word-order evidence. Existing letter-multiset, composite and external-evidence governance remains in force. Candidate != Edge; Human Gate unchanged.';

do $$
declare
  rel_word jsonb;
  rel_word_474 jsonb;
  rel_kodesh jsonb;
  rel_daat jsonb;
  raw1404 bigint;
  independent1404 bigint;
begin
  if public.fn_expression_word_multiset_key('סוד עת התגלותך')
     is distinct from public.fn_expression_word_multiset_key('עת התגלותך סוד') then
    raise exception 'word-multiset normalization failed for 1404 reordered phrase';
  end if;

  if public.fn_expression_word_multiset_key('יהוה יתגלה')
     is distinct from public.fn_expression_word_multiset_key('יתגלה יהוה') then
    raise exception 'word-multiset normalization failed for 474 reordered phrase';
  end if;

  if exists (
    select 1
    from public.gematria_methods gm
    cross join lateral jsonb_array_elements(coalesce(gm.dependency_rules,'[]'::jsonb)) r
    where gm.category = 'composite'
      and r->>'type' = 'composition'
      and r ? 'order_is_load_bearing'
      and coalesce((r->>'order_is_load_bearing')::boolean,false) = false
      and gm.method_key = 'משולש מילה+משולש הפוך'
  ) is not true then
    raise exception 'registry calibration failed: explicit order_is_load_bearing=false metadata is required for the known composite';
  end if;

  if public.fn_expression_word_multiset_key('קדש')
     is not distinct from public.fn_expression_word_multiset_key('שקד') then
    raise exception 'word-multiset key must not collapse single-word anagrams with different word identity';
  end if;

  -- Word-boundary guard: changing the actual segmentation is NOT a word-order
  -- permutation and must never be normalized away.
  if public.fn_expression_word_multiset_key('סוד עת התגלותך')
     is not distinct from public.fn_expression_word_multiset_key('סודע תהתגלותך') then
    raise exception 'word-boundary calibration failed: changed segmentation must produce a different word-multiset key';
  end if;

  -- Canonical method semantics around spaces:
  -- קדמי/משולש ignores the boundary; ריבוע and משולש מדרגות reset per word;
  -- משולש מילה continues over the full phrase, so word order is load-bearing.
  if public.fn_method_value('קדמי','סוד עת התגלותך')
     is distinct from public.fn_method_value('קדמי','סודע תהתגלותך') then
    raise exception 'קדמי calibration failed: canonical משולש should remain boundary-insensitive';
  end if;

  if public.fn_method_value('ריבוע','סוד עת התגלותך')
     is not distinct from public.fn_method_value('ריבוע','סודע תהתגלותך') then
    raise exception 'ריבוע calibration failed: changed word boundary must remain visible';
  end if;

  if public.fn_method_value('משולש מדרגות','סוד עת התגלותך')
     is not distinct from public.fn_method_value('משולש מדרגות','סודע תהתגלותך') then
    raise exception 'משולש מדרגות calibration failed: changed word boundary must remain visible';
  end if;

  if public.fn_method_value('משולש מילה','סוד עת התגלותך')
     is not distinct from public.fn_method_value('משולש מילה','עת התגלותך סוד') then
    raise exception 'משולש מילה calibration failed: full-phrase word order must remain load-bearing';
  end if;

  if public.fn_method_value('ריבוע','סוד עת התגלותך')
     is distinct from public.fn_method_value('ריבוע','עת התגלותך סוד') then
    raise exception 'ריבוע calibration failed: reordering identical words should not create new per-word-reset evidence';
  end if;

  if public.fn_method_value('משולש מדרגות','סוד עת התגלותך')
     is distinct from public.fn_method_value('משולש מדרגות','עת התגלותך סוד') then
    raise exception 'משולש מדרגות calibration failed: reordering identical words should not create new per-word-reset evidence';
  end if;

  rel_word := public.fn_relation_candidate('סוד עת התגלותך','עת התגלותך סוד');
  if coalesce((rel_word->'expression_dependency'->>'same_word_multiset')::boolean,false) is not true
     or coalesce((rel_word->'engine_signal_components'->>'effective_independent_group_count')::int,-1) <> 0
     or rel_word->>'research_priority' <> 'LOW_DEPENDENT_WORD_PERMUTATION' then
    raise exception '1404 word-order calibration failed: %', rel_word;
  end if;

  rel_word_474 := public.fn_relation_candidate('יהוה יתגלה','יתגלה יהוה');
  if coalesce((rel_word_474->'engine_signal_components'->>'effective_independent_group_count')::int,-1) <> 0
     or rel_word_474->>'research_priority' <> 'LOW_DEPENDENT_WORD_PERMUTATION' then
    raise exception '474 word-order calibration failed: %', rel_word_474;
  end if;

  rel_kodesh := public.fn_relation_candidate('קדש','שקד');
  if coalesce((rel_kodesh->'engine_signal_components'->>'effective_independent_group_count')::int,-1) <> 1
     or rel_kodesh->>'research_priority' <> 'ANAGRAM_ORDER_SENSITIVE_LEAD' then
    raise exception 'קדש/שקד regression failed: %', rel_kodesh;
  end if;

  rel_daat := public.fn_relation_candidate('דעת','עדת');
  if coalesce((rel_daat->'engine_signal_components'->>'effective_independent_group_count')::int,-1) <> 1
     or rel_daat->>'research_priority' <> 'ANAGRAM_ORDER_SENSITIVE_LEAD' then
    raise exception 'דעת/עדת regression failed: %', rel_daat;
  end if;

  select phrase_count, independent_phrase_count
  into raw1404, independent1404
  from public.cross_method_strength
  where value = 1404;

  if raw1404 is null or independent1404 is null or independent1404 >= raw1404 then
    raise exception '1404 value-level dependency calibration failed: raw %, independent %',
      raw1404, independent1404;
  end if;
end $$;
