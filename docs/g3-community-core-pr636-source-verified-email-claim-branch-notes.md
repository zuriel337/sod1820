# G3 Community Core — PR #636 source-verified email claim evidence (branch-only)

Assignment: `work_log.id=fac0eef7-2a08-42b1-bb72-c0286e51b7af`,
`task_key=G3_COMMUNITY_CORE_PR636_SOURCE_VERIFIED_EMAIL_CLAIM_V1`,
`release_authorization_state=BRANCH_ONLY_NO_LIVE_DB_NO_IMPORT_NO_MERGE_NO_DEPLOY_NO_CUTOVER`.

Same PR #636 branch (`claude/awesome-dirac-88xf74`) as every prior Phase 1/2/2.1/2.2/
parent-reconstruction/two-phase-executor/phase3-ops-adapter/final-blockers/search-index-gate/
cross-batch-parent-order/atomic-message-import pass, amended in place; no new parallel branch/PR.
No live DB write, no migration applied, no real import execution, no merge/deploy/cutover.

## What this closes

`planner.mjs` carried `msg.author_email` into `contributor_op.email`/`visitor_identity_op.email`
unconditionally, ignoring `msg.author_email_verified` entirely. In the real archive, 7,817
messages belong to identified OpenWeb users whose export email was never independently verified
at source; 19,627 belong to source-verified unmatched identities. `contributors_claim_legacy`
(and its pure-JS mirror, `identityBridge.mjs`'s `resolveLegacyClaim`) only ever checks that the
*current, confirmed* caller's email exactly matches `contributors.email` — it has no way to know
whether that stored email was itself trustworthy. An unverified historical email reaching
`contributors.email` could therefore satisfy an exact-match claim exactly as if it had been
genuinely verified, letting the wrong account claim a legacy identity it never actually owned.

## What changed in this pass

**`scripts/g3-community-foundation-runtime/planner.mjs`** — new `sourceVerifiedEmail(msg)` gate:
returns `msg.author_email` only when `msg.author_email_verified === true`, `null` otherwise
(including when the flag is missing entirely — never assumed true). Used everywhere this planner
previously read `msg.author_email` directly (`contributor_op.email`, `visitor_identity_op.email`).

Deterministic evidence accumulation for mixed rows (same `openweb_user_id`, one row unverified,
another verified) is also new:

- **Same batch**, contributor not yet inserted: the later verified row mutates the still-pending
  `contributor_op` object in place (planning is fully synchronous before any op executes), so the
  one create-op that eventually runs already carries the upgraded email — no second op, no second
  contributor.
- **Cross-batch**, contributor already committed with no email yet: the planner now emits an
  explicit `{ promote_email: true, id, email }` on `contributor_op` instead of `null`, carrying
  `author_contributor_id` as the *real* existing id (never a placeholder).
- **Never downgrade**: an already-set email (this batch or a prior one) is never overwritten by a
  later unverified/missing row, in either the contributor or the visitor_identity carrier.
- Two distinct `openweb_user_id`s that happen to share one verified email remain two separate
  contributors (unchanged, pre-existing invariant) — verified promotion never merges identities.

**`scripts/g3-community-foundation-runtime/opsAdapter.mjs`**:
- `resolveImportState` now also selects `contributors.email` and carries it into
  `state.contributorsByOpenwebUserId`, so `planImport` can tell an already-evidenced contributor
  apart from one still awaiting promotion.
- `createSupabaseOps().insertContribution` recognizes `contributor_op.promote_email` (distinct
  from the pre-existing placeholder-id "new contributor" check) and passes a new
  `p_promote_contributor_email` flag + `p_contributor_email` value to the same atomic RPC call —
  never a second round-trip.

**New migration:**
`supabase/migrations/20260924125000_g3_community_core_pr636_source_verified_email_claim_v1.sql` —
`g3_openweb_import_message` gains `p_promote_contributor_email boolean default false` (appended;
`CREATE OR REPLACE` cannot add a parameter to an existing signature, so the prior 23-arg overload
is dropped first and recreated with the 24th param, default `false`, before regranting
`service_role`/`postgres` execute). When set (and not creating a new contributor), it runs a
guarded `UPDATE public.contributors SET email = p_contributor_email WHERE id = p_author_
contributor_id AND email IS NULL` — the DB-level backstop for "never overwrite/downgrade", safe
under concurrent writers. `visitor_identity`'s upsert changed from a blind
`email = excluded.email` to `email = COALESCE(excluded.email, visitor_identity.email)`, so an
unverified row's `null` email can never erase a previously-stored verified one.

**`scripts/g3-community-foundation-runtime/identityBridge.mjs`** — comment-only: documents that
the BOTH-verified invariant (source email independently verified at source AND current caller
email confirmed) is enforced upstream, since the schema has no `source_verified` column —
`resolveLegacyClaim` trusts that `contributors.email` is only ever populated by
`sourceVerifiedEmail`/`p_promote_contributor_email`, both of which refuse to write anything but a
source-verified email or `null`. No logic change; `resolveLegacyClaim`'s own caller-side checks
(exact match + `emailConfirmed`) are unchanged.

## Tests

**New: `scripts/test-g3-community-core-pr636-source-verified-email-claim.mjs`**
(`npm run test:g3-community-core-pr636-source-verified-email-claim`) — 12 tests:
- verified email → contributor + visitor_identity claim evidence retained.
- unverified email (explicit `false`) and missing-flag email → both null, never assumed verified.
- a genuinely absent source email plans no crash and no email regardless of the flag.
- same-batch mixed rows, unverified-then-verified → single upgraded create-op, no second op.
- same-batch mixed rows, verified-then-unverified → never downgraded.
- cross-batch promotion → explicit `promote_email` op against the real existing contributor id.
- cross-batch, contributor already evidenced → never touched again, even by a different verified
  email.
- `resolveLegacyClaim`: no email → rejected (`no_email_on_legacy_record_manual_relink_required`);
  source-verified + confirmed caller → eligible; source-verified but caller not confirmed →
  rejected (both halves of the invariant independently exercised).
- full atomic-adapter integration (own fake client mirroring the new RPC's promotion +
  COALESCE semantics): unverified create → cross-batch verified promotion → later unverified row
  never erases it, across both `contributors` and `visitor_identity`.
- two distinct `openweb_user_id`s sharing one verified email stay two independently claimable
  contributors end-to-end.

**Updated (fixture-driven expectation fix, no logic change):**
`scripts/test-g3-community-foundation-runtime.mjs` and
`scripts/test-g3-community-core-2029-phase2-1-integrity.mjs` — both asserted `ow-1001`'s
(`author_email_verified: false` in `test/fixtures/openweb-import/synthetic-messages.json`, already
present in the fixture before this pass) email flowed into `contributor_op`/`visitor_identity_op`;
now assert `null`, per the new gate.

## Build/test evidence (this session, on this branch)

```
npm install
npm run test:g3-community-foundation-runtime                          # 15 pass, 0 fail
npm run test:g3-community-core-2029-phase2                            # 39 pass, 0 fail
npm run test:g3-community-core-2029-phase2-1                          # 13 pass, 0 fail
npm run test:g3-community-core-2029-phase2-2                          # 10 pass, 0 fail
npm run test:g3-community-core-pr636-parent-reconstruction            # 4 pass, 0 fail
npm run test:g3-community-core-pr636-two-phase-executor               # 6 pass, 0 fail
npm run test:g3-community-core-pr636-phase3-ops-adapter               # 12 pass, 0 fail
npm run test:g3-community-core-pr636-atomic-message-import            # 6 pass, 0 fail
npm run test:g3-community-core-pr636-dry-run-cli                      # 3 pass, 0 fail
npm run test:g3-community-core-pr636-cross-batch-parent-order         # 12 pass, 0 fail
npm run test:g3-community-core-pr636-source-verified-email-claim      # 12 pass, 0 fail (new)
npm run build:2029                                                    # ✓ built in 1.11s (same
                                                                        #   pre-existing
                                                                        #   INEFFECTIVE_DYNAMIC_IMPORT
                                                                        #   warning on src/lib/auth.js,
                                                                        #   unrelated, noted in every
                                                                        #   prior pass's notes)
```

Total focused Community suite: 120 pre-existing (2 expectation-only edits, no new failures) + 12
new = 132 tests, 0 failures.

`package-lock.json` was regenerated locally by `npm install` in this sandboxed session (only
`optionalDependencies[*].libc` metadata churn from the local npm/platform, unrelated to this task)
and was reverted before committing — not part of this change.

## Not done in this branch (explicitly out of scope / carried open)

- No live Supabase apply: the new migration is committed for review only, exactly like every prior
  PR #636 migration on this branch — `apply_migration`/`execute_sql` DDL was never run against the
  canonical project (`linswmnnkjxvweumprav`) in this task.
- No real 41,080-row import execution, no service_role credential wiring, no CLI entrypoint change.
- The promotion/never-downgrade contract is verified at the JS/adapter boundary against a fake
  client modeling the new RPC's transaction and COALESCE semantics (per this repo's existing test
  convention); it is not verified by actually running the migration against a live or branch
  Postgres in this task, per `BRANCH_ONLY_NO_LIVE_DB`.
- No change to `contributors_claim_legacy` itself or to any live-facts/RLS policy — this pass only
  changes what email ever reaches `contributors.email`/`visitor_identity.email` in the first
  place; the claim function's own confirmed-caller-email check (Phase 2.1) is unchanged.
