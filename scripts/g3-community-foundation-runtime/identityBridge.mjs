// G3 Community Core 2029 Phase 2 — identity bridge, pure logic (no DB connection).
// Owner: identity_architecture_law v1. Mirrors the claim/relink invariant the live
// `contributors_claim_legacy` SQL function (supabase/migrations/*_g3_community_core_2029_
// phase2_shadow.sql) must enforce: NEVER auto-link, NEVER auto-create an auth.users row,
// a private legacy contributor row is claimable only by its exact matching, currently *confirmed*
// (auth.users.email_confirmed_at is not null) caller email. The confirmed-email requirement was
// added in task G3_COMMUNITY_CORE_2029_PHASE2_1_INTEGRITY_FIXES_V1 — the prior pass checked only
// that the caller had an email on file, not that it was actually confirmed.
//
// This module exists so the claim invariant has one pure, unit-testable JS description that
// both the executor (below) and the SQL function's own doc comment can be checked against —
// it is not a second identity store, it does not persist anything.
//
// Source-verified-email claim evidence gate (task_key=
// G3_COMMUNITY_CORE_PR636_SOURCE_VERIFIED_EMAIL_CLAIM_V1): a legacy claim is only ever safe when
// BOTH (1) the legacy/source email was independently verified at source and (2) the current
// caller's email is confirmed. This function only checks (2) — the caller side — directly; it
// trusts `contributor.email` for (1) because the schema carries no separate source_verified
// column, so the *only* place that invariant can be enforced is upstream, at import time:
// planner.mjs's sourceVerifiedEmail() and the atomic RPC's p_promote_contributor_email guard
// (supabase/migrations/*_g3_community_core_pr636_source_verified_email_claim_v1.sql) are the sole
// writers of contributors.email, and both refuse to write anything but a source-verified email
// (or null). A contributor row with a non-null email is therefore, by construction, already
// source-verified — resolveLegacyClaim below never re-derives that, it relies on the invariant
// holding. Any future writer of contributors.email that bypasses those two call sites would
// silently break this function's safety and must not be added.

// contributor: { id, email, user_id }                (as read from `contributors`)
// caller: { id, email, emailConfirmed }               (as read from `auth.users` / the request's JWT;
//                                                       emailConfirmed mirrors email_confirmed_at is not null)
export function resolveLegacyClaim(contributor, caller) {
  if (!contributor || !caller || !caller.id) {
    return { eligible: false, reason: 'missing_caller_or_contributor' };
  }
  if (contributor.user_id) {
    return { eligible: false, reason: 'already_claimed' };
  }
  const contributorEmail = (contributor.email || '').trim().toLowerCase();
  if (!contributorEmail) {
    return { eligible: false, reason: 'no_email_on_legacy_record_manual_relink_required' };
  }
  if (!caller.emailConfirmed) {
    return { eligible: false, reason: 'caller_email_not_confirmed' };
  }
  const callerEmail = (caller.email || '').trim().toLowerCase();
  if (!callerEmail) {
    return { eligible: false, reason: 'caller_email_not_confirmed' };
  }
  if (contributorEmail !== callerEmail) {
    return { eligible: false, reason: 'email_mismatch' };
  }
  // One verified mailbox may legitimately claim more than one historical provider identity when
  // each was independently source-verified under that same email — this function only decides
  // THIS row's eligibility; it never inspects or merges the caller's other claimed rows, so a
  // second, third, ... claim by the same caller stays an explicit, auditable call each time.
  return { eligible: true, reason: 'exact_confirmed_email_match', contributor_id: contributor.id, user_id: caller.id };
}
