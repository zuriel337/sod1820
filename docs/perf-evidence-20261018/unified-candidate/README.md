# 2029 performance unified candidate — 2026-10-18

Status: **BRANCH-ONLY CANDIDATE**. This is not `main`, Production, a release approval, or a real-user speed claim.

## Identity

- Branch: `gpt/perf-unified-candidate-20261018`
- Base: `gpt/perf-unified-candidate-20261017@8c8e9df9b2b012b70479e398e75f16e7008b8619`
- Included D3 head: `b41bf2b7eb433c6f120132803b9a9a655855bae7`
- Included locked-route head: `ad145b838ecf112c5dc52b2c9c134bdbdde8eb93`
- Included post-middleware F5 head: `9ed573364b1381d72e1ee68866a99781aff6dbaa`

The seven source commits were cherry-picked in their original order. They applied without conflicts. The three scopes do not overlap semantically: D3 owns on-demand StoryViewer/report-form loading, the locked-route change owns World/Number route-code preparation and the obsolete World head read, and F5 owns post-route middleware legitimacy.

## Included behavior

1. StoryViewer and ContactGateway load on first use in 2029. Legacy keeps the static StoryViewer path. Slow and failed chunk loads keep a stable surface with close/retry/reload behavior.
2. World and Number start only their current route code while Auth/site-flag gates are resolving. `Locked` still owns mount/render. No protected route data is read before the gate. The obsolete `/world` document-head post read is removed; Home and Post head reads are unchanged.
3. A human top-level `GET /post/:slug` navigation no longer waits for `public_post_slug_exists`. Crawlers, `HEAD`, old/non-navigation clients, and Legacy `/:slug` retain the lookup and hard 404/308 behavior. The lookup has an 800 ms fail-open timeout.

## Combined verification

- `npm run build`: PASS for Legacy and 2029. Existing large-chunk and ineffective-dynamic-import warnings remain.
- F5 + middleware + early-read + loader contracts: 36/36 PASS.
- Route legitimacy: PASS.
- 2029 bundle budget: 5/5 PASS. Built graph: entry 9 chunks / 183.3 KB gzip; Home +26 / +151.4 KB; World +37 / +253.7 KB; Post +29 / +175.5 KB.
- Entry Contextual Learn, issue-report emitter, System Frame, and Control Plane: PASS.
- StoryViewer/report-form isolation on real builds and Chromium: 19/19 PASS, no skips.
- Combined locked-route Chromium harness: PASS. World/Number code began before a synthetic 1500 ms flag gate; protected content did not mount and route data did not start before authorization.

The combined 2029 shell is approximately 63.7 KB gzip versus approximately 70.4 KB on the pinned base (about 9.5% smaller). This is a bundle result, not a latency or LCP claim.

## Measurement boundary

The locked-route timing samples vary materially with local CPU/cache state. The structural result is accepted because the same browser harness proves the intended request ordering, one route-chunk request, no pre-gate protected mount, and no pre-gate route-data read. Do not claim a user-visible speed gain from those local milliseconds. Hosted Preview acceptance must measure cold direct entry and internal navigation separately on mobile and desktop.

F5's loopback result proves removal of one synthetic 150 ms slug-existence round trip for qualifying human navigation. Production Edge-to-Supabase latency and the presence of `Sec-Fetch-*` headers still require hosted verification.

## Release boundary

No PR, CI, Preview, merge, deployment, live flag, RLS, schema, or product-data change is part of this integration. Before release, verify the exact remote SHA, create an isolated Preview without invoking live-writing CI, and run guest/authenticated/admin/mobile acceptance for Home, World, Number, Post, StoryViewer, report form, crawler 404, human missing-post noindex, and Legacy containment.
