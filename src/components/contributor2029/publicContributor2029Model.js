// Page-local presentation over the canonical readers. No persistence or attribution inference.
import { normalizeWorldAllResearchRow } from "../../lib/research/worldAllResearchProjection.js";
import { humanContentTitle } from "../../lib/presentation/contentTitle.js";
export const SECTIONS = Object.freeze([
  ["all", "הכול"], ["writings", "כתבים ומאמרים"], ["sources", "מקורות ועדכונים"],
  ["findings", "ממצאים"], ["topics", "התכנסויות ונושאים"], ["media", "מדיה וגלריות"], ["community", "הודעות, לייקים ותגובות"],
]);
const text = (v) => typeof v === "string" ? v.trim() : "";
const finite = (v) => v !== null && v !== "" && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : null;
const blocked = new Set(["private", "person_only", "public_candidate", "draft", "triage", "rejected", "pending"]);
const published = new Set(["approved", "published", "public", "live"]);
const list = (v) => Array.isArray(v) ? v : [];
// Preserve Legacy's automatic-contributor discovery policy even when its public
// canonical URL uses a numeric code rather than the generated slug.
const AUTO_PROFILE_RE = /^r-[0-9a-f]{16,}$/i;

export function safePublicUrl(value) {
  const raw = text(value);
  if (!raw || /[\\\u0000-\u0020]/.test(raw) || raw.startsWith("//")) return null;
  if (raw.startsWith("/") && !/^\/(?:researcher|admin)(?:\/|$)/i.test(raw)) return raw;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function publicContributorAvatar(identity) {
  const choice = identity?.public_avatar;
  if (choice && typeof choice === "object" && choice.enabled === false) return null;
  if (choice && typeof choice === "object" && choice.enabled === true) return safePublicUrl(choice.url);
  return safePublicUrl(identity?.avatar_url);
}

const RETURN_PATH = /^\/(?:(?:2029\/)?(?:world|post|posts|p|topic|number|book|books|source|sources|community|search)(?:\/|$)|2029\/me\/(?:public-page|page-editor|profile|messages|notifications|progress)(?:\/|$))/;
// The Preview community is one exact URL shape, `/2029?preview=community`; other /2029 targets stay rejected.
const isPreviewCommunity = (url) => url.pathname === "/2029" && url.searchParams.get("preview") === "community";

export function approvedReturnHref(value, origin) {
  const raw = text(value);
  if (!raw || raw.length > 2500 || /[\\\u0000-\u0020]/.test(raw) || raw.startsWith("//")) return null;
  try {
    const base = new URL(origin);
    const url = new URL(raw, base);
    const decoded = decodeURIComponent(url.pathname);
    if (url.origin !== base.origin || url.username || url.password || !(RETURN_PATH.test(decoded) || isPreviewCommunity(url))
      || /[\\\u0000-\u0020]/.test(decoded) || decoded.includes("//") || decoded.includes("%")) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return null; }
}

export function readContributorLocation(search, origin) {
  const params = new URLSearchParams(search);
  return {
    section: SECTIONS.some(([key]) => key === params.get("section")) ? params.get("section") : "all",
    item: text(params.get("item")).slice(0, 250),
    sort: ["newest", "oldest", "discussed", "strength"].includes(params.get("sort")) ? params.get("sort") : "newest",
    returnHref: approvedReturnHref(params.get("returnTo"), origin),
  };
}

export function isExactlyAttributed(row, identity) {
  const explicitId = text(row?.contributor_id || row?.meta?.contributor_id || row?.resolved_contributor_id);
  if (explicitId) return explicitId === identity.id;
  const slug = text(row?.contributor_slug || row?.meta?.contributor_slug);
  if (slug) return slug === identity.slug;
  const code = text(row?.contributor_code || row?.meta?.contributor_code);
  if (code) return code === String(identity.code);
  // Only registered aliases, never display-name similarity or content matching.
  return list(identity.wa_names).includes(text(row?.contributor || row?.credit));
}

function publicResearch(row) {
  return row?.privacy_scope === "public" && !blocked.has(text(row.status))
    && row?.meta?.ext?.personal_scope?.scope !== "person_only";
}

export function buildPublicContributorView(projection, identity) {
  if (!projection || projection.mode !== "public_view" || !identity?.id
    || projection.contributor?.id !== identity.id) throw new Error("public_contributor_contract");
  const availability = projection.availability || {};
  const bySource = new Map();
  let unattributed = false;
  for (const original of list(projection.sourceGroups)) {
    const rows = list(original.rows).filter(publicResearch).filter((row) => {
      const exact = isExactlyAttributed(row, identity);
      if (!exact) unattributed = true;
      return exact;
    });
    const candidateSource = original.source;
    const source = candidateSource && published.has(candidateSource.status)
      && isExactlyAttributed(candidateSource, identity) ? candidateSource : null;
    if (candidateSource && published.has(candidateSource.status) && !source) unattributed = true;
    if (!source && !rows.length) continue;
    const key = original.sourceRef || original.id;
    if (!key) continue;
    const prior = bySource.get(key);
    const allRows = [...new Map([...(prior?.rows || []), ...rows].map((row) => [row.id, row])).values()];
    bySource.set(key, { ...original, source: prior?.source || source, rows: allRows });
  }
  const items = [];
  const sourceGroups = [];
  for (const [key, group] of bySource) {
    const source = group.source;
    const rows = group.rows;
    // A genuine source survives empty/unavailable research; no dummy Finding is made.
    if (source) {
      const safeSource = { text: text(source.text), imageUrl: safePublicUrl(source.imageUrl),
        thumbUrl: safePublicUrl(source.thumbUrl), linkUrl: safePublicUrl(source.linkUrl) };
      const safeGroup = { id: key, sourceRef: key, title: text(group.title) || "מקור ללא כותרת",
        createdAt: group.createdAt, source: safeSource, rows: [], universalFindings: [],
        findingCount: 0, verifiedCount: 0, facets: ["source"], values: [], terms: [],
        lexicalTags: [], lexicalWorlds: [] };
      sourceGroups.push(safeGroup);
      const locator = new URLSearchParams({ view: "sources", source: identity.slug, sourceRef: key });
      items.push({ id: key, type: "sources", title: safeGroup.title, date: group.createdAt,
        summary: safeSource.text, href: `/world?${locator}#source-occurrence-${source.id}`, media: Boolean(safeSource.imageUrl || safeSource.thumbUrl),
        reason: "מקור שנמסר בשם משויך ומאושר של הכותב.", group: safeGroup,
        sourceOnly: availability.research === "ok" && !rows.length,
        findingsUnavailable: availability.research !== "ok" });
    }
    for (const row of rows) {
      const finding = list(group.universalFindings).find((f) => f.subject?.key === row.id);
      items.push({ id: `finding:${row.id}`, type: "findings", title: text(finding?.subject?.label) || text(row.statement) || "ממצא ללא כותרת",
        date: row.created_at, href: null,
        sourceHref: safePublicUrl(source?.linkUrl), value: finite(row.value),
        // The current reader carries confidence, not a Research Strength or quality measure.
        // Nor does it carry a canonical per-Finding destination. Do not invent any of them.
        strength: null, quality: null,
        verification: row?.engine_detail?.verification_state || null,
        reason: "ממצא עם שיוך מפורש לכותב; השיוך אינו אימות של תוכנו." });
    }
  }
  // Contributions are already selected by author_contributor_id by the canonical reader.
  // Its normalized output currently omits post-fragment locators: never manufacture one.
  for (const row of list(projection.contributions)) {
    if (!published.has(row.status)) continue;
    const community = ["community_2029", "openweb"].includes(row.source);
    // The reader does not carry a Post identity: a contribution never becomes an article.
    items.push({ id: row.id, type: community ? "community" : "sources", label: community ? "הודעה בקהילה" : "תרומה",
      title: text(row.statement) || "תרומה ללא כותרת",
      summary: text(row.secondary), date: row.createdAt, href: safePublicUrl(row.href),
      linkLabel: row.convergenceSlug ? "פתיחת הנושא המקושר" : "פתיחת המקור המקושר",
      media: Boolean(safePublicUrl(row.mediaUrl)), mediaUrl: safePublicUrl(row.mediaUrl),
      reason: "תרומה המשויכת לכותב באמצעות זהותו הרשומה." });
  }
  // Only the anonymous, attribution-preserving reader may supply Topics (see loader).
  for (const row of list(projection.topics)) {
    if (!published.has(row.status) || !isExactlyAttributed({ contributor: row.createdBy }, identity)) continue;
    items.push({ id: row.id, type: "topics", title: text(row.statement) || "נושא ללא כותרת",
      summary: text(row.secondary), date: row.approvedAt || row.createdAt, href: safePublicUrl(row.href),
      reason: "נושא עם שיוך מפורש לכותב; קבלתו ופרסומו נפרדים מאימות הממצאים." });
  }
  const unique = [...new Map(items.map((item) => [item.id, item])).values()];
  return {
    noindex: AUTO_PROFILE_RE.test(text(identity.slug)),
    profile: { name: text(identity.display_name) || "כותב", bio: text(identity.bio),
      avatar: publicContributorAvatar(identity), role: ({ researcher: "חוקר", writer: "כותב", rabbi: "רב" })[identity.role]
        || (/[א-ת]/.test(text(identity.role)) && !/בעל האתר|מנהל|triage|admin|@/i.test(identity.role) ? text(identity.role) : "") },
    items: unique, sourceGroups, availability, communityAuthorKey: identity.id,
    partial: Object.values(availability).some((v) => v !== "ok")
      || Object.entries(projection.loadState || {}).some(([key, value]) => key.endsWith("Truncated") && value === true),
    unattributed,
  };
}

export function selectContributorItems(view, section, requestedSort) {
  const rows = view.items.filter((item) => section === "all" || (section === "media" ? item.media : item.type === section));
  const canDiscuss = rows.some((item) => finite(item.commentCount) !== null);
  const canStrength = section === "findings" && rows.some((item) => finite(item.strength) !== null);
  const sort = requestedSort === "discussed" && !canDiscuss || requestedSort === "strength" && !canStrength ? "newest" : requestedSort;
  const metric = sort === "strength" ? "strength" : sort === "discussed" ? "commentCount" : null;
  rows.sort((a, b) => {
    const av = metric ? finite(a[metric]) : finite(Date.parse(a.date));
    const bv = metric ? finite(b[metric]) : finite(Date.parse(b.date));
    if (av === null || bv === null) return av === bv ? a.id.localeCompare(b.id) : av === null ? 1 : -1;
    return (sort === "oldest" ? av - bv : bv - av) || a.id.localeCompare(b.id);
  });
  return { rows, sort, canDiscuss, canStrength };
}

// Preserve each source-native identity. A projected Insight is a reference on its
// original contribution, not an additional independent Finding.
export function appendContributorPublicationCatalog(view, catalogue, identity) {
  const items = new Map(view.items.map((item) => [item.id, item]));
  const projected = new Set();
  const canonicalHref = view.canonicalHref;
  const put = (item) => items.set(item.id, item);
  for (const row of catalogue.contributions?.rows || []) {
    if (!["approved", "published"].includes(row.status)) continue;
    if (row.projected_insight_id) projected.add(row.projected_insight_id);
    if (["openweb", "community_2029"].includes(row.origin)) continue;
    const normalized = normalizeWorldAllResearchRow(row, "contribution");
    const id = normalized.id;
    const href = safePublicUrl(normalized.href) || `${canonicalHref}?${new URLSearchParams({ section: "sources", item: id })}`;
    put({ id, sourceRef: `research_contributions:${row.id}`, type: "sources", label: "תרומה",
      title: normalized.statement || "תרומה ללא כותרת", summary: row.body || "", date: row.created_at,
      href, media: Boolean(safePublicUrl(normalized.mediaUrl)), mediaUrl: safePublicUrl(normalized.mediaUrl),
      linkedSourceRefs: [row.projected_insight_id && `insights:${row.projected_insight_id}`].filter(Boolean),
      reason: "תרומה מהאתר הקיים; פרסומה אינו אימות של תוכנה." });
  }
  for (const row of catalogue.posts?.rows || []) {
    if (!row.slug) continue;
    const mediaUrl = safePublicUrl(row.thumb_url || row.image_url);
    put({ id: `post:${row.id}`, sourceRef: `posts:${row.id}`, type: "writings", title: humanContentTitle(row.title, { max: 0 }),
      date: row.date, href: safePublicUrl(`/${row.slug}`), media: Boolean(mediaUrl), mediaUrl,
      reason: row.author === identity.display_name ? "מאמר שהמערכת מייחסת לכותב." : "מאמר בהשתתפות הכותב." });
  }
  for (const row of catalogue.ciphers?.rows || []) {
    if (row.status !== "published" || row.visibility !== "public" || !row.slug) continue;
    const mediaUrl = safePublicUrl(row.image_url);
    put({ id: `els:${row.id}`, sourceRef: `els_records:${row.id}`,
      type: row.attributionBasis === "source_author_credit" ? "findings" : "sources",
      label: row.attributionBasis === "source_author_credit" ? "צופן שמור" : "צופן שהועלה",
      title: text(row.title || row.search_term), date: row.created_at, href: `/codes/${encodeURIComponent(row.slug)}`,
      media: Boolean(mediaUrl), mediaUrl, strength: null, quality: null, value: null, verification: null,
      reason: row.attributionBasis === "source_author_credit"
        ? "צופן עם קרדיט מחבר מפורש במקור; חשבון המעלה עשוי להיות שונה. פרסום אינו אימות."
        : "צופן שהועלה מחשבון זה; חשבון המעלה אינו קובע מי המחבר. פרסום אינו אימות." });
  }
  for (const row of catalogue.insights?.rows || []) {
    if (!row.is_active || row.space === "private" || projected.has(row.id)) continue;
    put({ id: `insight:${row.id}`, sourceRef: `insights:${row.id}`, type: "findings", label: "חידוש מהאתר הקיים",
      title: text(row.title), date: row.created_at,
      href: `/research?${new URLSearchParams({ tool: "midrash", tab: "community", insight: row.id })}`,
      strength: null, quality: null, value: null, verification: null,
      reason: "חידוש המיוחס לכותב במקור הקיים; לא בוצע כאן אימות חדש." });
  }
  for (const row of catalogue.events?.rows || []) {
    put({ id: `event:${row.id}`, sourceRef: `nodes:${row.id}`, type: "sources", label: "אירוע בציר",
      title: text(row.label), date: row.created_at, href: `/timeline#ev-${row.id}`,
      reason: "אירוע עם שיוך מפורש לכותב בציר הקיים." });
  }
  for (const row of catalogue.topics?.rows || []) {
    if (row.status !== "approved" || !row.slug) continue;
    put({ id: `topic:${row.slug}`, sourceRef: `topic_cards:${row.slug}`, type: "topics",
      title: text(row.title), summary: text(row.subtitle), date: row.approved_at,
      href: `/topic/${encodeURIComponent(row.slug)}`,
      reason: "הקרנת נושא קיימת עם קרדיט יצירה מפורש; אין כאן נושא חדש." });
  }
  for (const row of Array.isArray(identity.media) ? identity.media : []) {
    const url = safePublicUrl(typeof row === "string" ? row : row?.url || row?.src || row?.image_url);
    if (!url || [...items.values()].some((item) => item.mediaUrl === url)) continue;
    put({ id: `media:${url}`, sourceRef: url, type: "media", label: "מדיה וגלריה",
      title: text(row?.title || row?.caption) || "מדיה מדף הכותב", date: row?.created_at || null,
      href: url, media: true, mediaUrl: url, reason: "מדיה שנשמרה בדף הכותב הקיים." });
  }
  return { ...view, items: [...items.values()], publicationCoverage: Object.fromEntries(Object.entries(catalogue)
    .map(([key, value]) => [key, { count: value.complete ? value.rows.length : null, complete: value.complete, availability: value.availability }])),
    partial: view.partial || Object.values(catalogue).some((value) => !value.complete) };
}
