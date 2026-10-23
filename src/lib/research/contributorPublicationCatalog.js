// Existing public source identities; metadata only, anonymous client, no per-card queries.
const PAGE_SIZE = 100;
const MAX_PAGES = 100;
const quoted = (value) => JSON.stringify(String(value));

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

export async function fetchContributorPublicationCatalog(identity, { client } = {}) {
  if (!client || !identity?.id) throw new Error("anonymous_catalogue_identity_required");
  const name = identity.display_name;
  const requests = {
    posts: () => pages((offset, size) => client.from("posts")
      .select("id,slug,title,date,image_url,thumb_url,author,authors")
      .or(`author.eq.${quoted(name)},authors.cs.{${quoted(name)}}`)
      .order("date", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + size - 1)),
    ciphers: () => identity.user_id ? pages((offset, size) => client.from("els_records")
      .select("id,slug,title,search_term,created_at,image_url,author_name,status,visibility")
      .eq("owner_user_id", identity.user_id).eq("status", "published").eq("visibility", "public")
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + size - 1)) : Promise.resolve({ rows: [], complete: true }),
    insights: () => pages((offset, size) => client.from("insights")
      .select("id,title,created_at,is_active,space")
      .eq("panel_data->>author", name).eq("is_active", true)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + size - 1)),
    events: () => pages((offset, size) => client.from("nodes")
      .select("id,label,created_at")
      .eq("type", "event").eq("is_active", true).eq("metadata->>contributor_slug", identity.slug)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + size - 1)),
    topics: () => pages((offset, size) => client.from("topic_cards_public")
      .select("slug,title,subtitle,status,approved_at,created_by")
      .in("created_by", [name, ...(Array.isArray(identity.wa_names) ? identity.wa_names : [])])
      .eq("status", "approved").order("approved_at", { ascending: false }).order("slug", { ascending: false })
      .range(offset, offset + size - 1)),
    contributions: () => pages((offset, size) => client.rpc("writer_public_contributions_page_v1", {
      p_contributor_id: identity.id, p_limit: size, p_offset: offset,
    })),
  };
  const entries = await Promise.all(Object.entries(requests).map(async ([key, read]) => {
    try { return [key, { ...await read(), availability: "ok" }]; }
    catch { return [key, { rows: [], complete: false, availability: "unavailable" }]; }
  }));
  return Object.fromEntries(entries);
}
