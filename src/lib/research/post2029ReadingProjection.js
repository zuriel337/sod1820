import { getPostBySlug, supabase } from "../supabase.js";
import { POST2029_PREVIEW_SNAPSHOT } from "./post2029PreviewSnapshot.js";
import { canonicalFollowTopic } from "../followIdentity.js";
import { formatBilingualDate } from "./timeline2029.js";
import { buildPost2029ArchitectureWireframe, buildFollowSuggestions, projectPost2029Experience } from "./post2029ExperienceProjection.js";

const clean = (value) => value == null ? "" : String(value).trim();
const GOLDEN_SLUG = "remzei-geula-ai-sod-hashir";
const BENNETT_CONTEXTUAL_NUMBER_FOCUS = Object.freeze({
  expression: "נפתלי בנט",
  methodKey: "רגיל",
  resultValue: 631,
  regionId: "bennett-631",
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

function bilingualDateHtml(iso) {
  const d = formatBilingualDate(iso);
  return d ? `<span>${d.hebrew}</span> · <bdo dir="ltr">${d.gregorian}</bdo>` : iso;
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
        sourceLabel: null,
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
  {
    id: "elections-chain",
    heading: "הסיפור הזה ממשיך מפוסט הבחירות",
    label: "פוסט הבחירות · ציר 631",
    primary: "פוסט הבחירות → 631 → בנט",
    signals: ["מידע קודם", "אותו ציר"],
    worldLabel: "פתח את פוסט הבחירות",
  },
  {
    id: "bennett-631",
    heading: "631 — הציר המרכזי",
    label: "631 · בנט והבחירות",
    primary: "נפתלי בנט = הבחירות = מלך ישראל = 631",
    signals: ["3 שוויונות מאומתים", "ציר הבחירות"],
    number: 631,
    worldLabel: "פתח את 631",
  },
  {
    id: "dead-sea-chronology",
    heading: "כמה ימים קודם — ים המלח",
    label: "22.9 → 24.9",
    primary: "פוסט ים המלח → אירוע המלחיות",
    signals: ["קשר כרונולוגי", "ללא טענת סיבתיות"],
    worldLabel: "פתח את ים המלח",
  },
]);

function buildBennettGoldenBody(verification) {
  const verified = verification?.verified === true;
  const focusAttrs = (expression) => verified
    ? ` data-contextual-number-focus="true" data-focus-part="result" data-region-id="bennett-631" data-expression="${expression}" data-method="רגיל" data-result="631"`
    : "";

  return `
<section dir="rtl" class="sod29-bennett-golden-body">
  <section class="sod29-bennett-golden-section is-incident">
    <h2 data-source-heading="true">האירוע שתועד</h2>
    <p>ב־24.9.2026 תועד בבני ברק אירוע המלחיות שבו היה מעורב נפתלי בנט. התיעוד המצולם והדיווח המלא מופיעים באתר המקור, N12, בכרטיס שלמעלה.</p>
    <p>כאן אנחנו לא מוסיפים פרשנות לאירוע עצמו. אנחנו שואלים דבר אחד: מה קורה כשבודקים את השם.</p>
  </section>

  <section class="sod29-bennett-golden-section is-core">
    <h2 data-source-heading="true">631 — הציר המרכזי</h2>
    ${verified ? `
      <button type="button" class="sod29-gematria-value sod29-gematria-hero"${focusAttrs("נפתלי בנט")}>631</button>
      <div class="sod29-bennett-equalities" data-contextual-number-focus-group="true">
        <p>נפתלי בנט = <button type="button" class="sod29-gematria-value"${focusAttrs("נפתלי בנט")}>631</button></p>
        <p>הבחירות = <button type="button" class="sod29-gematria-value"${focusAttrs("הבחירות")}>631</button></p>
        <p>מלך ישראל = <button type="button" class="sod29-gematria-value"${focusAttrs("מלך ישראל")}>631</button></p>
      </div>
    ` : `<p class="sod29-state warn">החישוב הקנוני אינו זמין כרגע; השוויונות אינם מוצגים עד לאימות.</p>`}
    <p>את ציר 631 פתחנו בפוסט הבחירות. האירוע הזה מצטרף אליו: אותו מספר, אדם אחד נוסף. חיבורים נוספים סביב האירוע זמינים בהקשר הצדדי.</p>
  </section>
</section>`;
}

function buildBennettSaltExperience(post) {
  const href = "/post/" + BENNETT_SALT_SLUG;
  return {
    media: {
      // No embeddable canonical asset is resolvable from existing data: render a source card.
      sourceCard: {
        href: "https://www.mako.co.il/news-politics/2026_q3/Article-af2d728ffded0a1027.htm",
        outlet: "N12",
        title: "תיעוד אירוע המלחיות בבני ברק",
        date: "24.9.2026",
      },
      fullSource: {
        href: "https://www.mako.co.il/news-politics/2026_q3/Article-af2d728ffded0a1027.htm",
        label: "N12 · תיעוד האירוע והמקור המצולם",
        sourceUrl: "https://www.mako.co.il/news-politics/2026_q3/Article-af2d728ffded0a1027.htm",
        platformId: null,
      },
    },
    connections: [
      { id: "bennett-631", label: "נפתלי בנט", kind: "PERSON / POST", value: "631", href: "/sharshar-elections-redemption-hints-draft", reason: "631 כבר חי בפוסט הבחירות; כאן הוא נצרך כחיבור ולא נוצר מחדש.", provenanceLabel: "post:5107" },
      { id: "salt-78", label: "מלח", kind: "CONCEPT", value: "78", href: "/2029/number/78", reason: "המלח מופיע בתוך האירוע עצמו; 78 מאומת במנוע.", provenanceLabel: "מנוע גימטריה" },
      { id: "bread-78", label: "לחם", kind: "NUMBER", value: "78", href: "/2029/number/78", reason: "אותו ערך רגיל כמו מלח; המשמעות פרשנית." },
      { id: "dead-sea-133", label: "ים המלח", kind: "POST", value: "133", href: "/yam-hamelach-tiferet-geula", reason: "פוסט עצמאי קיים בעץ, מוצג כאן כחיבור עומק.", provenanceLabel: "post:5109" },
      { id: "brit-melach-690", label: "ברית מלח", kind: "SOURCE / NUMBER", value: "690", href: "/2029/number/690", reason: "מונח מקראי וחישוב מאומת; ההקשר לאירוע נשאר פרשני." },
      { id: "brit-melach-olam-836", label: "ברית מלח עולם", kind: "SOURCE / NUMBER", value: "836", href: "/2029/number/836", reason: "עומק מקראי נוסף סביב מושג המלח." },
    ],
    timeline: [
      { id: "dead-sea-post", label: "פורסם פוסט ים המלח", date: "2026-09-22", temporalRole: "published", href: "/yam-hamelach-tiferet-geula", sourceLabel: null, note: "פוסט קיים ונפרד באתר." },
      { id: "bennett-salt-event", label: "אירוע המלחיות בבני ברק", date: "2026-09-24", temporalRole: "occurred", href: "https://www.mako.co.il/news-politics/2026_q3/Article-af2d728ffded0a1027.htm", sourceLabel: "N12 · Times of Israel", note: "הציר מציג סדר כרונולוגי בלבד, ללא טענת סיבתיות." },
      { id: "bennett-salt-golden", label: "הפוסט פורסם", date: dateOnly(post?.date) || "2026-10-01", temporalRole: "published", href, current: true, sourceLabel: null, note: "תאריך הפרסום של הפוסט." },
    ],
    // CHAIN_AUTOMATION = FIXTURE/HARDCODED: trail is declared here, not derived from relation data.
    trail: [
      { id: "elections-post", label: "פוסט הבחירות", href: "/sharshar-elections-redemption-hints-draft", kind: "post", active: false },
      { id: "bennett-631", label: "631", href: "/2029/number/631", kind: "number", active: false },
      { id: "bennett-post", label: "בנט", href, kind: "post", active: true },
    ],
  };
}

// ---- Golden #4 · Post 5116 "from the seventh to the tenth" (7.10 chain) ----
// Presentation over existing identities only: Post (posts), numbers (/2029/number/N), canonical
// source video + video_transcripts (shared media/language path), Follow (subscription_funnel_law).
// Main spine is curated navigation; side branches are bounded. Prominence is NOT a truth claim.
const SEVENTH_TENTH_SLUG = "seventh-to-tenth-sefirot-2027";
const POST_HREF = (encodedSlug) => "/post/" + encodedSlug;
const SEVENTH_TENTH_CHAIN = Object.freeze({
  hub233: { id: "post-233", postId: 233, label: "רמזי 7.10 · המרכז", href: POST_HREF("%d7%a8%d7%9e%d7%96%d7%99-%d7%92%d7%90%d7%95%d7%9c%d7%94-%d7%97%d7%a0%d7%95%d7%9b%d7%94-%d7%aa%d7%a9%d7%a4%d7%92-%d7%a8%d7%9e%d7%96%d7%99-%d7%98%d7%a8%d7%90%d7%9e%d7%a4-%d7%97%d7%93%d7%a9") },
  bridge149: { id: "post-149", postId: 149, label: "7.10 — מן השביעי לעשירי", href: POST_HREF("%d7%a8%d7%9e%d7%96%d7%99%d7%9d-%d7%9e%d7%a0%d7%a4%d7%99%d7%9c%d7%aa-%d7%92%d7%9c-%d7%9e%d7%90%d7%99%d7%a8-%d7%90%d7%99%d7%96%d7%a0%d7%a7%d7%95%d7%98") },
  depth5109: { id: "post-5109", postId: 5109, label: "ים המלח, תפארת ומפת עשר הספירות", href: "/post/yam-hamelach-tiferet-geula" },
  side87: { id: "post-87", postId: 87, label: "גלרית 7.10 = נסתר", href: POST_HREF("%d7%92%d7%9c%d7%a8%d7%99%d7%aa-7-10-%d7%a0%d7%a1%d7%aa%d7%a8") },
  side108: { id: "post-108", postId: 108, label: "גלרית 878 · עולם הפוך · 360", href: POST_HREF("%d7%97%d7%93%d7%a9-%d7%92%d7%9c%d7%a8%d7%99%d7%aa-36-878-%d7%a2%d7%95%d7%9c%d7%9d-%d7%94%d7%a4%d7%95%d7%9a-%d7%a8%d7%90%d7%99%d7%aa%d7%99-%d7%9e%d7%a9%d7%99%d7%97") },
});
// Context Rail boundedness (Post Kit): at most CONTEXT_RAIL_MAX findings, deterministic per active reading region.
// Full experience.connections stays intact for other projections; this only selects the rail projection.
const CONTEXT_RAIL_MAX = 6;
const SEVENTH_TENTH_RAIL_PRIORITY = Object.freeze({
  "source-1": ["post-149", "number-710", "number-10", "sefira-keter", "sefira-chokhmah", "sefira-binah", "number-7"],
  "source-2": ["post-5109", "sefira-tiferet", "sefira-keter", "sefira-chokhmah", "sefira-binah", "post-233", "post-149"],
});
function selectContextRailConnections(connections = [], { slug = null, regionId = null } = {}) {
  const list = Array.isArray(connections) ? connections : [];
  if (slug !== SEVENTH_TENTH_SLUG) return list.slice(0, CONTEXT_RAIL_MAX);
  const order = SEVENTH_TENTH_RAIL_PRIORITY[regionId] || SEVENTH_TENTH_RAIL_PRIORITY["source-1"];
  const byId = new Map(list.map((c) => [c.id, c]));
  const picked = [];
  for (const id of order) if (byId.has(id) && picked.length < CONTEXT_RAIL_MAX) picked.push(byId.get(id));
  for (const c of list) if (picked.length < CONTEXT_RAIL_MAX && !picked.includes(c)) picked.push(c);
  return picked;
}

// Follow subjects the existing server resolver (canonical_follow_subject -> resolve_topics -> dispatch)
// can already resolve. Mirrors the server list; anything else is a reported GAP, never a faked control.
const FOLLOW_RESOLVABLE_ENTITY_TYPES = Object.freeze(["number", "author", "category", "cipher_feed", "reality_stream", "media_channel", "channel"]);
// Recommendation-led, bounded (<=4): author first, then category, then 710 as the deeper/contextual number.
// Bare 7 / 10 are too broad and noisy to follow. Consent is explicit (WatchButton click); nothing auto-follows.
const SEVENTH_TENTH_FOLLOW = Object.freeze(buildFollowSuggestions({
  author: "מדריך לריפוי 10 הספירות",
  category: "מימד חמש",
  numbers: ["710"],
}));
const SEVENTH_TENTH_FOLLOW_GAPS = Object.freeze([
  { kind: "post", reason: "canonical_follow_subject has no post identity; no delivery semantics to prove" },
  { kind: "event", reason: "canonical_follow_subject has no event identity" },
  { kind: "concept", reason: "no stable concept (sefirot) identity in the follow resolver" },
  { kind: "timed_translation_vtt", reason: "only the Hebrew timed caption (captions/he.vtt) is published; timed VTT for en/ar/es/fr/ru/pt/de does not exist yet" },
  { kind: "chain", reason: "no chain identity in the follow resolver" },
]);

function extractSourceVideo(content = "") {
  const html = String(content || "");
  const key = (html.match(/data-video-key=["']([^"']+)["']/i) || [])[1] || null;
  const video = (html.match(/<video\b[^>]*>/i) || [])[0] || "";
  const poster = (video.match(/poster=["']([^"']+)["']/i) || [])[1] || null;
  const src = (html.match(/<source\b[^>]*\bsrc=["']([^"']+)["']/i) || [])[1] || null;
  const videoBlock = (html.match(/<video\b[\s\S]*?<\/video>/i) || [])[0] || "";
  const captionTracks = [...videoBlock.matchAll(/<track\b[^>]*>/gi)].map((m) => {
    const tag = m[0];
    const attr = (n) => (tag.match(new RegExp(`\\b${n}=["']([^"']+)["']`, "i")) || [])[1] || null;
    return { srclang: attr("srclang"), src: attr("src"), label: attr("label"), isDefault: /\sdefault\b/i.test(tag) };
  }).filter((t) => t.srclang === "he" && t.src);
  return key && src ? { videoKey: key, src, poster, captionTracks } : null;
}

// The video leaves the body: media renders through PostEvidenceMedia2029 (canonical he.vtt caption track
// extracted into media.captionTracks) and VideoTranscript (video_transcripts text languages). Source text is otherwise unchanged.
function prepareSeventhTenthContent(content = "") {
  let html = String(content || "").replace(/<video\b[\s\S]*?<\/video>/gi, "");
  html = html.replace(/<h2\b([^>]*)>/gi, (m, attrs) => /data-source-heading/.test(attrs) ? m : `<h2${attrs} data-source-heading="true">`);
  return html;
}

function buildSeventhTenthExperience(post) {
  const c = SEVENTH_TENTH_CHAIN;
  const source = extractSourceVideo(post?.content);
  const spine = (item, reason) => ({ id: item.id, label: item.label, kind: "POST · ציר ראשי", relation: "main_spine", href: item.href, reason, provenanceLabel: "post:" + item.postId, truthState: "navigation" });
  const side = (item, value, reason) => ({ id: item.id, label: item.label, kind: "POST · ענף צדדי", relation: "side_branch", value, href: item.href, reason, provenanceLabel: "post:" + item.postId, truthState: "navigation" });
  const num = (n, reason) => ({ id: "number-" + n, label: String(n), kind: "NUMBER", relation: "topic", value: String(n), href: "/2029/number/" + n, reason, provenanceLabel: "post:5116", truthState: "source_stated" });
  const sefira = (id, label, reason, provenanceLabel) => ({ id, label, kind: "CONCEPT · ספירה", relation: "topic", href: null, reason, provenanceLabel, truthState: "source_stated" });
  return {
    media: source ? {
      highlight: { src: source.src, poster: source.poster, label: "הסרטון המקורי · מדריך לריפוי 10 הספירות", sourceIdentity: source.videoKey },
      fullSource: { href: source.src, label: "לצפייה בסרטון המלא", platformId: source.videoKey },
      videoKey: source.videoKey,
      captionTracks: source.captionTracks,
    } : null,
    connections: [
      spine(c.hub233, "מרכז ציר 7.10 באתר; הפוסט הנוכחי ממשיך אותו."),
      spine(c.bridge149, "הפוסט עצמו מפנה אליו כהמשך הציר."),
      spine(c.depth5109, "הפוסט עצמו מפנה אליו כהעמקה: ים המלח, תפארת ומפת עשר הספירות."),
      side(c.side87, "710", "הפוסט הזה מצמיד 7.10 לנסתר; חיבור ניווט, לא הוכחה."),
      side(c.side108, "878", "ענף צדדי: עולם הפוך, 878 ו־360; חיבור ניווט בלבד."),
      num(7, "השביעי — כפי שנאמר בסרטון ובכותרת הפוסט."),
      num(10, "העשירי — כפי שנאמר בסרטון ובכותרת הפוסט."),
      num(710, "7.10 כציר; ניווט אל המספר, ללא טענת סיבתיות."),
      sefira("sefira-keter", "כתר", "מוזכרת בטקסט המקור.", "post:5116"),
      sefira("sefira-chokhmah", "חכמה", "מוזכרת בטקסט המקור.", "post:5116"),
      sefira("sefira-binah", "בינה", "מוזכרת בטקסט המקור.", "post:5116"),
      sefira("sefira-tiferet", "תפארת", "מופיעה בפוסט ההעמקה המקושר, לא בטקסט הזה.", "post:5109"),
    ],
    timeline: [
      { id: "seventh-tenth-published", label: "הפוסט פורסם", date: dateOnly(post?.date) || "2026-10-06", temporalRole: "published", href: "/post/" + SEVENTH_TENTH_SLUG, current: true, sourceLabel: null, note: "תאריך הפרסום של הפוסט." },
    ],
    trail: [
      { id: c.hub233.id, label: "7.10 · המרכז", href: c.hub233.href, kind: "post", active: false },
      { id: c.bridge149.id, label: "מן השביעי לעשירי (7.10)", href: c.bridge149.href, kind: "post", active: false },
      { id: "post-5116", label: "הפוסט הזה", href: "/post/" + SEVENTH_TENTH_SLUG, kind: "post", active: true },
      { id: c.depth5109.id, label: "ים המלח · תפארת", href: c.depth5109.href, kind: "post", active: false },
    ],
    follow: SEVENTH_TENTH_FOLLOW.map((f) => ({ ...f })),
    followGaps: SEVENTH_TENTH_FOLLOW_GAPS,
  };
}

// ---- Golden #3 · elections chain (631 parent of the Bennett continuation) ----
// Presentation over the existing Post identity. The source HTML is preserved; we only
// (a) tag the big-number paragraphs as reading regions, (b) turn engine-verified equalities
// into Contextual Sidecar triggers, (c) add a link card exposing the 631 -> Bennett relation.
const ELECTIONS_SLUG = "sharshar-elections-redemption-hints-draft";
const ELECTIONS_EQUALITIES = Object.freeze([
  { phrase: "הבחירות", value: 631, regionId: "elections-631" },
  { phrase: "מלך ישראל", value: 631, regionId: "elections-631" },
  { phrase: "עופר וינטר", value: 631, regionId: "elections-631" },
  { phrase: "נפתלי בנט", value: 631, regionId: "elections-631" },
  { phrase: "נס נתניהו", value: 631, regionId: "elections-631" },
  { phrase: "הריון", value: 271, regionId: "elections-271" },
  { phrase: "חכמה", value: 271, regionId: "elections-271" },
  { phrase: "יהוה", value: 26, regionId: "elections-26" },
  { phrase: "בן דוד", value: 66, regionId: "elections-66" },
]);
const ELECTIONS_REGIONS = Object.freeze([
  { id: "elections-631", heading: "631", label: "631 · הציר המרכזי", primary: "הבחירות = מלך ישראל = נפתלי בנט = 631", signals: ["5 שוויונות", "המשך: פוסט בנט"], number: 631, hero: true, worldLabel: "פתח את 631" },
  { id: "elections-271", heading: "271", label: "271 · הריון · חכמה", primary: "הריון = חכמה = 271", signals: ["27.10 → 2710 → 271"], number: 271, worldLabel: "פתח את 271" },
  { id: "elections-2701", heading: "2701", label: "2701 · בראשית א׳, א׳", primary: "בראשית א׳, א׳ = 2701", signals: ["הקשר מקראי"], number: 2701, worldLabel: "פתח את 2701" },
  { id: "elections-1820", heading: "1820", label: "1820 · המספר שמלווה את האתר", primary: "עופר וינטר · מילוי = 1820", signals: ["המספר של SOD1820"], number: 1820, worldLabel: "פתח את 1820" },
  { id: "elections-26", heading: "26", label: "26 · יהוה", primary: "יהוה = 26", signals: ["הכנסת ה־26"], number: 26, worldLabel: "פתח את 26" },
  { id: "elections-66", heading: "66", label: "66 · בן דוד", primary: "בן דוד = 66", signals: ["שישים ושש זוגות"], number: 66, worldLabel: "פתח את 66" },
]);

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function markElectionsChain(content = "", verification = null) {
  let html = String(content || "");
  if (html.includes('data-elections-chain="v1"')) return html;
  // Region anchors: the existing big-number paragraphs become source headings in place.
  for (const region of ELECTIONS_REGIONS) {
    const pattern = new RegExp("(<p\\b)([^>]*>)(\\s*" + escapeRegExp(region.heading) + "\\s*<\\/p>)", "i");
    html = html.replace(pattern, '$1 data-source-heading="true" data-elections-chain="v1"$2$3');
  }
  // Equal-gematria lines: only engine-verified equalities become sidecar triggers.
  const verified = new Set((verification?.rows || []).filter((row) => row.verified).map((row) => row.phrase));
  for (const eq of ELECTIONS_EQUALITIES) {
    if (!verified.has(eq.phrase)) continue;
    const pattern = new RegExp("(<p\\b[^>]*>\\s*)(" + escapeRegExp(eq.phrase) + ")\\s*=\\s*" + eq.value + "(\\s*<\\/p>)", "i");
    const button = `<button type="button" class="sod29-gematria-value" data-contextual-number-focus="true" data-focus-part="result" data-region-id="${eq.regionId}" data-expression="${eq.phrase}" data-method="רגיל" data-result="${eq.value}">${eq.value}</button>`;
    html = html.replace(pattern, `$1$2 = ${button}$3`);
  }
  // Parent relation: the 631 axis opened here continues in the Bennett post (link only, no copy).
  const card = `
<a class="sod29-post-part-card sod29-elections-continuation" data-elections-continuation="true" href="/post/${BENNETT_SALT_SLUG}">
  <span><small>הציר הזה ממשיך</small><br><strong>בנט בתוך ציר 631</strong><br><small>פוסט ההמשך מוסיף אירוע חדש לאותו ציר · המידע הקודם נשאר כאן</small></span>
  <b>פתח ←</b>
</a>`;
  return html.replace(/(נס נתניהו\s*=\s*(?:<button[\s\S]*?<\/button>|631)\s*<\/p>)/, `$1${card}`);
}

function buildElectionsExperience(post) {
  const href = "/post/" + ELECTIONS_SLUG;
  const bennettHref = "/post/" + BENNETT_SALT_SLUG;
  return {
    connections: [
      { id: "continuation-bennett", label: "בנט בתוך ציר 631", kind: "POST · המשך", value: "631", href: bennettHref, reason: "פוסט ההמשך של ציר 631: אירוע חדש מתחבר לציר שנפתח כאן.", provenanceLabel: "post:" + BENNETT_SALT_SLUG },
      { id: "number-631", label: "631", kind: "NUMBER", value: "631", href: "/2029/number/631", reason: "הציר המרכזי: הבחירות = מלך ישראל = נפתלי בנט." },
      { id: "number-271", label: "271 · 2701", kind: "NUMBER", value: "271", href: "/2029/number/271", reason: "27.10 → 2710 → 271; בראשית א׳, א׳ = 2701." },
      { id: "number-1820", label: "1820", kind: "NUMBER", value: "1820", href: "/2029/number/1820", reason: "המספר שמלווה את האתר; מילוי עופר וינטר." },
      { id: "number-26", label: "26", kind: "NUMBER", value: "26", href: "/2029/number/26", reason: "יהוה = 26 · הכנסת ה־26." },
      { id: "number-66", label: "66", kind: "NUMBER", value: "66", href: "/2029/number/66", reason: "בן דוד = 66." },
    ],
    timeline: [
      { id: "elections-published", label: "הפוסט פורסם", date: dateOnly(post?.date) || "2026-09-30", temporalRole: "published", href, current: true, sourceLabel: null, note: "תאריך הפרסום של פוסט הבחירות." },
      { id: "elections-bennett-continuation", label: "פוסט ההמשך: בנט בתוך ציר 631", date: "2026-10-01", temporalRole: "published", href: bennettHref, sourceLabel: null, note: "המשך לאותו ציר; ללא טענת סיבתיות." },
    ],
    trail: [
      { id: "elections-post", label: "פוסט הבחירות", href, kind: "post", active: true },
      { id: "elections-631", label: "631", href: "/2029/number/631", kind: "number", active: false },
      { id: "elections-bennett", label: "בנט", href: bennettHref, kind: "post", active: false },
    ],
  };
}

async function verifyElectionsEqualities() {
  const rows = await Promise.all(ELECTIONS_EQUALITIES.map(async ({ phrase, value }) => {
    const { data, error } = await supabase.rpc("fn_method_value", { p_method_key: "רגיל", p_phrase: phrase });
    return { phrase, value, verified: !error && Number(data) === value };
  }));
  return { verified: rows.every((row) => row.verified), method: "רגיל", rows };
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
  const phrases = ["נפתלי בנט", "הבחירות", "מלך ישראל"];
  const rows = await Promise.all(phrases.map(async (phrase) => {
    const { data, error } = await supabase.rpc("fn_method_value", {
      p_method_key: "רגיל",
      p_phrase: phrase,
    });
    const value = Number(data);
    return { phrase, value, verified: !error && value === 631 };
  }));
  return {
    verified: rows.every((row) => row.verified),
    value: rows.every((row) => row.verified) ? 631 : null,
    method: "רגיל",
    rows,
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
  const isElectionsChain = post.slug === ELECTIONS_SLUG;
  const isSeventhTenth = post.slug === SEVENTH_TENTH_SLUG;
  const electionsVerification = isElectionsChain ? await verifyElectionsEqualities() : null;
  const yearVerification = isGolden ? await verifyTashpaz() : null;
  const bennettSaltVerification = isBennettSaltPilot ? await verifyBennettSaltFocus() : null;
  const topic363 = isFz1073Pilot ? await fetchFz1073Topic363() : null;
  const presentationPost = isFz1073Pilot
    ? {
        ...post,
        content: markFz1073RegionHeadings(post.content),
        _experience: buildFz1073Experience(post, topic363),
      }
    : isElectionsChain
      ? {
          ...post,
          content: markElectionsChain(post.content, electionsVerification),
          _experience: buildElectionsExperience(post),
        }
    : isSeventhTenth
      ? {
          ...post,
          content: prepareSeventhTenthContent(post.content),
          _experience: buildSeventhTenthExperience(post),
        }
    : isBennettSaltPilot
      ? {
          ...post,
          title: "בנט בתוך ציר 631",
          excerpt: "אירוע חדש מתחבר לציר 631 שכבר הופיע בפוסט הבחירות: נפתלי בנט = הבחירות = מלך ישראל = 631. יומיים קודם פורסם פוסט ים המלח.",
          content: buildBennettGoldenBody(bennettSaltVerification),
          _experience: buildBennettSaltExperience(post),
        }
      : post;
  const regions = (isGolden
    ? GOLDEN_REGIONS
    : isFz1073Pilot
      ? FZ1073_REGIONS
      : isBennettSaltPilot
        ? BENNETT_SALT_REGIONS
        : isElectionsChain
          ? ELECTIONS_REGIONS
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
        : isElectionsChain
          ? "הבחירות לכנסת ה־26 · תחילת הרמזים"
        : isSeventhTenth
          ? "מדריך לריפוי 10 הספירות · ציר 7.10"
        : isBennettSaltPilot
          ? "תיעוד אירוע · בני ברק · 24.09.2026"
          : clean(post.author) || "מקור הפוסט",
    sourceLabel: isFz1073Pilot ? "FZ1073 · תיעוד אירוע" : isElectionsChain ? "הבחירות · ציר 631" : isBennettSaltPilot ? "בנט · ציר 631" : clean(post.author) || "מקור הפוסט",
    excerpt: clean(post.excerpt) || stripTags(post.content).slice(0, 220),
    regions,
    defaultRegionId: regions[0]?.id || null,
    golden: isGolden || isFz1073Pilot || isBennettSaltPilot || isElectionsChain || isSeventhTenth,
    draft: post._privateStage === true || (Array.isArray(post.tags) && post.tags.includes("טיוטה")),
    privateStage: post._privateStage === true,
    previewSnapshot: post._previewSnapshot === true,
    caveat: isGolden
      ? "המקור נשמר כלשונו. החיבורים בשוליים הם שכבת SOD1820 נפרדת."
      : isFz1073Pilot
        ? "הפוסט הוא מקור הסיפור. החיבורים בשוליים הם שכבת הקשר נפרדת; רמת רמז אינה ציון אמת."
        : isElectionsChain
          ? "המספרים והחישובים מוצגים כפי שהם. החיבורים בשוליים הם שכבת קריאה נפרדת; המשך הציר חי בפוסט נפרד."
        : isSeventhTenth
          ? "המסר על 2027 הוא דברי היוצר בסרטון, כפי שנאמרו. החיבורים בשוליים הם ניווט בלבד: גודלם או מיקומם אינם ציון אמת."
        : isBennettSaltPilot
          ? "האירוע המתועד, החישובים והפרשנות נשמרים כשכבות נפרדות. אין כאן טענת סיבתיות או עמדה פוליטית."
          : "שכבת ההקשר אינה חלק מדברי המקור.",
    experience,
  };
}

export { selectContextRailConnections, CONTEXT_RAIL_MAX };
export const post2029ReadingInternals = {
  selectContextRailConnections,
  CONTEXT_RAIL_MAX,
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
  buildBennettGoldenBody,
  SEVENTH_TENTH_SLUG,
  SEVENTH_TENTH_CHAIN,
  FOLLOW_RESOLVABLE_ENTITY_TYPES,
  extractSourceVideo,
  prepareSeventhTenthContent,
  buildSeventhTenthExperience,
  ELECTIONS_SLUG,
  ELECTIONS_EQUALITIES,
  ELECTIONS_REGIONS,
  markElectionsChain,
  buildElectionsExperience,
};