// The shared Supabase client and the few reads every page needs (SHELL_WEIGHT_REDUCTION_20261118, ZURIEL 18.11.2026).
// The entry, the System Frame and most of the site import only these. Everything else that used to live here (admin, research,
// statistics, AI: about 190 functions) moved unchanged to ./supabaseApi2029.js, which re-exports this module, so it is no longer
// part of the code every page downloads.
import { PUBLIC_READING_RELEASE, PUBLIC_READING_PRODUCTION_ARTIFACT } from "./publicReadingRelease2029.js";
import { readingSessionOptions } from "./publicReadingAuthSession.js";
import { sharedReadDedupe } from "./readDedupe.js";
import { createClient } from '@supabase/supabase-js';
import { watchPasswordRecovery } from './passwordRecovery.js';
import { sideEffectAllowed } from "./botVerdict.js"; // 🤖 BOT_READ_NO_SIDE_EFFECT_V1 — קריאה של בוט לא מייצרת תופעת-לוואי
import { signupAttribution } from './acquisition.js';
import { stripHtml } from './format.js';
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

// Registered before any component exists: the SDK announces a recovery link's session while it processes the callback URL.
watchPasswordRecovery(supabase);

export default supabase;
export { supabase };

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

// 👁 מעקב צפיות חי — שורה לכל צפייה (פעם אחת לכל ref בכל session, כדי לא לנפח).
export async function logView(kind, ref, publicItemId = null) {
  if (!supabase || !kind || ref == null || ref === "") return;
  // 🤖 BOT_READ_NO_SIDE_EFFECT_V1 — ל-page_views אין עמודת is_bot, ולכן אי-אפשר *לסמן* כאן
  // בוט כמו ש-site_visits/events עושים; האפשרות הישרה היחידה היא לא לכתוב. הבוט עדיין קורא
  // את הדף במלואו — רק הצפייה שלו לא נספרת. (נפח-הבוטים נמדד בקצה: crawl_daily.)
  if (!sideEffectAllowed("page_views")) return;
  // DEF-012: the public-reading build's request worker (public-reading-deploy/transport.js) denies every write except an explicit allow-list, and
  // page_views is not on it. Sending the insert only produced a 403 + console error on every post view, so the public build does not attempt it.
  // ZURIEL 12.11.2026 "fix measurement": the public build counts the view once per session through the bounded public family
  // instead (events surface=content, the public numeric item id only - never the slug). Dynamic import: events.js imports this module.
  if (PUBLIC_READING_RELEASE && Number.isSafeInteger(Number(publicItemId)) && Number(publicItemId) > 0) {
    const key = `pv29-${kind}-${Number(publicItemId)}`;
    let fresh = true;
    try { fresh = !sessionStorage.getItem(key); if (fresh) sessionStorage.setItem(key, "1"); } catch { /* count anyway */ }
    if (fresh) void import("./events.js").then(m => m.emit("content", "view", { props: { kind, item_id: Number(publicItemId) } })).catch(() => {});
  }
  if (PUBLIC_READING_RELEASE) return;
  const key = `pv-${kind}-${ref}`;
  try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* ignore */ }
  try { await supabase.from("page_views").insert({ kind, ref: String(ref) }); } catch { /* ignore */ }
}
// 🔎 ספירת חיפושים כוללת [עוגן-מבחן] — test/def012-page-views-public-build.test.mjs חותך את logView עד הסימן הזה (indexOf).
//    getSearchCount שישב כאן הוסר: אין לו קוראים מאז הסרת ה-Legacy (a5ef82cce); הקוד נשמר בהיסטוריית git.

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

// כתובת דף-החוקר הקנונית (קוד-מספר עדיף על slug — בלי שמות-אנשים בכתובת)
export function contributorHref(c) {
  if (!c) return null;
  return `/community/researcher/${c.code || c.slug}`;
}
