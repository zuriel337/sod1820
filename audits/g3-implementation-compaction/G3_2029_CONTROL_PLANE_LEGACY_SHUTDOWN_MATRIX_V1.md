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

## 8. Deep live-scan delta — 2026-09-28

This section refreshes the 18.9 planning evidence without rewriting historical counts. Live reality wins.

### 8.1 Current scale / pressure calibration

- canonical database ≈ **1.5 GB**; public relations ≈ **660 MB heap + 561 MB indexes**;
- Storage ≈ **15.17 GB / 20,285 objects**; current dedupe observation classifies ≈ **4.747 GiB** as duplicate candidates, including ≈ **2.309 GiB video** — evidence only, no delete authority;
- Legacy telemetry footprint: `visitor_events` ≈184 MB + `site_visits` ≈75 MB + `page_views` ≈15 MB + `search_log` ≈12 MB, while canonical partitioned `events` July–September ≈194 MB; 2029 still invokes the shared `trackVisit` path, so dual-write retirement is not yet proven;
- backup/stage/cleanup-named public tables together are ≈ **76 MB**; `g3_openweb_import_stage` alone ≈42 MB and still has live DB consumers, therefore it is not purge-safe;
- `cron.job_run_details` ≈ **55 MB / ~89k rows** and already has a 14-day daily retention job — this is a valid bounded operational retention pattern, not permission to copy “14 days” to other domains;
- `admin_retention_preview()` remains DRY_RUN_ONLY and currently assesses only six WhatsApp/source families; this is a **coverage gap** for final G3 compaction, not a second-retention-system request;
- measured DB hot-path evidence includes legacy/compat RPCs and provider calls. `wa_admin` still performs synchronous external HTTP inside PostgreSQL with a 20s cap; cumulative stats show it as a material connection-holding path. `admin_retention_preview` / `admin_system_health` are also multi-second in current cumulative samples and need fast/deep projection separation before routine Control Plane use;
- duplicate/redundant index evidence exists (including duplicate GIN word indexes on `tanach_verses`, plus smaller duplicates on discoveries/posts/calculator anchors); missing covering-FK candidates exist on current 2029 families such as `research_objects.parent_id`, contributor/research-contribution links, Gematria→node and Operational Trace parent linkage. These are **candidates**, not automatic DDL authorization;
- RLS performance review remains material on canonical tables; optimize only with policy-equivalence/security proof.

### 8.2 New/clarified island dispositions

| Area / island | Live evidence | Target | Gate before action |
|---|---|---|---|
| Legacy telemetry writers/readers | `site_visits` / `visitor_events` / `page_views` / `search_log` still have active writers/readers while 2029 also emits `events` | **ABSORB_THEN_ARCHIVE** as forward authority; preserve bounded historical data | canonical Traffic/event parity + replacement of live readers + Golden comparison window |
| Raziel WhatsApp local research wiring | channel Edge code still carries local fixed method list/direct Gematria and legacy Convergence reads | **ABSORB_THEN_ARCHIVE** local brain; transport adapter survives | canonical Raziel routing/Method Profile/Research OS/Convergence adapter parity + trace |
| DB-held provider HTTP (`wa_admin`) | synchronous Green API HTTP can hold a DB connection while remote call waits | **ABSORB_THEN_ARCHIVE** from latency-critical execution | async existing Edge/background transport proves idempotency, retry, delivery outcome, auth and trace |
| Retention preview coverage | six source/WhatsApp families only | **EXTEND_EXISTING** Research Intake v13 preview/census | per-owner reference/provenance logic; no generic delete engine |
| Control Plane health read | same canonical owner, but deep retention/storage work can dominate read cost | **KEEP_CURRENT + split cost class** | fast cached health equivalence + deep on-demand/background drilldown |
| Backup/stage/cleanup tables | ≈76 MB; some still consumed | **HUMAN_REVIEW → ARCHIVE/RETIRE where proven** | reader/writer census + export/replay/recovery proof |
| `raw_gematria` | 9,748 dormant rows; last create June | **ABSORB_THEN_ARCHIVE** | promoted/current material reconstruction + no live reader/writer dependency |
| `gematria_wall` | 21,056 rows; still updated 28.9 | **NEEDS_ADJUDICATION** then freeze Legacy wall writer or map only to governed interest telemetry | owner decision + 2029 Calculator/Traffic replacement proof |
| `convergences` | 8,917 rows; generator stale but many DB/Raziel consumers remain | **KEEP_COMPATIBILITY until rewire**, then bounded archive/re-admission | consumer-by-consumer adapter migration; no bulk delete |
| `journey_seeds` | 805 rows; still consumed by Number Journey/Metatron | **ABSORB_THEN_ARCHIVE** as product authority | Research Context/Path replacement + replay parity |
| `research_candidates` / `insights` | small but still live consumers/workflows | **ABSORB_THEN_ARCHIVE** after Human-Gate workflow migration | pending/unique knowledge adjudicated |
| `discovery_events` | effectively dead/minimal | **RETIRE_REMOVE runtime / preserve required history** | final reader/writer check |
| `bot_health` | dormant historical watchdog store: 4,740 rows, last checked 2026-07-22; only old `fn_bot_watchdog` references it and the watchdog cron is disabled | **ARCHIVE_THEN_RETIRE candidate** | preserve/export needed history, verify no current System Intelligence/Control Plane dependency, then retire store/runtime |
| Legacy contributor presentation `contributor_content` | only a handful of rows; 2029 writer/research projections exist | **REVIEW_FOR_RETIREMENT** | contributor dossier/research projection parity |
| duplicate/unused indexes | measured candidate set, including ~19 MB duplicate Tanakh GIN pair | **RIGHT-SIZE** | current usage + query-plan proof + security/replay tests |
| missing covering indexes / RLS hot policies | measured advisor candidates on current canonical families | **RIGHT-SIZE** | workload evidence + security-equivalent policy/index migration |

### 8.3 Mandatory second scan as 2029 rises

Immediately before G4, rerun this matrix from live sources. Recalculate counts, current writers/readers, hot queries, RLS/index candidates, cron/workers, storage/dedupe/egress, telemetry parity, Raziel routing and retention blockers. Any item that became active again loses its retirement candidacy; any Legacy dependency that disappeared may move to archive/retire. The 28.9 values are never reused as future truth.

## 9. Live delta — 2026-09-29

This delta records decision-changing changes since the 28.9 scan. It is current-state evidence only; G3.5 must rescan again.

### 9.1 Changes that reduce future Legacy/island debt

- **Canonical TikTok link ingestion is LIVE:** PR #797 extends the existing `agent-upload`/video resolver path so a TikTok URL can be resolved and the MP4 written directly into the canonical media bucket under ticket/hash/MIME/host controls. Future 2029 source-video intake must use this owner path. Dropbox/manual-download or source-specific copy workarounds are compatibility only, not future media architecture.
- **Crawler server documents advanced:** Home/root and Legacy Number search-crawler routes now use the existing server-document path; video metadata guards remove raw MP4 hints from non-search crawler/social/AI metadata and avoid video-valued thumbnails. This advances route/runtime retirement but does not by itself prove lower DB/egress cost.
- **Research Sync retry storm closed live:** the application conflict code was changed away from SQLSTATE 40001 after a retry storm generated millions of PostgREST retries. Future G3 acceptance must classify business conflicts separately from transport/database retryable failures.
- **Legacy Home/Number fixes are explicitly temporary:** recent Home freshness/recent-gematria work and Number crash/error-telemetry fixes keep current production usable while 2029 rises; they do not become future semantic owners.

### 9.2 Still-open work that must remain visible

- **Media poster debt:** live audit identified 46 self-hosted videos (~638 MB source bytes in the PR #804 calibration) with missing/video-valued poster/thumb semantics. PR #804 is branch-only; do not claim poster closure until merge/deploy/backfill verification.
- **Storage egress is still WARN after the first crawler guard:** latest observed 29.9 11:00–12:00 UTC snapshot = ~85.6 MB Storage GET, ~97.7% classified bot bytes, with an MP4 burst across four distinct files. The earlier Applebot-specific deployment check showed zero MP4 fetches in its sampled 10-minute window, so the broader bot/media egress cause is **not closed**. Keep monitoring + poster/crawler investigation active.
- **Telemetry attribution caveat:** live canonical `events` had 3,640 rows in the checked prior 24h and **0** rows marked `is_bot=true`, while Storage/edge observation simultaneously showed bot-heavy media traffic. Therefore `events` is not a complete bot-egress attribution source; crawler/media attribution must consume provider/edge/storage logs under Traffic Intelligence and keep that evidence distinct from user semantic events.
- **Home 2029 Reality Gallery PR #789** and **Bentov Spatial Golden PR #808** are branch-only 2029 projections over existing owners. Final G3 compaction must either absorb/release them through their owner gates or archive them; branch-only prototypes must not remain ambiguous runtime pointers.
- **PR #809** is a test-only SEO parity drift fix. It is not runtime authority and should be reconciled/closed with the owning active branch.
- **ELS/CanonicalProgress recovery drift:** the 29.9 Claude current-main audit verified that CanonicalProgress and ElsMatrixProfileSwitch are absent from current main; historical PR #744 is far behind and #753 lineage has no merge base with current main. Recovery must be re-authored on current main in ordered slices, not raw-merged from stale branches. The same audit found `SOD1820_MASTER_OWNER_INDEX.md` still naming `els_research_layer_law v8` while live owner is v9; this is routing/documented-state drift to reconcile before G3 closure.
- Obvious superseded open PR candidates **#801**, **#805** and **#783** were closed on 29.9 after their surviving semantics were absorbed by merged #802/#803, #806/#807 and #784 respectively. Preserve Git provenance; do not reopen them as implementation authorities.
- G3.5 branch hygiene is **repository-wide**, not limited to the named examples: every still-open PR/branch must be classified against current main as RELEASE/REBASE/ABSORB/ARCHIVE/SUPERSEDED before G4; stale open work must not survive as accidental architecture authority.

### 9.3 Updated end-state implications

| 29.9 area | Current state | End-of-G3 target |
|---|---|---|
| TikTok/media ingress | canonical direct link ingest LIVE | KEEP_CURRENT; retire/manual-source transport workarounds after consumer proof |
| Search crawler server docs | expanded LIVE | KEEP_CURRENT; remeasure DB reads/egress and retire SPA crawler compatibility where safe |
| Video crawler/social metadata | raw-MP4 hints reduced LIVE | KEEP_CURRENT; verify no indexing regression and continue bot-egress attribution |
| Video posters | PR #804 branch-only | RELEASE/VERIFY existing poster pipeline before retiring original/video-valued fallback |
| Research Sync conflict/retry | hotfix LIVE | preserve semantic conflict behavior; add retry-storm regression/monitoring |
| Legacy Home/Number hotfixes | LIVE temporary compatibility | retire with native 2029 Home/Number acceptance, preserve provenance only |
| 2029 Reality/Spatial previews | branch-only PR #789/#808 | reconcile through canonical projection owners or archive |
| superseded PR clutter | multiple open stale PRs | close/archive from active routing before G4 |
