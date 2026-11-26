// A reading projection of the existing WordPress archive, keyed by posts.wp_id.
// This adapter does not create a conversation or change comment identity.
const clean = (value) => value == null ? "" : String(value).trim();
const NAMED_ENTITIES = Object.freeze({
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  hellip: "…", ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’",
  ldquo: "“", rdquo: "”", laquo: "«", raquo: "»",
});

export function archiveCommentText(value) {
  return String(value ?? "")
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\b[^>]*>|<\/(?:p|div|li|blockquote|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, token) => {
      if (token[0] !== "#") return NAMED_ENTITIES[token.toLowerCase()] ?? entity;
      const point = token[1]?.toLowerCase() === "x" ? parseInt(token.slice(2), 16) : Number(token.slice(1));
      return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff)
        ? String.fromCodePoint(point) : "";
    })
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function publicPostCommentArchiveId(projection) {
  if (!projection?.post || projection.draft || projection.privateStage || projection.previewSnapshot) return null;
  const wpId = projection.post.wp_id;
  return /^[1-9]\d*$/.test(clean(wpId)) && Number.isSafeInteger(Number(wpId)) ? wpId : null;
}

export async function readPostCommentArchive(postWpId, reader) {
  if (!/^[1-9]\d*$/.test(clean(postWpId)) || !Number.isSafeInteger(Number(postWpId))) return [];
  const rows = await reader(postWpId);
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row && Number(row.post_wp_id) === Number(postWpId))
    .map((row) => {
      const date = clean(row.date);
      const parentId = clean(row.parent_wp_id);
      return {
        id: clean(row.wp_id),
        parentId: parentId && parentId !== "0" ? parentId : null,
        author: archiveCommentText(row.author_name),
        text: archiveCommentText(row.content),
        date: date && Number.isFinite(Date.parse(date)) ? date : null,
      };
    });
}

// ── New comments (ZURIEL 25.11.2026): ONE record in research_contributions, keyed by the canonical 2029 post id (posts.id); the WordPress id only joins the archive.
// The same row is the Community message (origin "community_2029", so the existing feed shows it) and the post comment (target_type "post"). No second table.
export const POST_COMMENT_ORIGIN = "community_2029";
export const POST_COMMENT_MAX = 6000;
export function publicPostCommentPostId(projection) {
  if (!projection?.post || projection.draft || projection.privateStage || projection.previewSnapshot) return null;
  const id = projection.post.id;
  return /^[1-9]\d*$/.test(clean(id)) && Number.isSafeInteger(Number(id)) ? Number(id) : null;
}
// A row of the community reader (RLS: approved, or the viewer's own). Hidden / rejected / deleted / empty rows never reach the page.
export function normalizePostCommunityComment(row, ownUserId = null) {
  if (!row || typeof row !== "object" || !row.id) return null;
  if (["hidden", "rejected"].includes(row.status) || row.deleted_at || row.thread_hidden_at) return null;
  const text = archiveCommentText(row.body);
  if (!text) return null;
  const date = Number.isFinite(Date.parse(row.created_at)) ? row.created_at : null;
  return { id: `c:${row.id}`, parentId: row.parent_id ? `c:${row.parent_id}` : null, author: clean(row.author_name), text, date,
    pending: row.status === "pending" && Boolean(ownUserId) && row.author_user_id === ownUserId, source: "community" };
}
export async function readPostCommunityComments(postId, client, ownUserId = null) {
  if (!Number.isSafeInteger(Number(postId)) || Number(postId) < 1 || !client) return [];
  const { data, error } = await client.from("research_contributions")
    .select("id,parent_id,author_name,author_user_id,body,status,created_at,deleted_at,thread_hidden_at")
    .eq("target_type", "post").eq("target_id", String(postId)).eq("origin", POST_COMMENT_ORIGIN)
    .order("created_at", { ascending: true }).limit(200);
  if (error) throw error;
  return (data || []).map(row => normalizePostCommunityComment(row, ownUserId)).filter(Boolean);
}
// Old and new together, oldest first; an id appears once.
export function mergePostComments(archive = [], community = []) {
  const seen = new Set(), out = [];
  for (const row of [...archive, ...community]) { if (!row?.id || seen.has(row.id)) continue; seen.add(row.id); out.push(row); }
  return out.sort((a, b) => (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0));
}
