-- Canonical Methods Registry v5 conditional-equivalence repair
-- EXTEND_EXISTING only:
--   canonical_methods_registry_law v6
--   research_gold_hints_law v3
--   engine_governance_registry_authority_law v1
--
-- No Gematria formula/value changes.
-- This migration only completes dependency_rules already declared by the
-- canonical Methods Registry owner so Reliability can group proven conditional
-- equivalence instead of counting equivalent methods as independent evidence.

with desired(method_key, to_key) as (
  values
    ('רגיל','גדול'),
    ('גדול','רגיל'),
    ('קדמי','משולש גדול'),
    ('משולש גדול','קדמי'),
    ('ריבוע','ריבוע גדול'),
    ('ריבוע גדול','ריבוע'),
    ('הכפלה','הכפלה גדולה'),
    ('הכפלה גדולה','הכפלה'),
    ('מסתתר','מסתתר גדול'),
    ('מסתתר גדול','מסתתר'),
    ('סידורי','מיקום האות'),
    ('מיקום האות','סידורי')
),
rebuilt as (
  select
    d.method_key,
    coalesce((
      select jsonb_agg(e)
      from jsonb_array_elements(coalesce(gm.dependency_rules,'[]'::jsonb)) e
      where not (
        e->>'type'='conditional_equivalence'
        and e->>'to'=d.to_key
      )
    ), '[]'::jsonb)
    || jsonb_build_array(
      jsonb_build_object(
        'to', d.to_key,
        'type', 'conditional_equivalence',
        'condition', 'no_final_letters'
      )
    ) as new_rules
  from desired d
  join public.gematria_methods gm on gm.method_key=d.method_key
)
update public.gematria_methods gm
set dependency_rules = r.new_rules
from rebuilt r
where gm.method_key=r.method_key;

do $$
declare
  r record;
  no_final_groups int;
  final_groups int;
  rel jsonb;
begin
  -- Law v5: all six pairs are equal whenever the normalized operand contains
  -- no final letters, and must diverge when a final form is load-bearing.
  for r in
    select * from (values
      ('רגיל','גדול'),
      ('קדמי','משולש גדול'),
      ('ריבוע','ריבוע גדול'),
      ('הכפלה','הכפלה גדולה'),
      ('מסתתר','מסתתר גדול'),
      ('סידורי','מיקום האות')
    ) as x(base_key,gadol_key)
  loop
    if public.fn_method_value(r.base_key,'דת קדש')
       is distinct from public.fn_method_value(r.gadol_key,'דת קדש') then
      raise exception 'no-final equivalence failed for % <-> %', r.base_key, r.gadol_key;
    end if;

    if public.fn_method_value(r.base_key,'מלך')
       is not distinct from public.fn_method_value(r.gadol_key,'מלך') then
      raise exception 'final-letter distinction failed for % <-> %', r.base_key, r.gadol_key;
    end if;

    if not exists (
      select 1
      from public.gematria_methods gm
      cross join lateral jsonb_array_elements(coalesce(gm.dependency_rules,'[]'::jsonb)) e
      where gm.method_key=r.base_key
        and e->>'type'='conditional_equivalence'
        and e->>'to'=r.gadol_key
        and e->>'condition'='no_final_letters'
    ) then
      raise exception 'missing forward conditional-equivalence rule for % -> %', r.base_key, r.gadol_key;
    end if;

    if not exists (
      select 1
      from public.gematria_methods gm
      cross join lateral jsonb_array_elements(coalesce(gm.dependency_rules,'[]'::jsonb)) e
      where gm.method_key=r.gadol_key
        and e->>'type'='conditional_equivalence'
        and e->>'to'=r.base_key
        and e->>'condition'='no_final_letters'
    ) then
      raise exception 'missing reverse conditional-equivalence rule for % -> %', r.gadol_key, r.base_key;
    end if;
  end loop;

  -- Pair-level evidence grouping must now use the Registry rule.
  select count(distinct group_repr)
  into no_final_groups
  from public.fn_relation_dependency_groups('דת','קדש')
  where method in ('רגיל','גדול');

  if no_final_groups <> 1 then
    raise exception 'רגיל/גדול should be one evidence family for no-final pair דת↔קדש, got %', no_final_groups;
  end if;

  select count(distinct group_repr)
  into final_groups
  from public.fn_relation_dependency_groups('מלך','מלך')
  where method in ('רגיל','גדול');

  if final_groups <> 2 then
    raise exception 'רגיל/גדול must remain separate when final letters are present, got % groups', final_groups;
  end if;

  rel := public.fn_relation_candidate('דת','קדש');
  if coalesce((rel->'engine_signal_components'->>'effective_independent_group_count')::int,-1) <> 2 then
    raise exception 'דת↔קדש should normalize from 3 to 2 effective groups, got %', rel;
  end if;

  rel := public.fn_relation_candidate('דת','שקד');
  if coalesce((rel->'engine_signal_components'->>'effective_independent_group_count')::int,-1) <> 2 then
    raise exception 'דת↔שקד should normalize from 3 to 2 effective groups, got %', rel;
  end if;

  -- Existing dependency normalization must not regress.
  rel := public.fn_relation_candidate('קדש','שקד');
  if coalesce((rel->'engine_signal_components'->>'effective_independent_group_count')::int,-1) <> 1
     or rel->>'research_priority' <> 'ANAGRAM_ORDER_SENSITIVE_LEAD' then
    raise exception 'קדש↔שקד regression after registry repair: %', rel;
  end if;

  rel := public.fn_relation_candidate('דעת','עדת');
  if coalesce((rel->'engine_signal_components'->>'effective_independent_group_count')::int,-1) <> 1
     or rel->>'research_priority' <> 'ANAGRAM_ORDER_SENSITIVE_LEAD' then
    raise exception 'דעת↔עדת regression after registry repair: %', rel;
  end if;

  rel := public.fn_relation_candidate('סוד עת התגלותך','עת התגלותך סוד');
  if coalesce((rel->'engine_signal_components'->>'effective_independent_group_count')::int,-1) <> 0
     or rel->>'research_priority' <> 'LOW_DEPENDENT_WORD_PERMUTATION' then
    raise exception 'word-multiset regression after registry repair: %', rel;
  end if;
end $$;
