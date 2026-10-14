# 2029 performance execution — measurement checkpoint, 2026-10-14

**Partial execution. Speed is NOT closed.** This branch contains measurement evidence and an evidence-validity gate; it changes no application behavior. Active ownership prevents the next ordered boot/frame work. No merge, deployment, Legacy change, product-DB write, migration, cache, RPC replacement or agent message occurred.

## Verified baseline and DRIFT

| Source | Verified SHA | Reconciliation |
|---|---|---|
| origin/main | `12fea7a33ea2367f590050f8e499389b7e508561` | DRIFT from local `5dd7032e`; v17 reporting pointers are on main |
| PR1092 / gpt/shared-preview-integration-20261014 | `18821815e4e7addf9d09f19b2d4eeff6a71ca77a` | Selected integrated application baseline |
| claude/perf-testing-2029-5ayyow | `ef8a51ade0a946238eaab790256af81f2e13837a` | DRIFT from handed-off `13fccd0b`; contains new active-owner experiments |
| Shared harness snapshot | `13fccd0b86f11ba972ecc9fc55eef39ba2fd2254` | Copied unchanged to scratch, never edited in its owner branch |

`git diff 13fccd0b 18821815 -- src 2029.html vite.config.js package.json package-lock.json` is empty. The integrated application is the existing `0e4e2d577ec8e935db5be1305ab943ba7021d6aa` code. The earlier Home `/2029` measurement is invalid; this run uses `/`.

Read: live-main AGENTS/CLAUDE/Owner Index routing, live active coordination v17 (including metadata), existing System Frame contract/addendum, fixed measurement conditions, relevant 48h work_log_current and prior experiment evidence. General Supabase connector used for bounded read-only checks; only the separately authorized passive work-log records were written. BEFORE `54f7b262-d34b-40a6-8c0c-6f73fb6a8024` was reread from work_log_current with to_actor=ZURIEL and dispatch_kind/state=NULL.

## Ownership transfer needed — consolidated, no takeover

| Work needed | Existing owner / claim | Files and outcome |
|---|---|---|
| Font/boot barriers, early primary reads, measurement harness | `PERF_LOAD_BEFORE_DATA_2029_20261014`, BEFORE `8a3d9c6d-c447-4f18-a3e9-8ca38ab62500` | `src/main2029.jsx`, `2029.html`, `src/App2029.jsx`, `vite.config.js`, shell lazy-panel hunks, `scripts/perf/**`; no matching AFTER/release found in the bounded live scan |
| Frame layout barrier / fixed shell / transitions | Existing System Frame visual lane, with the above active shell scope | `SystemFrame2029.jsx`, shell CSS, App layout and page wrappers, feed/watcher and shared feature-state integration; require exact scope/branch handoff before writing, visual acceptance stays with Claude |

Unique execution artifacts only were claimed here. Existing owner claims were not modified or released. Passive reporting only; no ACK or automatic specialist activation. Base isolation does not transfer ownership.

## New baseline (fixture lab only)

Unmodified shared harness; 390×844, DPR2, CPU×4, cold contexts, brotli, 150ms RTT, download `1.6*1024*1024/8` bytes/s, upload `750*1024/8` bytes/s, 7 samples/route. Chromium 141.0.7390.37 / Playwright 1.56.1, build 1194. Environment geography unverified; do not compare absolute numbers to the prior Ohio runner as if location were established. Full manifest and hashes are in `baseline-manifest.json`.

All times below are milliseconds. After is unavailable because no runtime change was made; there is no speed delta to claim.

| Surface | FCP before | LCP before | READY before [min–max] | First harness content request | Last Supabase end | Supabase resources | CLS | After |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| `/` | 1796 | 3940 | 4226 [4190–4348] | 3941 | 5049 | 73 | 0.021 | Not measured |
| `/world` | 1960 | 5520 | 4327 [4280–4342] | 1723 | 5581 | 71 | 0.037 | Not measured |
| `/post/seventh-to-tenth-sefirot-2027` | 1776 | 3948 | 3899 [3863–3961] | 3579 | 4207 | 19 | 0.008 | Not measured |

Fixture misses: **0 for all routes**. The fixture set contains 63 GET entries, all status 200. Data replay is fixed-delay and does not measure DB time. The shared harness stores medians/ranges rather than individual samples; provenance records the actual seven-run invocation.

**Measurement limitations that block product acceptance:**

- Every non-GET Supabase call, including read-only POST RPCs, is fulfilled as 204. World arrivals and gematria/convergence responses are omitted. This is not complete live content or request behavior. In particular, 19 Post resources cannot satisfy the requested 17–20 live-request target.
- `firstContentReq` excludes some telemetry but still includes flags and stubbed RPCs; it is not a dedicated first-primary-content request. `lastSbEnd` covers all Supabase resource entries, not a method/status-specific last successful REST read.
- External fonts, images and third-party resources are replaced by empty responses. Visual/content/permission parity and mobile responsiveness are unproven.
- A post marker with >800 characters proves the marker appeared, not that optional extensions cannot block primary content.

The new gate therefore accepts this evidence for `lab` and **rejects it for `product`**. It checks routes, complete numeric metrics, ranges, fixture misses, declared fixed conditions and before/after comparability. Product evidence additionally requires seven successful individual samples, primary-content identity/status/error proof, bounded reads, delayed/failed-extension acceptance and exact-SHA hosted proof. These are reviewer-verifiable evidence declarations, not independent browser assertions. The gate is a standalone review tool; shared harness corrections and CI wiring remain pending owner transfer. No product performance budget is calibrated from this incomplete-content run.

## Prior work reused, not restarted

- PR1092 already contains lazy boundaries, lazy day context, in-flight flags dedupe and bundle-budget work. No replacement cache or duplicate implementation was introduced.
- `e79da717` starts the existing Home/Post reader from the **boot module**, not from a central head request registry. Auth/error/StrictMode double-effect equivalence still needs acceptance before adoption.
- `c642d448` lazily imports WorldFlightStory's post projection; `8fd9c701` removes font waiting; `ef8a51ad` changes body-font preload. These are active-owner experiments, not integrated here; do not add their isolated savings.
- Existing `experiments.patch` carries the `matchMedia` CPU and trail-height CLS experiments. It was inspected as evidence and not applied to claimed files.
- World/posts isolation evidence `57e49066` gives fixture READY 4503→4282ms for lazy full-content projection; basic/off mostly reduce CPU/requests and alter content. Live-v2 evidence `38097b6c` is a separate dataset. Neither is summed with boot savings.
- Live DB catalog confirms `world_group_source_arrivals_v2` exists (STABLE, anon EXECUTE); v3 does not. The integrated `worldGroupSource.js` already handles missing-v3 errors with vetted v2 fallback. The first 404 attempt remains avoidable; this fixture harness cannot measure it because both POSTs are stubbed. No DB/RPC change made.
- Existing `db100/proposed-migration.DRAFT.sql` remains the index/read-model draft. No duplicate synthetic DB experiment or migration was run.
- `measure-2029-v2.mjs` hardcodes a **different Post slug** (`flydubai-fz1073-363-14000-remzei-geula`), gzip and real-RPC behavior. It cannot be mixed with this seventh-to-tenth fixture run or treated as the same baseline without a declared protocol correction.

## Validation and remaining gates

Build: `npm ci --ignore-scripts` then `npm run build:2029` PASS. The initially preinstalled incomplete dependency set failed on missing @react-three/fiber; it was replaced in this isolated worktree using the lockfile, and no measurement used that failed build. Legacy source and lockfile are unchanged.

`node --test test/perf-execution-2029.test.mjs`: 7 PASS. `git diff --check`: PASS. Product-mode gate fails intentionally; lab-mode gate passes. No behavioral test or visual acceptance is claimed for application changes, since there are none.

Hosted preview: **not available for the exact baseline** in the checked GitHub deployment/status records (no deployments for 18821815 or 0e4e2d57, no status URL). No hosted preview was created or substituted. No direct Vercel readiness/commit check was available in this checkpoint. Hosted server, Israel, physical phone, mobile interaction responsiveness, Postgres cold cache, same-origin proxy, integrated after measurement, extension isolation, data bounds and live calibrated budgets all remain OPEN. Do not advance to structural shell/state/cache/DB work on the strength of this local build.

Release state: DOCUMENTED / IMPLEMENTED / TESTED / BRANCH-ONLY for the evidence guard only. Application fixes, hosted preview, full performance PR acceptance and speed closure are NOT VERIFIED. MERGED / DEPLOYED / LIVE = false. Release advice: BLOCKED_BY(active boot/frame ownership and valid hosted/live acceptance); user forbids merge/publication in this task.

Rollback: revert this branch's single evidence/gate commit. It affects only the execution documents, standalone gate and its tests; no application or DB rollback is necessary.

## Reproduce

```sh
npm ci --ignore-scripts
npm run build:2029
# Extract scripts/perf unchanged from 13fccd0b into a separate scratch directory.
PLAYWRIGHT_DIR=/workspace/perf-execution-scratch/tools \
PERF_CHROME=/home/agent/.cache/ms-playwright/chromium-1194/chrome-linux/chrome \
node /workspace/perf-execution-scratch/protocol/scripts/perf/harness.mjs run \
  --dist /workspace/sod1820-perf-execution/dist --label baseline-18821815 \
  --routes /,/world,/post/seventh-to-tenth-sefirot-2027 --runs 7 --out baseline.json
node --test test/perf-execution-2029.test.mjs
node scripts/perf-execution-2029/evidence-gate.mjs \
  docs/perf-evidence-20261014/execution/baseline-fixture.json \
  docs/perf-evidence-20261014/execution/baseline-manifest.json lab
# Replacing lab with product must return exit code 1 for this dataset.
```
