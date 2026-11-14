# Public content: "content visible before entry" and public research findings labelled «טרם אומת» (M0-D)

Package 3 of the foundation closure. Status: **branch only** (`claude/extract-public-content-20261113`). Nothing here is merged, deployed or applied. Merging code is not a deployment, and the database file is a proposal in `supabase/proposed/`; each needs its own explicit approval of ZURIEL for the exact commit (CLAUDE.md rule 7 and section 0.4).

## 0. Update 14.11.2026 — base is current `main`, release scope and order (read this first)

* **Base moved.** `origin/main` is now `9c4cad137` (contains the squash merges of #1336 — G1 enforcement, `96ef477b0` — and #1337 — measurement; `9c4cad137` is deployed). This branch carries a merge of that main (no conflict). Sections 2 and 5 below still describe the original base `9be0c29fc` and "Package 2 is built in parallel"; they are history. **Package 2 is in main now:** the contract change of this package passes the G1 smoke against the real base (51/51 in CI mode) because the §8.3 change carries its dated `Human Gate` line. That line is the *mechanical* rule; whether the decision of 12.11 is ZURIEL's is a human gate (section 9, decision 5 stays open).
* **Shared files with #1333 (community and writer cards):** `src/pages/PublicContributor2029Page.jsx`, `src/components/contributor2029/publicContributor2029.test.js` and `.github/workflows/live-contracts-2029.yml`. Merged in both orders without a conflict; the merged page carries the `firstPublicationAt` line of #1333 **and** the «טרם אומת» status label of this package; the tests of both pass on the merged tree.
* **Release scope of this package (what an approval would cover):** (1) merge of the code; (2) a site deployment (carries the readers, the label, the share card, contract §8.3 and the CR-X2 display policy); (3) the database step `world_contributor_research_v2` (a view; `v1` untouched), proposal files only until approved. No Edge function, no flag, no secret, no other table.
* **Apply order.** (1) merge #1335 (squash, linear history — see the release requests); (2) the site deployment of the exact commit of `main`, by the Production procedure; (3) the database step. **2 and 3 are independent**: before the step the new site falls back to `v1` (candidates are then listed by the table readers, not by the contributor view); after it the site reads `v2`; an old tab reads `v1` only. Verify with `post-apply-checks.sql` (read-only) after 3. Rollback: drop `v2` (the site falls back by itself) and/or redeploy the previous deployment; never touch `v1`.
* **#1333** is independent of this package (no code or database dependency); it may be merged and deployed before, after or together with it.

## 1. What it is, in plain words

* **Rule (Human Gate ZURIEL 12.11.2026, Design Contract V2 section 8.3).** Public content is visible where it is listed, before the reader enters it: a real image, a real excerpt of a finding, a thumbnail, no empty card, no dead link. A public research finding that has not passed the Human Gate (stored status `candidate`) is shown with the label «טרם אומת» ("not yet verified"). Its status is never changed, never promoted, never written by the site.
* **Code half.** The public readers show such findings (World feed, an exact finding, finding pages, share cards, number cards), in a second tier after the verified ones. Share cards of an unverified finding carry the label and stay `noindex`.
* **Database half (separate step).** A new view `world_contributor_research_v2` = the live `world_contributor_research_v1` + the status `candidate`. `v1` is not changed, so a tab or an old client that still runs the previous site keeps working. The site reads `v2` and falls back to `v1` only while `v2` does not exist.
* **Contract half.** `SOD1820_DESIGN_CONTRACT_V2.md` gets section 8.3, one Human Gate entry in its header and acceptance item 10.

## 2. Source, base, head

| | |
|---|---|
| Source | PR #1321, frozen at [`4a406fed2`](https://github.com/zuriel337/sod1820/commit/4a406fed273b9b381577c5b2a03d91c58de46451). Topic commits of #1321: [`b83e890d3`](https://github.com/zuriel337/sod1820/commit/b83e890d3bac9d615453ef771b2d7167f11f1a05) (stage 1, readers and labels), [`813998b5b`](https://github.com/zuriel337/sod1820/commit/813998b5b392f9c61e3c82b8d20360db3c3cd9a7) (stage 2, contract), [`1ebee2627`](https://github.com/zuriel337/sod1820/commit/1ebee2627a4510152e2a97f21be5a4ecc3697cbe) (stage 3, visible content), [`225b96e68`](https://github.com/zuriel337/sod1820/commit/225b96e68398e9a93d484cdc54fa9d5c30c4c96f) (stage 4, end-to-end script), [`b068468e5`](https://github.com/zuriel337/sod1820/commit/b068468e5845bed9e605ccd6a5ac7727520c6feb) (first view proposal), [`6e1068b23`](https://github.com/zuriel337/sod1820/commit/6e1068b231ed0b2dfb459029133faa0ddd9b392e) (round 3, view `v2`), [`5ded5b7e1`](https://github.com/zuriel337/sod1820/commit/5ded5b7e16aef947cbb277bb176d9cbdd3d347ac) (round 4, contributor page label, stale-tab browser check), [`d3b266d6d`](https://github.com/zuriel337/sod1820/commit/d3b266d6d4613838721600ebdb012e250937909d) (round 5, verify an existing `v2`) |
| Base | `origin/main` [`9be0c29fc`](https://github.com/zuriel337/sod1820/commit/9be0c29fc52337069192b057ef1a9882c7026009) |
| Code head | `f2cc4dae037d028420f78e0bfc1def8527f93a70` (the last code commit; one documentation commit follows it: this folder and the scope pin test) |

## 3. Scope (exact file list, 41 files; the same list is in `scope.json`, pinned by `test/public-content-package-scope-20261113.test.mjs`)

Every file is traced to its #1321 commit in [`extraction-map.md`](extraction-map.md).

**Database step (proposal, nothing applied)**
`supabase/proposed/20261112134000_m0d_world_contributor_research_candidates.sql` · `supabase/proposed/ROLLBACK_20261112134000_m0d_world_contributor_research_candidates.sql` · `tests/sql/m0d_world_contributor_research_candidates_v1.sql` · `scripts/run-m0d-contributor-view-sql-test.sh`
(sha256 of the two SQL files equals the values recorded in #1321's release request: `24251111…bfce` and `77ccd15c…100f`.)

**Site code**
`src/lib/research/contributorResearchView.js` (new: asks `v2`, falls back to `v1` only on "relation missing") · `src/lib/research/contributorFindingsProjection.js` · `src/lib/research/worldAllResearchProjection.js` · `src/lib/research/worldDiscoveryStream.js` · `src/lib/research/worldFindingShare.js` · `src/lib/research/worldPublicFindingReader.js` · `src/lib/research/worldZviApprovedFindings2029.js` · `src/lib/research/researchObjectPresentation.js` · `src/lib/research/numberSourceCards.js` · `src/components/research/ContributorFindingsLens.jsx` · `src/components/research/FindingSurface.jsx` · `src/components/research/WorldPublicUpdates2029.jsx` · `src/components/research/ZviFindingCards2029.jsx` · `src/components/number2029/NumberZviPublicResearch2029.jsx` · `src/components/experience2029/CanonicalMediaImage2029.jsx` · `src/components/experience2029/sod2029.css` (4 lines: the status label) · `src/pages/World2029Page.jsx` · `src/pages/worldComposition2029.css` · `api/og.js` · `src/components/contributor2029/publicContributor2029Model.js` · `src/pages/PublicContributor2029Page.jsx`.

**Contract and acceptance script**
`SOD1820_DESIGN_CONTRACT_V2.md` · `scripts/test-content-visible-before-entry-e2e.mjs`

**Tests**
`test/m0d-contributor-view-v2.test.mjs` · `test/m0d-contributor-stale-client.browser.mjs` · `test/public-research-candidates-visible-2029.test.mjs` · the four modified world tests (`test/world-all-source-findings-2029.test.mjs`, `test/world-finding-share-og-2029.test.mjs`, `test/world-public-finding-reader-2029.test.mjs`, `test/world-public-reader-contract-2029.test.mjs`) · unit tests moved to `v2` (`src/components/contributor2029/publicContributor2029.test.js`, `src/components/contributor2029/publicSourceCatalog2029.test.js`, `src/lib/research/contributorFindingsProjection.test.js`).
Added by this extraction (not in #1321): `test/public-content-privacy-2029.test.mjs` · `test/public-content-display-policy-20261113.test.mjs` · `test/m0d-world-candidate-visible.browser.mjs` · `test/public-content-package-scope-20261113.test.mjs` · an edit of `test/topic-public-findings-via-number-2029.browser.test.mjs`.

**Docs of this package**: this README, `extraction-map.md`, `ci-wiring.md`, `post-apply-checks.sql` (read-only), `scope.json`.

## 4. What is NOT included, and why

| Not included | Why |
|---|---|
| `src/pages/Post2029Page.jsx` (#1321 hunk) | The hunk is the measurement change `logView("post", post.slug, post.id)` (M0-F), not this topic. Main's current file is untouched. |
| `test/helpers/authBrowserFixture.mjs` (`supabase` option) | The task assumed the stale-client test needs it. It does not: that test serves the builds itself. Only `test/raziel-access-2029.browser.mjs` (Raziel) uses the option. Whoever extracts that test takes the hunk. |
| `src/components/experience2029/SystemFrame2029.jsx`, `src/lib/research/numberPageAddress.js` | N14 (public number links). |
| Everything of Raziel / Edge / CL-13, measurement, M0-A, M0-B, M0-C, M0-E | Other packages. |
| `.github/workflows/live-contracts-2029.yml` | Not edited by instruction. The steps are in [`ci-wiring.md`](ci-wiring.md). |
| `test/m0-intermediate-states.test.mjs`, `tests/live/m0_post_apply_verification.sql`, the M0 apply plan and release request | M0 integration files (the M0 folder is frozen). The D rows of the post-apply file are reproduced as `post-apply-checks.sql` and were run here on PostgreSQL 16 and 17. |
| The stale M0 wording of `cluster-D-visible-content.md` | Replaced by this README; the facts that still hold are kept, the changes of meaning are listed in section 6. |

## 5. Dependencies and order

* No code dependency on another package. The two shared contributor files were re-applied on top of main's current versions (main changed them for the community and writer pages: commit `67342160f`); only #1321's M0-D hunks were added and main's changes are intact.
* **Package 2 (G1 enforcement)** is built in parallel and is not touched. The contract change here needs the dated approval record once P2 is in main; see section 9.
* **Site code and the database step are independent and order does not matter** (section 7). Recommended order: (1) merge the code and deploy it by the Production procedure; (2) apply the database step; (3) run `post-apply-checks.sql` read-only. Each of 1, 2 needs its own approval.
* Rollback order is also free: dropping `v2` first leaves the new site on the `v1` fallback; redeploying the previous site first leaves `v2` unused. `v1` is never touched.

## 6. Where this package differs in meaning from #1321 (reported, not hidden)

1. **Unreviewed candidates now pass the same admission everywhere they are listed or opened.** Found while proving acceptance item 3: in #1321 the World feed (`worldDiscoveryStream`) and the exact finding opened by id (`worldPublicFindingReader`) checked only `privacy_scope` and `person_only`. The finding pages additionally apply the research-role, contact-detail, owner-mention, excluded-material and live-source rules (this is what #1321's own risk section assumed). A candidate with a phone number or an e-mail address in its text was printed by the feed and by id. Proven failing before, passing after (`test/public-content-privacy-2029.test.mjs`, scenario E of `test/m0d-world-candidate-visible.browser.mjs`). Fix, commit `57874ce6c`: `readUnverifiedPublicResearch()` and `admitPublicCandidateRows()` reuse `publicResearchPresentationEligible` and the live-source reader; a candidate opened by id must pass the same eligibility. Verified rows are untouched; the fix can only show **fewer** rows than #1321 (status, label, order unchanged, nothing written). Decision 8 below asks ZURIEL to confirm.
2. **Test expectations that changed because the owner's rule changed (nothing weakened):** the four world tests expect a public candidate after the verified findings, labelled, and `candidate` in the exact query (as in #1321). `test/topic-public-findings-via-number-2029.browser.test.mjs` (manual, not in CI) failed on #1321's behaviour "number findings open by themselves": its manual-button path now runs with `IntersectionObserver` absent (all old assertions kept) and a new test covers the automatic path. Commit `f2cc4dae0`.
3. **Additions to proofs:** the SQL runner honours `G1_PG_BIN` and prints the PostgreSQL version; the SQL test now asserts the "re-run is a no-op" step and checks v1 privileges and untouched rows after the rollback (a mutation of the new assertion was caught); the pre-change client (`9be0c29fc`) joins the commits that must read `v1` only. Commit `f5b9acd80`.
4. **One display policy for the list, the exact finding and the share card (review finding CR-X2 of Codex, 13.11.2026).** Reproduced with the real share handler and the real reader on synthetic answers: a candidate (public, research role, live source) whose statement holds a contact detail was refused by the finding page but printed by `/api/og`; a clean statement with the contact detail only in the stored Hebrew presentation summary was returned by the exact reader and by the share card. Now `researchRowDisplayPolicyOk()` (`worldZviApprovedFindings2029.js`) is the one policy, used by the list admission (`project()`), the exact finding (`worldPublicFindingReader.js`, **every status**) and the share card (`api/og.js`, every status; a candidate also needs the admission of the finding pages, the research role). It checks the fields that are shown: the statement, the contributor, the stored Hebrew presentation (title, summary, source label, context line) and what the shared presenter derives from it for Hebrew (title, summary, source label, context line) for contact details (e-mail, phone), and the statement, contributor and Hebrew title/summary for an owner mention. Other locales' variants are not shown by these surfaces and are not read; the presenter's own fallback title for a «Zuriel research thread» statement is not read as an owner mention. A refused row gives the neutral card, `null` by id, and no list row. Nothing else widens: no other domain, no new blocking list. **Changed expectations (not weakened):** two share-card tests had a candidate without the research role; the finding pages already refuse such a candidate, so the card now does too — their fixtures carry the role and a «no research role» case was added. The new `test/public-content-display-policy-20261113.test.mjs` runs 12 refusal cases (6 fields × candidate and approved) on the three surfaces, the allowed cases (a clean candidate is listed, opens and is shared with «טרם אומת»; a clean verified finding is indexable) and the non-displayed-field case; on the code of `1b99fa12d` all 12 refusal cases fail.

## 7. Behaviour before and after the database step (proved, section 10)

| State | What happens | Proof |
|---|---|---|
| New site, database step **not** applied (`v2` missing) | Contributor-source readers ask `v2`, get "relation missing" (PGRST205 / 42P01) and read `v1`: nothing breaks, no candidates there. The World feed, the exact finding and the finding pages without a contributor filter read the table `research_objects` directly, so they show labelled candidates already (RLS `ro_public_read` admits `privacy_scope=public`; **documented by #1321 on 12.11, not re-read live here**). | `m0d-contributor-view-v2` tests 2, 3; stale-client scenario C; world-candidate scenario D |
| New site, `v2` present | Contributor-source readers read `v2` and add the candidate tier after the verified one, labelled. A permission error on `v2` is **not** treated as missing: no silent fallback. | tests 1, 3; stale-client B, D |
| **Old client** (previous site, e.g. a tab left open) with `v2` present | Reads `v1` only; `v1` is byte-for-byte the same, so it never receives a candidate and never shows one unlabelled. | tests 5-8 (git-sourced, four commits incl. `9be0c29fc`); SQL AFTER block; stale-client A; world-candidate C |
| `v2` dropped (rollback) while the new site is live | Falls back to `v1`, no fault. | stale-client C; SQL rollback block |

Note for expectations: the community **researcher page** reads only canonical, promoted findings, so a candidate never reaches it, with `v1` or `v2` (round 5 of #1321 corrected its own round-4 claim). Its «טרם אומת» label is defence in depth only. Candidates appear in the World feed, the exact finding, finding pages (also per contributor, after the database step), share cards and number cards.

## 8. Opening content changes no status and publishes no personal information: the proof for each claim

| Claim | Test (all run, all pass) |
|---|---|
| Status is kept, never promoted, nothing is written (feed, finding pages, number cards, contributor model) | `public-research-candidates-visible-2029` ("World stream ...", "finding pages ...", "number source cards ...", "aligned readers never write ..."); `public-content-privacy-2029` test 1 (fake client has no write method); browser A: no table written, only visit telemetry and a read-only RPC |
| `private` stays hidden | `public-content-privacy-2029` tests 2-3 (also when the upstream ignores every filter), 9 (by id), 11 (share card); browser B (rows 2, 4, 5) |
| `person_only` stays hidden | same tests; `public-research-candidates-visible-2029` "faulty upstream" |
| `public_candidate` (dossier scope) stays under the existing policy (hidden here) | same tests; browser B (row 3) |
| No contributor id exposed | `public-content-privacy-2029` tests 7, 8 (feed and finding pages: the source-owner id never appears; the creator is the generic «מקור ציבורי» unless a public person); `public-research-candidates-visible-2029` (Zvi's id never output; candidate query does not select it) |
| No contact details exposed (e-mail, phone, owner mention, excluded material, non-live source, evidence line) | `public-content-privacy-2029` tests 4, 5, 9; browser E |
| Share card: neutral card for private / person_only / excluded / rejected / missing; labelled `noindex` card for a clean candidate | `public-content-privacy-2029` test 11; `world-finding-share-og-2029` |

Not covered (known gap 2): the share-card endpoint `api/og.js` does not check contact details in a candidate's text (it needs the exact finding id; the page itself now refuses such a finding).

## 9. Contract change: dated approval record needed when P2 is in main

`SOD1820_DESIGN_CONTRACT_V2.md` is a registered contract (named in the Owner Index). This package changes it (4 hunks, exactly #1321's: the Human Gate header entry, the "superseded in part" note on one section 8.1 sentence about candidate research, section 8.3, acceptance item 10 in section 12). P2's rule (`registeredContractChangeViolations`) accepts a registered contract change only with a **new dated line** containing "Human Gate" or "CHANGE-RECORD:" in the diff, or an Owner Index line. The present diff carries such lines (`Human Gate ZURIEL · … 12.11.2026`, and the heading of 8.3), so the mechanical rule is met. Whether the 12.11.2026 decision really is ZURIEL's is a **human gate that CI cannot check**: the integrator must attach the approval record (the work_log reference of ZURIEL's 12.11.2026 decision, which I could not read) when P2 lands. The law `canonical_ui_components_law` (held in the database) should point to section 8.3; that is a database write and is **not** done (decision 5).

## 10. Tests run

Environment: Node v22.23.4 (the repository `.nvmrc` is 24.21.0, so CI runs on Node 24: not run on 24 here), PostgreSQL 16.15 and 17.12 (local binaries, temporary data directory, unix socket), Chromium 1243 via Playwright 1.63.0 (no pinned-version mismatch, default `deviceScaleFactor`).

| Command | Result |
|---|---|
| `node --test test/public-research-candidates-visible-2029.test.mjs` | 12/12 |
| `node --test test/m0d-contributor-view-v2.test.mjs` | 10/10 (the four git-sourced "old client" tests ran, none skipped) |
| `node --test test/public-content-display-policy-20261113.test.mjs` | 17 tests, all pass; on the code before the CR-X2 fix the 12 refusal cases fail (reproduction) |
| `node --test test/public-content-privacy-2029.test.mjs` | 11/11; with the admission removed 5 of them fail (mutation) |
| `node --test test/public-content-package-scope-20261113.test.mjs` | 4/4 |
| `node --test` on the four world tests | 10 + 8 + 4 + 4, all pass |
| `node --test` on `contributorFindingsProjection.test.js`, `publicContributor2029.test.js`, `publicSourceCatalog2029.test.js`, `worldDiscoveryStream.test.js` | 19, 12, 9, 13, all pass |
| `G1_PG_BIN=/usr/lib/postgresql/{16,17}/bin bash scripts/run-m0d-contributor-view-sql-test.sh` | PASS on 16.15 and on 17.12: apply, after-checks (v1 definition and privileges byte-identical, v2 rows, no default-privilege leak), idempotent re-run (same view, definition, options, privileges, rows), exact rollback, then four expected stops (foreign `v2`, `v2` without `security_invoker`, `v2` with an extra grant, `v1` drift) that leave everything unchanged |
| `post-apply-checks.sql` run before / after apply / after rollback on 16 and 17 | `false,true,false` / `true,true,true` / `false,true,false` |
| `OLD_DIST=<build of 9be0c29fc> NEW_DIST=dist node --test test/m0d-contributor-stale-client.browser.mjs` | 1/1: A old client reads `v1` only, no candidate; B new site reads `v2`; C `v2` missing falls back to `v1`; D permission error does not fall back |
| same, `test/m0d-world-candidate-visible.browser.mjs` | 1/1: A candidate shown with «טרם אומת», no table written; B private / dossier / person_only / rejected not shown; C pre-change site does not show the candidate; D `v2` missing, still opens; E contact detail not printed |
| `node --test test/topic-public-findings-via-number-2029.browser.test.mjs` | 3 of 4: the two Topic tests pass (the manual-button test and the new automatic-load test); the fourth ("World all-source text discovery") fails on `origin/main` too |
| Existing tests of the touched areas, plus this package's own: 87 files (scripts via `node`, others via `node --test`; found by grepping the tests that import or read any file of the package: public reading, community, writer personal, Gilui Yomi `now-writer-pins`, contributor, World, Number, Home, Beit Midrash, SEO/OG, design contract, G1 smoke, first-load graph, legacy-retired) | 69 `node:test` files, 589 tests, 583 pass, **6 files fail, all identical on plain `origin/main`** (next row); 18 plain scripts pass |
| Pre-existing failures (same counts on a clean copy of `9be0c29fc`) | `galleryMediaEnvelope.test.js` (1 test: "Projector media … no gallery_images read"), `date-display-rule-2029` (1 test: `HomeComposition2029.jsx:129,141`), and four files that cannot import `react-test-renderer` here (`doc37-runtime-admission`, `group-message-numbers-2029`, `home-live-updates-2029`, `home-river-code-admission-2029`; CI installs it) |
| `scripts/test-2029-route-seo-behavior.mjs`, `test/public-canonical-parity-repair.test.mjs`, `test/public-reading-production-artifact.test.mjs`, `test/public-reading-public-candidate.test.mjs` | need the generated public-reading artifact first (`node scripts/build-public-reading-production.mjs`, done; the generated folder is git-ignored); then the script passes and the three test files pass 24, 25 and 13 |
| `SOD_BUILD_TARGET=2029 npx vite build` | builds (head and base) |

## 11. Not run, and why

* `scripts/test-content-visible-before-entry-e2e.mjs`: it reads the live backend. Not run as an acceptance. Disclosure: I started it for about 20 seconds by mistake (I wanted a syntax check and had not noticed that without `BASE_URL` it serves the local build, which then reads the real Supabase). It blocks every non-GET request and write RPC, so nothing could be written; the process was killed by the timeout and the stray browser was killed. I made no other live call. After the admission fix the live run may find fewer candidates in the feed than the 58/58 recorded in #1321 on 12.11; it must be run by the integrator with approval (`BASE_URL=<preview> node …`, or the local build) and read as a data question if the "«טרם אומת» label in the feed" check finds none.
* Manual Python browser tests that mock only `world_contributor_research_v1` (`test/public-contributor-routes-2029.browser.py`, `test/public-contributor-2029-loader.browser.py`, `test/world-zvi-source-findings-2029.browser.py`): Python Playwright is not installed here, so they were not run. The new contributor reader asks `v2` first and these mocks answer an unknown table with an empty 200, so they may need `v2` added to their mock lists (a one-line change each). Not edited blind. They are in no workflow.
* `test/gallery-source-findings-one-tree-2029.browser.mjs`, `test/number-fullpage-acceptance-2029.browser.cjs` (need the preview build and a Playwright runner on port 4231): not run.
* Node 24, and the CI jobs themselves.
* Live RLS and live view definition: not re-read (no live access). The SQL file stops itself if `v1` differs from the reviewed definition (md5 `81581396c9167206a67a117bdd406f70`); the integrator should still read `post-apply-checks.sql` row D2 read-only before the step.

## 12. Impact the visitor sees (plain language)

* In the World, under «חדש בעולם» → «ממצאים», public findings that no human has verified yet appear, after the verified ones, with the label «טרם אומת». Opening such a finding works; sharing it gives a card that says «טרם אומת» and is kept out of search engines.
* Update cards in the World show the source's real image in a fixed 16:9 box; a picture that fails to load is dropped instead of leaving a broken square (this applies on every surface that uses the shared `CanonicalMediaImage2029`, as in #1321). On a number page the findings load by themselves when the section is read, without a click.
* Nothing private, nothing marked "only for this person", and no phone numbers or e-mail addresses appear; a verified finding is never pushed down by unverified ones.

## 13. Decisions for ZURIEL (not decided here; one line each)

1. Should Zvi's own findings lists («ממצאי צבי») and the Beit Midrash study examples also show unverified findings? (Today: no, kept as deliberate Human-Gate lists.)
2. Should the researcher pages (`/community/researcher/:slug`, `/researcher/:slug`) show unverified findings too? (Today they show only approved, promoted ones.)
3. Which other items should open before entry beyond the surfaces checked: the single video page, the single book and its reader, ELS, researcher pages? (#1321 left them for M1.)
4. On the full finding card «טרם אומת» (governance) sits near «מצב בדיקה: אומת» (engine check); can it confuse, and do you want other wording?
5. The database-held law `canonical_ui_components_law` should point to section 8.3 and to the label helper (pointer only): approve that database write?
6. Is "a third of the feed window" the right share for unverified findings among about 4,574 public candidates (count recorded on 12.11)?
7. Admin tables: one uniform governance label there (outside the public scope)?
8. Confirm the extraction fix of section 6.1: unverified findings with a phone number, e-mail, owner mention, excluded material, no research role or a non-live source stay out of the feed and out of opening by id, as on the finding pages. (If you instead want them shown, that is an explicit new decision, not a default.)
9. Apply the same contact-detail check to the share-card endpoint (known gap 2)?

## 14. Known gaps

1. The community researcher page does not show candidates (it reads canonical, promoted findings only).
2. `api/og.js` checks privacy, `person_only`, excluded material and the live source, but not contact details or the research role for a candidate; reaching it needs the exact finding id.
3. The live end-to-end script and the live RLS were not exercised here (section 11).
4. The browser proofs use a mocked Supabase origin and the built site, not live data.
5. The manual Python/Playwright browser mocks listed in section 11 may need `v2` added.
6. Node 22 here, Node 24 in CI.
7. The md5 pin of the reviewed `v1` definition is from 12.11.2026; if `v1` changed since, the SQL stops before creating anything (by design) and the pin must be re-reviewed.

## 15. Rollback

* **Database:** `supabase/proposed/ROLLBACK_20261112134000_m0d_world_contributor_research_candidates.sql` drops `v2` only (stops if another view depends on it; checks `v1` unchanged). The site falls back to `v1` by itself.
* **Code:** redeploy the previous Production deployment (CLAUDE.md procedure, explicit approval). Revert of the branch commits is a normal git revert; no data or media is involved.
* **Contract:** revert the commit `Public content 3/5`.
