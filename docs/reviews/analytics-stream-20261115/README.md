# GA4: duplicate navigation and remaining measurement work

15 November 2026. Preparation only; no Google settings, product data, deployments or permissions changed.
Owner read live: `traffic_intelligence_law` v11. Base application: merged #1345, `3843af126f21ae58cf033fe808eaa2821b7a3362`; that application has not yet been deployed. The earlier #1321 audit is provenance, not proof of the current state.

## Newly reproduced, not inferred

The public SDK for the site's actual stream (`G-V3H3E20FLY`) was downloaded by GET. Its configuration still enables history events. The actual current `analytics.js` was compiled into an isolated page with three synthetic navigations. Every browser request was answered locally; neither Google nor the product database received an audit event. The SDK itself is third-party code, kept outside the repository; its exact SHA-256 and byte count are in `capture-results.json`.

| Case | Application commands | SDK page views | Meaning |
|---|---:|---:|---|
| Current public stream settings | 3 | **5** | Each of the two internal navigations gets an extra automatic page view. |
| Local simulation: only history events disabled | 3 | **3** | All three genuine page views remain; duplicate navigation events disappear. |

The current stream's extra events still use `SOD1820`, while the three manual events use `Audit alpha`, `Audit beta`, `Audit search`. The extra search-page view carries `?q=synthetic-audit-query`. The manual campaign event reaches the local capture with `cs=fixture`, `cm=email`, `cn=synthetic`. This confirms SDK encoding of the new manual campaign fields, **not** Google ingestion or report attribution.

The automatic `scroll` event still uses the initial template path/title in both cases. Fixing manual page views does not fix every automatic event. No `view_search_results` event was observed in this capture, despite the SDK containing `q,s,search,query,keyword` configuration. The earlier audit did see that event; this narrower result neither disproves it nor claims it fixed.

An initial 1.8-second capture undercounted buffered events. It failed its control (only one of three manual events observed). The final capture waits six seconds per navigation and flushes on page exit; its controls require exactly 5/3 SDK views and exactly three manual commands in both cases. This is an observation window in a diagnostic harness, not a changed product timer, performance budget or CI threshold.

## Prepared Google setting change — approval pending

Recommended after verifying the deployed manual page-view path:

1. In Google Analytics, select the correct property by web stream measurement ID **G-V3H3E20FLY**, not by a guessed property name.
2. Admin → Data collection and modification → Data streams → the site's web stream → Enhanced measurement settings → Page views → advanced settings.
3. Save a before screenshot. Turn off only **Page changes based on browser history events**. Leave Page loads and the other measurements unchanged in this step. The application already uses `send_page_view:false` and sends one explicit event per real route.
4. Save and reopen the settings. Download a fresh public SDK, wait for configuration propagation if needed, and confirm `vtp_enableHistoryEvents:false`. Do not mistake the local simulation file for a live change.
5. Repeat the capture against the new configuration, then verify actual normal navigation with DebugView/Realtime in the property. Confirm distinct titles/paths, campaign fields and one page view per navigation. Account for processing delay in standard reports.
6. Record the exact configuration change time for future comparisons. Preserve historical rows; do not halve old counts or silently backfill corrected figures.

Rollback: restore only that recorded history-events setting and record the time. No release, database rewrite or new tracking system is necessary for this setting change.

The property interface is not available in the current tool connection. No setting was saved, and no GA4/GSC report was read. The recommendation is backed by a local SDK simulation, not an already-completed configuration change.

## Continue the user's approved measurement model

The user already approved browser identity for guests, account identity after login, pages and arrival sources, with detailed administrator reporting. Do not ask for that policy again. Implementation must reuse existing owners and distinguish Browser Visitor, Session and Person; an unidentified guest is not a named person.

| Existing part | Verified source | Next concrete work |
|---|---|---|
| Browser identity | `visitorId.js`, existing `sod_vid`; `visits.js` consumes it | Retain the same ID and history. No second cookie/visitor generator. |
| Session/person linkage | `identity.js` and existing identity graph | Reuse the 30-minute session semantics and authenticated link. Verify logout/account-switch isolation; never trust a client-supplied account ID as authorization. |
| First-party events | `events.js`, `publicReadingTelemetry2029.js` | The public path explicitly sends null session/identity today; the worker validates that shape. Change producer, validator, transport and existing ingestion together in a separate reviewed implementation, with returning guest/login/logout controls. Merely calling the old full `emit` branch is not a complete fix. |
| GA manual page identity/campaign | merged #1345 | Publish the approved code through its prepared release request, then verify Google-side ingestion. |
| GA automatic navigation | this capture | Apply the narrow setting above after approval. Keep separate from full identity implementation. |
| Automatic scroll/search labels | actual SDK capture | Determine which measured event fields should inherit current page identity; prepare against the real SDK. Do not declare these fixed by manual page views. |
| GA-to-database synchronization | existing `ga-sync-server`, `ingest_ga_daily`, `ingest_ga_country_daily` | Reconcile deployed function/config and restore a bounded run using existing storage. Current handler always writes after fetching reports; a read-only preview should be prepared before running it. Do not invoke it as an audit. |
| Canonical Traffic reports | `fn_ti_*` family per v11 | Read through the governed interfaces. The read-only connector denied execution of `fn_ti_summary`; no broader credential or raw-events fallback was used to bypass this. Current canonical counts remain unverified in this task. |
| Public activity data | user's prior decision: show exact fields before publication | Present proposed aggregate names, windows and source columns before exposing them. No public audience/account detail was added here. |

Read-only cron inventory on 15 November: `gsc-daily-sync` is active (`17 5 * * *`), `traffic-daily-refresh` is active (`25 * * * *`); no GA-named sync job was found. This is evidence of the scheduler inventory only, not proof that the GSC jobs succeed or that an externally scheduled GA sync does not exist. No secret values were read.

`ga-sync-server` is deployed and ACTIVE at v2, `verify_jwt=false`. Its one `index.ts` is byte-identical to current main, SHA-256 `c0d490b82dd1bd7c552449834600d52e940ea5e862bd2fc02e9138ebf242f94e`. It authenticates with its existing server sync key; it was not invoked. A dry-run preparation is assigned separately to Codex, not included in this evidence package.

## Reproduction

Fetch only the public script `https://www.googletagmanager.com/gtag/js?id=G-V3H3E20FLY` into a local file. Then, from the repository root with its existing Playwright tooling installed:

```sh
CHROMIUM_PATH=/usr/bin/chromium node docs/reviews/analytics-stream-20261115/capture.mjs /absolute/gtag-public.js /absolute/capture-results.json
```

The harness intentionally stops if the public configuration has changed. It never calls `route.continue()` or `route.fetch()` and blocks service workers. It does not reproduce the whole React application, user login, mobile Safari, Google ingestion or dashboards. This diagnostic is not wired into CI: external SDK settings change independently of the repository.
