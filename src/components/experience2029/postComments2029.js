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
