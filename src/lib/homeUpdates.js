// 📜 מקור-אמת יחיד ל«עדכונים אחרונים» — אותו source + אותה visibility בדיוק כמו דף הבית.
// נועד לשימוש-חוזר בפוסט/צ'אט בלי מערכת-visibility מקבילה (reuse Home logic, לא query חדש).
// ⚠️ אם הבית מסתיר פריט (home_hidden / תגית / curator_hidden / anchor-cipher) — הוא מוסתר גם כאן,
//    כי אלה בדיוק אותן פונקציות-שליפה ואותו סינון שהבית משתמש בהם.
import { supabase, getPostsFromSupabase, getGalleryUpdates, getFeaturedResearchers } from "./supabase.js";
import { getSystemCiphers } from "./elsMatrices.js";   // צפני-מערכת — אותו מקור כמו HomeNewPage

// 🔠 עוגן צפני-מערכת ל«עדכונים אחרונים» — קבוע (זהה ל-HomeNewPage), לא חלון-זמן.
export const CIPHER_FEED_SINCE = new Date("2026-07-21T12:30:00Z").getTime();

// 🙈 ויזיביליטי-בית לפוסט — זהה מילה-במילה ל-HomeNewPage (מקור-אמת יחיד).
export const hiddenAtHome = (p) =>
  p.home_hidden === true ||
  (p.tags || []).includes("לא-בבית") ||
  (p.tags || []).some((t) => /ינוק/.test(t)) ||
  /ינוק/.test(p.title || "");

const isPinnedPost = (p) => !!p && (p.tree_priority ?? 0) >= 50;
const postWhen = (p) => Math.max(+new Date(p?.modified || 0), +new Date(p?.date || 0));
const postKey = (p) => String(p?.id ?? p?.slug ?? "");

// 📌 נעוצים אינם תלויים בחלון «האחרונים»: פוסט שנעוץ חייב להישאר גלוי בכל משטח
// Latest Updates גם אם הוא ישן מכדי להיכלל ב-32 הרשומות האחרונות. זו אותה posts table,
// אותם חוקי visibility, ורק projection נוסף של tree_priority — לא feed/store חדש.
async function fetchPinnedHomePosts() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .gte("tree_priority", 50)
    .not("tags", "cs", "{טיוטה}")
    .not("tags", "cs", "{פורום}")
    .order("tree_priority", { ascending: false, nullsFirst: false })
    .order("modified", { ascending: false, nullsFirst: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

// פוסטים לבית/Latest Updates — 18 האחרונים + כל הנעוצים, גם אם הם מחוץ לחלון האחרון.
// dedup לפי זהות הפוסט; נעוצים תמיד ראשונים, ואז האחרונים לפי זמן. נעוץ מוסתר נשאר מוסתר.
export async function fetchHomePosts() {
  const [{ posts: recent }, pinned] = await Promise.all([
    getPostsFromSupabase({ limit: 32, orderBy: "modified" }),
    fetchPinnedHomePosts(),
  ]);

  const visiblePinned = (pinned || []).filter((p) => isPinnedPost(p) && !hiddenAtHome(p));
  const visibleRecent = (recent || []).filter((p) => !hiddenAtHome(p)).slice(0, 18);
  const seen = new Set();
  const merged = [];

  for (const p of [...visiblePinned, ...visibleRecent]) {
    const key = postKey(p);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(p);
  }

  return merged.sort((a, b) => {
    const pa = isPinnedPost(a) ? 1 : 0;
    const pb = isPinnedPost(b) ? 1 : 0;
    if (pa !== pb) return pb - pa;
    if (pa && pb && (a.tree_priority ?? 0) !== (b.tree_priority ?? 0)) {
      return (b.tree_priority ?? 0) - (a.tree_priority ?? 0);
    }
    return postWhen(b) - postWhen(a);
  });
}

// כל מקורות «עדכונים אחרונים» יחד — posts · hints (זרם) · researchers (כתבים) · ciphers (צפני-מערכת),
// כל אחד דרך אותה פונקציה שהבית קורא לה → אותה visibility. שגיאה בענף בודד לא מפילה את השאר.
export async function fetchHomeUpdates() {
  const [posts, hints, researchers, ciphersRaw] = await Promise.all([
    fetchHomePosts().catch(() => []),
    getGalleryUpdates(40).catch(() => []),
    getFeaturedResearchers(6).catch(() => []),
    getSystemCiphers(20).catch(() => []),
  ]);
  const ciphers = (ciphersRaw || []).filter((c) => +new Date(c.created_at || 0) >= CIPHER_FEED_SINCE);
  return { posts: posts || [], hints: hints || [], researchers: researchers || [], ciphers };
}
