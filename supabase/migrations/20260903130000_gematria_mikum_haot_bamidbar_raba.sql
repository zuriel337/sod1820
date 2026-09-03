-- GEMATRIA_METHOD_READINESS_MIKUM_HAOT_BAMIDBAR_RABA pass -- 2026-09-03
-- ZURIEL Human-Gate explicit authorization: (1) register+implement מיקום האות per the
-- verified 1-27 formula, open only after verification (verification done BEFORE this
-- write, not after); (2) register במדבר רבה as REGISTERED_UNRESOLVED fail-closed only,
-- no formula invented.
--
-- Data-provenance migration only. Reproduces DB-LIVE state already applied and verified
-- this session. Idempotent: CREATE OR REPLACE for both functions, and the registry
-- INSERTs are guarded with ON CONFLICT DO NOTHING keyed on method_key (unique) so the
-- migration is safe to run whether or not production already contains these rows.
--
-- מיקום האות formula: identical to the canonical סידורי table (positions 1-22) for the
-- 22 base letters, but final-form letters get their OWN distinct trailing position
-- (23-27) instead of collapsing to their base letter -- a genuinely distinct identity
-- from סידורי, not an alias. Verified against 3 independently-sourced fixtures, zero
-- mismatches: בית המקדש השלשי=165, סוד העולם=88, בנימין נתניהו כט אלול=196.
--
-- במדבר רבה: source-attested historical calculator column (17 gallery occurrences);
-- 9 fixtures tested against every active canonical method found no match >1/9.
-- No trustworthy formula reconstructed -- registered fail-closed only, per explicit
-- Human-Gate instruction not to invent one.

begin;

create or replace function public.fn_mikum_haot_letter(c text)
 returns integer
 language sql
 immutable
as $function$
  -- Extended letter-position table (1-27): identical to fn_siduri_letter for the 22
  -- base letters, but final-form letters get their OWN distinct trailing position
  -- (23-27) instead of collapsing to their base letter.
  select case c
    when 'א' then 1 when 'ב' then 2 when 'ג' then 3 when 'ד' then 4 when 'ה' then 5
    when 'ו' then 6 when 'ז' then 7 when 'ח' then 8 when 'ט' then 9 when 'י' then 10
    when 'כ' then 11 when 'ל' then 12 when 'מ' then 13 when 'נ' then 14 when 'ס' then 15
    when 'ע' then 16 when 'פ' then 17 when 'צ' then 18 when 'ק' then 19 when 'ר' then 20
    when 'ש' then 21 when 'ת' then 22
    when 'ך' then 23 when 'ם' then 24 when 'ן' then 25 when 'ף' then 26 when 'ץ' then 27
    else 0 end;
$function$;

create or replace function public.fn_mikum_haot(p text)
 returns integer
 language sql
 immutable
as $function$
  select coalesce(sum(fn_mikum_haot_letter(ch)),0)::int from regexp_split_to_table(p,'') ch;
$function$;

insert into public.gematria_methods
  (sort_order, method_key, display_label, category, sub, soul, in_engine, function, active, deterministic,
   source_of_truth, required_entitlement, input_schema, output_schema, token_cost, version,
   mathematical_family, order_sensitive, word_boundary_sensitive, final_letter_sensitive,
   whitespace_normalization, punctuation_normalization, dependency_version, dependency_verified_at,
   scannable, execution_kind, dependency_versions)
values (
  33, 'מיקום האות', 'מיקום האות · 1–27', 'base',
  'מיקום האות בא"ב המורחב (1–27): כבסידורי לאותיות הרגילות, אך כל אות סופית מקבלת מיקום נבדל משלה (ך=23,ם=24,ן=25,ף=26,ץ=27) במקום לחפוף לאות הבסיס',
  'הזהות הנבדלת של הסוף',
  true, 'fn_mikum_haot', true, true,
  'GEMATRIA_METHOD_READINESS_MIKUM_HAOT pass (2026-09-03): source-native historical calculator method, reconstructed from source-attested column label "מיקום האות". Distinct identity from canonical סידורי (which collapses final letters to their base letter''s position) -- proposed and 8/8-fixture-verified by GPT (POSTS_GALLERIES_HISTORICAL_CALCULATOR_CLOSURE memo, work_log 2026-09-03 06:50), independently re-verified here against 3 separately-sourced fixtures with zero mismatches: בית המקדש השלשי=165 (GPT''s own wp895 fixture, recomputed from scratch), סוד העולם=88 and בנימין נתניהו כט אלול=196 (both from an independently-found OCR gallery fixture, not in GPT''s list). Implemented as new SQL functions fn_mikum_haot/fn_mikum_haot_letter mirroring the existing fn_siduri/fn_siduri_letter pattern exactly -- same engine, same style, no new engine/store. ZURIEL Human-Gate explicit authorization: register+implement per the verified 1-27 formula, open only after verification (verification done before this write, not after).',
  'public', jsonb_build_object('subject','text'), jsonb_build_object('value','int'), 0, 1,
  'base_additive', false, false, true,
  'irrelevant_pure_sum', 'irrelevant_pure_sum', 1, now(),
  true, 'sql_function', '{}'::jsonb
)
on conflict (method_key) do nothing;

insert into public.gematria_methods
  (sort_order, method_key, display_label, category, sub, soul, in_engine, function, active, deterministic,
   source_of_truth, required_entitlement, version, dependency_version, dependency_verified_at,
   scannable, execution_kind)
values (
  34, 'במדבר רבה', 'במדבר רבה', 'base',
  'SOURCE-ATTESTED, UNRESOLVED · שיטת-חישוב תורנית מהמחשבון ההיסטורי, נוסחה לא שוחזרה',
  null,
  false, null, false, true,
  'GEMATRIA_METHOD_READINESS_MIKUM_HAOT pass (2026-09-03): SOURCE-ATTESTED ONLY. Original historical Hebrew gematria-calculator manual lists "במדבר רבה" as a distinct calculation-type column; gallery corpus shows 17 occurrences of this label (per GPT cross-check, POSTS_GALLERIES_HISTORICAL_CALCULATOR_CLOSURE memo, work_log 2026-09-03 06:50). Nine clean raw fixtures were tested against every currently active/executable canonical method: no method matched on more than 1/9 (one coincidental match, פלא התשעו=892 vs רגיל/גדול, judged not evidence of identity). No canonical alias, no trustworthy external formula found. ZURIEL Human-Gate explicit authorization: register as REGISTERED_UNRESOLVED, fail-closed only -- formula intentionally NOT invented/guessed. Preserve this source-native label and provenance; do not merge/alias with any existing method until a reconstruction is proven against source fixtures.',
  'public', 1, 1, now(),
  false, 'unimplemented'
)
on conflict (method_key) do nothing;

commit;
