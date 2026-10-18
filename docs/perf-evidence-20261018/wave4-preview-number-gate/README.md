# Wave 4 Preview Number gate hardening

## Scope and decision

- Exact source base: `gpt/perf-unified-wave4-20261018@5a26aee5493dda6504815332d0f7ee0ae23f4d14`.
- Isolated implementation branch: `gpt/perf-wave4-preview-number-gate-20261018`.
- Code commit under test: `6e280324f0d0e1648642df0d65718970b7469cec`.
- Recommendation: **GO for integration into the exact Wave 4 Preview branch and a new protected Preview deployment**.
- This is not a Production release decision. No deployment, merge, database mutation, RLS change, or live flag change was performed.

The previous Preview path could still show the Number maintenance lock because its bootstrap accepted whichever service-worker controller happened to exist, including an old controller, and the worker carried the Number override by rewriting the canonical `site_flags` response. A first navigation could reach the application before the intended worker controlled the page. The build also did not bind the client-side exception to the exact generated Preview host, and its receipt could report an override without proving the generated HTML and worker identity.

## Implemented contract

The integrated Preview builder now refuses to run unless all of the following are true:

- `SOD_BUILD_TARGET` is the builder-owned `2029` target.
- `VERCEL_ENV=preview`.
- `VERCEL_GIT_COMMIT_REF=gpt/perf-unified-wave4-preview-20261018`.
- `VERCEL_GIT_COMMIT_SHA` is a lowercase 40-hex SHA and equals the checked-out `HEAD`.
- `VERCEL_URL` is an approved, exact SOD1820 Vercel deployment hostname.

The generated worker is SHA-versioned. The bootstrap waits for a controller whose `scriptURL` exactly equals that versioned URL before importing the application. An existing or stale controller no longer satisfies the guard. The compiled Number exception also requires the exact host embedded at build time, the exact branch, Preview environment, and the 2029 target.

The worker no longer reads, intercepts, or rewrites `site_flags`. The Number exception is a client projection of a valid canonical `lock_number` row. Valid means an existing row with a boolean `enabled` value and `mode` equal to `all` or `anon`. Missing and malformed rows remain closed. In the exact protected Preview only, a missing or malformed first response gets one shared fresh read. A second failure renders the maintenance lock and offers a manual retry; it does not start a background retry loop.

The worker continues to block writes before application startup. Its read-only RPC allowlist now includes only the compact Number opening RPC required by the current Number UI, `fn_number_opening_projection_2029`. Repository migration `supabase/migrations/20261018024447_number_opening_projection_2029.sql` proves that function is SQL `STABLE`, `SECURITY INVOKER`, and produces a projection through reads. The migration revokes PUBLIC execution and grants execution only to `anon`, `authenticated`, and `service_role`. No adjacent or depth RPC was inferred or added.

`preview-build.json` now binds the commit, branch, exact host, build target, environment, versioned worker URL, and SHA-256 digests of the Vite manifest, final HTML, and worker. `numberReviewPreviewOpen` and `previewOverrides` reflect the actual compiled exception.

## Files changed

- `scripts/build-integrated-preview.mjs`
- `scripts/test-integrated-preview-auth-guard.mjs`
- `src/lib/numberReviewPreview2029.js`
- `src/components/MaintenanceLock.jsx`
- `test/number-review-preview-browser-2029.test.mjs`

No change was made to `App`, `vercel.json`, the public production service worker, database migrations, Production, or live flags. The existing live values `lock_number=true` and `fx_number_lookup_page=false` were not modified.

## Verification

The exact code commit was built locally as a Preview with a Vercel-like hostname and tested through a loopback HTTPS harness. Chromium ran with `serviceWorkers: "allow"`; the local self-signed certificate was accepted only for this isolated harness. The browser used a real generated worker and real built assets.

`node --test test/number-review-preview-browser-2029.test.mjs scripts/test-integrated-preview-auth-guard.mjs test/number-review-preview-2029.test.mjs test/site-flags-inflight-2029.test.mjs`

- 25 tests passed, 0 failed, 0 skipped.
- Covered direct first navigation, first worker installation without a controller, reload, internal navigation, a fresh browser context, replacement of an old controller before entry import, and a same-origin POST returning 403 before delayed application startup.
- Covered one transient missing-flag recovery, two missing reads remaining closed with a bounded manual retry, malformed `enabled` and `mode` values remaining closed, and the exact Preview exception staying closed in Production, another branch, a regular build, and another host.
- Covered that the canonical `site_flags` GET is never intercepted or rewritten, every `site_flags` write is blocked, the exact compact Number RPC is allowed, and adjacent/unlisted RPCs are blocked.
- Covered that the first Home entry remains visually quiet while its chunk is delayed; route transitions retain their loading status.

`npm run build`

- Passed for Legacy and 2029.

`npm run test:2029-bundle-budget`

- 5 tests passed, 0 failed, 0 skipped.
- Built entry: 9 chunks / 173.8 KB gzip.
- Number route increment: 31 chunks / 203.0 KB gzip.

The builder was also invoked with Production environment, a different branch, an invalid SHA, and an invalid host. All four cases exited nonzero before producing an eligible Preview build.

## Generated receipt used by the browser tests

- Commit: `6e280324f0d0e1648642df0d65718970b7469cec`
- Branch: `gpt/perf-unified-wave4-preview-20261018`
- Host: `sod1820-wave4-number-test-sod1820-s-projects.vercel.app`
- Worker: `/preview-readonly-sw.js?build=6e280324f0d0e1648642df0d65718970b7469cec`
- Manifest SHA-256: `b62b146e9602b0b764ac3dd0149de6ba841a225a810c2e4727ad574cbe41c0b2`
- HTML SHA-256: `0ec6d404be89434338c47d1064719a83e962de90f6e7cb1aad39aaba03ca90fc`
- Worker SHA-256: `b6f5da08be19b1b1ccd54d4852833772b692f179fd6c5683560cefad3954cc28`
- Identity SHA-256: `b5c259f2160078a1fe2ef3406bffe719b114602ebd33cf6f2895f376c6022ffd`

The matching machine-readable receipt is in `receipt.json`.

## Remaining acceptance

A new hosted protected Wave 4 Preview still needs to be built from the integrated source and exercised at `/number/1820`. That hosted check must confirm the exact deployment SHA/host receipt, direct navigation, reload, internal navigation, and a fresh session. It must also confirm that the live canonical flag row remains unchanged. The local evidence supports integration and deployment for acceptance; it does not claim that an existing hosted Preview has changed.
