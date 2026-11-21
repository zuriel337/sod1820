# Reader demand loading — Draft #1469

Base: origin/main 886f80db20a6cf21d655a7766d1595766cbd32cd, integrated into the existing Royal branch. No production, database, permission or feature-flag changes. No new PR or store.

User decision: Home and Posts are reading surfaces; research actions belong to World, Heichal, code/ELS and gematria (including existing calculator/number aliases). Personal save and share remain available on explicit action. Exact-return navigation must survive reading a Post.

## Implementation

- Vite-only boundary for the existing Supabase AuthClient. On the canonical public artifact, an empty durable reader session and the existing explicitly anonymous projection defer the real SDK. Existing session/verifier bytes, login/callback URLs, uncertain storage and explicit Auth operations use the real SDK. Storage bytes are loading hints only. Cross-tab durable sign-in wakes the same SDK; normal server identity verification remains mandatory. Other build profiles initialize the SDK normally. No Auth/RLS/session policy is replaced.
- Profile and research cloud operations import the existing auth module on use. Keep the existing synchronous local research store and exact-return context; it has NOT been replaced by a second store or removed from the entry graph.
- Reading routes do not admit research cloud hydration, latest-path reads or ELS observation. Existing principal-bound journal/receipt handling starts on workspace entry or explicit personal save/retry. Reading does not automatically replay pending journals. Personal save is distinct from research actions.
- Post action rows keep personal save, share and reply, and omit research-add on reading routes.
- Includes the previously uncommitted document-owned Royal backdrop work and its tests. The four-route-only background experiment has NOT been implemented. Palace release remains blocked on performance acceptance.

## Verification update — 21 November, branch only

Base: `886f80db20a6cf21d655a7766d1595766cbd32cd`. Product head: `dd759875a23d491b253bc76f13bdbe73ebe0e5a7`. Draft PR [#1469](https://github.com/zuriel337/sod1820/pull/1469). No merge, deployment, SQL, permission, live flag or GA4 change. This is a verification report, **not a completed speed-ledger/release entry**.

### Shared keyboard fix

`0dfeabe` removes the shared keyboard watcher's timer and automatic `scrollIntoView`, including its visual-viewport scroll listener. Browser-native focus remains responsible for revealing the editing field. Manual scrolling preserves the caret and text; the frame does not force blur or refocus. Existing bottom-bar clearance still follows keyboard resize/focus and returns when the keyboard is dismissed even if the input remains focused. This applies wherever the existing SystemFrame mounts the watcher; no per-page handler was added. It does not diagnose every bottom-sheet position or alter standalone input logic outside that frame.

The old implementation made five forced scroll calls in the regression scenario; the new one makes zero. Unit tests pass 11/11. Real built-artifact Chromium acceptance passes at 320 and 390 px, including bar restoration, retained text/focus, no overflow and no page errors. Native phone keyboards cannot be reproduced by Chromium emulation: the browser test supplies controlled visualViewport events. Physical iOS/Android verification remains open. `a54798c` adds both regression checks to existing CI jobs.

### Streamed-article CLS fix

The 144-observation comparison caught three candidate return visits above the unchanged CLS 0.1 gate (phone 0.758334, desktop 0.481842); main stayed below it. A separate diagnostic reproduced the same fault on the pre-Auth Royal version. Shift attribution places it before article adoption, not in research restoration or Auth hydration.

The root initially occupied the whole viewport (844 px in the observed phone run); the existing `:has(#sod29-ssr-article)` rule then reduced it to the 122 px header once the article was parsed. A cached Royal background permits an earlier streamed paint. Merely moving that rule to the head **failed** and was replaced. `dd75987` reserves the existing 116/122/132 px header sizes from the initial `sod-af-first` phase, then hands over to the existing article-presence selector until adoption releases the space. The same style source supplies all heights. No added client module, hidden article, delayed content, new network read or raised threshold.

A deterministic browser test pauses the document before the article node exists, checks all three widths, then checks CSS handover and release for adopted content. It fails on the old server (900 px instead of 116 at width 320) and passes on the fix. Existing old/new article browser suites pass **22/22**, including adoption of the same nodes, paragraph/anchor preservation, no duplicates and navigation. Document/pipeline/keyboard unit suites pass **23/23**. Pipeline source and proof fingerprint are unchanged.

### Matched measurements and their limits

The original comparison has **144 observations**: main versus the Auth-split Royal runtime at `1d68c34` (application code unchanged through `c28060d`), six routes, widths 390/1440, three interleaved rounds, first entry and return. Both arms use the same default public build variables, recorded anonymous public reads, real service worker, HTTP/2 + gzip, shared 1.6 Mbps response stream, 150 ms response delay and 4x CPU slowdown. This is a controlled local lab, not field RUM or production-variable release validation.

“Useful” is the first visible primary block: Home's populated pinned lead, World's flight heading, Books' grid, Code's mode controls, or Post's article heading. It does **not** mean every tool or engine is ready. The lab records visibility geometry followed by a frame; it is not a human perception measurement. Raw records include all LCP candidates and URLs. Browsing away and returning preserves native HTTP cache. A pinned local TLS certificate replaced broad certificate-error suppression, which had disabled Chromium caching; earlier runs with that error and with the inert article template left on non-post pages were rejected, not used as evidence.

[Full median table](timings.md) · [144-run summary](evidence/matched-summary.json) · [raw records, gzip](evidence/matched-144.json.gz).

Examples, median useful-content time in ms (main → Royal):

| Route / viewport | First visit | Return |
|---|---:|---:|
| Home / 390 | 4505.2 → 4230.3 | 1572.8 → 1591.6 |
| Home / 1440 | 4622.6 → 4223.6 | 1724.1 → 1696.3 |
| World / 390 | 4951.0 → 4884.0 | 1724.9 → 1659.2 |
| World / 1440 | 5006.6 → 4997.6 | 1681.8 → 1740.2 |
| Books / 390 | 3594.4 → 3515.0 | 1428.3 → 1361.6 |
| Books / 1440 | 3666.2 → 3638.4 | 1451.6 → 1479.7 |
| Code / 390 | 3746.0 → 3746.6 | 1112.8 → 1122.3 |
| Code / 1440 | 3740.7 → 3809.1 | 1157.6 → 1176.4 |

Home first entry improves ~275 ms phone / ~399 ms desktop in this sample. Returns and workspace timings are mixed; n=3 is too small to dismiss regressions as noise or claim universal improvement. Decorative-image LCP often replaces a text/content LCP, so a large LCP decrease does not establish the same improvement in useful content. The Code desktop cold LCP, for example, increases 568 → 804 ms in the original comparison.

Only the affected imported Post was remeasured after the CLS fix: **24 observations**, three rounds with identical lab settings and main. The candidate uses the `0dfeabe` built client plus the server fix committed as `dd75987`; the final rebuilt `dd75987` client has the same application code. All 24 observations have zero page errors and no horizontal overflow; max CLS is 0.054685 for both arms, with no threshold failure.

| Imported Post | Useful ms main → fixed | LCP ms main → fixed | Max CLS main / fixed |
|---|---:|---:|---:|
| 390 first | 487.1 → 489.6 | 1296 → 1152 | 0.000038 / 0.000038 |
| 390 return | 341.4 → 345.8 | 376 → 320 | 0.054685 / 0.054685 |
| 1440 first | 482.7 → 488.1 | 1112 → 1296 | 0.006854 / 0.006854 |
| 1440 return | 373.6 → 395.2 | 488 → 332 | 0.031472 / 0.031472 |

Here main's LCP is `article.sod29-reading-post` with its old background; Royal's is the shared `royal-connected-*.avif` image. In particular the desktop cold LCP still increases **184 ms**, while useful content differs by 5.4 ms. This is reported, not hidden or declared a global speed win. [Summary and LCP identities](evidence/article-reserve-summary.json) · [raw 24 records, gzip](evidence/article-reserve-24.json.gz).

### Weight and cache

Final default `npm run build`: PASS. Eager JS 176534 gzip bytes / 17 files; frame JS 46134 / 3 files; frame CSS 34213. Final default public artifact build: PASS. Eager JS 176665 / 17; frame JS 46316 / 3; frame CSS 34213. No threshold raised. The earlier default ratchet `c28060d` only lowered the budget; the public budget was not ratcheted using absent production analytics IDs.

Against main's matching public build (203469 + 47383 + 34329 = 285181), final shared bytes total **257194**, a reduction of **27987 gzip bytes (9.81%)**. These are bytes, not a claim of 9.81% faster loading. The served non-Post HTML adds 946 gzip bytes (6294 → 7240); this cost is reported alongside the JavaScript saving. The article reservation adds 72 raw selector bytes on served article documents only, reusing the existing dimensions.

The new image's actual first response payload is 18859 B on mobile; main Home's former mobile background was 18168 B, so the background alone is 691 B larger there. Other old Post backgrounds are larger than the shared mobile image. Covers/content images remain. Same-origin Royal background, canonical logo and font transfers are zero on all 72 original return visits. This demonstrates cache reuse under the measured conditions, not permanent storage or a promise that browsers never evict an asset. Cross-origin ResourceTiming zeros are opaque and were not counted as free network traffic.

### CI and remaining release blockers

On `c28060d`, 21 checks passed and Production Canary Gate failed. The same gate failed on the keyboard head `0dfeabe`; final-head CI must be read independently. The production canary failure is on deployed main `886f80d`, not a deployment of this PR. [Run 44944247933](https://github.com/zuriel337/sod1820/actions/runs/44944247933) failed again when its failed job was rerun: home/entry/robots succeeded, then the sitemap request exceeded 15000 ms. A bounded read of the live sitemap on 21 November also timed out at 15.002 s with zero response bytes. Vercel alias read still points to `dpl_A31gsGMtqU9YGZc92E1cziicZv5f`, source `886f80d`; no alias was changed. Narrow runtime-log lookup returned no matching sitemap logs, so its deeper cause is not claimed as diagnosed. Existing sitemap reuse work was read and has not been reimplemented.

Resolved test-harness attempts are retained honestly: the initial keyboard browser invocation could not use the default browser installation; the rerun explicitly used installed `/usr/bin/chromium`. The new streamed-document test initially expected a full viewport after aborting every full stylesheet; its release assertion now supplies 1000 px of adopted content and verifies that the root can grow to that height. Both negative tests still fail on the previous implementations.

Other fixes/verification retained from this continuation: Storage scanner recognizes the actual browser storage receiver; admin admission VM harness awaits the lazy import and retains role/race assertions; OTP browser fixture waits for its response; Community test waits for verified-view remount before asserting; Auth method/export inventory includes negative mutations and SDK-consumer coverage. The existing Realtime scan was not weakened to accept deliberately invalid imports in test strings. Auth/storage/admin/research evidence from the unchanged implementation is retained rather than rerun without a reason.

**Open:** production canary; mixed workspace/return latency and the desktop imported-Post LCP increase (no universal speed claim); real phone keyboard verification; public Heichal timing/screenshots (closed by the public release profile, no live flag opened); no fresh 768 px performance matrix. The research-add button is still omitted on reading routes under the original user direction; a later question about on-demand research was answered as a recommendation, not silently implemented. Save/share remain on click. No completed speed-ledger entry or deployment approval is claimed while these remain.

### Actual screenshots

These are browser screenshots, not renders. Home/World/Books correspond to the original matched client; the shared keyboard change adds no visual style. Imported Post screenshots are from the fixed return measurement.

| Screen | Mobile | Desktop |
|---|---|---|
| Home | [390](screenshots/royal-home-390-cold.png) | [1440](screenshots/royal-home-1440-cold.png) |
| World | [390](screenshots/royal-world-390-cold.png) | [1440](screenshots/royal-world-1440-cold.png) |
| Books | [390](screenshots/royal-books-390-cold.png) | [1440](screenshots/royal-books-1440-cold.png) |
| Imported Post, return | [390](screenshots/royal-imported-390-warm.png) | [1440](screenshots/royal-imported-1440-warm.png) |

Reproduction: build both public artifacts with the same variables; set `ROYAL_BASE_ROOT` to the main worktree and `ROYAL_PERF_OUT` to an evidence directory, then run `ROYAL_ROUTES=home,world,books,code,post,imported ROYAL_ROUNDS=3 ROYAL_WIDTHS=390,1440 ROYAL_SLOW=1 node test/reader-demand-performance-2029.browser.mjs`. Provide the same recorded public-read fixture for both arms. No authenticated credentials are needed and writes are denied by the fixture. The unused local flag-override branch was removed from the harness; the measured fixture contained no matching `site_flags` response.

Handoff: actor GPT · owner Experience/System Frame · scope shared keyboard + Royal/reader verification · status BRANCH_ONLY, RELEASE_BLOCKED · handoff_to ZURIEL. No work_log write was possible through the read-only connection; no database record is claimed.
