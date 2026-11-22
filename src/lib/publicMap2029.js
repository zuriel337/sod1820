import { siteLinkById } from "../../supabase/functions/_shared/siteLinkRegistry.js";

function registered(id, label) {
  const link = siteLinkById(id);
  return [link.href, label || link.label];
}

// The public site map and the expanded navigation share these destinations. Original document
// addresses stay with their route owner; filtered views link directly to the corresponding reader.
export function publicMapGroups2029(production) {
  return [
    { title: "ראשי", links: [["/", "בית"]] },
    { title: "פוסטים ותיעוד", links: [
      registered("posts", "פוסטים"), ...(production ? [
        ["/post#posts-series-title", "סדרות פוסטים"], ["/verified", "פוסטים מאומתים"],
        registered("dimension-five"), registered("electricity"),
        registered("archive", "ארכיון לפי שנה ונושא"), ["/timeline", "ציר הזמן"],
      ] : []),
      registered("gallery", "גלריות ותמונות"),
    ] },
    { title: "העולם והממצאים", links: [
      registered("world"), registered("findings"), ...(production ? [
        ["/world?view=connections", "נושאים וחיבורים"], ["/world?view=sources", "אנשים ומקורות"],
        ["/world?view=explore", "גילוי לפי סוג הידע"], ["/world?view=live", "מה חדש בעולם"],
        ["/world?view=reality-map", "מפת המציאות"], ["/reality", "זרם המציאות"],
        ["/cross", "חידושי הצלבות"], ["/languages", "שבילי שפה"],
      ] : []), registered("books"), registered("beit-midrash"),
    ] },
    { title: "מספרים וצפנים", links: [
      registered("number", "מספר או ביטוי"), registered("gematria"),
      ["/community/calculator", "מחשבון הקהילה לשמות"], registered("codes"),
      registered("els", "כלי הצופן התנ״כי"), ["/codes/מחקר", "אוסף המחקר בצפנים"],
    ] },
    { title: "שידורים וסרטונים", links: [
      ...(production ? [["/broadcasts", "מרכז השידורים"], ["/post?media=video&view=videos", "כל הסרטונים"],
        ["/post?media=video", "פוסטים עם וידאו"], ["/melech-hamisparim/718", "מלך המספרים · 718"]] : []),
      ["/or-geula", "אור הגאולה"],
    ] },
    { title: "קהילה", links: [
      registered("or-geula", "הצ׳אט החי"), ["/community/researchers", "כותבי הקהילה"], ["/community/comments", "תגובות לפוסטים"],
    ] },
    ...(production ? [{ title: "הרצאות", links: [
      ["/category/הרצאות", "קטלוג ההרצאות"],
    ] }] : []),
    { title: "מידע ושירות", links: [
      registered("map"), ...(production ? [["/stats", "נתוני האתר"]] : []),
      registered("contact", "דיווח או הצעה"), ["/login", "כניסה לחשבון"],
      registered("updates", production ? "עדכונים במייל" : "עדכונים במייל · בהכנה"),
      registered("privacy", "פרטיות ומחיקת נתונים"),
    ] },
  ];
}

export function publicMapLinks2029(production) {
  const sections = publicMapGroups2029(production).flatMap(group => group.links);
  // The signed email action keeps its existing support link on the site map.
  return [...sections.filter(([href]) => href !== "/map"), ["/unsubscribe", "עזרה בהסרה מהדיוור"]];
}
