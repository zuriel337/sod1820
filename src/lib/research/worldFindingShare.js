// Public World Finding share projection — presentation only, no second share/follow engine.
// The public reader owns the exact canonicalFindingHref. Reject rather than synthesize a URL.
export const WORLD_FINDING_SHARE_ORIGIN = "https://sod1820.co.il";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (value) => value == null ? "" : String(value).replace(/\s+/g, " ").trim();
const clip = (value, max) => clean(value).slice(0, max);

export function worldFindingShareCard({ title, typeLabel, sourceLabel, attributionLabel, summary } = {}) {
  const heading = clean(title);
  if (!heading) return null;
  const kind = clip(typeLabel || "ממצא מחקר", 34);
  const source = clip(sourceLabel || "מקור מחקר", 55);
  const attribution = clip(attributionLabel || "קרדיט לא צוין", 74);
  const params = new URLSearchParams({
    w: clip(heading, 65),
    sub: clip(`${kind} · ${source}`, 78),
    cap: attribution,
    sig: "finding",
  });
  return {
    title: heading,
    description: clip([summary, `מקור: ${source}`, attribution].filter(Boolean).join(" · "), 250),
    image: `${WORLD_FINDING_SHARE_ORIGIN}/api/card?${params.toString()}`,
  };
}

export function worldFindingPublicShare(finding) {
  if (!finding || finding.family !== "research_object"
      || finding.access !== "public"
      || !["approved", "canonical"].includes(finding.status)) return null;
  const id = clean(finding.sourceId);
  if (!UUID.test(id)) return null;
  const href = finding.canonicalFindingHref;
  if (typeof href !== "string" || !href.startsWith("/world?")) return null;
  let parsed;
  try { parsed = new URL(href, WORLD_FINDING_SHARE_ORIGIN); } catch { return null; }
  // The URL must come from the public reader: no admin=1, aliases, private state,
  // extra query params, noncanonical anchor or cross-origin redirects.
  const exact = `/world?finding=${encodeURIComponent(id)}#finding-${encodeURIComponent(id)}`;
  if (parsed.origin !== WORLD_FINDING_SHARE_ORIGIN
      || `${parsed.pathname}${parsed.search}${parsed.hash}` !== exact) return null;
  const preview = worldFindingShareCard({
    title: finding.statement,
    typeLabel: finding.typeLabel,
    sourceLabel: finding.sourceLabel,
    attributionLabel: finding.attributionLabel,
    summary: finding.secondary,
  });
  return preview ? { ...preview, url: parsed.href, sourceId: id } : null;
}

// An approved, persistent Topic is a follow *preference* target, not a finding.
// No promise of delivery is inferred: dispatch and channel consent are separately owned.
export function worldFindingFollowTarget(finding) {
  const topic = finding?.linkedTopicRating;
  if (!worldFindingPublicShare(finding) || !topic || topic.status !== "approved") return null;
  const slug = clean(topic.slug);
  if (!slug || !/^[\p{L}\p{N}_-]{1,120}$/u.test(slug)
      || topic.href !== `/topic/${encodeURIComponent(slug)}`) return null;
  return { topic: `topic:${slug}`, title: clean(topic.title || slug), href: topic.href };
}
