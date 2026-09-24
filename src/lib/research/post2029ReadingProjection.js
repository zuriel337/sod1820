import { getPostBySlug, supabase } from "../supabase.js";

const clean = (value) => value == null ? "" : String(value).trim();
const GOLDEN_SLUG = "remzei-geula-ai-sod-hashir";

// Golden calibration only. This is contextual presentation over the existing Post identity,
// not a second source/knowledge store. Future intake may project equivalent reading-focus
// metadata from its governed source map.
const GOLDEN_REGIONS = Object.freeze([
  {
    id: "tashpaz",
    heading: "רמזים על גאולה בשנת ה'תשפ\"ז",
    label: "תשפ״ז · ציר הזמן",
    primary: "787 · תשפ״ז",
    signals: ["העת עכשיו", "רמזי גאולה"],
    number: 787,
    worldLabel: "פתח בעולם",
  },
  {
    id: "ai",
    heading: "נבואת זכריה \"שְׂכַר הָאָדָם לֹא נִהְיָה\" מתקיימת בהתפתחות הבינה מלאכותית.",
    label: "זכריה · בינה מלאכותית",
    primary: "שכר האדם · בינה מלאכותית",
    signals: ["זכריה ח, י", "שלמה · חשמל"],
    worldLabel: "פתח את החיבור",
  },
  {
    id: "sins",
    heading: "יתמו חטאים ולא חוטאים",
    label: "יתמו חטאים",
    primary: "ברכות י · תשובה",
    signals: ["מקור תלמודי", "פירוש המהר״ל"],
    worldLabel: "פתח את ההקשר",
  },
  {
    id: "song",
    heading: "נִתְקַלְקְלוּ הַלְוִיִּם בַּשִּׁיר",
    label: "שופר · שיר · ישר",
    primary: "שופר → שיר → ישר",
    signals: ["בית המקדש", "קו היושר"],
    worldLabel: "פתח בעולם",
  },
  {
    id: "ciphers",
    heading: "צפנים מאת הרה\"ג ר' נ. דויטש שליט\"א",
    label: "צפנים מן המקור",
    primary: "מקור חזותי · צפנים",
    signals: ["ELS", "בדיקה נפרדת נדרשת"],
    worldLabel: "פתח בצופן",
  },
]);

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

async function verifyTashpaz() {
  const { data, error } = await supabase.rpc("fn_method_value", {
    p_method_key: "רגיל",
    p_phrase: 'תשפ"ז',
  });
  const value = Number(data);
  return {
    verified: !error && value === 787,
    value: Number.isSafeInteger(value) ? value : null,
    method: "רגיל",
  };
}

async function fetchPrivateGoldenStage(slug) {
  if (slug !== GOLDEN_SLUG) return null;
  // Existing Research Intake owner is the private pre-publication home. RLS exposes this
  // row only to authenticated admins; anon gets zero rows. Once published, Posts is the
  // sole public Publication identity and this fallback is no longer needed.
  const { data, error } = await supabase
    .from("research_objects")
    .select("id,status,privacy_scope,meta")
    .contains("meta", { checkpoint_key: "sod-hashmal-sukkot-5787-source-root" })
    .eq("privacy_scope", "private")
    .limit(1)
    .maybeSingle();
  if (error || !data?.meta?.staged_post) return null;
  const staged = data.meta.staged_post;
  return {
    id: staged.id,
    wp_id: staged.wp_id,
    title: staged.title,
    slug: staged.slug,
    link: staged.link,
    excerpt: staged.excerpt,
    author: staged.author,
    categories: staged.categories || [],
    tags: staged.tags || [],
    source: staged.source,
    space: staged.space,
    theme: staged.theme,
    content: staged.content_html || "",
    _privateStage: true,
    _sourceRootId: data.id,
  };
}

function defaultRegionsFromSource(content = "") {
  const rows = [...String(content).matchAll(/<h[1-6][^>]*data-source-heading=["']true["'][^>]*>([\s\S]*?)<\/h[1-6]>/gi)];
  return rows.map((match, index) => ({
    id: `source-${index + 1}`,
    heading: stripTags(match[1]),
    label: stripTags(match[1]),
    primary: "מקור",
    signals: [],
    worldLabel: "פתח לעומק",
  }));
}

export async function fetchPost2029ReadingProjection(slug) {
  const publicPost = await getPostBySlug(slug);
  const post = publicPost || await fetchPrivateGoldenStage(slug);
  if (!post) return null;

  const isGolden = post.slug === GOLDEN_SLUG;
  const yearVerification = isGolden ? await verifyTashpaz() : null;
  const regions = (isGolden ? GOLDEN_REGIONS : defaultRegionsFromSource(post.content)).map((region) => ({
    ...region,
    verification: region.number === 787 ? yearVerification : null,
  }));

  return {
    version: "post-2029-reading-v1",
    post,
    identity: {
      type: "post",
      id: String(post.id),
      slug: post.slug,
      href: `/post/${post.slug}`,
    },
    sourceLine: isGolden
      ? "סוד החשמל · גליון חג הסוכות · „תשית לראשו עטרת פז”"
      : clean(post.author) || "מקור הפוסט",
    sourceLabel: clean(post.author) || "מקור הפוסט",
    excerpt: clean(post.excerpt) || stripTags(post.content).slice(0, 220),
    regions,
    defaultRegionId: regions[0]?.id || null,
    golden: isGolden,
    draft: post._privateStage === true || (Array.isArray(post.tags) && post.tags.includes("טיוטה")),
    privateStage: post._privateStage === true,
    caveat: isGolden
      ? "המקור נשמר כלשונו. החיבורים בשוליים הם שכבת SOD1820 נפרדת."
      : "שכבת ההקשר אינה חלק מדברי המקור.",
  };
}

export const post2029ReadingInternals = {
  stripTags,
  defaultRegionsFromSource,
  GOLDEN_REGIONS,
};