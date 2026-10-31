// Read-time source context over admitted Topic memberships + the bounded, reviewed post
// locator from handoff e04a35a0. No tagging registry, graph writes, Journey store or new truth.
import { buildMediaEnvelope, buildStoredInterpretation, dedupeMediaEnvelopes } from "./galleryMediaEnvelope.js";
import { canonicalMediaPresentation, canonicalMediaPublicLabel } from "../presentation/canonicalPresentation.js";

export const TOPIC_SOURCE_LIMIT = 64;
export const TOPIC_OCCURRENCE_LIMIT = 256;

export function storedGalleryOrderIds(rows) {
  return [...new Set((Array.isArray(rows) ? [...rows] : [])
    .filter((row) => row?.id)
    .sort((a, b) => (Number(a.ordering ?? Infinity) - Number(b.ordering ?? Infinity)) || String(a.id).localeCompare(String(b.id)))
    .map((row) => String(row.id)))];
}

// Existing 1237 pager, shared here under its source-context owner. Readers remain
// injected, unchanged, and re-admit the selected public rows on every window.
export async function loadPublicGallerySourcePage({ wpGalleryId, listGalleryImages, fetchSourceContext, offset = 0, limit = 6 }) {
  if (!Number.isSafeInteger(wpGalleryId) || wpGalleryId < 1 || !Number.isSafeInteger(offset) || offset < 0
    || !Number.isSafeInteger(limit) || limit < 1 || limit > 12) throw new RangeError("Invalid bounded gallery window");
  const candidates = storedGalleryOrderIds(await listGalleryImages(wpGalleryId));
  const slice = candidates.slice(offset, offset + limit);
  const { items = [], occurrencesTruncated = false } = slice.length ? await fetchSourceContext({ imageIds: slice }) : {};
  const order = new Map(slice.map((id, index) => [id, index]));
  const admitted = [...new Map(items.filter((item) => item?.galleryImageId && (order.has(item.galleryImageId)
    || item.occurrences?.some((entry) => order.has(entry.legacyPlacement?.galleryImageId))))
    .map((item) => [item.galleryImageId, item])).values()]
    .sort((a, b) => firstPosition(a) - firstPosition(b));
  function firstPosition(item) {
    return Math.min(order.get(item.galleryImageId) ?? Infinity,
      ...(item.occurrences || []).map((entry) => order.get(entry.legacyPlacement?.galleryImageId) ?? Infinity));
  }
  const page = { wpGalleryId, items: admitted, offset, limit, scannedIds: slice,
    totalListed: candidates.length, hasMore: offset + limit < candidates.length,
    nextOffset: Math.min(offset + limit, candidates.length), occurrencesTruncated };
  // Shared objects can have several selected occurrences. They are not withheld
  // rows or independent sources merely because the reader grouped them together.
  const readableIds = new Set(admitted.flatMap((item) => [item.galleryImageId,
    ...(item.occurrences || []).filter((entry) => entry.legacyPlacement?.wpGalleryId === wpGalleryId)
      .map((entry) => entry.legacyPlacement.galleryImageId)]));
  return { ...page, withheld: slice.filter((id) => !readableIds.has(id)).length };
}

// Resolve an occurrence, not merely a shared image object.
export function resolvePublicGallerySelection(page, galleryImageId) {
  const empty = (status) => ({ status, item: null, occurrence: null, selection: null });
  if (!page || !Number.isSafeInteger(page.wpGalleryId) || page.wpGalleryId < 1
    || typeof galleryImageId !== "string" || !galleryImageId) return empty("unavailable");
  if (!page.scannedIds?.includes(galleryImageId)) return empty("not_in_loaded_window");
  const matches = [];
  for (const item of page.items || []) {
    if (item?.access?.scope !== "public" || item.access.available === false) continue;
    for (const occurrence of item.occurrences || []) {
      const p = occurrence.legacyPlacement;
      if (p?.galleryImageId === galleryImageId && p.wpGalleryId === page.wpGalleryId
        && occurrence.intrinsic?.galleryImageId === galleryImageId
        && occurrence.mediaId === occurrence.intrinsic?.mediaId
        && occurrence.intrinsic?.representation?.imageUrl === item.imageUrl
        && occurrence.provenance?.sourceRef === `gallery_images:${galleryImageId}`) matches.push({ item, occurrence });
    }
  }
  if (matches.length !== 1) return empty("unavailable");
  const { item, occurrence } = matches[0], p = occurrence.legacyPlacement;
  return { status: "ready", item, occurrence, selection: { galleryImageId, wpGalleryId: p.wpGalleryId,
    galleryId: p.galleryId, ordering: p.ordering, sourceRef: occurrence.provenance.sourceRef,
    mediaId: occurrence.mediaId, dateUse: "provenance_only" } };
}

// Same native document for any valid historical gallery ID. URLs are
// locators, never permission to render the listed row without public re-admission.
export function gallerySourceHref2029(wpGalleryId, galleryImageId = null) {
  if (!Number.isSafeInteger(wpGalleryId) || wpGalleryId < 1) return null;
  const base = `/world?view=gallery&gallery=${wpGalleryId}`;
  if (galleryImageId == null) return base;
  if (typeof galleryImageId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(galleryImageId)) return null;
  return `${base}&image=${encodeURIComponent(galleryImageId)}#gallery-source-${galleryImageId}`;
}

export function galleryOccurrenceItem(selected) {
  if (selected?.status !== "ready") return null;
  const { item, occurrence } = selected;
  // Same source object/identity and complete public history, exact occurrence's
  // intrinsic text, tags and caption. Never replace one placement by its sibling.
  return { ...item, ...occurrence, id: occurrence.mediaId,
    label: occurrence.intrinsic.label, presentation: canonicalMediaPresentation(occurrence),
    galleryImageId: selected.selection.galleryImageId, sourceRef: selected.selection.sourceRef,
    imageUrl: occurrence.intrinsic.representation.imageUrl,
    thumbUrl: occurrence.intrinsic.representation.thumbUrl,
    storedNumbers: occurrence.legacyPlacement.storedNumbers,
    imageType: occurrence.legacyPlacement.imageType, description: occurrence.legacyPlacement.originalCaption,
    occurredAt: occurrence.legacyPlacement.occurredAt, createdAt: occurrence.legacyPlacement.createdAt,
    sourceIdentity: item.sourceIdentity, occurrences: item.occurrences,
    access: item.access, dateUse: "provenance_only" };
}

export async function loadPublicGallerySourceWindow({ imageId = null, offset = 0, ...options }) {
  const limit = options.limit ?? 6;
  if (!gallerySourceHref2029(options.wpGalleryId)
    || (imageId != null && !gallerySourceHref2029(options.wpGalleryId, imageId))
    || !Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 12) throw new RangeError("Invalid bounded gallery locator");
  const rows = await options.listGalleryImages(options.wpGalleryId);
  const ids = storedGalleryOrderIds(rows);
  const index = imageId == null ? -1 : ids.indexOf(imageId);
  if (imageId != null && index === -1) return { status: "unavailable", page: null, selected: null };
  const page = await loadPublicGallerySourcePage({ ...options, listGalleryImages: async () => rows,
    offset: index < 0 ? offset : Math.floor(index / limit) * limit, limit });
  const selected = imageId != null ? resolvePublicGallerySelection(page, imageId)
    : page.scannedIds.map((id) => resolvePublicGallerySelection(page, id)).find((row) => row.status === "ready");
  return { status: selected?.status || "empty_window", page, selected: selected || null };
}

// This is one source locator, NOT permission to read its research_object/public_candidate.
// Re-read the public post and require the mapped figure + exact statement on every request.
export const INDIA_CAPTAIN_SOURCE = Object.freeze({
  topicSlug: "india-axis",
  postId: 5112,
  postSlug: "flydubai-fz1073-363-14000-remzei-geula",
  regionId: "source-region-smit-machchhar",
  imageUrl: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/posts/fz1073/smit-machchhar-source-20261001.jpg",
  requiredCaption: "בצילום המסך שהגיע אלינו מופיע קפטן סמיט מאצ׳הר, אזרח הודי; הפרסום מייחס לו פציעה במהלך האירוע וסיוע בהשבת השליטה ובהצלת הנוסעים. הפרטים מוצגים כאן כטענת המקור המצולם.",
  mappingRef: "work_log:e04a35a0-6083-46b4-9fc2-c5fce4073f43",
});

export function isPublicSourceImage(row) {
  return row?.published === 1 && row?.min_tier === 0
    && (row?.curator_hidden === false || row?.curator_hidden == null)
    && typeof row?.image_url === "string" && /^https:\/\//.test(row.image_url);
}

function topicRelation(topic, row, index) {
  return {
    relationKind: "stored_topic_association",
    relationType: "topic_image",
    basis: "topic_cards_public.image_ids",
    sourceRef: `topic_cards:${topic.id}#image_ids/${index}`,
    topicId: topic.id,
    topicSlug: topic.slug,
    galleryImageId: row.id,
    storedIndex: index,
    explanation: `התמונה משויכת במקור לציר „${topic.title}”. הכיתוב ההיסטורי מובא בנפרד; השיוך אינו קובע שמדובר באותו אירוע.`,
    state: "stored_association_not_event_identity",
  };
}

function captainSourceEnvelope(topic, post) {
  const source = INDIA_CAPTAIN_SOURCE;
  if (topic.slug !== source.topicSlug || post?.id !== source.postId || post?.slug !== source.postSlug) return null;
  if (!Array.isArray(post.tags) || post.tags.some((tag) => ["טיוטה", "פורום"].includes(tag))) return null;
  // Only the mapped figure is considered. Another mention elsewhere in the post cannot
  // admit an unrelated picture, a changed caption, or a stale mapping.
  const figures = String(post.content || "").match(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi) || [];
  const figure = figures.find((html) => (html.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1]) === source.imageUrl);
  const caption = figure?.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1];
  if (caption !== source.requiredCaption) return null;
  const mediaId = `media:post:${post.id}:${source.regionId}`;
  const sourceRef = `post:${post.slug}#${source.regionId}`;
  const label = "קפטן סמיט מאצ׳הר — המקור המצולם בפוסט";
  const intrinsic = Object.freeze({
    mediaId, nodeId: null, galleryImageId: null, label,
    representation: { imageUrl: source.imageUrl, thumbUrl: source.imageUrl, fit: "preserve-whole-image" },
    extraction: { status: null, text: null, numbers: [], state: "not_extracted_here" },
    interpretation: buildStoredInterpretation(null),
  });
  const provenance = {
    sourceRef, storedSource: `posts:${post.id}`, storedMediaKind: "screenshot",
    storedMediaKindBasis: "public_post_figure_caption", author: post.author || null,
  };
  const postPlacement = {
    postId: post.id, postSlug: post.slug, regionId: source.regionId,
    originalTitle: post.title, originalCaption: caption,
    originalCredit: { author: post.author ?? null, authors: post.authors ?? null },
    publishedAt: post.date || null, modifiedAt: post.modified || null,
    dateBasis: "posts.date_publication_not_event_date",
  };
  const contextRelation = {
    relationKind: "documented_source_mention", relationType: "explicit_indian_citizenship",
    basis: "posts.content/figure/figcaption", sourceRef, topicId: topic.id, topicSlug: topic.slug,
    quote: caption, mappingRef: source.mappingRef,
    explanation: "הפוסט מכנה את הקפטן במפורש „אזרח הודי”. זהו הקשר להודו; תיאור הפציעה וההצלה נשאר טענת המקור המצולם.",
    state: "read_time_source_context_not_stored_graph_or_topic_tag",
  };
  return {
    mediaId, nodeId: null, galleryImageId: null, intrinsic, provenance, postPlacement,
    legacyPlacement: null, contextRelation,
    relationType: contextRelation.relationType,
    projectionReason: `${contextRelation.relationKind}:${contextRelation.relationType}`,
    presentation: canonicalMediaPresentation({ ...intrinsic, provenance }),
    label, imageUrl: source.imageUrl, thumbUrl: source.imageUrl, sourceRef,
    dateUse: "provenance_only",
    access: { scope: "public", basis: "existing_public_post_reader_excluding_draft_and_forum" },
  };
}

export function topicSourceAnchor(item) {
  return `topic-source-${String(item.galleryImageId || item.mediaId).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function isDocumentedIndiaCaptainPost(post) {
  return Boolean(captainSourceEnvelope({ slug: INDIA_CAPTAIN_SOURCE.topicSlug }, post));
}

// Navigation over EXISTING public memberships. An exact shared object supplies a
// reason to compare contexts, never a new graph edge or an independent evidence count.
export function topicSourceLinks(context, relatedTopics = []) {
  if (context?.access?.scope !== "public" || context.access.available === false) return { topics: [], posts: [] };
  const items = context.items || [];
  const topics = relatedTopics.filter((row) => row?.id && row.status === "approved"
    && row.slug && row.slug !== context.topicSlug).flatMap((target) => {
    const targetIds = new Set(target.image_ids || []);
    const shared = items.flatMap((item) => {
      const occurrences = (item.occurrences || []).filter((entry) => targetIds.has(entry.intrinsic?.galleryImageId));
      if (!occurrences.length) return [];
      const ids = new Set(occurrences.map((entry) => entry.intrinsic.galleryImageId));
      const targetId = target.image_ids.find((id) => ids.has(id));
      return [{ item, targetId }];
    });
    if (!shared.length) return [];
    const { item, targetId } = shared[0];
    return [{
      id: target.id, nodeId: target.node_id || null, slug: target.slug, title: target.title,
      href: `/topic/${encodeURIComponent(target.slug)}#${topicSourceAnchor({ galleryImageId: targetId })}`,
      note: shared.length === 1
        ? `אותה תמונת מקור מופיעה גם ב„${target.title}”. אפשר לקרוא שם את ההקשר הנוסף; זו אינה ראיה נוספת.`
        : `${shared.length} תמונות מקור משותפות לשני הטופיקים. אפשר לקרוא את ההקשר הנוסף; ההופעות אינן ראיות נוספות.`,
      relationKind: "shared_stored_source", sourcePath: `${context.sourceRef}#shared-source/${target.id}`,
      sourceIdentities: shared.map(({ item: source }) => source.sourceIdentity.ref),
      sourceRefs: shared.map(({ targetId: id }) => `gallery_images:${id}`),
      returnHref: item.reopen.topicHref, sourceSelection: item.reopen.selection,
    }];
  });
  const posts = items.filter((item) => item.postPlacement && item.reopen?.postHref).map((item) => ({
    id: item.postPlacement.postId, slug: item.postPlacement.postSlug, title: item.postPlacement.originalTitle,
    href: item.reopen.postHref, note: item.contextRelation.explanation,
    relationKind: item.contextRelation.relationKind, sourcePath: item.sourceRef,
    returnHref: item.reopen.topicHref, sourceSelection: item.reopen.selection,
  }));
  return { topics, posts };
}

// Reviewed HTML image locator over a freshly admitted public Post. It remains a Post
// occurrence (no invented gallery row, membership or source date). Reuses the same exact
// storage-object identity and media envelope consumed by Gallery/Topic/Lightbox.
export function buildPublicPostImageContext(post, locator) {
  if (post?.id !== locator?.postId || !Array.isArray(post.tags)
    || post.tags.some((tag) => ["טיוטה", "פורום"].includes(tag))
    || ["gpt-draft", "web"].includes(post.source) || post.home_hidden === true) return null;
  const html = String(post.content || "");
  const images = html.match(/<img\b[^>]*>/gi) || [];
  const image = images.find((tag) => tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] === locator.imageUrl);
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!image || !(locator.guards || []).every((quote) => text.includes(quote))) return null;
  const mediaId = `media:post:${post.id}:image:${locator.imageUrl}`;
  const sourceRef = `posts:${post.id}#image:${locator.imageUrl}`;
  const figure = (html.match(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi) || []).find((part) => part.includes(image));
  const originalCaption = figure?.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1] ?? null;
  const intrinsic = Object.freeze({ mediaId, galleryImageId: null, nodeId: null, label: locator.label,
    representation: { imageUrl: locator.imageUrl, thumbUrl: locator.imageUrl, fit: "preserve-whole-image" },
    extraction: { text: null, status: null, numbers: [], state: "not_extracted_here" },
    interpretation: buildStoredInterpretation(null) });
  const provenance = { sourceRef, storedSource: `posts:${post.id}`, author: post.author || null };
  const item = dedupeMediaEnvelopes([{ mediaId, intrinsic, provenance, label: locator.label,
    presentation: canonicalMediaPresentation({ ...intrinsic, provenance }),
    imageUrl: locator.imageUrl, thumbUrl: locator.imageUrl, sourceRef,
    access: { scope: "public", basis: "fresh_public_post_exact_html_image" }, dateUse: "provenance_only",
    postPlacement: { postId: post.id, postSlug: post.slug, originalTitle: post.title, originalCaption,
      originalAlt: image.match(/\balt=["']([^"']*)["']/i)?.[1] ?? null,
      originalCredit: { author: post.author ?? null, authors: post.authors ?? null },
      publishedAt: post.date || null, dateBasis: "posts.date_publication_not_event_date",
      regionId: null, imageUrl: locator.imageUrl },
  }], { bySourceObject: true })[0];
  const routed = attachReopen(item, { slug: "" });
  return { ...routed, reopen: { ...routed.reopen, topicHref: null,
    postHref: `/post/${encodeURIComponent(post.slug)}`, postRoutePrecision: "post_only_exact_image_in_source_html" } };
}

function attachReopen(item, topic) {
  const anchor = topicSourceAnchor(item);
  const topicHref = `/topic/${encodeURIComponent(topic.slug)}#${anchor}`;
  const selection = {
    entityId: item.galleryImageId || item.mediaId,
    entityType: "image", sourceRef: item.provenance.sourceRef, locator: `#${anchor}`,
  };
  return {
    ...item, id: item.mediaId,
    reopen: {
      topicHref, selection, imageHref: item.imageUrl,
      postHref: item.postPlacement ? `/post/${encodeURIComponent(item.postPlacement.postSlug)}#${item.postPlacement.regionId}` : null,
      // main currently hides the original Post body containing this exact region anchor.
      // Preserve the locator for its owner; do not advertise a visible-region reopen PASS.
      postRoutePrecision: item.postPlacement ? "post_only_with_source_region_locator" : null,
      galleries: item.occurrences.filter((entry) => entry.legacyPlacement).map(({ legacyPlacement: p }) => ({
        sourceRef: `gallery_images:${p.galleryImageId}`,
        href: p.wpGalleryId != null ? `/archive?tab=galleries&gal=${encodeURIComponent(p.wpGalleryId)}` : null,
        // The current Archive route opens the gallery, not a selected image. Consumers must
        // preserve this exact target without pretending an unsupported image query works.
        routePrecision: "gallery_only",
        selection: { galleryId: p.galleryId, wpGalleryId: p.wpGalleryId, galleryImageId: p.galleryImageId, wpImageId: p.wpImageId, ordering: p.ordering },
      })),
    },
  };
}

// Exact reviewed gallery locators can be consumed outside a Topic. They do not acquire
// Topic membership or a graph relation. Reuse the same identity/history/reopen contract.
export function buildGallerySourceContext({ images = [], occurrences = [], galleries = [] } = {}) {
  const publicRows = images.filter(isPublicSourceImage);
  const urls = new Set(publicRows.map((row) => row.image_url));
  const byId = new Map([...publicRows, ...occurrences.filter((row) => isPublicSourceImage(row) && urls.has(row.image_url))]
    .map((row) => [row.id, row]));
  const galleryById = new Map(galleries.map((row) => [row.id, row]));
  return dedupeMediaEnvelopes([...byId.values()].map((row) => buildMediaEnvelope({ row,
    gallery: galleryById.get(row.gallery_id), label: canonicalMediaPublicLabel(row),
  })).filter(Boolean), { bySourceObject: true }).map((item) => {
    const withRoutes = attachReopen(item, { slug: "" });
    return { ...withRoutes, contextRelation: null, contextRelations: [], dateUse: "provenance_only",
      access: { scope: "public", basis: "published_1_min_tier_0_not_curator_hidden" },
      reopen: { ...withRoutes.reopen, topicHref: null } };
  });
}

/** Pure projection; the Entity Hub reader supplies only public-view rows and bounded reads. */
export function buildTopicSourceContext({ topic, images = [], occurrences = [], galleries = [], post = null, relatedTopics = [], occurrencesTruncated = false } = {}) {
  if (!topic?.id || !topic?.slug || topic.status !== "approved") return null;
  const imageIds = Array.isArray(topic.image_ids) ? topic.image_ids : [];
  const selectedIds = imageIds.slice(0, TOPIC_SOURCE_LIMIT);
  const byId = new Map(images.filter(isPublicSourceImage).map((row) => [row.id, row]));
  const galleryById = new Map(galleries.map((gallery) => [gallery.id, gallery]));
  const toEnvelope = (row) => buildMediaEnvelope({
    row, gallery: galleryById.get(row.gallery_id),
    label: canonicalMediaPublicLabel({ name: row.name, description: row.description }),
  });
  const selected = selectedIds.flatMap((id, index) => {
    const row = byId.get(id);
    const envelope = row && toEnvelope(row);
    if (!envelope) return [];
    const contextRelation = topicRelation(topic, row, index);
    return [{ ...envelope, contextRelation, contextRelations: [contextRelation],
      relationType: contextRelation.relationType,
      projectionReason: `${contextRelation.relationKind}:${contextRelation.relationType}`,
      dateUse: "provenance_only",
      access: { scope: "public", basis: "published_1_min_tier_0_not_curator_hidden" } }];
  });
  const selectedUrls = new Set(selected.map((item) => item.imageUrl));
  const selectedRowIds = new Set(selected.map((item) => item.galleryImageId));
  // Exact-object appearances enrich history only; they acquire no Topic membership.
  const extras = occurrences.filter((row) => isPublicSourceImage(row) && selectedUrls.has(row.image_url) && !selectedRowIds.has(row.id))
    .map(toEnvelope).filter(Boolean).map((item) => ({ ...item, contextRelation: null, contextRelations: [] }));
  const captain = captainSourceEnvelope(topic, post);
  const items = dedupeMediaEnvelopes([...selected, ...extras, ...(captain ? [captain] : [])], { bySourceObject: true })
    // An extra occurrence must never become an independent evidence card.
    .filter((item) => item.contextRelations.length)
    .map((item) => attachReopen(item, topic));
  for (const [index, item] of items.entries()) {
    item.sequence = {
      index, basis: "stored_topic_order_then_documented_post_source_not_chronology",
      previousHref: items[index - 1]?.reopen.topicHref || null,
      nextHref: items[index + 1]?.reopen.topicHref || null,
    };
  }
  const context = {
    topicId: topic.id, topicSlug: topic.slug, topicTitle: topic.title, topicNodeId: topic.node_id || null,
    sourceRef: `topic_cards:${topic.id}`, items,
    access: { available: true, scope: "public" },
    coverage: {
      storedMemberships: imageIds.length, readableMemberships: selected.length,
      sourceCount: items.length, occurrenceCount: items.reduce((sum, item) => sum + item.occurrences.length, 0),
      membershipsTruncated: imageIds.length > TOPIC_SOURCE_LIMIT, occurrencesTruncated,
      captain: topic.slug !== INDIA_CAPTAIN_SOURCE.topicSlug ? "not_requested" : captain ? "public_post_source_verified" : "source_unavailable_or_changed",
    },
    orderBasis: "stored_topic_order_not_event_chronology",
  };
  return { ...context, links: topicSourceLinks(context, relatedTopics) };
}

// Source-native selection for the EXISTING Research Context. No Journey creation or saving.
export function topicSourceContextPatch(item, topic) {
  // The existing rail still orients to the Topic and its existing anchor. Selecting media
  // must not invent a numeric media identity (the current rail treats a missing number as 0).
  // Exact source focus lives in selection + reference/locator/reason for downstream readers.
  const topicNumber = topic.heroNumber ?? topic.highlightNumbers?.[0] ?? topic.numbers?.[0];
  return {
    selection: item.reopen.selection,
    dimensions: {
      activeSectionId: "topic-sources", topicSlug: topic.slug,
      // A source selected in this Topic must not inherit the previous Post's reading focus
      // or its suggested connections. Journey/return state remains with its existing owner.
      readingFocus: null, surfaceFindings: [],
      surfaceFocus: {
        id: topic.slug, type: "topic", label: topic.displayTitle || topic.title,
        primary: topicNumber != null ? String(topicNumber) : topic.title,
        ...(topicNumber != null ? { number: topicNumber } : {}),
        sectionLabel: "מקורות", reference: item.sourceIdentity.ref,
        locator: item.reopen.selection.locator, href: item.reopen.topicHref,
        sourceLabel: topic.title, reason: item.contextRelation.explanation,
        signals: [item.contextRelation.explanation],
      },
    },
  };
}
