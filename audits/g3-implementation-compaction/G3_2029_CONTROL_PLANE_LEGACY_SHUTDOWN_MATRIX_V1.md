# G3 — 2029 Control Plane + Legacy Writer Shutdown Matrix v1

**Date:** 2026-09-18  
**Status:** LIVE-FIRST PLANNING / COMPACTION EVIDENCE · BRANCH-ONLY · NO RUNTIME CHANGE  
**Canonical Supabase:** linswmnnkjxvweumprav  
**Main baseline:** 4ee83bb3ca46d35329b38af32b92a51985cbeb72  
**Owner verdict:** **EXTEND_EXISTING**  
**Owners consumed:** foundation_closure_protocol_law v6 · experience_governance_foundation_v1_law v6 · system_suggestions_law v2 · research_intake_foundation_contract_law v11 · site_flags_lock_law v3 · domain owners per row.

## 0. Core invariant

> **Legacy Experience != Capability != Data != Writer.**

The 2029 product replaces Legacy Experience, including Legacy admin presentation. That is not permission to shut down a table, source, engine or transport with the UI. Cutover is writer-by-writer and consumer-proofed:

1. resolve current owner/source;
2. identify writers;
3. identify current and 2029 readers;
4. prove replacement or prove no required consumer;
5. freeze/retire only that writer;
6. preserve source/provenance/history when the current owner still requires it.

No Shutdown Store, Maintenance Store, Control Plane Store, Media Registry or second Truth system is created. The internal 2029 Control Plane / Admin is an Experience projection over existing owners.

## 1. Live snapshot used by this matrix

- channel_updates: 2,074 rows; 461 created in the last 30 days; latest write on 2026-09-18.
- gematria_wall: 20,428 rows; still receiving writes on 2026-09-18.
- convergences: 8,917 rows; current status new; last observed generation activity 2026-08-10.
- raw_gematria: 9,748 rows; 9,452 promoted; no recent write activity.
- research_candidates: 42 rows; 20 pending.
- discovery_events: 742 rows; last write 2026-08-07.
- insights: 315 rows; 305 active.
- journey_seeds: 805 rows; draft/approved internal projection state; native World acceptance explicitly rejects direct journey_seeds consumption.
- Storage at scan: about 15 GB / 20,211 objects; 155 objects >20 MB; 3 >50 MB.
- Public gallery at scan: 2,190 visible rows; 233 rows had thumb_url = image_url.
- Legacy synthetic ticker triggers remain live on Posts, Number Anchors, Relation Evidence and published ELS.
- gallery_images OCR automation still has a path that can derive values and wire image/number graph relations.
- posts.trg_convergence_promote still writes legacy verification-looking presentation fields.
- gematria_words.gw_enforce_engine remains a fixed-method compatibility trigger beside Registry/server authority.
- lab-reflect runs every 10 minutes and wa-mora every 30 minutes although Meaning Lab / lab_* were historically classified as an external side project.

Counts are current-state evidence, not permanent contracts.

## 2. Writer / island matrix

| Area / island | Live writer / role | 2029 disposition | Replacement / cutover gate | Action after gate |
|---|---|---|---|---|
| Legacy Admin / WarRoom / dead CommandCenter | Legacy UI over current RPCs/read models | UI: **ABSORB_THEN_ARCHIVE**; current owner capabilities: **KEEP_CURRENT** | Internal 2029 Control Plane supplies owner-native roll-up, drill-down and Human-Gated actions | Retire Legacy admin presentation; do not clone its IA |
| Synthetic channel_updates ticker | posts_to_ticker, anchors_to_ticker, findings_to_ticker, els_published_to_ticker | writers: **TEMPORARY_COMPATIBILITY**; channel/source rows remain **KEEP_SOURCE** | Global Now / Updates 2029 no longer needs synthetic fan-out and deep links/SEO pass | Disable only synthetic triggers; keep required source/channel ingress |
| WhatsApp / channel ingress | wa-channel-ingest, webhook/process workers | **KEEP_CURRENT / KEEP_SOURCE** | 2029 source/admission readers verified | Keep running; Legacy feed shutdown does not imply source shutdown |
| OCR extraction | OCR + feed_image_to_search | **KEEP_CURRENT** extraction | 2029 Media Admission preserves Extraction + provenance/uncertainty | Keep OCR extraction |
| OCR semantic auto-promotion | feed_after_ocr / wire_image_meaningful may set value or create image-number relation | **ABSORB_THEN_ARCHIVE** as semantic authority | 2029 admission/Truth path owns media relation claims | Freeze semantic graph promotion; preserve history/provenance |
| Post convergence promotion | trg_convergence_promote -> fn_convergence_promote | **TEMPORARY_COMPATIBILITY / ABSORB_THEN_ARCHIVE** | Post 2029 composes calculation/evidence/verification from current Truth owners | Stop legacy verification-looking derivation |
| Fixed Gematria trigger | gw_enforce_engine fixed method list | **TEMPORARY_COMPATIBILITY / ABSORB_THEN_ARCHIVE** as engine authority | surviving authoritative writes use Registry + server engine/trace and parity passes | Retire fixed authority role; retain only explicit compatibility if required |
| gematria_wall | active user/calculator wall writes; ~20k rows | **TEMPORARY_COMPATIBILITY**; source classification **NEEDS_ADJUDICATION** | decide whether it survives as Analytics/interest signal under a current owner | map to governed telemetry or freeze Legacy wall writes; never treat popularity as truth |
| convergences corpus | 8,917 historical rows; no current writer identified in scan | data **KEEP_CURRENT** as bounded compatibility/source corpus | reader adapters preserve source identity and current convergence/truth criteria | Prefer read-only/re-admission; do not revive old generator as truth engine |
| raw_gematria | dormant historical raw store | **ABSORB_THEN_ARCHIVE** | promoted/current material reconstructable and dependency check complete | archive/read-only; no new writes |
| research_candidates | old candidate-generation family; 20 pending | **TEMPORARY_COMPATIBILITY → ABSORB_THEN_ARCHIVE** | Research Objects + Human Gate cover required workflows; pending rows adjudicated/preserved | stop new writes and retire queue after reconciliation |
| discovery_events | old discovery scan; dead since 2026-08-07 | **RETIRE_REMOVE** runtime; history preserved | no live 2029 consumer; unique provenance retained | remove from active routing/writers; archive rows |
| insights | legacy knowledge silo; 315 rows | **ABSORB_THEN_ARCHIVE** | surfaced material has owner-qualified Research Object/Graph/Topic/compat path or historical-only classification | stop new semantic writes; re-admit unique material with provenance |
| journey_seeds | internal seed generation; 805 rows | **TEMPORARY_COMPATIBILITY / ABSORB_THEN_ARCHIVE** as product authority | native Journey uses Research Context/Path/Result; World already avoids direct seed use | freeze seed-based product dependency |
| Meaning Lab / lab_* | lab-reflect 10m; wa-mora 30m; Lab Edge workers | SOD1820 runtime **RETIRE_REMOVE** after separation decision | Human Gate chooses separate project/home or pause; export/data needs resolved | disable/move Lab workers out of SOD operations; do not delete Lab history blindly |
| Media thumbnails/derivatives | gen-thumb + gallery/post/channel thumb crons and current media workers | **KEEP_CURRENT**, evolve in place | one asset identity + bounded background derivatives + cache/egress visibility | keep required workers; converge on one derivative pipeline |
| Original-as-thumbnail / oversized media defect class | historical rows/callers may fall back to originals | defect under **KEEP_CURRENT** media owner | suitable derivatives generated; consumers avoid heavy original fallback; egress acceptance passes | repair/backfill through governed media pipeline |
| Newsletter / welcome / email | newsletter/welcome/reply/reengage workers | **KEEP_CURRENT** capability | Communications projection in 2029 Control Plane; consent/unsubscribe/delivery truth preserved | keep transport; retire Legacy admin UI only |
| Follow / push / notifications | notification prefs/events + dispatcher | **KEEP_CURRENT** | 2029 Attention/Follow uses stable identity + channel consent | keep dispatcher; retire Legacy display/alias adapters |
| WhatsApp bots / Raziel channels | active current workers; some historical bot crons disabled | current owner paths **KEEP_CURRENT**; obsolete identities **RETIRE_REMOVE** when proven | one Raziel identity + source/admission + delivery truth | retire obsolete workers/aliases individually |
| Social publishing | Facebook/social publisher + logs | **KEEP_CURRENT** capability | Publishing projection in Control Plane; auth/idempotency/attribution pass | keep bounded publisher; retire old scheduler UI only |
| Traffic / GSC / SEO / OG / sitemap | telemetry + delivery infrastructure | **KEEP_CURRENT** | 2029 route/addressability + canonical/redirect/sitemap/OG acceptance | preserve infrastructure; replace Legacy dashboards/routes separately |
| Legacy public routes / post deep links | Legacy index.html routing + public slugs | **TEMPORARY_COMPATIBILITY** | native target or deliberate compatibility/redirect; canonical/OG/sitemap parity | cut over route-by-route; never shut index.html before addressability proof |
| Experimental Rooms / Galaxy / Sulamot lineage | prototype/redirect/inert presentation | **RETIRE_REMOVE / PROTOTYPE_REFERENCE** | no current 2029 consumer | keep only required redirects/history; never use as Spatial authority |
| Security / RLS / Edge audits | scheduled owner-qualified audits | **KEEP_CURRENT** | Control Plane can drill to owner evidence | keep independent of Legacy UI lifetime |
| Health / system watch | DB/cron health + system suggestions | **KEEP_CURRENT**, extend in place | canonical alerts use notify_admin; admin health is bounded projection | remove direct/parallel alert paths when patched |
| AI/provider cost + usage | ai_token_log and cost/usage projections | **KEEP_CURRENT** | No-Black-Box trace/span roll-up + exact/estimated/unknown | project into Control Plane; no Cost Store 2 |
| Agent dispatch / work_log | event-driven coordination runtime | **KEEP_CURRENT** | coverage/hardening acceptance | keep independent of public cutover |
| Retention / cleanup | Research Intake v11 + admin_retention_preview() | **KEEP_CURRENT** | dry-run + dependency/provenance proof + separate purge authorization | consume existing preview; no Control Plane cleanup store |
| Backups / release provenance | Git/main/Vercel/DB migration/work_log state | **KEEP_CURRENT** | Control Plane distinguishes branch/merged/deployed/live/verified | keep; Legacy admin shutdown has no effect |

## 3. Internal 2029 Control Plane projection

The Control Plane is internal-only. It answers what needs Human attention, what is running, what is failing/costing/scaling, what is being published/delivered, what is drifting, and what is eligible for retirement after proof.

Suggested lenses are projections only, not stores:

1. Now / Attention
2. Research Governance
3. Content & Publishing
4. Media & Sources
5. People & Identity
6. Communications
7. Growth & Traffic
8. Operations / Cost / Security
9. Release / Roadmap / System

Each lens consumes the current owner and drills to underlying evidence. No universal health/truth score is required.

## 4. Media / egress acceptance

- original remains immutable;
- derivatives remain linked to the same asset identity;
- cards/lists use bounded thumbnails/previews/posters, not originals by default;
- derivative work runs on ingest/material change/background jobs, not hidden page-view preloads;
- cache identity/versioning is explicit;
- Storage/CDN bytes and cache hit/miss are traceable where available;
- provider-exact usage = EXACT; internal calculation = ESTIMATED; unavailable provider metric = UNKNOWN;
- missing provider telemetry never becomes zero;
- Control Plane can surface storage size, large objects, missing derivatives, original-as-thumbnail defects, hot objects when provider logs permit it, processing failures and provider quota state;
- retention/cleanup remains behind admin_retention_preview() + dependency/provenance proof.

## 5. First safe shutdown batches — planning only

### Batch A — dead / non-authoritative writers

- stale discovery-event generation;
- old candidate writers after pending-row adjudication;
- Legacy semantic OCR graph auto-promotion after 2029 admission replacement;
- Legacy Post verification-looking convergence promotion after Post/Truth replacement.

### Batch B — synthetic Legacy projection writers

- Post/Anchor/Finding/ELS → channel_updates synthetic ticker triggers.

Source/channel ingestion remains live.

### Batch C — legacy product-signal islands

- gematria_wall write path;
- journey_seeds generation;
- insights new writes;
- dormant raw stores.

Only after explicit owner decisions.

### Batch D — external side-project runtime

- Meaning Lab / lab_* workers after separate-home/pause decision.

### Batch E — public route cutover

Only after native/compat targets, canonical redirects, sitemap, OG, auth/privacy and external deep-link acceptance.

## 6. Human Gate / release boundary

This matrix authorizes no cron/trigger/Edge disable, DB/schema/data mutation, deletion/purge/backfill, route cutover, Legacy public shutdown, merge or deploy.

Major Legacy→2029 cutover and permanent capability/history retirement remain explicit Human-Gate decisions.

## 7. PR #489 overlap note

Open PR #489 (gpt/g3-research-trust-partner-source-roadmap-v1) contains separate Research Trust / External Partner Source planning. This package does not cancel or overwrite that scope. Unique partner-source material must be reconciled independently before that branch is closed or superseded.
