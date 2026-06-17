import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://linswmnnkjxvweumprav.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM'
);

export default supabase;
export { supabase };


export async function getPostsFromSupabase({ limit = 10, page = 1, category = null, tag = null, year = null, orderBy = 'date', ascending = false } = {}) {
  if (!supabase) return { posts: [], total: 0 };
  let query = supabase
    .from('posts')
    .select('*', { count: 'exact' })
    .order(orderBy, { ascending, nullsFirst: false })
    .range((page - 1) * limit, page * limit - 1);

  if (category) query = query.contains('categories', [category]);
  if (tag) query = query.contains('tags', [tag]);
  if (year) {
    query = query
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31T23:59:59`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { posts: data ?? [], total: count ?? 0 };
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

export async function getPostByWpId(wpId) {
  if (!supabase || !wpId) return null;
  const { data } = await supabase.from('posts').select('*').eq('wp_id', wpId).limit(1);
  return data?.[0] ?? null;
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

// Get gematria words matching a specific value
export async function getGematriaByValue(value) {
  if (!supabase || !value) return [];
  const { data } = await supabase
    .from('gematria_words')
    .select('phrase, ragil')
    .eq('ragil', value)
    .limit(12);
  return data ?? [];
}

// ===== ארכיון הגלריות ("גלריית רמזי הגאולה") =====
// סקירה: רשימת גלריות + תמונות קלות (לכריכה+ספירה).
export async function getGalleriesOverview() {
  if (!supabase) return { gals: [], imgs: [] };
  const { data: gals } = await supabase
    .from('galleries')
    .select('id,name,anchor_number,img_count,wp_gallery_id');
  let imgs = [], from = 0;
  while (true) {
    const { data } = await supabase
      .from('gallery_images')
      .select('id,gallery_id,image_url,name,description,ordering,primary_value,all_values,occurred_at,created_at,importance,curator_hidden')
      .not('image_url', 'is', null)
      .order('occurred_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(from, from + 999);
    if (!data || !data.length) break;
    imgs = imgs.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return { gals: gals || [], imgs };
}

// ===== סטים של מספרים (number_sets) =====
export async function getNumberSets() {
  if (!supabase) return [];
  const { data } = await supabase.from('number_sets').select('*')
    .eq('is_active', true).order('sort_order', { ascending: true }).order('created_at', { ascending: true });
  return data || [];
}
export async function saveNumberSet({ id, name, numbers, description = null, sort_order = 0, image_order = undefined }) {
  if (!supabase) throw new Error('no supabase');
  const row = { name, numbers, description, sort_order };
  if (image_order !== undefined) row.image_order = image_order;
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
    .select('id,name,description,image_url,ordering,primary_value,all_values,occurred_at')
    .eq('gallery_id', galleryId)
    .order('ordering', { ascending: true });
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
      ? supabase.from('gematria_words').select('phrase,ragil', { count: 'exact' })
          .eq('ragil', value).order('is_verified', { ascending: false }).limit(500)
          .then(({ data, count }) => ({ items: data || [], count: count ?? (data?.length || 0) }))
          .catch(() => ({ items: [], count: 0 }))
      : Promise.resolve({ items: [], count: 0 }),
    postsP,
    // גלריות: למספר — התאמה מדויקת בלבד (primary_value / all_values), לא תת-מחרוזת (כדי ש-26 לא יביא 2620).
    sec('gallery_images', 'id,name,description,image_url,primary_value,gallery_id,all_values',
      q => (isNumber ? q.or(`primary_value.eq.${value},all_values.cs.{${value}}`) : q.ilike('name', like))
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

// ── Popular posts (by Jetpack views — legacy_traffic, source='jetpack') ──
// מחזיר פוסטים מדורגים לפי סך הצפיות שיובאו מ-Jetpack (ראה RPC popular_posts_by_views).
export async function getPopularByViews({ limit = 60 } = {}) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('popular_posts_by_views', { lim: limit });
  if (error) throw error;
  return data ?? [];
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
  const { error } = await supabase
    .from('subscribers')
    .insert([{ email: email.trim(), name: name?.trim() || null, source }]);
  if (error && !/duplicate|unique/i.test(error.message)) throw error;
  return { ok: true, duplicate: !!error };
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
  try { await supabase.from('user_activity').insert({ kind, ref, title: title ? String(title).slice(0, 200) : null }); }
  catch { /* silent */ }
}
// מצב המשתמש הנוכחי — first/last seen, ימים פעילים, האם חזר אחרי הפסקה
export async function getMyEngagement() {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('my_engagement');
  if (error) return null;
  return Array.isArray(data) ? data[0] : data;
}
// סקירת מעורבות לאדמין (כולל מבקרים חוזרים)
export async function getEngagementOverview() {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('engagement_overview');
  if (error) return null;
  return Array.isArray(data) ? data[0] : data;
}

// ── שיעורי שמע "סוד החשמל" — מבחר אקראי (RPC קל) ───────────
export async function getRandomShiurim(limit = 12) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('random_shiurim', { lim: limit });
  if (error) return [];
  return data || [];
}

// ── הודעות/באנרים מונחי-נתונים לפי מיקום (ניתן לעריכה בלי דפלוי) ──
export async function getAnnouncement(location) {
  if (!supabase || !location) return null;
  const { data } = await supabase
    .from('announcements')
    .select('title, body, updated_at')
    .eq('location', location)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

// מטא-דאטה קל לכמה פוסטים לפי wp_id (בלי עמודת content הכבדה) — לכרטיסים/תצוגות
export async function getPostsMetaByWpIds(wpIds = []) {
  if (!supabase || !wpIds.length) return [];
  const { data } = await supabase.from('posts').select('wp_id, slug, title, image_url').in('wp_id', wpIds);
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

// ── Insights / חידושים (בית המדרש) ─────────────────────────
// origin='ai' → חידושי AI · convergence=true → התראות התכנסות/1820 (חידושי המערכת)
// space='core' → רק חידושים מאושרים (ברירת מחדל לציבור; 'lab' = מעבדה/בחקירה)
export async function getInsights({ origin = null, convergence = false, space = 'core', limit = 30 } = {}) {
  if (!supabase) return [];
  let q = supabase
    .from('insights')
    .select('id, title, body, proof, related_numbers, related_phrases, tags, source_ref, source_type, category, origin, has_1820, convergence_score, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (origin) q = q.eq('origin', origin);
  if (space) q = q.eq('space', space);
  if (convergence) q = q.or('has_1820.eq.true,convergence_score.gt.0');
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// ── Admin inbox (הודעות + מנויים) — מאחורי סיסמת ניהול בצד-שרת ──
export async function getAdminInbox(key) {
  const empty = { messages: [], subscribers: [], unread: 0, subscriber_count: 0 };
  if (!supabase) return empty;
  const { data, error } = await supabase.rpc('admin_inbox', { p_key: key });
  if (error) throw error;
  return data || empty;
}

export async function markMessageRead(key, id, read = true) {
  if (!supabase) return;
  const { error } = await supabase.rpc('admin_mark_message_read', { p_key: key, p_id: id, p_read: read });
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
    .select('id,email,name,source,active,created_at').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
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
export async function getTopicCardBySlug(slug) {
  if (!supabase || !slug) return null;
  const { data } = await supabase.from('topic_cards').select('*').eq('slug', slug).maybeSingle();
  return data || null;
}
// ישויות (זהב/חתימות) המחוברות לציר ההתכנסות בגרף — דרך edges related מה-node של הכרטיס
export async function getConvergenceEntities(nodeId) {
  if (!supabase || !nodeId) return [];
  const { data: eg } = await supabase.from('edges').select('to_node').eq('from_node', nodeId).eq('relation_type', 'related');
  const ids = [...new Set((eg || []).map(x => x.to_node))];
  if (!ids.length) return [];
  const { data } = await supabase.from('nodes').select('label,description,metadata').eq('type', 'entity').in('id', ids);
  return (data || []).sort((a, b) => (b.metadata?.tier === 'gold' ? 1 : 0) - (a.metadata?.tier === 'gold' ? 1 : 0));
}

// ===== אצירת תמונות — דירוג (importance) + הסתרה (curator_hidden). מיון: חזק קודם, ואז תאריך =====
export async function searchGalleryForCuration(term = '', { limit = 60 } = {}) {
  if (!supabase) return [];
  let q = supabase.from('gallery_images')
    .select('id,image_url,name,ocr_numbers,occurred_at,importance,curator_hidden')
    .not('image_url', 'is', null);
  const t = (term || '').trim();
  if (t) {
    if (/^\d+$/.test(t)) q = q.contains('ocr_numbers', [parseInt(t, 10)]);
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
  const { data, error } = await supabase.from('gallery_images')
    .update(patch).eq('id', id).select('id,importance,curator_hidden').maybeSingle();
  if (error) throw error;
  return data;
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
    .select('id,image_url,name,description,ocr_numbers,occurred_at,gallery_id').in('id', ids);
  return data || [];
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
export async function getWallRecent(limit = 60) {
  if (!supabase) return [];
  const { data } = await supabase.from('gematria_wall')
    .select('phrase,ragil,hits,last_at').order('last_at', { ascending: false }).limit(limit);
  return data || [];
}
export async function getWallPopular(limit = 60) {
  if (!supabase) return [];
  const { data } = await supabase.from('gematria_wall')
    .select('phrase,ragil,hits').order('hits', { ascending: false }).limit(limit);
  return data || [];
}
export async function getWallCount() {
  if (!supabase) return 0;
  const { count } = await supabase.from('gematria_wall').select('*', { count: 'exact', head: true });
  return count || 0;
}

export function adaptPost(row) {
  return {
    id: row.wp_id,
    title: { rendered: row.title },
    excerpt: { rendered: row.excerpt ?? '' },
    date: row.date,
    link: row.link,
    slug: row.slug,
    author: row.author ?? '',
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
  const t = (term || '').trim();
  if (!SEARCH_TERM_OK.test(t)) return;
  try {
    const key = 'sl:' + t;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch { /* ignore */ }
  try { await supabase.from('search_log').insert({ term: t, value: Number.isFinite(value) ? value : null }); } catch { /* ignore */ }
}

// סטטיסטיקות חיות בטוחות (ספירות בלבד) לפס הויראלי.
export async function getLiveStats() {
  try { const { data } = await supabase.rpc('live_stats'); return data || null; } catch { return null; }
}

// 🚪 שער היום — נבחר דטרמיניסטית לפי היום בשנה מתוך חידושי ההצלבות המככבים (כולם רואים אותו שער).
export function dayOfYear() {
  const now = new Date();
  return Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) / 86400000);
}
// מינימום הצטרפות יומי לתצוגה (הוכחה חברתית): מינימום 2, יציב ליום, ומעליו עולה עם הרשמות אמת.
export function displayJoinedToday(real) {
  const base = 2 + (dayOfYear() % 3); // 2..4, קבוע לאורך היום
  return Math.max(base, real || 0);
}
export async function getGateOfDay() {
  try {
    const { data } = await supabase.from('insights')
      .select('id,title,related_numbers,panel_data')
      .eq('category', 'הצלבות').eq('is_active', true)
      .order('convergence_score', { ascending: false }).limit(40);
    const list = (data || []).filter(d => d.panel_data?.featured);
    if (!list.length) return null;
    return list[dayOfYear() % list.length];
  } catch { return null; }
}

// כל חידושי ההצלבה המככבים (עם פירוט הגימטריה) — לשורה הרצה למעלה.
export async function getCrossTickerItems() {
  try {
    const { data } = await supabase.from('insights')
      .select('id,title,related_numbers,gematria_pairs,panel_data')
      .eq('category', 'הצלבות').eq('is_active', true)
      .order('convergence_score', { ascending: false }).limit(20);
    return (data || []).filter(d => d.panel_data?.featured);
  } catch { return []; }
}

export async function getLiveFeed() {
  const [searches, cards, posts, ins] = await Promise.all([
    supabase.from('search_log').select('term,value,created_at').order('created_at', { ascending: false }).limit(16),
    supabase.from('topic_cards').select('slug,title,created_at,approved_at').not('approved_at', 'is', null).order('approved_at', { ascending: false }).limit(6),
    supabase.from('posts').select('title,slug,date').order('date', { ascending: false }).limit(6),
    supabase.from('insights').select('title,source_ref,origin,created_at').eq('origin', 'ai').order('created_at', { ascending: false }).limit(6),
  ].map(p => p.then(r => r.data || []).catch(() => [])));

  const items = [];
  for (const s of searches) {
    const isNum = /^\d+$/.test(s.term);
    items.push({ k: 'search', ts: s.created_at,
      icon: isNum ? '🔢' : '🔍',
      text: isNum ? `נפתח דף המספר ${s.term}` : `חיפשו: ${s.term}`,
      to: `/number/${encodeURIComponent(s.term)}` });
  }
  for (const c of cards) items.push({ k: 'conv', ts: c.approved_at || c.created_at, icon: '🌳', text: `התכנסות חדשה: ${cleanTitle(c.title)}`, to: `/topic/${encodeURIComponent(c.slug)}` });
  for (const p of posts) items.push({ k: 'post', ts: p.date, icon: '📚', text: `פוסט חדש: ${cleanTitle(p.title)}`, to: `/${p.slug}` });
  for (const i of ins) items.push({ k: 'ai', ts: i.created_at, icon: '🧠', text: `גילוי AI: ${cleanTitle(i.title)}`, to: '/beit-midrash' });

  items.sort((a, b) => new Date(b.ts) - new Date(a.ts));
  return items;
}

// 💎 הצלבת קציר: פוסטים שמזכירים ביטוי ששווה למספר הזה (mentions שנקצרו מהפוסטים).
export async function getHarvestedPosts(value, lim = 6) {
  if (!supabase || !value) return [];
  try {
    const { data } = await supabase.rpc('posts_harvested_for_number', { num: value, lim });
    return data || [];
  } catch { return []; }
}
