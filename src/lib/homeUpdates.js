// 📜 מקור-אמת יחיד ל«עדכונים אחרונים» — אותו source + אותה visibility בדיוק כמו דף הבית.
// נועד לשימוש-חוזר בפוסט/צ'אט בלי מערכת-visibility מקבילה (reuse Home logic, לא query חדש).
// ⚠️ אם הבית מסתיר פריט (home_hidden / תגית / curator_hidden / anchor-cipher) — הוא מוסתר גם כאן,
//    כי אלה בדיוק אותן פונקציות-שליפה ואותו סינון שהבית משתמש בהם.
import { getPostsFromSupabase, getGalleryUpdates, getFeaturedResearchers } from "./supabase.js";
import { getSystemCiphers } from "./elsMatrices.js";   // צפני-מערכת — אותו מקור כמו HomeNewPage

// 🔠 עוגן צפני-מערכת ל«עדכונים אחרונים» — קבוע (זהה ל-HomeNewPage), לא חלון-זמן.
export const CIPHER_FEED_SINCE = new Date("2026-07-21T12:30:00Z").getTime();

// 🙈 ויזיביליטי-בית לפוסט — זהה מילה-במילה ל-HomeNewPage (מקור-אמת יחיד).
export const hiddenAtHome = (p) =>
  p.home_hidden === true ||
  (p.tags || []).includes("לא-בבית") ||
  (p.tags || []).some((t) => /ינוק/.test(t)) ||
  /ינוק/.test(p.title || "");

// פוסטים לבית — אותה שאילתה + סינון + חיתוך של HomeNewPage (limit 32 → סינון → 18 ראשונים).
export async function fetchHomePosts() {
  const { posts } = await getPostsFromSupabase({ limit: 32, orderBy: "modified" });
  return (posts || []).filter((p) => !hiddenAtHome(p)).slice(0, 18);
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
