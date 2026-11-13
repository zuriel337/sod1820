# Measurement package: CI wiring for the integrator

This package edits no file under `.github/workflows/`. Two additions are needed, both in `.github/workflows/live-contracts-2029.yml`.
No threshold, budget or baseline changes.

## 1. Node tests: the "Analytics measurement contracts" step

- **Job:** `release-contracts-2029` (`runs-on: ubuntu-latest`, `timeout-minutes: 10`).
- **Step:** `Analytics measurement contracts (public GA4 transport and labels, anonymous RUM family, the route effects that start them, one-tree analytics contract)`.
- **Anchor in the current workflow:** the step whose list ends with the two lines `test/public-reading-observability.test.mjs` and `test/public-reading-analytics-worker.test.mjs` (lines 142-148 at `9be0c29fc`).
- **Command after the change** (four files are added at the end of the list):

```yaml
        run: >
          node --test
          test/analytics-2029-one-tree-contract.test.mjs
          test/public-reading-real-gtag-shape.test.mjs
          test/public-reading-observability.test.mjs
          test/public-reading-analytics-worker.test.mjs
          test/public-reading-action-measurement.test.mjs
          test/measurement-page-view-once-2029.test.mjs
          test/measurement-transport-hardening-2029.test.mjs
          test/measurement-package-scope-20261113.test.mjs
```

- **Why:** `public-reading-action-measurement` (6) was wired in #1321 and is not on main; the other three are new in this package and pin the one-visit-per-page-view route effect, the worker budgets and the documented scope.
- **Needs:** the production artifact built earlier in the same job (the step `Production service worker contract …` runs `node scripts/build-public-reading-production.mjs`), because `public-reading-observability` imports `public-reading-deploy/.generated/protected-review-build.js`. Nothing else: no browser, no network. `esbuild` comes from `npm ci`.
- **Time:** the four additions run in about 2 seconds.

## 2. Browser test: its own job (recommended)

The test is the real-browser proof of the page-view contract (direct entry, refresh, back, forward, in-app navigation, tab and page lifecycle, redirect alias; guest and member; desktop and phone).
It takes about **3 to 3.5 minutes** (191 s for the four profiles on the machine of this package), so it is better as a job of its own than as one more step of `auth-browser-acceptance-2029` (`timeout-minutes: 15`, already running the sign-in, GA4 and media suites).

- **Job (new):** `measurement-browser-2029`, same shape as `marketing-browser-2029` (`.github/workflows/live-contracts-2029.yml:325-350`): checkout, `actions/setup-node` with `node-version-file: .nvmrc`, `npm ci --no-audit --no-fund`, `node scripts/build-public-reading-production.mjs`, then the pinned browser.

```yaml
  measurement-browser-2029:
    name: measurement-browser-2029
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
        with:
          persist-credentials: false
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
      - name: Install dependencies
        run: npm ci --no-audit --no-fund
      - name: Build the public-reading artifact
        run: node scripts/build-public-reading-production.mjs
      - name: Install the pinned browser
        run: |
          npm install --no-save --no-package-lock @playwright/test@1.55.0
          npx playwright install --with-deps chromium
      - name: One first-party visit per real page view (real Chromium, the built artifact and its real worker; guest and member, desktop and phone)
        run: node --test test/measurement-visit-once-2029.browser.mjs
```

- **If it must stay inside an existing job instead:** `auth-browser-acceptance-2029`, after the step `Google Analytics 4 is not blocked (real CSP header + real worker)` (anchor: `run: node --test test/ga-measurement-browser-2029.browser.mjs`), with the same `run:` line and `timeout-minutes` raised from 15 to 20.
- **If the job is added, the required-checks list (branch protection) is an integrator decision;** nothing here changes it.
- **Pinned versions:** the test was run here with Playwright 1.63.0 and its bundled Chromium 1243 (see README). The workflow pins `@playwright/test@1.55.0`; `pw.devices['Pixel 7']` exists in both. The test has not run on 1.55.0.
- **Skipped, not failed, when the browser or the artifact is missing:** the test carries `skip` for that case, so a job that forgets the build step would pass silently. The step order above (build before test) is therefore part of the wiring.
