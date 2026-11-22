import { publicInsightId2029 } from "./publicReadingRelease2029.js";

const COMMUNITY_TAG = "חידושי גולשים";
const UNPUBLISHED_TAGS = ["טיוטה", "פרטי"];

export function requestedPublicInsight2029(params) {
  const values = params.getAll("insight");
  const known = [...params.keys()].every(key => ["insight", "src", "gclid", "fbclid"].includes(key) || key.startsWith("utm_"));
  return values.length === 1 && known ? publicInsightId2029(values[0]) : null;
}

// Preserve the two existing public sources for this link: the tagged Beit Midrash
// community reader and the published forum feed. Its forum-only hide marker does
// not withdraw an insight separately published in the community reader.
export async function readPublicInsight2029(readRows, id) {
  id = publicInsightId2029(id);
  if (!id) return null;
  const params = new URLSearchParams({
    select: "id,title,body,created_at,is_active,space,tags,forum_hidden:panel_data->>forum_hidden",
    id: "eq." + id, is_active: "eq.true", space: "in.(core,lab)", "panel_data->>privacy_owner_user_id": "is.null",
    and: `(or(tags.is.null,tags.not.ov.{${UNPUBLISHED_TAGS.join(",")}}),or(tags.cs.{${COMMUNITY_TAG}},panel_data->>forum_hidden.is.null,panel_data->>forum_hidden.eq.false))`,
    limit: "1",
  });
  const [row] = await readRows("insights?" + params);
  if (row?.id !== id || row.is_active !== true || !["core", "lab"].includes(row.space)) return null;
  const tags = Array.isArray(row.tags) ? row.tags : [];
  if (tags.some(tag => UNPUBLISHED_TAGS.includes(tag))
    || !tags.includes(COMMUNITY_TAG) && row.forum_hidden != null && String(row.forum_hidden) !== "false") return null;
  const title = row.title?.trim();
  const body = row.body?.trim();
  return title && body ? { id, title, body, href: "/findings?insight=" + id } : null;
}
