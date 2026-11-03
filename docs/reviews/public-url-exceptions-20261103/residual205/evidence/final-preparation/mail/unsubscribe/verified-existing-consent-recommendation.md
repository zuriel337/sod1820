# Existing active address → explicit site-updates consent

Recommendation only; no Auth feature, server, schema or client changes implemented.

**Yes, for an already-active subscriber whose address is the server-verified Auth email, the existing newsletter-signup endpoint can add explicit site-updates consent without a new table/RPC or enlarging another purpose.** It still requires the existing proposed site-updates column/constraint (packet B), and separate review/approval of the bounded Edge change. Existing account login/OTP already supplies the identity; no new login capability is required.

## Exact admission

- Public anonymous behavior stays unchanged: new address may explicitly register; existing differently purposed or suppressed address is not modified on an anonymous email claim.
- A bounded existing-address branch requires a caller Bearer token validated against the canonical Supabase Auth `getUser(token)` / `/auth/v1/user`. Do not merely decode JWT, trust getSession/user metadata, or accept user_id/role from the browser.
- Require a non-anonymous returned user, an actual current `user.email`, and non-null valid server `email_confirmed_at`; do not substitute user-editable metadata or a generic phone-confirmation timestamp. Normalize by the existing email convention and compare exactly to the submitted address.
- Require exact `purpose=site-updates`, explicit `consent=true` and the existing source envelope. Get the consent timestamp on the server. No acquisition, audience data, Follow, welcome, credit, referral, account creation or delivery action follows.
- Use the existing subscriber identity and service-backed handler permission for this exact email only. Never accept a caller-supplied subscriber ID or alter email/name/source/acquisition. Do not log JWT, email, or signed links.

## Minimal conditional write, preserving other consent

1. Read the exact matching existing subscriber's stable ID, email, active, unsubscribed_at, email_purposes and site_updates_consented_at. Unknown/malformed state or lookup failure is not an empty row.
2. If active, unsuppressed, already has site-updates and a valid timestamp: return the existing idempotent purpose receipt; no write or timestamp refresh.
3. Only for `active=true AND unsubscribed_at IS NULL`, compute the existing purpose array plus site-updates; preserve all other purposes and consent timestamps. This is the current user's new explicit consent, not migration of historical opening-only consent.
4. Send one conditional PATCH using ID + exact verified email + active=true + unsubscribed_at IS NULL + exact observed email_purposes array + exact prior site_updates_consented_at (IS NULL or equality). Update only email_purposes and the new server site_updates_consented_at. Do not update active or unsubscribed_at.
5. Require a returned matching row proving the new purpose/time and preserved prior purposes. SDK error, absent acknowledgement or malformed row fails closed. On zero matches, reread once: acknowledge only a fully committed matching site-updates consent; otherwise return an explicit conflict requiring retry. Never blindly retry a stale PATCH or overwrite a simultaneous opt-out/preferences change.
6. The UI uses the existing purpose receipt, cancels on account change/unmount, and binds completion to the initiating verified identity. Cancellation is not proof a previously submitted server write was undone.

This compare-and-swap predicate ensures that an intervening signed unsubscribe prevents the old active-row consent request from reactivating or overwriting it. Existing name/profile updates remain unaffected because this PATCH does not touch those fields.

## Suppressed recipients are a separate boundary

Do **not** set active=true or clear unsubscribed_at as part of this minimal extension. There is one global suppression flag; doing so while retaining historical general/opening purposes would also revive those old delivery cohorts. Authenticated ownership alone does not authorize that widening. Suppressed addresses remain unchanged with an honest re-consent-required result until an exact separately approved re-subscription policy exists. Do not create a duplicate row or parallel recipient list as a workaround.

## Isolated acceptance needed before proposing deployment

- Valid confirmed owner adds site-updates only; prior consent timestamps/source/name remain unchanged.
- Same receipt replay performs zero changes.
- Missing/wrong/expired JWT, unconfirmed email, anonymous Auth identity and email mismatch perform zero changes.
- Anonymous existing-address attempt and suppressed recipient perform zero changes.
- Concurrent opt-out and purpose change cause a conditional miss without clobber/reactivation; response loss may return existing consent only after a fresh matching read.
- Schema/read/write failures remain failure states; no welcome/send/referral/Follow/marketing calls.

This can complete the common existing-active-address case already blocked by b21's verification-required result. It does not implement password reset, new OAuth mechanics, purpose-specific unsubscribe or automatic reactivation.
