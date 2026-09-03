import { createClient } from '@supabase/supabase-js';
import { signupAttribution } from './acquisition.js';
import { isAnon } from './privacy.js';
import { isReadable } from './nameMask.js';
import { AUTHORS } from './authors.js';
import { stripHtml } from './format.js';
import { METHOD_DB_COLS } from './gematria.js';

// 🔑 מיוצאים כדי לאפשר fetch ישיר ל-PostgREST במקומות שדורשים עקיפת-קאש (cache:no-store) —
// למשל עמוד-הצופן הקנוני, שאחרי עריכה/שמירה-מחדש חייב תמיד את הרשומה הטרייה (התגובה מ-PostgREST
// חוזרת בלי Cache-Control → הדפדפן חופשי להגיש JSON ישן). ראה getMatrixBySlug.
export const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
export const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

export default supabase;
export { supabase };

export async function getPostsFromSupabase({ limit = 10, page = 1, category = null, tag = null, year = null, author = null, orderBy = 'date', ascending = false } = {}) {
  if (!supabase) return { posts: [], total: 0 };
  let query = supabase
    .from('posts')
    .select('*', { count: 'exact' })
    .order(orderBy, { ascending, nullsFirst: false })
    .range((page - 1) * limit, page * limit - 1);

  if (category) query = query.contains('categories', [category]);
  if (tag) query = query.contains('tags', [tag]);
  else query = query.not('tags', 'cs', '{טיוטה}').not('tags', 'cs', '{פורום}');   // טיוטות + פוסטים שנותבו לפורום (tag 'פורום') מוסתרים מפידי-הפוסטים הציבוריים — חיים רק בפורום (getForumFeed)
  if (author) query = query.eq('author', author);
  if (year) {
    query = query
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31T23:59:59`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { posts: data ?? [], total: count ?? 0 };
}

// 🎬 כל סרטוני «מימד חמש» — לפיד-הרצף (נגן סגנון Shorts/YouTube). מושך את פוסטי התגית,
//    מסנן רק כאלה עם וידאו (.mp4 בתוכן), ומחלץ וידאו/פוסטר/כתוביות. ממוין מהחדש לישן.
export async function getDimensionFiveVideos() {
  try {
    const { posts } = await getPostsFromSupabase({ tag: "מימד חמש", limit: 50, orderBy: "modified" });
    const items = [];
    for (const p of (posts || [])) {
      if ((p.tags || []).includes("טיוטה") || (p.tags || []).includes("פורום")) continue;   // רק טיוטה/פורום יורדים מהפיד — לא home_hidden
      const c = typeof p.content === "string" ? p.content : "";
      const mp4 = c.match(/https?:\/\/[^"'\s]+\.mp4/i);
      if (mp4) {
        const video_url = mp4[0];
        const poster = (c.match(/poster="([^"]+)"/i) || [])[1] || p.image_url || null;
        const heM = c.match(/src="([^"]+)"[^>]*srclang="he"/i) || c.match(/srclang="he"[^>]*src="([^"]+)"/i);
        const enM = c.match(/src="([^"]+)"[^>]*srclang="en"/i) || c.match(/srclang="en"[^>]*src="([^"]+)"/i);
        items.push({
          id: p.id, slug: p.slug, title: p.title, kind: "video",
          video_url, poster, card: p.image_url || poster,
          he_vtt: (heM && heM[1]) || video_url.replace(/\.mp4$/i, ".he.vtt"),
          en_vtt: (enM && enM[1]) || video_url.replace(/\.mp4$/i, ".en.vtt"),
        });
        continue;
      }
      // 🖼️ פוסט-תמונה בסגנון-טיקטוק — אין וידאו אך יש אודיו (מוזיקה) + תמונה + מלל (למשל «הודעה גלקטית»).
      //    במציג-הפיד המשתמש כבר מחליק (יש gesture) → המוזיקה מתנגנת אוטומטית, בניגוד לכניסה רגילה לפוסט.
      const aud = c.match(/https?:\/\/[^"'\s]+\.(?:m4a|mp3|aac|ogg)/i);
      if (aud) {
        const img = (c.match(/<img[^>]+src="([^"]+)"/i) || [])[1] || p.image_url || null;
        items.push({
          id: p.id, slug: p.slug, title: p.title, kind: "photo",
          audio_url: aud[0], image: img, card: p.image_url || img,
          html: c,
        });
        continue;
      }
    }
    return items;
  } catch { return []; }
}

// 🙈 אדמין — הסתר/הצג פוסט מ«עדכונים אחרונים» בבית (posts.home_hidden דרך RPC מאובטח rd_is_admin).
//    הפוסט נשאר חי בקטגוריות/‏/post/בעמוד עצמו — מוסתר רק מרצועת-הבית.
export async function adminSetPostHomeHidden(id, hidden) {
  if (!supabase || id == null) return false;
  const { error } = await supabase.rpc('admin_set_post_home_hidden', { p_id: id, p_hidden: !!hidden });
  return !error;
}
// 🙈 אדמין — הסתר/הצג פריט-ערוץ מהטיקר ומכל הפידים (channel_updates.status='hidden'/'live';
//    כל הרכיבים מסננים status='live' → הסתרה אחת מעלימה מכל מקום).
export async function adminSetChannelUpdateHidden(id, hidden) {
  if (!supabase || id == null) return false;
  const { error } = await supabase.rpc('admin_set_channel_update_hidden', { p_id: id, p_hidden: !!hidden });
  return !error;
}
// 🙈 אדמין — הסתר/הצג צופן מ«עדכונים אחרונים» בבית (els_records.home_hidden; נשאר חי ב-/codes ובספרייה).
export async function adminSetCipherHomeHidden(id, hidden) {
  if (!supabase || id == null) return false;
  const { error } = await supabase.rpc('admin_set_cipher_home_hidden', { p_id: id, p_hidden: !!hidden });
  return !error;
}
// ↩️ אדמין — כל הפריטים שהוסתרו (לפאנל «בטל הסתרה»): פוסטים · צפנים · פריטי-ערוץ · רמזי-זרם.
export async function getHiddenHomeItems() {
  if (!supabase) return { posts: [], ciphers: [], channels: [], hints: [] };
  const [posts, ciphers, channels, hints] = await Promise.all([
    supabase.from('posts').select('id,slug,title,image_url').eq('home_hidden', true).order('modified', { ascending: false }).limit(60).then(r => r.data || []).catch(() => []),
    supabase.from('els_records').select('id,slug,title,search_term').eq('home_hidden', true).order('created_at', { ascending: false }).limit(60).then(r => r.data || []).catch(() => []),
    supabase.from('channel_updates').select('id,text,credit,channel,image_url').eq('status', 'hidden').order('created_at', { ascending: false }).limit(60).then(r => r.data || []).catch(() => []),
    supabase.from('gallery_images').select('id,name,primary_value,image_url,thumb_url').eq('source', 'update').eq('curator_hidden', true).order('stream_at', { ascending: false }).limit(60).then(r => r.data || []).catch(() => []),
  ]);
  return { posts, ciphers, channels, hints };
}

// 🎬 פוסטי «קוד המציאות» — עדשת המציאות/קולנוע. מאחד את כל התגיות של העולם הזה
// (מימד חמש · מטריקס · משחקי הדיונון · קולנוע/סרטים) + קטגוריית «הצופן בסרטים», ממוזג
// ומדורג לפי תאריך-עדכון. עץ אחד — לא טבלה חדשה, רק עדשה על posts.
export const REALITY_CODE_TAGS = ["מימד חמש", "מטריקס", "משחקי הדיונון", "קולנוע"];
export const REALITY_CODE_CATS = ["הצופן בסרטים"];
export async function getRealityCodePosts(limit = 12) {
  if (!supabase) return [];
  try {
    const [byTag, byCat] = await Promise.all([
      supabase.from("posts").select("*").overlaps("tags", REALITY_CODE_TAGS).order("modified", { ascending: false, nullsFirst: false }).limit(limit),
      supabase.from("posts").select("*").overlaps("categories", REALITY_CODE_CATS).order("modified", { ascending: false, nullsFirst: false }).limit(limit),
    ]);
    const map = new Map();
    for (const p of [...(byTag.data || []), ...(byCat.data || [])]) map.set(p.id ?? p.wp_id, p);
    return [...map.values()]
      .sort((a, b) => new Date(b.modified || b.date) - new Date(a.modified || a.date))
      .slice(0, limit);
  } catch { return []; }
}

// גלריית הסרטים בדף הבית — נמשכת מהטבלה home_videos (ניהול ע"י צוריאל, בלי שינוי קוד).
// חוזרת ריק אם אין נתונים/כשל → VideoGallery נופל לרשימת ברירת-המחדל בקוד.
export async function getHomeVideos({ limit = 24 } = {}) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("home_videos")
      .select("yt, title, slug, featured, uploaded_at, video_url, poster_url, cipher_slug, pinned")
      .eq("is_active", true)
      .order("featured", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true })
      .limit(limit);
    if (error) return [];
    return data || [];
  } catch { return []; }
}

// 🎬 סרטוני-כותב (למשל אלון לוי) לגלריית-הבית — נמשכים אוטומטית מהפוסטים שלו שיש בהם וידאו.
// מוחזר בצורת שורת-גלריה (video_url=mp4 מהתוכן · poster_url=image_url · uploaded_at=תאריך הפוסט).
export async function getAuthorGalleryVideos(author, { limit = 12 } = {}) {
  if (!supabase || !author) return [];
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("id, slug, title, image_url, content, date, author")
      .eq("author", author)
      .order("date", { ascending: false, nullsFirst: false })
      .limit(40);
    if (error || !data) return [];
    const out = [];
    for (const p of data) {
      const m = typeof p.content === "string" && p.content.match(/https?:\/\/[^"'\s]+\.mp4/i);
      if (!m) continue;
      out.push({
        yt: null, title: stripHtml(p.title || ""), slug: p.slug || null,
        video_url: m[0], poster_url: p.image_url || null,
        uploaded_at: p.date ? String(p.date).slice(0, 10) : null,
        featured: false, pinned: false, cipher_slug: null, author: p.author || author,
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch { return []; }
}

// 🎬 סרטוני-קטגוריה (למשל 'וידאו') לספריית-הסרטים — כל פוסט בקטגוריה נכנס אוטומטית.
// החילוץ (mp4 מאוחסן / קישור YouTube) נעשה בצד-השרת (RPC get_category_videos) כדי לא לשלוח
// את גוף-הפוסטים ללקוח. פוסט בלי מקור-ניגון מזוהה (post_only) → כרטיס שמפנה לפוסט.
export async function getCategoryVideos(category = "וידאו", { limit = 60 } = {}) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc("get_category_videos", { p_category: category, p_limit: limit });
    if (error || !data) return [];
    return data.map(r => ({
      yt: r.yt || null,
      title: stripHtml(r.title || ""),
      slug: r.slug || null,
      video_url: r.video_url || null,
      poster_url: r.poster_url || (r.yt ? `https://i.ytimg.com/vi/${r.yt}/hqdefault.jpg` : null),
      uploaded_at: r.uploaded_at || null,
      author: r.author || null,
      featured: false, pinned: false, cipher_slug: null,
      is_cipher: !!r.is_cipher,
      post_only: !!r.post_only,
    }));
  } catch { return []; }
}

// 🎬 גלריית-הסרטים בבית — **החומר שלנו בלבד** (מציאות/צפנים/מספרים), החדש ראשון, כוכב על צפנים.
// עדשה ממוקדת: פוסטים עם וידאו מתנגן בקטגוריות שלנו (צפונות בתורה·הצופן בסרטים·תיעוד אירועים·
// סוד האותיות והמספרים), **בלי הצפת החיזוק/הרצאות** (מחריגים «מזכה הרבים» + קטגוריות-חיזוק).
// מחליף את המשיכה הישנה מכל קטגוריית «וידאו» (185 פוסטים, רובם לא שלנו). is_cipher=צופן→כוכב.
export async function getRealityVideos({ limit = 40 } = {}) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc("get_reality_videos", { p_limit: limit });
    if (error || !data) return [];
    return data.map(r => ({
      yt: r.yt || null,
      title: stripHtml(r.title || ""),
      slug: r.slug || null,
      video_url: r.video_url || null,
      poster_url: r.poster_url || (r.yt ? `https://i.ytimg.com/vi/${r.yt}/hqdefault.jpg` : null),
      uploaded_at: r.uploaded_at || null,
      author: r.author || null,
      featured: false, pinned: false, cipher_slug: null,
      is_cipher: !!r.is_cipher,
      post_only: !!r.post_only,
    }));
  } catch { return []; }
}

// 🆕 2 הפוסטים האחרונים (לפי זמן-עדכון) — לרצועת-הגילוי לנוחתים מגוגל. מחזיר slug/כותרת/כרזה/עדכון.
export async function getLatestPostCards({ limit = 2, excludeSlug = null } = {}) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from("posts")
      .select("id, slug, title, image_url, thumb_url, date, modified, tags")
      .not("slug", "is", null)
      .order("modified", { ascending: false, nullsFirst: false })
      .limit(limit + 5);
    if (error || !data) return [];
    return data
      .filter(p => p.slug && p.slug !== excludeSlug && !(Array.isArray(p.tags) && p.tags.includes("טיוטה")))
      .slice(0, limit)
      .map(p => ({ slug: p.slug, title: stripHtml(p.title || ""), poster: p.thumb_url || p.image_url || null, modified: p.modified || p.date || null }));
  } catch { return []; }
}

// 🎬 סטוריז-הסרטונים שלנו — **כל מה שעולה לקטגוריית וידאו** (החומר שלנו: צפנים + מציאות + מספרים,
// בלי הצפת חיזוק), כרשימת-סטוריז שמתנגנת (mp4 או יוטיוב). המבקר רואה עד 3 לא-נצפים; מי שצפה
// באחד — נעלם לו (seen), והבא-אחריו-אחורה צף. תאריך-עלייה לכל אחד. ציון is_cipher לצפנים (🦅).
export async function getVideoStories({ limit = 10 } = {}) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.rpc("get_reality_videos", { p_limit: 200 });
    if (!Array.isArray(data)) return [];
    return data
      .filter(r => r && (r.video_url || r.yt))
      .slice(0, limit)
      .map(r => ({
        id: `vid:${r.slug}`,
        text: stripHtml(r.title || ""),
        image_url: r.video_url || (r.yt ? `https://i.ytimg.com/vi/${r.yt}/hqdefault.jpg` : null),   // mp4 מנגן ב-<video>; יוטיוב מזוהה דרך yt
        yt: r.yt || null,
        thumb_url: r.poster_url || (r.yt ? `https://i.ytimg.com/vi/${r.yt}/hqdefault.jpg` : null),
        link_url: r.slug ? "/" + r.slug : null,
        is_video: true, ours: true, is_cipher: !!r.is_cipher, created_at: r.uploaded_at, priority: 2000,
      }));
  } catch { return []; }
}

// 📌 הצופן הנעוץ — סטורי יחיד שנעוץ ראשון ברצועת-הצ'אט. **מנגן את הסרט עצמו** (image_url=mp4 →
// StoryViewer מנגן וידאו), לא מנווט לפוסט. המקור: home_videos (הסרטון-צופן המנוהל, mp4 נעוץ/אחרון).
export async function getPinnedCipherStory() {
  if (!supabase) return null;
  try {
    // הצופן החדש ביותר בקטגוריית «צפונות בתורה» שיש לו וידאו מתנגן (mp4) — אוטומטי: כל צופן
    // חדש שיעלה עם סרטון יינעץ ראשון. ה-RPC כבר מחלץ video_url ומסדר לפי תאריך יורד.
    const { data } = await supabase.rpc("get_category_videos", { p_category: "צפונות בתורה", p_limit: 30 });
    const v = Array.isArray(data) ? data.find(r => r && r.video_url) : null;
    if (!v) return null;
    return {
      id: `cipher:${v.slug}`,
      text: stripHtml(v.title || ""),
      image_url: v.video_url,                                                    // mp4 → הסטורי מנגן את הסרט
      thumb_url: v.poster_url || (v.yt ? `https://i.ytimg.com/vi/${v.yt}/hqdefault.jpg` : null),
      link_url: v.slug ? "/" + v.slug : null,
      is_video: true, cipher: true, created_at: v.uploaded_at, priority: 2000,
    };
  } catch { return null; }
}

// 🔯 «צפונות בתורה» — סטוריז ממותגים (כתר «כי לה׳ המלוכה») לדף הצ'אט. עדשה על הפוסטים
// לפי **קטגוריה** (צפונות בתורה + הצופן בסרטים), לא תגיות. לחיצה מנווטת לפוסט (link_url).
// מוחזר בצורת שורת-סטורי (כמו channel_updates) כדי לעבוד עם אותו רכיב קנוני (OrGeulaStoryColumn).
export async function getTzofonStories({ limit = 30 } = {}) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("id, slug, title, image_url, thumb_url, date")
      .overlaps("categories", ["צפונות בתורה", "הצופן בסרטים"])
      .not("image_url", "is", null)
      .order("date", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map(r => ({
      id: r.id,
      text: stripHtml(r.title || ""),
      image_url: r.thumb_url || r.image_url,   // כרזה (תמונה) — התצוגה מציגה אותה; הניגון בפוסט
      thumb_url: r.thumb_url || r.image_url,
      link_url: "/" + r.slug,
      is_video: true,                          // כרטיס-וידאו (מסמן ▶) — הסרטון מתנגן בפוסט
      created_at: r.date,
      priority: 100,
      credit: "צפונות בתורה · סוד 1820",
    }));
  } catch { return []; }
}

// סרטון-גלריה המקושר לצופן (cipher_slug) — לחיבור דו-כיווני בעמוד הצופן /codes/:slug
export async function getHomeVideoByCipher(cipherSlug) {
  if (!supabase || !cipherSlug) return null;
  try {
    const { data, error } = await supabase
      .from("home_videos")
      .select("yt, title, slug, video_url, poster_url")
      .eq("is_active", true)
      .eq("cipher_slug", cipherSlug)
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data || null;
  } catch { return null; }
}

// הפוסט/כתבה המקושר לצופן (posts.cipher_slug) — מראה קנוני של getHomeVideoByCipher, לכיוון צופן→פוסט.
export async function getPostByCipher(cipherSlug) {
  if (!supabase || !cipherSlug) return null;
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("id, wp_id, title, slug, image_url")
      .eq("cipher_slug", cipherSlug)
      .order("modified", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data || null;
  } catch { return null; }
}

// Smart Analysis Flow · DB-First — מה כבר קיים בבנק לביטויים ולערך (READ-ONLY, בלי הרצת-מנוע).
export async function dbFirstLookup(phrases = [], value = null) {
  const out = { known: [], hubValue: value, hubCount: 0 };
  if (!supabase) return out;
  const uniq = [...new Set((phrases || []).map(p => (p || "").trim()).filter(Boolean))];
  try {
    if (uniq.length) {
      const { data } = await supabase.from("gematria_words")
        .select("phrase,ragil,is_verified,vip_source,source").in("phrase", uniq).limit(50);
      out.known = data || [];
    }
    if (value != null) {
      const { count } = await supabase.from("gematria_words")
        .select("id", { count: "exact", head: true }).eq("ragil", value).eq("is_verified", true);
      out.hubCount = count || 0;
    }
  } catch { /* ignore */ }
  return out;
}

// DB-First לכל אשכול — כמה ביטויים מאומתים כבר בבנק לכל ערך-אשכול (שאילתה אחת, READ-ONLY).
// מחזיר Map(value → count). כך «ניתוח מלא» מראה לכל אשכול «X בבנק · שלך חדש/חיזוק» בלי לשכפל.
export async function getHubCounts(values = []) {
  const map = new Map();
  if (!supabase) return map;
  const uniq = [...new Set((values || []).map(Number).filter(v => Number.isFinite(v)))];
  if (!uniq.length) return map;
  try {
    const { data } = await supabase.from("gematria_words")
      .select("ragil").in("ragil", uniq).eq("is_verified", true);
    for (const r of data || []) map.set(r.ragil, (map.get(r.ragil) || 0) + 1);
  } catch { /* ignore */ }
  return map;
}

// CHECK_EXISTING_AXIS_DATA · DB-First לציר — האם תאריך/שנה/אירוע כבר בציר? READ-ONLY, בלי טבלה/פונקציה חדשה.
// מקורות-הציר הקיימים: nodes(type='event') + teder_stations. התאמה לפי שנה · תאריך-לועזי (occurred_at/event_date) · תאריך-עברי.
// מחזיר { byYear:Map(year→[hit]), byIso:Map(iso→[hit]), byHebrew:[hit], events:[...] } — כל hit נושא source/label/matchedBy.
export async function checkAxisData({ years = [], isoDates = [], hebrew = [] } = {}) {
  const res = { byYear: new Map(), byIso: new Map(), byHebrew: [], all: [] };
  if (!supabase) return res;
  const yrs = [...new Set(years.map(String))].filter(Boolean);
  const isos = [...new Set(isoDates)].filter(Boolean);
  try {
    // events: לפי שנה (server-side) + כל בעלי תאריך-עברי (קטן) לצורך התאמה עברית.
    const queries = [];
    if (yrs.length) queries.push(supabase.from("nodes").select("id,label,hebrew_date,metadata").eq("type", "event").filter("metadata->>year", "in", `(${yrs.join(",")})`).limit(60));
    queries.push(supabase.from("nodes").select("id,label,hebrew_date,metadata").eq("type", "event").not("hebrew_date", "is", null).limit(60));
    queries.push(supabase.from("teder_stations").select("id,title,year,event_date,hebrew_date,central_numbers").limit(60));
    const [ev1, evHeb, teder] = await Promise.all([
      yrs.length ? queries[0] : Promise.resolve({ data: [] }),
      queries[yrs.length ? 1 : 0], queries[yrs.length ? 2 : 1],
    ]);
    const evRows = [...(ev1?.data || []), ...(evHeb?.data || [])];
    const seen = new Set();
    const addHit = (hit, bucket, key) => {
      if (bucket === "year") { if (!res.byYear.has(key)) res.byYear.set(key, []); res.byYear.get(key).push(hit); }
      else if (bucket === "iso") { if (!res.byIso.has(key)) res.byIso.set(key, []); res.byIso.get(key).push(hit); }
      else res.byHebrew.push(hit);
      const uk = hit.source + hit.id; if (!seen.has(uk)) { seen.add(uk); res.all.push(hit); }
    };
    for (const r of evRows) {
      const y = r.metadata?.year != null ? String(r.metadata.year) : null;
      const occ = r.metadata?.occurred_at ? String(r.metadata.occurred_at).slice(0, 10) : null;
      const hit = { source: "event", id: r.id, label: r.label, year: y, occurred_at: occ, hebrew_date: r.hebrew_date };
      if (y && yrs.includes(y)) addHit({ ...hit, matchedBy: "year" }, "year", +y);
      if (occ && isos.includes(occ)) addHit({ ...hit, matchedBy: "occurred_at" }, "iso", occ);
      if (r.hebrew_date) for (const h of hebrew) if (h && hebrewMatch(r.hebrew_date, h)) addHit({ ...hit, matchedBy: "hebrew_date" }, "hebrew");
    }
    for (const r of (teder?.data || [])) {
      const y = r.year != null ? String(r.year) : null;
      const occ = r.event_date ? String(r.event_date).slice(0, 10) : null;
      const hit = { source: "teder", id: r.id, label: r.title, year: y, occurred_at: occ, hebrew_date: r.hebrew_date };
      if (y && yrs.includes(y)) addHit({ ...hit, matchedBy: "year" }, "year", +y);
      if (occ && isos.includes(occ)) addHit({ ...hit, matchedBy: "occurred_at" }, "iso", occ);
    }
  } catch { /* ignore */ }
  return res;
}
// התאמת תאריך-עברי גמישה: אותו יום+חודש (מתעלם מגרשיים/מקפים/שנה) — «טז׳ מר-חשון תרצ״ט» ~ «טז מרחשון».
function hebrewMatch(a, b) {
  const norm = (s) => String(s || "").replace(/[־\-'"׳״]/g, "").replace(/מרחשון|מרחשוון/g, "חשון").replace(/\s+/g, " ").trim();
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return false;
  const dayMon = (s) => (s.match(/^(\S+)\s+(\S+)/) || []).slice(1, 3).join(" ");
  return na.includes(nb) || nb.includes(na) || (dayMon(na) && dayMon(na) === dayMon(nb));
}

// Smart Analysis Flow · פרופיל-שיטות של כתב — טענות עם gematria_claim בלבד (המאומתות מסוננות בצד-הלקוח). READ-ONLY.
export async function getWriterVerifiedClaims(names = []) {
  if (!supabase) return [];
  const uniq = [...new Set((names || []).map(n => (n || "").trim()).filter(Boolean))];
  if (!uniq.length) return [];
  try {
    const { data } = await supabase.from("research_contributions")
      .select("id,author_name,title,gematria_claim,created_at")
      .in("author_name", uniq).not("gematria_claim", "is", null).limit(200);
    return data || [];
  } catch { return []; }
}

// 🎬 תמלול רב-לשוני לסרטון (video_transcription_law) — מחזיר את כל השורות המפורסמות
// לפי זהות הסרטון. מקבל אחד מ: videoKey (yt id / reel shortcode / slug), yt, או sourceUrl.
// מוחזר ממוין: המקור (is_original) קודם, ואז שאר השפות. הלקוח קורא ישירות (RLS: status='published').
export async function getVideoTranscripts({ videoKey, yt, sourceUrl } = {}) {
  if (!supabase) return [];
  const key = videoKey || yt || sourceUrl;
  if (!key) return [];
  try {
    let dbq = supabase
      .from("video_transcripts")
      .select("video_key, yt, source_url, title, lang, transcript, summary, is_original, translated_by, updated_at");
    if (videoKey) dbq = dbq.eq("video_key", videoKey);
    else if (yt) dbq = dbq.eq("yt", yt);
    else dbq = dbq.eq("source_url", sourceUrl);
    const { data, error } = await dbq
      .order("is_original", { ascending: false })
      .order("lang", { ascending: true });
    if (error) return [];
    return data || [];
  } catch { return []; }
}

// Search in title + content, optional filters
export async function searchPosts(query, { limit = 40, category = null, tag = null, year = null } = {}) {
  if (!supabase || !query?.trim()) return [];
  const q = query.trim();
  let dbq = supabase
    .from('posts')
    .select('*')
    .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
    .order('date', { ascending: false })
    .limit(limit);
  if (category) dbq = dbq.contains('categories', [category]);
  if (tag) dbq = dbq.contains('tags', [tag]);
  if (year) dbq = dbq.gte('date', `${year}-01-01`).lte('date', `${year}-12-31T23:59:59`);
  const { data, error } = await dbq;
  if (error) throw error;
  return data ?? [];
}

// Fetch all distinct categories and tags (for dropdowns)
export async function getDistinctCategoriesAndTags() {
  if (!supabase) return { categories: [], tags: [] };
  const { data } = await supabase.from('posts').select('categories, tags');
  if (!data) return { categories: [], tags: [] };
  const cats = new Set(), tags = new Set();
  data.forEach(r => {
    (r.categories || []).forEach(c => c && cats.add(c));
    (r.tags || []).forEach(t => t && tags.add(t));
  });
  return { categories: [...cats].sort(), tags: [...tags].sort() };
}

// תגיות לפי פופולריות (כמות פוסטים) — לתצוגת "תגיות פופולריות"
export async function getTagCounts({ limit = 200 } = {}) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('tag_counts', { lim: limit });
  if (error) throw error;
  return data ?? [];
}

// "תגיות המספרים" מהגלריה — מספרי עוגן + כמות תמונות לכל מספר (מחבר לדף המספרים/מגירה)
export async function getGalleryNumberTags() {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('gallery_number_tags');
  if (error) throw error;
  return data ?? [];
}

export async function getPostBySlug(slug) {
  if (!supabase) return null;
  const decoded = decodeURIComponent(slug);
  const encoded = encodeURIComponent(decoded).toLowerCase();
  const slugs = [...new Set([slug, decoded, encoded])];
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .in('slug', slugs)
    .limit(1);
  if (error || !data?.length) return null;
  return data[0];
}

export async function getGematriaByPhrases(phrases) {
  if (!supabase || !phrases?.length) return [];
  const { data } = await supabase
    .from('gematria_words')
    .select('phrase, ragil')
    .in('phrase', phrases)
    .limit(5);
  return data ?? [];
}

// Get gematria words matching a specific value.
// opts.method = 'ragil' | 'misratar' | 'kadmi' (עמודת-ההשוואה, לסינון חוצה-שיטות) · opts.limit (ברירת-מחדל 12).
// תאימות-לאחור: קריאה עם ערך בלבד → רגיל, 12.
// 🔗 נגזר מ-gematria.js METHOD_DB_COLS (מקור-אמת יחיד לשם-שיטה→עמודת-DB) — לא רשימה מקבילה משלה
// (canonical_methods_registry_law). אותם 3 ערכים בדיוק כמו קודם: ragil/misratar/kadmi.
const GEM_METHOD_COL = { ragil: METHOD_DB_COLS['רגיל'], misratar: METHOD_DB_COLS['מסתתר'], kadmi: METHOD_DB_COLS['קדמי'] };
export async function getGematriaByValue(value, opts = {}) {
  if (!supabase || !value) return [];
  const col = GEM_METHOD_COL[opts.method] || 'ragil';
  const { data } = await supabase
    .from('gematria_words')
    .select('phrase, ragil, misratar, kadmi')
    .eq(col, value)
    .eq('is_verified', true).eq('is_published', true)   // ✅ verified-only public projection (verified_only_public_gematria_law)
    .order('created_at', { ascending: false, nullsFirst: false })   // ביטוי חדש שהוסף — תמיד למעלה
    .limit(opts.limit || 12);
  return data ?? [];
}

// כמה ביטויים במאגר שווים לערך בשיטה נתונה (למד-הנדירות) — count בלבד, בלי להביא שורות.
export async function getGematriaCountByValue(value, method = 'ragil') {
  if (!supabase || !value) return 0;
  const col = GEM_METHOD_COL[method] || 'ragil';
  const { count } = await supabase
    .from('gematria_words')
    .select('*', { count: 'exact', head: true })
    .eq(col, value)
    .eq('is_verified', true).eq('is_published', true);   // ✅ verified-only public projection
  return count || 0;
}

// התכנסות רשומה חזקה לערך (fn_convergence_for_value — SECURITY DEFINER; convergences אינה קריאה-לקוח).
export async function getConvergenceForValue(value) {
  if (!supabase || !value) return null;
  try { const { data } = await supabase.rpc('fn_convergence_for_value', { p_value: value }); return data || null; }
  catch { return null; }
}

// 🔢 ההתכנסויות במאגר המיוחסות לכתב (details.contributors[].author). אוטומציה: כל גימטריה
// שנכנסת למאגר עם ייחוס לכתב מופיעה בדף שלו — הקריאה החיה היא האוטומציה. convergences אינה
// קריאה-לקוח → RPC SECURITY DEFINER (convergences_for_author). מחזיר גם author_phrases (הביטויים שלו).
export async function getConvergencesByAuthor(names) {
  const list = (Array.isArray(names) ? names : [names]).map(n => (n || "").trim()).filter(Boolean);
  if (!supabase || !list.length) return [];
  try { const { data } = await supabase.rpc('convergences_for_author', { p_names: list }); return Array.isArray(data) ? data : []; }
  catch { return []; }
}

// הצעת ביטוי-קהילתי חדש לערך (pending — ממתין לאישור אדמין). מחזיר: ok|exists|pending|invalid|error.
export async function proposeCommunityWord(phrase, value, method = 'רגיל') {
  if (!supabase) return 'error';
  try { const { data } = await supabase.rpc('propose_community_word', { p_phrase: String(phrase).trim(), p_value: value, p_method: method }); return data || 'ok'; }
  catch { return 'error'; }
}

// הצלבה-המונית: לכל ערך ברשימה — אילו ביטויים במאגר האתר שווים לו (לכלי «ניתוח קובץ»).
// מחזיר Map: value → [phrases]. שאילתה אחת (IN) במקום בקשה לכל ערך.
export async function getGematriaByValues(values) {
  const uniq = [...new Set((values || []).filter(v => Number.isFinite(v) && v > 0))];
  const out = new Map();
  if (!supabase || !uniq.length) return out;
  const { data } = await supabase
    .from('gematria_words')
    .select('phrase, ragil')
    .in('ragil', uniq)
    .eq('is_verified', true).eq('is_published', true)   // ✅ verified-only public projection
    .limit(2000);
  for (const r of data ?? []) {
    if (!out.has(r.ragil)) out.set(r.ragil, []);
    out.get(r.ragil).push(r.phrase);
  }
  return out;
}

// ✦ מילים חדשות מהקהילה — N הביטויים האחרונים שנוספו למאגר (מאומתים), עם זמן.
export async function getRecentCommunityWords(limit = 4) {
  if (!supabase) return [];
  // «נוסף למאגר» = הפך לגלוי. מילה שאושרה/נחשפה עכשיו (visibility_changed_at) קופצת לראש —
  // גם אם ה-created_at שלה ישן. מושכים לפי שני הצירים וממזגים לפי «רגע-החשיפה» האפקטיבי.
  const clean = arr => (arr ?? []).filter(r => r.phrase && !/^[\d\s.,-]+$/.test(r.phrase.trim()) && r.ragil > 0);
  const sel = 'phrase, ragil, created_at, visibility_changed_at, source, vip_source';
  const [byCreated, byVis] = await Promise.all([
    supabase.from('gematria_words').select(sel).eq('is_verified', true)
      .not('created_at', 'is', null).order('created_at', { ascending: false, nullsFirst: false }).limit(limit * 3),
    supabase.from('gematria_words').select(sel).eq('is_verified', true)
      .not('visibility_changed_at', 'is', null).order('visibility_changed_at', { ascending: false, nullsFirst: false }).limit(limit * 3),
  ]);
  const seen = new Set(), merged = [];
  for (const r of [...clean(byCreated.data), ...clean(byVis.data)]) {
    if (seen.has(r.phrase)) continue; seen.add(r.phrase);
    const eff = Math.max(new Date(r.created_at || 0).getTime(), new Date(r.visibility_changed_at || 0).getTime());
    merged.push({ ...r, created_at: new Date(eff).toISOString() });   // «נוסף» = רגע-החשיפה האפקטיבי
  }
  return merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);
}

// 📡 שידורים חיים (channel_updates) — «עדכון חי» בטיקר + כרטיס בעמוד הבית.
// קריאה ציבורית: רק live שלא פג; כתיבה: אדמין בלבד (RLS). מקור עתידי: גשר הוואטסאפ.
// channel: null = הטיקר הראשי (main + reality-code) · 'or-geula'/'reality-code' = טיקר ממותג
// byDate=true → מיון לפי תאריך בלבד (החדשים קודם), בלי priority — לפידים החיים («מכל הערוצים»),
// כדי שעדכוני היום לא ייחסמו ע״י שורות ישנות בעלות priority גבוה.
export async function getChannelUpdates(limit = 6, channel = null, byDate = false) {
  if (!supabase) return [];
  let q = supabase.from('channel_updates')
    .select('id,text,image_url,thumb_url,credit,channel,is_urgent,created_at,link_url,source')
    .eq('status', 'live')
    .eq('page_only', false)   // עדכוני-כתב page_only מופיעים רק בדף-הכתב, לא בפידים הגלובליים
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  q = byDate ? q.order('created_at', { ascending: false })
             : q.order('priority', { ascending: false }).order('created_at', { ascending: false });
  q = q.limit(limit);
  q = channel ? q.eq('channel', channel) : q.in('channel', ['main', 'reality-code']);
  const { data } = await q;
  return data || [];
}
// 👤 כל העדכונים החיים של כתב מסוים (credit) — עדשה על channel_updates לדף הכתב (ContributorPage).
// עץ אחד: לא עותק — אותו מקור של הטיקר/מרכז השידורים, מסונן לפי הכותב.
export async function getUpdatesByReporter(credit, limit = 60) {
  return getUpdatesByReporterNames([credit], limit);
}
// גרסה לפי כמה שמות (display_name + כינויי-וואטסאפ wa_names) — כדי שעדכוני כתב תחת
// שם-וואטסאפ שונה (למשל «OPOC1 OPOC1» → צבי) יופיעו כולם בדף הכתב הקנוני.
export async function getUpdatesByReporterNames(names, limit = 60) {
  const list = (Array.isArray(names) ? names : [names]).map(n => (n || "").trim()).filter(Boolean);
  if (!supabase || !list.length) return [];
  const { data } = await supabase.from('channel_updates')
    .select('id,text,image_url,thumb_url,credit,channel,created_at,link_url,source')
    .eq('status', 'live')
    .in('credit', list)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}
// 👤 העדכונים של קבוצת-הוואטסאפ האישית של כתב — עדשה על channel_updates לפי channel=writer-<slug>.
// כשלכתב יש קבוצה אישית (contributors.wa_channel) הפיד שלו = כל מה שנקלט מהקבוצה שלו (עץ אחד, לא עותק).
export async function getUpdatesByChannel(channel, limit = 60) {
  const ch = (channel || "").trim();
  if (!supabase || !ch) return [];
  const { data } = await supabase.from('channel_updates')
    .select('id,text,image_url,thumb_url,credit,channel,created_at,link_url,source')
    .eq('status', 'live')
    .eq('channel', ch)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}
// 👤 CORE של כתב — מילים מאוצרות (gematria_words) לפי מפתחות-הזהות (vip_source ∈ names · source='contribution:<name>').
// READ-ONLY. reuse של אותם מפתחות (display_name+wa_names). מחזיר שדות-סיווג (method/tags/tier) ל-Writer OS.
export async function getWriterCoreWords(names, limit = 500) {
  const list = (Array.isArray(names) ? names : [names]).map(n => (n || "").trim()).filter(Boolean);
  if (!supabase || !list.length) return [];
  const sel = 'id,phrase,ragil,other_method,essence_method,tags,vip_source,source,is_verified,visibility_tier,node_id,created_at,notes';
  const [byVip, bySrc] = await Promise.all([
    supabase.from('gematria_words').select(sel).in('vip_source', list).not('ragil', 'is', null).limit(limit),
    supabase.from('gematria_words').select(sel).in('source', list.map(n => `contribution:${n}`)).not('ragil', 'is', null).limit(limit),
  ]);
  const map = new Map();
  for (const r of [...(byVip.data || []), ...(bySrc.data || [])]) if (r && !map.has(r.id)) map.set(r.id, r);
  return [...map.values()];
}
// 🎗 כתבים מודגשים (contributors.feature_media) לרצועת «עדכונים אחרונים» בדף הבית —
// כרטיס-כתב עם התמונה האחרונה שלו מהשידורים, שמקפיץ את דף-הכתב כשעולה עדכון-תמונה חדש.
// עדשה על עץ אחד: contributors ⨯ channel_updates (לפי credit=display_name) — לא עותק.
export async function getFeaturedResearchers(limit = 6) {
  if (!supabase) return [];
  try {
    const { data: cons } = await supabase.from('contributors')
      .select('slug,code,display_name,avatar_url,role')
      .eq('feature_media', true);
    if (!cons?.length) return [];
    const out = [];
    for (const c of cons) {
      const name = (c.display_name || '').trim();
      if (!name) continue;
      const { data: ups } = await supabase.from('channel_updates')
        .select('id,image_url,thumb_url,created_at')
        .eq('status', 'live').eq('credit', name)
        .not('image_url', 'is', null)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false }).limit(1);
      const u = ups?.[0];
      if (!u) continue;
      out.push({ ...c, latest_image: u.image_url, latest_thumb: u.thumb_url || null, latest_at: u.created_at });
    }
    return out.sort((a, b) => +new Date(b.latest_at) - +new Date(a.latest_at)).slice(0, limit);
  } catch { return []; }
}
// 🔖 שמירת-מסע ל-DB (visitor_id + השורש + השביל) — כדי לראות בניהול מי שמר איזה מסע.
export async function logJourneySave(visitor, { root, path = [], world = null }) {
  if (!supabase || root == null) return;
  try { await supabase.rpc("log_journey_save", { p_visitor: visitor || null, p_root: root, p_path: path, p_world: world }); } catch { /* ignore */ }
}
// 🧭 משפך-המסע (בקשת צוריאל B) — דרך RPC admin_journey_funnel (page_views חסום ל-SELECT ב-RLS!).
export async function getJourneyFunnel(days = 7) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('admin_journey_funnel', { p_days: days });
    if (error || !data || data.error) return null;
    return data;
  } catch { return null; }
}
// 🪙 מד-טוקנים: כמה טוקנים ועלות ($) עלו קריאות ה-AI (מסע/ניתוח/מחקר) בטווח ימים.
// מקור: ai_token_log (נכתב בצד-שרת מ-data.usage של Anthropic). RPC admin_ai_tokens מסכם + מתמחר.
export async function getAiTokenUsage(days = 7) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('admin_ai_tokens', { p_days: days });
    if (error) return null;
    return data || null;
  } catch { return null; }
}
// 💰 מרכז עלות AI מאוחד — כל המדדים במקום אחד: total · by_source · by_model · by_kind · by_day (מגמה) ·
//   wa (פעילות בוט וואטסאפ לפי קבוצה/צ׳אט + כמות הודעות). מקור: ai_token_log (עלות $) + wa_bot_log (הודעות).
//   RPC admin_ai_cost — מתמחר לפי _ai_price(model): haiku $1/$5 · sonnet $3/$15 · opus $15/$75 ל-1M.
export async function getAiCostMetrics(days = 30) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('admin_ai_cost', { p_days: days });
    if (error) return null;
    return data || null;
  } catch { return null; }
}
// 🖥️ קונסולת-מילים לאדמין — RPC SECURITY DEFINER שעוקף RLS (רואה גם is_verified=false).
// scope: pending|verified|rejected|all · pagination · המלצת-AI + חיבור-לישות לכל שורה.
export async function adminWordsConsole({ scope = 'pending', q = null, limit = 50, offset = 0, world = null } = {}) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('admin_words_console', { p_scope: scope, p_q: q, p_limit: limit, p_offset: offset, p_world: world });
    if (error) return null;
    return data || null;
  } catch { return null; }
}
// 📊 מד-סטטיסטיקה למנוע-השפה (מאושר/ממתין · עברית+אנגלית)
export async function getLangStats() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('admin_lang_stats');
    if (error || data?.error) return null;
    return data || null;
  } catch { return null; }
}
// 🌉 גשרי-שפה שממתינים לאישור (טאב אנגלית)
export async function getPendingBridges() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc('admin_bridges_pending');
    if (error || data?.error) return [];
    return data || [];
  } catch { return []; }
}
// 🌉 אישור/דחיית/מחיקת גשר — verify | reject | unverify | delete
export async function verifyBridge(id, action) {
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc('admin_verify_bridge', { p_id: id, p_action: action });
  if (error) throw error;
  return data ?? 0;
}
// 🌉 כל הגשרים לניהול (מאושרים + ממתינים + נדחו) — טאב אנגלית
export async function getAllBridges() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc('admin_all_bridges');
    if (error || data?.error) return [];
    return data || [];
  } catch { return []; }
}
// 🌉 עריכת גשר — מחליף עברית/לועזית (מחשב רגיל מחדש)
export async function editBridge(id, hebrew, foreign_word) {
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc('admin_edit_bridge', { p_id: id, p_hebrew: hebrew ?? null, p_foreign: foreign_word ?? null });
  if (error) throw error;
  return data ?? 0;
}
// 🌐 כל הכינויים הלועזיים לניהול (טאב אנגלית)
export async function getAllAliases() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc('admin_all_aliases');
    if (error || data?.error) return [];
    return data || [];
  } catch { return []; }
}
// 🌐 הוספת כינוי ידני (עברית↔לועזית) — מוודא שהמילה קיימת ומוסיף כינוי מאומת
export async function adminAddAlias(hebrew, alias, lang = 'en', method = 'transliteration') {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('admin_add_alias', { p_hebrew: hebrew, p_alias: alias, p_lang: lang, p_method: method });
  if (error) throw error;
  return data ?? null;
}
// 🌐 עריכת כינוי — טקסט לועזי ו/או המילה העברית שאליה מפנה
export async function adminEditAlias(id, alias, hebrew) {
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc('admin_edit_alias', { p_id: id, p_alias: alias ?? null, p_hebrew: hebrew ?? null });
  if (error) throw error;
  return data ?? 0;
}
// 🌐 אישור/הסתרה/מחיקה של כינוי — verify | hide | delete
export async function manageAliasRpc(id, action) {
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc('admin_manage_alias', { p_id: id, p_action: action });
  if (error) throw error;
  return data ?? 0;
}
// 🌍 מתייג-העולמות — סקירת קטגוריות לא-מתויגות (לעין לפני אישור)
export async function getWorldTagStats() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc('admin_world_tag_stats');
    if (error || data?.error) return [];
    return data || [];
  } catch { return []; }
}
// 🌍 אישור-תיוג — מתייג קטגוריה לעולם (רץ רק בלחיצה). מחזיר כמות.
export async function applyWorldTag(category, world) {
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc('admin_world_tag_apply', { p_category: category, p_world: world });
  if (error) throw error;
  return data ?? 0;
}
// 🌍 רשימת עולמות + ספירות (למסנן טאב-המילים המאושרות)
export async function getWordWorlds() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc('admin_word_worlds');
    if (error || data?.error) return [];
    return data || [];
  } catch { return []; }
}
export async function adminReviewWord(id, action) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('wa_word_review', { p_id: id, p_action: action });
  if (error) throw error;
  return data;
}
// 🙈 הסתרת מילה/ביטוי לנצח מכל המאגר (אדמין בדף המספר). מסמן את כל השורות עם אותו טקסט.
export async function adminHideWord(phrase) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('admin_hide_word', { p_phrase: phrase });
  if (error) throw error;
  return data;   // { ok, hidden, phrase } | { error }
}

// 🌍 קשרים בין שפות (אשף שמעון) — שכבת מחקר LCE. הכול pending עד אישור אדמין.
export async function langLinkAdd({ hebrew, foreign, lang = 'en', rel = 'semantic', note = null, name = null, visitor = null }) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('lang_link_add', {
    p_hebrew: hebrew, p_foreign: foreign, p_lang: lang, p_rel: rel, p_note: note, p_name: name, p_visitor: visitor,
  });
  if (error) throw error;
  return data;   // { ok, id, gematria_he, status } | { error }
}
export async function langLinksList(visitor = null) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('lang_links_list', { p_visitor: visitor });
  if (error) return [];
  return data || [];
}
export async function langLinksPending() {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('lang_links_pending');
  if (error) return [];
  return data || [];
}
export async function langLinkReview(id, action) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('lang_link_review', { p_id: id, p_action: action });
  if (error) throw error;
  return data;   // 'approved' | 'rejected' | 'deleted' | 'forbidden'
}
// 🔎 מנוע-הגילוי החוצה-שפתי — שאילתת-הליבה. מילה לועזית (או עברית) → פרישה על כל
// השיטות, התכנסויות מדורגות בנדירות (gold/strong/weak). המסננים רצים בחיפוש, לא כשער.
export async function enSearch(word, maxMatches = 8) {
  if (!supabase || !word?.trim()) return [];
  const { data, error } = await supabase.rpc('fn_en_search', { p_word: word.trim(), p_max_matches: maxMatches });
  if (error) return [];
  return data || [];   // [{ input_hebrew, method, value, rarity, signal, matches[] }]
}
// 🔔 אירועי-גילוי — זיהוי התכנסויות אמיתיות + שליחת מייל לרשימה (עץ אחד: אותה רשימת subscribers).
export async function scanDiscoveryEvents({ days = 7, minMembers = 8 } = {}) {
  if (!supabase) return null;
  try { const { data, error } = await supabase.rpc('scan_discovery_events', { p_days: days, p_min_members: minMembers }); if (error) return null; return data; } catch { return null; }
}
export async function discoveryPending() {
  if (!supabase) return null;
  try { const { data, error } = await supabase.rpc('discovery_events_pending'); if (error) return null; return data; } catch { return null; }
}
export async function discoveryMark(id, status) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('discovery_event_mark', { p_id: id, p_status: status }); if (error) throw error; return data;
}
// ✉️ שליחת קמפיין — עוטף את send-newsletter (אדמין, Resend). source=null → כולם · dry_run → ספירה · test_email → בדיקה.
export async function sendNewsletter({ subject, html, source = null, testEmail = null, dryRun = false }) {
  if (!supabase) return null;
  const { data, error } = await supabase.functions.invoke('send-newsletter', { body: { subject, html, source, test_email: testEmail, dry_run: dryRun } });
  if (error) throw error;
  return data;
}
// 🔗 סוגי-התכנסויות ממתינות — ליבה / קהילה / מעורב (להחלטה איפה תוכן-אנשים חי).
export async function adminConvergenceTypes(min = 2) {
  if (!supabase) return null;
  try { const { data, error } = await supabase.rpc('admin_convergence_types', { p_min: min }); if (error) return null; return data; } catch { return null; }
}
// 🧹 סינון-מסה לערימות-ההמתנה — ספירת דליים + פעולת-מסה (reject_junk / approve_good).
export async function adminTriageCounts() {
  if (!supabase) return null;
  try { const { data, error } = await supabase.rpc('admin_triage_counts'); if (error) return null; return data; } catch { return null; }
}
export async function adminBulkTriage(action) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('admin_bulk_triage', { p_action: action }); if (error) throw error; return data;
}
// 🌍 מילים חדשות באנגלית — קורא מאותו מקור של «דף האנגלית» (language_links, מאושרים)
// דרך ה-RPC הקנוני lang_links_list (SECURITY DEFINER) — עץ אחד, בלי טבלה מקבילה.
// ממופה לצורת התצוגה הקיימת: { alias, gematria_words:{ phrase, ragil } }.
export async function getRecentEnglishWords(limit = 3) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('lang_links_list', { p_visitor: null });
  if (error || !Array.isArray(data)) return [];
  return data
    .filter(r => (r.lang || 'en') === 'en' && r.status === 'approved' && r.foreign_word && r.hebrew)
    .slice(0, limit)
    .map(r => ({ alias: r.foreign_word, gematria_words: { phrase: r.hebrew, ragil: r.gematria_he } }));
}
// 🌍 הוספת תרגום/תעתוק אנגלי למילה עברית — ממלא את מאגר-האנגלית (word_aliases).
export async function addEnglishAlias({ phrase, alias, method = 'transliteration', verified = true }) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('add_word_alias', {
    p_phrase: phrase, p_alias: alias, p_lang: 'en', p_type: method, p_source: 'admin', p_method: method, p_confidence: 1, p_verified: verified,
  });
  if (error) throw error;
  return data;
}
// 🔷 אוצרות הגילוי — הצלבה חוצת-שיטות: ביטויים ששווים למספר-העוגן בשיטה כלשהי.
// היררכיה (otzarot_giluy_hierarchy): שכבה 1 «אוצרות הגילוי» · שכבה 2 «השלמה לאוצרות». עץ אחד — קורא מ-gematria_words לפי תגית.
export async function getGiluyTreasures(anchor) {
  if (!supabase || !anchor) return { core: [], supplement: [] };
  const { data } = await supabase.from('gematria_words')
    .select('phrase, ragil, other_value, other_method, tags')
    .or(`other_value.eq.${anchor},ragil.eq.${anchor}`)
    .overlaps('tags', ['אוצרות הגילוי', 'השלמה לאוצרות'])
    .eq('is_verified', true).eq('is_published', true)   // ✅ verified-only public projection
    .limit(80);
  const rows = data || [];
  const method = r => r.other_method || (r.ragil === anchor ? 'רגיל' : '');
  const seen = new Set();
  const pick = tier => rows.filter(r => {
    const tags = r.tags || [];
    if (tier === 'core' && !tags.includes('אוצרות הגילוי')) return false;
    if (tier === 'supp' && !(tags.includes('השלמה לאוצרות') && !tags.includes('אוצרות הגילוי'))) return false;
    if (seen.has(r.phrase)) return false; seen.add(r.phrase); return true;
  }).map(r => ({ phrase: r.phrase, method: method(r) }));
  return { core: pick('core'), supplement: pick('supp') };
}
// 🎯 «להיכנס להתכנסות» — כל הביטויים באותו ערך-רגיל (מאומתים + ממתינים), לאדמין (עוקף RLS).
export async function adminValueConvergence(value) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('admin_value_convergence', { p_value: value });
    if (error) return null;
    return data || null;
  } catch { return null; }
}
// ✨ changelog «מה הוספנו לאתר» — לטיקר האוטומטי (בלי טיפול ידני של צוריאל).
export async function getSiteUpdates(limit = 6) {
  if (!supabase) return [];
  const { data } = await supabase.from('site_updates').select('icon,title,link_url')
    .eq('is_active', true).order('priority', { ascending: false }).order('created_at', { ascending: false }).limit(limit);
  return data || [];
}
const VIDEO_URL_RE = /\.(mp4|mov|webm|m4v|avi|mkv)(\?|#|$)/i;
// 🎞️ לוכד פריים-תצוגה מסרטון (קנבס בדפדפן) ומעלה כ-thumbnail לדלי gallery.
// רץ בדפדפן-האדמין (כרום עם H.264) → פוסטר אוטומטי לעדכון-וידאו. נכשל בשקט → בלי פוסטר (כמו קודם).
export async function captureAndUploadPoster(videoUrl, keyHint = 'broadcast') {
  if (!supabase || !videoUrl || !VIDEO_URL_RE.test(videoUrl) || typeof document === 'undefined') return null;
  try {
    const blob = await new Promise((resolve, reject) => {
      const v = document.createElement('video');
      v.crossOrigin = 'anonymous'; v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = videoUrl;
      const fail = (m) => reject(new Error(m || 'video'));
      v.onerror = () => fail('load');
      v.onloadeddata = () => {
        const t = (v.duration && v.duration > 2) ? 1.0 : (v.duration ? v.duration / 2 : 0);
        v.onseeked = () => {
          try {
            const vw = v.videoWidth || 360, vh = v.videoHeight || 640, s = Math.min(1, 640 / vw);
            const c = document.createElement('canvas'); c.width = Math.round(vw * s); c.height = Math.round(vh * s);
            c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
            c.toBlob(b => b ? resolve(b) : fail('blob'), 'image/jpeg', 0.82);
          } catch { fail('draw'); }
        };
        try { v.currentTime = t; } catch { fail('seek'); }
      };
      setTimeout(() => fail('timeout'), 30000);
    });
    const path = `sod1820/${keyHint}-thumbs/${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
    const { error } = await supabase.storage.from('gallery').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (error) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/gallery/${path}`;
  } catch { return null; }
}

export async function broadcastChannelUpdate({ text, imageUrl = null, hours = null, urgent = false, credit = null, channel = 'main', thumbUrl = null }) {
  if (!supabase) throw new Error('no supabase');
  // 🎞️ עדכון-וידאו בלי פוסטר → לוכד פריים-תצוגה אוטומטית (בדפדפן) כדי שלא יוצג ריבוע-ריק.
  let thumb = thumbUrl;
  if (!thumb && imageUrl && VIDEO_URL_RE.test(imageUrl)) {
    thumb = await captureAndUploadPoster(imageUrl, channel === 'or-geula' ? 'or-geula' : 'broadcast');
  }
  const { data, error } = await supabase.from('channel_updates').insert({
    text, image_url: imageUrl || null, thumb_url: thumb || null, is_urgent: urgent, credit: credit || null, channel,
    expires_at: hours ? new Date(Date.now() + hours * 3600e3).toISOString() : null,
  }).select('id').maybeSingle();
  if (error) throw error;
  return data;
}
export async function listChannelUpdates(limit = 30) {   // אדמין — כולל כבויים/שפגו
  if (!supabase) return [];
  const { data } = await supabase.from('channel_updates')
    .select('*').order('created_at', { ascending: false }).limit(limit);
  return data || [];
}
export async function setChannelUpdateStatus(id, status) {
  if (!supabase) throw new Error('no supabase');
  const { error } = await supabase.from('channel_updates').update({ status }).eq('id', id);
  if (error) throw error;
}

// סך כל המילים במאגר — count מדויק בלי למשוך שורות (לפי האמת, לא מספר קבוע)
export async function getGematriaWordsCount() {
  if (!supabase) return 0;
  const { count } = await supabase
    .from('gematria_words')
    .select('*', { count: 'exact', head: true });
  return count || 0;
}

// ===== ארכיון הגלריות ("גלריית רמזי הגאולה") =====
// סקירה: רשימת גלריות + תמונות קלות (לכריכה+ספירה).
// מטמון פר-סשן לסקירת הארכיון — מונע משיכה חוזרת של כל ~2,500 השורות בכל כניסה/חזרה ל-/archive.
// מתאפס אוטומטית בכל כתיבה לתמונה (invalidateGalleriesOverview) וגם אחרי TTL קצר.
let _overviewCache = null;            // { ts, gals, imgs }
const OVERVIEW_TTL = 120000;          // 2 דקות — טרי מספיק, חוסך טעינות חוזרות
export function invalidateGalleriesOverview() { _overviewCache = null; }

export async function getGalleriesOverview({ force = false } = {}) {
  if (!supabase) return { gals: [], imgs: [] };
  if (!force && _overviewCache && Date.now() - _overviewCache.ts < OVERVIEW_TTL) {
    return { gals: _overviewCache.gals, imgs: _overviewCache.imgs };
  }
  const { data: gals } = await supabase
    .from('galleries')
    .select('id,name,anchor_number,img_count,wp_gallery_id');
  let imgs = [], from = 0;
  while (true) {
    const { data } = await supabase
      .from('gallery_images')
      .select('id,gallery_id,image_url,thumb_url,name,description,ordering,primary_value,all_values,occurred_at,created_at,importance,image_type,source,curator_hidden,tags')
      .not('image_url', 'is', null)
      .order('occurred_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(from, from + 999);
    if (!data || !data.length) break;
    imgs = imgs.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  _overviewCache = { ts: Date.now(), gals: gals || [], imgs };
  return { gals: gals || [], imgs };
}

// ✦ עוגן-המהות של מספר — «מהות המספר» (עובדה+רמז מאומתים) לדף המספר. null אם אין.
// ANCHOR_RESEARCH_DEFERRED_BY_ZURIEL: number_anchors direct client access is frozen
// (anon/authenticated no longer have SELECT) until Zuriel returns to Anchor Reconciliation.
// Short-circuited here so the client never attempts a now-blocked read; safe no-op until
// the freeze lifts, at which point this can be restored to the query below.
export async function getNumberAnchor(_value) {
  return null;
  /* eslint-disable no-unreachable */
  if (!supabase || _value == null) return null;
  try {
    const { data } = await supabase.from('number_anchors')
      .select('value,category,fact,hint').eq('value', _value).maybeSingle();
    return data || null;
  } catch { return null; }
  /* eslint-enable no-unreachable */
}

// 🧠 אינטליגנציית-המספר — התמונה המלאה מהמנוע האחד (number_dossier_json): כל השיטות מדורגות-משמעות
// + נושאים + פוסטים + מציאות. אותו מקור-אמת שרזיאל (וואטסאפ + צ'אט) קורא. עץ אחד — ציור אחד.
export async function getNumberDossier(value) {
  if (!supabase || value == null) return null;
  try {
    const { data, error } = await supabase.rpc('number_dossier_json', { n: Number(value) });
    if (error || !data) return null;
    return data; // { value, methods:[{method,phrases[]}], topics:[{title,meter}], posts[], reality, definitions[] }
  } catch { return null; }
}

// 🗺️ מפת המספר — שכונת המספר בגרף-הידע (number_map): ישויות · התכנסויות · מספרים · פוסטים · אירועים,
// מסווג ומשוקלל, כל node עם מפתח-ניתוב לדף הקנוני שלו. אותה עדשה שרזיאל/מטטרון קוראים (עץ אחד).
export async function getNumberMap(value) {
  if (!supabase || value == null) return null;
  try {
    const { data, error } = await supabase.rpc('number_map', { n: Number(value) });
    if (error || !data) return null;
    return data; // { value, node, neighbors:{entity[],convergence[],number[],post[],event[]}, counts }
  } catch { return null; }
}

// 🤖 מסר-מסע אישי מהמנוע (AI) — Edge Function journey-message.
// מקבל את המספר, מסלול הביטויים, העולם והמהות; מחזיר טקסט קצר בעברית או null.
// נכשל בשקט (null) אם אין מפתח / שגיאה → הקורא נופל להודעת-התבנית הקיימת.
export async function getJourneyMessage({ value, path, world, meaning, depth, again, name }) {
  if (!supabase || value == null) return null;
  try {
    const { data, error } = await supabase.functions.invoke('journey-message', {
      body: { value, path, world, meaning, depth, again, name },
    });
    if (error) return null;
    return data?.message || null;
  } catch { return null; }
}

// 🧪 מדידת A/B עדשות למסע — רישום פר-מבקר (עדשה × אירוע × עומק) דרך RPC log_journey_ab.
// event: 'start' | 'step' | 'complete'. לא חוסם, נכשל בשקט.
// 👤 מסע פר-יוזר — סקירת כל הרשומים + היסטוריה. מנהל בלבד (חושף אימיילים). null בכשל.
export async function getUsersOverview() {
  if (!supabase) return null;
  try { const { data } = await supabase.rpc('admin_users_overview'); return data || null; } catch { return null; }
}
export async function getUserJourney(email) {
  if (!supabase || !email) return null;
  try { const { data } = await supabase.rpc('admin_user_journey', { p_email: email }); return data || null; } catch { return null; }
}

// 🟢 קישור וואטסאפ ↔ חשבון — כלי אדמין (admin_wa_candidates/link/unlink). מנהל בלבד.
export async function getWaCandidates() {
  if (!supabase) return null;
  try { const { data } = await supabase.rpc('admin_wa_candidates'); return Array.isArray(data) ? data : []; } catch { return null; }
}
export async function adminLinkWa(phone, email) {
  if (!supabase) return { ok: false, error: 'no_client' };
  try { const { data, error } = await supabase.rpc('admin_link_wa', { p_phone: phone, p_email: email }); if (error) return { ok: false, error: error.message }; return data || { ok: false }; }
  catch (e) { return { ok: false, error: String(e?.message || e) }; }
}
export async function adminUnlinkWa(phone) {
  if (!supabase) return { ok: false, error: 'no_client' };
  try { const { data, error } = await supabase.rpc('admin_unlink_wa', { p_phone: phone }); if (error) return { ok: false, error: error.message }; return data || { ok: false }; }
  catch (e) { return { ok: false, error: String(e?.message || e) }; }
}

// 🔴 שידור חי — מי באתר עכשיו + כל הפרטים (דף, שובל, מקור, מכשיר, זהות). null בכשל.
export async function getLiveVisitors(minutes = 10) {
  if (!supabase) return null;
  try {
    const { data } = await supabase.rpc('admin_live_visitors', { p_minutes: minutes });
    return data || null;
  } catch { return null; }
}

// 🟢 «כמה עכשיו» — מבקרים אמיתיים בדקות האחרונות (מסונן-בוטים). null בכשל.
export async function getRealtimeNow(minutes = 5) {
  if (!supabase) return null;
  try {
    const { data } = await supabase.rpc('admin_realtime_now', { p_minutes: minutes });
    return data || null;
  } catch { return null; }
}

// 🔁 Retention — חוזרים מול חדשים + דביקות רשומים + קוהורטות. מנהל בלבד. null בכשל.
export async function getRetention(days = 30) {
  if (!supabase) return null;
  try { const { data } = await supabase.rpc('admin_retention', { p_days: days }); return data || null; } catch { return null; }
}

// 🎛️ דופק עליון — כל מספרי הכותרת ממקור-האמת, קריאה אחת. מנהל בלבד. null בכשל.
export async function getPulse() {
  if (!supabase) return null;
  try { const { data } = await supabase.rpc('admin_pulse'); return data || null; } catch { return null; }
}

// 📈 מעקב כניסות אמיתיות לאורך זמן + מקורות (referrer), מסונן-בוטים. null בכשל.
export async function getRealTraffic(days = 30) {
  if (!supabase) return null;
  try {
    const { data } = await supabase.rpc('admin_real_traffic', { p_days: days });
    return data || null;
  } catch { return null; }
}

// 🧪 השוואת ניסויי-מסע (A/B) מסוננת-בוטים — עדשה (reality/kingdom) + תוכן (full/classic). null בכשל.
export async function getJourneyExperiments(days = 14) {
  if (!supabase) return null;
  try {
    const { data } = await supabase.rpc('admin_journey_experiments', { p_days: days });
    return data || null;
  } catch { return null; }
}

// 📐 CLEAN_AB_MEASUREMENT_V1 — post_sidebar_v1: HUMAN|UNKNOWN|BOT (Clean Traffic
// Classification, ללא שינוי) + Human-Gate (500 CLEAN HUMAN/variant) + External/Internal
// landing + Google/Facebook/WhatsApp/Direct. hours→p_from/p_to. null בכשל (כולל לא-אדמין).
export async function getPostSidebarExperimentReport(hours = 48, humanGate = 500) {
  if (!supabase) return null;
  try {
    const p_from = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const { data, error } = await supabase.rpc('admin_post_sidebar_experiment_report', { p_from, p_human_gate: humanGate });
    if (error) throw error;
    return data || null;
  } catch { return null; }
}
// 🩺 מונים גולמיים (visitor_events מול events) — אבחון/צלב-בדיקה בלבד, לא בסיס להכרעה.
export async function getPostSidebarRawCounts(hours = 48) {
  if (!supabase) return null;
  try {
    const p_from = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const { data, error } = await supabase.rpc('admin_post_sidebar_raw_counts', { p_from });
    if (error) throw error;
    return data || null;
  } catch { return null; }
}

export async function logJourneyAb(lens, event, depth = 0, kind = null) {
  if (!supabase) return;
  try {
    let v = localStorage.getItem('sod_visitor_id');
    if (!v) { v = 'v' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); localStorage.setItem('sod_visitor_id', v); }
    await supabase.rpc('log_journey_ab', { p_visitor: v, p_lens: lens, p_event: event, p_depth: depth, p_kind: kind });
  } catch { /* לא חוסם */ }
}

// 🤖 ניתוח AI גנרי לכלי המחקר (השוואה · נוטריקון · פסוק · פסוק-יומי) — Edge Function ai-analyze.
// facts = עובדות מאומתות מהמנוע (ערכים שכבר חושבו). ה-AI רק מפרש, לא מחשב. null בכשל/ללא מפתח.
// engine: 'claude' (ברירת-מחדל) | 'gemini' — מנוע נוסף להשוואה (A/B). אותן עובדות, פרשן אחר.
// 🪪 מזהה-מבקר יציב (אותו VKEY כמו feedback.js) — נקרא inline למניעת יבוא-מעגלי.
function aiVisitorId() {
  try {
    let v = localStorage.getItem('sod_visitor_id');
    if (!v) { v = 'v' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); localStorage.setItem('sod_visitor_id', v); }
    return v;
  } catch { return null; }
}
export async function getAiAnalysis({ kind, subject, facts, again, fast, engine, long, metatron, ref, ref_name, user_ref, operation }) {
  if (!supabase) return null;
  try {
    // 📏 ai_quota_law — visitor_id מאפשר ספירת-מכסה יציבה לאורח (מדויק יותר מ-IP).
    // ✨ long=true → ניתוח עמוק ממוזג ארוך (השרת מרים את הגבלת-האורך; אינרטי אם לא נשלח).
    // 🌳 metatron=true → השרת נשען על «העץ האחד» (חוקים+גרף) → תשובה מבוססת-חומר (בטא, opt-in).
    // provenance-עלות (ref=msg_id · ref_name=group/conversation · user_ref) נשלח לרישום ב-ai_token_log.
    // ⚠️ non-breaking: ה-edge הנוכחי מתעלם מהשדות עד עדכון; מוכן לשרשור user→conversation→message→model→tokens→cost.
    const { data, error } = await supabase.functions.invoke('ai-analyze', { body: { kind, subject, facts, again, fast, engine, long, metatron, visitor_id: aiVisitorId(), ref, ref_name, user_ref, operation } });
    if (error) { try { console.warn('[ai-analyze] invoke error:', error?.message || error); } catch { /* noop */ } return null; }
    // 🚦 מכסת-AI נגמרה → שדר אירוע גלובלי (שער-הרשמה/הודעה); מחזיר null → הקורא מציג נפילה בחן.
    if (data?.error === 'quota') {
      try { window.dispatchEvent(new CustomEvent('sod:ai-quota', { detail: { tier: data.tier, used: data.used, limit: data.limit, message: data.message } })); } catch { /* noop */ }
      return null;
    }
    if (data?.error) { try { console.warn('[ai-analyze] server:', data.error, data.detail || ''); } catch { /* noop */ } }
    // 🧪 ai_style_learning_law — כל ניתוח מוצלח נרשם אוטומטית (בכל משטח באתר, כי כולם עוברים כאן).
    // fire-and-forget: הרישום לא מעכב ולא מפיל את הניתוח.
    if (data?.analysis) logAiAnalysis({ kind, subject, styleKey: data.style_key, engine: data.engine, model: data.model, content: data.analysis });
    return data?.analysis || null;
  } catch (e) { try { console.warn('[ai-analyze] threw:', e?.message || e); } catch { /* noop */ } return null; }
}

// 🔎 searchPostFacts — RAG קל: קטעים רלוונטיים מהפוסטים של האתר (RPC chat_search_facts).
//    מוזרק לצ'אט כ«עובדות מהחומר שלנו» → תשובה מבוססת-תוכן, לא ידע כללי. נכשל בחן (מחזיר "").
export async function searchPostFacts(query) {
  if (!supabase || !query) return "";
  try {
    const { data, error } = await supabase.rpc("chat_search_facts", { p_query: String(query).slice(0, 200), p_limit: 3 });
    if (error) return "";
    return typeof data === "string" ? data : "";
  } catch { return ""; }
}

// 🤖 askRaziel — קורא למוח (ai-analyze persona=raziel) ומחזיר את חוזה raziel_response_contract (v1).
//    תאימות-לאחור: כל עוד המוח מחזיר מחרוזת בלבד (data.analysis) — עוטף כ-{v:1, answer}. quota → null.
//    path = מסלול-מחקר שהמשתמש בחר (המוח מחליט אילו מסלולים קיימים; ה-UI רק מציג). context = הקשר-המשתמש.
export async function askRaziel({ subject, facts, context = null, path = null, again = false, metatron = false }) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.functions.invoke('ai-analyze', {
      // metatron:true → רזיאל נשען על «העץ האחד» (חוקים+גרף) בצד השרת (בטא, opt-in). ברירת-מחדל כבוי.
      body: { kind: 'research', persona: 'raziel', subject, facts, context, path, again, metatron, visitor_id: aiVisitorId() },
    });
    if (error) return null;
    if (data?.error === 'quota') {
      try { window.dispatchEvent(new CustomEvent('sod:ai-quota', { detail: { tier: data.tier, used: data.used, limit: data.limit, message: data.message } })); } catch { /* noop */ }
      return null;
    }
    const c = data?.raziel || data?.contract;   // המוח מחזיר את החוזה כשמוכן
    if (c && typeof c === 'object') return { v: 1, ...c };
    if (data?.analysis) {   // fallback — עוטף את המחרוזת הנוכחית כחוזה מינימלי
      try { logAiAnalysis({ kind: 'research', subject, styleKey: data.style_key, engine: data.engine, model: data.model, content: data.analysis }); } catch { /* noop */ }
      return { v: 1, answer: data.analysis };
    }
    return null;
  } catch { return null; }
}

// 🧭 askRazielAdvanced — RAZIEL_ADVANCED_NUMBER_PAGE_v0. Distinct opt-in projection of the same
//    persona="raziel" trunk (mode:"advanced") — carries explicit surface_context (what the Number
//    Page currently shows) so the server can distinguish canonical/personal/session context, without
//    ever changing the plain askRaziel() path above (existing callers: AskRaziel elsewhere, RazielChat).
//    Runtime contract (server): { ask, channel:"site", surface, user:{ref via auth}, surface_context }.
//    Server resolves identity from the Authorization header exactly like askRaziel — no client-supplied
//    "user.ref" is trusted for identity; the client only supplies what the page is showing right now.
export async function askRazielAdvanced({ ask, surface = "number_page", number, visibleFacts, visibleMatches, visibleConvergences, context = null, path = null, again = false }) {
  if (!supabase) return null;
  try {
    const surface_context = { number, visible_facts: visibleFacts, visible_matches: visibleMatches, visible_convergences: visibleConvergences };
    const { data, error } = await supabase.functions.invoke('ai-analyze', {
      body: { kind: 'research', persona: 'raziel', mode: 'advanced', surface, subject: ask, context, path, again, surface_context, visitor_id: aiVisitorId() },
    });
    if (error) return null;
    if (data?.error === 'quota') {
      try { window.dispatchEvent(new CustomEvent('sod:ai-quota', { detail: { tier: data.tier, used: data.used, limit: data.limit, message: data.message } })); } catch { /* noop */ }
      return null;
    }
    const c = data?.raziel || data?.contract;
    if (c && typeof c === 'object') return { v: 1, ...c };
    if (data?.analysis) return { v: 1, answer: data.analysis };
    return null;
  } catch { return null; }
}

// ===== 🧪 מעבדת-הסגנון (ai_style_learning_law) =====
// העיקרון (החלטת צוריאל 12.7.2026): המנוע מייצר נתונים → המערכת מסכמת מגמות → האדם מחליט.
// המשוב משנה סגנון והגשה בלבד — לעולם לא עובדות. אין שום למידה אוטומטית שמשנה סגנון.
export async function logAiAnalysis({ kind, subject, styleKey, engine, model, content }) {
  if (!supabase) return null;
  try {
    const { data } = await supabase.rpc('ai_log_analysis', {
      p_kind: kind || '', p_subject: subject || '', p_style: styleKey || 'balanced_v1',
      p_engine: engine || 'claude', p_model: model || '', p_content: content || '', p_visitor: aiVisitorId(),
    });
    if (data) {
      try {
        window.__sodAiLog = { id: data, subject: subject || '', at: Date.now() };
        window.dispatchEvent(new CustomEvent('sod:ai-logged', { detail: { id: data, kind, subject, styleKey } }));
      } catch { /* noop */ }
    }
    return data || null;
  } catch { return null; }
}
export async function sendAiSignal(id, signal) {
  if (!supabase || !id) return;
  try { await supabase.rpc('ai_signal', { p_id: id, p_signal: signal }); } catch { /* noop */ }
}
// איתות-התנהגות שקט: המשיך לחקור / הוסיף למחקר / שיתף — אחרי ניתוח טרי (חלון 10 דקות).
// זה המדד שצוריאל הכי מאמין בו: לא "לייק" אלא "האם המשכת לחקור?".
export function signalAiBehavior(signal) {
  try {
    const l = window.__sodAiLog;
    if (l && Date.now() - l.at < 10 * 60 * 1000) sendAiSignal(l.id, signal);
  } catch { /* noop */ }
}
export async function listAiStyles() {
  if (!supabase) return [];
  try { const { data } = await supabase.from('ai_style_profiles').select('*').order('created_at'); return data || []; }
  catch { return []; }
}
export async function adminAiRecent(limit = 40) {
  if (!supabase) return [];
  try { const { data } = await supabase.rpc('admin_ai_recent', { p_limit: limit }); return data || []; }
  catch { return []; }
}
export async function adminAiRate(id, rating, reason = null) {
  if (!supabase) return false;
  try { const { error } = await supabase.rpc('admin_ai_rate', { p_id: id, p_rating: rating, p_reason: reason }); return !error; }
  catch { return false; }
}
export async function adminAiStyleReport() {
  if (!supabase) return [];
  try { const { data } = await supabase.rpc('admin_ai_style_report'); return data || []; }
  catch { return []; }
}
export async function adminAiStyleSave(p) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.rpc('admin_ai_style_save', {
      p_key: p.style_key, p_name: p.name, p_depth: p.depth || '', p_facts: p.facts_level || '',
      p_interp: p.interpretation_level || '', p_length: p.length_pref || '', p_directives: p.directives || '', p_notes: p.notes || null,
    });
    return !error;
  } catch { return false; }
}
export async function adminAiStyleActivate(key) {
  if (!supabase) return false;
  try { const { error } = await supabase.rpc('admin_ai_style_activate', { p_key: key }); return !error; }
  catch { return false; }
}
// 📊 ביצועי ניתוח-ה-AI (הממוזג) בשלוש רמות — אהבו · יצרו מחקר · יצרו ידע. תואם לדוח השבועי של «השומר».
export async function adminAiPulse(days = 30) {
  if (!supabase) return null;
  try { const { data } = await supabase.rpc('admin_ai_pulse', { p_days: days }); return data || null; }
  catch { return null; }
}
// 🧭 מפת-מחקר (admin): מה הכי חיפשו (search_log) + מסעות אמיתיים (journey_trace: מאיפה→לאן→דרך איזו שיטה).
export async function adminResearchMap(days = 30) {
  if (!supabase) return null;
  try { const { data } = await supabase.rpc('admin_research_map', { p_days: days }); return data || null; }
  catch { return null; }
}

// ===== 🧠 מנוע-ההמלצות (system_suggestions_law) — Observe→Detect→Suggest→Explain→Decide =====
// «המערכת לעולם אינה משנה את עצמה. היא רק לומדת, מסבירה ומציעה.» כל שינוי = החלטת צוריאל.
export async function adminSuggestionsList(status = 'pending', limit = 60) {
  if (!supabase) return [];
  try { const { data } = await supabase.rpc('admin_suggestions_list', { p_status: status, p_limit: limit }); return data || []; }
  catch { return []; }
}
export async function adminSuggestionDecide(id, status, note = null) {
  if (!supabase) return false;
  try { const { error } = await supabase.rpc('admin_suggestion_decide', { p_id: id, p_status: status, p_note: note }); return !error; }
  catch { return false; }
}
export async function adminNotifyGet() {
  if (!supabase) return [];
  try { const { data } = await supabase.rpc('admin_notify_get'); return data || []; }
  catch { return []; }
}
export async function adminNotifySet(channel, target, enabled) {
  if (!supabase) return false;
  try { const { error } = await supabase.rpc('admin_notify_set', { p_channel: channel, p_target: target, p_enabled: enabled }); return !error; }
  catch { return false; }
}
export async function adminFireWatchman() {
  if (!supabase) return false;
  try { const { error } = await supabase.rpc('admin_fire_watchman'); return !error; }
  catch { return false; }
}

// 🔑 חלונות הגילוי — סטורי בראש דף הבית. קריאה ציבורית (RLS: active=true). מיון: sort↓ ואז חדש.
export async function getStories(lim = 20) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from('stories')
      .select('id,title,image_url,video_url,link,credit,contributor_slug,sort')
      .eq('active', true)
      .order('sort', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(lim);
    return data || [];
  } catch { return []; }
}

// 🧲 לכידת ליד-מחקר (research_workspace funnel שלב 4) — מייל + snapshot של תיק-המחקר.
// הכנסה ציבורית מותרת (RLS insert בלבד; קריאה = server-only). מחזיר true בהצלחה.
export async function saveResearchLead({ email, items, visitorId }) {
  if (!supabase || !email) return false;
  try {
    const clean = (items || []).slice(0, 40).map(e => ({
      type: e.type, title: e.title,
      value: e.metadata?.value ?? null, meaning: e.metadata?.meaning ?? null,
      link: e.link || null,
    }));
    const { error } = await supabase.from('research_leads').insert({
      email: String(email).trim().toLowerCase(), items: clean, visitor_id: visitorId || null,
    });
    return !error;
  } catch { return false; }
}

// 💌 הודעה אישית מבעל האתר לדף מספר (owner_note_law) — דאטא-דרייבן מ-nodes (role='owner_note').
// מחזיר {title, teaser, body, cta, signature} או null. מאפשר לצוריאל להוסיף/לערוך מספרים אישיים
// בלי פריסה (שינוי נתונים חי מיד). קריאה ציבורית — nodes כבר פתוח לקריאת anon.
export async function getOwnerNote(value) {
  if (!supabase || value == null) return null;
  try {
    const { data, error } = await supabase.from('nodes')
      .select('description,metadata')
      .eq('type', 'entity').eq('is_active', true)
      .eq('metadata->>role', 'owner_note')
      .eq('metadata->>value', String(value))
      .limit(1).maybeSingle();
    if (error || !data) return null;
    const m = data.metadata || {};
    return {
      title: m.title || '💌 הודעה אישית מבעל האתר',
      teaser: m.teaser || '',
      body: data.description || '',
      cta: m.cta || 'כן, אשמח לשמוע עוד ✨',
      signature: m.signature || '',
    };
  } catch { return null; }
}

// 📣 פופ-אפ קמפיין אתר-רחב (site_promo) — דאטא-דרייבן מ-nodes (role='site_promo'). מחזיר את
// הקמפיין הפעיל האחרון בתוך חלון-הזמן (active_until), או null. צוריאל מכבה/מאריך בלי פריסה.
export async function getSitePromo() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('nodes')
      .select('id,metadata')
      .eq('type', 'entity').eq('is_active', true)
      .eq('metadata->>role', 'site_promo')
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle();
    if (error || !data) return null;
    const m = data.metadata || {};
    if (m.active_until && Date.parse(m.active_until) <= Date.now()) return null;  // חלון נגמר
    if (!m.href) return null;
    return {
      id: data.id,
      href: m.href,
      title: m.title || 'פוסט חדש באתר',
      teaser: m.teaser || '',
      image: m.image || '',
      cta: m.cta || '📖 לקריאת הפוסט',
      activeUntil: m.active_until || null,
    };
  } catch { return null; }
}

// 🧲 פניית גולש בעקבות ההודעה האישית — משאיר דרך ליצירת קשר (INSERT ציבורי; קריאה server-only).
export async function submitOwnerNoteRequest({ number, name, contact, message, visitorId }) {
  if (!supabase || !contact) return false;
  try {
    const { error } = await supabase.from('owner_note_requests').insert({
      number: number != null ? Number(number) : null,
      name: (name || '').trim().slice(0, 120) || null,
      contact: String(contact).trim().slice(0, 200),
      message: (message || '').trim().slice(0, 2000) || null,
      visitor_id: visitorId || null,
    });
    return !error;
  } catch { return false; }
}

// המספרים החזקים בכל המאגר (אגרגציה) — לבועות-העל בדף הבית. [{value,count}].
export async function getTopPrimaryValues(lim = 16) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('top_primary_values', { lim });
  if (error || !data) return [];
  return data.map(r => ({ value: Number(r.value), count: Number(r.cnt) }));
}

// 🔎 Collective Discovery — כמה חוקרים שונים אוספים ישות (ספירה בלבד, פרטיות-בטוח). RPC entity_collective_count.
export async function getCollectiveCount(type, ref) {
  if (!supabase || !type || ref == null) return 0;
  try {
    const { data } = await supabase.rpc('entity_collective_count', { p_type: type, p_ref: String(ref) });
    return typeof data === 'number' ? data : (parseInt(data, 10) || 0);
  } catch { return 0; }
}

// מה שהקהילה חוקרת עכשיו — ישויות שנאספו ע"י >= minUsers חוקרים (אגרגט, בלי זהויות). RPC top_collective.
export async function getTopCollective(minUsers = 2, lim = 12) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.rpc('top_collective', { min_users: minUsers, lim });
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

// 🌳 סטטיסטיקת העץ האישי של המשתמש המחובר — גודל האוסף + כמה מהחיפושים שלו. למד-הפרופיל.
export async function getMyTreeStats() {
  const empty = { total: 0, searched: 0, words: 0 };
  if (!supabase) return empty;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return empty;
    const [totalRes, searchedRes, wordsRes] = await Promise.all([
      supabase.from('research_items').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('research_items').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('bucket', 'searched'),
      supabase.rpc('my_words_in_engine'), // "N מהמילים שלך במנוע" (contribution_events, צד סוכן-2)
    ]);
    const words = typeof wordsRes.data === 'number' ? wordsRes.data : (parseInt(wordsRes.data, 10) || 0);
    return { total: totalRes.count || 0, searched: searchedRes.count || 0, words };
  } catch { return empty; }
}

// סך התמונות הציבוריות בארכיון — ל«באנר האוצר» בדף הבית.
export async function getGalleryImageCount() {
  if (!supabase) return 0;
  const { count } = await supabase.from('gallery_images')
    .select('*', { count: 'exact', head: true })
    .not('image_url', 'is', null).not('curator_hidden', 'is', true).eq('min_tier', 0);
  return count || 0;
}

// מטא-דאטה של גלריות לפי wp_gallery_id — לרצועת «פתח את הגלריה המלאה» בפוסט ישן.
// עץ אחד: הפוסט שומר את התמונות המוטמעות, וזה רק מפנה לעדשה העריכה (לא משכפל).
export async function getGalleriesByWpIds(wpIds) {
  if (!supabase || !Array.isArray(wpIds) || !wpIds.length) return [];
  const { data } = await supabase
    .from('galleries')
    .select('id,name,anchor_number,img_count,wp_gallery_id')
    .in('wp_gallery_id', wpIds);
  return data || [];
}

// ===== סטים של מספרים (number_sets) =====
export async function getNumberSets() {
  if (!supabase) return [];
  const { data } = await supabase.from('number_sets').select('*')
    .eq('is_active', true).order('sort_order', { ascending: true }).order('created_at', { ascending: true });
  return data || [];
}
export async function saveNumberSet({ id, name, numbers, description = null, sort_order = 0, image_order = undefined, show_on_home = undefined }) {
  if (!supabase) throw new Error('no supabase');
  const row = { name, numbers, description, sort_order };
  if (image_order !== undefined) row.image_order = image_order;
  if (show_on_home !== undefined) row.show_on_home = show_on_home;
  if (id) {
    const { data, error } = await supabase.from('number_sets')
      .update({ ...row, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle();
    if (error) throw error; return data;
  }
  const { data, error } = await supabase.from('number_sets').insert(row).select().maybeSingle();
  if (error) throw error; return data;
}
export async function deleteNumberSet(id) {
  if (!supabase) throw new Error('no supabase');
  const { error } = await supabase.from('number_sets').delete().eq('id', id);
  if (error) throw error;
}
// סטים שצוריאל סימן «הצג בדף הבית» — שליטה אילו סדרות גימטריה מהגלריה מופיעות בבית.
export async function getHomeSets() {
  if (!supabase) return [];
  const { data } = await supabase.from('number_sets').select('*')
    .eq('is_active', true).eq('show_on_home', true)
    .order('sort_order', { ascending: true }).order('created_at', { ascending: true });
  return data || [];
}

// ===== פיד «עדכוני גלריה» — עדשה על gallery_images (source='update') =====
// תצלומי-עדכון טריים (חדשות/ממצאים) — לא טבלה חדשה, רק שאילתה. החדש למעלה.
export async function getGalleryUpdates(limit = 60) {
  if (!supabase) return [];
  const { data } = await supabase
    .from('gallery_images')
    .select('id,image_url,thumb_url,name,description,primary_value,all_values,occurred_at,created_at,stream_at,importance')
    .eq('source', 'update')
    .not('image_url', 'is', null)
    .not('curator_hidden', 'is', true)
    .eq('min_tier', 0)                                               // נראות: ציבורי בלבד (פרימיום/מוסתר נחסם)
    .order('stream_at', { ascending: false, nullsFirst: false })    // 🌊 לפי «נוסף לזרם»
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// ===== זרם המציאות (Reality Stream) — כל ה«רמזים» (source='update') במאגר אחד =====
// יחידת הבסיס היא רמז: תמונה + מספר דומיננטי (primary_value) + תאריך + תגיות (all_values
// + ocr_meta.entities). שולפים פעם אחת, והמיון/סינון/דופק מחושבים בצד-לקוח (src/lib/reality.js).
export async function getRealityHints(limit = 1000) {
  if (!supabase) return [];
  const { data } = await supabase
    .from('gallery_images')
    .select('id,image_url,thumb_url,name,description,primary_value,all_values,occurred_at,created_at,stream_at,importance,ocr_meta,image_type')
    .eq('source', 'update')
    .not('image_url', 'is', null)
    .not('curator_hidden', 'is', true)
    .eq('min_tier', 0)                                               // נראות: ציבורי בלבד
    .order('stream_at', { ascending: false, nullsFirst: false })    // 🌊 הכי-חדש-שנוסף-לזרם ראשון (חלון 50)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// 🔒 דגלי-אתר (site_flags) — נעילות תחזוקה/שדרוגים וכד'. קריאה ציבורית; כתיבה = service_role בלבד.
// מחזיר מפה {key: {enabled, message, mode}}. mode: 'all'=כולם חסומים · 'anon'=רשומים עוברים.
export async function getSiteFlags() {
  if (!supabase) return {};
  try {
    const { data } = await supabase.from('site_flags').select('key,enabled,message,mode');
    const m = {};
    for (const r of (data || [])) m[r.key] = r;
    return m;
  } catch { return {}; }
}

// 🔥 המספרים החמים באתר — לפי מפת-החום האמיתית (search_log, 7 ימים): אילו מספרים הכי חיפשו.
// ספירה בצד-לקוח על values בלבד (בלי מונחים — פרטיות). [{n, count}] ממוין חם→קר.
export async function getHotNumbers(days = 7, lim = 10) {
  if (!supabase) return [];
  try {
    const since = new Date(Date.now() - days * 864e5).toISOString();
    const { data } = await supabase.from('search_log').select('value')
      .gte('created_at', since).not('value', 'is', null).limit(4000);
    const counts = new Map();
    for (const r of (data || [])) {
      const n = Number(r.value);
      if (n > 0) counts.set(n, (counts.get(n) || 0) + 1);
    }
    return [...counts.entries()].map(([n, count]) => ({ n, count }))
      .sort((a, b) => b.count - a.count).slice(0, lim);
  } catch { return []; }
}

// 👑 «אוצרות הגילוי» — ציר-הערך: תמונות שצוריאל סימן treasure=true (אצירה ידנית, לא תלוי-זמן).
// סדר: הבלטה (importance) ואז חדש→ישן. הראשונה = «בחירת העורך» (ה-Hero של שער-המוזיאון).
export async function getTreasures(limit = 12) {
  if (!supabase) return [];
  const { data } = await supabase
    .from('gallery_images')
    .select('id,image_url,thumb_url,name,description,primary_value,all_values,occurred_at,created_at,stream_at,importance,image_type')
    .eq('treasure', true)
    .not('image_url', 'is', null)
    .not('curator_hidden', 'is', true)
    .eq('min_tier', 0)
    .order('importance', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// ===== אוספים (gallery_collections) — גלריות/אוספים/מסלולים גמישים מעל הדרגות הקבועות =====
// אוסף = כלל (filter jsonb) על gallery_images. הדרגה (image_type) לא משתנה; זו רק תצוגה.
export async function getGalleryCollections() {
  if (!supabase) return [];
  const { data } = await supabase.from('gallery_collections')
    .select('id,slug,title,description,kind,filter,is_premium,cover_url,sort')
    .eq('is_active', true).order('sort', { ascending: true });
  return data || [];
}

// תמונות של אוסף לפי ה-filter שלו ({tag}/{primary_value}/{source}/{image_type}). נראות ציבורית בלבד.
export async function getCollectionImages(filter, limit = 500) {
  if (!supabase || !filter) return [];
  let q = supabase.from('gallery_images')
    .select('id,image_url,thumb_url,name,description,primary_value,all_values,occurred_at,created_at,importance,image_type,tags')
    .not('image_url', 'is', null).not('curator_hidden', 'is', true).eq('min_tier', 0);
  if (filter.tag) q = q.contains('tags', [filter.tag]);
  if (filter.primary_value) q = q.eq('primary_value', filter.primary_value);
  if (filter.source) q = Array.isArray(filter.source) ? q.in('source', filter.source) : q.eq('source', filter.source);
  if (filter.image_type) q = q.eq('image_type', filter.image_type);
  const { data } = await q
    .order('importance', { ascending: false, nullsFirst: false })
    .order('occurred_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// תחנות ציר ההתגלות (לגשר בין סט מספרים לאירועים)
export async function getTederStations() {
  if (!supabase) return [];
  const { data } = await supabase.from('teder_stations')
    .select('id,title,year,event_date,central_numbers,post_ref,description,sort_order,is_active')
    .eq('is_active', true).order('year', { ascending: false });
  return data || [];
}

// פירוט גלריה אחת — כל התמונות בסדר כרונולוגי (ordering) עם תיאורים.
export async function getGalleryDetail(galleryId) {
  if (!supabase || !galleryId) return [];
  const { data } = await supabase
    .from('gallery_images')
    .select('id,name,description,image_url,thumb_url,ordering,primary_value,all_values,occurred_at')
    .eq('gallery_id', galleryId)
    .not('curator_hidden', 'is', true)
    .eq('min_tier', 0)                                               // נראות: ציבורי בלבד
    .order('ordering', { ascending: true });
  return data || [];
}

// תמונות לפי ערך-ראשי (primary_value) — לקרוסלת רמזים בתוך פוסט. כרונולוגי (חדש→ישן).
export async function getImagesByPrimaryValue(value) {
  if (!supabase || !value) return [];
  const { data } = await supabase
    .from('gallery_images')
    .select('id,name,description,image_url,thumb_url,primary_value,all_values,occurred_at,created_at,importance')
    .eq('primary_value', value)
    .not('image_url', 'is', null)
    .not('curator_hidden', 'is', true)                              // אצירה: מוסתר לא מוצג
    .eq('min_tier', 0)                                               // נראות: פרימיום/מוסתר לא לציבור
    .order('importance', { ascending: false, nullsFirst: false })   // אצירה: המובחר ראשון
    .order('occurred_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  return data || [];
}

// תמונות לפי ערך מלא (primary_value או all_values) — למשפחת האפסים / מספרים בלי primary ייעודי.
export async function getImagesByValue(value) {
  if (!supabase || !value) return [];
  const { data } = await supabase
    .from('gallery_images')
    .select('id,name,description,image_url,thumb_url,primary_value,all_values,occurred_at,created_at,importance')
    .or(`primary_value.eq.${value},all_values.cs.{${value}}`)
    .not('image_url', 'is', null)
    .not('curator_hidden', 'is', true)
    .eq('min_tier', 0)                                               // נראות: ציבורי בלבד
    .order('importance', { ascending: false, nullsFirst: false })
    .order('occurred_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  return data || [];
}

// תמונות של גלריה אחת (wp_gallery_id) — לקרוסלה החיה בתוך פוסט (data-sod-gallery-id).
// עץ אחד: הפוסט הישן מפסיק להציג HTML קפוא ומצביע ל-gallery_images העריך —
// כך עריכת תאריך/חשיבות/הסתרה/מספר בגלריה משתקפת מיד בפוסט. ציבורי בלבד.
// סדר: חשיבות↓ ואז הסדר הידני של הגלריה (ordering) — שומר על הסדר הישן של צוריאל.
export async function getImagesByGallery(wpGalleryId) {
  if (!supabase || !wpGalleryId) return [];
  const { data } = await supabase
    .from('gallery_images')
    .select('id,name,description,image_url,thumb_url,ordering,primary_value,all_values,occurred_at,created_at,importance')
    .eq('wp_gallery_id', wpGalleryId)
    .not('image_url', 'is', null)
    .not('curator_hidden', 'is', true)
    .eq('min_tier', 0)                                               // נראות: פרימיום/מוסתר לא לציבור
    .order('importance', { ascending: false, nullsFirst: false })
    .order('ordering', { ascending: true, nullsFirst: false });
  return data || [];
}

// ===== דף הישות — איסוף כל המידע סביב מספר/ביטוי =====
// מחזיר ספירות + פריטים לכל מדור (פוסטים, גלריות, אירועים, תגובות, חידושי AI, מילים שוות).
export async function getEntityBundle({ term, value, isNumber }) {
  if (!supabase || !term) return null;
  const t = String(term).trim();
  const like = `%${t}%`;
  // שאילתה עם ספירה כוללת + פריטים מוגבלים, עטופה ב-try כדי שלא תפיל את שאר המדורים
  const sec = (table, cols, build) => {
    try {
      let q = supabase.from(table).select(cols, { count: 'exact' });
      q = build(q);
      return q.then(({ data, count }) => ({ items: data || [], count: count ?? (data?.length || 0) }))
              .catch(() => ({ items: [], count: 0 }));
    } catch { return Promise.resolve({ items: [], count: 0 }); }
  };

  // פוסטים — סינון מחמיר: עד 3 פוסטים, הכי רלוונטיים בלבד (לא הצפה).
  // למספר: RPC מדורג (כותרת > תגית-מספר). לטקסט: קודם הביטוי בכותרת, ורק להשלמה — מהתוכן.
  const postsP = isNumber
    ? supabase.rpc('posts_by_number_strict', { num: value, lim: 3 })
        .then(({ data }) => ({ items: data || [], count: (data || []).length }))
        .catch(() => ({ items: [], count: 0 }))
    : (async () => {
        try {
          const byTitle = await supabase.from('posts').select('wp_id,slug,title,date')
            .ilike('title', like).order('date', { ascending: false }).limit(3);
          const items = byTitle.data || [];
          if (items.length < 3) {
            const seen = new Set(items.map(p => p.wp_id));
            const byContent = await supabase.from('posts').select('wp_id,slug,title,date')
              .ilike('content', like).order('date', { ascending: false }).limit(6);
            for (const p of (byContent.data || [])) {
              if (!seen.has(p.wp_id)) { items.push(p); if (items.length >= 3) break; }
            }
          }
          return { items, count: items.length };
        } catch { return { items: [], count: 0 }; }
      })();

  const [phrases, posts, galleries, events, comments, insights] = await Promise.all([
    value
      ? supabase.from('gematria_words').select('phrase,ragil,is_verified,visibility_tier,lead_rank,tags', { count: 'exact' })
          .eq('ragil', value)
          .eq('is_verified', true).eq('is_published', true)   // ✅ verified-only public projection (verified_only_public_gematria_law)
          .order('lead_rank', { ascending: true, nullsFirst: false })   // 📌 נעוצים (חזקים) קודם
          .order('is_verified', { ascending: false })
          .order('visibility_tier', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false, nullsFirst: false }).limit(500)
          .then(({ data, count }) => ({ items: data || [], count: count ?? (data?.length || 0) }))
          .catch(() => ({ items: [], count: 0 }))
      : Promise.resolve({ items: [], count: 0 }),
    postsP,
    // גלריות: למספר — שתי שאילתות מדורגות כדי שתמונות *על* המספר (primary_value)
    // יגיעו תמיד תחילה, ואז אזכורים (all_values). סינון-הרלוונטיות נעשה בדף עצמו.
    isNumber ? (async () => {
      try {
        const cols = 'id,name,description,image_url,thumb_url,primary_value,gallery_id,all_values,occurred_at,created_at,importance';
        const ord = q => q.not('curator_hidden', 'is', true).eq('min_tier', 0)
          .order('importance', { ascending: false, nullsFirst: false })
          .order('occurred_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });
        const [pr, sr] = await Promise.all([
          ord(supabase.from('gallery_images').select(cols).eq('primary_value', value)).limit(24),
          ord(supabase.from('gallery_images').select(cols, { count: 'exact' }).contains('all_values', [value])).limit(40),
        ]);
        const map = new Map();
        for (const g of (pr.data || [])) map.set(g.id, g);   // "על המספר" קודם
        for (const g of (sr.data || [])) if (!map.has(g.id)) map.set(g.id, g);
        const items = [...map.values()];
        return { items, count: sr.count ?? items.length };
      } catch { return { items: [], count: 0 }; }
    })() :
    sec('gallery_images', 'id,name,description,image_url,thumb_url,primary_value,gallery_id,all_values,occurred_at,created_at,importance',
      q => q.ilike('name', like)
            .not('curator_hidden', 'is', true)
            .order('importance', { ascending: false, nullsFirst: false })
            .order('occurred_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false }).limit(18)),
    // אירועים: רק לטקסט (למספר אין שדה מספרי בנודים — נמנע מרעש כמו 2026 עבור 26).
    isNumber ? Promise.resolve({ items: [], count: 0 }) :
      sec('nodes', 'id,label,hebrew_date,weight',
        q => q.eq('type', 'event').eq('is_active', true).ilike('label', like).order('weight', { ascending: false }).limit(12)),
    // תגובות: רק לטקסט (למספר תת-מחרוזת מייצרת רעש).
    isNumber ? Promise.resolve({ items: [], count: 0 }) :
      sec('comments', 'wp_id,post_wp_id,author_name,content,date',
        q => q.ilike('content', like).order('date', { ascending: false }).limit(8)),
    // חידושים: למספר — לפי related_numbers מדויק בלבד; לטקסט — לפי ביטוי + כותרת/גוף.
    sec('insights', 'id,title,body,source_ref,source_type,origin,related_numbers,related_phrases',
      q => (isNumber
        ? q.eq('is_active', true).contains('related_numbers', [value])
        : q.eq('is_active', true).or(`related_phrases.cs.{"${t}"},title.ilike.${like},body.ilike.${like}`)
      ).limit(12)),
  ]);

  return {
    term: t, value, isNumber, phrases: phrases.items, phrasesCount: phrases.count,
    posts: posts.items, postsCount: posts.count,
    galleries: galleries.items, galleriesCount: galleries.count,
    events: events.items, eventsCount: events.count,
    comments: comments.items, commentsCount: comments.count,
    insights: insights.items, insightsCount: insights.count,
  };
}

// ── Comments ──────────────────────────────────────────────
export async function getCommentsByPostId(postWpId) {
  if (!supabase || !postWpId) return [];
  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('post_wp_id', postWpId)
    .order('date', { ascending: true });
  return data ?? [];
}

// כל התגובות מהאתר הישן, מקובצות תחת כל פוסט (לתצוגת ניהול)
export async function getOldSiteComments() {
  if (!supabase) return [];
  // PostgREST מגביל ~1000 שורות לבקשה — מושכים בעמודים
  async function fetchAll(table, cols, order) {
    const CH = 1000, out = [];
    for (let from = 0; ; from += CH) {
      let q = supabase.from(table).select(cols).range(from, from + CH - 1);
      if (order) q = q.order(order, { ascending: false });
      const { data } = await q;
      if (!data || !data.length) break;
      out.push(...data);
      if (data.length < CH) break;
    }
    return out;
  }
  const [cms, ps] = await Promise.all([
    fetchAll('comments', 'wp_id,post_wp_id,author_name,date,content', 'date'),
    fetchAll('posts', 'wp_id,title,slug', null),
  ]);
  const pmap = {};
  ps.forEach(p => { pmap[p.wp_id] = { title: p.title || '', slug: p.slug }; });
  const groups = new Map();
  for (const c of cms) {
    let g = groups.get(c.post_wp_id);
    if (!g) {
      g = { post_wp_id: c.post_wp_id, title: pmap[c.post_wp_id]?.title || `פוסט #${c.post_wp_id}`,
            slug: pmap[c.post_wp_id]?.slug || null, comments: [], latest: c.date };
      groups.set(c.post_wp_id, g);
    }
    g.comments.push(c);
    if (c.date > g.latest) g.latest = c.date;
  }
  return [...groups.values()].sort((a, b) => (a.latest < b.latest ? 1 : -1));
}

// ── Popular posts (by comment count) ──────────────────────
export async function getPopularPosts({ limit = 10 } = {}) {
  const { data } = await supabase.rpc('popular_posts_by_comments', { lim: limit });
  if (data?.length) return data;
  // fallback: most recent
  const { data: recent } = await supabase
    .from('posts').select('*').order('date', { ascending: false }).limit(limit);
  return recent ?? [];
}

// 👁 מעקב צפיות חי — שורה לכל צפייה (פעם אחת לכל ref בכל session, כדי לא לנפח).
export async function logView(kind, ref) {
  if (!supabase || !kind || ref == null || ref === "") return;
  const key = `pv-${kind}-${ref}`;
  try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* ignore */ }
  try { await supabase.from("page_views").insert({ kind, ref: String(ref) }); } catch { /* ignore */ }
}
// 🔎 ספירת חיפושים כוללת (כל הזמן) למספר — מד קבוע "כמה פעמים חיפשו". מקור: search_log.
export async function getSearchCount(value) {
  if (!supabase || !value) return 0;
  const { count } = await supabase.from("search_log").select("*", { count: "exact", head: true }).eq("value", value);
  return count || 0;
}
// 🔎 סטטיסטיקת חיפושים של היום (לרצועת הטיקר): כמה חיפושים נעשו + כמה מילים ייחודיות נחקרו.
// מקור: search_log. ספירת החיפושים = exact head count; המילים = distinct מדגם (עד 2000 שורות).
export async function getSearchStatsToday() {
  if (!supabase) return { searches: 0, words: 0, total: 0 };
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const iso = start.toISOString();
  let searches = 0, words = 0, total = 0;
  try {
    const { count } = await supabase.from("search_log").select("*", { count: "exact", head: true }).gte("created_at", iso);
    searches = count || 0;
  } catch { /* ignore */ }
  let topNumber = null;
  try {
    const { data } = await supabase.from("search_log").select("term,value").gte("created_at", iso).limit(2000);
    words = new Set((data || []).map(r => (r.term || "").trim()).filter(Boolean)).size;
    const freq = {};
    for (const r of (data || [])) if (r.value != null) freq[r.value] = (freq[r.value] || 0) + 1;
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2) topNumber = Number(top[0]);
  } catch { /* ignore */ }
  try {
    const { count } = await supabase.from("search_log").select("*", { count: "exact", head: true });
    total = count || 0;
  } catch { /* ignore */ }
  let month = 0;
  try {
    const m0 = new Date(); m0.setDate(1); m0.setHours(0, 0, 0, 0);
    const { count } = await supabase.from("search_log").select("*", { count: "exact", head: true }).gte("created_at", m0.toISOString());
    month = count || 0;
  } catch { /* ignore */ }
  return { searches, words, total, topNumber, month };
}
// 💎 כותרות הצלבות מאומתות-ציבוריות (לרצועת הטיקר). רק space='core' + verified=true —
// כך רמזי-גלם/מעבדה שלא אושרו לא דולפים לציבור. מחזיר עד `limit` (לגיוון ברוטציה).
export async function getVerifiedCrossTitles(limit = 3) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("insights")
      .select("title,created_at")
      .eq("is_active", true).eq("space", "core").eq("verified", true)
      .not("title", "is", null)
      .order("created_at", { ascending: false }).limit(limit);
    return (data || []).map(r => r.title).filter(Boolean);
  } catch { return []; }
}
// 📡 הודעות-טיקר ידניות — צוריאל שולט (טבלת ticker_messages). מוצגות ראשונות בטיקר.
// להוסיף: insert into ticker_messages(text,priority) · להסיר: update ... set is_active=false.
// 🫧 דופק-פעילות ציבורי (activity_pulse) — סוגי פעילות בשעה האחרונה, בלי תוכן (פרטיות).
export async function getActivityPulse() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc("activity_pulse");
    if (error) return null;
    return data;
  } catch { return null; }
}

// 🌳 דופק-היום — מקור-אמת אחד (RPC site_pulse_today): חקירות היום (site_visits, זהה לדף-הבית),
// פעילים עכשיו, צפנים חדשים היום, וכתבים חדשים. today-only (שואל now()::date). מזין את הטיקר.
export async function getSitePulseToday() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc("site_pulse_today");
    if (error) return null;
    return data;
  } catch { return null; }
}

// 🔢 מספרים שנפתחו לאחרונה (דפי-מספר בפועל, לא חיפושים אישיים). מספר = לא-פרטי → קריא-לציבור.
// מקור: RPC recent_number_opens (SECURITY DEFINER) — מסונן למספרים משמעותיים (יש להם ביטויים במאגר).
export async function getRecentNumbers(limit = 8) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc("recent_number_opens", { lim: limit });
    if (error) return [];
    return data || [];
  } catch { return []; }
}

export async function getTickerMessages() {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("ticker_messages")
      .select("text").eq("is_active", true)
      .order("priority", { ascending: false }).order("created_at", { ascending: false }).limit(10);
    return (data || []).map(r => r.text).filter(Boolean);
  } catch { return []; }
}

// 🧹 [הוסר 22.7.2026] saveUserItem/getUserItems/deleteUserItem + טבלת user_saved_items —
//    קוד מת: הפונקציות לא נקראו מאף רכיב, והטבלה נשארה ריקה (0 שורות) מאז ומתמיד.
//    מערכת השמירה הפעילה היא research_items (bucket library/favorite) דרך useResearch,
//    שהיא הטבלה המאוחדת הקנונית לפי research_workspace_law («research_items שמאחדת גם את
//    user_saved_items»). הוסר כדי לא לבלבל (עץ אחד — אין מערכת מקבילה מתה).

// 👣 ספירת כניסות היום (best-effort — אם RLS חוסם, מחזיר 0). מקור: site_visits.
export async function getVisitorsToday() {
  if (!supabase) return 0;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  try {
    const { count } = await supabase.from("site_visits").select("*", { count: "exact", head: true }).gte("ts", start.toISOString());
    return count || 0;
  } catch { return 0; }
}
// 👁 ספירת צפיות חיה לפריט יחיד (מספר/פוסט) בחלון ימים — למחוון "חם" בדף עצמו
export async function getViewCount(kind, ref, days = 7) {
  if (!supabase || ref == null || ref === "") return 0;
  const { data } = await supabase.rpc("view_count", { p_kind: kind, p_ref: String(ref), p_days: days });
  return Number(data) || 0;
}
// 🔥 פוסטים נצפים עכשיו (חי, לפי חלון ימים — היום=1, השבוע=7)
export async function getHotPostsLive({ days = 7, limit = 4 } = {}) {
  if (!supabase) return [];
  const { data } = await supabase.rpc("hot_posts_live", { days, lim: limit });
  return data || [];
}

// ── Contact ────────────────────────────────────────────────
export async function sendContactMessage({ name, email, subject, message }) {
  const { error } = await supabase.from('contact_messages').insert([{
    name: name.trim(), email: email.trim(),
    subject: subject.trim(), message: message.trim(),
  }]);
  if (error) throw error;
}

// ── Chat ───────────────────────────────────────────────────
export async function getChatMessages({ limit = 80 } = {}) {
  const { data } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).reverse();
}

export async function sendChatMessage({ author, content }) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert([{ author: author.trim(), content: content.trim() }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function subscribeToChatMessages(callback) {
  return supabase
    .channel('chat_messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
      callback(payload.new);
    })
    .subscribe();
}

// ── Traffic / Jetpack stats (legacy_traffic) ───────────────
// היסטוריית גלישה שיובאה מ-Jetpack/WordPress.com (ראה scripts/sync-jetpack-stats.mjs).
const TRAFFIC_SEL = 'post_id, title, url, views, period, source';

// PostgREST מגביל ~1000 שורות לבקשה — מושכים בעמודים עד שמתרוקן
async function fetchAllTraffic(source, orderCol, asc) {
  const PAGE = 1000;
  let from = 0, out = [];
  for (;;) {
    const { data, error } = await supabase
      .from('legacy_traffic').select(TRAFFIC_SEL)
      .eq('source', source).order(orderCol, { ascending: asc })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out = out.concat(data ?? []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

export async function getTrafficStats() {
  const empty = { yearly: [], daily: [], posts: [], referrers: [], clicks: [], searches: [] };
  if (!supabase) return empty;
  const small = (source, col, asc) =>
    supabase.from('legacy_traffic').select(TRAFFIC_SEL).eq('source', source).order(col, { ascending: asc }).limit(200);
  const [daily, posts, yearlyR, refR, clickR, searchR] = await Promise.all([
    fetchAllTraffic('jetpack-daily', 'period', true),
    fetchAllTraffic('jetpack', 'views', false),
    small('jetpack-total', 'period', true),
    small('jetpack-referrer', 'views', false),
    small('jetpack-click', 'views', false),
    small('jetpack-search', 'views', false),
  ]);
  const bad = [yearlyR, refR, clickR, searchR].find(r => r.error);
  if (bad?.error) throw bad.error;
  const num = arr => (arr ?? []).map(x => ({ ...x, views: Number(x.views) || 0 }));
  return {
    yearly: num(yearlyR.data).map(r => ({ period: r.period, views: r.views })),
    daily: num(daily).map(r => ({ date: r.period, views: r.views })),
    posts: num(posts),
    referrers: num(refR.data),
    clicks: num(clickR.data),
    searches: num(searchR.data),
  };
}

// ── Subscribers (רשימת תפוצה) ──────────────────────────────
export async function subscribeEmail({ email, name = null, source = 'site' }) {
  if (!supabase || !email?.trim()) return { ok: false };
  // תצלום-ייחוס v1 (מגע-ראשון + אחרון + מגע-ההרשמה + visitor_id) — בונה קנוני אחד
  // (lib/acquisition.js), אותו חוזה-localStorage שנלכד ב-tracking.captureAcquisition. טהור → בלי מעגל-import.
  let acquisition = null;
  try { acquisition = signupAttribution(); } catch { /* noop */ }
  const row = { email: email.trim(), name: name?.trim() || null, source };
  if (acquisition) row.acquisition = acquisition;
  const { error } = await supabase.from('subscribers').insert([row]);
  if (error && !/duplicate|unique/i.test(error.message)) throw error;
  return { ok: true, duplicate: !!error };
}

// ── מרכז התראות — העדפות נושאים/ערוצים (notification_prefs) ──
// מקור אחד לכל הערוצים. שורה לכל זהות: userId (מחובר) או visitorId (אנונימי).
export async function getNotificationPrefs({ userId = null, visitorId = null } = {}) {
  if (!supabase) return null;
  let q = supabase.from('notification_prefs').select('topics, channels, email, intensity, muted_until');
  if (userId) q = q.eq('user_id', userId);
  else if (visitorId) q = q.eq('visitor_id', visitorId);
  else return null;
  const { data } = await q.maybeSingle();
  return data || null;
}

export async function saveNotificationPrefs({ userId = null, visitorId = null, topics = [], channels = [], email = null, intensity = undefined, mutedUntil = undefined }) {
  if (!supabase) return { ok: false };
  const row = { topics, channels, email: email || null, updated_at: new Date().toISOString() };
  if (intensity !== undefined) row.intensity = intensity;
  if (mutedUntil !== undefined) row.muted_until = mutedUntil;
  let res;
  if (userId) {
    row.user_id = userId;
    res = await supabase.from('notification_prefs').upsert(row, { onConflict: 'user_id' });
  } else if (visitorId) {
    row.visitor_id = visitorId;
    res = await supabase.from('notification_prefs').upsert(row, { onConflict: 'visitor_id' });
  } else return { ok: false };
  if (res.error) throw res.error;
  // בחר ערוץ מייל ויש כתובת → לוודא שהוא ברשימת התפוצה הקיימת (בלי כפילות, בלי מערכת מקבילה).
  if (channels.includes('email') && email) {
    try { await subscribeEmail({ email, source: 'notification-center' }); } catch { /* noop */ }
  }
  return { ok: true };
}

// תפר השדרוג (אנונימי → חשבון): כשמבקר מתחבר, "תובעים" את שורת ההעדפות שלו
// (visitor_id) ומקשרים אותה ל-user_id. מריצים בשתיקה בעת התחברות.
export async function claimVisitorPrefs(userId, visitorId) {
  if (!supabase || !userId || !visitorId) return;
  try {
    await supabase.from('notification_prefs')
      .update({ user_id: userId })
      .eq('visitor_id', visitorId)
      .is('user_id', null);
  } catch { /* silent */ }
}

// ── מונה שיתופים לפוסטים (הוכחה חברתית) ─────────────────────
export async function getShareCount(wpId) {
  if (!supabase || !wpId) return 0;
  const { data } = await supabase
    .from('post_share_counts')
    .select('count')
    .eq('wp_id', wpId)
    .maybeSingle();
  return data?.count ?? 0;
}

export async function incrementShareCount(wpId) {
  if (!supabase || !wpId) return null;
  const { data, error } = await supabase.rpc('increment_post_share', { p_wp_id: wpId });
  if (error) return null;
  return data;  // הערך החדש של המונה
}

// מנוי Realtime למונה השיתופים של פוסט — מתעדכן חי כשמישהו משתף
export function subscribeShareCount(wpId, cb) {
  if (!supabase || !wpId) return () => {};
  const ch = supabase
    .channel(`share_count_${wpId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'post_share_counts', filter: `wp_id=eq.${wpId}` },
      payload => { const n = payload?.new?.count; if (typeof n === 'number') cb(n); })
    .subscribe();
  return () => { try { supabase.removeChannel(ch); } catch { /* noop */ } };
}

// ── תיעוד פעילות משתמשים מחוברים (פילוח עתידי + מבקר חוזר) ──
// שקט ולא חוסם: רושם רק למשתמש מחובר (RLS), נכשל בשתיקה אם אין session.
export async function logActivity(kind, ref = null, title = null) {
  if (!supabase || !kind) return;
  try {
    // רק למשתמש מחובר: RLS דורש user_id=auth.uid(); אנונימי חסום (היה מפיל permission-denied בלוג).
    // בעבר לא הועבר user_id כלל → נכשל גם למחוברים (with_check user_id=auth.uid() על null).
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return;
    await supabase.from('user_activity').insert({ user_id: uid, kind, ref, title: title ? String(title).slice(0, 200) : null });
  } catch { /* silent */ }
}

// מטא-דאטה קל לכמה פוסטים לפי wp_id (בלי עמודת content הכבדה) — לכרטיסים/תצוגות
export async function getPostsMetaByWpIds(wpIds = []) {
  if (!supabase || !wpIds.length) return [];
  const { data } = await supabase.from('posts').select('wp_id, slug, title, image_url, thumb_url').in('wp_id', wpIds);
  return data || [];
}

// מוני שיתופים למספר פוסטים בבת אחת → מפה { wp_id: count }
export async function getShareCounts(wpIds = []) {
  if (!supabase || !wpIds.length) return {};
  const { data } = await supabase.from('post_share_counts').select('wp_id, count').in('wp_id', wpIds);
  const map = {};
  (data || []).forEach(r => { map[r.wp_id] = r.count; });
  return map;
}

// ── Admin inbox (הודעות + מנויים) — הרשאה בצד-שרת בלבד: auth.uid() מול users.role='admin' ──
// ⛔ אין סיסמה משותפת. הסוד הישן (ADMIN_PASSWORD) נארז ל-bundle הציבורי ולכן מעולם לא היה הרשאה.
// p_key נשאר בחתימת ה-RPC לצורך תאימות בלבד ומתעלמים ממנו לחלוטין — שולחים null.
export async function getAdminInbox() {
  const empty = { messages: [], subscribers: [], unread: 0, subscriber_count: 0 };
  if (!supabase) return empty;
  const { data, error } = await supabase.rpc('admin_inbox', { p_key: null });
  if (error) throw error;
  return data || empty;
}

export async function markMessageRead(id, read = true) {
  if (!supabase) return;
  const { error } = await supabase.rpc('admin_mark_message_read', { p_key: null, p_id: id, p_read: read });
  if (error) throw error;
}

// ── פאנל ניהול חדש (מבוסס role=admin דרך RLS) ──
export async function adminGetMessages() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('contact_messages')
    .select('id,name,email,subject,message,created_at,read').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function adminSetMessageRead(id, read = true) {
  if (!supabase) throw new Error('no supabase');
  const { error } = await supabase.from('contact_messages').update({ read }).eq('id', id);
  if (error) throw error;
}
export async function adminGetSubscribers() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('subscribers')
    .select('id,email,name,source,active,created_at,acquisition').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// 📥 מיילים נכנסים (inbound_emails) — תשובות «השב» לניוזלטר וכל מייל שנכנס. אדמין-בלבד (RLS).
export async function adminGetInbound({ limit = 100 } = {}) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('inbound_emails')
    .select('id,from_email,from_name,to_email,subject,body_text,received_at,read,replied_at,reply_count')
    .order('received_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}
export async function adminSetInboundRead(id, read = true) {
  if (!supabase) throw new Error('no supabase');
  const { error } = await supabase.from('inbound_emails').update({ read }).eq('id', id);
  if (error) throw error;
}
// שליחת «השב» דרך Edge (email-reply) — שולח מייל אמיתי לנמען ומסמן replied_at.
export async function adminReplyEmail(id, bodyText) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.functions.invoke('email-reply', { body: { id, body_text: bodyText } });
  if (error) throw error;
  if (data?.error) throw new Error(data.hint || data.error);
  return data;
}

// עדכון ידני של פוסט בידי מנהל (כותרת / תוכן / תקציר). מסמן modified=עכשיו.
export async function adminUpdatePost(id, fields = {}) {
  if (!supabase) throw new Error('no supabase');
  if (id == null) throw new Error('no post id');
  const allowed = {};
  for (const k of ['title', 'content', 'excerpt']) {
    if (k in fields) allowed[k] = fields[k];
  }
  allowed.modified = new Date().toISOString();
  const { data, error } = await supabase
    .from('posts').update(allowed).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  return data;
}

// שמירת פוסט (יצירה או עריכה) בעורך המתקדם — דרך RPC admin_save_post (SECURITY DEFINER, מאומת-מנהל).
// יצירה: id=null → מחשב id/wp_id=max+1, date=modified=now (post_publish_law). עריכה: id קיים → modified=now.
// שדות מתקדמים: theme ('auto'|'light'|'dark' לפוסט) · keepModified (true=אל תקפיץ לראש «עדכונים אחרונים») ·
//   axisPin (undefined=אל תיגע · null=אוטו · 1=הצג בציר ההתגלות · 0=הסתר) · treePriority (מיקום ידני בציר, גבוה=למעלה).
// מחזיר { id, slug, wp_id, modified, date, theme, axis_pin, tree_priority }. זורק (not_admin / empty_title / not_found).
export async function adminSavePost({ id = null, title, slug = null, content = '', excerpt = '', categories = [], tags = [], author = null, image_url = null, source = 'ai', ai_touched = false, authors = null, theme = null, keepModified = false, axisPin, treePriority }) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.rpc('admin_save_post', {
    p_id: id, p_title: title, p_slug: slug, p_content: content, p_excerpt: excerpt,
    p_categories: categories || [], p_tags: tags || [], p_author: author,
    p_image_url: image_url, p_source: source, p_ai_touched: !!ai_touched,
    p_theme: theme || null, p_keep_modified: !!keepModified,
    p_axis_pin: axisPin === undefined || axisPin === null ? null : Number(axisPin),
    p_axis_pin_set: axisPin !== undefined,
    p_tree_priority: treePriority === undefined || treePriority === null ? null : Number(treePriority),
    p_tree_priority_set: treePriority !== undefined,
  });
  if (error) throw error;
  // עמודת «authors» (כמה כתבים) — נכתבת ישירות; ה-RPC לא מכיר אותה. מנהל בלבד (RLS posts_admin_write).
  if (data?.id && Array.isArray(authors)) {
    const clean = authors.map(a => String(a || '').trim()).filter(Boolean);
    try { await supabase.from('posts').update({ authors: clean.length ? clean : null }).eq('id', data.id); } catch { /* noop */ }
  }
  return data;
}

// «החזר למקום» — מאפס modified=date (הפוסט חוזר לסדר הכרונולוגי המקורי, לא נשאר ראשון ב«עדכונים אחרונים»).
// removeFromAxis=true → מוציא אותו גם מציר ההתגלות (axis_pin=0) באותה פעולה. מנהל בלבד.
export async function adminResetPostPosition(id, removeFromAxis = false) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.rpc('admin_reset_post_position', { p_id: id, p_remove_from_axis: !!removeFromAxis });
  if (error) throw error;
  return data;
}

// 🕘 היסטוריית גרסאות של פוסט — הצילומים שנשמרו בכל עריכה מהותית (post_revisions). מנהל בלבד (RLS).
// מחזיר [{ id, title, content, excerpt, categories, tags, image_url, theme, author, authors, note, created_at }] מהחדש לישן.
export async function getPostRevisions(postId, limit = 50) {
  if (!supabase || !postId) return [];
  const { data, error } = await supabase.from('post_revisions')
    .select('id,title,content,excerpt,categories,tags,image_url,theme,author,authors,note,created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

// שחזור גרסה — דורס את הפוסט בערכי הגרסה. הפיך: נשמר צילום «לפני שחזור» של המצב הנוכחי. מנהל בלבד.
export async function restorePostRevision(revisionId) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.rpc('admin_restore_post_revision', { p_revision_id: revisionId });
  if (error) throw error;
  return data;
}

// שמירת פוסט עם קוד-סוד (בלי התחברות) — Edge Function post-save (token). לעורך במצב ?key=.
export async function tokenSavePost(key, fields = {}) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.functions.invoke('post-save', { body: { token: key, ...fields } });
  if (error) throw new Error(error?.message || 'invoke');
  if (data?.error) throw new Error(data.error);
  return data;
}

// 🤖 עריכת תוכן פוסט ב-AI — Edge Function post-ai-edit. מנוע ברירת-מחדל 'gemini' (ה-AI שנקנה בטוקנים).
// מקבל תוכן HTML + הוראה, מחזיר HTML נקי (קלאסים קנוניים). null בכשל. engine: 'gemini' | 'claude'.
export async function getPostAiEdit({ content = '', instruction, title = '', engine = 'gemini' }) {
  if (!supabase) return { html: null, error: 'no_supabase' };
  try {
    const { data, error } = await supabase.functions.invoke('post-ai-edit', { body: { content, instruction, title, engine } });
    if (error) { try { console.warn('[post-ai-edit] invoke:', error?.message || error); } catch { /* noop */ } return { html: null, error: error?.message || 'invoke' }; }
    if (data?.error) { try { console.warn('[post-ai-edit] server:', data.error, data.detail || ''); } catch { /* noop */ } return { html: null, error: data.error, detail: data.detail }; }
    return { html: data?.html || null, engine: data?.engine, model: data?.model };
  } catch (e) { return { html: null, error: String(e?.message || e) }; }
}

// קטגוריות/תגיות קיימות — למלאי בעורך (למניעת כפילויות). מחזיר { categories:[], tags:[] } ממויין.
export async function getPostCategoriesTags() {
  if (!supabase) return { categories: [], tags: [] };
  const cats = new Set(), tgs = new Set();
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from('posts').select('categories,tags').range(from, from + 999);
    if (!data || !data.length) break;
    for (const r of data) { (r.categories || []).forEach(c => c && cats.add(c)); (r.tags || []).forEach(t => t && tgs.add(t)); }
    if (data.length < 1000) break;
  }
  const he = (a, b) => a.localeCompare(b, 'he');
  return { categories: [...cats].sort(he), tags: [...tgs].sort(he) };
}

// רשימת הטיוטות (פוסטים עם תגית «טיוטה») — לרשימת-הטיוטות בעורך. מנהל בלבד (RLS posts_admin_write לא חוסם קריאה; קריאה ציבורית מסוננת בפיד).
export async function getDraftPosts(limit = 40) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('posts')
    .select('id,slug,title,modified,image_url,thumb_url,categories,author')
    .contains('tags', ['טיוטה'])
    .order('modified', { ascending: false, nullsFirst: false }).limit(limit);
  if (error) return [];
  return data || [];
}

// רשימת הכותבים/תורמים — לבורר «קשר לכתב» בעורך. slug + שם + אם נעול.
export async function getContributorsList() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('contributors')
    .select('slug,display_name,locked')   // עמודות מאושרות לקריאה בלבד (active עלול להיות חסום)
    .order('display_name', { ascending: true });
  if (error) return [];
  return data || [];
}

// 🔗 גשר כותב↔חוקר — לפי התאמת-שם אחידה (contributors.display_name = posts.author).
// מחזיר { slug, code, vip, building, locked } או null. כולל חוקרים בבנייה/נעולים (מקשרים גם אליהם).
// Cache בזיכרון כדי לא לשאול פעמיים על אותו שם.
const _contribByName = new Map();
export async function getContributorByName(name) {
  const key = String(name || '').trim();
  if (!key || !supabase) return null;
  if (_contribByName.has(key)) return _contribByName.get(key);
  let result = null;
  try {
    const { data } = await supabase.from('contributors')
      .select('slug, code, display_name, vip, building, locked')
      .eq('display_name', key).eq('active', true).maybeSingle();
    result = data || null;
  } catch { result = null; }
  _contribByName.set(key, result);
  return result;
}
// כתובת דף-החוקר הקנונית (קוד-מספר עדיף על slug — בלי שמות-אנשים בכתובת)
export function contributorHref(c) {
  if (!c) return null;
  return `/community/researcher/${c.code || c.slug}`;
}

// 👥 כל הכתבים באתר — איחוד שלושה מקורות (כדי שלא יחסרו כתבים ישנים בבורר):
//   1) כתבים אמיתיים מהפוסטים (author + authors[]) — כולל «מזכה הרבים» והרבנים.
//   2) מרשם הכותבים (authors.js) — שמות עם תמונה/תפקיד.
//   3) טבלת contributors — תורמים רשומים.
// מחזיר מערך שמות ייחודי, ממויין עברית. (הבורר בעורך משתמש בזה במקום contributors בלבד.)
export async function getAllAuthors() {
  const names = new Set();
  if (supabase) {
    for (let from = 0; ; from += 1000) {
      const { data } = await supabase.from('posts').select('author,authors').range(from, from + 999);
      if (!data || !data.length) break;
      for (const r of data) {
        if (r.author && String(r.author).trim()) names.add(String(r.author).trim());
        (r.authors || []).forEach(a => { if (a && String(a).trim()) names.add(String(a).trim()); });
      }
      if (data.length < 1000) break;
    }
    try {
      const { data } = await supabase.from('contributors').select('display_name');
      (data || []).forEach(c => { if (c.display_name) names.add(String(c.display_name).trim()); });
    } catch { /* noop */ }
  }
  try { Object.keys(AUTHORS || {}).forEach(n => names.add(n)); } catch { /* noop */ }
  return [...names].filter(Boolean).sort((a, b) => a.localeCompare(b, 'he'));
}

// ── OCR גלריות (Edge Function gallery-ocr — Claude Vision) ──
export async function getOcrCounts() {
  if (!supabase) return { total: 0, done: 0, pending: 0, error: 0, other: 0 };
  const c = { total: 0, done: 0, pending: 0, error: 0, other: 0 };
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from('gallery_images').select('ocr_status').range(from, from + 999);
    if (!data || !data.length) break;
    for (const r of data) { c.total++; const k = r.ocr_status; if (k === 'done' || k === 'pending' || k === 'error') c[k]++; else c.other++; }
    if (data.length < 1000) break;
  }
  return c;
}
export async function runOcrBatch({ limit = 50, retry = false, runKey = '' } = {}) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.functions.invoke('gallery-ocr', {
    body: { limit, retry_errors: retry },
    ...(runKey ? { headers: { 'x-run-key': runKey } } : {}),
  });
  if (error) throw error;
  return data; // { picked, done, errors, sample }
}

// ===== כרטיסי נושא (topic_cards) — חיבורים/הצטלבויות שה-AI מכין והאדמין מאשר =====
export async function getTopicCards({ approvedOnly = false } = {}) {
  if (!supabase) return [];
  let q = supabase.from('topic_cards').select('*')
    .order('quality', { ascending: false }).order('created_at', { ascending: false });
  if (approvedOnly) q = q.eq('status', 'approved');
  const { data } = await q;
  return data || [];
}
// 🔡 צפנים — ממצאי «הצופן» (nodes type=convergence, חוצי-שפה/שיטה): 86=אלהים=הטבע, בן=son=sun…
// מוצגים ב«היכל הגילוי» לצד ההתכנסויות (topic_cards). עדשה על הגרף — לא טבלה חדשה.
export async function getCipherFindings(limit = 8) {
  if (!supabase) return [];
  const { data } = await supabase.from('nodes')
    .select('id,label,metadata,created_at')
    .eq('type', 'convergence').eq('is_active', true)
    .order('created_at', { ascending: false }).limit(40);
  return (data || [])
    .filter(n => n.metadata && (n.metadata.kind === 'cross-language' || n.metadata.lang))
    .slice(0, limit)
    .map(n => ({
      t: String(n.label || '').replace(/^\s*\d+\s*[—–-]\s*/, '').trim(),
      num: (n.metadata.numbers || [])[0] ?? null,
      slug: n.metadata.slug || null,
      by: n.metadata.discovered_by || null,
      created_at: n.created_at,
    }));
}
// אירועי ציר ההתגלות (nodes type=event) — לשימוש ב"מהארכיון" בדף הבית
export async function getAxisEvents(limit = 24) {
  if (!supabase) return [];
  const { data } = await supabase.from('nodes')
    .select('id,label,weight,hebrew_date,metadata')
    .eq('type', 'event').eq('is_active', true)
    .order('weight', { ascending: false }).limit(limit);
  return data || [];
}
export async function getTopicCardBySlug(slug) {
  if (!supabase || !slug) return null;
  const { data } = await supabase.from('topic_cards').select('*').eq('slug', slug).maybeSingle();
  return data || null;
}
// ישויות (זהב/חתימות) המחוברות לציר ההתכנסות בגרף — דרך edges related מה-node של הכרטיס
export async function getConvergenceEntities(nodeId) {
  if (!supabase || !nodeId) return [];
  // convergence_number_method_law: הערך+השיטה ספציפיים להתכנסות ויושבים על ה-edge (לא על הישות)
  const { data: eg } = await supabase.from('edges').select('to_node, metadata').eq('from_node', nodeId).eq('relation_type', 'related');
  const ids = [...new Set((eg || []).map(x => x.to_node))];
  if (!ids.length) return [];
  const edgeMeta = Object.fromEntries((eg || []).map(x => [x.to_node, x.metadata || {}]));
  const { data } = await supabase.from('nodes').select('id,label,description,metadata').eq('type', 'entity').in('id', ids);
  return (data || [])
    .map(n => ({ ...n, edgeValue: edgeMeta[n.id]?.value ?? null, edgeMethod: edgeMeta[n.id]?.method ?? null }))
    .sort((a, b) => (b.metadata?.tier === 'gold' ? 1 : 0) - (a.metadata?.tier === 'gold' ? 1 : 0));
}

// 🔠 צפנים (ELS) שמתלכדים על מספרי ההתכנסות/המספר — דרך הדילוג או המספר-הדומיננטי.
// els_research_layer_law: צופן = ראיית-ELS. round-trip: צופן בדילוג N מופיע לבד בהתכנסות/מספר N.
export async function getElsForNumbers(numbers) {
  if (!supabase || !numbers?.length) return [];
  const nums = [...new Set(numbers.map(Number).filter(n => Number.isFinite(n) && n > 0))];
  if (!nums.length) return [];
  const list = nums.join(',');
  const { data } = await supabase.from('els_records')
    .select('slug,title,search_term,skip_distance,primary_number,anchor_numbers,torah_book,direction')
    .eq('visibility', 'public').eq('status', 'published')
    .or(`skip_distance.in.(${list}),primary_number.in.(${list}),anchor_numbers.ov.{${list}}`)
    .limit(12);
  return data || [];
}

// ===== אצירת תמונות — דירוג (importance) + הסתרה (curator_hidden). מיון: חזק קודם, ואז תאריך =====
export async function searchGalleryForCuration(term = '', { limit = 60 } = {}) {
  if (!supabase) return [];
  let q = supabase.from('gallery_images')
    .select('id,image_url,name,ocr_numbers,occurred_at,importance,curator_hidden,source')
    .not('image_url', 'is', null);
  const t = (term || '').trim();
  if (t) {
    // מספר → אותו סט בדיוק שמוצג בתצוגות (primary_value / all_values), כדי שמה
    // שתאצור פה ישפיע ישירות על כל הגלריות של אותו מספר.
    if (/^\d+$/.test(t)) { const num = parseInt(t, 10); q = q.or(`primary_value.eq.${num},all_values.cs.{${num}}`); }
    else q = q.or(`ocr_text.ilike.%${t}%,name.ilike.%${t}%`);
  }
  q = q.order('importance', { ascending: false })
       .order('occurred_at', { ascending: false, nullsFirst: false })
       .limit(limit);
  const { data } = await q;
  return data || [];
}
// חיפוש OCR בצד-שרת — מחזיר ids תואמים (במקום לטעון את כל ה-ocr_text מראש)
export async function searchArchiveOcrIds(q, { limit = 800 } = {}) {
  if (!supabase || !q || q.trim().length < 2) return [];
  const t = q.trim();
  const { data } = await supabase.from('gallery_images')
    .select('id,gallery_id')
    .or(`ocr_text.ilike.%${t}%,name.ilike.%${t}%,description.ilike.%${t}%`)
    .limit(limit);
  return data || [];
}
export async function setImageCuration(id, patch) {
  if (!supabase) throw new Error('no supabase');
  // 🌊 «הוסף לזרם» (source=update) → חותמת stream_at=עכשיו כך שהתמונה קופצת לראש הזרם (גם ישנה).
  const p = patch.source === 'update' ? { ...patch, stream_at: new Date().toISOString() } : patch;
  const { data, error } = await supabase.from('gallery_images')
    .update(p).eq('id', id).select('id,importance,curator_hidden,source,stream_at,treasure').maybeSingle();
  if (error) throw error;
  invalidateGalleriesOverview();
  return data;
}

// 🖼️ העלאת/החלפת קובץ-תמונה פיזי ל-bucket 'gallery' → מחזיר URL ציבורי (מנהל בלבד, RLS).
export async function uploadGalleryImage(file) {
  if (!supabase) throw new Error('no supabase');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `sod1820/replaced/${Date.now()}-${Math.round(Math.random() * 1e5)}.${ext}`;
  const { error } = await supabase.storage.from('gallery').upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('gallery').getPublicUrl(path).data.publicUrl;
}
// 🌊 הזזת רמז בזרם (אדמין): מחליפים את חותמות-הזמן האפקטיביות של שני רמזים שכנים —
// הסדר בזרם נקבע לפי stream_at (עם נפילה ל-created_at), אז החלפה = החלפת מיקום.
// dir: 'up' | 'down' — אם החותמות שוות, מזיזים שנייה אחת כדי שההחלפה תיתפס.
export async function swapStreamOrder(a, b, dir = 'up') {
  if (!supabase) throw new Error('no supabase');
  const eff = h => h.stream_at || h.created_at || new Date().toISOString();
  let ta = eff(a), tb = eff(b);
  if (ta === tb) ta = new Date(new Date(tb).getTime() + (dir === 'up' ? -1000 : 1000)).toISOString();
  const { error: e1 } = await supabase.from('gallery_images').update({ stream_at: tb }).eq('id', a.id);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from('gallery_images').update({ stream_at: ta }).eq('id', b.id);
  if (e2) throw e2;
  invalidateGalleriesOverview();
  return { [a.id]: tb, [b.id]: ta };   // id → stream_at החדש (לעדכון מצב מקומי)
}

// הסתרה/הצגה מרובה (אדמין) — עדכון curator_hidden לרשימת מזהים בבת אחת
export async function bulkSetCuratorHidden(ids, hidden) {
  if (!supabase || !ids?.length) return [];
  const { data, error } = await supabase.from('gallery_images')
    .update({ curator_hidden: !!hidden }).in('id', ids).select('id');
  if (error) throw error;
  invalidateGalleriesOverview();
  return data || [];
}
// השורה המלאה של תמונה לפי id — "עץ אחד": העורך מושך את כל השדות (תגיות/מספרים/הגדרות)
// גם אם נפתח ממקור שמביא רק חלק מהשדות (קרוסלה/עדכונים/חיפוש).
export async function getGalleryImageFull(id) {
  if (!supabase || !id) return null;
  try {
    const { data } = await supabase.from('gallery_images')
      .select('id,image_url,thumb_url,name,description,primary_value,all_values,occurred_at,created_at,importance,image_type,source,curator_hidden,tags,ocr_status,ocr_numbers,treasure')
      .eq('id', id).maybeSingle();
    return data || null;
  } catch { return null; }
}
export async function setTopicCardStatus(id, status) {  if (!supabase) throw new Error('no supabase');
  const patch = { status };
  if (status === 'approved') patch.approved_at = new Date().toISOString();
  const { data, error } = await supabase.from('topic_cards')
    .update(patch).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data;
}
export async function updateTopicCard(id, patch) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.from('topic_cards')
    .update(patch).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data;
}
// מיזוג טופיקים: מאחד image_ids/numbers/highlight/bullets לתוך כרטיס-היעד, ומסמן את האחרים status='merged'
export async function mergeTopicCards(keepId, mergeIds = []) {
  if (!supabase || !keepId || !mergeIds.length) throw new Error('bad args');
  const ids = [keepId, ...mergeIds];
  const { data: cards } = await supabase.from('topic_cards').select('*').in('id', ids);
  const keep = (cards || []).find(c => c.id === keepId);
  const others = (cards || []).filter(c => c.id !== keepId);
  if (!keep) throw new Error('keep not found');
  const uniq = arr => [...new Set(arr.filter(x => x != null))];
  const merged = {
    image_ids: uniq([...(keep.image_ids || []), ...others.flatMap(c => c.image_ids || [])]),
    numbers: uniq([...(keep.numbers || []), ...others.flatMap(c => c.numbers || [])]),
    highlight_numbers: uniq([...(keep.highlight_numbers || []), ...others.flatMap(c => c.highlight_numbers || [])]),
    search_terms: uniq([...(keep.search_terms || []), ...others.flatMap(c => c.search_terms || [])]),
    findings: { ...(keep.findings || {}),
      bullets: [...((keep.findings || {}).bullets || []), ...others.flatMap(c => (c.findings || {}).bullets || [])] },
  };
  const { error: e1 } = await supabase.from('topic_cards').update(merged).eq('id', keepId);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from('topic_cards').update({ status: 'merged' }).in('id', mergeIds);
  if (e2) throw e2;
  return merged;
}
export async function getGalleryImagesByIds(ids = []) {
  if (!supabase || !ids.length) return [];
  const { data } = await supabase.from('gallery_images')
    .select('id,image_url,name,description,ocr_numbers,occurred_at,gallery_id,primary_value,all_values').in('id', ids);
  return data || [];
}
// 🕸️ עץ-קשרים ממוקד-מספר: ההתכנסויות שהמספר שייך אליהן (כל אחת מכילה את
// המספרים האחרים שמתכנסים יחד). זה הגרף האמיתי — חוט בין מספר↔התכנסות↔מספר.
export async function getNumberGraph(value) {
  const n = Number(value);
  if (!supabase || !Number.isFinite(n)) return { value: n, convergences: [] };
  const { data } = await supabase.from('nodes')
    .select('id,label,description,metadata')
    .eq('type', 'convergence').eq('is_active', true)
    .contains('metadata', { numbers: [n] });
  return { value: n, convergences: data || [] };
}
// מנוע "צידה": לכל תמונה — אילו מספרים שלה חוזרים במקומות אחרים ובאילו סטים
export async function getImageConnections(imageId) {
  if (!supabase || !imageId) return null;
  const { data, error } = await supabase.rpc('image_connections', { p_image_id: imageId });
  if (error) throw error;
  return data; // { image_id, image_url, numbers, connections:[{number, images, sets}] }
}
export async function findGalleryImages(term, limit = 10) {
  if (!supabase || !term) return [];
  const { data } = await supabase.from('gallery_images')
    .select('id,image_url,name,ocr_numbers')
    .or(`image_url.ilike.%${term}%,ocr_text.ilike.%${term}%`)
    .not('image_url', 'is', null).limit(limit);
  return data || [];
}

// ===== כפתור «הוסף לזרם» — מכל הגלריות ל-source='update' =====
export async function getGalleriesForStreamPicker({ limit = 300, search = "" } = {}) {
  if (!supabase) return [];
  let q = supabase.from('gallery_images')
    .select('id,image_url,name,primary_value,all_values,occurred_at,source,gallery_id')
    .not('image_url', 'is', null)
    .not('source', 'eq', 'update')
    .not('curator_hidden', 'is', true);
  if (search.trim()) {
    const t = search.trim();
    if (/^\d+$/.test(t)) { const n = parseInt(t, 10); q = q.or(`primary_value.eq.${n},all_values.cs.{${n}}`); }
    else q = q.or(`name.ilike.%${t}%,ocr_text.ilike.%${t}%`);
  }
  const { data } = await q
    .order('occurred_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// ===== ניהול תמונות — עריכה ומחיקה =====

// בדיקת חיבורים לפני מחיקת תמונה — מחזיר רשימת מקומות שהתמונה מופיעה בהם.
export async function checkImageConnections(imageId, imageUrl) {
  if (!supabase) return [];
  const refs = [];
  try {
    const { data: topics } = await supabase
      .from('topic_cards')
      .select('id,title')
      .contains('image_ids', [imageId])
      .limit(10);
    if (topics?.length) refs.push(...topics.map(t => ({ type: 'topic', label: t.title || 'התכנסות ללא שם' })));
  } catch {}
  try {
    if (imageUrl) {
      const { data: posts } = await supabase
        .from('posts')
        .select('wp_id,title,slug')
        .eq('image_url', imageUrl)
        .limit(10);
      if (posts?.length) refs.push(...posts.map(p => ({ type: 'post', label: p.title || p.slug || 'פוסט' })));
    }
  } catch {}
  try {
    const { data: ins } = await supabase
      .from('insights')
      .select('id,title')
      .eq('source_ref', String(imageId))
      .limit(10);
    if (ins?.length) refs.push(...ins.map(i => ({ type: 'insight', label: i.title || 'חידוש' })));
  } catch {}
  return refs;
}

// מחיקת תמונה מ-gallery_images (מחיקה מוחלטת — מנהל בלבד).
export async function deleteGalleryImage(id) {
  if (!supabase) throw new Error('no supabase');
  const { error } = await supabase.from('gallery_images').delete().eq('id', id);
  if (error) throw error;
  invalidateGalleriesOverview();
}

export async function addImageToRealityStream(id, occurredAt = null) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.from('gallery_images')
    .update({ source: 'update', occurred_at: occurredAt ?? new Date().toISOString() })
    .eq('id', id)
    .select('id').single();
  if (error) throw error;
  return data;
}

// גלריה ציבורית — כל התמונות עם פילטר סוג + חיפוש + פגינציה
// hidden: 'no' = רק גלויות (ברירת מחדל) · 'only' = רק מוסתרות (אדמין) · 'all' = הכל (אדמין)
export async function getGalleryPage({ type = null, page = 0, limit = 60, search = "", hidden = "no" } = {}) {
  if (!supabase) return { data: [], count: 0 };
  let q = supabase.from('gallery_images')
    .select('id,name,description,image_url,thumb_url,primary_value,all_values,occurred_at,image_type,source,importance,curator_hidden', { count: 'exact' })
    .not('image_url', 'is', null);
  if (hidden === 'only') q = q.eq('curator_hidden', true);
  else if (hidden !== 'all') q = q.not('curator_hidden', 'is', true);
  if (type) q = q.eq('image_type', type);
  if (search.trim()) {
    const t = search.trim();
    if (/^\d+$/.test(t)) { const n = parseInt(t, 10); q = q.or(`primary_value.eq.${n},all_values.cs.{${n}}`); }
    else q = q.or(`name.ilike.%${t}%,description.ilike.%${t}%`);
  }
  const { data, count, error } = await q
    .order('occurred_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);
  if (error) return { data: [], count: 0 };
  return { data: data || [], count: count || 0 };
}
export async function createTopicCardDraft(card) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.from('topic_cards')
    .insert({ ...card, status: 'draft', created_by: 'admin-hunt' }).select().maybeSingle();
  if (error) throw error;
  return data;
}

// ===== קיר הגימטריה החי (ניסוי ויראלי) — gematria_wall =====
// כל מילה/שם שגולש מחשב נרשם כאן דרך RPC מאובטח (sanitize + dedup + מונה).
export async function addWallWord(phrase, ragil) {
  if (!supabase || !phrase || !ragil) return;
  try { await supabase.rpc('add_wall_word', { p_phrase: String(phrase).trim(), p_ragil: ragil }); }
  catch { /* שקט — לוג בלבד, לא לשבור את החישוב */ }
}
// שמירה פרטית (אדמין): נשמרת עם private=true — לעולם לא מוצגת בקיר הציבורי.
export async function saveWallWordPrivate(phrase, ragil) {
  if (!supabase || !phrase || !ragil) return;
  try { await supabase.rpc('save_wall_word_private', { p_phrase: String(phrase).trim(), p_ragil: ragil }); }
  catch { /* שקט */ }
}
// הקיר הפרטי של האדמין — רק המילים שסומנו private.
export async function getWallPrivate(limit = 60) {
  if (!supabase) return [];
  const { data } = await supabase.from('gematria_wall')
    .select('phrase,ragil,hits,last_at').eq('private', true)
    .order('last_at', { ascending: false }).limit(limit);
  return data || [];
}
// 🛟 שכבת "מציל" — מילה שנכשלה במבחן הכתיב המבני אבל קיימת במאגר gematria_words
// מסומנת recognized=true כדי שתוצג במלואה. לעולם רק מוסיף (מציל מילה אמיתית נדירה),
// אף פעם לא חוסם מילה תקינה — מילים איכותיות שלא במאגר ממשיכות להופיע כרגיל.
async function rescueFromCorpus(rows) {
  if (!rows.length) return rows;
  const suspect = [...new Set(rows.filter(r => !isReadable(r.phrase)).map(r => r.phrase))];
  if (!suspect.length) return rows;
  const { data } = await supabase.from('gematria_words').select('phrase').in('phrase', suspect);
  const known = new Set((data || []).map(d => d.phrase));
  return known.size ? rows.map(r => known.has(r.phrase) ? { ...r, recognized: true } : r) : rows;
}
export async function getWallRecent(limit = 60) {
  if (!supabase) return [];
  const { data } = await supabase.from('gematria_wall')
    .select('phrase,ragil,hits,last_at').eq('private', false).order('last_at', { ascending: false }).limit(limit);
  return rescueFromCorpus(data || []);
}
export async function getWallPopular(limit = 60) {
  if (!supabase) return [];
  const { data } = await supabase.from('gematria_wall')
    .select('phrase,ragil,hits').eq('private', false).order('hits', { ascending: false }).limit(limit);
  return rescueFromCorpus(data || []);
}
export async function getWallCount() {
  if (!supabase) return 0;
  const { count } = await supabase.from('gematria_wall').select('*', { count: 'exact', head: true }).eq('private', false);
  return count || 0;
}

export function adaptPost(row) {
  return {
    id: row.wp_id,
    title: { rendered: row.title },
    excerpt: { rendered: row.excerpt ?? '' },
    date: row.date,
    modified: row.modified ?? row.date,
    link: row.link,
    slug: row.slug,
    author: row.author ?? '',
    source: row.source ?? null,
    categories: row.categories ?? [],   // top-level — כדי שכרטיסי-פוסט יזהו «וידאו» בלי לחפור ב-_embedded
    tags: row.tags ?? [],
    _embedded: {
      'wp:featuredmedia': row.image_url ? [{ source_url: row.image_url }] : [],
      'wp:term': [
        (row.categories ?? []).map(name => ({ taxonomy: 'category', id: name, name })),
        (row.tags ?? []).map(name => ({ taxonomy: 'post_tag', id: name, name })),
      ],
    },
  };
}

// ===== פס פעילות חי (LiveActivityBar) — עדכונים אמיתיים בלבד =====
// ניקוי כותרת (תגיות HTML + ישויות נפוצות) לתצוגה בפס.
function cleanTitle(s) {
  return String(s || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&#8211;/g, '–').replace(/&#8217;/g, '’').replace(/&#8220;|&#8221;/g, '"')
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .trim();
}

const SEARCH_TERM_OK = /^[ 0-9א-ת׳״'"\-]{1,40}$/;
// תיעוד חיפוש אמיתי (מהמחשבון / דף הביטוי). ללא PII; נכשל בשקט. דדופ לכל גלישה.
export async function logSearch(term, value) {
  if (isAnon()) return;   // 🕶️ מצב אנונימי — לא נשמר בהיסטוריית החיפושים
  const t = (term || '').trim();
  if (!SEARCH_TERM_OK.test(t)) return;
  try {
    const key = 'sl:' + t;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch { /* ignore */ }
  try { await supabase.from('search_log').insert({ term: t, value: Number.isFinite(value) ? value : null }); } catch { /* ignore */ }
  // 🌳 עץ אישי: חיפוש של משתמש מחובר → research_items (bucket 'searched'). מכבד מצב-אנונימי (יצא למעלה).
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (uid) {
      const type = /^\d+$/.test(t) ? 'number' : 'phrase';
      const link = `/number/${encodeURIComponent(t)}`;
      const ent = { id: `${type}:${t}`, type, title: t, ref: t, link, metadata: {}, addedAt: Date.now() };
      await supabase.from('research_items').upsert(
        { user_id: uid, bucket: 'searched', entity_type: type, entity_ref: t, title: t, link, metadata: ent, created_at: new Date().toISOString() },
        { onConflict: 'user_id,bucket,entity_type,entity_ref' }
      );
    }
  } catch { /* ignore */ }
  // היסטוריה אישית (פר-משתמש) — לתצוגת "חיפושים אחרונים" בפרופיל. RLS דואג לבעלות.
  try { logActivity('gematria', t, Number.isFinite(value) ? String(value) : null); } catch { /* ignore */ }
}

// 🕒 היסטוריית פעילות אישית (פר-משתמש, RLS) — חיפושים אחרונים / פוסטים שנגלשו.
// kinds: מערך סוגים (למשל ['gematria'] או ['post']). מחזיר רשומות אחרונות, דדופ לפי ref.
export async function getUserActivity(kinds = [], limit = 8) {
  if (!supabase || !kinds.length) return [];
  try {
    const { data } = await supabase.from('user_activity')
      .select('kind, ref, title, created_at')
      .in('kind', kinds)
      .order('created_at', { ascending: false })
      .limit(120);
    const seen = new Set(); const out = [];
    for (const r of (data || [])) {
      const k = (r.ref || '') + '|' + r.kind;
      if (!r.ref || seen.has(k)) continue;
      seen.add(k); out.push(r);
      if (out.length >= limit) break;
    }
    return out;
  } catch { return []; }
}

// 🔬 המחקר של המשתמש המחובר — research_items (owner-only דרך RLS ri_select_own).
//    המקור הקנוני לזיכרון-המחקר (ביטויים/מספרים/פסוקים שחקר/שמר/נעץ). לתיק-המחקר ולפרופיל.
//    dedup לפי entity_ref, אחרונים קודם. מחזיר [] לאורח/לא-בעלים (RLS חוסם).
export async function getMyResearch({ limit = 40, types = null } = {}) {
  if (!supabase) return [];
  try {
    let q = supabase.from('research_items')
      .select('entity_type, entity_ref, title, bucket, link, created_at')
      .order('created_at', { ascending: false }).limit(300);
    if (Array.isArray(types) && types.length) q = q.in('entity_type', types);
    const { data } = await q;
    const seen = new Set(); const out = [];
    for (const r of (data || [])) {
      if (!r.entity_ref || seen.has(r.entity_ref)) continue;
      seen.add(r.entity_ref); out.push(r);
      if (out.length >= limit) break;
    }
    return out;
  } catch { return []; }
}

// 🚪 שער היום — נבחר דטרמיניסטית לפי היום בשנה מתוך חידושי ההצלבות המככבים (כולם רואים אותו שער).
export function dayOfYear() {
  const now = new Date();
  return Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) / 86400000);
}

// 🕒 פיד חיפושים מאוחד — מקור אחד (search_log) עם דרגות לפי משתמש.
// אנונימי: 3 · רשום: 3 ימים · מנוי: 30 יום · אדמין: הכל.
const SEARCH_TIERS = {
  anon:  { days: 2,    limit: 3 },
  user:  { days: 3,    limit: 50 },
  sub:   { days: 30,   limit: 200 },
  admin: { days: 3650, limit: 600 },
};
export async function getSearchFeed(tier = 'anon') {
  try {
    const t = SEARCH_TIERS[tier] || SEARCH_TIERS.anon;
    let q = supabase.from('search_log').select('term,value,created_at').order('created_at', { ascending: false });
    if (t.days) q = q.gte('created_at', new Date(Date.now() - t.days * 86400000).toISOString());
    const { data } = await q.limit(Math.min(800, t.limit * 4));
    const seen = new Set(); const out = [];
    for (const r of (data || [])) {
      const term = (r.term || '').trim();
      if (!term || seen.has(term)) continue;
      seen.add(term); out.push({ term, value: r.value, at: r.created_at });
      if (out.length >= t.limit) break;
    }
    return out;
  } catch { return []; }
}

// ➕ אדמין: הוספת מילה מהחיפושים למאגר הראשי (ערכים מהמנוע המאומת).
export async function adminAddWord(phrase, vals) {
  try {
    const { data, error } = await supabase.rpc('admin_add_word', { p_phrase: phrase, p_vals: vals });
    if (error) return 'error';
    return data || 'error';
  } catch { return 'error'; }
}

// 🕒 חיפושים אחרונים — מה *כל* הגולשים חוקרים עכשיו (terms ייחודיים אחרונים).
export async function getRecentSearches(limit = 6) {
  try {
    const { data } = await supabase.from('search_log')
      .select('term,value,created_at')
      .order('created_at', { ascending: false }).limit(60);
    const seen = new Set(); const out = [];
    for (const r of (data || [])) {
      const t = (r.term || '').trim();
      if (!t || seen.has(t)) continue;
      seen.add(t); out.push({ term: t, value: r.value, at: r.created_at });
      if (out.length >= limit) break;
    }
    return out;
  } catch { return []; }
}

// 🔢 מונה חיפושים — כמה חיפושי גימטריה נרשמו ב-N השעות האחרונות (למגירת המספר / בית המדרש).
export async function getRecentSearchCount(hours = 24) {
  if (!supabase) return 0;
  try {
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const { count } = await supabase.from('search_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since);
    return count || 0;
  } catch { return 0; }
}

// ✦ חידושי הצלבות — מהמנוע (origin=ai), החדשים ראשונים. למהבהב "כמה נוספו" ולקופסת הבית.
export async function getRecentCrosses(limit = 12) {
  try {
    const { data } = await supabase.from('insights')
      .select('id,title,body,related_numbers,method_tags,convergence_score,panel_data,gematria_pairs,verified,created_at')
      .eq('category', 'הצלבות').eq('is_active', true)
      .order('created_at', { ascending: false }).limit(limit);
    return data || [];
  } catch { return []; }
}

// 🧪 מעבדת צוריאל — שכבת חקירה (insights space='lab'): חידושים חזקים/מבניים שטרם עברו שרשרת הוכחה מלאה.
export async function getLabInsights(limit = 80) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from('insights')
      .select('id,title,body,category,related_numbers,related_phrases,evidence_level,origin,tags,created_at')
      .eq('space', 'lab').eq('is_active', true)
      .order('created_at', { ascending: false }).limit(limit);
    return data || [];
  } catch { return []; }
}

// 🧬 כל המילים-השוות ברגיל לערך (לכפתור «פתח עוד» — הרשימה המלאה). ממוין לפי חוזק
// (lead_rank › מאומת › visibility_tier › recency) — אותו סדר כמו story-top, ונושא שדות-חוזק
// לכלי הסידור. עד 500. כל פריט: {phrase, is_verified, visibility_tier, lead_rank}.
export async function getAllValuePhrases(value, limit = 500) {
  if (!supabase || !value) return [];
  try {
    const { data } = await supabase.from("gematria_words")
      .select("phrase,is_verified,visibility_tier,lead_rank,tags")
      .eq("ragil", Number(value))
      .eq("is_verified", true).eq("is_published", true)   // ✅ verified-only public projection (verified_only_public_gematria_law)
      // סדר קנוני זהה לדף המספר (getEntityBundle) — lead_rank › מאומת › visibility_tier › recency.
      // כך המחשבון המקצועי וכל צרכן אחר מסונכרנים 1:1 עם מה שצוריאל מסדר בדף המספר.
      .order("lead_rank", { ascending: true, nullsFirst: false })
      .order("is_verified", { ascending: false })
      .order("visibility_tier", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    // ייחוד לפי ביטוי (יכולות להיות כפילויות ב-gematria_words)
    const seen = new Set(), out = [];
    for (const r of (data || [])) { if (r.phrase && !seen.has(r.phrase)) { seen.add(r.phrase); out.push(r); } }
    return out;
  } catch { return []; }
}

// ⚖️ מצב-ממשל קנוני של השיטות (v_method_states) — מקור-אמת יחיד, לקריאה בלבד, במטמון.
// BLOCKER-EG-1 / HG-E4: הפרויקציה הציבורית חייבת לרשת את אותו חוק שמגדר את הכתיבות העתידיות.
// ⛔ לא רשימה קשיחה, לא רישום שני, לא allowlist ב-UI — רק קריאה מהרישום הקנוני.
let _methodStatesCache = null, _methodStatesAt = 0;
export async function getMethodStates() {
  if (_methodStatesCache && Date.now() - _methodStatesAt < 5 * 60 * 1000) return _methodStatesCache;
  if (!supabase) return {};
  try {
    const { data } = await supabase.from('v_method_states')
      .select('method_key,category,active,scannable,executable,engine_verified');
    const map = {};
    (data || []).forEach(r => {
      map[r.method_key] = {
        category: r.category, active: r.active, scannable: r.scannable,
        executable: r.executable, engineVerified: r.engine_verified,
        // «מושל» = בדיוק אותו חוזה שמגדר כתיבה: scannable ∧ active ∧ executable ∧ engine_verified
        governed: !!r.scannable,
      };
    });
    _methodStatesCache = map; _methodStatesAt = Date.now();
    return map;
  } catch { return _methodStatesCache || {}; }
}
// שיטה שאינה מוכרת לרישום נחשבת לא-מושלת (fail-closed לצורך *דירוג*, לא לצורך *הסתרה*).
export function isGovernedMethod(states, method) { return !!(states && states[method] && states[method].governed); }

// 🧬 משפחות המילים — לכל ערך, הביטויים השווים לו בכל שיטה (מ-bidim, דרך fn_number_lookup) + העולם של כל ביטוי (מ-nodes).
// המקום היחיד למילים שוות בדף המספר (כולל רגיל). כל פריט: {phrase, world}.
// 🧩 Number Page Integration v1: המקור עבר מ-select ישיר על bidim ל-fn_number_lookup (אותו מקור-נתונים,
// אך מורחב — atomic_or_composite/component_methods/component_values) כדי שקבוצות-Composite (רגיל+מילוי וכו')
// יסומנו ויוסברו במפורש, לא רק יופיעו כמפתח-שיטה גולמי. אין שינוי-חישוב — כל ערך כבר-מחושב במנוע.
export async function getValueFamilies(value, perMethod = 20) {
  if (!supabase || !value || value < 1) return [];
  try {
    const data = await getNumberLookup(value);
    if (!data || !data.length) return [];
    // סדר-תצוגה בלבד (לא ערך-מחושב) — אותה מיפוי-עדיפות המשמש ב-bidim_sync להצגה קודם של השיטות הליבתיות.
    const DISPLAY_PRIORITY = { "רגיל": 1, "מסתתר": 1, "קדמי": 1, "מילוי": 2, "אתבש": 3 };
    // קבוצות לפי שיטה — סופרים הכל אבל שומרים רק את ה-top שמוצג (perMethod).
    const groups = {};
    for (const r of data) {
      const g = (groups[r.method] ||= {
        method: r.method, priority: DISPLAY_PRIORITY[r.method] ?? 4, all: new Set(), top: [],
        composite: r.atomic_or_composite === 'composite',
        componentMethods: r.component_methods || null, operator: r.operator || null,
        // ⚖️ מצב-ממשל מהרישום הקנוני (HG-E4) — התוצאה עדיין מוצגת, אך אינה זהה-סמנטית לתוצאה מושלת.
        governed: r.method_governed !== false,
        evidenceClass: r.method_evidence_class || null,
        methodActive: r.method_active, methodScannable: r.method_scannable,
        methodExecutable: r.method_executable, methodEngineVerified: r.method_engine_verified,
      });
      if (!g.all.has(r.phrase)) {
        g.all.add(r.phrase);
        if (g.top.length < perMethod) g.top.push({ phrase: r.phrase, componentValues: r.component_values || null });
      }
    }
    // ⚡ מעשירים (עולם+ערך-רגיל) רק את הביטויים שמוצגים — לא את כל הרשימה — ובמקביל.
    const shown = [...new Set(Object.values(groups).flatMap(g => g.top.map(t => t.phrase)))];
    const worldMap = {}, ragilMap = {}, tagsMap = {};
    const chunks = [];
    for (let i = 0; i < shown.length; i += 300) chunks.push(shown.slice(i, i + 300));
    await Promise.all(chunks.map(async chunk => {
      const [{ data: ents }, { data: gw }] = await Promise.all([
        supabase.from('nodes').select('label,metadata').eq('type', 'entity').in('label', chunk).limit(1000),
        supabase.from('gematria_words').select('phrase,ragil,tags').in('phrase', chunk).limit(1000),
      ]);
      (ents || []).forEach(n => { const w = n.metadata?.world; if (w && !worldMap[n.label]) worldMap[n.label] = w; });
      (gw || []).forEach(r => {
        if (r.ragil != null && ragilMap[r.phrase] == null) ragilMap[r.phrase] = r.ragil;
        if (Array.isArray(r.tags) && !tagsMap[r.phrase]) tagsMap[r.phrase] = r.tags;   // 🎨 עדשת-כיוון
      });
    }));
    return Object.values(groups)
      .map(g => ({ method: g.method, priority: g.priority, count: g.all.size,
        composite: g.composite, componentMethods: g.componentMethods, operator: g.operator,
        governed: g.governed, evidenceClass: g.evidenceClass, methodActive: g.methodActive,
        methodScannable: g.methodScannable, methodExecutable: g.methodExecutable,
        methodEngineVerified: g.methodEngineVerified,
        phrases: g.top.map(t => ({ phrase: t.phrase, world: worldMap[t.phrase] || null, ragil: ragilMap[t.phrase] ?? null,
          tags: tagsMap[t.phrase] || null, componentValues: t.componentValues })) }))
      // Rank, Don't Hide (HG-E4): קבוצות מושלות קודם, ההיסטוריות אחריהן — אך כולן מוצגות.
      .sort((a, b) => (a.method === "רגיל" ? -1 : b.method === "רגיל" ? 1 : 0)
        || (Number(b.governed) - Number(a.governed)) || (a.priority - b.priority) || (b.count - a.count));
  } catch { return []; }
}

// 🔢 תהודת האפס (zero_scale_law) — אותו שורש בסדר גודל אחר. סקאלות אחיות לערך.
export function zeroScales(n) {
  n = Number(n);
  const out = [];
  if (!n || n < 1) return out;
  if (n % 100 === 0 && n / 100 >= 10) out.push({ v: n / 100, label: "÷100" });
  if (n % 10 === 0 && n / 10 >= 10) out.push({ v: n / 10, label: "÷10" });
  out.push({ v: n * 10, label: "×10" });
  if (n * 100 <= 1000000) out.push({ v: n * 100, label: "×100" });
  return out;
}

// 🔢 תהודת האפס — הערך מהדהד בכל שכבות הגרף בסדרי גודל שונים (לא רק התאמת-ערך — משפחת-ערך).
// לכל סקאלה אחות מחזיר: מילים (רגיל) · גלריות · התכנסויות. מסנן סקאלות ריקות.
export async function getZeroResonance(value) {
  if (!supabase) return [];
  const scales = zeroScales(value);
  if (!scales.length) return [];
  const vals = scales.map(s => s.v);
  // מילים (רגיל) בכל הסקאלות — שאילתה אחת
  const wordsBy = {};
  try {
    const { data } = await supabase.from('bidim').select('value,phrase').eq('method', 'רגיל').in('value', vals).limit(5000);
    (data || []).forEach(r => {
      const g = (wordsBy[r.value] ||= { count: 0, seen: new Set(), sample: [] });
      if (!g.seen.has(r.phrase)) { g.seen.add(r.phrase); g.count++; if (g.sample.length < 8) g.sample.push(r.phrase); }
    });
  } catch { /* ignore */ }
  // התכנסויות מאושרות שמכילות אחת הסקאלות — שאילתה אחת
  const topicsBy = {};
  try {
    const { data } = await supabase.from('topic_cards').select('slug,title,numbers').eq('status', 'approved').overlaps('numbers', vals).limit(200);
    (data || []).forEach(t => (t.numbers || []).forEach(n => { if (vals.includes(n)) (topicsBy[n] ||= []).push({ slug: t.slug, title: t.title }); }));
  } catch { /* ignore */ }
  // גלריות — לכל סקאלה (תמונות שהערך מופיע בהן)
  const imgs = await Promise.all(scales.map(s => getImagesByValue(s.v).then(x => x || []).catch(() => [])));
  return scales.map((s, i) => ({
    v: s.v, label: s.label,
    words: { count: wordsBy[s.v]?.count || 0, sample: wordsBy[s.v]?.sample || [] },
    images: imgs[i],
    topics: topicsBy[s.v] || [],
  })).filter(r => r.words.count || r.images.length || r.topics.length);
}


// מחזיר [{value, size}] ממוין יורד לפי גודל המשפחה (כמה ביטויים שווים לאותו ערך).
export async function getPhraseValueFamilies(phrase) {
  if (!supabase || !phrase) return [];
  const { data: mine } = await supabase.from('bidim').select('value').eq('phrase', phrase);
  const vals = [...new Set((mine || []).map(r => r.value).filter(v => v >= 10))];
  if (!vals.length) return [];
  // ⚖️ HG-E4: גודל-המשפחה מדווח גם כ«מושל» וגם כ«כולל היסטורי» — לא מסתירים שורות היסטוריות,
  // אבל גם לא מציגים גודל מנופח כאילו כולו עדות מושלת.
  const [{ data: fam }, states] = await Promise.all([
    supabase.from('bidim').select('value,phrase,method').in('value', vals).limit(8000),
    getMethodStates(),
  ]);
  const byVal = {}, byValGov = {};
  (fam || []).forEach(r => {
    (byVal[r.value] ||= new Set()).add(r.phrase);
    if (isGovernedMethod(states, r.method)) (byValGov[r.value] ||= new Set()).add(r.phrase);
  });
  return vals.map(v => ({
    value: v,
    size: byVal[v] ? byVal[v].size : 0,
    governedSize: byValGov[v] ? byValGov[v].size : 0,
  })).sort((a, b) => b.governedSize - a.governedSize || b.size - a.size);
}
// 🌳 מסע ההתכנסות — רשימת הביטויים ששווים לערך (משפחת-הערך = "בתוך המספר"). + world מ-nodes כשקיים.
export async function getValuePhraseList(value, limit = 120) {
  if (!supabase || !value) return [];
  // ⚖️ BLOCKER-EG-1 / HG-E4: עבר מ-select גולמי על bidim (בלי שום סינון-שיטה ובלי אות-ממשל)
  // ל-fn_value_phrase_list — הפרויקציה הקנונית. אף ביטוי לא נעלם; כל ביטוי נושא את מצב-הממשל שלו.
  const { data } = await supabase.rpc('fn_value_phrase_list', { p_value: value, p_limit: limit * 2 });
  const rows = (data || []).slice(0, limit);
  const govBy = {}, classBy = {}, histBy = {};
  rows.forEach(r => {
    govBy[r.phrase] = r.governed !== false;
    classBy[r.phrase] = r.best_evidence_class || null;
    histBy[r.phrase] = r.historical_methods || null;
  });
  const phrases = [...new Set(rows.map(r => r.phrase).filter(Boolean))];
  if (!phrases.length) return [];
  const worldMap = {};
  for (let i = 0; i < phrases.length; i += 300) {
    const chunk = phrases.slice(i, i + 300);
    const { data: ents } = await supabase.from('nodes').select('label,metadata').eq('type', 'entity').in('label', chunk).limit(1000);
    (ents || []).forEach(n => { const w = n.metadata?.world; if (w && !worldMap[n.label]) worldMap[n.label] = w; });
  }
  return phrases.map(p => ({ phrase: p, world: worldMap[p] || null,
    governed: govBy[p] !== false, evidenceClass: classBy[p] || null, historicalMethods: histBy[p] || null }));
}

// 🔮 הצלבה בין-שיטתית (number_cross_resonance) — עדשה על bidim לחיפוש-AI העמוק.
// pairs: [{method,value}] מהמנוע (crossMethodPairs). מחזיר קבוצות לפי שיטת-המקור:
//   [{ method, value, matches:[{phrase, via}] }] — via = השיטה בצד השני (בד״כ 'רגיל' = פני-המילה).
export async function getNumberCrossResonance(word, pairs, { perGroup = 5, cap = 90 } = {}) {
  if (!supabase || !word || !pairs?.length) return [];
  try {
    const { data, error } = await supabase.rpc('number_cross_resonance', { p_self: word, p_pairs: pairs, p_limit: cap });
    if (error || !data) return [];
    const groups = new Map();
    for (const r of data) {
      const g = groups.get(r.self_method) || { method: r.self_method, value: r.self_value, matches: [], seen: new Set() };
      if (!g.seen.has(r.match_phrase) && g.matches.length < perGroup) {
        g.seen.add(r.match_phrase);
        g.matches.push({ phrase: r.match_phrase, via: r.match_method });
      }
      groups.set(r.self_method, g);
    }
    return [...groups.values()].map(({ seen, ...g }) => g).filter(g => g.matches.length);
  } catch { return []; }
}

// 📊 מדד-תהודה — עובדת-מנוע (number_resonance_stats): {n_methods, n_connections, n_strong_nodes}.
export async function getNumberResonanceStats(word, pairs) {
  if (!supabase || !word || !pairs?.length) return null;
  try {
    const { data, error } = await supabase.rpc('number_resonance_stats', { p_self: word, p_pairs: pairs });
    if (error || !data) return null;
    return Array.isArray(data) ? (data[0] || null) : data;
  } catch { return null; }
}

// 🧭 המודל הפרשני של SOD1820 (method_semantics) — שיטה→סוג-יחס (🪞 מראה · 🌗 בן-זוג · 🔍 נסתר…).
// פרשנות, לא עובדה: profile מאפשר אסכולות עתידיות. cache מודולרי (15 שורות, קריאה אחת לסשן).
let _methodSemCache = null;
export async function getMethodSemantics(profile = 'sod1820') {
  if (_methodSemCache) return _methodSemCache;
  if (!supabase) return {};
  try {
    const { data } = await supabase.from('method_semantics')
      .select('method,relation_type,emoji,label_he,phrase_template,confidence_source,status,calculation_description,semantic_description,core_note,core_note_visibility,review_version')
      .eq('profile', profile).eq('is_active', true);
    _methodSemCache = Object.fromEntries((data || []).map(r => [r.method, r]));
  } catch { _methodSemCache = {}; }
  return _methodSemCache;
}

// 🔁 לולאת-האימות — "ממצאים" (relation_evidence): המנוע מגלה, צוריאל מאשר/דוחה.
export async function getRelationEvidenceStats() {
  if (!supabase) return [];
  try { const { data } = await supabase.rpc('relation_evidence_stats'); return data || []; } catch { return []; }
}
export async function discoverRelationCandidates(method = null, limit = 40) {
  if (!supabase) return [];
  try { const { data } = await supabase.rpc('discover_relation_candidates', { p_method: method, p_limit: limit }); return data || []; }
  catch { return []; }
}
export async function listRelationEvidence(status = null, limit = 60) {
  if (!supabase) return [];
  try {
    let q = supabase.from('relation_evidence').select('*').order('updated_at', { ascending: false }).limit(limit);
    if (status) q = q.eq('status', status);
    const { data } = await q; return data || [];
  } catch { return []; }
}
// `source` = EVIDENCE-SOURCE, not the acting user (live vocabulary: engine_scan, els_record:<id>,
// ai_judge:<tag>, cross_method:<n>, cipher_scan:<tag>, vip). Leave it null and the RPC records the
// honest category 'human_admin'. HG-5 / truth_axes_foundation_law INVARIANT H2: the previous
// hardcoded literal 'zuriel' attributed every admin's evidence to ZURIEL personally and is gone.
export async function setRelationEvidence(method, a, b, value, status, note = null, reason = null, source = null) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.rpc('set_relation_evidence', { p_method: method, p_a: a, p_b: b, p_value: value, p_status: status, p_note: note, p_reason: reason, p_source: source });
  if (error) throw error;
  return data;
}

// 📜 תיבת-ההגדרות של צוריאל — דרך RPC-ים SECURITY DEFINER (הדפוס הקנוני admin_*):
// policy ישיר שתלוי ב-select על users נכשל בשקט מהלקוח (rls_client_read_protocol) — תוקן 12.7.
export async function listResearcherDefinitions(limit = 30) {
  if (!supabase) return [];
  try { const { data } = await supabase.rpc('rd_list', { p_limit: limit }); return data || []; }
  catch { return []; }
}
export async function addResearcherDefinition(content, context = null) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.rpc('rd_add', { p_content: content, p_context: context });
  if (error) throw error;
  return data;
}
export async function updateResearcherDefinition(id, patch = {}) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.rpc('rd_update', { p_id: id, p_ai_reply: patch.ai_reply ?? null, p_status: patch.status ?? null, p_applied_note: patch.applied_note ?? null });
  if (error) throw error;
  return data;
}

// 💥 ההצלבה החזקה ביותר (strongest_cross_law) — עם מי המילה נפגשת בהכי הרבה שיטות.
export async function getStrongestCrossings(word, min = 2, limit = 4) {
  if (!supabase || !word) return [];
  try { const { data } = await supabase.rpc('strongest_crossings', { p_self: word, p_min: min, p_limit: limit }); return data || []; }
  catch { return []; }
}

// 🤖🌳 האטלס מדבר אל ה-AI: הממצאים המאושרים שנוגעים לישות (מילה או ערך) — משקל-בכורה בניתוח.
export async function getAtlasFindingsForEntity(term, value = null, limit = 6) {
  if (!supabase) return [];
  try {
    const w = String(term || '').trim();
    let q = supabase.from('relation_evidence')
      .select('relation_type,method,a_phrase,b_phrase,value,note')
      .eq('status', 'confirmed').limit(limit);
    if (/^\d+$/.test(w)) q = q.eq('value', parseInt(w, 10));
    else if (w) q = q.or(`a_phrase.eq.${w},b_phrase.eq.${w}${value ? `,value.eq.${Number(value)}` : ''}`);
    else if (value) q = q.eq('value', Number(value));
    else return [];
    const { data } = await q;
    return data || [];
  } catch { return []; }
}

// 🌳 שכבת-הידע הציבורית של האטלס — ממצאים שנבדקו (דרגות-תמיכה מחושבות) + סטטיסטיקת העץ-האחד.
export async function getAtlasFindings(relation = null, limit = 80) {
  if (!supabase) return [];
  try { const { data } = await supabase.rpc('atlas_findings', { p_relation: relation, p_limit: limit }); return data || []; }
  catch { return []; }
}
export async function getOneTreeStats() {
  if (!supabase) return null;
  try { const { data } = await supabase.rpc('one_tree_stats'); return data || null; } catch { return null; }
}
// 🌍 גשרי-שפות מאומתים (עברית↔לועזית) — דרך RPC definer: הגשר מאומת גם כשמילת-התעתיק
// עצמה לא is_verified (מדיניות anon חסמה את ההצמדה והטאב נראה ריק — תוקן 12.7).
export async function getVerifiedBridges(limit = 60) {
  if (!supabase) return [];
  try { const { data } = await supabase.rpc('verified_bridges', { p_limit: limit }); return data || []; }
  catch { return []; }
}

// 🧩 שכבת משפחות-העוגנים (anchor_families) — נתונים+מיפוי בלבד. שליטה ידנית של צוריאל.
export async function discoverAnchorFamilies(minWords = 8, limit = 60) {
  if (!supabase) return [];
  try { const { data } = await supabase.rpc('discover_anchor_families', { p_min_words: minWords, p_limit: limit }); return data || []; }
  catch { return []; }
}
export async function mapAnchorFamily(value) {
  if (!supabase || value == null) return null;
  try { const { data } = await supabase.rpc('map_anchor_family', { p_value: Number(value) }); return data || null; }
  catch { return null; }
}
export async function getAnchorFamilies() {
  if (!supabase) return [];
  try { const { data } = await supabase.from('anchor_families').select('*').order('evidence_count', { ascending: false }); return data || []; }
  catch { return []; }
}
// קידום-סטטוס סדרתי (discovered→reviewed→approved_anchor→featured). מנהל בלבד (נאכף בשרת).
export async function setAnchorFamilyStatus(root, status, notes = null) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.rpc('set_anchor_family_status', { p_root: Number(root), p_status: status, p_notes: notes });
  if (error) throw error;
  return data;
}

// 🧪 מעבדת השם — מחקר הקשר + גשרים חוצי-שפות לשם/מילה נתונה.
export async function getNameResearch(word, value) {
  const w = (word || '').trim();
  if (!supabase || !w) return null;
  const { data, error } = await supabase.rpc('name_lab_research', { p_word: w, p_value: value || null });
  if (error) return null;
  return data || null;
}

// 👑 תיק-השם (Name Dossier) — משטח «בדיקת השם»: מאחד את כל מנועי-השם בקריאה אחת מקבילה.
//   fn_name_research = מנוע-העל (גימטריה עמוקה · תנ״ך · שכנים · same_value · ביטויים · אנגרמות),
//   name_lab_research = גשרים חוצי-שפות + הקשר (פוסטים/אוצרות/חידושים, כבר מחווט),
//   fn_cross_research  = הצלבת שם + שם-משפחה + תאריך (רק כשיש יותר מפריט אחד).
// ⚠️ החלטת-מוצר (18.7): שמות-הסוכנים הפנימיים לא נחשפים ללקוח. ה-API מחזיר מפתחות-תפקיד
//   ניטרליים בלבד (gematria/sources/patterns/language/context/cross) — אף שם-מלאך לא חוצה.
//   לכן גם *לא* קוראים כאן ל-fn_metatron_route (הוא מחזיר name/agent_id של סוכן).
export async function getNameDossier(name, { surname, birthdate } = {}) {
  const w = (name || '').trim();
  if (!supabase || !w) return null;
  const items = [w, (surname || '').trim(), (birthdate || '').trim()].filter(Boolean);
  const rpc = (fn, args) => supabase.rpc(fn, args).then(r => (r.error ? null : r.data)).catch(() => null);
  const [research, lab, cross] = await Promise.all([
    rpc('fn_name_research', { p_name: w }),
    rpc('name_lab_research', { p_word: w, p_value: null }),
    items.length > 1 ? rpc('fn_cross_research', { p_items: items }) : Promise.resolve(null),
  ]);
  const g = research?.gematria || {};
  const value = (typeof g['רגיל'] === 'number') ? g['רגיל'] : null;
  return {
    name: w,
    value,
    gematria: research ? { methods: research.gematria || {}, letters: research.letters || [] } : null,
    sources: research ? { ...(research.tanach || {}), verses_same_gematria: research.verses_same_gematria || null } : null,
    patterns: research ? {
      neighbors: research.neighbors || [],
      same_value: research.same_value || [],
      anagrams: research.anagrams || [],
      transforms: research.transforms || null,
      expressions: research.expressions || [],
    } : null,
    language: lab ? { bridges: lab.bridges || [] } : null,
    context: lab ? {
      posts: lab.posts || [], posts_count: lab.posts_count || 0,
      treasures: lab.treasures || [], treasures_count: lab.treasures_count || 0,
      hints: lab.hints || [], hints_count: lab.hints_count || 0,
    } : null,
    cross: cross || null,
    principle: research?.principle || null,
  };
}

// 🧭 פרוטוקול חיפוש-השם (Name Research Protocol) — קריאה אחת שמחזירה את מסמך-המחקר המאוחד:
//   input · stages · agents[] (ok/ms/seq — מזין את מסע-ההתקדמות) · findings · provenance · scores · metatron.
//   מעטפת-פרוטוקול מעל 12 מנועי-המחקר (fn_name_protocol). לא מחשב גימטריה בעצמו.
export async function getNameProtocol(name) {
  const w = (name || '').trim();
  if (!supabase || !w) return null;
  const { data, error } = await supabase.rpc('fn_name_protocol', { p_name: w });
  if (error) return null;
  return data || null;
}

// 🔎 חיפוש-שם רב-מסלולי (NameLab «חובה») — שם + שם-משפחה + תאריך + שאלה → מסלולי-מחקר.
//   מחזיר { tracks[], literal_full_found, summary, input.components, question{ai_facts} }.
//   «לא נמצא» ≠ «אין מחקר»: כל מסלול עם count/status/source_fn.
export async function getNameMulti(name, { surname, birthdate, question } = {}) {
  const w = (name || '').trim();
  if (!supabase || !w) return null;
  const { data, error } = await supabase.rpc('fn_name_research_graded', {
    p_name: w,
    p_surname: (surname || '').trim() || null,
    p_birthdate: (birthdate || '').trim() || null,
    p_question: (question || '').trim() || null,
  });
  if (error) return null;
  return data || null;
}

// 📊 לוח-איכות פנימי — מתעד כל מחקר-שם (fire-and-forget, לצורכי פיתוח). לא חוסם את ה-UI.
export function logNameResearch(doc, ms) {
  try {
    if (!supabase || !doc || doc.error) return;
    supabase.rpc('fn_log_name_research', { p_doc: doc, p_ms: Math.round(ms) || null }).then(() => {}, () => {});
  } catch { /* noop */ }
}

// 🌉 גשרים חוצי-שפות מהגרף (עץ אחד) — לפי מילה עברית/לועזית או לפי ערך. משמש בכל משטח.
export async function getGraphBridges(word, value) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('get_graph_bridges', { p_word: (word || '').trim() || null, p_value: value || null });
  if (error) return [];
  return data || [];
}

// 🔢🧩 Number Page Integration v1 — עוטף fn_number_lookup (atomic+composite, מורחב, Numeric Root Finalization).
// שכבת-קריאה דקה בלבד; לא מחשב שום דבר בעצמו (gematria_engine_law) — כל שורה מגיעה כבר-מחושבת מהמנוע.
export async function getNumberLookup(value) {
  if (!supabase || value == null) return [];
  const { data, error } = await supabase.rpc('fn_number_lookup', { p_value: Number(value) });
  if (error) return [];
  return data || [];
}

// 🔗 Relation Engine v1 — עוטף fn_relation_candidate (read-only, status תמיד 'candidate', לעולם לא edges/nodes).
// מוצג כמועמד-למחקר בלבד; לעולם לא כטענת-אמת/קנוני.
export async function getRelationCandidate(entityA, entityB) {
  if (!supabase || !entityA || !entityB) return null;
  const { data, error } = await supabase.rpc('fn_relation_candidate', { p_a: entityA, p_b: entityB });
  if (error) return null;
  return data || null;
}

// 🗂️ מרשם הגילויים — הצלבה מאוחדת (גשרים + התכנסויות + חידושים) לפי ערך או מילה.
export async function getDiscoveries(value, term) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('get_discoveries', { p_value: value || null, p_term: (term || '').trim() || null });
  if (error) return [];
  return data || [];
}
// ── CC-1 · «חדר המפקדה» — עטיפות-קריאה דקות (READ-ONLY · reuse-first · אפס WRITE) ──
// מועמדי-מנוע (research_objects) דרך ה-RPC הקיים admin_research_feed (SECURITY DEFINER, admin).
export async function getResearchFeed({ status = 'candidate', kind = null, limit = 100 } = {}) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('admin_research_feed', { p_status: status, p_kind: kind, p_limit: limit });
  if (error) { console.error('getResearchFeed', error.message || error); return []; }
  return data || [];
}
// 🔖 אינדקס-כתבים (CC-1.2 · Identity Resolver) — עמודות בטוחות בלבד (column-grants; access_code/phone/email חסומים).
// READ-ONLY. משמש את resolveWriter() למיפוי מחרוזת-מחבר → contributor קנוני (כולל wa_names + merged_into).
export async function getContributorsIndex() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('contributors')
    .select('id,slug,display_name,wa_names,merged_into,vip');
  if (error) { console.error('getContributorsIndex', error.message || error); return []; }
  return data || [];
}
// קבוצות-WhatsApp (wa_bot_config — policy admin) — כולל מצב enabled (לזהות מקור-רדום).
export async function getWaGroups() {
  if (!supabase) return [];
  const { data } = await supabase.from('wa_bot_config')
    .select('group_id,enabled,max_per_hour,ai_chat,created_at').order('enabled', { ascending: false });
  return data || [];
}
// יומן-הודעות WhatsApp (wa_bot_log — policy wabl_admin_read) — נכנס+תשובת-בוט באותה שורה.
// כולל reply_out (תשובת-הבוט) · msg_id (מזהה-ספק) · bot_mode + sender (טלפון) — לפאנל-הקשר-מלא. READ-ONLY.
export async function getWaLog({ group = null, sender = null, limit = 80 } = {}) {
  if (!supabase) return [];
  let q = supabase.from('wa_bot_log')
    .select('group_id,sender,sender_name,text_in,reply_out,msg_id,bot_mode,value,action,created_at')
    .order('created_at', { ascending: false }).limit(limit);
  if (group) q = q.eq('group_id', group);
  if (sender) q = q.ilike('sender_name', `%${sender}%`);
  const { data } = await q;
  return data || [];
}
// 🕐 Timeline של שיחה אחת — כל ההודעות של אותו group_id (הקשר קיים, לא טבלת-conversations חדשה). READ-ONLY.
// ממוין ישן→חדש (סדר-שיחה). כל שורה = מה האדם שלח (text_in) + מה הבוט החזיר (reply_out).
export async function getWaThread({ groupId = null, sender = null, limit = 60 } = {}) {
  if (!supabase || (!groupId && !sender)) return [];
  let q = supabase.from('wa_bot_log')
    .select('group_id,sender,sender_name,text_in,reply_out,msg_id,bot_mode,value,action,created_at')
    .order('created_at', { ascending: true }).limit(limit);
  if (groupId) q = q.eq('group_id', groupId);
  else if (sender) q = q.eq('sender', sender);
  const { data } = await q;
  return data || [];
}
// 💬 ZVI CONVERSATION VIEW (PHASE 1-3) — Thread ≠ Research Case: זו רק projection כרונולוגית של המקור,
// לא Case/interpretation. ממזגת 3 מקורות אמיתיים בלבד (READ-ONLY, אין טבלת-thread חדשה): channel_updates
// (לפי credit — הזהות היחידה שיש לה טווח-תאריכים מלא + טקסט אמיתי), wa_bot_log+wa_deep_queue (לפי sender —
// חלון 3-5.7.2026 בלבד, יש חפיפת-msg_id בין השניים שדורשת dedup). ⛔ בכוונה לא כולל: gallery_images (אין
// שורות אמיתיות של צבי — כל ה-match הוא "צבי" כמילה בכותרות-חדשות ישנות, לא הכתב), research_contributions
// (כל 45 השורות חולקות אותו created_at מדויק=זמן-ייבוא-בבאצ׳, לא זמן-כתיבה אמיתי — מיזוגן לרצף כרונולוגי
// היה מזייף סדר, ר' work_log), wa_msg_ext (777 שורות אך ללא עמודת-טקסט כלל — אינדקס-דדופ ריק-מתוכן).
// PERSON=identity מוזרקת (phone+credits) ע"י הקורא — לא Person-system חדש. sender/credit הם ה-PERSON,
// group_id/channel הם ה-CHANNEL, כל שורה היא MESSAGE, thread הוא סדר-כרונולוגי גרידא (ASC, real created_at).
// ⚠️ waSenderName חובה גם על wa_bot_log, לא רק eq(sender): נמצאו בפועל שורות עם sender=הטלפון-של-צבי אך
// sender_name="רזיאל (agent)"/action="agent_reply" — תשובת-הבוט-עצמו שנרשמת תחת אותו טלפון בלוג-הפרטי
// (id 211/220, 4-5.7.2026). בלי הסינון הזה "השיחה של צבי" הייתה מציגה גם את מה שהבוט אמר, לא רק מה שהוא כתב.
export async function getContributorConversation({ phone = null, waSenderName = null, credits = [], limit = 500 } = {}) {
  if (!supabase) return [];
  const waSender = phone ? `${phone}@c.us` : null;
  const [cuRes, botRes, deepRes] = await Promise.all([
    credits.length
      ? supabase.from('channel_updates')
          .select('id,text,image_url,credit,source,channel,ext_msg_id,created_at')
          .in('credit', credits).order('created_at', { ascending: true }).limit(limit)
      : Promise.resolve({ data: [] }),
    waSender
      ? (() => {
          let q = supabase.from('wa_bot_log')
            .select('id,msg_id,group_id,sender,sender_name,text_in,reply_out,action,created_at')
            .eq('sender', waSender);
          if (waSenderName) q = q.eq('sender_name', waSenderName);
          return q.order('created_at', { ascending: true }).limit(limit);
        })()
      : Promise.resolve({ data: [] }),
    waSender
      ? (() => {
          let q = supabase.from('wa_deep_queue')
            .select('id,msg_id,chat_id,sender,sender_name,raw_text,phrase,created_at')
            .eq('sender', waSender);
          if (waSenderName) q = q.eq('sender_name', waSenderName);
          return q.order('created_at', { ascending: true }).limit(limit);
        })()
      : Promise.resolve({ data: [] }),
  ]);

  const items = [];
  for (const r of cuRes.data || []) {
    items.push({
      kind: 'channel_updates', id: r.id, ts: r.created_at, text: r.text || null, img: r.image_url || null,
      msgId: r.ext_msg_id || null, channel: r.channel || null, credit: r.credit || null,
      sourceRef: `channel_updates:${r.id}`,
    });
  }
  // wa_bot_log + wa_deep_queue מכסים אותו חלון-זמן (3-5.7.2026) דרך שני pipelines שונים — אותו msg_id
  // יכול להופיע בשניהם. dedup לפי msg_id, מעדיף wa_deep_queue.raw_text (מלא-יותר, ר' work_log).
  const byMsgId = new Map();
  for (const r of botRes.data || []) {
    const text = r.text_in === '[image]' ? null : (r.text_in || null);
    byMsgId.set(r.msg_id, {
      kind: 'wa_bot_log', id: r.id, ts: r.created_at, text, img: null,
      isImagePlaceholder: r.text_in === '[image]', ocrNotStored: r.action === 'ocr_replied' && !r.reply_out,
      msgId: r.msg_id, channel: r.group_id || null, credit: r.sender_name || null,
      sourceRef: `wa_bot_log:${r.id}`,
    });
  }
  for (const r of deepRes.data || []) {
    const text = r.raw_text || r.phrase || null;
    const existing = byMsgId.get(r.msg_id);
    if (existing) {
      // אותה הודעה נלכדה ע"י שני ה-pipelines — לא שתי שורות, שדרוג-טקסט בלבד + שתי provenance.
      existing.text = text || existing.text;
      existing.sourceRef = `${existing.sourceRef}+wa_deep_queue:${r.id}`;
      continue;
    }
    byMsgId.set(r.msg_id, {
      kind: 'wa_deep_queue', id: r.id, ts: r.created_at, text, img: null,
      msgId: r.msg_id, channel: r.chat_id || null, credit: r.sender_name || null,
      sourceRef: `wa_deep_queue:${r.id}`,
    });
  }
  items.push(...byMsgId.values());

  items.sort((a, b) => new Date(a.ts) - new Date(b.ts));

  // ingestion כפולה (לא re-post לגיטימי אחרי ימים) — אותו טקסט מדויק בתוך חלון קצר (≤10 דק') מסומן, לא נעלם.
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1], cur = items[i];
    if (cur.text && prev.text && cur.text === prev.text) {
      const gapMs = new Date(cur.ts) - new Date(prev.ts);
      if (gapMs >= 0 && gapMs <= 10 * 60 * 1000) cur.duplicateOfSourceRef = prev.sourceRef;
    }
  }

  return items;
}

// 🗂️ CONTRIBUTOR RESEARCH DOSSIER (Zvi Full Corpus Pass) — Foundation → Projection → Experience.
// קורא בלבד מ-research_objects הקיים (הפאונדיישן — אחרי ה-batch pass, לא לפני-כן) + research_items(handled)
// הקיים לסטטוס-עיבוד. אין הרצה חיה של extractCandidates על 400+ הודעות בדפדפן בכל טעינה — זו רק פרוייקציה
// על מה שכבר-נשמר, בדיוק כמו שדף-ישות (EntityPage) קורא מ-nodes ולא מחשב-מחדש. אין WRITE כאן בכלל.
export async function getContributorDossierData({ contributor, handledPrefix = null } = {}) {
  if (!supabase) return { objects: [], handledCount: 0 };
  const [objRes, handledRes] = await Promise.all([
    supabase.from('research_objects')
      .select('id,kind,value,statement,terms,source,source_ref,contributor,engine_verified,engine_detail,status,privacy_scope,created_at')
      .eq('contributor', contributor).order('created_at', { ascending: true }),
    handledPrefix
      ? supabase.from('research_items').select('entity_ref,metadata,created_at')
          .eq('bucket', 'handled').eq('entity_type', 'cc_handled').ilike('entity_ref', `${handledPrefix}%`)
      : Promise.resolve({ data: [] }),
  ]);
  return { objects: objRes.data || [], handled: handledRes.data || [] };
}

// חומר-פורום (research_contributions — policy rc_public_read) — טענת-גימטריה + provenance.
export async function getForumMaterial({ author = null, limit = 120 } = {}) {
  if (!supabase) return [];
  let q = supabase.from('research_contributions')
    .select('id,author_name,target_type,target_id,title,body,gematria_claim,image_url,graph_node_id,projected_insight_id,status,created_at')
    .order('created_at', { ascending: false }).limit(limit);
  if (author) q = q.eq('author_name', author);
  const { data } = await q;
  return data || [];
}
// שכבת-השפות: קישורים מובחנים (תרגום/תעתיק/ערך-משותף) דרך הנתיב הקנוני.
// ⚠️ language_links חסום לקריאה-ישירה (RLS: 0 policies) — קוראים דרך ה-RPC lang_links_list
//    (SECURITY DEFINER), אותו מקור שבו «דף האנגלית» משתמש. reuse, בלי טבלה/RPC/DB חדש.
export async function getLanguageLinks(limit = 200) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('lang_links_list', { p_visitor: null });
  if (error) { console.error('getLanguageLinks', error.message || error); return []; }
  return (data || []).slice(0, limit);
}
export async function getLanguageStats() {
  const out = { translitOpen: null, xlang: null, en: null };
  if (!supabase) return out;
  // translit_suggestions קריא ישירות (policy translit_sugg_public_read); xlang_calibration server-only.
  try { const t = await supabase.from('translit_suggestions').select('id', { count: 'exact', head: true }).eq('status', 'open'); out.translitOpen = t.count ?? null; } catch { /* noop */ }
  try { const { data } = await supabase.rpc('admin_lang_stats'); if (data && !data.error) out.en = data; } catch { /* noop */ }
  return out;
}

// 🗺️ מפת-כיסוי — "כבר בדקנו את X?" (החזרה ריקה = לא נסרק).
export async function wasScanned(term) {
  if (!supabase || !term) return [];
  const { data, error } = await supabase.rpc('was_scanned', { p_term: term.trim() });
  if (error) return [];
  return data || [];
}
// 🌳 מסע ההתכנסות — התחלה אקראית: ביטוי-זהב במשקל גבוה (כדי שיהיה אשכול-ערך עשיר).
export async function getRandomStartPhrase() {
  if (!supabase) return null;
  const { data } = await supabase.from('nodes').select('label').eq('type', 'entity').eq('is_active', true).gte('weight', 4).limit(400);
  const pool = [...new Set((data || []).map(r => r.label).filter(Boolean))];
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

// 🧪 ניסוי-תוכן — זריעת «מסע קלאסי»: ערך אקראי + משפחתו, מתוך ישויות שה-AI יצר בעולמות
// קלאסי+קדושה בלבד (בלי משיחי/מודרני). מחזיר { value, family:[{phrase,world}] } או null.
export async function getClassicJourneySeed() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.rpc('journey_classic_seed');
    if (!data || !data.length) return null;
    const value = data[0].value;
    const seen = new Set();
    const family = [];
    for (const r of data) {
      if (!r.phrase || seen.has(r.phrase)) continue;
      seen.add(r.phrase);
      family.push({ phrase: r.phrase, world: r.world || null });
    }
    return family.length ? { value, family } : null;
  } catch { return null; }
}

// 🔴 דופק המסע — נתוני-חיים אמיתיים בלבד (לטיקר תחושת-קהילה על המסע).
// { researchers_today, journeys_today, recent_numbers[] } מ-RPC journey_pulse (SECURITY DEFINER, ספירות בלבד).
export async function getJourneyPulse() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.rpc('journey_pulse');
    return data || null;
  } catch { return null; }
}

// 🧬 משפחות לפי שיטה — לדף ביטוי: לכל שיטה הערך של הביטוי *באותה שיטה* + המילים השוות לו שם.
// pairs: [{method, value}] (הערך של הביטוי בכל שיטה). מחזיר [{method, value, count, phrases}].
export async function getMethodFamilies(pairs, selfTerm = null, perMethod = 20) {
  if (!supabase || !Array.isArray(pairs) || !pairs.length) return [];
  try {
    const valByMethod = {}; pairs.forEach(p => { if (p.value > 0) valByMethod[p.method] = p.value; });
    const values = [...new Set(Object.values(valByMethod))];
    if (!values.length) return [];
    const { data } = await supabase.from('bidim').select('method,phrase,value,priority')
      .in('value', values).limit(4000);   // note: bidim RLS is source-derived (is_verified+is_published on gematria_words), no client-side filter needed
    if (!data || !data.length) return [];
    // משאירים רק שורות שבהן הערך של השורה = הערך של הביטוי באותה שיטה
    const rows = data.filter(r => valByMethod[r.method] === r.value);
    if (!rows.length) return [];
    const phrases = [...new Set(rows.map(r => r.phrase))];
    const worldMap = {}, ragilMap = {};
    for (let i = 0; i < phrases.length; i += 300) {
      const chunk = phrases.slice(i, i + 300);
      const { data: ents } = await supabase.from('nodes').select('label,metadata')
        .eq('type', 'entity').in('label', chunk).limit(1000);
      (ents || []).forEach(n => { const w = n.metadata?.world; if (w && !worldMap[n.label]) worldMap[n.label] = w; });
      const { data: gw } = await supabase.from('gematria_words').select('phrase,ragil').in('phrase', chunk).limit(1000);
      (gw || []).forEach(r => { if (r.ragil != null && ragilMap[r.phrase] == null) ragilMap[r.phrase] = r.ragil; });
    }
    const groups = {};
    for (const r of rows) {
      const g = (groups[r.method] ||= { method: r.method, value: r.value, priority: r.priority ?? 9, seen: new Set(), phrases: [] });
      if (!g.seen.has(r.phrase)) {
        g.seen.add(r.phrase);
        if (r.phrase !== selfTerm) g.phrases.push({ phrase: r.phrase, world: worldMap[r.phrase] || null, ragil: ragilMap[r.phrase] ?? null });
      }
    }
    // ⚖️ HG-E4: כל קבוצה נושאת את מצב-הממשל שלה מהרישום הקנוני; מושלות מדורגות ראשונות, אף אחת לא מוסתרת.
    const states = await getMethodStates();
    return Object.values(groups)
      .map(g => ({ method: g.method, value: g.value, priority: g.priority, count: g.phrases.length,
        governed: isGovernedMethod(states, g.method),
        evidenceClass: states[g.method] ? (states[g.method].governed ? 'governed' : 'historical') : 'unregistered',
        phrases: g.phrases.slice(0, perMethod) }))
      .sort((a, b) => (a.method === "רגיל" ? -1 : b.method === "רגיל" ? 1 : 0)
        || (Number(b.governed) - Number(a.governed)) || (a.priority - b.priority) || (b.count - a.count));
  } catch { return []; }
}

// 🔥 מספר חם עכשיו — ה-term שנחקר הכי הרבה היום (הוכחה חברתית).
export async function getHotNumber() {
  try {
    const since = new Date(); since.setHours(0, 0, 0, 0);
    const { data } = await supabase.from('search_log')
      .select('term,value').gte('created_at', since.toISOString()).limit(800);
    const counts = {};
    for (const r of (data || [])) {
      const t = (r.term || '').trim(); if (!t) continue;
      (counts[t] = counts[t] || { n: 0, value: r.value }).n++;
    }
    let best = null;
    for (const [term, o] of Object.entries(counts)) if (!best || o.n > best.n) best = { term, value: o.value, n: o.n };
    return best && best.n >= 2 ? best : null;
  } catch { return null; }
}

// 💎 הצלבת קציר: פוסטים שמזכירים ביטוי ששווה למספר הזה (mentions שנקצרו מהפוסטים).
export async function getHarvestedPosts(value, lim = 6) {
  if (!supabase || !value) return [];
  try {
    const { data } = await supabase.rpc('posts_harvested_for_number', { num: value, lim });
    return data || [];
  } catch { return []; }
}

// ✦ topic_cards שמכילים מספר — לרצועת גילוי בדף המספר.
export async function getTopicCardsByNumber(value, limit = 6) {
  if (!supabase || !value) return [];
  try {
    const { data } = await supabase.from('topic_cards')
      .select('slug, title, subtitle, numbers, quality')
      .eq('status', 'approved')
      .contains('numbers', [value])
      .order('quality', { ascending: false })
      .limit(limit);
    return data || [];
  } catch { return []; }
}

// 🔗 מספרים-קרובים = גרף (נעילת צוריאל #3) — שכנים אמיתיים: מספרים שמופיעים יחד עם הערך
// באותה התכנסות (topic_cards) או באותה תמונה (gallery_images), ממוינים לפי משקל (RPC number_neighbors,
// עם דיכוי-IDF למספרי-הַאב). לא רשימת-סקאלה — קשרים בגרף. נכשל בשקט → [].
export async function getNumberNeighbors(value, limit = 8) {
  if (!supabase || !value) return [];
  try {
    const { data, error } = await supabase.rpc('number_neighbors', { p_value: Number(value), p_limit: limit });
    if (error) return [];
    return (data || []).map(r => ({
      value: r.value,
      weight: Number(r.weight),
      viaTopic: Number(r.via_topic) || 0,
      viaGallery: Number(r.via_gallery) || 0,
    }));
  } catch { return []; }
}

// 📌 שמירת סדר-המובילים (lead_rank) למספר — גרירה-ושחרור של מנהל. phrases = הסדר החדש (1-based).
// [] = איפוס לאוטומטי. מנהל בלבד (נבדק בשרת ב-admin_set_lead_ranks).
export async function setLeadRanks(value, phrases) {
  if (!supabase || !value) return { error: "no-supabase" };
  const { data, error } = await supabase.rpc("admin_set_lead_ranks", { p_value: Number(value), p_phrases: phrases || [] });
  if (error) return { error: error.message };
  return data || {};
}

// 🔍 autocomplete עברי — חיפוש prefix בטבלת bidim (שיטת רגיל).
export async function searchPhrases(prefix, limit = 8) {
  if (!supabase || !prefix || prefix.length < 2) return [];
  try {
    const { data } = await supabase.from('bidim')
      .select('phrase, value')
      .eq('method', 'רגיל')
      .ilike('phrase', `${prefix}%`)
      .order('value', { ascending: true })
      .limit(limit * 3);
    const seen = new Set(), out = [];
    for (const r of (data || [])) {
      if (!seen.has(r.phrase)) {
        seen.add(r.phrase);
        out.push(r);
        if (out.length >= limit) break;
      }
    }
    return out;
  } catch { return []; }
}

// ── hint_sets ──
export async function getHintSets({ status = null } = {}) {
  if (!supabase) return [];
  let q = supabase.from('hint_sets').select('*')
    .order('importance', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data } = await q;
  return data || [];
}

export async function getHintSet(id) {
  if (!supabase) return null;
  const { data: set } = await supabase.from('hint_sets').select('*').eq('id', id).single();
  const { data: members } = await supabase.from('hint_set_members').select('*').eq('set_id', id).order('sort_order');
  return { ...set, members: members || [] };
}

export async function saveHintSet(fields) {
  if (!supabase) throw new Error('no supabase');
  const { id, ...rest } = fields;
  rest.updated_at = new Date().toISOString();
  if (id) {
    const { data } = await supabase.from('hint_sets').update(rest).eq('id', id).select().single();
    return data;
  }
  const { data } = await supabase.from('hint_sets').insert(rest).select().single();
  return data;
}

export async function addHintSetMember(setId, memberType, memberId, sortOrder = 0, note = null) {
  if (!supabase) throw new Error('no supabase');
  const { data } = await supabase.from('hint_set_members')
    .insert({ set_id: setId, member_type: memberType, member_id: String(memberId), sort_order: sortOrder, note })
    .select().single();
  return data;
}

export async function removeHintSetMember(id) {
  if (!supabase) return;
  await supabase.from('hint_set_members').delete().eq('id', id);
}

export async function reorderHintSetMembers(setId, orderedMemberIds) {
  if (!supabase) return;
  await Promise.all(orderedMemberIds.map((id, i) =>
    supabase.from('hint_set_members').update({ sort_order: i }).eq('id', id).eq('set_id', setId)
  ));
}

// ── trails ──
export async function getTrails({ status = null } = {}) {
  if (!supabase) return [];
  let q = supabase.from('trails').select('*')
    .order('importance', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data } = await q;
  return data || [];
}

export async function saveTrail(fields) {
  if (!supabase) throw new Error('no supabase');
  const { id, ...rest } = fields;
  rest.updated_at = new Date().toISOString();
  if (id) {
    const { data } = await supabase.from('trails').update(rest).eq('id', id).select().single();
    return data;
  }
  const { data } = await supabase.from('trails').insert(rest).select().single();
  return data;
}

export async function addTrailMember(trailId, memberType, memberId, sortOrder = 0, note = null) {
  if (!supabase) throw new Error('no supabase');
  const { data } = await supabase.from('trail_members')
    .insert({ trail_id: trailId, member_type: memberType, member_id: String(memberId), sort_order: sortOrder, note })
    .select().single();
  return data;
}

export async function removeTrailMember(id) {
  if (!supabase) return;
  await supabase.from('trail_members').delete().eq('id', id);
}

// ── Person / Life Journey — F-1a′/F-1b private Ledger (research_objects), self+family only.
// Nothing here is public; every row is privacy_scope='private' at the DB layer regardless
// of what the UI does. Family members never get a `persons` row — identity is the
// person:<owner>:{self|p:<ref>} string embedded in each function's return value.
export async function getOrCreateMyPersonId() {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.rpc('fn_get_or_create_my_person');
  if (error) throw error;
  return data;
}

export async function upsertSelfProfile(ownerId, name, meta = {}) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.rpc('fn_upsert_self_profile', { p_owner: ownerId, p_name: name, p_meta: meta });
  if (error) throw error;
  return data;
}

export async function upsertFamilyMember(ownerId, ref, name, meta = {}) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.rpc('fn_upsert_family_member', { p_owner: ownerId, p_ref: ref, p_name: name, p_meta: meta });
  if (error) throw error;
  return data;
}

export async function upsertFamilyRelation(ownerId, parentRef, childRef, relationType = 'parent_of', meta = {}) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.rpc('fn_upsert_family_relation', { p_owner: ownerId, p_parent_ref: parentRef, p_child_ref: childRef, p_relation_type: relationType, p_meta: meta });
  if (error) throw error;
  return data;
}

export async function listFamily(ownerId) {
  if (!supabase) return { members: [], relations: [] };
  const { data, error } = await supabase.rpc('fn_list_family', { p_owner: ownerId });
  if (error) throw error;
  return data || { members: [], relations: [] };
}
