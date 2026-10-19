// 2029 One Tree pilot: source-attested units of an EXISTING public Post.
// Not a second Graph, a store, a classifier, or an approval mechanism.
// Every extracted unit is witnessed inside posts:5119, not inferred from tags.
export const ALON_5119_POST_ID = 5119;
export const ALON_5119_SLUG = "mah-kore-goliath-benjamin-gath-david";
export const ALON_5119_SERIES_KEY = "mah-kore-habora";

const clean = (s) => String(s == null ? "" : s).trim();
const stripHtml = (s) => clean(String(s || "").replace(/<[^>]*>/g, " ")
  .replace(/&quot;/g, '"').replace(/&nbsp;|&#160;/g, " ")
  .replace(/&#39;|&#x27;/gi, "'").replace(/&amp;/g, "&").replace(/\s+/g, " "));
const isPublicPost = (post) => post?.id === ALON_5119_POST_ID
  && post.slug === ALON_5119_SLUG
  && !post.home_hidden
  && !["gpt-draft", "web"].includes(post.source)
  && Array.isArray(post.tags)
  && !post.tags.some((tag) => ["טיוטה", "פורום"].includes(tag));

const EVENTS = Object.freeze([
  Object.freeze({
    id: "goliath-georgia",
    name: "מתקן גוליית · ג׳ורג׳יה",
    occurredOn: "2026-10-12",
    printedDate: "12.10.2026",
    guard: "Goliath",
    sourceName: "AP",
    sourceUrl: "https://apnews.com/article/a9ce45f681772b828f7b5d3c59d010d1",
    biblicalFocus: "גוליית · שמואל א׳ י״ז",
    linkExplanation: "הדובר מקשר בין שם המתקן גוליית לבין גוליית בסיפור דוד.",
    relationKind: "speaker_symbolic_comparison",
  }),
  Object.freeze({
    id: "binyamin-telaviv",
    name: "קריסת מבנה · נחלת בנימין",
    occurredOn: "2026-10-14",
    printedDate: "14.10.2026",
    guard: "נחלת בנימין",
    sourceName: "N12",
    sourceUrl: "https://www.mako.co.il/news-israel/2026_q4/Article-38ad1a12e2931a1026.htm",
    biblicalFocus: "שאול · שבט בנימין",
    linkExplanation: "הדובר מחבר את שם הרחוב נחלת בנימין לשאול משבט בנימין.",
    relationKind: "speaker_symbolic_comparison",
  }),
  Object.freeze({
    id: "gat-intel",
    name: "פיצוץ במפעל · קריית גת",
    occurredOn: "2026-10-14",
    printedDate: "14.10.2026",
    guard: "קריית גת",
    sourceName: "N12",
    sourceUrl: "https://www.mako.co.il/news-israel/2026_q4/Article-e5dbe0d21ed31a1027.htm",
    biblicalFocus: "גת · עיר מוצאו של גוליית",
    linkExplanation: "הדובר מצביע על זיקת השם בין קריית גת לבין גת המקראית.",
    relationKind: "speaker_symbolic_comparison",
  }),
]);

// Hand-reviewed discovery hints only: NEVER write Graph edges or advertise approval.
export const SHAUL_DAVID_REVIEW_IDS = Object.freeze([77, 1129, 161, 80, 1076, 5024]);
const ARCHIVE_WHY = Object.freeze({
  77: "מלכות שאול והמעבר למלכות דוד · מקור שיעור סוד החשמל",
  1129: "שאול המלך ובנימין בהקשר היסטורי של הבחירות",
  161: "שאול המלך · מקור היסטורי הדורש בדיקת ההקשר",
  80: "מלכות בית דוד · שיעור סוד החשמל",
  1076: "מקבץ היסטורי של דוד=14 וגלריות גאולה",
  5024: "הופעת החישוב דוד=14 בפוסט רמזים",
});

function findNewsWitness(html, spec) {
  // The original article has one news list; do not search the entire post for
  // scattered mentions, duplicated video transcript text or metadata tags.
  const section = html.match(/<h3\b[^>]*>\s*בדיקת האירועים בחדשות\s*<\/h3>\s*<ul\b[^>]*>([\s\S]*?)<\/ul>/i);
  if (!section) return null;
  const items = section[1].match(/<li\b[^>]*>[\s\S]*?<\/li>/gi) || [];
  const entry = items.find((li) => li.includes(spec.sourceUrl)
    && stripHtml(li).includes(spec.printedDate)
    && stripHtml(li).includes(spec.guard));
  if (!entry) return null;
  return Object.freeze({
    sourceRef: "posts:5119",
    locator: { kind: "post_html_news_list_item", exactSourceUrl: spec.sourceUrl, textGuard: spec.guard },
    excerpt: stripHtml(entry).slice(0, 320),
    externalSource: { name: spec.sourceName, href: spec.sourceUrl },
  });
}

function publicVideoOccurrence(row) {
  if (!row || row.source_type !== "post" || String(row.source_id) !== "5119"
    || !Array.isArray(row.series_keys) || !row.series_keys.includes(ALON_5119_SERIES_KEY)
    || row.speaker !== "אלון לוי" || row.needs_review === true
    || typeof row.media_url !== "string" || !row.media_url.startsWith("https://")) return null;
  return Object.freeze({
    videoUrl: row.media_url,
    posterUrl: typeof row.poster_url === "string" && row.poster_url.startsWith("https://") ? row.poster_url : null,
    videoKind: row.video_kind || null,
    assetKey: row.asset_key || null,
    sourceRef: "posts:5119",
    sourceRole: "original_video_occurrence",
    seriesKey: ALON_5119_SERIES_KEY,
    creator: "אלון לוי",
  });
}

export function buildAlon5119OneTreePilot(post, {
  videoPlacement = null, archivePosts = [], david14Row = null,
} = {}) {
  if (!isPublicPost(post)) return Object.freeze({ available: false, reason: "post_not_public_or_unmatched" });
  const html = String(post.content || "");
  const events = EVENTS.map((event) => {
    const witness = findNewsWitness(html, event);
    return witness ? Object.freeze({
      ...event, witness, dateRole: "reported_event_date",
      connectionStatus: "editorial_candidate_not_graph_approved",
      independentEvent: true, relatedBy: "one_creator_video_and_scripture",
    }) : null;
  }).filter(Boolean);
  // Do not promote an incomplete source to a full "three event" convergence.
  const ready = events.length === EVENTS.length && html.includes("שמואל א׳")
    && html.includes("תודעת מלכות דוד") && html.includes("אלון לוי");
  const archive = new Map((Array.isArray(archivePosts) ? archivePosts : [])
    .filter((row) => SHAUL_DAVID_REVIEW_IDS.includes(row?.id)
      && typeof row.slug === "string" && row.slug.length
      && Array.isArray(row.tags) && !row.tags.some((tag) => ["טיוטה", "פורום"].includes(tag))
      && !row.home_hidden && !["gpt-draft", "web"].includes(row.source)).map((row) => [row.id, row]));
  const archiveCandidates = SHAUL_DAVID_REVIEW_IDS.flatMap((id) => {
    const row = archive.get(id);
    return row ? [Object.freeze({
      postId: id, title: row.title, href: `/post/${row.slug}`,
      sourceRef: `posts:${id}`, reviewWhy: ARCHIVE_WHY[id],
      relationStatus: "candidate_needs_exact_source_review",
    })] : [];
  });
  const verifiedDavid14 = david14Row?.phrase === "דוד" && david14Row.ragil === 14
    && david14Row.is_verified === true && david14Row.is_published === true;
  return Object.freeze({
    available: true, ready,
    kind: "one_tree_content_unit_pilot",
    postId: ALON_5119_POST_ID,
    sourceRef: "posts:5119",
    slug: post.slug,
    href: `/post/${post.slug}`,
    title: post.title,
    creator: "אלון לוי",
    editorialCredit: "מערכת SOD1820",
    publishedAt: post.date || null,
    series: { key: ALON_5119_SERIES_KEY, label: "מה קורה הבורא", role: "editorial_membership" },
    sourceUnits: Object.freeze({
      video: publicVideoOccurrence(videoPlacement),
      post: { sourceRef: "posts:5119", role: "article_occurrence" },
      transcript: { sourceRef: "posts:5119", role: "transcript_in_original_post", present: html.includes("תמלול מלא של הסרטון") },
    }),
    events: Object.freeze(events),
    biblicalUnit: Object.freeze({ sourceRef: "posts:5119", witness: "שמואל א׳ י״ז", passage: "כי לה׳ המלחמה", role: "scriptural_comparison_in_post" }),
    interpretation: Object.freeze({
      speaker: "אלון לוי",
      text: "מעבר מתודעת שאול לתודעת מלכות דוד",
      evidenceClass: "speaker_interpretation_not_historical_causality",
      sourceRef: "posts:5119",
    }),
    numberUnit: Object.freeze({
      phrase: "דוד", value: 14, method: "רגיל",
      publiclyVerified: verifiedDavid14,
      status: verifiedDavid14 ? "verified_published_calculation" : "not_available_to_public_projection",
      dateLinksApproved: false,
    }),
    archiveCandidates: Object.freeze(archiveCandidates),
    warnings: Object.freeze([
      "אין קשתות גרף מאושרות בין שלושת האירועים",
      "קשרי הכותרות הם פרשנות הדובר, לא טענה על סיבת האירועים",
      "תאריך פרסום הפרק אינו תאריך התרחשות",
      "אין סמן רמז השנה אוטומטי רק כי האירוע התרחש בשנת תשפ״ז",
      "כדי להחזיר לדקת סרטון נדרש תמלול מתוזמן; התמלול הנוכחי הוא טקסט בלבד",
    ]),
  });
}
