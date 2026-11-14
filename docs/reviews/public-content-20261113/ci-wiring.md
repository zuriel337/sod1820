> **Applied by the integrator (13.11.2026) on this branch, with different anchors** so that the four extraction branches can be merged in any order without touching the same lines of `live-contracts-2029.yml`: step 1 (fetch + node contracts) sits after the step "Navigation symbols … and icon treatment"; step 2 (SQL) after the "«הגילוי היומי» = «תורת הרמז» intake proposal" step; step 3 (two builds + the two browser proofs) after "Public storage media through the real worker", before "Keep the evidence". The commands are exactly the ones below.

# CI wiring for the "public content" package (the integrator applies it; the workflow is not edited here)

File: `.github/workflows/live-contracts-2029.yml` (workflow name `2029 Live Contracts`), anchored on origin/main `9be0c29fc`. Every command below was run on this branch (Node 22.23.4; the workflow uses `.nvmrc` = 24.21.0, not run on 24 here).

In #1321 these tests were wired inside the large "M0 security contracts" steps together with files of other packages. Here they are split so that this package can be merged alone. #1321's own steps for them were: `test/public-research-candidates-visible-2029.test.mjs` in the step "M0 security contracts …", `test/m0d-contributor-view-v2.test.mjs` in the step "M0 Edge rollback package, intermediate states … and the contributor view v2", and `bash scripts/run-m0d-contributor-view-sql-test.sh` in the SQL job. The browser tests were **not** wired by #1321.

## Step 1 · job `release-contracts-2029` (ubuntu-latest, Node from `.nvmrc`, `npm ci` already run)

Anchor: insert after the step named *"Analytics measurement contracts (public GA4 transport and labels, anonymous RUM family, the route effects that start them, one-tree analytics contract)"* and before *"Navigation symbols (every destination has its own catalogued picture …"*.

```yaml
      # Public content (Design Contract V2 8.3, ZURIEL 12.11.2026): content visible before entry; a public research finding that has
      # not passed the Human Gate is shown as «טרם אומת», keeps its stored status, and publishes no personal information.
      # The old-client proofs in test/m0d-contributor-view-v2.test.mjs read earlier commits with git, so those commits are fetched first
      # (depth 1, by SHA, no tags). Without them four of its tests report SKIPPED, never passed.
      - name: Fetch the commits the old-client proofs read (the three earlier Production commits and the base of the public content package)
        run: git fetch --no-tags --depth=1 origin 146f2f0e7e5e6dcd17f49af33e70808e7549ea1f ed30dc05bab6f079b771669de6206a99413dd5de aa0f6bc82b8c94286374b1f51208037502994eab 9be0c29fc52337069192b057ef1a9882c7026009
      - name: Public content contracts (unverified public findings are labelled and never promoted; private, person-only and dossier rows stay hidden; no contact detail or contributor id is output; the contributor reader asks view v2 and falls back to v1 only while v2 is missing; old clients read v1 only; the documented scope and the reviewed SQL bytes)
        run: >
          node --test
          test/public-research-candidates-visible-2029.test.mjs
          test/public-content-privacy-2029.test.mjs
          test/public-content-display-policy-20261113.test.mjs
          test/m0d-contributor-view-v2.test.mjs
          test/public-content-package-scope-20261113.test.mjs
          test/world-all-source-findings-2029.test.mjs
          test/world-finding-share-og-2029.test.mjs
          test/world-public-finding-reader-2029.test.mjs
          test/world-public-reader-contract-2029.test.mjs
          src/lib/research/contributorFindingsProjection.test.js
          src/components/contributor2029/publicContributor2029.test.js
          src/components/contributor2029/publicSourceCatalog2029.test.js
```

Result on this branch: 12 + 11 + 17 + 10 + 4 + 10 + 8 + 4 + 4 + 19 + 12 + 9 = 120 tests, all pass, none skipped (with the four commits fetched).
Why: it is the code half of the package. The four world tests and the three `src/` tests were changed by this package (they were wired nowhere before, or inside other steps of #1321); wiring them keeps their changed expectations from drifting.
If the repository later removes the fetch for `9be0c29fc`, drop that SHA from the list in `test/m0d-contributor-view-v2.test.mjs` (`LIVE_COMMITS`) in the same change.

## Step 2 · job `security-sql-contracts` (ubuntu-latest, throwaway PostgreSQL, no database ever contacted)

Anchor: insert after the step named *"Group images and videos (proposal; text arrivals byte-identical; … live functions byte for byte)"* (the last step of the job today).

```yaml
      - name: M0-D contributor research view admits public candidates (one token, status kept, private and person-only excluded, idempotent re-run, drift and foreign-v2 stops, exact rollback; v1 byte for byte)
        run: bash scripts/run-m0d-contributor-view-sql-test.sh
```

Result: PASS on PostgreSQL 16.15 and 17.12 locally (`G1_PG_BIN=/usr/lib/postgresql/{16,17}/bin`). In CI the runner uses the PostgreSQL binaries found under `/usr/lib/postgresql/*/bin` (the last one), or a network-less `postgres:17-alpine` container when none exists, exactly like the other `run-*-sql-test.sh` steps.

## Step 3 · job `auth-browser-acceptance-2029` (ubuntu-24.04, pinned Playwright browser) — CORRECTED 14.11.2026

> **Correction.** This section first wired the old side of the comparison to the **PR base** and said that once the package was merged "the comparison then proves nothing about the change and the step can be dropped (or `OLD_DIST` pinned to `9be0c29fc`)". That was wrong. After #1335 was merged, the PR base of every later pull request already contains the change, so the old and the new site are the same code and **both proofs fail** (not "prove nothing"): the first pull request after the merge (#1340) was red on `auth-browser-acceptance-2029` with `old code reads v1` and `the pre-change site never shows the candidate`. The case "old side equals new side" had not been run before the merge. It is reproduced locally and now covered by a test (below).

The two proofs compare the site **before** the change (a tab left open, the previous deployment) with the tested site. They need two builds:

* **The old side is a fixed historical commit: `9c4cad1372200759e9afe6e9c38709209d4ee02a`** (the code that was live before #1333 and #1335). It is a literal in the step (`HISTORICAL_SITE_SHA`), fetched by SHA (depth 1, no tags) and verified (`git rev-parse FETCH_HEAD`), then built with `SOD_BUILD_TARGET=2029 npx vite build`. **It is not the PR base, not main, not a deployment and not an alias, and it is not updated after a deployment.** It represents the behaviour *before* the change; replacing it with a newer commit makes both sides equal and brings back exactly the failure above. Any future change of the readers that needs a new old-client comparison starts a new pin with its own review, never an automatic move.
* **The new side is the checked-out tested commit** (`SOD_BUILD_TARGET=2029 npx vite build` in the workspace; `NEW_DIST=${{ github.workspace }}/dist`). The step writes both commits to the evidence (`public-content-proof-commits.txt`) and fails if the tested commit is the historical commit.
* **The G1 base commit is a different thing and is untouched**: the step *"G1 base commit"* keeps `PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}`.

```yaml
      - name: Build the tested site and the pinned historical site for the old-client comparison
        env:
          HISTORICAL_SITE_SHA: 9c4cad1372200759e9afe6e9c38709209d4ee02a
        run: |
          set -euo pipefail
          TESTED="$(git rev-parse HEAD)"
          # fails when the tested commit is the historical commit
          SOD_BUILD_TARGET=2029 npx vite build
          git fetch --no-tags --depth=1 origin "$HISTORICAL_SITE_SHA"
          test "$(git rev-parse FETCH_HEAD)" = "$HISTORICAL_SITE_SHA"
          mkdir -p "$RUNNER_TEMP/old-site"
          git archive "$HISTORICAL_SITE_SHA" | tar -x -C "$RUNNER_TEMP/old-site"
          ln -s "$PWD/node_modules" "$RUNNER_TEMP/old-site/node_modules"
          (cd "$RUNNER_TEMP/old-site" && SOD_BUILD_TARGET=2029 npx vite build)
      - name: Public content in a real browser (...)
        env:
          OLD_DIST: ${{ runner.temp }}/old-site/dist
          NEW_DIST: ${{ github.workspace }}/dist
          PUBLIC_CONTENT_PROOF_REQUIRED: "1"
        run: |
          set -euo pipefail
          node --test --test-reporter=tap test/m0d-contributor-stale-client.browser.mjs test/m0d-world-candidate-visible.browser.mjs | tee "$RUNNER_TEMP/auth-evidence/public-content-proof.tap"
          node scripts/assert-tap-summary.mjs --tests 2 --pass 2 --fail 0 --skipped 0 --todo 0 --cancelled 0 < "$RUNNER_TEMP/auth-evidence/public-content-proof.tap"
```

**Both proofs must run and pass in CI — no skip.** With `PUBLIC_CONTENT_PROOF_REQUIRED=1` a missing historical build, a missing tested build, a missing browser or Playwright, or one directory on both sides is a **failure** that names what is missing (`test/helpers/publicContentProofGate.mjs`); without the flag (a developer's machine) the proofs still skip, never pass. The step then checks the TAP summary: exactly `tests 2, pass 2, fail 0, skipped 0, todo 0, cancelled 0` (`scripts/assert-tap-summary.mjs`), because the exit code of `node --test` does not fail on a skip. Both tests and every assertion in them are unchanged.

**Pinned by tests** (`test/public-content-browser-gate-20261114.test.mjs`, in the *Public content contracts* step): the literal pin and the absence of any other commit, PR base, branch, deployment or alias in the build step; the G1 step still reads the PR base; the flag, both files and the exact summary in the run step; the gate (skip locally, fail when required, for each missing prerequisite and for the same directory on both sides); the summary checker (refuses a skip, todo, failure, cancelled test, missing test and an empty report); both proofs keep their assertions and are not skipped.

Local proof (the CI commands, default build profile): old = build of `9c4cad137`, new = a tree whose base already contains #1335 → 2 of 2, nothing skipped; old = a build of that same tree (the earlier wiring) → both fail; missing historical build, missing browser, one directory on both sides → both fail, no skip. The pull request that carries this correction is itself such a tree (its base contains #1335), so its own `auth-browser-acceptance-2029` is the CI proof.

## Not wired on purpose

* `test/topic-public-findings-via-number-2029.browser.test.mjs`: a manual vite-based browser test that was never in a workflow; one of its four tests (World all-source text discovery) fails on `origin/main` as well.
* `scripts/test-content-visible-before-entry-e2e.mjs`: reads the live backend. Run by hand with approval.
* The manual Python browser tests: see README section 11.
