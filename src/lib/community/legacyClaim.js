import { supabase } from "../supabase.js";
import { isCommunityReadOnlyPreview } from "./communityPreviewReadOnly.js";

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

// Automatic link by confirmed email. The server decides; "nothing to do" is a normal result, and a missing
// function (migration not applied) is silent. Returns { claimed, messages, reason } or null.
export async function claimLegacyByEmail() {
  if (isCommunityReadOnlyPreview()) return null;
  const { data, error } = await supabase.rpc("contributors_claim_legacy_by_email");
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883" || /could not find the function|does not exist/i.test(error.message || "")) return null;
    throw error;
  }
  return { claimed: Number(data?.claimed) || 0, messages: Number(data?.messages) || 0, reason: data?.reason || null };
}
