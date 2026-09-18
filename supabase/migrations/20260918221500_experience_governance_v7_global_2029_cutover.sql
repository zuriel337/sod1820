-- G3_2029_GLOBAL_CUTOVER_FOUNDATION_V1
-- Human Gate direction: whole-site 2029 replacement must use one shared cutover contract.
-- Branch-only. No route/public behavior changes are performed by this migration itself.

begin;

update public.nodes
   set is_active = false
 where type='rule'
   and rule_id='experience_governance_foundation_v1_law'
   and rule_version=6
   and is_active=true;

insert into public.nodes (
  id,type,label,description,metadata,is_active,created_at,
  rule_id,rule_version,depends_on,supersedes_version,weight,identity_key
)
select
  gen_random_uuid(),
  'rule',
  'Experience Governance v7 — Global 2029 Cutover Foundation',
  r.description || E'\n\n' ||
  '[UPDATE v7 · Human-Gate ZURIEL · 18.9.2026 — GLOBAL 2029 CUTOVER FOUNDATION · EXTEND_EXISTING]' || E'\n' ||
  '6. WHOLE-SITE CUTOVER IS ONE FOUNDATION, NOT PAGE-LOCAL PRESERVATION. The 2029 replacement program inherits one global cutover contract for route identity, SEO/indexability, OG/share, semantic telemetry, Research Context/history/exact-return, access/site state, canonical readers and inbound/deep-link continuity. A redesigned surface consumes these owners; it does not recreate them locally.' || E'\n' ||
  '7. RENDERER MAY CHANGE; SEMANTIC IDENTITY MUST NOT DRIFT. Legacy geometry/components/chrome are not protected. Canonical identity, URLs/redirect semantics, access, provenance, truth/governance/publication distinctions and durable research/personal state are protected unless explicitly superseded by Human Gate.' || E'\n' ||
  '8. CAPABILITY PARITY BEFORE RETIREMENT. A legacy renderer may be retired only after each unique capability is classified as PRESERVE THROUGH EXISTING OWNER, REHOME, REPLACE PRESENTATION, RETIRE LEGACY-ONLY PRESENTATION or BLOCKED. Deleting old UI is never itself proof that capability can disappear.' || E'\n' ||
  '9. SEO/ROUTE/SHARE/TELEMETRY ARE SHARED CROSS-SURFACE OWNERS. 2029 surfaces must extend existing route/SEO/OG/share/telemetry owners and preserve canonical addresses/inbound value. No page-local SEO registry, share system, analytics family or route identity may be created merely because the renderer is new.' || E'\n' ||
  '10. RESEARCH/PERSONAL CONTINUITY IS LOSSLESS WITHIN AUTHORIZATION. Subject/root, selection, dimensions/lens, Journey/exact-return, history, saved/personal research and authorized context survive renderer transitions through existing Research OS owners. No 2029 Context/Workspace store.' || E'\n' ||
  '11. SURFACE CUTOVER MAY SHIP INDEPENDENTLY BUT MUST CONSUME ONE ACCEPTANCE GATE. Number, World, Heichal, Books, ELS, Posts, Community and future surfaces may reach readiness at different times; they do not define different preservation laws. Each public cutover must pass identity, route, SEO, sitemap, OG/share, telemetry, Research continuity, access, data-owner, deep-link, mobile/accessibility, failure-state, capability-parity, isolation and exact-head regression gates.' || E'\n' ||
  '12. NUMBER IS FIRST CONSUMER, NOT A SPECIAL ARCHITECTURE. /number preservation work proves the shared mechanism and must not become a Number-only layer.' || E'\n' ||
  'OWNER CHECK: EXTEND_EXISTING experience_governance_foundation_v1_law. No new router/SEO registry/analytics store/share system/context store/graph/engine.',
  coalesce(r.metadata,'{}'::jsonb) || jsonb_build_object(
    'v7_global_2029_cutover_2026_09_18', jsonb_build_object(
      'human_gate','ZURIEL',
      'owner_check','EXTEND_EXISTING',
      'strategy','WHOLE_SITE_ONE_CUTOVER_FOUNDATION',
      'preserve','capability_identity_provenance_access_continuity',
      'replace','legacy_presentation_geometry',
      'no_new_router',true,
      'no_new_seo_registry',true,
      'no_new_analytics_store',true,
      'no_new_share_system',true,
      'no_new_context_store',true,
      'number_is_first_consumer_only',true,
      'contract_path','docs/g3-2029-global-cutover-foundation-v1.md'
    )
  ),
  true,
  now(),
  'experience_governance_foundation_v1_law',
  7,
  r.depends_on,
  6,
  r.weight,
  r.identity_key
from public.nodes r
where r.type='rule'
  and r.rule_id='experience_governance_foundation_v1_law'
  and r.rule_version=6
order by r.created_at desc
limit 1;

commit;
