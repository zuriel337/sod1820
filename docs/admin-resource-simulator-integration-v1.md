# Admin Control Center + resource simulator integration v1

Status: BRANCH IMPLEMENTATION / DRAFT REVIEW. No main merge, production deployment, DB apply, purge, notification send or configuration change is performed by this branch.

## Location and access

The implementation is part of `zuriel337/sod1820`, on branch `codex/admin-resource-simulator-20261004`, PR #908. It runs in the existing `/2029/control` route and existing 2029 frame. Vercel creates a private branch preview; the project already has Vercel Authentication for `all_except_custom_domains`. The site still requires its existing administrator account and every operational RPC retains its existing server authorization. Anonymous users receive a login explanation; authenticated non-admins retain the existing redirect. No auth bypass or new role is introduced.

Stable branch preview: https://sod1820-git-codex-admin-resource-simu-c3d509-sod1820-s-projects.vercel.app/2029/control

The original standalone lab remains separately hosted by ChatGPT Sites. This branch integrates its model natively into SOD1820; it does not embed an iframe or move the production website. Original version-1 scenario JSON imports remain supported. Vercel and Sites have different origins, so browser-local state transfers through JSON export/import.

## Five implemented additions

1. **Decisions and attention.** One bounded projection of the existing `admin_attention_feed_v1(false,100)`, pending system suggestions (80), Command Center recommendations (20), owner counters and operational failures. Source identities remain distinct; handled feed entries are excluded. Search, category filters, age/priority ordering and source evidence are interactive. Counts are not added across overlapping queues. Existing owner screens remain the decision path through validated `/admin?tab=...` links. Legacy suggestion decisions now retain a row and show an error when the existing RPC fails rather than claiming success.
2. **Source and freshness.** Every metric card exposes its RPC, basis, measurement time where supplied and retrieval time. Older-than-60-minute data is visually stale, not automatically refreshed. RPCs settle independently with separate errors and retry controls. A failed source does not erase unrelated sources or become an empty queue/zero. Per-source requests are deduplicated; data is read on demand for the active tab, and stale responses after auth changes/unmount are ignored.
3. **Media pipeline.** Existing migration-queue status counts, asset mapping, enrichment pending/retry-STT, indexability, missing thumbnails, large files, duplicate candidates, media crons and matching operational traces are projected together. Stages are explicitly parallel aggregates, not a cohort funnel or per-asset timeline. Video enrichment costs retain `ESTIMATED_FROM_API_PRICING`; unavailable per-stage download/storage costs remain unknown. TikTok automation is not connected.
4. **Cleanup before/after.** Existing `admin_retention_preview()` remains the policy owner. Only explicitly allowed candidates with known counts, protected-row boundaries and zero unknown dependencies can be selected for a planning projection. The UI shows per-table before/after rows and blockers. Bytes per row, monthly billing average, quota and rate must be supplied as planning assumptions; row counts never manufacture bytes. Logical freed bytes do not promise physical disk reclamation. Estimated data/log cost uses the same lab pricing function and shared quota. This is not a DB-compute invoice mapping. Planning JSON can be exported; no purge action exists here.
5. **Budget and alerts.** The original browser-local scenario state owns the monthly incremental budget and a version-1-compatible warning threshold (80% example). The budget view derives warning/critical months and viral-load comparisons (1–100 times uploads) from the same simulation model and recomputes quotas. Planning alerts are on-screen only. Existing egress guard state and read-only notification channel enabled states are shown separately; recipient addresses are dropped before the new UI. No notification settings, schedule or dispatch are changed.

The original simulator retains workload, retention, cache/traffic, processing, quotas/rates, 12–24-month forecasts, sensitivity, up to eight named scenarios and JSON export/import. Simulator, media, attention and cleanup views load lazily. All new UI uses existing shared semantic CSS variables, with responsive tables/cards and keyboard tab navigation. View URLs survive reload; the Control Plane stays excluded from product analytics and noindex.

## Measured stock is not monthly billing

- `media.storage.total_bytes` is current file stock, decimal GB. An explicit action may use it as a monthly-average planning assumption; source/time and `snapshot_assumption` classification survive saves and JSON.
- `db.database_bytes` is separately displayed database stock. It never enters file storage quotas or automatically seeds cleanup billing assumptions.
- Observed 24-hour storage traffic is not multiplied into a provider invoice or automatically divided between cached/uncached pools.
- Current provider cached-egress retains its basis and stays unknown when missing. Historical billing never substitutes for the current cycle.
- Partial trace lists, owner counters, parallel media stocks and candidate duplicate groups are not inferred to be complete or mutually exclusive.
- Reference tariffs are static sources last checked 2026-10-04. Account plans, included quotas, provider usage and physical cleanup gains are not verified by local tests.

## Verification

Required checks: 18 pure-model/integration tests; 13 Control Center projection/planning tests; native Control Plane, isolation, canonical contract wiring, system frame and built-graph checks; both legacy and 2029 production builds; diff whitespace check. New tests are included in the existing 2029 isolation workflow. Unified video acceptance also verifies the canonical zero-token policy and the null-aware rendering of the actual RPC field; a missing measurement must not display a hard-coded zero.

Browser visual/interaction verification of authenticated admin views remains unclaimed until actually exercised. Protected-preview HTTP and READY metadata verify delivery, not authenticated RPC completeness. No live provider/DB result is inferred from repository code or fixture tests.

## Remaining recommendation

Release readiness and drift (branch / merged / deployed / live / verified) is still a recommendation, not implemented by this slice. It must reuse existing release and work-log evidence rather than treating main or a preview deployment as production verification.
