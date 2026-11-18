# Shell weight reduction — SHELL_WEIGHT_REDUCTION_20261118 (branch only)

ZURIEL 18.11.2026 approved the plan of eight items in three groups (A: database file split, Raziel on need, frame parts,
install offer / reading preferences; B: on-demand CSS, research layer; C: analytics deferral without any event loss, Auth on
need). Authorization: build, code changes on an isolated branch, tests and a review PR. No merge, deployment, live database,
permission, secret or Production change. Target: shared code from ~330 KB toward ~210 KB gzip, "a target to test, not a number
at any cost".

- Branch `ccr-dcadb071-v1z5ol-shell-weight`, base `origin/main` 736dd285b (unchanged during the work).
- Map entry: `S-52` in `docs/reviews/unified-performance-consolidation-20261031.json` (`current_state_20261117.fixes`), shown in
  the speed centre (`/2029/control` → "מהירות וביצועים") as not merged.
- Nothing here is merged or deployed. Production is unchanged.

## What "shared code" means here

Every page downloads, before its own code: the entry JS graph (`eagerJsGzip`), the System Frame JS graph (`frameJsGzip`) and the
frame CSS (`frameCssGzip`). These are the three metrics of the existing Speed Law gate `scripts/test-2029-shell-budget.mjs`
(gzip level 9, from the build manifest), measured on both builds: the default build (`dist/`) and the public release build
(`public-reading-deploy/dist`, `--profile public-reading`).

## Result per item (real, sequential, final tree of each step; gzip bytes, default build)

| Step | Commit | Entry JS | Frame JS | Frame CSS | Shared total | Step saving |
|---|---|---|---|---|---|---|
| main (base) | 736dd285b | 219,766 | 74,539 | 35,168 | **329,473** | — |
| 1/8 database file split | d8818a136 | 202,931 | 74,592 | 35,168 | 312,691 | −16,782 |
| 2/8 Raziel panel on open | 2d6c326c3 | 203,053 | 63,321 | 35,168 | 301,542 | −11,149 |
| 3/8 frame parts (+1/8 follow-up 40025ea9c, +118) | 99d5f76a1 | 203,374 | 46,353 | 33,850 | 283,577 | −17,965 |
| 8/8 install menu | cd877d907 | 202,469 | 46,345 | 33,850 | 282,664 | −913 |
| 3/8 follow-up: footer requested with the frame | d437ea12c | 202,483 | 46,314 | 33,850 | **282,647** | −17 |

Public release build: 329,430 → 282,713 B (−46,717, −14.2%). Default build: 329,473 → 282,647 B (**−46,826, −14.2%**).
Frame JS files 5 → 3. Items 4, 5, 6 and 7: no change (below). The ~210 KB target is not reached; the remaining large parts are
named under "Open".

The budget baseline (`scripts/2029-shell-budget-baseline.json`) was lowered after each step with `--lower` only (history entries
`by: "ratchet"`); no limit was raised and no gate was changed.

## What moved (source-map attribution of the built chunks, not file renames)

- **1/8** `src/lib/supabase.js` keeps only the shared client and the reads every page needs (posts reader, home/post reading
  sources, site flags, views, newsletter subscribe, notification preferences, activity, contributor link). The other ~200 database
  actions, admin ones included, live in `src/lib/supabaseApi2029.js` (re-exports the core, so consumers that need both import one
  module), which no eagerly loaded module imports. `askRaziel` is loaded at the first Raziel submit. Attribution: supabase.js in the
  entry 16,849 → 1,503 B (1,621 after the follow-up). `getRealityHints` stays in the core because `RealityRiver2029.jsx` is
  byte-pinned (`test/world-gallery-entry-follow-chain-2029.test.mjs`); a re-pin is an owner decision.
- **2/8** `RazielNativeChat` + `RazielProjection` moved from the frame to `RazielPanel2029.jsx` (React.lazy inside the existing
  panel Suspense; opens only where Raziel is open — today the administrator). Frame −11.2 KB (SystemFrame −5.4, research
  representations −1.4, timeline −1.3, ELS-Raziel context −1.3, titles −0.8, saved sync, action contract).
- **3/8** footer + newsletter form (its own file, requested when the frame renders and drawn when it arrives, hidden while the route
  shows only its loading placeholder, as on main; see "Lab" for why it is not drawn after the content), account
  link offer (signed-in only), share row of the inspect panel (same 62 px placeholder while it loads), contextual video layer
  (administrator only; it never rendered for anyone else), ELS line of the Raziel orb title (when Raziel is open to the viewer),
  hidden living ribbon and its detail (on open), live-feed row helpers and tier readers (with the feed's own data; every data path
  waits for them, so rows exist exactly when they did). The one-viewport content reservation moved from `footer2029.css` to
  `systemFrame2029.css` so it holds from the first paint (the only rule that sets that height). Frame −17.0 KB JS, −1.3 KB CSS.
- **8/8** `installOffer2029.js` keeps the entry-time capture of the browser's one-time install offer; the menu part (browser
  family + real steps) moved to `installMenu2029.js`, imported by the lazy "עוד" panel only. Entry −905 B. The "reading
  preferences" half was covered by 1/8.

Kept on purpose: the learning mark (drawn at first paint above the content — moving it would make the page jump) and the guest
newsletter timer (tiny, timing-sensitive). The entry grew ~0.4 KB with Vite's list of on-demand files; included in the totals.

## Not changed, with the measured reason

- **4 — CSS of on-demand panels.** Rules that can match nothing outside a panel (every selector contains a class used only by that
  panel's files): Raziel panel −381 B gzip, personal area −554 B; Home-only rules −1,465 B for non-Home pages. The earlier
  10–15 KB estimate was wrong: most frame CSS styles elements present on every page. Moving these rules changes their cascade order
  and touches ~19 tests that pin the stylesheets, for < 1 KB in the approved scope; not done. Item 3 already moved −1.3 KB of CSS.
- **5 — analytics.** Left unchanged (ZURIEL's rule: no proof, no change). Measurement code in the entry is 11.4 KB. Web Vitals
  already capture at entry and send on exit (sendBeacon/keepalive); visits and engagement already load after the content gate;
  GA/Pixel start after content with 177 B of entry code. No part splits into "small capture + deferred processing" without
  duplicating the capture or risking early-exit events. Candidate for a later, separately proven step: the reading-telemetry path
  table (`publicReadingTelemetry2029.js`, 2.2 KB) at the gate. Observation from code reading (pre-existing, not measured): a reader
  who unloads the page before the content gate starts the visits chunk import at `pagehide`; whether that visit is written is not
  verified.
- **6 — research layer.** The research store (`createResearchSyncRuntime`, read with `useSyncExternalStore`) is synchronous state
  that the frame reads on every page at first render (context, saved items, continue-research). On-demand loading needs an async
  store and a hydration step that can change the first paint; a separate package with its own acceptance tests.
- **7 — Auth.** 33.8 KB in the entry (auth-js 27.0 KB). The Supabase client builds its auth client synchronously; lazy Auth is a
  separate package with the full acceptance list (login, logout, password recovery, Google/Facebook return, refresh, several tabs,
  member vs guest). Not started.
- Also measured: the Raziel *session* (~6 KB of the entry) is used through a null-safe hook everywhere, but ELS and Life-Journey may
  offer Raziel to members through the site flag independently of the frame's admin lock; removing it for non-admins could remove a
  working capability, so it stays.

## Verification

- Builds and both shell gates on the final tree of every step: PASS. Dependencies exactly as the lockfile (an install with
  `--no-package-lock` re-resolves ~40 packages and changes chunking; all numbers here come from lockfile builds).
- Undefined-name check of every changed module (Babel scope analysis): a real bug was caught in 2/8 before commit (template-literal
  tokens `RADIUS`, `LAYOUT`, `TYPE_SCALE_V2`, `NUMBER_PAGE_BASE` and `razielViewModeLabel`), fixed, and found again by the
  browser run.
- Unit tests `test/*.test.mjs` (594 files): 3,711/3,735 on the branch, 3,708/3,735 on main; every branch failure also fails on main
  with the same message (one parallel-run artifact passes alone).
- Tests outside `test/` (245 files under src, supabase, api): 2,208/2,214, the same six failures as main.
- CI scripts: the G1 routing gate 51/51, the 17 `npm run test:*` scripts and the 35 offline `scripts/` checks the workflows run: all
  pass. The CI browser tests (23 files): all pass; the two Google-tag tests with `VITE_GA_ID=G-TEST` as their headers specify; the
  speed centre 12 cases.
- Sign-in: `auth-browser-acceptance-2029` and `auth-storage-browser-2029` pass (login, logout, recovery, OAuth return, refresh,
  several tabs). Measurement: `content-first-2029` (Google tag, visit and stream after the article, delayed never dropped),
  `ga-measurement-browser-2029`, `measurement-visit-once-2029`, `post-speed-page-analytics`, `marketing-browser-2029` pass.
- Browser, main vs branch at 99d5f76a1 (same local server, live reads, writes answered locally): Home updates strip, Now panel, footer
  links and layout shift identical on phone and desktop; share row keeps its 62 px while loading with no shift; More panel install
  section identical on Android Chrome, iPhone Safari and desktop Chrome and absent on desktop Firefox; a visitor never loads the
  account offer, video layer, ELS line or Raziel panel; the administrator fixture loads the account offer and the ELS line.
- Raziel (administrator fixture, temporary copies of the two Raziel browser tests): navigation actions pass at 320 and 1440 px on
  main and branch; the account-sync flow passes every Raziel step on both and stops at the same later personal-area click on both.
  The committed versions of these tests fail identically on main (they predate the admin-only lock and the removed side companion).
- CI also caught tests and checks that pinned code by file; each now reads the code where it lives (no assertion removed), and the
  G1 retired-law record was republished per its rule (four comments repointed to their recorded successors).
- The default profile's entry-file count stays at main's 18: the isolation gate installs esbuild with `--no-package-lock`, and in
  that environment main's build also has 18 files. Every byte budget stays lowered.

## Lab (same local conditions, live public reads, analytics writes answered locally)

All runs: the public release build of main (736dd285b) and of the branch, served by the same local server, fresh profile per
load, arms alternating, live public reads; analytics do not run on a local address and every run recorded 0 write attempts.
Phone = 390×844, Slow 4G (150 ms, 1.6 Mbps) + 4× CPU. "Card" = the Home pinned card ready; "text" = the Post article text
(> 300 characters) on screen. p50 (p75) in ms.

**Final comparison** (light lab: HTTP/2, only analytics writes and third parties intercepted; phone 5 rounds, desktop 4):

| | main | branch (d437ea12c) |
|---|---|---|
| Phone Home: largest paint | 5,496 (5,500) | 5,276 (5,364) |
| Phone Home: card | 4,961 (5,272) | 5,013 (5,085) |
| Phone Home: internal navigation to the Post | 3,028 | 2,987 |
| Phone Post: text | 6,846 (6,974) | 6,488 (6,496) |
| Phone Post: largest paint | 1,092 | 1,060 |
| Phone Post: JS downloaded | 494.2 KB | 456.9–465.3 KB |
| Desktop Home: largest paint / card | 840 / 1,345 | 828 / 1,350 |
| Desktop Post: largest paint / text | 2,492 / 2,060 | 2,500 / 2,135 |
| Blocking time, desktop Home / Post | 188 / 1,212 | 152 / 957 |
| Blocking time, phone Home / Post | 615 / 1,880 | 660 / 1,978 |
| Layout shift (CLS), all four | 0.001 / 0.0053 / 0.0007 / 0.0289 | 0.001 / 0.0053 / 0.0007 / 0.0221 |
| Menu / search open (interaction) | 152–160 | 152–160 |

Duplicate downloads: the same list on both (2× the brand image, repeated method RPC calls with different bodies); none new.
No page errors.

**How the lab series got there (kept as evidence):**
- First run (HTTP/1.1 local server, every request routed through the test harness): posts faster, but the Home card +441 ms and
  desktop largest paint +110–160 ms. The branch makes ~11 more, smaller requests on Home (modules Home also uses — ratings, tier
  signals, newsletter form, timeline/relative time, media guard, category identity — used to ride inside the frame and are now
  their own files), which HTTP/1.1's six connections and the per-request harness hop both penalize.
- Same comparison over HTTP/2 (production serves HTTP/2/3): Home card within noise (10 rounds: p50 +203, p75 −145), Home largest
  paint −192 ms, Post text −273 ms. Desktop largest paint was still later.
- Three arms over light HTTP/2 (main / items 1–2 / full package): items 1–2 alone gave Home card −386 ms; the full package lost that
  on the card and moved desktop largest paint later. Cause found: the footer was drawn only after the content, so its code,
  stylesheet (full style recalculation) and render landed in the largest-paint window. Fixed in d437ea12c (requested with the
  frame, as main draws it); the final comparison above is after that fix.
- Not measured: field data (the branch is not deployed), INP from real visitors (the lab measures one menu/search interaction),
  HTTP/1.1 after the fix. After a release, the speed centre's field view is the check: Home card and largest paint by device.

## Correction after the release build (18.11.2026)

The public-profile numbers above came from a local build without the production `VITE_*` values (analytics and ad ids).
The profile's own rule is to measure with them. With them, Vercel's production build of main 3f3355613 measured
`eagerJsGzip` 204,087 B, not 202,470 B, and the gate stopped the deployment (dpl_CVQS1AV2DfB1sfsxsSbVU4FLv78W).

| Vercel production build | main 736dd285b | 3f3355613 |
| --- | --- | --- |
| eagerJsGzip | 221,251 B | 204,087 B (−17,164 B) |
| frameJsGzip | 75,364 B | 46,401 B (−28,963 B) |

The code did not grow. On ZURIEL's decision ("תקן את הסף", 18.11.2026), the public-reading baseline was set to the Vercel measurement.
The decision is recorded in `scripts/2029-shell-budget-baseline.json`. A future lowering of this profile must be measured with
the production values.

## Rollback

Revert the branch commits. No database, Edge Function, flag, secret or configuration change is part of this package.
