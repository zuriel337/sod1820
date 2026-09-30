# G3 — Implementation Compaction / Archive Gate v1

**Date:** 2026-09-15  
**Human Gate:** ZURIEL  
**Owner:** `foundation_closure_protocol_law`  
**Status:** MANDATORY END-OF-G3 GATE · EXTEND_EXISTING · NO NEW OWNER/SYSTEM/STORE

## Purpose

G2 compacts semantic authority. G3 must compact implementation reality.

This gate exists so the greenfield 2029 runtime does not finish G3 while still depending silently on legacy routes, components, RPCs, triggers, cron jobs, adapters, prompts, old UI contracts or compatibility behavior that agents can mistake for current architecture.

Core rule:

> **New runtime first; legacy only by explicit temporary compatibility; archive when replacement is verified.**

No history is deleted merely to reduce counts. Legacy implementation may remain temporarily only when an explicit live dependency still exists.

## Required G3 disposition vocabulary

Every surviving active rule already carries `metadata.g3_disposition_v1` and must resolve to one of:

- `KEEP_CANONICAL_OWNER` — current semantic owner; survives unless explicitly superseded through the owner gate.
- `KEEP_SCOPED_SEMANTIC` — unique scoped semantics still required; may later be absorbed into its owner after proof of semantic preservation.
- `REVALIDATE_DURING_G3` — current rule may contain legacy runtime/presentation assumptions; G3 must prove KEEP, ABSORB→ARCHIVE or RETIRE.
- `LEGACY_COMPAT_RETIRE_WHEN_REPLACED` — explicitly temporary compatibility behavior; never a future architecture dependency.
- `DEFER_PRODUCT_DECISION_G5` — preserved without hard-wiring during G3 because product allocation belongs to G5.

At gate creation the active-tree disposition census is:

- KEEP_CANONICAL_OWNER: 23
- KEEP_SCOPED_SEMANTIC: 49
- REVALIDATE_DURING_G3: 11
- LEGACY_COMPAT_RETIRE_WHEN_REPLACED: 2
- DEFER_PRODUCT_DECISION_G5: 1
- total active rules: 86

Counts are calibration only. The acceptance target is no ambiguous runtime authority.

## Mandatory end-of-G3 census

Before G3 may close, inventory current production/main runtime dependencies across at least:

- routes / navigation / redirects;
- React/components/renderers and shared UI primitives;
- Supabase tables/views/RPCs/functions/triggers/RLS policies;
- Edge Functions / workers / webhooks / scheduled jobs / cron;
- AI/Raziel adapters, prompts and response envelopes;
- ELS/Gematria execution adapters;
- Research OS / Journey / personal-state adapters;
- publishing/media/SEO/share pipelines;
- Follow/Attention delivery producers and channel adapters;
- analytics/read models;
- feature/capability flags;
- legacy compatibility code, migrations and scripts.

Each legacy/runtime artifact receives exactly one result:

1. `KEEP_CURRENT` — consumed by a current canonical owner and still valid.
2. `ABSORB_THEN_ARCHIVE` — useful semantics are moved into the current owner; old body/runtime loses authority.
3. `TEMPORARY_COMPATIBILITY` — still required for an explicit legacy dependency, with owner + removal condition.
4. `RETIRE_REMOVE` — replacement is live/verified and no required dependency remains.

## Hard acceptance

G3 cannot close until all are true:

1. No new 2029 runtime path consumes a rule/contract marked legacy compatibility as its architecture owner.
2. No duplicated engine/RPC/trigger/worker/store performs the same canonical responsibility without an explicit bounded migration reason.
3. No old route/component/prompt/adapter silently defines product semantics that current owners supersede.
4. Every `REVALIDATE_DURING_G3` rule has a final KEEP / ABSORB→ARCHIVE / RETIRE decision with live evidence.
5. Every `LEGACY_COMPAT_RETIRE_WHEN_REPLACED` item has either been retired or has an explicit unresolved live dependency and removal condition.
6. Compatibility layers cannot be discovered through normal owner-first startup unless the task is explicitly legacy/migration work.
7. Database triggers/jobs/cron/workers that write obsolete state are removed/disabled only after replacement replay proves no required behavior is lost.
8. Branch-only / merged / deployed / live / verified implementation states are reconciled exactly.
9. Full provenance remains available in Git, inactive rules, work_log and migration history.
10. Fresh-agent replay after G3 resolves only current owners/runtime for normal tasks and opens legacy history on demand.
11. **Writer cutover proof:** every 2029 user-facing path has canonical writers/readers; superseded Legacy writers are frozen only after replacement + replay + live-consumer proof.
12. **Telemetry one tree:** `events`/Traffic is the forward semantic event family; Legacy `site_visits`/`visitor_events`/`page_views`/`search_log` dependencies are inventoried and removed from 2029 one by one while required historical evidence/rollups remain available.
13. **Full retention census:** final dry-run covers source/WhatsApp plus telemetry/logs, cron/security/AI/trace history, import/staging/backups, media/storage and legacy semantic/candidate stores. Destructive action remains separately Human-Gated.
14. **Query/RLS/index right-sizing:** use live workload/advisor/query-plan evidence to fix measured hot RPCs, add needed indexes, remove true duplicates/redundancy and avoid speculative index churn.
15. **No DB-held remote wait on hot paths:** latency-critical external provider calls must not retain a DB connection while waiting on remote HTTP when the same governed action can use existing async Edge/background transport.
16. **Raziel one brain:** channel adapters may vary transport/presentation only; no channel-local fixed method list, convergence authority or research brain remains as future architecture authority.
17. **Monitoring one tree + cost split:** routine health is a bounded fast snapshot; expensive retention/dedupe/storage dependency scans are cached/background/on-demand under the same owners.
18. **Media/storage compaction:** originals/source fidelity stay protected; bounded derivatives/cache are verified; duplicate/archive candidates require content/reference/provenance proof before destructive action.
19. **Staging/backups/legacy stores:** import-stage, backup, cleanup-manifest and dormant legacy tables receive explicit KEEP/ARCHIVE/RETIRE decisions with reader/writer proof.
20. **Physical maintenance after logical changes:** only after cutover/index/schema decisions, refresh statistics and run evidence-based VACUUM/ANALYZE/REPACK where needed; physical rewrites never substitute for semantic cleanup.
21. **Performance baseline:** record representative pre-G4 route/RPC/Raziel/query/cache/egress/error metrics; “fast” without measured evidence is not closure.
22. **Retry amplification guard:** semantic/application conflicts must not surface through retryable transport/database error codes that can create backend retry storms.
23. **Crawler-cost reproof:** server-document/crawler metadata changes are accepted only after live DB-read and Storage-egress measurement confirms intended reduction without breaking indexability/provenance.
24. **Temporary Legacy hotfix retirement:** fixes made only to keep current Legacy production usable remain TEMPORARY_COMPATIBILITY and are revalidated for retirement once native 2029 replacement passes.
25. **Branch/PR hygiene:** run a repository-wide census before G4; classify each open PR/branch against current main as RELEASE/REBASE/ABSORB/ARCHIVE/SUPERSEDED and remove stale implementation authority from normal routing.

## Known G2 carry-forward candidates

Explicit legacy compatibility:

- `legacy_content_protocol`
- `preserve_linked_row`

Mandatory G3 revalidation candidates at creation:

- `number_page_law`
- `no_row_without_number_law`
- `bot_delivery_law`
- `raziel_response_contract`
- `raziel_whatsapp_access_adapter_law`
- `post_og_image_law`
- `worlds_color_law`
- `identity_architecture_law`
- `unified_tags_law`
- `source_video_publish_law`
- `word_approval_required_law`

This list is routing calibration, not permission to retire blindly. Live implementation/dependency verification is mandatory.

## Ordering

Run this gate after G3 runtime/Golden implementation has enough verified replacements to make retirement decisions evidence-based, and before G4.

### Mandatory pre-G4 live rescan

Immediately before G4 entry, repeat the live census against then-current main + production + canonical Supabase and supersede earlier counts. Cover DB/table/index/storage growth, current writers/readers, cron/Edge workers, Legacy islands, `pg_stat_statements`, RLS/index advisors, vacuum/dead-tuple state, telemetry parity, retry amplification, Raziel/provider paths, monitoring latency, media/egress/crawler behavior, direct source-ingest paths, every open PR/branch and retention coverage. Provider/edge/storage evidence is required where semantic `events` cannot observe crawler/media traffic. New islands found by the rescan extend this same gate; no parallel cleanup system is created.

The G3 opening event-driven inter-agent dispatcher does not replace this gate; it should help execute it with direct GPT↔CLAUDE challenge/verification once implemented.

## Owner / anti-inflation rule

`EXTEND_EXISTING foundation_closure_protocol_law` only.

Do not create a Legacy System, Archive System, Migration Registry, Runtime Truth Store or second coordination mechanism. Use existing owner metadata, main/DB live verification, Git provenance and work_log coordination.
