// CL-13 test fixtures: the answers of public.fn_personal_memory_policy_v1 that the Edge handlers can meet.
// PAUSED is the object the reviewed database proposal returns (supabase/proposed/20261112230000_cl13_personal_memory_pause.sql);
// test/cl13-personal-memory-policy.test.mjs pins it against the SQL text, so the two cannot drift apart.
// Research (decision of ZURIEL after the Codex review of abb2f3907): authorised research may be used during the pause, so the
// paused policy grants the two research keys; a research row that carries a personal detail is personal memory (decided per
// row in the database).
export const PAUSED_POLICY = Object.freeze({
  policy: "cl13_pause_v1", write_personal: false, write_profile_facts: false, read_personal: false,
  research_output_write: true, research_output_read: true, consent: null,
  reason: "personal memory between conversations is paused until consent, retention, export and erasure controls are ready; an old memory is read only with a verified consent of the same person, and no consent record exists yet",
});
// A SIMULATION of a later policy version for one consenting person (no consent store exists yet): memory only.
export const CONSENT_POLICY = Object.freeze({
  policy: "SIMULATED_CONSENT", write_personal: true, write_profile_facts: false, read_personal: true,
  research_output_write: true, research_output_read: true, consent: { simulated: true }, reason: null,
});
// The database BEFORE the proposal is applied: the function does not exist (PostgREST answers 404 / the client returns an error).
export const POLICY_FUNCTION_MISSING = Symbol("fn_personal_memory_policy_v1 does not exist");
// The message of the trigger of the proposal, as PostgREST returns it for a refused write.
export const pausedWriteError = (op, type, agent) => ({ code: "P0001", details: null,
  hint: "No new personal memory until consent, retention, export and erasure controls are ready.",
  message: `personal memory is paused (CL-13): ${op} of a ${type} row for agent ${agent} is refused; nothing was saved` });
