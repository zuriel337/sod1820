-- SOD1820 · Rabbati / large-letter gematria method v1
-- Human Gate: ZURIEL · 2026-08-27
-- Contract: explicit Rabbati context only. Ordinary letters are NEVER auto-promoted.
-- Family: extended letter values, connected to Mispar Gadol / מנצפ״ך but does not alter fn_gadol.

create or replace function public.fn_rabbati(p text)
returns integer
language sql
immutable
as $$
  select (public.fn_ragil(p) * 1000)::integer;
$$;

insert into public.gematria_methods (
  sort_order, method_key, display_label, category, sub, soul, db_column,
  in_engine, function, active, deterministic, source_of_truth,
  required_entitlement, input_schema, output_schema, token_cost, version,
  mathematical_family, order_sensitive, word_boundary_sensitive,
  per_word_reset, full_phrase_continuation, final_letter_sensitive,
  whitespace_normalization, punctuation_normalization, derived_from,
  dependency_rules, dependency_version, dependency_verified_at
)
values (
  30,
  'אות רבתי',
  'אות רבתי · אלפים',
  'base',
  'אות המסומנת/מוצהרת כרבתי: ערכה הרגיל ×1000 (א=1000, ב=2000...)',
  'הגדלת האות לאלפים — הרחבה של משפחת המספר הגדול/מנצפ״ך',
  null,
  true,
  'fn_rabbati',
  true,
  true,
  'gematria engine (fn_rabbati)',
  'public',
  '{"subject":"text","activation":"explicit_rabbati_context_only"}'::jsonb,
  '{"value":"int"}'::jsonb,
  0,
  1,
  'extended_letter_values',
  false,false,false,true,false,
  'engine_normalized','engine_normalized',
  array['רגיל','גדול'],
  '[{"to":"גדול","type":"same_family_extension","condition":"explicit_large_letter_context"},{"to":"רגיל","type":"scale_transform","factor":1000}]'::jsonb,
  1,
  now()
)
on conflict (method_key) do update set
  display_label = excluded.display_label,
  sub = excluded.sub,
  soul = excluded.soul,
  in_engine = excluded.in_engine,
  function = excluded.function,
  active = excluded.active,
  deterministic = excluded.deterministic,
  source_of_truth = excluded.source_of_truth,
  input_schema = excluded.input_schema,
  output_schema = excluded.output_schema,
  version = excluded.version,
  mathematical_family = excluded.mathematical_family,
  derived_from = excluded.derived_from,
  dependency_rules = excluded.dependency_rules,
  dependency_version = excluded.dependency_version,
  dependency_verified_at = excluded.dependency_verified_at;
