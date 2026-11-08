import { PUBLIC_READING_RELEASE, PUBLIC_READING_PRODUCTION_ARTIFACT } from "./publicReadingRelease2029.js";
import { readingSessionOptions } from "./publicReadingAuthSession.js";
import { sharedReadDedupe } from "./readDedupe.js";
import { createClient } from '@supabase/supabase-js';
import { sideEffectAllowed } from "./botVerdict.js"; // 🤖 BOT_READ_NO_SIDE_EFFECT_V1 — קריאה של בוט לא מייצרת תופעת-לוואי
import { signupAttribution } from './acquisition.js';
import { isAnon } from './privacy.js';
import { isReadable } from './nameMask.js';
import { stripHtml } from './format.js';
import { postCategoryFilterNames } from './postCategoryIdentity.js';
import { decodePostSlug, publicPostHref } from './publicPostUrls.js';
import { POST_READER_SELECT } from './postReaderColumns.js';

// 🔑 מיוצאים כדי לאפשר fetch ישיר ל-PostgREST במקומות שדורשים עקיפת-קאש (cache:no-store) —
// למשל עמוד-הצופן הקנוני, שאחרי עריכה/שמירה-מחדש חייב תמיד את הרשומה הטרייה (התגובה מ-PostgREST
// חוזרת בלי Cache-Control → הדפדפן חופשי להגיש JSON ישן). ראה getMatrixBySlug.
export const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
export const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';

let readingStorage;
if (PUBLIC_READING_RELEASE) { try { readingStorage = globalThis.sessionStorage; } catch { /* Private mode: memory-only session. */ } }
// In-flight sharing + short anonymous-only TTL memo for an explicit list of read-only RPCs/relations (src/lib/readDedupe.js).
// Writes, telemetry, auth, storage and every unlisted read pass through untouched.
const readDedupe = sharedReadDedupe(SUPABASE_URL);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  ...(PUBLIC_READING_RELEASE
    ? { auth: readingSessionOptions(readingStorage, globalThis.location, { productionArtifact: PUBLIC_READING_PRODUCTION_ARTIFACT }) }
    : {}),
  global: { fetch: readDedupe.fetch },
});

export default supabase;
export { supabase };

export async function getPostsFromSupabase({ limit = 10, page = 1, category = null, tag = null, year = null, author = null, orderBy = 'date', ascending = false, stableOrder = false } = {}) {
  if (!supabase) return { posts: [], total: 0 };
  let query = supabase
    .from('posts')
    .select('*', { count: 'exact' })
    .order(orderBy, { ascending, nullsFirst: false })
    .range((page - 1) * limit, page * limit - 1);

  if (stableOrder && orderBy !== 'id') query = query.order('id', { ascending });

  if (category) query = query.overlaps('categories', postCategoryFilterNames(category));
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
export async function getLatestPostCards({ limit = 2, excludeSlug = null, includeMetadata = false, signal = null, throwOnError = false } = {}) {
  if (!supabase) return [];
  try {
    let query = supabase.from("posts")
      .select("id, slug, title, image_url, thumb_url, date, modified, tags, source, link, wp_id" + (includeMetadata ? ", categories, home_hidden" : ""))
      .not("slug", "is", null)
      .order("modified", { ascending: false, nullsFirst: false })
      .limit(limit + 5);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) { if (throwOnError) throw error; return []; }
    if (!data) return [];
    return data
      .filter(p => p.slug && p.slug !== excludeSlug && !(Array.isArray(p.tags) && p.tags.some(tag => ["טיוטה", "פורום"].includes(tag))))
      .slice(0, limit)
      .map(p => ({ id: p.id, slug: p.slug, source: p.source, link: p.link, wp_id: p.wp_id, title: stripHtml(p.title || ""), poster: p.thumb_url || p.image_url || null, modified: p.modified || p.date || null,
        ...(includeMetadata ? { sourcePost: { id: p.id, slug: p.slug, date: p.date, modified: p.modified, tags: p.tags, categories: p.categories, source: p.source, home_hidden: p.home_hidden } } : {}),
      }));
  } catch (error) { if (throwOnError) throw error; return []; }
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
      .select("id, slug, title, image_url, thumb_url, date, source, link, wp_id, tags")
      .overlaps("categories", ["צפונות בתורה", "הצופן בסרטים"])
      .not("image_url", "is", null)
      .order("date", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.filter(r => !(r.tags || []).some(tag => ["טיוטה", "פורום"].includes(tag))).map(r => ({
      id: r.id,
      text: stripHtml(r.title || ""),
      image_url: r.thumb_url || r.image_url,   // כרזה (תמונה) — התצוגה מציגה אותה; הניגון בפוסט
      thumb_url: r.thumb_url || r.image_url,
      link_url: publicPostHref(r),
      is_video: true,                          // כרטיס-וידאו (מסמן ▶) — הסרטון מתנגן בפוסט
      created_at: r.date,
      priority: 100,
      credit: "צפונות בתורה · סוד 1820",
    }));
  } catch { return []; }
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

export async function getPostBySlug(slug, { throwOnError = false, signal = null } = {}) {
  if (!supabase) return null;
  const decoded = decodePostSlug(slug);
  const encoded = encodeURIComponent(decoded).toLowerCase();
  const slugs = [...new Set([slug, decoded, encoded])];
  let query = supabase
    .from('posts')
    .select(POST_READER_SELECT)   // explicit columns, not * (see postReaderColumns.js)
    .in('slug', slugs)
    .limit(1);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) { if (throwOnError) throw error; return null; }
  if (!data?.length) return null;
  return data[0];
}

// Route-owned primary Home cards overlap the component code download. This
// preserves one existing bounded reader; no global data/promise cache exists.
export function beginHomeReadingSource({ readCards = getLatestPostCards } = {}) {
  const controller = new AbortController();
  const result = Promise.resolve().then(() => readCards({ limit: 4, includeMetadata: true,
    throwOnError: true, signal: controller.signal }))
    .then(data => ({ data }), error => ({ error }));
  return {
    async read() {
      const outcome = await result;
      if (controller.signal.aborted) throw new DOMException("Home read canceled", "AbortError");
      if (outcome.error) throw outcome.error;
      return outcome.data;
    },
    cancel() { controller.abort(); },
  };
}

// One route-owned read, started while the Post component code downloads. No
// shared data cache: its caller cancels it on route/identity change or unmount.
export function beginPostReadingSource(slug, { readPost = getPostBySlug } = {}) {
  const controller = new AbortController();
  // Observe early rejection even while the lazy component has not mounted.
  const result = Promise.resolve().then(() => readPost(slug, { throwOnError: true, signal: controller.signal }))
    .then(data => ({ data }), error => ({ error }));
  return {
    async read(requestedSlug) {
      if (requestedSlug !== slug) throw new Error("post_source_identity_mismatch");
      const outcome = await result;
      if (controller.signal.aborted) throw new DOMException("Source read cancelled", "AbortError");
      if (outcome.error) throw outcome.error;
      return outcome.data;
    },
    cancel() { controller.abort(); },
  };
}

// התכנסות רשומה חזקה לערך (fn_convergence_for_value — SECURITY DEFINER; convergences אינה קריאה-לקוח).
export async function getConvergenceForValue(value) {
  if (!supabase || !value) return null;
  try { const { data } = await supabase.rpc('fn_convergence_for_value', { p_value: value }); return data || null; }
  catch { return null; }
}

// הצעת ביטוי-קהילתי חדש לערך (pending — ממתין לאישור אדמין). מחזיר: ok|exists|pending|invalid|error.
export async function proposeCommunityWord(phrase, value, method = 'רגיל') {
  if (!supabase) return 'error';
  try { const { data } = await supabase.rpc('propose_community_word', { p_phrase: String(phrase).trim(), p_value: value, p_method: method }); return data || 'ok'; }
  catch { return 'error'; }
}

// 💬 תורת הרמז → projection ציבורי מצומצם עבור LiveChannelFeed הישן בלבד.
// אינו משנה status/source truth, אינו חושף storage-object פרטי, ואינו משמש את 2029.
export async function getToratHaremezLiveFeed(limit = 60) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.functions.invoke('live-whatsapp-feed', { body: { limit } });
    if (error) throw error;
    return Array.isArray(data?.items) ? data.items : [];
  } catch {
    return [];
  }
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
// 🌍 הוספת תרגום/תעתוק אנגלי למילה עברית — ממלא את מאגר-האנגלית (word_aliases).
export async function addEnglishAlias({ phrase, alias, method = 'transliteration', verified = true }) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('add_word_alias', {
    p_phrase: phrase, p_alias: alias, p_lang: 'en', p_type: method, p_source: 'admin', p_method: method, p_confidence: 1, p_verified: verified,
  });
  if (error) throw error;
  return data;
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
export async function setChannelUpdateStatus(id, status) {
  if (!supabase) throw new Error('no supabase');
  const { error } = await supabase.from('channel_updates').update({ status }).eq('id', id);
  if (error) throw error;
}

// ===== ארכיון הגלריות ("גלריית רמזי הגאולה") =====
// סקירה: רשימת גלריות + תמונות קלות (לכריכה+ספירה).
// מטמון פר-סשן לסקירת הארכיון — מונע משיכה חוזרת של כל ~2,500 השורות בכל כניסה/חזרה ל-/archive.
// מתאפס אוטומטית בכל כתיבה לתמונה (invalidateGalleriesOverview) וגם אחרי TTL קצר.
let _overviewCache = null;            // { ts, gals, imgs }
const OVERVIEW_TTL = 120000;          // 2 דקות — טרי מספיק, חוסך טעינות חוזרות
export function invalidateGalleriesOverview() { _overviewCache = null; }

export async function getGalleriesOverview({ force = false, publicSourceOnly = false, client = supabase } = {}) {
  if (!client) { if (publicSourceOnly) throw new Error('gallery_reader_unavailable'); return { gals: [], imgs: [] }; }
  const useCache = !publicSourceOnly && client === supabase;
  if (useCache && !force && _overviewCache && Date.now() - _overviewCache.ts < OVERVIEW_TTL) {
    return { gals: _overviewCache.gals, imgs: _overviewCache.imgs };
  }
  let galleryQuery = client
    .from('galleries')
    .select(publicSourceOnly ? 'id,name,wp_gallery_id' : 'id,name,anchor_number,img_count,wp_gallery_id', publicSourceOnly ? { count: 'exact' } : undefined);
  if (publicSourceOnly) galleryQuery = galleryQuery.order('id').range(0, 999);
  const imageQuery = (start) => {
    let query = client
      .from('gallery_images')
      .select(publicSourceOnly ? 'id,gallery_id,wp_gallery_id,image_url,thumb_url,ordering,published,min_tier,curator_hidden,occurred_at,created_at,date_derived:ocr_meta->>date_derived,name,description,primary_value,all_values,related_values,image_type,source,stream_at'
        : 'id,gallery_id,image_url,thumb_url,name,description,ordering,primary_value,all_values,occurred_at,created_at,importance,image_type,source,curator_hidden,tags')
      .not('image_url', 'is', null);
    query = publicSourceOnly ? query.eq('published', 1).eq('min_tier', 0).not('curator_hidden', 'is', true).order('id')
      : query.order('occurred_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
    return query.range(start, start + 999);
  };
  // Public catalog: the galleries read and the first three image pages (stable order('id') offsets 0/1000/2000; 2,195 rows
  // today) do not depend on each other, so they are issued together instead of one after another (4 sequential round
  // trips -> 1). The pages are still consumed in order below, so the stop rules, the 10,000-row bound and the errors are
  // unchanged: a prefetched page that is never reached is never inspected. Later pages stay sequential.
  const [galleryResult, ...prefetched] = await Promise.all([galleryQuery, ...(publicSourceOnly ? [0, 1000, 2000].map(imageQuery) : [])]);
  const { data: gals, error: galleryError, count: galleryCount } = galleryResult;
  if (galleryError && publicSourceOnly) throw galleryError;
  let imgs = [], from = 0;
  let partial = publicSourceOnly && galleryCount > (gals || []).length;
  while (true) {
    const { data, error } = from / 1000 < prefetched.length ? prefetched[from / 1000] : await imageQuery(from);
    if (error && publicSourceOnly) throw error;
    if (!data || !data.length) break;
    imgs = imgs.concat(data);
    if (data.length < 1000) break;
    from += 1000;
    if (publicSourceOnly && from >= 10000) { partial = true; break; }
  }
  if (useCache) _overviewCache = { ts: Date.now(), gals: gals || [], imgs };
  return { gals: gals || [], imgs, ...(publicSourceOnly ? { coverage: { partial } } : {}) };
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
function aiInteractionId() {
  try {
    return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : null;
  } catch { return null; }
}
export async function getAiAnalysis({ kind, subject, facts, again, fast, engine, long, metatron, ref, ref_name, user_ref, operation, interaction_id, surface, persistAnalysis = true }) {
  if (!supabase) return null;
  try {
    // 📏 ai_quota_law — visitor_id מאפשר ספירת-מכסה יציבה לאורח (מדויק יותר מ-IP).
    // ✨ long=true → ניתוח עמוק ממוזג ארוך (השרת מרים את הגבלת-האורך; אינרטי אם לא נשלח).
    // 🌳 metatron=true → השרת נשען על «העץ האחד» (חוקים+גרף) → תשובה מבוססת-חומר (בטא, opt-in).
    // provenance-עלות (ref=msg_id · ref_name=group/conversation · user_ref) נשלח לרישום ב-ai_token_log.
    // 🧵 No-Black-Box: browser action emits a non-PII interaction id. The server still owns
    // trace_id/root_span_id, so an untrusted client can correlate one action but cannot merge roots.
    const interactionId = interaction_id || aiInteractionId();
    const traceSurface = surface || 'web:ai-analysis';
    const { data, error } = await supabase.functions.invoke('ai-analyze', { body: { kind, subject, facts, again, fast, engine, long, metatron, visitor_id: aiVisitorId(), ref, ref_name, user_ref, operation, interaction_id: interactionId, surface: traceSurface } });
    if (error) { try { console.warn('[ai-analyze] invoke error:', error?.message || error); } catch { /* noop */ } return null; }
    // 🚦 מכסת-AI נגמרה → שדר אירוע גלובלי (שער-הרשמה/הודעה); מחזיר null → הקורא מציג נפילה בחן.
    if (data?.error === 'quota') {
      try { window.dispatchEvent(new CustomEvent('sod:ai-quota', { detail: { tier: data.tier, used: data.used, limit: data.limit, message: data.message } })); } catch { /* noop */ }
      return null;
    }
    if (data?.error) { try { console.warn('[ai-analyze] server:', data.error, data.detail || ''); } catch { /* noop */ } }
    // normalized_reflection is the one bounded structured lane. Existing callers still receive
    // the legacy analysis string because they do not set this operation.
    const structuredReflection = operation === 'normalized_reflection' && data?.reflection_interpretation?.message
      ? data.reflection_interpretation
      : null;
    const analysisText = structuredReflection?.message || data?.analysis || null;
    // 🧪 ai_style_learning_law — כל ניתוח מוצלח נרשם אוטומטית (בכל משטח באתר, כי כולם עוברים כאן).
    // fire-and-forget: הרישום לא מעכב ולא מפיל את הניתוח.
    // Private research surfaces may use the existing AI transport without copying their
    // subject/message into the style-learning log. Operational cost traces remain bounded
    // server-side and contain no raw non-numeric subject.
    if (analysisText && persistAnalysis !== false) {
      logAiAnalysis({ kind, subject, styleKey: data.style_key, engine: data.engine, model: data.model, content: analysisText });
    }
    return structuredReflection || analysisText;
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
//    viewMode='landscape'|'exploratory' (RAZIEL_VIEW_MODE_V1) is independent from intelligenceLevel;
//    it is emitted only by the bounded canonical 2029 research contract.
//    path = מסלול-מחקר שהמשתמש בחר (המוח מחליט אילו מסלולים קיימים; ה-UI רק מציג). context = הקשר-המשתמש.
// The nested Raziel contract may be model-authored. Operational provenance is authoritative only
// when it comes from the Edge response envelope, so nested lookalike fields are always removed.
const RAZIEL_TRANSPORT_METADATA_KEYS = new Set(['trace_id', 'engine', 'model', 'usage', 'evidence_summary']);

function razielContractWithoutTransportMetadata(contract) {
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) return {};
  return Object.fromEntries(Object.entries(contract).filter(([key]) => !RAZIEL_TRANSPORT_METADATA_KEYS.has(key)));
}

function razielTransportMetadata(data) {
  const top = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  const out = {};
  const addText = (key, limit) => {
    if (typeof top[key] !== 'string') return;
    const value = top[key].trim().slice(0, limit);
    if (value) out[key] = value;
  };
  addText('trace_id', 160);
  addText('engine', 80);
  addText('model', 160);
  if (top.usage && typeof top.usage === 'object' && !Array.isArray(top.usage)) {
    const inputTokens = top.usage.input_tokens ?? top.usage.inputTokens;
    const outputTokens = top.usage.output_tokens ?? top.usage.outputTokens;
    const usage = {};
    if (Number.isSafeInteger(inputTokens) && inputTokens >= 0) usage.input_tokens = inputTokens;
    if (Number.isSafeInteger(outputTokens) && outputTokens >= 0) usage.output_tokens = outputTokens;
    if (Object.keys(usage).length) out.usage = usage;
  }
  return out;
}

export async function askRaziel({ subject, facts, context = null, path = null, again = false, metatron = false, intelligenceLevel = null, surfaceSemantic = null, conversationResolution = null, researchContract = null, viewMode = null }) {
  // Keep the public transport signature stable for every existing caller. The personal-area adapter
  // adds only two internal request fields: the closed action envelope and a non-enumerable AbortSignal.
  const companionAction = arguments[0]?.companionAction ?? null;
  const elsPlanningAction = arguments[0]?.elsPlanningAction ?? null;
  const elsMatrixContext = arguments[0]?.elsMatrixContext ?? null;
  // One explicit matrix reading (admin-only, experimental): the same Raziel turn, plus the closed action; polling, progress and cancel are non-enumerable session hooks like the abort signal.
  const elsMatrixReadingAction = arguments[0]?.elsMatrixReadingAction ?? null;
  const cancelSignal = arguments[0]?.__razielCancelSignal ?? null;
  const onProgress = typeof arguments[0]?.__razielProgress === 'function' ? arguments[0].__razielProgress : undefined;
  const signal = arguments[0]?.__razielAbortSignal ?? null;
  if (!supabase) return null;
  if (signal?.aborted) return null;
  try {
    // intelligenceLevel='fast'|'deep' — בחירה מפורשת של הקורא בלבד. נשלח (intelligence_level) רק כשהתבקש;
    // קוראים קיימים לא מציינים → גוף-הבקשה זהה ל-before והשרת מתנהג עמוק כברירת-מחדל.
    const level = intelligenceLevel === 'fast' || intelligenceLevel === 'deep' ? intelligenceLevel : null;
    // This correlation id is non-authoritative. The server remains the owner of trace/root identities.
    // Legacy callers preserve their previous body shape by not opting into the canonical contract.
    const interactionId = researchContract === 'public-number-research-run-v1' ? aiInteractionId() : null;
    const makeBody = (readingAction = null) => ({ kind: 'research', persona: 'raziel', subject, facts, context, path, again, metatron, visitor_id: aiVisitorId(), ...(level ? { intelligence_level: level } : {}), ...(surfaceSemantic && typeof surfaceSemantic === 'object' ? { surface_semantic: surfaceSemantic } : {}), ...(conversationResolution && typeof conversationResolution === 'object' ? { conversation_resolution: conversationResolution } : {}), ...(researchContract === 'public-number-research-run-v1' ? { research_contract: researchContract, ...(interactionId ? { interaction_id: interactionId } : {}) } : {}), ...(researchContract === 'public-number-research-run-v1' && companionAction && typeof companionAction === 'object' ? { companion_action: companionAction } : {}), ...(researchContract === 'public-number-research-run-v1' && elsPlanningAction && typeof elsPlanningAction === 'object' ? { els_planning_action: elsPlanningAction } : {}), ...(researchContract === 'public-number-research-run-v1' && elsMatrixContext && typeof elsMatrixContext === 'object' ? { els_matrix_context: elsMatrixContext } : {}), ...(researchContract === 'public-number-research-run-v1' && (viewMode === 'landscape' || viewMode === 'exploratory') ? { view_mode: viewMode } : {}), ...(researchContract === 'public-number-research-run-v1' && elsMatrixContext && readingAction && typeof readingAction === 'object' ? { els_matrix_reading_action: readingAction } : {}) });
    // metatron:true → רזיאל נשען על «העץ האחד» (חוקים+גרף) בצד השרת (בטא, opt-in). ברירת-מחדל כבוי.
    const sendBody = async (readingAction = null) => {
      if (import.meta.env?.VITE_FUNCTIONAL_UNIFIED_PREVIEW === 'true') {
        const { invokePreviewRaziel } = await import('./research/functionalPreviewTransport.js');
        return invokePreviewRaziel({client:supabase,body:makeBody(readingAction),signal});
      }
      return supabase.functions.invoke('ai-analyze', {
        body: makeBody(readingAction),
        ...(signal instanceof AbortSignal ? { signal } : {}),
      });
    };
    let data, error;
    if (elsMatrixReadingAction) {
      // Never reached without the canonical contract and a matrix context (the server refuses anything else); the long leg lives in a lazy module.
      if (researchContract !== 'public-number-research-run-v1' || !elsMatrixContext) return null;
      const { runElsMatrixReadingTurn } = await import('./research/elsMatrixReadingTransport.js');
      data = await runElsMatrixReadingTurn({ invoke: (action) => sendBody(action), action: elsMatrixReadingAction, signal, cancelSignal, onProgress });
      error = data ? null : new Error('els_matrix_reading_unavailable');
    } else {
      ({ data, error } = await sendBody(null));
    }
    // A principal change may race a completed response. Do not emit the old
    // principal's quota event or fallback telemetry after cancellation.
    if (signal?.aborted || error) return null;
    if (data?.error === 'quota') {
      try { window.dispatchEvent(new CustomEvent('sod:ai-quota', { detail: { tier: data.tier, used: data.used, limit: data.limit, message: data.message } })); } catch { /* noop */ }
      return null;
    }
    // Older ai-analyze deployments ignore unknown request fields. Never present
    // their ordinary answer as an analysis of a matrix they did not process.
    if ((elsMatrixContext || surfaceSemantic?.els?.grounding === 'canonical_replay_v1') && !elsMatrixReadingAction
      && data?.els_matrix_status !== 'verified_axis_unverified_presentation_v1') return null;
    if (surfaceSemantic?.els?.grounding === 'canonical_replay_v1' && !elsMatrixReadingAction) {
      const focus = surfaceSemantic.els, receipt = data?.els_occurrence_context;
      if (receipt?.status !== 'verified' || receipt.axis?.corpusId !== focus.corpus
        || !['term', 'scope', 'start', 'skip', 'dir'].every(key => receipt.axis?.[key] === focus[key])
        || (receipt.readingJobId ?? null) !== (focus.readingJobId ?? null)) return null;
    }
    // Same rule for a reading: an older ai-analyze that ignores the action must never have its ordinary answer shown as a reading.
    if (elsMatrixReadingAction && data?.els_matrix_reading?.contract !== 'els_matrix_reading_v1') return null;
    const c = data?.raziel || data?.contract;   // המוח מחזיר את החוזה כשמוכן
    // intelligence_level = תווית-מצב כנה מאותו transport (deterministic|fast|deep) — additive, לא API שני.
    if (c && typeof c === 'object') return { v: 1, ...razielContractWithoutTransportMetadata(c), ...(elsMatrixReadingAction && data?.els_matrix_reading ? { els_matrix_reading: data.els_matrix_reading } : {}), ...(data?.evidence_summary ? { evidence_summary: data.evidence_summary } : {}), ...razielTransportMetadata(data), ...(data?.intelligence_level ? { intelligence_level: data.intelligence_level } : {}), ...(data?.plan_meta && !c.plan_meta ? { plan_meta: data.plan_meta } : {}), ...(data?.intelligence_selection && !c.intelligence_selection ? { intelligence_selection: data.intelligence_selection } : {}) };
    if (data?.analysis) {   // fallback — עוטף את המחרוזת הנוכחית כחוזה מינימלי
      try { logAiAnalysis({ kind: 'research', subject, styleKey: data.style_key, engine: data.engine, model: data.model, content: data.analysis }); } catch { /* noop */ }
      return { v: 1, answer: data.analysis, ...(data?.evidence_summary ? { evidence_summary: data.evidence_summary } : {}), ...razielTransportMetadata(data) };
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

// 🧠 Contact Gateway AI Triage V2 — detector זול/מצטבר בלבד.
// יוצר/מעדכן system_suggestions; לא שולח טקסט משתמש ל-AI ולא משנה state בעצמו.
export async function adminContactGatewayTriageRefresh() {
  if (!supabase) return { ok: false };
  try {
    const { data, error } = await supabase.rpc('admin_contact_gateway_triage_refresh_v2');
    return error ? { ok: false, error: error.message } : (data || { ok: true });
  } catch (e) { return { ok: false, error: String(e?.message || e) }; }
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

// ===== סטים של מספרים (number_sets) =====
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
// Only callers with an explicit navigation/principal scope share a PENDING read.
// Nothing survives settlement: refresh/new navigation must see current DB policy.
// Legacy callers omit the option and retain their independent reads.
const siteFlagPendingReads = new Map();
export async function getSiteFlags({ pendingScope = null } = {}) {
  if (!supabase) return {};
  const read = async () => {
    try {
      const { data } = await supabase.from('site_flags').select('key,enabled,message,mode');
      const m = {};
      for (const r of (data || [])) m[r.key] = r;
      return m;
    } catch { return {}; }
  };
  if (pendingScope === null) return read();
  if (siteFlagPendingReads.has(pendingScope)) return siteFlagPendingReads.get(pendingScope);
  const pending = read();
  siteFlagPendingReads.set(pendingScope, pending);
  try { return await pending; }
  finally { if (siteFlagPendingReads.get(pendingScope) === pending) siteFlagPendingReads.delete(pendingScope); }
}

// 🔥 המספרים החמים [עוגן-מבחן] — test/unified-performance-read-policy-2029.test.mjs חותך את getSiteFlags עד הסימן הזה (indexOf).
//    getHotNumbers שישב כאן הוסר: אין לו קוראים מאז הסרת ה-Legacy (a5ef82cce); הקוד נשמר בהיסטוריית git.

// ===== אוספים (gallery_collections) — גלריות/אוספים/מסלולים גמישים מעל הדרגות הקבועות =====

// תמונות של גלריה אחת (wp_gallery_id) — לקרוסלה החיה בתוך פוסט (data-sod-gallery-id).
// עץ אחד: הפוסט הישן מפסיק להציג HTML קפוא ומצביע ל-gallery_images העריך —
// כך עריכת תאריך/חשיבות/הסתרה/מספר בגלריה משתקפת מיד בפוסט. ציבורי בלבד.
// סדר: חשיבות↓ ואז הסדר הידני של הגלריה (ordering) — שומר על הסדר הישן של צוריאל.
export async function getImagesByGallery(wpGalleryId, { publicSourceOnly = false, throwOnError = false, client = supabase } = {}) {
  if (!client || !wpGalleryId) return [];
  let query = client
    .from('gallery_images')
    .select('id,name,description,image_url,thumb_url,ordering,primary_value,all_values,occurred_at,created_at,importance')
    .eq('wp_gallery_id', wpGalleryId)
    .not('image_url', 'is', null)
    .not('curator_hidden', 'is', true)
    .eq('min_tier', 0)                                               // נראות: פרימיום/מוסתר לא לציבור
    .order('importance', { ascending: false, nullsFirst: false })
    .order('ordering', { ascending: true, nullsFirst: false });
  // Opt-in for the existing 2029 source reader; Legacy/default callers unchanged.
  if (publicSourceOnly) query = query.eq('published', 1);
  const { data, error } = await query;
  if (error && throwOnError) throw error;
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
        // Restore F10 for 2029: publication belongs BEFORE both windows/counts.
        // The independently built Legacy path keeps its existing query behavior.
        const publicRead = q => typeof __SOD_2029_BUILD__ !== 'undefined' && __SOD_2029_BUILD__ ? q.eq('published', 1) : q;
        const ord = q => publicRead(q).not('curator_hidden', 'is', true).eq('min_tier', 0)
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
  // 🤖 BOT_READ_NO_SIDE_EFFECT_V1 — ל-page_views אין עמודת is_bot, ולכן אי-אפשר *לסמן* כאן
  // בוט כמו ש-site_visits/events עושים; האפשרות הישרה היחידה היא לא לכתוב. הבוט עדיין קורא
  // את הדף במלואו — רק הצפייה שלו לא נספרת. (נפח-הבוטים נמדד בקצה: crawl_daily.)
  if (!sideEffectAllowed("page_views")) return;
  // DEF-012: the public-reading build's request worker (public-reading-deploy/transport.js) denies every write except an explicit allow-list, and
  // page_views is not on it. Sending the insert only produced a 403 + console error on every post view, so the public build does not attempt it.
  if (PUBLIC_READING_RELEASE) return;
  const key = `pv-${kind}-${ref}`;
  try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* ignore */ }
  try { await supabase.from("page_views").insert({ kind, ref: String(ref) }); } catch { /* ignore */ }
}
// 🔎 ספירת חיפושים כוללת [עוגן-מבחן] — test/def012-page-views-public-build.test.mjs חותך את logView עד הסימן הזה (indexOf).
//    getSearchCount שישב כאן הוסר: אין לו קוראים מאז הסרת ה-Legacy (a5ef82cce); הקוד נשמר בהיסטוריית git.
// 📡 הודעות-טיקר ידניות — צוריאל שולט (טבלת ticker_messages). מוצגות ראשונות בטיקר.
// להוסיף: insert into ticker_messages(text,priority[,link_url]) · להסיר: update ... set is_active=false.
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

// 🧹 [הוסר 22.7.2026] saveUserItem/getUserItems/deleteUserItem + טבלת user_saved_items —
//    קוד מת: הפונקציות לא נקראו מאף רכיב, והטבלה נשארה ריקה (0 שורות) מאז ומתמיד.
//    מערכת השמירה הפעילה היא research_items (bucket library/favorite) דרך useResearch,
//    שהיא הטבלה המאוחדת הקנונית לפי research_workspace_law («research_items שמאחדת גם את
//    user_saved_items»). הוסר כדי לא לבלבל (עץ אחד — אין מערכת מקבילה מתה).

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
// Member read: the existing RLS-scoped table path (user_id = auth.uid()). One implementation for both entry points below.
async function readMemberNotificationPrefs(userId) {
  const { data, error } = await supabase
    .from('notification_prefs')
    .select('topics, channels, email, intensity, muted_until')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

// The principal the Supabase client will actually authenticate as. The SDK attaches the stored member JWT to
// every request, whatever the React tree has resolved so far (AuthContext is still loading, or its verification
// has not finished). notification_prefs_guest_get_v1 is anon-only (EXECUTE for anon; it also raises for
// auth.uid() IS NOT NULL), so a member JWT on that call is a guaranteed 403 "permission denied for function".
async function clientMemberUserId() {
  try {
    const { data, error } = await supabase.auth.getSession();
    const id = error ? null : data?.session?.user?.id;
    return typeof id === 'string' && id ? id : null;
  } catch { return null; }
}

export async function getNotificationPrefs({ userId = null, visitorId = null } = {}) {
  if (!supabase) return null;
  if (userId) return readMemberNotificationPrefs(userId);
  if (visitorId) {
    // Guest RPC only for a real guest. With a member session present, read the member's own row (same columns/shape).
    const memberId = await clientMemberUserId();
    if (memberId) return readMemberNotificationPrefs(memberId);
    const { data, error } = await supabase.rpc('notification_prefs_guest_get_v1', { p_visitor: visitorId });
    if (error) throw error;
    return data || null;
  }
  return null;
}

export async function saveNotificationPrefs({ userId = null, visitorId = null, topics = [], channels = [], email = null, intensity = undefined, mutedUntil = undefined }) {
  if (!supabase) return { ok: false };
  if (userId) {
    const row = { user_id: userId, topics, channels, email: email || null, updated_at: new Date().toISOString() };
    if (intensity !== undefined) row.intensity = intensity;
    if (mutedUntil !== undefined) row.muted_until = mutedUntil;
    const { error } = await supabase.from('notification_prefs').upsert(row, { onConflict: 'user_id' });
    if (error) throw error;
  } else if (visitorId) {
    const { error } = await supabase.rpc('notification_prefs_guest_save_v1', {
      p_visitor: visitorId,
      p_topics: topics,
      p_channels: channels,
      p_email: email || null,
      p_intensity: intensity ?? null,
      p_set_intensity: intensity !== undefined,
      p_muted_until: mutedUntil ?? null,
      p_set_muted_until: mutedUntil !== undefined,
    });
    if (error) throw error;
  } else {
    return { ok: false };
  }
  // Explicit Email channel consent remains owned by the existing subscriber path.
  if (channels.includes('email') && email) {
    try { await subscribeEmail({ email, source: 'notification-center' }); } catch { /* noop */ }
  }
  return { ok: true };
}

// ── מונה שיתופים לפוסטים (הוכחה חברתית) ─────────────────────

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
export async function adminSetMessageRead(id, read = true) {
  if (!supabase) throw new Error('no supabase');
  const { error } = await supabase.from('contact_messages').update({ read }).eq('id', id);
  if (error) throw error;
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

// כתובת דף-החוקר הקנונית (קוד-מספר עדיף על slug — בלי שמות-אנשים בכתובת)
export function contributorHref(c) {
  if (!c) return null;
  return `/community/researcher/${c.code || c.slug}`;
}

// ── OCR גלריות (Edge Function gallery-ocr — Claude Vision) ──
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
// 🔐 מודל-קריאה ציבורי אחד (TOPIC_CARDS_PUBLIC_READ_MODEL_PRIVACY_FIX_V1, work_log bf236317):
// כל קורא ציבורי/משתמש-רגיל קורא את ה-VIEW `topic_cards_public` (שורות approved שאינן מסומנות
// _do_not_publish, ומפתחות-פנימיים `_…` של findings מוסרים בצד-השרת). גישה מלאה לשורות הגולמיות
// (כל הסטטוסים + findings גולמי) = מנהל בלבד דרך ה-RPC `admin_topic_cards_full` (SECURITY DEFINER,
// בדיקת users.role='admin'). אין סינון-React ואין חריג-לכרטיס.
export const TOPIC_CARDS_PUBLIC = 'topic_cards_public';
export async function getTopicCardBySlug(slug) {
  if (!supabase || !slug) return null;
  // ציבורי: דרך מודל-הקריאה הבטוח בלבד
  const { data } = await supabase.from(TOPIC_CARDS_PUBLIC).select('*').eq('slug', slug).maybeSingle();
  if (data) return data;
  // לא-ציבורי (טיוטה/דחוי/ממוזג/מסומן _do_not_publish): תצוגה-מקדימה למנהל בלבד — ה-RPC מסרב לכל
  // מי שאינו admin, ולכן מנוסה רק כשיש session. משתמש רגיל/אנונימי → null (כמו «לא נמצא»).
  try {
    const { data: { session } = {} } = await supabase.auth.getSession();
    if (!session) return null;
    const { data: rows, error } = await supabase.rpc('admin_topic_cards_full', { p_slug: slug });
    if (error) return null;
    return (rows && rows[0]) || null;
  } catch { return null; }
}

// ===== אצירת תמונות — דירוג (importance) + הסתרה (curator_hidden). מיון: חזק קודם, ואז תאריך =====
// חיפוש OCR בצד-שרת — מחזיר ids תואמים (במקום לטעון את כל ה-ocr_text מראש)
export async function searchArchiveOcrIds(q, { limit = 800, publicSourceOnly = false, client = supabase } = {}) {
  if(publicSourceOnly){
    if(!client)throw new Error('gallery_reader_unavailable');
    const t=String(q||'').trim().slice(0,200), cap=Math.min(800,Math.max(1,Math.floor(limit)||800));
    if(t.length<2)return {rows:[],partial:false};
    const escaped=t.replace(/[\\%_]/g,'\\$&');
    const {data,error}=await client.from('gallery_images').select('id,gallery_id')
      .eq('published',1).eq('min_tier',0).not('curator_hidden','is',true).not('image_url','is',null)
      .ilike('ocr_text',`%${escaped}%`).order('id').limit(cap+1);
    if(error)throw error;
    return {rows:(data||[]).slice(0,cap),partial:(data||[]).length>cap};
  }
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

export async function setTopicCardStatus(id, status) {  if (!supabase) throw new Error('no supabase');
  const patch = { status };
  if (status === 'approved') patch.approved_at = new Date().toISOString();
  // RETURNING ללא findings: אחרי Phase B ל-authenticated אין SELECT על עמודת findings הגולמית
  // (הקריאה המלאה למנהל = admin_topic_cards_full).
  const { data, error } = await supabase.from('topic_cards')
    .update(patch).eq('id', id).select(TOPIC_CARD_RETURNING).maybeSingle();
  if (error) throw error;
  return data;
}
const TOPIC_CARD_RETURNING = 'id,slug,title,subtitle,status,quality,approved_at,created_at,created_by,node_id';
export async function updateTopicCard(id, patch) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.from('topic_cards')
    .update(patch).eq('id', id).select(TOPIC_CARD_RETURNING).maybeSingle();
  if (error) throw error;
  return data;
}
// מיזוג טופיקים: מאחד image_ids/numbers/highlight/bullets לתוך כרטיס-היעד, ומסמן את האחרים status='merged'
export async function mergeTopicCards(keepId, mergeIds = []) {
  if (!supabase || !keepId || !mergeIds.length) throw new Error('bad args');
  const ids = [keepId, ...mergeIds];
  // שורות מלאות (כולל findings גולמי, כל סטטוס) — נתיב-מנהל מפורש
  const { data: cards, error: eRead } = await supabase.rpc('admin_topic_cards_full', { p_ids: ids });
  if (eRead) throw eRead;
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
// מנוע "צידה": לכל תמונה — אילו מספרים שלה חוזרים במקומות אחרים ובאילו סטים
export async function getImageConnections(imageId) {
  if (!supabase || !imageId) return null;
  const { data, error } = await supabase.rpc('image_connections', { p_image_id: imageId });
  if (error) throw error;
  return data; // { image_id, image_url, numbers, connections:[{number, images, sets}] }
}

// ===== ניהול תמונות — עריכה ומחיקה =====

// מחיקת תמונה מ-gallery_images (מחיקה מוחלטת — מנהל בלבד).
export async function deleteGalleryImage(id) {
  if (!supabase) throw new Error('no supabase');
  const { error } = await supabase.from('gallery_images').delete().eq('id', id);
  if (error) throw error;
  invalidateGalleriesOverview();
}

// גלריה ציבורית — כל התמונות עם פילטר סוג + חיפוש + פגינציה
// hidden: 'no' = רק גלויות (ברירת מחדל) · 'only' = רק מוסתרות (אדמין) · 'all' = הכל (אדמין)
export async function getGalleryPage({
  type = null,
  page = 0,
  limit = 60,
  search = "",
  hidden = "no",
  review = null,
  withCount = true,
} = {}) {
  if (!supabase) return { data: [], count: 0 };
  const publicFields = 'id,name,description,image_url,thumb_url,primary_value,all_values,occurred_at,stream_at,created_at,image_type,source,importance,curator_hidden';
  // The review shape is consumed only by the existing authenticated World manager surface.
  // It deliberately omits OCR text and metadata bodies: the queue needs status, source
  // identity and completeness signals, not the extracted corpus itself.
  const reviewFields = `${publicFields},created_at,published,min_tier,tags,ocr_status,ocr_numbers,gallery_id,wp_gallery_id`;
  let q = supabase.from('gallery_images')
    .select(review ? reviewFields : publicFields, { count: withCount ? 'exact' : undefined })
    .not('image_url', 'is', null);
  if (hidden === 'only') q = q.eq('curator_hidden', true);
  else if (hidden !== 'all') q = q.not('curator_hidden', 'is', true);
  if (review === 'ocr') {
    q = q.or('ocr_status.is.null,ocr_status.neq.done,ocr_text.is.null,ocr_text.eq.');
  }
  if (type) q = q.eq('image_type', type);
  if (search.trim()) {
    const t = search.trim();
    if (/^\d+$/.test(t)) { const n = parseInt(t, 10); q = q.or(`primary_value.eq.${n},all_values.cs.{${n}}`); }
    else q = q.or(`name.ilike.%${t}%,description.ilike.%${t}%`);
  }
  const { data, count, error } = await q
    .order('occurred_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(page * limit, (page + 1) * limit - 1);
  if (error) return { data: [], count: 0 };
  return { data: data || [], count: withCount ? count || 0 : null };
}
export async function createTopicCardDraft(card) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.from('topic_cards')
    .insert({ ...card, status: 'draft', created_by: 'admin-hunt' }).select(TOPIC_CARD_RETURNING).maybeSingle();
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

// ===== פס פעילות חי (LiveActivityBar) — עדכונים אמיתיים בלבד =====

const SEARCH_TERM_OK = /^[ 0-9א-ת׳״'"\-]{1,40}$/;
// תיעוד חיפוש אמיתי (מהמחשבון / דף הביטוי). ללא PII; נכשל בשקט. דדופ לכל גלישה.
export async function logSearch(term, value) {
  if (isAnon()) return;   // 🕶️ מצב אנונימי — לא נשמר בהיסטוריית החיפושים
  // 🤖 BOT_READ_NO_SIDE_EFFECT_V1 — search_log מזין את «המספרים החמים» (getHotNumbers →
  // דף-הבית) ואת מפת-החום, כלומר prominence ציבורי שמייצר קישורים חדשים לסריקה. אין לו
  // עמודת is_bot, ולכן סריקה לא נספרת כ«חיפוש». זה גם חוסם את כתיבת research_items שלמטה —
  // וזה נכון: בוט אינו «חוקר» ואסור לו לצבור התקדמות/עץ-אישי.
  if (!sideEffectAllowed("search_log")) return;
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

// Published, verified Regular expressions for progressive Number-page disclosure.
// A separate exact count keeps the total distinct from the current loaded page.
export async function getValuePhrasesPage(value, { offset = 0, limit = 30 } = {}) {
  if (!supabase || !Number.isSafeInteger(Number(value))) return { rows: [], count: 0 };
  const start = Math.max(0, Math.trunc(Number(offset) || 0));
  const size = Math.max(1, Math.min(100, Math.trunc(Number(limit) || 30)));
  const { data, count, error } = await supabase.from("gematria_words")
    .select("phrase,is_verified,visibility_tier,lead_rank,tags", { count: "exact" })
    .eq("ragil", Number(value))
    .eq("is_verified", true).eq("is_published", true)
    .order("lead_rank", { ascending: true, nullsFirst: false })
    .order("visibility_tier", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .range(start, start + size - 1);
  if (error) throw error;
  return { rows: data || [], count: count ?? (start + (data || []).length) };
}

// 🧬 משפחות המילים — לכל ערך, הביטויים השווים לו בכל שיטה (מ-bidim, דרך fn_number_lookup) + העולם של כל ביטוי (מ-nodes).
// המקום היחיד למילים שוות בדף המספר (כולל רגיל). כל פריט: {phrase, world}.
// 🧩 Number Page Integration v1: המקור עבר מ-select ישיר על bidim ל-fn_number_lookup (אותו מקור-נתונים,
// אך מורחב — atomic_or_composite/component_methods/component_values) כדי שקבוצות-Composite (רגיל+מילוי וכו')
// יסומנו ויוסברו במפורש, לא רק יופיעו כמפתח-שיטה גולמי. אין שינוי-חישוב — כל ערך כבר-מחושב במנוע.
//
// `lookup` (אופציונלי): הבטחה ל-{data,error} של אותה קריאת fn_number_lookup(p_value, p_limit=lookupLimit) שדף המספר כבר מבצע
// עבור עדשת number_lookup. כך נקרא אותו מטען פעם אחת במקום פעמיים. הקריאה המשותפת חסומה ב-lookupLimit שורות; רק תשובה שלמה
// (פחות מ-lookupLimit שורות, ללא שגיאה) משמשת כאן. תשובה שחסרה, שנכשלה או שהגיעה לתקרה — נקראת הקריאה המקורית הלא-חסומה,
// כדי שהספירות לפי שיטה יישארו בדיוק מה שהיו (גם למספרים עם יותר משורות החלון, וגם כשהעומס/ההעברה של הקריאה החסומה נכשלו).
export async function getValueFamilies(value, perMethod = 20, { lookup = null, lookupLimit = 500 } = {}) {
  if (!supabase || !value || value < 1) return [];
  try {
    let data = null;
    if (lookup) {
      try {
        const shared = await lookup;
        if (!shared?.error && Array.isArray(shared?.data) && shared.data.length < lookupLimit) data = shared.data;
      } catch { /* the original unbounded read below decides */ }
    }
    if (data === null) data = await getNumberLookup(value);
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

// Life Journey's bounded non-ELS NameLab reader. This consumes the existing fn_name_multi
// opt-out seam directly so a one-word name cannot fall through fn_name_research_graded's
// historical ELS branch. It is a read adapter only: no calculation, persistence or new store.
export async function getNameMultiWithoutEls(name) {
  const w = (name || '').trim();
  if (!supabase || !w) return null;
  const { data, error } = await supabase.rpc('fn_name_multi', {
    p_name: w,
    p_surname: null,
    p_birthdate: null,
    p_question: null,
    p_opts: { skip_els: '1' },
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

// 💎 הצלבת קציר: פוסטים שמזכירים ביטוי ששווה למספר הזה (mentions שנקצרו מהפוסטים).
export async function getHarvestedPosts(value, lim = 6) {
  if (!supabase || !value) return [];
  try {
    const { data } = await supabase.rpc('posts_harvested_for_number', { num: value, lim });
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

// ── hint_sets ──

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

export async function removeFamilyMember(ownerId, targetRef) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.rpc('fn_remove_family_member', { p_owner: ownerId, p_target_ref: targetRef });
  if (error) throw error;
  return data;
}

export async function listFamily(ownerId) {
  if (!supabase) return { members: [], relations: [] };
  const { data, error } = await supabase.rpc('fn_list_family', { p_owner: ownerId });
  if (error) throw error;
  return data || { members: [], relations: [] };
}
