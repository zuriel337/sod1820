import { contributorHref } from "../supabase.js";
import { publicAuthorName, SYSTEM_BYLINE } from "../publicIdentity.js";

const clean = (value) => typeof value === "string" ? value.trim() : "";
const namesOf = (row) => [...new Set([row?.display_name, ...(Array.isArray(row?.wa_names) ? row.wa_names : [])].map(clean).filter(Boolean))];
const visible = (row) => row?.active === true && row?.locked !== true && row?.building !== true
  && (!row?.public_visibility || row.public_visibility === "public") && Boolean(row?.id && row?.slug);

// Exact existing names only. Keep ineligible matches in the collision check, but
// never return their identity. A credit is not a new person or an account merge.
export function resolveContributorAuthorCredit(credit, rows) {
  const name = clean(credit);
  if (!name) return { status: "unresolved", contributor: null };
  const matches = new Map((Array.isArray(rows) ? rows : [])
    .filter((row) => namesOf(row).includes(name)).map((row) => [row.id, row]));
  if (matches.size > 1) return { status: "ambiguous", contributor: null };
  const row = [...matches.values()][0];
  return row && visible(row) ? { status: "linked", contributor: row } : { status: "unresolved", contributor: null };
}

export function contributorAuthorAttribution(identity, rows) {
  const matches = rows.filter((row) => row.id === identity?.id);
  if (matches.length !== 1 || !visible(matches[0]) || identity.slug && matches[0].slug !== identity.slug) {
    throw new Error("public_author_identity_unavailable");
  }
  const canonical = matches[0];
  const names = namesOf(canonical).filter((name) => resolveContributorAuthorCredit(name, rows).contributor?.id === canonical.id);
  return { identity: canonical, names };
}

export async function fetchContributorAuthorAttribution(identity, { client } = {}) {
  const rows = [];
  for (let offset = 0; offset < 10000; offset += 100) {
    const { data, error } = await client.from("contributors")
      .select("id,slug,code,display_name,user_id,wa_names,active,locked,building,public_visibility:dossier_settings->>visibility")
      .order("id", { ascending: true }).range(offset, offset + 99);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("invalid_author_attribution_page");
    rows.push(...data);
    if (data.length < 100) return contributorAuthorAttribution(identity, rows);
  }
  // A truncated identity inventory cannot establish that a name is unique.
  throw new Error("author_attribution_inventory_incomplete");
}

// Review projection over public source credits; it stores neither corpus nor identities.
export function buildContributorAuthorCoverage(credits, contributors) {
  return credits.map(({ credit, count = null }) => {
    const resolution = resolveContributorAuthorCredit(credit, contributors);
    const system = publicAuthorName(credit) === SYSTEM_BYLINE;
    return { credit, count, status: system ? "system" : resolution.status,
      slug: !system ? resolution.contributor?.slug || null : null,
      href: !system && resolution.contributor ? contributorHref(resolution.contributor) : null };
  });
}
