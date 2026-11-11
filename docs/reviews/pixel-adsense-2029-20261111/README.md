# Meta Pixel and Google AdSense on the 2029 public site — 11.11.2026

**Decision (ZURIEL, 11.11.2026):** "תוסיף את Meta Pixel ו-AdSense גם ב-2029". Follows the 10.11 decision that nothing on 2029 blocks measurement.

## Starting point (read from the tree and from history, not from memory)
| | State before this change |
|---|---|
| Meta Pixel | `src/lib/marketing.js` existed (Pixel + Conversions API twin + Google Ads), but every entry point returned immediately under `PUBLIC_READING_RELEASE`, and `App2029` never called it in the reading profile. The id (`VITE_META_PIXEL_ID`) is already a Vercel production variable. |
| AdSense | Code removed with Legacy (`src/lib/adsense.js`, `AdSlot`, `SideRailAd`, `StickyAnchorAd`; history: `git show a5ef82cce^:src/lib/adsense.js`). Legacy had **`ADSENSE_KILL_SWITCH = true` since 13.7.2026 ("הוקפא לבקשת צוריאל")**, i.e. ads were already off on Legacy before the cutover. `VITE_ADSENSE_CLIENT` and slots (`POST`, `LIST`, `ANCHOR`, `SIDE`) are Vercel production variables; `public/ads.txt` names `pub-9535875486398314`. |
| Worker / CSP | `connect-src` listed neither Meta nor AdSense hosts; the worker answered every cross-origin POST to an unlisted origin with 403, and `/functions/v1/meta-capi` went to the admin-only path. |

## Contradictions with earlier contracts (owner decision supersedes; presented, not hidden)
1. 13.7.2026 ads freeze → lifted for 2029 by the 11.11 decision (`ADSENSE_KILL_SWITCH = false`; ads still need `VITE_ADSENSE_CLIENT` at build time).
2. Tests that pinned "marketing is suppressed in the reading profile" (`doc37-closed-side-effects`) and "Meta/ads writes stay denied" (`public-reading-real-gtag-shape`, `public-reading-observability`) are replaced by tests of the new behaviour. Bots remain excluded.

## What changed
- `src/lib/marketing.js`: reading-profile guards removed. `App2029` starts the Pixel in the same idle-scheduled step as GA, **only on routes that have a measurement label** (`readingTelemetryPath`: no auth callback, account, admin, unsubscribe, profile routes). Bots (edge verdict `vb` cookie, or automation) get **no script, no PageView, no CAPI event** (`sideEffectAllowed`).
- `src/lib/adsense.js`, `src/components/AdSlot.jsx` (restored, adapted): slots `post` and `list` only; a slot reserves its height (CLS stays under the fixed 0.1 threshold); no ids → nothing rendered or loaded. Placement: after the published post (not draft / private / preview), and below the posts list. Never on home, Beit Midrash, account or experiences (asserted by a test).
- Israel-only gating kept (the Legacy rule). Legacy used a `vc` cookie set by the middleware; 2029 has no such cookie, so the signal is the browser time zone (`Asia/Jerusalem`). It is a heuristic, not a country proof; unknown means no ads. **If a server-side country signal is wanted, that is a middleware change and a separate decision.**
- `public-reading-deploy/vercel.json`: `connect-src` adds `connect.facebook.net`, `*.facebook.com`, `*.facebook.net`, `*.googlesyndication.com`, `*.doubleclick.net`, `*.adtrafficquality.google`, `*.googleadservices.com`, `adservice.google.com`, `adservice.google.co.il`. Only this directive changes.
- `public-reading-deploy/transport.js`: those exact HTTPS hosts pass through the worker untouched (as GA does); `POST /functions/v1/meta-capi` is admitted as an anonymous, bounded (8 KB), fixed-shape request rebuilt without the page's session. Every other cross-origin write is still denied.
- `scripts/build-public-reading-production.mjs`: the four public ids are baked explicitly from the build environment, like the GA id.

## Evidence
- Discovery with the **real** `fbevents.js` and `adsbygoogle.js` in Chromium under the deployment's real CSP: before, `pagead2.googlesyndication.com` (`/getconfig/abg_config`, `/pagead/ping`) and `ep1.adtrafficquality.google` were CSP-blocked; after the change no violation (hosts seen: connect.facebook.net, pagead2.googlesyndication.com, googleads.g.doubleclick.net, ep1/ep2.adtrafficquality.google, www.google.com).
- `test/marketing-browser-2029.browser.mjs` (artifact built with test ids, real worker, real CSP header): the app itself initialises the Pixel and sends one PageView with an event id; the CAPI relay reaches the origin anonymously with the same event id; AdSense transports reach the network with no CSP violation; an unlisted host is still blocked; a bot loads nothing. CI job `marketing-browser-2029`.
- `test/adsense-gating-2029.test.mjs`, `test/public-reading-real-gtag-shape.test.mjs`, `test/public-reading-observability.test.mjs`, `test/doc37-closed-side-effects.test.mjs`.

## Not done / open
- **Not restored:** the Legacy `ANCHOR` (sticky bottom strip) and `SIDE` (desktop rails) units — they change layout on every reading page; add only on request.
- Google Ads (`VITE_GOOGLE_ADS_ID`) is not set in production; nothing changes there.
- **Privacy:** the Pixel receives the page URL (including any query string on admitted routes) and, via CAPI, the same URL plus the `_fbp/_fbc` cookies — the same data Legacy sent. There is no consent banner on the site; whether the privacy page needs a mention of Meta/AdSense is a product/legal decision for the owner.
- Real ads and real Pixel events can only be confirmed on the live site after a deploy (Events Manager → Test events / Pixel Helper; AdSense → Sites). Production ids come from the Vercel environment; no env change is part of this PR.
- Release: merge and deploy need ZURIEL's separate approval for the exact commit (CLAUDE.md 0.4). Kill switch / rollback: remove `VITE_ADSENSE_CLIENT` or `VITE_META_PIXEL_ID` from the build environment and redeploy, or assign the aliases back to the previous deployment.

## Follow-up after the first live run (11.11.2026, deployment of d6662fdcb)
A real browser (Israel time zone, human UA) on the live site showed: Pixel `fbevents.js` + `/tr/` hit work; AdSense script, `googleads.g.doubleclick.net`, `ep1/ep2.adtrafficquality.google` work (slot answered `unfilled`: no ad was served to that session, which is normal while AdSense is still approving the site/slot). Two defects were found and fixed in the next change:
1. **CAPI relay never reached the function.** Supabase function logs showed only `OPTIONS` (preflight) for `/functions/v1/meta-capi`: the function answers CORS with `Access-Control-Allow-Headers: content-type` only, and the worker added `apikey` and `Authorization`. The relay now sends only `Content-Type` (the function is public, `verify_jwt` off; no key and no session are needed).
2. **Google Funding Choices** (`fundingchoicesmessages.google.com`, the AdSense privacy/consent-message service for the publisher account) was blocked by the CSP (`connect-src`). Admitted in the CSP and passed through the worker. Its messages are configured in the AdSense account, not in this repository.
The sandbox discovery run missed (2) because Funding Choices only starts for a registered site and publisher; the lesson is that host discovery must be repeated on the live site after each deploy (`scripts/scan-public-surface-blocks.mjs` does not load ads for bots; the check used here is the human-browser run in the work log).
