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

## 5. How much traffic the CDN would answer (Vercel observability, 16.11.2026, one full day)

Estimator: for each (address, edge region, hour), every request after the first is a CDN answer, which approximates "fresh 5 min, then served while refreshing for up to an hour". 29,573 document requests that day, all answered by the function.

| Population | Requests | Share a CDN would answer (hourly) | (5-minute variant) |
|---|---|---|---|
| All document requests | 29,573 | ≈19.6% (lower bound 17.0%) | ≈10–12.5% |
| `/community/chat` and `/` only (not Posts) | 5,616 (19%) | 88.8% | ≈51% |
| Everything else: Posts and junk addresses | 23,957 (81%) | **≈3.2–4.5%** | lower |
| Through fra1 (where Israeli readers arrive) | 1,658 | ≈48% (bounds 46–64%) | ≈20% |
| fra1, the 4 most-read Posts | 159 | ≈70% | — |

What this means for the change as tested (Posts only):

- **The benefit per CDN answer is large (section 4), but with today's traffic only a few percent of Post requests would get it.** Most Posts are read rarely in a given region within an hour; the exception is a Post that many people open at once (a share, a newsletter), where most readers after the first would get the fast answer.
- Almost all repeat traffic is on two non-Post addresses: `/community/chat` (3,878 requests; the Meta AI crawler and a steady ~13/hour "human" poll from fra1, gru1, iad1, bom1, cdg1) and `/` (1,738; mostly `facebookexternalhit`). Their documents are also the same for everyone, but they were not tested here and are not kept by this change.
- Links from Facebook carry a unique `?fbclid=` value, so even if query strings were kept, each click would be its own cache entry; those readers get no benefit either way.
- Much of the long tail is not content: old WordPress addresses (`/wp-json/oembed/1.0/embed`, `/wp-login.php`, `/feed`), scanner probes, `/community/null`, and old script files under `/assets/` requested mostly by Meta's crawler. Each still runs the function (to answer 404); an edge-level 404 for these would remove that work without any cache.
- Method limits: one day; the query API returns at most 500 groups, so the long tail was estimated from two sampled hours (one complete, one partial) plus exact series for the heavy addresses; an empty bot name does not prove a human; evictions and deploys not modelled.

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

## 11. Recommendation (one decision)

**Enable it for Post documents exactly as tested** — `max-age=300, stale-while-revalidate=3600`, only admitted public Posts with a final article-first answer, no query strings, browsers unchanged — **and in the same release measure it, without expecting a large change in the Post averages.**

- Proven: about 0.8 s faster first byte, first paint and readable article, and up to 1.2 s faster LCP, for every reader the CDN answers; no layout shift, no personal data in a kept copy, edits reach readers within about 5 minutes.
- Expected reach today: a few percent of Post visits overall, most of the visits to a Post that is being read by many people at the same moment, and the Israeli readers of the most-read Posts (≈70% in fra1).
- Cost: none added; slightly less function and database work.
- Not part of this decision, measured as the next candidates: the same mechanism for the `/` and `/community/chat` documents (≈19% of all document requests, ≈89% repeat within the hour; needs its own Preview check), and an edge 404 for old WordPress and scanner addresses.

