-- ENGLISH_METHOD_IDENTITIES_V1
-- EXTEND_EXISTING under canonical_methods_registry_law v4.
-- Identity registration only. DO NOT infer activation/execution/scanning from these rows.
-- Human Gate ZURIEL 2026-09-11: English/Latin methods belong in the single canonical
-- gematria_methods lifecycle; no parallel English-method store.
--
-- Only the four identities already source-attested by approved live language_links are registered.
-- Agrippa/Latin remains deferred pending a dedicated source/provenance pass.
--
-- FAIL-CLOSED: active=false · in_engine=false · scannable=false · function=NULL ·
-- execution_kind='unimplemented'. Sort orders 901-904 intentionally keep these inactive future
-- methods outside the legacy visible method block while satisfying the live NOT NULL contract.

insert into public.gematria_methods (
  sort_order, method_key, display_label, category, sub, soul, db_column,
  in_engine, function, active, deterministic, source_of_truth, required_entitlement,
  input_schema, output_schema, token_cost, version, mathematical_family,
  order_sensitive, word_boundary_sensitive, per_word_reset, full_phrase_continuation,
  final_letter_sensitive, whitespace_normalization, punctuation_normalization,
  derived_from, dependency_rules, dependency_version, scannable, execution_kind,
  operator, dependency_versions
)
values
(
  901, 'en_ordinal', 'English Ordinal', 'base',
  'SOURCE-ATTESTED ENGLISH METHOD IDENTITY · registered only · canonical engine implementation pending',
  null, null, false, null, false, true,
  'Human Gate ZURIEL 2026-09-11; canonical_methods_registry_law v4. Source-attested in approved live language_links: English Ordinal appears in 2 approved shared_value bridges, both human_verified=true and evidence_level=strong. Existing src/lib/englishGematria.js is capability evidence only, not authoritative engine truth.',
  'public',
  '{"kind":"text","lang":"en","script":"Latin","formula_status":"capability_evidence_not_engine_verified"}'::jsonb,
  '{"type":"integer","status":"registered_unimplemented"}'::jsonb,
  0, 1, null, null, null, null, null, null, null, null, null,
  '[]'::text[], '[]'::jsonb, 1, false, 'unimplemented', null, '{}'::jsonb
),
(
  902, 'en_full_reduction', 'Full Reduction', 'base',
  'SOURCE-ATTESTED ENGLISH METHOD IDENTITY · registered only · canonical engine implementation pending',
  null, null, false, null, false, true,
  'Human Gate ZURIEL 2026-09-11; canonical_methods_registry_law v4. Source-attested in approved live language_links: Full Reduction appears in 1 approved shared_value bridge, human_verified=true and evidence_level=strong. Existing src/lib/englishGematria.js is capability evidence only, not authoritative engine truth.',
  'public',
  '{"kind":"text","lang":"en","script":"Latin","formula_status":"capability_evidence_not_engine_verified"}'::jsonb,
  '{"type":"integer","status":"registered_unimplemented"}'::jsonb,
  0, 1, null, null, null, null, null, null, null, null, null,
  '[]'::text[], '[]'::jsonb, 1, false, 'unimplemented', null, '{}'::jsonb
),
(
  903, 'en_reverse_ordinal', 'Reverse Ordinal', 'base',
  'SOURCE-ATTESTED ENGLISH METHOD IDENTITY · registered only · canonical engine implementation pending',
  null, null, false, null, false, true,
  'Human Gate ZURIEL 2026-09-11; canonical_methods_registry_law v4. Source-attested in approved live language_links: Reverse Ordinal appears in 2 approved shared_value bridges, both human_verified=true and evidence_level=strong. Existing src/lib/englishGematria.js is capability evidence only, not authoritative engine truth.',
  'public',
  '{"kind":"text","lang":"en","script":"Latin","formula_status":"capability_evidence_not_engine_verified"}'::jsonb,
  '{"type":"integer","status":"registered_unimplemented"}'::jsonb,
  0, 1, null, null, null, null, null, null, null, null, null,
  '[]'::text[], '[]'::jsonb, 1, false, 'unimplemented', null, '{}'::jsonb
),
(
  904, 'en_reverse_reduction', 'Reverse Reduction', 'base',
  'SOURCE-ATTESTED ENGLISH METHOD IDENTITY · registered only · canonical engine implementation pending',
  null, null, false, null, false, true,
  'Human Gate ZURIEL 2026-09-11; canonical_methods_registry_law v4. Source-attested in approved live language_links: Reverse Reduction appears in 2 approved shared_value bridges; 1 is human_verified=true and evidence_level=medium. Preserve the identity without inferring formula correctness or canonicality from the bridge rows.',
  'public',
  '{"kind":"text","lang":"en","script":"Latin","formula_status":"capability_evidence_not_engine_verified"}'::jsonb,
  '{"type":"integer","status":"registered_unimplemented"}'::jsonb,
  0, 1, null, null, null, null, null, null, null, null, null,
  '[]'::text[], '[]'::jsonb, 1, false, 'unimplemented', null, '{}'::jsonb
)
on conflict (method_key) do nothing;
