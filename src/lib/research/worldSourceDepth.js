import { supabase } from "../supabase.js";
import { buildSourceDepth } from "./worldSourceDepthProjection.js";

const clean = (value) => value == null ? "" : String(value).trim();
const PAGE = 1000;
const MAX_PAGES = 12;

async function readAllPosts() {
  const posts = [];
  let complete = false;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await supabase
      .from("posts")
      .select("id,slug,categories")
      .order("id", { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    posts.push(...(data || []));
    if ((data || []).length < PAGE) { complete = true; break; }
  }
  return { posts, complete };
}

async function readTopics() {
  const topics = [];
  for (let page = 0; page < 5; page += 1) {
    const { data, error } = await supabase
      .from("topic_cards_public")
      .select("slug,title,subtitle,node_id")
      .order("slug", { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    topics.push(...(data || []));
    if ((data || []).length < PAGE) break;
  }
  return topics;
}

async function readAttestedLinks(topics) {
  const nodeToSlug = new Map(topics.filter((t) => t.node_id).map((t) => [clean(t.node_id), clean(t.slug)]));
  const ids = [...nodeToSlug.keys()];
  if (!ids.length) return [];
  const links = [];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const list = chunk.join(",");
    const { data: edges, error } = await supabase
      .from("edges")
      .select("from_node,to_node")
      .eq("relation_type", "source")
      .or(`from_node.in.(${list}),to_node.in.(${list})`);
    if (error) throw error;
    const pairs = (edges || []).map((e) => {
      const fromIsTopic = nodeToSlug.has(clean(e.from_node));
      return { topicSlug: nodeToSlug.get(clean(fromIsTopic ? e.from_node : e.to_node)), other: clean(fromIsTopic ? e.to_node : e.from_node) };
    }).filter((p) => p.topicSlug && p.other);
    if (!pairs.length) continue;
    const { data: nodes, error: nodeError } = await supabase
      .from("nodes")
      .select("id,type,metadata")
      .eq("type", "post")
      .in("id", [...new Set(pairs.map((p) => p.other))]);
    if (nodeError) throw nodeError;
    const postSlugByNode = new Map((nodes || []).map((n) => [clean(n.id), clean(n.metadata?.slug)]));
    for (const p of pairs) {
      const postSlug = postSlugByNode.get(p.other);
      if (postSlug) links.push({ topicSlug: p.topicSlug, postSlug });
    }
  }
  return links;
}

// Module-level memo: one bounded facet read per page session, never per component mount.
let depthPromise = null;
export function fetchWorldSourceDepth() {
  if (!supabase) return Promise.resolve(buildSourceDepth({ complete: false }));
  if (!depthPromise) {
    depthPromise = (async () => {
      const [{ posts, complete }, topics] = await Promise.all([readAllPosts(), readTopics()]);
      const attestedLinks = await readAttestedLinks(topics);
      return buildSourceDepth({ posts, topics, attestedLinks, complete });
    })().catch((error) => { depthPromise = null; throw error; });
  }
  return depthPromise;
}

export const SOURCE_PAGE_SIZE = 12;

// Genuine server-side pagination of public source works for ONE category (existing posts reader,
// same anon-readable columns the rest of World uses). Returns {rows, hasMore}.
export async function fetchCategorySources(category, page = 0) {
  if (!supabase || !clean(category)) return { rows: [], hasMore: false };
  const from = page * SOURCE_PAGE_SIZE;
  const { data, error } = await supabase
    .from("posts")
    .select("id,slug,title,date")
    .contains("categories", [category])
    .order("date", { ascending: false, nullsFirst: false })
    .range(from, from + SOURCE_PAGE_SIZE);
  if (error) throw error;
  const rows = (data || []).filter((r) => clean(r.slug));
  return { rows: rows.slice(0, SOURCE_PAGE_SIZE), hasMore: (data || []).length > SOURCE_PAGE_SIZE };
}
