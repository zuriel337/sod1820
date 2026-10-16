# HomeV2 speed and stability — focused fix, evidence (2026-10-16)

Task key `CLAUDE_PERF_HOME_STABILITY_V3_20261016` · branch `ccr-cb3840b9-7iz2j1` · reports to ZURIEL only (passive record, no dispatch/ACK).
Scope: Home + direct dependencies. Not touched: number engines, media reader, shared readers, shared CI, database, Legacy, live flags, `supabase.js`, the calculator drawer. `src/lib/scrollRestore2029.js` was in scope only from Part 0 (explicit extension).
State: **BRANCH-ONLY**. No PR, no CI run, no merge, no deploy. Release stays with ZURIEL (`תעלה`).

This file has three parts. **Part 0** closes the scroll-restoration dependency reported after Part 1 (the return to Home when content is late, fails or vanishes). **Part 1** is the continuation after the central review of `e23dee27` (the section "קבלת מסירת Claude Home" of the central handoff, commit `35fd78b0`). **Part 2** is the first delivery, kept as history: its measurements used the old corpus (18 undecodable images) and a predicate that counted invisible content, so they are not acceptance evidence.

# Part 0 — the return to Home when content is late, fails or vanishes (head after `e3498434`)

Base `7c3f43f39147c71508ed394363a2f98f140a5859` (unchanged), previous head `e3498434ed5edd4dd5dfd6efaf61436fecfd48f8`, code commit of this round `6cfb44a53d724fbf3728fa323deafbba0542bece`. BRANCH-ONLY; failure injection and synthetic content prove behavior only — nothing here says the site is faster or that images are accepted; acceptance on the real corpus stays with the central session.

## What was wrong (reproduced in a real browser)

Held boxes make the document tall and stable at once, so the browser's own restore (and the F2 restorer) put the person at a **number** early. When the page's reads then came back late, failed, came back with fewer items or with more, the held boxes above the reading place collapsed or grew, nothing compensated (the restorer keeps native scroll anchoring off for its hold), and the person was thrown away from the place they were reading: **1282 px** (every read fails), **1044 px** (fewer cards, a strip that disappears), **504 px** with CLS 0.50 (more cards than held). A second defect surfaced in the real app: the hook left the held-height variable on the node, so a list that settled with fewer items than the held box had the hold attribute come back with the old variable and **re-expanded to its old height** (the flapping that made failed returns worse than the base).

## What was changed

- **`src/lib/scrollRestore2029.js` (the reading place).** Blocks marked `data-scroll-anchor` remember the block under the viewport top, the distance below its top and its height (plus the block before it as the fallback), next to the unchanged number (`sod2029-scroll-anchor-v1`). On a return that place is restored in the same block: placed as soon as the block is in the page (a content-relative place needs no stability wait) and followed through the hold — every frame and from a `ResizeObserver` (after layout, before paint) — while content above shrinks, grows or vanishes. A block that is gone falls back to the block before it, then to the number; a page that got shorter clamps to its end; a block that shrank puts the person at its end, never past it.
- **Preserved (F2 and the tuned waits):** number restore for every unmarked page, forward/back, hash/anchor locations untouched, new entries start at the top, a clamp from a swapped page is not recorded, bounded waits (3 s force, 4 s give-up), hold 2.5 s quiet / 8 s cap with anchoring paused during it and restored after, immediate cancel on touch / wheel / key / pointer (following stops with the restore). The 15 existing restorer tests pass unchanged.
- **`useSettledBox2029.js`:** the held-height variable is dropped once a list settles with another item count.
- **Home / gateways / signup:** attribute-only `data-scroll-anchor` on the hero slot, the notices, every Section and Reveal, each gateway, the dimension strip and the signup block (unique ids, tested). No other file marks anything, so every other 2029 route is untouched by the new path.

## Tests (isolated; no network, no writes)

| test | result |
| --- | --- |
| `test/scroll-return-2029.test.mjs` — browser harness with the real hook and the real restorer driven like `RouteEffects2029`, history through `pushState`: late same-size reads, shrinking, growing, reads above fail (300 / 1500 ms), every read fails (300 / 1500 ms), only the block being read fails, a deliberate swipe 150 ms after Back (no programmatic scroll after the touch, anchoring back on), a width change while settling, and an unmarked page identical to the previous restorer on four scenarios | **11/11**; the same file with the restorer of `e3498434` (`SCROLL_RETURN_RESTORER`): **7 of 11 fail** (`results/scroll-return/scroll-return-tests-at-e3498434.txt`); the other four are guards that must keep passing |
| `test/scroll-restore-2029.test.mjs` — 15 existing + 12 new (target rule, recording/persistence, plan, placing at once, following a collapse and growth, ResizeObserver delivery and disconnect, input stops following, missing block → previous block → number after the bounded wait, hold as before) | 27/27 |
| `test/home-settled-box-dom-2029.test.mjs` — + a list that settles with fewer items stays natural through later renders; the hook of `e3498434` re-expands it (negative control) | 7/7 |
| `test/home-scroll-anchors-2029.test.mjs` — who marks anchors, unique ids | 4/4 |
| Home + scroll + first gate line, together (13 files) | 124/124 |
| the other 19 isolation-gate source commands | 19/19 exit 0 |
| `npm run build` (Legacy + 2029); `npm run test:2029-bundle-budget` | build ok; 5/5, none skipped |

## What a person sees — real app, diagnostic input (`results/scroll-return/real-app-diagnostic/`)

Same tool and isolation as Part 1 (derived snapshot with synthetic images, not a performance corpus), 3 interleaved pairs, return whose reads fail from the Back phase on; B = the build of `e3498434`, N = this head. The reading block is the one under the viewport top at departure (here the story block); `final` is where its top ends relative to the viewport.

| return | CLS B → N | reading block |
| --- | --- | --- |
| normal | 0.024–0.042 → 0.024 / 0.026 (one N sample invalid: no visible departure control) | final position = departure position; anchor displacement 0 px (B: 5–7 px) |
| posts fail (`error`) | 2.914 / 0.984 / 0.987 → **0 / 0 / 0** | stays at its place; where the story shrank 384 → 110 px it ends at its end (−110) |
| posts empty (`empty`) | 0.987 / 0.844 / 0.987 → **0 / 0 / 0** | same |
| every REST read but the flags fails (`outage`) | 3.643 / 2.957 / 2.818 → **0.721 / 0.721 / 0.721** | stays at its place; see limitation 1 |

## Limitations and what is still open (not hidden)

1. **Content that disappears inside the viewport is a real change of what is in view, and counts.** The outage return (0.721) and the harness case where the block being read fails itself (CLS 0.598) are that: the reading place is kept, but the block's rows are replaced by a message and the blocks below move up in view. Collapses *above* the reading place no longer move anything (harness 0.038 residue, real app 0). CLS ≤ 0.1 is **not met** for a return whose own in-view content fails; that stays open (it would take reserved blank space, which is what was ruled out).
2. **The empty/unavailable cold Home** (Part 1 limitation 1) is unchanged on purpose: its two big contributors are the base's own design — the loading hero reserves 418 px on phones and becomes a natural 172 px unavailable hero (the base CSS says "No oversized blank hero reserve: its height follows actual source content"), and the notable strip arrives above the fold once the updates list is empty (reserving it without evidence would collapse on every failed read). This round removed the third contributor on returns (the re-expansion) and the collapse jump above the reading place. Cold empty/error stays 0.485 / 0.529 (base 0.59 / 0.588): below the base, above 0.1, open.
3. The restorer's new path exists only where blocks are marked (Home). Other routes are byte-for-byte on the old path (tested), so they neither gain nor lose.
4. The measurements are diagnostics on a derived structural input; the harness uses synthetic content. Acceptance (≥15 pairs, two fixed SHAs, the central corpus) and widths 1440/1920 remain NOT_RUN/BLOCKED as in Part 1. Per-frame samples in the runner can show a layout that was corrected before paint, so the runner reports the steady-state displacement and CLS, not frame jumps.

# Part 1 — continuation (head: see the task AFTER record; product commit below)

## Status against the three items of the continuation instruction

| item | status |
| --- | --- |
| 1a. CLS regression in the empty/failed Home | **fixed against the earlier candidate; not ≤ 0.1.** Cold empty 0.845 → 0.485, error 0.844 → 0.529 (base 0.59 / 0.588); outage base 0.273 → 0.214. The remaining shifts are the base's own (loading hero 418 px → unavailable hero 172 px, 0.14; the notable strip arriving above the fold, 0.31). Not changed: that is a design/content decision, see "Open decisions". |
| 1b. Releasing the held height on a width change while loading | **fixed.** The resize itself releases the hold and the loading slots are drawn at the new width in the same frame (no collapse and re-grow). Browser test with a negative control on the previous hook. Resize-while-loading CLS: 320 base 2.679 → 0.324 (was 1.155), 1440 base 0.443 → 0.128 (was 0.668). |
| 2. Visibility predicate | **done.** `composed` (DOM) and `usable` (visible, opaque, in the viewport, hit-testable; on a return the departure control) are separate. 10 negative controls first show that the previous predicate (v3) accepted each case, then that the current one does not; a further control does the same for the v2 predicate. Cold and Back. |
| 3. Evidence tool on the existing corpus format and isolation | **done.** `runner.mjs` v4 runs only under `scripts/ci-isolation/run.mjs` with `frozenSnapshot`, `requestPolicy`, `browserArgs`, `installTransportBoundary`, and the isolation-aware static server. It refuses the legacy corpus and any corpus with an undecodable image; an unmapped request or an undecodable image invalidates the sample; there is no empty-body fallback; full identifiers go to a private file, the evidence carries a count, a digest and shapes. No second replay/isolation mechanism, shared mechanism untouched. |
| Early input cancels the restore | **verified in the tool** (touch and `scrollTo` timestamps, samples where the touch arrives after a jump are invalid): in every valid sample the touch reached the page before any restore jump and **no jump followed it**, base and candidate (250 ms / 600 ms after Back). |
| 320 / 390 / 1440 / 1920 and three themes | 390 dark/light/parchment and reduced motion: measured. 320: measured (2 pairs, base 1 valid). **1440 and 1920: NOT_RUN/BLOCKED** (missing inputs below). |
| Stale classification expectations | **closed** in `test/home-build-and-classification-2029.test.mjs` (4/4); dedupe and category assertions kept, the limit/constant and the bounded card reader are asserted by their current names. |
| Acceptance (≥15 pairs on the central corpus, two fixed SHAs) | **NOT_RUN** — the central corpus is not reachable from this environment. A faster site is **not** claimed. |

## Commits (base unchanged: `7c3f43f39147c71508ed394363a2f98f140a5859`)

| what | SHA |
| --- | --- |
| first delivery (product + first evidence) | `e23dee274e28d184efcca8e598e9270efb4ae787` |
| continuation: product, tests, tool | `39d9804db9befaabb2522bda5db17d0514a9e819` |
| runner CLI tests, QUICK matrix mode | `82d3229205561ee565dcf053c2b06fcd94c960da` |

All measurements below used a build of `39d9804d` for the candidate (`git diff 39d9804d <head> -- src` is empty; a fresh `SOD_BUILD_TARGET=2029 vite build` was byte-identical to the measured build) and a build of the base `7c3f43f3`.

## What changed in the product (this round: 3 files, +54/−28 — `git diff e23dee27 39d9804d -- src`; the whole HomeV2 fix against the base is 7 source files, +289/−32)

- **Evidence-based reservation.** Loading slots (updates, the three gateways, the dimension strip) are drawn only from what this session already showed (`shownBefore`). A cold load reserves nothing, like before HomeV2, so an empty or failed read no longer collapses a speculative ~715 px reservation. The status line stays visible text when nothing else reserves the row.
- **Width release redraws the slots in the same frame.** `useSettledBox`: a viewport resize releases a hold taken for another width (`viewportChangedSinceHold`, one `resize` listener), and the mount-time/observer path releases it when the box's own width differs; both go through `release`, which re-renders the caller with `held=false` under `flushSync` (batched when called from an effect) so the caller's loading slots appear at the new width before paint.
- The first delivery's wiring is unchanged: `worldPending`, honest readiness markers, a held box is its own placeholder.

## Tests (all isolated, no network, no writes)

| test | result |
| --- | --- |
| `test/home-settled-box-2029.test.mjs` (pure rules, wiring and cold-load contracts) | 14/14 |
| `test/home-settled-box-dom-2029.test.mjs` (real Chromium; the hook of `e23dee27` as negative control: it leaves a collapsed box on the same width change) | 5/5 |
| `test/home-readiness-predicate-2029.test.mjs` (real Chromium; opacity 0 / 0.5, off-screen, 20% visible, covered, inert, content-visibility, departure control cases; v3 and v2 predicates as negative controls) | 19/19 |
| `test/home-evidence-corpus-2029.test.mjs` (admission over the shared decoder; the legacy corpus is refused and its 18 images are exactly the undecodable ones; safe miss digest) | 6/6 |
| `test/home-evidence-runner-2029.test.mjs` (the real command line under `run.mjs`: legacy corpus, a broken image, no complete departure post, missing/wrong SHA256, outside the isolation; source contract: no fallback body) | 6/6 |
| `test/home-build-and-classification-2029.test.mjs` | 4/4 (was 2/4 on the base and on the first delivery) |
| first isolation-gate line (`perf-execution`, `perf-replay-gate`, `early-primary-read`, `home-post-cards`) | 26/26 |
| the other 19 isolation-gate source commands (listed in `results/gates/isolation-gate-local-summary.txt`) | 19/19 exit 0 |
| `npm run build` (Legacy + 2029) and `npm run test:2029-bundle-budget` | build ok; budget 5/5, none skipped |

Not run (live or outside Home): `test-a3-client-correlation-live.mjs`, `package:research-run`, the person/people foundation tests.

## Measurements — structure diagnostics, NOT acceptance

Input: **`smoke-snapshot-2.json.gz`, SHA256 `78b1f82e8e7bb3b9df04228e51edb322d7b37cebe426d9d0f02697962aa38d8d`** — a local, shared-format snapshot derived from the legacy corpus (73 of its 106 keys that the flows request, bodies re-expressed as Base64, 12 images replaced by synthetic decodable images, 3 requests that the legacy runner answered with an empty body added as empty/`null`/empty-CSS rows). It exists to exercise the tool end to end under the shared isolation and to compare layout behavior of the two builds. It is **not** a performance corpus: no image, LCP or "the site is faster" conclusion follows from it, and it is not committed. Profile: Chromium 141, 390×844 DPR 2 touch, CPU ×4, 1.6 Mbps / 150 ms, fixtures with a 150 ms Node-timer delay, serviceWorkers blocked, guest identity, every request through `requestPolicy` (zero unmapped requests in every valid sample).

Quiet-machine runs (`results/continuation/quiet/`, interleaved pairs, paired median difference with a seeded bootstrap 95% CI):

| scenario | CLS base → candidate | usable (visible) | composed (DOM) |
| --- | --- | --- | --- |
| Back to Home, 15 pairs | 1.788 [0.91–2.49] → **0.027** [0.02–0.06]; CI [−1.92, −1.75] | 728 → 616 ms, −79 ms (−15%), CI [−185, −29] | 364 → 363 ms (−0.3%), CI [−42, +29] |
| Cold load, 12 pairs | 0.019 → 0.018 | 3571 → 3479 ms (−2.6%), CI [−136, +64] | same as usable |

Other readings of the quiet runs: Back `dgSettledMs` 581 → 616 ms (+6%, CI [−29, +114]: **not proven below +10%**); reads back 59 = 59; requests cold 65 = 65; the candidate's final Home is 7–8 px taller than the base's (7431 vs 7423) and the anchor ends 7 px from the departure position (base 0).

Diagnostic matrix, `QUICK=1` counts (`results/continuation/matrix/`, 1–5 pairs each; read as direction, not as statistics):

| scenario | CLS base → candidate |
| --- | --- |
| late data 150 / 900 / 1800 / 3200 ms | 1.967 / 2.490 / 2.516 / 1.984 → 0.029 / 0.030 / 0.015 / 0.024 |
| world gate answered late (2500 ms) | 1.256 → 0.033 |
| world gate closed on the return after it was open | 1.125 → 0 |
| light / parchment / reduced motion | 1.788 / 2.462 / 2.035 → 0.022 / 0.025 / 0.026 |
| width 320 / 390 | 2.111 / 1.773 → 0.035 / 0.031 |
| early touch 250 ms / 600 ms after Back | 2.552 / 0.913 → 0.020 / 0.029; no restore jump after the touch in any valid sample |
| viewport resized while the lists are held and loading, to 320 / 1440 | 2.679 / 0.443 → 0.324 / 0.128 (first delivery: 1.155 / 0.668) |
| cold empty / error / outage (all REST reads except the flags fail) | 0.590 / 0.588 / 0.273 → 0.485 / 0.529 / 0.214 (first delivery: 0.845 / 0.844 / —) |
| return with the return's reads failing: error / outage | 0.838 / 0.504 → **0.987 / 1.726** (see limitation 2) |
| width 1440 / 1920 | **0 valid samples, both arms** (missing inputs) |

## Limitations and dependencies (not solved, not hidden)

1. **Empty / failed cold Home is still above 0.1** (0.485 / 0.529 / 0.214). It is below the base now, but not within the threshold. The two big contributors are the base's own design: the loading hero reserves 418 px on phones and becomes a 172 px "unavailable" hero (0.14), and the notable strip arrives above the fold once the updates list is empty (0.31). Keeping the hero's footprint or reserving the strip would be design changes with blank space; left for ZURIEL.
2. **A return whose reads fail is worse than the base** (error 0.838 → 0.987; outage 0.504 → 1.726; 2 pairs). **Addressed in Part 0**: collapses above the reading place no longer move the person (error/empty returns 0, outage 0.721; what remains is content disappearing inside the viewport). Held boxes make the document tall and stable early, so the shared restorer jumps to the saved offset, and when the reads then settle empty the boxes (and the notable section) collapse above the reading position. The restorer keeps native scroll anchoring off for 2.5–8 s after its jump (`scrollRestore2029.js`, shared; not changed here), so nothing compensates. A fix needs a decision outside this scope: e.g. the restorer re-enabling anchoring when the document shrinks, or compensating `scrollY` for a collapsing box that is entirely above the viewport. Handed to the central session as a dependency.
3. **Resize while loading** stays above 0.1 (0.324 / 0.128). It is below the base (2.679 / 0.443) and far below the first delivery, but the reflow of the whole page at the new width is counted too; this is an artificial scenario.
4. **Time is not proven for every metric.** Back usable (−15%, CI excludes zero), Back composed (±8%) and cold load (upper bound +1.8%) support "no worsening above 10%"; Back `dgSettledMs` does not (+6%, upper CI +20%). The earlier first-delivery history (slot versions +7–22% slower) and one 4-pair cold-load run at +11% (a transient, not reproduced in 12 quiet pairs) show how much lab noise there is. Acceptance needs ≥15 pairs on the central corpus with two fixed SHAs.
5. The markers read `empty` for a failed read because the shared readers swallow errors; `error` is only set on a rejection. Unchanged, and not fixable in Home alone.
6. One departure route, mobile core, lab replay, derived structural input. Images, LCP and hosted behavior are not covered.

## Open decisions for ZURIEL / the central session

- Empty/failed Home: accept the base's collapse (now smaller), or choose a footprint for the unavailable hero / a reservation for the notable strip.
- Failed return: done in Part 0 (reading-place restore, extended scope); the rest is limitation 1 of Part 0.
- Run the acceptance (`run-matrix.sh` without `QUICK`, ≥15 pairs for the core and the cold load) on the central corpus, then widths 1440/1920.

## Missing inputs (exact)

- **Central corpus** (`/workspace/private-perf-20261016`, SHA256 `b01158bf7a650c8c6b1862fe5bc2f3a3e7fcaf8a82addeff393999a4535cafae` as named in the handoff): not reachable from this environment; nothing was exported, copied or re-collected. Also named by the handoff as missing even there: the `matrix-506` post result and the language-paths icon rendition.
- **Widths 1440 and 1920** (and 320 with `--post auto`): the smoke input lacks the requests the page makes at those widths — digest `e9cf22a8be75a470c50b8794d564c94717328aa52e2b3a07d7ec80a7ea1a61e5`, shapes: `GET …/rest/v1/channel_updates?channel&image_url&limit&or&order&select` and `GET …/storage/v1/object/public/gallery/sod1820/broadcasts/logo-or-geula.png` (the handoff says both exist in the central corpus); and the departure post that those widths show has to have a complete body in the corpus (`--post auto` takes the first visible Home control whose body is complete, or `--post /post/<slug>`). Full identifiers: `/tmp` private file of the run, never committed.
- A corpus whose images all decode (the tool refuses anything else) and exact SHA256 (`SOD_CI_SNAPSHOT_SHA256`).

## How to run

```
SOD_CI_SNAPSHOT_SHA256=<sha256> node scripts/ci-isolation/run.mjs -- node docs/perf-evidence-20261016/home-stability-v3/runner.mjs --fx <snapshot.json.gz> --arms A=<dist-base>,B=<dist-candidate> --pairs 15 --mode back --post auto --out out.json
FX=<snapshot> SOD_CI_SNAPSHOT_SHA256=<sha256> SCRATCH=<dir with dist-A,dist-B> OUT=<dir> ./run-matrix.sh [group …]     # QUICK=1 for the diagnostic counts
node summarize.mjs --in out.json --base A --cand B --md out.md
```
Builds: `SOD_BUILD_TARGET=2029 npx vite build --outDir <dir> --emptyOutDir` from the exact commits.

SHA256 (first 8): `runner.mjs 6bbe386a`, `readiness.mjs c823e728`, `fixtures.mjs 1fdb92cb`, `summarize.mjs 90cb3400`, `run-matrix.sh f96d4442`. Historical copies kept as negative controls: `readiness.v3-e23dee27.mjs`, `test/fixtures/settled-box-harness/useSettledBox.e23dee27.js`.

## Automatic triggers (checked before push)

No workflow under `.github/workflows` has a `push:` trigger (PR-path based, scheduled or manual; `post-deploy-canary` only on a successful Production deployment). Pushing the branch without a PR starts no CI run. No live service was called; every request in the measurements went through the shared policy, and the tests send nothing.

---

# Part 2 — first delivery (`e23dee27`), kept as history

> Its numbers come from the legacy corpus (`fixtures-combined.json.gz`: UTF-8 string bodies, 18 undecodable images) and from the v3 runner, whose predicate counted a transparent or off-screen card as usable and which answered requests the corpus could not (empty script/CSS for other hosts, `{}` for `/api`, 204 for any non-GET). They stay as a record of what was seen then; do not use them as acceptance.


Task key `CLAUDE_PERF_HOME_STABILITY_V3_20261016` · branch `ccr-cb3840b9-7iz2j1` · reports to ZURIEL only (passive record, no dispatch/ACK).
Scope: Home + direct dependencies. Not touched: number engines, media reader, CI, live flags, `supabase.js`, the calculator drawer.
State: **BRANCH-ONLY**. No PR, no CI run, no merge, no deploy. Release stays with ZURIEL (`תעלה`).

## Base and commits

| what | SHA |
| --- | --- |
| base `gpt/numeric-media-publication-20261016` (re-fetched at the end of the work, not advanced) | `7c3f43f39147c71508ed394363a2f98f140a5859` |
| HomeV2 experiment, code (read as input, not in the base) | `36c96bcf9e7238c360dc3fbf3c5df16611e9835c` |
| HomeV2 experiment, evidence + runner v2 (input) | `1270d1faf0f323cb89687003fcf3fd80677e545c` |
| faithful port of the experiment onto the base (arm `X` in the measurements) | `0264aaf45db67f699f937c3adb85d4236879f50e` |
| gaps closed (worldPending, width release, honest markers) | `cb679c9f1421334e08421f85e63ae1433a7baefd` |
| held box reads no layout at mount | `5f48fa9650f484f4e050472ff9d0a06983c93835` |
| **final product commit (arm `B`)** | `1424890d46e1947cd41f00f8e4a5e4509f50e5bc` |

Everything after `1424890d` is evidence tooling, tests and this directory only: `git diff 1424890d HEAD -- src` is empty, and a fresh
`SOD_BUILD_TARGET=2029 vite build` of the head is byte-identical (`diff -rq`) to the `dist-B` that every final measurement used.

## What was missing in the base, and what was fixed

The base had none of HomeV2 (`useSettledBox`, loading slots, held boxes). The experiment was ported and then the three remaining gaps were closed:

1. **`worldPending` wiring.** `Home2029Page` now passes `worldPending={worldFeature.loading}` (the gate's own loading state from `useFeatureState("lock_world")`);
   `HomeComposition2029` no longer falls back to the projection's `loading`. While the gate is unresolved the notable strip waits instead of guessing;
   a gate that resolves closed releases the strip with nothing ever shown.
2. **Width change in `useSettledBox`.** The hook moved to `useSettledBox2029.js`. A remembered height is only a candidate at the viewport width it was
   remembered at, the ref callback reads **no layout** (a forced layout per instance at commit delayed the first read of Home by ≈70 ms at CPU ×4),
   and the first `ResizeObserver` callback (after layout, before paint) releases the hold when the real box width differs, and again on any later width change.
   Rotation / resize / breakpoint no longer leaves a stale `min-block-size`. Users of the shared hook: only `HomeComposition2029` and `DiscoveryGateways2029`
   (enforced by `test/home-settled-box-2029.test.mjs`); both were adapted and measured.
3. **A usable-content marker that tells content from skeletons.** `data-h29-primary` (`loading|ready|empty|error`, root of Home) and `data-dg29-state`
   (discovery gateways) are exposed from `src/lib/homeReadiness2029.js`; a loading hero or NBSP slots are never `ready`. The runner does not trust the
   marker alone: `readiness.mjs` is a structural predicate (visible, not `.is-loading` / `aria-hidden` / `aria-busy` / hidden, ≥4 meaningful characters,
   an actual `/post/` link). A browser regression test shows the v2 predicate calls a skeleton-only Home usable while v3 does not.

Plus: a **held box is its own placeholder** — loading slots are rendered only when no remembered box already reserves the space (slot DOM at mount
was the remaining cost, see "Usable-time history"); `DiscoveryGateways2029` can no longer hang in loading when all readers reject (`failed` state).

Files (`git diff --stat 7c3f43f3 HEAD -- . ':!docs'`): `useSettledBox2029.js` (new), `homeReadiness2029.js` (new), `HomeComposition2029.jsx`, `DiscoveryGateways2029.jsx`,
`Home2029Page.jsx` (+1 line), `homeComposition2029.css`, `discoveryGateways2029.css`, two new tests. 9 files, +497/−32.

## Tests (all isolated: no writes, no live service calls)

| test | result |
| --- | --- |
| `test/home-settled-box-2029.test.mjs` (11: width rules, store, readiness states, worldPending wiring, hook contract/no layout in ref, slots only when not held) | pass |
| `test/home-readiness-predicate-2029.test.mjs` (7, real Chromium, static markup; includes the negative control against the v2 predicate) | pass |
| `perf-execution`, `perf-replay-gate`, `early-primary-read`, `home-post-cards` (the 44 tests of the first isolation-gate line) | 44/44 |
| isolation-gate source tests run locally (19 commands: home pulse, cheap hardening, 2029 isolation, system frame, server SEO/AI, canonical contract wiring, world/topic/researcher/number-preview/control-plane surfaces, experience-context, entry-learn, my-workspace, legacy containment, world convergence, source-section/world/feed/hero tests, replayable golden, server capability gate) | 19/19 exit 0 — `results/gates/isolation-gate-local-summary.txt` |
| `npm run build` (Legacy + 2029) and `npm run test:2029-bundle-budget` | build ok, budget 5/5 — `results/gates/npm-run-build.log` |
| `test/home-build-and-classification-2029.test.mjs` | 2 of 4 fail **identically on the pristine base `7c3f43f3` and on the candidate** (`Home 2029 never repeats featured, story, updated or arrived Post identities`, `Dimension Five is a video-series category, never a writer identity`); stale expectations, not touched here |

Not run locally (live or out of scope): `test-a3-client-correlation-live.mjs` (live), the person/people foundation tests, `package:research-run`; they do not touch Home.

## Measurement method (corrected tool)

`runner.mjs` v3 + `readiness.mjs` + `summarize.mjs` (SHA256 below). Profile: Chromium 141, mobile 390×844 DPR 2 touch, CPU ×4, CDP 1.6 Mbps down / 750 kbps up / 150 ms RTT,
fixtures frozen from `docs/perf-evidence-20261015/scroll-integration/fixtures-combined.json.gz` (106 keys, SHA256 `3eaf939f…ba49cc` in every `profile`),
Supabase replay delayed 150 ms with Node timers only, **writes answered 204 and never sent**, a fixture miss invalidates the sample. CLS is the session-window
maximum (gaps <1000 ms, span <5000 ms), not the sum. Time-to-usable is the first moment the structural predicate holds. Arms are interleaved per pair;
summaries give per-arm median/range and the paired median difference with a seeded bootstrap 95% CI. `A` = base `7c3f43f3`, `B` = product commit `1424890d`,
`X` = the faithful port `0264aaf4` (used where the experiment's own behavior is the reference).

SHA256: `runner.mjs bde2a109…`, `readiness.mjs 5190aff5…`, `summarize.mjs 9721bd88…`, `trace-summary.mjs 2d4d44ed…`, `run-matrix.sh 79bc95b7…`.
Re-run: build each arm with `SOD_BUILD_TARGET=2029 npx vite build --outDir <dist-X> --emptyOutDir`, then `SCRATCH=<dir with dist-A,dist-X,dist-B> OUT=<raw> ./run-matrix.sh [group …]`.

## Results — final candidate B vs base A (`results/final/`)

Targets: CLS ≤ 0.1 and time-to-usable not worse by more than 10%. Thresholds were not changed.

| scenario (pairs) | CLS A → B | usable A → B (paired median diff, 95% CI) | notes |
| --- | --- | --- | --- |
| **Back to Home, clean (10)** | 1.858 [0.837–2.401] → **0.006** [0–0.014] | 418 → 333.5 ms (−79.5, −20%, CI −236…+134) | reads 55 = 55; anchor displacement ≤8 px; B faster in 7/10 pairs |
| Cold load (7) | 0.021 → 0.019 | 3686 → 3508 (−4.8%, CI −393…+87); LCP 3620 → 3436 (−5.1%); FCP equal | requests 60 = 60 |
| Late gate, 2500 ms (4, with X) | 1.297 → **0.010**; X 0.772 in all 4 (proves the `worldPending` gap) | 573 → 355 | |
| Gate resolves closed after it was open (3, with X) | 0.902 [0.901–1.507] → **0**; X 0.772 | 331 → 325 | no notable card was ever exposed |
| Late data 900 ms (2) | 2.398 → **0.011** | 1091 → 1107 (+1.5%) | n<3 for CI |
| Late data 3200 ms (2) | 1.917 → **0.009** | 3536 → 3418 | A anchor displaced 2030 px; B 8 px |
| Light / parchment / reduced motion (1 each) | 2.344 / 1.706 / 1.846 → **0.014 / 0.014 / 0.011** | 803→277 / 331→320 / 413→425 | single pairs |
| Interrupt: swipe after Back (2) | 1.83 → **0.009** | 425 → 585 (noisy, 2 pairs) | no pull-back in either arm; the swipe lands 2.4–3.4 s after Back, so this does **not** prove cancellation of an early restore |
| Resize during hold, 320 (2, with X) | A 2.0 · X 0.13 · B 1.155 | — | see limitation 2 |
| Resize during hold, 1440 (2, with X) | A 0.452 · X 0 · B 0.668 | — | see limitation 2 |
| Empty / error cold load (3 + 3) | A 0.59 / 0.588 → **B 0.845 / 0.844** | not usable in either arm (no content) | **regression, see limitation 1** |
| Width 320 / 1440 (1 each) | **invalid in both arms, not claimable** | — | missing inputs below |

Existing themes: dark (default), light, parchment, reduced motion — all four ≤0.014 on return.

### Usable-time history (honest account)
The first HomeV2-style slots (X, B1, B2) made the first read and "usable" slower than base: +7% … +22%, median ≈ +38 ms over 5 runs; main-thread traces showed
the cost in forced layouts from ref callbacks (fixed, `5f48fa96`) and then in the slot DOM itself (fixed, `1424890d`: a held box is its own placeholder).
After that: B3 (no slots) −0.4%, B4 (final) 8 pairs −28% (noisy machine, A median 749 ms) and the clean 10 pairs −20%. **No worsening was detected for the final
candidate, but every CI is wide (±150 ms or more), so "not worse than 10%" is not proven at 95%.** Recommendation: the central session re-measures ≥15
interleaved pairs on a quiet machine with the same tool and the SHAs above. Iteration summaries: `results/iterations/`.

## Limitations — things that are not solved or not proven

1. **Empty/error Home gets a larger CLS than base** (0.845 vs 0.59; both already over 0.1 in base). Reserved slots (~715 px) collapse to the empty message,
   where base collapses a ~200 px skeleton. No product fix was made for it (design/content decision: the empty state would need its own reserved height or the
   slots would have to be smaller). The empty/error cold-load markers read `empty` in both cases because the readers swallow errors; `error` is only
   set when a reader rejects. No skeleton residue, no page errors, same visible text as base.
2. **Resize while a box is held** is an artificial scenario (viewport changed while data is late). The port X keeps a stale held height (8/8 stale; up to 318–439 px
   of blank space); B releases it (0 stale). Price: B shows a collapse shift — 320: B 1.155 vs X 0.13 (base 2.0); 1440: B 0.668 vs X 0 (base 0.452, reflow of the whole page dominates).
   At 1440 B is worse than base in this artificial case.
3. **Widths 320 and 1440, back-return: not measured** (both arms invalid; the data below is missing from the frozen fixtures). The 320 B CLS 0.1001 vs 2.187 in the invalid sample is not a claim.
4. Final document height differs from base by +7/+8 px on Home (7351 vs 7344) and the anchor ends 8 px from where base leaves it; reduced motion 0–1 px.
5. One route (`/post/chibur-bein-hasafot-mafteach-lagan` departure), lab replay with frozen fixtures, mobile core. `useSettledBox` memory is per session by design (a first visit has no remembered box and loads as base: cold-load requests 60 = 60).
6. The comparison is lab data (CPU ×4 throttle noise; some pairs ≥ n=2). It supports the CLS result strongly (A 0.8–2.4 vs B ≤0.014 in every valid sample) and does not by itself settle small time differences.

## Exact missing inputs

- Private corpus `/workspace/private-perf-20261016` does not exist in this environment. It was not re-collected and nothing was uploaded.
- Width 320: `GET https://linswmnnkjxvweumprav.supabase.co/rest/v1/posts?select=*&slug=in.(matrix-506)&limit=1` (at 320 the departure post is `/post/matrix-506`, not in the fixtures).
- Width 1440: `GET https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/broadcasts/logo-or-geula.png` and
  `GET https://linswmnnkjxvweumprav.supabase.co/rest/v1/channel_updates?select=id,text,image_url,thumb_url,created_at,priority,credit,expires_at,link_url&channel=e…`
  (key truncated at 160 characters by the runner log; the full key is in `results/final/width-1440-AB-1pair.json.gz` → `runs[].missKeys`), and the 1440 layout has no really-visible Home post control for the departure click.
- Fixtures for 320/1440 must be captured by the owner of the corpus (read-only, no writes) and added to the frozen set; the runner already supports `--width/--height`.

## Automatic triggers (checked before push)

No workflow under `.github/workflows` has a `push:` trigger (they are PR-path based, scheduled, or manual; `post-deploy-canary` only runs on a successful Production deployment).
Pushing this branch without a PR starts no CI run. No live service was called by any test or measurement; writes were answered locally.

## Layout of this directory

`runner.mjs`, `readiness.mjs`, `summarize.mjs`, `trace-summary.mjs`, `run-matrix.sh` (tooling) · `results/final/` (candidate B vs base, every scenario; summaries, logs, gzipped raw runs,
including the invalid `gate-closed-AB-2pairs` run that applied the closed gate to both phases and was replaced by `gate-closed-after-open-AXB-3pairs`) · `results/iterations/` (design history, builds X/B1–B3, raw trace summary) · `results/gates/`.
Raw Chromium traces (12 files, ≈5 MB) are not committed; `results/iterations/trace-summary-700.json` holds their summary.
