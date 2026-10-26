// Presentation of the existing research_level_of result; no XP formula or new rank authority.
export const CONTRIBUTOR_RANK_STATES = Object.freeze(["ready", "loading", "unlinked", "not_found", "unavailable"]);
export const validContributorKey = (key) => typeof key === "string" && /^[\p{L}\p{N}_-]{1,160}$/u.test(key) && key !== "me";

export function publicContributorRank(value) {
  if (value?.state !== "ready") return { state: ["loading", "unlinked", "not_found"].includes(value?.state) ? value.state : "unavailable" };
  const level = value.level;
  const label = typeof value.label === "string" ? value.label.trim() : "";
  if (!Number.isInteger(level) || level < 1 || level > 5 || !/[א-ת]/.test(label)
    || label.length > 80 || /[\u0000-\u001f@]|[0-9a-f]{8}-[0-9a-f-]{27}/i.test(label)) return { state: "unavailable" };
  return { state: "ready", level, label };
}

export async function fetchPublicContributorRank(key, { fetcher = globalThis.fetch, signal } = {}) {
  if (!validContributorKey(key)) return { state: "not_found" };
  try {
    const response = await fetcher(`/api/public-contributor-rank?${new URLSearchParams({ slug: key })}`, {
      method: "GET", credentials: "same-origin", headers: { Accept: "application/json" }, signal,
    });
    if (!response.ok) return { state: response.status === 404 ? "not_found" : "unavailable" };
    return publicContributorRank(await response.json());
  } catch { return { state: "unavailable" }; }
}
