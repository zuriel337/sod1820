# Closed Cardcom ILS2 pilot — 2029 release candidate

## Authority and lineage

- User authorization: protected Preview; dedicated migration only after tests and a verified backup/recovery point. User enters card details at Cardcom. No agent-triggered enrollment or renewal charge.
- Source: `codex/cardcom-2ils-subscription-pilot-20261026` at `de2cca5b11c2e7c57d74fbb62f34b498b4251da0`.
- Original main base: `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`, verified remotely.
- Isolated release branch: `gpt/2029-cardcom-2ils-pilot-release-20261026`.
- BEFORE: `3a948157-cd4c-47f8-ae0c-af94391eb1ef`, passive GPT → ZURIEL, no dispatch/ACK. Relevant earlier file owners released their scopes.
- This is a 2029 **feature Preview**, not a 2029 cutover. `/`, canonical public entries, Production aliases, and `CORE_PUBLIC_LAUNCH_2029=false` stay unchanged. No main merge/push.

## Defects found and bounded corrections

The original three Node tests passed, but applying the original migration to an isolated PostgreSQL17 instance failed with `"v_charge" is not a known variable`. Its transaction rolled back completely. The variable had been declared in the unrelated lookup function, not in `membership_pilot_settle_renewal`.

The original frontend was registered in Legacy `src/App.jsx`. That registration is removed. The lazy page and exact Vercel rewrite now use **`/2029/membership-pilot`** only. Root is not redirected. The existing 2029 shell and native account controls are reused; there is no new frame/auth/provider or public subscription offering.

Other bounded safety corrections:

- Require terminal-specific token billing approval (`CARDCOM_PILOT_TOKEN_BILLING_APPROVED=true`) before even creating a checkout; default is closed.
- Require authenticated server-verified admin and DB `allowed === true`; no client amount/role is authoritative.
- Pilot no-store/no-referrer headers are declared after general headers: the first hosted check showed the global rule otherwise overwrote them. The hosted candidate is replaced, not silently accepted with misleading source-only assertions.
- Initial and renewal payloads are fixed at ILS2; `ChargeAndCreateToken` is used for enrollment.
- Only exact canonical/deployment hosts are accepted for return URLs; unrelated `*.vercel.app` hosts are rejected. Server and client accept payment navigation only to `https://secure.cardcom.solutions` without embedded credentials.
- Do not coerce null/false/missing provider result codes into success. GetLpResult must prove terminal, transaction, low-profile ID, provider reference, operation, amount and currency before activation.
- Preserve exact Int64 transaction identifiers. Do not trust redirect flags or webhook body success/amount/token fields.
- AES-256-GCM envelope only, 12-byte random IV and authenticated tag. No PAN/CVV is collected or stored. Provider/DB error text is not logged or returned from pilot handlers.
- Owner-scoped `membership_pilot_status` exposes an opaque pending checkout ID, never credentials/billing fields. The returning administrator can invoke the **same** GetLpResult verifier using the browser's existing Vercel access. This supports a protected Preview even if Vercel denies Cardcom's external callback. No protection exception/secret bypass or separate payment verifier is added.
- Principal changes clear/hide old status; delayed responses cannot navigate, render or update the new account. Unavailable status blocks checkout rather than assuming no subscription.
- A partial unique index prevents two open subscriptions for one account. An old pending checkout is not silently replaced with a second payable checkout.
- Fix the SQL variable; require a verified transaction when settling a successful renewal. Existing duplicate activation/settlement is idempotent, including exact paid-period boundaries.
- Enable RLS and revoke direct access on the **new** credentials table as defense in depth. The migration checks the existing private schema is restricted; it no longer changes shared schema ACLs. Only the three dedicated tables, their indexes/policies and eight `membership_pilot_*` functions are added.
- Remove the proposed daily renewal schedule from the Preview candidate. The renewal endpoint also refuses Preview execution even with a correct CRON_SECRET. Future Production renewals additionally require `CARDCOM_PILOT_RENEWALS_ENABLED=true` and a separately authorized release.

## Reproducible checks

```sh
node --test test/cardcom-membership-pilot.test.mjs
# To include real isolated SQL acceptance (otherwise the one SQL case is explicitly skipped):
CARDCOM_PILOT_TEST_CONTAINER=<disposable-network-none-PostgreSQL17-container> \
  node --test test/cardcom-membership-pilot.test.mjs
node --check api/cardcom-subscription-start.js
node --check api/cardcom-subscription-webhook.js
node --check api/cardcom-subscription-renew.js
node --check server/cardcom-subscription.js
node --check server/cardcom.js
npm run build
node scripts/test-legacy-production-lock.mjs
node scripts/test-2029-built-graph.mjs
node scripts/test-route-legitimacy-2029.mjs
node --test scripts/test-integrated-preview-auth-guard.mjs
VITE_INTEGRATED_PREVIEW=true npm run build
python3 test/cardcom-membership-pilot-2029.browser.py
git diff --check
```

Results: 16/16 pilot tests including real PostgreSQL acceptance; 41 SQL assertions/rejection scenarios plus two test helpers; 3/3 existing Preview-auth guard tests; both builds and route/graph/Legacy gates passed. Five server/API files pass syntax checks. A bounded source scan found no private keys, production service credentials, PAN or CVV values. Synthetic test values are deliberately not real credentials.

Browser: 21 cases passed, including 320/390/1440 across light/parchment/dark, guest/member rejection, terminal-not-ready, malicious payment URL, synthetic Cardcom navigation, verified-return reconciliation, cancellation and unavailable schema. Zero page errors, model calls, forwarded backend requests or real Cardcom requests. These are compiled-app **synthetic** acceptance tests, not proof of a real paid subscription or real signed-in administrator acceptance.

## Live preflight and blockers

- Canonical project: `linswmnnkjxvweumprav`, ACTIVE_HEALTHY. Dedicated readonly connection confirmed `supabase_read_only_user`, `transaction_read_only=on`.
- Pilot tables/functions are absent live; this migration has **not been applied**.
- No callable project backup/recovery reader was found. A current restorable backup/PITR point has **not** been verified. A local rollback test is not a substitute for that prerequisite.
- Existing CARDCOM_TERMINAL_NUMBER, CARDCOM_API_NAME, CARDCOM_API_PASSWORD, CARDCOM_BRIDGE_SECRET, SUPABASE_URL and SUPABASE_ANON_KEY are configured for Production. They were inspected by name/scope/type only, not decrypted, copied to a file or printed. The old one-shekel Preview branch is not authorization for this branch.
- No terminal-specific confirmation of API token renewals without CVV is available. An earlier one-off payment and generic confirmation that the token module exists do not prove this permission.
- Required Preview settings must be narrowly scoped to this release branch. New encryption/cron secrets must be stored as Vercel Secrets without output to chat/files/Git; existing Production secrets must not be broadened to all previews.
- `VITE_INTEGRATED_PREVIEW=true` on this branch suppresses unrelated auth/identity/credit and telemetry side effects while reusing the normal frontend + server deployment. Do not use the static preview builder: its service-worker write guard intentionally excludes payment operations and its output omits the required server routes.
- The dedicated migration SQL has safety corrections relative to the originally named source SHA. Review the exact resulting SHA and SQL checksum before live application; never apply the original known-failing bytes.

**Do not attempt a real checkout while these gates are unresolved.** No initial charge has been made by this session and no renewal endpoint has been invoked live. A Preview URL can demonstrate the UI and closed gates, but is not to be described as a working paid recurring subscription yet.

## Activation and user acceptance sequence

1. Verify a recoverable pre-migration project backup/PITR point using the project's existing authorized mechanism, without exporting customer data or secrets to Codex.
2. Obtain terminal-specific API-token/no-CVV permission and securely supply narrowly scoped Preview credentials via Vercel, not chat. Do not enable old Cardcom recurring instructions, unrelated schedulers or automatic historical collection.
3. Recheck live ownership, dedicated migration absence, private-schema ACL and exact SQL; apply only `20261026120150_cardcom_membership_pilot_v1.sql` after all prerequisites pass. Verify only metadata: exact objects, RLS, grants and functions. Never query encrypted token or customer rows to prove deployment.
4. Deploy the exact tested SHA as a protected Preview with the three server handlers. No Production alias, promote or cutover.
5. ZURIEL signs in using existing 2029 account controls. The admin page stays on `/2029/membership-pilot`. Confirm the ILS2 terms, then only ZURIEL opens Cardcom and enters the card there.
6. On return, require server GetLpResult verification before displaying active and the next planned charge date. Verify cancellation. Do not manually trigger an extra renewal.
7. Stop before Production. Any later Production approval must name the exact SHA and deployment ID. Real monthly scheduling, overdue/catch-up behavior and in-flight cancellation/uncertain-outcome operational review must be accepted before enabling the currently disabled renewal lane. Frontend/DB pilot state is not a general Entitlement or premium-access grant.

## Rollback

Before any payment data exists: disable the Preview gate and stop/remove the Preview deployment if necessary; Production remains untouched. For an applied-but-empty migration, the isolated SQL acceptance demonstrates dropping only the eight functions and the three dependent new tables, with no CASCADE and with the pre-existing private schema/ACL/sentinel unchanged. Execute an actual live rollback only under its applicable authorization and after verifying exact objects and zero payment rows.

If a real enrollment already exists: **do not drop tables, ledger rows, encrypted credentials or the encryption key**. Disable new enrollments and renewal execution, preserve the financial ledger/key, reconcile uncertain provider outcomes read-only, and use the existing cancellation/recovery process. Restoring the entire project is not a routine pilot rollback and requires a separate downtime/data-loss decision.

No Production release, main change, frontend cutover, content publication, public prices, entitlement changes, Edge Function deployment or unrelated DB/RLS/permission changes are included.
