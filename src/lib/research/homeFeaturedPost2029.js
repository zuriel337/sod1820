// The Home featured post (ZURIEL 8.11.2026): ONE existing public Post shown first on Home, linked to its own address (never copied),
// with the "reality tree" note beneath it and the numbers that appear on screen in its video, labelled as what they are.
// Nothing here creates, classifies or changes a Post; a missing, hidden or suppressed Post renders nothing.
import { getPublicResearchClient } from "./researchViewMode.js";
import { publicPostOnlyFilter, hasSuppressedPublicPostTag } from "./publicPostBoundary.js";
import { publicPostHref } from "../publicPostUrls.js";
import { stripHtml } from "../format.js";

export const HOME_FEATURED_POST_2029 = Object.freeze({
  id: 5107,
  // The owner's headline for this card (ZURIEL 8.11.2026). It is a headline of the documentation, not a statement checked by the system; the
  // Post keeps its own title and address.
  // When this message was added (the clip was recorded 2026-11-08 06:18, Israel time). It orders the item in the shared feed; the Post keeps its own date.
  at: "2026-11-08T06:18:00+02:00",
  headline: "ממשלת אייזנקוט מושבעת — הרוב לגוש השינוי: 67 חברי כנסת",
  // Gematria connections, each value read from the canonical engine fn_method_value('רגיל', phrase) on 2026-11-08 (not from memory).
  connectionsTitle: "חיבורים במספרים — חישוב מאומת במנוע (שיטה רגילה)",
  connections: Object.freeze([
    Object.freeze({ value: 618, phrase: "משיח צדקינו" }),
    Object.freeze({ value: 396, phrase: "הישועה = דויד בן ישי" }),
    Object.freeze({ value: 14, phrase: "דוד" }),
    Object.freeze({ value: 78, phrase: "מחל" }),
    Object.freeze({ value: 87, phrase: "פ״ז — השנה תשפ״ז" }),
    Object.freeze({ value: 1000, phrase: "שרשר" }),
    Object.freeze({ value: 67, phrase: "בינה" }),
    Object.freeze({ value: 64, phrase: "דין — וההיפוך שלו 46" }),
  ]),
  // The prominent numbers under the message (ZURIEL 10.11.2026): each phrase's value read from the canonical engine fn_method_value('רגיל', phrase)
  // on 2026-11-10 (1234: ממשלת משיח בן דוד, התגלות השכינה · 1011: המשיח פועל במעשים, הגאלה תבא בהיסח הדעת, קץ זוהמת הנחש). The first 1011 line is the
  // date of the Knesset swearing-in (10.11.2026) read as the number 1011, not a letter calculation. Arithmetic only.
  highlights: Object.freeze([
    Object.freeze({ value: 1234, phrases: Object.freeze(["ממשלת משיח בן דוד", "התגלות השכינה"]) }),
    Object.freeze({ value: 1011, phrases: Object.freeze(["10.11.2026 — יום השבעת הכנסת ה־26", "המשיח פועל במעשים", "הגאלה תבא בהיסח הדעת", "קץ זוהמת הנחש"]), numberOnly: Object.freeze(["10.11.2026 — יום השבעת הכנסת ה־26"]) }),
  ]),
  // The update of the day band at the top of "עכשיו" (ZURIEL 10.11.2026): shown for three days starting 10.11.2026 (Asia/Jerusalem), then it disappears by
  // itself. It shows the WHOLE update — both number groups with every phrase (and the date line) and the sentence — taken from `highlights` and `statement`
  // above, so nothing is repeated or computed in the browser.
  band: Object.freeze({ from: "2026-11-10", days: 3, title: "עדכון היום · 10.11.2026" }),
  // The sentence the owner asked to keep with the numbers (also in the Post's update and in "עכשיו").
  statement: "מה שאנחנו רואים בעיניים — הכול פעולות של הבורא, שפועל דרך כל המציאות. אין כאן שום ימין ושום שמאל. הכול — אין עוד מלבדו.",
  connectionsFootnote: null, // no spelling footnote: each number says what it is (ZURIEL 8.11.2026: "don't load")
  // ONE text under the message (ZURIEL 8.11.2026: merge the note and the bridge; say it once). The owner's tree note in the public discovery voice
  // (public_language_revelation_geula_law: "מחקר" is not the public default: "תהליך המחקר/ממצאים" became "תהליך הגילוי/חיבורים"), opened by the line that the
  // Creator speaks through all of reality; the numbers live inside the Post.
  note: "הבורא מדבר דרך כל המציאות. התיעוד הזה הוא חלק מעץ המציאות שנבנה בימים אלה — מערכת המחברת בין אירועים, מקורות, מספרים ורמזים. החיבורים המוצגים כאן הם חלק מתהליך הגילוי והם עשויים להתפתח ככל שיתגלו עוד חיבורים. זה רק חלק — היכנסו לפוסט לראות.",
  noteLink: "לפוסט ←",
  // The video (public/media/posts/…, the same place as the earlier post videos; it is served after the next deploy).
  video: Object.freeze({ src: "/media/posts/2026-11-sharshar-crown/sharshar-crown.mp4", poster: "/media/posts/2026-11-sharshar-crown/sharshar-crown-poster.jpg", credit: "מקור הסרטון: שרשר המלך" }),
  // The message, in hint language: its first line is the SAME wording as the Post's own message block (ZURIEL 10.11.2026), arithmetic stated as arithmetic, interpretation labelled as such.
  messageTitle: "המסר",
  message: Object.freeze([
    "בקריאה המספרית המוצגת כאן, 46 משויך לגוש הימין ו־67 לגוש השינוי. אלה מספרים המשמשים בסיס להתבוננות ולחיבורים שבהמשך, ולא תיאור של חלוקת המנדטים הרשמית.",
    "46 הוא היפוך של 64, דין. וכשהופכים את המבט, מה שנראה דין מתגלה כרחמים — וזה סוד הבינה, 67.",
    "מאחורי שני הגושים עומד כוח אחד: הבורא. כך גם משתקף בשרשר = 1000 — אין בעולם אלא כוח אחד.",
  ]),
  // Numbers that are visible on the screen recording of the video (read from its frames, 8.11.2026). They are shown as numbers with their
  // on-screen role only; the first group is part of the clip's own screen, the last two are the recording phone's clock and battery.
  numbersTitle: "המספרים שמופיעים על המסך בסרטון",
  numbers: Object.freeze([
    Object.freeze({ value: "14", label: "לוגו ערוץ 14 ברקע" }),
    Object.freeze({ value: "1,437", label: "לייקים" }),
    Object.freeze({ value: "140", label: "תגובות" }),
    Object.freeze({ value: "396", label: "שיתופים" }),
    Object.freeze({ value: "78", label: "שמירות" }),
    Object.freeze({ value: "6:18", label: "שעת ההקלטה" }),
    Object.freeze({ value: "14", label: "סוללה בהקלטה" }),
  ]),
});

/** Pure: the Home card of the featured Post from its public row; null when it must not be shown. */
export function projectHomeFeaturedPost(row, config = HOME_FEATURED_POST_2029) {
  if (!row || Number(row.id) !== config.id || !row.slug || row.home_hidden === true || hasSuppressedPublicPostTag(row)) return null;
  const title = stripHtml(row.title == null ? "" : String(row.title)).trim();
  if (!title) return null;
  return { id: config.id, slug: String(row.slug), message: config.message, messageTitle: config.messageTitle, noteLink: config.noteLink, video: config.video, title: config.headline || title, postTitle: title, headline: config.headline || null, connections: config.connections, connectionsTitle: config.connectionsTitle, connectionsFootnote: config.connectionsFootnote, highlights: config.highlights || [], statement: config.statement || null, poster: row.thumb_url || row.image_url || null, href: publicPostHref(row), note: config.note, numbers: config.numbers, numbersTitle: config.numbersTitle };
}

export async function getHomeFeaturedPost2029({ client = null, signal, config = HOME_FEATURED_POST_2029 } = {}) {
  const row = await getFeaturedPostRow2029({ client, signal, config });
  if (signal?.aborted) throw new DOMException("canceled", "AbortError");
  return projectHomeFeaturedPost(row, config);
}

/** One body: headline, note, the numbers on screen, the engine-checked connections and the interpretation — shown with the video on Home AND in "עכשיו". */
export function featuredBodyText(config = HOME_FEATURED_POST_2029) {
  return [
    config.headline, `${config.messageTitle}: ${config.message.join(" ")}`,
    config.statement || null,
    ...(config.highlights || []).map(group => group.phrases.map(phrase => `${phrase} = ${group.value}`).join(" · ")),
    config.note,
    `${config.numbersTitle}: ${config.numbers.map(item => `${item.value} (${item.label})`).join(" · ")}`,
    `${config.connectionsTitle}: ${config.connections.map(item => `${item.value} = ${item.phrase}`).join(" · ")}${config.connectionsFootnote ? `. ${config.connectionsFootnote}` : ""}`,
  ].filter(Boolean).join("\n");
}

/** The ONE shared-feed item of the featured Post: same identity as the stream's own `post:<id>` item (so it can never appear twice), enriched with the whole body. */
export function featuredFeedItem(row, postRowToWorldUpdate, config = HOME_FEATURED_POST_2029) {
  // `postRowToWorldUpdate` is the stream's own projector (the same one that builds every Post item), passed in so this module stays light.
  const base = typeof postRowToWorldUpdate === "function" && projectHomeFeaturedPost(row, config) && postRowToWorldUpdate(row);
  if (!base) return null;
  const at = new Date(config.at).toISOString();
  return { ...base, label: config.headline || base.label, summary: config.message[1].slice(0, 240), fullText: featuredBodyText(config), at, arrivalAt: at, pinned: true, liveDot: "עדכון חדש בפוסט", band: config.band ? { ...config.band, groups: (config.highlights || []).map(group => ({ value: group.value, phrases: [...group.phrases], numberOnly: [...(group.numberOnly || [])] })), statement: config.statement || null } : null };
}

// One public read shared by Home and the feed hook (cached for a minute): never two requests for the same Post.
let cached = null;
export function getFeaturedPostRow2029({ client, signal, config = HOME_FEATURED_POST_2029 } = {}) {
  const now = Date.now();
  if (!client && cached && now - cached.at < 60000) return cached.promise;
  const c = client || getPublicResearchClient();
  const promise = (async () => {
    let query = c.from("posts").select("id,slug,title,excerpt,image_url,thumb_url,date,created_at,tags,categories,author,source,link,wp_id,home_hidden")
      .or(publicPostOnlyFilter()).eq("id", config.id).limit(1);
    const { data, error } = await query;
    if (error) throw error;
    return Array.isArray(data) ? data[0] || null : null;
  })();
  if (!client) { cached = { at: now, promise }; promise.catch(() => { if (cached?.promise === promise) cached = null; }); }
  return promise;
}
