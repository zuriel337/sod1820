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

// ── Reviewed HTML region locators (no content edit, no marker, no new store) ──────────────────────────
// A reviewed region is found by the AUTHORED text it contains, never by an anchor written into the post.
// Both locators are pure over the post's HTML string, and `resolveRenderedLocator` applies the same rule to the
// rendered DOM so the Post reader can land on the region without touching source content.
const BLOCK_TAGS = /<(p|h[1-6]|blockquote|figure|li)\b[^>]*>[\s\S]*?<\/\1>/gi;
const STOP_BETWEEN = /<(section|figure|video|iframe|img|table|ul|ol|h[1-6]|blockquote)\b/i;
const plain = (html) => String(html || "").replace(/<[^>]*>/g, " ").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
// Quote marks differ between data-gem (&quot;) and display (״); compare without them.
export const guardKey = (value) => plain(value).replace(/["״“”'׳]/g, "");

export function htmlBlocks(html) {
  const text = String(html || "");
  const blocks = [];
  for (const match of text.matchAll(BLOCK_TAGS)) {
    blocks.push({ tag: match[1].toLowerCase(), start: match.index, end: match.index + match[0].length, html: match[0], text: plain(match[0]),
      images: [...match[0].matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((m) => m[1]) });
  }
  return blocks;
}

/** A run of ADJACENT paragraphs from the block holding `startGuard` to the block holding `endGuard`. */
export function locatePostBlock(html, { startGuard, endGuard, guards = [], maxBlocks = 8 } = {}) {
  const source = String(html || "");
  const blocks = htmlBlocks(source);
  const first = blocks.findIndex((b) => guardKey(b.text).includes(guardKey(startGuard)));
  if (first < 0) return null;
  const last = blocks.findIndex((b, i) => i >= first && guardKey(b.text).includes(guardKey(endGuard)));
  if (last < 0 || last - first + 1 > maxBlocks) return null;
  const run = blocks.slice(first, last + 1);
  // A reviewed run is plain paragraphs only: a figure, quote or heading inside it means the region is not what was reviewed.
  if (run.some((b) => b.tag !== "p")) return null;
  // Adjacent means nothing structural (section, figure, media, heading…) sits between two blocks of the run.
  for (let i = 1; i < run.length; i++) if (STOP_BETWEEN.test(source.slice(run[i - 1].end, run[i].start))) return null;
  const text = run.map((b) => b.text).join(" ");
  if (!guards.every((g) => guardKey(text).includes(guardKey(g)))) return null;
  return { text, count: run.length, firstBlock: first, lastBlock: last, start: run[0].start, end: run.at(-1).end };
}

/** The exact image, with its guard text within `radius` blocks before or one block after it (not merely anywhere in the post). */
export function locateImageNearGuards(html, { imageUrl, guards = [], radius = 2 } = {}) {
  const blocks = htmlBlocks(html);
  const at = blocks.findIndex((b) => b.images.includes(imageUrl));
  if (at < 0) return null;
  const from = Math.max(0, at - radius), to = Math.min(blocks.length - 1, at + 1);
  const window = blocks.slice(from, to + 1);
  const found = guards.map((g) => window.findIndex((b) => guardKey(b.text).includes(guardKey(g))));
  if (found.some((i) => i < 0)) return null;
  return { imageBlock: at, guardBlocks: found.map((i) => from + i), distance: Math.max(...found.map((i) => Math.abs(from + i - at))) };
}

const LOCATOR_HASH = /^#source-locator-([a-z0-9-]+)$/;
export const sourceLocatorHash = (id) => `#source-locator-${id}`;
export function locatorIdFromHash(hash = "") {
  let value = "";
  try { value = decodeURIComponent(String(hash || "")); } catch { return null; }
  return value.match(LOCATOR_HASH)?.[1] || null;
}

/** Same rule over a rendered root (display only): returns the element to land on, or null when the region is not there. */
export function resolveRenderedLocator(root, locator) {
  if (!root?.querySelectorAll || !locator) return null;
  const nodes = [...root.querySelectorAll("p,h1,h2,h3,h4,h5,h6,blockquote,figure,li")]
    .filter((node) => !node.parentElement?.closest?.("p,h1,h2,h3,h4,h5,h6,blockquote,figure,li"));
  const key = (node) => guardKey(node.textContent);
  if (locator.kind === "block") {
    const first = nodes.findIndex((n) => key(n).includes(guardKey(locator.startGuard)));
    const last = nodes.findIndex((n, i) => i >= first && first >= 0 && key(n).includes(guardKey(locator.endGuard)));
    if (first < 0 || last < 0 || last - first + 1 > (locator.maxBlocks || 8)) return null;
    const run = nodes.slice(first, last + 1);
    if (run.some((n) => String(n.tagName || n.tag || "").toLowerCase() !== "p")) return null;
    const text = run.map(key).join(" ");
    return (locator.guards || []).every((g) => text.includes(guardKey(g))) ? { element: nodes[first], elements: nodes.slice(first, last + 1) } : null;
  }
  if (locator.kind === "image") {
    const at = nodes.findIndex((n) => [...n.querySelectorAll("img")].some((img) => img.getAttribute("src") === locator.imageUrl));
    if (at < 0) return null;
    const radius = locator.near?.radius ?? 2, from = Math.max(0, at - radius), to = Math.min(nodes.length - 1, at + 1);
    const text = nodes.slice(from, to + 1).map(key).join(" ");
    if (!(locator.near?.guards || []).every((g) => text.includes(guardKey(g)))) return null;
    return { element: nodes[at].querySelector("img") || nodes[at], elements: [nodes[at]] };
  }
  return null;
}

/**
 * Land on a reviewed region of a RENDERED post: scroll, focus, display-only emphasis, re-aligned while the layout
 * settles and released on the first reader gesture. Returns { found, release }. Source content is never touched.
 */
export function landOnRenderedLocator(root, locator, { reveal = () => {}, win = typeof window === "undefined" ? null : window } = {}) {
  const found = resolveRenderedLocator(root, locator);
  if (!found || !win) return { found: null, release: () => {} };
  let released = false, frame = null;
  const land = () => { if (released) return; reveal(found.element); found.element.scrollIntoView?.({ behavior: "instant", block: "center" }); };
  land();
  found.element.setAttribute?.("tabindex", "-1");
  found.element.focus?.({ preventScroll: true });
  found.elements.forEach((node) => node.classList?.add("sod29-source-locator-active"));
  const observer = typeof win.ResizeObserver === "undefined" ? null : new win.ResizeObserver(() => { if (frame != null) win.cancelAnimationFrame(frame); frame = win.requestAnimationFrame(land); });
  observer?.observe(root);
  const names = ["wheel", "touchstart", "pointerdown", "keydown"];
  const stop = () => { released = true; observer?.disconnect(); };
  for (const name of names) win.addEventListener(name, stop, { passive: true, once: true });
  const release = () => {
    stop(); if (frame != null) win.cancelAnimationFrame(frame);
    for (const name of names) win.removeEventListener(name, stop);
    found.elements.forEach((node) => node.classList?.remove("sod29-source-locator-active"));
  };
  return { found, release };
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
  const image = images.find((tag) => tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] === locator.imageUrl
    // An authored media id, when the reviewer supplies it, must sit on the very same <img> as the URL.
    && (!locator.attachmentId || tag.includes(`data-attachment-id="${locator.attachmentId}"`)));
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  // `near` demands the guard text next to THIS image; without it the older whole-post guard rule applies unchanged.
  const near = locator.near ? locateImageNearGuards(html, { imageUrl: locator.imageUrl, guards: locator.near.guards, radius: locator.near.radius }) : null;
  if (!image || (locator.near ? !near : !(locator.guards || []).every((quote) => text.includes(quote)))) return null;
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
      regionId: locator.regionId || null, imageUrl: locator.imageUrl, adjacency: near },
  }], { bySourceObject: true })[0];
  const routed = attachReopen(item, { slug: "" });
  return { ...routed, reopen: { ...routed.reopen, topicHref: null,
    postHref: `/post/${encodeURIComponent(post.slug)}${locator.regionId ? sourceLocatorHash(locator.regionId) : ""}`,
    postRoutePrecision: locator.regionId ? "post_region_resolved_in_rendered_html" : "post_only_exact_image_in_source_html" } };
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
