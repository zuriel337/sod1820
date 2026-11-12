// CL-13 — the Edge half of the personal-memory policy (decisions of ZURIEL, 12.11.2026: D-CL13-1..3).
//
// The DATABASE owns the decision: public.fn_personal_memory_policy_v1(p_user_ref). This module only asks it and applies the
// answer; it holds no policy of its own and is not a second owner.
//
// Fail-closed: a missing function, an error, a malformed answer or a missing person all mean "no write, no read". Only a
// literal `true` from the database grants anything, so the Edge code is safe whether it is deployed before or after the
// database proposal: before it, the function does not exist and everything here is closed.
//
// Four separate grants, never inferred from one another:
//   write_personal                       a new personal-memory row may be written
//   write_profile_facts                  a profile fact may be written (a consent to memory does NOT open it — D-CL13-3)
//   read_personal                        an old personal memory may be read as context (a verified consent of the same person)
//   research_output_as_personal_context  research output may be used as personal context (its own decision; the exemption of
//                                        research output from the pause is about WRITING it, never about reading it into a chat)

export const PERSONAL_MEMORY_POLICY_RPC = "fn_personal_memory_policy_v1";

const closed = (reason) => Object.freeze({
  write_personal: false, write_profile_facts: false, read_personal: false, research_output_as_personal_context: false,
  policy: null, source: "closed", reason,
});

export const PERSONAL_MEMORY_CLOSED = closed("policy_unavailable");

export function normalizePersonalMemoryPolicy(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return closed("policy_unavailable");
  if (typeof raw.policy !== "string" || !raw.policy) return closed("policy_malformed");
  return Object.freeze({
    write_personal: raw.write_personal === true,
    // a profile fact is also a personal-memory row: both grants are required
    write_profile_facts: raw.write_personal === true && raw.write_profile_facts === true,
    read_personal: raw.read_personal === true,
    // research output joins a personal context only where personal context itself is allowed
    research_output_as_personal_context: raw.read_personal === true && raw.research_output_as_personal_context === true,
    policy: raw.policy, source: "database",
    reason: typeof raw.reason === "string" && raw.reason ? raw.reason : null,
  });
}

// callRpc(name, args) resolves to the JSON result of the database function (or null), or rejects.
export async function readPersonalMemoryPolicy(callRpc, userRef) {
  const ref = typeof userRef === "string" ? userRef.trim() : "";
  if (!ref) return closed("no_person");
  try { return normalizePersonalMemoryPolicy(await callRpc(PERSONAL_MEMORY_POLICY_RPC, { p_user_ref: ref })); }
  catch { return closed("policy_unavailable"); }
}

export const emptyUserContext = () => ({ approved_preferences: [], research_threads: [], summary: null, profile: [], recent_conversation: [] });

// Applies the policy to the object fn_raziel_context returned. Personal context survives only when BOTH the policy and the
// context itself say so; otherwise user_context is emptied (same shape) and privacy says why. channel_context is not
// personal memory and passes through. Research threads are dropped unless the policy grants them explicitly.
export function gatePersonalContext(ctx, policy) {
  const p = policy && policy.source ? policy : PERSONAL_MEMORY_CLOSED;
  const base = ctx && typeof ctx === "object" && !Array.isArray(ctx) ? ctx : {};
  const allowed = p.read_personal === true && base.privacy?.personal_memory_allowed === true;
  const user = allowed && base.user_context && typeof base.user_context === "object"
    ? { ...emptyUserContext(), ...base.user_context } : emptyUserContext();
  // the list fields are always arrays for the callers, whatever the database returned
  for (const key of ["approved_preferences", "research_threads", "profile", "recent_conversation"]) if (!Array.isArray(user[key])) user[key] = [];
  if (!p.research_output_as_personal_context) user.research_threads = [];
  return {
    ...base,
    user_context: user,
    channel_context: base.channel_context && typeof base.channel_context === "object" ? base.channel_context : {},
    privacy: {
      ...(base.privacy && typeof base.privacy === "object" ? base.privacy : {}),
      personal_memory_allowed: allowed,
      personal_memory_write_allowed: p.write_personal === true && base.privacy?.personal_memory_write_allowed === true,
      policy: p.policy,
      reason: allowed ? null : (base.privacy?.reason || p.reason || "not_allowed"),
    },
  };
}

// What a caller may report about one save. `saved` is true only when the writer returned the id of a stored row: a call that
// was not made, was refused, failed or returned nothing is "not saved", with the reason.
export function personalMemorySaveStatus(policy, savedRowId, failure = null) {
  const p = policy && policy.source ? policy : PERSONAL_MEMORY_CLOSED;
  const saved = p.write_personal === true && typeof savedRowId === "string" && savedRowId.length > 0;
  return {
    saved,
    reason: saved ? null : (p.write_personal === true ? (failure || "write_failed") : (p.reason || "not_allowed")),
    policy: p.policy,
  };
}
