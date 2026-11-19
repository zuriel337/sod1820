# ELS tracking audit — 19 November 2026

Read-only investigation requested by ZURIEL. Code base and live Vercel source: `fefc39e95ea7a8a99d6d143476037d57581709ae`. Live alias `www.sod1820.co.il` resolves to READY deployment `dpl_FQz4BLa6Wxt4M2rmXdVzteY9fw1G`; that deployment was performed outside this session. Local UI corrections are not in that deployment.

Owner: live `traffic_intelligence_law` v11. Do not create a parallel collector/store or infer complete visitor coverage.

## What is implemented

- `src/App2029.jsx`: canonical public hosts, non-admin/auth-ready page views and page engagement; waits for readable content. GA/Meta are separate optional channels. Preview/admin exclusions are intentional, not proof of missing public visits.
- `src/lib/measurement2029.js`: occurrence-time visitor/session/account-boundary snapshot and POST to existing `ingest_event`. Failed sends resolve false; callers do not retry or persist an unsent queue. Server alone derives account identity.
- `TzofenEmbed.jsx`: engine `search` message -> `track('els', ..., search/cross_search, {kind,skip,scope,uid})`. Public projection only admits kind/scope/skip, omitting term and uid. Engine `logSearch` call sites cover regular, simple crossed and forms; this is not an action/outcome event for every native control.
- `publicReadingTelemetry2029.js`: ELS action allowlist contains only `search`, `cross_search`. Live SQL function metadata confirms this same bounded ELS family in `ingest_event`; no live writes were performed.
- `public-reading-deploy/transport.js`: action budget 60 events per window per 10 minutes, engagement budget separately bounded. This intentionally cannot measure arbitrary unlimited clicks.
- Share uses the existing shared family. ResearchProvider add/save telemetry is disabled in the public build; local workspace event-bus notifications are not Traffic events.

## Gaps

No dedicated end-to-end ELS analytics family found for Classic/Research toggle, opening/closing Discovery/findings/results/save, changing tabs/filters/sort, choosing a finding, row-gap/window/zoom/fullscreen changes, local discovery start/partial/cancel/failure/complete, or Fable lifecycle. Fable's operational/session tracking is not an analytics click trail. Generic search events do not establish successful results or completion.

No claim of 100% visitor coverage: browser/network restrictions, auth timing, route cancellation, intentional admin/preview/bot exclusions, budgets and failed fire-and-forget sends can prevent collection. Public-safe telemetry deliberately excludes private search expressions.

## Evidence and limits

39 local tests passed across public action measurement, transport hardening, page-view deduplication and identity. These use fixtures and are NOT proof that a real visitor event reached storage or appeared in a dashboard.

The authorized canonical aggregate read `fn_ti_surface_activity(2026-11-12,2026-11-20)` failed with permission denied. In accordance with the owner, no raw events/visitor rows were queried as a workaround. Stored counts and end-to-end live readback remain UNVERIFIED. SQL metadata inspection does not close that gap.

## Proposed next slice (not implemented)

Extend the existing ELS action family with stable semantic action IDs and bounded mode/source/outcome fields, not raw DOM text or search expressions. Distinguish request, start, terminal outcome, cancellation requested/confirmed and partial results. Use current identity/session boundaries. Review client, service-worker admission and server allowlist together; changes to the server or collection limits require explicit approval. Add mocked browser coverage proving one event per intended action, failure/deduplication and account switching. Close live end-to-end acceptance through an authorized canonical readback of a labeled test session, without polluting public traffic figures or bypassing exclusions.

No analytics code, limits, SQL, credentials, flags or deployments changed in this audit.
