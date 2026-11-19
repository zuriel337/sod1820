import { isPersonOnly } from "./researchViewMode.js";
import { worldPreviewMaterialExclusion } from "./worldPreviewMaterialScope.js";

// Exact, reviewed Fullscan2 display occurrences. These pin the public channel
// image witnessed in the decision pack; they never grant gallery publication.
const FULLSCAN_DISPLAY_OCCURRENCES = [
  ["73f034f7-3622-4f84-ae51-3da3ab626c47", "7c9c19af-ada2-48e5-9037-f135378608eb", "fullscan:yair-erech-221", "98d127e6-f22c-4fc7-bce2-8ed5d8b61057", "AC50D0807B53F90CDCD95C27C693BEE0"],
  ["762cb2fb-c54f-4f4a-b5a1-50684d244c64", "8ca07498-5fba-4686-b5d9-c539ab03c193", "fullscan:nisan-nisim-makel-170", "74adef58-8838-4cba-b13a-c03bb788d7f7", "AC55C90E0C16CEB8DC146BD1F8020BFB"],
];

export function fullscanDisplaySourceRefs(researchObjects, publicSources, contributor, now = Date.now()) {
  const refs = {};
  if (contributor?.slug !== "tzvi-opoc" || contributor.id !== "c66f0464-0928-490e-be9b-66d8a87e7fc8") return refs;
  for (const [id, galleryId, fragment, sourceId, image] of FULLSCAN_DISPLAY_OCCURRENCES) {
    const row = researchObjects.find(row => row.id === id), source = publicSources.find(row => row.id === sourceId);
    const artifact = `gallery_images:${galleryId}`, occurrence = `channel_updates:${sourceId}`;
    if (!row || !source || row.source_ref !== `${artifact}#${fragment}`
      || row.privacy_scope !== "public" || !["approved", "canonical"].includes(row.status)
      || isPersonOnly(row)
      || row.meta?.source_media?.artifact_ref !== artifact || row.meta?.source_media?.occurrence_ref !== occurrence
      || !row.meta?.source_refs?.includes(artifact) || !row.meta?.source_refs?.includes(occurrence)
      || source.status !== "live" || source.contributor_id !== contributor.id
      || worldPreviewMaterialExclusion(source, "source_message")
      || (source.expires_at != null && !(Date.parse(source.expires_at) > now))
      || source.image_url !== `https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/broadcasts/${image}.jpg`) continue;
    refs[id] = occurrence;
  }
  return refs;
}

export const fullscanResearchIdForOccurrence = (ref) => FULLSCAN_DISPLAY_OCCURRENCES.find(entry => `channel_updates:${entry[3]}` === ref)?.[0] || null;
export const fullscanOccurrenceForResearchId = (id) => {
  const entry = FULLSCAN_DISPLAY_OCCURRENCES.find(entry => entry[0] === id);
  return entry ? `channel_updates:${entry[3]}` : null;
};

// Called with the existing anonymous reader. No gallery read or access override.
export async function readFullscanDisplaySource(client, row) {
  const ref = fullscanOccurrenceForResearchId(row?.id);
  if (!ref) return null;
  const { data, error } = await client.from("channel_updates")
    .select("id,status,contributor_id,image_url,expires_at,channel")
    .eq("id", ref.split(":")[1]).eq("status", "live").maybeSingle();
  if (error) throw error;
  const contributor = { id: "c66f0464-0928-490e-be9b-66d8a87e7fc8", slug: "tzvi-opoc" };
  return fullscanDisplaySourceRefs([row], data ? [data] : [], contributor)[row.id]
    ? { sourceRef: ref, row: data } : null;
}
