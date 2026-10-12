import { getPostBySlug, supabase } from "../supabase.js";
import { buildGoldenPostContextPack, goldenContextPackClaims } from "./goldenPostContextPacks.js";
import { createCanonicalNumberW2Executors } from "./researchW2Executors.js";
import { fetchLiveNumericRuleVersions } from "./numberSystemMethods.js";
import { POST2029_PREVIEW_SNAPSHOT } from "./post2029PreviewSnapshot.js";
import { formatBilingualDate } from "./timeline2029.js";
import { buildPost2029ArchitectureWireframe, projectPost2029Experience } from "./post2029ExperienceProjection.js";
import { isDocumentedIndiaCaptainPost } from "./topicSourceContext.js";

const clean = (value) => value == null ? "" : String(value).trim();

// Some WordPress Posts authored equalities as plain text with a colored value,
// before data-gem existed. Decorate only complete, explicit equality lines.
// Preserve their wording, colors and media; no association is engine-verified
// here. Each operand opens its own canonical Number calculation.
function markLegacyEqualityLines(content = "") {
  const operand = (text, numeric = false) => `<button type="button" class="${numeric ? "sod29-gematria-value" : "sod29-gematria-expression"}" data-gem="${text.trim().replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">${text.trim()}</button>`;
  const hebrew = '[א-ת][א-ת\\u0591-\\u05C7 ״׳"\\x27-]{0,70}';
  const forward = new RegExp('(^|>|\\n)(' + hebrew + ')\\s*=\\s*(<span\\b[^>]*>)?(\\d{1,9})(<\\/span>)?(?:\\s*=\\s*(' + hebrew + '))?(?=\\s*(?:<br\\b|<\\/(?:p|h[1-6]|div)>|$))', 'g');
  const reverse = new RegExp('(^|>|\\n)(\\d{1,9})\\s*=\\s*(' + hebrew + ')(?=\\s*(?:<br\\b|<\\/(?:p|h[1-6]|div)>|$))', 'g');
  return String(content).split(/(<(?:a|button|script|style|pre|code)\b[^>]*>[\s\S]*?<\/(?:a|button|script|style|pre|code)>)/gi).map((part, index) => index % 2 ? part : part
    .replace(forward, (match, start, phrase, span, number, endSpan, other) => `${start}${operand(phrase)} = ${span || ""}${operand(number, true)}${endSpan || ""}${other ? ` = ${operand(other)}` : ""}`)
    .replace(reverse, (match, start, number, phrase) => `${start}${operand(number, true)} = ${operand(phrase)}`)).join("");
}
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
    html = html.replace(/(<h[1-6]\b[^>]*)(>)([\s\S]*?)(<\/h[1-6]>)/gi, (match, open, separator, body, close) => {
      if (stripTags(body) !== region.heading || /data-source-heading\s*=/.test(open)) return match;
      // Annotate the attested heading in place, preserving its source markup (including <br>).
      return open + " data-source-heading=\"true\"" + separator + body + close;
    });
  }
  return html;
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
function buildFz1073Experience(post, topic363 = null) {
  const href = "/" + "post/" + FZ1073_SLUG;
  const videoSrc = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/video/2026/10/plane-14000-14-75/final-20261001-v4.mp4";
  const poster = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/image/2026/10/plane-14000-14-75/poster-final-20261001-v3.jpg";
  const oct710 = "/710-%d7%92%d7%99%d7%9e%d7%98%d7%a8%d7%99%d7%94-%d7%93%d7%99%d7%a0%d7%99%d7%9d-%d7%9e%d7%aa%d7%95%d7%a7%d7%99%d7%9d-%d7%94%d7%9e%d7%a8%d7%9e%d7%96-%d7%a2%d7%9c-7-10-%d7%a9%d7%91%d7%a9%d7%95%d7%a8/";
  const simchatWar = "/%d7%94%d7%9e%d7%9c%d7%97%d7%9e%d7%94-%d7%a9%d7%94%d7%97%d7%9c%d7%94-%d7%91%d7%90%d7%96%d7%95%d7%a8-%d7%a2%d7%96%d7%94-%d7%91%d7%99%d7%95%d7%9d-%d7%a9%d7%9e%d7%97%d7%aa-%d7%aa%d7%95%d7%a8%d7%94-%d7%aa/";
  const tiranSaudi = "/%d7%a8%d7%9e%d7%96%d7%99%d7%9d-%d7%9e%d7%94%d7%a2%d7%91%d7%a8%d7%aa-%d7%94%d7%90%d7%99%d7%99%d7%9d-%d7%94%d7%9e%d7%a6%d7%a8%d7%99%d7%9d-%d7%98%d7%99%d7%a8%d7%90%d7%9f-%d7%95%d7%a1%d7%a0%d7%a4%d7%99/";
  const iranSaudi = "/סכסוך-בין-איראן-לערב-הסעודית-לפני-הגאו";
  const connections = [
    ...(isDocumentedIndiaCaptainPost(post) ? [{
      id: "topic-india-source", label: "הציר ההודי · קפטן סמיט מאצ׳הר", kind: "טופיק",
      href: "/topic/india-axis#topic-source-media-post-5112-source-region-smit-machchhar",
      reason: "במקור המצולם הקפטן מתואר כאזרח הודי. מכאן אפשר לפתוח את אותה תמונה בתוך הציר ההודי.",
      provenanceLabel: "posts:5112 · מקור מצולם",
    }] : []),
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

// Reopen declared connections in the existing 2029 readers. A historical path is
// not a new Post identity: resolve it through the current access-controlled reader.
export async function resolvePostExperienceConnections(experience, { readPost = getPostBySlug, readTopic = async (slug) => {
  const { data, error } = await supabase.from("topic_cards_public").select("slug,title").eq("slug", slug).maybeSingle();
  return error ? null : data;
} } = {}) {
  const connections = await Promise.all((experience?.connections || []).map(async (connection) => {
    const unavailable = () => ({ ...connection, href: null });
    const rawHref = clean(connection.href);
    const sourceLocator = rawHref === "/topic/india-axis#topic-source-media-post-5112-source-region-smit-machchhar" ? rawHref.slice(rawHref.indexOf("#")) : "";
    const href = sourceLocator ? rawHref.slice(0, rawHref.indexOf("#")) : rawHref;
    if (/^\/2029\/number\/\d+$/.test(href)) return connection;
    // Never turn an external URL, malformed path or arbitrary route into a Post.
    if (!href.startsWith("/") || href.startsWith("//") || /[?#]/.test(href)) return unavailable();
    const parts = href.split("/").filter(Boolean);
    try {
      if (parts.length === 2 && parts[0] === "topic") {
        const topic = await readTopic(decodeURIComponent(parts[1]));
        const locator = sourceLocator;
        return topic?.slug ? { ...connection, href: `/topic/${encodeURIComponent(topic.slug)}${locator}` } : unavailable();
      }
      const slug = parts.length === 2 && parts[0] === "post" ? parts[1]
        : parts.length === 1 && !["world", "els", "heichal", "books", "2029"].includes(parts[0]) ? parts[0] : null;
      if (!slug) return unavailable();
      decodeURIComponent(slug); // Validate before invoking the existing reader.
      const post = await readPost(slug);
      return post?.id && post?.slug
        ? { ...connection, href: `/post/${encodeURIComponent(post.slug)}` }
        : unavailable();
    } catch { return unavailable(); }
  }));
  return { ...experience, connections };
}


const BENNETT_SALT_REGIONS = Object.freeze([
  {
    id: "elections-chain",
    heading: "האירוע שתועד",
    label: "בנט · האירוע שתועד",
    primary: "נפתלי בנט · אירוע המלחיות בבני ברק",
    signals: ["תיעוד המקור", "המשך לציר הבחירות"],
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
    heading: "ים המלח",
    label: "22.9 → 24.9",
    primary: "פוסט ים המלח → אירוע המלחיות",
    signals: ["קשר כרונולוגי", "ללא טענת סיבתיות"],
    worldLabel: "פתח את ים המלח",
  },
]);

function buildBennettGoldenBody(verification, originalContent = "") {
  const verified = verification?.verified === true;
  const focusAttrs = (expression, part = "result") => verified
    ? ` data-contextual-number-focus="true" data-focus-part="${part}" data-region-id="bennett-631" data-expression="${expression}" data-method="רגיל" data-result="631"`
    : "";

  // The short reading composition must not replace the authored Post. Its
  // complete source stays available here; historical result attributes are
  // treated as source claims, not as live engine verification.
  const original = String(originalContent).replace(/<button\b([^>]*)>/gi, (match, attrs) => {
    const expression = attrs.match(/data-expression="([^"]+)"/)?.[1];
    if (!expression) return match;
    return `<button${attrs.replace(/\sdata-contextual-number-focus="true"/g, "")} data-gem="${expression}">`;
  }).replace(/(<p\b[^>]*class="[^"]*sod29-gematria-line[^"]*"[^>]*>)([^<]+?)\s*=\s*(<button\b[^>]*data-gem="([^"]+)"[^>]*>)/g,
    (match, open, phrase, button, expression) => stripTags(phrase) === expression
      ? `${open}<button type="button" class="sod29-gematria-expression" data-gem="${expression}">${phrase.trim()}</button> = ${button}`
      : match);
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
      <div class="sod29-bennett-equalities" data-contextual-number-focus-group="true">
        <p><button type="button" class="sod29-gematria-expression"${focusAttrs("נפתלי בנט", "expression")}>נפתלי בנט</button> = <button type="button" class="sod29-gematria-value"${focusAttrs("נפתלי בנט")}>631</button></p>
        <p><button type="button" class="sod29-gematria-expression"${focusAttrs("הבחירות", "expression")}>הבחירות</button> = <button type="button" class="sod29-gematria-value"${focusAttrs("הבחירות")}>631</button></p>
        <p><button type="button" class="sod29-gematria-expression"${focusAttrs("מלך ישראל", "expression")}>מלך ישראל</button> = <button type="button" class="sod29-gematria-value"${focusAttrs("מלך ישראל")}>631</button></p>
      </div>
    ` : `<p class="sod29-state warn">החישוב הקנוני אינו זמין כרגע; השוויונות אינם מוצגים עד לאימות.</p>`}
    <p>את ציר 631 פתחנו בפוסט הבחירות. האירוע הזה מצטרף אליו: אותו מספר, אדם אחד נוסף. חיבורים נוספים סביב האירוע זמינים בהקשר הצדדי.</p>
  </section>
  ${original ? `<details class="sod29-original-post"><summary>הפוסט המלא · מלח, ברית מלח והחיבורים הנוספים</summary><div class="sod29-original-post-body">${original}</div></details>` : ""}
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
      { id: "bennett-631", label: "פוסט הבחירות · ציר 631", kind: "POST", value: "631", href: "/post/sharshar-elections-redemption-hints-draft", reason: "כאן נפתח ציר 631; פוסט בנט הוא המשך שלו. פתחו את הפוסט כדי לקרוא את החישובים ואת החיבורים המקוריים.", provenanceLabel: "post:5107" },
      { id: "salt-78", label: "מלח", kind: "CONCEPT", value: "78", href: "/2029/number/78", reason: "המלח מופיע בתוך האירוע עצמו; 78 מאומת במנוע.", provenanceLabel: "מנוע גימטריה" },
      { id: "bread-78", label: "לחם", kind: "NUMBER", value: "78", href: "/2029/number/78", reason: "אותו ערך רגיל כמו מלח; המשמעות פרשנית." },
      { id: "dead-sea-133", label: "ים המלח", kind: "POST", value: "133", href: "/post/yam-hamelach-tiferet-geula", reason: "פוסט עצמאי קיים בעץ, מוצג כאן כחיבור עומק.", provenanceLabel: "post:5109" },
      { id: "brit-melach-690", label: "ברית מלח", kind: "SOURCE / NUMBER", value: "690", href: "/2029/number/690", reason: "מונח מקראי וחישוב מאומת; ההקשר לאירוע נשאר פרשני." },
      { id: "brit-melach-olam-836", label: "ברית מלח עולם", kind: "SOURCE / NUMBER", value: "836", href: "/2029/number/836", reason: "עומק מקראי נוסף סביב מושג המלח." },
    ],
    timeline: [
      { id: "dead-sea-post", label: "פורסם פוסט ים המלח", date: "2026-09-22", temporalRole: "published", href: "/post/yam-hamelach-tiferet-geula", sourceLabel: null, note: "פוסט קיים ונפרד באתר." },
      { id: "bennett-salt-event", label: "אירוע המלחיות בבני ברק", date: "2026-09-24", temporalRole: "occurred", href: "https://www.mako.co.il/news-politics/2026_q3/Article-af2d728ffded0a1027.htm", sourceLabel: "N12 · Times of Israel", note: "הציר מציג סדר כרונולוגי בלבד, ללא טענת סיבתיות." },
      { id: "bennett-salt-golden", label: "הפוסט פורסם", date: dateOnly(post?.date) || "2026-10-01", temporalRole: "published", href, current: true, sourceLabel: null, note: "תאריך הפרסום של הפוסט." },
    ],
    // CHAIN_AUTOMATION = FIXTURE/HARDCODED: trail is declared here, not derived from relation data.
    trail: [
      { id: "elections-post", label: "פוסט הבחירות", href: "/post/sharshar-elections-redemption-hints-draft", kind: "post", active: false },
      { id: "bennett-631", label: "631", href: "/2029/number/631", kind: "number", active: false },
      { id: "bennett-post", label: "בנט", href, kind: "post", active: true },
    ],
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
  { phrase: "מזל", value: 77, regionId: "elections-77" },
]);
const ELECTIONS_REGIONS = Object.freeze([
  { id: "elections-26", heading: "26", label: "26 · יהוה", primary: "יהוה = 26", signals: ["הכנסת ה־26"], number: 26, worldLabel: "פתח את 26" },
  { id: "elections-271", heading: "271", label: "271 · הריון · חכמה", primary: "הריון = חכמה = 271", signals: ["27.10 → 2710 → 271"], number: 271, worldLabel: "פתח את 271" },
  { id: "elections-2701", heading: "2701", label: "2701 · בראשית א׳, א׳", primary: "בראשית א׳, א׳ = 2701", signals: ["הקשר מקראי"], number: 2701, worldLabel: "פתח את 2701" },
  { id: "elections-1820", heading: "1820", label: "1820 · המספר שמלווה את האתר", primary: "עופר וינטר · מילוי = 1820", signals: ["המספר של SOD1820"], number: 1820, worldLabel: "פתח את 1820" },
  { id: "elections-631", heading: "631", label: "631 · הציר המרכזי", primary: "הבחירות = מלך ישראל = נפתלי בנט = 631", signals: ["5 שוויונות", "המשך: פוסט בנט"], number: 631, hero: true, worldLabel: "פתח את 631" },
  { id: "elections-66", heading: "66", label: "שרשר · נעליים · בן דוד = 66", primary: "בן דוד = 66", signals: ["שישים ושש זוגות"], number: 66, worldLabel: "פתח את 66" },
  { id: "elections-77", heading: "נתניהו בן 77 — מזל ופרשת בראשית", label: "77 · מזל · פרשת בראשית", primary: "מזל = 77", signals: ["יום ההולדת העברי", "מקורות בתוך הפוסט"], number: 77, worldLabel: "פתח את 77" },
]);

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function markElectionsChain(content = "", verification = null) {
  let html = String(content || "");
  if (html.includes('data-elections-chain="v1"')) return html;
  // Region anchors: the existing big-number paragraphs become source headings in place.
  for (const region of ELECTIONS_REGIONS) {
    const pattern = new RegExp("(<p\\b)([^>]*>)(\\s*" + escapeRegExp(region.heading) + "\\s*<\\/p>)", "i");
    html = html.replace(pattern, '$1 data-source-heading="true" data-elections-chain="v1" data-gem="' + region.number + '"$2$3');
  }
  html = html.replace(/(<h2\b)([^>]*>נתניהו בן 77 — מזל ופרשת בראשית<\/h2>)/, '$1 data-source-heading="true"$2');
  // Equal-gematria lines: only engine-verified equalities become sidecar triggers.
  const verified = new Set((verification?.rows || []).filter((row) => row.verified).map((row) => row.phrase));
  for (const eq of ELECTIONS_EQUALITIES) {
    const attrs = (part) => verified.has(eq.phrase)
      ? `data-contextual-number-focus="true" data-focus-part="${part}" data-region-id="${eq.regionId}" data-expression="${eq.phrase}" data-method="רגיל" data-result="${eq.value}"`
      : `data-gem="${part === "expression" ? eq.phrase : eq.value}"`;
    // Only the explicit equalities already authored here are decorated. An
    // unverified source claim opens each operand independently; it never seeds
    // its claimed result into the phrase's canonical calculation.
    html = html.replace(/(<p\b[^>]*>)([\s\S]*?)(<\/p>)/gi, (match, open, body, close) => {
      if (stripTags(body) !== `${eq.phrase} = ${eq.value}` || /<(?:button|img|video|iframe)\b/i.test(body)) return match;
      const phrase = `<button type="button" class="sod29-gematria-expression" ${attrs("expression")}>${eq.phrase}</button>`;
      const value = `<button type="button" class="sod29-gematria-value" ${attrs("result")}>${eq.value}</button>`;
      return `${open.replace(/>$/, ' class="sod29-post-equality">')}${phrase} = ${value}${close}`;
    });
  }
  // Parent relation: the 631 axis opened here continues in the Bennett post (link only, no copy).
  const card = `
<a class="sod29-post-part-card sod29-elections-continuation" data-elections-continuation="true" href="/post/${BENNETT_SALT_SLUG}">
  <span><small>הציר הזה ממשיך</small><br><strong>בנט בתוך ציר 631</strong><br><small>פוסט ההמשך מוסיף אירוע חדש לאותו ציר · המידע הקודם נשאר כאן</small></span>
  <b>פתח ←</b>
</a>`;
  html = html.replace(/(נס נתניהו(?:<\/button>)?\s*=\s*(?:<button[\s\S]*?<\/button>|631)\s*<\/p>)/, `$1${card}`);
  // Reading order is the authored order: יהוה = 26 and the date first, then 631, then the people units.
  return html.replace(/<section\b/, '<section class="sod29-elections-reading-body"');
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
      // Existing source handoff bdb7caba + verified public Posts, oldest publication first.
      {"id":"elections-history-1222","label":"הבחירות בארה״ב · 1237","kind":"מהארכיון · פורסם 29.06.2016","href":"/post/9495-2","reason":"הפוסט הישן מחבר את טראמפ לציר 1237. כאן 1237 הוא סף צירי המפלגה למינוי המועמד, ולא מספר אלקטורים.","provenanceLabel":"post:1222"},
      {"id":"elections-history-1182","label":"טראמפ בכותל · 424","kind":"מהארכיון · פורסם 23.05.2017","href":"/post/רמזים-מדהימים-על-ביקור-טראמפ-בישראל","reason":"תיעוד הביקור בישראל והחיבור ל־424. זהו אירוע מ־2017, שאליו חוזרים גם בפרסומים מאוחרים.","provenanceLabel":"post:1182"},
      {"id":"elections-history-1129","label":"נתניהו, שאול המלך והבחירות","kind":"מהארכיון · פורסם 02.04.2019","href":"/post/התגלה-חותם-מימי-בית-ראשון-נתנמלך-רמזי","reason":"פוסט הבחירות המרכזי מ־2019, עם החיבורים לנתניהו ולטראמפ.","provenanceLabel":"post:1129"},
      {"id":"elections-history-1124","label":"בראשית והבחירות · סוד החשמל","kind":"מהארכיון · פורסם 21.04.2019","href":"/post/רמזים-על-התרסקות-החללית-בראשית-והקשר-ל","reason":"חיבור היסטורי בין אירוע החללית לבחירות, מתוך חומרי סוד החשמל.","provenanceLabel":"post:1124"},
      {"id":"elections-history-1110","label":"פיזור הכנסת ה־21 · סוד החשמל","kind":"מהארכיון · פורסם 01.06.2019","href":"/post/רמזים-מדהימים-לגאולה-מפיזור-הכנסת-ה21-וה","reason":"פוסט על הקדמת הבחירות לאלול, מתוך חומרי סוד החשמל. כך אפשר לחזור לסבב הקודם ולהקשר שלו.","provenanceLabel":"post:1110"},
      {"id":"elections-history-906","label":"רמזי הבחירות והממשלה · 1820","kind":"מהארכיון · פורסם 24.03.2021","href":"/post/רמזי-הבחירות-הרביעיות-יא-ניסן-יום-הולד","reason":"הפוסט המרכזי הישן נושא את התגים 1820, 1237, חכמה 73 ונתניהו. זו כניסה לחומר המקור שמלווה את צירי הבחירות.","provenanceLabel":"post:906"},
      {"id":"elections-history-83","label":"בחירת טראמפ ב־2024 · ביבי","kind":"מהארכיון · פורסם 06.11.2024","href":"/post/רמזים-מבחירתו-של-דונלד-טראמפ-לנשיאות-א","reason":"פרסום מ־2024 המחבר את טראמפ ונתניהו. צילום הכותל המופיע בו חוזר לאירוע 2017; הוא אינו אירוע חדש או מקור עצמאי נוסף.","provenanceLabel":"post:83"},
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

// Golden Context Pack calculations come only from the live canonical Method Trace RPC, for the
// source-claimed expressions with their exact registered method; any failure yields no trace
// (fail-closed), never a client-side calculation.
async function fetchGoldenPackTraces(postId) {
  const traces = await Promise.all(goldenContextPackClaims(postId).map(async ({ expression, method_key: methodKey }) => {
    try {
      const { data, error } = await supabase.rpc("gematria_method_trace", { p_method_key: methodKey, p_phrase: expression });
      if (error) return null;
      return Array.isArray(data) ? data[0] : data;
    } catch { return null; }
  }));
  return traces.filter(Boolean);
}

// Governed owners are injected with live dependencies; the pack adapter itself never touches the DB.
export async function fetchGoldenContextPack(post) {
  if (!goldenContextPackClaims(post?.id).length) return null;
  return buildGoldenPostContextPack({
    postId: post.id,
    post: { id: post.id, slug: post.slug, date: post.date },
    traces: await fetchGoldenPackTraces(post.id),
    numericOperators: createCanonicalNumberW2Executors({ supabase, numericRuleVersions: fetchLiveNumericRuleVersions }).numeric_operators,
    ruleVersions: fetchLiveNumericRuleVersions,
  });
}

// Same governed pack for an already-routed Golden post (admin layer reuses the identical path).
export async function fetchGoldenContextPackBySlug(slug) {
  const post = slug ? await getPostBySlug(slug) : null;
  return post ? fetchGoldenContextPack(post) : null;
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
    : isBennettSaltPilot
      ? {
          ...post,
          title: "בנט בתוך ציר 631",
          excerpt: "אירוע חדש מתחבר לציר 631 שכבר הופיע בפוסט הבחירות: נפתלי בנט = הבחירות = מלך ישראל = 631. יומיים קודם פורסם פוסט ים המלח.",
          content: buildBennettGoldenBody(bennettSaltVerification, post.content),
          _experience: buildBennettSaltExperience(post),
        }
      : { ...post, content: markLegacyEqualityLines(post.content) };
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
  const baseExperience = isGolden
    && !projectedExperience.media
    && projectedExperience.connections.length === 0
    && projectedExperience.timeline.length === 0
    && projectedExperience.trail.length === 0
      ? buildPost2029ArchitectureWireframe()
      : projectedExperience;
  const [experience, contextPack] = await Promise.all([
    resolvePostExperienceConnections(baseExperience),
    fetchGoldenContextPack(post),
  ]);
  const sourceRegions = regions.length ? regions : [{ id: "post-story", heading: post.title, label: "הסיפור", primary: post.title, signals: [] }];
  const readingRegions = experience.connections.some((connection) => connection.href)
    ? [...sourceRegions, { id: "post-connections", heading: "הסיפור ממשיך מכאן", label: "חיבורים מתוך הפוסט", primary: "הסיפור ממשיך מכאן", signals: [] }]
    : sourceRegions;

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
        : isBennettSaltPilot
          ? "תיעוד אירוע · בני ברק · 24.09.2026"
          : clean(post.author) || "מקור הפוסט",
    sourceLabel: isFz1073Pilot ? "FZ1073 · תיעוד אירוע" : isElectionsChain ? "הבחירות · ציר 631" : isBennettSaltPilot ? "בנט · ציר 631" : clean(post.author) || "מקור הפוסט",
    excerpt: clean(post.excerpt) || stripTags(post.content).slice(0, 220),
    regions: readingRegions,
    defaultRegionId: readingRegions[0]?.id || null,
    golden: isGolden || isFz1073Pilot || isBennettSaltPilot || isElectionsChain,
    draft: post._privateStage === true || (Array.isArray(post.tags) && post.tags.includes("טיוטה")),
    privateStage: post._privateStage === true,
    previewSnapshot: post._previewSnapshot === true,
    caveat: isGolden
      ? "המקור נשמר כלשונו. החיבורים בשוליים הם שכבת SOD1820 נפרדת."
      : isFz1073Pilot
        ? "הפוסט הוא מקור הסיפור. החיבורים בשוליים הם שכבת הקשר נפרדת; רמת רמז אינה ציון אמת."
        : isElectionsChain
          ? "המספרים והחישובים מוצגים כפי שהם. החיבורים בשוליים הם שכבת קריאה נפרדת; המשך הציר חי בפוסט נפרד."
        : isBennettSaltPilot
          ? "האירוע המתועד, החישובים והפרשנות נשמרים כשכבות נפרדות. אין כאן טענת סיבתיות או עמדה פוליטית."
          : "שכבת ההקשר אינה חלק מדברי המקור.",
    experience,
    contextPack,
  };
}

export const post2029ReadingInternals = {
  markLegacyEqualityLines,
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
  ELECTIONS_SLUG,
  ELECTIONS_EQUALITIES,
  ELECTIONS_REGIONS,
  markElectionsChain,
  buildElectionsExperience,
};
