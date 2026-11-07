# G4 gate runs on the audit RC — results, read-only verification, Release Visual hold

> **Evidence, not closure.** **G4 stays OPEN** whatever these runs say: a passing G4 workflow is not the closure of G4 in the plan (CLAUDE.md), and SK2, PG2, the Zvi decision and S2 are open ([`G4-MAP.md`](G4-MAP.md)).
> No merge, deployment, DB or Storage change; PG2 step not installed; Release Visual **not run**.
> RC branch: `claude/sod1820-audit-rc-g93w32`. Exact SHA under test: **`352c560192a51941409b04375dc77cec059d538f`**. Its only difference from the earlier approved `b25311748e2019bdcd6e6d44db3b12dc71d1198a` is three documentation files (`CORRECTION-…`, `G4-MAP.md`, README rows) — nothing under `src/`, `test/`, `api/`, `supabase/`, `.github/`. `workflow_dispatch` takes a ref, not a bare SHA, so the runs were dispatched on the branch and GitHub recorded `head_sha` below.

## 1. Results (all dispatched 2026-11-07 ≈05:50 UTC, event `workflow_dispatch`)

| Gate | Run ID (run #) | SHA | Result | Duration | Failure details |
|---|---|---|---|---|---|
| G4 Public Core | [42344422527](https://github.com/zuriel337/sod1820/actions/runs/42344422527) (#433) | `352c560192a51941409b04375dc77cec059d538f` | **success** | ≈2 m 21 s | none |
| 2029 Isolation | [42344424511](https://github.com/zuriel337/sod1820/actions/runs/42344424511) (#2306) | `352c560192a51941409b04375dc77cec059d538f` | **success** | ≈6 m 33 s | none |
| 2029 Live Contracts | [42344426733](https://github.com/zuriel337/sod1820/actions/runs/42344426733) (#94) | `352c560192a51941409b04375dc77cec059d538f` | **success** | ≈50 s | none |
| Observability/SEO Build Gate | [42344428521](https://github.com/zuriel337/sod1820/actions/runs/42344428521) (#2942) | `352c560192a51941409b04375dc77cec059d538f` | **success** | ≈23 s | none |

Run-level conclusions were read from the GitHub Actions API; per-job logs were not opened because nothing failed. Durations are `created_at` → last `updated_at`.

What these runs add over the earlier evidence (`394a2ba8`, runs 42232445987 / 42232450988): the same two heavy gates now also ran on a tree that contains `cfda877a1` and the RC changes (49 files vs main), and Live Contracts ran on the merged tree for the first time (the earlier RC run, #77, was on `02f437f5c`).

## 2. Verification that the four are test-only (done before dispatch)

Read from the workflow files and the scripts/specs they invoke (173 invoked files scanned for live hosts, secrets and network calls).

| Gate | Deployment / Production canary | Secrets | DB / Storage | Network side effects |
|---|---|---|---|---|
| G4 Public Core | none; no `gh`/Vercel/deploy step | none referenced | `scripts/test-world-group-source-http.sh` uses a **disposable** Docker PostgreSQL + PostgREST. Browser spec `tests/g4-public-core-release.spec.cjs` lets only `GET`/`HEAD` and an explicit list of read RPCs reach the canonical Supabase; **everything else is aborted** (lines 29-43); writes are blocked by design | the browser reads public data from the canonical project (read-only) |
| 2029 Isolation | none | none | Auth/Edge/PostgREST/PostgreSQL are **disposable** ("never the canonical live project", workflow comment); specs use `installPublicReadOnlyEgress` (non-read RPCs and non-GET are answered `403 public_readonly_acceptance_denied` before the network; WebSockets closed; `sendBeacon` disabled), `world2029-release.spec.cjs` stubs `track_visit`/`ingest_event`/`page_views` writes with `204`; `test/theme-separation-2029.browser.mjs` aborts every non-loopback request | uploads two GitHub Actions artifacts (evidence screenshots/receipts) |
| 2029 Live Contracts | none | none; `permissions: contents: read`; header comment "No network, no browser, no secrets" | `security-sql-contracts` runs `scripts/run-def001-sql-test.sh` on a throw-away container (`--network none`) | none |
| Observability/SEO | none | none | none | none (node tests + `npm run build`) |

Residual caveat, stated plainly: the "read-only" property of the two browser gates rests on **guards inside the test code**, not on a platform control, and I did not measure the canonical database before/after (no SQL allowed). No workflow in this set has a `workflow_run`/`deployment_status` dependent: the only workflow with those triggers is `post-deploy-canary.yml`, which is not chained to these four.

## 3. Release Visual Gate — held; exact operations and what "Production canary" means

File `.github/workflows/release-visual-gate.yml` (950 lines). Triggers: pull request to `main` (opened/synchronize/reopened/ready_for_review) and `workflow_dispatch`. Permissions: `contents: read`, `deployments: read`, `statuses: read` (no write). Two jobs, no `needs` between them.

**Job 1 — `release-canary-gate` ("Production Canary Gate")** — operations, in order:
1. checkout; `node --test test/g3-reliability-preclose.test.mjs` (a source contract test).
2. `gh api repos/zuriel337/sod1820/deployments?environment=Production&per_page=20`, then `…/deployments/<id>/statuses?per_page=1` for each, until the first deployment whose latest status is `success`; takes that deployment's `sha` as **the SHA that is live in Production now**. No such deployment → exit 1 (fail closed).
3. On pull requests only: `gh api …/contents/scripts/release-canary-gate.mjs?ref=<base sha>` to decide whether the base already has the gate (bootstrap mode). On `workflow_dispatch` there is no base SHA, so this is skipped.
4. `node scripts/release-canary-gate.mjs --production-sha <live SHA>`:
   * `POST https://linswmnnkjxvweumprav.supabase.co/rest/v1/rpc/fn_release_canary_override_status` with the public anon key and body `{}`. The function (`supabase/migrations/20260929170000_g3_reliability_preclose_v1.sql:429-447`) is SECURITY DEFINER and only **selects** the row `release_canary:override` from `analytics_cache` and returns `{allowed, reason, expires_at}` — a database **read** through a POST. If a Human-Gate override is active and unexpired → gate passes.
   * Otherwise `GET https://api.github.com/repos/zuriel337/sod1820/commits/<live SHA>/statuses?per_page=100` and looks for the commit status with context `sod1820/post-deploy-canary`; passes only if the latest such status is `success`; missing or failed → exit 1.

**What the "Production canary" is:** a *separate* workflow, `post-deploy-canary.yml` (triggers: successful Production `deployment_status`, cron `17 1,7,13,19 * * *`, `workflow_dispatch`; `permissions: statuses: write`). It resolves the exact deployed SHA and URL, runs a deterministic zero-AI check **against the live deployment** (reading a bounded public heartbeat-status RPC) and **writes** the commit status `sod1820/post-deploy-canary` on that SHA. Its own header: "Failure blocks the NEXT release; there is no automatic rollback."
**What Release Visual does with it:** only *reads* the latest such status for the SHA that is live now (per the failure-correction session: `cfda877a1`). It does **not** run the canary, does not deploy, does not write a status, does not touch aliases. Its verdict describes the health evidence of what is live, not the RC; a red result would block only the *next* release.

**Job 2 — `mobile-accessibility` ("Mobile + Accessibility Acceptance")**: checkout; `npm ci`; `npm run build` with `VITE_HOME_2029_ENABLED=true` (the **plain** build, not the public-reading build); install Playwright 1.55 + Chromium; `vite preview` on `127.0.0.1:4173`; writes an inline spec `.release-gate/release-visual.spec.cjs`; runs it at widths 320/360/390/1440 on `/entity-hub-preview/number/1237` and other routes (the spec waits 4.5 s per page); uploads `release-visual-evidence` screenshots (14 days).

**The difference from the four approved gates (why it is held):** the inline spec installs only `installStorageEgressGuard`, which merely replaces public Storage images/media and mirrors anonymous denials of two protected tables. It has **no write-blocking egress** ("Keep other API/data requests real", `tests/playwright-storage-egress-guard.cjs`). The plain build runs visit telemetry on every route change: `src/App2029.jsx:211` → `trackVisit` → RPC `track_visit` (writes `site_visits`) plus `emit("page","view")` → `ingest_event` (writes `events`; comment in `src/lib/tracking.js`: it already drops bot rows). The other gates explicitly stub exactly these ("Never send analytics or other product mutations from this acceptance runner to the canonical project"). GA is a no-op in CI (`VITE_GA_ID` is not set by the workflow and no `.env*` is committed). **Likely effect:** anonymous visit/event rows from the CI runner in the canonical database, marked bot or not according to `isBot()`; **not measured**, and not a deployment, DB schema change or Production alias action.

Options (none applied; a workflow change is a gate change and needs its own approval): (a) leave Release Visual unrun until the inline spec gets the same write-stub as the other specs; (b) run it and accept a handful of CI telemetry rows, recorded as such; (c) run it only on a build with the reading profile (`PUBLIC_READING_RELEASE`), which per the code comment at `src/App2029.jsx:207-209` does not run visit telemetry — it would then not test the plain build the workflow is meant to test. The preview-only flags `VITE_INTEGRATED_PREVIEW` / `VITE_KINGDOM_PREVIEW` that would also skip tracking (`App2029.jsx:120,126`) are not set by the workflow.

## 4. Not run

Release Visual (held, §3); ELS Core (no overlap with its path filter; not requested); Post-Deploy Canary (a Production-facing workflow; not requested); PG2 workflow step (not installed).
