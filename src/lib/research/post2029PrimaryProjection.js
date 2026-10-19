const clean = (value) => value == null ? "" : String(value).trim();

const GOLDEN_SLUG = "remzei-geula-ai-sod-hashir";
const FZ1073_SLUG = "flydubai-fz1073-363-14000-remzei-geula";
const BENNETT_SALT_SLUG = "bennett-melach-631-78";
const ELECTIONS_SLUG = "sharshar-elections-redemption-hints-draft";

function stripTags(html = "") {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function postKinds(post) {
  return {
    isGolden: post?.slug === GOLDEN_SLUG,
    isFz1073: post?.slug === FZ1073_SLUG,
    isBennett: post?.slug === BENNETT_SALT_SLUG,
    isElections: post?.slug === ELECTIONS_SLUG,
  };
}

// A public Post row is already the canonical source. This deliberately exposes
// only that source and its stable identity. Verified calculations, resolved
// links, timelines and context packs belong to the later enrichment module.
export function buildPost2029PrimaryProjection(post) {
  if (!post) return null;
  const { isGolden, isFz1073, isBennett, isElections } = postKinds(post);
  const sourceRegion = {
    id: "post-story",
    heading: clean(post.title),
    label: "הסיפור",
    primary: clean(post.title),
    signals: [],
  };
  return {
    version: "post-2029-reading-v1",
    post: { ...post },
    identity: {
      type: "post",
      id: String(post.id),
      slug: post.slug,
      href: `/post/${post.slug}`,
    },
    sourceLine: isGolden
      ? "סוד החשמל · גליון חג הסוכות · „תשית לראשו עטרת פז”"
      : isFz1073
        ? "תיעוד אירוע · Flydubai FZ1073"
        : isElections
          ? "הבחירות לכנסת ה־26 · תחילת הרמזים"
          : isBennett
            ? "תיעוד אירוע · בני ברק · 24.09.2026"
            : clean(post.author) || "מקור הפוסט",
    sourceLabel: isFz1073
      ? "FZ1073 · תיעוד אירוע"
      : isElections
        ? "הבחירות · ציר 631"
        : isBennett
          ? "בנט · ציר 631"
          : clean(post.author) || "מקור הפוסט",
    excerpt: clean(post.excerpt) || stripTags(post.content).slice(0, 220),
    regions: [sourceRegion],
    defaultRegionId: sourceRegion.id,
    golden: isGolden || isFz1073 || isBennett || isElections,
    draft: post._privateStage === true || (Array.isArray(post.tags) && post.tags.includes("טיוטה")),
    privateStage: post._privateStage === true,
    previewSnapshot: post._previewSnapshot === true,
    caveat: isGolden
      ? "המקור נשמר כלשונו. החיבורים בשוליים הם שכבת SOD1820 נפרדת."
      : isFz1073
        ? "הפוסט הוא מקור הסיפור. החיבורים בשוליים הם שכבת הקשר נפרדת; רמת רמז אינה ציון אמת."
        : isElections
          ? "המספרים והחישובים מוצגים כפי שהם. החיבורים בשוליים הם שכבת קריאה נפרדת; המשך הציר חי בפוסט נפרד."
          : isBennett
            ? "האירוע המתועד, החישובים והפרשנות נשמרים כשכבות נפרדות. אין כאן טענת סיבתיות או עמדה פוליטית."
            : "שכבת ההקשר אינה חלק מדברי המקור.",
    experience: { version: "post-2029-primary-v1", media: null, connections: [], timeline: [], trail: [] },
    contextPack: null,
    extensionsPending: true,
  };
}

// Resolve only regions of the currently loaded Post. This reads the existing Context;
// it creates no history, source identity or access grant.
export function resolvePostReadingRegion(projection, context, hash = "") {
  const regions = projection?.regions || [];
  const byLocator = (locator) => regions.find((region) => locator === `#source-region-${region.id}`)?.id || null;
  const fromHash = byLocator(hash);
  if (fromHash) return fromHash;
  const post = projection?.post;
  const samePost = post && context?.subject?.type === "post"
    && String(context.subject.id) === String(post.id)
    && (!context.subject.href || context.subject.href.split("#")[0] === `/post/${post.slug}`);
  if (!samePost) return null;
  return byLocator(context.selection?.locator);
}

export const post2029PrimaryProjectionInternals = { stripTags, postKinds };
