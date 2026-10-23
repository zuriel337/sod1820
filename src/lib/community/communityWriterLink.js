import { contributorHref } from "../supabase.js";
import { getPublicResearchClient } from "../research/researchViewMode.js";
import { approvedReturnHref } from "../../components/contributor2029/publicContributor2029Model.js";
import { publicWriterVisible } from "../userCenter/writerPersonal2029.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A community author key is `user:<account id>` or a contributor id. Anything else resolves to no writer.
export function communityWriterLookup(authorKey) {
  const key = typeof authorKey === "string" ? authorKey : "";
  const isUser = key.startsWith("user:");
  const id = isUser ? key.slice(5) : key;
  return UUID.test(id) ? { column: isUser ? "user_id" : "id", id } : null;
}

// Writer capability follows the Person public resolver rule: contributor.kind is writer or author.
// A public dossier alone is a profile page, not a writer capability, and free-text role is never read.
export const WRITER_KINDS = Object.freeze(["writer", "author"]);

// Resolves the existing public contributor page for a community author through the anonymous public
// reader. Exactly one visible contributor may match: no name matching, and an ambiguous binding
// resolves to nothing. `isWriter` says whether the page may be labeled as a writer page.
export async function resolveCommunityWriter(authorKey, { client = getPublicResearchClient() } = {}) {
  const lookup = communityWriterLookup(authorKey);
  if (!lookup || !client) return null;
  const { data, error } = await client.from("contributors")
    .select("slug,code,display_name,kind,active,locked,building,visibility:dossier_settings->>visibility")
    .eq(lookup.column, lookup.id).limit(2);
  if (error || !Array.isArray(data) || data.length !== 1) return null;
  const row = data[0];
  if (!publicWriterVisible(row) || row.visibility && row.visibility !== "public") return null;
  const href = contributorHref(row);
  return href ? { name: row.display_name || null, href, isWriter: WRITER_KINDS.includes(row.kind) } : null;
}

// Writer-page link carrying an approved return target, so the writer page can offer a way back.
// A return target outside the writer page's approved paths is dropped and history-back still works.
export function communityWriterHref(writer, returnTo, origin) {
  if (!writer?.href) return null;
  const back = approvedReturnHref(returnTo, origin);
  return back ? `${writer.href}?${new URLSearchParams({ returnTo: back })}` : writer.href;
}
