// Existing public source identities; metadata only, anonymous client, no per-card queries.
import { fetchContributorAuthorAttribution } from "./contributorAuthorAttribution.js";
const PAGE_SIZE = 100;
const MAX_PAGES = 100;
const quoted = (value) => JSON.stringify(String(value));

export function contributorPublicationRecordTime(row) {
  return row?.modified || row?.date || row?.created_at || null;
}

export function contributorPublicationRecordTimeKind(row) {
  if (row?.modified) return "updated";
  if (row?.date) return "published";
  return row?.created_at ? "created" : null;
}

export function sortContributorPublicationRows(rows = []) {
  const time = (row) => {
    const parsed = Date.parse(contributorPublicationRecordTime(row));
    return Number.isFinite(parsed) ? parsed : null;
  };
  return [...(Array.isArray(rows) ? rows : [])].sort((left, right) => {
    const leftTime = time(left), rightTime = time(right);
    if (leftTime == null || rightTime == null) {
      if (leftTime !== rightTime) return leftTime == null ? 1 : -1;
    } else if (leftTime !== rightTime) return rightTime - leftTime;
    return String(left?.id ?? "").localeCompare(String(right?.id ?? ""));
  });
}

async function pages(read) {
  const rows = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await read(page * PAGE_SIZE, PAGE_SIZE);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("invalid_public_catalogue_page");
    rows.push(...data);
    if (data.length < PAGE_SIZE) return { rows, complete: true };
  }
  return { rows, complete: false };
}

export async function fetchContributorPublicationCatalog(identity, { client, attributionReader = fetchContributorAuthorAttribution,
  families = ["posts", "ciphers", "insights", "events", "topics", "contributions"] } = {}) {
  if (!client || !identity?.id) throw new Error("anonymous_catalogue_identity_required");
  // One shared, bounded inventory resolves registered aliases and collisions for
  // every name-based family, including callers from World that only carry an ID.
  let attributionPromise;
  const attribution = () => attributionPromise ||= attributionReader(identity, { client });
  const requests = {
    posts: async () => {
      const { names } = await attribution();
      if (!names.length) throw new Error("public_author_credit_unresolved");
      const result = await pages((offset, size) => client.from("posts")
      .select("id,slug,title,date,modified,created_at,image_url,thumb_url,author,authors")
      .or(names.flatMap((name) => [`author.eq.${quoted(name)}`, `authors.cs.{${quoted(name)}}`]).join(","))
      .order("date", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + size - 1));
      return { ...result, rows: sortContributorPublicationRows(result.rows) };
    },
    ciphers: async () => {
      const { identity: canonical, names } = await attribution();
      const filters = [canonical.user_id && `owner_user_id.eq.${quoted(canonical.user_id)}`,
        ...names.map((name) => `author_name.eq.${quoted(name)}`)].filter(Boolean);
      if (!filters.length) throw new Error("public_author_credit_unresolved");
      const result = await pages((offset, size) => client.from("els_records")
      .select("id,slug,title,search_term,created_at,image_url,author_name,owner_user_id,status,visibility")
      .or(filters.join(",")).eq("status", "published").eq("visibility", "public")
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + size - 1));
      return { ...result, rows: result.rows.filter((row) => names.includes(row.author_name?.trim())
        || Boolean(canonical.user_id && row.owner_user_id === canonical.user_id))
        .map((row) => ({ ...row, attributionBasis: names.includes(row.author_name?.trim()) ? "source_author_credit"
          : row.author_name?.trim() ? "upload_account_with_unresolved_author_credit" : "account_without_author_credit" })) };
    },
    insights: async () => {
      const { names } = await attribution();
      if (!names.length) throw new Error("public_author_credit_unresolved");
      return pages((offset, size) => client.from("insights")
      .select("id,title,created_at,is_active,space")
      .in("panel_data->>author", names).eq("is_active", true)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + size - 1));
    },
    events: () => pages((offset, size) => client.from("nodes")
      .select("id,label,created_at")
      .eq("type", "event").eq("is_active", true).eq("metadata->>contributor_slug", identity.slug)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + size - 1)),
    topics: async () => {
      const { names } = await attribution();
      if (!names.length) throw new Error("public_author_credit_unresolved");
      return pages((offset, size) => client.from("topic_cards_public")
      .select("slug,title,subtitle,status,approved_at,created_by")
      .in("created_by", names)
      .eq("status", "approved").order("approved_at", { ascending: false }).order("slug", { ascending: false })
      .range(offset, offset + size - 1));
    },
    contributions: () => pages((offset, size) => client.rpc("writer_public_contributions_page_v1", {
      p_contributor_id: identity.id, p_limit: size, p_offset: offset,
    })),
  };
  const entries = await Promise.all(Object.entries(requests).filter(([key]) => families.includes(key)).map(async ([key, read]) => {
    try { return [key, { ...await read(), availability: "ok" }]; }
    catch { return [key, { rows: [], complete: false, availability: "unavailable" }]; }
  }));
  return Object.fromEntries(entries);
}
