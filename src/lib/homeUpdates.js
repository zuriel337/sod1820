// 📜 מקור-אמת יחיד ל«עדכונים אחרונים» — אותו source + אותה visibility בדיוק כמו דף הבית.
// נועד לשימוש-חוזר בפוסט/צ'אט בלי מערכת-visibility מקבילה (reuse Home logic, לא query חדש).
// ⚠️ אם הבית מסתיר פריט (home_hidden / תגית / curator_hidden / anchor-cipher) — הוא מוסתר גם כאן,
//    כי אלה בדיוק אותן פונקציות-שליפה ואותו סינון שהבית משתמש בהם.
import { supabase, SUPABASE_URL, SUPABASE_ANON, getPostsFromSupabase, getGalleryUpdates, getFeaturedResearchers } from "./supabase.js";
import { getSystemCiphers } from "./elsMatrices.js";   // צפני-מערכת — אותו מקור כמו HomeNewPage

// 🔠 עוגן צפני-מערכת ל«עדכונים אחרונים» — קבוע (זהה ל-HomeNewPage), לא חלון-זמן.
export const CIPHER_FEED_SINCE = new Date("2026-07-21T12:30:00Z").getTime();

// 🙈 ויזיביליטי-בית לפוסט — זהה מילה-במילה ל-HomeNewPage (מקור-אמת יחיד).
export const hiddenAtHome = (p) =>
  p.home_hidden === true ||
  (p.tags || []).includes("לא-בבית") ||
  (p.tags || []).some((t) => /ינוק/.test(t)) ||
  /ינוק/.test(p.title || "");

// 📌 סמנטיקת-נעיצה אחת לכל משטחי הפוסטים. tree_priority נשאר מקור-האמת; אין flag/feed מקביל.
export const isPinnedPost = (p) => !!p && (p.tree_priority ?? 0) >= 50;
const postWhen = (p) => Math.max(+new Date(p?.modified || 0), +new Date(p?.date || 0));
const postKey = (p) => String(p?.id ?? p?.wp_id ?? p?.slug ?? "");

// 📌 שליפה משותפת של כל הפוסטים הנעוצים, עם אותם facets בסיסיים של /post.
// נעוץ = דירוג/הצגה, לא עקיפה של פילטר: בקטגוריה/תגית/שנה/כותב נציג רק נעוצים ששייכים לאותו חתך.
// draft/forum נשארים מחוץ לפיד הציבורי בדיוק כמו getPostsFromSupabase כאשר אין tag מפורש.
export async function fetchPinnedPosts({ category = null, tag = null, year = null, author = null, limit = 50 } = {}) {
  if (!supabase) return [];
  let q = supabase
    .from("posts")
    .select("*")
    .gte("tree_priority", 50)
    .order("tree_priority", { ascending: false, nullsFirst: false })
    .order("modified", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (category) q = q.contains("categories", [category]);
  if (tag) q = q.contains("tags", [tag]);
  else q = q.not("tags", "cs", "{טיוטה}").not("tags", "cs", "{פורום}");
  if (author) q = q.eq("author", author);
  if (year) q = q.gte("date", `${year}-01-01`).lte("date", `${year}-12-31T23:59:59`);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// 🧊 PostgREST responses do not currently guarantee browser cache-busting.
// Legacy Home is a "what changed now" surface, so its public post reads must be fresh.
// Keep this scoped here: no global Supabase-client override and no parallel feed/store.
const publicHomePostsUrl = ({ limit = 32, pinned = false } = {}) => {
  const url = new URL(`${SUPABASE_URL}/rest/v1/posts`);
  url.searchParams.set("select", "*");
  if (pinned) {
    url.searchParams.set("tree_priority", "gte.50");
    url.searchParams.set("order", "tree_priority.desc.nullslast,modified.desc.nullslast");
  } else {
    url.searchParams.set("order", "modified.desc.nullslast");
  }
  url.searchParams.set("limit", String(limit));
  url.searchParams.append("tags", "not.cs.{טיוטה}");
  url.searchParams.append("tags", "not.cs.{פורום}");
  return url.toString();
};

export async function fetchFreshPublicHomePosts({ limit = 32, pinned = false, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("fetch unavailable");
  const res = await fetchImpl(publicHomePostsUrl({ limit, pinned }), {
    cache: "no-store",
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Legacy Home posts request failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// פוסטים לבית/Latest Updates — 18 האחרונים + כל הנעוצים, גם אם הם מחוץ לחלון האחרון.
// fresh-first: כל ענף נטען בנפרד, כך שכשל בנעוצים לא מוחק את הפוסטים האחרונים ולהפך.
// fallback ל-client הישן שומר זמינות במקרה של כשל רשת זמני.
export async function fetchHomePosts() {
  const [freshRecent, freshPinned] = await Promise.allSettled([
    fetchFreshPublicHomePosts({ limit: 32 }),
    fetchFreshPublicHomePosts({ limit: 50, pinned: true }),
  ]);

  let recent;
  if (freshRecent.status === "fulfilled") {
    recent = freshRecent.value;
  } else {
    try {
      const fallback = await getPostsFromSupabase({ limit: 32, orderBy: "modified" });
      recent = fallback.posts || [];
    } catch {
      // The recent branch is the essential Home feed. Bubble failure so the page keeps
      // its last good snapshot instead of replacing it with an empty/stale partial list.
      throw new Error("Legacy Home recent posts unavailable");
    }
  }

  const pinned = freshPinned.status === "fulfilled"
    ? freshPinned.value
    : await fetchPinnedPosts().catch(() => []);

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
