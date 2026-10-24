import { getPublicResearchClient } from "./researchViewMode.js";

const clean = (value) => value == null ? "" : String(value).trim();
const PAGE_READ_SIZE = 100;
export const WORLD_PEOPLE_PAGE_SIZE = 8;

function safePublicUrl(value) {
  const text = clean(value);
  if (!text || /[\\\u0000-\u0020]/.test(text) || text.startsWith("//")) return null;
  if (text.startsWith("/")) return text;
  try {
    const url = new URL(text);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function isWorldPublicContributor(row) {
  const visibility = clean(row?.public_visibility).toLowerCase();
  return Boolean(clean(row?.id) && clean(row?.slug) && clean(row?.display_name))
    && row?.active === true
    && row?.locked !== true
    && row?.building !== true
    && (!visibility || visibility === "public");
}

function publicAvatar(row) {
  const setting = row?.public_avatar;
  if (setting && typeof setting === "object" && setting.enabled === false) return null;
  if (setting && typeof setting === "object" && setting.enabled === true) return safePublicUrl(setting.url);
  return safePublicUrl(row?.avatar_url);
}

export function buildWorldPublicPeopleIndex(rows = []) {
  const seen = new Set();
  const people = (Array.isArray(rows) ? rows : [])
    .filter(isWorldPublicContributor)
    .filter((row) => {
      const slug = clean(row.slug);
      if (seen.has(slug)) return false;
      seen.add(slug);
      return true;
    })
    .map((row) => Object.freeze({
      id: clean(row.id),
      slug: clean(row.slug),
      code: clean(row.code) || null,
      displayName: clean(row.display_name),
      role: clean(row.role) || "חוקר וכותב",
      avatar: publicAvatar(row),
      href: `/community/researcher/${encodeURIComponent(clean(row.slug))}`,
      sourceHref: `/world?view=sources&source=${encodeURIComponent(clean(row.slug))}`,
      trusted: row.trusted === true,
    }))
    .sort((left, right) => {
      const prominent = (person) => person.slug === "tzvi-opoc" ? 0 : 1;
      return prominent(left) - prominent(right)
        || left.displayName.localeCompare(right.displayName, "he")
        || left.slug.localeCompare(right.slug);
    });
  return Object.freeze({
    people,
    bySlug: Object.freeze(Object.fromEntries(people.map((person) => [person.slug, person]))),
    total: people.length,
    meetings: Object.freeze([]),
    contract: "public_contributor_page_eligibility",
  });
}

export async function fetchWorldPublicPeopleIndex({ client = getPublicResearchClient() } = {}) {
  if (!client) throw new Error("public_people_reader_unavailable");
  const rows = [];
  for (let offset = 0; ; offset += PAGE_READ_SIZE) {
    const { data, error } = await client.from("contributors")
      .select("id,slug,code,display_name,avatar_url,role,active,locked,building,trusted,public_visibility:dossier_settings->>visibility,public_avatar:dossier_settings->public_avatar")
      .eq("active", true)
      .or("locked.is.null,locked.eq.false")
      .or("building.is.null,building.eq.false")
      .or("dossier_settings->>visibility.is.null,dossier_settings->>visibility.eq.public")
      .order("display_name", { ascending: true })
      .order("slug", { ascending: true })
      .range(offset, offset + PAGE_READ_SIZE - 1);
    if (error) throw error;
    const page = Array.isArray(data) ? data : [];
    rows.push(...page);
    if (page.length < PAGE_READ_SIZE) break;
  }
  return buildWorldPublicPeopleIndex(rows);
}
