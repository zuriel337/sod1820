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
