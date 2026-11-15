# GA4: duplicate navigation and remaining measurement work

15 November 2026. This document's SDK capture is offline evidence; no Google setting is changed by it.
Owner re-read live: `traffic_intelligence_law` v11. Capture base application: #1345, `3843af126f21ae58cf033fe808eaa2821b7a3362`. That application is now live through #1355 at `fec22ca072ce48114beab161988620d47b7392b8`, with bounded live verification of current-title manual views and one view per internal navigation. This does not verify Google's ingestion or remove the stream's automatic duplicate events. The earlier #1321 audit remains provenance.

## Follow-up after the Google setting change, 15 November

The user supplied a browser-agent report: Cloud project `sod1820-gsc` / `605729730420` now has Analytics Data API enabled (~12:08 UTC); stream `G-V3H3E20FLY` / `15073034581` has only history-based Page changes disabled, saved and reopened at 12:10:25 UTC (14:10:25 Asia/Jerusalem). These UI actions are user-supplied evidence; Codex did not operate the Google UI.

Independent evidence after that report:

- Fresh main is `c752b0014a1ba288e314be9fad66a6af6f52e2cc`; the production alias is still `dpl_CLXTnXF5de1PN1STtajXghtnhyVU`.
- The downloaded public SDK is 534,832 bytes, SHA-256 `e5566377d7ef5513bc3669ac41d1c8fbe735ad19c7f119c493d8ae4c6fcc2c93`. A fresh response at 12:19:53 UTC has the same hash. **It still contains `vtp_enableHistoryEvents:true`, but actual execution now produces three page views for three navigations.** The presence of that literal alone does not prove active history tracking. The old comparison harness correctly stopped at its old expectation of five views. It remains available as historical reproduction; the new `verify-current` mode tests actual current behavior without altering the SDK.
- Two ordinary navigations on the live site emitted exactly two `page_view` requests, each with the current public title and full canonical path, matching the two posts in the user's report. Captured fields exclude visitor/session identifiers. This verifies requests leaving the browser, not GA ingestion or all page families. Realtime's seven generic-title views were not individually traced.
- The current code and current SDK still reproduce an automatic `scroll` with `SOD1820` and `/post/:item`. The three manual page views are correctly labeled. A scroll is not an additional page view.

### Prepared code correction (branch only)

`analytics.js` now updates the existing Google tag's default page context with the **same admitted/sanitized identity** used by the manual view. `config` remains a one-time call with `send_page_view:false`; page defaults use the documented `gtag('set', ...)` command. Repeating `config` did not update actual SDK context, so that attempt was discarded after the browser control failed. Campaign fields remain per-event and are not retained as default context for later pages. On a slow next route, defaults reset immediately to the safe family fallback so automatic events cannot inherit the previous article. Pending-route cancellation, the bounded unresolved-page fallback and expression redaction remain intact.

The live dataLayer contained only the GA destination, no Google Ads destination. `set` is a shared-tag default, not a destination-specific override; any additional gtag destination configured later will inherit these safe page defaults unless it supplies its own override. No marketing configuration, conversion event or Google setting is changed by this patch.

The current SDK ran unchanged with all browser requests fulfilled locally: exactly three manual commands / three transported views, correct inherited context on all three synthetic routes, and a correctly labeled automatic scroll. The unchanged main code fails these new context assertions. `after-ui-context-results.json` holds the before/after captures and the bounded live-browser evidence. The SDK itself stays outside Git. Fifty-nine focused tests pass; the three new cases are in the already-wired analytics test file. This is prepared code, **not a claim of a deployed scroll fix**.

Reproduce current settings and default-context verification:

```sh
CHROMIUM_PATH=/usr/bin/chromium node docs/reviews/analytics-stream-20261115/capture.mjs /absolute/current-public-gtag.js /absolute/results.json verify-current
```

The earlier sections below describe the preparation before the user changed Google settings. For the sync attempt after enabling the API, see [the synchronization follow-up](../ga-sync-preview-20261115/README.md#operation-follow-up-15-november).

Continuation: this evidence package is integrated into #1346 with #1348, retaining their separate operational boundaries. The Cloud environment advertises desktop capability, but no desktop/browser interaction tool is callable in this session; no signed-in GA page or setting has been read or changed. No credential workaround is attempted.

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
