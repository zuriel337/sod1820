// Home-only choice of the latest UPDATED public member of the primary reality-map series.
// "modified" is a Post change timestamp (not a new publication or a proven source-unit arrival).
// A verified unit addition may be newer than modified, because some source edits keep modified unchanged.
// The catalog already enforces publication/series membership; this selection does not alter those rules.
import { PROVEN_POST_SOURCE_UPDATES } from "./postSourceUpdates2029.js";
import { seriesLatestFace2029 } from "../nowPublications2029.js";

const at = value => Date.parse(value || "") || 0;
const proofTime = member => (PROVEN_POST_SOURCE_UPDATES[Number(member?.id)] || [])
  .reduce((latest, entry) => Math.max(latest, at(entry.updatedAt)), 0);

export function homeMapLeadTime2029(member) {
  return Math.max(at(member?.publishedAt), at(member?.updatedAt), proofTime(member));
}

export function homeMapLeadMember2029(members) {
  return (Array.isArray(members) ? members : []).filter(member => member?.id != null).slice()
    .sort((a, b) => homeMapLeadTime2029(b) - homeMapLeadTime2029(a)
      || String(a.id).localeCompare(String(b.id)))[0] || null;
}

// Keep the link to a proven unit only when it is the latest change; later Post edits open
// the complete Post rather than pretending that an older registered unit was added again.
export function homeMapLeadFace2029(member) {
  if (!member) return null;
  const unitFace = seriesLatestFace2029(member);
  if (at(member.updatedAt) > at(unitFace?.at)) {
    return { title: member.title, postTitle: null, at: member.updatedAt, href: member.href };
  }
  return unitFace;
}
