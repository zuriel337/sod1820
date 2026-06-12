import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://linswmnnkjxvweumprav.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM'
);

export default supabase;
export { supabase };

const WP_API      = 'https://sod1820.co.il/wp-json/wp/v2/posts';
const WP_COMMENTS = 'https://sod1820.co.il/wp-json/wp/v2/comments';

export async function syncCategory47() {
  return syncAllPosts();
}

export async function syncAllPosts() {
  if (!supabase) throw new Error('Supabase not configured');
  const rows = [];
  let page = 1, totalPages = 1;

  while (page <= totalPages) {
    const res = await fetch(`${WP_API}?per_page=100&page=${page}&_embed=1`);
    if (!res.ok) break;
    totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '1', 10);
    const data = await res.json();

    for (const p of data) {
      rows.push({
        wp_id: p.id,
        title: p.title?.rendered ?? '',
        content: p.content?.rendered ?? '',
        excerpt: p.excerpt?.rendered ?? '',
        image_url: p._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? null,
        date: p.date,
        slug: p.slug,
        link: p.link,
        author: p._embedded?.author?.[0]?.name ?? '',
        categories: (p._embedded?.['wp:term'] ?? [])
          .flat()
          .filter(t => t.taxonomy === 'category')
          .map(t => t.name),
        tags: (p._embedded?.['wp:term'] ?? [])
          .flat()
          .filter(t => t.taxonomy === 'post_tag')
          .map(t => t.name),
        modified: p.modified ?? null,
      });
    }
    page++;
  }

  if (!rows.length) return 0;
  const { error } = await supabase
    .from('posts')
    .upsert(rows, { onConflict: 'wp_id' });
  if (error) throw error;
  return rows.length;
}

export async function getPostsFromSupabase({ limit = 10, page = 1, category = null, tag = null, year = null, orderBy = 'date' } = {}) {
  if (!supabase) return { posts: [], total: 0 };
  let query = supabase
    .from('posts')
    .select('*', { count: 'exact' })
    .order(orderBy, { ascending: false, nullsFirst: false })
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

// ── Comments ──────────────────────────────────────────────
export async function syncAllComments(onProgress) {
  if (!supabase) throw new Error('Supabase not configured');
  let page = 1, totalPages = 1, totalSynced = 0;

  while (page <= totalPages) {
    const res = await fetch(
      `${WP_COMMENTS}?per_page=100&page=${page}&status=approved&orderby=id&order=asc&_fields=id,post,parent,author_name,date_gmt,content,status`
    );
    if (!res.ok) break;
    totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '1', 10);
    const data = await res.json();

    // שומרים את כל התגובות (גם על פוסטים שעוד לא סונכרנו).
    // status='publish' כדי שיהיו קריאות תחת ה-RLS הציבורי.
    const rows = data.map(c => ({
      wp_id:        c.id,
      post_wp_id:   c.post,
      parent_wp_id: c.parent ?? 0,
      author_name:  c.author_name ?? '',
      date:         (c.date_gmt ? c.date_gmt + '+00:00' : c.date),
      content:      c.content?.rendered ?? '',
      status:       'publish',
    }));

    if (rows.length) {
      const { error } = await supabase
        .from('comments')
        .upsert(rows, { onConflict: 'wp_id' });
      if (error) throw error;
      totalSynced += rows.length;
    }

    if (onProgress) onProgress({ page, totalPages, totalSynced });
    page++;
  }
  return totalSynced;
}

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

// ── Insights / חידושים (בית המדרש) ─────────────────────────
// origin='ai' → חידושי AI · convergence=true → התראות התכנסות/1820 (חידושי המערכת)
// space='core' → רק חידושים מאושרים (ברירת מחדל לציבור; 'lab' = מעבדה/בחקירה)
export async function getInsights({ origin = null, convergence = false, space = 'core', limit = 30 } = {}) {
  if (!supabase) return [];
  let q = supabase
    .from('insights')
    .select('id, title, body, proof, related_numbers, related_phrases, source_ref, source_type, category, origin, has_1820, convergence_score, created_at')
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
