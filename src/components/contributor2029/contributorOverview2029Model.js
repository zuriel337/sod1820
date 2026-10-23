import { safePublicUrl } from "./publicContributor2029Model.js";

const clean = (value, max = 12000) => typeof value === "string" ? value.trim().slice(0, max) : "";
export function publicDate(value, now = new Date()) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return null;
  const date = new Date(value);
  return Number.isFinite(+date) && +date <= +now ? date.toISOString() : null;
}
const israelParts = (value) => Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
}).formatToParts(new Date(value)).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
export function membershipTenure(joinedAt, now = new Date()) {
  if (!publicDate(joinedAt, now)) return null;
  const start = israelParts(joinedAt), end = israelParts(now);
  const years = end.year - start.year - (end.month < start.month || end.month === start.month && end.day < start.day ? 1 : 0);
  return years < 1 ? "פחות משנה בקהילה" : years === 1 ? "שנה בקהילה" : years === 2 ? "שנתיים בקהילה" : `${years} שנים בקהילה`;
}

export function publicStudioItems(rows, contributorId) {
  return (Array.isArray(rows) ? rows : []).filter((row) => row?.contributor_id === contributorId
    && row.is_public === true && row.is_personal === false && typeof row.id === "string")
    .map((row) => ({ id: row.id, kind: clean(row.kind, 40), title: clean(row.title, 500), body: clean(row.body, 100000),
      imageUrl: safePublicUrl(row.image_url), href: safePublicUrl(row.link_url),
      media: (Array.isArray(row.media) ? row.media : []).map((item) => ({ url: safePublicUrl(item?.url), caption: clean(item?.caption, 500) })).filter((item) => item.url),
      value: Number.isSafeInteger(row.value) ? row.value : null, createdAt: publicDate(row.created_at) }));
}

// A second allowlist at the browser boundary. Never expose raw dossier/account/RPC records.
export function publicContributorOverview(value, now = new Date()) {
  if (value?.state !== "ready") return { state: value?.state === "not_found" ? "not_found" : "unavailable" };
  const joinedAt = publicDate(value.joinedAt, now);
  return { state: "ready", joinedAt, tenureLabel: membershipTenure(joinedAt, now),
    pageSince: publicDate(value.pageSince, now), lastSeenAt: null, lastSeenState: "unavailable",
    about: clean(value.about), currentFocus: clean(value.currentFocus),
    studio: { available: value.studio?.available === true, page: Number.isSafeInteger(value.studio?.page) ? value.studio.page : 0,
      hasMore: value.studio?.hasMore === true,
      items: (Array.isArray(value.studio?.items) ? value.studio.items : []).map((item) => ({
        id: clean(item?.id, 200), kind: clean(item?.kind, 40), title: clean(item?.title, 500), body: clean(item?.body, 100000),
        imageUrl: safePublicUrl(item?.imageUrl), href: safePublicUrl(item?.href),
        media: (Array.isArray(item?.media) ? item.media : []).map((media) => ({ url: safePublicUrl(media?.url), caption: clean(media?.caption, 500) })).filter((media) => media.url),
        value: Number.isSafeInteger(item?.value) ? item.value : null, createdAt: publicDate(item?.createdAt, now),
      })).filter((item) => item.id) } };
}

export async function fetchContributorOverview(key, { signal, page = 0, fetcher = fetch } = {}) {
  try {
    const response = await fetcher(`/api/contributor-public-overview?slug=${encodeURIComponent(key)}&page=${page}`,
      { signal, credentials: "omit", headers: { Accept: "application/json" } });
    return response.ok ? publicContributorOverview(await response.json()) : { state: "unavailable" };
  } catch { return { state: "unavailable" }; }
}
