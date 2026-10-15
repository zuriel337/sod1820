# Cold measurement instrument repair — 2026-10-15

Status: IMPLEMENTED · TESTED · BRANCH_ONLY · PR_READY. Local instrument/replay gates PASS. This repairs measurement reliability. It makes **no claim that the site became faster**.

## Scope and provenance

- Exact starting branch: `gpt/perf-wave2-integration-20261015` at `14e239b47e5ec6b95eaad4e1b368520512642217`, verified by remote `ls-remote` before creating the isolated worktree. No alternate base selected.
- Current `origin/main` instructions and owner map read at `503b52ef169b6e51f967187491398d153090aa45`. Main, public production and the performance candidate are different versions. None was moved or deployed here.
- Task key: `GPT_PERF_COLD_MEASUREMENT_20261015`. Canonical project `linswmnnkjxvweumprav`, bounded `public.work_log_current` read using the general Supabase connector; no dedicated read-only connector was available. Active coordination v17 / Traffic v11 / work-log authority v2 checked. Historical AFTERs `925f50a3-2a23-4bdc-b5c9-647a6254cc23` and `2b5160bc-9fea-41c1-8ac4-eba766691245` resolve old overlapping claims. No active cold-measurement writer found.
- Passive BEFORE to ZURIEL: `e9fed95a-7c0b-4f4b-b993-92449dbc8342`; dispatch kind/state NULL. No session/agent activation or ACK wait.
- Write scope: the cold tool and focused helpers/tests under `scripts/perf-execution-2029`, plus this new evidence directory. Product, RUM, HomeV2, navigation tool, thresholds, historical fixtures/baselines, workflows, permissions, switches and product DB are unchanged.

## Defect and proof

The old route handler waits for `page.evaluate(performance.now())` before starting the fixture delay. A busy renderer therefore controls the simulated network delay. Merely replacing that value with an unaligned Node timestamp would corrupt `read.start - navStart`.

`measurement.browser.test.mjs` extracts and executes the **exact production route callback**. It intercepts a real browser fetch, pauses the actual renderer with the DevTools debugger, and requires the real `route.fulfill` to finish before the renderer resumes. The 150ms timer runs in Node. Cleanup resumes the renderer even on failure.

- Unmodified base callback: FAIL, `Fixture waited for the blocked renderer` (1200ms deadline). See `raw/renderer-old.txt`; source is read unchanged using `git show 14e239b4:scripts/perf-execution-2029/measure.mjs`.
- Corrected callback: PASS, real network fulfillment about 157ms while the renderer remains paused. See `raw/renderer-fixed.txt` for source SHA, measured timing and calibration uncertainty.
- Browser tests also prove time alignment across new documents and SPA navigation, reject shell/skeleton-only readiness, reject the wrong post slug and accept genuine short source text. The old `stage.innerText.length > 800` predicate reports a padded shell ready; the new predicate rejects it.

## Profile and definitions

Every final report declares `measurementProfile.version = cold-replay-v2` plus explicit clock/readiness/CLS/observation/collection definitions; the complete profile must match, not only the version string. Mixed v1/v2 or unknown profiles are rejected by the existing comparison gate. Unversioned historical artifacts remain readable as explicitly `legacy-unversioned-v1`; their files are preserved. Same-version historical validation is not a retroactive endorsement of their definitions.

**Time:** five pre-navigation round trips calibrate Node monotonic time to `browser.performance.timeOrigin + performance.now()`; retain the smallest round trip. Handlers synchronously stamp the controller's request observation time, without a renderer call. After collection, subtract the measured document's `timeOrigin` to keep `read.start` on the browser document axis. `firstPrimaryReq` subtracts `navStart` only after that conversion. `clockUncertaintyMs` records half the selected round trip. This bounds clock alignment, not protocol-delivery latency or Node event-loop scheduling; it is an observation timestamp, not an exact browser fetch-start timestamp.

**Readiness:** `shell` means a rendered main region; `ready` means usable primary content, separately:

- Home: rendered non-loading hero/card, populated title and actual post destination; a generic link or skeleton is insufficient.
- World: admitted story feature with populated heading/source metadata and source action; an empty feature wrapper is insufficient. Existing product code mounts this feature only after its primary projection exists.
- Post: matching `data-post-slug`, populated title and actual `.sod29-reading-source` text. Boilerplate elsewhere is insufficient. Image-only posts would need a separately specified readiness policy.

`backgroundSettled` is the observed **current request-lifecycle** checkpoint after primary readiness (no active requests and 500ms network quiet), **not proof that all background/deep work is complete**. `lastRestEnd` is the last REST completion observed at collection and can be later than that quiet checkpoint. `readsObservationEnd` is the controller snapshot boundary and `observationEnd` is the following browser collection time, after the additional 1000ms wait. `pendingFixtureResponses` counts response handlers still active at the snapshot boundary; such samples cannot certify complete read-count comparisons. Future timers, deferred interaction work and deep enrichment remain outside any completion claim. For SPA mode FCP/LCP are NULL; the cold LCP budget refuses to certify SPA navigation and directs it to the existing navigation gate.

**CLS:** `cls` is now the maximum session-window sum of layout-shift entries without recent input: successive gaps strictly below 1000ms and total span strictly below 5000ms. Tests cover separate clusters, recent input and both exact boundaries. `layoutShiftSum` preserves the distinct sum diagnostic and `layoutShifts` preserves timestamps/values/input flags. This uses standard session-window aggregation **within the observed lab window**, not complete page-lifetime field CLS, p75, BFCache acceptance or a CWV release seal. Reference: [GoogleChrome/web-vitals v5.1.0 LayoutShiftManager.ts:23](https://github.com/GoogleChrome/web-vitals/blob/v5.1.0/src/lib/LayoutShiftManager.ts#L23), which uses the same input exclusion and strict 1000/5000ms boundaries.

## Replay conditions and evidence

Production build served by the existing static Brotli server; no dev server or hosted deployment used. `npm ci --ignore-scripts` followed by `npm run build` builds Legacy and 2029; only the built 2029 artifact is measured. The first attempt reused incomplete preinstalled dependencies and failed to resolve `@react-three/fiber`; the clean locked install resolved it, without package/lockfile changes (`raw/setup-build-failure.txt`, `raw/build.txt`). The original build stdout is preserved byte-for-byte in `raw/build-original.txt.gz`; the readable text copy removes trailing whitespace only.

Mobile: Chromium 151.0.7922.173, Playwright 1.56.1, 390×844, DPR2, CPU×4, 150ms RTT, 1.6Mbps down / 750kbps up, dark theme, cold fresh context, disabled HTTP cache, service workers blocked. This browser differs from historical Chromium 141 measurements; it is another reason those numbers cannot be compared directly.

A new bounded anonymous public-read snapshot was captured and completed with the unchanged native-image capture tool, then frozen before replay. SHA is in `build-receipt.json` and every replay report. The same snapshot and exact built artifact are used for both repetitions. No historical snapshot, response payload, baseline, numerical threshold or CI budget was changed. Raw upstream bodies remain under private local scratch storage and are not committed. Per-read statuses, hashes, counts, errors, misses and blocked paths are in the committed reports.

Analytics/auth/table writes and non-allowlisted RPCs are intercepted **before the first navigation**. Replay cannot fall through to an upstream read or write. Six negative write cases test the actual installed guard. Fresh contexts and service-worker blocking prevent interception bypass. Journal BEFORE/AFTER are the only authorized live writes.

## Additional race found during validation

The first two seven-sample working runs exposed a late-response race: live `reads` arrays were appended after their in-place epoch→document conversion, even during final renderer collection/teardown. For example Home sample 5 declared 21 reads but serialized 23, including two epoch timestamps; sample 6 declared 25 but serialized 26. Two World samples also leaked epoch timestamps. The initial structural gate missed this. All original intermediate files and that initial gate result are preserved under `raw/intermediate-*`; they are **not accepted measurements**. The strengthened final gate rejects them (`raw/intermediate-final-validation.json`).

The final instrument freezes controller reads/errors/misses and pending response count **before** the final renderer query, then converts a copied array without exposing it to late handlers. A regression test appends a delayed response and mutates the active array after collection; the sample stays fixed. Validation now rejects inconsistent counts or timestamps outside the document observation window. The final profile includes the immutable-collection definition, distinguishing these working drafts from the accepted instrument commit. Remaining finite-window/background variability is explicit rather than called complete background work.

## Current network-quiet correction

The first immutable-snapshot runs (instrument commit `70385dfc37e4028703850f0164822be8b518d758`, files `raw/pre-quiet-*`) correctly exposed pending background responses rather than mutating the finished sample. The matched budget failed closed. The extension experiment also failed: 9 responses were still pending; none of the six delayed trace failures had reached the observation window, and READY→lastREST was only about 410ms. These original failures are retained without altering the thresholds or snapshot.

Investigation found a measurement defect: Playwright `waitForLoadState('networkidle')` is a latched load state. Once reached, a later call can return immediately during a new burst of requests. `network-quiet.mjs` now subscribes to request/finished/failed events before navigation and requires the **current** active set to be empty for the same 500ms quiet period. The additional 1000ms observation wait remains unchanged. A real-browser test holds a late response after initial networkidle: the legacy call resolves while it is active, whereas the new observer waits for its completion and quiet period. This implements the intended checkpoint; it does not increase delays, rewrite fixtures, weaken the +100ms/10%/CLS gates or change product code. Remaining future work beyond the bounded observation is still not declared complete.

## Results

Final source commit: `3896ceb6cbd708d3c7fa09e976b0a38a15372d83` on `gpt/perf-cold-measurement-20261015`; the evidence commit changes only this directory. Product source remains exactly the prescribed `14e239b4` base.

- PASS: 25 focused tests (including four real-browser tests), 36 image/source tests, 16 native-image browser cases, both production builds, built graph/source isolation and all 5 bundle-budget tests.
- PASS: two final seven-sample runs per Home/World/Post, **42 samples total**, identical frozen snapshot/build/profile. Zero runtime errors, fixture misses, pending fixture responses at collection, count mutations or out-of-window timestamps. Both replay-validity gates, unchanged matched regression budget and unchanged delayed/failed-extension gate pass. Six intentional trace failures are observed after primary content readiness. Mixed historical/current profiles are rejected.
- NOT MET: the existing 2.5s cold LCP goal on all three routes in this lab. This is not overall product or release acceptance. Historical failures are retained and explained above; they were fixed through instrument code and re-measured without changing the snapshot or ceilings.

| Final first run, median | READY ms | LCP ms | REST reads | observed session-window CLS |
|---|---:|---:|---:|---:|
| `/` | 4585.0 | 4828 | 57 | 0.001206 |
| `/world` | 5551.4 | 5684 | 45 | 0.036946 |
| `/post/seventh-to-tenth-sefirot-2027` | 4228.9 | 4468 | 4 | 0.000077 |

The second run measures the same application; differences are repeat observations, not a product speed gain. Raw samples/ranges, gate outputs, source/build/fixture hashes and intermediate failures are retained.

Final replay/gate summary is recorded in `results.json`; raw logs/reports are in `raw/`. The repeated seven-sample run tests instrument repeatability on identical product code; it is not a product A/B improvement experiment. Existing regression budgets remain 1.1 timing ratio +100ms, zero additional REST reads and CLS≤0.1. Any failure is retained rather than adjusted away.

## What must be measured again

Re-run **both sides with the corrected runner**, same exact build identities, browser, snapshot, theme, device and network conditions for every cold-runner READY/first-primary/last-REST/request-count/CLS timing comparison relied upon for acceptance. Renderer-dependent dispatch can perturb even paints and downstream work; do not relabel historical paint numbers as v2 or subtract an estimated correction. Re-capture conditions when data/browser/build changes; freeze the union before matched replay, without editing responses to pass. Historical image byte/source-fidelity evidence and independent navigation/RUM measurements are not automatically invalidated by this cold-runner defect; judge them under their own instrument/version evidence. No speed savings from old experiments are added together.

The independent HomeV2 readiness and action-shift definitions need their own repair and matched re-run; exact source links and required acceptance cases are in [homev2-handoff.md](homev2-handoff.md). That runner and all Home/product files were left untouched. The hosted helper also retains legacy readiness/shift-sum definitions and needs its own versioned follow-up before being compared to v2. Actual member/admin, Hebrew-post/World→Topic/Number journeys, physical Israel phone, hosted exact-candidate and field INP/RUM acceptance remain separate follow-up work, not delivered or dispatched by this task.

## Reproduction

Use Node 24 and the recorded Playwright/browser versions. Install Playwright in separate scratch storage; do not change the repository package files. `PLAYWRIGHT_DIR` and `PERF_CHROME` select those installations. In this workspace the frozen snapshot is retained privately with the task scratch files; its hash must equal `build-receipt.json`. Re-capture public data only for a newly declared matched experiment, never patch responses to make a failing sample pass.

```sh
mkdir -p work
node --test scripts/perf-execution-2029/measurement.test.mjs scripts/perf-execution-2029/measurement.browser.test.mjs test/perf-execution-2029.test.mjs test/perf-replay-gate-2029.test.mjs
# Negative control: this command is expected to exit 1.
git show 14e239b47e5ec6b95eaad4e1b368520512642217:scripts/perf-execution-2029/measure.mjs > work/measure-old.mjs
PERF_RUNNER_SOURCE=work/measure-old.mjs node --test --test-name-pattern='fixture response' scripts/perf-execution-2029/measurement.browser.test.mjs
node scripts/perf-execution-2029/measure.mjs --mode replay --dist /absolute/path/to/dist --fixtures /private/frozen-snapshot.gz --out /private/replay.json --runs 7
node scripts/perf-execution-2029/replay-gate.mjs /private/replay.json
node scripts/perf-execution-2029/replay-gate.mjs /private/first.json /private/repeat.json scripts/perf-execution-2029/replay-budgets.json
```

For the extension experiment add `--routes /world --runs 1 --extensiondelay 2000 --extensionfail 1`, then run the unchanged `extension-gate.mjs` against that output. `record.json` is the pre-image-completion capture; its capture-stage fixture SHA is not the final frozen union SHA. Every final replay and the build receipt must match the final union SHA. The evidence does not include upstream response bodies.
