// M0-D round 3 (12.11.2026): which contributor research view the 2029 site reads.
// world_contributor_research_v2 = v1 plus PUBLIC candidates (status kept; the site labels them «טרם אומת»).
// v1 is never changed, so a tab still running older code keeps reading exactly what it read before.
// While v2 does not exist yet (site deployed before the SQL), readers fall back to v1 and simply show no candidates.
export const CONTRIBUTOR_RESEARCH_VIEW = "world_contributor_research_v2";
export const CONTRIBUTOR_RESEARCH_VIEW_FALLBACK = "world_contributor_research_v1";

// PostgREST reports a relation it does not know as PGRST205 (schema cache) or 42P01 (Postgres). Nothing else falls back:
// a permission or network error stays an error, so a fallback can never hide a real failure.
export function isMissingRelationError(error) {
  const code = String(error?.code || "");
  if (code === "PGRST205" || code === "42P01") return true;
  return /could not find the table|relation .* does not exist/i.test(String(error?.message || ""));
}

// Runs `read(view)` against v2; only when v2 is missing does it run once more against v1.
export async function readContributorResearchView(read) {
  try {
    const out = await read(CONTRIBUTOR_RESEARCH_VIEW);
    if (out && out.error && isMissingRelationError(out.error)) return read(CONTRIBUTOR_RESEARCH_VIEW_FALLBACK);
    return out;
  } catch (error) {
    if (isMissingRelationError(error)) return read(CONTRIBUTOR_RESEARCH_VIEW_FALLBACK);
    throw error;
  }
}
