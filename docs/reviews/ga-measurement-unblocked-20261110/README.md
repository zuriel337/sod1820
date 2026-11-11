# Google Analytics measurement unblocked on the 2029 public site (10.11.2026)

**Decision (ZURIEL, chat 10.11.2026):** no blocking of measurement on the 2029 site; "nothing is secret here"; every surface must be scanned.

## Finding (read-only, before any change)
* GA4 property `541654210` ("כי לה' המלוכה", the starred one, used by the Legacy site): the stream `G-V3H3E20FLY` is the same ID the Legacy bundle
  (`dpl_BFpwZGiYL3Qpdy9nCuGKGb9Xmko2`) and the 2029 site send to; the numbers match what `api/ga-sync` stored (14–15.6.2026: 3,109 views / 655 sessions in the DB,
  3.11K / 653 in GA).
* After the cutover to 2029 (4.11) GA shows almost nothing: ≈1.4K / 0.7K / 0.8K / 0.6K daily views on 1–4.11, ≈25 on 5.11, ≈0 afterwards (3.56K for 1–11.11).
* Cause, two layers: (1) the deployment CSP `connect-src` listed only `www.google-analytics.com` and `region1.google-analytics.com`, while the real gtag.js sends
  its hits to `www.google.com/g/collect` (and `/ccm/collect`, `analytics.google.com`, `stats.g.doubleclick.net`); (2) the public-reading service worker answered every
  POST to a non-allowlisted origin with 403 and, even on the two GA hosts, admitted only five events, a fixed parameter set, an exact page/title and no referrer.
* Live scan of 32 public routes (real Chromium, `scripts/scan-public-surface-blocks.mjs`): the ONLY CSP block was `connect-src https://www.google.com/g/collect` (31 of 32
  routes); no worker denial; one benign aborted CloudFront request. Meta Pixel / AdSense / Google Ads are not requested at all by the 2029 release (absent, not blocked).

## Contradiction with the previous contract (presented, decided by the owner)
`test/public-reading-real-gtag-shape.test.mjs` and `test/public-reading-observability.test.mjs` pinned the opposite ("secondary beacons and non-GA4 collection
hosts stay denied", "GA4 transport admits only the configured collector and sanitized public page"). The owner's decision supersedes it; those assertions are replaced.

## Change
* `public-reading-deploy/vercel.json`: `connect-src` admits `https://*.google-analytics.com`, `https://analytics.google.com`, `https://*.analytics.google.com`,
  `https://*.googletagmanager.com`, `https://*.g.doubleclick.net`, `https://www.google.com` (all existing entries kept; nothing else widened).
* `public-reading-deploy/transport.js`: GA4 requests (GA hosts, `www.google.com` `/g/`, `/ccm/`, `/j/`, `www.googletagmanager.com`) are not intercepted by the worker:
  no event/parameter/title/referrer validation, no method denial. The exemption is exact: other cross-origin writes (Meta, ads, arbitrary hosts) stay denied.
* The app still sends the normalized public route label (`src/lib/analytics.js`, unchanged): that is the page's own choice, not a block.
* Tests: shape/observability contract tests updated; new real-browser test `test/ga-measurement-browser-2029.browser.mjs` (real CSP header + real worker: every GA4
  transport reaches the network; a non-GA write is still blocked); it FAILS on the previous code.

## Not changed / open
* Meta Pixel, AdSense and Google Ads are not loaded by the 2029 release (a separate product/privacy decision).
* The GA daily sync into `traffic_history` stopped on 6.9.2026 (separate; not part of this change).
* Takes effect only after a production deployment (separate approval for an exact commit). Verify afterwards in GA Realtime of property 541654210.
