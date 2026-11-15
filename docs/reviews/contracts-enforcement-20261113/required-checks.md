# Required checks: the exact definition (B6), for ZURIEL's approval

Status: **definition only. The repository ruleset is NOT changed and this package does not change it.** CI is advisory today: the ruleset
`protect-main` (id 19635630, read by the governance reader on 12.11.2026 and **not re-read here**; no GitHub access in this work) has
deletion, non-fast-forward, linear history and a pull-request rule with 0 approvals, and **no** required status checks, with a bypass for the
admin role. Without required checks, every refusal of the G1 enforcement in this package stops nothing: a red pull request can still be
merged. Changing the ruleset is a security-settings change (CLAUDE.md 0.4): it needs ZURIEL's explicit approval.

The check names, triggers and timeouts below are **derived**, not remembered: `node scripts/derive-pr-check-names.mjs` reads
`.github/workflows/*.yml`; `required-checks.json` is the checked-in result with the proposed role of each name, and
`test/required-checks-definition-2029.test.mjs` fails when a workflow gains, loses or renames a pull-request job, changes its trigger class,
branch filter, timeout or other triggers, or when a name proposed as required is path-filtered, duplicated, conditional or live-state dependent.
Derived from `origin/main` `9be0c29fc`.

## 1. What a pull request gets

A check run is named by its **job** (the job's `name:`, else the job id). The workflow name is not part of it, and a branch ruleset matches a
required status check by that name (and optionally by the app that reported it). No workflow here uses a matrix, a reusable workflow or a
dynamic job name (the derive script refuses all three, so a new shape fails loudly instead of being read wrongly).

23 pull-request jobs in 16 workflows, 20 distinct names. `D` below = duration. **The ceiling is `timeout-minutes` (exact, from the file;
"unset" = GitHub's default of 360 minutes). The estimate is read from the steps (install, build, browser) and is NOT measured**; the integrator
can replace it with `gh run list --workflow <file> --json databaseId,conclusion,createdAt,updatedAt` over the last pull requests.

| Check name | Workflow file | On a pull request to main | Path-filtered | Also on | D ceiling | D estimate | Proposed role |
|---|---|---|---|---|---|---|---|
| `live-contracts-2029` | live-contracts-2029.yml | always | no | dispatch | 5 min | 1-2 min | **required** |
| `perf-contracts-2029` | live-contracts-2029.yml | always | no | dispatch | 15 min | 4-8 min | **required** |
| `release-contracts-2029` | live-contracts-2029.yml | always | no | dispatch | 10 min | 4-8 min | **required** |
| `security-sql-contracts` | live-contracts-2029.yml | always | no | dispatch | 10 min | 2-4 min | **required** |
| `marketing-browser-2029` | live-contracts-2029.yml | always | no | dispatch | 15 min | 6-10 min | **required** |
| `auth-browser-acceptance-2029` | live-contracts-2029.yml | always | no | dispatch | 15 min | 8-12 min | **required** |
| `route-seo-decision-2029` | route-seo-decision-2029.yml | always | no | dispatch | 10 min | 3-6 min | **required** |
| `legacy-production-lock` | legacy-production-lock.yml | always | no | push to main, dispatch | unset | 1-3 min | **required** |
| `Mobile + Accessibility Acceptance` | release-visual-gate.yml | always (opened, synchronize, reopened, ready_for_review) | no | dispatch | 15 min | 8-12 min | **required** |
| `gate` (Observability/SEO Build Gate) | observability-seo-gate.yml | always | no | dispatch | unset | 4-8 min | rename first (see 3) |
| `Production Canary Gate` | release-visual-gate.yml | always | no | dispatch | 5 min | under 1 min | **never** (live state) |
| `hard-isolation` | 2029-isolation-gate.yml | **paths (87 entries, incl. `test/**`, `src/lib/research/**`)** | **yes** | dispatch | 20 min | 8-15 min | aggregator candidate |
| `els-core-compatibility` | els-core-compatibility-gate.yml | paths (43) | **yes** | dispatch | unset | **19 min measured once** (see below) | aggregator candidate |
| `public-core` | g4-public-core-gate.yml | paths (36) | **yes** | dispatch | 10 min | 5-9 min | aggregator candidate |
| `isolated-postgres17-auth-rls` | follow-identity-isolated-db-gate.yml | paths (18) | **yes** | **none: it cannot be dispatched by hand** | 25 min | 5-15 min | aggregator candidate |
| `gate` (Media Release Batch Gate) | media-release-batch-gate.yml | paths (10) | **yes** | **none** | 15 min | 3-6 min | advisory; rename first |
| `approved-visibility` | community-reaction-visibility-gate.yml | paths (5) | yes | dispatch | unset | 2-4 min | advisory |
| `personal-sync` | research-sync-gate.yml | paths (11) | yes | dispatch | unset | 3-6 min | advisory |
| `journal-browser` | research-sync-gate.yml | paths (11) | yes | dispatch | 15 min | 6-10 min | advisory |
| `tiktok-source-resolver` | video-ingest-gate.yml | paths (27) | yes | dispatch | 5 min | 1-2 min | advisory |
| `contract` (Agent Dispatch) | agent-dispatch-contract-gate.yml | paths (9) | yes | dispatch | 8 min | 1-3 min | advisory; rename first |
| `contract` (Dependency Upgrade Radar V2) | dependency-upgrade-radar-v2-contract-gate.yml | paths (6) | yes | dispatch | 8 min | 2-4 min | advisory; rename first |
| `contract` (System Self Maintenance V1) | system-self-maintenance-contract-gate.yml | paths (3) | yes | dispatch | 8 min | 1-3 min | advisory; rename first |

Not pull-request checks (no `pull_request` trigger): `post-deploy-canary` (deployment status, schedule), `daily-backup`, `media-thumbs`,
`ocr-gallery`, `release-visual-egress-proof`, `update-sitemap`.

**The one measured duration** that exists in the repository: on the #1321 checkpoint `0e928e34b` all 15 checks passed (the 12 always-present names
plus `els-core-compatibility`, `public-core`, `isolated-postgres17-auth-rls`; closure list section 10.4), and `els-core-compatibility` took
**19 minutes** (run 43362638954) with no `timeout-minutes` set. At the same checkpoint `security-sql-contracts` ran on **PostgreSQL 18.6** (the runner's
own binaries): the CL-16 runners therefore ran there too and passed at that commit; this branch could only run them on 16.15 and 17.12.

**Correction to the observed list.** The latest observed pull-request check names included `hard-isolation` among the always-present ones.
It is **path-filtered**: `2029-isolation-gate.yml` starts only when a changed file matches one of its 87 paths, which include `test/**`,
`src/lib/research/**`, `src/pages/*2029Page.jsx`, `2029.html` and `public/fonts/**`. It appears on most pull requests because most touch
`test/**`, not because it always runs. A pull request that touches none of those paths (a docs-only or workflow-only change) never gets it.
The observed `gate` is the Observability/SEO job; a second, path-filtered job has the same name (see 3).

## 2. Proposed required checks, step 1 (no workflow change)

These nine are triggered on **every** pull request to main (no `paths`, no job-level `if`), have a unique name, and do not read live state.
They can be named in the ruleset as soon as ZURIEL approves, with no change to any workflow. The G1 enforcement of this package runs in the
first and the fourth.

<!-- required-now:start -->
- `live-contracts-2029`
- `perf-contracts-2029`
- `release-contracts-2029`
- `security-sql-contracts`
- `marketing-browser-2029`
- `auth-browser-acceptance-2029`
- `route-seo-decision-2029`
- `legacy-production-lock`
- `Mobile + Accessibility Acceptance`
<!-- required-now:end -->

Ruleset parameters (to be verified on the live ruleset before use): `required_status_checks` with `strict_required_status_checks_policy:
false` (as proposed on 12.11; "up to date with main" would re-run nine slow jobs on every push), one entry per name above with the
GitHub Actions app as the integration (so no other app can report a passing status of the same name; GitHub Actions is app id 15368 - check it
in the ruleset editor), and `do_not_enforce_on_create: false`.

Open decision (one line each):
* **Bypass.** The admin role bypasses the ruleset `always`; while it does, a merge under that identity (including an agent acting in
  ZURIEL's account) skips every required check. Keep, or remove with a written emergency procedure (temporary disabling of the ruleset, recorded).
* **`Production Canary Gate`.** It reads the GitHub Deployments of Production and fails the pull request when the latest production canary is
  not a success: one red canary would block every pull request, including the one that fixes it. Leave it advisory unless ZURIEL decides otherwise.

## 3. Names that must be made unique first

* `gate` is the job name in **two** workflows: `observability-seo-gate.yml` (always) and `media-release-batch-gate.yml` (path-filtered). A
  required context `gate` is ambiguous (GitHub's behaviour with two same-named check runs is not something to rely on). Rename both jobs
  (for example `observability-seo-gate` and `media-release-batch-gate`) in the same change that updates `required-checks.json`; the
  observability job can then join the required list (always triggered, `timeout-minutes` unset - set one first).
* `contract` is the job id in three path-filtered workflows (agent dispatch, dependency upgrade radar v2, system self maintenance). Advisory
  anyway; rename when any of them is promoted.

## 4. Path-filtered checks: the "Expected - Waiting for status" trap

**The trap.** A required check whose workflow has a `paths` filter does not start on a pull request that touches none of the paths. GitHub
then waits for it forever ("Expected - Waiting for status") and the pull request cannot be merged, although nothing failed. Naming
`hard-isolation` or `public-core` as required today would block every docs-only pull request. Two more facts make it worse:
**a job that is skipped counts as passed** for a required check (a job skipped by its own `if`, or skipped because a job it `needs` failed
without `if: always()`), and a workflow that fails to start (YAML error) creates no check at all.

Options, from least to most change:

| Option | What changes | Verdict |
|---|---|---|
| 1. Required only for always-triggered checks | nothing in any workflow; the nine names in section 2 | **Step 1.** Path-filtered gates stay visible but advisory. |
| 2. Complement workflow with the same job name | for each path-filtered workflow W, a second workflow W' with `paths-ignore: [same list]` and a job of the same name that only prints | **Not recommended.** `paths` runs when ANY changed file matches; `paths-ignore` runs unless ALL changed files match. They are not complementary: a pull request touching files inside and outside the list starts both, and two check runs with the same name exist (one real, one no-op). How GitHub combines them is not something to assume; it would have to be verified on a scratch branch. The two lists must also be kept identical by hand (or by a pin that compares them). |
| 3. Change detection inside the workflow, a stable final job | see below | **Step 2**, one workflow at a time, for the four candidates that guard something that matters. |
| 4. One new aggregator workflow that polls the Checks API | new workflow `required-gate.yml`, `checks: read`, a polling loop longer than the slowest job (20 min) | Not recommended: holds a runner for up to 20 minutes on every pull request, cannot see a workflow that has not started yet (race), and needs the path logic of every workflow replicated. |

**Option 3 in detail** (what would change in each of `2029-isolation-gate.yml`, `els-core-compatibility-gate.yml`, `g4-public-core-gate.yml`,
`follow-identity-isolated-db-gate.yml`), keeping each workflow's existing steps:

1. `on.pull_request`: remove `paths:` (keep `branches`), so the workflow starts on **every** pull request. The list moves into the workflow
   (a `paths.txt` next to it, or the same globs in a shell `case`), because a data file can be read by both the workflow and a pin test.
2. A first job `changes` (a few seconds, no install): fetch the PR base (`git fetch --no-tags --depth=1 origin "$PR_BASE_SHA"`, the same
   technique the G1 step uses), list `git diff --name-only "$PR_BASE_SHA" HEAD`, set the output `relevant=true|false` by matching the list. For
   `workflow_dispatch` always `true`.
3. The existing job(s) get `needs: changes` and `if: needs.changes.outputs.relevant == 'true'`; give the heavy job a **new** name
   (for example `hard-isolation-run`) so that the old name is free for step 4.
4. A final job named exactly like the old check (`hard-isolation`, `public-core`, ...): `needs: [changes, <heavy>]`, **`if: always()`**, one step:
   fail when `needs.changes.result != 'success'`, or when the heavy job's result is `failure` or `cancelled`, or when it was skipped while
   `relevant == 'true'`; pass otherwise. `if: always()` is what prevents the "skipped counts as passed" hole: without it a failed heavy job
   would leave the final job skipped, and a skipped required job is treated as success.
5. Add the final job's name to the ruleset only after a scratch pull request has shown all four outcomes: no relevant path (final job green,
   heavy skipped), a relevant path with a green heavy job, a relevant path with a failing heavy job (final job red), and a cancelled run.

Risks of option 3: the path list is now data in the workflow, so it can drift from the code it guards (the old `paths:` filter had the same
weakness); the final job adds seconds, not minutes; renaming the heavy jobs changes their check names (no ruleset entry points at them);
`isolated-postgres17-auth-rls` has no `workflow_dispatch` today (add it, otherwise the job cannot be run by hand to test the change).

**Renames break the ruleset.** A required context is a string. Renaming a required job in a pull request makes that pull request wait for the
old name forever, and the ruleset edit and the workflow edit cannot be atomic. Two-step procedure: (a) add the new job name next to the old
one and merge; (b) swap the name in the ruleset; (c) remove the old job. The pin test makes a rename visible in the same pull request
(`required-checks.json` must change with it), which is the moment to plan the three steps.

**Stale names.** The test compares the definition with the workflows on every pull request, but it cannot see the ruleset. After the ruleset
is edited, the names in it must equal the block in section 2; read the ruleset back and compare (`gh api repos/zuriel337/sod1820/rulesets/19635630`).

## 5. Roll-out and rollback (all of it ZURIEL's decision)

1. Save the current ruleset JSON (`gh api repos/zuriel337/sod1820/rulesets/19635630 > ruleset-backup.json`).
2. Add the nine contexts (section 2) with strict = false. Test with a deliberately red draft pull request (must be blocked) and a green one.
3. Later, per workflow, option 3 and then the final-job name.
4. Rollback: delete the `required_status_checks` rule, or `PUT` the saved JSON back.
