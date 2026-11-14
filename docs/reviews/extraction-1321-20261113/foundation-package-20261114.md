# Foundation package — one integrated handoff for Codex review (14.11.2026)

> **A review request, not an approval.** Prepared under ZURIEL's order of 14.11.2026 (writer and sole integrator: Claude; Codex reviews and coordinates the release). Prepared and pushed: branches, tests, documents, draft pull requests. **Not done, because not approved:** no merge, no deployment, no live SQL, no permission or ruleset change, no deletion. Each of those is one line of the execution list (section 5) and needs ZURIEL's explicit approval of that exact line (CLAUDE.md rule 7, 0.4). Evidence and journal: work_log record `d558163b-900a-4a06-9ad5-0d13dbac09ea` (passive append).

## 1. Heads (final) and the integrated tree

Base: `origin/main` `4c9630db48958417796948b32031f06eb22ed3f1`, tree `a15c385c8afab570ce415b87ddd2c601033211cf` (read again 14.11.2026; live site still `dpl_89Men3jqSi3pAJ5jGMpp75iZqDzx`, source `9c4cad137`).

| Unit | PR | Branch | Head | Checks at that head |
|---|---|---|---|---|
| CI fix: historical site pinned for the public-content proofs | [#1341](https://github.com/zuriel337/sod1820/pull/1341) | `claude/ci-historical-site-pin-20261114` | `6f11353c85d4f17ba5ca6b6fe7b0c916918111bc` | 12 of 12 green; both browser proofs ran 2/2, 0 skipped (job 132536402930) |
| `contribution_links` read policy (proposal) | [#1340](https://github.com/zuriel337/sod1820/pull/1340) | `claude/contribution-links-visible-read-20261114` | `5294726117b3c69c67a2de375823741ecf44d8c1` | 10 of 11 green; the red one is `auth-browser-acceptance-2029` for the inherited reason (below) |
| DB foundations, remaining steps | [#1334](https://github.com/zuriel337/sod1820/pull/1334) | `claude/extract-db-foundations-20261113` | `ae513e0b8f11e18c6509bf4cb08efea075c9d1ca` | 11 of 12 green; same single inherited red check |
| DEF-001b packet record (Codex, untouched) | [#1339](https://github.com/zuriel337/sod1820/pull/1339) | `codex/def001b-release-packet-20261114` | `50b72a7e3fef98b2c86a57f325d486bc9b8eea27` | its own CI (not re-run by me) |
| **Integrated tree** (throwaway, draft) | [#1342](https://github.com/zuriel337/sod1820/pull/1342) | `claude/foundation-package-20261114` | `a2b837c5a9af607caf2221919ceaa36ce7783e2a`, tree `10c833a3ee476be3032facd5f846779c32642462` | see section 3 |
| This document, the release requests, the extraction table | [#1338](https://github.com/zuriel337/sod1820/pull/1338) | `claude/extract-table-20261113` | (the head of that pull request; docs only) | docs only |

**The inherited red check.** On every pull request opened after #1335, the old site of the two public-content browser proofs was built from the pull request's base, which by then contains the change: old equals new and both proofs fail (`old code reads v1`, `the pre-change site never shows the candidate`). #1341 pins the old side to the historical commit `9c4cad1372200759e9afe6e9c38709209d4ee02a`. #1340 and #1334 do not contain that fix, so their `auth-browser-acceptance-2029` is red until #1341 is merged and they are synchronised; **on the integrated tree it is green** (section 3). The evidence file of #1341's run was read: `tested=2a6ead5f34cf2f478b176c633d0224f68df65da3` is GitHub's test-merge commit ("Merge 6f11353c8 into 4c9630db4", verified through the API) and `historical=9c4cad1372200759e9afe6e9c38709209d4ee02a` is the pin.

**The merge sequence was proved, not assumed.** Squash-merging, in this order, #1341 → #1334 → #1340 → #1339 onto `4c9630db4` gives a tree **identical** to the tested integration tree (`10c833a3e…`, compared in a throwaway worktree; no conflict in any of the four). No site code changes in the package: of the 61 files none is under `src/`, `api/`, `public*`, `supabase/functions` or `package*.json`; the only workflow edit is `live-contracts-2029.yml` (job names and timeouts unchanged).

## 2. What changed since the last report

* **#1341**: unchanged head; its evidence file was checked (above). After it is merged, #1340 and #1334 are synchronised with `main` (a merge of `main` into each; conflict-free by the sequence proof) and their checks re-run.
* **#1340** (`5294726117…`): the policy now also requires the **target** message to be readable when a link points at another message (`target_type = 'contribution'`; a malformed or unknown target id fails closed, also for the administrator). Live today: 7 such links, all from hidden to approved messages; 0 from a public to a non-public message — so the live effect is unchanged (a guest reads 45,830 of 68,997 rows) and the other direction is closed for later rows. The three SECURITY DEFINER readers that touch the table were reviewed (aggregate counts over public statuses; no row, id or note leaves them). Test case 8 added (9 SQL cases + 4 concurrency cases); a mutation without the new condition fails. Details: `docs/reviews/contribution-links-policy-20261114/README.md` §2, §3a.
* **#1334** (`ae513e0b8…`): steps 1 and 9 (DEF-001b) recorded as **applied live on 14.11.2026 16:41 UTC** (Codex packet, PR #1339) and removed from the remaining list; remaining steps **2, 4, 5, 6, 7, 8, 10**. Steps 4, 5, 6, 8 became one transaction behind a catalogue fingerprint guard (the guard accepts only the live state read on 14.11 or its own result; the postcondition requires the exact fingerprint proven on the fixture; each rollback ends on the exact "before" fingerprint, so an inexact rollback fails — the class of Codex's `MAINTAIN` finding). The verifier is phase-aware (Codex finding 1). The live preconditions of every remaining step were read again: [`docs/reviews/db-foundations-extraction-20261113/live-state-20261114.md`](../db-foundations-extraction-20261113/live-state-20261114.md). DEF-005 (step 2) is byte-identical to the reviewed files.
* **Contracts and enforcement**: G1 dated records re-read against the live rule tree (131 lines, joined md5 `f79d9618ed6f0dca3dacf4a13443973a` = the record of 12.11: **no drift**); CL-16 preconditions re-read (the guard function and trigger are exactly the reviewed "before" state); required checks re-derived on the integrated tree; the contracts-session handoff mapped item by item: [`contracts-enforcement-state-20261114.md`](contracts-enforcement-state-20261114.md).
* **Release request of the merged community and content code**: updated, A and B explicit with order and preconditions: [`release-request-1333-1335-site-deployment-and-db-step.md`](release-request-1333-1335-site-deployment-and-db-step.md).

## 3. Tests and results

| Where | Command / check | Result |
|---|---|---|
| CI of #1342 (the integrated tree, head `a2b837c5a`) | the 12 pull-request checks (live-contracts, perf-contracts, release-contracts, security-sql-contracts, marketing-browser, auth-browser-acceptance, route-seo-decision, hard-isolation, legacy-production-lock, gate, Mobile + Accessibility, Production Canary Gate) | **12 of 12 green**; `auth-browser-acceptance-2029` ran both public-content proofs with the pinned historical site against the base that already contains #1335; `security-sql-contracts` ran the 9 + 4 policy cases and the extended M0-A / DEF-004 suites |
| integrated tree, local | `G1_BASE_SHA=origin/main node --test scripts/test-g1-agent-routing-smoke.mjs` | 51 / 51 |
| | pins: contracts-enforcement package, required-checks definition, P1 package (now 12 tests), public-content gate, workflow references, DEF-005 / M0-A / M0-C contracts | 56 / 56, 0 skipped |
| | `docs/reviews/contracts-enforcement-20261113/enforcement-proof/run-ci-scenarios.sh` | every scenario behaved as expected (53) |
| | `…/run-db-scenarios.sh` (the CL-16 guard, live fixture vs applied, 72 cases × 2) | ALL 72 CASES AS EXPECTED, both variants |
| | `scripts/run-g1-rule-guard-sql-test.sh`, `run-g1-laws-snapshot-reader-test.sh` | PASS |
| | `run-contribution-links-visible-read-sql-test.sh` | 9 SQL + 4 concurrency, PG16 and PG17, as root and as an unprivileged user; mutation fails |
| | `run-m0a-db-permissions-sql-test.sh` (steps 2, 4, 5, 6, 7, 10; guards, drift refusals, exact rollback) | ALL PASS, PG16 and PG17 |
| | `run-def004-gallery-sql-test.sh` (step 8; main, negative, control, drift) | PASS |
| | `def005_public_rpc_guards_v1.sql` | PASS, PG16 and PG17 |
| | `run-def001-sql-test.sh` incl. Codex's packet (applied unit, 23 cases) | 23 / 23 PASS |
| | `node scripts/derive-pr-check-names.mjs` | the nine required-check contexts exist, unique, triggers and timeouts unchanged |
| live, read-only | `tests/live/m0_post_apply_verification.sql`, `applied = (1, 9)` | 56 rows, 56 as expected, VERDICT true |
| | G1 laws snapshot reader | 131 lines (87 active, 44 retired listed), md5 = the 12.11 record |
| | `tests/live/g1_rule_reader_conformance.sql` | 27 rows / 10 function readers — unchanged since 12.11 (GAP-09) |
| | CL-16 preconditions | function md5 `56b90b0ae0f9c5915b730314d13ca7a0`, the trigger text, no TRUNCATE trigger — exactly "before" |

Not run: PostgreSQL 18 (the live server is 17.6; fixtures were run on 16 and 17; if the CI runner uses another major version and a guard refuses there, that is fail-closed and shows in the pull request checks), a real signed-in upload or a real RPC call after any SQL (nothing is applied), the browser acceptance of any not-yet-deployed site.

## 4. Findings

**Closed in this package**

| # | Finding | Where |
|---|---|---|
| C1 | CI baseline of the public-content proofs was the PR base (red on every later pull request) | #1341; evidence file checked |
| C2 | `contribution_links` exposed the provenance of non-public messages; the other direction (a public message pointing at a hidden one) was not covered | #1340 (both directions) |
| C3 | The three definer readers of `contribution_links` were not reviewed | #1340 README §3a: aggregate counts only |
| C4 | The P1 verifier required every row true after every step (Codex 1) | phase-aware verifier; 56/56 live |
| C5 | Rollbacks could pass without being exact (Codex 2, class) | postconditions on exact fingerprints (steps 4, 5, 6, 8) |
| C6 | Remaining P1 files had no transaction and no drift guard (Codex) | steps 4, 5, 6, 8; 2, 7, 10 are single atomic statements |
| C7 | The step-6 fixture lacked a live policy, so its fingerprint differed from live | fixture corrected, guard unchanged |

**Remaining (none blocks the review; each has an owner)**

| # | Finding | Severity | Owner / next |
|---|---|---|---|
| F1 | `researcher_reputation(uuid)` (anon-executable definer) counts `validated`, `promoted_to_insights` and `links_continued` without a status filter: the numbers may include the account's non-approved contributions (counts only, no row) | low | owner of the reputation contract; not changed here |
| F2 | `service_role` holds the `TRIGGER` privilege on `public.nodes`: it can add a trigger on the rule tree, though it cannot disable or replace the CL-16 guard (ownership needed; owner `postgres`, no members; `session_replication_role` superuser-only, no parameter grant) | low-medium | a permission change (`revoke trigger … from service_role`) is a separate approval; not made |
| F3 | Step 8 runs DDL on `storage.objects`, owned by `supabase_storage_admin` (`postgres` is not a member). The migration channel did such DDL before; if the platform refuses now the transaction aborts and nothing changes | info | operator: expect either success or a clean refusal |
| F4 | After CL-16 is applied, the documented rollback of the law v7 supersession is refused as a revival (O-2) | decision | table, section 6 |
| F5 | Ordering: **required checks (K1) must come after #1341 is merged**; with `auth-browser-acceptance-2029` required and red, every pull request, including the fix, would be blocked (only the admin bypass could merge it) | high if ignored | execution list: R1 before K1 |
| F6 | Gaps GAP-01…GAP-17 of the contracts package stay as recorded (`gaps.md`): D2 (direct `CREATE TABLE` event trigger), E5 (`project_codex` DB gate), 10 DB readers naming retired laws (GAP-09), Edge/persona references (GAP-10) | design | one writer per item; not started here (no new rule system) |
| F7 | The new site code (merged #1333/#1335) is not live: `main` `4c9630db4` vs live `9c4cad137` | state | request S1 |
| F8 | Clickable-number cases left as numbers: a day with a month name, dashes with spaces, groups of four digits | product | table, section 6 |
| F9 | The three deleted community messages were not restored; the message-source display and the personal-area history link are separate follow-ups | product | table, section 6 |

## 5. Execution list (every line is a separate approval; nothing here is approved)

Conventions: **Stamp** = the exact object (commit, file SHA-256) and the live precondition value read on 14.11.2026. **Precondition read** = a read-only query immediately before; any difference stops the action (the SQL files also refuse by themselves). **Send** = the file as is, in one call (no edits, no splitting). **Verify** = read-only. Database steps change no site code and need no site or Edge deployment; the order inside group D is free (no step depends on another) — the order below is by blast radius, smallest first.

### R — repository merges (code only; squash; no runtime effect)

| ID | Action | Stamp | Verify | Rollback |
|---|---|---|---|---|
| R1 | Squash-merge **#1341** | head `6f11353c85d4f17ba5ca6b6fe7b0c916918111bc`; main `4c9630db4`; 12/12 green | tree of the new `main` commit equals the tree of that head merged onto `4c9630db4`; push gate (`legacy-production-lock`) green; the next pull request's `auth-browser-acceptance-2029` runs both proofs 2/2 | `git revert` through a pull request (CI only) |
| R2 | Squash-merge **#1334** after merging `main` into its branch | head `ae513e0b8f11e18c6509bf4cb08efea075c9d1ca` + the sync commit; all checks green | as R1; `node --test test/p1-db-foundations-package.test.mjs` 12/12 on `main` | revert |
| R3 | Squash-merge **#1340** after the same sync | head `5294726117b3c69c67a2de375823741ecf44d8c1` + sync; all checks green | as R1; `run-contribution-links-visible-read-sql-test.sh` 9 + 4 | revert |
| R4 | Squash-merge **#1339** (Codex's record of the applied DEF-001b unit; the files must stay byte-identical) | head `50b72a7e3fef98b2c86a57f325d486bc9b8eea27` | as R1; `run-def001-sql-test.sh` 23/23 | revert (the applied SQL is not undone by it) |
| R5 | Merge **#1338** (docs only) | its head at that time | as R1 | revert |

After R1–R4 the tree of `main` must equal `10c833a3ee476be3032facd5f846779c32642462` (R5 adds only documents). Alternative: one squash of #1342 gives the same tree; the four pull requests would then be closed as merged by content. Merging is not applying SQL and is not a deployment.

### S — site

| ID | Action | Stamp | Verify | Rollback |
|---|---|---|---|---|
| S1 | Production deployment of `main` `4c9630db48958417796948b32031f06eb22ed3f1` (release request **A**) | the prepared Vercel request in the journal (project `prj_43q7k7QFAcWnin1tcBjce5xOi7Cq`, rootDirectory `public-reading-deploy`, ignored-build-step allowing only that SHA); source tree `a15c385c8…` | READY and source SHA, three aliases assigned, live `/code` chunks carry the new strings, canary at 15,000 ms, community and contributor behaviour read-only | `assign_alias` of the three domains back to `dpl_89Men3jqSi3pAJ5jGMpp75iZqDzx` (own approval) |

Independent of R1–R5 (the package changes no site code) and of every D step. See the updated request for the re-checks.

### D — database (each one: precondition read → send → verify → smoke `node scripts/m0-public-readonly-smoke.mjs` 11/11)

Phase verifier for the P1 steps: `tests/live/m0_post_apply_verification.sql` with the step added to its `applied` line; the answer must be one VERDICT row `true`. Fingerprints: `tests/live/m0_pre_apply_fingerprints.sql`.

| ID | Step | Files (SHA-256) | Live precondition (14.11.2026) | Verify | Rollback | Effect |
|---|---|---|---|---|---|---|
| D1 | `world_contributor_research_v2` view (release request **B**) | apply `20261112134000_m0d_world_contributor_research_candidates.sql` `242511115878`; rollback `ROLLBACK_20261112134000_m0d_world_contributor_research_candidates.sql` `77ccd15cfb0c`; checks `post-apply-checks.sql` `6387576b9c74` | v1 exists, v1 definition md5 `81581396c9167206a67a117bdd406f70`, v2 absent, owner `postgres`, v1 options `security_invoker, security_barrier` | `post-apply-checks.sql`; the new site reads v2, an old tab reads v1 | drop v2 (the site falls back to v1 by itself) | contributor lists show labelled candidates after S1; free order with S1 |
| D2 | `contribution_links` policy (#1340) | apply `20261114180000_contribution_links_visible_message_read_v1_PROPOSAL.sql` `23d6605e3b46`; rollback `ROLLBACK_20261114180000_contribution_links_visible_message_read_v1.sql` `04583e882f65` | one policy `cl_public_read` = `SELECT`, permissive, `PUBLIC`, `USING (true)`; RLS on both tables; the two read policies of `research_contributions` exactly as read; no write grant for anon/authenticated | guest reads 45,830 of 68,997 rows (plus links added since); a link of a hidden message returns 0 rows to a guest; the apply record is in the policy comment (`qual_md5=`); the import path (service role) unchanged | the rollback file (it refuses after any later change; it reopens the exposure) | closes the exposure of the provenance of 15,583 non-public messages; no visible site change |
| D3 | P1 step 7 `add_contribution` guest limit by platform address | apply `20261112133000_m0a_add_contribution_client_address.sql` `a8da6c8572b1`; rollback `ROLLBACK_20261112133000_m0a_add_contribution_client_address.sql` `bdf305917ca9` | body md5 `a2110027d793b61e461bb62954a4be69` | verifier row A8; one patched function | exact (md5-verified) | a guest cannot defeat the 5/hour limit by faking the first forwarded hop |
| D4 | P1 step 4 admin and account guards | apply `20261112130000_m0a_admin_and_account_guards.sql` `45d64f91fa5f`; rollback `ROLLBACK_20261112130000_m0a_admin_and_account_guards.sql` `422c44a25c3c` | md5 of `admin_resolve_translit` `2aab330cb1f1fc77e51d902dfae5041b`, `admin_ai_cost` `0487c48ca5e930f132c3b30cceb69ca9`, `link_visitor_identity` `4622faa398b9531275077139de09cc4e` (= the reviewed "before"); `wa_msg_count` executable by anon and authenticated; `gematria_wall` policy `USING (true)`; tail fingerprint `0eb07c1da74babeaf438250b700054fc` | verifier A2–A4 + FP step 4 (`00a5e44d3412c197b2f76983523a4e01`) | exact, refuses after a later change | non-admins can no longer call two admin functions; a visitor id cannot be re-linked to another account; private wall rows hidden at the source |
| D5 | P1 step 2 DEF-005 (twelve functions server-only) | apply `20261106131000_def005_revoke_internal_rpcs_from_clients.sql` `2ef8971de82b`; rollback `ROLLBACK_20261106131000_def005.sql` `77a63b8bdba1` | twelve signatures, owner `postgres`, definer, anon+authenticated+service can execute, no comment, no overload; the twelve definition md5 in live-state §3 (read the pre-apply query and compare) | verifier A1, A1b, A1c (apply record = definition md5) | exact up to ACL form; refuses a state the apply did not record (CR-X1) | browsers can no longer call internal system functions |
| D6 | P1 step 6 dormant write policies admin-only | apply `20261112131000_m0a_dormant_write_policies_admin_only.sql` `fd5d68a1d01e`; rollback `ROLLBACK_20261112131000_m0a_dormant_write_policies_admin_only.sql` `b0968b50bfbc` | fingerprint `4408d4349d306b19e2b6dade0e273e78` | verifier A6 + FP step 6 (`80bd7ea3853d215d069542f1a252a318`) | exact | closes seven latent "any signed-in user may write" policies |
| D7 | P1 step 5 seven Legacy tables closed to client writes | apply `20261112130500_m0a_legacy_client_writes_close.sql` `9a2d76ecde29`; rollback `ROLLBACK_20261112130500_m0a_legacy_client_writes_close.sql` `91c4f5fa8dbd` | fingerprint `3200137f4b3fe33aa59f0d8436e27dee` | verifier A5 + FP step 5 (`4990e840290b609119a46c31041ed18e`) | exact; no row is deleted | visitors can no longer write the old tables |
| D8 | P1 step 10 four inactive cron jobs with a URL secret removed | apply `20261112131500_m0a_cron_inactive_secret_jobs_unschedule.sql` `cd7e57e60410`; rollback `ROLLBACK_20261112131500_m0a_cron_inactive_secret_jobs_unschedule.sql` `2cc82bc32a25` | jobs 6, 7, 22, 24 present, inactive, carry the secret; no other job does | verifier A7 | re-creates them inactive **without** the secret (by design) | removes a secret from `cron.job`; rotating the secret at its source is a separate runbook step |
| D9 | P1 step 8 gallery uploads (DEF-004) — **blocked on product decision D-1** | apply `20261106130000_def004_gallery_storage_upload_policies.sql` `6d263ad78cbc`; rollback `ROLLBACK_20261106130000_def004_gallery_storage_upload_policies.sql` `43603eb4263b` | fingerprint `fc57c5ec4289358741cd622b02d39556`; bucket public, no limit, no MIME list; largest object 114,883,491 bytes | verifier C rows + FP step 8 (`9fbf59431d86a0c4453d1e31302b0c66`) | exact; existing objects untouched | uploads by role, path and extension; 120 MiB ceiling for new uploads |
| D10 | CL-16 rule guard extension (G1) | apply `20261112200000_g1_rule_guard_cl16.sql` `0d7725919540`; rollback `ROLLBACK_20261112200000_g1_rule_guard_cl16.sql` `60aa076c2246` | function md5 `56b90b0ae0f9c5915b730314d13ca7a0`, trigger text and `[enabled=O]` as in the file, no TRUNCATE trigger; owner `postgres`, not definer, `search_path=public, pg_temp`, ACL `{postgres=X/postgres}` | function md5 `90b5917b1412be02f66d1f805241018c`; both triggers enabled; `g1_laws_snapshot.sql` returns the same 131 lines; one write of each of the nine `nodes` writer classes by its normal path, or state which were not exercised | the rollback file (restores the 12.11 body and trigger; stamps and `retired_routing_v1` records written meanwhile stay) | rule rows become immutable by guard; the law v7 rollback is refused afterwards (O-2) |

The table shows the first 12 characters; the full values are in the stamps table below, in `docs/reviews/db-foundations-extraction-20261113/apply-plan.json` (P1) and in the CL-16 apply plan (`docs/reviews/g1-rule-guard-cl16-20261112/apply-plan.json`); the pin tests compare them with the files. A single approval may cover a group (for example D3 + D4 + D6 + D8, or D5 + D7), each still verified and rolled back on its own.

### Stamps — full SHA-256 of every file the execution list names (computed on the integrated tree `10c833a3e…`)

| Action | Role | File | SHA-256 |
|---|---|---|---|
| D1 | apply | `supabase/proposed/20261112134000_m0d_world_contributor_research_candidates.sql` | `242511115878f3ff0f8e6ebdf7a68cb2c8052df571e00a5a62f399c7bbf2bfce` |
| D1 | rollback | `supabase/proposed/ROLLBACK_20261112134000_m0d_world_contributor_research_candidates.sql` | `77ccd15cfb0c2d136ee93ad89b511f1c1a9bd5f73857df747d2e1c99e1c1100f` |
| D1 | checks | `docs/reviews/public-content-20261113/post-apply-checks.sql` | `6387576b9c74becc3a8ab9ea9c3bfc7c5f2690d939901541f15836ff25ac5d14` |
| D2 | apply | `supabase/proposed/20261114180000_contribution_links_visible_message_read_v1_PROPOSAL.sql` | `23d6605e3b4649e44a992605415ae17bc20a2412074a17ccf3bf5252cc96be8d` |
| D2 | rollback | `supabase/proposed/ROLLBACK_20261114180000_contribution_links_visible_message_read_v1.sql` | `04583e882f656ba437a67cd584919c166d321041fd1b02421a4d5eb4bca020a0` |
| D3 | apply | `supabase/proposed/20261112133000_m0a_add_contribution_client_address.sql` | `a8da6c8572b1a0eb5741dd54052d5b085a432cb4fc9c620195037f2118dc7d11` |
| D3 | rollback | `supabase/proposed/ROLLBACK_20261112133000_m0a_add_contribution_client_address.sql` | `bdf305917ca92fe70a2bd44b77c4402b0186dd30f33d03a5dd4429e8c16ba850` |
| D4 | apply | `supabase/proposed/20261112130000_m0a_admin_and_account_guards.sql` | `45d64f91fa5ff2233d0be60f185f2ecc3254c93424205d2c0dbb00a1344071e7` |
| D4 | rollback | `supabase/proposed/ROLLBACK_20261112130000_m0a_admin_and_account_guards.sql` | `422c44a25c3c1ec1b3dfe859a28b46e040dcab6ce59800f84e42b14a1e9fe4d8` |
| D5 | apply | `supabase/proposed/20261106131000_def005_revoke_internal_rpcs_from_clients.sql` | `2ef8971de82bf5d94ff3dfea60be7487a7eccab05b9b72e1003c9696d077024a` |
| D5 | rollback | `supabase/proposed/ROLLBACK_20261106131000_def005.sql` | `77a63b8bdba1f3a5b9fa3d8d5dca185e3edd461ac5a5ccbbd2a8c22fe2251f88` |
| D6 | apply | `supabase/proposed/20261112131000_m0a_dormant_write_policies_admin_only.sql` | `fd5d68a1d01e48e0e7964430178bfebe831a68d800b851f1150fb9a1f49cbba8` |
| D6 | rollback | `supabase/proposed/ROLLBACK_20261112131000_m0a_dormant_write_policies_admin_only.sql` | `b0968b50bfbcfd47b7553667bf4be882f0024261848cd49a9b6d230b3b47fd03` |
| D7 | apply | `supabase/proposed/20261112130500_m0a_legacy_client_writes_close.sql` | `9a2d76ecde291bb89f4d911734107b5d6760a79a610a6648bd48d4343d79c3bd` |
| D7 | rollback | `supabase/proposed/ROLLBACK_20261112130500_m0a_legacy_client_writes_close.sql` | `91c4f5fa8dbd5475766ba41c243dc2950b789aa3836c08091f34aa9e22b7a856` |
| D8 | apply | `supabase/proposed/20261112131500_m0a_cron_inactive_secret_jobs_unschedule.sql` | `cd7e57e604103c8c759f49c59ef09ad67d4c9dbf0034d4a7039ba62ab345b1b2` |
| D8 | rollback | `supabase/proposed/ROLLBACK_20261112131500_m0a_cron_inactive_secret_jobs_unschedule.sql` | `2cc82bc32a2553dbc1196bafdaefe6dde01a93ce9c658249604b9df255479a8a` |
| D9 | apply | `supabase/proposed/20261106130000_def004_gallery_storage_upload_policies.sql` | `6d263ad78cbc459e4352d506f5fded092222517a8125261318e66f38db6a9c15` |
| D9 | rollback | `supabase/proposed/ROLLBACK_20261106130000_def004_gallery_storage_upload_policies.sql` | `43603eb4263b4625c90e801c3bf1b12a1cc0f4d595a10966ce25baf97b68034d` |
| D10 | apply | `supabase/proposed/20261112200000_g1_rule_guard_cl16.sql` | `0d7725919540cb98ed344f9e9dd9f3d2ba217c4de30d9cf86a702156f66eff63` |
| D10 | rollback | `supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql` | `60aa076c22461b80c97f8d91ff28f9e8a2b5c98268ff8d6a0a6e8b8c1611a2c5` |
| verify | verifier | `tests/live/m0_post_apply_verification.sql` | `2b8b5fabc6751bf610adf204735885936082ae128edf29c869083d8db246253c` |
| verify | pre-apply fingerprints | `tests/live/m0_pre_apply_fingerprints.sql` | `6dcce0629c54d9d2692559835e0dbfc043167ae5b180e5193bbfc11742590019` |
| verify | DEF-005 pre-apply definitions | `tests/live/def005_pre_apply_definitions.sql` | `02d07b585af84cb12878df0d559012525f966966c0c3c6020789baa64e26ab02` |

Steps 1 and 9 (already applied) keep their source files byte-identical to `main`: `20261106121000_def001b_visitor_id_exposure_step1.sql` `6d4afa5e8cb38e02d2ece0e7c3d37c7963304a518f3c8fe5ae38abf5494cac07`, `20261106121500_def001b_push_subscriptions_lockdown.sql` `e299af193952d796ec2002381f2d5ac5b7c9444344b28a485cfaf825fb132667`, `ROLLBACK_20261106121000_def001b.sql` `6ebdaca92701505136bac8ca624b3a2563d0ec6ea988a756ee70d549445cc1f0`; the guarded packet that was applied is in PR #1339 (`01-prepare.sql` `471eaecb8998959706fefd35da73edfb4fe2e90a3433299ef37456ba49107a6a`, `02-lockdown.sql` `cc1d0d8d20508aa1980bf54b4ad24d4ba558f5557a79ab59bb2bfa947bfe2cca`, `rollback.sql` `8f326232bef83de1a269a779451d45f465f52141e6070a11c1b37d7ab42a909e`, `verify.sql` `470e30fa8548a85b2e6ff89130c06c905e92b56744c4e4cd0ff003db32f56b07`).

### K — repository setting

| ID | Action | Stamp | Verify | Rollback |
|---|---|---|---|---|
| K1 | Required checks RC-1: nine contexts (`live-contracts-2029`, `perf-contracts-2029`, `release-contracts-2029`, `security-sql-contracts`, `marketing-browser-2029`, `auth-browser-acceptance-2029`, `route-seo-decision-2029`, `legacy-production-lock`, `Mobile + Accessibility Acceptance`), integration id 15368, ruleset `protect-main` (id `19635630`, read by Codex 13.11; **not re-read by me: no tool in this session reads rulesets**) | `required-checks.json` in `main`; derived again from the workflows of the integrated tree: names unique, unchanged; **only after R1** | read the ruleset back; one red draft pull request shows `blocked`; **on a non-bypass identity** the merge is refused — if no such identity exists, report "rule present, enforcement not exercised against a non-bypass identity" | delete the rule or `PUT` the saved ruleset JSON |

## 6. Product decisions (one table; work continued around each)

| # | Decision | Recommendation | If yes / if no (impact) |
|---|---|---|---|
| D-1 | May the gallery refuse uploads above **120 MiB** (step 8, D9)? | Yes. The largest object is 109.6 MiB; admin large files go through the existing media gateway | yes: D9 as prepared; no: remove the ceiling clause (one `UPDATE` and one check), regenerate the hashes, then D9; D9 waits either way |
| D-2 | The anonymous "report a hint" photo and the signed-in cipher card fail in the public worker today (the SQL keeps both open) | Keep the SQL narrow; fix the worker later | none for the package |
| O-1 | CL-16 timing: "after M0" has no technical reason | Release it; apply after review, any time | D10 independent |
| O-2 | After CL-16 the law v7 rollback is refused as a revival | Accept (v7 is live since 12.11; no plan to revive v6) | accept: nothing; else run that rollback first |
| O-3 | The nine required checks | Approve, **after R1** (F5) | required checks stop red merges on the pull-request path |
| O-4 | Admin bypass of the ruleset | Keep for now with a written emergency procedure; decide with K1's non-bypass test | while it stays, an admin merge skips every required check |
| O-5 | `Production Canary Gate` never required | Agree | a red canary does not block fixes |
| O-6 | Rename the two jobs called `gate`; aggregator for path-filtered gates | Later, separate request | none now |
| M-1 | Merge method | Squash (as the two earlier merges) | linear history is kept; approval is for the head's content, checked by tree equality |
| N-1 | Number cases left as numbers (a day with a month name, spaced dashes, 4×4 groups) | Keep as numbers until a real false link is seen | one constant (`MESSAGE_NUMBER_MIN_VALUE`) and the splitter hold the rules |
| N-2 | Message source display, link from the personal area to community history, restoring the three deleted messages | Keep as separate follow-ups (the source needs a narrow definer reader over `contribution_links` / the `community_source_import` ledger row; no new table) | none for the package |
| X-1 | `researcher_reputation` counts include non-approved contributions (F1) and `service_role` has `TRIGGER` on `public.nodes` (F2) | Open two small, separate, reviewed changes | low impact; not part of this package |

## 7. Not in this package, not verified

Raziel and the CL-13 database proposal, M0-B AI quotas (step 3), DEF-005b (step 12), subscriptions, new analytics and the visitor-identification implementation (approved, pending), the frozen #1321 as a whole (preserved), deletion of any branch. Not verified: PostgreSQL 18, a ruleset read (no tool), anything on the live site after S1, the CI result of the pull requests after a later push.
