# Central Raziel baseline stabilization — Phase 1

Task: `CENTRAL_2029_RAZIEL_BASELINE_STABILIZATION_20261026`.

## Scope and provenance

- Base: `9688b9d1c87bf67af087c72e9253ea1a43dbba01`.
- Branch: `gpt/2029-central-raziel-baseline-stabilization-20261026`.
- Live BEFORE: `8bc0a21c-2383-44ca-897b-3c7813929b13`.
- Remote main at verification: `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`. Main is not the integration base and was not merged.
- Authorized change: stabilize the three inherited Phase J/M test failures; no feature expansion or deployment.
- Exactly two test files and this review document changed. No runtime, auth-policy, provider, API, DB/RLS or package changes.

## Cause, reproduced before the fix

The Phase J and M test loaders extract the actual `ai-analyze` adapter into a synthetic execution environment. That adapter calls the canonical imported `supabaseServiceHeaders` helper, but neither loader injected it. A `ReferenceError` occurred before `fetch`, then the adapter's normal failure handler reported `fetch_failed`.

- Phase J/M before: 28 tests, 25 pass, 3 fail.
- Same real adapter without the helper: `ok=false`, `tool_error`, zero fetches.
- Same adapter with the real helper: `ok=true`, one synthetic fetch.
- No live reader failure was inferred from those synthetic harness failures.

## Fix and non-weakening proof

Both loaders now import and inject the real existing helper. Header checks use the case-insensitive `Headers` API and assert both legacy Bearer authorization and `apikey`; no fake replacement helper is introduced.

All original exact-slug, selected-column, row-limit, sanitization, truncation, projection, privacy, operator isolation and golden-routing expectations remain. Negative tests additionally assert one actual synthetic fetch and its precise failure reason, preventing missing test dependencies from accidentally satisfying fail-closed cases. Additional coverage exercises both public readers with legacy and modern publishable keys, without fabricating a Bearer token for an opaque key.

## Verification

- Focused Phase J/M: **29/29 PASS**.
- Canonical auth-header contract: **5/5 PASS**.
- Broad Raziel pure suite: **646/646 PASS**, zero skips/cancellations. Includes `src/lib/research/raziel*.test.js` and non-browser `test/raziel*.test.mjs`; both browser test modules are run separately from this pure suite.
- Chromium built navigation: **320px and 1440px PASS**, no overflow; deterministic navigation makes zero model requests; ordinary-question transport is synthetic.
- Build 2029: PASS.
- Build Legacy: PASS.
- Built graph: PASS, 411,093 eager gzip bytes, **47,649 recovered** versus the required 12,288. Submit adapter and research plan remain lazy.
- Hard isolation, cheap hardening, My Workspace, System Frame and Legacy Production Lock: PASS.
- `git diff --check`: PASS.
- Independent read-only review: no weakened assertions or runtime changes.

Existing build warnings about large chunks and ineffective dynamic imports remain; they are not removed or hidden.

## Continuation boundary

The previous protected Preview remains at `9688b9d1c`; no new Preview is created for this test-only change. No Edge deployment, main merge/push, Production or live product-DB writes.

For the next visible personal companion action, the Personal Area session should own its UI/callback wiring to the existing `submitPersonalAreaCompanion` seam. The Raziel session owns any separately coordinated conversation/adapter contract gap, not a second chat or Provider. Claims must be rechecked before either writes shared files.

This checkpoint does not authorize the next implementation phase or a live model/Edge release. The companion backend is still branch-only and receipt shape is not an engine-verification or ownership proof. Live authenticated/privacy acceptance remains a separate gate.

Detailed local test evidence: `/workspace/artifacts/raziel-baseline-stabilization-20261026`.
