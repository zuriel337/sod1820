# Account entry and explicit admin transport — implementation handoff

Base: `c8e05790fe68c8f548e22a7c02e5094ddc5b8755`.
Working branch: `gpt/2029-admin-full-access-auth-20261103`.
Scope: central BEFORE `aa4a757e-4dcc-467c-b902-4521b17dc4ef`, internal bounded auth writer. No independent commit, deploy, DB change, account signup, email, model or product write performed.

## Implemented in source

- Latest user decision keeps all shared server changes pending. The deployable AccountEntry supports existing-account password and email OTP only. Configured Google/Facebook/other OAuth choices remain visible and disabled with a truthful pending message. No new provider registry or feature toggle was added; historical Preview and Legacy behavior remains unchanged.
- Public-reading sessions use the existing tab-scoped isolated storage, PKCE and exact `/auth/callback` URL detection. Provider return context stays local, including safe document anchors. SDK flow-id query appending is explicitly off: Supabase matches redirect allowlist entries including query; this avoids turning the approved exact callback into a different URL and falling back to the Production Site URL. It does **not** prove the new Preview URL has been added to the Auth dashboard.
- OAuth cancellation is shown as incomplete even if a prior session exists; credentials/error fragments are removed from browser history. Social account creation is not exercised in tests.
- Public-reading OTP unconditionally sends `shouldCreateUser:false`, even if a caller requests creation, and omits acquisition and visitor metadata. `providerOAuthRequest` fails with `AUTH_SIGNUP_CONSENT_PENDING` before the SDK starts any social flow. The emitted worker selects the explicit existing-account transport mode and rejects account creation, OAuth authorization and PKCE exchange; the separately tested prepared full-account helper is not selected. Existing AuthProvider already suppresses marketing/referral/credit/avatar side effects and verifies same-principal JWT plus canonical `users.role`; it was not modified by this subtask.
- Worker policy changes to `public-reading-admin-existing-auth-20261103`. Public/member write/model denial remains. Explicit existing research/personal/ELS/media operations can be forwarded only after canonical `/auth/v1/user` and own `users.id,role` both confirm the exact caller JWT and admin. No role is accepted from UI state, metadata, message or request payload. No private role cache is introduced.
- Existing canonical publishable key may be supplied by the builder solely as a missing-apikey fallback for these verification reads. The operation itself retains the original caller Authorization and body. No service-role or copied environment secrets.
- TUS upload POST/PATCH/HEAD on the canonical storage host also requires the verified caller token on each chunk. A signed upload token alone does not grant public admin access. Root owns the corresponding bounded client-header wiring.
- `public-reading-deploy/api/contributor-self.js` independently verifies exact deployed host/admission, caller JWT and admin on the server, then reuses `contributorSelfHandler` with its own ownership and explicit consent checks. Same-origin protection cookies are retained only for this same-origin request.
- Credit/membership financial activation, Cardcom, shared site flags, implicit subscription, mail delivery, telemetry writes and foreign writes remain unavailable through this transport. Existing endpoint RLS, identity, cost and idempotency rules remain authoritative. No claim that a real admin model or write operation succeeded.

## Verified

`node --test test/public-reading-full-account-transport.test.mjs test/oauth-return.test.mjs test/functional-preview-oauth.test.mjs src/lib/authMethods.test.js test/shared-auth-entry-2029.test.mjs test/doc37-admin-preview-transport.test.mjs`: **31 passed**, no skips.

Includes actual installed Auth SDK request generation with offline fetches; OTP/PKCE body shape, exact provider callback, old Preview negative tests, member/anonymous/spoof/wrong-user/missing-role/network failure denial, role revocation without cached authorization, no foreign/financial/mail activation, TUS owner-token requirement, same-origin private API server verification, original operation JWT retained. Synthetic records and transports only. No external auth request is issued by the new harness.

`git diff --check`: passed at subtask handoff (root shared edits also present).

## Shared signup blocker and precise proposal

Read-only live `public.handle_new_user()` on 2026-11-03 has prosrc MD5 `8cbc40e56e8d8ce9869f70e09535a7e5`. It inserts every newly created Auth email into `public.subscribers` with `active=true`, independently of acquisition metadata. Merely removing client metadata does not prevent implicit newsletter signup.

Google/Facebook OAuth does not provide a trustworthy originating-app marker to this trigger. A 2029-only origin inference would be unsupported. Therefore the proposed correction stops **implicit newsletter enrollment for all newly created Auth accounts, including Legacy entrypoints**, while preserving canonical `users`/`profiles` creation and all existing subscribers. Explicit Legacy newsletter forms remain unchanged. This concrete shared behavior change requires separate user approval; do not activate new signup from the prepared source before it is applied, or before another approved solution resolves it.

Artifacts:

- [Proposal](auth/handle-new-user-consent.proposal.sql)
- [Exact captured rollback](auth/handle-new-user-consent.rollback.sql)
- [Executable isolated test](auth/handle-new-user-consent.test.mjs)
- [Test receipt](auth/handle-new-user-consent.test.json)

The proposal and rollback both compare the existing function body and fail closed on unrelated drift. No table, policy, role, historical consent, subscriber row or existing balance is changed. Rollback restores behavior for future signups only; it never backfills subscriptions for accounts created during the interval.

Seven isolated PostgreSQL/PGlite checks passed: reproduced old implicit subscription; apply twice; canonical account creation across Google/Facebook/email/Legacy-shaped fixtures with no subscriptions/events; historical opening-only/unsubscribed rows and 35 existing credits unchanged; SECURITY DEFINER/search_path retained; rollback twice; unrelated drift rejected. This is a real isolated SQL engine with synthetic schema/data, not a full Auth provider or delivery acceptance.

Shared-trigger and mail changes were explicitly deferred by the user; no apply or new approval request is made in this subtask. Existing-account login is independently deployable. Still open for later completion: shared-trigger proposal approval/application; exact new Preview callback approval in Supabase and verified-origin build input; owner login and real authorized action acceptance; real signup and newsletter consent acceptance. Parent integrates build/config, full browser tests and final protected deployment. Production remains dormant.
