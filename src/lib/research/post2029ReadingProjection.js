import { getPostBySlug, supabase } from "../supabase.js";
import { POST2029_PREVIEW_SNAPSHOT } from "./post2029PreviewSnapshot.js";
import { buildPost2029ArchitectureWireframe, projectPost2029Experience } from "./post2029ExperienceProjection.js";

const clean = (value) => value == null ? "" : String(value).trim();
const GOLDEN_SLUG = "remzei-geula-ai-sod-hashir";
const BENNETT_CONTEXTUAL_NUMBER_FOCUS = Object.freeze({
  expression: "מלח",
  methodKey: "רגיל",
  resultValue: 78,
  regionId: "salt-78",
});

const FZ1073_SLUG = "flydubai-fz1073-363-14000-remzei-geula";
const FZ1073_TOPIC_363_SLUG = "gapfill-363";
const BENNETT_SALT_SLUG = "bennett-melach-631-78";

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


const FZ1073_REGIONS = Object.freeze([
  {
    id: "visual-363",
    heading: "מהשמיים — עד הנחיתה בטבוק",
    label: "363 · המשיח",
    primary: "המשיח = 363",
    signals: ["הרמז החזותי", "Topic 363"],
    number: 363,
    hero: true,
    worldLabel: "פתח את 363",
  },
  {
    id: "flight-1073",
    heading: "FZ 1073",
    label: "מספר הטיסה · 1073",
    primary: "אשר בשמים ממעל = 1073",
    signals: ["מספר הטיסה", "10 | 7 | 3"],
    number: 1073,
    hero: true,
    worldLabel: "פתח את 1073",
  },
  {
    id: "october-718",
    heading: "ציר 718",
    label: "שביעי באוקטובר · 718",
    primary: "שביעי באוקטובר = 718",
    signals: ["חדשות = 718", "התשובה = 718"],
    number: 718,
    hero: true,
    worldLabel: "פתח את 718",
  },
  {
    id: "trust-axis",
    heading: "75 → 750 → 7500",
    label: "ציר 75 → 750 → 7500",
    primary: "בטחון = 75",
    signals: ["אברהם · 75", "ציר הבטחון"],
    number: 75,
    hero: false,
    worldLabel: "פתח את 75",
  },
  {
    id: "saudi",
    heading: "סעודיה",
    label: "סעודיה · טבוק",
    primary: "סעודיה · טבוק",
    signals: ["הנחיתה בסעודיה", "פוסטים קודמים"],
    hero: false,
    worldLabel: "פתח את סעודיה",
  },
  {
    id: "assaf-rajuan",
    heading: "אסף רג׳ואן",
    label: "אסף רג׳ואן · 401",
    primary: "אסף רג׳ואן = 401",
    signals: ["מקור וידאו", "תא · ישעיהו"],
    number: 401,
    hero: false,
    worldLabel: "פתח את 401",
  },
  {
    id: "smit-machchhar",
    heading: "קפטן סמיט מאצ׳הר",
    label: "סמיט מאצ׳הר · 455",
    primary: "סמיט מאצ׳הר = 455",
    signals: ["מקור תמונה", "שיטות נוספות בעומק"],
    number: 455,
    hero: false,
    worldLabel: "פתח את 455",
  },
]);


function markBennettContextualNumberFocus(content = "", verification = null) {
  if (verification?.verified !== true || Number(verification?.value) !== BENNETT_CONTEXTUAL_NUMBER_FOCUS.resultValue) {
    return String(content || "");
  }
  const html = String(content || "");
  if (html.includes('data-contextual-number-focus-group="true"')) return html;

  const pattern = /(<h[1-6][^>]*data-source-heading=["']true["'][^>]*>\s*הרמז המרכזי\s*[—-]\s*מלח\s*<\/h[1-6]>)/i;
  const marker = `
    <div class="sod29-post-contextual-number-focus" data-contextual-number-focus-group="true" aria-label="פתיחת גימטריה בהקשר">
      <button type="button" data-contextual-number-focus="true" data-focus-part="expression" data-region-id="salt-78" data-expression="מלח" data-method="רגיל" data-result="78">מלח</button>
      <button type="button" data-contextual-number-focus="true" data-focus-part="method" data-region-id="salt-78" data-expression="מלח" data-method="רגיל" data-result="78">רגיל</button>
      <button type="button" data-contextual-number-focus="true" data-focus-part="result" data-region-id="salt-78" data-expression="מלח" data-method="רגיל" data-result="78">78</button>
    </div>`;
  return html.replace(pattern, `$1${marker}`);
}

function dateOnly(value) {
  const text = clean(value);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : "";
}

function markFz1073RegionHeadings(content = "") {
  let html = String(content || "");
  if (!/data-source-heading=["']true["'][^>]*>\s*ציר 718\s*</i.test(html)) {
    html = html.replace(
      /(<div[^>]*data-fz1073-718-axis=["']v1["'][^>]*>)/i,
      '$1<h2 data-source-heading="true">ציר 718</h2>',
    );
  }
  for (const region of FZ1073_REGIONS) {
    const pattern = new RegExp("(<h[1-6][^>]*)(>\\s*)" + region.heading + "(\\s*<\\/h[1-6]>)", "i");
    html = html.replace(pattern, (match, open, separator, close) => {
      if (/data-source-heading\s*=/.test(open)) return match;
      return open + " data-source-heading=\"true\"" + separator + region.heading + close;
    });
  }
  return html;
}
function buildFz1073Experience(post, topic363 = null) {
  const href = "/" + "post/" + FZ1073_SLUG;
  const videoSrc = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/video/2026/10/plane-14000-14-75/final-20261001-v4.mp4";
  const poster = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/image/2026/10/plane-14000-14-75/poster-final-20261001-v3.jpg";
  const oct710 = "/710-%d7%92%d7%99%d7%9e%d7%98%d7%a8%d7%99%d7%94-%d7%93%d7%99%d7%a0%d7%99%d7%9d-%d7%9e%d7%aa%d7%95%d7%a7%d7%99%d7%9d-%d7%94%d7%9e%d7%a8%d7%9e%d7%96-%d7%a2%d7%9c-7-10-%d7%a9%d7%91%d7%a9%d7%95%d7%a8/";
  const simchatWar = "/%d7%94%d7%9e%d7%9c%d7%97%d7%9e%d7%94-%d7%a9%d7%94%d7%97%d7%9c%d7%94-%d7%91%d7%90%d7%96%d7%95%d7%a8-%d7%a2%d7%96%d7%94-%d7%91%d7%99%d7%95%d7%9d-%d7%a9%d7%9e%d7%97%d7%aa-%d7%aa%d7%95%d7%a8%d7%94-%d7%aa/";
  const tiranSaudi = "/%d7%a8%d7%9e%d7%96%d7%99%d7%9d-%d7%9e%d7%94%d7%a2%d7%91%d7%a8%d7%aa-%d7%94%d7%90%d7%99%d7%99%d7%9d-%d7%94%d7%9e%d7%a6%d7%a8%d7%99%d7%9d-%d7%98%d7%99%d7%a8%d7%90%d7%9f-%d7%95%d7%a1%d7%a0%d7%a4%d7%99/";
  const iranSaudi = "/סכסוך-בין-איראן-לערב-הסעודית-לפני-הגאו";
  const connections = [
    topic363 ? {
      id: "topic-363",
      label: clean(topic363.title) || "363 — חמישה = המשיח",
      kind: "TOPIC",
      value: "363",
      href: "/topic/" + (clean(topic363.slug) || FZ1073_TOPIC_363_SLUG),
      reason: "ה־Topic החי שאליו מתחבר הרמז החזותי 363.",
      provenanceLabel: "topic_cards_public",
    } : {
      id: "number-363",
      label: "363",
      kind: "מספר",
      value: "363",
      href: "/2029/number/363",
      reason: "הרמז החזותי הראשי בפוסט.",
    },
    { id: "number-1073", label: "מספר הטיסה", kind: "מספר", value: "1073", href: "/2029/number/1073", reason: "מספר הטיסה והחיבור ל׳אשר בשמים ממעל׳." },
    { id: "topic-718", label: "718 — שביעי באוקטובר", kind: "טופיק", value: "718", href: "/topic/gapfill-718", reason: "הבית הקבוע של שביעי באוקטובר = חדשות = התשובה = 718.", provenanceLabel: "topic_cards_public" },
    { id: "topic-386", label: "386 — סנכרון · דוד בן ישי", kind: "טופיק", value: "386", href: "/topic/386-david-ben-yishai-tzipor", reason: "הבית הקבוע של סנכרון = דוד בן ישי = 386; כולל החיבור הנפרד לנתניהו = 683.", provenanceLabel: "topic_cards_public" },
    { id: "oct-710-post", label: "7.10 — דינים מתוקים", kind: "פוסט ישן", value: "710", href: oct710, reason: "פוסט קיים שמוקדש לרמז 7.10." },
    { id: "oct-war-post", label: "המלחמה שהחלה בשמחת תורה", kind: "פוסט ישן", href: simchatWar, reason: "פוסט קיים עם התג השביעי באוקטובר." },
    { id: "tiran-saudi-post", label: "טיראן וסנפיר → סעודיה", kind: "פוסט ישן", href: tiranSaudi, reason: "רמזים קודמים על סעודיה." },
    { id: "iran-saudi-post", label: "איראן וערב הסעודית", kind: "פוסט ישן", href: iranSaudi, reason: "פוסט קודם על ציר סעודיה." },
  ];
  return {
    timelinePlacement: "after-media",
    media: {
      prominence: "primary",
      highlight: {
        src: videoSrc,
        poster,
        label: "סרטון הפוסט · נשמר 01.10.2026",
      },
    },
    connections,
    timeline: [
      {
        id: "fz1073-event",
        label: "אירוע טיסת FZ1073",
        date: "2026-09-30",
        temporalRole: "occurred",
        href,
        sourceLabel: "FZ1073",
        note: "האירוע שממנו מתחיל הפוסט.",
      },
      {
        id: "fz1073-published",
        label: "הפוסט פורסם",
        date: dateOnly(post?.date) || "2026-09-30",
        temporalRole: "published",
        href,
        sourceLabel: "SOD1820",
        note: "תאריך הפרסום של הפוסט.",
      },
      {
        id: "fz1073-video-saved",
        label: "סרטון הפוסט נשמר",
        date: "2026-10-01",
        temporalRole: "admitted",
        href: videoSrc,
        sourceLabel: "MEDIA",
        note: "הסרטון הקנוני שנשמר באחסון.",
      },
    ],
    trail: [{ id: "fz1073-post", label: "FZ1073", href, kind: "post", active: true }],
  };
}

async function fetchFz1073Topic363() {
  const { data, error } = await supabase
    .from("topic_cards_public")
    .select("slug,title")
    .eq("slug", FZ1073_TOPIC_363_SLUG)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data || null;
}


const BENNETT_SALT_REGIONS = Object.freeze([
  { id: "salt-78", heading: "הרמז המרכזי — מלח", label: "מלח · 78", primary: "מלח · 78", signals: ["חישוב מאומת", "עוגן מתוך האירוע"], number: 78, worldLabel: "פתח את 78" },
  { id: "bennett-631", heading: "בנט בתוך עץ הבחירות", label: "נפתלי בנט · 631", primary: "בנט · 631", signals: ["פוסט הבחירות", "יחידה קיימת בעץ"], number: 631, worldLabel: "פתח את 631" },
  { id: "salt-bread", heading: "מלח ולחם", label: "מלח = לחם", primary: "מלח = לחם = 78", signals: ["שוויון מספרי", "קריאה פרשנית"], number: 78, worldLabel: "פתח את 78" },
  { id: "dead-sea", heading: "ים המלח", label: "ים המלח · 133", primary: "ים המלח · 133", signals: ["פוסט קיים", "עומק נפרד"], number: 133, worldLabel: "פתח את 133" },
  { id: "salt-covenant", heading: "ברית מלח", label: "ברית מלח", primary: "ברית מלח · 690", signals: ["690", "756", "836"], number: 690, worldLabel: "פתח את 690" },
]);

function buildBennettSaltExperience(post) {
  const href = "/post/" + BENNETT_SALT_SLUG;
  return {
    media: {
      fullSource: {
        href: "https://www.mako.co.il/news-politics/2026_q3/Article-af2d728ffded0a1027.htm",
        label: "N12 · תיעוד האירוע והמקור המצולם",
        sourceUrl: "https://www.mako.co.il/news-politics/2026_q3/Article-af2d728ffded0a1027.htm",
        platformId: null,
      },
    },
    connections: [
      { id: "bennett-631", label: "נפתלי בנט", kind: "PERSON / POST", value: "631", href: "/sharshar-elections-redemption-hints-draft", reason: "631 כבר חי בפוסט הבחירות; כאן הוא נצרך כחיבור ולא נוצר מחדש.", provenanceLabel: "post:5107" },
      { id: "salt-78", label: "מלח", kind: "CONCEPT", value: "78", href: "/2029/number/78", reason: "המלח מופיע בתוך האירוע עצמו; 78 מאומת במנוע." },
      { id: "bread-78", label: "לחם", kind: "NUMBER", value: "78", href: "/2029/number/78", reason: "אותו ערך רגיל כמו מלח; המשמעות פרשנית." },
      { id: "dead-sea-133", label: "ים המלח", kind: "POST", value: "133", href: "/yam-hamelach-tiferet-geula", reason: "פוסט עצמאי קיים בעץ, מוצג כאן כחיבור עומק.", provenanceLabel: "post:5109" },
      { id: "brit-melach-690", label: "ברית מלח", kind: "SOURCE / NUMBER", value: "690", href: "/2029/number/690", reason: "מונח מקראי וחישוב מאומת; ההקשר לאירוע נשאר פרשני." },
      { id: "brit-melach-olam-836", label: "ברית מלח עולם", kind: "SOURCE / NUMBER", value: "836", href: "/2029/number/836", reason: "עומק מקראי נוסף סביב מושג המלח." },
    ],
    timeline: [
      { id: "dead-sea-post", label: "פורסם פוסט ים המלח", date: "2026-09-22", temporalRole: "published", href: "/yam-hamelach-tiferet-geula", sourceLabel: "POST", note: "פוסט קיים ונפרד בעץ." },
      { id: "bennett-salt-event", label: "אירוע המלחיות בבני ברק", date: "2026-09-24", temporalRole: "occurred", href: "https://www.mako.co.il/news-politics/2026_q3/Article-af2d728ffded0a1027.htm", sourceLabel: "N12 / TOI", note: "הציר מציג סדר כרונולוגי בלבד, ללא טענת סיבתיות." },
      { id: "bennett-salt-golden", label: "Golden 2029 פורסם", date: dateOnly(post?.date) || "2026-10-01", temporalRole: "published", href, sourceLabel: "POST", note: "תאריך פרסום ה־Golden החדש." },
    ],
    trail: [
      { id: "bennett-post", label: "בנט", href, kind: "post", active: false },
      { id: "bennett-631", label: "631", href: "/2029/number/631", kind: "number", active: false },
      { id: "salt-78", label: "מלח", href: "/2029/number/78", kind: "concept", active: true },
    ],
  };
}

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

async function verifyBennettSaltFocus() {
  const { data, error } = await supabase.rpc("fn_method_value", {
    p_method_key: "רגיל",
    p_phrase: "מלח",
  });
  const value = Number(data);
  return {
    verified: !error && value === 78,
    value: Number.isSafeInteger(value) ? value : null,
    method: "רגיל",
  };
}

async function fetchPrivateGoldenStage(slug) {
  if (slug !== GOLDEN_SLUG) return null;
  // Existing Research Intake owner is the private pre-publication home. RLS exposes this
  // row only to authenticated admins; anon gets zero rows. Once published, Posts is the
  // sole public Publication identity and this fallback is no longer needed.
  const { data, error } = await supabase.rpc("admin_research_feed", {
    p_status: "candidate",
    p_kind: "observation",
    p_limit: 200,
  });
  if (error) return null;
  const dataRow = (data || []).find((row) =>
    row?.privacy_scope === "private"
    && row?.meta?.checkpoint_key === "sod-hashmal-sukkot-5787-source-root"
  ) || null;
  if (!dataRow?.meta?.staged_post) return null;
  const staged = dataRow.meta.staged_post;
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
    _sourceRootId: dataRow.id,
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
  const privateStage = publicPost ? null : await fetchPrivateGoldenStage(slug);
  const previewSnapshot = !publicPost && !privateStage && slug === GOLDEN_SLUG ? POST2029_PREVIEW_SNAPSHOT : null;
  const post = publicPost || privateStage || previewSnapshot;
  if (!post) return null;

  const isGolden = post.slug === GOLDEN_SLUG;
  const isFz1073Pilot = post.slug === FZ1073_SLUG;
  const isBennettSaltPilot = post.slug === BENNETT_SALT_SLUG;
  const yearVerification = isGolden ? await verifyTashpaz() : null;
  const bennettSaltVerification = isBennettSaltPilot ? await verifyBennettSaltFocus() : null;
  const topic363 = isFz1073Pilot ? await fetchFz1073Topic363() : null;
  const presentationPost = isFz1073Pilot
    ? {
        ...post,
        content: markFz1073RegionHeadings(post.content),
        _experience: buildFz1073Experience(post, topic363),
      }
    : isBennettSaltPilot
      ? {
          ...post,
          content: markBennettContextualNumberFocus(post.content, bennettSaltVerification),
          _experience: buildBennettSaltExperience(post),
        }
      : post;
  const regions = (isGolden
    ? GOLDEN_REGIONS
    : isFz1073Pilot
      ? FZ1073_REGIONS
      : isBennettSaltPilot
        ? BENNETT_SALT_REGIONS
        : defaultRegionsFromSource(presentationPost.content)).map((region) => ({
        ...region,
        verification: region.number === 787 && isGolden
          ? yearVerification
          : isBennettSaltPilot && region.id === BENNETT_CONTEXTUAL_NUMBER_FOCUS.regionId
            ? bennettSaltVerification
            : null,
        contextualNumberFocus: isBennettSaltPilot
          && region.id === BENNETT_CONTEXTUAL_NUMBER_FOCUS.regionId
          && bennettSaltVerification?.verified === true
          ? BENNETT_CONTEXTUAL_NUMBER_FOCUS
          : null,
      }));

  const projectedExperience = projectPost2029Experience(presentationPost);
  const experience = isGolden
    && !projectedExperience.media
    && projectedExperience.connections.length === 0
    && projectedExperience.timeline.length === 0
    && projectedExperience.trail.length === 0
      ? buildPost2029ArchitectureWireframe()
      : projectedExperience;

  return {
    version: "post-2029-reading-v1",
    post: presentationPost,
    identity: {
      type: "post",
      id: String(post.id),
      slug: post.slug,
      href: `/post/${post.slug}`,
    },
    sourceLine: isGolden
      ? "סוד החשמל · גליון חג הסוכות · „תשית לראשו עטרת פז”"
      : isFz1073Pilot
        ? "תיעוד אירוע · Flydubai FZ1073"
        : isBennettSaltPilot
          ? "תיעוד אירוע · בני ברק · 24.09.2026"
          : clean(post.author) || "מקור הפוסט",
    sourceLabel: isFz1073Pilot ? "FZ1073 · תיעוד אירוע" : isBennettSaltPilot ? "בנט × מלח · Golden 2029" : clean(post.author) || "מקור הפוסט",
    excerpt: clean(post.excerpt) || stripTags(post.content).slice(0, 220),
    regions,
    defaultRegionId: regions[0]?.id || null,
    golden: isGolden || isFz1073Pilot || isBennettSaltPilot,
    draft: post._privateStage === true || (Array.isArray(post.tags) && post.tags.includes("טיוטה")),
    privateStage: post._privateStage === true,
    previewSnapshot: post._previewSnapshot === true,
    caveat: isGolden
      ? "המקור נשמר כלשונו. החיבורים בשוליים הם שכבת SOD1820 נפרדת."
      : isFz1073Pilot
        ? "הפוסט הוא מקור הסיפור. החיבורים בשוליים הם שכבת הקשר נפרדת; רמת רמז אינה ציון אמת."
        : isBennettSaltPilot
          ? "האירוע המתועד, החישובים והפרשנות נשמרים כשכבות נפרדות. אין כאן טענת סיבתיות או עמדה פוליטית."
          : "שכבת ההקשר אינה חלק מדברי המקור.",
    experience,
  };
}

export const post2029ReadingInternals = {
  stripTags,
  defaultRegionsFromSource,
  BENNETT_CONTEXTUAL_NUMBER_FOCUS,
  markBennettContextualNumberFocus,
  GOLDEN_REGIONS,
  FZ1073_SLUG,
  FZ1073_REGIONS,
  buildFz1073Experience,
  markFz1073RegionHeadings,
  BENNETT_SALT_SLUG,
  BENNETT_SALT_REGIONS,
  buildBennettSaltExperience,
};