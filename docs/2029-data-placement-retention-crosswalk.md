# SOD1820 2029 — Data Placement & Retention Crosswalk

Status: implementation companion to `research_intake_foundation_contract_law v13`.

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

## G3 owner-map extension (inventory V2)

Pointer-only mapping of material relations (>=1000 est. rows or >=1 MiB) found unmapped by `admin_canonical_data_inventory_v1`. Evidence = live catalog/function-source/table-comment checks on 2026-10-01 plus repo code refs; no retention or row mutation. Backup/staging stores are mapped to their owning domain with `REVIEW_FOR_RETIREMENT`/`COMPATIBILITY` disposition; removal needs a separate ZURIEL Human Gate after reference proof.

| Physical store | Owner pointer | Placement role | Crosswalk state | Evidence |
|---|---|---|---|---|
| `_audit_pass4_promotable_20260829` | media/source placement owner | STORAGE_CLEANUP_AUDIT_SNAPSHOT | REVIEW_FOR_RETIREMENT | cols full_path/referenced_in_db_recheck; no fn/view/FK/code refs |
| `_cleanup_manifest_hugeit_20260828` | media/source placement owner | STORAGE_CLEANUP_MANIFEST_SNAPSHOT | REVIEW_FOR_RETIREMENT | cols bucket_id/name/delete_batch/delete_result; no fn/view/FK/code refs |
| `_gw_backup` | Gematria owners | GEMATRIA_WORDS_BACKUP_SNAPSHOT | REVIEW_FOR_RETIREMENT | columns mirror gematria_words; no fn/view/FK/code refs |
| `gematria_words_full_backup_20260616` | Gematria owners | GEMATRIA_WORDS_BACKUP_SNAPSHOT | REVIEW_FOR_RETIREMENT | name+dated snapshot of gematria_words; no fn/view/FK/code refs |
| `_ragil_fix_backup_20260616` | Gematria owners | GEMATRIA_WORDS_BACKUP_SNAPSHOT | REVIEW_FOR_RETIREMENT | dated ragil-fix backup; no fn/view/FK/code refs |
| `posts_img_backup` | Post owner | POST_BACKUP_SNAPSHOT | REVIEW_FOR_RETIREMENT | posts image backup; no fn/view/FK/code refs |
| `posts_seo_backup` | Post owner | POST_BACKUP_SNAPSHOT | REVIEW_FOR_RETIREMENT | posts SEO backup; no fn/view/FK/code refs |
| `torah_stream_bak_20260818` | els_research_layer_law v9 | ELS_STREAM_BACKUP_SNAPSHOT | REVIEW_FOR_RETIREMENT | dated backup of torah_stream (read by els_stream_* fns); no fn/view/FK/code refs |
| `torah_stream_stg` | els_research_layer_law v9 | ELS_STREAM_STAGING | REVIEW_FOR_RETIREMENT | staging twin of torah_stream; no fn/view/FK/code refs |
| `torah_stream` | els_research_layer_law v9 | ELS_CANONICAL_TORAH_STREAM | KEEP_OWNER | els_stream_letters_v1/els_stream_relation_v1; tanakh_stream comment names els_research_layer_law v9 |
| `tanakh_stream` | els_research_layer_law v9 | ELS_CANONICAL_TANAKH_STREAM | KEEP_OWNER | table comment: Owner els_research_layer_law v9; els_stream_* fns |
| `tanach_verses` | research_intake_foundation_contract_law v13 / corpus_admission_foundation_v1 | TANAKH_CORPUS_SOURCE_TEXT | KEEP_SOURCE | tanakhVerseIdentity.js; view tanach_verse_lang; tanakh_stream derives from it (comment) |
| `words` | Gematria owners | LEGACY_WORD_VALUE_LEXICON | COMPATIBILITY / HUMAN_REVIEW | ragil/misratar/kadmi value columns; fn_name_*/fn_notarikon readers; FK word_tags |
| `bidim` | Gematria owners | DERIVED_METHOD_CROSS_INDEX | OPERATIONAL_RUNTIME | bidim_sync; view cross_method_strength; convergence/cross fns |
| `maftech_lexicon` | Gematria owners | DERIVED_METHOD_LEXICON | OPERATIONAL_RUNTIME | table comment: derived from gematria_words + Tanakh words; fn_maftech_decompose only |
| `convergences` | cross_vs_convergence_criteria v4 | CONVERGENCE_RECORDS | KEEP_OWNER | fn_convergence*, convergence_values_present, admin_convergence_detail |
| `comments` | Post owner | POST_CONVERSATION_SOURCE | KEEP_SOURCE | post_conversation_projection, popular_posts_by_comments |
| `post_share_counts` | Post owner | POST_SHARE_COUNTER | OPERATIONAL_RUNTIME | increment_post_share(_by_slug) |
| `legacy_traffic` | traffic_intelligence_law v11 | LEGACY_HISTORICAL_TRAFFIC | COMPATIBILITY / HUMAN_REVIEW | table comment: Jetpack/WordPress.com pre-migration stats; legacy_top_pages |
| `contributors` | person_foundation_contract_law v6 | CONTRIBUTOR_IDENTITY_SOURCE | KEEP_OWNER | admin_person_materialize_contributor_history_v1, person_public_profile_v1, contributors_claim_legacy |
| `contribution_links` | research_contribution_law v9 | CONTRIBUTION_LINK_PIPELINE | KEEP_OWNER | link_contribution, project_contribution_to_graph, g3_openweb_import_* |
| `g3_openweb_import_stage` | research_contribution_law v9 | IMPORT_STAGING | COMPATIBILITY / HUMAN_REVIEW | g3_openweb_import_stage_batch, export/erasure fns; no other readers |
| `visitor_identity` | person_foundation_contract_law v6 | VISITOR_PERSON_IDENTITY_LINK | KEEP_OWNER | link_visitor_identity, delete_my_account, erasure_my_account_prepare_v2 |
| `sod_id_registry` | person_foundation_contract_law v6 | DEVICE_SOD_ID_REGISTRY | KEEP_OWNER | resolve_person upserts it alongside persons/identity_edges (live fn source) |
| `user_activity` | traffic_intelligence_law v11 | USER_ENGAGEMENT_RUNTIME | OPERATIONAL_RUNTIME | my_engagement, engagement_overview, admin_retention |
| `page_views` | traffic_intelligence_law v11 | OPERATIONAL_RUNTIME | OPERATIONAL_RUNTIME | fn_ti_session_*, hot_posts_live, admin_journey_funnel |
| `search_log` | traffic_intelligence_law v11 | OPERATIONAL_RUNTIME | OPERATIONAL_RUNTIME | live_stats, admin_infra_load, admin_research_map |
| `traffic_history` | traffic_intelligence_law v11 | OPERATIONAL_RUNTIME | OPERATIONAL_RUNTIME | admin_traffic_unified, ingest_ga_daily, admin_retention_preview |
| `crawl_daily` | traffic_intelligence_law v11 | OPERATIONAL_RUNTIME | OPERATIONAL_RUNTIME | log_crawl, admin_crawl_intel |
| `edge_geo_log` | traffic_intelligence_law v11 | OPERATIONAL_RUNTIME | OPERATIONAL_RUNTIME | log_edge_geo, traffic_composition |
| `edge_ua_seen` | traffic_intelligence_law v11 | OPERATIONAL_RUNTIME | OPERATIONAL_RUNTIME | log_edge, admin_crawl_intel |
| `gsc_metrics` | traffic_intelligence_law v11 | SEARCH_CONSOLE_MEASUREMENT | OPERATIONAL_RUNTIME | table comment: gsc-sync edge function; snapshot_seo_wave |
| `security_log` | system_suggestions_law v5 | SECURITY_INCIDENT_LOG | OPERATIONAL_RUNTIME | log_security, check_security_spike, api/honeypot.js |
| `op_trace_spans` | system_suggestions_law v5 | OPERATIONAL_TRACE_SPANS | OPERATIONAL_RUNTIME | table comment: G3 operational span tree; op_trace_* fns |
| `bot_health` | WhatsApp source ingress owner | OPERATIONAL_RUNTIME | OPERATIONAL_RUNTIME | fn_bot_watchdog (reads wa_bot_log, writes bot_health) |
| `ai_analysis_log` | ai_analyze_contract v2 | AI_COMPLETION_LOG | OPERATIONAL_RUNTIME | ai_log_analysis, admin_ai_*; historicalAiBenchmark.js |
| `ai_token_log` | ai_analyze_contract v2 | AI_COST_LOG | OPERATIONAL_RUNTIME | admin_ai_cost/tokens, op_trace_link_ai_cost_v1; ControlPlane2029Page.jsx |
| `inbound_emails` | source ingress owner | SOURCE_INGRESS_PROVENANCE | KEEP_SOURCE | email-inbound/email-reply edge functions; src/lib/supabase.js |
| `newsletter_campaigns` | subscription_funnel_law v19 | NEWSLETTER_SEND_LOG | OPERATIONAL_RUNTIME | table comment; send-newsletter/send-reengage; admin_growth_center |
| `media_migration_queue` | media/source placement owner | MEDIA_MIGRATION_QUEUE | OPERATIONAL_RUNTIME | path/dest_key/status cols; admin_system_health only |

### Blocking GAPs (owner not supported by live evidence — intentionally left UNKNOWN)

- `xlang_calibration` — no function, view, FK, code or comment reference; cannot attribute an owner.
- `shiurim_audio` — only `random_shiurim()` and a client read; no owning law found for audio lessons.
- `post_qa` — only `metatron_context` reads it; `post_id` suggests Post owner but Q&A/verified semantics are unreconciled.
- `discoveries` — Metatron/bridge readers, `evidence_level`/`human_verified`/`node_id` fields, FK `discovery_tags`; Research OS vs Truth vs Reality ownership unresolved.

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
