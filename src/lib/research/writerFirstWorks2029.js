import { fetchContributorPublicationCatalog } from "./contributorPublicationCatalog.js";
import { fetchContributorAuthorAttribution } from "./contributorAuthorAttribution.js";
import { getPublicResearchClient } from "./researchViewMode.js";
import { appendContributorPublicationCatalog } from "../../components/contributor2029/publicContributor2029Model.js";
import { contributorHref } from "../supabase.js";
import { contributorSourceLocator } from "./worldContributorSourceLocator.js";
import { publicChannelToSystemItem } from "./systemFeedPublicSources2029.js";
import { redactGroupText } from "./worldGroupSource.js";

async function writerSourceLinks(identity, client, signal) {
  const query = client.from("channel_updates")
    .select("id,contributor_id,channel,status,page_only,expires_at,created_at,text,image_url")
    .eq("contributor_id", identity.id).eq("status", "live").eq("page_only", false)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(4);
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error || !Array.isArray(data)) return [];
  return data.flatMap(row => {
    const source = publicChannelToSystemItem(row);
    const locator = contributorSourceLocator(`channel_updates:${row.id}`, { slug: identity.slug });
    return source && locator.exact && row.contributor_id === identity.id
      ? [{ href: locator.href, label: redactGroupText(source.label) }] : [];
  });
}

// A bounded excerpt of the same anonymous catalogue used by the hydrated writer page.
export async function writerFirstWorks2029(identity, { client = getPublicResearchClient(),
  reader = fetchContributorPublicationCatalog, sourceReader = writerSourceLinks, signal } = {}) {
  if (signal?.aborted) return [];
  // The profile itself was admitted already. A slow optional family may not hide it.
  let onAbort;
  const expiry = signal && new Promise(resolve => { onAbort = resolve; signal.addEventListener("abort", resolve, { once: true }); });
  const bounded = (read, fallback) => expiry ? Promise.race([read, expiry.then(() => fallback)]) : read;
  let attribution;
  const attributionReader = (person, options) => attribution ||= fetchContributorAuthorAttribution(person, options);
  const families = ["posts", "ciphers", "contributions", "topics"];
  let catalogue, sources;
  try {
    const reads = families.map(family => bounded(reader(identity, {
      client, families: [family], previewLimit: 4, signal, attributionReader,
    }).catch(() => ({})), {}));
    const [completed, sourceLinks] = await Promise.all([
      Promise.all(reads), bounded(sourceReader(identity, client, signal).catch(() => []), []),
    ]);
    catalogue = Object.assign({}, ...completed);
    sources = sourceLinks;
  } finally { if (onAbort) signal.removeEventListener("abort", onAbort); }
  const view = appendContributorPublicationCatalog({ items: [], canonicalHref: contributorHref(identity) }, catalogue, identity);
  const works = view.items.filter(item => item.href?.startsWith("/") && !item.href.startsWith("//") && item.title).map(item => ({
    href: item.href, label: item.title, note: item.label === "צופן שהועלה" ? item.label : undefined,
  }));
  return [...works.slice(0, 6), ...sources].slice(0, 8);
}
