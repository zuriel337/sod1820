// Identity verification and delivery-channel consent are separate capabilities.
// Existing subscription surfaces opt in by default; Follow provenance is identity-only.
export function shouldSubscribeEmailDuringVerification({ source = "site", subscribeToUpdates = true } = {}) {
  if (!subscribeToUpdates) return false;
  return !String(source || "").startsWith("follow:");
}
