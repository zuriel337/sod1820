# 2029 Premium Foundation Integration — branch receipt

Status: ISOLATED CANDIDATE ACCEPTED · LIVE INACTIVE · NOT DEPLOYED

Task: `PREMIUM_FOUNDATION_INTEGRATION_2029`

Branch: `gpt/2029-premium-foundation-integration-20261101`

Raziel readiness base: `d97a19d1d552f98bc4a44b8753b1b571ac8d22ab`

## Integrated scope

This branch brings the inactive membership/credit foundation and the internal
product contract onto the verified Raziel 2029 readiness baseline. It adds:

- two unpublished, inactive plan candidates: `sod_personal` and
  `sod_research`;
- six inactive server-owned action prices, including Raziel fast/deep and the
  ELS matrix reading;
- monthly credit cycles with rollover caps and expiry;
- idempotent reserve, settle and return operations;
- owner-only RLS reads for cycle and reservation state;
- a member summary RPC suitable for a future credit meter;
- synthetic SQL acceptance in an isolated local PostgreSQL cluster.

The migration does not create a Cardcom subscription, activate a plan,
publish a price, grant a live user credits or connect any product action to a
debit.

## Security and accounting review

- The client supplies an action key and operation reference, never a credit
  cost. Cost is resolved from the disabled server catalog.
- Direct catalog, allocation and write access remains server-owned. Members
  can read only their own cycles and reservations through RLS.
- Grant, settlement, return and expiry sweep are service-only. Reserve and
  summary require an authenticated owner.
- Reservation and billing references are replay-safe.
- Profile and membership-cycle mutations use a consistent per-user advisory
  lock, preventing profile/cycle lock inversion when expiry, grant, reserve
  and return overlap.
- A late technical failure cannot revive expired membership allowance as
  permanent general credit. Return now refunds general credits plus only the
  allocations whose source cycle is still valid.

The last rule was added during this integration review after identifying the
expired-cycle edge case. A dedicated synthetic regression proves that a
600-credit cycle can reserve 15, expire its remaining 585 and then return the
operation without recreating the expired 15.

## Live compatibility evidence

A read-only inspection of the canonical Supabase schema confirmed the
migration's dependencies:

- `profiles.user_id` is UUID and `profiles.credits` is a non-null integer;
- `credit_ledger` exposes `user_id`, integer `amount`, `reason`, `meta` and
  timestamps as expected;
- `credit_grant(uuid, integer, text, jsonb)` exists as a security-definer
  function with an explicit search path;
- the membership tables and RPCs are not currently present live.

No customer rows, card data, secrets or service credentials were read or
recorded.

## Acceptance

- Membership engine static contract: 3/3 passed.
- Disposable PostgreSQL SQL acceptance: passed, including RLS/grants,
  inactive catalogs, fixed server costs, reserve/settle/return, replay,
  insufficient balance, rollover, expiry, ledger integrity and late-return
  expiry safety.
- Integrated Raziel Phase A–M, personal Follow/activity, matrix route,
  navigation, numeric-truth, comparison and quota/trace regression: 246/246
  passed.
- `build:2029` and `package:ai-analyze` passed again on this integrated branch;
  the package contains 16 committed sources and keeps JWT verification on.
- `git diff --check`: passed.
- Raziel readiness base: 263/263 relevant regressions, One Tree 78/78,
  `build:2029` and `package:ai-analyze` passed before this additive
  migration/document integration.

## Still missing before any paid customer pilot

1. Reconcile the cumulative implementation branch with current `main` before
   creating an application Preview; the current branch is not a safe release
   base for a direct deploy.
2. Connect exactly one operation family, beginning with Raziel fast, so the
   server reserves before provider I/O and settles or returns afterward.
3. Add the member credit meter and a fixed-cost confirmation surface; neither
   exists in the customer UI yet.
4. Connect verified Cardcom recurring-payment events to idempotent monthly
   cycle grants. A successful payment must be the authority for entitlement;
   the browser must not grant credits.
5. Complete signed-in candidate acceptance and rollback evidence before any
   Edge or Production release.
6. Obtain a product decision before activating or publishing the draft
   prices, allowances or plans. The internal contract is not a public offer.

## Release boundary

No live migration or live DB/RLS/grant change. No live plan or action
activated. No Edge, application Preview or Production deployment. No Cardcom
action. No charge. No merge or push to `main`. Legacy remains unchanged.

## Isolated Supabase candidate acceptance — 2026-11-01

Candidate project ref: `srwpltjirwbqzcvuesmx`<br>
Candidate branch: `membership-credit-candidate-20261101`<br>
Production project ref: `linswmnnkjxvweumprav`

- Supabase created the candidate without Production data. Its automatic
  migration replay stops after the historical `create_page_content`
  migration, so the branch reports `MIGRATIONS_FAILED` even though its preview
  project is `ACTIVE_HEALTHY`. The same historical replay issue is visible on
  the older development branches.
- Because the replay did not create the live `profiles`, `credit_ledger` and
  `credit_grant` dependencies, the candidate received a minimal isolated
  prerequisite matching their read-only inspected live signatures. This
  scaffold is candidate-only and is not a new product migration.
- The real membership migration applied successfully. Only `raziel_fast` was
  activated in `preview` state. Both membership plans remain inactive and
  unpublished; every other action price remains inactive.
- Hosted SQL acceptance passed for reserve, settle, return, insufficient
  balance and replay/idempotency. The two synthetic users and their ledger
  rows were removed afterward.
- All five engine tables have RLS enabled. `anon` cannot reserve;
  `authenticated` can reserve but cannot return; `service_role` can return.
- Advisor-driven hardening added covering indexes for the three engine foreign
  keys and changed both owner policies to evaluate `(select auth.uid())` once.
  The Docker fallback runner was also corrected to wait for PostgreSQL's final
  startup rather than its temporary initialization server. The focused
  disposable SQL acceptance and `git diff --check` passed after the changes.
- Remaining candidate advisor notices are either inherited (`page_content`),
  produced by the isolated prerequisite scaffold (`credit_ledger`), or
  intentional locked/server RPC design notices. Relevant remediation
  references:
  [RLS init plan](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan),
  [unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys),
  [RLS with no policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), and
  [authenticated security-definer RPC](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- A final read-only query against Production confirmed that all five engine
  tables are still absent there.
