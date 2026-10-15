# Combined test build — branch `claude/combined-test-2029-20261015`

Test-only integration. Not merged anywhere; main, PR1100 branch and the shared integration branch untouched; no production deploy, no migration applied by this work, no live flag changed (DB switch `fx_number_lookup_page` OFF).

## Heads verified at integration time (fetch 15.10)
PR1100 `gpt/perf-execution-20261014` = `01ac7706` (unchanged) · switches `claude/sod-perf-continuation-838w4h` = `62fdfdca` (AFTER row 3748b63c, ownership released) · scroll `claude/scroll-navigation-2029-fix-oz90c0` = `4d315ea3` · main `503b52ef`. Ownership rescan: no active writer on App2029 / World2029Page / HomeComposition2029 / ControlPlane / runtimeSwitches after 3748b63c.

## Source of each change
| Content | Origin |
|---|---|
| Everything in PR1100 (early reads, bounded World/Home, native image, gates) | `01ac7706` (base of this branch) |
| Runtime switches registry + control page, fx_analytics/freeze/optimization switches, number-lookup transport memory (R2/R3), `/control` crash fix (`surface="world"`), migrations as files (NOT applied here), measurements | merge `b4c5724c` of `62fdfdca` (PR1105 + 4b8855f3 + ab6ed6ab) |
| F2 scroll restore (`scrollRestore2029.js`, effect pair in `RouteEffects2029`, tests, corrected evidence) | merge `702dd77e` of `4d315ea3` |
| Adaptive hold in the same restorer + visible-content harness | `339d695b` (this branch) |
| World surface test follows the relation-identity helper | `28cf3ba0` (this branch) |

## Conflicts resolved pointwise (4 files, no old code restored)
- `World2029Page.jsx`: one React import = switches' `lazy, Suspense` + PR1100's `useRef` (bounded catalog). Rest auto-merged; PR1100-owned tests/readers verified byte-identical to PR1100 (`early-primary-read`, `perf-navigation`, `postReadQueries2029`).
- `HomeComposition2029.jsx`: switches' `fx_home_convergences` freeze wrapper kept around PR1100's deferred `explorerFacets` import (limit 4 unchanged).
- `scripts/test-2029-bundle-budget.mjs`: switches' tighter World budget (265 KB / 37 chunks, deferred list); passes 5/5 on the combined build.
- `App2029.jsx` `RouteEffects2029`: ONE restorer (always on, independent of analytics) + `fx_analytics` guards on GA/marketing/identity/web-vitals/visit tracking unchanged.

## Gates on the combined code commit `339d695b` (`final-gates-raw.txt`)
44 pass / 1 fail / 1 not run. Includes: scroll 15/15, switches + perf-two-switches + shell-surface + number-lookup memory/acceptance, perf-navigation, researchSyncRuntime, route-legitimacy, hard-isolation (`test-2029-isolation`), legacy-research-containment, control-plane, bundle budget 5/5 on the fresh build, built-graph, system-frame, world-surface, build:2029.
- **FAIL `npm run package:research-run`** — pre-existing in `62fdfdca`, absent on PR1100: `numericResearchBase.js` now has a literal `import('../runtimeSwitches2029.js')` (browser-only guard) that esbuild follows into `supabase.js` → unresolved `@supabase/functions-js` for the Edge function bundle. Owner: switches/numeric-research scope. Does not affect the browser build or preview; blocks Edge packaging of research-run until fixed (e.g. inject the switch reader instead of importing it).
- **NOT RUN** `playwright test tests/world2029-release.spec.cjs` (needs `@playwright/test` + a preview server on :4173; CI only).
- Fixed in this branch: `test-2029-world-surface` failed on `62fdfdca` itself (stale source regex).

## World switch OFF vs ON — local test-only override of the `site_flags` read, replay 4 runs/cell, mobile, CPU x4 (`raw/replay-*.json`); DB switch stays OFF
| Target | Mode | click→identity | click→usable | requests | CPU | CLS |
|---|---|---|---|---|---|---|
| world→number 776 | OFF | 1763 ms | 4141 ms | 92 | 1651 ms | 0.052 |
| | ON | **205 ms** | **2320 ms** | **55** | **766 ms** | 0.052 |
| world→post | OFF | 1206 ms | 2528 ms | 29 | 637 ms | 0.278 |
| | ON | **207 ms** | **1541 ms** | **16** | **506 ms** | 0.278 |
Same subject/return/selection/text length in all runs (one identity variant). Requests identical to the switches session's numbers; times are this machine's replay, not production.

## /control
Guest: redirected to `/`, 0 page errors (combined build). Source tests: control-plane contract + shell-surface guard pass. **Real admin session: BLOCKED** (none available) — admin open and the nav side effect of the `world` surface on `/control` are unverified.

## Preview
**Hosted protected preview: NOT established** — no Vercel/deployment access from this environment and no PR/deployment status exists for the branch. GPT/owner must build the preview from the exact SHA reported in the delivery.

## Blockers
1. `package:research-run` (above). 2. No hosted preview. 3. Admin `/control` and member acceptance need authorized sessions. 4. Playwright world release spec not run locally. 5. Cross-page `#world-sources` anchor not honoured (page-owned, unchanged); Home back CLS ≈1.7–1.9 (Discovery/reveal, other owner).
