# Package P1 · extraction map (PR #1321 `4a406fed2` → this branch)

Destination vocabulary: **taken** (unchanged), **changed** (taken with the stated change), **already in main**, **deferred**, **other package**, **replaced**.
Files of #1321 that are not listed here belong to another topic; the integrator's table for all 209 files is in the journal handover.

## Files of #1321 that belong to this package

| #1321 file | Destination | Note |
|---|---|---|
| `supabase/proposed/20261106131000_def005_revoke_internal_rpcs_from_clients.sql` | **changed** | rewritten: exact signatures, refusal before any change (F1), baseline drift guard; apply record (CR-X1) |
| `supabase/proposed/ROLLBACK_20261106131000_def005.sql` | **changed** | rewritten: same twelve signatures, other same-name functions proven untouched (F2); state guard against the apply record (CR-X1) |
| `tests/sql/def005_public_rpc_guards_v1.sql` | **changed** | rewritten around exact signatures; guards G1–G6, rollback R1–R4; failed expectation is fatal |
| `test/def005-rpc-grants-contract.test.mjs` | **changed** | DEF-005b parts removed; pins the twelve signatures of apply and rollback |
| `supabase/proposed/20261106130000_def004_gallery_storage_upload_policies.sql` | **changed** | revision M0 taken on main's 06.11 draft; header block that marks the 120 MiB ceiling as an unconfirmed product decision (D-1) added; no logic change |
| `supabase/proposed/ROLLBACK_20261106130000_def004_gallery_storage_upload_policies.sql` | taken | |
| `tests/sql/def004_gallery_storage_upload_policies_v1.sql` | taken | on main's 06.11 version |
| `scripts/run-def004-gallery-sql-test.sh` | taken | |
| `test/m0c-gallery-upload-contract.test.mjs` | taken | |
| `docs/reviews/audit-remediation-20261106/STORAGE-RPC-APPROVAL.md` | taken | 2-line banner pointing to the revision |
| `supabase/proposed/20261112130000_m0a_admin_and_account_guards.sql` + `ROLLBACK_…` | taken | |
| `supabase/proposed/20261112130500_m0a_legacy_client_writes_close.sql` + `ROLLBACK_…` | taken | |
| `supabase/proposed/20261112131000_m0a_dormant_write_policies_admin_only.sql` + `ROLLBACK_…` | taken | |
| `supabase/proposed/20261112131500_m0a_cron_inactive_secret_jobs_unschedule.sql` + `ROLLBACK_…` | taken | |
| `supabase/proposed/20261112133000_m0a_add_contribution_client_address.sql` + `ROLLBACK_…` | taken | |
| `tests/sql/m0a_db_permissions_v1.sql` | **changed** | the DEF-005b fixtures (fifteen functions, `m0a_acl_before`) and the DEF-005b section removed |
| `scripts/run-m0a-db-permissions-sql-test.sh` | **changed** | the two DEF-005b files removed from the file list |
| `test/m0a-db-permissions-contract.test.mjs` | taken | |
| `tests/live/m0_post_apply_verification.sql` | **changed** | rows `B` (step 3) and `D` (package P3) removed; row `A1b` (no unreviewed overload) added; row `C` labelled D-1 |
| `scripts/m0-public-readonly-smoke.mjs` | taken | the before/after read smoke |
| *(new)* `tests/live/def005_pre_apply_definitions.sql` | added | the operator's read-only pre-apply query (md5 of the twelve definitions), review finding CR-X1 |
| `docs/reviews/m0-security-stabilization-20261112/cluster-A-db-permissions.md` | taken | extraction note added at the top |
| `docs/reviews/m0-security-stabilization-20261112/cluster-C-gallery.md` | taken | extraction note added at the top |
| `docs/reviews/m0-security-stabilization-20261112/apply-plan.json` | **replaced** | by [`apply-plan.json`](apply-plan.json) of this package (steps 3, 11, 12 are not in it) |
| `docs/reviews/m0-security-stabilization-20261112/README.md` | **replaced** | by this package's README |
| `.github/workflows/live-contracts-2029.yml` (the hunks for the files above) | **changed** | applied on top of main's current file: three new steps, see the README §5 |

## Files of the same topic that are deliberately not here

| #1321 file | Destination |
|---|---|
| `supabase/proposed/20261112132000_def005b_revoke_uncalled_client_rpcs_OPTIONAL.sql`, `ROLLBACK_20261112132000_def005b.sql` | **deferred** (step 12, optional, out of scope) |
| `supabase/proposed/20261112120000_m0b_ai_quota_fail_closed.sql`, `ROLLBACK_…`, `tests/sql/m0b_ai_quota_fail_closed_v1.sql`, `tests/sql/fixtures/m0b_ai_quota_live_base_20261112/*`, `scripts/run-m0b-ai-quota-sql-test.sh` | **deferred** (step 3, AI quotas, out of scope) |
| `supabase/proposed/20261112134000_m0d_world_contributor_research_candidates.sql`, `ROLLBACK_…`, `tests/sql/m0d_…`, `scripts/run-m0d-contributor-view-sql-test.sh` | **other package** (P3, step 11) |
| `docs/reviews/m0-security-stabilization-20261112/{cluster-B-ai-limits,ai-coverage,cluster-E-edge-unknown,edge-drift-and-rollback,non-m0-edge-deltas,n6-n14b-whatsapp-package}.md`, `edge-rollback/*`, `scripts/m0-edge-rollback-assemble.mjs`, `test/m0-edge-rollback-manifest.test.mjs`, `test/m0-intermediate-states.test.mjs` | **deferred** (Edge bundles and their rollback: must not replace live `wa-raziel` v22 / `ai-analyze` v92) |
| `docs/reviews/m0-security-stabilization-20261112/{cluster-D-visible-content}.md` | **other package** (P3) |
| `docs/reviews/m0-security-stabilization-20261112/{cluster-F-measurement.md,measurement-audit/*}` | **other package** (P4) |
| `docs/reviews/m0-security-stabilization-20261112/enforcement-proof/*` | **other package** (P2) |
| `docs/reviews/m0-security-stabilization-20261112/{round4-review-package,round5-decision-package,release-request,owner-questionnaire,foundation-closure-list,gsc-identity-crossref,intermediate-states}.md` | **replaced** by the package READMEs and the journal handover (history stays in the frozen PR) |

## Hunks of shared files

* `.github/workflows/live-contracts-2029.yml`: the #1321 hunk "M0 security contracts" listed six test files; this package takes only `test/m0a-db-permissions-contract.test.mjs` and `test/m0c-gallery-upload-contract.test.mjs` (plus its own pin test); the `m0b-*`, `m0e-*` and `public-research-candidates-visible-2029` entries are other topics. The `run-m0a-db-permissions-sql-test.sh` step is taken; the `m0b`, `m0d`, CL-13 and G1 SQL steps are other topics.
* `tests/sql/def004_…` and `def005_…` also exist on main; the versions here replace main's (main's DEF-005 test was name-based).
