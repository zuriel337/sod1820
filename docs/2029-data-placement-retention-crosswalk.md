# SOD1820 2029 — Data Placement & Retention Crosswalk

Status: implementation companion to active `research_intake_foundation_contract_law v13` (v10–v13 placement/retention semantics).

This file is a pointer/implementation map, not a new owner, registry, store, or source of truth. Live domain owners and live DB/code win if this document drifts.

## Core rule

One Tree does **not** mean one SQL table.

- Raw/source material stays with its source/ingress owner when provenance or replay requires it.
- Atomic shared research lives in `research_objects`.
- Qualified stable identity/relation lives in the canonical domain/Reality owner.
- Personal workspace state stays in `research_items` / authorized `user_research`.
- UI surfaces consume governed adapters / Result Bundles instead of inventing feature-local stores.

## Current crosswalk

| Physical store | 2029 role | Crosswalk state | New 2029 semantic writes? |
|---|---|---|---|
| `research_objects` | atomic shared Research OS | KEEP_OWNER | yes, through governed intake/identity rules |
| `research_object_revisions` | additive research history | KEEP_OWNER | yes, where owner contract requires revision lineage |
| `nodes` / `edges` | canonical Reality Graph | KEEP_OWNER | only qualified identity/relation promotion |
| `persons` / `identity_edges` | Person identity fabric | KEEP_OWNER | through Person owner only |
| `research_items` / `user_research` | personal workspace/state | KEEP_OWNER | personal state only |
| `posts` / `post_revisions` | authored/publication source | KEEP_OWNER | through Post owner |
| `gematria_words` / `gematria_methods` | Gematria expression/method authority | KEEP_OWNER | through Gematria owners only |
| `research_contributions` | community/research contribution input pipeline | KEEP_OWNER | yes as contribution input, never as replacement Truth store |
| `channel_updates` | source ingress + active broadcast/media surface | KEEP_SOURCE | source/runtime writes only; extracted meaning routes to Research OS |
| `gallery_images` | media representation + historical placement + active gallery/media surface | KEEP_SOURCE | media/source placement only; research meaning routes through adapters |
| `wa_bot_log` | raw WhatsApp interaction/provenance + timeline input | KEEP_SOURCE / HYBRID OPERATIONAL | raw interaction only; research meaning routes to Research OS |
| `wa_deep_queue` | WhatsApp processing queue + historical timeline input | COMPATIBILITY / HUMAN_REVIEW | operational only; no new semantic authority |
| `wa_vip_inbox` | raw VIP-author source intake | KEEP_SOURCE | source intake only |
| `wa_msg_ext` | WhatsApp metadata/dedup index | OPERATIONAL_RUNTIME | operational only |
| `wa_message_status` | delivery/stuck/reply state | OPERATIONAL_RUNTIME | operational only |
| `contributor_content` | legacy contributor presentation silo | REVIEW_FOR_RETIREMENT | no new 2029 semantic authority |
| `gematria_wall` | live/high-volume purpose not yet reconciled to a canonical 2029 owner | NEEDS_ADJUDICATION | do not expand until owner is resolved |
| `raw_gematria` | historical/high-volume raw store without proven current semantic owner | NEEDS_ADJUDICATION | do not expand until owner is resolved |
| `events` / monthly `events_*` partitions | forward canonical semantic event family under Traffic Intelligence | KEEP_OWNER | yes, through canonical event ingestion only |
| `traffic_daily` / governed Traffic rollups | bounded performance/history projection over event evidence | KEEP_OWNER | owner-governed rollup writes only |
| `site_visits` / `visitor_events` / `page_views` / `search_log` | Legacy/historical telemetry still carrying active readers/writers during transition | TEMPORARY_COMPATIBILITY | no new 2029 semantic authority; cut over reader-by-reader to canonical Traffic/event path |
| `analytics_cache` | existing bounded operational cache used by Traffic/System/Control Plane | KEEP_OWNER / OPERATIONAL_RUNTIME | cache/projection only; never truth |
| `op_trace_roots` / `op_trace_spans` / AI usage logs | operational execution provenance / No-Black-Box | KEEP_OWNER | bounded operational provenance under trace/cost owners |
| `security_log` / `security_alerts` | security operational evidence | KEEP_OWNER / BOUNDED_RUNTIME | security-owner writes only; retention determined by security/audit needs |
| `cron.job_run_details` | pg_cron operational execution history | BOUNDED_RUNTIME | existing 14-day cleanup is owner-specific calibration, not a universal retention duration |
| `g3_openweb_import_stage` | completed OpenWeb import staging/provenance bridge still referenced by identity/materialization helpers | HUMAN_REVIEW / REVIEW_FOR_RETIREMENT | no new semantic authority; archive/drop only after remaining consumers are replaced |
| `convergences` | Legacy bounded convergence corpus with many live compatibility readers | TEMPORARY_COMPATIBILITY | no revived generator authority; migrate consumers before archive/re-admission |
| `research_candidates` | legacy candidate/Human-Gate queue family | REVIEW_FOR_RETIREMENT | no new 2029 authority once Research Objects/current Human-Gate path covers workflow |
| `insights` | legacy knowledge/presentation silo with remaining consumers | REVIEW_FOR_RETIREMENT | re-admit unique knowledge with provenance before writer freeze/archive |
| `journey_seeds` | legacy/internal Journey seed product authority still read by compatibility functions | TEMPORARY_COMPATIBILITY | no new 2029 product dependency; replace with Research Context/Path |
| `discovery_events` | stale discovery runtime/history | REVIEW_FOR_RETIREMENT | preserve unique history, retire writer/runtime after final consumer proof |
| backup / `*_bak*` / cleanup-manifest tables | operational recovery/audit artifacts accidentally resident in live DB | HUMAN_REVIEW | export/archive/drop only after recovery/provenance/consumer proof; not permanent active storage by default |
| `bot_health` | empty legacy watchdog store; current watchdog cron disabled | REVIEW_FOR_RETIREMENT | verify no current System Intelligence consumer before retirement |

## Retention safety

Logical control classes (not DB enums):

- `PROVENANCE_PROTECTED`
- `ACTIVE_SOURCE`
- `BOUNDED_RUNTIME`
- `PURGE_CANDIDATE`
- `HUMAN_REVIEW`

Age, `done`, `hidden`, or another terminal operational status is never sufficient for deletion.

The required destructive flow is always:

`PREVIEW / DRY RUN -> dependency + provenance proof -> explicit governed PURGE`

The current implementation intentionally provides **only** the preview/health half through `public.admin_retention_preview()`. There is no delete RPC and no purge cron in this package.

**Live coverage gap · 28.9.2026:** the current preview directly assesses only `channel_updates`, `wa_bot_log`, `wa_deep_queue`, `wa_vip_inbox`, `wa_msg_ext` and `wa_message_status`. Final G3 compaction must extend the *census*, through owner-native checks/projections, to canonical+Legacy telemetry/logs, cron/security/AI/trace history, staging/backup/import artifacts, media/storage and legacy semantic/candidate stores. This does not authorize one generic retention clock or a universal purge engine.

## Current WhatsApp calibration

- `wa_bot_log`: direct Research OS `source_ref` references exist; historical timeline consumers also read it.
- `wa_deep_queue`: all current rows are terminal, but live code still reads completed rows for historical timeline/context, and Research OS can reference individual rows. Therefore terminal != purge-safe.
- `wa_vip_inbox`: raw VIP-author source material feeds extraction/attribution; protected by default until downstream typed provenance is sufficient for replay.
- `wa_msg_ext`: metadata/dedup only, no message text; candidate for future bounded retention after reader/audit proof and a separate duration decision.
- `wa_message_status`: operational state; future bounded cleanup may be possible, but no duration is guessed here.
- `channel_updates`: active source/product surface with Research OS provenance references; no blanket cleanup.

## Control Center contract

The Admin/Command Center should project, not own, retention state. It may show:

- row count and growth,
- oldest/newest row,
- placement role,
- retention class,
- protected/reference count,
- unknown-dependency count,
- cleanup preview,
- why an item/table is protected.

Any future `Purge` action remains separately Human-Gated and must be reference-aware, idempotent, auditable, privacy-safe, and recoverable.

## End-of-G3 / G3.5 revalidation

Data placement is not frozen by this document. Immediately before G4, rerun the crosswalk from live main/DB/production and refresh writer/readers, growth, last-write time, provenance references and replacement status. A store may move from TEMPORARY_COMPATIBILITY/HUMAN_REVIEW to ARCHIVE/RETIRE only when the later scan proves the dependency disappeared; a store that gained a real 2029 dependency remains under its owner.

29.9 calibration adds two required checks to that rescan: (1) temporary/manual media transport paths must be reviewed against the now-live canonical TikTok-link ingestion path before retirement; and (2) operational telemetry retention must preserve enough raw evidence to diagnose retry amplification and crawler/egress incidents until bounded rollups/replay prove equivalent.
