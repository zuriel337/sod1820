import { supabase } from "../supabase.js";

export const isLegacyContributorId = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || "");

// The server checks auth.uid(), confirmed email, exact source email and unclaimed status.
// A public profile URL or display name is never proof of ownership.
export async function claimLegacyContributor(contributorId, { client = supabase } = {}) {
  if (!isLegacyContributorId(contributorId)) throw new Error("invalid_contributor_id");
  const { data: identity, error: authError } = await client.auth.getUser();
  if (authError || !identity?.user?.id) throw new Error("not_authenticated");
  if (!identity.user.email_confirmed_at) throw new Error("caller_email_not_confirmed");
  const { data, error } = await client.rpc("contributors_claim_legacy", { p_contributor_id: contributorId });
  if (error) throw error;
  if (data?.claimed !== true || data.contributor_id !== contributorId || data.user_id !== identity.user.id) throw new Error("legacy_claim_not_eligible");
  return data;
}
