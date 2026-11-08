// The Home featured post (ZURIEL 8.11.2026): ONE existing public Post shown first on Home, linked to its own address (never copied),
// with the "reality tree" note beneath it and the numbers that appear on screen in its video, labelled as what they are.
// Nothing here creates, classifies or changes a Post; a missing, hidden or suppressed Post renders nothing.
import { getPublicResearchClient } from "./researchViewMode.js";
import { publicPostOnlyFilter, hasSuppressedPublicPostTag } from "./publicPostBoundary.js";
import { publicPostHref } from "../publicPostUrls.js";
import { stripHtml } from "../format.js";

export const HOME_FEATURED_POST_2029 = Object.freeze({
  id: 5107,
  note: "התיעוד הזה הוא חלק מעץ המציאות שנבנה בימים אלה — מערכת המחברת בין אירועים, מקורות, מספרים ורמזים. החיבורים המוצגים כאן הם חלק מתהליך המחקר והם עשויים להתפתח ככל שיתווספו ממצאים.",
  // Numbers that are visible on the screen recording of the video (read from its frames, 8.11.2026). They are shown as numbers with their
  // on-screen role only; the first group is part of the clip's own screen, the last two are the recording phone's clock and battery.
  numbersTitle: "המספרים שמופיעים על המסך בסרטון",
  numbers: Object.freeze([
    Object.freeze({ value: "14", label: "לוגו ערוץ 14 ברקע" }),
    Object.freeze({ value: "1,437", label: "לייקים" }),
    Object.freeze({ value: "140", label: "תגובות" }),
    Object.freeze({ value: "396", label: "שיתופים" }),
    Object.freeze({ value: "78", label: "שמירות" }),
    Object.freeze({ value: "6", label: "חברים (סימון בתחתית)" }),
    Object.freeze({ value: "6:18", label: "שעת ההקלטה" }),
    Object.freeze({ value: "14", label: "סוללה בהקלטה" }),
  ]),
});

/** Pure: the Home card of the featured Post from its public row; null when it must not be shown. */
export function projectHomeFeaturedPost(row, config = HOME_FEATURED_POST_2029) {
  if (!row || Number(row.id) !== config.id || !row.slug || row.home_hidden === true || hasSuppressedPublicPostTag(row)) return null;
  const title = stripHtml(row.title == null ? "" : String(row.title)).trim();
  if (!title) return null;
  return { id: config.id, slug: String(row.slug), title, poster: row.thumb_url || row.image_url || null, href: publicPostHref(row), note: config.note, numbers: config.numbers, numbersTitle: config.numbersTitle };
}

export async function getHomeFeaturedPost2029({ client = getPublicResearchClient(), signal, config = HOME_FEATURED_POST_2029 } = {}) {
  if (!client) throw new Error("public_posts_unavailable");
  let query = client.from("posts").select("id,slug,title,image_url,thumb_url,date,tags,categories,author,source,link,wp_id,home_hidden")
    .or(publicPostOnlyFilter()).eq("id", config.id).limit(1);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  return projectHomeFeaturedPost(Array.isArray(data) ? data[0] : null, config);
}
