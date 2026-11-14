# Release request · #1337 — measurement: one visit per real page view (13.11.2026)

> **Updated 13.11.2026 after the Codex read of the ruleset `protect-main` (no required status checks, `required_linear_history` active, bypass for the admin role).** This is a request, not an approval. Nothing in it is merged or deployed. It has **two separate steps**: 1 = merge of the code to `main`; 2 = the deployment of the public site that makes it live. A merge is not a deployment (CLAUDE.md rule 7). Each step needs ZURIEL's explicit approval for the exact commit; an approval of step 1 is not an approval of step 2, and the commit of step 2 (the merge commit on `main`) does not exist yet — it will be read and presented before step 2 is approved. **No SQL, no Edge function, no flag, no secret, no ruleset change in either step.** Not read by this request: the Codex addendum on the journal record (the journal could not be reached when this was written); the request is built from the pull request and its documents and must be reconciled with that addendum.

| | |
|---|---|
| Pull request | [#1337](https://github.com/zuriel337/sod1820/pull/1337) (draft) |
| Branch / exact head | `claude/extract-measurement-20261113` · [`47ee61b27263f6a0772581b2d8f46eb6f7a2e4e5`](https://github.com/zuriel337/sod1820/commit/47ee61b27263f6a0772581b2d8f46eb6f7a2e4e5) |
| Base | `origin/main` [`9be0c29fc52337069192b057ef1a9882c7026009`](https://github.com/zuriel337/sod1820/commit/9be0c29fc52337069192b057ef1a9882c7026009) (read again 13.11, unchanged) |
| Sources | PR #1321 at [`4a406fed2`](https://github.com/zuriel337/sod1820/commit/4a406fed273b9b381577c5b2a03d91c58de46451) (the bounded action family, M0-F) and the preserved commit [`139f16214`](https://github.com/zuriel337/sod1820/commit/139f16214d5ab3da3da903af02cc45e5d023e04b) (one visit per real page view, in-app navigation counted) |
| Size | 23 files, +1216 / −28 (appendix) |
| Gates on this head | 14/14 pull-request checks success, including the real-browser proof in CI (`marketing-browser-2029`: 4 pass, 0 skipped, 188 s) |

## What changes for the user, in plain language
* Visitors see **nothing different**.
* A page view is written **once**: on a direct entry, a hard refresh, back, forward and every move inside the site to another page, for guests and members, desktop and phone. Before: a direct entry or refresh was written **twice**, and a move inside the site to another page family was **not written at all** (the public worker refused it).
* Product actions (calculator, share, join, arrival source, post view) are written again to `events`, **without** a visitor or session id (they had stopped on 4.11).
* **For the administrator the daily visit counts change on the release date**: the doubled rows disappear and the missing in-app page views appear. Counts before and after are not comparable; unique visitors, the bot signature and "active now" do not change. Sixteen readers are tabulated in `docs/reviews/measurement-20261113/readers-and-comparability.md`; no report was changed. Retention snapshots of old days (which contain the doubles) stay as they are, so a step appears in the combined history.
* Nothing is rewritten in the database; nothing is published to the public.

## Step 1 — merge of the code
**Request:** merge #1337 at head `47ee61b27263f6a0772581b2d8f46eb6f7a2e4e5` into `main`, **by squash** (one commit `S` on `main`).

**Why not a merge commit — the ruleset has `required_linear_history`:** merge commits on `main` are impossible for an identity that does not bypass the ruleset (the merge commits in the history of `main` were made under the admin bypass or before the rule). Squash is linear and needs no bypass; the approval is then for the **content** of the head (the tree of `S` equals the tree of the head merged onto the base, verified after the merge). Alternatives: a rebase merge (linear, six commits replayed with new SHAs) or a merge commit under the admin bypass (keeps the exact head as second parent, but uses the identity that skips every rule; if chosen it is recorded as a bypass). **Step 2 is unaffected:** it deploys the exact commit `S` of `main`, which is read and presented after step 1.

**Scope (exact):** `public-reading-deploy/transport.js` (the page's worker admission: a visit, an engagement flush and an action are bound to a public-site window and to a per-window budget — 120 visits, 240 engagements, 60 actions per 10 minutes, at most 500 live windows per family, 10-minute age-out; the engagement budget is the only change in meaning against the two sources); `src/App2029.jsx` (the page-view effect mounted beside the research provider, so a re-mount is not a page view); `src/lib/{events,tracking,visits,publicReadingTelemetry2029,supabase}.js` and one line of `src/pages/Post2029Page.jsx`; one test helper hook (`test/helpers/authBrowserFixture.mjs`, 5 lines, the same bytes the public-content browser test needs); tests and documents; `.github/workflows/live-contracts-2029.yml` (four node tests joined to an existing step; two steps in the existing `marketing-browser-2029` job — **no new job**, so the set of pull-request checks is unchanged).

**Not in the scope:** the account id for signed-in users and the browser id on events (approved by ZURIEL, **pending implementation** — `docs/reviews/measurement-20261113/identity-gap.md`; nothing is built, nothing is made harder); GA4/Meta; public activity; any reader; any database object.

**Conditions to re-check immediately before the merge (the request lapses if one fails)**
1. Head is still `47ee61b27…`, `origin/main` is still `9be0c29fc…` (if main moved: re-run `node --test test/public-reading-action-measurement.test.mjs test/public-reading-analytics-worker.test.mjs test/public-reading-observability.test.mjs test/measurement-page-view-once-2029.test.mjs test/measurement-transport-hardening-2029.test.mjs test/measurement-package-scope-20261113.test.mjs` and `node --test test/measurement-visit-once-2029.browser.mjs` on the updated branch; `transport.js` is shared with other work — whoever merges second re-applies the one contiguous admission region on top).
2. All pull-request checks green on that exact head. **Note:** `protect-main` has no required status checks (read by Codex 13.11): this is checked by hand before the merge until the ruleset action of #1336 is done.
3. Order relative to #1334, #1335 and #1336 is free (trial integration of all four: no conflict).

**Verification after the merge (read-only):** `origin/main` has exactly one new commit `S` on top of `9be0c29fc…` and `git rev-parse S^{tree}` equals the tree of a local merge of the head onto the base; the same six node tests and the browser test pass on `main`; the push-triggered gates are green. Any failure: stop and report.

**Rollback:** `git revert S` through a normal pull request (or `git revert -m 1 <merge commit>` if a merge commit was chosen) (no schema, no data migration, no flag; rows written by the fixed build stay valid; reverting brings back the double rows and the refused in-app navigation).

## Step 2 — deployment of the public site (separate approval; the exact commit is not known yet)
**Request (to be completed after step 1):** deploy the exact merge commit of step 1 to Production by the documented procedure (CLAUDE.md "נוהל פריסה ל־Production מסשן ענן"): `create_deployment` with `gitSource` at that SHA, `projectSettings` as in `docs/reviews/main-live-state-reconciliation-20261104/live-969-release/executed-production-request.json` with the SHA substituted, no PATCH to project settings; wait for READY (a cancelled deployment means the Ignored Build Step — stop, do not retry the same way); then `assign_alias` for `sod1820.co.il`, `www.sod1820.co.il` and `sod1820.vercel.app`.

**Before it, read and present:** the live alias and its deployment/`sourceSha` (`get_alias`, read again after the merge because a parallel session may deploy); the previous deployment id, which is the rollback target; the exact merge SHA; the canary state.

**Decision recommended before step 2 (not a blocker):** where the administrator's marker for the changed visit counts goes (D1) and whether a de-duplicated historical series is wanted (D7) — the counts change on the day of this deployment, which is only known then.

**Verification after step 2 (all read-only except one ordinary visit, which is listed so it can be approved with the step):**
1. Download `/code` from the live domain; find the `/assets/2029-*.js` chunk graph; the chunk of `src/lib/supabase.js` contains `pv29-` (absent on `9be0c29fc`); fetch `/sw.js` and confirm it contains `withinWindowBudget` and `visitWindows`.
2. The post-deploy canary (`post-deploy-canary`); a failed canary, or a failed first attempt, is recorded and reported as a failure, never as PASS; no override of the 15,000 ms threshold without its own approval.
3. One ordinary visit in a real browser (a direct entry, one move to another page family, one refresh), then read the new `site_visits` rows of that browser id: **three** page views are expected (direct entry, the move, the refresh), never five. This writes ordinary visit rows; if it is not wanted, state "not verified on the live site" instead.
4. Read the daily visit counts for the 24 hours before and after (`visits_stats`, `admin_real_traffic`) and record the step, so it is not later mistaken for traffic growth.

**Risks stated:** the worker admission is the public gate for all measurement requests; a budget set too low would drop real traffic silently (it fails closed for the measurement, never for the page); the budgets are working values (D8). A visitor whose browser still holds the previous worker gets the new admission before the first page view of the new build (the bootstrap opens the application only when the worker's `sourceSha` equals the page's and self-heals once per tab session). Known gaps are listed in the package README: a real bfcache restore cannot be produced in the headless fixture; prerender and a chunk-load recovery reload are not covered; budgets restart with the worker.

**Rollback of step 2:** `assign_alias` of the three domains to the previous deployment read before the move (with its own approval); then `git revert` of step 1 if the code must also leave `main`.

## Open decisions that do not block step 1
D1 marker for the changed counts · D7 de-duplicated historical series · D8 the three budgets · D4/D5/D6 readers and wider arrival detail · **approved and pending implementation:** visitor identification (browser id for guests, account id for signed-in members, administrator detail) — `docs/reviews/extraction-1321-20261113/decisions.md` section 0.

## Appendix — files of #1337 at `47ee61b27…` (23)
* `M` .github/workflows/live-contracts-2029.yml
* `A` docs/reviews/measurement-20261113/README.md
* `A` docs/reviews/measurement-20261113/ci-wiring.md
* `A` docs/reviews/measurement-20261113/extraction-map.md
* `A` docs/reviews/measurement-20261113/identity-gap.md
* `A` docs/reviews/measurement-20261113/readers-and-comparability.md
* `A` docs/reviews/measurement-20261113/transport-review.md
* `M` public-reading-deploy/transport.js
* `M` src/App2029.jsx
* `M` src/lib/events.js
* `M` src/lib/publicReadingTelemetry2029.js
* `M` src/lib/supabase.js
* `M` src/lib/tracking.js
* `M` src/lib/visits.js
* `M` src/pages/Post2029Page.jsx
* `M` test/helpers/authBrowserFixture.mjs
* `A` test/measurement-package-scope-20261113.test.mjs
* `A` test/measurement-page-view-once-2029.test.mjs
* `A` test/measurement-transport-hardening-2029.test.mjs
* `A` test/measurement-visit-once-2029.browser.mjs
* `A` test/public-reading-action-measurement.test.mjs
* `M` test/public-reading-analytics-worker.test.mjs
* `M` test/public-reading-observability.test.mjs
