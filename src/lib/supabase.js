import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = (url && key) ? createClient(url, key) : null;

const WP_API = 'https://sod1820.co.il/wp-json/wp/v2/posts';
const CATEGORY_ID = 47;

export async function syncCategory47() {
  const rows = [];
  let page = 1, totalPages = 1;

  while (page <= totalPages) {
    const res = await fetch(
      `${WP_API}?categories=${CATEGORY_ID}&per_page=100&page=${page}&_embed=1`
    );
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

export async function getPostsFromSupabase(limit = 10) {
  if (!supabase) return { posts: [], total: 0 };
  const { data, error, count } = await supabase
    .from('posts')
    .select('*', { count: 'exact' })
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return { posts: data ?? [], total: count ?? 0 };
}

// Converts Supabase row → format compatible with PostCard
export function adaptPost(row) {
  return {
    id: row.wp_id,
    title: { rendered: row.title },
    excerpt: { rendered: row.excerpt },
    date: row.date,
    link: row.link,
    slug: row.slug,
    _embedded: {
      'wp:featuredmedia': row.image_url ? [{ source_url: row.image_url }] : [],
      'wp:term': [(row.categories ?? []).map(name => ({
        taxonomy: 'category', id: name, name,
      }))],
    },
  };
}
