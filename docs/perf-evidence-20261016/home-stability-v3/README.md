# HomeV2 speed and stability — focused fix, evidence (2026-10-16)

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
