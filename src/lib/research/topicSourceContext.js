// Read-time source context over admitted Topic memberships + the bounded, reviewed post
// locator from handoff e04a35a0. No tagging registry, graph writes, Journey store or new truth.
import { buildMediaEnvelope, buildStoredInterpretation, dedupeMediaEnvelopes } from "./galleryMediaEnvelope.js";
import { canonicalMediaPresentation, canonicalMediaPublicLabel } from "../presentation/canonicalPresentation.js";

export const TOPIC_SOURCE_LIMIT = 64;
export const TOPIC_OCCURRENCE_LIMIT = 256;

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
export function buildTopicSourceContext({ topic, images = [], occurrences = [], galleries = [], post = null, occurrencesTruncated = false } = {}) {
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
  return {
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
