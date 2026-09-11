-- ENGLISH_GOLDEN_ENGINE_V1
-- EXTEND_EXISTING under canonical_methods_registry_law v4 + engine_governance_registry_authority_law v1.
-- Requires 20260911_register_english_method_identities_v1.sql first.
--
-- Human Gate ZURIEL 2026-09-11 authorized the canonical execution build.
-- This migration implements deterministic SQL execution for the four source-attested English
-- method identities, verifies the three clean Golden methods, and preserves Reverse Reduction
-- as reconstructed-but-UNVERIFIED because live source data conflicts with the canonical formula.
--
-- IMPORTANT lifecycle boundary:
--   EXECUTABLE / ENGINE_VERIFIED != ACTIVE != SCANNABLE.
-- All four remain active=false and scannable=false. No bulk scan or public calculation is enabled.

create or replace function public.fn_en_ordinal(p_text text)
returns bigint
language sql
immutable
set search_path = public
as $function$
  select coalesce(sum(ascii(c) - 96), 0)::bigint
  from unnest(string_to_array(lower(coalesce(p_text, '')), null)) as t(c)
  where ascii(c) between 97 and 122;
$function$;

comment on function public.fn_en_ordinal(text) is
  'English Ordinal: A=1..Z=26; ASCII Latin letters only; case-insensitive; non-Latin characters ignored.';

create or replace function public.fn_en_full_reduction(p_text text)
returns bigint
language sql
immutable
set search_path = public
as $function$
  select coalesce(sum(((ascii(c) - 97) % 9) + 1), 0)::bigint
  from unnest(string_to_array(lower(coalesce(p_text, '')), null)) as t(c)
  where ascii(c) between 97 and 122;
$function$;

comment on function public.fn_en_full_reduction(text) is
  'Full Reduction: English Ordinal reduced per letter to 1..9; ASCII Latin only; case-insensitive.';

create or replace function public.fn_en_reverse_ordinal(p_text text)
returns bigint
language sql
immutable
set search_path = public
as $function$
  select coalesce(sum(27 - (ascii(c) - 96)), 0)::bigint
  from unnest(string_to_array(lower(coalesce(p_text, '')), null)) as t(c)
  where ascii(c) between 97 and 122;
$function$;

comment on function public.fn_en_reverse_ordinal(text) is
  'Reverse Ordinal: A=26..Z=1; ASCII Latin letters only; case-insensitive; non-Latin characters ignored.';

create or replace function public.fn_en_reverse_reduction(p_text text)
returns bigint
language sql
immutable
set search_path = public
as $function$
  select coalesce(sum((((27 - (ascii(c) - 96)) - 1) % 9) + 1), 0)::bigint
  from unnest(string_to_array(lower(coalesce(p_text, '')), null)) as t(c)
  where ascii(c) between 97 and 122;
$function$;

comment on function public.fn_en_reverse_reduction(text) is
  'Reverse Reduction candidate reconstruction: reverse ordinal (A=26..Z=1), then reduce each value to 1..9. A=8,B=7,...,Z=1. Reconstructed but NOT engine-verified in SOD1820 until historical bridge conflicts are adjudicated.';

-- Deterministic reconstruction fixtures. Abort the migration on any mismatch.
do $verify_math$
begin
  if public.fn_en_ordinal('Secret') <> 70 then raise exception 'en_ordinal Secret fixture failed'; end if;
  if public.fn_en_ordinal('throne') <> 80 then raise exception 'en_ordinal throne fixture failed'; end if;
  if public.fn_en_ordinal('Secret! 123') <> 70 then raise exception 'en_ordinal normalization fixture failed'; end if;

  if public.fn_en_full_reduction('glory') <> 32 then raise exception 'en_full_reduction glory fixture failed'; end if;

  if public.fn_en_reverse_ordinal('priest') <> 75 then raise exception 'en_reverse_ordinal priest fixture failed'; end if;
  if public.fn_en_reverse_ordinal('slave') <> 76 then raise exception 'en_reverse_ordinal slave fixture failed'; end if;

  -- Canonical reconstruction according to Reverse Ordinal -> per-letter 1..9 reduction.
  -- These values intentionally expose DRIFT against two legacy language_links rows:
  -- live scanner/data says good=17 and promise=29, while this definition yields 13 and 40.
  if public.fn_en_reverse_reduction('good') <> 13 then raise exception 'en_reverse_reduction good reconstruction failed'; end if;
  if public.fn_en_reverse_reduction('promise') <> 40 then raise exception 'en_reverse_reduction promise reconstruction failed'; end if;
end;
$verify_math$;

-- Wire the four identities to the ONE existing method registry.
update public.gematria_methods
set
  in_engine = true,
  function = case method_key
    when 'en_ordinal' then 'fn_en_ordinal'
    when 'en_full_reduction' then 'fn_en_full_reduction'
    when 'en_reverse_ordinal' then 'fn_en_reverse_ordinal'
    when 'en_reverse_reduction' then 'fn_en_reverse_reduction'
  end,
  execution_kind = 'sql_function',
  mathematical_family = 'latin_additive_map',
  order_sensitive = false,
  word_boundary_sensitive = false,
  per_word_reset = false,
  full_phrase_continuation = true,
  final_letter_sensitive = false,
  whitespace_normalization = 'ignore_non_latin',
  punctuation_normalization = 'ignore_non_latin',
  active = false,
  scannable = false,
  dependency_version = version,
  dependency_versions = '{}'::jsonb,
  source_of_truth = source_of_truth || E'\n[ENGLISH_GOLDEN_ENGINE_V1 2026-09-11] Canonical SQL implementation exists in the single registry execution path. ACTIVE and SCANNABLE remain false. See method-specific verification state in input/output schema and dependency_verified_at.'
where method_key in ('en_ordinal','en_full_reduction','en_reverse_ordinal','en_reverse_reduction');

-- Three Golden methods are fixture-verified. Reverse Reduction is deliberately NOT verified:
-- the current client/canonical reconstruction and external method definition agree on A=8..Z=1,
-- but the legacy direct_bridge_scan has an off-by-one formula and produced conflicting approved rows.
update public.gematria_methods
set
  dependency_verified_at = now(),
  input_schema = '{"kind":"text","lang":"en","script":"Latin","normalization":"lowercase_ascii_letters_only","formula_status":"engine_verified"}'::jsonb,
  output_schema = '{"type":"integer","status":"engine_verified"}'::jsonb,
  sub = 'CANONICAL SQL IMPLEMENTATION · GOLDEN FIXTURES VERIFIED · inactive/non-scannable'
where method_key in ('en_ordinal','en_full_reduction','en_reverse_ordinal');

update public.gematria_methods
set
  dependency_verified_at = null,
  input_schema = '{"kind":"text","lang":"en","script":"Latin","normalization":"lowercase_ascii_letters_only","formula_status":"reconstructed_conflict_open"}'::jsonb,
  output_schema = '{"type":"integer","status":"reconstructed_unverified"}'::jsonb,
  sub = 'RECONSTRUCTED · CONFLICT OPEN: canonical Reverse Ordinal→1..9 reduction disagrees with legacy bridge scanner rows · inactive/non-scannable',
  source_of_truth = source_of_truth || E'\n[CONFLICT 2026-09-11] Existing src/lib/englishGematria.js and independent external reference definitions use Reverse Ordinal followed by 1..9 reduction (A=8,B=7,...,Z=1), yielding good=13 and promise=40. Legacy public.direct_bridge_scan uses an off-by-one formula yielding good=17/promise=29 and populated language_links accordingly. Preserve both facts; do not mark engine_verified or activate until Human-Gate adjudication.'
where method_key = 'en_reverse_reduction';

-- Governance assertions: functions are executable, only the three clean methods are engine-verified,
-- and NOTHING becomes scannable or product-active from this migration.
do $verify_governance$
declare n int;
begin
  select count(*) into n from public.gematria_methods
  where method_key in ('en_ordinal','en_full_reduction','en_reverse_ordinal','en_reverse_reduction');
  if n <> 4 then raise exception 'expected 4 English method identities, found %', n; end if;

  if not public.fn_method_is_executable('en_ordinal') then raise exception 'en_ordinal not executable'; end if;
  if not public.fn_method_is_executable('en_full_reduction') then raise exception 'en_full_reduction not executable'; end if;
  if not public.fn_method_is_executable('en_reverse_ordinal') then raise exception 'en_reverse_ordinal not executable'; end if;
  if not public.fn_method_is_executable('en_reverse_reduction') then raise exception 'en_reverse_reduction reconstruction not executable'; end if;

  if not public.fn_method_is_engine_verified('en_ordinal') then raise exception 'en_ordinal should be engine verified'; end if;
  if not public.fn_method_is_engine_verified('en_full_reduction') then raise exception 'en_full_reduction should be engine verified'; end if;
  if not public.fn_method_is_engine_verified('en_reverse_ordinal') then raise exception 'en_reverse_ordinal should be engine verified'; end if;
  if public.fn_method_is_engine_verified('en_reverse_reduction') then raise exception 'en_reverse_reduction must remain unverified'; end if;

  if public.fn_method_is_scannable('en_ordinal')
     or public.fn_method_is_scannable('en_full_reduction')
     or public.fn_method_is_scannable('en_reverse_ordinal')
     or public.fn_method_is_scannable('en_reverse_reduction') then
    raise exception 'English methods must remain non-scannable';
  end if;

  -- fn_method_value obeys the existing ACTIVE Human-Gate and must therefore remain NULL now.
  if public.fn_method_value('en_ordinal','Secret') is not null then
    raise exception 'inactive en_ordinal unexpectedly dispatchable through fn_method_value';
  end if;
end;
$verify_governance$;
