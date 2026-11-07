# Performance recommendations: platform delivery and database (7.11.2026)

> **Status: RECOMMENDATIONS ONLY. Nothing in this document was applied, deployed, merged or changed.** Every proposal below is labelled **RECOMMENDATION (not done)**.
> Branch `perf/pf6-platform-db-recommendations`, base `e7865363e` (RC `claude/sod1820-audit-rc-g93w32`). Live at the time of writing: `dpl_12JhDbtTkEiENigf3Wzy4sproY7E` / `cfda877a1` (from the earlier discovery; `git diff cfda877a1 e7865363e -- api public-reading-deploy` shows that the deployed server code differs from this base only in `api/card.js`, `api/og.js`, `public-reading-deploy/api/card.js`).
> No Production, DB, Storage, Auth, permission, `vercel.json`, deployment, e-mail or Edge-function change. The ההיכל (Heichal) surface is out of scope and was not analysed; where an item would have touched it, it is skipped and said so (§8).
>
> **Revision 2 (7.11.2026, 20:30-22:00Z), after an independent review of revision 1 (`ff99b7ddf`).** The review reproduced the scope, the plans, the counts and the pins, but not the delivery narrative of §2. This revision: (1) replaces the "fixed 0.5-0.6 s floor, uniform regardless of query complexity" with the measured **two-mode** cost of a read (about 0.23 s or about 0.63 s; §2.2); (2) re-takes the live document timings with **30 interleaved samples per route** (revision 1 had N = 5) and lists them; (3) restates every derived gain from the corrected numbers (§2.3, §2.4, §9: the `/number` "about 1 s" and "about -0.5 s" claims are withdrawn); (4) compares the field with the largest DB-free route (`/`) and says what the field cannot show; (5) adds the browser-safe `Vercel-CDN-Cache-Control` variant as the **preferred** caching variant, with a pin experiment; (6) labels the sitemap cold build as n = 1 per observer and adds 31 real cold generations from the edge logs (§3); (7) fixes the `video_media_assets_v1` plan cost (§7.2a), a file path (§7.2c) and the Heichal wording (§8). Everything is still a RECOMMENDATION (not done); this revision, too, changed no code, config, DB or deployment.

## 0. How the evidence was gathered (and what it can and cannot show)

| Source | What was run | Limit |
|---|---|---|
| Supabase (`linswmnnkjxvweumprav`) | `SELECT` only, `EXPLAIN` without `ANALYZE`, `pg_stat_*`, `pg_policies`, `information_schema`; a few `BEGIN; SET LOCAL ROLE anon; EXPLAIN …; ROLLBACK;` to see RLS plans (no data read or written) | `pg_stat_statements` was reset 2026-10-28 02:13Z (window 10 days). Index scan counters have no known reset date. |
| Supabase unified logs (`query_logs`, 24 h windows) | edge-log aggregates by path / referer class / `response.origin_time` | 24 h per query; three windows used: **A** = 2026-11-05T16:50Z to 11-06T16:50Z (weekday + Friday), **B** = 2026-11-06T16:50Z to 11-07T16:50Z (Friday night + Shabbat, low traffic), **C** (revision 2) = 2026-11-06T20:56Z to 11-07T20:56Z (used for the origin-time distributions of §2.2 and the sitemap generations of §3). |
| Production HTTP | revision 1: about 50 read-only `GET`/`HEAD` requests to `sod1820.co.il` (documents, sitemap, fonts, images, one missing asset) and 10 to third-party hosts. **Revision 2: 150 document `GET`s (5 routes x 30 samples, two batches of 15 interleaved rounds with the route order rotated, a new connection per request, 7.11 20:50-21:20Z) and 30 static-asset `GET`s (CDN-HIT floor)**; all from the sandbox through the agent proxy | Vantage point is the sandbox (US egress), not Israel. Server wait = `time_starttransfer - time_appconnect` (no DNS/TCP/TLS, no user round trip), so it is **not comparable in absolute terms with field TTFB** (§2.2c). Document timings are **bimodal** (§2.2): a median of a small sample is unstable, so every document timing lists its samples or its two modes. Revision 1 used N = 5 per route; that is superseded. Byte counts and headers are exact. |
| Vercel MCP | project and runtime-log reads, documentation search | The observability query API was not usable (earlier finding), so per-path request counts are not available; log-line counts are not request counts. |
| Repo | reading code at base `e7865363e` | none |

Noise caveat: other CPU-heavy jobs ran on this machine during the session. Revision 1's production sample was taken in a quiet period (Shabbat); the revision-2 samples were taken just after Shabbat ended (20:50-21:20Z, traffic rising). The DB-side slow-mode share varied between 43 % and 62 % per 3-hour block over the last 24 h (§2.2b), so any single sample set can land on either side of its median. All timings are indicative. Byte, header, plan-shape and count data are authoritative.

## 1. FIELD baseline from the DB (client web-vitals)

**Source:** `public.events` (partitioned by month), `event_type = 'web_vital'`, `surface = 'performance'`. Metrics live in `props` (`lcp_ms`, `cls`, `inp_ms`, `fcp_ms`, `ttfb_ms`, `phase`, `nav_type`, `visibility_at_flush`, `sample_id`, `initial_path`). The route is the router pattern in `events.path` (equal to `props.initial_path` in 100 % of rows). The browser family is `events.app_context`.

**Window and counting rules**
- Last 7 days = 1,020 rows, but the collector only produces data from **2026-11-05 03:44Z** (4 earlier rows), so the effective window is **about 2.5 days (11-05 to 11-07 16:23Z), including Shabbat**.
- One page load emits up to two rows (`checkpoint` at 15 s, `final` at `pagehide`/`visibility_hidden`) with the same `sample_id`. Counted **one row per `sample_id`, preferring `final`**: **736 loads** (580 with a `final` row; 156 only a 15 s checkpoint, where LCP/INP may be incomplete). Navigation mix of the 1,020 rows: navigate 874 (85.7 %), back_forward 94 (9.2 %), reload 52 (5.1 %).
- Scope is `document_navigation_hard_load_only`: SPA route changes are **not** measured.
- **Device is not recorded**: `events.device` is NULL for 100 % of `web_vital` rows and there is no user-agent in `props`, and `session_id`/`sod_id` are NULL (so no join to the `view` events, which do carry `device`). The browser family (`app_context`) is the only available proxy and is shown below.

### 1.1 By route group (all deduplicated loads; ms except CLS)

| Route group | Loads (final) | LCP p50 / p75 / p95 | CLS p50 / p75 / p95 | INP n, p50 / p75 / p95 | FCP p50 / p75 / p95 | TTFB p50 / p75 / p95 |
|---|---|---|---|---|---|---|
| `/community/*` (95 % `/community/chat`) | 216 (174) | 3,068 / **4,654** / 63,577 | .009 / .068 / .360 | 77, 128 / 224 / 466 | 1,468 / 2,504 / 130,460 | 855 / 1,449 / 2,638 |
| `/post/:item` | 208 (171) | 3,869 / **5,616** / 9,229 | .001 / .012 / .946 | 57, 112 / 176 / 536 | 2,120 / 2,888 / 4,834 | 775 / 1,604 / 3,240 |
| `/` (home) | 188 (133) | 2,637 / **4,266** / 10,981 | .000 / .006 / .402 | 61, 128 / 192 / 680 | 1,052 / 1,894 / 4,627 | 531 / 1,076 / 2,853 |
| `/number/*` | 42 (31) | 1,976 / 2,880 / 4,756 | .002 / .007 / .015 | 4, 72 / 92 / 102 | 1,182 / 1,527 / 3,825 | 674 / 1,094 / 3,399 |
| `/gematria`, `/world` | 42 (40) | 1,732 / 2,245 / 3,637 | .014 / .018 / .035 | 7, 72 / 84 / 211 | 284 / 403 / 790 | 131 / 249 / 570 |
| other (books, category, tag, topic, map, privacy, …) | 40 (31) | 1,654 / 2,374 / 5,640 | .000 / .000 / .016 | 1, 96 | 568 / 1,042 / 2,884 | 235 / 446 / 1,934 |
| **All** | **736 (580)** | 2,826 / **4,626** / 11,375 | .001 / .020 / .419 | 207, 112 / 196 / 634 | 1,253 / 2,377 / 5,790 | 611 / 1,310 / 2,868 |

Reading: p75 LCP is **poor (> 4.0 s) on `/post`, `/community`, `/` and overall**; CLS p75 is good everywhere (the CLS budget of 0.1 holds at p75; p95 does not on `/post`, `/` and `/community`); INP p75 196 ms is at the edge of "good" (200 ms); TTFB p75 1,310 ms is "needs improvement". The same cut restricted to loads that were still **visible at flush** (n = 448) gives overall LCP 2,496 / 4,492 / 14,407, `/post` 2,840 / 4,784 / 8,635, `/community` 3,010 / 5,749 / 233,320, TTFB p50 527 overall: the p50/p75 picture is the same, only the p95 changes (background-tab contamination, below).

The table above is the snapshot of 7.11 16:23Z (736 loads). A refresh at 20:55Z (836 loads) with p25 / p50 / p75 / p90 TTFB, used for the delivery comparison, is in §2.2(c).

### 1.2 By browser family (proxy for device; groups with n < 25 omitted)

| Browser (`app_context`) | Loads | LCP p50 / p75 | CLS p75 | INP p75 | TTFB p50 / p75 |
|---|---|---|---|---|---|
| chrome (desktop and Android, headless not separable) | 593 | 2,848 / 4,620 | .040 | 216 | 610 / 1,297 |
| safari | 37 | 2,052 / 3,869 | .000 | 100 | 600 / 1,602 |
| edge | 45 | 6,060 / 105,654 (outliers) | .019 | 128 | 996 / 1,449 |
| firefox | 32 | 2,134 / 4,249 | .000 | 260 | 200 / 896 |
| chrome-ios | 26 | 1,714 / 2,739 | .000 | 80 | 572 / 1,399 |

(facebook 2, android-webview 1 loads: too few.)

### 1.3 Contamination and validity notes

1. **Bots:** `is_bot` is `false` for 100 % of stored rows because `ingest_event` drops `p_is_bot = true` at ingest. "Not flagged" is not "human": headless Chrome without the webdriver flag would be stored and labelled `chrome`.
2. **CI / test traffic that hits production Supabase (SBR-13), measured in the edge logs, not in this table.** Requests whose referer is `http://127.0.0.1:*` / `localhost` (GitHub Actions runners and agent sessions running the local preview against the production API):

   | Window | local-preview/CI requests | share of all Supabase API requests | `ingest_event` POSTs | `track_visit` POSTs | summed `origin_time` | share of summed origin time |
   |---|---|---|---|---|---|---|
   | A (11-05 16:50Z to 11-06 16:50Z) | **222,688** | **56 %** (of 397,633) | 6,853 | 4,214 | 948.5 min | **55 %** (of 1,725 min) |
   | B (last 24 h, Shabbat) | 12,292 | 5.8 % (of 211,866) | 102 | 58 | 45.3 min | 4.6 % |

   The collector is gated to canonical hosts, so those `ingest_event` calls are not expected to appear as `web_vital` rows (the stored rows are 615 on 11-05 and 328 on 11-06, far below the 6,853 CI POSTs). **Not proven:** that no CI/agent run **on the canonical host** (post-deploy canary, G4 gates against production, audit crawls) is among the 736 loads. The CI guard in §7.5 would remove this uncertainty.
3. **Background tabs:** 19 `final` rows have an LCP above 30 s and 23 an FCP above 30 s (Edge p75 105 s is a handful of such rows). Only p95 and Edge are affected materially. Recommended filter for any dashboard: `visibility_at_flush = 'visible'` and a cap or a `hidden-at-start` signal.
4. **Small samples:** `/number` 42, `/gematria`+`/world` 42, other 40, chrome-ios 26. Do not rank those groups against each other.
5. **Time-of-week bias:** the whole window is Thursday night to Saturday (Shabbat), after a day with 16 production deployments (11-05 UTC) that reset CDN caches; hourly peaks were 58 loads (11-05 14:00Z).
6. Context from the earlier discovery (SBR-02): page-level analytics events (`view`, `engagement`, `track_visit`) fire for almost no real visits on 2029 routes, so `web_vital` is currently the only reliable real-user signal, and it covers hard loads only.

**Reproduce:** the SQL is in §10.

## 2. Document delivery: what a Supabase read adds to a document, and why `/post/:item` is slower than `/`

### 2.1 What the handler does per request (from code)

`/((?!api(?:/|$)).*)` rewrites to `public-reading-deploy/api/public-document.js`, which sets `Cache-Control: no-store` first (line 44), reads `.generated/2029.html` from disk (line 111), and calls `api/og.js` to build the head metadata (line 91). `og.js` runs **its own Supabase REST reads, sequentially, from the function region (iad1)** to a database in **ap-northeast-1 (Tokyo)**.

| Route class | `og.js` data calls (base `e7865363e`) | Sequential reads |
|---|---|---|
| Static / shell routes (`/`, `/map`, `/world`, `/gematria`, `/community/chat` without `thread`/`reply`/`path`, `/books`, `/codes`, `/contact`, `/beit-midrash`, …) | none in the production artifact (feature locks are static; metadata comes from in-code tables) | **0** |
| `/post/:slug` | `posts?slug=eq.<slug>&select=id,slug,…,content,…&limit=1` (line 319); a second identical call when the slug is percent-encoded WordPress style and the first misses (lines 311-322, 345) | **1** (2 on a miss) |
| `/number/:n` | `number_anchors?value=eq.n` (line 899) **then** `rpc/is_number_indexable` (line 1019): independent reads, awaited one after the other | **2** |
| `/number/:phrase` | `rpc/is_phrase_indexable` | 1 |
| tag / category | `posts?…&Prefer: count=exact` (line 430) (+1 witness read on an empty search) | 1 (2) |
| `/topic/:slug`, `/codes/:slug`, `/book/:slug`, `/community/researcher/:slug` | one `topic_cards_public` / `els_records` / `nodes` / `contributors` read (lines 854, 924, 961, 993) | 1 |
| `/video/:id`, `/or-geula`, `/or-geula/video/:id` | `video_media_assets_v1` view (1.3 s of DB time per read, §7) / the Or-Geula readers | 1-2 |

Two details that matter for cost, not for correctness:
- The post query selects `content` (average **20.9 KB**, p50 4.5 KB, p95 85 KB, max 550 KB over 1,320 posts) although `content` is only used when `excerpt` is empty (8 of 1,320 posts) or when `?sourceAttachment=` is present (`og.js:329`, `:350`). Measured effect on latency is small (tens of ms at p95); it is a bandwidth, not a latency, finding.
- `posts` has `idx_posts_slug_route (slug)` and `number_anchors` has 17 rows. **The SQL is not the cost.**

### 2.2 Measured: a Tokyo read costs either about 0.23 s or about 0.63 s, and the mix decides every median

Revision 1 of this section called one read "a fixed 0.5-0.6 s floor, uniform regardless of query complexity", said that the `/post` median "reproduces the field TTFB p50", and priced `/number/:n` at "about 1.1 s". An independent re-measurement contradicted all three. The numbers below replace them: the cost of a read is **bimodal**, not a floor.

**(a) Lab: live documents, server wait, 30 samples per route.** Five routes x 30 samples = 150 `GET`s, taken as two batches of 15 interleaved rounds (route order rotated every round, a new connection per request, 1 s between requests, browser-like user agent), 7.11 20:50-21:20Z, from the sandbox through the agent proxy. Server wait = `time_starttransfer - time_appconnect`. All 150 responses: HTTP 200, `cache-control: no-store`, `x-vercel-cache: MISS`, body 10.5-12.7 KB.

| Route | Sequential DB reads | Server wait: median (min-max) | Mean | Structure of the 30 samples |
|---|---|---|---|---|
| `/` | 0 | 101 ms (77-119) | 99 ms | one mode |
| `/map` | 0 | 102 ms (76-355) | 113 ms | one mode (one 355 ms outlier) |
| `/community/chat` | 0 | 102 ms (91-227) | 115 ms | one mode |
| `/post/seventh-to-tenth-sefirot-2027` | 1 | **484 ms** (296-808) | 533 ms | fast: 15 samples, median 331 (296-386); slow: 15 samples, median 728 (582-808) |
| `/number/1820` | 2 | **817 ms** (557-1,480) | 856 ms | three clusters: 15 samples 557-719 (median 606); 11 samples 915-1,070 (median 973); 4 samples 1,407-1,480 (median 1,424) |

All 30 waits, sorted (ms), with `|` at the mode boundaries:

- `/post`: 296 315 316 316 322 324 328 331 332 352 355 358 381 381 386 `|` 582 666 669 699 709 715 717 728 735 751 751 784 785 796 808
- `/number/1820`: 557 576 577 579 590 591 605 606 613 613 618 626 629 642 719 `|` 915 949 955 962 965 973 974 979 1021 1030 1070 `|` 1407 1409 1439 1480

Batch medians show how unstable a median is here: `/post` 386 ms in batch 1 (7 of 15 samples slow) and 666 ms in batch 2 (8 of 15 slow); `/number` 915 and 719 ms. With about half of the samples in each mode the median is the 8th of 15 values and lands in either mode.

Paired within the same round (cancels the common part), `/post` minus `/`: 15 pairs at +208 to +282 ms and 15 at +494 to +705 ms (median +388, mean +434). `/number/1820` minus `/`: 14 pairs at +452 to +546 ms and 16 at +628 to +1,368 ms (median +721, mean +756).

*Independent re-measurement (the review of revision 1, same vantage, 19 interleaved samples):* `/post` median 346-363 ms (min 298, max 1,040; about a quarter of the samples at 738-832 ms), `/number/1820` 559-592 ms (546-1,403), `/map` 98-106 ms, `/` 106 ms. The three sample sets give `/post` medians of about 350, 386 and 666 ms: the same two modes with different slow shares (about a quarter, 47 %, 53 %). Revision 1's `/post` median (740 ms, N = 5) came from a slow-mode-heavy sample and its `/number` median (571 ms) from a fast-fast one, which is why its own table (571 ms) and its prose ("about 1.1 s") disagreed. Both figures are withdrawn.

Reading: **one read adds about +0.23 s (fast mode) or +0.63 s (slow mode) to the server wait; two sequential reads add about +0.5 s (both fast), +0.9 s (one slow) or +1.3 s (both slow).** The pooled lab means are +0.43 s for one read (533 vs 99 ms) and +0.76 s for two (856 vs 99 ms).

**(b) Database side: the Supabase edge logs show the same two modes.** `response.origin_time` of the REST gateway for the reads issued by the Vercel functions (user agent `node`, Cloudflare colo IAD), 24 h ending 7.11 20:56Z (window C). p25 / p50 / p75 / p90 in ms:

| Read | n | p25 | p50 | p75 | p90 | p50 in the review's re-run |
|---|---|---|---|---|---|---|
| `posts` (slug lookups and the sitemap's 1,000-row pages) | 4,519 | 218 | 452 | 625 | 652 | 463 |
| `number_anchors` (17-row table) | 492 | 214 | 256 | 620 | 646 | 541 |
| `rpc/is_number_indexable` | 493 | 242 | 285 | 648 | 673 | 420 |
| `rpc/is_phrase_indexable` | 9,765 | 232 | 570 | 638 | 662 | 575 |

p25 and p90 are stable across windows; **p50 is not** (256 vs 541 ms for the same table), because it falls in the empty gap between the modes. Histogram (50 ms buckets, same window, IAD) for the two highest-volume reads:

| `origin_time` | `posts` | `rpc/is_phrase_indexable` |
|---|---|---|
| 150-299 ms | 2,150 (47.6 %) | 4,834 (49.5 %) |
| 300-549 ms | 134 (3.0 %) | 25 (0.3 %) |
| 550-699 ms | 2,063 (45.7 %) | 4,777 (48.9 %) |
| 700 ms and above | 171 (3.8 %; the sitemap's large pages) | 127 (1.3 %) |

Slow share (reads of 450 ms or more, the four read types pooled) per 3-hour block of that window: 42.9, 45.1, 45.5, 48.4, 49.4, 55.0, 61.6 and 61.8 % (n = 1,363-2,388 per block), with the block p50 flipping between 244 and 620 ms. For comparison, the same `posts` reads from colo ORD (n = 110, CI runners) have p25 / p50 / p90 of 244 / 341 / 734 ms.

A primary-key or index lookup takes well under 5 ms inside Postgres, so both modes are network and gateway time between the function and the database in ap-northeast-1 (Tokyo). Why a read is fast or slow is **not established**; a hypothesis that fits 230 vs 630 ms (about one vs about three round trips of roughly 200 ms) is a warm keep-alive socket versus a new TCP+TLS connection to the gateway, but nothing here proves it. What the data do show is that the two modes are the same for a 17-row table and for a 9,765-call RPC, so the SQL is still not the cost. Volume check: in window B the Vercel functions issued **8,933** `rpc/is_phrase_indexable` and **486** `rpc/is_number_indexable` calls (only `og.js` makes them), so `/number/<phrase>` documents are a high-volume, crawler-driven route; each of those calls pays one read.

**(c) Field TTFB: compared with the largest DB-free route, and what the field cannot show.** Refresh of the §1 query at 7.11 20:55Z (836 loads, same counting rules; "final" = loads with a `final` row), TTFB in ms:

| Route group | Reads in `og.js` | Loads (final) | p25 | p50 | p75 | p90 |
|---|---|---|---|---|---|---|
| home `/` | 0 | 202 (142) | 303 | 543 | 1,124 | 2,152 |
| `/post/:item` | 1 | 253 (206) | 348 | 814 | 1,706 | 2,746 |
| `/number/*` | 2 | 45 (33) | 482 | 683 | 1,224 | 2,494 |
| `/community/*` (95 % `/community/chat`) | 0 | 252 (196) | 493 | 855 | 1,507 | 2,165 |
| other (books, category, tag, map, privacy, ...) | 0-1 | 42 (32) | 135 | 306 | 460 | 1,525 |
| `/gematria`, `/world` | 0 | 42 (40) | 113 | 131 | 249 | 411 |

- Revision 1 contrasted `/post` (775 ms) with `/gematria`+`/world` (131 ms). That group has only 42 loads, all between 11-05 08:07Z and 11-06 13:49Z, so it is not time-matched with the others and is **not a valid baseline**. The largest DB-free group is the home route (n = 202, p50 543, p75 1,124; the first version's snapshot had 531 / 1,076).
- `/post` minus `/` is **+271 ms at p50 and +582 ms at p75** (p25: +45 ms). That is the size of one read in the fast and in the slow mode (+0.23 s and +0.5-0.6 s), so the field is *consistent with* one read per `/post` load, and not with the 640 ms that revision 1 inferred from the `/gematria` group.
- It is not *evidence* of it: `/community/*`, which makes **no** `og.js` read, sits +312 ms (p50) and +383 ms (p75) above `/` as well. Route-group differences in the field are confounded by who visits (device, network, country, hour); only the lab, with one client, one minute and interleaved rounds, isolates the read.
- `/number/*` is only +140 ms (p50) and +100 ms (p75) above `/` with n = 45, although the lab prices two reads at +0.5-1.3 s. The field does not corroborate the lab for that route; n is too small to conclude either way.
- Absolute values must not be compared across the two: field TTFB is navigation start to response start (redirects, DNS, TCP, TLS, the user's round trip, worker start-up), already 543 ms for the home route, while the lab server wait excludes all of that (101 ms for `/`). Only differences between routes are comparable, and only with the confounding above.

**(d) Consequences, corrected.** The median of one sample set sits in the gap between the modes and is set by whether the slow share is above or below 50 %; it is not the cost of a read and must not be quoted as such. Per document request, a `/post` pays +0.23 s or +0.63 s (mean +0.43 s), a `/number/:n` pays +0.5 / +0.9 / +1.3 s (mean +0.76 s), a static route pays nothing (about 0.10 s of function time).

### 2.3 RECOMMENDATION (not done): CDN cache for documents

Goal: serve the document from the CDN (HIT) instead of invoking the function and its Tokyo reads. **Variant A is preferred and should be tried first on a protected Preview; Variant B is the fallback.**

| | **Variant A (preferred)** | Variant B (fallback) |
|---|---|---|
| To the browser | `Cache-Control: no-store`, unchanged | `Cache-Control: public, max-age=0, s-maxage=N, stale-while-revalidate=M` |
| To the CDN | `Vercel-CDN-Cache-Control: public, s-maxage=N, stale-while-revalidate=M` (Vercel documents it as the TTL for Vercel's own CDN only; `Cache-Control` stays the client TTL, `CDN-Cache-Control` the downstream-CDN TTL, and headers set by a function override `vercel.json` headers; Vercel docs, "CDN Cache") | the same `Cache-Control` |
| Browser and back/forward-cache behaviour | unchanged (documents stay `no-store` for the browser) | changes: documents stop being `no-store` |
| Existing pins (`test/public-reading-production-artifact.test.mjs:69,76`; `no-store` asserts in other `test/public-*`) | **none change** (experiment below) | must be rewritten deliberately (gate edit, ZURIEL) |
| Still unproven | that the platform stores a response whose `Cache-Control` is `no-store` while `Vercel-CDN-Cache-Control` is present (the documentation examples pair it with a positive client TTL; I found no statement about `no-store`), and that middleware `Set-Cookie`s are not replayed (risk 2) | the cookie question only |

**Pin experiment for Variant A (done; throwaway worktree on base `e7865363e`, never committed, removed afterwards).** I added `Vercel-CDN-Cache-Control: public, s-maxage=60, stale-while-revalidate=120` to `public-reading-deploy/api/public-document.js` for every 200 `GET` without a query string, rebuilt the public-reading artifact (`node scripts/build-public-reading-production.mjs`) and ran every `test/public-*.test.mjs` (41 files) plus `scripts/test-public-reading-main-release-contract.mjs`: **337/337 pass, identical to the unmodified base (337/337)**. A temporary copy of `public-reading-production-artifact.test.mjs` that additionally asserted the new header on the 200 paths and its absence on `/?p=100` passed 24/24, and `scripts/test-legacy-retired.mjs` passed. So Variant A removes the "pins must change" blocker that revision 1 attached to caching. What the experiment cannot show is any CDN behaviour; it needs a protected Preview (the two "unproven" items above).

**Proposed policy per route class** (the CDN header is `Vercel-CDN-Cache-Control` in Variant A; in Variant B the same value follows `public, max-age=0, ` in `Cache-Control`). The last column uses the lab numbers of §2.2 and the measured CDN-HIT floor: static files served as `x-vercel-cache: HIT` (15 requests each for `/fonts/Rubik-Latin.woff2` and `/brand/2029/canonical-lockup-128.webp`) have a server wait of 71 and 65 ms (medians; 45-167), i.e. about 68 ms.

| Route class | CDN TTL | Staleness bound | Expected server-wait change at a HIT (lab) | Why |
|---|---|---|---|---|
| Shell/static routes (the no-fetch list in §2.1), 200, GET, canonical origin, **no query string** | `s-maxage=300, stale-while-revalidate=600` | 15 min | 101 to about 68 ms (**-0.03 s**); the gain is function invocations avoided, not latency | content is a build-time constant per deployment |
| `/post/:slug`, `/number/*`, `/topic/*`, `/codes/*`, `/book/*`, `/community/researcher/*`, tag/category, `/or-geula*`, `/video/*`, **200, no query** | `s-maxage=60, stale-while-revalidate=120` | **3 min** (60 fresh + 120 stale-while-revalidate, then a synchronous fetch) | `/post`: **-0.26 s** (fast mode) or **-0.66 s** (slow mode), mean -0.47 s; `/number/:n`: mean -0.79 s | edits, `טיוטה`/`פורום` suppression and `is_*_indexable` flips become visible within 3 min |
| 404 for a missing post | `s-maxage=30` | 30 s | n/a (absorbs crawler 404 storms without the function and two reads) | a post published within 30 s of a probe is the cost |
| 503 / any 5xx, `Retry-After` closed areas, 308 redirects, query-string variants (private inputs), non-canonical origins, HEAD | no CDN header (Variant A) / `no-store` (Variant B) | n/a | n/a | never cache failure or private variants |

Most of the value is in the data-route row; the shell-route row is optional (small latency gain, fewer invocations, same cookie risk).

**Exact change (not applied), Variant A.** In `public-reading-deploy/api/public-document.js`, add before the final `res.status(status).send(...)` (current lines 112-118); the early `res.setHeader("Cache-Control", "no-store")` on line 44 stays for every branch:

```js
// RECOMMENDATION - not applied (Variant A). Both lists must be generated from the route table, not hand-maintained;
// a query string always means "no CDN header".
const SHELL_PATHS = /^\/(?:|map|world|gematria|code|codes|books|privacy|contact|members|early-access|beit-midrash|community(?:\/(?:chat|researchers|calculator))?)$/;
const DATA_PATHS  = /^\/(?:post\/[^/]+|number\/[^/]+|topic\/[^/]+|codes\/[^/]+|book\/[^/]+|community\/researcher\/[^/]+|(?:tag|category)\/[^/]+|or-geula(?:\/video\/[^/]+)?|video\/[^/]+)$/;
export function documentCdnCacheControl({ method, origin, path, search, status, temporarilyClosed, degraded }) {
  if (method !== "GET" || origin !== CANONICAL_ORIGIN || search || temporarilyClosed || degraded) return null;
  if (status === 404) return "public, s-maxage=30";
  if (status !== 200) return null;
  const p = path.replace(/\/+$/, "") || "/";
  if (SHELL_PATHS.test(p)) return "public, s-maxage=300, stale-while-revalidate=600";
  if (DATA_PATHS.test(p))  return "public, s-maxage=60, stale-while-revalidate=120";
  return null;
}
// in the success branch:
const cdn = documentCdnCacheControl({ method: req.method, origin, path, search, status, temporarilyClosed, degraded });
if (cdn) res.setHeader("Vercel-CDN-Cache-Control", cdn);
```

For Variant B, the last line becomes `res.setHeader("Cache-Control", cdn ? "public, max-age=0, " + cdn : "no-store")`. No `vercel.json` change is required for documents in either variant (risk 4).

**Invalidation / consistency risks (must be closed before enabling):**
1. **Degraded 200s.** Several `catch {}` blocks in `og.js` turn a Supabase failure into a **200 with generic metadata** (for example the `number_anchors` fallback, `og.js:899-909`, and the `?v=` video fallback, `:721-742`). Cached, that degraded head would be served for up to the staleness bound. The handler needs a request-scoped `degraded` flag set by every swallowed error (the `degraded` argument above) before any 200 may be cached.
2. **Per-visitor `Set-Cookie` on every document.** `middleware-core.js:409-410` appends `vc=<country>` and `vb=<bot verdict>` to every response (seen live on `/map`). If the platform stored and replayed those with a cached response, visitors would receive another visitor's country/bot verdict. Whether routing-middleware headers are applied after a CDN HIT must be proven on a protected Preview with two different countries and one bot user-agent **before** relying on it. Fallback: leave documents uncached and cache only the data.
3. **Takedown latency.** A post hidden with the `טיוטה`/`פורום` tag (`hasSuppressedPublicPostTag`) stays visible for at most 3 min. If that is too slow for take-downs, phase 2 is tag-based purge (`Vercel-Cache-Tag: post-<id>` plus `invalidate_by_tags` from the publish path, a documented platform feature) which is new infrastructure.
4. **Header precedence.** `public-reading-deploy/vercel.json` sets `Cache-Control: no-store` for `/(.*)`. Vercel documents that function-set headers override `vercel.json` headers, and the sitemap shows it for `Cache-Control` on `/sitemap.xml` (a rewrite to a function that sets its own header, and it was cached, §3). For Variant A, confirm on a Preview that the second request returns `x-vercel-cache: HIT` while the browser-facing `Cache-Control` is still `no-store`; if it does not, use Variant B.
5. **Pins.** Variant A: none to change (experiment above). Variant B: `test/public-reading-production-artifact.test.mjs:69,76` and every test asserting `no-store` through `publicReadingDocumentHandler` for a cacheable 200/404 (grep `cache-control` in `test/public-*`) must change deliberately (gate edit, ZURIEL); the new pins must assert the stricter-by-class policy, not delete the assertion (CLAUDE.md: no weakening of any test). Both variants need a **new** pin that the CDN header is absent on 5xx, 503, 308, query-string and non-canonical-origin responses.
6. **Per-deployment cache.** With 18 production deployments between 11-05 19:29Z and 11-06 14:19Z, any cache that is invalidated per deployment is cold after each one. Not verified for documents; verified indirectly for the sitemap (§3: 73 origin generations in one deployment-heavy day, 29-31 on the quiet days).
7. **Hit ratio.** The field has about **93 `/post` hard loads per day** (253 loads in 2.7 days, canonical host, bots dropped at ingest) spread over 1,320 posts. A 60 s fresh window plus 120 s of stale-while-revalidate only helps when the same URL is requested again within about 3 minutes (crawler bursts, a shared link, a popular post), so most human `/post` loads would still miss. A longer TTL raises the hit ratio and the takedown latency (risk 3); with tag invalidation on publish/edit/hide the TTL could be hours, at the price of new infrastructure. Measure the `x-vercel-cache` HIT share on the Preview before choosing a TTL.

**Expected gain (estimate from the corrected numbers; not measured on a Preview).** Per request that becomes a HIT, the server wait falls to the CDN-HIT level of about 65-71 ms: `/post` -0.26 s (fast mode) or -0.66 s (slow mode), mean -0.47 s; `/number/:n` mean -0.79 s; shell routes only -0.03 s. The upper bound for the field at a 100 % hit ratio and an unchanged population is the `/post` minus `/` difference of §2.2(c): TTFB p50 814 to about 540 ms (-0.27 s) and p75 1,706 to about 1,120 ms (-0.58 s). LCP p75 on `/post` (5.6 s) would fall by at most about that p75 delta, i.e. **about -0.5 s, not the -1 s of revision 1**. The miss path is unchanged, so the realised gain is that bound times the hit ratio (risk 7), which is probably low for the long tail of posts. Revision 1's "TTFB p50 775 ms toward about 150-300 ms" is withdrawn: no measured route of comparable n is that low (the home route's field p50 is 543 ms, because field TTFB includes the connection set-up and the user's round trip, which a CDN HIT cannot remove).

### 2.4 RECOMMENDATION (not done): code-only, no cache needed

| Change | File | Effect |
|---|---|---|
| Fire `number_anchors` and `is_number_indexable` concurrently (`Promise.all`) | `api/og.js:896-1030` | `/number/:n`: the wait becomes the slower of the two reads instead of their sum, so the saving per request is the *faster* read: about **-0.25 s** when at most one read is slow (26 of 30 lab samples: the 557-719 ms and 915-1,070 ms clusters) and about **-0.64 s** when both are slow (4 of 30: 1,407-1,480 ms); **mean about -0.3 s**. Model-derived from the lab clusters of §2.2 (the lab cannot run the changed code), to be measured on a Preview. Revision 1's "about -0.5 s (one floor instead of two)" is withdrawn. `/number/*` is about 5 % of field loads (45 of 836) |
| Select `content` only when `excerpt` is empty or `sourceAttachment` is present | `api/og.js:316-319` | removes about 21 KB average (85 KB p95) from the Tokyo to iad1 transfer; tens of ms |
| Read `.generated/2029.html` once per instance (module-level promise) instead of per request | `public-reading-deploy/api/public-document.js:41,111` | a few ms; also removes one disk read per request |
| Function region | `public-reading-deploy/vercel.json` `functions.…regions` | **Not recommended by itself.** `hnd1` (near the database) would shorten every Tokyo read but add the PoP-to-Tokyo hop for every static route and every Israeli visitor; caching (§2.3) addresses the same cost without that trade-off. A measured comparison from an Israeli vantage point is needed first. |

## 3. `/sitemap.xml` (4.2 MB, 16,763 URLs)

**Correction of the earlier reading.** The earlier note said the sitemap is `public, max-age=3600` *without* `s-maxage`. That header is what the **client** sees; the **origin** sends `public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400` (`api/sitemap.js:423`) and `public-reading-deploy/api/public-sitemap.js` forwards it for a canonical GET 200. Proof it is honoured: two consecutive live GETs (**one pair, n = 1**): **`x-vercel-cache: MISS`, TTFB 12.145 s** (the function builds the file) then **`HIT`, TTFB 0.404 s**, identical `etag`. The review repeated the pair once: MISS 15.3 s, then HIT 0.38 s, same `etag`. The direction reproduces; the magnitude is noisy (below). The platform consumes `s-maxage`/`stale-while-revalidate` and does not expose them to the browser. (`HEAD` returns `no-store` and an empty body by design in the wrapper, so a HEAD probe wrongly suggests no caching.)

Measured facts:
- Raw size **4,211,866 B** (etag `40449a`); transfer **289,045 B** with `content-encoding: br` (6.9 %).
- **Cold generation, client view: 12.1 s (n = 1, my MISS) and 15.3 s (n = 1, the review's MISS).** Each is a single sample. A larger N of deliberate cold builds on production was not taken: each one is about 30 Supabase reads including three reads of the 1.3 s video view.
- **Cold generation, reconstructed from the edge logs (31 real generations, window C).** Every generation leaves a time-ordered triple in the Supabase edge logs (user agent `node`, colo IAD): the first `posts` page (`limit=1000&offset=0`), the single `rpc/sitemap_numbers`, and the first `contributors` page (`offset=0`, the last read). The span from the first `posts` page to the end of the `contributors` page is **median 13.3 s (min 10.1, max 14.6; p25 / p75 12.3 / 14.1; mean 13.1; n = 31)**. All 31 spans in seconds: 10.1 11.6 11.7 11.8 12.0 12.0 12.1 12.3 12.4 12.4 12.4 12.5 12.7 12.9 13.3 13.3 13.4 13.4 13.4 13.6 13.7 13.8 14.0 14.1 14.1 14.3 14.3 14.3 14.5 14.6 14.6. It is a lower bound for the function duration (it excludes start-up and the XML assembly; the log timestamp is within one read, about +-0.9 s, of the true start or end) and agrees with both client TTFBs above. The first `posts` page is itself bimodal (0.44-0.48 s in 14 of the 31 generations, 0.78-0.92 s in 17), the same two modes as in §2.2.
- Composition from the code and per-call medians: 2 `posts` pages of 1,000 rows (0.44-0.92 s each), **3 sequential pages of `video_media_assets_v1`** (`PAGE = 1000`, 2,311 rows; the view recomputes on every page: 1.3 s DB time, 1.9 s median `origin_time`), `sitemap_numbers` 0.25-0.73 s, `sitemap_phrases_v1` about 15 pages in waves of 3 (435 page reads in window B for 29 generations), topics, `els_records`, `nodes` (plus one **HEAD probe per published book PDF**, sequential, `publicBookSourceAvailable2029`), `contributors`. It sums to about 11-12 s, a little below the measured 13.3 s median (the composition is an estimate from per-call medians).
- **Origin generations per day** = calls to `rpc/sitemap_numbers` (one per generation, only `sitemap.js` calls it): **73** in window A (which contains 15 production deployments), **29** in window B (including my one), **31** in window C. Each generation also reads the video view 3 times (about 87-219 reads of a 1.3 s view per day).
- Function log lines for `/sitemap.xml`: 140 in 7 days (earlier: 138 of 698 in 72 h).

**RECOMMENDATION (not done):**
1. Do **not** change the header: `s-maxage=21600` + `stale-while-revalidate=86400` is correct. The remaining risk is the **cold MISS (about 13 s, median of 31 reconstructed generations)**, which Googlebot meets after every deployment (the cache is per deployment). Mitigations in order of value: (a) the video materialised view (§7.2a) cuts about 4-5 s from the generation; (b) read the three video pages once with a larger `PAGE` (2,311 rows fit in 3 pages today; a `limit` of 3,000 does one read) in `api/sitemap.js:178`; (c) run the phrase pages with width 5-6 instead of 3; (d) probe book PDFs in parallel with a 3 s bound. Together plausibly about 13 s to about 5-7 s (estimate: -4 to -5 s from (a), about -1 s from each of (b)-(d), partly overlapping; not measured). Revision 1's "12 s to about 4-5 s" is superseded by this baseline.
2. Optional: shard the sitemap into a sitemap index (`/sitemap-posts.xml`, `-numbers.xml`, `-tags.xml`, `-video.xml`) so that one slow source no longer makes the whole file fail with 503; each shard is a separate cache entry. Larger change; needs the SEO gates (`observability-seo-gate`) re-pinned. Effort M.
3. `/robots.txt` is `no-store` (function); trivial to cache with `s-maxage=3600` but it is a tiny function: gain negligible.

## 4. `/api/card`: caching and the 300 s timeout

**Status at base `e7865363e` (RC) versus live (`cfda877a1`):**

| | Live | RC (DEF-015, in this tree, not deployed) |
|---|---|---|
| `Cache-Control` | `no-store` (confirmed live: every share crawl re-renders) | `public, s-maxage=3600, stale-while-revalidate=86400` for canonical GET 200; everything else `no-store` (`public-reading-deploy/api/card.js:11-14`) |
| Supabase read (`gematria_words`) | unbounded | `AbortSignal.timeout(4000)` |
| Font / logo fetch | unbounded; failed promise cached forever | `AbortSignal.timeout(8000)`; failed promise forgotten |

Runtime evidence: 5 "Task timed out after 300 seconds" errors in 72 h, all on `/api/card`, on 2026-11-06 (01:23, 07:08, 16:24, 17:23, 20:18Z; regions cle1, iad1, sfo1), first seen 2026-07-01; the removal of Legacy did not touch the file. One earlier 7-day log shows `@vercel/og` failing to load a *dynamic* font (`Failed to load dynamic font for ∩⊂ … Status: 400`).

**What DEF-015 does not cover (RECOMMENDATION, not done):** the `new ImageResponse(...)` render (`api/card.js:276`). `@vercel/og`/satori fetches a Google dynamic font for any glyph missing from Heebo-800 (symbols, emoji, math signs in `w=`/`sub=`/`cap=`), and that fetch has no timeout of ours. This is a **hypothesis consistent with the evidence, not proven** (the log lines of the five timeouts do not carry the query). Two low-risk mitigations: (a) restrict the three text parameters to the glyph ranges Heebo covers (Hebrew, Latin, digits, common punctuation) before building the tree; (b) race the render against a 12 s timer and answer a prebuilt static fallback card (200 with `no-store`, or 504) instead of waiting for the platform limit. Expected: the 300 s class disappears (5 per 72 h today). Effort S, risk low, needs a deploy and an approval. Also note the card comment (`api/card.js:273`) says `ImageResponse` sets `max-age=31536000` itself; the wrapper overrides it, so the effective policy is the wrapper's.

## 5. Vercel Skew Protection and `/assets` routing

**Measured live:** a missing hashed asset (`/assets/2029-DOESNOTEXIST.js`, `/assets/Timeline2029-zzzz.css`) returns **HTTP 404 with `content-type: text/html`, 11,018-11,020 B (the full document shell), `cache-control: no-store`, `x-vercel-cache: MISS`, TTFB 0.43 and 0.85 s (2 samples)**, because the catch-all rewrite `/((?!api(?:/|$)).*)` sends it through `public-document` (a function invocation with the head-metadata code path). A dynamic `import()` of such a URL fails with `Failed to fetch dynamically imported module` and, without a handler, unmounts the whole React tree (lab, 24/24 runs; another writer is adding the recovery handler in `main2029.jsx`/`App2029.jsx`, not repeated here).

**Why it happens in production:** 18 production deployments in about 19 h (11-05 19:29Z to 11-06 14:19Z) swap the hashed assets under open tabs; the logs show three stale-chunk bursts of 9-25 assets each in one second (11-04 17:22Z, 21:55Z, 11-06 05:05Z). `vercel.json` has **no skew protection** and the project reports none. Each burst costs 9-25 function invocations of 0.4-0.85 s and about 11 KB each, and ends in a blank screen.

**RECOMMENDATION (not done):**

| # | Change | Where | Effect | Risk |
|---|---|---|---|---|
| S1 | Enable Skew Protection on the project (`vercel project protection enable sod1820 --skew --skew-max-age 604800`; default max age is 30 days) | Vercel project setting (not `vercel.json`) | old tabs keep fetching assets from the deployment that served their document | plan eligibility is unverified here; cost not estimated |
| S2 | On document responses, when `process.env.VERCEL_SKEW_PROTECTION_ENABLED === '1'` and `sec-fetch-dest: document`, `res.setHeader('Set-Cookie', '__vdpl=' + process.env.VERCEL_DEPLOYMENT_ID + '; HttpOnly')` (one of the three documented options for frameworks without built-in support) | `public-reading-deploy/api/public-document.js` | required for S1 to route asset requests of a plain Vite SPA | **conflicts with §2.3**: a per-deployment cookie on a cached document; decide both together |
| S3 | Keep missing `/assets/*` out of the function: change the catch-all to `/((?!api(?:/|$)\|assets/).*)` (or add a more specific rule before it) | `public-reading-deploy/vercel.json` | a missing asset becomes a platform 404 without a function call; removes the 11 KB HTML body and 0.4-0.85 s | **routing change (not allowed in this task, hence a recommendation)**. Pins to update with approval: `test/public-url-continuity-2029.test.mjs:25`, `scripts/test-public-reading-main-release-contract.mjs:16`, `test/public-site-icons-2029.test.mjs:27` |
| S4 | Service-worker-level: none (the worker caches nothing today) | n/a | n/a | n/a |

S3 alone does not prevent the blank screen (the chunk is still gone); S1+S2 do. Order: S3 is the cheapest and safest, S1+S2 fix the cause.

## 6. Fonts and first-party static files

### 6.1 New finding: first-party static files are served `no-store`

The global header rule `/(.*)` -> `Cache-Control: no-store` applies to everything that is not under `/assets/` (the only other cache rule is a 1-day TTL for the favicon and apple-touch icon paths). **Live check (headers exact):**

| URL | Size | `cache-control` | Edge |
|---|---|---|---|
| `/fonts/Rubik-Latin.woff2` (preloaded in every document) | 35,348 B | `no-store` | HIT, age 94,224 s |
| `/fonts/Rubik-Hebrew.woff2` (preloaded) | 9,348 B | `no-store` | HIT |
| `/fonts/NotoSansHebrew-Regular.ttf` (preloaded) | 26,892 B (br 14,240) | `no-store` | HIT |
| `/fonts/NotoSansHebrew-Bold.ttf` (preloaded) | 27,156 B (br 14,384) | `no-store` | HIT |
| `/brand/2029/icon-48-3f8a2a2fdc0a.png` (content-hashed name) | 6,093 B | `no-store` | HIT |
| `/brand/2029/canonical-lockup-128.webp` | 16,134 B | `no-store` | HIT |
| `/legacy-dark-bg-post-720-8f3a91ae32df.webp` and the 11 other post backgrounds (every `/post/:item` page loads one of the three sizes of its series) | 5.7-59 KB | `no-store` | MISS/HIT |
| `/logo.png` | 92,397 B | `no-store` | MISS |

The browser therefore **re-downloads about 73 KB of preloaded fonts (over the wire, br) plus the post background (6-59 KB) and the brand icons on every hard load**, instead of reading them from the HTTP cache. The CDN edge is not the problem (HIT); the browser cache is bypassed. (`back_forward` navigations are 9.2 % of the RUM rows; `no-store` documents are also generally ineligible for the browser's back/forward cache, which cannot be verified from this data.)

**Root cause is configuration drift, not a missing design.** The **root** `vercel.json` (not deployed: production builds from `public-reading-deploy/`) already contains 12 exact rules, one per versioned post background (`/legacy-dark-bg-post-720-8f3a91ae32df.webp`, `/dimension-five-night-1280-fed0a0b53207.webp`, `/mah-kore-habora-night-mobile-v2-720x1280-ee55ed6ecb14.webp`, … lines 1150-1249), each `Cache-Control: public, max-age=31536000, immutable`, placed **after** the `/(.*)` catch-all so that they override it; the test `test/post-backgrounds-2029.test.mjs:65-73` ("versioned public backgrounds override the catch-all cache policy") asserts exactly that, **but reads the root file** (`../vercel.json`). `public-reading-deploy/vercel.json` has 4 cache rules (global `no-store`, `/assets/(.*)`, the favicon/apple-touch paths, the worker) and none of the 12: 14 of the 16 cache rules of the root file are absent from the deployed one (12 immutable backgrounds, the generic image rule `/:all*(svg|jpg|jpeg|png|gif|ico|webp|mp3)` -> `public, max-age=604800, stale-while-revalidate=86400`, and `/2029/journey`). The gate is green while production lacks the headers.

**RECOMMENDATION (not done)** `public-reading-deploy/vercel.json` `headers`, appended **after** the existing `/(.*)` rule (later rules override earlier ones for the same key):

```jsonc
// 1) the 12 existing, already-tested rules, copied verbatim from the root vercel.json (hashed names -> immutable is safe)
{ "source": "/legacy-dark-bg-post-720-8f3a91ae32df.webp", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
// ... 11 more, one per file in POST_BACKGROUND_ASSETS_2029 (src/lib/research/postBackground2029.js) ...
// 2) the self-hosted fonts and brand images (names without a hash -> bounded TTL + stale-while-revalidate)
{ "source": "/fonts/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=604800, stale-while-revalidate=86400" }] },
{ "source": "/brand/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=86400, stale-while-revalidate=604800" }] }
```

(`/brand/2029/*-3f8a2a2fdc0a.png` style names carry a hash, but `canonical-lockup-128.webp` does not, hence the bounded TTL for the folder. Fonts could move to `immutable` if they are renamed with a content hash. Do not port the generic `/:all*(…)` rule blindly: in the root file it sits *before* the catch-all, so the catch-all overrides it.) Pins: `test/public-reading-production-artifact.test.mjs:404` only asserts that `/assets/(.*)` exists, so new rules do not break it; `test/public-launch-candidate-2029.test.mjs:22-28` pins `preview-deploy/vercel.json` to exactly two cache rules and is unaffected; `report.deploymentConfigSha256` changes (expected). **Recommended pin (an addition, not a weakening):** run the `post-backgrounds-2029` header assertion against `public-reading-deploy/vercel.json` as well, so the deployed config cannot drift again. **Expected gain:** repeat views and multi-page sessions save about 100-160 KB and 4-8 requests per hard load, with no change to the first view. Effort XS, risk low, needs a production deployment approval. It is the cheapest item in this document.

### 6.2 Google Fonts on every SPA page: self-hosting plan

The shell (`2029.html`, served on every route) already self-hosts Noto Sans Hebrew and Rubik. The only third-party font is **IBM Plex Mono** (numeric font), loaded as `media="print" onload` (non-blocking) plus two `preconnect` hints:

| Item | Bytes / timing (this vantage) |
|---|---|
| CSS `fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700` | 7,768 B, 268 ms; `private, max-age=86400, stale-while-revalidate=604800` (20 `@font-face`, 5 subsets x 4 weights) |
| woff2, `latin` subset (the one digits and Latin letters need) | 400: 14,708 B; 500: 14,888 B; 600: 15,620 B; 700: 14,908 B = **60,124 B** for four weights (75-290 ms each) |
| `latin-ext` (not needed for digits, unicode-range protects it) | 54,488 B for four weights |
| Connections | 2 extra origins (`fonts.googleapis.com`, `fonts.gstatic.com`): DNS + TCP + TLS each, plus a CSS-then-font waterfall |

**RECOMMENDATION (not done):** copy the four `latin` woff2 files (SIL OFL, add `IBM-Plex-OFL.txt` next to `Rubik-OFL.txt`) to `public/fonts/`, declare four `@font-face` rules in `2029.html` with the same `font-family: 'IBM Plex Mono'`, `font-display: swap` and Google's `unicode-range` for `latin`, delete the two `preconnect` links, the stylesheet link and its `noscript` twin, and serve `/fonts/*` with the §6.1 header. Optionally audit which of the four weights the CSS actually uses (each unused weight is 15 KB); a digits-only subset would be smaller but is not measured here. **Gain:** removes 2 connection setups and one request hop from the font swap path and a third-party dependency; bytes are unchanged (about 60 KB, now immutable-cacheable). It is **not an LCP gain** (the stylesheet is already non-blocking) and no RUM metric isolates it, so the user-visible gain is low. **Risk:** `2029.html` is part of the built artifact; any change moves `sourceSha`, and the lab showed a returning visitor can hit the 10 s worker-activation timeout after a deployment (15/80 runs, correlated with the favicon links added later). Bundle with an already-planned deployment; do not ship alone. CSP has no `font-src`, so no CSP change is needed.

## 7. Database

### 7.0 Where the DB time goes (`pg_stat_statements`, 10 days since 2026-10-28, 4,962 statements, total about 78,500 s)

| Statement (PostgREST RPC/view) | Calls | Mean | Max | Share of total DB time | Buffer hits per call |
|---|---|---|---|---|---|
| `rpc/fn_relation_candidate(p_a, p_b)` | 6,762 | **4,204 ms** | 7,985 ms | **36.2 %** (28,429 s) | about 200,000 |
| `rpc/top_collective(min_users, lim)` | 964 | 5,069 ms | 7,992 ms | 6.2 % | n/a |
| `video_media_assets_v1` (7 query shapes) | 1,440 | 1.4-2.9 s | 7,898 ms | about 3.9 % (about 3,025 s) | n/a |
| `rpc/site_pulse_today()` (2 shapes) | 1,831 | 1,518 / 1,053 ms | 7,793 ms | about 3.3 % (2,578 s) | about 134,000 |
| `rpc/get_reality_videos(p_limit)` (2 shapes) | 1,772 | 1,248 / 832 ms | 4,991 ms | about 2.6 % | n/a |
| `rpc/writer_public_contributions_page_v1` | 762 | 1,410 ms | 6,948 ms | 1.4 % | about 98,000 |
| `rpc/contributors_feed` | 0 recorded | n/a | n/a | n/a | n/a |

The 7.8-8.0 s maxima are the role-level 8 s statement timeout (§7.4; earlier logs: 57014 timeouts).

### 7.1 Who calls them (edge logs, windows A and B; referer class)

| RPC / view | local-preview / CI (`127.0.0.1`) | real site referer (`sod1820…`) | server-side (Vercel function, no referer) |
|---|---|---|---|
| `fn_relation_candidate` | **1,403** (all 200 except 1 x 500) | **0** | 0 |
| `writer_public_contributions_page_v1` | 331 | 8 | 0 |
| `site_pulse_today` | 21 | 2 | 0 |
| `get_reality_videos` | 26 | 2 | 0 |
| `video_media_assets_v1` | 23 | 103 | **696** (64 of them HTTP 500 at the 8 s timeout on 11-06 06:54-07:01Z) |
| `top_collective`, `contributors_feed` | 0 in 48 h | 0 | 0 |

**Reading: in the last 48 h every `fn_relation_candidate` call (36 % of all DB time over 10 days) came from CI/agent runs, none from the site; 331 of 339 `writer_public_contributions_page_v1` calls likewise.** The user-visible slow queries are the `/video` view and the sitemap (server-side). The largest immediate DB gain is therefore not SQL tuning but stopping CI from using the production API (§7.5). The SQL fixes below matter for real users once those paths see real traffic and for the sitemap.

### 7.2 EXPLAIN (no ANALYZE) per slow RPC, with proposed SQL

All proposals below are **RECOMMENDATION (not done)**; each DDL needs a Supabase-side confirmation and the DEF-001 style disposable-DB test (`scripts/run-def001-sql-test.sh`) before anyone applies it. Function rewrites are **drafts that were only parsed and planned with `EXPLAIN`, not executed**.

**(a) `video_media_assets_v1`** (view, 3 placements CTEs, `regexp_matches` over `posts.content` x 4). Plan (`EXPLAIN` without `ANALYZE`, three query shapes): the `ranked` CTE alone costs **6,435** (`Seq Scan on posts`, 1,289 rows, feeds four `regexp_matches` nested loops, est. 51,560 rows, then `WindowAgg`); a bulk page as the sitemap reads it (`order by public_id limit 1000`, no `topics`) plans at **6,715**; **a single-asset lookup is far more expensive than the bulk page, because the `public_id` predicate (`md5(asset_key) = …`) is applied above the CTE scan (a `Filter` on `CTE Scan on ranked`), so every placement is still computed, and the `topics` column adds a second pass over the placements (a 54,550-row `Sort` + `GroupAggregate`, 11,436-11,848)**: the exact `api/og.js:753` query (`public_id=eq.<id>`, its 11 columns including `topics`, `limit=1`) plans at **18,096** (18,546 for the view's subquery scan), and `select *` with `public_id = md5(…)` at **40,911**. Earlier revision text quoted only the CTE/bulk-page figure (6,435-6,695), which understated the single-lookup cost by 3x to 6x; the conclusion (the view must be materialised) is unchanged and stronger. Earlier read-only `EXPLAIN ANALYZE` (previous session): 1.29 s per read, 14.6k buffer hits, 2,311 asset rows. Proposal: the already-written `supabase/proposed/20261106140000_def003_video_assets_materialized.sql` (materialised view `video_media_assets_mv`, unique index on `public_id`, partial index on `last_seen_at` where `google_indexable`, index on `(primary_source_type, primary_source_id)`, `pg_cron` refresh every 5 minutes with `REFRESH … CONCURRENTLY`; about 3 MB; rollback in the file) plus the code switch `SOD_VIDEO_ASSETS_MV=1` (already in `api/og.js`, dormant). Read path that benefits: `/video/:id` pages (each costs about 2.6 s of DB time today) and 3 reads per sitemap generation. Risk: new relation + cron job; 5 min freshness for asset metadata (the page re-validates the source row on every request). **Approval: DB change + production env var.**

**(b) `site_pulse_today()`**: current plan cost **30,083**: `ts::date = now()::date` defeats `idx_site_visits_ts` (Parallel Index Only Scan with a filter, 442,831-row table, 73 MB heap) and the `els_today` branch is a **Parallel Seq Scan** (cost 15,912, 16,917 with its Gather Merge). Draft (same semantics: both sides use the session time zone):

```sql
-- RECOMMENDATION - not applied. Grants are preserved by CREATE OR REPLACE.
create or replace function public.site_pulse_today()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'investigations_today', (select count(*) from site_visits
                              where ts >= date_trunc('day', now()) and ts < date_trunc('day', now()) + interval '1 day'),
    'active_now',           (select count(distinct visitor) from site_visits where ts > now() - interval '60 minutes'),
    'ciphers_today',        (select count(*) from els_records
                              where created_at >= date_trunc('day', now()) and created_at < date_trunc('day', now()) + interval '1 day'
                                and status <> 'hidden'),
    'ciphers_total',        (select count(*) from els_records where status <> 'hidden' and visibility = 'public'),
    'els_today',            (select count(distinct visitor) from site_visits
                              where ts >= date_trunc('day', now()) and ts < date_trunc('day', now()) + interval '1 day'
                                and (path like '/code%' or path like '%tool=els%')),
    'els_now',              (select count(distinct visitor) from site_visits
                              where ts > now() - interval '60 minutes' and (path like '/code%' or path like '%tool=els%')),
    'new_writers',          (select coalesce(json_agg(display_name order by updated_at desc), '[]'::json)
                              from contributors where tags @> array['כתב חדש'] and coalesce(active,true) and slug not like 'r-%')
  );
$$;
```

`EXPLAIN` of the rewritten four `site_visits` branches: total cost **297** (Index Only Scan / Index Scan on `idx_site_visits_ts` with a range `Index Cond`) versus 30,083, i.e. about -99 %. Risk: low; the day boundary is the session time zone in both versions (PostgREST: UTC). Read path: the home "pulse" counter (`src/lib/supabase.js:2308`); 1,831 calls recorded, 2 from the site in 48 h.

**(c) `writer_public_contributions_page_v1`**: plan cost **7,900**: an `OR` join across three alternatives forces `Index Scan using rc_facets_idx` over about 5,909 rows and a **correlated `SubPlan 1` (Seq Scan on `contributors`, 2,363 rows, cost 104) per candidate row**; `research_contributions.author_contributor_id` is one of the advisor's unindexed foreign keys, so branch 1 has no index. Proposal (indexes first, then the function):

```sql
-- RECOMMENDATION - not applied
create index concurrently if not exists idx_research_contributions_author_contributor_id
  on public.research_contributions (author_contributor_id);                       -- 38 MB table; also covers the FK cascade check
create index concurrently if not exists idx_research_contributions_orphan_author_name
  on public.research_contributions (author_name)
  where author_contributor_id is null and author_user_id is null
    and status in ('approved','published') and parent_id is null;                  -- third branch only
```

Draft function body: three mutually exclusive branches combined with `UNION ALL` (branches 2 and 3 require `author_contributor_id IS NULL`, branch 3 also `author_user_id IS NULL`, so no row can match twice and the result set is unchanged), each with `status IN ('approved','published') AND parent_id IS NULL`, then the original `ORDER BY created_at DESC, id DESC LIMIT greatest(1,least(coalesce(p_limit,100),200)) OFFSET greatest(0,coalesce(p_offset,0))`, selecting the original 17 columns in each branch. The `NOT EXISTS (other contributor with the same name)` guard stays in branch 3 only. `EXPLAIN` of this shape **without any new index** already plans at **5,521** (-30 %) with no per-row correlated sub-plan; with the two indexes branches 1 and 3 become index lookups (not estimable without creating them). Risk: low-medium (result-equivalence must be proven on the contributor fixtures; the page is `SECURITY DEFINER`, keep `set search_path = public`). Read path: contributor dossier pages (`src/lib/research/contributorPublicationCatalog.js:99-100`, on the public-reading worker allow-list); 8 real calls in 48 h.

**(d) `contributors_feed(p_limit)`**: plan cost **13,889,842** (!): a `Seq Scan on contributors` (est. 976 rows) with **nine correlated sub-plans** per row (three `Seq Scan on posts` at 463 each for `posts.author`, three scans of `research_contributions` at about 2,685-2,803 each for the `author_user_id OR author_name` filter (two Bitmap Heap Scans, one Index Scan), three `Seq Scan on els_records` at about 43). 0 calls in 48 h and none recorded in `pg_stat_statements`; two statement timeouts were logged on 11-04 (Legacy era). Proposal: indexes only (no rewrite needed to remove the sequential scans):

```sql
-- RECOMMENDATION - not applied
create index concurrently if not exists idx_posts_author on public.posts (author);                       -- 1,320 rows
create index concurrently if not exists idx_research_contributions_author_name
  on public.research_contributions (author_name) where status in ('approved','published');                -- OR with the existing rc_author_idx
create index concurrently if not exists idx_els_records_owner_user_id on public.els_records (owner_user_id);
```

Predicted (from plan-node costs, not measured): the three `posts` sub-plans 463 to under 10 each, the three `research_contributions` sub-plans 2,700 to under 20 each. Read path: `src/lib/contributions.js:451`. Risk low; benefit only if a caller exists in the current graph.

**(e) `fn_relation_candidate(p_a, p_b)`** (plpgsql, 10.9 KB, composes `fn_relation_dependency_groups`, `fn_relation_composite_evidence`, `fn_relation_independent_evidence`, `fn_relation_noise_flags`). Measured: 4.2 s mean, about 200,000 buffer hits per call. The visible repeated work is in `fn_relation_dependency_groups`: for **every matched method** it runs `SELECT count(*) FROM bidim WHERE method = m.mth` **twice** (`method_population` and again inside `normalized_rarity`) plus two point counts. `EXPLAIN`: each population sub-plan is an `Index Only Scan using bidim_method_value`, estimated **12,550 index entries, cost 3,510**, evaluated twice per matched row (SubPlans 2 and 4). `bidim` is 364k rows / 173 MB over 29 methods (about 12.5k rows per method), only **62.4 % of its pages are all-visible** (autovacuum has never run on it: `last_autovacuum` null), and the table statistics (window length unknown) show **no inserts, updates or deletes** on it, i.e. it behaves as a static corpus. I could not isolate how much of the 4.2 s these counts account for (that needs `EXPLAIN (ANALYZE, BUFFERS)` on a disposable copy; the composite engine `fn_composite_calc_all_ops` calls `fn_dispatch_method` per composite method and phrase and may be a second hot spot). Proposal in three independent steps:

```sql
-- RECOMMENDATION - not applied
-- 1) maintenance, no semantic change (non-blocking): lets index-only scans skip the heap
vacuum (analyze) public.bidim;

-- 2) population per method is a 29-row fact of a static corpus
create materialized view if not exists public.bidim_method_population as
  select method, count(*)::bigint as population from public.bidim group by method;
create unique index if not exists bidim_method_population_pk on public.bidim_method_population (method);
-- refresh: only when bidim is (re)loaded -> refresh materialized view concurrently public.bidim_method_population;

-- 3) in public.fn_relation_dependency_groups, replace the final SELECT by joins (same result columns, same row count:
--    matched rows join exactly one population row and one frequency row)
--    ... , pop as (select method, population from public.bidim_method_population),
--          freq as (select x.method, x.value, count(*) as raw_frequency
--                     from public.bidim x join matched m on m.mth = x.method and m.val = x.value
--                    group by x.method, x.value)
--    SELECT m.mth, m.val, c.group_repr, bool_or(gm2.order_sensitive) OVER (PARTITION BY c.group_repr),
--           f.raw_frequency, p.population,
--           round(f.raw_frequency::numeric / NULLIF(p.population, 0), 6)
--      FROM matched m JOIN closure c ON c.c_method = m.mth
--      JOIN gematria_methods gm2 ON gm2.method_key = m.mth
--      JOIN pop p ON p.method = m.mth JOIN freq f ON f.method = m.mth AND f.value = m.val;
```

A variant that keeps the population inline (`pop as (select x.method, count(*) … where x.method in (select mth from matched) group by x.method)`) was planned and still shows the 12,550-entry scan once per distinct method (cost 3,667): it halves the work, the materialised view removes it. **Risk: medium.** `fn_relation_candidate` is a canonical engine function (CLAUDE.md: Gematria numerics are authoritative only from registered engines); a change needs the owner's Human Gate and a differential test over the stored pairs, and the materialised view must be refreshed whenever `bidim` changes. **Priority is low until real traffic exists** (§7.1: zero site calls in 48 h); step 1 is harmless and can go first.

### 7.3 Advisor findings (`advisors-performance.json`, 2026-11-07T09:36Z)

| Lint | Count | Verdict | Benefit |
|---|---|---|---|
| `unindexed_foreign_keys` | 46 | 13 are on tables over 1 MB; only `research_contributions.author_contributor_id` has a measured read path (§7.2c). The rest protect cascade and delete checks on tiny tables | low |
| `unused_index` | 155 (151 non-unique/non-PK in `public`, **68 MB**) | idx_scan = 0 over an **unknown stats window**; the cost is write amplification and 3 % of the 2.1 GB database, not read latency | none for readers |
| `auth_rls_initplan` | 64 | The planner **already hoists** the admin `EXISTS (select … users where id = auth.uid())` into an `InitPlan` (verified: `gematria_words` as `anon` shows `InitPlan 1`), so the warning is a pattern match for those. The only real per-row cost verified is `rc_public_read` (`author_user_id = auth.uid()` expands to two `current_setting()` calls per candidate row, about 9,461 rows) | negligible |
| `multiple_permissive_policies` | 45 | each extra permissive policy is OR-ed per row on small tables | negligible |
| `duplicate_index` | 2 | `idx_tv_words` (9.3 MB, **0 scans**) duplicates `tv_words_gin` (10 MB, 2,310 scans); `discoveries_keyval_idx` and `idx_discoveries_key_value` (16 kB each, 0 scans) | disk only |
| `no_primary_key` | 31 | backup tables and monthly `events_*` partitions; not a read-path issue | none |

**Foreign-key indexes (RECOMMENDATION, not applied).** All 46 statements generated from `pg_constraint` (`create index concurrently` cannot run inside a transaction/migration block; apply one by one). Sizes are `pg_total_relation_size` of the table; the ones with a read path are marked.

```sql
-- > 1 MB tables (apply first, if at all)
create index concurrently if not exists idx_research_object_revisions_successor_id on public.research_object_revisions (successor_id);          -- 95 MB
create index concurrently if not exists idx_research_objects_parent_id on public.research_objects (parent_id);                                  -- 53 MB
create index concurrently if not exists idx_research_contributions_graph_node_id on public.research_contributions (graph_node_id);              -- 38 MB
create index concurrently if not exists idx_research_contributions_projected_insight_id on public.research_contributions (projected_insight_id); -- 38 MB
create index concurrently if not exists idx_research_contributions_author_contributor_id on public.research_contributions (author_contributor_id); -- 38 MB, READ PATH (7.2c)
create index concurrently if not exists idx_gematria_words_created_by on public.gematria_words (created_by);                                   -- 38 MB
create index concurrently if not exists idx_gematria_words_node_id on public.gematria_words (node_id);                                         -- 38 MB
create index concurrently if not exists idx_op_trace_spans_parent_span_id_trace_id on public.op_trace_spans (parent_span_id, trace_id);        -- 31 MB
create index concurrently if not exists idx_transform_pairs_operator_code on research.transform_pairs (operator_code);                         -- 20 MB
create index concurrently if not exists idx_nodes_gallery_id on public.nodes (gallery_id);                                                      -- 10 MB
create index concurrently if not exists idx_raw_gematria_promoted_word_id on public.raw_gematria (promoted_word_id);                            -- 3.5 MB
create index concurrently if not exists idx_decision_ledger_reason_code on public.decision_ledger (reason_code);                                -- 1.9 MB
create index concurrently if not exists idx_contributors_user_id on public.contributors (user_id);                                              -- 1.1 MB
-- < 1 MB tables (no read benefit; cascade/delete checks only; batch or skip)
create index concurrently if not exists idx_els_records_owner_user_id on public.els_records (owner_user_id);
create index concurrently if not exists idx_research_candidates_node_id on public.research_candidates (node_id);
create index concurrently if not exists idx_research_candidates_decision_id on public.research_candidates (decision_id);
create index concurrently if not exists idx_translit_suggestions_word_id on public.translit_suggestions (word_id);
create index concurrently if not exists idx_channel_update_group_proof_source_id on public.channel_update_group_proof (source_id);
create index concurrently if not exists idx_channel_update_group_proof_identity_contributor_id on public.channel_update_group_proof (identity_contributor_id);
create index concurrently if not exists idx_research_path_revisions_path_id_parent_revision_id on public.research_path_revisions (path_id, parent_revision_id);
create index concurrently if not exists idx_news_gematria_insight_id on public.news_gematria (insight_id);
create index concurrently if not exists idx_payment_requests_package_id on public.payment_requests (package_id);
create index concurrently if not exists idx_family_claims_reviewed_by on public.family_claims (reviewed_by);
create index concurrently if not exists idx_family_claims_issuer_owner_id on public.family_claims (issuer_owner_id);
create index concurrently if not exists idx_word_review_queue_submitted_by on public.word_review_queue (submitted_by);
create index concurrently if not exists idx_research_paths_parent_path_id_branch_point_revision_id on public.research_paths (parent_path_id, branch_point_revision_id);
create index concurrently if not exists idx_word_review_queue_entity_word_id on public.word_review_queue (entity_word_id);
create index concurrently if not exists idx_gallery_posts_uploaded_by on public.gallery_posts (uploaded_by);
create index concurrently if not exists idx_contribution_events_user_id on public.contribution_events (user_id);
create index concurrently if not exists idx_research_challenges_solution_contribution_id on public.research_challenges (solution_contribution_id);
create index concurrently if not exists idx_wa_account_links_user_id on public.wa_account_links (user_id);
create index concurrently if not exists idx_account_link_offers_primary_user_id on public.account_link_offers (primary_user_id);
create index concurrently if not exists idx_els_finds_user_id on public.els_finds (user_id);
create index concurrently if not exists idx_account_link_events_offer_id on public.account_link_events (offer_id);
create index concurrently if not exists idx_subscriber_payments_subscriber_id on public.subscriber_payments (subscriber_id);
create index concurrently if not exists idx_hd_gates_center_id on public.hd_gates (center_id);
create index concurrently if not exists idx_hd_channels_gate_a on public.hd_channels (gate_a);
create index concurrently if not exists idx_hd_channels_gate_b on public.hd_channels (gate_b);
create index concurrently if not exists idx_learned_patterns_superseded_by on public.learned_patterns (superseded_by);
create index concurrently if not exists idx_learned_pattern_members_decision_id on public.learned_pattern_members (decision_id);
create index concurrently if not exists idx_hot_research_node_events_node_id on public.hot_research_node_events (node_id);
create index concurrently if not exists idx_word_tags_tag_id on public.word_tags (tag_id);
create index concurrently if not exists idx_pattern_contradictions_pattern_b on public.pattern_contradictions (pattern_b);
create index concurrently if not exists idx_pattern_contradictions_pattern_a on public.pattern_contradictions (pattern_a);
create index concurrently if not exists idx_referrals_inviter_id on public.referrals (inviter_id);
create index concurrently if not exists idx_discovery_tags_tag_id on public.discovery_tags (tag_id);
```

Risk (all): `CREATE INDEX CONCURRENTLY` does not block writes; a failed build leaves an `INVALID` index to drop; each index adds write cost (largest: 3 new indexes on the 38 MB `research_contributions` table). Rollback: `drop index concurrently if exists <name>;`. Approval: DB change (Supabase confirmation).

**Duplicate and unused indexes (RECOMMENDATION, not applied).** Do **not** drop the 151 in bulk (the scan counters have no known window and a rare admin flow may use one). The defensible subset:

```sql
drop index concurrently if exists public.idx_tv_words;               -- exact duplicate of tv_words_gin (keep tv_words_gin: 2,310 scans); frees 9.3 MB
drop index concurrently if exists public.discoveries_keyval_idx;     -- exact duplicate of idx_discoveries_key_value; frees 16 kB
-- candidate only after confirming no phrase ILIKE/trigram search uses it (0 scans): public.bidim_phrase_trgm (22 MB), public.idx_gi_desc_trgm (6.7 MB)
```

The next largest zero-scan indexes (`research_object_revisions_identity_idx` 4.0 MB, `op_trace_spans_kind_started_idx` 3.0 MB, `idx_gematria_phrase` 2.5 MB, the `events_2026_11_sod_id_ts_idx` partition index 1.7 MB) belong to partitioned or audit tables: leave.

**RLS init-plan (RECOMMENDATION, not applied).** Generated from `pg_policies` for the tables over 1 MB (`(select auth.uid())` form; semantics identical). The rest (about 55 policies on tables under 1 MB) are not worth a migration; the generator query is in §10.

```sql
alter policy ro_revisions_admin_read on public.research_object_revisions using ((exists (select 1 from users u where ((u.id = (select auth.uid())) and (u.role = 'admin'::text)))));
alter policy ro_admin_read on public.research_objects using ((exists (select 1 from users u where ((u.id = (select auth.uid())) and (u.role = 'admin'::text)))));
alter policy posts_admin_write on public.posts using ((exists (select 1 from users u where ((u.id = (select auth.uid())) and (u.role = 'admin'::text))))) with check ((exists (select 1 from users u where ((u.id = (select auth.uid())) and (u.role = 'admin'::text)))));
alter policy rc_public_read on public.research_contributions using (((status = 'approved'::text) or (author_user_id = (select auth.uid()))));
alter policy "admin קורא מוצפן" on public.gematria_words using (((is_encrypted = true) and (exists (select 1 from users where ((users.id = (select auth.uid())) and (users.role = 'admin'::text))))));
alter policy gw_admin_insert on public.gematria_words with check ((exists (select 1 from users u where ((u.id = (select auth.uid())) and (u.role = 'admin'::text)))));
alter policy ua_select_own on public.user_activity using ((user_id = (select auth.uid())));
alter policy ua_insert_own on public.user_activity with check ((user_id = (select auth.uid())));
alter policy contributors_read on public.contributors using (((coalesce((dossier_settings ->> 'visibility'::text), 'public'::text) <> 'private'::text) or (user_id = (select auth.uid())) or (exists (select 1 from users u where ((u.id = (select auth.uid())) and (u.role = 'admin'::text))))));
```

Risk: `ALTER POLICY` is instantaneous and keeps the predicate; a typo changes access control, so each must be diffed against `pg_policies` (and this is a security surface under the S2 inventory: **needs ZURIEL**). Benefit measured: negligible except `rc_public_read`.

### 7.4 `statement_timeout` and 8 s ceiling

The maxima of 7.9-8.0 s in §7.0 are the role-level `statement_timeout=8s` set on `authenticator` and `authenticated` (read from `pg_roles`; the global setting is 120 s). Every slow RPC above therefore fails as a 500/57014 rather than slowing down indefinitely; real users see it as a blank widget or a 503 `/video` page (64 errors on 11-06 06:54-07:01Z).

### 7.5 RECOMMENDATION (not done): stop CI/agent traffic from using the production API (SBR-13)

Evidence: §1.3 item 2 and §7.1. In window A, local-preview/CI runs produced 56 % of all Supabase API requests, 55 % of the summed origin time, 1,380 `fn_relation_candidate` calls (96 min of single-core DB time), 312 `writer_public_contributions_page_v1` calls and 6,853 + 4,214 telemetry POSTs. The Release Visual spec has a fail-closed egress guard on the RC; **the other Playwright gates have none**. Proposal: the same default-deny egress guard (or a stubbed Supabase origin) for the remaining browser gates, so that `*.supabase.co` is unreachable from `127.0.0.1` runs, with an allow-list for the tests that must exercise the real API. This is a **workflow/gate change** (`.github/workflows/*`, spec hooks), hence only recommended here; a `ci_wiring` entry cannot be offered because no code was changed. Expected: removes more than half of the weekday API load and 100 % of the observed `fn_relation_candidate` load. Effort M, risk low-medium (tests that implicitly relied on live data will fail loudly), **needs ZURIEL approval for the workflow edits**.

## 8. Third-party scripts

| Script | Where | Measured | Assessment |
|---|---|---|---|
| OpenWeb / Spot.IM launcher `launcher.spot.im/spot/sp_OVtajBTj` | injected by `loadOpenWeb()` (`src/lib/openweb.js:30-39`, called from a `useEffect` on 5 community routes); `async`, after mount; then loads further OpenWeb assets and a WebSocket | launcher **21,645 B (br)**, `cache-control: max-age=300`, 418 ms from the sandbox | already async and post-mount, so it does not block first paint. `/community/chat` is the slowest *frequent* route in the field (LCP p75 4,654 ms, 29 % of all loads) but **RUM cannot attribute the LCP element or the OpenWeb share**; do not assume it is the cause. A `preconnect` for `launcher.spot.im` on community routes only is a possible micro-gain (unmeasured). The 5-minute TTL is the vendor's. |
| YouTube / Vimeo embeds | `VideoAssetPage.jsx` (poster + click facade, `autoplay` iframe only after click, good), `Campaign718Page2029.jsx` (`loading="lazy"` iframe, `youtube-nocookie.com`) | not measured (cross-origin player JS is typically several hundred KB) | `/melech-hamisparim/718` had 1 RUM load in 7 days. A click-to-load facade like the one in `VideoAssetPage` would remove the player weight for visitors who never press play; low value at this traffic. |
| cdnjs `three` (static pages) | static documents other than Heichal (`book.html`, `kolombia.html`, `preview.html`, the two 1237 previews) contain no CDN script. Heichal skipped (out of scope). | n/a | no recommendation. |
| Google Fonts (IBM Plex Mono) | `2029.html` | §6.2 | self-host. |
| Google Analytics | allow-listed in CSP `connect-src`; "by design, 5 routes" (DEF-011) | not measured | n/a |

## 9. Ranked recommendations

Gain = expected user-visible effect (basis in parentheses); effort XS/S/M/L; **every item requires explicit ZURIEL approval** (CLAUDE.md: production change, merge and deploy are separate approvals; DB changes also need the Supabase confirmation).

| Rank | Recommendation | Expected user-visible gain | Effort | Risk | Approval / what changes |
|---|---|---|---|---|---|
| 1 | **§6.1 cache headers for first-party static files**: port the 12 existing, tested post-background rules from the root `vercel.json` to the deployed one, add `/fonts/*` and `/brand/*` | repeat views save about 100-160 KB and 4-8 requests per hard load; preloaded fonts and the post background stop being refetched (measured: all `no-store` today) | XS | low | production deployment; `public-reading-deploy/vercel.json` headers (no existing pin breaks; config hash changes) |
| 2 | **§7.5 stop CI/agents using the production API** | removes 56 % of weekday API requests, 55 % of origin time and all observed `fn_relation_candidate` load (36 % of 10-day DB time); indirect protection against the 8 s timeouts users see | M | low-medium | workflow/spec edits (gate change); no product change |
| 3 | **§2.3 document CDN caching, Variant A first** (`Cache-Control: no-store` kept for browsers, `Vercel-CDN-Cache-Control` added; data routes with 60 s + 120 s; shell routes optional) | per HIT: `/post` server wait -0.26 s (fast mode) or -0.66 s (slow mode), mean -0.47 s; `/number/:n` mean -0.79 s; shell routes only -0.03 s. Field upper bound for `/post` at a 100 % hit ratio: TTFB p50 -0.27 s, p75 -0.58 s (difference to `/`), LCP p75 at most about -0.5 s. **The realised gain is that times the hit ratio, probably low for the long tail** (about 93 `/post` hard loads a day over 1,320 posts). Replaces revision 1's "775 to about 150-300 ms, `/number` about 1 s, LCP -1 s", which no measurement supports | M | **medium** (degraded 200s, per-visitor cookies, takedown latency, hit ratio; all testable on a protected Preview) | handler change; Variant A: no pin change (337/337 `test/public-*` pass with the header added), Variant B: 2+ pin changes (gate); protected-Preview proof of the CDN behaviour first; production deployment |
| 4 | **§2.4 `Promise.all` for the two `/number/:n` reads and `content` only when needed** | `/number/:n` server wait about -0.25 s typically (26 of 30 lab samples), -0.64 s when both reads are slow, mean about -0.3 s (model-derived from the lab clusters); `/number/*` is about 5 % of field loads. Replaces revision 1's "about -0.5 s" | XS | low | code change in `api/og.js`, deploy |
| 5 | **§7.2a video materialised view** (SQL already written) + `SOD_VIDEO_ASSETS_MV=1` | `/video/:id` DB time 1.3-2.9 s to milliseconds; sitemap cold build -4-5 s; fewer 500s | S | low-medium (new relation + cron, 5 min freshness) | DB change + production env var |
| 6 | **§5 S3 + S1/S2: `/assets` out of the function; Skew Protection** | no more 9-25 function calls per stale tab; with S1+S2 no stale-chunk blank screen after deployments | S (S3), M (S1+S2) | low-medium (routing pin edits; cookie vs §2.3) | `vercel.json` routing change (pins), project setting, handler |
| 7 | **§6.2 self-host IBM Plex Mono** | 2 fewer third-party connections, no CSS hop for the numeric font; no LCP effect | S | low-medium (artifact hash change; bundle with a planned deploy) | production deployment |
| 8 | **§4 `/api/card`: bound and constrain the render** (after DEF-015 ships) | removes the 300 s hang class (5 per 72 h); WhatsApp/Facebook previews no longer wait | S | low | code change, deploy |
| 9 | **§3 sitemap cold build about 13 s (median of 31 reconstructed generations) to about 5-7 s, estimate** (larger `PAGE`, wider waves, parallel PDF probes; with #5) | Googlebot meets a cold MISS after each deployment; header is already correct | S | low | code change, deploy |
| 10 | **§7.2b `site_pulse_today` sargable predicates** | home "pulse" counter DB cost 30,083 to 297 (plan estimate); few real calls today | XS | low | DB function change |
| 11 | **§7.2c `writer_public_contributions_page_v1`: two indexes + `UNION ALL`** | contributor dossier DB time 1.4 s mean to expected tens of ms (plan -30 % without indexes; rest predicted) | S | low-medium (result equivalence) | DB change |
| 12 | **§7.2e `fn_relation_candidate`: `VACUUM` + population table + join rewrite** | none for real users today (0 site calls in 48 h); large DB-time saving only if the path gets real traffic | M | **medium** (canonical engine, Human Gate) | DB change + owner decision |
| 13 | **§7.2d `contributors_feed` indexes** | none today (0 calls) | XS | low | DB change |
| 14 | §7.3 FK indexes (46), duplicate-index drops, RLS init-plan, unused indexes | no read-latency gain except `research_contributions.author_contributor_id` (in #11); housekeeping | S-M | low (indexes) / medium (policies are a security surface) | DB change; policies need the S2 inventory owner |
| 15 | §8 YouTube facade, OpenWeb `preconnect` | unmeasurable at current traffic | XS | low | code change |

## 10. Reproduction (read-only)

Field baseline (§1), one row per page load:

```sql
with base as (
  select distinct on (props->>'sample_id') props, path, app_context
  from public.events
  where event_type = 'web_vital' and ts >= now() - interval '7 days'
  order by props->>'sample_id', (props->>'phase' = 'final') desc, ts desc)
select case when path = '/' then 'home' when path ~ '^/post' then 'post' when path ~ '^/community' then 'community'
            when path ~ '^/number' then 'number' when path ~ '^/(gematria|world)' then 'gematria+world' else 'other' end grp,
       count(*) n,
       percentile_cont(array[.5,.75,.95]) within group (order by (props->>'lcp_ms')::numeric) lcp,
       percentile_cont(array[.5,.75,.95]) within group (order by (props->>'cls')::numeric) cls,
       percentile_cont(array[.5,.75,.95]) within group (order by (props->>'ttfb_ms')::numeric) ttfb
from base group by rollup(1);
```

DB load: `select query, calls, mean_exec_time, max_exec_time, total_exec_time from pg_stat_statements order by total_exec_time desc limit 20;` (stats reset 2026-10-28 02:13Z). CI share (Supabase `query_logs`, ClickHouse): group `source = 'edge_logs'` by `multiIf(referer like 'http://127.0.0.1%' or referer like 'http://localhost%', 'ci-local', referer like '%sod1820%', 'site', …)`, summing `response.origin_time`. Origin latency by colo: `quantile(0.5)(toFloat64OrZero(log_attributes['response.origin_time']))` grouped by `request.path`, `request.cf.colo` for `user_agent like 'node%'`. Live headers: `curl -sS -D - -o /dev/null -A '<ua>' https://sod1820.co.il/<path>` (use a browser-like user agent; the default `curl` agent receives a 403 on documents). RLS plan check: `begin; set local role anon; explain select …; rollback;`. RLS statement generator: `select format('alter policy %I on public.%I …', policyname, tablename)` over `pg_policies` with `regexp_replace(qual, 'auth\.(uid|jwt|role|email)\(\)', '(select auth.\1())', 'g')`.

**Revision 2 additions (all read-only).** Lab timing (§2.2a): `curl -sS -o /dev/null -A '<browser UA>' -w '%{time_appconnect} %{time_starttransfer}' https://sod1820.co.il<route>`, 15 rounds per batch, the route order rotated every round, 1 s apart, a new connection per request; wait = starttransfer minus appconnect. CDN-HIT floor: the same for `/fonts/Rubik-Latin.woff2` and `/brand/2029/canonical-lockup-128.webp`. Origin-time distribution (§2.2b), Supabase `query_logs`: `quantile(0.25|0.5|0.75|0.9)(toFloat64OrZero(log_attributes['response.origin_time']))` and the histogram `floor(origin_time/50)*50`, over `source = 'edge_logs'`, `log_attributes['request.headers.user_agent'] like 'node%'`, `log_attributes['request.cf.colo'] = 'IAD'`, `log_attributes['request.path'] in ('/rest/v1/posts', '/rest/v1/number_anchors', '/rest/v1/rpc/is_number_indexable', '/rest/v1/rpc/is_phrase_indexable')`. Sitemap generations (§3): the same filter with `request.path in ('/rest/v1/posts', '/rest/v1/contributors')` and `request.search like '%limit=1000%offset=0%'`, plus `/rest/v1/rpc/sitemap_numbers`, ordered by `timestamp`; span = timestamp(contributors) + origin_time(contributors) - timestamp(first posts page). Field comparison (§2.2c): the query above with `percentile_cont(array[.25,.5,.75,.9,.95])` over `ttfb_ms` and `count(*) filter (where props->>'phase' = 'final')`. Plans (§7.2a): `explain select * from public.video_media_assets_v1 where public_id = md5('youtube:abcdefghijk');` and the `api/og.js:753` column list with `limit 1`. Pin experiment (§2.3): `git worktree add --detach <dir> e7865363e`, add the header in `public-reading-deploy/api/public-document.js`, `node scripts/build-public-reading-production.mjs`, `node --test test/public-*.test.mjs scripts/test-public-reading-main-release-contract.mjs`; compare with the unmodified tree; remove the worktree.

## 11. What was not measured

- Real-user numbers from Israel for TTFB/handshake effects (all live timings are from a US sandbox vantage point through an agent proxy; document timings are 30 samples per route and bimodal, so they bound a distribution, they do not give one number).
- **Why a Supabase read is fast (about 0.23 s) or slow (about 0.63 s).** The connection-reuse hypothesis of §2.2b is not tested; the share of slow reads varied from 43 % to 62 % per 3-hour block and its driver (traffic, instance churn, deployments, the gateway) is unknown.
- Whether the platform stores a document whose `Cache-Control` is `no-store` when `Vercel-CDN-Cache-Control` is present (Variant A), and whether a function-set `Cache-Control` and per-visitor `Set-Cookie` behave as assumed after a CDN HIT (both need a protected Preview). The pin experiment proves only that the test suite is unaffected, not any CDN behaviour.
- The CDN hit ratio for documents (about 93 `/post` hard loads a day over 1,320 posts suggests it is low for the long tail).
- Which part of the field route-group differences is the read and which is the population (device, network, country, hour): `/community/*` makes no `og.js` read yet sits above `/`; the lab is the only isolating measurement.
- The sitemap cold-build distribution beyond the 31 reconstructed spans (they are a lower bound that excludes start-up and XML assembly); the cold build itself was sampled once per observer.
- The share of the 4.2 s of `fn_relation_candidate` spent in the population counts versus the composite engine (needs `EXPLAIN (ANALYZE, BUFFERS)` on a disposable copy).
- Plan quality *after* any proposed index (none was created); the "predicted" figures are derived from plan-node costs of the current plans.
- Skew Protection plan eligibility and cost; Vercel per-path request counts (observability query returned 400).
- Third-party runtime weight (OpenWeb after launcher, YouTube player) and the LCP element per route.
- Device split of the web-vitals (not recorded).
