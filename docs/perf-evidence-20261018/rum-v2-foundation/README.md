# 2029 RUM v2 foundation

Date: 2026-10-18
Branch: `gpt/perf-rum-v2-20261018`
Exact base: `gpt/perf-unified-candidate-20261018@8f78c0c7ced835849a816a815abf05a7247ceead`

This change repairs measurement semantics. It does not claim a product speed improvement.

## Boundary

- The only persistence path remains `public.ingest_event -> public.events` with `surface=performance` and `event_type=web_vital`.
- No analytics table, store, flag, product surface, Legacy route, live database object, deployment, or production setting was changed.
- Observation begins in `main2029.jsx` before React renders, stays memory-only while `fx_analytics` is unresolved, and initializes identity only when an authorized production event is transmitted.
- Non-canonical hosts, including Vercel Preview, dispose the collector without an identity read or telemetry write.
- The repository migration updates only the existing admin projection. It was created locally and was not applied.

## Event contract

Every v2 envelope carries `build_sha`, `deploy_env`, `route`, `route_instance_id`, `nav_kind`, `device_class`, and `sample_id` in `props`.

- A hard document load uses `measurement_scope=hard_load_cwv_and_usable`. Its final event contains the document CWV snapshot and the observed usable-content time.
- An SPA transition uses `measurement_scope=spa_navigation_usable_only`. It carries route usability and never publishes `lcp_ms`, `cls`, `inp_ms`, `fcp_ms`, or `ttfb_ms` as destination-route CWV.
- A final row and a checkpoint share one `sample_id`. The admin projection ranks `phase=final` before ingestion time, so a checkpoint that arrives later cannot replace the final row.
- `traffic_hint` is one of `human_like`, `suspected`, or `unknown`. The hint does not alter product access. Suspected automation preserves the canonical `p_is_bot=true` signal, so the existing ingest owner rejects its telemetry row; crawler volume remains owned by the existing edge traffic evidence.
- Old v1 rows remain readable. Their unavailable build dimension is explicitly reported as `unknown`, and their existing top-level device value remains the fallback.

## Usable-content truth

The detector rejects skeletons, busy/hidden nodes, unavailable notices, and empty structural shells. Home requires a visible real post title and destination. World requires an admitted story and action. Post requires the matching slug, title, and real source body. Number requires its matching root and `data-number-depth=ready`; the bounded empty state for zero is accepted as real content. Other 2029 routes require a rendered surface, title, and an action or substantial content.

## Verification

Passed locally:

- `node scripts/test-web-vitals-2029.mjs`
- `node --test test/web-vitals-2029-v2.test.mjs`
- `node --test test/web-vitals-2029-v2.browser.test.mjs` — Chromium, loopback-only harness; no remote service calls
- `node --test scripts/test-2029-bundle-budget.mjs test/runtime-switches-2029.test.mjs test/bot-read-no-side-effect.test.mjs test/bot-read-sink-guard.test.mjs`
- `node scripts/test-2029-system-frame.mjs`
- `npm run build` — Legacy and 2029 builds
- Ephemeral PGlite schema fixture: the repository migration created and executed `admin_2029_analytics`; a checkpoint ingested after its matching final did not replace it (`LCP 1000`, not the checkpoint's `9000`), and the SPA sample appeared only in the navigation projection

The browser test proves early memory-only capture, Preview zero writes and zero identity reads, final-over-checkpoint behavior, the v2 dimensions, hard-load versus SPA metric separation, and usable-content decisions for Home, World, Post, and Number fixtures.

The same bundle-budget tool on the exact base and this working tree reported a 2029 static entry graph of 183.4 KB gzip before and 186.5 KB gzip after (`+3.1 KB gzip`). The Home, World, and Post route increments were unchanged. This is a bundle-cost measurement only, not a load-time or speed claim.

## Release dependency

The application emits v2 rows while the live v1 admin projection reads only v1 rows. A future authorized release must review and apply `20261018021029_g3_2029_web_vitals_acceptance_rum_v2.sql` before or together with the application build, then verify the admin RPC as an authenticated administrator. Preview cannot supply RUM evidence because Preview writes are intentionally zero; hosted candidate acceptance remains a separate lab/browser check.
