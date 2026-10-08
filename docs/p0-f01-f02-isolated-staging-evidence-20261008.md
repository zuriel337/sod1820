# F01/F02 isolated security evidence — 2029 target

The user confirmed that all product and management work targets the native 2029 system. Legacy `/admin` acceptance below is compatibility evidence only. It does not certify 2029 management readiness or define the destination architecture.

## Scope and state

- Actor: existing GPT; task: `SUPABASE_BRANCH_MIGRATION_BASELINE_REPAIR_V1`.
- Foundation/schema staging scope only; PR999 remains the sole security candidate owned by its original executor/reviewer.
- Canonical source: `linswmnnkjxvweumprav`; source access was read-only except the authorized coordination-log claim/handoff.
- Existing disposable child: `krnaxxndgtrdnaddlzws`, branch ID `b58a67eb-5394-4d58-845c-5b12ab50a3a3`.
- Repository baseline: `45315ef269fd1aef7eadb8b5ca445839e435390f`; security candidate: `9b6a10b585234e966f0e37d2f942b233c1874d16`, existing [PR999](https://github.com/zuriel337/sod1820/pull/999).
- No merge, production deployment, product-data change, production migration-ledger repair, new paid branch or copied production identities/media.

## What was restored

The child initially could not replay the historical migrations because required legacy tables were absent. A read-only catalog snapshot of the actual application schemas was restored into that child: 8,011 metadata operations completed, zero unresolved operations. Native Auth and Storage remained the platform services.

The restore included 305 tables, 854 functions, 37 views/materialized views, 557 constraints, 365 independent indexes, 220 policies, 42 application triggers, RLS, owners and grants. Identity sequences were created by their tables; other sequences were restored separately. Broad destination defaults were revoked before replaying source grants.

All 305 table and 557 constraint fingerprints matched. Function definitions matched except three unrelated external integrations containing credential-like literals; `social_admin`, `sod_fb_call` and `video_translate` were replaced by same-signature offline exceptions. One function owner, `ai_query(text)`, was reconciled to `ai_reader`, with temporary membership/schema-CREATE grants subsequently revoked. One policy has equivalent parsed AND grouping, and one UNION view has equivalent deparser aliases. No source rows, Vault values, cron jobs, private media or source Auth configuration were copied.

The private schema snapshot and SQL queue remain outside Git. `scripts/p0-staging-snapshot.sql` provides the read-only catalog extraction. Its output is private metadata and must be inspected before an authorized isolated restore; it is not a production migration.

**Historical migration replay is still `MIGRATIONS_FAILED`.** A schema snapshot replica enabled the tests; it does not prove clean historical replay or repair the migration baseline/history.

## Authentic security acceptance

37 native API checks passed using password-login JWTs issued by the child's real GoTrue service, real PostgREST, and real Storage HTTP:

- Reproduced the original anonymous history exposure and all eight former Storage exception fixture paths before the patch.
- Applied the exact reviewed F01/F02 bytes only on the disposable child.
- Anonymous and normal authenticated users cannot read history. Admin receives the original 32-column response, newest-first ordering, and 1,000-row limit from 1,005 synthetic records. The current operator reader and authorized direct SQL remain available.
- All eight anonymous overwrite/upsert/fresh-insert paths are blocked afterward. The two broader metro prefix cases are covered independently.
- Anonymous community image creation succeeds and overwrite is blocked. Legitimate authenticated/admin uploads and public byte hashes are preserved.
- Exactly the reviewed 14 temporary policies are removed; intended upload/read policies remain.

Five existing candidate checks also passed. A separate SQL call under native `service_role` without an admin JWT was denied with `42501`.

| Candidate | SHA-256 |
| --- | --- |
| F01 | `0c05f1c2afb718275a0cf97a0517116b2a3c56f907b76df9500397fc4578155a` |
| F02 | `997e4fef2b18d1295f39a048cafc890a6612d1ac37bc34b6da14da329cfeafbd` |

No service-role credential was installed. **Service-role HTTP denial/upload acceptance remains NOT TESTED**; the SQL role test is not a substitute for that case. Fixture metadata removal used the native transaction-local `storage.allow_delete_query` setting only for the eight synthetic objects. It did not test Storage API deletion, and synthetic backend bytes may remain for coordinated branch cleanup.

## UI acceptance and 2029 boundary

The actual legacy AdminPage, AuthProvider and native RPC passed admin history/search and normal-user/anonymous denial. This is a legacy regression check only.

The native 2029 runtime is independently rooted at `src/main2029.jsx` / `src/App2029.jsx`. Its `/2029/control` route renders `ControlPlane2029Page` through the 2029 document, and the deployed rewrite points to `/2029.html`. The existing page is an admin-only **read-only** operational projection over health, costs, traces and video mapping. It contains no work-log tab and is not yet a complete replacement for legacy management.

`scripts/test-p0-control-plane-2029-browser.mjs` exercises that native 2029 page separately; its report records the actual result. It must never inherit a pass from the legacy test. All browser tests block production and external requests, forward only to the actual disposable child, and use no API mocks. Process-local font fallback and egress-proxy loopback settings fix the cloud browser runtime without changing product UI.

**Native 2029 Control Plane result: FAIL.** Main-derived `ControlPlane2029Page` passes `surface="admin"`; `resolveExperienceContext()` rejects it with `Unknown SOD1820 experience surface: admin` because it is absent from `SURFACE_PROFILES`. The page fails before its operational RPC effects are mounted. The existing static `test-2029-control-plane.mjs` still passes, so it does not cover this integration gap. No product-code fix was made in this Foundation staging scope. Route the bounded frame/surface registration repair to the existing Experience owner, then rerun real 2029 admin/user/anonymous acceptance. This is separate from the missing work-log management capability.

## Reproduction and handoff

Keep the status JSON, schema export, bridge requests, passwords and sessions in a private directory outside Git. Public evidence reports contain no JWTs or identities. The status JSON requires the exact disposable `API_URL`, its public `ANON_KEY`, `SQL_BRIDGE: true`, and the exact child `BRANCH_REF`; a production URL is rejected before fixture writes. The API suite requires a freshly restored insecure baseline and an empty synthetic work-log table; it does not reset/reopen permissions automatically.

Copy the two exact migration files and existing static test from candidate commit `9b6a10b5` into the testing checkout without adding them to this evidence branch. Run the API harness with `node --use-env-proxy scripts/test-p0-f01-f02-staging.mjs /private/status.json /private/evidence`. Its private `sql-N.request.json` files require a trusted coordinator to validate the exact child and fulfill SQL through the existing Supabase connector, using `apply_migration` for candidate DDL. Never point that relay at canonical production.

Run the test-only Vite config with `P0_STAGING_STATUS=/private/status.json node node_modules/vite/bin/vite.js --config scripts/p0-staging-vite.config.mjs`. It overrides only the Supabase transport and reproduces the native 2029 document boundary. Then run `FONTCONFIG_FILE="$PWD/scripts/p0-browser-fontconfig.xml" node scripts/test-p0-control-plane-2029-browser.mjs /private/playwright/index.mjs /private/evidence`. The native Auth session is consumed by the actual AuthProvider and profile lookup; role gates are not mocked.

Completion state: isolated schema restore IMPLEMENTED; native API TESTED; evidence prepared for the original owner/main reviewer. Production gate remains NO_GO pending successful historical replay or an explicitly accepted baseline strategy, missing service-role HTTP coverage, and the original independent main review. The reviewer runtime remains unavailable; recording a handoff does not mean it was dispatched or approved.

Next product work must use native 2029 Control Plane and its canonical owners. Do not extend legacy administration as the destination system. The missing management/history capabilities require scoped 2029 acceptance, rather than treating this security evidence as G4 closure.
