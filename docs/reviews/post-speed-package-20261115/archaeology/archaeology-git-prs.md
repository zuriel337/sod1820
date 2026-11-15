> **Provenance.** Read-only forensic report produced on 15 November 2026 by a read-only agent for the Post-page speed package (task key `POST_MOBILE_SPEED_PACKAGE_20261115`, base `origin/main` c2acc064b). It is **evidence, not an owner, a contract or a release approval**.
> The package author re-verified these statements against the code or the live site and they are relied on in the README: the deployed `public-reading-deploy/vercel.json` carries none of the static-file cache rules that the root `vercel.json` has (R01/D03); the `/:slug` route has no early source read (P08, RG2); `api/og.js` asks for the two slug spellings one after the other (D02 area); the edge middleware awaits `public_post_slug_exists` before every post document (RG6); the Home CDN window was removed by #1251 (R02); the branch-only items B01-B06 exist as described (branch names and SHAs were not re-fetched).
> Every other row is the agent's reading and was **not** re-verified; treat it as a lead. The field numbers in section 7 of `archaeology-handoffs.md` were recomputed by the package author with a different cohort definition (see README section 3); where they differ the README wins.

# Site-speed archaeology: git, PRs, deployments (2026-10-14 → 2026-11-15)

Read-only forensic report. Subject: the public "2029" site, with the mobile **Post page** (`/post/:slug`, `/:slug`, `PublicPostAddress2029Page`, `Post2029Page`) as the focus.
Anchor: `origin/main` = `c2acc064be31df93a229637bc32305a951c8006b` (#1356). Live production `dpl_J2wg6mqptCp8vFkfDbxz31dtHzoH` has source `c2acc064b` (so live == main HEAD).
No repository file, branch, alias, deployment, DB row or HTTP endpoint of sod1820.co.il / *.vercel.app was touched. Only this file (plus scratch files under the same scratchpad directory) was written.

---------------------------------------------------------------------------------------------------

## 0. Method, evidence base and caveats (read first)

1. **`/home/user/sod1820` is a shallow clone** (`.git/shallow` lists 6 boundary commits; only 72 commits are reachable from `origin/main`, back to 2026-11-08, and some parents such as `ff7428de` are absent). A plain `git log origin/main` therefore cannot see Oct-14 → Nov-08 history. I did **not** deepen that repo. Instead I created a separate blobless bare repo in the scratchpad (`perf/full.git`, `objects/info/alternates` -> the main repo's objects, remote = GitHub) and fetched the full history of `main` (6,418 commits) and all 1,578 branch heads into it. Every `git log/merge-base/cherry/show` below was run there. `main` in it equals `c2acc064b`.
2. **Squash merges.** #1191 (the single entry point of all late-October 2029 work into main) and nearly every later PR are squash merges, so ancestry from main to the original commits does not exist. I used: (a) PR heads from the GitHub API (`gh api repos/zuriel337/sod1820/pulls/N`), (b) `git merge-base --is-ancestor <commit> <PR head or deployment source>`, (c) a **content-survival check** I wrote (`perf/survive.py`): for a commit, the share of its distinctive added source lines (>= 28 chars, non-comment, non-docs) that still exist verbatim in the same file in current main, and which files are gone. "0 % + GONE-FILE" means the mechanism is not in main; a high % means it is.
3. **Deployments**: Vercel MCP `list_deployments` for project `prj_43q7k7QFAcWnin1tcBjce5xOi7Cq` (team `team_vtfWHZfKvdbob8gvynQb5N89`), all targets, 2026-10-14 → 2026-11-15, saved as `perf/deployments-early.tsv`, `perf/deployments.tsv`, `perf/deployments-preview.tsv` (preview/staging; the inline Oct 12-20 page was transcribed for the perf-related rows only). "First deployment containing X" = earliest READY deployment whose source SHA has X as an ancestor (`perf/depanc.py`). **READY + target=production does not prove the custom domains pointed at it** (CLAUDE.md: aliases are assigned separately; `get_deployment` on an old one shows only its branch alias today). Statements about "live" use the PR bodies / CLAUDE.md / the anchor, not alias history.
4. **Production vs Preview.** Before 2026-11-04 11:28Z every `target=production` deployment was the **Legacy** site (e.g. `dpl_BFpwZGiYL3Qpdy9nCuGKGb9Xmko2`, `dpl_46k9...`). **All late-October 2029 speed work (Oct 14 → Nov 3) was only ever deployed as protected Preview/Staging**, never to production, until the 2029 cutover on 2026-11-04. First 2029 production-target deployment: `dpl_CkoiEsaT1UJ7rAZuzYE7i79noi9A` (2026-11-04 11:28Z, src `1bc8260ad`, branch `gpt/2029-public-cutover-final-preparation-20261103`); last such branch-sourced one: `dpl_7KcvdVHsp26uyiLrNHppBtCKeGbX` (15:35Z, `d06cf1ab3`); first **main-sourced** production: `dpl_xw7fECMyWRrZvxxKdy71yobAhj8h` (20:21Z, `969b51423`).
5. **Time zones.** `git log` commit times shown below are author-local (+02:00 / +00:00 mixed); PR `merged_at` and deployment `created` are UTC.
6. **No live probing.** I could not (and was told not to) request headers or timings from the live site, so live-header statements rely on the repo's own live measurements (PERFORMANCE-RECOMMENDATIONS-20261107.md, PR bodies) plus config files in main. RUM tables were not re-queried.
7. **Fixed project rule respected**: no threshold/budget/baseline change is proposed anywhere in this report.

---------------------------------------------------------------------------------------------------

## 1. The structure that explains almost everything: two lineages and one squash

| Fact | Evidence |
|---|---|
| Main has **no commits between 2026-10-26 (`2195c9784`, #1166) and 2026-11-04 (`71bb76467`, #1191)**. | `perf/main-fp.tsv` (first-parent list) |
| **#1191 "Reconcile main with live 2029 and restore complete Post presentation"**: head `gpt/2029-main-live-state-reconcile-20261104` @ `b602ce1bb`, **991 commits, 3,276 files, +1,640,337/-6,135**, squash-merged `71bb76467` 2026-11-04T16:10:15Z. It is the only way the 2029 lineage (late-Oct perf commits from `gpt/2029-*`) reached main. | `gh api pulls/1191`; `git rev-list --count 2195c9784..b602ce1bb` = 991 |
| **Lineage A - the Oct 13-21 "perf waves" / "Hybrid stage preview"** (`gpt/perf-*-20261014..18`, `claude/perf-*`, `gpt/2029-hybrid-stage-preview-20261018` @ `7033c37c8`, PRs #1116-#1122 into `gpt/perf-unified-wave4-preview-20261018`, PRs #1124-#1136 into `gpt/2029-hybrid-stage-preview-20261018` incl. #1127 source-first Post - none targeted main) diverged from main at `4651042dc` (2026-10-13) and was **never merged into main nor into #1191** (`merge-base --is-ancestor <head> b602ce1bb` = no for every lineage-A branch; `merge-base hybrid b602ce1bb` = `4651042dc`). Of the 89 perf-named branches only `claude/raziel-whatsapp-response-speed-v1` (also in main) and six 2029-lineage branches (`gpt/2029-central-world-fast-reader-integration-20261024`, `codex/ahavat-public-reading-20261030`, `gpt/2029-unified-performance-consolidation-20261031`, `gpt/2029-number-fullpage-performance-20261101`, `gpt/2029-number-mobile-legacy-order-speed-20261101`, `gpt/2029-public-reading-release-configuration-20261101`) are inside #1191's head. Lineage-A branches are 130-475 commits ahead of, and 311 behind, main. Only Preview deployments ever contained it (list in section 4). | `perf/branchtable.tsv` (Appendix C) |
| **Lineage B - the 2029 lineage** (`gpt/2029-*` Oct 22 → Nov 3) re-implemented a *selected subset* of lineage-A ideas ("F10/F13/F18/F20 restored", every other of the 34 groups F01-F34 left PARTIAL/OPEN/SUPERSEDED) and is what main/production run. | `docs/reviews/unified-performance-consolidation-20261031.md` (F01-F34 table) |
| **Lineage C - main after the cutover** (Nov 5 → Nov 15): a short, separate set of speed items (#1220/#1226/#1227/#1228/#1229/#1238/#1262/#1272/#1344/#1345/#1346), each deployed to production within hours of merge. | section 2, Appendix A |

Consequence for anyone looking for "the speed work": **commit subjects containing `perf(...)` in October mostly describe code that is not in main.** Use the "still in main?" column below, not the subject.

---------------------------------------------------------------------------------------------------

## 2. Master table - Post-page chain, items that exist in main

Tags: **[POST]** Post page; **[SITE]** shared shell/first load, affects Post; **[POST-partial]** reaches only part of the Post population; others as named.
Status class: LIVE / LIVE-BUT-DEGRADED / REMOVED-OR-OVERRIDDEN / BRANCH-ONLY / RECOMMENDATION-ONLY / UNKNOWN.
`prod-first` = first READY production-target deployment containing it; `prev-first` = first Preview/Staging.

### 2A. LIVE and LIVE-BUT-DEGRADED

| # | Improvement | Problem / cited metric | Where (PR / branch / SHA) | Merged | prod-first | Class and proof it is active in main (file:line) | Later change that hurt / bypassed it | Guard today |
|---|---|---|---|---|---|---|---|---|
| P01 | **Entry `modulepreload` before the worker bootstrap** [SITE] | Bootstrap imports the entry only after worker register/activate/handshake (10 s timeout), so entry download starts late. Lab: entry download ends 158 ms earlier (99/112 pairs), time-to-app -94 ms (p=0.010), LCP -46 ms (not significant), FCP none (PERFORMANCE-PASS-20261107 §4). | #1262 `claude/sod1820-audit-rc-g93w32`@`28145cea5` ("PF3") | `cfa7cc1ce` 2026-11-08T00:27Z | `dpl_3tEP9gQAzP6Kdq752FwsgSFVxrHz` 11-08 00:27Z | **LIVE**. `scripts/build-public-reading-production.mjs:100`; bootstrap `public-reading-deploy/transport.js:617-619`. Survival of #1262's added lines: 97 % (5,080/5,199). | none found | `test/public-reading-entry-preload.browser.mjs`; `test/public-reading-production-artifact.test.mjs` |
| P02 | **Numeric-font CSS made non-blocking** (cold-start stall) [SITE] | A render-blocking Google Fonts stylesheet stalled the module that installs the worker/starts the app; held 7 s => worker registration only at 7.120 s (README of public-cold-start-20261102). The original 60 s cold failure had no trace. | `6cd64a795` `gpt/2029-public-reading-release-configuration-20261101` (2026-11-02) | in #1191 `71bb76467` 11-04 16:10Z | `dpl_CkoiEsaT1UJ7rAZuzYE7i79noi9A` 11-04 11:28Z (src `1bc8260ad`); main-sourced `dpl_xw7f...` 20:21Z. prev-first `dpl_Fyd6ngZYrU1NucKYr6K6AQJw7tRj` (staging 11-02 08:56Z) | **LIVE**. `2029.html:22-23` (`media="print" onload`, noscript fallback). | none | `test/public-reading-production-artifact.test.mjs` (media=print pin). Full final evidence (25 files incl. `performance-summary.json`) is BRANCH-ONLY on `gpt/2029-public-reading-release-acceptance-20261101` (B13). |
| P03 | **Supabase `preconnect` in the document** [SITE] | Lab (harness model, not an observed early socket): connection setup charged to cold `/post` requests 897 -> 621 ms on slow 4G (PF5). | #1262 | `cfa7cc1ce` | `dpl_3tEP...` 11-08 | **LIVE**. `2029.html:16`. | none | `test/public-reading-production-artifact.test.mjs` (document pins) |
| P04 | **Royal opening shell (first paint)** [SITE] | Replace a blank/skeleton boot with the real frame bar painted from `2029.html` and the Suspense fallback; "arrival cue" replaces the entrance intro. No ms metric in the PR. | #1272 `claude/sod1820-first-paint-royal-shell-g93w32`@`048f25902` | `b33471310` 11-08T04:37Z | `dpl_Cf3GhwPoLeeQLQEu7daDidps1ViH` 11-08 04:38Z | **LIVE**. `2029.html:40` (`.sod29-opening`), `src/components/experience2029/Opening2029.jsx`; survival 266/266 lines. | none | UNKNOWN (no perf pin; visual gates only) |
| P05 | **First-load JS trims + guard** [SITE] | Static imports of contributor link policy and golden-post claim helpers pulled into the shell. Lab, cold, brotli: `/post/<slug>` 417,077 -> 369,822 B (-47.3 KB), `/` -31.3 KB, `/world` -57.4 KB; ready/LCP on slow 4G `/post/<slug>` -199/-208 ms (7/7 pairs). | #1262 ("PF1") | `cfa7cc1ce` | `dpl_3tEP...` 11-08 | **LIVE**. `scripts/test-2029-first-load-graph.mjs` (48/48 added lines survive). Source weight of the shared frame drifted up afterwards: `SystemFrame2029.jsx` 132,968 B (`2195c9784`) -> 149,145 (`b602ce1bb`) -> 155,567 (`cfa7cc1ce`) -> **151,006 (main)**; `systemFrame2029.css` 69,162 -> 69,840; `...unified-bar.css` 39,211 -> 39,600. No post-Nov-8 built-size measurement exists in the repo. | later feature commits to the frame (#1304, #1310, #1314, #1326) - none speed-motivated; frame never split (see D05) | `scripts/test-2029-first-load-graph.mjs` (`.github/workflows/live-contracts-2029.yml:89`); `scripts/test-2029-built-graph.mjs` eager budget (`.github/workflows/2029-isolation-gate.yml:201`) |
| P06 | **Realtime/Phoenix out of the eager entry** (F20) [SITE] | "Exact 2029-only alias removes Phoenix from eager entry" (no ms in the doc). | `4cf307934` `gpt/2029-unified-performance-consolidation-20261031` (restored reviewed 417-line adapter from `5de4d577`); CI wiring #1228 `b0a752c66` (the contract "ran nowhere") | #1191 `71bb76467`; #1228 11-05T07:56Z | `dpl_CkoiEsa...` 11-04 11:28Z; #1228 `dpl_jMPhd1gbMuoDRHk1PLXxg18PRHPP` 11-05 11:20Z. prev-first `dpl_hvfBrT9L7hL1uxLk3BNeKan1iXRQ` (preview 10-31 18:21Z) | **LIVE**. `vite.config.js:16` alias `@supabase/realtime-js` -> `src/lib/realtimeLazy2029.js`. | none | `test/realtime-entry-split-2029.test.mjs`, `test/realtime-entry-split-browser-loopback-2029.test.mjs` (CI via `live-contracts-2029.yml`, added by #1228) |
| P07 | **Post code prefetched once Home's module has loaded** [POST-partial: only navigations that start on Home] | Code admission dominated first-Post: `post2029ReadingProjection` chunk took 1,176-1,540 ms (DIAGNOSIS.md). Keeping Post code off the Home entry (`75f9b3717` and the `11e8fc03` candidate) measured **firstPost 1,105 -> 2,118 ms** (Home 6,919 -> 5,900 ms, 3 mobile pairs; "not accepted as an all-route improvement"); `b839a817b` reverted that scheduling (root mounts PublicPostAddress again) and `d13233577` replaced it with the prefetch below. Final soft path: Home -> Post 0.71 -> 0.69 s useful (public-launch-useful-loading PERFORMANCE.md, lab). | `d13233577` (`gpt/2029-doc37-unified-alignment-20261102`), superseding `b839a817b` | #1191 | `dpl_CkoiEsa...` 11-04 11:28Z; prev-first `dpl_7H7Qwn2pnvTpmQdqX6cB4Jnquign` (preview 11-02 18:56Z) | **LIVE**. `src/App2029.jsx:27-31` (`loadPublicPostAddress` after `Home2029Page` module resolves), `:60`. **Does not help deep links** (Google -> `/:slug`, shares, reloads). `b839a817b` itself now has 0 % survival because `d13233577` replaced the mechanism with the same intent. | none | `test/unified-performance-2029.browser.mjs` (soft-nav stages); no hard-load Post pin |
| P08 | **Route-owned Post read overlapped with component download** [POST-partial] | Chain was code -> source: projection chunk transfer 1,414 ms, *then* source request 1,590 ms later (453 ms read) (DIAGNOSIS.md l.19). | `36c79e281` (2026-11-01 21:17, `gpt/2029-public-reading-release-configuration-20261101`) | #1191 | `dpl_CkoiEsa...` 11-04 11:28Z; prev-first `dpl_Aq4Prk1prJU38iv1rLPEofUvsnDC` (staging 11-01 21:18Z) | **LIVE-BUT-DEGRADED**. `beginPostReadingSource` `src/lib/supabase.js:297`; used only by `PostEntry2029` `src/App2029.jsx:103-118` (read starts at `:110`) which serves **`/post/:slug` only** (route `:409`). The **`/:slug` route** (`:381` -> `PublicPostAddress2029Page`) renders `<Post2029Page resolvedSlug={slug}/>` **with no `sourceReader`** (`src/pages/PublicPostAddress2029Page.jsx:25`), i.e. code -> source serialization remains. `publicPostAddress()` (`src/lib/publicPostUrls.js:40-47`) keeps **imported WordPress posts (wp_id <= 36935) and `source=wordpress` at root `/${slug}`**; only native/modern posts use `/post/${slug}`. For signed-in visitors the read waits for `useAuth().loading` (`App2029.jsx:105,109`; `AuthContext.jsx:67-72` = `verifyReadingSession` network check + profile fetch before `setLoading(false)`). | scoped to `PUBLIC_READING_RELEASE` by design | `test/public-source-invitation-2029.test.mjs`; `test/post-background-preload-20261115.test.mjs` exercises the reader |
| P09 | **Smaller Post reader graph**: Golden/engine adapters and the 75 KB historical witness loaded only when used [POST] | Projection chunk 51,601 B -> 29,398 B compressed (DIAGNOSIS.md l.34-45, 67-72). | `36c79e281` (adapters), `5245f38e6` (witness; 2026-11-01 22:18) | #1191 | `dpl_CkoiEsa...`; prev-first `dpl_541Ljz649tiYjJLyrS3JjubaMhWs` (staging 11-01 22:18Z) | **LIVE**. Dynamic imports `src/lib/research/post2029ReadingProjection.js:828` (`researchW2Executors`), `:860` (`post2029PreviewSnapshot`); survival 95 % / 100 %. | none | `test/public-source-invitation-2029.test.mjs` (witness only on exact fallback) |
| P10 | **Explicit post columns** (`POST_READER_SELECT`) [POST] | `select *` (42 cols incl. `content_old`, present on 52 % of posts, avg 29 KB, max 553 KB) -> 30 columns, about -1.5 KB per average post view. `content` (avg 20.9 KB) is still read. | #1262 | `cfa7cc1ce` | `dpl_3tEP...` 11-08 | **LIVE**. `src/lib/postReaderColumns.js:23`; used at `src/lib/supabase.js:267`. | none | `src/lib/postReaderColumns.test.js` (fails if a client reads an excluded column) |
| P11 | **Anonymous read de-duplication + 30 s memo** (PF2) [SITE, POST-partial] | Method Lens 1,365 -> 29 page API requests, 17,977 -> 1,278 ms; 4-page walk 72 requests/16 duplicates -> 54/0. `posts` GET is in the rule list. | #1262 | `cfa7cc1ce` | `dpl_3tEP...` | **LIVE**. `src/lib/readDedupe.js:92,197` (rule `posts` at `:64`), wired `src/lib/supabase.js:25`. Caveat: requests that carry an `AbortSignal` (the route-owned Post read does) are never shared *in flight*; they are only memoised afterwards (header of `readDedupe.js`). `99c891e38` (Nov 12) added a rule only. | none | `src/lib/readDedupe.test.js`, `test/supabase-client-read-dedupe.test.mjs` |
| P12 | **Footer hidden while a route shows only its loading placeholder** + footer reserve (CLS) [POST] | Field's only route group over 0.1: `/post` footer shift = 42 of 67 bad events, avg 0.70. Lab: return visit 390 px **1.167 -> 0.212**, 1440 px 0.947 -> 0.032, cold deep link 0.816 -> 0.000-0.152. | #1220 `claude/footer-cls-20261105`@`2c959a27c` (reserve one viewport); PF5 in #1262 (hide while loading); #1226 gate | #1220 `ad2d84c83` 11-05T06:35Z; #1226 `f7d047c27`; #1262 `cfa7cc1ce` | #1220/#1226 -> `dpl_jMPhd1gbMuoDRHk1PLXxg18PRHPP` 11-05 11:20Z; #1262 `dpl_3tEP...` | **LIVE**. `src/components/experience2029/footer2029.css:59` (`:has(...)`, older engines keep old behaviour). | none | `test/footer-loading-cls-2029.test.mjs`; `tests/world2029-release.spec.cjs` (#1226: real post, reads delayed 1.5 s, 390/1440 px) |
| P13 | **Post cover `loading=eager` + `fetchPriority=high`; lazy media decodes async** [POST, posts with a canonical cover] | LCP `/post` fast 4G 2,504 -> 2,412 ms (inside noise); deep link 3,292 -> 2,816 ms (PF5). | #1262 | `cfa7cc1ce` | `dpl_3tEP...` | **LIVE**. `src/pages/Post2029Page.jsx:1154`; `src/components/experience2029/CanonicalMediaImage2029.jsx:29,36`. Default `loading="lazy"` remains for everything else (`CanonicalMediaImage2029.jsx:14`). Body `<img>` tags get **no** `loading/decoding` from code (`postReadingHtml2029` only sets `iframe.loading="lazy"`, `post2029ReadingProjection.js:79`). | none | UNKNOWN (no pin) |
| P14 | **Post background requested while canonical calculations are still pending (#1345)** [POST] | Live lab (390 px): source read done ~1,804 ms, canonical calc 1,826-2,037 ms, backdrop request only at 2,071 ms; LCP 2,428 ms and 3,412 ms was the article background. Fixture (3 runs, imposed delays 100/600/300 ms): median LCP **2,128 -> 1,636 ms (390 px)**, 1,972 -> 1,700 ms (1280 px). "Fixture results, not production p75." | #1345 `codex/post-speed-measurement-20261115`@`9c594d0c0` | `3843af126` 2026-11-15T01:03Z | `dpl_5zVyxXPYNf7tH4jaovi7C4So2FEf` 11-15 05:10Z (src `fec22ca07`, i.e. shipped inside #1355) | **LIVE**. `src/lib/research/postBackground2029.js:43-57`; called `post2029ReadingProjection.js:853`. Only when `data-theme-2029=dark` (default theme is dark: `src/lib/themePreset2029.js:35`) and for public, non-invitation posts. Reached by both `/post/:slug` and `/:slug` (both use `fetchPost2029ReadingProjection`). | none (new) | `test/post-background-preload-20261115.test.mjs`; `test/post-speed-page-analytics.browser.mjs` |
| P15 | **Independent enrichment reads overlap (#1346)** [POST-partial: Bennett salt, FZ1073, Golden, elections-chain posts only] | Controlled reader timing: Bennett 502 -> **251 ms**; FZ1073 502 -> 502 ms (later connection lookup stays longest chain). Live single samples afterwards: Golden LCP **3,560 -> 4,572 ms**, FZ 3,328 -> 3,608 ms (PR: "do not demonstrate a live speed improvement"). | #1346 `codex/post-projection-parallel-20261115`@`ad3d3842a` (contains #1347/#1348) | `c752b0014` 11-15T05:56Z | `dpl_CLXTnXF5de1PN1STtajXghtnhyVU` 11-15 05:56Z | **LIVE**. `post2029ReadingProjection.js:871-880` (`contextPackResult` allSettled started before the `Promise.all` of verifications). Ordinary posts unchanged; `resolvePostExperienceConnections` (`:388`) is still awaited before any Post is shown. | none | `test/post-projection-parallel-20261115.test.mjs` (wired to Live Contracts) |
| P16 | **Stale-chunk recovery + cheap 404 for missing `/assets/*`** (robustness, prevents blank screens after deploys) [SITE] | 9-25 function calls per stale tab; each ~11 KB / 0.4-0.85 s. | #1262 (A1) | `cfa7cc1ce` | `dpl_3tEP...` | **LIVE**. `src/main2029.jsx:18` (`installAppRecovery2029({ entryKey })`), `src/lib/appRecovery2029.js`; `public-reading-deploy/api/public-document.js:45-47` (`ASSET_FILE_PATH`, `missingAssetFile`). Skew Protection itself is D07. | none | tests in #1262 (UNKNOWN names) |
| P17 | **Worker loads public image/video/audio natively** (#1299) [POST, body media from public buckets] | Correctness fix (media failed with `net::ERR_FAILED`); side-effect: Range/206, redirects and HTTP cache instead of rebuild with `redirect=error`. No speed number. | #1299 `fix/or-geula-video-sw-bypass`@`b0fd66037` | `932aba4bd` 11-10T23:52Z | `dpl_HnswhFsyHPK2aSKxLN9nak3r2BKL` 11-10 23:58Z | **LIVE**. `src/lib/mediaEgressGuard.js` (`PUBLIC_STORAGE_MEDIA_V1`), `public-reading-deploy/transport.js` | none | `test/public-media-transport-2029.browser.mjs` |
| P18 | **Public RUM collector** (web vitals, hard-load only) [SITE] | Only field signal; first data 2026-11-05 03:44Z. | `11346873d` (#1198) | 11-05 | `dpl_Ds3PSspTDjTQGEdXK8RPSt4oFZ7s` 11-05 03:31Z (src `a27d8d06f`; `#1198` at `11346873d` precedes it) | **LIVE** `src/lib/webVitals2029.js:170`, started `src/App2029.jsx:187`. **No LCP-element, build-SHA or usable-content fields** (grep: no `lcp_element`/`.element`); RUM v2 (F19) not carried. | n/a | `scripts/test-web-vitals-2029.mjs` (`2029-isolation-gate.yml:120`) |

### 2B. REMOVED-OR-OVERRIDDEN

| # | Improvement | Problem / metric | Where | Merged / deployed | Class + proof | What overrode it | Guard |
|---|---|---|---|---|---|---|---|
| R01 | **Immutable `Cache-Control` for the 12 versioned Post backgrounds ("Four Post image cache headers", POSTS_FOUR_CACHE_HEADERS_PREVIEW_20261031)** [POST] | Every post loads one of 3 renditions of its series' background (5.7-59 KB); with the global `no-store` rule the browser re-downloads them on every hard load. (The 4 mobile-v2 files are 21-30 KB.) | `9684032e2` "perf(posts): cache only versioned background assets after the catch-all [skip ci]" (10-31 00:40; preview `dpl_HkHEX4wARqRcHQ6JnCmDwhmthTae`); `4f8ef45fc` "Posts: cache only the four approved portrait backgrounds" (10-31 09:12; preview `dpl_DW9DuncM5kmL8V3hv5HxsrLd2onB`); patch `docs/reviews/posts-mobile-cache-headers-20261031.patch` (targets root `vercel.json`) | In main via #1191 (`71bb76467`). Container deployed from 11-04 11:28Z. | **REMOVED-OR-OVERRIDDEN (inert since the cutover)**. Root `vercel.json:1150-1249` has the rules (13 immutable rules). **Production builds `public-reading-deploy/vercel.json`**, whose `headers` are only: `/(.*)` no-store; `/assets/(.*)` immutable; favicon/apple-touch 1 day; `/unsubscribe`; `/tzofen.html`; `/api/(.*)`; worker no-store. `git log -G'Cache-Control\|max-age\|immutable' -- public-reading-deploy/vercel.json` = `71bb76467`, `3cc3d7a77` (favicon) only. Live check by PERFORMANCE-RECOMMENDATIONS-20261107 §6.1: the backgrounds, preloaded fonts (73 KB), brand icons and `/logo.png` are `no-store`. The same doc ranks adding them as recommendation #1 (XS effort); **not applied in main as of `c2acc064b`.** | root-vs-deployed config split created by the 2029 cutover (`rootDirectory=public-reading-deploy`) | `test/post-backgrounds-2029.test.mjs:65-73` **reads `../vercel.json` (root)** - green while production lacks the headers |
| R02 | **Home document CDN window** (`Vercel-CDN-Cache-Control: max-age=30, stale-while-revalidate=30` on `/` and `/2029`) [HOME] | Home TTFB p50 0.53 s, p75 1.0 s, p90 1.9 s (14 days, 360 navigations); every app launch rebuilt the document. | `ce12fae58` (11-06 01:34Z) inside #1249 `c22fcc789` (merged 11-06T02:00:22Z) | prod `dpl_Fnz5Ax9ARZhs2eBxR2L3Qseae5qP` 11-06 02:14Z; **removed by #1251 `a3e6b737f`** (11-06T02:36:02Z), prod `dpl_AGBw6N6qheCeo7CBbMqy1tKcYmV4` 02:40Z | **REMOVED**. "After the release of c22fcc78 the live Home returned `x-vercel-cache: MISS` with age 0 on two consecutive requests, so the window was not taking effect (likely because the edge middleware adds `set-cookie vb/vc` ...; not verified). It gave no speed-up." Not present now (grep `Vercel-CDN-Cache-Control` in `public-reading-deploy/api/public-document.js` = none). | removed at ZURIEL's request | n/a. Direct evidence that the "Variant A document CDN cache" recommendation (D01) was **tried once, on Home, and did not produce HITs**. |
| R03 | **Font preload trimming + "render without waiting for fonts"** (Oct 14) [SITE] | "Preloading all four local fonts (~70 KB br) delays FCP ~400 ms on the lab mobile profile; keeping only Noto Regular/Bold (~26 KB br) keeps CLS 0.009 and FCP -210 ms vs base." (`44dd98240`, `c43c6faae`). | `44dd98240`/`c43c6faae` in lineage A (first Preview `dpl_PKfpdHkQy81q4X9qLNGapMbCvEjW` 10-14 06:15Z) | never merged | **BRANCH-ONLY** (single class; listed with the delivery-config items): main preloads **all four** fonts (`2029.html:11-14`: Noto Regular+Bold, Rubik Hebrew+Latin) - the configuration that measurement called harmful; fonts are also `no-store` (R01). The "don't block render on fonts" half exists in another form (`src/main2029.jsx:22-47`: `void warmLocalFonts()`, 1.5 s race, never blocks `root.render`). | different implementation chosen in lineage B | n/a |

### 2C. BRANCH-ONLY (not in main; details in section 5)

| # | Improvement | Problem / metric | Branch @ head | Ahead/behind main | prev-first (Preview) | What is not in main |
|---|---|---|---|---|---|---|
| B01 | **Source-first Post render** (paint public source from the early read, lazy-load enrichment, lazy `PostConvergenceMeasures2029`/`PostComments2029`) | Public row 35,336 B was not the bottleneck; reader waited for route graph, then verification, connections and Golden pack. Controlled 390 px (4x CPU, 150 ms, 200 KB/s): source hero **12,529 -> 9,149 ms (-27.0 %)**, LCP **13,732 -> 11,064 ms (-19.4 %)**, FCP **+168 ms**, CLS 0.0038 -> 0.01265; "does **not** pass LCP <= 2.5 s, so not release acceptance". | commit `b43a0e78c` (PR #1127, base `gpt/2029-hybrid-stage-preview-20261018`, head `gpt/post-2029-source-first-reconcile-20261019`@`15821f390` - **branch no longer on origin**, merge `5de4d5772` 2026-10-19T12:33Z). Alive in `gpt/2029-hybrid-stage-preview-20261018`@`7033c37c8`, `claude/unified-post-shell-stacked-20261020`@`b2f71d6f8`, `claude/shell-mobile-island-5107-20261021`@`26d6ec083`, `gpt/post-2029-surface-acceptance-20261019`@`46df88db9` | hybrid +406/-311; surface-acceptance +354/-311 | `dpl_Bcknscq2iAP6wsWr1wTXWtQytysF` (10-19 12:33Z); `dpl_2CsfL1N9AwMyY5YsfbQNxTKwxKpY` (10-20 10:03Z) | All of it: `src/lib/research/post2029PrimaryProjection.js`, `buildPost2029PrimaryProjection`, `enrichPost2029ReadingProjection`, `afterPrimarySourcePaint`, `test/post-source-first-2029.test.mjs`. Survival of the commit's lines: 10 % (17/65 in the projection file are incidental). In main `Post2029Page.jsx:668` shows the loading frame until the **whole** projection (verifications, `resolvePostExperienceConnections`, context pack) resolves; `PostConvergenceMeasures2029`/`PostComments2029` are **static imports** (`Post2029Page.jsx:31-32`). Consolidation doc F34: "Source-first public UX needs fresh controlled evidence." |
| B02 | **Defer Post body media near the viewport** (wheel/touch approach intent, reserved dimensions) | none quoted in subject (evidence docs on branch) | 8 commits `c069b0f0b`...`d3c9dcf5b` on `gpt/perf-post-body-media-defer-20261018`@`d3c9dcf5b` (also a different-SHA twin `c229de9d2` inside wave4) | +281/-311 | `dpl_4HiFJh9SiWFGr9trDAPHTVm8XSkw` (10-18 07:04Z, wave4) | `src/lib/postBodyMedia2029.js`, `test/post-body-media-defer-2029.test.mjs`, `post2029-reading.css` hunks: 0 % survival. F23 in the consolidation doc: "approach/intent admission helper and reserved-dimension evidence are absent". |
| B03 | **Responsive Supabase renditions for raw post `<img>` + primary canonical media eager/high** (srcset 480/768/941, sizes for the 576 px column) | (commit text) | `582a4ce8b` on `claude/perf-post-media-p0-20261018-cwujt8` (1 commit on `8f78c0c7c`) | +266/-311 | none (no deployment of this SHA) | `src/lib/postRawMediaRendition2029.js` + `test/post-raw-media-rendition-2029.test.mjs`: 0 % survival. Main gives body `<img>` neither srcset nor lazy/decoding attributes. |
| B04 | **Faithful mobile reading-image rendition via the Supabase render endpoint** (follow-up to PR #1100) | (commit text) | `5c990b7d6` `claude/pr1100-mobile-reading-image-20261014` (+ twin `15af7affa`). **PR #1100 itself ("perf(2029): advance primary reads, bound World work and enforce measured regressions", head `gpt/perf-execution-20261014`@`01ac77064`, base `gpt/shared-preview-integration-20261014`) was CLOSED unmerged.** | +139/-311 | none | 51 added lines, 0 % survival. |
| B05 | **F5 - edge middleware: skip the blocking `public_post_slug_exists` RPC for human document navigations; bound the lookup at 800 ms** | Loopback model (L=150 ms): `/post/:slug` cold cache adds **151.4 ms = one serialized round trip**; applied-A: 0.01 ms for humans, bots bounded 801 ms. Real Edge->Supabase RTT "not measurable here". Legacy root `/:slug` unchanged even by A. Blocked on a **soft-404 decision** (human gets 200+noindex instead of 404). | `a8168558c`, `9ed573364` on `claude/perf-post-middleware-f5-vmwq1d`@`9ed573364` | +258/-311 | none | In main the call is live: `middleware-core.js:265-290` (`publicPostSlugExists`, no timeout), invoked `:381-391` for every GET/HEAD of `/:slug` and `/post/:slug`; production re-exports it (`public-reading-deploy/middleware.js:4`). No `isHumanDocumentNavigation`, no `POST_ROUTE_LOOKUP_TIMEOUT_MS`. Per-instance cache 10 min / 512 entries. |
| B06 | **Connection checks read `id,slug` instead of the whole Post row** (`readPostIdentityBySlug`) | "about 290 KB of Post rows on /world" per page; same slug candidates. | `0cdf3e202` on `perf/shared-load-main-20261013` (2 commits, +2/-311; twin `1fcb02f2d` in lineage A) | +2/-311 | `dpl_PKfpdHkQy81q4X9qLNGapMbCvEjW` 10-14 06:15Z | Main: `resolvePostExperienceConnections` default reader is `getPostBySlug` (30 columns incl. `content`) per connection (`post2029ReadingProjection.js:388,411`) and gates on `isPublicPostReadingSource(post)` (needs more than id+slug) - so not a drop-in. |
| B07 | **Start canonical primary reads in the document head** (`e2a209b7e`) | (commit text) | lineage A (e.g. `claude/perf-d3-integration-20261018`) | - | `dpl_PKfpdHkQy81q4X9qLNGapMbCvEjW` | 110 added lines, 0 % survival; superseded in spirit by P08 (JS-start, `/post/:slug` only). |
| B08 | **Pause off-screen authored CSS animations** (F04, `a5f272d38`) | "Post render-cost evidence" in commit | lineage A | - | `dpl_B22J8WkTxa9tAECYfEdGgcwnrNbU` 10-16 05:10Z | 0 %; `pauseOffscreenAnimations2029.js` absent (F04 OPEN). |
| B09 | **Reserve reading-trail height before context resolves** (`6cc20ed68`, CLS) | | lineage A | - | `dpl_PKfpdHkQy81q4X9qLNGapMbCvEjW` | 0 %. |
| B10 | **Start locked-route code in parallel with gates** (F14, `7ede24ca6`) | "locked route early-read blocker" test commit `e169ed881` | `codex/perf-locked-route-start-20261018`@`ad145b838` | +258/-311 | `dpl_7HaPsuqukbFUHoXKt6XqmoqHpBBr` 10-18 00:31Z | 139 added lines, 1 % survival; consolidation F14 OPEN. |
| B11 | **Prevent repeat 631 corpus read on Post enrichment** (`0ac833c10`) and **defer election maps to post-end** (`9b0fb0002`) | | `claude/unified-post-shell-stacked-20261020`@`b2f71d6f8` | +424/-311 | `dpl_8GyUpe5YEqrS1hFPSaLLgVP1WH3V` 10-20 11:21Z | 0 %. |
| B12 | **Speed/UX audit tooling of the stopped track 4** | "unfinished, untested, not for review"; no findings document | `claude/preserve-speed-ux-audit-20261113`@`99a628485` (1 commit on audit round 6; 4 files `docs/reviews/m0-security-stabilization-20261112/speed-ux-audit/{speed-lab.mjs,serve-artifact.mjs,summarize-lab.mjs,production-read-only-rpcs.json}`) | +68/-19 | n/a | none of it in main; no result exists. |
| B13 | **Cold-start root-cause evidence** (25 files incl. `performance-summary.json`, `FAILURES.md`, `PERFORMANCE.md`, native traces) | the 60 s cold-failure investigation behind P02 | `gpt/2029-public-reading-release-acceptance-20261101`@`d961b5bdd` (12 commits not in #1191) | +870/-269 | n/a | main has only `docs/reviews/public-cold-start-20261102/README.md` and `native-startup.cjs`. |
| B14 | Lineage-A Home/Number/World/ELS/shared-boot items (`perf(home): ...` on-approach loads, `perf(number): defer full projection behind compact opening`, `perf(world): defer flight story timeline`, ELS verse payload defer, shared readiness, RUM v2 foundation `b10c5dd31`, site_flags coalescing `fd831f894`, realtime split `05bc151ea`, D3 `579bda2ed`) | various | `gpt/perf-unified-wave4-preview-20261018`@`e994cb671` (+326/-311) and its ~60 sibling `gpt/perf-*`/`claude/perf-*` branches | see Appendix C | wave Previews `dpl_CjUoDZH...` 10-18 00:44Z, `dpl_HdaTc9...` 02:46Z, `dpl_4HiFJh...` 07:04Z, `dpl_8XfhvF...` 13:47Z | Survival 0-1 % for almost all (see `perf/set2.out`); the ones main *does* have were re-built in lineage B: realtime split (P06), D3/F13 story viewer (`StoryViewerOnDemand2029.jsx`), Golden executors lazy (P09), preview-witness lazy (P09), calculators lazy (`App2029.jsx:12,16`). Not carried: RUM v2 (F19), ELS payload defer (F24), Home on-approach readers (F17/F27-F30 OPEN at Oct 31; partially rebuilt in `f269775e2`, 86 % survival, Home-only), World compact story (F21/F31). |

### 2D. RECOMMENDATION-ONLY (documented, never implemented)

All verified absent from main at `c2acc064b`. Source: `docs/reviews/audit-remediation-20261106/PERFORMANCE-RECOMMENDATIONS-20261107.md` (rev. 2; branch `perf/pf6-platform-db-recommendations`), PERFORMANCE-PASS-20261107.md §7, post-source-first README, consolidation doc.

| # | Recommendation | Claimed effect (their numbers) | Verified status in main |
|---|---|---|---|
| D01 | **Document CDN caching, Variant A** (`Vercel-CDN-Cache-Control` for `/post/:slug`, `/number/*` ...; browser stays `no-store`) | `/post` server wait -0.26 s (fast mode) / -0.66 s (slow mode), mean -0.47 s; field upper bound TTFB p50 -0.27 s, p75 -0.58 s, LCP p75 <= ~-0.5 s at 100 % hit ratio; ~93 `/post` hard loads/day over 1,320 posts => low hit ratio. Open risks: degraded 200s cached, per-visitor `Set-Cookie vc/vb` replay, takedown latency, header precedence. | **absent** (`Vercel-CDN-Cache-Control` grep = none in `public-document.js`, `og.js`). The only attempt (Home, R02) produced MISS/age 0. `public-document.js:56` still sets `Cache-Control: no-store` first. |
| D02 | `api/og.js`: fire `number_anchors` + `is_number_indexable` concurrently; select `content` only when needed | `/number/:n` mean about -0.3 s; ~21 KB avg off the Tokyo->iad1 transfer | **absent**: `api/og.js:330` selects `content`; number reads sequential at `:926` then `:1050`. (`/post` document read = 1 sequential Supabase read in `og.js`, plus the middleware read B05.) |
| D03 | Immutable/long TTL for `/fonts/*`, `/brand/*` and the 12 backgrounds in the **deployed** `public-reading-deploy/vercel.json` | repeat views save ~100-160 KB and 4-8 requests per hard load | **absent** (see R01). |
| D04 | Self-host IBM Plex Mono (drop 2 preconnects + CSS hop) | removes 2 connection setups; not an LCP gain | **absent**: `2029.html:17-18,22-23` still use Google Fonts (2 preconnects + stylesheet); `public/fonts/` has no Plex. |
| D05 | Split optional System Frame capabilities from the reading shell; split `Sod2029Shell`/frame CSS (229 KB raw, 19-22 % rule use on first load) | Oct-19 critical path: entry 358.9 KB raw/116.5 KB gzip ~3.5 s; frame JS 210.9 KB raw/63.5 gz; frame CSS 194.4 KB raw/28.9 gz (4x CPU lab) | **absent**: single `SystemFrame2029.jsx` (151,006 B source) + 5 frame CSS files. |
| D06 | Right-sized / modern-format images; server-document preload of the post cover (LCP load delay 1.2 s of 2.5 s on fast 4G) | -0.25 to -0.5 s `/post` LCP (est.) | **absent** (no srcset, no document-level preload; B03/B04 branch-only). |
| D07 | Skew Protection (S1/S2) and routing `/assets` out of the function (S3) | stop 9-25 function calls per stale tab | **absent** (`__vdpl` / `VERCEL_SKEW_PROTECTION_ENABLED` grep = none). The in-function variant `missingAssetFile` + client recovery exist (P16). |
| D08 | RUM: LCP element attribution; RUM v2 (build SHA, usable-content) | "only way to know what the 5.6 s `/post` LCP p75 is made of" | **absent** (P18; F19 OPEN). |
| D09 | Service-worker policy: `fn_relation_candidate` 403 loop; **DB** items (video matview, indexes, `site_pulse_today`, `writer_public_contributions_page_v1`, FK indexes ...) | DB time shares; `/video` 1.3-2.9 s -> ms | SW/DB parts **UNKNOWN** here (no DB/live access); the client refetch loop fix is in P11. |
| D10 | Number server projection (`docs/reviews/number-page-speed-20261105/SERVER_PROJECTION_PROPOSAL.md`) [NUMBER] | | proposal only. |
| D11 | `docs/2029-media-performance-delivery-map-v1.md` (2026-09-19, "IMPLEMENTATION MAP - BRANCH-ONLY"): image ladder M0-MS, background renditions | | design only; Post body images do not use it. |
| D12 | CI/agent traffic away from the production API (SBR-13: 56 % of weekday API requests were local-preview/CI) | -55 % origin time | **UNKNOWN**: `release-visual-egress-proof.yml` + `test/release-visual-egress-guard.test.mjs` arrived in #1262; I did not verify that they implement SBR-13. |

### 2E. Later main changes on the Post critical path (not speed work; impact **unmeasured**)

Complete path-based list in Appendix D. Those that add load/work before or around Post content:

| Change | PR / SHA / prod | What changes on a Post load | Evidence of cost |
|---|---|---|---|
| **GA coverage expanded to all reading routes** | `889b36138` (direct on main, 11-08) -> prod `dpl_BUtPuve7umNnmMkqu2WD3vTSageF` 11-08 23:51Z (src `5d4414d75`); #1284 `608c161be` 11-09T00:17Z -> prod `dpl_FuTnSevP5T2oXFsFDFQ7AigB3gbP` 11-09 14:03Z (4 earlier attempts ERROR/CANCELED 00:27-00:35Z) | `initGA` + `trackPageview` scheduled with `requestIdleCallback(timeout 3000)` (350 ms fallback); **only Home waits for `[data-home-primary=ready]`**; every other route, including Post, schedules immediately (`src/App2029.jsx:218-235`). First-party visit + engagement start after a 150 ms settle (`:174`, `:210-214`, dynamic `visits.js`). Before this, analytics ran on "5 routes" (DEF-011, #1262 doc §8). #1283 (the preview branch `gpt/analytics-full-site-restoration-20261108`) is **open/unmerged**; #1284 completed it. | none measured; #1284 states the opening graph is unchanged (shell 941,996 B identical). |
| **GA4 unblocked in CSP + worker** (#1300) | `01d96b627` 11-11T00:08Z -> `dpl_AKEwp7wfzWn6KnoTXgNtVYy8vx3m` 11-11 00:14Z | `connect-src`/worker pass-through only (`public-reading-deploy/vercel.json`, `transport.js`). | none |
| **Meta Pixel + AdSense enabled** (#1301) | `d6662fdcb` 11-11T00:47Z -> `dpl_FCwHYvgG4CAQgGB7kUULqTZrg5xW` 11-11 00:49Z; follow-up #1302 `43c00b728` -> `dpl_D1bugDCxnj2nWQ1miuuidsVspCzx` 01:08Z | Pixel starts in the same idle step as GA (`App2029.jsx:223` `initMarketing`). **`AdSlot` renders at the end of every public Post** (`src/pages/Post2029Page.jsx:1284`, reserved 280 px, `contain: layout paint`); on mount it calls `ensureAdSenseScript()` (`src/lib/adsense.js`), appending `pagead2.googlesyndication.com/.../adsbygoogle.js` (`async`) - **only for Asia/Jerusalem time zone, non-bots, with ids baked at build**. Not deferred to idle/after-LCP; fires when the Post has rendered. | The change doc says "slot answered unfilled"; "Real ads ... can only be confirmed after deploy"; #1345 doc: lab runs "block third-party analytics/ads ... not an AdSense performance assessment". **No before/after speed measurement exists.** |
| **One page view per entry** (#1337) | `9c4cad137` 11-14T15:31Z -> `dpl_89Men3jqSi3pAJ5jGMpp75iZqDzx` 11-14 15:37Z | fewer duplicate visit writes; `RouteEffects2029` mounted outside `ResearchProvider`; `logView("post", slug, id)` argument (`Post2029Page.jsx`). | none (functional) |
| **GA title/campaign/referrer on page_view; automatic events use current page** (#1345, #1356) | `3843af126`; `c2acc064b` 11-15T13:24Z -> `dpl_J2wg6mqptCp8vFkfDbxz31dtHzoH` 13:25Z | manual GA page view now waits for the route's SEO metadata (5 s fallback); #1356 pushes page defaults before each page view (`src/lib/analytics.js`). | none (measurement correctness) |
| **Shared frame feature work** | #1304 `f250da9f7`, #1310 `367bd62ee`, #1314 `42a509edc` (+104/-178), #1326 `aa0f6bc82` | `SystemFrame2029.jsx` is on every route including Post; see P05 for sizes. | none |
| **Historical-URL package** (#1355) | `fec22ca07` 11-15T05:09Z -> `dpl_5zVyxXPYNf7tH4jaovi7C4So2FEf` | 496 redirect destinations lose a trailing slash (one hop fewer for those old addresses); WordPress canonicals slash-free; `/(.+)/ -> /$1` 308 retained. | none (SEO) |
| **Sitemap source reuse** (#1344) [SITEMAP only] | `4b9a8687e` 11-14T23:38Z -> `dpl_C5DBLrWYhELPFDDUaVRJs5W1T6Wj` 11-14 23:39Z | 40 -> 28 requests; 10.053 -> 6.982 s and 7.907 -> 5.550 s (two local pairs, byte-identical 16,790 URLs); canary timeout 15,000 ms unchanged. | PR body |

### 2F. Non-Post improvements (so nobody re-implements them)

| # | Item [scope] | Metric cited | Where / merged / prod-first | Class | Active (file) / guard |
|---|---|---|---|---|---|
| N01 | Home hero atmosphere preloaded at entry [HOME] | none | #1249 `c22fcc789` 11-06T02:00Z; `dpl_Fnz5Ax9ARZhs2eBxR2L3Qseae5qP` 11-06 02:14Z | LIVE | `src/lib/homeAtmospherePreload2029.js` (imported `src/main2029.jsx:6`); `test/home-atmosphere-preload-2029.test.mjs` |
| N02 | Number page: parallel value reads, shared lookup, phone first screen [NUMBER] | docs/reviews/number-page-speed-20261105 | #1238 `3d81716af` 11-05T15:34Z; `dpl_EDc7PpuMp4vkuJuSbwh1gKQ5QSTV` 11-05 15:42Z | LIVE (98 % survive) | `docs/reviews/number-page-speed-20261105/README.md` |
| N03 | Avatars: small rendition of public storage avatars [LIST/COMMUNITY] | **3.77 MB -> 0.2 MB on /community; 0.73 MB -> 0.12 MB on the posts list** | #1227 `33d9b3793` 11-05T07:43Z; `dpl_jMPhd1gbMuoDRHk1PLXxg18PRHPP` 11-05 11:20Z | LIVE (100 %) | `src/lib/avatar.js`, `src/lib/avatar.test.js` |
| N04 | CLS /books and /community first-screen reserve [BOOKS/COMMUNITY] | | #1223 `cd2a91975` | LIVE (66 % of 3 lines) | |
| N05 | World: parallel/early bounded source reads (`perf(world): ...`, Oct 22-28) [WORLD] | | #1191 lineage (`316eaf062`, `43309c220`, `ff23ae685`, `aaa2975c5`; survival 60-100 %) | LIVE | |
| N06 | Raziel/ELS lazy submit split, lexicon asset lazy, compact payload [ELS/RAZIEL] | | `09d3dbb1f` (97 %), `f3b29a696` (77 %), `5c5a7ec6f` (94 %), `a520e8c78` (100 %) | LIVE | `scripts/test-2029-built-graph.mjs:69-73` keeps Raziel submit outside the eager graph |
| N07 | Home on-approach below-fold readers [HOME] | | `f269775e2` (86 %), `d13233577` (99 %), `a098f1ccb` (88 %) | LIVE | |
| N08 | Beit Midrash scroll/CLS, avatar renditions through the service worker [BEIT MIDRASH] | | #1229 `2500ec560` (88 %) | LIVE | |
| N09 | `/api/card` bounded fetches/caching (DEF-015) [SHARE CARDS] | 5 x 300 s timeouts per 72 h | #1262 | LIVE | `api/card.js:64,93,106` |

---------------------------------------------------------------------------------------------------

## 3. Regressions and structural gaps found (facts, with evidence)

1. **RG1 - Post backgrounds, fonts and brand images are re-downloaded on every hard load** because the deployed config never received the immutable header rules that exist in the (non-deployed) root `vercel.json` (R01). Its guard test reads the root file, so CI stays green. Introduced by the cutover (config root moved to `public-reading-deploy`); unfixed since Nov 7 although ranked #1 (XS effort) in the recommendations doc.
2. **RG2 - the early Post read (P08) does not reach `/:slug`**, the canonical address of every imported WordPress post (`publicPostUrls.js:34-45`; Search Console: "Google serves and clicks `/<slug>`", comment in `publicPostUrls.js:10-13`). Those loads still run code -> mount -> effect -> read (`PublicPostAddress2029Page.jsx` passes no reader). F5 (B05) would not help them either (its own table: "Legacy `/:slug` unchanged").
3. **RG3 - source-first rendering regressed out of existence.** The Oct-19 Hybrid Preview painted the public source before enrichment; main shows `FrameState kind="loading"` ("פותח את המקור") until verification + connections + context pack finish (`Post2029Page.jsx:668`). The consolidation doc recorded this as F34 PARTIAL ("needs fresh controlled evidence") and no later PR carried it. #1345/#1346 (Nov 15) attack two of its sub-delays (background discovery; enrichment overlap) but not the gate itself.
4. **RG4 - third-party and analytics weight was added to the Post path on Nov 8-11 with no speed measurement** (section 2E): GA on all reading routes (Nov 8-9), first-party visit + engagement (Nov 9), Meta Pixel (Nov 11) and an AdSense slot that loads `adsbygoogle.js` when a Post has rendered (Israel time zone only). Docs explicitly decline to assess it ("not an AdSense performance assessment"). Post LCP samples taken after these shipped (#1346: Golden 4,572 ms, FZ 3,608 ms) are uncontrolled singles.
5. **RG5 - preloading all four fonts (`2029.html:11-14`)** is the configuration Oct-14 measurement found to delay FCP ~400 ms (R03), and those fonts are `no-store`.
6. **RG6 - edge middleware still blocks every Post document request on one Supabase read** (`middleware-core.js:265-290`, `:381-391`, no timeout) before the function's own `og.js` read; the Nov-7 delivery analysis (section 2 of the recommendations doc) counts only the `og.js` read. F5's fix has been branch-only since 2026-10-18 pending a soft-404 decision.
7. **RG7 - shared frame weight drift** (P05): frame source 132,968 -> 151,006 B and CSS +1.5 KB since Oct 26 with no split (D05); no built-size measurement after Nov 8 in the repo (the budget guard only asserts fixed ceilings).
8. **RG8 - a measured trade-off was recorded and never revisited for deep links** (P07): moving Post code off the Home critical path cost the first Post ~1 s (DIAGNOSIS.md, `11e8fc03` comparison: firstPost 1,105 -> 2,118 ms); the final fix (`d13233577`) is a prefetch that exists only for navigations that start on Home. A deep link to a Post pays the full chain (document -> worker admission -> entry -> Post chunk -> read).
9. **RG9 - no field evidence exists for any Post improvement**: RUM has no LCP element, build SHA or usable-content field; #1345/#1346 both say production p75 improvement "must be measured after release" and that live samples "do not demonstrate" it. Field baseline at 2026-11-07 (736 loads, hard loads only): `/post/:item` LCP p50 3,869 / **p75 5,616 ms**, TTFB p50 775-814 / p75 1,604-1,706 ms, CLS p75 0.012 (p95 0.946). Note: root-slug posts are labelled by their own slug (`readingTelemetryPath`, `src/lib/publicReadingTelemetry2029.js:22-28`, the "Broad site coverage" branch added by `889b36138`), not `/post/:item`, so the `/post/:item` group may under-count them (inference; not checked in DB).
10. **RG10 - signed-in visitors on `/post/:slug`**: the route-owned read waits for `AuthProvider` (`verifyReadingSession` network check + profile fetch) before it starts (`App2029.jsx:105,109`, `AuthContext.jsx:67-72`). Guests resolve immediately.

---------------------------------------------------------------------------------------------------

## 4. Which improvements were seen by which kind of deployment

| Item | Preview/Staging only (no production ever) | Production |
|---|---|---|
| Oct 14-18 waves (D3 `579bda2ed`, site_flags `fd831f894`, realtime `05bc151ea`, locked-route `7ede24ca6`, body-media defer `c229de9d2`, Home on-approach, Number compact opening) | `dpl_PKfpdHkQy81q4X9qLNGapMbCvEjW` (10-14 06:15Z), `dpl_B22J8WkTxa9tAECYfEdGgcwnrNbU` (10-16 05:10Z), `dpl_CjUoDZHPt3PCba52FzQ2ooVN8RDa` (10-18 00:44Z), `dpl_HdaTc9JvqtJDdTeYNj713R3Sx3pq` (02:46Z), `dpl_4HiFJh9SiWFGr9trDAPHTVm8XSkw` (07:04Z), `dpl_8XfhvFjC5JabzbnMCNKA8qtN14i4` (13:47Z, wave4-preview head `e994cb671`) | none (Legacy was production) |
| Oct 19-21 Hybrid stage (source-first `b43a0e78c`) | `dpl_Bcknscq2iAP6wsWr1wTXWtQytysF` (10-19 12:33Z), `dpl_78jjVzMUmDwmSTioAKmUD5sViq8S` (10-20) | none |
| Oct 31 four-cache-headers | `dpl_HkHEX4wARqRcHQ6JnCmDwhmthTae` (10-31 00:41Z), `dpl_DW9DuncM5kmL8V3hv5HxsrLd2onB` (07:12Z) | root `vercel.json` rules present in all 2029 deployments but inert (R01) |
| Oct 31 - Nov 2 2029 performance consolidation + public-reading mobile performance (`4cf307934`, `36c79e281`, `5245f38e6`, `75f9b3717`, `6cd64a795`, `d13233577`) | `dpl_hvfBrT9L7hL1uxLk3BNeKan1iXRQ` (10-31 18:21Z), staging `dpl_Aq4Prk1prJU38iv1rLPEofUvsnDC`, `dpl_541Ljz649tiYjJLyrS3JjubaMhWs`, `dpl_D4C2X8bxWc3engHuf3uehGnG5QhN`, `dpl_Fyd6ngZYrU1NucKYr6K6AQJw7tRj`, `dpl_7H7Qwn2pnvTpmQdqX6cB4Jnquign` | first in production at the 2029 cutover, `dpl_CkoiEsaT1UJ7rAZuzYE7i79noi9A` 11-04 11:28Z |
| #1220-#1229, #1238 (Nov 5) | - | `dpl_jMPhd1gbMuoDRHk1PLXxg18PRHPP` (11-05 11:20Z), `dpl_4aihnmkHhEHuh2oJjXVziRP5ZLwu` (11:58Z), `dpl_EDc7PpuMp4vkuJuSbwh1gKQ5QSTV` (15:42Z) |
| #1262 RC (PF1-PF5, DEF-015 ...) | - | `dpl_3tEP9gQAzP6Kdq752FwsgSFVxrHz` (11-08 00:27Z) |
| #1345 / #1346 / #1355 / #1356 | - | `dpl_5zVyxXPYNf7tH4jaovi7C4So2FEf` (05:10Z), `dpl_CLXTnXF5de1PN1STtajXghtnhyVU` (05:56Z), `dpl_J2wg6mqptCp8vFkfDbxz31dtHzoH` (13:25Z); #1345 never had its own deployment (shipped in #1355's) |

---------------------------------------------------------------------------------------------------

## 5. BRANCH-ONLY inventory (useful finished work not in main)

Ahead/behind are relative to `origin/main` `c2acc064b`; "unique" = commits not reachable from main (the lineage-A branches carry the whole Oct-13-based lineage, so the figure is large; the "own" commits are listed).

| Branch @ head | Own work | Evidence it is finished/tested | Notes for anyone reviving it |
|---|---|---|---|
| `gpt/post-2029-source-first-reconcile-20261019` @ `15821f390` (**deleted from origin**; commits survive in `gpt/2029-hybrid-stage-preview-20261018`@`7033c37c8`, `gpt/post-2029-surface-acceptance-20261019`@`46df88db9`, others) | B01 source-first (5 commits `b43a0e78c` ... `15821f390`) | 40 focused Post tests, build, 5 bundle checks, 8 Hybrid routing checks passed on the reconciled tree; `docs/perf-evidence-20261019/post-2029-source-first/README.md`: -27 % hero, -19.4 % LCP (4x CPU lab), FCP +168 ms, "not release acceptance" | main's `Post2029Page`/projection moved a lot since (Golden/FZ/Bennett pilots, `sourceReader`, `sourceInvitation`, `preloadPostBackground2029`); would need re-integration, not a cherry-pick |
| `claude/perf-post-media-p0-20261018-cwujt8` @ `582a4ce8b` | B03 | `test/post-raw-media-rendition-2029.test.mjs` (156 lines) | |
| `gpt/perf-post-body-media-defer-20261018` @ `d3c9dcf5b` (8 commits) | B02 | hardening rounds, `test/post-body-media-defer-2029.test.mjs` | F23 says reserved-dimension evidence is absent in the current tree |
| `claude/perf-post-middleware-f5-vmwq1d` @ `9ed573364` | B05 | 18 contract tests, `test/post-middleware-f5-contract.test.mjs`, loopback runs | needs the soft-404 decision |
| `perf/shared-load-main-20261013` @ `0cdf3e202` (2 commits, **only +2 vs its own base**) | B06 `readPostIdentityBySlug`; `@hebcal` on demand (`b2b2b4d8c`; main has `@hebcal` imports in `src/lib/timeFlow.js` and research libs - not checked whether they reach the entry) | pinned by test | admission predicate differs in main |
| `claude/pr1100-mobile-reading-image-20261014` @ `5c990b7d6` | B04 | commit only | |
| `codex/perf-locked-route-start-20261018` @ `ad145b838` | B10 | | F14 OPEN |
| `claude/preserve-speed-ux-audit-20261113` @ `99a628485` | B12 tooling | explicitly untested | |
| `gpt/2029-public-reading-release-acceptance-20261101` @ `d961b5bdd` | B13 evidence | final receipts | |
| `claude/unified-post-shell-stacked-20261020` @ `b2f71d6f8`, `claude/shell-mobile-island-5107-20261021` @ `26d6ec083` | design (unified Post shell for the Elections 5107 preview) + `0ac833c10`, `9b0fb0002` | | design-led, not a speed series despite the task's list |
| `gpt/perf-unified-wave4-preview-20261018` @ `e994cb671` and ~60 `gpt/perf-*` / `claude/perf-*` siblings | B14 | each wave has handoff docs under `docs/perf-evidence-20261018/` | Appendix C |

PRs relevant and **open**: #1321 (M0 package, head `claude/sod1820-system-audit-roadmap-3793us`@`4a406fed2`, "not for merge"; measurement part already extracted as #1337) and #1283 (`gpt/analytics-full-site-restoration-20261108`@`8c0c9971`, superseded by #1284).

---------------------------------------------------------------------------------------------------

## 6. Could not verify / unknown

1. Live response headers and timings (no HTTP allowed). R01 relies on the config files in main (unchanged since #1191 except favicon) plus the Nov-7 live check.
2. Whether `READY` production deployments of Nov 4 11:28-15:35Z were aliased to the public domains at the time (only CLAUDE.md names `dpl_7Kcv...` and `dpl_xw7f...` as live).
3. Real-user effect of anything after Nov 8 (no RUM re-query; the collector cannot attribute LCP).
4. Why Home's CDN window returned MISS (middleware `Set-Cookie` is the commit's unverified hypothesis).
5. DB-side recommendations (indexes, matviews, `fn_relation_candidate`): no DB access used.
6. Whether `@hebcal` still reaches the entry bundle (the Oct-13 on-demand commit has 0 % survival, but main has no build output here; the first-load guard does not name `@hebcal`).
7. Whether `release-visual-egress-proof.yml` implements SBR-13 (D12).
8. Line-level verification of F18 (public-policy in-flight coalescing) and F13 internals; only presence of `StoryViewerOnDemand2029.jsx` and the consolidation doc's own verdicts were used.
9. The size/behaviour of built chunks today (no build was run).
10. Branch tips are as fetched on 2026-11-15; `gpt/post-2029-source-first-reconcile-20261019` is gone from origin (commits found by SHA).

---------------------------------------------------------------------------------------------------

## 7. The Post load chain in main (c2acc064b), stage by stage, with owners

| Stage | Mechanism now | Item |
|---|---|---|
| Edge middleware | `public_post_slug_exists` awaited (cold per instance) for `/:slug` and `/post/:slug`; plus country/SG policy fetches (cached 5 min) | B05 (unmerged fix) |
| Document | `/((?!api...).*)` -> `public-reading-deploy/api/public-document.js` (`no-store`), `api/og.js` reads Supabase (`select ... content ...`) | D01/D02 |
| HTML | opening shell, 4 font preloads, Supabase preconnect, non-blocking Plex CSS, entry `modulepreload` + inline worker bootstrap (10 s timeout) | P01-P04, R03 |
| Worker admission | register -> activate -> policy handshake, *then* `import(entry)` | (design) |
| Entry/route | lazy route chunk; Home prefetches Post chunk only for Home-origin navigations | P07 |
| Data | `/post/:slug`: route-owned read starts with chunk; `/:slug`: starts after mount | P08 |
| Reader | 30-column row; projection awaits connections/pack before first content | P10, B01 |
| Paint | background preloaded when row is admitted; cover eager/high; footer hidden while loading; AdSlot at end | P12-P14, 2E |
| After paint (idle <= 3 s) | GA, Pixel; 150 ms later first-party visit/engagement; Israel visitors: AdSense script on Post render | 2E |

---------------------------------------------------------------------------------------------------

## Appendix A - production-target deployments, 2026-11-04 11:00Z -> 2026-11-15 (READY only)

| created (UTC) | deployment (target=production, READY) | source SHA | commit subject |
|---|---|---|---|
| 2026-11-04 11:28 | `dpl_CkoiEsaT1UJ7rAZuzYE7i79noi9A` | `1bc8260ad` | fix(2029): restore admin control frame after sign-in |
| 2026-11-04 12:17 | `dpl_9mWvyeuELvNzctiVCd5ouEAG3BNU` | `bde0a822a` | fix(community): restore working weekly chat and open original chat below |
| 2026-11-04 12:22 | `dpl_48Ha5ZApCdwpK8YDHkboumGVApyS` | `f4390dd35` | fix(community): admit original OpenWeb service in published content policy |
| 2026-11-04 12:37 | `dpl_8yput4peUzwKgnw62ntGaQFzSGBP` | `ae8deb7ae` | feat(community): allow repeatable public likes without registration |
| 2026-11-04 12:56 | `dpl_C5zm8bEEy7HjgVGvy7zdokVp7dg5` | `f7bfbcd5c` | Clean up guest Community composer copy using existing compact layout |
| 2026-11-04 12:59 | `dpl_88SLqagzSeAeCuxbwWN7XXekU4gj` | `5f92bfd2e` | Offer anonymous Community visitors a concise registration link |
| 2026-11-04 13:11 | `dpl_8whmJeUUTQFi5NaR7ZnUU3Wzow1b` | `cb882fad8` | Present Community replies with translucent shared plane and fine thread connecto |
| 2026-11-04 13:33 | `dpl_85oZ5Mz4br6byBvtBhgas3u5iRct` | `3d97c7c28` | Add safe visual Community formatting, emoji and selected-message quotation |
| 2026-11-04 14:03 | `dpl_9ym1yc7DUvRehxNymJrAcUSDk7Cb` | `209a210fa` | Enable saved Community messages and explicit thread notifications while retainin |
| 2026-11-04 14:34 | `dpl_DNiWmnVWnLfqkWQYNk94vXWD2qaF` | `98d0508fb` | feat(community): open personal replies and resume device reading with public rep |
| 2026-11-04 14:51 | `dpl_69ZbhzQb8CXt6RokiqCrBnddayfS` | `6c0493f17` | feat(community): persist private device drafts and show clear unread reply bell |
| 2026-11-04 14:55 | `dpl_E9unk69i6D7JaHwjCRPcnwzHKmHQ` | `273ceb241` | fix(community): show file reattachment reminder for media-only drafts |
| 2026-11-04 15:35 | `dpl_7KcvdVHsp26uyiLrNHppBtCKeGbX` | `d06cf1ab3` | feat(community): restore original public avatars and unify colors and reply hier |
| 2026-11-04 20:21 | `dpl_xw7fECMyWRrZvxxKdy71yobAhj8h` | `969b51423` | docs: synchronize exact cumulative 2029 release state and remaining gate request |
| 2026-11-05 03:31 | `dpl_Ds3PSspTDjTQGEdXK8RPSt4oFZ7s` | `a27d8d06f` | Follow-ups 5.11: footer, entrance intro, home title, Golden 1237 method, button- |
| 2026-11-05 04:11 | `dpl_ENkQEP9vP4jHEz2NXPZfdY1zY7xH` | `52053ce8b` | Community: Torah Temima single public identity + "היסטוריה אוחדה" seal (#1201 on |
| 2026-11-05 04:22 | `dpl_8wS3rP2YgbqSaapmYxa3SAk8jdFk` | `18c98fa6f` | Bottom bar: restore the full "עוד" panel (actions, tools, search, share) + admin |
| 2026-11-05 11:20 | `dpl_jMPhd1gbMuoDRHk1PLXxg18PRHPP` | `b0a752c66` | Run the Realtime entry split speed contract in CI (it ran nowhere) and fix what  |
| 2026-11-05 11:58 | `dpl_4aihnmkHhEHuh2oJjXVziRP5ZLwu` | `2500ec560` | Post-publish fixes from the live check of b0a752c66: Beit Midrash scroll jump/CL |
| 2026-11-05 13:21 | `dpl_BoKyLg3mFp6B6WtdkaCLVeS8MwkX` | `ddf125d97` | Community: guest publishing, admin review of guest messages, typing indicator, o |
| 2026-11-05 13:32 | `dpl_5M5fGStkPYhdTRrQp345aEr4GcXZ` | `68a089a65` | Home: show 'updated' date on series cards when a post was edited a day or more a |
| 2026-11-05 13:38 | `dpl_5H1C4V2ujsPXymaGJk2c5vvMhKfW` | `91024c7f6` | Fix guest publishing in production: let the public-reading worker forward the ex |
| 2026-11-05 13:39 | `dpl_Vp8REeLwiXEq7UDSjPE47cG5tBXx` | `91024c7f6` | Fix guest publishing in production: let the public-reading worker forward the ex |
| 2026-11-05 14:07 | `dpl_8wUEdPPfyFJfstANG4SrUJonk579` | `08cb3c17f` | Community: top login/signup buttons, guest composer layout, placeholder fix, typ |
| 2026-11-05 14:29 | `dpl_3Ygpm1pWWmE2omFnDKGXdNGYvVwk` | `27187564b` | SEO: keep the popular chat and calculator indexable; sitemap, canonical, heading |
| 2026-11-05 14:51 | `dpl_8WXzbuz4dmpKqKeqQYjymu7uPZBb` | `377c7dba8` | Redirects, historical page, temporarily-closed areas as 503, link preview guard  |
| 2026-11-05 15:42 | `dpl_EDc7PpuMp4vkuJuSbwh1gKQ5QSTV` | `410eaad17` | Bible code open to the public (Classic), cipher library and member saves; chat a |
| 2026-11-05 18:52 | `dpl_7XpLXkusj44GtJMQJhrXFANJLwv1` | `8ae69125f` | Public release: what the release opens to everyone is open to the administrator  |
| 2026-11-05 19:29 | `dpl_HcnMTEH7SmMmGRF5bCKynDJ6ekJC` | `a5ef82cce` | Legacy separation: retire the Legacy runtime from the active 2029 tree (#1239) |
| 2026-11-05 22:29 | `dpl_D51GNZUQZeoWdt4sBZgmt3MXdg5j` | `97bf00be2` | Bots: SG limiter reads the Vercel OIDC token from the request header (clean base |
| 2026-11-06 01:03 | `dpl_E8QfTF9nbp1uQ7Ayj1ZDegnAPqfs` | `9ea0c2c4b` | World sources: show writer, date and excerpt on "הודעות מקור" cards (#1245) |
| 2026-11-06 02:14 | `dpl_Fnz5Ax9ARZhs2eBxR2L3Qseae5qP` | `c22fcc789` | Home speed, site icons and an Android install suggestion (#1249) |
| 2026-11-06 02:40 | `dpl_AGBw6N6qheCeo7CBbMqy1tKcYmV4` | `a3e6b737f` | Remove the Home CDN cache setting; bring back the Legacy-style install suggestio |
| 2026-11-06 02:41 | `dpl_Do29y8ysyCsghSa1z1LBkpbNaJPs` | `d7c0842d1` | Number/World: one calculator action instead of two, with the calculator icon (sh |
| 2026-11-06 04:46 | `dpl_HcoHSTtpq6uv6CYkAkrTda8R2H13` | `be9b17332` | ELS classic: member saves, cipher management, one-row tool dock, Raziel bar reti |
| 2026-11-06 05:54 | `dpl_8UabBobRVMxae7drpZkr2gW9mpAD` | `42ff15120` | ELS: opens in Research for everyone, Operation Visibility Law meter, centered ma |
| 2026-11-06 06:52 | `dpl_7Hn7Lv4mhAVth3zBY3JHKsp4sahh` | `1f0863938` | Worker: /tzofen.html → /code for returning visitors; community_search admitted;  |
| 2026-11-06 08:14 | `dpl_5nnzNsFAb9qAxdQxsqDVjngFjcxP` | `9ca758e44` | ELS מטריצה מפוצלת (שלב 1) + תיקוני ביקורת (sitemap, וידאו, CI) (#1255) |
| 2026-11-06 08:49 | `dpl_BgMKeVB5ENfhTVMj42TSE1jGJH9k` | `f2d384193` | ELS מצב מחקר: פקדי הגדלה/הקטנה ורווח שורות בצד המטריצה (#1256) |
| 2026-11-06 10:07 | `dpl_LXNbSoPBKL1UtvjCHamzf94n2P37` | `1ec5d6c16` | ELS מצב מחקר: קיפול המטריצה — שורות בין אותיות הציר, הכול זז (#1257) |
| 2026-11-06 11:08 | `dpl_5BhNvF9H3KhKw2WgJd7pgbkByXuZ` | `394a2ba8f` | ELS: הסרת הקיפול ותיקון הגדלה/הקטנה, אזור אישי במחשב, כניסה עם קוד/קישור (#1258) |
| 2026-11-06 14:19 | `dpl_12JhDbtTkEiENigf3Wzy4sproY7E` | `cfda877a1` | ELS: כפתורי התחתית פותחים את הפאנל במסך (#1260) |
| 2026-11-08 00:27 | `dpl_3tEP9gQAzP6Kdq752FwsgSFVxrHz` | `cfa7cc1ce` | Audit remediation RC: stale-chunk recovery, Legacy cleanup, performance pass, G4 |
| 2026-11-08 01:26 | `dpl_8moRj58gumZHDyKBJ8gebQWtf3nK` | `58e7d0cc2` | Merge pull request #1264: Community guest reply-only, no guest name, tree hints, |
| 2026-11-08 01:58 | `dpl_Hrjh6buc23rVS9hmfUtxrV4szA9i` | `5a6899600` | Merge pull request #1267: Community narrow guest-moderator role |
| 2026-11-08 02:28 | `dpl_FAUosGr2Cy4aZjWph2qwLRNcN5ki` | `3189f87b5` | Merge pull request #1268: Community online now + old chat closed by default |
| 2026-11-08 02:35 | `dpl_6ge9Cyh5SYfQk6iJwYbB44mESZ2c` | `2a208c097` | ELS מצב מחקר: זום כמו בקלאסי, רוחב שורה (חצי/פי 2), מסך מלא מבוקר, מד פעולה ממור |
| 2026-11-08 02:58 | `dpl_9AhmVTAgAES1xMegxMJMT92LXL3F` | `8c920c98c` | Merge pull request #1269: Community green-dot presence, guest-review jump panel, |
| 2026-11-08 03:24 | `dpl_3QiYc18aSk4ZRvaH82CLYxDgBd5f` | `ef005991e` | Merge pull request #1270: Community Emily unified likes, seal placement |
| 2026-11-08 04:23 | `dpl_48tSStYRgVRKp533GL7KpAmuYaND` | `05181200e` | Enable real member messages through contributor-interactions in production (#127 |
| 2026-11-08 04:38 | `dpl_Cf3GhwPoLeeQLQEu7daDidps1ViH` | `b33471310` | First paint: royal opening shell, bar polish, arrival cue replaces the entrance  |
| 2026-11-08 12:29 | `dpl_FWiix9cTu4akV58uWYAah2Utm3Y3` | `c8351dccb` | Fix: public-reading worker blocked tree hints, online-now and guest review for n |
| 2026-11-08 12:47 | `dpl_Fq8phuGdutqPGSnWcQ8xrDQuEGVG` | `545b852ba` | Community: link Shinshin's legacy and current accounts (ZURIEL, 8.11.2026) (#127 |
| 2026-11-08 17:49 | `dpl_ASPuwaFmHS65zDiJdvVuFhEGSxb3` | `29adff9b4` | Stage 1: Home, series, featured Post + video, and Now (#1278) |
| 2026-11-08 19:21 | `dpl_2TWXtRRTXFk4v8ULwwygwm7suQUu` | `f84b3f7cd` | Now: a closed source group shows when its last update arrived (#1279) |
| 2026-11-08 23:51 | `dpl_BUtPuve7umNnmMkqu2WD3vTSageF` | `5d4414d75` | Community: unify Esther26 legacy history with Esther Gem account (#1282) |
| 2026-11-09 14:03 | `dpl_FuTnSevP5T2oXFsFDFQ7AigB3gbP` | `24b1ef6d0` | Auth: email link returns via /auth/callback; clearer code errors and 429 handlin |
| 2026-11-09 14:22 | `dpl_Eg7C3nWWdPDSijABaQdWm4xxQbko` | `555414a00` | Auth: remove emailRedirectTo (blocked by the public-reading worker; broke code r |
| 2026-11-09 15:28 | `dpl_4JfDopnpdjwm6ZMWXWuiZ1sBu2c3` | `434614c12` | ELS: save panel fills the window; cloud save, published by default with a "do no |
| 2026-11-10 13:25 | `dpl_7Q7rBC4qKtP5AHwAunCePYeNo5FK` | `1f0867ffb` | P0 Auth: permanent sign-in contract (worker policy, canonical verifier, diagnost |
| 2026-11-10 14:50 | `dpl_PWibbW6G7Ay2BM8EoJcKSLJGXfw9` | `0d718702c` | Now + Home: one-tap video play and the Or HaGeula box (#1290) |
| 2026-11-10 16:49 | `dpl_CseQBjfcMUnVzCxiFCfcZ1S9112f` | `54fac7876` | Home + Now: the 1234/1011/1437 update, pinned item with a blinking dot, tidy row |
| 2026-11-10 17:37 | `dpl_BcUS65VNTCFk9bA3qHm59C8C9Dt3` | `5490785ea` | Research journals: ownership lease, lossless passive-queue bound, proof against  |
| 2026-11-10 18:13 | `dpl_2Kfmq8qUHjybDYY3Dmvi4ri3CvVD` | `6badaa071` | Home card back to the small side-column video; 1437 only in the Post; Now "numbe |
| 2026-11-10 22:01 | `dpl_3NeuidQmzJF35U1Uhu45iXE8kRwo` | `6deeb1008` | Now: the update-of-the-day band holds the whole update; air above the bottom bar |
| 2026-11-10 23:58 | `dpl_HnswhFsyHPK2aSKxLN9nak3r2BKL` | `932aba4bd` | Public storage media: one shared rule for the read worker and the public readers |
| 2026-11-11 00:14 | `dpl_AKEwp7wfzWn6KnoTXgNtVYy8vx3m` | `01d96b627` | Google Analytics 4 is not blocked on the 2029 public site (CSP + service worker) |
| 2026-11-11 00:49 | `dpl_FCwHYvgG4CAQgGB7kUULqTZrg5xW` | `d6662fdcb` | Meta Pixel and Google AdSense enabled on the 2029 public site (CSP, worker, read |
| 2026-11-11 01:08 | `dpl_D1bugDCxnj2nWQ1miuuidsVspCzx` | `43c00b728` | Pixel/AdSense follow-up from the first live run: CAPI relay without custom heade |
| 2026-11-11 03:53 | `dpl_3FKYGdd3vZzg4WH3Y5d2CDp9bMmq` | `f250da9f7` | "עוד" in the royal version (Palace): royal tiles, explicit app install, accessib |
| 2026-11-11 07:03 | `dpl_DTgmTnQYrC5YoRrFQkevc6eufbC7` | `11aeb6bbc` | Media: WhatsApp image/video/audio on the 2029 path (stable id, no overwrite) + o |
| 2026-11-11 11:16 | `dpl_2Lg5AgQzxxE2GVU7pTr5gsXoFeif` | `367bd62ee` | "פעולות" and "כלים": closed · בבנייה through site_flags (#1310) |
| 2026-11-11 13:10 | `dpl_BQggtJeuxLSxSmfxtrrUf2LepiRH` | `d5fa184f8` | "עכשיו · המרכז": Royal 2029 shared layer, stable Post title with update layer, O |
| 2026-11-11 22:37 | `dpl_2LSJa2osE3AqkmMyznKFLNmhoDcU` | `949c24ad5` | Gilui Yomi in the Zvi / Torat HaRemez model: no all-members live publication; Ka |
| 2026-11-12 10:30 | `dpl_9sJPZEwhbu7a13cakoeTbjXasm3A` | `146f2f0e7` | Now: a picture, a video and a video card are centred in the opened row (#1318) |
| 2026-11-12 13:53 | `dpl_8wFDbWJmUPWCF7Gm5fBuFFyzMRkK` | `ed30dc05b` | Remove a stray node_modules symlink that reached main in #1322 (#1323) |
| 2026-11-12 16:38 | `dpl_FEzrHi2GLSpdHPN1cJDu6rhXtswZ` | `aa0f6bc82` | Hide the header verse line (living ribbon) on every page (#1326) |
| 2026-11-13 08:16 | `dpl_9paqBrZzi7D1GXow7LV8eWCjkpEF` | `9be0c29fc` | Merge pull request #1329 from zuriel337/gpt/gilui-yomi-thread-runtime-20261113 |
| 2026-11-14 15:37 | `dpl_89Men3jqSi3pAJ5jGMpp75iZqDzx` | `9c4cad137` | Count each real page view once and restore product action measurement (#1337) |
| 2026-11-14 22:43 | `dpl_8AekneeH4eKNwFY1agzMHRaypsAL` | `4c9630db4` | Show public research candidates with accurate verification labels (#1335) |
| 2026-11-14 23:39 | `dpl_C5DBLrWYhELPFDDUaVRJs5W1T6Wj` | `4b9a8687e` | Reuse public post sources when generating the sitemap (#1344) |
| 2026-11-15 05:10 | `dpl_5zVyxXPYNf7tH4jaovi7C4So2FEf` | `fec22ca07` | Preserve historical URL canonicals and enforce client/server parity (#1355) |
| 2026-11-15 05:56 | `dpl_CLXTnXF5de1PN1STtajXghtnhyVU` | `c752b0014` | Parallelize admitted Post reads and add authenticated GA sync preview (#1346) |
| 2026-11-15 13:25 | `dpl_J2wg6mqptCp8vFkfDbxz31dtHzoH` | `c2acc064b` | fix(analytics): keep automatic events on current public page (#1356) |

(22 further production-target deployments in the same window ended ERROR or CANCELED and are omitted; the ERROR/CANCELED bursts are on 2026-11-09 00:27-00:35 (#1284, 5 attempts) and 2026-11-10 12:35-12:42 (#1289, 6 attempts), 11-12 13:40 (#1322).)

## Appendix B - key preview/staging deployments before the cutover (perf-relevant, READY)

| created (UTC) | deployment | target | source SHA | what it first contained |
|---|---|---|---|---|
| 2026-10-14 06:15 | `dpl_PKfpdHkQy81q4X9qLNGapMbCvEjW` | preview | `a6a907930` | lineage-A Oct 13-14 perf commits (`1fcb02f2d`, `e2a209b7e`, `6cc20ed68`, `44dd98240`) |
| 2026-10-16 05:10 | `dpl_B22J8WkTxa9tAECYfEdGgcwnrNbU` | preview | `5f48fa965` | `a5f272d38` pause off-screen CSS animations; Home stability |
| 2026-10-18 00:31 | `dpl_7HaPsuqukbFUHoXKt6XqmoqHpBBr` | preview | `ad145b838` | locked-route start (`codex/perf-locked-route-start-20261018`) |
| 2026-10-18 00:44 | `dpl_CjUoDZHPt3PCba52FzQ2ooVN8RDa` | preview | `3498bda6f` | D3 report-form/story-viewer lazy (`579bda2ed`) |
| 2026-10-18 02:46 | `dpl_HdaTc9JvqtJDdTeYNj713R3Sx3pq` | preview | `9dbdc89af` | site_flags coalescing, RUM v2 foundation (wave 3) |
| 2026-10-18 07:04 | `dpl_4HiFJh9SiWFGr9trDAPHTVm8XSkw` | preview | `5ced63490` | realtime split, post body media defer, Number compact opening (wave 4) |
| 2026-10-18 13:47 | `dpl_8XfhvFjC5JabzbnMCNKA8qtN14i4` | preview | `e994cb671` | wave4-preview head (#1116-#1122 Home on-approach loads) |
| 2026-10-19 12:33 | `dpl_Bcknscq2iAP6wsWr1wTXWtQytysF` | preview | `5de4d5772` | **source-first Post** (#1127) |
| 2026-10-20 11:21 | `dpl_8GyUpe5YEqrS1hFPSaLLgVP1WH3V` | preview | `de960a2cf` | `0ac833c10` (631 corpus read), shell5107 review |
| 2026-10-31 00:41 | `dpl_HkHEX4wARqRcHQ6JnCmDwhmthTae` | preview | `9684032e2` | cache-only-versioned-backgrounds (root vercel.json) |
| 2026-10-31 07:12 | `dpl_DW9DuncM5kmL8V3hv5HxsrLd2onB` | preview | `4f8ef45fc` | "four approved portrait backgrounds" cache |
| 2026-10-31 18:21 | `dpl_hvfBrT9L7hL1uxLk3BNeKan1iXRQ` | preview | `4cf307934` | 2029 performance consolidation (F13/F18/F20) |
| 2026-11-01 21:01-22:46 | `dpl_D4C2X8bxWc3...`, `dpl_Aq4Prk1prJU38...`, `dpl_541Ljz649tiY...`, `dpl_BcYwfmrMRW8o...` | staging | `75f9b3717`, `36c79e281`, `5245f38e6`, `b839a817b` | Post code off Home entry -> overlap source with code -> witness lazy -> revert to original admission |
| 2026-11-02 08:56 | `dpl_Fyd6ngZYrU1NucKYr6K6AQJw7tRj` | staging | `6cd64a795` | non-blocking Plex CSS |
| 2026-11-02 18:56 | `dpl_7H7Qwn2pnvTpmQdqX6cB4Jnquign` | preview | `d13233577` | Home -> Post chunk prefetch after Home module |

Full lists: `perf/deployments-early.tsv` (production Oct 14 - Nov 6), `perf/deployments.tsv` (production Nov 6-15), `perf/deployments-preview.tsv` (preview/staging).

## Appendix C - the 89 perf-named branches (ahead/behind vs main `c2acc064b`; cherry = patch-ids not already in main)

| branch | head | head date | in #1191 head | in main | branch-only / main-only commits | patch-ids not in main (git cherry) |
|---|---|---|---|---|---|---|
| `gpt/royal-context-islands-raziel-v1` | `7e567a3f9` | 2026-09-05 | no | no | +2 / -2629 | 2 |
| `claude/bootstrap-coordination-law-b1p8dn` | `f1a346b0a` | 2026-09-09 | no | no | +3 / -2327 | 3 |
| `gpt/g3-system-frame-command-island-polish-v1` | `63c76b164` | 2026-09-18 | no | no | +1 / -1820 | 0 |
| `gpt/g3-2029-web-vitals-acceptance-rum-v1` | `83ca69dbc` | 2026-09-19 | no | no | +13 / -1736 | 13 |
| `gpt/g3-2029-web-vitals-acceptance-rum-v2` | `f9a6c5062` | 2026-09-19 | no | no | +16 / -1735 | 15 |
| `gpt/adaptive-command-island-2029-visual-trial-v1` | `fb1c2e9bf` | 2026-09-24 | no | no | +5 / -1670 | 5 |
| `gpt/g3-no-black-box-cache-hit-v1` | `e601b0967` | 2026-09-25 | no | no | +7 / -1639 | 7 |
| `gpt/current-main-cls-baseline-probe-v1` | `e872d4845` | 2026-09-27 | no | no | +1 / -1416 | 1 |
| `gpt/number-2029-1237-cls-recovery-v1` | `990e6e954` | 2026-09-27 | no | no | +2 / -1416 | 2 |
| `gpt/number-2029-cls-regular-rail-v1` | `71a6c8c35` | 2026-09-27 | no | no | +4 / -1411 | 4 |
| `gpt/cached-egress-root-hardening-v1` | `ece6051e9` | 2026-09-28 | no | no | +18 / -1405 | 18 |
| `gpt/g3-data-query-performance-gate-v1` | `8a845eb29` | 2026-09-29 | no | no | +21 / -1381 | 19 |
| `gpt/number-2029-cls-current-main-v3` | `0fd577eb6` | 2026-09-29 | no | no | +2 / -1381 | 2 |
| `claude/fz1073-718-video-preview-fast-v1` | `0115f534c` | 2026-10-02 | no | no | +10 / -1187 | 9 |
| `gpt/research-path-publication-main-5d3-v1` | `63548968a` | 2026-10-04 | no | no | +4 / -1015 | 4 |
| `claude/raziel-whatsapp-response-speed-v1` | `6d01e7f08` | 2026-10-06 | yes | yes | +0 / -806 | 0 |
| `integ/stage0-perf-verify` | `c9347039c` | 2026-10-13 | no | no | +12 / -503 | 11 |
| `perf/shared-load-20261013` | `4c822e229` | 2026-10-13 | no | no | +4 / -503 | 4 |
| `perf/shared-load-main-20261013` | `0cdf3e202` | 2026-10-13 | no | no | +2 / -311 | 2 |
| `perf/shell-lazy-handoff-20261013` | `4b336773b` | 2026-10-13 | no | no | +5 / -311 | 5 |
| `ccr-7478c3d3-aujbfc` | `30e3381aa` | 2026-10-14 | no | no | +142 / -311 | 138 |
| `claude/posts-system-world-perf-isolation-69xzly` | `abcfcba33` | 2026-10-14 | no | no | +119 / -311 | 115 |
| `gpt/perf-causal-tests-20261014` | `c50c9099d` | 2026-10-14 | no | no | +140 / -311 | 136 |
| `gpt/perf-execution-20261014` | `01ac77064` | 2026-10-14 | no | no | +157 / -311 | 153 |
| `gpt/perf-hosted-baseline-20261014` | `6deea84c4` | 2026-10-14 | no | no | +135 / -311 | 131 |
| `claude/perf-home-stability-20261015` | `6710eb362` | 2026-10-15 | no | no | +197 / -311 | 190 |
| `claude/perf-home-stability-v2-20261015` | `1270d1faf` | 2026-10-15 | no | no | +197 / -311 | 190 |
| `claude/perf-testing-2029-5ayyow` | `336b21ed9` | 2026-10-15 | no | no | +131 / -311 | 127 |
| `gpt/perf-candidate-packaging-20261015` | `5c147e4a2` | 2026-10-15 | no | no | +193 / -311 | 186 |
| `gpt/perf-ci-isolation-20261015` | `778400b60` | 2026-10-15 | no | no | +214 / -311 | 207 |
| `gpt/perf-cold-measurement-20261015` | `8965f1b6c` | 2026-10-15 | no | no | +208 / -311 | 201 |
| `gpt/perf-critical-boot-20261015` | `d540ad3ee` | 2026-10-15 | no | no | +196 / -311 | 189 |
| `gpt/perf-topic-import-20261015` | `18875a548` | 2026-10-15 | no | no | +196 / -311 | 189 |
| `gpt/perf-wave2-integration-20261015` | `14e239b47` | 2026-10-15 | no | no | +204 / -311 | 197 |
| `gpt/perf-world-reentry-20261015` | `a1f7cd0b0` | 2026-10-15 | no | no | +195 / -311 | 188 |
| `claude/perf-next-wave-review-20261016` | `cd8d6bda8` | 2026-10-16 | no | no | +239 / -311 | 232 |
| `gpt/perf-shared-readiness-20261016` | `759c22392` | 2026-10-16 | no | no | +240 / -311 | 233 |
| `claude/perf-deep-bottleneck-review-20261018` | `e5619762e` | 2026-10-17 | no | no | +1 / -306 | 1 |
| `claude/perf-entry-cost-20261017` | `e189df34a` | 2026-10-17 | no | no | +266 / -311 | 256 |
| `claude/perf-next-wave-20261016` | `d325780c0` | 2026-10-17 | no | no | +247 / -311 | 240 |
| `claude/perf-rail-fix-20261016` | `671d68b20` | 2026-10-17 | no | no | +240 / -311 | 233 |
| `gpt/perf-audit-handoff-20261015` | `ea2932d9b` | 2026-10-17 | no | no | +217 / -311 | 210 |
| `gpt/perf-unified-candidate-20261017` | `8c8e9df9b` | 2026-10-17 | no | no | +256 / -311 | 246 |
| `claude/perf-d3-integration-20261018` | `b41bf2b7e` | 2026-10-18 | no | no | +259 / -311 | 249 |
| `claude/perf-number-quick-inspect-6jwn7y` | `958cfcdcc` | 2026-10-18 | no | no | +269 / -311 | 259 |
| `claude/perf-post-media-p0-20261018-cwujt8` | `582a4ce8b` | 2026-10-18 | no | no | +266 / -311 | 256 |
| `claude/perf-post-middleware-f5-vmwq1d` | `9ed573364` | 2026-10-18 | no | no | +258 / -311 | 248 |
| `codex/perf-locked-route-start-20261018` | `ad145b838` | 2026-10-18 | no | no | +258 / -311 | 248 |
| `gpt/perf-analytics-emitter-boundary-20261018` | `4282607b2` | 2026-10-18 | no | no | +274 / -311 | 264 |
| `gpt/perf-ci-corpus-completion-20261018` | `a5e141810` | 2026-10-18 | no | no | +266 / -311 | 256 |
| `gpt/perf-els-verse-payload-defer-20261018` | `4e8dcebbc` | 2026-10-18 | no | no | +275 / -311 | 265 |
| `gpt/perf-els-verse-payload-hardening-20261018` | `ee139e63d` | 2026-10-18 | no | no | +281 / -311 | 271 |
| `gpt/perf-home-scroll-stability-20261018` | `c00e283ca` | 2026-10-18 | no | no | +267 / -311 | 257 |
| `gpt/perf-home-video-defer-20261018` | `94bfa6a11` | 2026-10-18 | no | no | +266 / -311 | 256 |
| `gpt/perf-hosted-runner-diagnostics-20261018` | `44e83d323` | 2026-10-18 | no | no | +281 / -311 | 271 |
| `gpt/perf-number-anchor-seam-20261018` | `514200512` | 2026-10-18 | no | no | +275 / -311 | 265 |
| `gpt/perf-number-method-lazy-20261018` | `4c9b9bca0` | 2026-10-18 | no | no | +266 / -311 | 256 |
| `gpt/perf-number-opening-contract-hardening-20261018` | `59477b26f` | 2026-10-18 | no | no | +276 / -311 | 266 |
| `gpt/perf-number-opening-contract-hardening-v2-20261018` | `820491802` | 2026-10-18 | no | no | +277 / -311 | 267 |
| `gpt/perf-number-opening-projection-20261018` | `a9f566720` | 2026-10-18 | no | no | +274 / -311 | 264 |
| `gpt/perf-number-opening-ui-20261018` | `793e289a4` | 2026-10-18 | no | no | +280 / -311 | 270 |
| `gpt/perf-post-body-media-defer-20261018` | `d3c9dcf5b` | 2026-10-18 | no | no | +281 / -311 | 271 |
| `gpt/perf-realtime-entry-split-20261018` | `12e856994` | 2026-10-18 | no | no | +274 / -311 | 264 |
| `gpt/perf-realtime-entry-split-hardening-20261018` | `41b50bc91` | 2026-10-18 | no | no | +276 / -311 | 266 |
| `gpt/perf-rum-v2-20261018` | `0c71482fe` | 2026-10-18 | no | no | +266 / -311 | 256 |
| `gpt/perf-site-flags-fanout-20261018` | `0830eab08` | 2026-10-18 | no | no | +266 / -311 | 256 |
| `gpt/perf-unified-candidate-20261018` | `8f78c0c7c` | 2026-10-18 | no | no | +265 / -311 | 255 |
| `gpt/perf-unified-wave2-20261018` | `c066590fb` | 2026-10-18 | no | no | +270 / -311 | 260 |
| `gpt/perf-unified-wave3-20261018` | `6124db8d7` | 2026-10-18 | no | no | +273 / -311 | 263 |
| `gpt/perf-unified-wave3-preview-20261018` | `37a718f62` | 2026-10-18 | no | no | +277 / -311 | 267 |
| `gpt/perf-unified-wave4-20261018` | `e8f6f061a` | 2026-10-18 | no | no | +310 / -311 | 300 |
| `gpt/perf-unified-wave4-preview-20261018` | `e994cb671` | 2026-10-18 | no | no | +326 / -311 | 309 |
| `gpt/perf-wave4-hosted-acceptance-20261018` | `711bd50b3` | 2026-10-18 | no | no | +313 / -311 | 303 |
| `gpt/perf-wave4-preview-number-gate-20261018` | `fad6a04b3` | 2026-10-18 | no | no | +286 / -311 | 276 |
| `gpt/perf-world-story-opening-split-20261018` | `731db35a1` | 2026-10-18 | no | no | +278 / -311 | 268 |
| `claude/shell-mobile-island-5107-20261021` | `26d6ec083` | 2026-10-21 | no | no | +427 / -311 | 402 |
| `gpt/2029-central-world-fast-reader-integration-20261024` | `09d3dbb1f` | 2026-10-24 | yes | no | +93 / -271 | 91 |
| `gpt/world-fast-finding-public-corpora-20261024` | `3f22f2bb9` | 2026-10-24 | no | no | +90 / -271 | 88 |
| `codex/ahavat-public-reading-20261030` | `ee18875eb` | 2026-10-30 | yes | no | +380 / -271 | 360 |
| `gpt/2029-unified-performance-consolidation-20261031` | `4cf307934` | 2026-10-31 | yes | no | +792 / -269 | 749 |
| `gpt/2029-number-fullpage-performance-20261101` | `7649e46c1` | 2026-11-01 | yes | no | +817 / -269 | 774 |
| `gpt/2029-number-mobile-legacy-order-speed-20261101` | `351c81c1d` | 2026-11-01 | yes | no | +819 / -269 | 776 |
| `gpt/2029-raziel-fast-credit-meter-20261101` | `fbd3a3bf3` | 2026-11-01 | no | no | +828 / -269 | 785 |
| `gpt/2029-public-reading-release-acceptance-20261101` | `d961b5bdd` | 2026-11-02 | no | no | +870 / -269 | 821 |
| `gpt/2029-public-reading-release-configuration-20261101` | `6cd64a795` | 2026-11-02 | yes | no | +859 / -269 | 815 |
| `claude/sod1820-first-paint-preview-g93w32` | `caffeee42` | 2026-11-08 | no | no | +8 / -117 | 8 |
| `claude/preserve-contracts-enforcement-20261113` | `58a90eedf` | 2026-11-13 | no | no | +70 / -19 | 64 |
| `claude/preserve-measurement-visit-once-20261113` | `139f16214` | 2026-11-13 | no | no | +68 / -19 | 62 |
| `claude/preserve-speed-ux-audit-20261113` | `99a628485` | 2026-11-13 | no | no | +68 / -19 | 62 |

Reading guide: `in #1191 head = y` only for `claude/raziel-whatsapp-response-speed-v1` (also in main) and the six 2029-lineage branches named in section 1. For every other row nothing of the branch reached main through git ancestry; whether equivalent code reached main by re-implementation is decided per mechanism in sections 2A-2C (survival check), not by this table. `cherry` counts patch-ids absent from main (squash merges never match, so it is an upper bound).

## Appendix D - every main commit since 2026-11-04 that touched a Post-critical path (path-based, not subject-based)

Paths: `src/App2029.jsx`, `src/main2029.jsx`, `2029.html`, `vite.config.js`, `public-reading-deploy/**`, `scripts/build-public-reading*`, `middleware*`, `route-legitimacy.js`, `api/og.js`, `api/public*`, `src/lib/{supabase,AuthContext,readDedupe,webVitals*,publicReading*,marketing,analytics,engagement,visits,adsense,seo,publicPost*}`, `src/lib/research/{post2029*,postBackground*}`, `src/pages/{Post2029Page,PublicPostAddress2029Page}`, shared frame/shell/footer/ribbon/opening/media components.

| commit | date (local) | subject | #files | files (first 5) |
|---|---|---|---|---|
| `c2acc064b` | 11-15 15:24 | fix(analytics): keep automatic events on current public page (#1356) | 1 | src/lib/analytics.js  |
| `c752b0014` | 11-15 07:56 | Parallelize admitted Post reads and add authenticated GA sync preview (#1346) | 1 | src/lib/research/post2029ReadingProjection.js  |
| `fec22ca07` | 11-15 07:08 | Preserve historical URL canonicals and enforce client/server parity (#1355) | 4 | api/og.js public-reading-deploy/vercel.json route-legitimacy.js src/lib/publicPostUrls.js  |
| `3843af126` | 11-15 03:03 | Load Post backgrounds earlier and report actual GA page titles (#1345) | 5 | src/App2029.jsx src/lib/analytics.js src/lib/research/post2029ReadingProjection.js src/lib/research/postBackground2029.js src/lib/seo.js  |
| `4c9630db4` | 11-14 19:29 | Show public research candidates with accurate verification labels (#1335) | 2 | api/og.js src/components/experience2029/CanonicalMediaImage2029.jsx  |
| `9c4cad137` | 11-14 17:31 | Count each real page view once and restore product action measurement (#1337) | 6 | public-reading-deploy/transport.js src/App2029.jsx src/lib/publicReadingTelemetry2029.js src/lib/supabase.js src/lib/visits.js  |
| `aa0f6bc82` | 11-12 18:37 | Hide the header verse line (living ribbon) on every page (#1326) | 1 | src/components/experience2029/SystemFrame2029.jsx  |
| `99c891e38` | 11-12 04:10 | Group images and videos on the Zvi path: verified, approved writers only, public copy, redacted  | 1 | src/lib/readDedupe.js  |
| `cf3f15418` | 11-12 00:27 | Password recovery for every existing account, including a first password for Google sign-ups (#1 | 3 | public-reading-deploy/transport.js src/lib/AuthContext.jsx src/lib/supabase.js  |
| `42a509edc` | 11-12 00:17 | Personal area 2029: account hall and compact cards in the Now/More language; royal sign-in with  | 1 | src/components/experience2029/SystemFrame2029.jsx  |
| `341132999` | 11-11 23:37 | Number page: Typography V2, one canonical address, legacy focus=dna, robots consistency, Prime L | 7 | api/og.js public-reading-deploy/review-admission.js src/components/experience2029/SystemFrame2029.jsx src/lib/publicReadingRelease2029.js src/lib/rese |
| `367bd62ee` | 11-11 13:14 | "פעולות" and "כלים": closed · בבנייה through site_flags (#1310) | 1 | src/components/experience2029/SystemFrame2029.jsx  |
| `f250da9f7` | 11-11 05:41 | "עוד" in the royal version (Palace): royal tiles, explicit app install, accessible tile names | 1 | src/components/experience2029/SystemFrame2029.jsx  |
| `43c00b728` | 11-11 03:08 | Pixel/AdSense follow-up from the first live run: CAPI relay without custom headers, Funding Choi | 2 | public-reading-deploy/transport.js public-reading-deploy/vercel.json  |
| `d6662fdcb` | 11-11 02:47 | Meta Pixel and Google AdSense enabled on the 2029 public site (CSP, worker, reading pages) (#130 | 8 | public-reading-deploy/transport.js public-reading-deploy/vercel.json scripts/build-public-reading-production.mjs src/App2029.jsx src/components/AdSlot |
| `01d96b627` | 11-11 02:08 | Google Analytics 4 is not blocked on the 2029 public site (CSP + service worker), with a surface | 2 | public-reading-deploy/transport.js public-reading-deploy/vercel.json  |
| `932aba4bd` | 11-11 01:52 | Public storage media: one shared rule for the read worker and the public readers (video/audio/im | 2 | public-reading-deploy/transport.js src/components/experience2029/GlobalLivingRibbon2029.jsx  |
| `defc7c573` | 11-10 17:37 | Auth: sign-in survives a full or blocked localStorage (resilient storage, storage vs network err | 1 | src/lib/publicReadingAuthSession.js  |
| `1f0867ffb` | 11-10 14:35 | P0 Auth: permanent sign-in contract (worker policy, canonical verifier, diagnostics, recovery, C | 1 | public-reading-deploy/transport.js  |
| `608c161be` | 11-09 02:17 | Analytics: restore first-party visits and engagement on the public site (completes #1283) (#1284 | 3 | public-reading-deploy/transport.js src/App2029.jsx src/lib/publicReadingTelemetry2029.js  |
| `889b36138` | 11-08 22:45 | Analytics: expand route coverage safely | 1 | src/lib/publicReadingTelemetry2029.js  |
| `522e66081` | 11-08 22:15 | feat(contact): notify admin on contact submissions | 1 | src/lib/supabase.js  |
| `c8351dccb` | 11-08 07:14 | Fix: public-reading worker blocked tree hints, online-now and guest review for non-admins (#1273 | 1 | public-reading-deploy/transport.js  |
| `b33471310` | 11-08 06:37 | First paint: royal opening shell, bar polish, arrival cue replaces the entrance intro (#1272) | 4 | 2029.html src/App2029.jsx src/components/experience2029/Opening2029.jsx src/components/experience2029/systemFrame2029-topbar-crown.css  |
| `05181200e` | 11-08 06:20 | Enable real member messages through contributor-interactions in production (#1271) | 2 | public-reading-deploy/api/contributor-interactions.js public-reading-deploy/read-only-api.js  |
| `cfa7cc1ce` | 11-08 02:27 | Audit remediation RC: stale-chunk recovery, Legacy cleanup, performance pass, G4 evidence (#1262 | 18 | 2029.html api/og.js public-reading-deploy/api/card.js public-reading-deploy/api/public-document.js public-reading-deploy/card-deadline.js  |
| `9ca758e44` | 11-06 10:14 | ELS מטריצה מפוצלת (שלב 1) + תיקוני ביקורת (sitemap, וידאו, CI) ( | 1 | api/og.js  |
| `1f0863938` | 11-06 08:51 | Worker: /tzofen.html → /code for returning visitors; community_search admitted; link-preview c | 1 | public-reading-deploy/transport.js  |
| `42ff15120` | 11-06 07:52 | ELS: opens in Research for everyone, Operation Visibility Law meter, centered matrix tools (#125 | 2 | public-reading-deploy/vercel.json route-legitimacy.js  |
| `be9b17332` | 11-06 05:57 | ELS classic: member saves, cipher management, one-row tool dock, Raziel bar retired (#1252) | 1 | public-reading-deploy/transport.js  |
| `a3e6b737f` | 11-06 04:36 | Remove the Home CDN cache setting; bring back the Legacy-style install suggestion (code only) (# | 2 | public-reading-deploy/api/public-document.js src/App2029.jsx  |
| `9ea0c2c4b` | 11-06 00:20 | World sources: show writer, date and excerpt on "הודעות מקור" cards (#1245) | 1 | src/components/experience2029/SystemFrame2029.jsx  |
| `97bf00be2` | 11-06 00:17 | Bots: SG limiter reads the Vercel OIDC token from the request header (clean base of #1217) + the | 1 | middleware.js  |
| `1e1641ce6` | 11-05 20:45 | Bible code bottom bar: one row (the Raziel orb is no longer lifted above the other controls) (#1 | 1 | src/components/experience2029/systemFrame2029-unified-bar.css  |
| `aceb9e58f` | 11-05 20:37 | 2029 top bar: the crown at the centre, dark glass, rounded arc under the verse (#1241) | 3 | src/components/experience2029/SystemFrame2029.jsx src/components/experience2029/systemFrame2029-topbar-crown.css src/components/experience2029/systemF |
| `ebf06d3ce` | 11-05 20:10 | Community chat: corpus-wide search, optional guest name, plain message total (#1243) | 1 | public-reading-deploy/transport.js  |
| `a89f94ae0` | 11-05 19:45 | Navigation symbols: one per destination, with a contract; Beit Midrash, calculator, Number page  | 1 | src/components/experience2029/SystemFrame2029.jsx  |
| `410eaad17` | 11-05 17:42 | Bible code open to the public (Classic), cipher library and member saves; chat attach hint; no a | 4 | api/og.js public-reading-deploy/transport.js src/components/experience2029/SystemFrame2029.jsx src/lib/publicReadingRelease2029.js  |
| `3d81716af` | 11-05 17:34 | Number page: parallel value reads, one shared lookup, phone first screen, server-projection prop | 1 | src/lib/supabase.js  |
| `377c7dba8` | 11-05 16:51 | Redirects, historical page, temporarily-closed areas as 503, link preview guard (#1236) | 4 | api/og.js public-reading-deploy/api/public-document.js route-legitimacy.js src/lib/publicReadingRelease2029.js  |
| `4e82797e6` | 11-05 16:35 | Frame: replace renewal ribbon with the Malachi 3:23 verse, no contact button (#1235) | 2 | src/components/experience2029/GlobalLivingRibbon2029.jsx src/components/experience2029/SystemFrame2029.jsx  |
| `27187564b` | 11-05 16:29 | SEO: keep the popular chat and calculator indexable; sitemap, canonical, heading "צ'אט הקה | 1 | api/og.js  |
| `08cb3c17f` | 11-05 16:07 | Community: top login/signup buttons, guest composer layout, placeholder fix, typist sees "מקל | 1 | public-reading-deploy/transport.js  |
| `91024c7f6` | 11-05 15:38 | Fix guest publishing in production: let the public-reading worker forward the exact anonymous re | 1 | public-reading-deploy/transport.js  |
| `2500ec560` | 11-05 13:55 | Post-publish fixes from the live check of b0a752c66: Beit Midrash scroll jump/CLS, server docume | 2 | api/og.js public-reading-deploy/transport.js  |
| `fc9269a25` | 11-05 09:45 | Beit Midrash opens to everyone + "עכשיו" window hierarchy (public sources, then messages in | 2 | src/components/experience2029/SystemFrame2029.jsx src/lib/publicReadingRelease2029.js  |
| `c20dff04c` | 11-05 09:43 | Account link offers (phase 1): owner-asserted offer, OTP proof of the second account, nonce, aud | 1 | src/components/experience2029/SystemFrame2029.jsx  |
| `241dea869` | 11-05 09:25 | ELS native UI gate: wait for the Now tabs (test timing) + tool-dock clearance specificity (CSS)  | 1 | src/components/experience2029/systemFrame2029-unified-bar.css  |
| `ad2d84c83` | 11-05 08:35 | Footer: reserve one viewport of content so the footer never sits on the first screen while the p | 1 | src/components/experience2029/footer2029.css  |
| `18c98fa6f` | 11-05 06:21 | Bottom bar: restore the full "עוד" panel (actions, tools, search, share) + admin list of stil | 1 | src/components/experience2029/SystemFrame2029.jsx  |
| `68798372f` | 11-05 04:31 | Show stream entry date in gallery cards (#1209) | 1 | src/lib/supabase.js  |
| `11346873d` | 11-05 01:51 | Reconnect public measurement and verified-admin readers (#1198) | 13 | public-reading-deploy/api/ga-insights.js public-reading-deploy/api/search-console.js public-reading-deploy/api/vercel-insights.js public-reading-deplo |
| `a4910bc27` | 11-04 19:28 | fix(publication): preserve legacy chat images and bound canonical sitemap delivery | 1 | public-reading-deploy/api/public-sitemap.js  |
| `71bb76467` | 11-04 18:10 | Reconcile main with verified live 2029 and approved follow-up fixes (#1191) | 52 | 2029.html api/og.js api/public-contributor-rank.js public-reading-deploy/.gitignore public-reading-deploy/admin-request.js  |

## Appendix E - evidence commands (all read-only; re-runnable)

```
# full history without touching /home/user/sod1820
git init --bare perf/full.git; echo /home/user/sod1820/.git/objects > perf/full.git/objects/info/alternates
git -C perf/full.git remote add origin https://github.com/zuriel337/sod1820   # partial clone, filter blob:none
git -C perf/full.git fetch --refetch --filter=blob:none --no-tags origin '+refs/heads/main:refs/remotes/origin/main'
git -C perf/full.git fetch --filter=blob:none --no-tags origin '+refs/heads/*:refs/remotes/origin/*'
# ancestry / lineage
git -C perf/full.git merge-base --is-ancestor <commit> b602ce1bb477da04f6d8338b5b9b50e2a54abf27   # inside #1191's head?
git -C perf/full.git rev-list --count 2195c9784..b602ce1bb477da04f6d8338b5b9b50e2a54abf27          # 991
python3 -I perf/survive.py <commit>...      # content survival in perf/wt-main (== origin/main)
python3 -I perf/depanc.py  <commit>...      # earliest READY production / preview deployment containing it
gh api -X GET repos/zuriel337/sod1820/pulls/<N>   # PR head/merge SHAs, dates
```
Scratch files (same directory): `branchtable.tsv`, `set1.out` (43 lineage-B perf commits, survival), `set2.out` (96 lineage-A perf commits, survival), `oct_perf_commits.txt`, `main-fp.tsv`, `l1191.txt`, `notes.md`.
