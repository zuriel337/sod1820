# OpenWeb / CSP — what is blocked, what is needed, what it risks (DEF-010) — analysis only, nothing changed

**Observed (Playwright, `/community` and `/community/chat`, phone + desktop, production `1f086393`):**

| Blocked request | By | Count / page | Purpose (from the URL) |
|---|---|---|---|
| `GET https://ads-configs-cdn.openweb.com/sp_OVtajBTj/Desktop/web.json` | CSP `connect-src` | 3 | the widget's **advertising** configuration for publisher `sp_OVtajBTj` |
| `https://realtime.openweb.com/v1.0.0/conversation/realtime/read` | CSP `connect-src` | 4 | **live updates** of the comment conversation |
| `https://publisher-assets.spot.im/ad/event-tracking/pixel-ads-google-adsense.html` | aborted by the widget (allowed host) | 1 | AdSense tracking pixel |
| `https://metrics-logger.spot.im/metric` | aborted by the widget (allowed host) | 5 | widget metrics |
| uncaught `called without required arguments` | widget JS | 1 | likely the failed realtime/ads bootstrap |

**Why:** the published CSP (`public-reading-deploy/vercel.json`) allows `https://spot.im https://*.spot.im wss://*.spot.im` only; OpenWeb is the same vendor under a new domain. The request worker (`public-reading-deploy/transport.js` ~line 217) also passes only `*.spot.im`; a contract test pins both (`test/public-reading-full-account-transport.test.mjs`).

**Minimum change that would restore live updates (not applied):**
1. `connect-src … https://realtime.openweb.com` (exact host; add `wss://realtime.openweb.com` only if the browser actually opens a socket there — not observed).
2. In `transport.js`, treat exactly `realtime.openweb.com` like the `spot.im` hosts for `GET/POST/OPTIONS` (or, stricter, only the path prefix `/v1.0.0/conversation/realtime/`).
3. Extend the pinned test accordingly.

**Deliberately not proposed:** `ads-configs-cdn.openweb.com` — allowing it hands the widget its ad configuration (the AdSense pixel request shows ads are part of the config); that is a monetisation/product decision, and `*.openweb.com` as a wildcard would let any OpenWeb tenant be addressed from the page.

**Security risk of the minimum change:** one more third-party origin in `connect-src` (the browser can send requests, with cookies the vendor already sets on the page, to that host; response data is only readable by the page's scripts, which already include the vendor's widget). It does not relax `script-src`/`frame-src`/`object-src`/`base-uri`/`form-action`. Residual risk = the vendor's own, same as `spot.im` today. **Decision needed:** keep the comments box as is (works, no live refresh) or allow the single realtime host.
