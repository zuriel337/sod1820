import { supabase } from "../supabase.js";

export const isLegacyContributorId = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || "");

// The server checks auth.uid(), confirmed email, exact source email and unclaimed status.
// A public profile URL or display name is never proof of ownership.
export async function claimLegacyContributor(contributorId) {
  if (!isLegacyContributorId(contributorId)) throw new Error("invalid_contributor_id");
  const { data, error } = await supabase.rpc("contributors_claim_legacy", { p_contributor_id: contributorId });
  if (error) throw error;
  if (data?.claimed !== true) throw new Error("legacy_claim_not_eligible");
  return data;
}
