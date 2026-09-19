-- G3_CANONICAL_PRESENTATION_UNIFICATION_V1
-- Human Gate: ZURIEL, 2026-09-18
-- EXTEND_EXISTING canonical_methods_registry_law. No new method registry/store/engine.
--
-- This migration is branch-only until explicit release authorization.
-- It changes presentation metadata only; method_key/functions/formulas/eligibility are untouched.

begin;

-- Public Hebrew display names. Internal identity/provenance stays on method_key.
update public.gematria_methods
   set display_label = 'משולש'
 where method_key = 'קדמי';

update public.gematria_methods
   set display_label = 'משולש גדול'
 where method_key = 'משולש גדול';

update public.gematria_methods
   set display_label = 'רגיל + משולש'
 where method_key = 'רגיל+משולש';

-- Supersede v5 only at deployment time. Preserve the full earlier body and append the
-- Human-Gate presentation/order clarification instead of rewriting history.
update public.nodes
   set is_active = false
 where type = 'rule'
   and rule_id = 'canonical_methods_registry_law'
   and rule_version = 5
   and is_active = true;

insert into public.nodes (
  id, type, label, description, metadata, is_active, created_at,
  rule_id, rule_version, depends_on, supersedes_version, weight, identity_key
)
select
  gen_random_uuid(),
  'rule',
  'רישום השיטות הקנוני v6 — One-Tree Method Presentation + Canonical Order',
  r.description || E'\n\n' ||
  '[UPDATE v6 · Human-Gate ZURIEL · 18.9.2026 — ONE-TREE PRESENTATION / ORDER · EXTEND_EXISTING]' || E'\n' ||
  '21. PUBLIC LABEL != METHOD IDENTITY. method_key is the stable canonical/engine/provenance identity. Hebrew public presentation may use a clearer canonical public label without renaming method_key or changing Trace/history. For method_key=קדמי the public Hebrew label is משולש. For method_key=משולש גדול the public label is משולש גדול. Historical/source-native wording such as קדמי or קדמי · משולש remains valid provenance/alias evidence and must not be erased from source records.' || E'\n' ||
  '22. ONE METHOD ORDER. gematria_methods.sort_order is the canonical presentation order for registered methods. Number, World, Heichal, Beit Midrash, API-facing presentation and future projections consume that order. A surface may take a bounded prefix for layout/performance, but MUST NOT create a competing local priority array that changes relative method order.' || E'\n' ||
  '23. QUICK COUNT IS PRESENTATION, NOT LAW. Showing 6, 8 or another bounded number of methods in a compact rail/grid is an adaptive Experience decision. It does not imply a fixed method count, hide method identity, change entitlement, or alter engine truth. Full registered/available methods remain discoverable through the canonical Registry projection.' || E'\n' ||
  '24. METHOD ORDER != PHRASE PROMINENCE. gematria_methods.sort_order orders METHODS. Equal-Regular expression/phrase prominence is the existing gematria_words.lead_rank Human-Gate curation path (admin_set_lead_ranks / LeadOrderEditor / getAllValuePhrases). Do not copy lead_rank into method order and do not use method sort_order to rank phrases.' || E'\n' ||
  '25. ONE PUBLIC LABEL PROJECTION. Shared renderers/adapters must consume the canonical public-label projection rather than hand-writing קדמי/משולש aliases per surface. Raw/internal/admin provenance views may expose method_key/source-native labels when required, but public copy stays consistent.' || E'\n' ||
  'OWNER CHECK: EXTEND_EXISTING canonical_methods_registry_law. No new registry/store/engine; formulas, method keys, scannability, verification and entitlement are unchanged.',
  coalesce(r.metadata, '{}'::jsonb) || jsonb_build_object(
    'v6_one_tree_presentation_2026_09_18', jsonb_build_object(
      'human_gate', 'ZURIEL',
      'owner_check', 'EXTEND_EXISTING',
      'public_label_overrides', jsonb_build_object(
        'קדמי', 'משולש',
        'משולש גדול', 'משולש גדול',
        'רגיל+משולש', 'רגיל + משולש'
      ),
      'method_order_authority', 'public.gematria_methods.sort_order',
      'equal_regular_phrase_order_authority', 'public.gematria_words.lead_rank',
      'phrase_order_writer', 'admin_set_lead_ranks / LeadOrderEditor',
      'quick_method_count_semantics', 'adaptive_presentation_only',
      'no_new_registry', true,
      'no_formula_change', true,
      'method_key_preserved', true
    )
  ),
  true,
  now(),
  'canonical_methods_registry_law',
  6,
  r.depends_on,
  5,
  r.weight,
  r.identity_key
from public.nodes r
where r.type = 'rule'
  and r.rule_id = 'canonical_methods_registry_law'
  and r.rule_version = 5
order by r.created_at desc
limit 1;

commit;
