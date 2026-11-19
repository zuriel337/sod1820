# Egress 24-hour window correction — Work acceptance handoff

Actor: GPT / Codex. Recipient: ZURIEL. Task: `EGRESS_24H_WINDOW_P0_20261119`.
Original base: `2fc4fe88285588c199e972750f79be5700f8fee6`. Current main integrated: `e1323097154a0365f9f50e57af59770e13840a5f`. Branch: `gpt/egress-24h-window-20261119`.
Status: branch proposal only; no merge, deployment, migration application or shared database write.

## Evidence and scope

Work's passive handoff `bfdef647-e1f9-4e7f-af62-4be8a52a082a` (task `BOT_INTELLIGENCE_COVERAGE_AUDIT_20261119`) was read directly. It identifies a 20/24-hour display as P0 on the same main revision. The supplied conversation and ledger summary are the received audit evidence; the linked personal Library report was not independently opened with this session's file tools. The affected live function definitions and hourly cache aggregates were independently inspected read-only. Active `traffic_intelligence_law` is v11.

Both `admin_system_health` and `fn_health_watch` select the day and freshness by `computed_at`. The UI labels their unqualified sum “24 hours”. The producer already emits UTC `window_start`/`window_end`. Its coverage summary describes its own snapshot and is not a substitute for recomputing the reader's current window.

The committed sanitized replay covers `[2026-11-18T19:00Z, 2026-11-19T19:00Z)`: 20 distinct hours, 675,604,227 bytes. Work's exact 675,947,131-byte result was independently reproduced for the preceding window `[2026-11-18T18:00Z, 2026-11-19T18:00Z)`, also 20/24 hours. The sums differ because the endpoints are one hour apart. No gateway/CDN bytes are included or added to Storage observations.

## Reader behavior

- One internal SQL projection, reused by the two existing readers, reads `analytics_cache`. No collector, store, cron, provider integration or event classification is added.
- The target is the 24 **completed UTC hours** ending at the start of the current UTC hour. A row must match both bounds of one exact hour. Incomplete, future, invalid, overlapping/multi-hour and out-of-window intervals cannot enter the sum. The canonical producer's ISO UTC format is preserved; parsing is guarded by format and PostgreSQL `pg_input_is_valid`, then both bounds are validated against the canonical hour. PostgreSQL 17.6 and the validator's presence were verified read-only on the live database.
- For duplicate windows, the newest written revision wins, with cache key as a deterministic tie-breaker. `computed_at` chooses a revision only; it does not select the day, order observation history or determine freshness. A newer invalid byte measurement does not fall back silently to an older valid revision.
- Only non-invalidated v11 `OBSERVED_STORAGE_LOGS` rows enter. Valid nonnegative integer bytes, including zero, count as observed. Missing/invalid bytes and explicitly unavailable sources are not zero. A row reporting missing response lengths prevents COMPLETE even when all 24 hours have rows.
- `storage_egress_observed_24h_coverage` exposes bounds, observed/required/missing/partial hours and missing windows. Status is COMPLETE, PARTIAL or NO_DATA. The old `storage_egress_observed_24h_bytes` is populated only for a complete window; the separately named `storage_egress_observed_24h_observed_bytes` carries the measured subtotal, or null when nothing is measured.
- The existing card displays the observed subtotal with explicit `20/24` and PARTIAL, or a complete 24-hour sum. Without coverage metadata (including an older server), it shows UNKNOWN and no unqualified day sum; the timestamp is labelled `מועד כתיבת המדידה`, because that server returns `computed_at`. History remains limited to the target window. The last valid measurement is selected independently across all retained completed observations, including older ones. Its end determines sensor age; a 30-hour outage yields `0/24 · NO_DATA` coverage and a `STALE` sensor. A never-observed sensor yields NO_HOURLY_DATA rather than OK.
- Existing WARN/CRITICAL byte thresholds, bot-share rule, alert deduplication and delivery path remain. A partial lower bound can still exceed a threshold; its alert names the measured coverage. A low partial subtotal yields PARTIAL, not OK. Unknown bot share cannot suppress an otherwise proven byte-threshold alert. Provider Cached Egress stays UNKNOWN and independent.

## SQL preparation and release boundary

`20261119220000_egress_24h_window.sql` checks exact live reader body hashes, applies narrow replacements, and refuses reapplication or source drift. Existing DEFINER/auth/ACL boundaries and non-egress watcher hooks are preserved. The shared helper is INVOKER and unavailable to PUBLIC/anon/authenticated/service_role directly; existing privileged readers invoke it under their unchanged owner.

`ROLLBACK_20261119220000_egress_24h_window.sql` accepts only the exact resulting bodies/helper, restores the two previous bodies and removes the helper. The reviewed original definitions are captured in the local-only SQL fixture and verified by body MD5. Neither file has been applied to a shared database. After Work acceptance and separate release authorization, apply the reviewed SQL before releasing the UI; the UI safely treats an older server as coverage UNKNOWN.

## Validation

- Actual PostgreSQL fixture: 55 explicit assertions including the live aggregate replay, 30-hour silence, six-hour reminder cadence and the same stale-alert probe before migration, after migration and after rollback; applied both readers, malformed/missing data, UTC boundaries/DST, delayed writes, duplicate revisions/ties, zero vs unknown, unchanged alert thresholds/deduplication, denied helper access, and exact rollback. Reapplication and rollback-before-application are rejected.
- Mounted actual control page plus the existing producer contract: 14/14 tests pass, including partial/complete/empty/older-server displays, `0/24 · NO_DATA` with a stale last observation, and unchanged account/refresh boundaries.
- Workflow references/wiring/check-name tests: 20/20; `scripts/test-2029-control-plane.mjs`, actionlint and whitespace checks pass.
- Pinned Node 24.21.0, `npm run build` after the Work correction and current-main integration: PASS. Shell budget: 18/18 eager files; eager gzip 203,455/203,493 bytes, frame JS 47,077/47,338, frame CSS 34,338/34,362. No baseline or dependency/lockfile change. The earlier Work claim of an 18/17 failure is not reproduced with the committed baseline on this revision.
- Read-only `EXPLAIN ANALYZE` after the Work correction (no SQL function installed): 9.850 ms execution, one scan of 416 cache rows, 59 eligible hourly rows, 24 generated target slots, no temporary I/O. This is one bounded observation, not a latency guarantee or a controlled before/after comparison. The control page remains a deferred admin route; no public entry import, new polling or extra client RPC is added.
- The existing Speed Centre SQL workflow now runs this fixture in a fresh local database; the mounted card tests already run in Live Contracts. Exact-head CI results belong in the PR delivery, not an inferred PASS here.

## Work acceptance

Work reviewed `b10158520` and identified that selecting the latest measurement from only the day suppressed `sensor_stale` after 24 hours. That defect also existed in `cdb0007e`; its green CI did not cover this case. The follow-up separates last-valid measurement selection from day aggregation and preserves the existing two-hour stale threshold and six-hour reminder interval. The isolated reproduction now records one stale alert before migration, one after migration and one after rollback. Additional checks prove no duplicate within six hours, a new reminder after six hours, a recently written old observation stays stale, malformed/unavailable/future rows cannot refresh it, and a fresh measured zero clears staleness.

Review the two SQL reader replacements and the mounted card against the fixed replay and independent missing-hour/duplicate/time-boundary fixtures. Verify the UI before/after the SQL contract, unchanged provider UNKNOWN, existing access denial, threshold preservation, migration source guards and exact rollback. Confirm exact-head CI and build budgets. This scope excludes Edge/Range series, WAF, bot attribution, billing estimation and alert-channel delivery auditing.

No passive work-log write is claimed: the connected database tool is read-only. This document and the PR are the handoff to ZURIEL for Work's independent acceptance. PR #1429 remains separate and on hold.
