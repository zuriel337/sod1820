# Number 2029 performance — PR #1077

Evidence for the bounded performance change on 2026-10-13, relative to PR head
`c72590ca276ef759661956b0d5eae3ac5c48f934`. This is an implementation/test record,
not a new owner, performance service-level agreement, or release authorization.

## Result

The canonical Number core now appears before graph, research, topic and media
hydration finishes. Methods and verified crossings become usable independently;
unknown coverage stays explicitly pending or unavailable. Full depth still loads.

| Scenario | Number core before → after | Methods before → after | Verified crossing before → after | Full projection after |
| --- | --- | --- | --- | --- |
| 1820, desktop | 6.63–8.73 → 2.25 s | 7.54–9.55 → 5.23 s | 8.09–10.08 → 5.82 s | 6.09 s |
| 1820, simulated mobile | 10.28 → 5.21 s | 11.73 → 8.82 s | 12.36 → 9.84 s | 9.42 s |
| 376, desktop, explicit שלום/רגיל | 5.07–5.45 → 2.15 s | 5.07–5.45 → 2.47 s | 5.07–5.45 → 3.06 s | 5.42 s |
| 376, desktop reload | 4.45 → 1.43 s | 4.45 → 1.85 s | 4.45 → 2.54 s | 4.74 s |
| 376, simulated mobile, explicit שלום/רגיל | 8.30 → 4.60 s | 8.30 → 5.01 s | 8.30 → 5.61 s | 7.91 s |

Before the change, core visibility required the complete projection, so the old
core column also describes its completion. The improvement is primarily earlier
useful content, not a proportional reduction in total data loading. Full 376
desktop completion did not materially improve in these samples.

Actual API requests, excluding OPTIONS/preflight, fell from **83 to 80** for 1820
and **57 to 54** for 376. Both exhaustive samples use one canonical number lookup
instead of two; duplicate numeric research term/relation queries are removed.

Internal navigation from 376 to uncached 1820 reached stable core in 1.12 s
(previously 5.69 s). Back/forward to cached roots remained within 0.27 s; methods
and crossing took 0.71–0.75 s. Back to 376 used six API requests instead of 69,
avoiding the previous transient-root research fan-out. Internal navigation uses
a 250 ms settling guard before accepting the destination root as stable.

## Implementation boundaries

- Extend the existing `fetchEntityHubProjection` reader with an optional core
  callback. Its final result and the complete-result contract of other consumers
  are preserved. Media and independent Number research can hydrate concurrently.
- Share RPC promises only within one projection request. A paged lookup feeds
  families only when the server confirms the complete population; otherwise use
  the existing full lookup. Preserve the legacy overload fallback.
- Keep the existing bounded Number cache. Subscribers returning via back/forward
  receive in-flight core updates. URL focus changes do not restart root hydration.
  Isolate transient state by root to avoid fetching research for the previous root.
- Preserve loaded core content when depth fails, with unavailable counts instead
  of synthetic zeros. Crossing focus still requires the existing verified reader.
- No calculation engine, registry, RLS, data, shared menu, route or CSS changes.

## Measurement conditions and limits

- Local production builds against real public canonical Supabase data, anonymous
  Chromium, no API data or image mocks in performance measurements. Browser writes
  and analytics were blocked. HTTP cache disabled by Playwright routing; in-memory
  application caching remains enabled for internal navigation.
- Desktop 1440×1000. Mobile 390×844, 4× CPU slowdown, 1.6 Mbps down, 750 Kbps up,
  150 ms latency. Network passes through the execution environment's HTTPS proxy.
- DOM observers distinguish core, enabled methods, verified crossing and complete
  projection. Final request collection waits for depth completion plus four seconds;
  baseline collection ended four seconds after methods were available. Neither
  window claims lifetime request counts or all optional scroll-triggered material.
- Final table: one sample per scenario; baseline desktop ranges contain two or
  three samples. Intermediate runs showed backend/proxy variability. These are lab
  observations, not field percentiles, an INP result or a production guarantee.
- Mobile still spends about three seconds downloading the approximately 366 KB
  compressed main bundle. Shared bundle work remains outside this Number change.
- The protected Vercel preview inspected before this change pointed to old commit
  `3e0a2466`, not the tested PR head. No hosted-preview/CDN speed result is claimed.
- Raw runs, screenshots and the measurement script are retained in the execution
  workspace at `/workspace/number-performance-1077/`; `final/` contains the table's
  final-build measurements. Earlier `optimized*` directories are intermediate
  implementations, not acceptance results for this commit.

## Verification and handoff

- Node: 89 tests passed across Number opening, progressive reader, complete
  projection, numeric research, topic source, gallery envelope and live-glass suites.
- Both site builds passed. Existing bundle-size/dynamic-import warnings remain.
- Browser: 8 tests passed, including stalled depth, depth failure, zero/invalid input,
  verified crossing reload, menu entry, responsive layout and in-flight back/forward.
  It uses real public RPC reads, synthetic access flags and the existing storage
  egress guard; injected stalls/failures are explicit test scenarios.
- Final performance runs had no page JavaScript errors. Observed mobile CLS was
  approximately 0.04 for 1820; existing mobile typography was not redesigned.
- Actor: GPT. Task key: `NUMBER_2029_PERFORMANCE_20261013`.
  Owners: existing Experience and Research Strategy/entity projection owners.
  Scope: Number loading and bounded shared-reader reuse, PR #1077.
- Status: PLANNED / IMPLEMENTED / TESTED / PR_READY. MERGED / LIVE: no.
- Branch: `gpt/number-2029-owned-g4-20261013`, stacked on #1069.
  Merge/production status: not merged or deployed by this task.
- Existing shared-owner public-route/access blockers and visual approval recorded
  in PR #1077 remain release requirements. Handoff destination: existing Number/G4
  owner for review; no work-log write or external agent delivery is claimed.
