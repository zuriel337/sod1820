import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://linswmnnkjxvweumprav.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM'
);

export default supabase;
export { supabase };

const WP_API = 'https://sod1820.co.il/wp-json/wp/v2/posts';

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

export async function getPostsFromSupabase({ limit = 10, page = 1, category = null } = {}) {
  if (!supabase) return { posts: [], total: 0 };
  let query = supabase
    .from('posts')
    .select('*', { count: 'exact' })
    .order('date', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (category) query = query.contains('categories', [category]);

  const { data, error, count } = await query;
  if (error) throw error;
  return { posts: data ?? [], total: count ?? 0 };
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
  return data;
}

export function adaptPost(row) {
  return {
    id: row.wp_id,
    title: { rendered: row.title },
    excerpt: { rendered: row.excerpt ?? '' },
    date: row.date,
    link: row.link,
    slug: row.slug,
    _embedded: {
      'wp:featuredmedia': row.image_url ? [{ source_url: row.image_url }] : [],
      'wp:term': [
        (row.categories ?? []).map(name => ({ taxonomy: 'category', id: name, name })),
        (row.tags ?? []).map(name => ({ taxonomy: 'post_tag', id: name, name })),
      ],
    },
  };
}
