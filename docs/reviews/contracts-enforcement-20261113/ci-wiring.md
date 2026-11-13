> **Applied by the integrator (13.11.2026) on this branch, exactly as written below** (the anchors are the ones in this file: `live-contracts-2029` around the G1 smoke, and the end of `security-sql-contracts`; the other extraction branches use other anchors in the same workflow, so the four can merge in any order).

# CI wiring for the contracts-and-enforcement package (for the integrator; no workflow was edited)

Only `.github/workflows/live-contracts-2029.yml` needs edits, in **two jobs**. Re-based on `origin/main` `9be0c29fc` (main added three test
paths to the release job since PR #1321's base `aa0f6bc82`; that hunk is not related and untouched). In #1321 the same file also gained steps
for M0, N14 and CL-13; those belong to other packages and are not listed here.

> **Mandatory with the code, in the same pull request.** `scripts/test-g1-agent-routing-smoke.mjs` now contains a base-versus-head test. In CI
> (`GITHUB_ACTIONS=true`) it **fails** with `G1: no base commit (G1_BASE_SHA) in CI; the base-vs-head checks cannot run` when it cannot resolve a
> base, and the CI checkout is depth 1 (there is no `origin/main` to take a merge base from). Today's workflow runs the smoke without that
> step, so merging the smoke without step 1 below turns `live-contracts-2029` red on every pull request. Reproduced here with
> `GITHUB_ACTIONS=true G1_BASE_SHA=<an unknown sha> node --test scripts/test-g1-agent-routing-smoke.mjs` (50 pass, 1 fail with that message).
> **The G1 base-versus-head checks need `PR_BASE_SHA`**: it is `github.event.pull_request.base.sha`; on a manual dispatch there is no pull
> request and the base is the tip of `main` (`git ls-remote`).

## Job `live-contracts-2029` (always runs on pull requests to main; `timeout-minutes: 5`)

Anchor in the current file: the two existing steps `G1 captured main commit ...` (lines 45-46) and `G1 agent-routing smoke ...` (lines 47-48).

**Step 1** - insert **between** them (exactly as in #1321, unchanged):

```yaml
      # 12.11.2026: the G1 base-vs-head checks compare the PR head with its REAL base (dated records, contract changes, laws snapshots).
      # The base is the PR base commit; on a manual dispatch it is the tip of main. Depth 1, no tags. Without it the test FAILS in CI.
      - name: G1 base commit (the PR base, or main on a manual dispatch; depth 1, no tags)
        env:
          PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}
        run: |
          BASE="${PR_BASE_SHA:-$(git ls-remote origin refs/heads/main | cut -f1)}"
          git fetch --no-tags --depth=1 origin "$BASE"
          echo "G1_BASE_SHA=$BASE" >> "$GITHUB_ENV"
```

**Step 2** - insert **after** the smoke step. Changed against #1321: the runner's new location, and the count (51 -> 53 scenarios):

```yaml
      # The G1 enforcement code changed: its end-to-end proof runs on that exact head. Each scenario is the real G1 smoke on a real base and head
      # in a temporary worktree (local commits only, nothing is pushed); each has an expected outcome and a refusal must be for its reason.
      # Any unexpected outcome, or a scenario that did not run, fails. Needs bash, git (worktree), python3, node: all on ubuntu-latest.
      - name: G1 enforcement scenarios (only when the enforcement code changes; 53 scenarios on this exact head, each must refuse or allow as recorded)
        run: |
          if git diff --name-only "$G1_BASE_SHA" HEAD -- scripts/lib/g1LawsSnapshotRules.mjs scripts/test-g1-agent-routing-smoke.mjs docs/reviews/contracts-enforcement-20261113/enforcement-proof/run-ci-scenarios.sh | grep -q .; then
            bash docs/reviews/contracts-enforcement-20261113/enforcement-proof/run-ci-scenarios.sh
          else
            echo "The G1 enforcement code is unchanged against $G1_BASE_SHA: the scenarios are not needed for this change."
          fi
```

**Step 3** - the two pins of this package (static, a second or two; read repository files only), after step 2:

```yaml
      - name: Contracts and enforcement package pins (package scope and counts, CL-16 independence, required-checks definition)
        run: node --test test/contracts-enforcement-package-2029.test.mjs test/required-checks-definition-2029.test.mjs
```

Why here: it is the job that already runs the G1 smoke, it runs on every pull request, and none of the three steps installs anything. The
scenario runner took 43 s locally for 51 scenarios (about 1 min for 53); the job's `timeout-minutes: 5` is not changed by this document, but
watch the first run: if the job approaches the limit, raise the timeout (that is a limit on duration, not a quality threshold).

## Job `security-sql-contracts` (always runs; `timeout-minutes: 10`)

Anchor: the last step `Group images and videos ...` (lines 317-318), after which the job ends. Append four steps. They use the runner's own
PostgreSQL binaries (`/usr/lib/postgresql/*/bin`, a throwaway data directory and a unix socket; a network-less `postgres:17-alpine` container
when no binaries exist), never a live database. Timed locally on 17.12: lifecycle 1.2 s, case matrix 2.5 s, reader 1.0 s, order evidence 1.5 s
(initdb included in each).

```yaml
      - name: G1 rule guard (CL-16) proposal lifecycle (25 cases; a missing function, drift, a MISSING or DISABLED trigger stop both files; exact apply, no-op re-apply, exact rollback; the apply plan sha256 values are the files; no other SQL file touches the rule tree unreviewed)
        run: bash scripts/run-g1-rule-guard-sql-test.sh
      - name: G1 rule guard (CL-16) case matrix, live vs applied (72 cases x 2 variants, each with an expected outcome and refusal reason)
        run: bash docs/reviews/contracts-enforcement-20261113/enforcement-proof/run-db-scenarios.sh
      - name: G1 successor of a retired rule, end to end (database row, guard, snapshot reader, G1; 18 checks with expected outcomes)
        run: bash scripts/run-g1-laws-snapshot-reader-test.sh
      - name: CL-16 order evidence (the guard against the law v7 supersession and its rollback; 4 cases)
        run: bash docs/reviews/contracts-enforcement-20261113/cl16-order-evidence/run.sh
```

These four are the **database half**: they test the CL-16 *proposal*. They do not apply anything and they do not depend on the code half,
so they could also be merged separately; they do not make the guard live.

## Other jobs and workflows

* `gate` in `observability-seo-gate.yml` already runs `src/lib/research/researchW2FoundationHardening.test.js` (step "W2 Research contract
  tests"), which holds the CL-07 test. **No wiring needed for CL-07.**
* No path filter, trigger or permission is changed anywhere. No other workflow changes.
* The pin `test/required-checks-definition-2029.test.mjs` fails when any workflow later changes a pull-request job name or trigger class; the
  definition (`required-checks.json`) is then updated in the same change.

## After applying, run (locally, before the pull request)

```
node --test scripts/test-g1-agent-routing-smoke.mjs        # 51 pass
GITHUB_ACTIONS=true G1_BASE_SHA=$(git rev-parse origin/main) node --test scripts/test-g1-agent-routing-smoke.mjs   # CI mode, 51 pass
bash docs/reviews/contracts-enforcement-20261113/enforcement-proof/run-ci-scenarios.sh                              # 53 scenarios, commit first
node --test test/contracts-enforcement-package-2029.test.mjs test/required-checks-definition-2029.test.mjs
G1_PG_BIN=/usr/lib/postgresql/17/bin bash scripts/run-g1-rule-guard-sql-test.sh
```

If another package changes the Owner Index, `SOD1820_DESIGN_CONTRACT_V2.md`, `src/components/SubscribeGate.jsx` or the Owner-Index row that
names `docs/research-studio-v1-contract.md`, re-run the scenarios (GAP-15 in `gaps.md`).
