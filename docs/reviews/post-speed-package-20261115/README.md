# Post page speed package (mobile first) — 15 November 2026

Task key `POST_MOBILE_SPEED_PACKAGE_20261115`. Improvement package: Claude. Measurement implementation and admin reports stay with Codex and are not touched. **Branch-only evidence and one consolidated release request. Nothing here is merged, deployed or applied: no database, flag, alias, setting or secret was changed.** A merge is not a deployment; the exact commits and the exact deployment need ZURIEL's explicit approval (CLAUDE.md rule 7 and section 0.4); merge and deployment are centralized at Codex after review.

- Base: `origin/main` `c2acc064be31df93a229637bc32305a951c8006b` (#1356). Live production when the task started: `dpl_J2wg6mqptCp8vFkfDbxz31dtHzoH`, same source SHA; re-read before this document was finalized (section 10).
- Goal (ZURIEL): shorten the time until the content of a post page is visible and usable on a phone. Everything below keeps **lab** measurements apart from **field** (real-user) data and never presents the first as proof of the second.

## 1. Result in one table

**What this is.** Four independent, branch-only packages (A server document reads, B early read at the original address, C third-party scripts after the article and its cover, D cache rules for static files) aimed at the three bottlenecks the measurements found, plus one optional package (C2, ad library on approach) that was measured and is left out of the request. One consolidated release request is in section 9. **The numbers below are laboratory numbers** (an emulated Pixel 7 on Slow 4G with a 4x CPU slowdown unless a row says otherwise): they say nothing yet about real visitors. Section 3 shows why no mobile field figure exists and what is measured instead.

**The three bottlenecks** (section 5-6): (1) the document and the static files: an old post's document waits for two sequential Supabase reads, and fonts, brand images and the Post background are `no-store` in the deployed configuration, so every visit downloads them again; (2) a post at its original address (the larger and slower population in the field) starts reading its data only after its page code has downloaded and mounted, about 3.8 s later than a post at `/post/<slug>`; (3) the Google tag, the Pixel and the ad library compete with the page code for the same connection and main thread. The enrichment compute and the images before the text are not bottlenecks (section 5).

**Result for the proposed tree** (A+B+C1+C3+D merged, section 9) against `main` built the same way, interleaved runs, medians; `***` p<0.01, `*` p<0.05:

| content visible, cold, Slow 4G + 4x CPU: change against main (ms) | O1 old, image first | O3 old, medium | N3 new, medium | N5 new, long |
|---|---|---|---|---|
| main, same series as the proposed tree (median, ms) | 7,464 | 7,544 | 6,851 | 6,963 |
| **B** alone: early read at the original address (n=10 vs 5) | −333 *** | −257 *** | +60 (n.s.) | +48 (n.s.) |
| **proposed tree** A+B+C1+C3+D (n=5 vs 5) | −936 *** | −1,014 *** | −664 *** | −668 *** |
| earlier tree A+B+C1+C2+D (n=10 vs 10; the new posts N3/N5 isolate C) | −988 *** | −1,014 *** | −764 *** | −717 *** |

`***` p<0.01, `*` p<0.05, `(n.s.)` not significant (two-sided Mann-Whitney on the runs; n is per arm). A (server) and D (cache headers) do not act on a cold lab load; see the next table.

| proposed tree against main, change in ms | O1 | O3 | N3 | N5 |
|---|---|---|---|---|
| Cold, Slow 4G: first paint (FCP) (n=5 vs 5) | −24 (n.s.) | +4 (n.s.) | +20 (n.s.) | +4 (n.s.) |
| Cold, Slow 4G: blocking time in the 3.5 s after the text (n=5 vs 5) | +75 (n.s.) | +114 (n.s.) | −93 * | +28 (n.s.) |
| Cold, Regular 4G + 4x CPU: content visible (n=6 vs 6) | −480 *** | −519 *** | −192 * | −258 *** |
| Cold, Regular 4G: LCP (n=6 vs 6) | −484 *** | −512 *** | −166 (n.s.) | −152 * |
| Cold, Regular 4G: blocking time (n=6 vs 6) | −14 (n.s.) | +57 (n.s.) | +2 (n.s.) | +4 (n.s.) |
| Cold, Slow 4G, 14 s window: LCP (uncensored) (n=4 vs 4) | −1,652 * | −1,972 * | −998 * | −2,840 * |
| Returning visitor, Slow 4G: content visible (n=5 vs 5) | −330 (n.s.) | −144 (n.s.) | +6 (n.s.) | +6 (n.s.) |
| Returning visitor: first paint (FCP) (n=5 vs 5) | −64 (n.s.) | −52 (n.s.) | −24 (n.s.) | −96 * |
| Returning visitor: KB transferred before the text (n=5 vs 5) | −88 *** | −91 *** | −117 *** | −117 *** |
| Desktop 10 Mbps, cold: content visible (earlier tree, with C2) (n=5 vs 5) | n/a | −365 *** | −147 *** | n/a |
| Desktop, cold: LCP (earlier tree) (n=5 vs 5) | n/a | −332 *** | −280 *** | n/a |
| In-app navigation home to post: content visible (earlier tree) (n=5 vs 5) | n/a | −72 (n.s.) | −44 (n.s.) | −18 (n.s.) |

**What did not improve, shown in full in section 8:** first paint (FCP) does not move on a cold load in any series; B does nothing for `/post/<slug>` (as designed); D alone does not shorten the time to the text, it saves 80-109 KB and about 0.1 s of first paint on a returning visit; the in-app navigation from the home page is unchanged; blocking time is mixed (better on some posts, slightly worse on others once C3 is in); C3 makes one video post's LCP 148 ms later on Regular 4G; package A cannot be seen in the lab tables, because the lab models the document delay as a constant, and is therefore proved by a separate server measurement (section 7-A); the repeat-visit series of the first lab version ran without a working HTTP cache and is reported as such; preloading the route graph or the LCP image from the document was measured and rejected.

**Decisions left to ZURIEL (section 11):** whether to release now or in two stages; whether the later start of the Google tag and the Pixel (about 0.1-0.5 s after the text instead of while the page loads) is acceptable for the analytics counts (Codex sign-off); the ad-library timing (#1364, optional); and the larger items that are finished only on old branches or recommended only (middleware existence check, document CDN cache, function region, source-first rendering, media deferral, font preloads).

## 2. How it was measured, and how far it can be trusted

**Fixed sample** (`data/sample-posts.json`): five old WordPress posts at their original address `/<slug>` (O1 the top Search Console page, image first; O2 very short with a video; O3 medium; O4 long; O5 very long) and five new posts at `/post/<slug>` (N1 short, no image; N2; N3 medium with video and transcript; N4 long; N5 the reference post of #1345/#1346). The A/B series uses O1, O3, N3, N5 on a phone and O3, N3 on a desktop; the other posts were recorded for the baseline and the live probes.

**Lab** (`tools/lab2.mjs`, `tools/lab3.mjs`, `tools/labserver2.mjs`; configurations are written by `tools/mkcfg.py`): Chromium 153 driven through Playwright/CDP, one fresh browser context per run, Israel time zone and the edge's human-browser cookie. Phone: Pixel 7 profile, **Slow 4G** (1.6 Mbps down, 750 Kbps up, 150 ms latency) with a **4x CPU slowdown**; a milder second profile, **Regular 4G** (9 Mbps, 1.5 Mbps, 60 ms, 4x CPU), is used where stated; desktop: 10 Mbps, 40 ms, no CPU slowdown. The tree under test is built with the production build (`scripts/build-public-reading-production.mjs`, production client identifiers) and served over HTTP/2 from a local server that applies the production headers of *that tree's* `public-reading-deploy/vercel.json` and brotli at the level that reproduces Vercel's transfer sizes (entry 120.9 KB here, 121.2 KB live). Supabase is answered from a record-on-miss replay of real, read-only responses plus 250 ms of modelled time; the document is delayed 900 ms (new posts) or 1,300 ms (old posts), the live medians of the server wait plus connection; third-party scripts are served from recorded copies, and every beacon, ad request and write is refused. Nothing is sent to production analytics.

**Measured per run:** time to first byte, FCP, **content visible** (the post's title and a sentence of its body inside `<article>`, laid out), LCP and its element, long tasks (blocking time over the window up to 3.5 s after the content), CLS, every request with start, end and bytes, a main-thread profile by script. Statistics: medians with min-max and n; deltas are on medians; the p-value is a two-sided Mann-Whitney test (exact for these sample sizes) and is a guide, not a claim of independence between runs.

**Noise.** Two base arms measured 40 minutes apart differ by -114 to +119 ms in the median content time (n=5 per post); the two final base arms (n=5 each, 10 minutes apart) agree to within 130 ms. Differences under about 150 ms are not claimed. The A/B arms are interleaved in time (base, B, C1, C1+C2, integration, then the reverse; the final series: base, B, C, integration, integration, base) so that drift cancels.

**Validity against the live site.** Two narrow, sequential live checks (sandbox egress, same profile, no parallel load). First, early in the task, with the UTC time zone (no ad path) and third-party scripts blocked: content-visible medians of 6.47 s (N3), 7.35 s (N5), 7.66 s (O1) and 7.58 s (O3), against 7.06, 7.19, 7.57 and 7.89 s for the fixture base: within -2 % to +9 %. Second, at the end, the configuration visitors actually get (Israel time zone, the real Google, Meta and ad scripts allowed, beacons refused, n=3 per post, `data/live-baseline-il.json`): content visible 10.3 s (O1), 8.5 s (O3), 8.4 s (N3), 8.4 s (N5) and LCP 9.2-12.2 s, i.e. **1.4-2.8 s slower than the fixture base in the same profile**; the difference is the real third-party hosts and the live network path from the sandbox, which the fixture replaces with recorded copies served locally. So the lab tables are comparisons of builds under identical conditions, **not forecasts of absolute times**, and the first agreement holds only for the configuration without third parties. **The lab is a deliberately pessimistic emulation of a slow phone on a slow network, not a prediction for any visitor.**

**Limits of the instrument.** (1) No physical phone and no INP. (2) The local HTTP/2 server's prioritisation is simpler than the CDN's, so experiments that depend on priorities (preload hints) are not conclusive. (3) LCP of a run is *censored* when its largest image finishes after the observation window: the A/B series observes 3.5 s after the content (its primary metric is content visible), and a separate series with a 14 s window gives uncensored LCP (section 7). (4) **Repeat visits.** Request interception disables Chromium's HTTP cache, which made this task's first warm measurements invalid and unused; the later series run without interception. A second flaw was found while explaining why the fonts were fetched again in the warm series of package D: the lab browser was started with `--ignore-certificate-errors` for the lab server's self-signed certificate, and Chromium does not store responses of a connection with certificate errors in its HTTP cache (`tools/warm_probe.mjs`: with that setting a returning visitor re-downloaded all 63 scripts, 12 stylesheets, 4 fonts and the images). The "repeat visit in the same process" series therefore only reflects Blink's in-process memory cache and is reported as that. The returning-visitor series uses `tools/lab3.mjs`: the certificate is accepted by its public-key hash (`--ignore-certificate-errors-spki-list`, so there is no certificate error), the browser is closed and started again on the same profile between the two visits, and the probe shows the HTTP cache serving 65/65 scripts and 12/12 stylesheets on the base tree. Cold series are not affected (empty cache).

## 3. Field (real-user) data — kept separate from everything else

Source: `public.events` `surface='performance' event_type='web_vital'` (hard document loads only, one row per sample, `final` preferred), the last 14 days, read-only, excluding the windows polluted by synthetic browsers (2026-11-15 01:00-04:30 UTC, and from 13:20 UTC the lab and verification browsers of this task). **The device class is not recorded (`events.device` is NULL on every row), so no mobile p75 exists**; the rows are all devices and bot-filtered on the client.

| kind of page | n | TTFB p50 / p75 (ms) | FCP p50 / p75 | LCP p50 / p75 | CLS p75 | INP p75 |
|---|---|---|---|---|---|---|
| post at `/post/<slug>` | 400 | 927 / 1,857 | 2,295 / 3,172 | 4,356 / 5,818 | 0.008 | 186 |
| **post at its original address `/<slug>`** | 568 | **1,265 / 2,371** | 2,554 / 3,488 | 4,220 / **6,269** | 0.001 | 230 |
| other pages | 2,569 | 697 / 1,304 | 1,212 / 1,964 | 2,292 / 3,700 | 0.051 | 248 |
| post library index | 73 | 410 / 739 | 660 / 1,088 | 1,128 / 1,796 | 0.000 | 170 |

What the field says: posts at the **original address are the larger population (568 of 968 post loads) and the slower one** (TTFB +338 ms at p50, +514 ms at p75 against `/post/`); the document wait is about a third of the LCP at p75; CLS and INP are not the problem. (Raw file `data/field-rum-20261115.json`; the cohort definition differs from the archaeology report's section 7.4, whose 14-day all-post p75 LCP was 5,995 ms.) **Nothing in this package is claimed to improve these numbers until they are measured after an approved release** with the protocol of section 9.

## 4. What the earlier speed work did, and where it stands today

What the earlier speed work (14 Oct - 15 Nov 2026) did and where it stands today, so that nothing is built twice. Full tables with every SHA, PR and deployment are in `archaeology/archaeology-git-prs.md` (Git, PRs, deployments) and `archaeology/archaeology-handoffs.md` (journal, documents, field data); the rows marked (verified) were re-checked by the package author against the code or the live site, the rest are the agents' reading.

**Structure that explains most of it.** Main has no commits between 26 Oct and 4 Nov: the whole 2029 line reached main in one squash, #1191 (991 commits). The October "performance waves" (`gpt/perf-*`, `claude/perf-*`, the Hybrid stage preview) were never merged and never in production; the 2029 line re-implemented a subset of their ideas, and production ran the Legacy site until the 4 November cutover. So the subject of an October `perf(...)` commit mostly describes code that is **not** in main.

| status today | item (purpose; where; when it reached production) |
|---|---|
| **LIVE** | entry `modulepreload` before the worker bootstrap (#1262, 8 Nov) · numeric-font CSS made non-blocking (6cd64a795, 4 Nov) · Supabase `preconnect` (#1262) · royal opening shell for first paint (#1272) · first-load JS trims, -47 KB on `/post` (#1262) · Realtime/Phoenix out of the entry (F20, CI wiring #1228) · explicit post columns (#1262) · anonymous read de-duplication + 30 s memo (#1262) · footer hidden while loading + footer reserve for CLS (#1220, #1262) · cover `eager`/`fetchpriority=high` (#1262) · stale-chunk recovery (#1262) · native media loading (#1299) · public RUM collector (#1198, first data 5 Nov) · Post background requested after the source is admitted (#1345) · independent enrichment reads overlap (#1346) · smaller reader graph (36c79e281, 5245f38e6) |
| **LIVE, but only partly** | Post code prefetched once Home's module has loaded - only for navigations that start on Home (d13233577). **Route-owned read overlapped with the component download - `/post/:slug` only; `/:slug`, the address of every imported post, still reads after its code** (verified; package B) |
| **REMOVED / INERT** | immutable headers for the 12 versioned backgrounds exist only in the root `vercel.json`; production builds from `public-reading-deploy/vercel.json`, which has none, so fonts, brand images and backgrounds are `no-store` (verified; package D) · Home document CDN window (#1249) removed by #1251 after two MISSes, so the "document CDN cache" idea was tried once and did not produce hits · font-preload trimming of 14 Oct (FCP -210 ms with two fonts) is not in main: all four fonts are preloaded |
| **BRANCH-ONLY** (finished, not in main; reuse needs ZURIEL's approval, CLAUDE.md 0.2) | source-first Post render, hero -27 % / LCP -19 % (4x CPU lab, FCP +168 ms), commits survive in `gpt/2029-hybrid-stage-preview-20261018` · Post body-media deferral (`gpt/perf-post-body-media-defer-20261018`) · responsive Supabase renditions for raw images (`claude/perf-post-media-p0-20261018-cwujt8`) · mobile reading-image rendition (`claude/pr1100-mobile-reading-image-20261014`) · **edge middleware: skip/bound the blocking `public_post_slug_exists` lookup, `claude/perf-post-middleware-f5-vmwq1d@9ed573364`, 18 tests, blocked on the soft-404 decision** · connection checks read `id,slug` (`perf/shared-load-main-20261013`) |
| **RECOMMENDED, never implemented** | document CDN cache (Variant A) · `og.js` concurrent reads and `content` only when needed (**package A covers the post path**) · static-file cache headers (**package D**) · self-host IBM Plex Mono · split the shell (229 KB frame JS/CSS) · image formats and a document-level LCP preload · Skew Protection · RUM LCP element + build id (Codex) · Number server projection |

**Regressions and gaps found, and what happened to each**

| # | finding | evidence | outcome |
|---|---|---|---|
| RG1 | backgrounds, fonts and brand images are re-downloaded on every hard load; the guard test reads the wrong config | verified | **package D** |
| RG2 | the early Post read does not reach `/:slug` (568 of 968 post loads; slowest LCP/TTFB) | verified, measured | **package B** |
| RG3 | source-first rendering regressed out of existence (main shows the loading frame until verification, connections and context pack finish) | F34 PARTIAL in the consolidation doc | decision (branch-only work exists) |
| RG4 | analytics, Pixel and an ad unit were added to the Post path on 8-11 Nov with no speed measurement | measured here (section 8, table 3) | **package C** |
| RG5 | four font preloads (the 14 Oct measurement says two are faster) | repository + October lab | recommendation |
| RG6 | the edge awaits one Supabase RPC before every post document (no timeout) | verified in code, +130-230 ms measured at a US edge | decision (F5) |
| RG7 | shared frame weight drift (132,968 -> 151,006 B source since 26 Oct) | agent's reading | recommendation |
| RG8 | moving Post code off the Home entry cost the first Post ~1 s; the prefetch that replaced it helps only Home-origin navigations | DIAGNOSIS.md | recorded; deep links pay the full chain |
| RG9 | no field evidence exists for any Post improvement: RUM has no device, build id or LCP element | verified (section 3) | protocol in section 9 |
| RG10 | a signed-in visitor's route-owned read waits for the account check | `App2029.jsx:105,109`, `AuthContext.jsx:67-72` | unchanged; package B behaves the same on `/:slug` and says so |

## 5. Where the time goes (current site, lab, Slow 4G + 4x CPU, cold)

| post | n | server wait to first byte | first paint | entry JS done | route graph done | data read done | **content visible** | JS KB / requests before content | CSS | fonts | images | third-party before content | idle main thread | first-party script time | third-party script time |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| O1 old, image first | 10 | 1310 | 1850 | 3256 | 7273 | 7300 | 7542 | 531 / 67 | 64 KB | 72 KB | 32 KB | 0 KB | 79 % | 782 ms | 390 ms |
| O3 old, medium | 10 | 1311 | 1868 | 3258 | 7172 | 7200 | 7484 | 531 / 67 | 64 KB | 72 KB | 32 KB | 0 KB | 76 % | 810 ms | 594 ms |
| N3 new, medium | 10 | 908 | 1532 | 2846 | 6754 | 3484 | 6870 | 529 / 65 | 64 KB | 72 KB | 32 KB | 0 KB | 73 % | 766 ms | 754 ms |
| N5 new, long | 10 | 908 | 1530 | 2841 | 6794 | 3480 | 6953 | 529 / 65 | 64 KB | 72 KB | 32 KB | 0 KB | 77 % | 792 ms | 396 ms |

ms from navigation start unless stated; medians of the pooled base runs; script time = main-thread self time under the 4x CPU slowdown over the whole run (about 10 s); "third-party before content" is what had already finished when the content appeared.

Reading of the base measurements (the numbers are in the table above and in `data/`):

1. **The page is network-bound, not CPU-bound.** The main thread is idle 73-79 % of a 10 s run. Before the content is visible about **700 KB** are transferred in ~90 requests (530 KB of JavaScript in 65-67 requests, 72 KB of fonts, 64 KB of CSS, 32 KB of images). The route graph (`PublicPostAddress2029Page`/`Post2029Page`, `Sod2029Shell`, `@hebcal/core`: 57 chunks, 1.1 MB raw / 330 KB gzip) is requested only after the 121 KB entry has executed, 2.8-3.3 s into the load, and finishes at 6.8-7.3 s.
2. **Third-party scripts are the second-largest main-thread consumer, next to the entry** (390-750 ms of Google tag, Pixel and ad-library time against 770-810 ms of first-party script time), and they are requested while the route graph is still downloading: with all of them blocked the content is visible **0.54-0.90 s earlier** and the blocking time is 200-560 ms lower (table 3 of section 8).
3. **An old post at its original address pays for the page code and *then* for its data**: the source read ends after the graph (7.2-7.3 s), whereas `/post/<slug>` reads while the code downloads (3.5 s). Its document is also slower on the server: `api/og.js` asked for the decoded slug, waited for an empty answer, and only then asked for the percent-encoded form in which every imported WordPress post is stored (790 of 1,323 records).
4. **Static files are re-downloaded on every hard load**: the four preloaded fonts (73 KB), the brand images and the Post background are served `no-store` by the deployed configuration.
5. **Images are not the first-order problem before the content is visible** (32 KB), but they decide LCP after it (a 200-290 KB image on each old post).
6. **The enrichment is not a cost worth attacking.** The reading projection and the post page together use 36-50 ms of main-thread time over the whole run (`post2029ReadingProjection` 14-17 ms, `Post2029Page` 18-23 ms, 4x CPU slowdown; table below). On a new post the data are in hand at 3.5 s and the text appears at 6.9 s: the 3.4 s in between is the route graph still downloading, not computing.

Server wait of the post document, live, from the sandbox (US edge, function in iad1, database in Tokyo; narrow sequential probes with `tools/ttfb_probe.py`, medians of the part after the TLS handshake):

| request | server wait (ms) | n | what it contains |
|---|---|---|---|
| `/contact` (known route) | 98 | 6 | edge + function, no database |
| `/post/<missing>` and `/<missing>` | 232 | 12 | edge + the middleware's existence check (a Supabase RPC) and an immediate 404 |
| `/post/<new post>` (N1, N3) | 373-394 | 6 each | + the function's single Supabase read |
| `/<old post>` (O1, O3, O4) | 554 / 770 / 1,056 | 6 each | + a second sequential Supabase read |

Where the main thread spends a whole cold run (about 10 s on the slowed phone; the processor is idle 73-79 % of it):

| main-thread time over the run (ms, 4x CPU slowdown, median of 10 runs) | O1 | O3 | N3 | N5 |
|---|---|---|---|---|
| idle | 7738 | 7519 | 6886 | 7342 |
| browser work (native, layout, GC, DOM calls) | 882 | 988 | 1054 | 1055 |
| entry bundle `2029-*.js` | 368 | 374 | 370 | 387 |
| Google tag | 279 | 284 | 293 | 302 |
| Meta Pixel | 0 | 0 | 130 | 0 |
| ad library | 108 | 300 | 318 | 101 |
| Supabase client | 79 | 80 | 73 | 84 |
| shell + timeline + other first-party chunks | 286 | 308 | 278 | 284 |
| reading page + projection (the "enrichment") | 46 | 47 | 36 | 50 |
| other | 7 | 16 | 0 | 7 |

## 6. The bottlenecks chosen, and the ones that were not

Ranked by measured effect (lab: content visible, Slow 4G + 4x CPU, medians over the sample) and by what the field data supports. Fixed rules kept: CLS <= 0.1, the canary budget, the built-graph and web-vitals budgets, no baseline update, no threshold raised.

| # | bottleneck | evidence | chosen |
|---|---|---|---|
| 1 | **Document and static-file delivery (server)** | Lab/live probes: an old post's document does two sequential Supabase reads (+190 ms warm, +250 ms cold on the server alone). Field: documents at the original address have TTFB p50 +338 ms / p75 +514 ms against `/post/`. Static files (73 KB of fonts, brand images, the Post background) are `no-store` in the deployed config, so every hard load re-downloads them. | **yes: A (reads) and D (static files)** |
| 2 | **Original-address posts read their data after their code** | Lab: data read ends at 7.3 s, after the graph, instead of 3.5 s as at `/post/`; field: the largest and slowest post population (568/968 loads, LCP p75 6.27 s). | **yes: B** |
| 3 | **Third-party scripts compete with the page** | Lab: the Google tag costs +0.27-0.41 s and the Pixel +0.16-0.24 s of content-visible time, together +0.54-0.90 s and +200-560 ms of blocking time; they are the largest main-thread consumers after the entry; the ad library, started when the article renders, delays LCP (C1 against C1+C2 in the 14 s series: -0.17 to -1.13 s, n=3 per arm). Not measurable in the field (no device, no build id). | **yes: C1 (tag and Pixel) and C3 (wait for the cover) recommended; C2 (ad unit) measured and left optional (#1364)** |
| - | Route graph requested late (preload from the document) | -2 to -7 % content time but FCP +0.4 s (section 8) | no |
| - | LCP image preload | content +0.2 to +0.9 s (section 8) | no |
| - | Edge middleware existence check before every post document | Live: +130-230 ms at a US edge (`/<missing>` 232 ms vs `/contact` 98 ms); not measurable from Israel here | **decision** (finished branch-only work F5, needs the soft-404 decision) |
| - | Document CDN cache | Tried once on Home (#1249), MISS/age 0, removed (#1251); needs the middleware cookie question settled | **decision** |
| - | Function region (iad1) against the Tokyo database | each read is ~190 ms; a region change trades it against the user-to-function hop | **decision** |
| - | Source-first rendering (B01), body-media deferral (B02), responsive renditions (B03/B04) | finished but branch-only (Oct 18-19), 0 % survival in main; reusing them needs ZURIEL's explicit approval (CLAUDE.md 0.2); not imported | **decision** |
| - | Bytes before the content: `@hebcal/core` 56 KB, `Sod2029Shell` 81 KB JS + 41 KB CSS, 4 font preloads 73 KB | the network-bound critical path (~700 KB, ~90 requests) | recommendation (shell split D05, font preload trim R03) |

## 7. Packages and their proofs

Four independent packages, one branch and one draft PR each, on `origin/main` `c2acc064b`, plus one optional package (C2, #1364). They do not depend on each other in code, build or data: the four heads merge conflict-free, in any order, to the tree `2a10415e8bdcd8c6f1e7c258fd01e4ae4b1ef70f`, which is the "proposed tree" measured below. Packages A, B, C (up to the review fix) and D were each reviewed independently by a read-only reviewer (one blocker and several should-fix points were found and fixed; they are named in the commit messages); C3 and the move of C2 to its own PR came after that review and are covered by their tests and by the measurements, not by a second reviewer.

### A. One request for the spellings of a post address — `api/og.js` — PR #1360, `claude/perf-post-document-reads-20261115`

*Bottleneck:* document delivery of old posts, the larger and slower post population in the field (568 of 968 post loads at their original address, TTFB p50 1,265 ms against 927 ms, section 3). *Change:* the decoded and the percent-encoded spelling are asked for in one request, `slug=in.(a,b)` with `limit=2`; the old preference (first spelling wins) and, on failure, the old per-spelling sequential reads are kept exactly, so 404/503 answers do not change; `?p=` and single-spelling addresses keep their one request. *Why one request and not two concurrent ones:* the review pointed out that two requests need two sockets to Tokyo and, with exactly one idle socket in the pool, the second pays a new TCP+TLS handshake (about three round trips), so the pair can be slower than the sequential reads it replaces. The concurrent version is the first commit of the branch and is measured against the single request in section 8.

Server time of `api/og.js` of `main` against package A as shipped, against the production Supabase REST endpoint (sandbox to Tokyo, real network, read-only reads of public posts, 8 interleaved runs per arm, run alone on an otherwise idle machine; cold = a fresh process, warm = the second call in the same process):

| post | arm | cold process: median [min-max] ms | warm pool: median [min-max] ms | requests |
|---|---|---|---|---|
| O1 | main (two reads, one after the other) | 558 [525-1322] (n=8) | 410 [387-1047] | 2 |
| O1 | package A as shipped (one request, `slug=in.(a,b)`) | 322 [269-628] (n=8) | 217 [198-563] | 1 |
| O3 | main (two reads, one after the other) | 582 [532-897] (n=8) | 426 [411-1020] | 2 |
| O3 | package A as shipped (one request, `slug=in.(a,b)`) | 304 [283-605] (n=8) | 212 [191-238] | 1 |
| O4 | main (two reads, one after the other) | 576 [525-981] (n=8) | 428 [385-1038] | 2 |
| O4 | package A as shipped (one request, `slug=in.(a,b)`) | 477 [284-645] (n=8) | 216 [192-537] | 1 |
| N1 | main (two reads, one after the other) | 302 [272-585] (n=8) | 207 [188-514] | 1 |
| N1 | package A as shipped (one request, `slug=in.(a,b)`) | 296 [271-604] (n=8) | 209 [181-226] | 1 |

The saving is one round trip per old-post document: about 200 ms with a warm pool (-193, -214, -212 ms on O1, O3, O4) and 240-280 ms in a fresh process (-236 and -278 ms on O1 and O3; O4's median moved only -99 ms, with a range of 284-645 ms, because of network jitter in that series); the new post (control) does not change. This is a server measurement from the sandbox, not a TTFB claim for visitors. Tests: `test/post-document-slug-variants-20261115.test.mjs` (8 cases; the one-request case fails on main), 190/190 existing og/SEO/canonical/sitemap/artifact tests, `test-2029-server-seo-ai-parity`, `test-route-legitimacy-2029`; PR CI 13/13 green.

### B. Original-address posts read their source while their page code downloads — `src/App2029.jsx`, `src/pages/PublicPostAddress2029Page.jsx` — PR #1361, `claude/perf-post-root-address-early-read-20261115`

*Bottleneck:* the data read of the largest and slowest post population started after the whole page graph had been mounted. *Change:* a new entry `PublicPostAddressEntry2029` for the route `/:slug` starts the same route-owned read as `PostEntry2029` (which is left byte-for-byte untouched, because existing tests pin its text), requests the page code in the first render, and hands the reader to the existing page; same cancellation, no shared cache, `?p=` untouched. Builds without the public release (protected previews also register this route) keep the plain page; a unit test runs the real function against stubbed hooks for that case, for one-read-per-address-and-identity and for cancellation. Visitors whose account is still resolving wait for it before the read, exactly as on `/post/<slug>` (RG10); only guests were measured.

Cold, Slow 4G + 4x CPU, content visible (ms), final code, n=5 per arm after the pooled base (n=10); the new posts are the control (the package does not touch `/post/<slug>`). The same table also holds the earlier tree with C2 (columns 3 and 4), used in section 7-C and in the combined results:

**Content visible (ms)** - median [min-max], n, change against the base, p:


| post | base | B | C1+C2 (earlier tree) | A+B+C1+C2+D (earlier tree) |
|---|---|---|---|---|
| N3 | 6870 [6782-7097] n=10 | 6930 [6809-7170] n=5  **+60** p=0.594 | 6330 [6204-6441] n=5  **-540** p=0.001 | 6106 [6059-6440] n=10  **-764** p=0.000 |
| N5 | 6953 [6882-7206] n=10 | 7001 [6873-7175] n=5  **+48** p=0.859 | 6212 [6121-6238] n=5  **-741** p=0.001 | 6236 [6096-6312] n=10  **-717** p=0.000 |
| O1 | 7542 [7269-7847] n=10 | 7209 [7122-7330] n=5  **-333** p=0.002 | 6669 [6642-6974] n=5  **-873** p=0.001 | 6554 [6305-6924] n=10  **-988** p=0.000 |
| O3 | 7484 [7356-8002] n=10 | 7227 [7148-7389] n=5  **-257** p=0.003 | 6754 [6715-7112] n=5  **-730** p=0.001 | 6470 [6390-6656] n=10  **-1014** p=0.000 |

Effect on old posts: -257 to -333 ms (-3.4 % to -4.4 %), p<0.01; controls N3/N5 within noise (+48 to +60 ms); FCP and blocking time unchanged. In the earlier interleaved rounds (n=10 per arm, builds before the review fixes; last table of section 7) the same package gave -392 ms (p=0.005) and -244 ms (p=0.034) on O1 and O3 and +46 and +212 ms (not significant) on the controls N3 and N5: the size of the gain on old posts varies between series (-244 to -392 ms in the rounds, -257 to -333 ms in the final series), its direction does not. Tests: `test/post-root-address-early-read-20261115.browser.mjs` (real browser and worker, 390 and 1280 px; fails on main with the read starting 2.2 s after the code), `test/post-root-address-entry-20261115.test.mjs` (6 cases; the no-release case fails on the pre-review code), the existing source pins; first-load and built-graph budgets pass (eager gzip 222,891 -> 222,914 B, +23 B; the Post graph +171 B raw); PR CI 13/13 green.

### C. Third-party scripts start after the article and its cover — PR #1363 (C1, classification fix, C3); the ad-library change is its own optional PR #1364 (C2)

*Bottleneck.* The Google tag, the Meta Pixel and the ad library compete with the page code for the same connection and for the main thread. They are the largest main-thread consumers after the entry bundle (section 5), and while the route graph downloads they delay the text: with all three blocked it appears 0.54-0.90 s earlier (section 8, table 3).

*C1* (`src/App2029.jsx`). A post address (`/post/<slug>` or an original address, classified by the public boundary's own rule including `isAdmin`/`search`) is marked on `<html>` in a layout effect. The existing public effect, which already waits for the home's primary content, now waits for the one element only `Post2029Page` renders after its source has been read and admitted, `article[data-experience-surface="post-reading"]`, with a 10 s bound for errors and for addresses that are not posts. No measurement code, event or report is changed.

*C3* (same effect, its own commit). The effect also holds for the article's cover: the page's own priority image (`img[fetchpriority="high"]` inside the reading surface), only while that image is still loading, once, and for at most 4 s. Why it exists: with C1 alone the tag starts 0.06-0.21 s after the text, which is when the cover (200-450 KB) is requested, so on the reference post (446 KB cover) the cover finished 0.4 s later and the largest paint came later than on main in the first integration series (Regular 4G, +306 ms, p=0.013; in the interleaved series below +160 ms, not significant). A cover that fails or never answers holds nothing for more than 4 s; a post without a cover waits for nothing.

*C2* (the ad library starts when its unit comes within 1,200 px of the viewport) is **no longer in #1363**. Measured on its own it does not shorten the time to the text, makes it slightly longer, changes how many ad requests the site makes (a revenue-model decision, not mine) and shares its LCP benefit with C3. It is PR #1364, optional, with its own numbers (section 7, "C2 on its own").

**Evidence.**

1. *C1 alone*, cold, Slow 4G + 4x CPU, rounds 1-2 (n=10 per arm, interleaved; builds before the review fix; the "C1+C2" column is the old tree that still carried the ad change):

**Content visible (ms)** - median [min-max], n, change against the base, p:


| post | base | C1 (tag + Pixel after the article) | C1+C2 |
|---|---|---|---|
| N3 | 7108 [6806-7639] n=10 | 6305 [6054-6525] n=10  **-803** p=0.000 | 6446 [6345-6762] n=10  **-662** p=0.000 |
| N5 | 7042 [6872-7688] n=10 | 6438 [6177-6916] n=10  **-604** p=0.000 | 6482 [6139-6944] n=10  **-560** p=0.000 |
| O1 | 7686 [7446-8013] n=10 | 6920 [6687-7138] n=10  **-766** p=0.000 | 7040 [6843-7288] n=10  **-646** p=0.000 |
| O3 | 7730 [7412-8432] n=10 | 6942 [6710-7162] n=10  **-788** p=0.000 | 7076 [6871-7251] n=10  **-654** p=0.000 |

**Blocking time in the 3.5 s after the text (ms)** - median [min-max], n, change against the base, p:


| post | base | C1 (tag + Pixel after the article) | C1+C2 |
|---|---|---|---|
| N3 | 986 [735-1496] n=10 | 833 [575-1241] n=10  **-153** p=0.105 | 953 [600-1228] n=10  **-33** p=0.631 |
| N5 | 538 [454-1013] n=10 | 464 [361-713] n=10  **-74** p=0.138 | 642 [330-982] n=10  **+104** p=0.342 |
| O1 | 594 [476-1220] n=10 | 460 [317-577] n=10  **-134** p=0.001 | 556 [411-605] n=10  **-38** p=0.143 |
| O3 | 756 [483-1272] n=10 | 486 [300-759] n=10  **-270** p=0.003 | 722 [488-943] n=10  **-34** p=0.853 |

2. *C3 on top*, Regular 4G + 4x CPU, n=6 per arm (interleaved base, C, C+C3, C+C3, C, base; "C" is C1+C2, the tree that was current when this was measured, so the difference between the last two columns is C3):

**Content visible (ms)** - median [min-max], n, change against the base, p:


| post | base | C (C1+C2) | C+C3 |
|---|---|---|---|
| N3 | 3113 [2977-3270] n=6 | 2828 [2748-3004] n=6  **-285** p=0.004 | 2957 [2886-3151] n=6  **-156** p=0.093 |
| N5 | 3157 [3026-3565] n=6 | 2904 [2802-3184] n=6  **-253** p=0.026 | 2954 [2828-3195] n=6  **-203** p=0.065 |
| O1 | 3667 [3557-3974] n=6 | 3394 [3316-3575] n=6  **-273** p=0.004 | 3472 [3246-3493] n=6  **-195** p=0.002 |
| O3 | 3868 [3698-4190] n=6 | 3464 [3379-3577] n=6  **-404** p=0.002 | 3485 [3343-3779] n=6  **-383** p=0.009 |

**First contentful paint (ms)** - median [min-max], n, change against the base, p:


| post | base | C (C1+C2) | C+C3 |
|---|---|---|---|
| N3 | 1224 [1188-1252] n=6 | 1212 [1184-1220] n=6  **-12** p=0.342 | 1212 [1200-1228] n=6  **-12** p=0.481 |
| N5 | 1216 [1204-1224] n=6 | 1212 [1204-1228] n=6  **-4** p=0.725 | 1224 [1200-1260] n=6  **+8** p=0.323 |
| O1 | 1556 [1548-1640] n=6 | 1558 [1532-1568] n=6  **+2** p=0.851 | 1570 [1548-1612] n=6  **+14** p=0.708 |
| O3 | 1564 [1552-1584] n=6 | 1540 [1532-1560] n=6  **-24** p=0.011 | 1548 [1528-1564] n=6  **-16** p=0.048 |

**Largest contentful paint (ms)** - median [min-max], n, change against the base, p:


| post | base | C (C1+C2) | C+C3 |
|---|---|---|---|
| N3 | 3310 [3180-3404] n=6 | 2960 [2896-3104] n=6  **-350** p=0.002 | 3108 [2984-3264] n=6  **-202** p=0.015 |
| N5 | 3750 [3600-4272] n=6 | 3910 [3692-3980] n=6  **+160** p=0.260 | 3508 [3396-3624] n=6  **-242** p=0.011 |
| O1 | 4210 [4112-4436] n=6 | 4118 [3888-4376] n=6  **-92** p=0.145 | 3948 [3788-4048] n=6  **-262** p=0.002 |
| O3 | 4360 [4072-4528] n=6 | 3826 [3716-3880] n=6  **-534** p=0.002 | 3806 [3736-4140] n=6  **-554** p=0.004 |

**Blocking time in the 3.5 s after the text (ms)** - median [min-max], n, change against the base, p:


| post | base | C (C1+C2) | C+C3 |
|---|---|---|---|
| N3 | 1063 [972-1293] n=6 | 732 [662-988] n=6  **-331** p=0.004 | 946 [813-1155] n=6  **-117** p=0.132 |
| N5 | 962 [758-1157] n=6 | 678 [568-937] n=6  **-284** p=0.024 | 766 [606-841] n=6  **-196** p=0.022 |
| O1 | 980 [775-1348] n=6 | 866 [829-987] n=6  **-114** p=0.240 | 1018 [826-1229] n=6  **+38** p=0.818 |
| O3 | 1084 [794-1126] n=6 | 781 [718-1178] n=6  **-303** p=0.084 | 777 [691-899] n=6  **-307** p=0.015 |

When the tags start, relative to the moment the text is visible (same runs):

| first Google tag / Pixel request, ms after the text is visible (negative = before it) | O1 | O3 | N3 | N5 |
|---|---|---|---|---|
| main | -1578 [-1829..-1379] n=6 | -1749 [-1974..-1590] n=6 | -1394 [-1436..-1289] n=6 | -1448 [-1780..-1266] n=6 |
| C1+C2 | +94 [+81..+318] n=6 | +190 [+158..+224] n=6 | +62 [+42..+115] n=6 | +214 [+181..+228] n=6 |
| C1+C2+C3 | +360 [+339..+403] n=6 | +308 [+272..+357] n=6 | +96 [+82..+144] n=6 | +490 [+427..+515] n=6 |

3. *C3 on top*, Slow 4G, observation window of 14 s so that LCP is not censored, n=3 per arm (the "C1+C2+C3" column is the C1+C2 tree plus C3; "main" and "C1+C2" were measured before and after it):

**Largest contentful paint (ms)** - median [min-max], n, change against the base, p:


| post | base | C1 | C1+C2 | C1+C2+C3 | A+B+C1+C2+D (earlier tree) |
|---|---|---|---|---|---|
| N3 | 8040 [7848-8232] n=6 | 7256 [7024-7300] n=3  **-784** p=0.024 | 6510 [6432-6716] n=6  **-1530** p=0.002 | 6488 [6472-6576] n=3  **-1552** p=0.024 | 6644 [6496-6820] n=3  **-1396** p=0.024 |
| N5 | 12464 [12416-12988] n=6 | 12456 [12420-12524] n=3  **-8** p=0.595 | 11376 [11136-11492] n=6  **-1088** p=0.002 | 8516 [8444-8548] n=3  **-3948** p=0.024 | 11328 [11020-11508] n=3  **-1136** p=0.024 |
| O1 | 10142 [9976-10200] n=6 | 9900 [9836-10688] n=3  **-242** p=0.548 | 9758 [9720-10264] n=6  **-384** p=0.063 | 8820 [8676-8916] n=3  **-1322** p=0.024 | 9712 [9636-10268] n=3  **-430** p=0.548 |
| O3 | 10256 [10096-10712] n=6 | 9980 [9876-10084] n=3  **-276** p=0.024 | 9092 [8904-9252] n=6  **-1164** p=0.002 | 8056 [7924-8132] n=3  **-2200** p=0.024 | 8924 [8836-9048] n=3  **-1332** p=0.024 |

**Content visible (ms)** - median [min-max], n, change against the base, p:


| post | base | C1 | C1+C2 | C1+C2+C3 | A+B+C1+C2+D (earlier tree) |
|---|---|---|---|---|---|
| N3 | 7010 [6857-7319] n=6 | 6409 [6127-6554] n=3  **-601** p=0.024 | 6123 [6039-6302] n=6  **-887** p=0.002 | 6184 [6146-6318] n=3  **-826** p=0.024 | 6398 [6246-6509] n=3  **-612** p=0.024 |
| N5 | 7014 [6784-7702] n=6 | 6165 [6145-6206] n=3  **-849** p=0.024 | 6196 [5987-6465] n=6  **-818** p=0.002 | 6191 [6108-6222] n=3  **-823** p=0.024 | 6338 [6078-6555] n=3  **-676** p=0.024 |
| O1 | 7585 [7369-7651] n=6 | 6873 [6730-7575] n=3  **-712** p=0.095 | 6650 [6586-7178] n=6  **-935** p=0.002 | 6885 [6785-6975] n=3  **-700** p=0.024 | 6546 [6492-7117] n=3  **-1039** p=0.024 |
| O3 | 7648 [7404-8129] n=6 | 6817 [6722-6846] n=3  **-831** p=0.024 | 6774 [6561-6933] n=6  **-874** p=0.002 | 6844 [6689-6917] n=3  **-804** p=0.024 | 6559 [6529-6803] n=3  **-1089** p=0.024 |

4. *The proposed tree* (A+B+D+C1+C3, section 9). Its rows for the new posts N3 and N5 isolate package C, because A, B and D do not act on `/post/<slug>` in a cold load. Cold, Slow 4G + 4x CPU (n=5 per arm):

**Content visible (ms)** - median [min-max], n, change against the base, p:


| post | base | proposed tree |
|---|---|---|
| N3 | 6851 [6817-7129] n=5 | 6187 [6022-6296] n=5  **-664** p=0.008 |
| N5 | 6963 [6875-7210] n=5 | 6295 [6092-6364] n=5  **-668** p=0.008 |
| O1 | 7464 [7333-7536] n=5 | 6528 [6298-6614] n=5  **-936** p=0.008 |
| O3 | 7544 [7382-7792] n=5 | 6530 [6466-6596] n=5  **-1014** p=0.008 |

**First contentful paint (ms)** - median [min-max], n, change against the base, p:


| post | base | proposed tree |
|---|---|---|
| N3 | 1508 [1492-1524] n=5 | 1528 [1508-1536] n=5  **+20** p=0.111 |
| N5 | 1528 [1480-1536] n=5 | 1532 [1520-1540] n=5  **+4** p=0.294 |
| O1 | 1848 [1788-1880] n=5 | 1824 [1796-1864] n=5  **-24** p=0.548 |
| O3 | 1852 [1772-1864] n=5 | 1856 [1812-1960] n=5  **+4** p=0.421 |

**Blocking time in the 3.5 s after the text (ms)** - median [min-max], n, change against the base, p:


| post | base | proposed tree |
|---|---|---|
| N3 | 745 [678-998] n=5 | 652 [580-722] n=5  **-93** p=0.016 |
| N5 | 492 [421-507] n=5 | 520 [390-563] n=5  **+28** p=0.548 |
| O1 | 505 [409-612] n=5 | 580 [415-621] n=5  **+75** p=0.222 |
| O3 | 488 [413-669] n=5 | 602 [521-671] n=5  **+114** p=0.151 |

**KB transferred before the text** - median [min-max], n, change against the base, p:


| post | base | proposed tree |
|---|---|---|
| N3 | 702 [702-702] n=5 | 731 [702-731] n=5  **+29** p=0.167 |
| N5 | 702 [702-702] n=5 | 731 [731-731] n=5  **+29** p=0.008 |
| O1 | 703 [703-703] n=5 | 704 [701-704] n=5  **+1** p=0.048 |
| O3 | 703 [703-865] n=5 | 724 [704-724] n=5  **+21** p=0.810 |

Regular 4G + 4x CPU (n=6 per arm):

**Content visible (ms)** - median [min-max], n, change against the base, p:


| post | base | proposed tree |
|---|---|---|
| N3 | 3056 [2903-3185] n=6 | 2864 [2739-2970] n=6  **-192** p=0.015 |
| N5 | 3142 [2940-3238] n=6 | 2884 [2763-2990] n=6  **-258** p=0.004 |
| O1 | 3595 [3494-3712] n=6 | 3115 [2970-3164] n=6  **-480** p=0.002 |
| O3 | 3639 [3589-3782] n=6 | 3120 [3029-3218] n=6  **-519** p=0.002 |

**First contentful paint (ms)** - median [min-max], n, change against the base, p:


| post | base | proposed tree |
|---|---|---|
| N3 | 1200 [1196-1208] n=6 | 1204 [1196-1236] n=6  **+4** p=0.446 |
| N5 | 1208 [1192-1228] n=6 | 1204 [1192-1220] n=6  **-4** p=0.437 |
| O1 | 1548 [1528-1608] n=6 | 1544 [1536-1596] n=6  **-4** p=0.857 |
| O3 | 1548 [1532-1560] n=6 | 1550 [1532-1556] n=6  **+2** p=0.639 |

**Largest contentful paint (ms)** - median [min-max], n, change against the base, p:


| post | base | proposed tree |
|---|---|---|
| N3 | 3246 [3040-3524] n=6 | 3080 [2960-3188] n=6  **-166** p=0.258 |
| N5 | 3692 [3592-3900] n=6 | 3540 [3464-3784] n=6  **-152** p=0.045 |
| O1 | 4146 [4068-4280] n=6 | 3662 [3560-3724] n=6  **-484** p=0.002 |
| O3 | 4076 [4012-4232] n=6 | 3564 [3476-3660] n=6  **-512** p=0.002 |

**Blocking time in the 3.5 s after the text (ms)** - median [min-max], n, change against the base, p:


| post | base | proposed tree |
|---|---|---|
| N3 | 1006 [843-1082] n=6 | 1008 [839-1129] n=6  **+2** p=0.937 |
| N5 | 808 [770-946] n=6 | 812 [717-997] n=6  **+4** p=1.000 |
| O1 | 896 [838-978] n=6 | 882 [814-1012] n=6  **-14** p=0.818 |
| O3 | 909 [794-1080] n=6 | 966 [853-1035] n=6  **+57** p=0.485 |

Slow 4G, 14 s window (n=4 per arm):

**Largest contentful paint (ms)** - median [min-max], n, change against the base, p:


| post | base | proposed tree |
|---|---|---|
| N3 | 7956 [7876-8292] n=4 | 6958 [6772-7400] n=4  **-998** p=0.029 |
| N5 | 12542 [12448-12604] n=4 | 9702 [9584-9824] n=4  **-2840** p=0.029 |
| O1 | 10190 [9988-10440] n=4 | 8538 [8328-8764] n=4  **-1652** p=0.029 |
| O3 | 10366 [10232-10724] n=4 | 8394 [8304-8628] n=4  **-1972** p=0.029 |

**Content visible (ms)** - median [min-max], n, change against the base, p:


| post | base | proposed tree |
|---|---|---|
| N3 | 6912 [6774-7601] n=4 | 6369 [6134-6867] n=4  **-543** p=0.114 |
| N5 | 7029 [6793-7373] n=4 | 6306 [6193-6538] n=4  **-723** p=0.029 |
| O1 | 7646 [7355-7868] n=4 | 6623 [6402-6854] n=4  **-1023** p=0.029 |
| O3 | 7761 [7601-8084] n=4 | 6608 [6479-6834] n=4  **-1153** p=0.029 |

**What this shows and what it costs.** C1 is the part that moves the time to the text: about -0.6 to -0.8 s on Slow 4G for the new posts (item 1 above, and -0.66 s on the new posts in the proposed tree), -0.19 to -0.26 s on Regular 4G. C3 does not change the time to the text (differences within noise); it moves the largest paint. In the proposed tree the LCP is earlier than on main on every post and in both profiles: Regular 4G -152 to -512 ms (the reference post N5, which was +306 ms in the first integration series with C1+C2, is -152 ms, p=0.045; N3 -166 ms is not significant), Slow 4G with the 14 s window -1.0 to -2.8 s (p=0.029 on all four, no overlap of the ranges). The costs, in the lab: against C1+C2 the blocking time inside the 3.5 s after the text is higher on two posts (N3 +214 ms, p=0.026; O1 +152 ms, p=0.093) and N3's LCP is 148 ms later (p=0.041); and the tags start 0.1-0.5 s after the text instead of 0.06-0.21 s. Against main the proposed tree's blocking time is unchanged on Regular 4G (-14 to +57 ms, n.s.) and mixed on Slow 4G (N3 -93 ms, p=0.016; O3 +114 ms, n.s.): **the blocking-time gain of the earlier tree (-114 to -331 ms on Regular 4G with C1+C2) is not there any more** (a Regular 4G series that would split it between C2's removal and C3 was not run). LCP is the metric the site's own field collector records and blocking time is not (INP is), which is why C3 stays in the recommended set, as its own commit that can be dropped alone.

**What C changes in the measurement data — needs Codex/ZURIEL sign-off (`traffic_intelligence`).** GA4, Pixel and CAPI events are no longer produced for a visit that ends before its article (C3: and, on a slow connection, its cover) is on screen. Before, the tag loaded early, but the page-view event already waited for the post's SEO identity or fell back after 5 s to the generic `SOD1820` family identity, so such visits were recorded only if they stayed 5 s after the idle point. First-party `site_visits` and engagement still fire at 150 ms, so GA/Meta counts and first-party counts will diverge slightly for abandoned loads; addresses that are not posts wait up to 10 s plus idle. Side benefit: no generic-identity page view before the real one on slow loads. Existing and unchanged: on `/?p=<id>` the home's marker is never rendered, so the tag and the Pixel never start there (found by the reviewer; not part of this change).

*Tests.* `test/post-third-party-after-article-20261115.browser.mjs` (real browser and worker; 8 cases: tag after the article at 390 and 1280 px, original address, address without a post, page that is not a post keeps its timing, tag waits for a slow cover, a stalled cover holds it for at most the bound, a failed cover does not hold it; seven of the eight fail on main (all but the pin for a page that is not a post), and cases 6 and 7 also fail on the tree without C3); existing `public-reading-observability`, `measurement-page-view-once-2029`, `measurement-package-scope`, `adsense-gating-2029` pass; on the integration tree also `post-speed-page-analytics`, `ga-measurement-browser`, `marketing-browser`, `measurement-visit-once`. Overlap with Codex's #1357: one line of `RouteEffects2029` (section 9).

### D. Static files get cache rules in the config that is actually deployed — `public-reading-deploy/vercel.json` — PR #1362, `claude/perf-static-asset-cache-20261115`

*Bottleneck:* the rules for the twelve content-hashed Post backgrounds exist only in the root `vercel.json`, which production does not build from, and the test that guards them reads that file; fonts, brand images and backgrounds are `no-store` and re-fetched on every hard load (recommendation #1 of 7 November, never applied). *Change:* 14 rules after the catch-all: the twelve backgrounds `immutable` (their names carry the first 12 hex digits of their own SHA-256, now pinned by the test), the four preloaded fonts `max-age=604800, stale-while-revalidate=86400`, the six brand images `max-age=86400, stale-while-revalidate=604800`; the rules name the files that exist, so a missing path under the same folders matches nothing and documents, the worker and every other address stay `no-store`. The deployed config's hash changes, as expected. Tests: `test/public-static-asset-cache-20261115.test.mjs` (6 cases, two fail on main), 64/64 with the production-artifact, background, launch-candidate, protected-review, production-review and single-hop tests; PR CI 12/12 green. **No test applies `vercel.json` headers, and a protected Preview needs ZURIEL's approval, so the first production deployment must be followed by a header check (section 9).**

**Returning visitor** (the browser is closed and started again on the same profile between the two visits, so that only the HTTP cache can help; the lab certificate is accepted by its public-key hash so that Chromium may store responses; request interception is off). First the mechanism, from `tools/warm_probe.mjs` (post N3, Slow 4G, second visit): on **main** the 65 scripts and 12 stylesheets come from the HTTP cache (their `/assets/` rule is already immutable) but the four fonts (73.9 KB), the brand mark (16.2 KB) and the Post background (30.1 KB) - six requests, 120 KB - are downloaded again on every visit (`no-store`); with **package D** all six, and everything else, are served from the cache (0 bytes). Then the effect on the time until the post is on screen (content visible, FCP, LCP in ms, median, n=5 per arm after a fixed order base, D, integration, integration, D, base; the new posts are not special here - D applies to every post page):

**Content visible (ms)** - median [min-max], n, change against the base, p:


| post | base | D (static headers) | A+B+C1+C2+D (earlier tree) |
|---|---|---|---|
| N3 | 2564 [2461-3145] n=5 | 2389 [2371-2635] n=5  **-175** p=0.095 | 2501 [2429-2598] n=5  **-63** p=0.151 |
| N5 | 2955 [2855-3720] n=5 | 2698 [2613-3187] n=5  **-257** p=0.421 | 2734 [2572-2821] n=5  **-221** p=0.008 |
| O1 | 3215 [2967-3766] n=5 | 3353 [2880-3497] n=5  **+138** p=0.841 | 2789 [2733-2890] n=5  **-426** p=0.008 |
| O3 | 3104 [2973-3616] n=5 | 3201 [2997-3862] n=5  **+97** p=0.548 | 2917 [2729-3289] n=5  **-187** p=0.095 |

**First contentful paint (ms)** - median [min-max], n, change against the base, p:


| post | base | D (static headers) | A+B+C1+C2+D (earlier tree) |
|---|---|---|---|
| N3 | 1152 [1124-1208] n=5 | 1072 [1060-1084] n=5  **-80** p=0.008 | 1084 [1060-1100] n=5  **-68** p=0.008 |
| N5 | 1200 [1172-1208] n=5 | 1060 [1032-1116] n=5  **-140** p=0.008 | 1064 [1040-1132] n=5  **-136** p=0.008 |
| O1 | 1556 [1540-1576] n=5 | 1460 [1440-1472] n=5  **-96** p=0.008 | 1488 [1452-1504] n=5  **-68** p=0.008 |
| O3 | 1552 [1544-1592] n=5 | 1464 [1448-1584] n=5  **-88** p=0.087 | 1508 [1492-1560] n=5  **-44** p=0.071 |

**Largest contentful paint (ms)** - median [min-max], n, change against the base, p:


| post | base | D (static headers) | A+B+C1+C2+D (earlier tree) |
|---|---|---|---|
| N3 | 3608 [3460-3936] n=5 | 3552 [2680-3576] n=5  **-56** p=0.095 | 2532 [2452-3196] n=5  **-1076** p=0.008 |
| N5 | 1692 [1632-1728] n=5 | 1060 [1032-1116] n=5  **-632** p=0.008 | 1064 [1040-1132] n=5  **-628** p=0.008 |
| O1 | 6176 [5752-6540] n=5 | 6044 [5816-6396] n=5  **-132** p=0.841 | 5920 [2820-6036] n=5  **-256** p=0.222 |
| O3 | 6460 [6224-6680] n=5 | 6364 [5844-6552] n=5  **-96** p=0.421 | 4812 [2868-5240] n=5  **-1648** p=0.008 |

**KB transferred before the text** - median [min-max], n, change against the base, p:


| post | base | D (static headers) | A+B+C1+C2+D (earlier tree) |
|---|---|---|---|
| N3 | 95 [88-125] n=5 | 3 [0-37] n=5  **-92** p=0.008 | 0 [0-0] n=5  **-95** p=0.008 |
| N5 | 117 [117-125] n=5 | 8 [0-86] n=5  **-109** p=0.008 | 0 [0-0] n=5  **-117** p=0.008 |
| O1 | 88 [88-95] n=5 | 8 [0-21] n=5  **-80** p=0.008 | 0 [0-0] n=5  **-88** p=0.008 |
| O3 | 95 [88-109] n=5 | 0 [0-8] n=5  **-95** p=0.008 | 0 [0-0] n=5  **-95** p=0.008 |

Reading: package D does what it says - on a returning visit **80-109 KB less is transferred before the text appears** (fonts, brand mark, Post background; p=0.008 on every post) and the first paint is **80-140 ms earlier** (p=0.008 on three posts; p=0.087 on O3). It does **not** move the time until the text is on screen on its own (-257 to +138 ms, p>=0.095: the text waits for the scripts, the data read and the layout, not for the fonts, which do not block rendering); the earlier tree (with C2) is -63 to -426 ms (p=0.008 on two posts) because it also carries B and C. The LCP rows of this table are not interpretable: on a returning visit the largest paint is, in some runs, the brand mark at first paint and, in others, a later element (N5: 1.1 s against 1.7 s), so the median depends on which runs fall on which side.

The proposed tree against main, and the proposed tree plus C2 (#1364), in a second, fully interleaved returning-visitor series (n=5 per arm; order base, proposed, proposed+C2, proposed+C2, proposed, base): the time to the text is unchanged on the new posts (+6 ms), earlier on the old ones (O1 -330 ms, p=0.056; O3 -144 ms, n.s.: package B's read) and C2 makes no difference (-14 to +44 ms); 88-117 KB less is transferred before the text on every post (p=0.008) and first paint is 24-96 ms earlier (p=0.016 on one post):

**Content visible (ms)** - median [min-max], n, change against the base, p:


| post | base | proposed tree | proposed tree + C2 (#1364) |
|---|---|---|---|
| N3 | 2625 [2406-2851] n=5 | 2631 [2500-3135] n=5  **+6** p=0.841 | 2638 [2490-2693] n=5  **+13** p=1.000 |
| N5 | 2862 [2734-3326] n=5 | 2868 [2759-3062] n=5  **+6** p=1.000 | 2906 [2616-3006] n=5  **+44** p=1.000 |
| O1 | 3260 [3110-3508] n=5 | 2930 [2647-3266] n=5  **-330** p=0.056 | 2917 [2872-3087] n=5  **-343** p=0.008 |
| O3 | 3119 [3072-3229] n=5 | 2975 [2866-3345] n=5  **-144** p=0.690 | 3105 [2934-3504] n=5  **-14** p=1.000 |

**First contentful paint (ms)** - median [min-max], n, change against the base, p:


| post | base | proposed tree | proposed tree + C2 (#1364) |
|---|---|---|---|
| N3 | 1152 [1120-1320] n=5 | 1128 [1044-1176] n=5  **-24** p=0.151 | 1084 [1048-1164] n=5  **-68** p=0.095 |
| N5 | 1192 [1136-1392] n=5 | 1096 [1044-1140] n=5  **-96** p=0.016 | 1092 [1044-1140] n=5  **-100** p=0.016 |
| O1 | 1544 [1532-1584] n=5 | 1480 [1440-1548] n=5  **-64** p=0.056 | 1528 [1460-1568] n=5  **-16** p=0.214 |
| O3 | 1564 [1532-1600] n=5 | 1512 [1460-1588] n=5  **-52** p=0.063 | 1512 [1460-1556] n=5  **-52** p=0.032 |

**KB transferred before the text** - median [min-max], n, change against the base, p:


| post | base | proposed tree | proposed tree + C2 (#1364) |
|---|---|---|---|
| N3 | 117 [95-125] n=5 | 0 [0-29] n=5  **-117** p=0.008 | 0 [0-0] n=5  **-117** p=0.008 |
| N5 | 117 [88-117] n=5 | 0 [0-0] n=5  **-117** p=0.008 | 0 [0-0] n=5  **-117** p=0.008 |
| O1 | 88 [88-91] n=5 | 0 [0-0] n=5  **-88** p=0.008 | 0 [0-0] n=5  **-88** p=0.008 |
| O3 | 91 [88-95] n=5 | 0 [0-0] n=5  **-91** p=0.008 | 0 [0-0] n=5  **-91** p=0.008 |

For the record, the first repeat-visit series of this task (a second visit in the *same* browser process) is kept below. **It is not a measure of package D**: with the lab's first certificate setting Chromium kept nothing in its HTTP cache (section 2, limit 4), so that series only reflects Blink's in-process memory cache, in which a `no-store` file is not reused and a cacheable one is:

**Content visible (ms)** - median [min-max], n, change against the base, p:


| post | base | D (static headers) | A+B+C1+C2+D (earlier tree) |
|---|---|---|---|
| N3 | 3734 [3579-3950] n=5 | 3503 [3449-3543] n=5  **-231** p=0.008 | 3525 [3419-3740] n=5  **-209** p=0.095 |
| N5 | 4022 [3979-5128] n=5 | 3845 [3715-4124] n=5  **-177** p=0.095 | 3896 [3751-4113] n=5  **-126** p=0.095 |
| O1 | 4185 [4135-4356] n=5 | 4294 [4138-4363] n=5  **+109** p=0.841 | 3899 [3879-4083] n=5  **-286** p=0.008 |
| O3 | 4352 [4208-4517] n=5 | 4295 [4131-4423] n=5  **-57** p=0.690 | 3958 [3926-3969] n=5  **-394** p=0.008 |

**First contentful paint (ms)** - median [min-max], n, change against the base, p:


| post | base | D (static headers) | A+B+C1+C2+D (earlier tree) |
|---|---|---|---|
| N3 | 1524 [1520-1524] n=5 | 1480 [1432-1520] n=5  **-44** p=0.016 | 1464 [1420-1516] n=5  **-60** p=0.008 |
| N5 | 1520 [1516-1528] n=5 | 1508 [1476-1520] n=5  **-12** p=0.056 | 1516 [1460-1528] n=5  **-4** p=0.730 |
| O1 | 1848 [1816-1904] n=5 | 1816 [1776-1948] n=5  **-32** p=0.714 | 1804 [1784-1820] n=5  **-44** p=0.024 |
| O3 | 1812 [1788-1848] n=5 | 1788 [1732-1836] n=5  **-24** p=0.246 | 1824 [1784-1880] n=5  **+12** p=0.738 |

### Combined: the trees measured as one

The **proposed tree** (A+B+D+C1+C3) is measured in section 7-C, item 4 (cold Slow 4G, Regular 4G, Slow 4G with a 14 s window) and in the second returning-visitor table of section 7-D. The tree measured first, **A+B+C1+C2+D**, still carried the ad-library change; its tables follow because they also cover conditions the proposed tree was not measured in (desktop, in-app navigation) and because the new posts N3 and N5 isolate package C in both. Where a table says "earlier tree" it is that one.

Cold, Slow 4G + 4x CPU (content visible, FCP, blocking time, bytes; "B" and "C1+C2" are n=5, the base and the earlier tree n=10):

**Content visible (ms)** - median [min-max], n, change against the base, p:


| post | base | B | C1+C2 (earlier tree) | A+B+C1+C2+D (earlier tree) |
|---|---|---|---|---|
| N3 | 6870 [6782-7097] n=10 | 6930 [6809-7170] n=5  **+60** p=0.594 | 6330 [6204-6441] n=5  **-540** p=0.001 | 6106 [6059-6440] n=10  **-764** p=0.000 |
| N5 | 6953 [6882-7206] n=10 | 7001 [6873-7175] n=5  **+48** p=0.859 | 6212 [6121-6238] n=5  **-741** p=0.001 | 6236 [6096-6312] n=10  **-717** p=0.000 |
| O1 | 7542 [7269-7847] n=10 | 7209 [7122-7330] n=5  **-333** p=0.002 | 6669 [6642-6974] n=5  **-873** p=0.001 | 6554 [6305-6924] n=10  **-988** p=0.000 |
| O3 | 7484 [7356-8002] n=10 | 7227 [7148-7389] n=5  **-257** p=0.003 | 6754 [6715-7112] n=5  **-730** p=0.001 | 6470 [6390-6656] n=10  **-1014** p=0.000 |

**First contentful paint (ms)** - median [min-max], n, change against the base, p:


| post | base | B | C1+C2 (earlier tree) | A+B+C1+C2+D (earlier tree) |
|---|---|---|---|---|
| N3 | 1532 [1500-1540] n=10 | 1532 [1492-1540] n=5  **+0** p=0.919 | 1528 [1508-1540] n=5  **-4** p=0.409 | 1530 [1468-1548] n=10  **-2** p=0.696 |
| N5 | 1530 [1440-1536] n=10 | 1528 [1476-1536] n=5  **-2** p=0.828 | 1536 [1508-1536] n=5  **+6** p=0.173 | 1532 [1508-1536] n=10  **+2** p=0.210 |
| O1 | 1850 [1752-1932] n=10 | 1856 [1840-1964] n=5  **+6** p=0.309 | 1852 [1788-1880] n=5  **+2** p=0.615 | 1840 [1780-2332] n=10  **-10** p=0.985 |
| O3 | 1868 [1784-1972] n=10 | 1836 [1760-1888] n=5  **-32** p=0.173 | 1836 [1780-1896] n=5  **-32** p=0.239 | 1832 [1764-1900] n=10  **-36** p=0.148 |

**Blocking time in the 3.5 s after the text (ms)** - median [min-max], n, change against the base, p:


| post | base | B | C1+C2 (earlier tree) | A+B+C1+C2+D (earlier tree) |
|---|---|---|---|---|
| N3 | 791 [689-947] n=10 | 851 [588-1037] n=5  **+60** p=0.859 | 602 [552-856] n=5  **-189** p=0.075 | 587 [472-868] n=10  **-204** p=0.002 |
| N5 | 450 [364-653] n=10 | 406 [382-537] n=5  **-44** p=0.614 | 399 [211-524] n=5  **-51** p=0.513 | 432 [360-460] n=10  **-18** p=0.247 |
| O1 | 494 [417-614] n=10 | 539 [462-741] n=5  **+45** p=0.165 | 286 [248-474] n=5  **-208** p=0.008 | 382 [265-1270] n=10  **-112** p=0.052 |
| O3 | 524 [427-860] n=10 | 594 [442-723] n=5  **+70** p=0.206 | 469 [438-591] n=5  **-55** p=0.768 | 602 [438-718] n=10  **+78** p=0.315 |

**KB transferred before the text** - median [min-max], n, change against the base, p:


| post | base | B | C1+C2 (earlier tree) | A+B+C1+C2+D (earlier tree) |
|---|---|---|---|---|
| N3 | 702 [702-702] n=10 | 702 [702-702] n=5  **+0** p=1.000 | 731 [731-731] n=5  **+29** p=0.000 | 731 [702-731] n=10  **+29** p=0.003 |
| N5 | 702 [697-702] n=10 | 702 [702-702] n=5  **+0** p=1.000 | 731 [731-731] n=5  **+29** p=0.000 | 731 [731-731] n=10  **+29** p=0.000 |
| O1 | 703 [703-865] n=10 | 700 [696-703] n=5  **-3** p=0.018 | 704 [704-704] n=5  **+1** p=0.002 | 704 [704-724] n=10  **+1** p=0.000 |
| O3 | 703 [703-886] n=10 | 703 [703-703] n=5  **+0** p=0.524 | 724 [704-724] n=5  **+21** p=0.042 | 724 [704-724] n=10  **+21** p=0.018 |

Regular 4G + 4x CPU:

**Content visible (ms)** - median [min-max], n, change against the base, p:


| post | base | A+B+C1+C2+D (earlier tree) |
|---|---|---|
| N3 | 3100 [2978-3438] n=10 | 2857 [2749-3053] n=5  **-243** p=0.005 |
| N5 | 3178 [2994-3386] n=10 | 2872 [2806-3094] n=5  **-306** p=0.005 |
| O1 | 3794 [3619-4109] n=10 | 3031 [3022-3070] n=5  **-763** p=0.001 |
| O3 | 3958 [3577-4308] n=10 | 3184 [3075-3290] n=5  **-774** p=0.001 |

**First contentful paint (ms)** - median [min-max], n, change against the base, p:


| post | base | A+B+C1+C2+D (earlier tree) |
|---|---|---|
| N3 | 1216 [1208-1244] n=10 | 1208 [1204-1220] n=5  **-8** p=0.034 |
| N5 | 1224 [1200-1248] n=10 | 1224 [1208-1240] n=5  **+0** p=0.936 |
| O1 | 1564 [1544-1584] n=10 | 1548 [1536-1560] n=5  **-16** p=0.188 |
| O3 | 1554 [1532-1596] n=10 | 1548 [1536-1584] n=5  **-6** p=0.837 |

**Largest contentful paint (ms)** - median [min-max], n, change against the base, p:


| post | base | A+B+C1+C2+D (earlier tree) |
|---|---|---|
| N3 | 3258 [3044-3700] n=10 | 2960 [2848-3156] n=5  **-298** p=0.008 |
| N5 | 3710 [3584-4016] n=10 | 4016 [3840-4160] n=5  **+306** p=0.013 |
| O1 | 4310 [4064-4540] n=10 | 3796 [3792-4036] n=5  **-514** p=0.001 |
| O3 | 4308 [3988-4776] n=10 | 3584 [3472-3784] n=5  **-724** p=0.001 |

**Blocking time in the 3.5 s after the text (ms)** - median [min-max], n, change against the base, p:


| post | base | A+B+C1+C2+D (earlier tree) |
|---|---|---|
| N3 | 1082 [979-1377] n=10 | 710 [682-866] n=5  **-372** p=0.001 |
| N5 | 924 [848-1193] n=10 | 671 [539-819] n=5  **-253** p=0.001 |
| O1 | 1085 [707-1337] n=10 | 887 [805-1030] n=5  **-198** p=0.028 |
| O3 | 1244 [886-1567] n=10 | 822 [708-914] n=5  **-422** p=0.001 |

Desktop (10 Mbps, no CPU slowdown):

**Content visible (ms)** - median [min-max], n, change against the base, p:


| post | base | A+B+C1+C2+D (earlier tree) |
|---|---|---|
| N3 | 2087 [2027-2147] n=5 | 1940 [1905-1978] n=5  **-147** p=0.008 |
| O3 | 2689 [2637-2815] n=5 | 2324 [2307-2415] n=5  **-365** p=0.008 |

**Largest contentful paint (ms)** - median [min-max], n, change against the base, p:


| post | base | A+B+C1+C2+D (earlier tree) |
|---|---|---|
| N3 | 2432 [2272-2436] n=5 | 2152 [2108-2220] n=5  **-280** p=0.008 |
| O3 | 3068 [3020-3436] n=5 | 2736 [2716-2892] n=5  **-332** p=0.008 |

**First contentful paint (ms)** - median [min-max], n, change against the base, p:


| post | base | A+B+C1+C2+D (earlier tree) |
|---|---|---|
| N3 | 1152 [1148-1156] n=5 | 1144 [1132-1156] n=5  **-8** p=0.230 |
| O3 | 1524 [1520-1532] n=5 | 1520 [1516-1536] n=5  **-4** p=0.405 |

Internal navigation (home to post, SPA):

**Content visible (ms)** - median [min-max], n, change against the base, p:


| post | base | A+B+C1+C2+D (earlier tree) |
|---|---|---|
| N3 | 1108 [1052-1246] n=5 | 1064 [952-1093] n=5  **-44** p=0.095 |
| N5 | 1330 [1117-1358] n=5 | 1312 [1183-1825] n=5  **-18** p=0.841 |
| O3 | 1144 [1018-2694] n=5 | 1072 [1018-1109] n=5  **-72** p=0.421 |

**Blocking time in the 3.5 s after the text (ms)** - median [min-max], n, change against the base, p:


| post | base | A+B+C1+C2+D (earlier tree) |
|---|---|---|
| N3 | 1382 [1104-1955] n=5 | 1130 [941-1268] n=5  **-252** p=0.095 |
| N5 | 1324 [1181-1567] n=5 | 1200 [1058-1299] n=5  **-124** p=0.222 |
| O3 | 1320 [982-1957] n=5 | 1078 [1010-1368] n=5  **-242** p=0.421 |

Earlier interleaved rounds 1-2 (n=10 per arm; builds *before* the review fixes: B without the release guard, C without the admin-aware classification, D with folder wildcards; the differences are not visible to a guest in the lab). They isolate C1 from C2:

**Content visible (ms)** - median [min-max], n, change against the base, p:


| post | base | B | C1 | C1+C2 | A+B+C1+C2+D (earlier tree) |
|---|---|---|---|---|---|
| N3 | 7108 [6806-7639] n=10 | 7154 [6963-7333] n=10  **+46** p=0.725 | 6305 [6054-6525] n=10  **-803** p=0.000 | 6446 [6345-6762] n=10  **-662** p=0.000 | 6318 [6118-6741] n=10  **-790** p=0.000 |
| N5 | 7042 [6872-7688] n=10 | 7254 [6990-7839] n=10  **+212** p=0.143 | 6438 [6177-6916] n=10  **-604** p=0.000 | 6482 [6139-6944] n=10  **-560** p=0.000 | 6564 [6406-6948] n=10  **-478** p=0.000 |
| O1 | 7686 [7446-8013] n=10 | 7294 [7175-7852] n=10  **-392** p=0.005 | 6920 [6687-7138] n=10  **-766** p=0.000 | 7040 [6843-7288] n=10  **-646** p=0.000 | 6702 [6586-6925] n=10  **-984** p=0.000 |
| O3 | 7730 [7412-8432] n=10 | 7486 [7308-8005] n=10  **-244** p=0.034 | 6942 [6710-7162] n=10  **-788** p=0.000 | 7076 [6871-7251] n=10  **-654** p=0.000 | 6670 [6571-7073] n=10  **-1060** p=0.000 |

**Blocking time in the 3.5 s after the text (ms)** - median [min-max], n, change against the base, p:


| post | base | B | C1 | C1+C2 | A+B+C1+C2+D (earlier tree) |
|---|---|---|---|---|---|
| N3 | 986 [735-1496] n=10 | 1122 [789-1357] n=10  **+136** p=0.796 | 833 [575-1241] n=10  **-153** p=0.105 | 953 [600-1228] n=10  **-33** p=0.631 | 804 [677-1191] n=10  **-182** p=0.063 |
| N5 | 538 [454-1013] n=10 | 651 [497-894] n=10  **+113** p=0.184 | 464 [361-713] n=10  **-74** p=0.138 | 642 [330-982] n=10  **+104** p=0.342 | 650 [407-799] n=10  **+112** p=0.305 |
| O1 | 594 [476-1220] n=10 | 657 [518-1050] n=10  **+63** p=0.393 | 460 [317-577] n=10  **-134** p=0.001 | 556 [411-605] n=10  **-38** p=0.143 | 503 [435-797] n=10  **-91** p=0.123 |
| O3 | 756 [483-1272] n=10 | 758 [539-1014] n=10  **+2** p=0.912 | 486 [300-759] n=10  **-270** p=0.003 | 722 [488-943] n=10  **-34** p=0.853 | 746 [620-924] n=10  **-10** p=0.971 |

## 8. What did not help (not shipped)

**Everything in this task that did not improve, in one place** (the first group is what the shipped packages did not do, the second what was measured and left out). Numbers are the proposed tree against `main` unless a row says otherwise; `n.s.` = not significant.

| what | result | where |
|---|---|---|
| first paint (FCP), cold | unchanged in every series: Slow 4G -24 to +20 ms, Regular 4G -4 to +4 ms (n.s.) | section 1 |
| blocking time in the 3.5 s after the text | Regular 4G unchanged (-14 to +57 ms, n.s.); Slow 4G mixed (N3 -93 ms p=0.016; N5 +28, O1 +75, O3 +114, n.s.). The earlier tree (C1+C2) had -114 to -331 ms on Regular 4G; it is gone in the proposed tree (C1+C3, no C2) | section 7-C |
| package B on posts at `/post/<slug>` | +60 / +48 ms (n.s.), +46 / +212 ms in the earlier rounds: none, as designed | 7-B |
| package D on the time to the text of a returning visit | -257 to +138 ms (n.s.): D saves 80-109 KB and 80-140 ms of first paint, not the time to the text | 7-D |
| returning visit, whole proposed tree | time to the text +6 to -330 ms (n.s.; O1 -330 ms, p=0.056, from package B); first paint -24 to -96 ms (p=0.016 on one post); adding C2 changes nothing (-14 to +44 ms) | 7-D |
| in-app navigation, home to post | -18 to -72 ms (n.s.), measured on the earlier tree | 7 |
| LCP of the reference post N5 on Regular 4G | the first integration (C1+C2) was +306 ms (p=0.013), the interleaved C1+C2 series +160 ms (n.s.); fixed by C3 (-152 ms, p=0.045) | 7-C |
| LCP of N3 (video post) | Regular 4G -166 ms (n.s.); C3 on top of C1+C2 made it 148 ms later (p=0.041) | 7-C |
| bytes before the text | +21 to +29 KB on three posts: the Post background now finishes before the text instead of after it; nothing extra is loaded | 7 |
| package A in the lab tables | invisible by construction: the lab models the document delay as a constant; proved by the server measurement | 7-A |
| C2 (ad library on approach, #1364) | no change in the time to the text (-51 to +180 ms, n.s.), more blocking time on two posts (N5 +118 ms p=0.041, O3 +171 ms p=0.002); left out | 7-C |
| preloading the route graph / the LCP image | rejected, below | 8 |
| the first repeat-visit series | invalid (no HTTP cache in the lab browser); kept, labelled, and replaced for D | 2, 7-D |

Experiments of this task that did **not** help. They were run against the same base, same conditions, n=5 per post (`x*` stages), and are reported because they are the obvious ideas.

**Content visible (ms)** - median [min-max], n, change against the base, p:


| post | base | img_preload | graph_preload | both_preload |
|---|---|---|---|---|
| N3 | 7062 [7006-7309] n=5 | 7241 [7086-7492] n=5  **+179** | 6908 [6770-7548] n=5  **-154** | 7100 [7022-7439] n=5  **+38** |
| N5 | 7192 [7086-7371] n=5 | 8094 [7882-8639] n=5  **+902** | 6888 [6881-6987] n=5  **-304** | 7743 [7688-8014] n=5  **+551** |
| O1 | 7566 [7487-7847] n=5 | 8173 [8036-8261] n=5  **+607** | 7331 [7209-7535] n=5  **-235** | 7837 [7831-8025] n=5  **+271** |
| O3 | 7890 [7666-8272] n=5 | 8172 [8141-8428] n=5  **+282** | 7327 [7197-7600] n=5  **-563** | 7874 [7764-7958] n=5  **-16** |

**First contentful paint (ms)** - median [min-max], n, change against the base, p:


| post | base | img_preload | graph_preload | both_preload |
|---|---|---|---|---|
| N3 | 1540 [1464-1544] n=5 | 1536 [1488-1540] n=5  **-4** | 1988 [1848-2260] n=5  **+448** | 1936 [1884-2272] n=5  **+396** |
| N5 | 1512 [1472-1540] n=5 | 1532 [1480-1536] n=5  **+20** | 1892 [1460-1976] n=5  **+380** | 1892 [1860-2176] n=5  **+380** |
| O1 | 1860 [1772-1920] n=5 | 1872 [1816-1912] n=5  **+12** | 2328 [1824-2668] n=5  **+468** | 2328 [2260-2368] n=5  **+468** |
| O3 | 1880 [1820-1952] n=5 | 1840 [1804-1876] n=5  **-40** | 2292 [1808-2328] n=5  **+412** | 2308 [2292-2328] n=5  **+428** |

* **Preloading the route graph from the document** (`modulepreload` of the 57 chunks injected into the post document): the content appears 154-563 ms earlier (2-7 %), but the opening shell paints **380-468 ms later** (FCP) because the preloaded graph competes with the entry, the CSS and the fonts for the same slow link (the entry finishes at 4.9 s instead of 2.9 s), and the local HTTP/2 server does not reproduce the CDN's prioritisation, so the result is not conclusive in either direction. Not shipped.
* **Preloading the LCP image from the document** (`<link rel=preload as=image fetchpriority=high>` for the first image of each post): the content appears **179-902 ms later**; the image competes with the scripts. Not shipped. (Both together: -16 to +551 ms.)
* **Per-vendor cost of third parties** (the Google tag alone, the Pixel alone, the ad library alone, all blocked) is table 3 below and drives package C.
* **First "warm" measurements were invalid and are not used**: Playwright's request interception disables Chromium's HTTP cache, so a repeat visit was measured as a cold one. The warm series of section 7 runs without interception.
* **Two concurrent requests instead of one `in.(...)` request** (the first version of package A; it is the first commit of the branch and was replaced after the review): the same time as the single request in the sandbox (O1 cold 298 / 298 ms, warm 208 / 205 ms; table of section 7-A). That measurement does not cover a connection pool with exactly one idle socket (for example an instance that so far served only new posts), where the second concurrent request pays a new TCP+TLS handshake to Tokyo (about three round trips) and the pair can be slower than the sequential reads it replaces. The single request has the same latency without that case, so it is the one that ships.

| post | arm | cold process: median [min-max] ms | warm pool: median [min-max] ms | requests |
|---|---|---|---|---|
| O1 | base (two reads, one after the other) | 548 [487-669] (n=8) | 394 [388-408] | 2 |
| O1 | two concurrent requests (not shipped) | 298 [276-313] (n=8) | 208 [190-262] | 2 |
| O1 | one request, `slug=in.(a,b)` (package A) | 298 [279-331] (n=8) | 205 [190-216] | 1 |
| O3 | base (two reads, one after the other) | 538 [508-579] (n=8) | 413 [380-447] | 2 |
| O3 | two concurrent requests (not shipped) | 308 [263-442] (n=8) | 216 [199-268] | 2 |
| O3 | one request, `slug=in.(a,b)` (package A) | 295 [255-454] (n=8) | 214 [205-219] | 1 |
| O4 | base (two reads, one after the other) | 558 [517-605] (n=8) | 409 [379-460] | 2 |
| O4 | two concurrent requests (not shipped) | 294 [277-611] (n=8) | 206 [196-322] | 2 |
| O4 | one request, `slug=in.(a,b)` (package A) | 308 [264-413] (n=8) | 200 [189-218] | 1 |
| N1 | base (two reads, one after the other) | 302 [270-531] (n=8) | 200 [190-217] | 1 |
| N1 | two concurrent requests (not shipped) | 290 [259-321] (n=8) | 205 [186-218] | 1 |
| N1 | one request, `slug=in.(a,b)` (package A) | 278 [261-300] (n=8) | 192 [188-218] | 1 |


**Table 3 — cost of each third party (experiments `x0`, `x4`; content visible, ms; "only X" = the other two vendors blocked; "all blocked" = none loaded):**

**Content visible (ms)** - median [min-max], n, change against the base, p:


| post | base | all_blocked | gtag_only | pixel_only | ads_only |
|---|---|---|---|---|---|
| N3 | 7062 [7006-7309] n=5 | 6373 [6263-6577] n=5  **-689** | 6641 [6540-7174] n=5  **-421** | 6563 [6433-6918] n=5  **-499** | 6215 [6066-6409] n=5  **-847** |
| N5 | 7192 [7086-7371] n=5 | 6591 [6286-6660] n=5  **-601** | 6999 [6607-7838] n=5  **-193** | 6765 [6609-7029] n=5  **-427** | 6218 [6097-6355] n=5  **-974** |
| O1 | 7566 [7487-7847] n=5 | 7026 [6704-7083] n=5  **-540** | 7418 [7239-7480] n=5  **-148** | 7189 [7121-7343] n=5  **-377** | 6885 [6763-7130] n=5  **-681** |
| O3 | 7890 [7666-8272] n=5 | 6986 [6874-7023] n=5  **-904** | 7356 [7324-7618] n=5  **-534** | 7224 [7117-7497] n=5  **-666** | 6935 [6884-7162] n=5  **-955** |

Blocking time (ms) for the same arms:

**Blocking time in the 3.5 s after the text (ms)** - median [min-max], n, change against the base, p:


| post | base | all_blocked | gtag_only | pixel_only | ads_only |
|---|---|---|---|---|---|
| N3 | 991 [823-1203] n=5 | 429 [322-554] n=5  **-562** | 656 [504-722] n=5  **-335** | 480 [372-818] n=5  **-511** | 573 [533-686] n=5  **-418** |
| N5 | 615 [496-755] n=5 | 328 [258-455] n=5  **-287** | 470 [383-806] n=5  **-145** | 404 [320-523] n=5  **-211** | 513 [345-548] n=5  **-102** |
| O1 | 619 [536-715] n=5 | 418 [258-499] n=5  **-201** | 594 [430-658] n=5  **-25** | 424 [354-566] n=5  **-195** | 566 [433-840] n=5  **-53** |
| O3 | 857 [805-1146] n=5 | 413 [305-466] n=5  **-444** | 544 [459-743] n=5  **-313** | 461 [361-601] n=5  **-396** | 654 [435-811] n=5  **-203** |

Reading (these arms were run one after the other, n=5, and the base drifted by up to 0.4 s between series, so each figure is good to about +-0.25 s; the interleaved result of package C is the proof, this table only explains it): against "all blocked" the Google tag alone costs +0.27 to +0.41 s of content-visible time and the Pixel alone +0.16 to +0.24 s; the ad library alone costs nothing before the content (it starts after the article) but adds blocking time and delays LCP (section 7-C). Together the three cost +0.54 to +0.90 s.

## 9. Release request (one request, four independent packages)

**Requested (ZURIEL), executed at Codex after review:** merge the four draft PRs below and release the exact merged SHA as one production deployment by the procedure written in CLAUDE.md ("נוהל פריסה ל־Production מסשן ענן"), then verify and keep the rollback ready. No SQL, flag, secret, project setting, Edge function or database change is part of it. PR #1364 (the ad-library change) is **not** part of the request.

| order | PR | branch @ head | what changes | CI on that head | independent? |
|---|---|---|---|---|---|
| 1 | #1360 A | `claude/perf-post-document-reads-20261115` @ `1782b9f78` | `api/og.js` (one Supabase request for the two spellings of a post address) + tests + 1 CI step | 13/13 success | yes (server function) |
| 2 | #1362 D | `claude/perf-static-asset-cache-20261115` @ `15f14f2d7` | `public-reading-deploy/vercel.json` (14 cache rules) + test + 1 CI step | 12/12 success | yes (config) |
| 3 | #1361 B | `claude/perf-post-root-address-early-read-20261115` @ `0dea8b199` | `src/App2029.jsx` (new entry + one route element), `PublicPostAddress2029Page.jsx` + tests + 2 CI steps | 13/13 success | yes (client) |
| 4 | #1363 C | `claude/perf-post-third-party-after-article-20261115` @ `2557c661e` | `src/App2029.jsx` (marker + gate + cover wait) + browser test; its history contains the ad-library change and its revert, so that the PR's net content is C1 + the classification fix + C3 | 13/13 success | yes (client); C3 can be dropped alone (revert of its commit) |
| - | #1364 C2 | `claude/perf-ad-library-on-approach-20261115` @ `3fd3634e1` | `AdSlot.jsx` only | 12/12 success | optional, **not requested**, see section 11 |

*Dependencies and order.* None of the packages needs another; the order is risk-ascending (a server function and a config first, then the two client changes). Merged in that order (squash or merge commits alike) the tree equals the tree that was measured as "proposed tree": `2a10415e8bdcd8c6f1e7c258fd01e4ae4b1ef70f` (checked: sequential merges of the four heads on `c2acc064b` give exactly this tree, and so does an octopus merge). A and D are `public-reading-deploy`/function changes, B and C are bundle changes; one deployment of the merged SHA carries all of them. A staged release (A and D first, then B and C) is equally valid and lets the first live checks isolate the server and header effects from the client ones.

*Known merge points.* (1) C and Codex's #1357 both edit `RouteEffects2029` in `src/App2029.jsx`; whichever merges second gets exactly one conflict, on the cleanup line, and nothing else. Resolution (checked here: the merged result passes `measurement-page-view-once-2029`, `public-reading-observability`, `measurement-package-scope` and `adsense-gating-2029`, 23/23): `return () => { stopped = true; stopPageview?.(); observer?.disconnect(); clearTimeout(timer); clearTimeout(capTimer); if (idle != null) window.cancelIdleCallback?.(idle); };` (C adds `capTimer` and `clearTimeout(capTimer)`, #1357 removes `settle`). (2) PR #1358 (the Post live-experience prototype of another session) edits `api/og.js` in a different region (the preview-unit meta, after the spelling loop); a dry-run merge of #1358 with each of A, B, C and D is conflict-free. Nothing else overlaps; a dry-run merge of every pair of the four branches is conflict-free.

*Rollback.* `assign_alias` of `sod1820.co.il`, `www.sod1820.co.il` and `sod1820.vercel.app` back to the deployment they point to immediately before the action (`dpl_J2wg6mqptCp8vFkfDbxz31dtHzoH` when this request was written; read it again with `get_alias` before moving anything and report it). A single package can instead be reverted by its own PR (C3 by reverting its commit). Rollback restores neither data nor media (nothing was changed in either); browsers that already stored the cached fonts and images keep them until they expire (a day for the brand files, a week for the fonts), and they are identical files.

*Verification after the deployment (nothing here is claimed in advance):*
1. Served identity: the live manifest/source SHA equals the merged SHA, all three aliases point to it; `post-deploy-canary` result kept and reported as it is (no override of the 15,000 ms limit).
2. Headers (package D; no test applies them): `cache-control` of one background (`immutable`), one font and one brand image (`max-age`), a missing `/fonts/zzz` and `/brand/2029/zzz` (must stay `no-store` or have no public lifetime), `/`, `/post/<slug>`, `/sw.js` (`no-store`). Then a returning visit in a real browser (DevTools, Network panel): after the browser was restarted, the fonts, the brand mark and the Post background must be served from the disk cache (`tools/warm_probe.mjs` needs the lab server and cannot be pointed at the live origin).
3. Documents (package A), narrow and sequential: `tools/ttfb_probe.py` on O1, O3, O4, N1, N5, 6 rounds, 3 s apart: expected, for the old posts only, a server wait lower by about one Supabase round trip (about 200 ms) than the baseline of this document; N1/N5 unchanged.
4. Lab on the live site (B, C): `tools/lab2.mjs` live mode (`mode: "live"`) on the fixed sample, Slow 4G + 4x CPU, narrow, sequential, n=3 per post, Israel time zone, against the live baseline taken before the release (`data/live-baseline-il.json`); the lab tables above are the expectation, not a promise.
5. Field: the same read-only RUM query as section 3 over the 7 days before and the 7 days after the alias move (same weekdays; the exclusion list of synthetic windows kept; counts n reported with every row); original-address and `/post/` posts compared separately; **no mobile claim is possible** (no device), and builds are told apart only by the alias-move time. The query is in `tools/field_rum.sql`.
6. Measurement sanity (package C): `post-speed-page-analytics` and the Codex GA tests pass in CI; compare GA `page_view` per post visit and Meta PageView against `site_visits` for the same 7 days to see the size of the effect described in section 7-C.

*Decisions that are not part of this request* (ZURIEL; listed in section 11): the ad-library timing (#1364), the middleware existence check (F5), a document CDN policy, the function region against the Tokyo database, reuse of the finished branch-only work, font preload trimming and the shell split.

## 10. State read at the end of the task

Read at the end of the task, 2026-11-15 about 19:55-20:05 UTC (read-only):

* **Repository** `zuriel337/sod1820`: `origin/main` = `c2acc064be31df93a229637bc32305a951c8006b` (#1356), **unchanged since the task started**.
* **Production**: `sod1820.co.il`, `www.sod1820.co.il` and `sod1820.vercel.app` all point to `dpl_J2wg6mqptCp8vFkfDbxz31dtHzoH` (target production, READY, region iad1, created 2026-11-15 13:25 UTC, source `c2acc064be31df93a229637bc32305a951c8006b`). Nothing in this task changed it: no merge, no deployment, no alias move, no database write, no flag, no setting. The rollback target for the release in section 9 is that deployment (re-read it before acting).
* **Branches and pull requests of this task** (all drafts, none merged; CI = the repository's required jobs on that head):

| PR | branch @ head | CI |
|---|---|---|
| #1360 A | `claude/perf-post-document-reads-20261115` @ `1782b9f78` | 13/13 success |
| #1362 D | `claude/perf-static-asset-cache-20261115` @ `15f14f2d7` | 12/12 success |
| #1361 B | `claude/perf-post-root-address-early-read-20261115` @ `0dea8b199` | 13/13 success |
| #1363 C | `claude/perf-post-third-party-after-article-20261115` @ `2557c661e` | 13/13 success |
| #1364 C2 (optional) | `claude/perf-ad-library-on-approach-20261115` @ `3fd3634e1` | 12/12 success |
| #1365 (this document) | `claude/perf-post-speed-evidence-20261115` | see its pull request (documentation only) |

* **Tests run locally on the final heads** (local runs are separate from CI): A: the 16 test files that mention `api/og.js`, 190/190; B: 27/27 (entry test, the pins of `PostEntry2029`, source-invitation, source-request) and its browser test 2/2 (run on the proposed tree); C: 22/22 unit and 8/8 browser; D: 64/64 (7 files); the combined unit set on the proposed tree 63/63 and both browser files 10/10; the budgets of every tree pass (`data/budgets.txt`: eager gzip 222,891 B on main, +23 B (B), +51 B (C), +0 (A, D), +71 B for the proposed tree).
* **Overlaps**: no journal row claims a file of these packages; the journal rows of 15.11 17:40 and 19:26 (`POST_HIERARCHY_PROJECTOR_UNIFICATION_20261115`, `POST_HIERARCHY_PUBLIC_COPY_ADDENDUM_20261115`, GPT to ZURIEL) concern the post's public hierarchy and copy: package C depends on two facts of `Post2029Page` (the reading surface `article[data-experience-surface="post-reading"]` and the cover image with `fetchpriority="high"` inside it), both pinned by `test/post-third-party-after-article-20261115.browser.mjs`; a redesign of that hierarchy must keep them or update that test. Open pull requests that touch the same files: #1357 (one line, section 9) and #1358 (`api/og.js`, different region, conflict-free).
* **Journal**: this task's rows are `d9bdd7fe` (BEFORE, READ_ONLY), `d2d03323` (BEFORE_WRITE, files listed) and an AFTER row written after this document (it carries the final SHAs and this document's commit). Everything is passive, to ZURIEL, no dispatch.
* **Live baseline taken now** for the post-release comparison (Israel time zone, real third-party scripts allowed, beacons and writes refused, Slow 4G + 4x CPU, sandbox egress, n=3 per post, medians in ms; `data/live-baseline-il.json`):

| post | TTFB | FCP | content visible | LCP | blocking time | n |
|---|---|---|---|---|---|---|
| O1 | 1,834 | 2,196 | 10,283 | 12,232 | 959 | 3 |
| O3 | 829 | 1,240 | 8,499 | 10,016 | 1,008 | 3 |
| N3 | 1,195 | 1,532 | 8,357 | 9,192 | 1,177 | 3 |
| N5 | 1,439 | 1,848 | 8,385 | 12,248 | 1,048 | 3 |

* **Local-only**: a local branch `claude/perf-post-speed-integration-20261115` (the first octopus merge) exists only in the session's worktrees and was never pushed; the measured tree is identified by its hash (section 9), not by a branch.

## 11. Limits, disclosures and open decisions

* **No live change of any kind**: no merge, no deployment, no alias, no database write, no flag, no setting, no cherry-pick from an old branch. Everything is on the branches listed in section 9 (and the evidence branch of this document). The branch pushes created five pull requests (four requested, one optional) and this document's pull request; none was merged.
* **Lab is not field.** The lab is a deliberately slow, local emulation of the production build: matching narrow live runs without third parties within -2 % to +9 % but 1.4-2.8 s faster than the live site with the real third-party scripts (section 2), so only differences between builds are meaningful, one phone profile plus a milder one, no physical phone, no INP. Field data cannot separate phones from desktops, builds from each other, or the LCP element (no `device`, no build id, no LCP element in the RUM rows); a gain in the field must be confirmed after an approved release by the protocol of section 9.
* **The instrument had two flaws, both found and handled** (section 2, limit 4): request interception disabled the HTTP cache in the first repeat-visit runs (discarded), and the lab browser's certificate setting kept the HTTP cache empty in the next ones (found by `tools/warm_probe.mjs` while explaining a result for package D; the repeat-visit series of package D was re-run with a corrected, verified setting; the old series is kept, labelled).
* **LCP is censored** in series that observe only 3.5 s after the text when the largest image finishes later (the Slow 4G cover images do); the 14 s-window series (section 7, package C) is the one to read for LCP on Slow 4G. In repeat-visit runs the LCP candidate is bimodal (the brand mark at first paint or a later element), so those LCP rows are not interpreted.
* **Sample sizes are small** (n=3 to 10 per arm and post); p-values are two-sided Mann-Whitney tests on runs that are not independent draws of a population (one machine, one emulated device); they are a guide to which differences are larger than the run-to-run spread. Differences under about 150 ms are not claimed. Three-run series cannot reach p<0.1.
* **Incident disclosure (already in the journal row `d9bdd7fe`).** (a) The browser audit of the preceding URL-continuity task (2026-11-15 01:00-04:00 UTC) did not block `rpc/ingest_event`: about 770 synthetic events (231 views) were written to `events`, indistinguishable row by row (estimated excess 550-700 events, 215-230 views). (b) One smoke run of this task at ~13:55 UTC sent about four `ingest_event` events (device `mobile`) before the lab was given a deny-by-default allow-list of read-only RPCs. The field tables of section 3 exclude those windows (01:00-04:30 and from 13:20 UTC); nothing was corrected or deleted - marking or excluding them in reports is Codex's/ZURIEL's decision. No later run writes anything: in fixture mode every host is the local lab server, which answers everything that is not a read with 204, and live runs refuse every RPC that is not on the verified STABLE allow-list.
* **Load placed on production, for the record.** About 32 narrow, sequential browser loads of the live site (cold, mobile and desktop, third-party scripts blocked or scripts only, all beacons and writes refused), about 60 single document requests for the server-wait probes, read-only REST reads of public post rows for the server measurements (192 timed handler calls in the first series and 128 in the final one, each one or two reads), and one more narrow live baseline at the end (section 10). No parallel load, no write.
* **Ownership.** Measurement code, events, `analytics.js`, `transport.js`, `visits.js`, `publicReadingTelemetry2029.js` and the admin reports are untouched. Package C changes only *when* the existing Google tag and Pixel start on a Post page and adds a DOM mark for it; it overlaps in file (not in line) with Codex's #1357, which edits `RouteEffects2029`, in one line (section 9).
* **Open decisions for ZURIEL** (not decided here): (1) the ad-library timing (#1364, optional; no speed case); (2) whether the later start of the Google tag and the Pixel is acceptable for the analytics counts (Codex sign-off on `traffic_intelligence`); (3) the middleware existence check (F5); (4) a document CDN cache policy; (5) the function region against the Tokyo database; (6) reuse of the finished branch-only work (B01 source-first, B02 media deferral, B03/B04 renditions); (7) trimming the four font preloads (October lab: FCP -210 ms with two) and splitting the shell; (8) staged or single release.

## 12. Files in this folder

| path | what it is |
|---|---|
| `README.md` | this document (rendered by `tools/render_readme.py` from the tables below; nothing in it is typed by hand where a number comes from a measurement) |
| `tables/*.md`, `tables/*.json` | every table of the README, produced by `tools/make_tables.py` / `tools/compare.py` from the per-run file below (medians, min-max, n, delta, exact Mann-Whitney p) |
| `data/runs.csv` | one row per lab run of every stage, unfiltered (`tools/export_runs.py`); the raw request-level files (about 36 MB) are kept out of the repository |
| `data/sample-posts.json`, `data/field-rum-20261115.json`, `data/live-baseline-il.json`, `data/budgets.txt` | the fixed sample, the field query result (section 3), the narrow live baseline (section 10), the first-load/built-graph guard outputs per tree |
| `archaeology/archaeology-git-prs.md`, `archaeology/archaeology-handoffs.md` | the two reading reports behind section 4 (Git, PRs, deployments; journal, documents, field data), each with its provenance note |
| `tools/lab2.mjs`, `tools/lab3.mjs`, `tools/labserver2.mjs` | the lab: Playwright/CDP harness (`lab3` adds the returning-visitor scenario and the trusted lab certificate) and the local HTTP/2 server that serves a built tree with its own production headers and replays recorded read-only responses |
| `tools/lab.mjs`, `tools/labserver.mjs` | the first versions of the lab (early baseline, live probes and the `x*` experiments of section 8); `lab2`/`lab3` supersede them for every series that compares trees |
| `tools/run_after.sh`, `tools/run_after_ab.sh`, `tools/run_experiments.sh`, `tools/run_live_base.sh`, `tools/show.py`, `tools/decomp.py` | session helper scripts (stage chains, live baseline runner, the decomposition table of section 5) |
| `tools/mkcfg.py`, `tools/run_ab.sh`, `tools/run_ab2.sh`, `tools/build_wt.sh` | stage configuration, sequential stage runner, production-style build of a worktree |
| `tools/analyze.py`, `tools/compare.py`, `tools/make_tables.py`, `tools/make_summary_tables.py`, `tools/cpu_table.py`, `tools/tp_start_table.py`, `tools/export_runs.py`, `tools/render_readme.py`, `tools/pr_tables.py`, `tools/pr_bodies.py` | analysis and table generation |
| `tools/warm_probe.mjs` | the probe that found the lab's HTTP-cache flaw and verifies the cache on a returning visit |
| `tools/og_cold.mjs`, `tools/og_ab.sh`, `tools/og_ab_final.sh`, `tools/og_trace.mjs`, `tools/ttfb_probe.py`, `tools/variant_probe.mjs` | server-side measurements (handler time in a fresh process, live document wait) |
| `tools/budgets.sh`, `tools/after_fin.sh`, `tools/field_rum.sql` | budget check per tree, the end-of-task chain, the read-only field query |

The tools were run from a scratch directory that holds the stage configurations (`data/cfg-*.json`, written by `tools/mkcfg.py` from `tools/cfg-template.json`) and the raw stage files (`data/*.jsonl`); they are published as the method, not as a ready-to-run package: paths in the configurations are those of that machine.
