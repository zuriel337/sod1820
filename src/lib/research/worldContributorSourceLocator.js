const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const clean = (value) => String(value || "").trim();

export function channelUpdateOccurrenceId(sourceRef) {
  const baseRef = clean(sourceRef).split("#", 1)[0];
  const [kind, id] = baseRef.split(":");
  return kind === "channel_updates" && UUID_PATTERN.test(id || "") ? id : null;
}

export function contributorSourceLibraryHref(slug) {
  const params = new URLSearchParams({ view: "sources", source: clean(slug) });
  return `/world?${params.toString()}#world-contributor-material`;
}

export function sourceOccurrenceElementId(sourceRef) {
  const id = channelUpdateOccurrenceId(sourceRef);
  return id ? `source-occurrence-${id}` : null;
}

export function contributorSourceLocator(sourceRef, { slug } = {}) {
  const ref = clean(sourceRef);
  const libraryHref = contributorSourceLibraryHref(slug);
  const occurrenceId = channelUpdateOccurrenceId(ref);
  if (!occurrenceId) return { ref, exact: false, occurrenceId: null, href: libraryHref };

  const params = new URLSearchParams({ view: "sources", source: clean(slug), sourceRef: ref.split("#", 1)[0] });
  return {
    ref,
    exact: true,
    occurrenceId,
    href: `/world?${params.toString()}#source-occurrence-${occurrenceId}`,
  };
}
