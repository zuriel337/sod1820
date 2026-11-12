// REAL connections for a typed number or expression, for the unit editor (ZURIEL 12.11.2026, section 6).
// Every result comes from an EXISTING reader (the Number page's own: gematria_words, posts_by_number_strict, gallery_images + galleries,
// number_neighbors, fn_verses_by_gematria, fn_method_profile) or from the video-reference projection; each carries its source and a
// real open target. Nothing is copied: a chosen result is kept as a CANONICAL REFERENCE (kind + ref + href), never as text, gallery,
// calculation or video content. Reading only; an explicit admin search; never run on a Post load.
import { numberPageHref } from "./numberPageAddress.js";
import { occurrencesForNumber } from "./postVideoReferences2029.js";
import { gallerySourceHref2029 } from "./topicSourceContext.js";
import { publicPostHref } from "../publicPostUrls.js";

export const CONNECTION_KINDS = Object.freeze({
  number: "דף המספר", phrase: "גימטריה", method: "שיטת חישוב", gallery: "גלריה / תמונה", post: "פוסט", verse: "פסוק",
  video: "סרטון", tree: "עץ · מספר קשור", source: "מקור",
});
// How a chosen connection appears in the unit: highlighted inside it, opened by a click, or kept on the Number page only.
export const CONNECTION_MODES = Object.freeze({ highlight: "הבלט ביחידה", click: "פתח בלחיצה", page: "בדף המספר בלבד" });

const clean = (v) => String(v ?? "").trim();
const isNumberText = (t) => /^\d{1,9}$/.test(t);

const item = (kind, title, { source, href, ref, detail = "" }) => ({ kind, kindLabel: CONNECTION_KINDS[kind], title, source, href, ref, detail, key: `${kind}:${ref}` });

// → { query, value, results: [item], groups, errors }   `readers` is injectable for tests.
export async function findUnitConnections(query, { postId = null, postHref = "", readers = null, limits = { phrases: 6, posts: 4, galleries: 5, verses: 3, tree: 5 } } = {}) {
  const q = clean(query);
  const out = { query: q, value: null, results: [], errors: [] };
  if (!q) return out;
  const r = readers || (await loadReaders());
  const safe = async (name, fn) => { try { return await fn(); } catch (error) { out.errors.push(name); return null; } };

  let value = isNumberText(q) ? Number(q) : null;
  // An expression: the engine's regular value says which number to look under; every method value is also listed.
  if (value == null) {
    const rows = await safe("method_profile", () => r.methodProfile(q));
    const list = Array.isArray(rows) ? rows : [];
    const regular = list.find((row) => /^(רגיל|regular)$/.test(clean(row.methodKey)) || clean(row.displayLabel) === "רגיל");
    value = Number.isSafeInteger(regular?.computedValue) ? regular.computedValue : null;
    out.results.push(item("phrase", q, { source: "מנוע הגימטריה", href: numberPageHref(q), ref: `phrase:${q}`, detail: value != null ? `רגיל = ${value}` : "הביטוי נפתח בדף המספר" }));
    for (const row of list.filter((x) => Number.isSafeInteger(x.computedValue)).slice(0, 5)) {
      out.results.push(item("method", `${row.displayLabel || row.methodKey} = ${row.computedValue}`, { source: "מנוע הגימטריה · fn_method_profile", href: numberPageHref(q), ref: `method:${q}:${row.methodKey}`, detail: q }));
    }
  }
  out.value = value;
  if (value == null) return out;

  out.results.unshift(item("number", String(value), { source: "דף המספר", href: numberPageHref(value), ref: `number:${value}`, detail: "הדף המלא, עם חזרה למקום בפוסט" }));

  const [phrases, bundle, verses, neighbors] = await Promise.all([
    safe("phrases", () => r.phrases(value, limits.phrases)),
    safe("bundle", () => r.bundle(value)),
    safe("verses", () => r.verses(value, limits.verses)),
    safe("neighbors", () => r.neighbors(value, limits.tree)),
  ]);
  for (const row of (phrases?.rows || []).slice(0, limits.phrases)) {
    out.results.push(item("phrase", row.phrase, { source: "גימטריות מאומתות · gematria_words", href: numberPageHref(row.phrase), ref: `phrase:${row.phrase}`, detail: `רגיל = ${value}` }));
  }
  for (const post of (bundle?.posts?.items || []).slice(0, limits.posts)) {
    const href = publicPostHref({ slug: post.slug, wp_id: post.wp_id, source: post.source });
    if (href) out.results.push(item("post", post.title || post.slug, { source: "פוסטים · posts_by_number_strict", href, ref: `post:${post.slug}`, detail: post.date ? String(post.date).slice(0, 10) : "" }));
  }
  const galleries = bundle?.galleries?.items || [];
  const wpIds = await safe("galleries", () => r.galleryIds(galleries.map((g) => g.gallery_id).filter(Boolean))) || {};
  for (const g of galleries.slice(0, limits.galleries)) {
    const href = gallerySourceHref2029(wpIds[g.gallery_id], g.id) || numberPageHref(value);
    out.results.push(item("gallery", g.name || "תמונה", { source: "גלריות · gallery_images", href, ref: `gallery_image:${g.id}`, detail: g.primary_value === value ? "תמונה על המספר" : "אזכור המספר" }));
  }
  for (const v of (verses?.verses || []).slice(0, limits.verses)) {
    out.results.push(item("verse", clean(v.text).slice(0, 90), { source: "פסוקים · fn_verses_by_gematria", href: numberPageHref(value), ref: `verse:${v.ref}`, detail: v.ref || "" }));
  }
  for (const n of (neighbors || []).slice(0, limits.tree)) {
    out.results.push(item("tree", String(n.value), { source: "העץ · number_neighbors", href: numberPageHref(n.value), ref: `tree:${value}>${n.value}`, detail: `משקל ${Math.round((n.weight || 0) * 100) / 100}` }));
  }
  for (const occ of occurrencesForNumber(postId, value, { postHref })) {
    out.results.push(item("video", `${occ.videoLabel} · ${occ.text}`, {
      source: occ.catalog.status === "catalogued" ? "קטלוג הווידאו" : "סרטון בפוסט · טרם בקטלוג",
      href: occ.unitHref || occ.videoOpenHref, ref: `video:${occ.videoId}#${occ.id}`,
      detail: `${occ.natureLabel}${occ.timeKnown ? "" : " · זמן הקטע אינו ידוע — נפתח בלי שנייה מומצאת"}`,
    }));
  }
  return out;
}

async function loadReaders() {
  const [{ fetchNumberMethodProfile }, sb, { fetchVersesByGematria }] = await Promise.all([
    import("./numberCoreProjection.js"), import("../supabase.js"), import("./verseGematriaSources.js"),
  ]);
  return {
    methodProfile: (q) => fetchNumberMethodProfile(q),
    phrases: (value, limit) => sb.getValuePhrasesPage(value, { limit }),
    bundle: (value) => sb.getEntityBundle({ term: String(value), value, isNumber: true }),
    verses: (value, limit) => fetchVersesByGematria(value, { limit }),
    neighbors: (value, limit) => sb.getNumberNeighbors(value, limit),
    galleryIds: async (ids) => {
      const unique = [...new Set(ids)];
      if (!unique.length) return {};
      const { data } = await sb.supabase.from("galleries").select("id,wp_gallery_id").in("id", unique);
      return Object.fromEntries((data || []).map((g) => [g.id, Number(g.wp_gallery_id)]));
    },
  };
}
