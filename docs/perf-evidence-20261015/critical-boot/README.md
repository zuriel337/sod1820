# Critical route code preparation — 15 October 2026

Task `GPT_PERF_CRITICAL_BOOT_20261015`, personal branch `gpt/perf-critical-boot-20261015`.
Base: `5c147e4a2db97ac035227f7c6d15787849f61f6e` on `gpt/perf-candidate-packaging-20261015`.
Current-main instructions were read at `503b52ef169b6e51f967187491398d153090aa45`;
the candidate's older adapter was not used as current coordination authority.
Remote refs were checked through both GitHub and `git ls-remote`, then fetched.
Canonical plan: `11b44e87-e2bf-4928-aa55-10410b2ed475`; BEFORE: `f773a709-23f2-4634-a0cf-980ea195a76a`.
The World reentry writer's two files were never edited.

## Existing evidence and exact current chain

Reused `gpt/perf-causal-tests-20261014@c50c9099d9aed921bbcca33f98ed44c94dec890e`,
especially `docs/perf-causal-evidence-20261014/README.md`. No repeat of its
105-context factor sweep, SQL plans, backend stress tests or broad scan.
The handoff at `41bfae42c83847c95ff710bcb6b75f4263ff943d` was also read.

The current build follows this chain:

1. `2029.html` starts the existing anonymous primary public-post read, entry JS,
   entry static dependencies and fonts.
2. `main2029` mounts App/Auth/Router/Research. Home and Post reach their lazy
   imports in the initial render. World first mounts the existing `Locked`.
3. `Locked` waits for existing Auth and a fresh `getSiteFlags()` result. Only an
   allowed result renders `World2029Page`, which then starts its lazy import.
4. The route's static JS/CSS dependencies finish; the original page mounts,
   consumes its primary result and starts its unchanged extension readers.
5. The original content-ready marker and LCP are observed.

The baseline manifest has 35/46/38 static JS chunks in the Home/World/Post
closures respectively (including shared entry dependencies). These are graph
counts, not a claimed number of serial network waves. The raw resource timeline
records the actual requests and responses. The World route import starts after
the first flags response in the baseline. Home/Post have no equivalent outer
`Locked`, so their potential saving is discovery/scheduling only.

## One resource-preparation experiment, two scheduling revisions

The only product mechanism tested is native `modulepreload` of the **current
document's Home, World or Post static JS closure**. It does not evaluate the
modules, render children, fetch product data, cache flags, alter access rules,
preload CSS or traverse dynamic imports. Other routes and community preview
remain demand loaded. Unsupported browsers keep the existing lazy-import path.

- `6bb7af037e4f0493e31ea5408703d8767d5c93fc`: head-started preparation. Abandoned
  because route downloads competed with the entry before the gate could start.
  Its diagnostics are retained under `superseded/`; their timings are not used
  for acceptance because of the response-instrumentation defect described there.
- `6d649f488c0feb1e968111edc79a44d568517d0e`: same preparation, started from
  `main2029` immediately after scheduling the normal root render. Vite emits an
  inert JSON map; code preparation cannot compete with the initial entry
  download. No changes to App route elements, `MaintenanceLock`, Auth, readers,
  switches, ResearchProvider, World files, Home presentation, scroll or CI.

## Measurement conditions and limits

The final corrected matrix has seven interleaved pairs per route. Order reverses every iteration.
Each context starts cold, then uses real visible links (including the existing
mobile navigation drawer) and browser Back in the same document:

- Home → `/post/mah-kore-mokesh-har-naftali` → Home.
- World → Home → World.
- `/post/seventh-to-tenth-sefirot-2027` → World → Post.

390×844, DPR2, CPU4, static RTT150ms, 1.6×1024² bits/s download, Brotli HTTP;
Chromium 151.0.7922.173, Playwright 1.57.0, Node 24.19.0. The corrected matrix
fixes the wall clock to epoch-ms 1792065600000 in each fresh context for stable
date labels; performance.now and timers continue normally. This is a controlled
fresh-session model, not a wall-clock TTL-expiry test.
The causal harness's calibration is preserved: continued local static requests
are throttled; fulfilled responses are not. Audited anonymous public API/RPC
responses use an explicit 150ms delay, external assets 400ms. API/image body
bandwidth, real Postgres latency, Israel/mobile hardware and hosted speed are
not measured. Playwright interception disables the HTTP cache; revisits reuse
the document/module map and existing application state, not a warmed CDN claim.

One immutable response union serves both arms. Responses were captured from the
current application's bounded public flows, not synthesized empty RPC results.
Only catalog-checked STABLE, anonymous-executable product RPCs were forwarded.
Telemetry/write requests never reached upstream. One explicit model boundary:
`notification_prefs_guest_get_v1` is answered 204 in both arms, yielding the
same client `data || null` default as an empty fresh-guest preference row. It is
a read (live definition inspected), not counted as a measured product read or
permission test. Existing signed-in preferences are outside this experiment.
All blocked paths, product request identities/status/body hashes, resources,
timings and failures are retained. Fixture bodies remain outside Git.

Paired percentile bootstrap: 10,000 resamples of the difference of medians,
seed 18202029, 95% intervals. Small n=7; intervals describe this controlled
experiment. No historical timings are compared as if measured on this base.
The final handler never evaluates renderer JS while serving a fixture. Host
timestamps are converted to performance.timeOrigin after observation. Navigation
uses the trusted click event, not the start of Playwright's actionability wait.
Initial fixture-collection navigation selector failures were corrected to use
visible controls and excluded from timing acceptance; no timing sample was
discarded for being slow.

## Result — NOT ADOPTED; final product tree restored to the base

There is a real serial route-code bottleneck. The bootstrap-scheduled candidate
improves World and Post content readiness in this model. However, **improvement
without a cost to the next interaction was not established**, so the user’s
acceptance condition is not met. The final branch contains evidence only
relative to `5c147e4a`; both implementation revisions remain in Git history for
inspection. No unsupported runtime change is left enabled.

Corrected results, milliseconds; CI is candidate minus baseline:

| Measure | Baseline median | Candidate median | Paired 95% CI for difference |
|---|---:|---:|---:|
| Home content ready | 4025 | 3973 | [-224, +233] — no demonstrated gain |
| World source ready | 5132 | 4816 | [-1312, -54] |
| Post reading ready | 3968 | 3826 | [-197, -65] |
| Home LCP | 4140 | 4256 | [-276, +236] |
| World LCP | 5220 | 4916 | [-1576, -8] |
| Post LCP | 4220 | 4060 | [-184, -68] |
| Home → Post, trusted click to ready | 1047 | 960 | [-173, +94] |
| World → Home, trusted click to ready | 1171 | 1165 | [-72, +226] |
| Post → World, trusted click to ready | 1795 | 1852 | [-52, +198] |
| Back to Home | 514 | 506 | [-223, +191] |
| Back to World | 848 | 783 | [-367, +100] |
| Back to Post | 384 | 369 | [-53, +54] |

The World cold first flags response also moved 1866→1914ms (+48ms;
CI [+8,+122]). The optimization therefore does not make the fresh decision
earlier. Next-navigation medians alone would conceal the uncertainty: the data
still permit +226ms World→Home or +198ms Post→World regressions. This is **not
proof that those regressions occur**; it is insufficient evidence for the
requested no-regression acceptance. No further scheduling/refactoring sweep is
proposed or run in this task.

Cold CLS medians are Home .024→.020, World .037→.037, Post 0→0. The known Home
return/reveal variability remains and was not repaired. No stylesheet, geometry,
scroll restoration or World code was edited.

Cold JS totals (compressed response-body bytes): Home 460747→460994,
World 453514→453736, Post 356192→356422; JS request counts stay 51/48/39.
The few hundred added bytes are the bootstrap helper and resulting chunk
references, not a claimed byte saving. No duplicate JS request was observed.

All 42 corrected contexts have zero runtime errors, fixture misses or product
HTTP errors (4116 recorded public product-read responses). Request identity +
response hash + status sets match between arms for every flow; variable repeated
extension counts are preserved in the raw evidence, not called request savings.
Cold primary text hashes are identical across all 14 samples per route. Next
content hash sets also match: one Post state, one World state, and the same three
Home projection states in both arms. This does not close the separate Home
return-layout issue or constitute signed-in acceptance.

## Access checks

Both builds were tested with a **local fixture** that holds the fresh flags
response for 2000ms, once allowing World and once denying it. No live flag was
changed. `access-analysis.json` and raw files retain the full observations.

- Denied: both render the existing lock screen, never the protected World
  content. Both issue exactly two product reads: the pre-existing early public
  Flydubai Post read and the fresh site_flags read. No additional data read is
  introduced by preparation, before or after denial.
- Allowed with delayed flags: both render World only after the fresh response;
  both issue 45 product reads. No protected World projection read precedes the
  decision. Code may be downloaded earlier; it is not evaluated by modulepreload.
- The baseline already reads the independently public Post before flags via
  `startPrimaryReads2029`. This experiment did not add or fix that behavior and
  does **not** claim zero total pre-decision data requests.
- The denied candidate downloads 424903 JS bytes versus 176504 on the baseline:
  +248399 bytes with no World-content benefit for that visitor. In this single
  functional pair the flags response arrived at 4241 versus 3851ms; this is a
  diagnostic observation, not a seven-run denied-performance estimate.
- Real member/admin sessions were unavailable and were not fabricated. Their
  acceptance, hosted results and physical-phone behavior remain unverified.

## Validation, artifacts and reproduction

- Candidate: six helper/route-boundary tests pass; dedicated 2029 build,
  five bundle-budget tests, route-legitimacy and isolation checks pass.
- Restored final runtime: `npm run build` (Legacy + 2029), built-graph,
  five bundle-budget tests, isolation, route-legitimacy and `git diff --check`
  pass. The existing large-chunk build warning remains; no budget was weakened.
- `analysis.json`, `paired-corrected.json.gz`: accepted measurement methodology,
  **not** an accepted product change. `access-*.json*`: functional access evidence.
- `superseded/`: 42 head-scheduled + 30 interrupted bootstrap contexts using
  the defective renderer-coupled response clock. Preserved, excluded from the
  final timing conclusion. No historical or slow sample was silently deleted.
- Public response union SHA256:
  `629683f568a861b1b44de3956b55642844d04b2c222c1587fb4a273587e9a68a`.
  Bodies are intentionally outside Git; no credentials or private sessions
  are included in the report.

Build the exact baseline and `6d649f48` in separate worktrees with the lockfile
and `npm run build:2029`; copy their dist directories. Use this branch's harness:

```sh
node docs/perf-evidence-20261015/critical-boot/measure.mjs \
  --mode replay --base /absolute/baseline-dist --candidate /absolute/candidate-dist \
  --sha 6d649f488c0feb1e968111edc79a44d568517d0e \
  --fixtures /absolute/public-response-union.json.gz --out /absolute/paired.json \
  --nav 1 --runs 7 --fixedtime 1792065600000
node docs/perf-evidence-20261015/critical-boot/analyze.mjs /absolute/paired.json /absolute/analysis.json
```

Set `PLAYWRIGHT_DIR` (directory containing node_modules) and `PERF_CHROME` when
using different tool paths. Without the exact fixture file, a new bounded public
capture is a different data snapshot and must not be mixed with this comparison.
For access checks use `--paths /world --gate deny` or `--gate allow`, without
`--nav`. The final artifact paths and build/fixture identities are also recorded
in `provenance.json`.

Release advice: **DO_NOT_ADOPT_THIS_EXPERIMENT**. No merge, deployment, production
change, live product-DB write, flag change, dispatch or ACK. Only the authorized
passive BEFORE/AFTER coordination journal is written; the task scope is released
at completion. Central integration must not take the experimental commits as an
accepted performance patch.
