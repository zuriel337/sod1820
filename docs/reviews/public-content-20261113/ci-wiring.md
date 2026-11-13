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

## Step 3 (optional, recommended) · job `auth-browser-acceptance-2029` (ubuntu-24.04, pinned Playwright 1.55 browser)

Not wired by #1321. The two browser proofs compare the site **before** the change with the site **after** it, so they need two builds. Anchor: after the step *"Install the pinned browser"* and before *"Sign-in acceptance in a real browser"*. The job's checkout is depth 1, so the PR base is fetched by SHA.

```yaml
      - name: Build the site and the pre-change site (the PR base) for the old-client comparison
        env:
          PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}
        run: |
          SOD_BUILD_TARGET=2029 npx vite build
          BASE="${PR_BASE_SHA:-$(git ls-remote origin refs/heads/main | cut -f1)}"
          git fetch --no-tags --depth=1 origin "$BASE"
          mkdir -p "$RUNNER_TEMP/old-site"
          git archive "$BASE" | tar -x -C "$RUNNER_TEMP/old-site"
          ln -s "$PWD/node_modules" "$RUNNER_TEMP/old-site/node_modules"
          (cd "$RUNNER_TEMP/old-site" && SOD_BUILD_TARGET=2029 npx vite build)
      - name: Public content in a real browser (old tab against the new database view keeps working; the new site shows «טרם אומת» and nothing private; v2 missing falls back to v1)
        run: node --test test/m0d-contributor-stale-client.browser.mjs test/m0d-world-candidate-visible.browser.mjs
        env:
          OLD_DIST: ${{ runner.temp }}/old-site/dist
          NEW_DIST: ${{ github.workspace }}/dist
```

Result locally (Chromium 1243, Playwright 1.63.0): 1/1 and 1/1. Both tests **skip, never pass**, when a build or the browser is missing, so a broken wiring cannot look green. Once this package is merged, the PR base of later PRs already contains the change; the comparison then proves nothing about the change and the step can be dropped (or `OLD_DIST` pinned to `9be0c29fc`).

## Not wired on purpose

* `test/topic-public-findings-via-number-2029.browser.test.mjs`: a manual vite-based browser test that was never in a workflow; one of its four tests (World all-source text discovery) fails on `origin/main` as well.
* `scripts/test-content-visible-before-entry-e2e.mjs`: reads the live backend. Run by hand with approval.
* The manual Python browser tests: see README section 11.
