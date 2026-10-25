# Family Claim self-redeem guard and owner reader — test evidence

- Task: `FAMILY_CLAIM_SELF_REDEEM_OWNER_READER_20261025`
- Canonical owner: `DB_OWNER` under `person_foundation_contract_law v6`
- Base SHA: `e73687221aa2ab639930643e5cc8c99666adce88`
- Branch: `gpt/family-claim-self-redeem-owner-reader-20261025`
- Migration: `20261025010603_family_claim_self_redeem_owner_reader_v1.sql`
- Live apply: **NO**
- Merge: **NO**
- Preview: **NO**
- Production: **NO**

## Implemented contract

`fn_redeem_family_invitation(text)` now rejects a valid pending invitation when the authenticated claimant Person equals `issuer_owner_id`. The guard runs before any mutation of that valid claim row. Existing token lookup, row locking, revoked/used/expired errors, and valid non-owner redemption remain intact.

`fn_list_my_family_claims()` is an input-free, authenticated-only, `SECURITY DEFINER` reader with a fixed `search_path`. It derives the owner Person only from `auth.uid()` and returns only:

`id`, `flow`, `status`, `target_ref`, `created_at`, `reviewed_at`, `consumed_at`, `token_expires_at`, `has_claimant`.

It does not return raw tokens, `token_hash`, `attempts`, `meta`, `reviewed_by`, `claimant_person_id`, research statements, or another owner's claims.

## Commands and results

```text
./scripts/run-family-claim-owner-reader-sql-test.sh
PASS — ALL FAMILY CLAIM SQL ASSERTIONS PASSED

git diff --check
PASS

node scripts/test-legacy-production-lock.mjs
PASS — Legacy Production lock: PASS
```

The focused test runs only against a throwaway local PostgreSQL 15 container (or throwaway local PostgreSQL cluster when binaries are installed). It has no live project URL or credentials.

## Security and negative scenarios covered

- `family_claims` keeps RLS enabled, zero policies, and zero table privileges for `anon` and `authenticated` across all table privilege types.
- Both patched RPCs revoke `PUBLIC` and `anon`; only `authenticated` receives `EXECUTE`.
- Anonymous execution is denied and a missing `auth.uid()` is rejected.
- Issuer self-redeem is rejected and the complete persisted claim row remains byte-for-byte logically unchanged.
- A different linked Person can still redeem the same invitation.
- Used, revoked, and expired invitations keep their prior errors; the redeem path retains `FOR UPDATE` locking.
- Owner A, claimant B, unrelated C, and owner D prove owner-only isolation across accounts.
- Reader JSON keys are allowlisted and checked for absence of private research content and token material.
- No ShareGrant, research transfer, `research_objects` mutation, graph, publication, or table policy/grant change is introduced.

## Rollback proof

`tests/sql/fixtures/rollback_family_claim_self_redeem_owner_reader_v1.sql` is executed inside the focused test. The test proves that it removes the new reader, restores the normalized pre-patch redeemer body, and preserves authenticated-only execution for the restored RPC.
