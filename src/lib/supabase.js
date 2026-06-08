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

export async function getPostsFromSupabase({ limit = 10, page = 1, category = null, tag = null, year = null } = {}) {
  if (!supabase) return { posts: [], total: 0 };
  let query = supabase
    .from('posts')
    .select('*', { count: 'exact' })
    .order('date', { ascending: false })
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
