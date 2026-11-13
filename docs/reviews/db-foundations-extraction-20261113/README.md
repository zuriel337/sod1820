# Package P1 · DB foundations (extraction of PR #1321 onto current main)

> **Status: prepared for review and release. Nothing was applied, merged or deployed.** The only live access in this work was read-only
> (catalogue reads and the public read smoke, 13.11.2026). Every SQL step below needs ZURIEL's explicit approval for the exact commit
> (CLAUDE.md §0.4); merging code is not applying SQL.

| | |
|---|---|
| Source | PR #1321, frozen at [`4a406fed2`](https://github.com/zuriel337/sod1820/commit/4a406fed273b9b381577c5b2a03d91c58de46451) (merge base `aa0f6bc82`) |
| Base | `origin/main` [`9be0c29fc`](https://github.com/zuriel337/sod1820/commit/9be0c29fc52337069192b057ef1a9882c7026009) |
| Branch | `claude/extract-db-foundations-20261113`. Commits: `a01dc339b` (DEF-005), `442169496` (steps 4–8, 10, tests, runners), then the CI wiring and this documentation. HEAD = the head of the draft PR. |
| Machine-readable plan | [`apply-plan.json`](apply-plan.json) (file, rollback, SHA-256, dependencies, verification row, live state, per step) |

## 1. Scope — nine steps, the numbering of the #1321 plan is kept

| Step | What it does | File (`supabase/proposed/`) | Origin |
|---|---|---|---|
| 1 | DEF-001b step 1: `feedback` admin-only read, `els_records.visitor_id` hidden, two push RPCs | `20261106121000_def001b_visitor_id_exposure_step1.sql` | already in main, byte-identical |
| 2 | **DEF-005**: the 12 system functions become server-only, **by exact signature** | `20261106131000_def005_revoke_internal_rpcs_from_clients.sql` | rebuilt (review findings F1/F2) |
| 4 | M0-A: admin guard on `admin_resolve_translit` / `admin_ai_cost`, `wa_msg_count` server-only, `link_visitor_identity` cannot re-link another account, private `gematria_wall` rows hidden | `20261112130000_m0a_admin_and_account_guards.sql` | from #1321 |
| 5 | M0-A: seven Legacy tables closed to client writes (`lab_*` readable by admin only); no row deleted | `20261112130500_m0a_legacy_client_writes_close.sql` | from #1321 |
| 6 | M0-A: seven dormant "any signed-in user may write" policies become admin-only | `20261112131000_m0a_dormant_write_policies_admin_only.sql` | from #1321 |
| 7 | M0-A: `add_contribution` guest limit keyed by `cf-connecting-ip`, not by the caller-controlled first `X-Forwarded-For` hop | `20261112133000_m0a_add_contribution_client_address.sql` | from #1321 |
| 8 | **DEF-004**: gallery Storage uploads by role, path and extension (+ the 120 MiB ceiling, see **D-1**) | `20261106130000_def004_gallery_storage_upload_policies.sql` | main's 06.11 draft re-based on revision M0 |
| 9 | DEF-001b step 2: anonymous table access to `push_subscriptions` removed | `20261106121500_def001b_push_subscriptions_lockdown.sql` | already in main, byte-identical |
| 10 | M0-A: four inactive cron jobs that carry a URL secret are removed (rollback re-creates them inactive, without the secret) | `20261112131500_m0a_cron_inactive_secret_jobs_unschedule.sql` | from #1321 |

Each step has its own rollback in the same folder (`ROLLBACK_<same stamp>…`; steps 1 and 9 share `ROLLBACK_20261106121000_def001b.sql`).
Also in the package: the SQL tests and runners, the read-only live verification query, the read-only public smoke, the contract tests, the two
evidence documents (`docs/reviews/m0-security-stabilization-20261112/cluster-A-db-permissions.md`, `cluster-C-gallery.md`) and
[`extraction-map.md`](extraction-map.md).

**Not in this package, on purpose:** step 3 (M0-B AI quotas), step 12 (DEF-005b, the fifteen optional helpers; its file and rollback are not on the branch), step 11
(M0-D view → package P3), the CL-13 database proposal, every Edge bundle (live `wa-raziel` v22 and `ai-analyze` v92 must not be replaced), the G1/CL-16 files (package P2).

## 2. The DEF-005 fix (Codex review findings F1/F2)

* **Apply** selects by `to_regprocedure('public.fn(args)')`, never by `proname`. It stops **before any change** when (1) a reviewed signature is missing,
  (2) *any other* function in `public` carries one of the twelve names (an unreviewed overload such as `fn_outbox_bump(integer)` is outside the approval),
  or (3) a reviewed function is not a plain `SECURITY DEFINER` function owned by `postgres` whose effective permissions are exactly the live "before"
  state (anon, authenticated and service_role can execute) or the "after" state. Then it changes exactly the twelve oids and checks the result. A second run is a no-op.
* **Rollback** is limited to the same twelve signatures; it refuses a missing signature or a drifted state and proves that the ACL text of every other
  function that shares a reviewed name is unchanged — so it cannot open a function that was created after the review (the old name-based rollback gave `PUBLIC` execute to such a function).
* The 12.11 ACLs were `NULL` for ten functions and `{=X/postgres,postgres=X/postgres}` for two; `GRANT` cannot recreate `NULL`, so the tests compare **effective** permissions.

## 3. Dependencies, apply order, rollback

* Order: **1, 2, 4, 5, 6, 7, 8, 9, 10** — each step is its own approval and its own tick; run `tests/live/m0_post_apply_verification.sql` after each and require every row `ok = true`.
* Dependencies: only **step 9 needs step 1** (and the frontend that calls `push_subscription_*_v1`, live since `949c24ad5`). Applying 9 before 1 breaks anonymous Web Push subscribe. Every other step is independent.
* Site/Edge: nothing in this package needs a site deploy or an Edge deploy; the live Edge functions use the service role for everything step 2 closes to clients, and cron and `postgres`-owned callers are unaffected (reviewed 12.11, re-read by Codex 13.11; see the header of the DEF-005 file).
* Packages: independent of P2 (CL-16 is a separate DB step in P2), P3 (M0-D) and P4. The result of the trial integration of all four branches is recorded in the journal handover, not here.
* **Rollback order:** 10, 9, 8, 7, 6, 5, 4, 2, 1. The step-9 rollback is the first block of `ROLLBACK_20261106121000_def001b.sql` (the file also undoes step 1; run only the first block to undo step 9 alone). Rollback restores permissions and policies, never rows or objects (no step deletes any).

## 4. What the user sees (plain language)

* Public pages, findings, the gematria wall, community, search and the number/ELS engines behave exactly as today. Private wall rows were already filtered out by the site; they are now also closed at the source.
* A visitor can no longer call the internal system functions from a browser (they now run only from the server and the schedulers), cannot write to the old Legacy tables, and cannot get past the guest contribution limit by faking a header.
* Uploads: an anonymous reporter can still attach a photo; a signed-in user or writer can still attach to their own community post, change their own avatar and save a cipher card; an admin can upload anywhere. Everything else is refused at the storage layer. Whether files above 120 MiB are also refused is **D-1**.

## 5. Tests (run on the final code; Node 22.23.4; PostgreSQL 16 and 17 from `/usr/lib/postgresql`, throwaway clusters, unix socket only)

| Command | Result |
|---|---|
| `node --test test/p1-db-foundations-package.test.mjs test/def005-rpc-grants-contract.test.mjs test/m0a-db-permissions-contract.test.mjs test/m0c-gallery-upload-contract.test.mjs` | 24 tests (7 + 4 + 5 + 8), all pass |
| `tests/sql/def005_public_rpc_guards_v1.sql` (before / apply / re-run / guards G1–G6 / rollback R1–R4 / exact-12 changed set / kept-public functions still callable) | PASS on PG16 and PG17; **fails loudly** when the apply file's overload check is disabled (mutation run) |
| `bash scripts/run-m0a-db-permissions-sql-test.sh` (steps 2, 4, 5, 6, 7, 10: apply, re-run, drift stop, exact rollback, public reads kept) | ALL PASS on PG16 and PG17 |
| `bash scripts/run-def004-gallery-sql-test.sh` (27 route cases before, 108 after for image / video / file × every route × every actor, 27 after rollback; negative mode: an object above 120 MiB stops the proposal; negative control) | PASS (PG17) |
| `tests/sql/def001_…`, `def001b_…` (steps 1 and 9, already in CI) | PASS on PG16 and PG17 |
| `node --test test/ci-workflow-references-exist.test.mjs` | 8 / 8 |

CI wiring (applied in this branch, `live-contracts-2029.yml`): one node step "DB foundations contracts" in `release-contracts-2029`, two steps in `security-sql-contracts` (M0-A regression, DEF-004 negative modes). No threshold or existing test was changed or removed.

## 6. Live state read on 13.11.2026 (read-only; nothing written)

* Public read smoke (`node scripts/m0-public-readonly-smoke.mjs`): **ALL OK** (11/11) — the baseline to compare after every step.
* Step 2: all 12 signatures exist, `SECURITY DEFINER`, owner `postgres`, every client role can execute, **no** same-name overload — the apply would pass its own checks.
* Steps 4 and 7: the live bodies of `admin_resolve_translit`, `admin_ai_cost`, `link_visitor_identity`, `add_contribution` equal the reviewed "before" md5 — the apply would patch them (and stops on any drift).
* Steps 5, 6, 10, 8: all seven Legacy tables still carry client write grants; all seven dormant policies are not yet admin-only; the four reviewed cron jobs (6, 7, 22, 24) are inactive and carry a query secret and no other job does; the gallery still has `community_anon_upload` and `public_upload`, the bucket has no size limit and no MIME list, the largest object is 114,883,491 bytes (below 120 MiB).
* Steps 1 and 9 are in main **but not applied in the database** (`push_subscription_upsert_v1` does not exist; anon still has table access to `push_subscriptions`). In the #1321 sequence they belong to the same approval.

## 7. Open decisions (plain language)

* **D-1 — the 120 MiB upload ceiling.** The file records it as the 12.11 owner decision; for this release it is marked as *not confirmed*. Question to ZURIEL: "may a visitor upload a file above 120 MiB to the gallery (today there is no limit)?" The security change (paths/extensions/roles) does not depend on the answer; the ceiling is one `UPDATE` and one clause in the preconditions, rolled back with the rest. If "no ceiling", the clause is removed in a new commit before approval and the plan hash is regenerated.
* **D-2 — two upload routes the public worker already blocks.** The anonymous report-a-hint photo and the signed-in user's cipher card fail in the public worker before they reach Storage today (cluster-C §3, side finding); the SQL keeps both open in the narrow form. Open them in the worker, or close them on the server too? Not blocking this package.
* **D-3 — approval grouping.** Steps 1+9 and 2+4+5+6+7+10 are code-wise independent of the site; step 8 waits for D-1. ZURIEL decides the ticks.

## 8. Known gaps (stated, not hidden)

* The SQL tests run on a throwaway PostgreSQL with fixtures for `storage`, `cron` and the Supabase roles; they are not a run against Supabase itself. The live read-only checks in §6 cover the preconditions the files re-check at apply time.
* `test/def005-rpc-grants-contract.test.mjs` and `test/m0a-db-permissions-contract.test.mjs` are text scans of shipped code: a function name built dynamically at run time cannot be excluded by a scan.
* The `ps_anon_*` step-9 rollback is not a separate file (see §3).
* After the apply, `tests/live/m0_post_apply_verification.sql` must be run by the operator; it is not in CI (it needs the live catalogue).
