import { getPostBySlug, supabase } from "../supabase.js";
import { buildGoldenPostContextPack, goldenContextPackClaims } from "./goldenPostContextPacks.js";
import { createCanonicalNumberW2Executors } from "./researchW2Executors.js";
import { fetchLiveNumericRuleVersions } from "./numberSystemMethods.js";
import { POST2029_PREVIEW_SNAPSHOT } from "./post2029PreviewSnapshot.js";
import { formatBilingualDate } from "./timeline2029.js";
import { buildPost2029ArchitectureWireframe, projectPost2029Experience } from "./post2029ExperienceProjection.js";
import { isDocumentedIndiaCaptainPost } from "./topicSourceContext.js";
import { hasSuppressedPublicPostTag } from "./publicPostBoundary.js";
import { projectTopicCardContent } from "./topicConvergence.js";
import { decodePublicEntities } from "../presentation/contentTitle.js";
import { classifyCalculatorInput, CALCULATOR_INPUT_KIND } from "./calculator2029Input.js";

export function isPostEnglishExpression(expression) {
  const info = classifyCalculatorInput(expression);
  return info.kind === CALCULATOR_INPUT_KIND.LATIN && !info.hasDigits && !info.otherLetters
    && /^[A-Za-z\s'’.-]+$/.test(String(expression || ""));
}

const clean = (value) => value == null ? "" : String(value).trim();

function postCssSelectors(selector) {
  const selectors = []; let start = 0, depth = 0, quote = null, escaped = false;
  for (let index = 0; index < selector.length; index += 1) {
    const char = selector[index];
    if (escaped) { escaped = false; continue; }
    if (char === "\\") { escaped = true; continue; }
    if (quote) { if (char === quote) quote = null; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === "(" || char === "[") depth += 1;
    if (char === ")" || char === "]") depth -= 1;
    if (char === "," && !depth) { selectors.push(selector.slice(start, index)); start = index + 1; }
  }
  selectors.push(selector.slice(start));
  return selectors.map(value => value.trim()).filter(Boolean);
}

// Presentation containment over the authored source, not an HTML sanitizer or
// a source rewrite. Legacy plugin resources never become 2029 global styles.
export function postReadingHtml2029(html) {
  if (!globalThis.document?.createElement) return String(html || "");
  const template = document.createElement("template"); template.innerHTML = String(html || "");
  for (const dependency of template.content.querySelectorAll('script,link[rel~="stylesheet"],link[rel="preload"][as="style"]')) dependency.remove();
  for (const icon of template.content.querySelectorAll('img[src*="/wp-content/plugins/gallery-images/"]')) {
    // WordPress plugin arrows/spinners are UI assets, not the authored gallery
    // images. Keep the raw source witness and all actual media URLs unchanged.
    const loader = icon.closest(".loading");
    if (loader && !clean(loader.textContent) && loader.querySelectorAll("img").length === 1) loader.remove();
    else icon.remove();
  }
  const scopedRules = rules => [...rules].flatMap(rule => {
    if (rule.type === 1 && rule.selectorText) {
      const selectors = postCssSelectors(rule.selectorText).map(selector => `.sod29-reading-source ${selector}`);
      return [`${selectors.join(",")} {${rule.style.cssText}}`];
    }
    if ((rule.type === 4 || rule.type === 12) && rule.cssRules) {
      const body = scopedRules(rule.cssRules).join("\n");
      return body ? [`${rule.cssText.slice(0, rule.cssText.indexOf("{"))}{${body}}`] : [];
    }
    // Imports, font faces and animations belong to the existing 2029 owners.
    return [];
  });
  for (const style of template.content.querySelectorAll("style")) {
    try {
      const sheet = new CSSStyleSheet(); sheet.replaceSync(style.textContent || "");
      style.textContent = scopedRules(sheet.cssRules).join("\n");
      style.dataset.postScopedStyle = "true";
    } catch { style.remove(); }
  }
  for (const frame of template.content.querySelectorAll("iframe")) {
    frame.loading = "lazy";
    if (!clean(frame.title)) frame.title = "מדיה מוטמעת מתוך הפוסט";
  }
  return template.innerHTML;
}

// Some WordPress Posts authored equalities as plain text with a colored value,
// before data-gem existed. Decorate only complete, explicit equality lines.
// Preserve their wording, colors and media; no association is engine-verified
// here. Each operand opens its own canonical Number calculation.
function markLegacyEqualityLines(content = "") {
  const operand = (text, numeric = false) => `<button type="button" class="${numeric ? "sod29-gematria-value" : "sod29-gematria-expression"}" data-post-equality-operand="true" data-gem="${text.trim().replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">${text.trim()}</button>`;
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
    id: "bennett-sequence",
    heading: "יומיים אחרי ים המלח — המלח מופיע שוב",
    label: "ים המלח → האירוע",
    primary: "פוסט ים המלח (22.9) → אירוע המלחיות (24.9)",
    signals: ["יומיים ביניהם", "ללא טענת סיבתיות"],
    worldLabel: "פתח את ים המלח",
  },
  {
    id: "elections-chain",
    heading: "האירוע",
    label: "24.9 · האירוע בבני ברק",
    primary: "נפתלי בנט · אירוע המלחיות בבני ברק",
    signals: ["תיעוד המקור", "המשך לציר הבחירות"],
    worldLabel: "פתח את פוסט הבחירות",
  },
  {
    id: "salt-covenant",
    heading: "ברית מלח",
    label: "ברית מלח · מלכות דוד",
    primary: "ברית מלח = 690 · מלכות דוד",
    signals: ["3 פסוקים", "ויקרא · במדבר · דברי הימים"],
    worldLabel: "פתח את ברית מלח",
  },
  {
    id: "salt-78",
    heading: "הרמז המרכזי — מלח",
    label: "מלח = 78",
    primary: "מלח = 78",
    signals: ["גימטריה רגילה"],
    number: 78,
    worldLabel: "פתח את 78",
  },
  {
    id: "bennett-israel-78",
    heading: "מלח = 78 — וישראל בת 78",
    label: "גיל המדינה · 78 · אחדות",
    primary: "מלח = 78 · ישראל בת 78",
    signals: ["78 שנות עצמאות", "אחדות"],
    worldLabel: "פתח את 78",
  },
  {
    id: "bennett-631",
    heading: "בנט בתוך עץ הבחירות",
    label: "631 · בנט והבחירות",
    primary: "נפתלי בנט = הבחירות = מלך ישראל = 631",
    signals: ["5 שוויונות", "ציר הבחירות"],
    number: 631,
    worldLabel: "פתח את 631",
  },
  {
    id: "dead-sea-chronology",
    heading: "ים המלח",
    label: "ים המלח · 133",
    primary: "ים המלח = 133",
    signals: ["חיבור משני", "הסיפור המלא בפוסט ים המלח"],
    worldLabel: "פתח את ים המלח",
  },
]);

// Reading story of the saved Bennett source (revision 207 -> 208). The authored body is shown as written:
// Dead Sea -> the incident two days later -> salt covenant / David -> salt = 78 and the state's age -> unity.
// Presentation only: the covenant section is moved ahead of the salt = 78 section when both are found.
// `verifiedClaims` is a Set of "expression|result" pairs the canonical method engine confirmed. Only those keep the
// contextual-number focus interaction; every other saved result stays a plain open-number trigger.
function markBennettStory(content = "", verifiedClaims = new Set()) {
  let html = String(content || "");
  if (html.includes('data-bennett-story="v1"')) return html;
  html = html.replace(/<button\b([^>]*)>/gi, (match, attrs) => {
    const expression = attrs.match(/data-expression="([^"]+)"/)?.[1];
    if (!expression) return match;
    const result = attrs.match(/data-result="([^"]+)"/)?.[1];
    const group = result === "631" ? ' data-link-group="b"' : result === "78" ? ' data-link-group="a"' : "";
    if (result && verifiedClaims.has(`${expression}|${result}`)) return `<button${attrs}${group}>`;
    return `<button${attrs.replace(/\sdata-contextual-number-focus="true"/g, "")} data-gem="${expression}"${group}>`;
  });
  for (const title of ["יומיים אחרי ים המלח — המלח מופיע שוב", "מלח = 78 — וישראל בת 78", "האירוע"]) {
    html = html.replace(new RegExp(`(<h2\\b)(?![^>]*data-source-heading)([^>]*>\\s*${escapeRegExp(title)}\\s*<\\/h2>)`), '$1 data-source-heading="true"$2');
  }
  const covenant = html.match(/\s*<section class="sod29-bennet-section">\s*<h2[^>]*>ברית מלח<\/h2>[\s\S]*?<\/section>/);
  const centralSalt = html.match(/\s*<section class="sod29-bennet-section is-centered">\s*<h2[^>]*>הרמז המרכזי — מלח<\/h2>/);
  if (covenant && centralSalt && html.indexOf(covenant[0]) > html.indexOf(centralSalt[0])) {
    html = html.replace(covenant[0], "");
    html = html.replace(centralSalt[0], `${covenant[0]}${centralSalt[0]}`);
  }
  return html.replace(/<section\b/, '<section data-bennett-story="v1"');
}


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
    html = html.replace(pattern, '$1 data-source-heading="true" data-elections-chain="v1" data-gem="' + region.number + '"' + (region.number === 271 ? ' data-link-group="a"' : region.number === 631 ? ' data-link-group="b"' : "") + '$2$3');
  }
  html = html.replace(/(<h2\b)([^>]*>נתניהו בן 77 — מזל ופרשת בראשית<\/h2>)/, '$1 data-source-heading="true"$2');
  // Colour marks a RELATION only: the date 27.10 -> 2710 -> 271 (group a) and the 631 axis (group b). Everything else stays plain.
  html = html.replace(/(<p\b[^>]*>)(\s*)27\.10(\.2026\s*<\/p>)/, '$1$2<span data-link-group="a">27.10</span>$3');
  html = html.replace(/(<p\b)([^>]*>\s*2710\s*<\/p>)/, '$1 data-link-group="a"$2');
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
      const group = eq.value === 271 ? ' data-link-group="a"' : eq.value === 631 ? ' data-link-group="b"' : "";
      const phrase = `<button type="button" class="sod29-gematria-expression"${group} ${attrs("expression")}>${eq.phrase}</button>`;
      const value = `<button type="button" class="sod29-gematria-value"${group} ${attrs("result")}>${eq.value}</button>`;
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

// Engine check of every saved (expression, result) claim in the Bennett source; one RPC per distinct pair.
async function verifyBennettStoryClaims(content = "") {
  const pairs = new Map();
  for (const match of String(content).matchAll(/<button\b[^>]*>/gi)) {
    const expression = match[0].match(/data-expression="([^"]+)"/)?.[1];
    const result = Number(match[0].match(/data-result="([^"]+)"/)?.[1]);
    if (expression && Number.isSafeInteger(result)) pairs.set(`${expression}|${result}`, { expression, result });
  }
  const checked = await Promise.all([...pairs.entries()].slice(0, 24).map(async ([key, { expression, result }]) => {
    const { data, error } = await supabase.rpc("fn_method_value", { p_method_key: "רגיל", p_phrase: expression });
    return !error && Number(data) === result ? key : null;
  }));
  return new Set(checked.filter(Boolean));
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
  if (publicPost && !isPublicPostMeasureSource(publicPost)) return null;
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
  const bennettStoryClaims = isBennettSaltPilot ? await verifyBennettStoryClaims(post.content) : new Set();
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
          content: markBennettStory(post.content, bennettStoryClaims),
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
    // The unmodified, access-controlled source used for version revalidation.
    // Render annotations never become historical source assertions.
    sourcePost: post,
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

// Post measures compose the existing public Post, Topic and canonical method
// readers. No cache, graph edge, score or publication decision is created here.
export function isPublicPostMeasureSource(post) {
  return Boolean(post?.id != null && clean(post.slug) && post.home_hidden !== true
    && !post._privateStage && !post._previewSnapshot && !hasSuppressedPublicPostTag(post)
    && !["gpt-draft", "web"].includes(clean(post.source).toLowerCase()));
}

export async function revalidatePostMeasureSource(sourcePost, { client = supabase } = {}) {
  if (!isPublicPostMeasureSource(sourcePost)) return { status: "source_unavailable" };
  try {
    const { data, error } = await client.from("posts")
      .select("id,slug,content,tags,source,home_hidden,modified,date")
      .eq("id", sourcePost.id).eq("slug", sourcePost.slug).limit(1);
    if (error) return { status: "source_failed" };
    const row = data?.[0];
    if (!isPublicPostMeasureSource(row) || String(row.id) !== String(sourcePost.id)
      || row.slug !== sourcePost.slug) return { status: "source_unavailable" };
    if (clean(row.modified) !== clean(sourcePost.modified) || row.content !== sourcePost.content) {
      return { status: "source_changed" };
    }
    return { status: "ready", source: row };
  } catch { return { status: "source_failed" }; }
}

const exactPostValue = value => {
  if (!["string", "number"].includes(typeof value) || !/^\d+$/.test(String(value).trim())) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
};

// Compatibility reading of an explicitly authored legacy marking. This reads
// bounded equality syntax, not narrative meanings, tags, OCR or engine matches.
// Method names stay verbatim; only the canonical profile resolves their identity.
const sourceMethodLabel = value => {
  const label = clean(value);
  // A comparison, player number or formula in parentheses is not a method name.
  return label && !/[=<>]/.test(label) && !/^\d[\d\s.,]*$/.test(label) ? label : null;
};

function authoredRegularCaption(box) {
  const note = box?.querySelector(":scope > .gb-note");
  if (!note) return null;
  const sentence = clean(note.textContent).split(/[.!?]/)[0];
  const match = sentence.match(/(?:גימטרי(?:ה|ת)|מניין|מנין|חישוב|שיטת)\s+ה?רגיל(?:ה)?/);
  if (!match || /(?:לא|אינ[וה])\s+(?:ב|ה)?(?:גימטריה|מניין|מנין|חישוב|שיטת)/.test(sentence)
    || /שיטות|מילוי|מסתתר|מצומצם|משולש|fn_|miluy/i.test(sentence)) return null;
  // Grammatical source wording is retained separately from the canonical request.
  // No method is chosen from the numeric result. The profile must still resolve it.
  return { method: "רגיל", sourceMethodLabel: match[0], methodSourceText: sentence };
}

function legacyCalculationTuple(node) {
  const line = node.closest("p,div,li,td,h2,h3,h4,h5,h6");
  if (!line) return { method: null, value: null };
  const copy = line.cloneNode(true);
  const markings = [...line.querySelectorAll("[data-gem]")];
  const selected = markings.indexOf(node);
  if (selected < 0) return { method: null, value: null };
  [...copy.querySelectorAll("[data-gem]")].forEach((item, index) => item.replaceWith(`\uFFF0${index}\uFFF1`));
  const marker = `\uFFF0${selected}\uFFF1`;
  const text = copy.textContent;
  let suffix = text.slice(text.indexOf(marker) + marker.length);
  const leadingMethod = suffix.match(/^\s*\(([^)]+)\)\s*(?==)/);
  const leadingRegular = !leadingMethod && suffix.match(/^\s*(ברגיל)\s*(?==)/);
  if (leadingMethod) suffix = suffix.slice(leadingMethod[0].length);
  if (leadingRegular) suffix = suffix.slice(leadingRegular[0].length);
  // A chain may share one value/method; a middle dot starts a separate claim.
  const equality = suffix.match(/^\s*(?:=\s*\uFFF0\d+\uFFF1\s*)*=\s*(\d+)\s*(?:\(([^)]+)\))?(?=\s*(?:$|[·,.;]))/);
  const explicit = sourceMethodLabel(leadingMethod?.[1] || equality?.[2]);
  if (explicit && equality) return { method: explicit, value: exactPostValue(equality[1]) };
  if (leadingRegular && equality) return { method: "רגיל", sourceMethodLabel: leadingRegular[1], value: exactPostValue(equality[1]) };
  const header = element => {
    if (!element || element.contains(node) || element.querySelector("[data-gem],p,div,li,table")) return null;
    const label = clean(element.textContent);
    // A documented group label may give both method and value.
    const group = label.match(/^([^=()]+?)(?:\s*\([^)]*\))?\s*=\s*(\d+)$/);
    if (group && sourceMethodLabel(group[1])) return { method: sourceMethodLabel(group[1]), value: exactPostValue(group[2]) };
    // Explicit alias declarations such as «משולש» (קדמי): ... .
    const alias = label.match(/^«[^»]+»\s*\(([^)]+)\)\s*:/);
    if (alias && sourceMethodLabel(alias[1])) return { method: sourceMethodLabel(alias[1]), value: null };
    const caption = label.match(/\(([^)]+)\)\s*$/);
    return caption && sourceMethodLabel(caption[1]) ? { method: sourceMethodLabel(caption[1]), value: null } : null;
  };
  const local = header(line.previousElementSibling) || header(line.parentElement?.firstElementChild);
  // Group lists must consist only of authored markings and separators. A nearby
  // group heading does not assign a method/value to prose inside that group.
  const isList = /^\s*\uFFF0\d+\uFFF1(?:\s*·\s*\uFFF0\d+\uFFF1)*\s*$/.test(text);
  if (local && (equality || isList)) return { method: local.method, value: equality ? exactPostValue(equality[1]) : local.value };
  const boxCaption = equality && authoredRegularCaption(node.closest(".sod-gematria-box"));
  if (boxCaption) return { ...boxCaption, value: exactPostValue(equality[1]) };
  return { method: null, value: equality ? exactPostValue(equality[1]) : null };
}

function normalizePostDuplicateSourceIds(source, root, digest) {
  for (const node of root.querySelectorAll("[id]")) {
    if (!node.id.trim()) { node.removeAttribute("id"); node.dataset.postEmptyNativeId = "true"; }
  }
  const saved = [...source.querySelectorAll("[id]")];
  const byId = new Map(), renderedById = new Map(), used = new Set();
  saved.forEach((node, index) => { if (!byId.has(node.id)) byId.set(node.id, []); byId.get(node.id).push({ node, index }); });
  for (const node of root.querySelectorAll("[id]")) {
    const original = node.dataset.postSourceNativeId || node.id;
    if (!renderedById.has(original)) renderedById.set(original, []);
    renderedById.get(original).push(node); used.add(node.id);
  }
  for (const [id, originals] of byId) {
    if (!id) continue;
    if (originals.length < 2) continue;
    const rendered = renderedById.get(id) || [];
    const readableText = node => { const copy = node.cloneNode(true); for (const resource of copy.querySelectorAll("style,script,link")) resource.remove(); return copy.textContent; };
    if (rendered.length !== originals.length || originals.some(({ node }, index) =>
      node.tagName !== rendered[index].tagName || readableText(node) !== readableText(rendered[index]))) continue;
    rendered.forEach((target, index) => {
      target.dataset.postSourceNativeId = id;
      target.dataset.postDuplicateNativeId = "true";
      // Preserve the first historical hash destination. Later identical IDs get
      // snapshot-bound presentation IDs, never new source-native identities.
      if (!index) return;
      const anchor = `post-source-${digest}-${originals[index].index}`;
      if (used.has(anchor) && target.id !== anchor) return;
      target.id = anchor; target.dataset.postPresentationAnchor = "true"; used.add(anchor);
    });
  }
}

function preparePostReadingDom(root) {
  for (const node of root.querySelectorAll("[style],font[size],small")) {
    const size = node.style?.fontSize || "";
    const number = parseFloat(size);
    const pixels = /px$/i.test(size) ? number : /pt$/i.test(size) ? number * 4 / 3 : null;
    if ((pixels != null && pixels < 14) || node.matches('font[size="1"],font[size="2"],small')) {
      if (clean(node.textContent)) node.dataset.postTextFloor = node.matches("p,div,li") || clean(node.textContent).length > 80 ? "supporting" : "micro";
    }
  }
  for (const number of root.querySelectorAll(".gb-rows :is(b,strong)")) {
    if (/^\d+$/.test(clean(number.textContent))) number.dataset.postNumeric = "true";
  }
  for (const image of root.querySelectorAll("img[src]")) {
    if (!clean(image.getAttribute("alt"))) {
      const caption = image.closest("figure,.wp-caption")?.querySelector("figcaption,.wp-caption-text");
      image.alt = clean(caption?.textContent) || "תמונה מתוך הפוסט; תיאור תוכן לא סופק במקור";
      image.dataset.postAltFallback = caption ? "source_caption" : "description_missing";
    }
    if (!image.hasAttribute("loading")) image.loading = "lazy";
    if (!image.hasAttribute("decoding")) image.decoding = "async";
  }
}

const annotationWitnessKey = node => JSON.stringify(["data-expression", "data-method", "data-result", "data-method-version", "data-region-id"]
  .map(key => node.getAttribute(key)));

function locateSavedPostAnnotations(source, root, digest) {
  const saved = [...source.querySelectorAll("[data-expression]")];
  const rendered = [...root.querySelectorAll("[data-expression]")];
  if (saved.length !== rendered.length || saved.some((node, index) => annotationWitnessKey(node) !== annotationWitnessKey(rendered[index]))) return;
  saved.forEach((node, index) => {
    const target = rendered[index], nativeId = node.id || node.closest("[id]")?.id;
    target.dataset.postAnnotationIndex = String(index);
    if (nativeId && [...source.querySelectorAll("[id]")].filter(other => other.id === nativeId).length === 1) return;
    const anchor = target.id || `post-annotation-${digest}-${index}`;
    if ([...root.querySelectorAll("[id]")].some(other => other !== target && other.id === anchor)) return;
    target.id = anchor; target.dataset.postAnnotationLocator = anchor;
    target.dataset.postPresentationAnchor = "true";
  });
}

function boxOperandTarget(row, expression, ordinal, anchor) {
  const existing = [...row.querySelectorAll("[data-post-box-operand],[data-post-equality-operand]")]
    .find(node => node.textContent === expression && (node.dataset.postBoxOperand === String(ordinal) || !node.hasAttribute("data-post-box-operand")));
  if (existing) { existing.id = anchor; existing.dataset.postBoxOperand = String(ordinal); return existing; }
  const walker = row.ownerDocument.createTreeWalker(row, 4); const texts = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) texts.push(node);
  const full = texts.map(node => node.textContent).join("");
  const pieces = [...full.matchAll(/[^=]+/g)]; const piece = pieces[ordinal];
  if (!piece || piece[0].trim() !== expression) return null;
  const start = piece.index + piece[0].indexOf(expression), end = start + expression.length;
  let offset = 0, begin = null, finish = null;
  for (const node of texts) {
    const next = offset + node.textContent.length;
    if (!begin && start >= offset && start < next) begin = [node, start - offset];
    if (end > offset && end <= next) { finish = [node, end - offset]; break; }
    offset = next;
  }
  if (!begin || !finish || begin[0].parentElement.closest("a,button") || finish[0].parentElement.closest("a,button")) return null;
  const range = row.ownerDocument.createRange(); range.setStart(...begin); range.setEnd(...finish);
  const button = row.ownerDocument.createElement("button"); button.type = "button";
  button.className = "sod29-gematria-expression"; button.id = anchor;
  button.dataset.gem = expression; button.dataset.postBoxOperand = String(ordinal); button.dataset.postPresentationAnchor = "true";
  button.append(range.extractContents()); range.insertNode(button); return button;
}

function collectAuthoredBoxOccurrences(sourcePost, source, root, digest) {
  const savedBoxes = [...source.querySelectorAll(".sod-gematria-box")];
  const renderedBoxes = [...root.querySelectorAll(".sod-gematria-box")];
  if (savedBoxes.length !== renderedBoxes.length) return [];
  return savedBoxes.flatMap((box, boxIndex) => {
    const caption = authoredRegularCaption(box);
    const rows = [...box.querySelectorAll(":scope > .gb-rows > div")];
    const targets = [...renderedBoxes[boxIndex].querySelectorAll(":scope > .gb-rows > div")];
    if (rows.length !== targets.length || rows.some((row, i) => row.textContent !== targets[i].textContent)) return [];
    return rows.flatMap((row, rowIndex) => {
      if (row.querySelector("a,button,[data-gem],[data-expression]")) return [];
      const parts = row.textContent.split("=").map(part => part.trim());
      const numeric = part => part.match(/^(\d+)(?:\s*(?:·\s*([^()]+)|\(([^)]+)\)))?\s*$/);
      const values = parts.map(numeric);
      if (parts.length < 2 || values.filter(Boolean).length !== 1
        || parts.some((part, index) => !values[index] && !/^[א-ת\u0591-\u05c7\u05f3\u05f4'"’‘\s-]+$/.test(part))) return [];
      const number = values.find(Boolean), value = exactPostValue(number[1]); if (value == null) return [];
      const explicit = sourceMethodLabel(number[2] || number[3]);
      const method = explicit ? { method: explicit, sourceMethodLabel: explicit } : caption || { method: null };
      return parts.flatMap((expression, partIndex) => {
        if (values[partIndex]) return [];
        const anchor = `post-box-${digest}-${boxIndex}-${rowIndex}-${partIndex}`;
        if ([...root.querySelectorAll("[id]")].some(node => node.id === anchor && node.dataset.postBoxOperand !== String(partIndex))) return [];
        const target = boxOperandTarget(targets[rowIndex], expression, partIndex, anchor); if (!target) return [];
        return [{ id: `posts:${sourcePost.id}:${anchor}`, expression, ...method, value, methodVersion: null,
          sourceRef: `posts:${sourcePost.id}`, sourceVersion: clean(sourcePost.modified) || null,
          locator: `#${anchor}`, locatorPrecision: "snapshot_bound_occurrence", sourceOrdinal: `${boxIndex}:${rowIndex}:${partIndex}`,
          sourceDigest: digest, binding: "authored_gematria_box", lang: sourcePost.lang || null }];
      });
    });
  });
}

function collectAuthoredEqualityOccurrences(sourcePost, root, digest) {
  const template = root.ownerDocument.createElement("template");
  template.innerHTML = markLegacyEqualityLines(sourcePost.content);
  const selector = "[data-post-equality-operand]";
  const saved = [...template.content.querySelectorAll(selector)].filter(node => !node.closest(".sod-gematria-box"));
  const rendered = [...root.querySelectorAll(selector)].filter(node => !node.closest(".sod-gematria-box"));
  if (saved.length !== rendered.length || saved.some((node, index) => node.dataset.gem !== rendered[index].dataset.gem
    || node.textContent !== rendered[index].textContent)) return [];
  const ids = new Set([...root.querySelectorAll("[id]")].map(node => node.id));
  return saved.flatMap((node, index) => {
    const expression = node.dataset.gem;
    if (!expression || /^\d+$/.test(expression) || node.closest("script,style,template,pre,code,[hidden],[aria-hidden='true']")) return [];
    const row = node.closest("p,div,li,td,h1,h2,h3,h4,h5,h6"); if (!row) return [];
    const clone = row.cloneNode(true), controls = [...row.querySelectorAll(selector)];
    const selected = controls.indexOf(node); if (selected < 0) return [];
    for (const br of clone.querySelectorAll("br")) br.replaceWith("\n");
    for (const [ordinal, control] of [...clone.querySelectorAll(selector)].entries()) {
      control.replaceWith(/^\d+$/.test(control.dataset.gem) ? control.dataset.gem : `\uFFF0${ordinal}\uFFF1`);
    }
    const marker = `\uFFF0${selected}\uFFF1`, all = clone.textContent, at = all.indexOf(marker);
    if (at < 0) return [];
    const end = all.indexOf("\n", at), line = all.slice(all.lastIndexOf("\n", at) + 1, end < 0 ? undefined : end);
    const parts = line.split("=").map(part => part.trim());
    if (parts.length < 2 || !parts.includes(marker) || parts.filter(part => /^\d+$/.test(part)).length !== 1
      || parts.some(part => !/^\d+$/.test(part) && !/^\uFFF0\d+\uFFF1$/.test(part))) return [];
    const value = exactPostValue(parts.find(part => /^\d+$/.test(part))); if (value == null) return [];
    const target = rendered[index], anchor = `post-equality-${digest}-${index}`;
    if (ids.has(anchor) && target.id !== anchor) return [];
    target.id = anchor; ids.add(anchor); target.dataset.postPresentationAnchor = "true";
    const renderedRow = target.closest("p,h1,h2,h3,h4,h5,h6");
    if (renderedRow) renderedRow.dataset.postEquationLine = "true";
    return [{ id: `posts:${sourcePost.id}:${anchor}`, expression, method: null, value, methodVersion: null,
      sourceRef: `posts:${sourcePost.id}`, sourceVersion: clean(sourcePost.modified) || null,
      locator: `#${anchor}`, locatorPrecision: "snapshot_bound_occurrence", sourceOrdinal: index, sourceDigest: digest,
      binding: "authored_equality_line", sourceState: "expression_without_documented_method", lang: sourcePost.lang || null }];
  });
}

export async function collectPostLegacyOccurrences2029(sourcePost, root) {
  if (!isPublicPostMeasureSource(sourcePost) || !root?.ownerDocument) return [];
  const template = root.ownerDocument.createElement("template");
  template.innerHTML = String(sourcePost.content || "");
  const savedMarkings = "[data-gem]:not([data-post-equality-operand]):not([data-post-number-link]):not([data-post-box-operand])";
  const saved = [...template.content.querySelectorAll(savedMarkings)];
  const rendered = [...root.querySelectorAll(savedMarkings)];
  // Do not attach a saved position to markings added by a presentation adapter.
  if (saved.length !== rendered.length || saved.some((node, index) =>
    node.getAttribute("data-gem") !== rendered[index].getAttribute("data-gem")
    || node.textContent !== rendered[index].textContent)) return [];
  const bytes = new TextEncoder().encode(String(sourcePost.content || ""));
  const digest = [...new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes))]
    .map(byte => byte.toString(16).padStart(2, "0")).join("");
  normalizePostDuplicateSourceIds(template.content, root, digest);
  preparePostReadingDom(root);
  locateSavedPostAnnotations(template.content, root, digest);
  root.dataset.postSourceDigest = digest;
  const legacy = saved.flatMap((node, index) => {
    const expression = node.getAttribute("data-gem");
    const englishExpression = isPostEnglishExpression(expression) && node.textContent.includes(expression);
    if (!expression?.trim() || (node.textContent !== expression && !englishExpression) || /^\d[\d,]*$/.test(expression.trim())
      || node.closest("script,style,template,pre,code,[hidden],[aria-hidden='true']")) return [];
    const target = rendered[index];
    // This is a presentation locator bound to the exact source snapshot, not a
    // claimed source-native section or a persisted research-object identity.
    const anchor = target.id || `post-legacy-${digest}-${index}`;
    if ([...root.querySelectorAll("[id]")].some(other => other !== target && other.id === anchor)) return [];
    if (!target.id) { target.id = anchor; target.dataset.postPresentationAnchor = "true"; }
    const tuple = englishExpression ? { method: null, value: null } : legacyCalculationTuple(node);
    return [{ id: `posts:${sourcePost.id}:${anchor}`, expression, ...tuple, methodVersion: null,
      sourceRef: `posts:${sourcePost.id}`, sourceVersion: clean(sourcePost.modified) || null,
      locator: `#${anchor}`, locatorPrecision: node.id && !target.dataset.postDuplicateNativeId ? "occurrence" : "snapshot_bound_occurrence",
      sourceOrdinal: index, sourceDigest: digest, binding: "saved_legacy_marking", lang: englishExpression ? "en" : sourcePost.lang || null }];
  });
  return [...legacy, ...collectAuthoredBoxOccurrences(sourcePost, template.content, root, digest),
    ...collectAuthoredEqualityOccurrences(sourcePost, root, digest)];
}

async function sourceContainsLegacyCalculation(sourcePost, claim, sourceDocument) {
  if (!sourceDocument?.createElement) return false;
  try {
    const inert = sourceDocument.implementation?.createHTMLDocument?.("") || sourceDocument;
    const root = inert.createElement("div");
    root.innerHTML = claim.binding === "authored_equality_line" ? markLegacyEqualityLines(sourcePost.content) : String(sourcePost.content || "");
    const occurrences = await collectPostLegacyOccurrences2029(sourcePost, root);
    return occurrences.some(row => ["expression", "method", "value", "locator", "sourceOrdinal", "sourceDigest", "binding", "sourceMethodLabel", "methodSourceText"]
      .every(key => row[key] === claim[key]) && claim.methodVersion === null);
  } catch { return false; }
}

async function sourceContainsPostCalculation(sourcePost, claim, sourceDocument) {
  if (!claim) return false;
  if (claim.sourceDigest) {
    if (!sourceDocument?.createElement) return false;
    const inert = sourceDocument.implementation?.createHTMLDocument?.("") || sourceDocument;
    const root = inert.createElement("div"); root.innerHTML = String(sourcePost.content || "");
    await collectPostLegacyOccurrences2029(sourcePost, root);
    return collectPostCalculationOccurrences2029(sourcePost, root).some(row =>
      ["expression", "method", "value", "locator", "sourceOrdinal", "sourceDigest", "methodVersion", "binding"]
        .every(key => row[key] === claim[key]));
  }
  // Attribute-level witness only, not semantic extraction from prose or OCR.
  const html = String(sourcePost.content || "").replace(/<(script|style|pre|code|template)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  for (const tag of html.matchAll(/<[a-z][^>]*\bdata-expression\s*=[^>]*>/gi)) {
    const attrs = Object.fromEntries([...tag[0].matchAll(/\b(data-expression|data-method|data-result|data-method-version)\s*=\s*(["'])([\s\S]*?)\2/gi)]
      .map(m => [m[1].toLowerCase(), decodePublicEntities(m[3], 1)]));
    if (attrs["data-expression"] === claim.expression && clean(attrs["data-method"]) === claim.method
      && exactPostValue(attrs["data-result"]) === claim.value
      && (clean(attrs["data-method-version"]) || null) === claim.methodVersion) return true;
  }
  return false;
}

// This is an occurrence reader for explicit saved annotations, not an extractor
// of number/phrase pairs from OCR, tags, typography or positional guesses.
export function collectPostCalculationOccurrences2029(sourcePost, root, { sourceProjection = null } = {}) {
  if (!isPublicPostMeasureSource(sourcePost) || !root?.ownerDocument) return [];
  const template = root.ownerDocument.createElement("template");
  template.innerHTML = String(sourcePost.content || "");
  const authored = [...template.content.querySelectorAll("[data-expression]")]
    .map((node, sourceOrdinal) => ({ node, sourceOrdinal, binding: "saved_text_annotation" }));
  const annotationKey = node => JSON.stringify(["data-expression", "data-method", "data-result", "data-method-version", "id", "data-region-id"]
    .map(key => node.getAttribute(key)));
  const savedAnnotations = new Set(authored.map(({ node }) => annotationKey(node)));
  if (sourceProjection?.sourcePost === sourcePost && sourceProjection.golden === true) {
    const projected = root.ownerDocument.createElement("template");
    projected.innerHTML = String(sourceProjection.post.content || "");
    authored.push(...[...projected.content.querySelectorAll("[data-contextual-number-focus='true'][data-expression]")]
      .filter(node => !savedAnnotations.has(annotationKey(node)))
      .map(node => ({ node, binding: "existing_reviewed_post_projection" })));
  }
  const locate = (node, sourceOrdinal) => {
    const nativeId = node.id || node.closest("[id]")?.id;
    if (nativeId && [...template.content.querySelectorAll("[id]")].filter(el => el.id === nativeId).length === 1
      && [...root.querySelectorAll("[id]")].filter(el => el.id === nativeId).length === 1) {
      return { locator: `#${nativeId}`, precision: node.id ? "occurrence" : "section" };
    }
    const target = sourceOrdinal != null && [...root.querySelectorAll("[data-post-annotation-index]")]
      .find(el => el.dataset.postAnnotationIndex === String(sourceOrdinal) && annotationWitnessKey(el) === annotationWitnessKey(node));
    if (target?.dataset.postAnnotationLocator && root.dataset.postSourceDigest) {
      return { locator: `#${target.dataset.postAnnotationLocator}`, precision: "snapshot_bound_occurrence" };
    }
    const regionId = node.getAttribute("data-region-id");
    const region = regionId && [...root.querySelectorAll("[id]")].find(el => el.id === `source-region-${regionId}`);
    return region ? { locator: `#${region.id}`, precision: "section" } : { locator: null, precision: "unlocated" };
  };
  const occurrences = new Map();
  for (const { node, binding, sourceOrdinal } of authored) {
    if (node.closest("script,style,template,code,pre,[hidden],[aria-hidden='true']")) continue;
    const expression = node.getAttribute("data-expression"); // preserve exact spelling/spacing
    const method = clean(node.getAttribute("data-method")) || null;
    const value = exactPostValue(node.getAttribute("data-result"));
    const methodVersion = clean(node.getAttribute("data-method-version")) || null;
    if (!expression?.trim()) continue;
    const { locator, precision } = locate(node, sourceOrdinal);
    const sourceRef = `posts:${sourcePost.id}`;
    const key = JSON.stringify([sourceRef, locator, expression, method, methodVersion, value]);
    if (!occurrences.has(key)) occurrences.set(key, {
      id: key, expression, lang: node.getAttribute("lang") || sourcePost.lang || null,
      method, methodVersion, value, sourceRef, locator, locatorPrecision: precision,
      sourceVersion: clean(sourcePost.modified) || null,
      ...(binding === "saved_text_annotation" && root.dataset.postSourceDigest
        ? { sourceDigest: root.dataset.postSourceDigest, sourceOrdinal } : {}),
      binding, sourceState: "source_claim_not_verified",
      appearanceCount: 0,
    });
    occurrences.get(key).appearanceCount += 1;
  }
  return [...occurrences.values()];
}

export function collectPostSourcePlacements2029(sourcePost, root) {
  if (!isPublicPostMeasureSource(sourcePost) || !root) return [];
  const ref = `posts:${sourcePost.id}`;
  const sources = [{ kind: "post_body", ref }, { kind: "tag", ref }];
  for (const image of root.querySelectorAll("img[src]")) {
    if (image.closest("[hidden],[aria-hidden='true']")) continue;
    // Exact stored artifact ref/URL only. Similar-looking images are not merged.
    const artifactRef = image.getAttribute("data-source-ref") || image.getAttribute("data-media-id") || image.getAttribute("src");
    const locator = image.id || image.closest("[id]")?.id || null;
    sources.push({ kind: "image", ref: artifactRef, artifactRef,
      occurrence: { sourceRef: ref, locator: locator ? `#${locator}` : null } });
  }
  return sources;
}

const publicMeasureCard = (row, numbers) => {
  if (row?.status !== "approved" || !clean(row.slug) || row.id == null
    || projectTopicCardContent(row.findings).flags.doNotPublish) return null;
  const shared = [...new Set((Array.isArray(row.numbers) ? row.numbers : [])
    .map(exactPostValue).filter(n => n != null && numbers.includes(n)))];
  if (!shared.length) return null;
  return { id: String(row.id), slug: row.slug, label: stripTags(row.title || ""),
    shared, quality: row.quality ?? null, meterScore: row.meter_score ?? null,
    sourceRef: `topic_cards:${row.id}`, basis: "shared_number_indirect",
    href: `/topic/${encodeURIComponent(row.slug)}`,
  };
};
const POST_MEASURE_CARD_FIELDS = "id,slug,title,numbers,status,quality,meter_score,findings";
export function postMeasureNumbers(sourcePost) {
  return [...new Set((Array.isArray(sourcePost?.tags) ? sourcePost.tags : [])
    .map(exactPostValue).filter(n => n != null))];
}

export async function readPostConvergencePage2029(sourcePost, {
  client = supabase, offset = 0, pageSize = 8, selectedId = null,
} = {}) {
  const access = await revalidatePostMeasureSource(sourcePost, { client });
  if (access.status !== "ready") return access;
  const numbers = postMeasureNumbers(access.source);
  if (!numbers.length) return { status: "not_tested", cards: [], hasMore: false, scope: "אין תגיות מספריות לאיתור במסלול הזה." };
  const start = Math.max(0, Number.isSafeInteger(offset) ? offset : 0);
  const size = Math.min(16, Math.max(1, Number.isSafeInteger(pageSize) ? pageSize : 8));
  try {
    let query = client.from("topic_cards_public").select(POST_MEASURE_CARD_FIELDS)
      .overlaps("numbers", numbers).eq("status", "approved");
    // Stable source ordering, never a maximum-score or popularity selection.
    query = selectedId == null ? query.order("id", { ascending: true }).range(start, start + size)
      : query.eq("id", selectedId).limit(1);
    const { data, error } = await query;
    if (error) return { status: "failed" };
    const cards = (Array.isArray(data) ? data : []).map(row => publicMeasureCard(row, numbers)).filter(Boolean);
    const after = await revalidatePostMeasureSource(sourcePost, { client });
    if (after.status !== "ready") return after;
    return { status: "ready", cards: cards.slice(0, size), hasMore: selectedId == null && cards.length > size,
      nextOffset: start + size, numbers,
      scope: `${selectedId == null ? `חלון של עד ${size} כרטיסים ציבוריים, החל מפריט ${start + 1}` : "הכרטיס שנבחר נבדק מחדש"}, דרך תגיות מספריות. אין כאן בדיקת קשר ישיר, עצמאות מקורות או כלל המאגר.` };
  } catch { return { status: "failed" }; }
}

export async function checkPostCalculation2029(sourcePost, claim, {
  client = supabase, profileReader = null, traceReader = null, checkSteps = false, sourceProjection = null, sourceDocument = globalThis.document || null,
} = {}) {
  const access = await revalidatePostMeasureSource(sourcePost, { client });
  if (access.status !== "ready") return access;
  if (claim?.sourceRef !== `posts:${sourcePost.id}` || !claim.locator || !claim.expression?.trim()
    || !claim.method || claim.value == null || exactPostValue(claim.value) == null
    || claim.sourceVersion !== (clean(sourcePost.modified) || null)) {
    return { status: "incomplete_claim", resultMatch: "not_tested", steps: "not_tested" };
  }
  const savedWitness = claim?.binding === "saved_text_annotation" && await sourceContainsPostCalculation(access.source, claim, sourceDocument);
  const legacyWitness = ["saved_legacy_marking", "authored_gematria_box", "authored_equality_line"].includes(claim?.binding)
    && await sourceContainsLegacyCalculation(access.source, claim, sourceDocument);
  // The pre-existing Golden adapters already locate/verify explicit authored
  // equalities. Keep that route, with distinct provenance; it is not OCR or a tag.
  const projectedWitness = claim?.binding === "existing_reviewed_post_projection"
    && sourceProjection?.sourcePost === sourcePost && sourceProjection.golden === true
    && sourceProjection.post.id === sourcePost.id
    && await sourceContainsPostCalculation(sourceProjection.post, claim, sourceDocument);
  if (!savedWitness && !projectedWitness && !legacyWitness) {
    return { status: "incomplete_claim", resultMatch: "not_tested", steps: "not_tested" };
  }
  try {
    const { resolveExpressionFocus } = await import("./numberExpressionFocus.js");
    const { fetchNumberMethodProfile } = await import("./numberCoreProjection.js");
    const focus = await resolveExpressionFocus(claim.expression, {
      preferredMethod: claim.method, expectedValue: claim.value,
      profileReader: profileReader || (expression => fetchNumberMethodProfile(expression, { client })),
    });
    const profileAccess = await revalidatePostMeasureSource(sourcePost, { client });
    if (profileAccess.status !== "ready") return profileAccess;
    const selected = focus?.rows?.find(row => row.methodKey === focus.method);
    if (!focus || selected?.lifecycleActive === false) return { status: "mismatch", resultMatch: "mismatch", steps: "not_tested" };
    const version = selected?.definitionVersion ?? null;
    if (version == null || (claim.methodVersion != null && String(claim.methodVersion) !== String(version))) {
      return { status: "method_version_unavailable_or_changed", resultMatch: "not_tested", steps: "not_tested" };
    }
    let steps = "not_tested";
    if (checkSteps) {
      try {
        const readTrace = traceReader || (async (method, expression) => {
          const { data, error } = await client.rpc("gematria_method_trace", { p_method_key: method, p_phrase: expression });
          if (error) throw error;
          return data;
        });
        const trace = await readTrace(focus.method, claim.expression);
        const { projectGematriaTrace } = await import("./gematriaTracePresentation.js");
        const traceVersion = trace?.method_version ?? trace?.provenance?.method_version;
        steps = !trace ? "unavailable" : String(traceVersion ?? "") !== String(version) ? "version_mismatch"
          : projectGematriaTrace(trace, { expression: claim.expression, methodKey: focus.method, expectedValue: claim.value }).state === "ready"
            ? "matched" : "unavailable_or_mismatch";
      } catch { steps = "failed"; }
    }
    const after = await revalidatePostMeasureSource(sourcePost, { client });
    if (after.status !== "ready") return after;
    return { status: "ready", resultMatch: "matched", steps,
      // The profile resolves identity, not the historical spelling or method version.
      focus: { ...focus, expression: claim.expression }, methodVersion: String(version),
      sourceMethodVersion: claim.methodVersion, claim,
    };
  } catch {
    const after = await revalidatePostMeasureSource(sourcePost, { client });
    return after.status !== "ready" ? after : { status: "failed", resultMatch: "failed", steps: "not_tested" };
  }
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
  markBennettStory,
  ELECTIONS_SLUG,
  ELECTIONS_EQUALITIES,
  ELECTIONS_REGIONS,
  markElectionsChain,
  buildElectionsExperience,
};
