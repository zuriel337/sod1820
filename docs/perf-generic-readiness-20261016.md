# Shared Home readiness — measured-content correction, 16 October 2026

Status: IMPLEMENTED / TESTED, branch only. This closes the shared Home metric gap
identified in the central next-wave review. It is not a product speed improvement,
hosted acceptance, an integration head, or release authorization.

- Branch: `gpt/perf-shared-readiness-20261016`.
- Product ancestry: `f60d078822a40d0940860a98470930e3e9fb59d5`, unchanged.
- Tested code: `2935999a5d2bec333043903a939de2e5e98e7a93`.
- Coordination: `GPT_2029_SHARED_READINESS_FIX_20261016`; passive BEFORE
  `5d1dc769-0df6-4a94-a4db-61c6e8b35557`.
- Claude's separate Home/frame closing-round claim remains respected. No UI,
  shared reader, product data, RLS, switch, CI configuration or deployment changed.

## What changed

The generic `primaryContentState('/')` used to accept cards with zero opacity,
cards outside the viewport, an unavailable hero containing a post link, and a
notice containing the only post link. It could latch READY before a person could
use the content.

Home now rejects unavailable/notice/loading/hidden/inert content, checks ancestor
opacity and visibility, viewport intersection and center-point occlusion, and
requires the title and post destination themselves to be visible. Visibility
uses the existing Home evidence limits (opacity >= 0.9, visible fraction >= 0.4).
A hidden first hero no longer masks a separate visible hero. A real card next
to an unrelated failed area still counts.

The shared profile is now `cold-replay-v3`, with readiness
`home-visible-primary-v3-world-post-rendered-v2`. World/Post predicates, request
clock, network-quiet collection and CLS aggregation are unchanged. In particular,
this does not certify visible-content or return-anchor acceptance for other
routes. The separate Home v5 evidence runner and its existing measurements are
unchanged; no replacement of those valid measurements is required by this fix.

The current replay gate refuses v2 reports and refuses mixed-profile comparisons.
Historical artifacts remain intact and can be reviewed with their original tools.
For a new generic-runner speed comparison, run both arms with the same v3 tool,
input and profile. Do not relabel historical measurements as v3.

## Verification

All runs used the existing network isolation runner inside a network namespace
with loopback only, Chromium 1194, and local static HTML or local intercepted
responses. No live fallback or new content collection. Test HTML demonstrates
predicate behavior only and is not performance acceptance input.

| Check | Result |
| --- | --- |
| New browser regressions against unchanged f60d metric | 19 cases: 13 fail, 6 pass; expected negative control |
| Same new regressions after fix | 19/19 pass |
| Existing measurement browser tests and unchanged Home v5 predicate tests | 28/28 pass |
| Measurement/profile/replay-validator unit tests, final run | 17/17 pass |
| Native isolation audits for all three runs | Empty |
| Whitespace review | Pass |

The first combined run passed 63/64. Its sole failure was a validator test treating
a saved v2 report as the current profile. That test now preserves and rejects the
historical report, then creates an explicitly unit-only in-memory copy for testing
observation bounds. The targeted final validator run passed 17/17. The 47 passing
browser checks were not rerun after this test-only adjustment. Total: 64 distinct
checks verified, no skips. No remote CI PASS or new product build is claimed.

Reproduce with `PLAYWRIGHT_DIR` and `PERF_CHROME` pointing at the installed
Playwright and Chromium, inside the existing isolated execution environment:

```sh
node scripts/ci-isolation/run.mjs -- node --test --test-concurrency=1 \
  scripts/perf-execution-2029/primary-readiness.browser.test.mjs \
  scripts/perf-execution-2029/measurement.browser.test.mjs \
  scripts/perf-execution-2029/measurement.test.mjs \
  test/perf-replay-gate-2029.test.mjs \
  test/home-readiness-predicate-2029.test.mjs
```

For the negative control, set `PERF_PRIMARY_SOURCE` to a local file exported from
f60d's `scripts/perf-execution-2029/browser-metrics.mjs` and run only
`primary-readiness.browser.test.mjs`. This must fail on the old metric.

Private logs: `/workspace/private-perf-20261016/shared-readiness/`. No user corpus,
content payloads or credentials are committed.

## Continuation

1. Accept Claude's existing wide-return and bounded-error-space fixes once its
   exact closing head is handed off; do not overlap its active UI scope.
2. Reduce actual first-load work: prioritize the Home card's full-post read and
   unnecessary eager shell imports using matched request/byte/CPU evidence.
   Preserve source admission, permissions, freshness and the adopted interface.
3. Complete route-specific World/Number and hosted/authenticated acceptance
   before selecting a unified product head. This tooling commit alone does not
   combine the existing Home and Number/CI chains.

The adopted loading policy is Experience Governance v10, canonical
`project_codex id=30`. V3 remains source provenance; its unadopted product design
is still DRAFT. No full-archive mapping is a prerequisite to core performance.
