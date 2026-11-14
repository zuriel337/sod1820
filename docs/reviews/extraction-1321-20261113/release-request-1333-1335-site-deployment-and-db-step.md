# Release request · #1333 + #1335 after the code merge — site deployment and database step (14.11.2026)

> **This is a request, not an approval.** Nothing in it is deployed or applied. The two code merges are **done** (authorised by ZURIEL, performed by Codex's release path); what remains is **two separate actions**, each needing its own explicit approval for the exact commit or file: **A** = the Production deployment of `main`, **B** = the database step of #1335 (`world_contributor_research_v2`). A merge is not a deployment (CLAUDE.md 0.4). Evidence and findings: work_log record `d558163b-900a-4a06-9ad5-0d13dbac09ea`.

## 0. Update 14.11.2026, 18:50 UTC (foundation package) — what changed for this request

* **State re-read, unchanged:** `origin/main` is still `4c9630db48958417796948b32031f06eb22ed3f1`; the three aliases (`sod1820.co.il`, `www.sod1820.co.il`, `sod1820.vercel.app`) are still `dpl_89Men3jqSi3pAJ5jGMpp75iZqDzx` (alias update times 15:38 UTC, i.e. the deployment of `9c4cad137`); `world_contributor_research_v2` is still absent and `v1` still has the reviewed definition md5 `81581396c9167206a67a117bdd406f70` (owner `postgres`, options `security_invoker`, `security_barrier`).
* **A and B are unchanged and independent of everything else.** The foundation package (CI fix #1341, the `contribution_links` policy #1340, the remaining DB foundations #1334, Codex's record #1339) contains **no site code** (none of its 61 files is under `src/`, `api/`, `public*`, `supabase/functions`), so the exact commit `4c9630db4` named in A stays the right one whether or not those pull requests are merged first. B (the view) is database step **D1** of the execution list; A is **S1**.
* **Order and preconditions are now one list:** [`foundation-package-20261114.md`](foundation-package-20261114.md) section 5 (R = repository merges, S = site, D = database steps with SHA-256 stamps, preconditions read on 14.11, verification and rollback, K = required checks). Rule of that list: **required checks (K1) only after #1341 is merged (R1)**, because `auth-browser-acceptance-2029` is red on every pull request opened after #1335 until then.
* **Do not mix the two clocks:** A and B are the *already merged* community and content code (#1333, #1335). The package pull requests are *not* merged.

## 1. State read on 14.11.2026 (17:35 UTC)

| | |
|---|---|
| `origin/main` | `4c9630db48958417796948b32031f06eb22ed3f1` — two squash merges on top of the deployed `9c4cad137` |
| #1333 merged | `0d2b855f3ce098c0da0ccb26b7e058edccde3a1e` (17:28:50 UTC), reviewed head `9f5ad2de5eb9d6aa89f5e9bbb7c1a878e311b208`, 13/13 pull-request checks green on that head |
| #1335 merged | `4c9630db48958417796948b32031f06eb22ed3f1` (17:29:29 UTC), reviewed head `130f7079b2651d353d2ad4608858dca6603e9839`, 13/13 pull-request checks green on that head |
| Push gate on `main` | `Production Release and Legacy Compatibility` success for both pushes (runs 43621325612 and 43621380892) |
| **Live site** | alias `sod1820.co.il` → deployment `dpl_89Men3jqSi3pAJ5jGMpp75iZqDzx`, source `9c4cad1372200759e9afe6e9c38709209d4ee02a`, READY. **The merged code is not live.** |
| Database | view `world_contributor_research_v1` only; `world_contributor_research_v2` does not exist (step B not applied) |

**What was merged is exactly what was tested.** The tree of `0d2b855f3` equals the tree of a local merge of head `9f5ad2de5` onto `9c4cad137` (`1f61b0bde3e337bb7829188be9b6c633e1bd8d09`). The tree of `4c9630db4` (`a15c385c8afab570ce415b87ddd2c601033211cf`) equals the tree of the throwaway integration `b78000faa` that the checks below ran on (a merge of both heads onto `9c4cad137`, no textual conflict, including the three shared files `PublicContributor2029Page.jsx`, `publicContributor2029.test.js` and `live-contracts-2029.yml`).

## 2. Integration checks on that tree (a throwaway worktree; nothing pushed)

| Check | Result |
|---|---|
| every test file the two packages touched (non-browser) | 190/190 |
| the merged `live-contracts-2029` community step (33 files) | 288/288 |
| G1 smoke against the real base (`G1_BASE_SHA`) | 51/51 |
| `npm run build`; built dependency graph isolation; theme isolation; first-load graph | pass |
| `test-legacy-retired`, `test-one-tree-content-contract`, `test-2029-module-boundary` | pass |
| `test-content-visible-before-entry-e2e` against the public-reading bundle, read only, real public data | 58/58. A first run against the plain `npm run build` bundle failed 18 of 54: that script needs the public-reading profile (`SOD_BUILD_TARGET=2029 VITE_PUBLIC_READING_RELEASE=public-reading-20261101`), as its header says; the failure was my invocation, not the code |
| real Chromium: `m0d-world-candidate-visible`, `m0d-contributor-stale-client` (OLD = build of `9c4cad137`, NEW = integrated tree) | 1/1 and 1/1 |
| strings present in the integrated bundle and absent from the deployed one | `data-community-number`, `sod29-community-number`, «פרסום מתועד באתר מאז», «השרשור התעדכן בתגובה», «סגירה וחזרה להודעה», `world_contributor_research_v2` |

Browser proofs of the community features on real public data (read only; desktop and iPhone 13) are in the description of #1333 (thread totals recounted in the database for 9 threads, close-and-return, fold, direct link, rise marker, Yaniv's card, Esther26, the «הגילוי היומי» card, clickable numbers on the real feed: 18 links, none inside an address, date or telephone number).

## 3. What changes for the visitor after A, in plain language
* **Community chat:** every thread shows its total (opening message plus all nested replies) even with the replies closed; closing the replies returns next to the message; a long message shows a compact preview and opens in place; a direct link opens the full text; a thread that rose because of a reply is marked.
* **Numbers in a message** (from 1 upward; a year that stands by itself counts) open the Number panel in place; dates, times, telephone numbers, decimals and anything inside a web address stay text.
* **Writer cards and writer pages** show the same portrait, a short summary of public activity, and the publication date on the site («פרסום מתועד באתר מאז …») separately from the first chat message; no membership date. Esther26 is the public name of the reviewed owner, with the history united and the link to her account unchanged.
* **Public research findings** that have not passed the Human Gate appear in the World feed, finding pages and share cards after the verified ones, labelled «טרם אומת»; their status is never changed. Contributor lists show them only after step B.

## 4. Step A — Production deployment (separate approval; the commit is exact)
**Request:** deploy `main` at `4c9630db48958417796948b32031f06eb22ed3f1` by the documented procedure (CLAUDE.md «נוהל פריסה ל־Production מסשן ענן»): `create_deployment` with `gitSource` at that SHA, `projectSettings` as in `docs/reviews/main-live-state-reconciliation-20261104/live-969-release/executed-production-request.json` with the SHA substituted (build `--public-production-candidate --review-source=<SHA>`, `commandForIgnoringBuildStep` allowing only that SHA), no PATCH of project settings; check `get_deployment` after about 40 s (`CANCELED` = the ignored build step, stop); then `assign_alias` of `sod1820.co.il`, `www.sod1820.co.il`, `sod1820.vercel.app` (a READY deployment alone moves no domain).

**Re-check immediately before the approval is used (the request lapses if one fails):**
1. `origin/main` is still `4c9630db4…`; the alias is still `dpl_89Men3j…` (`get_alias`, read again, because a parallel session may deploy).
2. The push gate of `main` is green and the canary state is read.
3. The previous deployment id (the rollback target) is written down: `dpl_89Men3jqSi3pAJ5jGMpp75iZqDzx`.

**Verification after A (read only unless stated):**
1. Download `/code` from the live domain; find the `/assets/2029-*.js` graph; the chunks contain the strings of section 2 (absent from `dpl_89Men3j…`); fetch `/sw.js`.
2. The post-deploy canary; a failed canary or a failed first attempt is recorded and reported as a failure, never as PASS; no override of the 15,000 ms threshold without its own approval.
3. In a real browser, read only: `/community` shows thread totals, the thread of 12 Nov opens from the «הגילוי היומי» card on «עכשיו», a number inside a message opens the Number panel with the URL unchanged, Yaniv's card shows the same portrait as his writer page, and the World feed shows «טרם אומת» on a candidate. Anything not checked is stated as not verified.

**Rollback of A:** `assign_alias` of the three domains back to `dpl_89Men3jqSi3pAJ5jGMpp75iZqDzx` (its own approval); then, only if the code must also leave `main`, `git revert` of the two squash commits through a pull request. No data, schema or media is involved.

## 5. Step B — database step of #1335 (separate approval; independent of A)
`supabase/proposed/20261112134000_m0d_world_contributor_research_candidates.sql` (a new view `world_contributor_research_v2`; `v1` is untouched), rollback `supabase/proposed/ROLLBACK_20261112134000_m0d_world_contributor_research_candidates.sql`, read-only checks `docs/reviews/public-content-20261113/post-apply-checks.sql`. The exact file and its commit are presented when approval is asked. **Order is free:** before B the new site falls back to `v1` (contributor lists show no candidates; the World feed and the exact finding already show labelled ones); after B it reads `v2`; an old tab reads `v1` only. Rollback: drop `v2`; the site falls back by itself. Behaviour table: `docs/reviews/public-content-20261113/README.md` section 7.

## 6. Not part of this release (stated so it is not assumed)
* **PR #1340** — the `contribution_links` read policy (a SQL proposal with its own rollback and tests; since 14.11 it also covers links that point at another message). A separate database approval (**D2**); nothing here depends on it.
* **#1334** — the remaining database foundations: steps 1 and 9 are applied (DEF-001b, 14.11.2026 16:41 UTC); steps 2, 4, 5, 6, 7, 8, 10 are prepared (**D3–D9**); CL-16 is **D10**. Each is a separate approval; none depends on A or B.
* Showing a message's source on the site, and the link from the personal area to the community history: separate follow-ups. For the source, the existing mechanisms are `contribution_links` (old chat) and the `decision_ledger` row `community_source_import`; no new column or table is proposed.

## 7. Open decisions that do not block A or B (the full table of the package is section 6 of [`foundation-package-20261114.md`](foundation-package-20261114.md))
* **Clickable numbers:** ZURIEL approved «from 1 upward, a year that stands by itself included; dates, times, telephone numbers and decimals stay text». Cases not decided and left as numbers: a day written with a month name (`12 בנובמבר 2026`), dashes with spaces around them (`812 - 848`), card-like groups of four digits. One constant (`MESSAGE_NUMBER_MIN_VALUE`) holds the threshold.
* **`cl_public_read` exposure** (PR #1340): the table is readable for the provenance of non-public messages today, independent of this release.
