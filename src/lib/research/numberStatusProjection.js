import { supabase, getSearchCount, getCollectiveCount } from "../supabase.js";

// Compact read-only composition for the Universal Hub status board.
// Owns no truth: every field comes from an existing canonical/public reader.
// Meter counts and public-surface counts intentionally stay separate because their scopes differ.

async function rpcValue(name, args, fallback = null) {
  try {
    const { data, error } = await supabase.rpc(name, args);
    if (error) throw error;
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

async function exactCount(builder) {
  try {
    const { count, error } = await builder;
    if (error) throw error;
    return Number.isFinite(Number(count)) ? Number(count) : null;
  } catch {
    return null;
  }
}

export async function fetchNumberStatusProjection({ number, nodeId = null } = {}) {
  const value = Number(number);
  if (!Number.isSafeInteger(value) || value < 1) return null;

  const graphCountP = nodeId
    ? exactCount(
        supabase.from("edges")
          .select("id", { count: "exact", head: true })
          .or(`from_node.eq.${nodeId},to_node.eq.${nodeId}`)
      )
    : Promise.resolve(null);

  const galleryPrimaryP = exactCount(
    supabase.from("gallery_images")
      .select("id", { count: "exact", head: true })
      .eq("primary_value", value)
      .not("curator_hidden", "is", true)
      .eq("min_tier", 0)
  );

  // Public RLS remains authoritative. This is a count over the existing ELS store, not a new index.
  const cipherCountP = exactCount(
    supabase.from("els_records")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .or(`primary_number.eq.${value},anchor_numbers.cs.{${value}}`)
  );

  const strictPostsP = (async () => {
    try {
      // Bounded on purpose. 101 lets the renderer distinguish 100 from 100+ without corpus dumping.
      const { data, error } = await supabase.rpc("posts_by_number_strict", { num: value, lim: 101 });
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      return { count: Math.min(rows.length, 100), capped: rows.length > 100 };
    } catch {
      return { count: null, capped: false };
    }
  })();

  const [
    meter,
    viewsAll,
    views30,
    searches,
    graphEdges,
    galleryPrimary,
    ciphers,
    strictPosts,
    collective,
    indexable,
  ] = await Promise.all([
    rpcValue("convergence_meter", { p_n: value }, null),
    rpcValue("view_count", { p_kind: "number", p_ref: String(value), p_days: 36500 }, null),
    rpcValue("view_count", { p_kind: "number", p_ref: String(value), p_days: 30 }, null),
    getSearchCount(value).catch(() => null),
    graphCountP,
    galleryPrimaryP,
    cipherCountP,
    strictPostsP,
    getCollectiveCount("number", String(value)).catch(() => null),
    rpcValue("is_number_indexable", { p_value: value }, null),
  ]);

  return {
    v: 1,
    number: value,
    meter,
    analytics: {
      viewsAll: viewsAll == null ? null : Number(viewsAll),
      views30: views30 == null ? null : Number(views30),
      searches: searches == null ? null : Number(searches),
      collective: collective == null ? null : Number(collective),
    },
    counts: {
      graphEdges,
      galleryPrimary,
      ciphers,
      strictPosts: strictPosts.count,
      strictPostsCapped: strictPosts.capped,
    },
    discovery: {
      indexable: typeof indexable === "boolean" ? indexable : null,
    },
    provenance: {
      score: "convergence_meter",
      views: "view_count",
      searches: "search_log via getSearchCount",
      collective: "entity_collective_count",
      graphEdges: "edges public RLS exact count",
      galleryPrimary: "gallery_images public projection exact count",
      posts: "posts_by_number_strict bounded <=101",
      ciphers: "els_records public RLS exact count",
    },
  };
}

export default fetchNumberStatusProjection;
