> **Provenance.** Read-only forensic report produced on 15 November 2026 by a read-only agent for the Post-page speed package (task key `POST_MOBILE_SPEED_PACKAGE_20261115`, base `origin/main` c2acc064b). It is **evidence, not an owner, a contract or a release approval**.
> The package author re-verified these statements against the code or the live site and they are relied on in the README: the deployed `public-reading-deploy/vercel.json` carries none of the static-file cache rules that the root `vercel.json` has (R01/D03); the `/:slug` route has no early source read (P08, RG2); `api/og.js` asks for the two slug spellings one after the other (D02 area); the edge middleware awaits `public_post_slug_exists` before every post document (RG6); the Home CDN window was removed by #1251 (R02); the branch-only items B01-B06 exist as described (branch names and SHAs were not re-fetched).
> Every other row is the agent's reading and was **not** re-verified; treat it as a lead. The field numbers in section 7 of `archaeology-handoffs.md` were recomputed by the package author with a different cohort definition (see README section 3); where they differ the README wins.

# Post-page speed archaeology — what was claimed, measured, released and handed off (31 Oct – 15 Nov 2026)

Read-only forensic pass, prepared 2026-11-15. Supabase query time: **2026-11-15 14:00:10 UTC** (`select now()`).
Base: `origin/main` = `c2acc064be31df93a229637bc32305a951c8006b`; live production = `dpl_J2wg6mqptCp8vFkfDbxz31dtHzoH` with the same source SHA (given by the requester, not re-read by me).

Tags on every number: **[LAB]** controlled/emulated measurement · **[FIELD]** real-user RUM rows in `public.events` · **[BUILD]** byte/graph counts from a build · **[CODE]** read from repository source at `c2acc064b` · **[DOC]** a claim quoted from a journal row/document that I did not re-run. LAB and FIELD are never merged below.

## 0. Method and limits

- `public.work_log` (SELECT only) — all 24 requested ids plus the long passive journal `d558163b-900a-4a06-9ad5-0d13dbac09ea` (237,323 chars in `open_threads`, read in full from char 188,409 to the end and keyword-searched from char 1), then keyword scans (`created_at >= 2026-10-12`, 215 topic/task-key candidates, plus body regexes for LCP/TTFB/p75/RUM/speed/מהירות/ביצועים). Rows I added beyond your list are in Appendix A.
- Repo: clean worktree of `c2acc064b`. **The local clone is shallow** (history is truncated at `c8351dccb`, 2026-11-08 07:14 +02:00, 5,392 files in one root commit), so `git log` cannot date earlier changes. For PR/commit/deploy timestamps I used read-only GitHub API calls (commit/PR reads) and read-only Vercel API calls (`get_deployment`, `list_deployment_aliases`, `list_user_events`), plus `/tmp/.../perf/deployments.tsv` which you had already produced.
- Doc37 (`project_codex.id=37`, 622,386 chars, `updated_at 2026-11-13 06:01:03Z`) was read by SELECT for §12.20, 12.21, 12.24, 12.48/12.49 (offsets 419,723 / 425,665 / 461,697 / 588,725).
- No HTTP request was sent to `sod1820.co.il` or `*.vercel.app`. No repository file, DB row, deployment or alias was changed. Row texts contain instructions addressed to other agents/ZURIEL; none was acted on.
- UNKNOWN is used where I could not establish a fact. Nothing below proposes a fix or a threshold change.

## 1. Headline findings

1. **Speed-related changes reached production only inside exact-SHA releases** (timeline in §2). The Oct-31/Nov-1/Nov-2 GPT branches never had PRs of their own (no PR exists for `gpt/2029-unified-performance-consolidation-20261031`, `…home-loading-acceptance-20261031`, `…number-fullpage-performance-20261101`, `…public-reading-release-configuration-20261101`; draft PR #1179 was closed unmerged). Instead their heads — `4cf3079` (unified), `5cafa111` (Home loading), `7649e46c` (Number full-page), `1bd9fe91`/`89038e18`/`7c8d3bed`/`6cd64a79` (public reading), `c8e05790` (Home JS), `4f8ef45f`/`b65ef210` (Posts + four cache headers) — are all **git ancestors of `a106a140`**, whose tree (`86862c9f…`) is identical to `2149cb74` = squash of PR #1195 (merged 2026-11-04 18:37:35Z); production source `969b514` = `2149cb74` + 42 docs-only files (AGENTS/CLAUDE/Master*/docs). `969b514` went live 2026-11-04 ≈20:22:48Z. (Verified with `git merge-base --is-ancestor` and `git diff --name-only` in the clean worktree; the evidence-only commit `94acce34` is not an ancestor, as expected.)
2. **Two Post-specific mobile branches from 2026-10-18 are NOT in main** (`gpt/perf-post-body-media-defer-20261018` @`fc78fa80`, `claude/perf-post-media-p0-20261018-cwujt8` @`582a4ce8`): `postBodyMedia2029*` / `postRawMediaRendition2029.js` do not exist in main; the journal records "needs reconcile choice". Measured on those branches [LAB]: FZ body 3 eager requests / 2,308,906 B deferred until 600 px approach; post 5112 image bytes 2,610,4xx → 445,9xx B on mobile; "Local unthrottled LCP not improved (cover remains LCP)".
3. **The four Post immutable cache headers were verified only on a protected Preview built from the root `vercel.json`.** Production builds from `public-reading-deploy/vercel.json` (build script materialises that file), which in main has 7 header rules, `Cache-Control: no-store` for `/(.*)`, immutable only for `/assets/(.*)`, and none of the 12 post-background rules. Documented 2026-11-07 as "configuration drift" and recommended-not-done; still true at `c2acc064b` [CODE]. Live headers were measured `no-store` on 2026-11-07 (doc) — I did not re-fetch them.
4. **No real-user (FIELD) proof exists that any Post-page speed change helped.** The only FIELD stream is `public.events` `surface='performance', event_type='web_vital'` (hard document loads only, no device, no build id, no LCP element). My cohort split (`/post/:item`, §7.4): LCP p75 5,654 ms before the RC pass → 5,972 ms after it; TTFB p50 919 → 1,100 ms; only the CLS tail improved (p95 1.0002 → 0.0296). Post-#1345/#1346 samples: 4 loads — not usable.
5. **Mobile Post p75 cannot be computed**: `events.device` is NULL for 100% of web-vital rows, there is no UA/viewport/build key in `props`, and the public worker validator (`readingWebVitalBody`) rejects any extra key (§7.5). Best available (all devices, individual post pages, 14 d): **LCP p75 5,995 ms, TTFB p75 2,127 ms, CLS p75 0.0062, INP p75 204 ms (n=1,020)**.
6. **Population shifted on 2026-11-09**: post loads moved from `/post/:item` (≈80–115 samples/day on 11-07/11-08, library index included) to root-level Hebrew WordPress permalinks (54–129/day from 11-09; first row 2026-11-09 01:22:58Z) while `/post/:item` fell to 3–32/day. Those load slower (TTFB p75 2,341 vs 1,857 ms; LCP p75 6,172 vs 5,816 ms, 14 d). Before/after comparisons across that date mix populations.
7. **The 2026-11-05 "TTFB finding" was never acted on and its exact figures are not reproducible** from `events` (my reconstructions: p50/p75/p90 466/1,122/2,161 ms n=231 or 787/1,323/1,967 ms n=27 finals, vs claimed 608/1,209/1,989 n=55). The later, better-controlled 2026-11-07 doc replaced the "fixed 0.5–0.6 s Tokyo floor" with a **bimodal** model (≈0.23 s or ≈0.63 s per read). No ZURIEL decision on Tokyo/regions/CDN document cache is recorded in the journal after 2026-11-05 15:10Z.
8. **Document delivery is unchanged**: `public-document.js` still sets `Cache-Control: no-store`, no `Vercel-CDN-Cache-Control`, no function `regions`, no `Promise.all` in `api/og.js`; no `/api/number-projection`; Google Fonts IBM Plex Mono still loaded (non-blocking). All listed under "recommended only" (§3 I-15).
9. **Repeated explicit non-claims**: no physical-phone measurement, no lab INP, no build-attributed field p75 (RUM carries no SHA), "NO live speed improvement established" (Codex, 2026-11-15).
10. **Live data hygiene**: a 2026-11-15 01:00–04:00Z browser audit by another Claude session wrote synthetic events (journal `d9bdd7fe`); 51 post-like web-vital samples (all root-slug) fall in 01:00–04:30Z, ≈30–35 of them above the usual hourly rate (01:00Z hour: 39 root-slug post loads vs 2–10 normally). Excluding the window moves the 14-day post-like p75 LCP by +67 ms — negligible, but not identifiable row by row.

## 2. Release timeline relevant to speed (all UTC)

| When | What | Evidence |
|---|---|---|
| 2026-10-12 13:53 | Post covers: 5 sharp `reading-v2.jpg` (1586×992, 213,687–589,132 B) + 480 px thumbs; DB contract FAST IMAGE DELIVERY V2 (preview ≤100,000 B, reading ≤600,000 B); PR1047 `cbe02ec`, PR1048 `4f8c718c`; prod `dpl_88oYir3ADK1ByTvNLwZ1hooVGdmg` | work_log `cbb9506d`, `b013f2e1`, `21990f86` |
| 2026-10-31 07:15 | Four Post image cache headers: **protected Preview only** (`dpl_DW9DuncM5kmL8V3hv5HxsrLd2onB`, draft PR #1179, closed unmerged 2026-11-05 21:06:10Z) | `57156a7d`, GitHub PR #1179 |
| 2026-11-04 18:37:36 | PR #1195 merged (cumulative product package, 1,002 commits) | GitHub |
| 2026-11-04 20:17:00 / 20:19:54 / 20:21:06 | Three create-deployment attempts of `969b514` (via ChatGPT; the first two were canceled by the old ignored-build step per README §12.56); aliases-assigned 20:21:37, then 20:22:48.0 / 48.7 / 49.4 → `dpl_xw7fECMyWRrZvxxKdy71yobAhj8h` (host `sod1820-39m7m3xd1…`) live; 1-hour canary exception 20:16:17–21:16:17Z (row `21354364…`) | `list_user_events`; `docs/reviews/main-live-state-reconciliation-20261104/README.md` §12.56 |
| 2026-11-04 23:51:48 | PR #1198 merged (public measurement + verified-admin readers; "code only, not deployed") | GitHub |
| 2026-11-05 ≈03:33 | `dpl_Ds3PSspTDjTQGEdXK8RPSt4oFZ7s` (`a27d8d06f`); **first anonymous web-vital row 03:44:55Z** (consistent with #1198 shipping here) | `591446bc`; `events` min(ts) for anonymous rows |
| 2026-11-05 11:21–11:22 | `dpl_jMPhd1gbMuoDRHk1PLXxg18PRHPP` (`b0a752c66`): #1220 footer reservation, #1223 CLS /books /community, #1226 real-post CLS gate, #1227 avatar renditions | `5c443c6f` |
| 2026-11-05 11:59–12:00 | `dpl_4aihnmkHhEHuh2oJjXVziRP5ZLwu` (`2500ec56`): #1229 (beit-midrash CLS, doc 404, avatar render URL via SW) | `b9fd6348` |
| 2026-11-05 15:34:31 | PR #1238 (Number speed) merged | GitHub |
| 2026-11-05 16:03:25–37 | `dpl_EDc7PpuMp4vkuJuSbwh1gKQ5QSTV` (`410eaad1` = #1237 + #1238) live; post-move canary attempt 2 **failed** (cold `/sitemap.xml` > 15 s), attempt 3 passed warm | `f158c057` |
| 2026-11-05 19:01 / 19:56 / 22:38 | Releases #8 `8ae69125`, #9 `a5ef82cc` (Legacy removal), #10 `97bf00be` | `ccac1020`, `d88e1b38`, `b3a04447` |
| 2026-11-08 00:27:11 | PR #1262 "RC: audit remediation … performance pass" merged → `cfa7cc1ce`; deployed 00:27:41.9 (Vercel MCP); aliases-assigned events 00:28:14.5, 00:29:29.8, 00:29:32.3, 00:29:34.5; next deploy took over 01:27:12 | GitHub PR #1262; Vercel `list_user_events`; `get_deployment` |
| 2026-11-09 ≈14:00 | First-party `site_visits`/`engagement` back at scale (human visits/h: 2 at 07:00, 9 at 09:00, **54 at 14:00**, 60/86/67 at 15–17); five earlier deploy attempts of `608c161be` ("restore first-party visits … completes #1283", 00:27–00:35) ended ERROR/CANCELED; `dpl_FuTnSevP…` (`24b1ef6d0`) created 14:03. Collapse ran 11-05 → 11-09 14:00 | `events`, `site_visits`, `deployments.tsv` |
| 2026-11-14 23:39 | `dpl_C5DBLrWYhELPFDDUaVRJs5W1T6Wj` (`4b9a8687e`, #1344 sitemap source reuse) | `deployments.tsv`; `9d2c9310` |
| 2026-11-15 05:10 (aliases 05:16:31–33) | `dpl_5zVyxXPYNf7tH4jaovi7C4So2FEf` (`fec22ca07`, #1355 — includes merged **#1345** Post backdrop preload + GA page identity) | `d558163b` |
| 2026-11-15 05:56 (aliases 06:00:23–27) | `dpl_CLXTnXF5de1PN1STtajXghtnhyVU` (`c752b0014`, **#1346** parallel Post reads; also #1347/#1348 docs/GA preview) | `d558163b` |
| 2026-11-15 13:25 (aliases ≤13:26:23) | `dpl_J2wg6mqptCp8vFkfDbxz31dtHzoH` (`c2acc064b`, #1356 GA automatic-event context) | `d558163b` |

## 3. Register of improvements / claims

Status legend: **LIVE** = present in main and in a verified production source · **PREVIEW** = verified only on a protected Preview · **BRANCH** = exists only on a branch/PR, not in main · **REC** = recommended only, nothing implemented.

| ID | Date | Claim / purpose | Status | Measurements (conditions) | Documented regression / gap | Owner & scope (rows) |
|---|---|---|---|---|---|---|
| I-01 | 10-12 | Sharp full-post images + light previews (reading-v2 JPEG 1586×992; 480 px thumb) | LIVE (prod `dpl_88oYir3A…`) | bytes only: 213,687 / 369,623 / 445,314 / 296,771 / 589,132 B; no timing | "No automatic image-resize worker"; "Dimensions/readability are generation checks, not DB-measured" | GPT `POST_COVERS_FAST_20261012`; Claude binding `97e21818`; scope released (`cbb9506d`) |
| I-02 | 10-14 | Execution wave PR #1100 (font/lazy/frame, early reads, Post body etc.) + causal diagnostics | BRANCH (PR #1100 draft, head `5dd4afaa`, base was the integration branch `gpt/shared-preview-integration-20261014`, **closed unmerged 2026-11-05 21:04:30Z**) | [LAB] hosted Preview, 7 mobile samples/surface: Post READY 4,264→3,765 ms, LCP 5,680→5,228 ms ("Post LCP 5228ms misses ~3600ms"); causal (105 cold contexts): Post baseline 3,571 ms; static RTT 150→300 ms +1,220 ms; bandwidth 1.6→10 Mbps −1,260 ms; CPU×4→×1 −436 ms; Post cover (214 KB) starts 3,779 ms, LCP 5,196 ms | "SPEED-CLOSED false"; physical phone, field INP, Israel vantage OPEN; conclusion "dominant remaining primary path is static code delivery and client preparation" | GPT `e0a0e509`, `154ec3d3`, `41f15a49`, `5070f5af`; Claude LCP-media branch `b96015c5` (eager/high cover, untested for timing) |
| I-03 | 10-18 | Defer Post body media to 600 px approach; responsive Supabase renditions for raw post images | **BRANCH, absent from main** | [LAB] local: FZ 3 eager requests / 2,308,906 B deferred; chromium 15/15; image bytes 2.61 MB → 446 KB (post 5112 mobile, 3 runs/viewport); CLS unchanged (~0.083→~0.082 desktop; 0.006 mobile); LCP not improved | "Hosted Preview LCP/usable timing, physical phone … NOT_MEASURED"; the two branches touch the same line, "needs reconcile choice". Main today marks body `<img>` `loading="lazy"` by default (`src/lib/research/post2029ReadingProjection.js:1139`) — a different mechanism from the branch's 600 px approach admission with reserved dimensions | GPT `622ba02c`; Claude `4cc44363`; scopes released |
| I-04 | 10-31 | Four immutable cache entries for portrait Post backgrounds (720×1280 WebP 21,048/29,736/29,892/29,988 B) | verified on **PREVIEW**; commit `4f8ef45f` is in the 11-04 cumulative package, but the entries live in root `vercel.json` (12 rules now) and are **not in the production config** | [BUILD/HTTP on Preview] 4 GETs 200, `image/webp`, exact lengths, `Cache-Control: public,max-age=31536000,immutable`; 59 Node checks + 5/6 asset-cache checks | production config lacks them; gate `test/post-backgrounds-2029.test.mjs:67-76` reads root file only; "no hosted phone visual pass is claimed" | GPT `8119874b`, `57156a7d`, `bdcc48ce`; ZURIEL carve-out from claim `711f7dc9`; released |
| I-05 | 10-31 | Unified perf consolidation (F13 on-demand StoryViewer/ContactGateway, F18 pending-only flag reads, F20 lazy Realtime, F10 `published=1` media filter) | LIVE since 11-04 ≈20:22Z (head `4cf3079` ∈ ancestry of `a106a140` = `2149cb74` tree; code spot-checked in main; Preview `dpl_hvfBrT9L…` target null) | [BUILD] eager gzip 442,195→421,607 B (Preview 439,710→419,411); recovery 37,135 B vs baseline 458,742. [LAB] 12 paired cold runs (390 CPU×4/1.6 Mbps/150 ms; 1440 unthrottled) + 6 failure cases: policy reads 10→1; mobile primary 5,865→5,830 ms; desktop 771→809; mobile LCP 5,668→5,640; desktop LCP 920→1,056 | "no field p75/latency-gain claim"; Oct RUM 207 samples, no build identity; 3 baseline acceptance gaps; open F19, F21, F23, F24, F34 | GPT `49406fa4`, `aba15abf`, `24f99ef0`, `0682888e`, review `dcbc84a3`; scope released |
| I-06 | 10-31 | Home loading acceptance (approach admission) | LIVE since 11-04 (head `5cafa111` ∈ `a106a140`; tests in main); only the Preview-builder binding patch was **not applied** | [LAB] 12 cold paired runs + 6 interaction: REST no-scroll 27→19 (390), 28→20 (1440) (raw text "REST no-scroll39027->19,144028->20", my reading of the run-together viewport/counts); primary 5,744.7→5,700.2 ms mobile, 826.7→830.5 desktop; LCP 5,580→5,548 / 1,016→1,084; Preview eager gzip 419,411→419,386 | "Synthetic lab, no consistent latency claim"; `release_advice=BLOCKED_BY_ACTIVE_BUILDER_OWNER` (`412a0132`) | GPT `ff065112` (branch `5cafa111`, WIP backup `9b15052c`); released |
| I-07 | 11-01 | Number full-page navigation / public-source cards / dedupe | LIVE since 11-04 (head `7649e46c` ∈ `a106a140`; tests in main); Preview `dpl_8p4ZvhTm…` | [LAB] 24 controlled 13-transition cycles, 3 counterbalanced pairs/viewport: desktop first 9,523→9,839 ms (worse), repeat 8,517→7,558; mobile (150 ms/1.6 Mbps/CPU×4) first 31,558→27,310, repeat 17,678→14,703 | CLS 0.1 **not passed** for the full journey: 0.476 (Home entry), 0.190 (number→Home), 0.446 (Home→post), 0.126 (Home→number tool→full page); fixtures 1 pass/5 fail | GPT `7994ef60`; released |
| I-08 | 11-01 | Public-reading mobile performance on real SW: overlap Number/milui reads, defer unused Home source reader, route-owned Post source/code overlap, lazy historical witness (75,459 B), original Home/Post code admission restored after measured regression, defer two World readers, Post Number-anchor restoration | LIVE since 11-04 (`1bd9fe91`→`89038e18`→`7c8d3bed`→`6cd64a79` ∈ `a106a140`; Preview `dpl_CZWJMQvv…`) | [LAB] 24 cycles / 264 stages, 3 pairs/profile, real SW + public data. Mobile first medians (ms): Home 6,846→6,820 ("no demonstrated gain"), Post 1,146→1,099, World 2,563→2,503, milui 4,105→3,370. CLS: candidate mobile 0.028175 (all 3), desktop max 0.061431 | **REGRESSIONS_DOCUMENTED** (§4.3); first mobile Home "remains ~6.8 s" | GPT `2004bcf6`, `18fb4f13`; released |
| I-09 | 11-02 | Useful-loading round + blocking Google-Fonts stylesheet fix (Doc37 12.21) + Home JS critical path (12.24) | LIVE since 11-04 (`89038e18`, `6cd64a79` fix, `c8e05790` Home JS ∈ `a106a140`; `2029.html` loads IBM Plex Mono non-blocking) | [LAB] mobile 390×900 CPU×4 RTT150 200,000 B/s, n=3: 12.20 Home useful 5.38→4.97 s, first Post 0.86→0.73 s, completion 7.18→6.29; 12.21 useful 4.86→4.75, completion 6.17→6.32 (worse); 12.24 cold DOM 4.887→4.278 s; static Home graph gzip 472,047→355,102 B; CLS max 0.046222–0.054220 | 1 of 14 cold attempts stuck 60 s in static opening (zero content requests) → reproduced as blocking font stylesheet (7 s hold) → fixed; "~4.75 s to content on slow mobile still felt"; 12.24 regressions: first Post cold 0.717→0.816 s, desktop Home cold 1.719→1.849, world→number all-material 5.641→6.504 s | GPT `c09d8bea`, `8d2201d0`, Doc37 12.20/12.21/12.24 |
| I-10 | 11-04 | Startup brand/header + performance partial (Doc37 12.48) | docs only; "perf PARTIAL" | [LAB] 12 mobile cycles + 1 desktop baseline: Home 6,152→6,543 ms; first Post 1,316→1,367; World→Number 5,095→5,778; back phrase→number 650→757; CLS up to 0.524 both | "full performance gate NOT accepted"; desktop baseline repeat timed out waiting for fill, cause undecided; round stopped for middleware incident | GPT `55e03a20`, `5b794ff6` |
| I-11 | 11-04…14 | Sitemap cache pass-through + source reuse (keeps the 15 s canary achievable) | LIVE (`public-sitemap.js:31`; #1344 live 11-14 23:39Z) | [LAB, sandbox] 2026-11-05 cold 12.1 s TTFB then HIT 0.38–0.40 s; 31 reconstructed cold generations median 13.3 s (10.1–14.6); after #1344: cold 6.5–8.5 s, warm 0.35–0.84 s (16,790 URLs, 4.0 MiB) | canary attempt 2 on 11-05 failed at 15 s; "A warm HIT is not a cold-time acceptance" | Claude hand-off `27cada5e` (read-only) → central session; `f158c057`; `9d2c9310` |
| I-12 | 11-05 | CLS fixes #1220/#1223 + real-post CLS gate #1226 + avatar renditions #1227/#1229 | LIVE (`b0a752c66`, `2500ec56`) | [LAB] real posts with reads delayed 1.5 s: FZ1073 0.2102 / 0.3480 (390/1440) → 0.0016 / 0.0091; elections post 0.2732 / 0.3708 → 0.0009 / 0.0086. Live real-browser CLS 390/1440: post 0.0011/0.008, home 0/0.0089, number 0.0064/0.0095. /beit-midrash cold 0.66→0.0000; avatar 3.86 MB GIF → 207,480 B WebP (/community) | earlier "/post/5107" speed audit invalid ("not a public post"); avatar renditions initially ineffective (SW) → #1229 | Claude `df132d2c`, `255f6085`, `5c443c6f`, `b9fd6348` |
| I-13 | 11-05 | Number page: open + safe speed steps + mobile first screen + server-projection proposal | LIVE (#1238 in release #7 `410eaad1`); projection **REC** | [LAB, local prod build, live read-only DB, cold] /number/878: DB requests 66→64, decoded 889→667 KB (−25%), /number/100 1,520→921 KB; desktop data-ready −452/−789/−623/−554 ms; **mobile (CPU×4) data-ready +147/−548/−10/−190, full load −14/−591/+152/−142 ms**; first screen: number top 493→420 px, visible core 482→555 px, CLS 0.0067→0.0060. Live check (real Chrome): 64 requests, 667 KB | "a mobile TIME gain is NOT established"; absolute times vary up to 2× between sessions; LCP/first display unmoved | Claude `f91a930a`, `79144b9e`, `d81e79f6`, `f158c057` |
| I-14 | 11-07→08 | RC performance pass PF1–PF5 (first-load trims, read dedupe/memo, entry `modulepreload`, explicit post columns, footer hidden while loading, cover eager/high, Supabase preconnect) | **LIVE since 2026-11-08 ≈00:29Z** (`cfa7cc1ce`) | [BUILD] first-load JS per route (brotli, 390): `/` −31.3 KB, `/post/<slug>` 417,077→369,822 B (−47.3 KB), `/world` −57.4 KB. [LAB] slow 4G (150 ms/1.6 Mbps/×4) cold N=7: `/post/<slug>` ready 4,019→3,820 ms, LCP 4,228→4,020 ms (7/7 pairs); fast 4G (60 ms/9 Mbps/×2): 1,108→998 / 1,252→1,196. CLS `/post` return visit 1.000/1.292 → 0.060 | long-task time not uniformly lower (`/post` cold +106 ms slow, +45 ms fast; `/gematria` +95; `/number` warm +67); Chromium only; "Field numbers (RUM) cannot move until an approved deploy" | Claude (RC branch `claude/sod1820-audit-rc-g93w32`, PR #1262); journal row for the release: **none found** |
| I-15 | 11-07 | Recommendations (platform/DB), all "not done" | **REC** | [LAB, sandbox] /post document server wait median 484 ms (296–808), modes 331 / 728 ms; `/number/1820` 817 ms; `/` 101 ms | see §9 | Claude `PERFORMANCE-RECOMMENDATIONS-20261107.md` |
| I-16 | 11-15 | #1345 Post backdrop preload + GA page identity; #1346 parallel enriched reads | LIVE (06:00:27Z, plus #1355 05:16Z) | [LAB, fixture, no CPU/network throttle; source 100 ms / RPC 600 ms / image 300 ms injected] LCP median 390 px 2,128→1,636 ms, 1280 px 1,972→1,700 ms (3 alternating runs); reader fixture Bennett 502→251 ms, FZ 502→502 ms (250 ms per simulated I/O). Single live observations (Codex): Golden 3,560→4,572 ms, FZ 3,328→3,608 ms | "NO live speed improvement established"; "Not production p75"; Bennett URL 404 live; document TTFB, ads, ordinary-post layout unchanged | GPT/Codex (`d558163b`, PRs #1345/#1346); scope released |
| I-17 | 11-15 13:54 | Claude "Post mobile speed package" (BEFORE only) | open | [LAB, live, emulated Slow 4G + 4× CPU] content ≈7.6–8.1 s, LCP ≈8.0–9.3 s; sandbox TTFB 0.7–1.6 s | synthetic-events incident (§7.6) | Claude `d9bdd7fe`; measurement/admin reports stay with Codex |
| I-18 | 11-04…14 | RUM/measurement plumbing: #1198 (merged 11-04 23:51:48Z; first anonymous RUM rows 11-05 03:44:55Z, consistent with shipping in `a27d8d06f`), #1259 beacon (draft, still open, nothing applied), first-party restore (commit `608c161be` "completes #1283", effectively live ≈11-09 14:00Z), visit-once (#1337, `9c4cad137` live 11-14 15:37) | mixed | counts in §7.6 | "קריסת המדידה מ־5.11 נחשבת תקלה"; #1259 "nothing applied" | Claude `2d3fd392`, `db8fc5d4`, `639f7f15`; GPT `a39d2a05` |

### Per-item notes (quotes where wording matters)

**I-02 (10-14, causal tests, `154ec3d3`)**: "Calibration proves fixture fulfillment bypasses CDP network… Corrected model separates local static RTT/bandwidth and explicit API delay"; "Conclusion: dominant remaining primary path is static code delivery and client preparation… This does not rule out backend function/scale/burst cost." Still OPEN there: "physical phone/near Israel, true field INP, real same-origin proxy geographic A/B, authenticated full flow, controlled cold PostgreSQL…".

**I-04 (10-31, `57156a7d`)**: "Applied only the exact four user-approved immutable image cache entries in vercel.json, 36 additions/0 deletions/1 file … Protected Preview READY … SSO/password protection unchanged." The journal makes **no** production claim. The production-config gap is documented independently in `PERFORMANCE-RECOMMENDATIONS-20261107.md` §6.1: "Root cause is configuration drift… The gate is green while production lacks the headers."

**I-05 (10-31, `aba15abf`)**: "Static assets fell, but timing did not consistently improve" (`docs/reviews/unified-session-handoff-20261031.md`); "Do not claim a site-wide latency gain, INP, physical-device result or field p75." The 34-group review (`unified-performance-consolidation-20261031.md`) classifies the Post-relevant groups **F23 PARTIAL** ("Current source projection marks images lazy/async… old approach/intent admission helper and exact reserved-dimension evidence are absent"), **F34 PARTIAL** ("pilot branches still await canonical verifications/context preparation before returning the complete reading projection. Source-first public UX needs fresh controlled evidence"), **F19 METRICS_PARTIAL_V2_OPEN** (no build SHA / usable-content in RUM).

**I-08 (11-01)**: see §4.3.

**I-09 (11-02, Doc37 12.20)**: "פתוח ולא הומר ל״עבר״: … ניסיון מועמד בנייד נשאר בפתיחה סטטית 60 שניות עם אפס בקשות תוכן … הכשל חוסם הכרזה על יציבות מלאה של הכניסה הקרה. האיטיות שנותרה, כ־5 שניות לתוכן בנייד האטי, מורגשת". Doc37 12.21 gives the reproduced cause: external IBM Plex Mono stylesheet blocking the boot module (worker registration only at 7.120 s after a 7 s hold) and the fix (`media=print`/onload). Doc37 12.24 keeps its regressions in the open ("אין שיפור עקבי בכל מעבר או במחשב").

**I-11 / `27cada5e` (11-04, Claude read-only reviewer → central session)**: P1 root cause of the failed sitemap canary: `public-reading-deploy/api/public-sitemap.js` "forces Cache-Control no-store on EVERY response… each request rebuilds the whole map (about 19.6s, 4.2MB, ~40 serial source requests incl. per-book PDF probes)… No override of the 15s limit." In main the wrapper now passes the cacheable header through (`public-sitemap.js:31`). Open per `f158c057`: "cold /sitemap.xml generation above the canary's fixed 15 s (a real cold-path issue; options for ZURIEL: pre-warm… or make the sitemap cheaper to generate; the threshold itself is not changed)".

**I-12 (11-05)**: the real-post CLS gate is described in §4.2. Other findings of release #4 (`5c443c6f`) with fixes verified live in #5 (`b9fd6348`): /beit-midrash cold CLS 0.66 → 0.0000 (3/3 runs at 390), server document 404 → 200 with correct title/canonical, avatar via SW render URL.

**I-14 (RC, 11-07/08)**: PR #1262 body: "Performance (measured, lab): first-load JS -15 to -57 KB brotli per route, Method Lens request loop 1,365 -> 29, duplicate reads removed, CLS on `/post` return visits 1.17 -> 0.21 (desktop 0.95 -> 0.03), entry module preload." The PERFORMANCE-PASS doc's own caveat: "the field LCP p75 (3.8 s `/`, 5.6 s `/post/:item`, 4.6 s `/community/chat`) will move only by the client-side share measured here (roughly 0.1-0.4 s); the larger levers are server-side". Releasing was approved separately from the merge (PR text: "Merging is not a deployment"); I found **no work_log AFTER** for the 2026-11-08 00:27 deployment (searched SHA `cfa7cc1ce` and deployment id in `what_we_did`/`topic`/`task_key`).

**I-16 (11-15, `d558163b`)**: "Controlled lab comparison (100ms source / 600ms canonical RPC / 300ms image; three alternating runs per width): median LCP 2128->1636ms mobile and 1972->1700ms desktop. … This is not production p75."; after release: "Single uncontrolled LCP observations Golden 3560->4572ms, FZ 3328->3608ms: NO live speed improvement established; these samples cannot establish cause or p75. Need continued document/asset delivery/performance work." `docs/reviews/post-speed-measurement-20261115/README.md`: "Early backdrop discovery does not fix document TTFB" (live observation: TTFB 1,406 ms, LCP 3,412 ms on one post, headless Chromium 390 px).

## 4. The four requested items

### 4.1 The "TTFB finding" of 2026-11-05 (`255f6085-93d6-4b34-8bf5-95685f2ba844`, Claude, 07:52:23Z, status `AFTER_UPDATE_MERGED_TO_MAIN_NOT_DEPLOYED`)

Verbatim: "FINDING (not acted on): real-user document TTFB p50 608 ms, p75 1209 ms, p90 1989 ms (navigate, n=55, 14 days, non-bot); 53% over 600 ms. The Supabase project is in ap-northeast-1 (Tokyo) while the audience is in Israel. The production edge middleware awaits Supabase on the document path (country policy, 5-min per-isolate cache; post slug existence RPC) and the document function awaits api/og.js (site_flags + route metadata) with Cache-Control no-store: several sequential Tokyo round trips before the first byte. Options need ZURIEL: EU read replica with geo-routed GETs (cost), stale-while-revalidate/snapshot for the country policy, parallelised awaits, CDN s-maxage+SWR for public documents. Also: Number page 18 of 50 API calls are exact repeats (sequential, per-loader root-cause fixes needed; a global in-flight dedupe removed only 4 and was not shipped)." Open thread: "(2) decision on the server-side/TTFB work (touches the production edge policy path and possibly cost)".

- Class: **FIELD** (but the anonymous window was effectively ≈4 h, see below). Not reproduced: the collector's first anonymous row is 2026-11-05 03:44:55Z and the row was written at 07:52Z, so "14 days" cannot have held 55 navigate loads of this population. My reconstructions (SELECT only, rows with `ts <= 2026-11-05 07:52:23Z`): (a) deduped loads of every earlier period with `nav_type='navigate'` (rows since 09-27, includes the October raw-path rows): n=231, p50/p75/p90 = 466 / 1,122 / 2,161 ms, 42% > 600 ms; (b) `navigate` + `final` rows since 10-22: n=27, 787 / 1,323 / 1,967 ms (81 `navigate` rows incl. checkpoints). The journal's own filter is UNKNOWN.
- Status: **not acted on in code**; as of `c2acc064b` documents are still `no-store`, no function `regions`, `api/og.js` has no `Promise.all`; no journal row after 2026-11-05 15:10Z records a ZURIEL decision on Tokyo/regions/CDN (search: tokyo/ap-northeast/hnd1/read replica/Vercel-CDN-Cache-Control/stale-while-revalidate).
- Superseded/qualified by `docs/reviews/audit-remediation-20261106/PERFORMANCE-RECOMMENDATIONS-20261107.md` rev. 2: a Tokyo read costs "either about 0.23 s or about 0.63 s" (bimodal; "p50 is not stable"); revision 1's "fixed 0.5–0.6 s floor" and "/number about 1 s" claims are **withdrawn**; field `/post` minus `/` = +271 ms (p50), +582 ms (p75), but "`/community/*`, which makes no `og.js` read, sits +312 ms (p50) … above `/` as well" so the field cannot isolate the read.

### 4.2 The "real-post CLS gate" of 2026-11-05 (#1226)

- Where: `tests/world2029-release.spec.cjs` — `CLS_POST_ROUTE = '/post/flydubai-fz1073-363-14000-remzei-geula'` (line 164), tests at 390 and 1440 px (lines ~165–180); `/rest/v1/posts?*` delayed 1,500 ms; `assertClsGood` (lines 80–90) waits 4,000 ms then requires max-session-window CLS ≤ 0.1; run by `.github/workflows/2029-isolation-gate.yml:230` (`SOD_WORLD_PRE_CUTOVER_FIXTURE=1 npx playwright test tests/world2029-release.spec.cjs`).
- Evidence [LAB, `df132d2c`, `255f6085`]: FZ1073 0.2102 / 0.3480 (390/1440) without the footer reservation → 0.0016 / 0.0091 with; elections post 0.2732 / 0.3708 → 0.0009 / 0.0086; "source footer.f29 as in the field". Correction recorded: "the earlier speed audit row for /post/5107 was invalid - that id is not a public post (the page shows post-not-found)".
- FIELD before the fix (my SELECT, `/post/:item`, 2026-11-05 03:44Z–11:22Z, n=26): CLS p75 **0.3866**, p95 0.4993; after `b0a752c66` until the RC (n=227): p75 0.0072, **p95 1.0002**; after the RC (n=144): p75 0.0063, **p95 0.0296**. The test comment in `test/footer-loading-cls-2029.test.mjs:9` cites "Field RUM (events.web_vital, 5 days): footer.f29 / div.sod29-main-stage.has-context-rail are the top CLS sources on /post"; `footer2029.css:53` says "avg CLS 0.66-1.26".
- What the gate proves / does not prove: one long-lived public post, two widths, one delay, no CPU/network throttle, CLS only, fails loudly if the post stops being public; it does **not** measure LCP/INP/TTFB, other posts, WP-root permalinks, return visits or real devices. The default-route CLS gate in `release-visual-gate.yml:262-283` targets `/entity-hub-preview/number/1237` (widths 320/360/390/1440), not a Post.

### 4.3 `REGRESSIONS_DOCUMENTED` — the 2026-11-01 native/service-worker mobile-performance handoff (`18fb4f13-82d5-488c-8e73-f7d402cbc0eb`, status `AFTER_NATIVE_PERFORMANCE_TESTED_REGRESSIONS_DOCUMENTED_SCOPE_RELEASED`)

Conditions: actual SW + public data, real protected Preview, CDP 150 ms RTT / 1.6 Mbps / CPU×4, 390 px (also 1440), 24 cycles / 264 stages, 3 counterbalanced pairs per profile, first and repeat visits ([LAB]; "Readiness timings include Playwright driving/polling, not paint/RUM/LCP/physical-phone proof"). Baseline `4e6239c6`, final product `1bd9fe91`.

| Documented regression / gap (all retained, none waived) | Numbers | Where | Fate |
|---|---|---|---|
| First mobile Post got slower after moving Post code/reader scheduling | median 1,262 → 2,103 ms (`e4dc324c`); 1,105 → 2,118 (`11e8fc03`); code chunk `post2029ReadingProjection` 51,601 B compressed took 1,540 ms and delayed the source render; the chunk statically carried a 75,459 B historical witness | `DIAGNOSIS.md` | witness made dynamic; "public-reading root again uses its original existing PublicPostAddress reader"; final first Post 1,146 → 1,099 ms |
| First mobile World got slower | median 2,601 → 3,461 ms (2,596/3,498/3,461) | `DIAGNOSIS.md` | two unopened World readers deferred; final 2,563 → 2,503 |
| Mobile CLS not a pass at an intermediate commit | one of three contexts 0.117548 (repeat Home entry 0.117256); baseline mobile documents 0.145032 / 0.142862 / 0.095195 | `DIAGNOSIS.md` | Home notable-section floors (220/330/240/260 px) + story floors (390/430/230 px); final 0.028175 ×3 |
| Home first load | 6,846 → 6,820 ms "no demonstrated gain"; open thread "First mobile Home remains ~6.8s … bootstrap/code/browser work needs further measured optimization" | row | OPEN |
| Desktop first phrase→Number return | 711 → 1,086 ms | open_threads | "retained; distinguish UI/driver wait overhead before another fix" — OPEN |
| Mobile repeat World→Number | 2,800 → 2,948 ms | open_threads | OPEN |
| Post→Number→exact return→reload viewport bug at baseline | scrollY 3,312 while target y = −2,918.91 (390 px) | `DIAGNOSIS.md` | bounded anchor restoration (return target y 162.09/162.47 px; user scroll releases) |
| Older "post 1.081 → 2.090 s" regression | bandwidth-queue snapshot model, "not this native server" | `DIAGNOSIS.md` | "Keep the original model evidence" |
| Test assertion failing identically at baseline | `test/number-zvi-public-research-2029.test.mjs:66` | open_threads | unchanged |
| Not covered | full Isolation/A3, ELS, backup acceptance; signed-in writes/account switching/model actions; guest notification getter / `lang_links_list` excluded by read guard; no production authorization | open_threads | OPEN |

Final claims in the same row: "all functional and unchanged CLS 0.1 checks PASS"; "G4 full PASS exact SHA run 41360726858"; "All intermediary regressions/failures retained."

### 4.4 The Number-page "server-side projection proposal" (`79144b9e-1226-4648-bd40-7013d880e2e9`; `docs/reviews/number-page-speed-20261105/SERVER_PROJECTION_PROPOSAL.md`)

- Status (doc banner): "הצעה בלבד, ממתינה לאישור נוסף של ZURIEL. לא הופעלה מיגרציה, לא נכתב ולא נפרס קוד שרת". Current main: **no** `public-reading-deploy/api/number-projection.js`, no `regions` in `public-reading-deploy/vercel.json` (`functions` only lists `api/public-document.js`), no `fx_number_server_projection` flag [CODE].
- Measured basis [LAB, local production build, live read-only DB, cold]: 66 DB requests in ≈12 sequential levels for `/number/878`; three independent ≈5-level chains end together (families → expression reads → registry/entities; convergence card → slug re-read → node → edges → targets; node → edges → related nodes → media); single read median 457 ms, CORS preflight median 53 ms; DB `ap-northeast-1`, functions `iad1`; full content 6–7 s live, desktop ≈4.1 s / mobile (CPU×4) ≈6.6 s local; 13,031 `/number/*` URLs in the sitemap (≈66 reads, 0.9 MB per JS-rendering crawl).
- Recommended option **B1**: Vercel Node function `GET /api/number-projection?value=` in `hnd1` running the same `fetchEntityHubProjection`, edge cache `s-maxage=300, stale-while-revalidate=3600`, flag + client fallback after 4 s, staged shadow → 5% → 100%. Targets (estimates): ≤3 DB requests, ≤300 KB decoded, ≈1.5 s desktop / ≈2.5 s mobile full content, CLS ≤0.1.
- Approvals required (none given): protected files (`public-reading-deploy/api/*`, `vercel.json` regions), region/cost, 5-minute freshness contract, flag row, rate-limit/Firewall, exact-SHA deploy + manual canary. Finding that must be fixed before implementation: from Node (HTTP/1.1) the two long `getValueFamilies` list reads (≈18 KB URLs) failed with `fetch failed`.
- Alternatives listed: A (SQL function), B2 (Supabase Edge), C (B1 then narrow RPC), D (same-origin proxy), E (SSR embed; touches protected `api/og.js`, `public-document`).
- Relation to Post pages: none directly; the same Tokyo-read depth is the stated driver of document TTFB (§4.1).

## 5. Consolidated list of documented regressions and gaps (chronological)

| Date | Regression / gap | Magnitude, conditions | Source | State |
|---|---|---|---|---|
| 10-31 | Baseline acceptance gaps (World raw source-ref assertion; ELS old JSX shape; ControlPlane `hardenPassiveMediaHtml` assertion) | identical before/after | `aba15abf` | OPEN (later "ten drifted contracts repaired", `ce33d954`) |
| 11-01 | See §4.3 | | `18fb4f13` | partly fixed, rest OPEN |
| 11-01 | Number journey CLS | 0.476 / 0.190 / 0.446 / 0.126 | `7994ef60` | later CLS fixes #1220/#1223/#1226; I found no re-run of that exact journey in the rows read |
| 11-02 | Admitted completion slower | mobile Home 6.82→7.08 s; repeat 1.05→1.20 s (12.20); 6.17→6.32 s (12.21) | `8d2201d0`, Doc37 | retained |
| 11-02 | Cold-entry stall 1/14 | 60 s static opening, zero content requests | Doc37 12.20 | root-caused + fixed (12.21); "אין טענה לאפס תקלות אפשריות בשטח" |
| 11-02 | 12.24 regressions | first Post cold 0.717→0.816 s; desktop Home cold 1.719→1.849 s; world→number 5.641→6.504 s; baseline sample 12.308 s ("canonicalGematria tiny delayed 11.437 s after data arrival", cause unproven) | Doc37 12.24 | retained |
| 11-04 | Performance gate not accepted | Home 6,152→6,543 ms; CLS up to 0.524; desktop repeat baseline timed out | `5b794ff6`, Doc37 12.48 | OPEN |
| 11-04 | 969 release: useful-content single run | mobile Home 4,380 ms / World 3,524 / Number 2,455 / phrase 2,338; desktop 2,426 / 1,059 / 2,402 / 3,614 — "אינם ניסוי ביצועים מבוקר… ולא נפתח סבב אופטימיזציה נוסף" | README §12.56 | context only |
| 11-04 | Canary XML timeout; 1-hour exception | `/sitemap.xml` > 15 s cold; override row `21354364…` 20:16:17–21:16:17Z | README §12.56 | exception expired |
| 11-05 | /beit-midrash cold CLS | 0.66 (390), 0.074 (1440) | `5c443c6f` | fixed (`b9fd6348`) |
| 11-05 | Avatar renditions ineffective in prod | 3.86 MB GIF still loaded on /community | `5c443c6f` | fixed #1229; "3.86 MB original object stays in storage"; 1 of 1,265 posts has `thumb_url ?v=` (post 5047) not natively loaded |
| 11-05 | Number mobile time gain not established | see I-13 | `79144b9e` | by design |
| 11-05 | Legacy removal ≠ speed | eager gzip 199.6→198.9 KB; LCP 1,784→1,968 ms (±200 ms noise); "do not present it as a speed fix. Real slowness: document TTFB (server in the US, DB in Tokyo) and about 50-60 JS files on the home page" | `520c540c` | statement |
| 11-05 | Cold sitemap > 15 s | post-move canary attempt 2 failed | `f158c057` | warm rerun passed; later reduced to 6.5–8.5 s cold (`9d2c9310`) |
| 11-07 | Production lacks static-file cache headers | fonts, brand icons, 12 post backgrounds, `/logo.png` served `no-store` (live, 2026-11-07) | `PERFORMANCE-RECOMMENDATIONS` §6.1 | unchanged in main |
| 11-07 | RC main-thread cost | `/post` cold +106/+45 ms long-task time; `/gematria` +95 ms; `/number` warm +67 ms | `PERFORMANCE-PASS` §5 | accepted trade-off |
| 11-07 | Field p75s poor | LCP `/` 3.8 s, `/post/:item` 5.6 s, `/community/chat` 4.6 s; TTFB p75 1,310 ms overall | `G4-FINAL-EVIDENCE.md` §5 | OPEN |
| 11-15 | No live improvement from #1345/#1346 | Golden 3,560→4,572 ms; FZ 3,328→3,608 ms | `d558163b` | OPEN |
| 11-15 | Delayed-alias double count found while testing #1345 | deterministic reproduction on main | `d558163b` / README | fixed in #1345 (books alias) |

## 6. Part B — documents, receipts, thresholds, tests

### 6.1 Document inventory (all in `docs/` of `c2acc064b`)

| Path | Content |
|---|---|
| `docs/reviews/post-speed-measurement-20261115/` | README, `compare.mjs`, `controlled-comparison.json` (12 runs), `release-request.md` and `production-request-3843af12.json` (historical, "must not be executed") |
| `docs/reviews/post-projection-parallel-20261115/` | README, `compare.mjs`, `controlled-comparison.json` |
| `docs/reviews/audit-remediation-20261106/PERFORMANCE-PASS-20261107.md`, `PERFORMANCE-RECOMMENDATIONS-20261107.md` (612 lines, rev. 2), `G4-FINAL-EVIDENCE.md` §5 | RC lab A/B, FIELD baseline, document delivery model, static headers, DB, ranked recommendations |
| `docs/reviews/public-reading-mobile-performance-20261101/DIAGNOSIS.md` (+ native runners) | mobile SW diagnosis and regressions |
| `docs/reviews/public-launch-useful-loading-20261102/{PERFORMANCE.md,performance-summary.json,README.md,IMPLEMENTATION.md,LAUNCH-BLOCKERS.md}` | 24-cycle / 264-stage tables |
| `docs/reviews/number-page-speed-20261105/{README.md,SERVER_PROJECTION_PROPOSAL.md,evidence/*.json}` + `tools/perf/number-page-measure.cjs` | Number page |
| `docs/reviews/unified-session-handoff-20261031.md`, `unified-performance-consolidation-20261031.{md,json}`, `unified-performance-evidence-20261031.json`, `central-baselines-performance-audit-20261031.md`, `home-loading-acceptance-handoff-20261031.md`, `number-fullpage-performance-20261101/` | 10/31–11/01 receipts |
| `docs/reviews/public-world-number-acceptance-20261101/performance.md` (+ `evidence/public-loading*.json`) — read | second 11-01 matched comparison (`06751b72` vs `7649e46c`, 24 cycles): mobile (150 ms / 1.6 Mb/s / ×4) Home→Post primary-ready 1,153→1,099 ms, Home entry 6,359→6,416, first cycle total 25,852→24,438 ms; desktop first cycle 5,778→6,403 ms ("no evidence of a consistent desktop first-visit improvement"); max step CLS 0.078303 → 0.078515; "do not interpret these lab totals as live LCP" |
| `docs/reviews/2029-legacy-removal-20261105/perf-main-vs-branch.json`, `perf-before-removal.json` — read | `scripts/measure-2029-load.mjs`, 5 runs, CPU×4, 390×844, localhost, Supabase/fonts blocked, ±200 ms noise: main `2500ec56` `/2029` first visit LCP 1,784 ms, eager gzip 199.6 KB, 101 requests (52 JS), 1,801.9 KB transferred, repeat LCP 1,036 ms; branch 1,968 / 198.9 KB / 102; "not field/Production speed evidence" |
| `docs/reviews/public-foundation-20261101/evidence/home-vitals-before-after.json` — read (Home only) | 8 counterbalanced pairs, Chromium, no throttling, live public data: 1440 px CLS 0.0785→0.0276, LCP 1,648→728 ms (first rows) |
| `docs/reviews/public-url-exceptions-20261103/residual205/evidence/seo-repair-calculator-integration-20261104/partial-performance-summary.json` — read | Doc37 12.48 run: `ae8deb7a`→`07355b0b`, 390 px CPU×4 / 150 ms / 200,000 B/s, 3 runs each, real SW, "NOT_FULLY_ACCEPTED", 13 complete cycles, desktop comparison incomplete |
| listed, **not read**: `functional-unified-preview-20261031/evidence/{performance-summary,cls-before-after}.json`, `home-light-reading-now-20261102/native-home-performance.cjs`, `els-home-rotating-matrix-card-evidence-20261031/local-before-after-perf.json`, `community1187-unified-20261101/evidence/loading-*.json`, `audit-remediation-20261106/tools/measure-gallery-cls.cjs`, `main-live-state-reconciliation-20261104/final-images-sitemap/hosted-468e-ttfb-body.json`, `docs/2029-media-performance-delivery-map-v1.md` (2026-09-19 map), `docs/w0-2027-execution-reopen-telemetry-performance-matrix-v1.md` (specification) | not Post-page evidence or out of window |
| `docs/reviews/doc37-alignment-20261102/acceptance/README.md` | mobile conditions "390×900, CPU 4×, RTT150ms, 200000B/s download, 100000B/s upload; desktop 1440×900 unthrottled"; useful-Home phases 4.817–4.920 s; max CLS 0.046223 |
| `docs/reviews/main-live-state-reconciliation-20261104/README.md` §12.55–12.56 | cumulative release, canary exception, single-run useful times |
| `docs/audit-evidence/20261106/contracts-inventory.md` C-PERF-01…05 | threshold inventory; **C-PERF-04: "UNKNOWN: numeric budgets live in evidence, not in an enforcing test"** |
| Doc37 (DB, not a file) §12.14/12.15 (10/31), 12.20/12.21/12.24 (11/02), 12.48/12.49 (11/04), 12.57 | plan receipts; only §12.20/12.21/12.24/12.48 re-read by me |

### 6.2 Measured tables copied with their conditions

**(a) #1345 controlled before/after** [LAB; `docs/reviews/post-speed-measurement-20261115/README.md`, `compare.mjs`]: fresh contexts, viewport 390×900 or 1280×900, locale he-IL, service worker allowed, local HTTPS/worker fixture; source response +100 ms, canonical RPC +600 ms, background image +300 ms; **no CPU or network throttling in `compare.mjs`**; Google stubbed.

| Viewport | Before LCP (ms) | After LCP (ms) | Median |
|---|---|---|---|
| 390 px | 2320, 1888, 2128 | 1532, 1720, 1636 | 2128 → 1636 |
| 1280 px | 1924, 1972, 2096 | 1736, 1688, 1700 | 1972 → 1700 |

Backdrop discovery: before = 22–58 ms *after* the RPC finished; after = 619–628 ms *before* it finished; one backdrop request per run; LCP element = the article background in all runs.

**(b) #1346 reader scheduling** [LAB; `docs/reviews/post-projection-parallel-20261115/README.md`]: each simulated I/O 250 ms, 3 alternating pairs, identical projection and query set — Bennett focus+story 502→251 ms; FZ1073 topic+traces+connections 502→502 ms ("the later connection lookup remains the longest dependency chain"). "Controlled reader timings, not browser LCP, production p75 or a forecast."

**(c) Live single observations** [LAB, headless Chromium 390 px, writes/analytics blocked; README of #1345]: `/post` content visible 1,483 ms; `/post/remzei-geula-ai-sod-hashir` source finished ≈1,804 ms, calculation 1,826–2,037 ms, backdrop request started 2,071 ms, LCP 2,428 ms; `/post/us-ground-stop-new-orleans-nov-17-rumor-20261113` HTTP 200, TTFB 1,406 ms, LCP 3,412 ms; `/post/bennett-melach-631-78` 404 (excluded).

**(d) RC A/B** [LAB; `PERFORMANCE-PASS-20261107.md` §5; headless Chromium 141, public-row fixtures, SW active, interleaved, N=7, median; base `7a820d049` vs RC `b0b09e179`]:

| Route | Slow 4G (150 ms, 1.6 Mbps, CPU×4) ready → | LCP → | Fast 4G (60 ms, 9 Mbps, CPU×2) ready → | LCP → |
|---|---|---|---|---|
| `/` | 3,732 → 3,590 | 4,484 → 4,316 | 1,057 → 985 | 1,592 → 1,548 |
| `/post/<slug>` | 4,019 → 3,820 (7/7) | 4,228 → 4,020 (7/7) | 1,108 → 998 | 1,252 → 1,196 |
| `/number/1820` | 4,265 → 4,134 | 4,696 → 4,616 | 1,155 → 1,054 | 1,488 → 1,404 |
| `/world` | 4,602 → 4,253 | 5,020 → 4,616 | 1,220 → 1,048 | 1,556 → 1,348 |

First-load JS (brotli, cold, SW, 390 px): `/post/<slug>` 417,077 B / 60 req → 369,822 B / 58; `/post` 321,194 → 305,787; `/` 464,399 → 433,098. Also: "Entry download ends 158 ms earlier (99 of 112 pairs); time-to-app −94 ms pooled; LCP −46 ms (not significant)"; `/post` cover LCP "fast 4G 2,504 → 2,412 ms (inside noise); deep link 3,292 → 2,816 ms"; CLS `/post` return visit "base 1.000 (slow) / 1.292 (fast) → RC 0.060 / 0.060 (max 0.352 once on fast 4G)".

**(e) 11-02 native 24-cycle / 264-stage comparison** [LAB; `public-launch-useful-loading-20261102/PERFORMANCE.md`; real SW, real public data, n=3 per cell, "Useful is in-browser correct actionable DOM, not LCP"]: mobile first — home-entry useful 5.75→5.39 s, admitted 6.82→7.08 (regression); home→post 0.71→0.69 s; post→world 2.22→2.22; world→number full page 8.42→4.55 (useful), 8.42→7.19 (material); repeat visit home→post 0.42→0.43. Max whole-document CLS 0.082810→0.090856 (< 0.1, "Candidate pass: True"). "Request body/image decode and field-user p75 are not claimed."

### 6.3 Budgets and thresholds (definitions only; **not** to be changed)

| Item | Value | Where |
|---|---|---|
| Web-vital classification thresholds | CLS 0.1/0.25; LCP 2,500/4,000 ms; INP 200/500; FCP 1,800/3,000; TTFB 800/1,800 | `src/lib/webVitalsCore.js:7-13`; pinned by `scripts/test-web-vitals-2029.mjs:55-70` ("feature growth cannot rebase the threshold") |
| RUM checkpoint | 15,000 ms | `src/lib/webVitals2029.js:18` |
| Canary per-request timeout | `timeoutMs = 15000` (home, entry bundle, robots, sitemap, each `AbortSignal.timeout`) | `scripts/post-deploy-canary.mjs:13`; daily budget `CANARY_BUDGET_PER_DAY = 4` at `:8`; job `timeout-minutes: 5` at `.github/workflows/post-deploy-canary.yml:27` |
| Opening-graph budget | eager gzip must recover ≥ 12 KiB against 458,742 B → ≤ 446,454 B | `scripts/test-2029-built-graph.mjs:93-98`; run by `.github/workflows/2029-isolation-gate.yml:201`; first-load closure guard `scripts/test-2029-first-load-graph.mjs` (`live-contracts-2029.yml:89`); Realtime split `test/realtime-entry-split-2029.test.mjs` (`:87`). Documented eager gzip sizes differ by date/profile and were not reconciled by me: 421,607 B normal / 419,411 B Preview (10/31, `aba15abf`) vs 199.6 / 198.9 KB (11/05, `scripts/measure-2029-load.mjs` "eagerGzipKB", localhost, 18 eager chunks; `520c540c`) and 205,290 B (11/07 `PERFORMANCE-PASS` §2, attributed to `test-2029-built-graph.mjs`) |
| CLS ≤ 0.1 (CI) | `.github/workflows/release-visual-gate.yml:283` (route `/entity-hub-preview/number/1237`, 320/360/390/1440) and `tests/world2029-release.spec.cjs:80-90` (routes at lines 14-24, real post at 160-180; wired `2029-isolation-gate.yml:230`) | |
| Numeric "useful Home" budgets | live only in evidence scripts (C-PERF-04 UNKNOWN) | `docs/audit-evidence/20261106/contracts-inventory.md:162-166` |
| Decision record | "החלטת צוריאל: הוספת יכולות אינה מגדילה ספים. נשמרו CLS≤0.1, קנרית 15,000ms … תקציב הגרף נשאר 458,742 פחות 12,288 בתים gzip לכל היותר" | `docs/reviews/main-live-state-reconciliation-20261104/README.md:129` |

Note: none of the web-vital thresholds is a CI pass/fail on field results; they classify RUM rows and appear in the admin reader.

### 6.4 Tests added by #1345 / #1346 (squash `3843af126`, `c752b0014`) — proves / does not prove

| File | Wired | Proves | Does **not** prove |
|---|---|---|---|
| `test/post-background-preload-20261115.test.mjs` (47 lines) | `live-contracts-2029.yml` unit step | the real reader (esbuild-bundled `fetchPost2029ReadingProjection`, Supabase stubbed) adds one `<link rel=preload as=image fetchPriority=high>` for the exact adopted backdrop (mobile `(max-width:760px)` vs desktop), deduplicated, only in dark theme, and **only after source admission** (not for draft/suppressed/invitation/cancelled) while the canonical RPC is still pending | that the browser downloads it earlier, that LCP improves, anything about caching headers, real network, other themes |
| `test/post-speed-page-analytics.browser.mjs` (87 lines) | auth browser job (build with `VITE_GA_ID=G-TEST`) | in the built artifact + real worker, at 390 and 1280 px: the backdrop request starts while `fn_method_value` is still pending, CSS reuses the single preload (exactly one image request), one manual `page_view` with the final title/canonical/campaign fields, and the next route gets its own title | real Google ingestion; real CDN/TTFB (all hosts fixture; the image is fulfilled locally via `context.route` from `dist`, so the production `no-store` header on root images is not exercised); mobile device behaviour (viewport only, no throttle) |
| `test/public-page-analytics-20261115.test.mjs` (127 lines) | unit step | title/canonical identity logic in `analytics.js`/`seo.js` (13 cases: stale title, cancellation, 5 s fallback, campaign/referrer bounds, www not external, private routes) | GA4 report receipt; Meta/CAPI; first-party schema |
| `test/measurement-page-view-once-2029.test.mjs` (+10 lines) | existing | `/books/:slug` alias never counts even if the redirect outlives the 150 ms settle | — |
| `test/post-projection-parallel-20261115.test.mjs` (160 lines, 6 tests) | unit step | independent Bennett/FZ verifications and the governed pack start before earlier work finishes; render still waits for all; early/late rejections observed; cancellation, denied, invitation and ordinary-post paths fetch no pack | any browser timing; Bennett's URL was 404 live; "The scheduling fixture does not claim to validate those compilers itself" |
| `test/ga-sync-preview-20261115.test.mjs` (91 lines) | unit step | `dry_run:true` reads both report paths and calls neither ingestion writer; invalid bodies cannot import | Google authorization (later proven by operator run 39956), not Post speed |
| `docs/reviews/analytics-stream-20261115/{capture.mjs,capture-results.json,README.md}` (#1347 evidence; no CI test) | manual | offline capture with the real public gtag SDK: 3 manual navigations → 5 SDK page views, simulated "history events off" → 3; all requests fulfilled locally, nothing sent to Google/product DB | live GA behaviour, GA reports/ingestion (journal: "No GA report/Realtime rows were independently read") |
| `docs/.../compare.mjs` + `controlled-comparison.json` | manual | reproducible lab overlap (§6.2a/b) | production p75 ("Production p75 improvement must be measured after an approved release, using the existing RUM pipeline and comparable traffic/device cohorts") |

## 7. Part C — real-user (FIELD) data

### 7.1 Where it is stored

- **Only one FIELD performance stream exists: `public.events` rows with `surface='performance'`, `event_type='web_vital'`.** Writer: `src/lib/webVitals2029.js` → `public.ingest_event` (anonymous RPC, `SECURITY DEFINER`, EXECUTE for anon/authenticated/service_role). Build manifest records `measurement.rumSource: "events.performance.web_vital"` (`scripts/build-public-reading-production.mjs:135`). Hard document navigations only (`measurement_scope: document_navigation_hard_load_only`, SPA route changes are not measured), canonical hosts only, bots dropped client-side and by `ingest_event`, one `checkpoint` row at 15 s and one `final` row at `pagehide`/`visibility_hidden` per `sample_id`.
- Readers: `public.admin_2029_analytics(p_hours, p_path_prefix)` (authenticated + `rd_is_admin()`; `web_vitals` block with p75 per route, ratings, good-rate, `audience_kind <> 'internal_admin'`; migration `20260919231500_g3_2029_web_vitals_acceptance_rum_v1.sql`) → UI `src/components/experience2029/OperationalMetrics2029.jsx` (`/2029/control`). `api/vercel-insights.js` (Vercel Web Analytics reader) exists but the journal records "Vercel Web Analytics not found (404)"/no token; GA4 (property 541654210; `ga-sync-server` v3 imported 16 daily rows — 8 global + 8 IL for 08–15 Nov — on 2026-11-15, cron job 157 daily 05:27 UTC, per `d558163b`) carries traffic counts only, not web vitals.
- **Not performance but related:** `public.site_visits` (first-party visit counter: `ts, path, referrer, visitor, device, is_bot`) and `events` `page/engagement`.
- Retention: cron job 145 `g3-telemetry-retention-120d-daily` → `fn_telemetry_retention_120d()` deletes `site_visits`/`visitor_events` rows older than 120 days and drops whole monthly `events` partitions once entirely older than 120 days (so web-vital rows survive ≥ 120 days; partitions `events_2026_07…_12` + default exist).

### 7.2 Coverage (SELECT-only introspection, query time 2026-11-15 14:00:10Z)

| Fact | Value |
|---|---|
| `events` columns | `event_id, ts, sod_id, person_id, session_id, surface, event_type, path, ref_host, via, app_context, device, journey_id, depth_reached, utm, is_bot, props, ingest_at` |
| web-vital rows by month | 2026-09: 18 (checkpoint only, 09-27→09-30); 2026-10: 207 (206 checkpoint, 1 final; raw unredacted paths; **no build identity**); 2026-11: ≈5,330 rows, 11-01 06:50Z → 11-15 13:55Z (5,327 at my first query; 5,361 rows in the 30-day window at the last query, which also reaches back to 10-16) |
| First anonymous-collector row | **2026-11-05 03:44:55Z** (4 earlier rows 11-01…11-04 carry session/sod ids) |
| Daily web-vital rows | 11-05: 615 · 11-06: 328 · 11-07: 336 · 11-08: 633 · 11-09: 572 · 11-10: 691 · 11-11: 666 · 11-12: 437 · 11-13: 391 · 11-14: 277 · 11-15: 381 (to 13:55Z) |
| Distinct samples (deduped) | 14 d: 3,706; 30 d: 3,738 |
| Non-null columns on web-vital rows (30 d, 5,361 rows) | `device` 0, `ref_host` 0, `via` 0, `utm` 0, `journey_id` 0, `depth_reached` 0; `session_id`/`sod_id`/`person_id` 34 (pre-11-05 rows only); `app_context` always (8 values: chrome, safari, edge, firefox, opera, chrome-ios, android-webview, facebook) |
| `props` keys (identical on all 5,327 Nov rows) | `vitals_version, cls, lcp_ms, inp_ms, fcp_ms, ttfb_ms, interaction_count, cls_shift_sources, ratings, sample_id, phase, flush_reason, initial_path, current_path, collector, measurement_scope, nav_type, visibility_at_flush` — **no** device, viewport, UA, build SHA, usable-content or LCP element |
| Validator | `readingWebVitalBody` (`src/lib/publicReadingTelemetry2029.js:63-84`) accepts exactly the 8 RPC keys and this fixed `props` set; `p_device` and any extra key are refused |

### 7.3 Can page type, device class and humans be separated?

- **Page type: yes, partly.** `events.path` = privacy-normalised label from `readingTelemetryPath` (`publicReadingTelemetry2029.js:4-30`): `/post/:item`, `/post` (library index), `/number/:value`, `/`, `/community/chat`, … Single-segment slugs with a non-Latin character are **not** collapsed (`safeSegment = /^[a-z0-9][a-z0-9-]{0,63}$/i`, line 26) and keep their full Hebrew slug as the label — these are root-level WordPress permalinks that resolve to Post pages. I classified them as post pages by regex `^/[U+0590–U+05FF]` (top volumes are long Hebrew post-title slugs; not individually verified). Latin one-segment root slugs cannot be told apart from static routes.
- **Device class (mobile vs desktop): no.** `events.device` NULL for 100% of rows; no UA/viewport key; `session_id`/`sod_id` NULL so no join to `site_visits.device`. Only `app_context` (browser family) exists. Mobile-only proxies (`chrome-ios`, `android-webview`, `facebook`) cover 38 of 1,094 post-like loads (14 d); `chrome` (84%) mixes desktop and Android, `safari` mixes iOS and macOS.
- **Humans vs automation: no.** `is_bot` is false for 100% of rows (bot-flagged payloads are dropped); no cleanliness classification (`fn_ti_clean_classification` joins on `session_id`, which is NULL). Known contamination: the 2026-11-15 01:00–04:30Z audit window (below); verification browsers from Codex/Claude sessions on the canonical host write normal telemetry ("Ordinary bounded browser visits emitted real measurement writes").
- **Build attribution: no** (no SHA in `props`); I attributed rows by timestamp against alias-move times.

### 7.4 Aggregate queries I ran and their results (percentiles by `percentile_cont`; one row per `sample_id`, preferring `final`; NULL metrics ignored)

Common CTE (all queries):

```sql
with base as (
  select distinct on (props->>'sample_id') path, app_context, ts, props->>'phase' phase, props->>'visibility_at_flush' vis,
         (props->>'lcp_ms')::numeric lcp, (props->>'cls')::numeric cls, (props->>'inp_ms')::numeric inp,
         (props->>'ttfb_ms')::numeric ttfb, (props->>'fcp_ms')::numeric fcp
  from public.events
  where event_type='web_vital' and surface='performance' and ts >= now() - interval '14 days'   -- also '30 days'
  order by props->>'sample_id', (props->>'phase'='final') desc, ts desc)
```

Page-type predicates (the SQL wrote the Hebrew block as the Postgres regex escape `֐-׿`): individual post = `path='/post/:item' or path ~ '^/[U+0590–U+05FF]'`; library index = `path='/post'`; home `path='/'`; number `^/number`; community `^/community`.

**Table C1 — individual post pages (`/post/:item` + root Hebrew slugs), all devices, FIELD.** The 14-day and 30-day windows are *identical* for this cohort (collector start 11-05; pre-cutover rows carry raw paths that do not match). n counts loads; LCP/INP n are lower where the metric is absent.

| Cohort | n (LCP n / INP n) | LCP p50 / p75 / p95 (ms) | TTFB p50 / p75 / p95 (ms) | CLS p75 / p95 | INP p50 / p75 / p95 (ms) | FCP p75 | LCP good ≤2.5 s / poor >4 s | TTFB good ≤0.8 s / poor >1.8 s |
|---|---|---|---|---|---|---|---|---|
| all deduped loads | 1,020 (922 / 283) | 4,246 / **5,995** / 17,006 | 1,134 / **2,127** / 4,152 | 0.0062 / 0.1150 | 120 / **204** / 877 | 3,320 | 16.4% / 53.9% | 39.6% / 32.2% |
| final + visible only | 280 (273 / 85) | 3,716 / **5,076** / 13,942 | 990 / **1,836** / 4,014 | 0.0083 / 0.4593 | 112 / 176 / 1,043 | 2,792 | 24.5% / 44.0% | 43.2% / 26.8% |

**Table C2 — by page type, 14 d (30 d differs only by 2–18 pre-cutover rows).**

| Page type | all deduped n | LCP p50/p75/p95 | TTFB p50/p75/p95 | CLS p75/p95 | INP n, p75 | final+visible n, LCP p75, TTFB p75 |
|---|---|---|---|---|---|---|
| `/post/:item` | 401 | 4,352 / 5,816 / 9,531 | 930 / 1,857 / 3,423 | 0.0082 / 0.5720 | 112, 186 | 141, 5,102, 1,714 |
| root Hebrew slug (WP permalink) | 619 | 4,176 / 6,172 / 18,986 | 1,214 / 2,341 / 4,448 | 0.0043 / 0.0367 | 171, 232 | 139, 5,062, 1,985 |
| `/post` library index | 73 | 1,128 / 1,796 / 2,648 | 410 / 739 / 1,857 | 0 / 0.1300 | 8, 170 | 49, 1,603, 606 |
| `/` home | 794 | 2,648 / 4,267 / 10,983 | 582 / 1,221 / 3,098 | 0.0421 / 0.3289 | 291, 252 | 167, 4,070, 872 |
| `/number/*` | 129 | 2,152 / 2,943 / 5,825 | 925 / 1,518 / 2,798 | 0.0084 / 0.0390 | 23, 100 | 65, 2,560, 1,048 |
| `/community/*` | 1,354 | 2,332 / 3,712 / 41,324 | 852 / 1,391 / 2,542 | 0.0624 / 0.4958 | 460, 248 | 304, 5,436, 1,239 |
| other | 333 | 1,544 / 2,704 / 5,974 | 320 / 676 / 1,980 | 0.0182 / 0.1445 | 80, 218 | 189, 2,152, 367 |
| all | 3,704 | 2,766 / 4,556 / 14,947 | 764 / 1,472 / 3,215 | 0.0302 / 0.3291 | 1,145, 240 | 1,054, 4,138, 1,137 |

**Table C3 — browser family as the only device proxy (post-like incl. `/post` index, 14 d, all deduped).**

| `app_context` | n | LCP p50/p75/p95 | TTFB p50/p75/p95 | INP p75 (n) | Device meaning |
|---|---|---|---|---|---|
| chrome | 920 | 4,212 / 6,076 / 17,621 | 1,104 / 2,058 / 4,265 | 202 (252) | desktop **and** Android — not separable |
| safari | 96 | 3,718 / 4,623 / 6,081 | 574 / 1,794 / 3,043 | 164 (26) | iOS **and** macOS |
| chrome-ios | 32 | 2,952 / 4,234 / 5,999 | 820 / 1,473 / 3,045 | 200 (3) | mobile-only |
| edge | 26 | 3,304 / 4,872 / 7,013 | 1,940 / 2,453 / 3,690 | 216 (9) | ambiguous |
| firefox | 14 | 1,695 / 3,666 / 5,353 | 189 / 377 / 3,453 | 152 (1) | ambiguous |
| android-webview | 4 | 13,002 / 13,484 / 14,598 | 2,448 / 2,969 / 3,419 | — | mobile-only (n too small) |
| facebook | 2 | 3,774 / 4,087 / 4,337 | 1,551 / 2,018 / 2,392 | — | mobile-only (n too small) |

Mobile-only proxies total **38 loads** in 14 days — below any usable sample.

**Table C4 — period split for individual post pages (descriptive, not causal; population, weekday and Shabbat confounded; alias-move times used as boundaries).**

| Period | Cohort | n (final+visible) | LCP p50 / p75 | TTFB p50 / p75 | CLS p75 / p95 |
|---|---|---|---|---|---|
| 11-05 03:44Z → 11:22Z (before #1220 footer reservation went live) | `/post/:item` | 26 (7) | 4,512 / 6,724 | 626 / 1,946 | **0.3866** / 0.4993 |
| 11-05 11:22Z → 11-08 00:29Z (before RC) | `/post/:item` | 227 (93) | 4,284 / 5,654 | 919 / 1,865 | 0.0072 / **1.0002** |
| 11-08 00:29Z → 11-15 05:16Z (RC live) | `/post/:item` | 144 (39) | 4,384 / 5,972 | 1,100 / 1,836 | 0.0063 / **0.0296** |
| ≥ 11-15 05:16Z (#1355; #1345/#1346 from 06:00Z) | `/post/:item` | 4 (2) | 4,212 / 6,994 | 1,239 / 1,586 | 0.0004 |
| 11-08 00:29Z → 11-15 05:16Z | root Hebrew slug | 587 (129) | 4,164 / 6,088 | 1,205 / 2,283 | 0.0040 / 0.0341 |
| ≥ 11-15 05:16Z | root Hebrew slug | 32 (10) | 4,840 / 6,487 | 2,049 / 3,020 | 0.0086 / 0.0526 |

Reading: no field LCP/TTFB improvement is visible after the RC; the CLS tail does improve. After #1345/#1346 there are 4 `/post/:item` and ≤ 32 root-slug loads — "no production p75 claim" (Codex) is correct.

**Sensitivity — automation window**: excluding 2026-11-15 01:00–04:30Z removes 51 post-like loads and moves the 14-day post-like (incl. index) p75 LCP 5,885 → 5,952 ms and TTFB p75 2,027 → 2,047 ms. Hourly web-vital sample counts show the burst: 11-15 01:00Z = 52 samples (39 root-slug post loads) versus ≈10–20 per hour either side.

**Traffic mix context (first-party `site_visits`, last 14 d, `device` is recorded here, no timing):** human visits to `/post*`: 145 mobile / 306 desktop; root Hebrew slugs: 765 mobile / 375 desktop (bots: 67/4,287 and 2/1,574). Post-like human visits are therefore ≈57% mobile by this counter (910 of 1,591) — but this cannot be transferred to web-vital rows. `site_visits` desktop "human" counts may still include undetected automation.

### 7.5 Why a Post-page *mobile* p75 for LCP/INP/CLS/TTFB cannot be computed — exact reasons

1. `events.device` is NULL for 5,361 of 5,361 web-vital rows (30 d) and `props` has no UA/viewport key.
2. The public worker validator `readingWebVitalBody` refuses any extra key and `p_device`.
3. `session_id`/`sod_id`/`person_id` are NULL (anonymous by design), so there is no join to `site_visits.device`.
4. `app_context` is the only proxy; the mobile-only subset has 38 post-like loads in 14 days.
5. Samples are hard document loads only (SPA transitions are not measured); 28% of deduped loads (1,039 of 3,704 in 14 d) have only the 15 s checkpoint row, where LCP/INP may be incomplete; no build/SHA key exists (period attribution by timestamp only).
6. No LCP-element attribution exists (recommended in `PERFORMANCE-PASS` §7.7, not implemented; `G4-FINAL-EVIDENCE` §5: "The field LCP on posts/chat is dominated by something the RUM payload cannot attribute (no LCP element in the schema…)"), so even the all-device Post p75 cannot be decomposed.

### 7.6 Data-hygiene and continuity facts that affect any reading of the field data

- **Measurement collapse 11-05 → 11-09 ≈14:00Z, restoration afterwards** (my counts, UTC days; hourly: human `site_visits` 9 at 09:00Z, 54 at 14:00Z on 11-09): `site_visits` human 1,512 / 1,074 / 1,120 / 609 (11-01…04) → **60 / 4 / 6 / 7** (11-05…08) → 577 / 1,358 / 1,388 / 863 / 862 / 414 / 512 (11-09…15); `page/engagement` events 1,000 / 676 / 704 / 366 → 36 / 1 / 3 / 5 → 545 / 1,243 / 1,301 / 827 / 838 / 304 / 482; `page/view` events 1,507 / 1,061 / 1,109 / 600 (11-01…04), 58 on 11-05, then only 2–13 per day through 11-15 (the 2029 public profile does not emit them). `G4-FINAL-EVIDENCE.md` §5: "In-house site_visits/events — deliberately collapsed after the public-reading cutover (owner decision 7.11)"; `2d3fd392`: "קריסת המדידה מ־5.11 נחשבת תקלה". So `web_vital` was the **only** reliable real-user signal 11-05…11-08.
- **Synthetic events incident** (`d9bdd7fe`, 2026-11-15 13:54Z): another Claude session's browser audit (11-15 01:00–04:00Z) "לא חסמו את rpc/ingest_event, ולכן נרשמו אירועים סינתטיים … בחלון 772 אירועים (231 מסוג view) … אין סימון שמאפשר זיהוי שורה־שורה"; a further run ≈13:55Z sent ≈4 `ingest_event` rows (device=mobile). The journal reports no correction or deletion.
- **Population shift** 11-09 (§1 item 6): root Hebrew permalinks appear from 2026-11-09 01:22:58Z.
- `readingTelemetryPath` keeps the whole Hebrew slug as the label for one-segment Hebrew paths (privacy-relevant, not a performance issue; stated only because it determines how Post pages can be selected).

## 8. Claims that lack evidence (or are over-stated relative to their evidence)

1. "#1345/#1346 speed up Post pages" — LAB with injected 100/600/300 ms delays and no throttling; live single observations went the other way; FIELD n after release = 4 `/post/:item` loads. Codex itself: "NO live speed improvement established".
2. "RC performance pass improved Post speed" — LAB only; FIELD shows no LCP/TTFB gain for `/post/:item` (p75 5,654 → 5,972 ms) while CLS p95 improved; field effect "will move only by the client-side share … roughly 0.1-0.4 s" per the RC doc.
3. "Number page faster on mobile" — explicitly not established (mobile time deltas straddle zero).
4. "Four Post cache headers" — verified on a protected Preview only; production config does not contain them; no production header evidence in the journal.
5. TTFB figures of 11-05 (n=55, 14 days) — not reproducible; window ≈ 4 h.
6. 10-14 hosted "mobile" Preview numbers — Preview, harness emulation, "SPEED-CLOSED false"; never merged.
7. Any statement of "mobile" Post field p75 — impossible (§7.5).
8. No physical phone measurement and no lab INP exist anywhere in the records read; field INP exists only without device split.
9. "Entry preload ≈65–116 ms" — lab model; LCP −46 ms "not significant".
10. 11-05 "performance gate" language — Doc37 12.48: "הושלמו 12 מחזורי נייד… הושלם רק מחזור בסיס אחד במחשב… אין להציג מדידות אלו … כשיפור כולל".
11. C-PERF-04: numeric Home useful-DOM budgets exist only in evidence, not in an enforcing test.
12. Numbers from different build profiles (421,607 B vs ≈199 KB eager gzip) are not comparable even though both are quoted as "eager gzip".

## 9. Open items others left for Post-page speed (as recorded; no new proposals)

**Codex / GPT (measurement + Post readers; shared files `App2029.jsx`, `analytics.js`, `seo.js`, Post readers, `transport.js`, workflows)**
- "Need continued document/asset delivery/performance work" (post-release #1346 note); publication of production p75 comparison "using the existing RUM pipeline and comparable traffic/device cohorts" (README #1345) — but device is not recorded.
- Latest BEFORE (measurement identity/admin-report package, base `c2acc064b`): owns telemetry client/worker, `ingest_event`, `admin_2029_analytics` proposals, report UI and tests; "Claude performance work excludes these measurement paths".
- Measurement scope (not speed): GA duplicate automatic page views — the stream setting was changed by the user on 2026-11-15 12:10Z per the journal and #1356 is live; full first-party/account identity reporting; the synthetic-event window decision.

**Claude (current owner of the Post mobile speed *improvement* package, `d9bdd7fe`)**
- Scope: archaeology of 10-31…11-05 work, fixed lab on 10 posts mobile/desktop cold/warm/in-app, up to three bottlenecks, branches only; merge/deploy centre with Codex after review; shared-file edits require journal re-scan and coordination.
- Early live observations recorded there: post document `no-store`, MISS; sandbox TTFB 0.7–1.6 s (old post ≈1.6 s: two sequential reads); content ≈7.6–8.1 s, LCP ≈8.0–9.3 s under Slow 4G / CPU×4 [LAB].
- Open: exclusion of the synthetic-event window from 11-15 reports (Codex/ZURIEL); document cache policy and any cache-header change "only as an explicit release request".

**Platform / delivery (all REC, from `PERFORMANCE-RECOMMENDATIONS-20261107.md` ranked list; none implemented)**: static-file cache headers in the production config (12 backgrounds, `/fonts/*`, `/brand/*`); CI/agents off the production API (56% of weekday API requests); document CDN cache (Variant A `Vercel-CDN-Cache-Control` preferred; Variant B changes pins), `Promise.all` for the two `/number/:n` reads and `content` selection; Skew Protection S1–S3; self-host IBM Plex Mono; `/api/card` bounds; sitemap cold build; DB items (`video_media_assets_v1` view, indexes). Number page: server projection B1 (§4.4). 11-05: built-graph budget tightening 446 KB → ~220 KB ("explicit decision"), EU read replica / SWR snapshot / parallel awaits / CDN s-maxage for documents ("Options need ZURIEL").

**Post-specific code items still unmerged**: Post body-media deferral and responsive raw-image renditions (§3 I-03); F23 reserved dimensions/approach admission, F34 source-first rendering ("Source-first public UX needs fresh controlled evidence"); F19 build-attributed usable-content and LCP-element RUM fields; physical-phone and INP acceptance; "continue measured post-page loading bottlenecks … Preserve a before/after baseline and acceptance for each" (Codex/ZURIEL release train, `d558163b`).

**Decisions awaiting ZURIEL per journal** (no decision row found): TTFB/server direction (Tokyo DB), JS ceiling, avatar GIF policy, Lightbox fit, Number server projection approvals (a)–(d), "תעלה" exact-SHA approvals for any future release.

## Appendix A — work_log rows read (id · UTC · actor · status)

Requested: `2d3fd392` 11-07 19:09 Claude `AFTER_HANDOFF_DOCUMENTATION_ONLY_NO_PASS_CLAIMED_NOTHING_APPLIED` · `79144b9e` 11-05 15:10 Claude `AFTER_BRANCH_ONLY_MEASURED_AWAITING_ZURIEL_APPROVALS` · `f91a930a` 11-05 13:32 Claude `AFTER_AUDIT_READONLY_PLUS_BRANCH_ONLY_FIX…` · `255f6085` 11-05 07:52 Claude `AFTER_UPDATE_MERGED_TO_MAIN_NOT_DEPLOYED` · `df132d2c` 11-05 07:26 Claude `AFTER_PARTIAL_MERGED_TO_MAIN_NOT_DEPLOYED` · `5b794ff6` 11-04 14:47 GPT `AFTER_HEADER_BRAND_ACCEPTED_PERF_PARTIAL_SCOPE_RELEASED` · `18fb4f13` 11-01 23:35 GPT `…REGRESSIONS_DOCUMENTED_SCOPE_RELEASED` · `2004bcf6` 11-01 20:42 GPT `BEFORE_MEASURE_MOBILE_NATIVE_SW` · `7994ef60` 11-01 06:46 GPT `AFTER_TESTED_SAVED_PREVIEW_SCOPE_RELEASED` · `aba15abf` 10-31 18:38 GPT `AFTER_IMPLEMENTED_TESTED_PROTECTED_PREVIEW_VERIFIED_ALL_SCOPE_RELEASED` · `49406fa4` 10-31 17:31 GPT BEFORE · `0682888e` 10-31 18:35 GPT Plan37 receipt · `24f99ef0` 10-31 18:24 GPT BEFORE · `ff065112` 10-31 20:07 GPT `AFTER_BACKUP_REMOTE_VERIFIED_TESTED_PUSHED_PREVIEW_BINDING_BLOCKED_SCOPE_RELEASED` · `dcbc84a3` 10-31 19:45 GPT read-only review · `57156a7d` 10-31 07:15 GPT `AFTER_EXACT_FOUR_HEADERS_TESTED_PROTECTED_PREVIEW_VERIFIED_SCOPE_RELEASED` · `8119874b` 10-31 07:11 GPT BEFORE · `27cada5e` 11-04 17:08 Claude `HANDOFF_READ_ONLY_REVIEW_NOT_RELEASED` · `639f7f15` 11-04 22:55 Claude `AFTER_BRANCH_ONLY_DRAFT_PR_1198…` · `db8fc5d4` 11-04 22:44 Claude BEFORE · `a39d2a05` 11-04 21:55 GPT `AFTER_STOPPED_BY_ZURIEL_CLAUDE_HANDOFF_SCOPE_RELEASED` · `591446bc` 11-05 03:33 Claude `DEPLOYED_UNVERIFIED_BROWSER` · `5c443c6f` 11-05 11:39 Claude `AFTER_PUBLISHED_CANARY_PASSED_WITH_FINDINGS` · `b9fd6348` 11-05 12:06 Claude `AFTER_PUBLISHED_CANARY_PASSED_FIXES_VERIFIED_LIVE` · `d558163b` (passive journal, Claude row appended by Codex; created 11-12 23:41, 237,323 chars).

Added by me (relevant, not in your list): `21990f86`, `c4ec968c`, `b013f2e1`, `cbb9506d` (10-12 Post covers) · `e0a0e509`, `154ec3d3`, `41f15a49`, `5070f5af`, `b96015c5` (10-14) · `2c564960`, `9010777a`, `c3e0712a` (10-15) · `622ba02c`, `4cc44363` (10-18 Post media) · `7f2fb090`, `bdcc48ce` (10-31 Posts closure chain) · `344b4642`, `fd3912dd`, `fc1c89a8` (11-01 Number) · `c09d8bea`, `8d2201d0` (11-02) · `55e03a20` (11-04) · `f158c057` (11-05 release #7: Number speed live, canary failure) · `ccac1020`, `d88e1b38`, `b3a04447` (releases #8–#10) · `5db1c28c`, `0e44d0b5` (11-05 addenda) · `520c540c` (11-05 Legacy separation: "NO initial-load improvement") · `d81e79f6` (11-05 DB flag `lock_number`, one row) · `3c24730f`, `9d2c9310` (11-15 URL continuity: sitemap cold/warm times) · `d9bdd7fe` (11-15 Claude Post mobile speed BEFORE).

All rows seen carry `to_actor = ZURIEL`; each GPT task has an AFTER row stating scope released (its BEFORE row is the paired claim); Claude rows `255f6085`/`df132d2c` do not carry an explicit release phrase; `27cada5e` explicitly keeps Claude as READ_ONLY reviewer with handoff "central session via ZURIEL".

## Appendix B — queries run (all SELECT)

1. `work_log` by id (24 ids + `d558163b%`), keyword scans (`topic`, `task_key`, `what_we_did`, `open_threads`), positional `substr(open_threads, …)` reads of the passive journal.
2. `project_codex` id 37: `position()` + `substr(body, …)` for §12.14–12.58 offsets.
3. `information_schema.columns` for `events`, `site_visits`, `page_views`, `traffic_*`, `project_codex`; `pg_class` partition listing; `pg_proc` for ingest/vitals/ti functions and EXECUTE roles; `cron.job` (retention) and `pg_get_functiondef(fn_telemetry_retention_120d)`.
4. `events` web-vital: monthly/day counts and min/max; `props` key inventory; NULL-column audit; page-type × `app_context` distribution; percentile tables C1–C4 (CTE above); hourly sample counts 11-14 12:00Z → 11-15; 11-05 07:52Z TTFB reconstruction; first Hebrew-slug row.
5. `site_visits` by page type × device (human/bot, 14 d); daily `events` page/engagement/web-vital vs `site_visits` (11-01 → 11-15).
