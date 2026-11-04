# Life Journey 2029 — family account continuity evidence

- Branch: `gpt/life-journey-real-preview-fix-20261025`
- DB package consumed: `7d953b989775dd82d786c2199b478815fa624142`
- DB migration: `20261025012451_family_claim_self_redeem_owner_reader_v1.sql`
- Live DB apply: **YES** — recorded migration version `20261025012451`
- Merge: **NO**
- Preview: **NO**
- Production: **NO**

## Implemented slice

The existing Person/Life Journey family cards now consume the existing Family Claim RPC family through `src/lib/research/familyClaimAdapter.js`:

- an owner creates a seven-day, one-time invitation for an existing family `target_ref`;
- the raw token is shown only in the current React memory/DOM and disappears on refresh;
- a separate authenticated account can paste and redeem the token without putting it in a URL or Research Context;
- issuer self-redeem is rejected by the DB guard;
- the owner-scoped reader restores pending/approved status after refresh without returning claimant identity, token material, attempts, metadata, or research content;
- a pending invitation can be revoked before a replacement is created;
- account identity verification does not copy Ledger data, grant research access, create a ShareGrant, or mutate `research_objects`.

The UI is fail-closed. Invitation and redemption controls render only after `fn_list_my_family_claims()` succeeds. Because that reader and the self-redeem guard ship in one migration, an environment that has not applied the security migration exposes no claim actions.

Local Person state is also principal-bound: when the authenticated account changes, the prior account's Person, family, claim status, raw token state, and notices are cleared before the new account view is rendered.

## Verification

```text
node --test \
  src/lib/research/lifeJourneyPersonContext.test.js \
  src/lib/research/lifeJourneyElsAdapter.test.js \
  test/life-journey-2029-chain.test.mjs \
  test/life-journey-hint-reference.test.mjs \
  test/life-journey-person-context.browser.test.mjs
PASS — 12/12

./scripts/run-family-claim-owner-reader-sql-test.sh
PASS — 16 catalog/state assertions + 7 explicit negative paths

VITE_HOME_2029_ENABLED=true npm run build
PASS — Legacy and 2029 builds

node scripts/test-2029-built-graph.mjs
PASS — 12,663 gzip bytes recovered; 12,288 required

node scripts/test-2029-isolation.mjs
PASS

npx playwright test tests/g4-public-core-release.spec.cjs --workers=1 --reporter=line
PASS — 13/13

git diff --check
PASS
```

The Life Journey browser acceptance runs the complete owner → invitation → refresh → self-redeem denial → separate-account redeem → owner status refresh flow. It also covers mobile/desktop, light/parchment/dark palettes, preserved person-ref and Research Context, exact Name/Date return, no automatic family research, no ELS invocation, and absence of private names/raw invitation tokens from URLs, storage, and telemetry.

No real personal data is embedded in the test or committed to the repository.
