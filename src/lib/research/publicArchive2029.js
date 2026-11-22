import { publicPostHref } from "../publicPostUrls.js";
import { humanContentTitle, publicMediaTitle } from "../presentation/contentTitle.js";
import { publicStorageMedia } from "../mediaEgressGuard.js";
import { hasSuppressedPublicPostTag, publicPostOnlyFilter } from "./publicPostBoundary.js";
import { gallerySourceHref2029, isPublicSourceImage } from "./topicSourceContext.js";
import { postsTaxonomyRoute2029, postMatchesTaxonomy2029 } from "./postsTaxonomy2029Route.js";

export const PUBLIC_ARCHIVE_2029 = {
  title: "ארכיון התיעוד",
  description: "פוסטים לפי שנת פרסום, אירועים לפי תאריך ההתרחשות ותמונות מתוך הגלריות שבהן פורסמו.",
};

const PAGE_SIZE = 12;
const TOPIC_LIMIT = 16;
const SOURCES_PER_TOPIC = 2;
const imageIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const topicPath = slug => `/topic/${encodeURIComponent(slug)}`;
const simpleSlug = slug => typeof slug === "string" && slug && !/[/?#\\\u0000-\u001f]/.test(slug);
const datePart = value => typeof value === "string" && /^\d{4}-\d\d-\d\d(?:T|$)/.test(value) ? value.slice(0, 10) : null;

function archiveSelection(search) {
  const params = new URLSearchParams(search);
  const year = params.get("year");
  const page = params.get("page") || "1";
  const valid = (!params.has("year") || /^[1-9]\d{3}$/.test(year) && Number(year) < 9999)
    && /^[1-9]\d{0,3}$/.test(page);
  return { year: year ? Number(year) : null, page: Number(page), valid };
}

function legacyNotice(search) {
  const params = new URLSearchParams(search);
  const tab = params.get("tab");
  if (tab === "pool" || tab === "sets" || params.has("set") || params.has("sets"))
    return "הקישור מפנה למאגר הסטים הישן. אין כרגע כתובת קריאה מאומתת לסט שנבחר.";
  if (tab === "cascade") return "הקישור מפנה לאוצרות הגילוי. תצוגת האוצרות ההיסטורית עדיין אינה זמינה.";
  if (tab === "trial") return "אזור הניסוי אינו פתוח לציבור.";
  if (params.has("q") || params.has("nums") || params.has("num")) return "סינון המקור שבקישור הישן אינו זמין בכתובת זו.";
  return null;
}

function withYear(params, field, year) {
  if (year) {
    params.append(field, `gte.${year}-01-01`);
    params.append(field, `lt.${year + 1}-01-01`);
  }
  return params;
}

function postsQuery(year, page) {
  const params = withYear(new URLSearchParams({
    select: "id,wp_id,source,link,slug,title,date,tags,categories",
    or: `(${publicPostOnlyFilter()})`,
    date: "not.is.null",
    order: "date.desc.nullslast,id.desc",
    limit: String(PAGE_SIZE + 1),
    offset: String((page - 1) * PAGE_SIZE),
  }), "date", year);
  // NULL provenance occurs on older published articles.
  params.append("or", "(source.is.null,source.not.in.(gpt-draft,web))");
  return `posts?${params}`;
}

function topicsQuery(year, page) {
  const params = withYear(new URLSearchParams({
    select: "id,slug,title,status,occurred_at,image_ids",
    status: "eq.approved", occurred_at: "not.is.null",
    order: "occurred_at.desc,slug.asc", limit: String(TOPIC_LIMIT + 1), offset: String((page - 1) * TOPIC_LIMIT),
  }), "occurred_at", year);
  return `topic_cards_public?${params}`;
}

function topicSourceIds(topic) {
  return Array.isArray(topic.image_ids) ? [...new Set(topic.image_ids.filter(id => imageIdPattern.test(id)))].slice(0, SOURCES_PER_TOPIC) : [];
}

// These links use only the source memberships placed on a published topic. A shared
// number, similar title or another occurrence of the image does not attach a gallery.
async function topicSourceImages(readRows, topics) {
  const ids = [...new Set(topics.flatMap(topicSourceIds))];
  if (!ids.length) return new Map();
  const params = new URLSearchParams({
    select: "id,name,description,gallery_id,image_url,published,min_tier,curator_hidden,galleries(id,wp_gallery_id,name)",
    id: `in.(${ids.join(",")})`, published: "eq.1", min_tier: "eq.0",
    or: "(curator_hidden.is.null,curator_hidden.eq.false)", limit: String(ids.length),
  });
  const images = await readRows(`gallery_images?${params}`);
  return new Map(images.filter(row => isPublicSourceImage(row) && publicStorageMedia(row.image_url)?.kind === "image"
    && row.galleries && row.galleries.id === row.gallery_id && gallerySourceHref2029(row.galleries.wp_gallery_id, row.id))
    .map(row => [row.id, row]));
}

function topicCollection(topic, images) {
  const items = [{ title: topic.title, href: topicPath(topic.slug) }];
  for (const id of topicSourceIds(topic)) {
    const row = images.get(id);
    if (!row) continue;
    const gallery = row.galleries;
    const href = gallerySourceHref2029(gallery.wp_gallery_id);
    if (!items.some(item => item.href === href))
      items.push({ title: gallery.name, href });
    items.push({
      title: publicMediaTitle(row.name) || humanContentTitle(row.description) || `תמונה מתוך ${gallery.name}`,
      href: gallerySourceHref2029(gallery.wp_gallery_id, row.id),
    });
  }
  return { key: `topic-${topic.slug}`, title: topic.title, items };
}

function taxonomyCollection(posts, kind, field, title) {
  const links = new Map();
  for (const post of posts) for (const label of Array.isArray(post[field]) ? post[field] : []) {
    if (typeof label !== "string" || !label.trim()) continue;
    const href = `/${kind}/${encodeURIComponent(label.trim().replace(/ /g, "-"))}`;
    const scope = postsTaxonomyRoute2029(href);
    if (scope && postMatchesTaxonomy2029(post, scope)) links.set(href, { title: scope.label, href });
    if (links.size === PAGE_SIZE) return { key: field, title, items: [...links.values()] };
  }
  return { key: field, title, items: [...links.values()].slice(0, PAGE_SIZE) };
}

export async function readPublicArchive2029(readRows, search = "") {
  const { year, page, valid } = archiveSelection(search);
  const selectionNotice = legacyNotice(search);
  const state = { year, page, hasMore: false, partialMedia: false, selectionNotice, collections: [] };
  if (selectionNotice || !valid) {
    state.selectionNotice ||= "בחירת השנה או העמוד בקישור אינה תקינה.";
    return state;
  }
  const [topicRows, postRows] = await Promise.all([
    readRows(topicsQuery(year, page)),
    readRows(postsQuery(year, page)),
  ]);
  const topics = topicRows.slice(0, TOPIC_LIMIT).filter(topic => topic.status === "approved" && topic.title && simpleSlug(topic.slug) && datePart(topic.occurred_at));
  const posts = postRows.slice(0, PAGE_SIZE).filter(post => !["gpt-draft", "web"].includes(post.source) && !hasSuppressedPublicPostTag(post) && post.title && publicPostHref(post) && datePart(post.date));
  state.hasMore = postRows.length > PAGE_SIZE || topicRows.length > TOPIC_LIMIT;
  let images = new Map();
  try { images = await topicSourceImages(readRows, topics); }
  catch (error) {
    if (error.name === "AbortError") throw error;
    state.partialMedia = true;
  }

  const entries = [
    ...topics.map(topic => ({ date: datePart(topic.occurred_at), title: topic.title, href: topicPath(topic.slug), kind: "אירוע" })),
    ...posts.map(post => ({ date: datePart(post.date), title: humanContentTitle(post.title), href: publicPostHref(post), kind: "פורסם" })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const years = new Map();
  for (const entry of entries) {
    const key = entry.date.slice(0, 4);
    if (!years.has(key)) years.set(key, { key: `year-${key}`, title: key, items: [] });
    const [y, m, d] = entry.date.split("-");
    years.get(key).items.push({ title: `${entry.title} · ${entry.kind} ${d}.${m}.${y}`, href: entry.href });
  }
  state.collections = [
    ...years.values(), ...topics.map(topic => topicCollection(topic, images)).filter(group => group.items.length > 1),
    taxonomyCollection(posts, "category", "categories", "קטגוריות בפרסומים"),
    taxonomyCollection(posts, "tag", "tags", "תגיות בפרסומים"),
  ].filter(collection => collection.items.length);
  return state;
}
