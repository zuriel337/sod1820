# Post documents on the CDN — controlled experiment (17 November 2026)

Task: `POST_DOCUMENT_CDN_CACHE_EXPERIMENT_20261117` (ZURIEL, 17.11.2026: an isolated experiment with Vercel's existing CDN only; no merge, no Production, no domains, no paid service, no shared settings without exact approval). This continues the speed project; nothing here replaces or reopens earlier fixes. The machine-readable twin of the lab numbers is `lab-summary.json`; the experiment is entry `S-47` in `docs/reviews/unified-performance-consolidation-20261031.json` (`current_state_20261117`), which the speed centre in `/2029/control` reads.

## 1. What was true before the experiment (read 17.11.2026, live sources)

| Fact | Value | Source |
|---|---|---|
| Live site | `dpl_H2Vs3UnALoLFwpViK7mYeSx7D1Dw` from `main` `d87ced78b` | Vercel alias read |
| Where the page server runs | `iad1` (Washington, US East), 100% of 214,143 document requests | Vercel deployment + observability `function_region` |
| Where the database runs | Supabase `ap-northeast-1` (Tokyo) | Supabase project record |
| Edge regions that answer document requests (7 days) | cle1 115,786 · sfo1 42,095 · iad1 14,202 · fra1 9,346 · sin1 8,447 | observability `edge_region`, route `/api/public-document` |
| How a document is answered today | every time by the function: `Cache-Control: no-store`, **0 HIT of 214,102** edge requests in 7 days | observability `cache_result` |
| Server time per document (7 days) | warm p50 255 ms · p75 483 ms · p95 719 ms; cold (264 starts) p50 752 ms, p95 1,395 ms | `function_duration_ms` by `function_start_type` |
| Who asks for documents (7 days) | `meta-externalagent` 49.4%, no bot name 30.7%, claudebot 5.3%, applebot 3.9%, facebookexternalhit 3.2%, googlebot 3.0% | observability `bot_name` |
| Field (own RUM, 7 days, Post pages, phones) | first byte p50 1,085 ms / p75 1,485 ms; server wait p50 882 / p75 1,319 ms (43 samples with the breakdown) | `events.performance.web_vital` |
| Field (desktop, Post pages) | first byte p50 1,360 / p75 2,383 ms; wait p50 686 / p75 1,598 ms (10 samples) | same |

A reader in Israel goes to a nearby edge, the edge goes to Washington, Washington asks Tokyo, and the answer travels back the same way, on every visit. The CDN removes the last three legs for a repeat visit in the same region.

## 2. What was changed (branch `ccr-dcadb071-v1z5ol`, not merged)

`public-reading-deploy/api/public-document.js` (`POST_DOCUMENT_CDN_CACHE`):

- **Only** an admitted public Post document: answer 200, its own address, no query string, method GET/HEAD, the metadata owner admitted a public, unsuppressed Post (read with the anonymous key), and the article-first step reached a **final** answer (`served`, `served-new`, `not-eligible`, `off`, `not-proven`, `new-guarded`).
- It then adds `Vercel-CDN-Cache-Control: max-age=300, stale-while-revalidate=3600`, `Vercel-Cache-Tag: post-document,post-document-<id>` and `X-Sod-Document-Cache: post-cdn-v1`.
- Browsers keep `Cache-Control: no-store` exactly as before (the service worker, back/forward and reload are unchanged); `Vercel-CDN-Cache-Control` is read by Vercel's CDN only and never reaches the browser.
- Everything else (Home, Community, Number, World, account and admin pages, 404, 503, redirects, query strings, the direct function address) is byte-for-byte as before.
- No new server, store, table, detector, setting or paid service.

Test: `test/post-document-cdn-cache.test.mjs` (wired into `live-contracts-2029`): the exact admission, every excluded case, `warming` and `failed` never kept, and a request carrying cookies, `Authorization` and another language produces the identical body and headers.

The protected Preview allowlist (`public-reading-deploy/review-admission.js`) admits this exact branch for Preview only, same pattern as `2011a9dc1`.

## 3. Isolated environment: protected Preview `dpl_62g74MmMWj4UK1Z5P9zAdjSFcDPs` (commit `4889ddfb8`)

Not routed to any domain; behind Vercel authentication; built with `--protected-review` for the exact SHA.

| Check | Result |
|---|---|
| 9 representative Posts (7 imported at their original Hebrew address, 2 `/post/…`), 3 requests each | 17 of 18 repeat requests answered by the CDN (`HIT`); the one `MISS` is correct (see next row) |
| First request on a cold instance | answered `x-sod-article-first: warming` (no article) — **seen on the first Preview, where the CDN then served that copy**; fixed in `4889ddfb8`: such a document is never kept; on the fixed Preview the warming answer was a `MISS`, the next request built the full document and was the one kept |
| Same bytes for everyone | identical title and ETag across the three requests of each Post; the only cookie is the existing generic `vb=browser` label, added per request by the middleware after the cache |
| Not kept (two requests each, both `MISS`, no cache marker) | `/`, `/gematria`, `/post/chosen-one?fbclid=…`, a missing Post (404), `/login`, `/2029/control`, `/api/public-document?path=…` |
| Robots / canonical | unchanged per host (`noindex` on the Preview host, as before; on the canonical host the existing `index, follow` stays) |
| Expiry after 5 minutes | three Posts: first request after expiry `STALE` (the kept copy, served at once), the CDN refreshed in the background in about 1 s, the following requests `HIT` with a new date |
| Refresh by tag (`post-document-5077`, Preview only) | the call ran (Vercel event `uev_tgPQ7hyVnK2vQBXCry0wBudS`), but it waited ~6.5 minutes for a permission prompt, by which time the copies had expired on their own — **its separate effect is not proven** here |

Vercel's documentation (read 17.11.2026, `/docs/caching/cdn-cache/purge`): the cache key includes the unique deployment URL, "since each deployment has a different cache key, you can promote a new deployment … without affecting the cache of the previous deployment" — a new release never serves a copy made by an older one (whose page would name script files that the new release does not carry). The CDN cache is kept per region and rarely requested copies may be evicted early. Purging is not billed.

## 4. Controlled lab: what the reader sees (same artifact, same Posts, same network; only the server wait differs)

Arms: server wait 880 ms (field median for Post documents on phones) vs 60 ms (a CDN answer). Phone, Slow 4G, 4× CPU, cold profile, alternating blocks, third-party scripts loaded, beacons blocked, database reads replayed. Times in ms from navigation start.

**As the live site serves Posts today (article in the first document; Posts O1, O3, V1, M1; 24 runs per arm):**

| | without CDN | with CDN | difference |
|---|---|---|---|
| First byte p50 / p75 | 936 / 958 | 119 / 144 | **−817 / −814** |
| First paint (FCP) p50 / p75 | 1,420 / 1,484 | 640 / 712 | **−780 / −772** |
| Article readable p50 / p75 | 3,333 / 3,493 | 2,556 / 3,071 | **−777 / −422** |
| LCP p50 / p75 | 5,222 / 5,972 | 3,974 / 5,220 | **−1,248 / −752** |
| CLS (worst run) | 0.0018 | 0.0018 | none |
| Article adopted by the page / page errors | 24 / 0 | 24 / 0 | — |

**Today's document without the article (Posts O1, O3, O4, O5, N1; 30 runs per arm):** first byte −820, FCP −728, readable −786 (p75 −824), LCP −1,414 (p75 −860), CLS 0 in both.

The LCP element is the cover image in every run; the image itself is unchanged, it simply starts earlier.

## 5. How much traffic the CDN would answer

Not yet estimated in this commit: the per-address, per-region, per-hour counts needed for an honest estimate are being read from Vercel observability (route `/api/public-document`, one full day). Until then the only facts are the volumes in section 1: 214,143 document requests in 7 days, mostly crawlers (`meta-externalagent` alone 49.4%) through cle1, sfo1 and iad1, and 9,346 through fra1. With the policy above, any repeat request for the same Post in the same region within about an hour is answered by the CDN; a Post read once a day in a region gains nothing there.

## 6. Cost

- **No new paid service and no new setting.** Every page request is already an edge request and already transfers the same bytes; CDN answers change neither.
- **Less server work, in proportion to the CDN share:** the document function ran 214,143 times in 7 days (33.4 GB-hours, 45 CPU-minutes); each CDN answer is one invocation and one database read (Washington→Tokyo) that does not happen. A background refresh adds at most one invocation per Post per region per 5 minutes, only while that Post is being read.
- **Purge is not billed** (Vercel documentation); a purge temporarily raises function work.
- Plan quotas are not exposed by the API; not checked.
- Separate finding, outside this experiment: `/api/card` (share-card images) ran 25,885 times in the same week and used about 9.5× the CPU of the document function and 44% of all outgoing bytes (about 230 KB per answer).

## 7. What it does not affect

- **SEO:** the same HTML, title, canonical and robots for every reader including crawlers; redirects (308), 404 and 503 are never kept; the sitemap and robots.txt are unchanged. Crawlers get faster answers.
- **Images:** unchanged (only the HTML document is kept).
- **Service worker:** browsers still receive `no-store`; the page's worker identity check uses the deployment's own source SHA, and a kept copy is never served by another deployment.
- **Sign-in and personal data:** the document handler reads no cookie, no `Authorization` header and no account; the Post is read with the anonymous key only; by Vercel's own rules a request carrying `Authorization` and a response carrying `Set-Cookie` are not cached, and the test proves the kept bytes do not depend on anything the reader sends. Signed-in state is applied by the page after it loads, as today.
- **Article first:** only final article-first answers are kept; a `warming` or `failed` document is served as before and never kept.

## 8. Freshness policy

- A kept Post is fresh for **5 minutes**. After that, the first reader in that region gets the kept copy once while the CDN refreshes it (about 1 s, measured); everyone after gets the new one. A copy that nobody requests for an hour is not used again.
- An edited or hidden Post therefore reaches readers within about 5 minutes; in the worst case one reader per region sees the previous version once after a quiet period.
- When a change must reach readers at once, the Post's tag `post-document-<id>` (or `post-document` for all Posts) is purged in Vercel (dashboard, CLI or API, Production target). That is a Production action and needs ZURIEL's approval; its separate effect was not isolated in this experiment (section 3).
- Query strings (for example `?fbclid=` on links from Facebook) are never kept in this version; those readers are answered exactly as today.

## 9. Supervision after a release (existing sources only)

- `/2029/control` → "מהירות וביצועים": the Post surface (`by_surface`), the build breakdown (`by_build`, the release's entry file tied to its commit as before) and the first-byte parts (`nav_timing_p75`) show the field effect per release; the hourly regression watch (`fn_web_vitals_watch`) already compares the Post group (24 h vs the 7 days before) for LCP, CLS and INP.
- Vercel observability (`cache_result` for route `/api/public-document`) shows the real CDN share; a HIT is not visible to the page itself, but a document wait under ~150 ms in the field breakdown is.

## 10. Not done / not verified

- Nothing was merged, deployed to Production, aliased, purged in Production or changed in a shared setting.
- The separate effect of a tag purge (section 3).
- Field measurement with real readers in Israel: only possible after a release; the lab numbers above are a controlled simulation of the server wait, not field data.
- Region change: **not justified now.** Moving the function next to the database (Tokyo) would move it away from readers; moving it toward readers (Frankfurt) would move it away from the database; moving the database is a migration. The CDN removes both distances for repeat reads without moving anything.
