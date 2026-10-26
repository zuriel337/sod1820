import { contributorHref } from "../../lib/supabase.js";
import { contributionTouchesWorldAnchor } from "../../lib/research/worldContributorLens.js";
import { approvedReturnHref } from "./publicContributor2029Model.js";

// Integration seam for existing surfaces; no global navigation or routing is changed here.
// The caller passes the actual location, including its existing filters/item/hash.
export function contributorNavigation2029(contributor, { returnHref, origin, worldContribution, worldAnchor } = {}) {
  const href = contributorHref(contributor);
  if (!href || !contributor?.slug && !contributor?.code) return null;
  const safeReturn = approvedReturnHref(returnHref, origin);
  // Reuse World's exact typed-anchor check when linking an attributed World contribution.
  const exactWorldContext = !worldContribution || !worldAnchor || contributionTouchesWorldAnchor(worldContribution, worldAnchor);
  return safeReturn && exactWorldContext ? `${href}?${new URLSearchParams({ returnTo: safeReturn })}` : href;
}
