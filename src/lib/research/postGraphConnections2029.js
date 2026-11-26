// The public connections of ANY Post, from the canonical Reality Graph (ZURIEL 26.11.2026): the Post's own node (identity_key wp:<wp_id>, or metadata.post_id) and its adjacent
// edges, read by the one existing reader (fetchCanonicalGraphEntityFindings), then admitted by the one existing access-controlled resolver (resolvePostExperienceConnections: a
// number is a number page; a Post must be a public reading source; nothing external, nothing private). Reading only, no write, no inference: a graph edge is structure, not
// verification, so the tooltip says "קשר בגרף" and never "אומת". A counterpart without a public address (an entity or an event has no public page today) is not shown; it is
// counted so the gap is visible. Pilot Posts keep their authored connections (experience.connections); this reader runs only when a Post has none.
import { numberPageHref } from "./numberPageAddress.js";

const clean = (value) => value == null ? "" : String(value).trim();
const RELATION_LABEL = Object.freeze({ mentions: "מופיע בפוסט", documents: "מתועד בפוסט", related: "פוסט קשור", source: "מקור" });
export const GRAPH_CONNECTION_LIMIT = 12;

// Which node of the graph is this Post? wp_id is the archive identity; new native Posts carry metadata.post_id.
export function postGraphNodeLookup(post) {
  const wpId = clean(post?.wp_id);
  if (/^\d+$/.test(wpId)) return { column: "identity_key", value: `wp:${wpId}` };
  const id = clean(post?.id);
  return /^\d+$/.test(id) ? { column: "metadata->>post_id", value: id } : null;
}

// Pure: graph-relation findings of one anchor node -> candidate connections with a public address, plus how many counterparts have none.
export function graphConnectionCandidates(findings, anchorNodeId, { selfSlug = "" } = {}) {
  const seen = new Set(), items = [];
  let unlinked = 0;
  for (const finding of Array.isArray(findings) ? findings : []) {
    if (finding?.kind !== "graph-relation") continue;
    for (const relation of finding.projection?.relations || []) {
      const fromId = clean(relation.fromNodeId), toId = clean(relation.toNodeId);
      if (fromId !== anchorNodeId && toId !== anchorNodeId) continue;
      const other = fromId === anchorNodeId ? relation.to : relation.from;
      const type = clean(other?.type), label = clean(other?.label);
      const reason = `קשר בגרף המציאות · ${RELATION_LABEL[clean(relation.relationType)] || clean(relation.relationType) || "קשר"}`;
      if (type === "post" && selfSlug && clean(other?.href) === `/post/${selfSlug}`) continue; // the Post itself is neither a connection nor a gap
      let candidate = null;
      if (type === "number" && /^\d+$/.test(label)) candidate = { id: `number-${label}`, label: "מספר", value: label, kind: "מספר", href: numberPageHref(label), reason };
      else if (type === "post" && clean(other?.href).startsWith("/post/") && clean(other.href) !== `/post/${selfSlug}`) candidate = { id: `post-${clean(other.id)}`, label, kind: "פוסט", href: clean(other.href), reason };
      if (!candidate) { unlinked += 1; continue; }
      if (seen.has(candidate.href)) continue;
      seen.add(candidate.href);
      items.push(candidate);
      if (items.length >= GRAPH_CONNECTION_LIMIT) return { items, unlinked };
    }
  }
  return { items, unlinked };
}

// Async reader. Every dependency is injectable (tests); the defaults are the live modules, loaded on demand.
export async function readPostGraphConnections(post, { readNode = null, readFindings = null, resolve = null } = {}) {
  const lookup = postGraphNodeLookup(post);
  if (!lookup) return { status: "unavailable", items: [], unlinked: 0 };
  const node = await (readNode || (async (look) => {
    const { supabase } = await import("../supabase.js");
    const { data, error } = await supabase.from("nodes").select("id,is_active").eq("type", "post").eq(look.column, look.value).maybeSingle();
    if (error) throw error;
    return data;
  }))(lookup);
  if (!node?.id || node.is_active === false) return { status: "ready", items: [], unlinked: 0 };
  const findings = await (readFindings || (async (id) => (await import("./entityGraphFinding.js")).fetchCanonicalGraphEntityFindings(id, { relationLimit: 50 })))(String(node.id));
  const { items, unlinked } = graphConnectionCandidates(findings, String(node.id), { selfSlug: clean(post?.slug) });
  if (!items.length) return { status: "ready", items: [], unlinked };
  const resolver = resolve || (async (connections) => (await import("./post2029ReadingProjection.js")).resolvePostExperienceConnections({ connections }));
  const resolved = await resolver(items);
  const admitted = (resolved?.connections || []).filter(item => item?.href);
  return { status: admitted.length < items.length ? "partial" : "ready", items: admitted, unlinked };
}
